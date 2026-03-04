"""
AI Hot Research - FastAPI 主入口
热点监控工具后端服务
"""

import asyncio
import json
import os
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from .database import init_db, save_topics, get_recent_topics, save_analysis, get_recent_analyses
from .ai_service import analyze_hotspots, analyze_single_topic, chat_about_trends
from .sources.weibo import WeiboSource
from .sources.zhihu import ZhihuSource
from .sources.baidu import BaiduSource
from .sources.douyin import DouyinSource
from .sources.bilibili import BilibiliSource
# from .sources.twitter import TwitterSource
# from .sources.reddit import RedditSource
from .sources.github_trending import GitHubTrendingSource
from .sources.hackernews import HackerNewsSource

# 数据源注册
SOURCES = {
    "weibo": WeiboSource(),
    "zhihu": ZhihuSource(),
    "baidu": BaiduSource(),
    "douyin": DouyinSource(),
    "bilibili": BilibiliSource(),
    # "twitter": TwitterSource(),
    # "reddit": RedditSource(),
    "github": GitHubTrendingSource(),
    "hackernews": HackerNewsSource(),
}

# 内存缓存
_cache: dict = {
    "topics": {},  # platform -> list[dict]
    "last_fetch": None,  # datetime
    "ai_analysis": None,
}

CACHE_TTL = 300  # 5 分钟缓存
SOURCE_TIMEOUT = 8  # 单源超时（秒）
_bg_refresh_lock = asyncio.Lock()


async def _preload_cache():
    """启动时预热缓存，用户进入页面时秒开"""
    global _cache
    print("⏳ 正在预热缓存...")
    tasks = [
        _fetch_single_source(name, source)
        for name, source in SOURCES.items()
    ]
    results = await asyncio.gather(*tasks)
    for name, topics in results:
        if topics:
            _cache["topics"][name] = topics
    _cache["last_fetch"] = datetime.now()
    total = sum(len(v) for v in _cache["topics"].values())
    print(f"✅ 缓存预热完成: {len(_cache['topics'])} 平台, {total} 条热点")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期"""
    await init_db()
    print("🚀 AI Hot Research 服务已启动")
    # 预热缓存（后台，不阻塞启动）
    asyncio.create_task(_preload_cache())
    yield
    print("👋 AI Hot Research 服务已关闭")


app = FastAPI(
    title="AI Hot Research",
    description="AI 驱动的热点监控工具",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")


# ======================== 请求模型 ========================

class AnalyzeRequest(BaseModel):
    topic: str = ""

class ChatRequest(BaseModel):
    question: str


# ======================== API 路由 ========================

@app.get("/")
async def index():
    """返回前端页面"""
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "AI Hot Research API", "docs": "/docs"}


@app.get("/api/platforms")
async def list_platforms():
    """列出所有支持的平台"""
    return {
        "platforms": [
            {"id": "weibo", "name": "微博热搜", "icon": "weibo"},
            {"id": "zhihu", "name": "知乎热榜", "icon": "zhihu"},
            {"id": "baidu", "name": "百度热搜", "icon": "baidu"},
            {"id": "douyin", "name": "抖音热点", "icon": "douyin"},
            {"id": "bilibili", "name": "B站热门", "icon": "bilibili"},
        ]
    }


async def _fetch_single_source(name: str, source):
    """获取单个数据源（带独立超时保护）"""
    try:
        topics = await asyncio.wait_for(source.fetch(), timeout=SOURCE_TIMEOUT)
        return name, topics
    except asyncio.TimeoutError:
        print(f"[{name}] ⏱ 超时({SOURCE_TIMEOUT}s)，跳过")
        return name, []
    except Exception as e:
        print(f"[{name}] 获取异常: {e}")
        return name, []


async def _background_refresh():
    """后台静默刷新缓存"""
    global _cache
    if _bg_refresh_lock.locked():
        return  # 已有刷新在进行
    async with _bg_refresh_lock:
        tasks = [
            _fetch_single_source(name, source)
            for name, source in SOURCES.items()
        ]
        results = await asyncio.gather(*tasks)
        for name, topics in results:
            if topics:
                _cache["topics"][name] = topics
                await save_topics(name, topics)
        _cache["last_fetch"] = datetime.now()
        print(f"🔄 后台刷新完成")


@app.get("/api/topics")
async def get_topics(
    platform: str = Query(None, description="平台名称，不传则获取全部"),
    refresh: bool = Query(False, description="是否强制刷新"),
):
    """获取热搜数据"""
    global _cache

    now = datetime.now()
    cache_valid = (
        _cache["last_fetch"]
        and (now - _cache["last_fetch"]).total_seconds() < CACHE_TTL
        and not refresh
    )

    has_cached_data = bool(_cache["topics"])

    if not cache_valid:
        if has_cached_data and not refresh:
            # 有旧缓存：立即返回旧数据，后台刷新
            asyncio.create_task(_background_refresh())
        else:
            # 无缓存或强制刷新：同步获取
            if platform and platform in SOURCES:
                sources_to_fetch = {platform: SOURCES[platform]}
            else:
                sources_to_fetch = SOURCES

            tasks = [
                _fetch_single_source(name, source)
                for name, source in sources_to_fetch.items()
            ]
            results = await asyncio.gather(*tasks)

            for name, topics in results:
                if topics:
                    _cache["topics"][name] = topics
                    await save_topics(name, topics)

            _cache["last_fetch"] = now

    # 返回数据
    if platform:
        return {
            "platform": platform,
            "topics": _cache["topics"].get(platform, []),
            "updated_at": _cache["last_fetch"].isoformat() if _cache["last_fetch"] else None,
        }

    return {
        "platforms": {
            name: _cache["topics"].get(name, [])
            for name in SOURCES
        },
        "updated_at": _cache["last_fetch"].isoformat() if _cache["last_fetch"] else None,
    }


@app.post("/api/analyze")
async def ai_analyze():
    """AI 分析当前全部热点"""
    # 收集所有缓存中的热点
    all_topics = []
    for platform, topics in _cache["topics"].items():
        for t in topics:
            t_copy = dict(t)
            t_copy["platform"] = platform
            all_topics.append(t_copy)

    if not all_topics:
        raise HTTPException(status_code=400, detail="暂无热点数据，请先刷新数据")

    result = await analyze_hotspots(all_topics)

    # 保存分析结果
    await save_analysis("hotspot_analysis", json.dumps(all_topics[:20], ensure_ascii=False), json.dumps(result, ensure_ascii=False))

    _cache["ai_analysis"] = result
    return result


@app.post("/api/analyze/topic")
async def ai_analyze_topic(req: AnalyzeRequest):
    """AI 深度分析单个话题"""
    if not req.topic:
        raise HTTPException(status_code=400, detail="请提供话题标题")

    result = await analyze_single_topic(req.topic)
    await save_analysis("topic_analysis", req.topic, json.dumps(result, ensure_ascii=False))
    return result


@app.post("/api/chat")
async def ai_chat(req: ChatRequest):
    """与 AI 对话讨论热点"""
    if not req.question:
        raise HTTPException(status_code=400, detail="请输入问题")

    all_topics = []
    for platform, topics in _cache["topics"].items():
        for t in topics:
            t_copy = dict(t)
            t_copy["platform"] = platform
            all_topics.append(t_copy)

    answer = await chat_about_trends(req.question, all_topics)
    return {"answer": answer}


@app.get("/api/history")
async def get_history(limit: int = Query(10, ge=1, le=50)):
    """获取历史分析记录"""
    analyses = await get_recent_analyses(limit)
    for a in analyses:
        try:
            a["result"] = json.loads(a["result"])
        except (json.JSONDecodeError, TypeError):
            pass
    return {"analyses": analyses}
