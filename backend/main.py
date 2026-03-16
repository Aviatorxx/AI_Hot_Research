"""
AI Hot Research - FastAPI 主入口
热点监控工具后端服务
"""

import asyncio
import json
import os
import re
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Query, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from jose import jwt, JWTError
from passlib.context import CryptContext

load_dotenv()

from .database import (
    init_db,
    save_topics, get_recent_topics, save_analysis, get_recent_analyses,
    save_like, delete_like, get_likes,
    save_keyword, delete_keyword, get_keywords,
    save_personal_articles, get_personal_articles,
    create_user, get_user_by_name, get_user_by_id, update_user_profile,
    count_users, migrate_preferences_to_user,
    create_chat_session, update_session_title, save_chat_message,
    get_chat_sessions, get_session_messages, delete_chat_session,
)
from .ai_service import analyze_hotspots, analyze_single_topic, chat_about_trends, generate_personal_report
from .sources.personal_feed import fetch_by_keywords as rss_fetch_by_keywords
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
    "aggregated_topics": [],
    "previous_topics": {},
    "last_fetch": None,  # datetime
    "ai_analysis": None,
}

CACHE_TTL = 300  # 5 分钟缓存
SOURCE_TIMEOUT = 8  # 单源超时（秒）
_bg_refresh_lock = asyncio.Lock()

# ======================== 认证配置 ========================

JWT_SECRET = os.getenv("JWT_SECRET", "changeme-please-set-in-env")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24
MAX_REGISTERED_USERS = int(os.getenv("MAX_REGISTERED_USERS", "3"))
ALLOWED_AVATAR_PRESETS = {
    "orbit-cyan",
    "sunset-amber",
    "violet-comet",
    "mint-grid",
    "rose-pulse",
    "slate-core",
}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _normalize_topic_title(title: str) -> str:
    value = (title or "").strip().lower()
    value = re.sub(r"[#＃@＠]", "", value)
    return re.sub(r"[^\w\u4e00-\u9fff]+", "", value)


def _velocity_from_topics(current_topic: dict, previous_topic: Optional[dict]) -> dict:
    if not previous_topic:
        return {"direction": "new", "delta": 0, "label": "NEW"}

    current_rank = int(current_topic.get("rank") or 999)
    previous_rank = int(previous_topic.get("rank") or 999)
    delta = previous_rank - current_rank

    if delta >= 2:
        return {"direction": "up", "delta": delta, "label": f"↑{delta}"}
    if delta <= -2:
        return {"direction": "down", "delta": abs(delta), "label": f"↓{abs(delta)}"}
    return {"direction": "flat", "delta": delta, "label": "→"}


def _aggregate_velocity(topics: list[dict]) -> dict:
    velocities = [topic.get("velocity") or {} for topic in topics]
    for direction in ("new", "up", "down", "flat"):
        matched = [velocity for velocity in velocities if velocity.get("direction") == direction]
        if matched:
            return max(matched, key=lambda item: abs(int(item.get("delta") or 0)))
    return {"direction": "flat", "delta": 0, "label": "→"}


def _decorate_topics(
    current_topics: dict[str, list[dict]],
    previous_topics: Optional[dict[str, list[dict]]] = None,
) -> tuple[dict[str, list[dict]], list[dict]]:
    previous_topics = previous_topics or {}
    previous_lookup: dict[str, dict[str, dict]] = {}

    for platform, topics in previous_topics.items():
        platform_map: dict[str, dict] = {}
        for topic in topics or []:
            topic_key = _normalize_topic_title(topic.get("title", ""))
            if not topic_key:
                continue
            existing = platform_map.get(topic_key)
            if not existing or int(topic.get("rank") or 999) < int(existing.get("rank") or 999):
                platform_map[topic_key] = topic
        previous_lookup[platform] = platform_map

    decorated: dict[str, list[dict]] = {}
    grouped: dict[str, list[dict]] = {}
    for platform, topics in current_topics.items():
        decorated_topics: list[dict] = []
        for topic in topics or []:
            topic_key = _normalize_topic_title(topic.get("title", ""))
            previous_topic = previous_lookup.get(platform, {}).get(topic_key)
            item = {
                **topic,
                "platform": platform,
                "topic_key": topic_key,
                "velocity": _velocity_from_topics(topic, previous_topic),
            }
            decorated_topics.append(item)
            if topic_key:
                grouped.setdefault(topic_key, []).append(item)
        decorated[platform] = decorated_topics

    aggregated_topics: list[dict] = []
    for items in grouped.values():
        representative = min(
            items,
            key=lambda item: (int(item.get("rank") or 999), item.get("title") or ""),
        )
        platform_details = [
            {
                "platform": item["platform"],
                "rank": item.get("rank"),
                "hot_value": item.get("hot_value", ""),
            }
            for item in sorted(items, key=lambda item: int(item.get("rank") or 999))
        ]
        aggregate_score = (
            sum(max(0, 120 - int(item.get("rank") or 120)) for item in items)
            + (len(items) - 1) * 18
        )
        aggregated_topics.append(
            {
                "title": representative.get("title", ""),
                "url": representative.get("url", ""),
                "hot_value": representative.get("hot_value", ""),
                "category": representative.get("category", ""),
                "platforms": [detail["platform"] for detail in platform_details],
                "platform_count": len(platform_details),
                "platform_details": platform_details,
                "aliases": [
                    item.get("title", "")
                    for item in items
                    if item.get("title")
                    and item.get("title") != representative.get("title", "")
                ],
                "velocity": _aggregate_velocity(items),
                "aggregate_score": aggregate_score,
            }
        )

    aggregated_topics.sort(
        key=lambda item: (
            -int(item.get("platform_count") or 0),
            -int(item.get("aggregate_score") or 0),
            item.get("title") or "",
        )
    )
    for index, item in enumerate(aggregated_topics, start=1):
        item["rank"] = index

    return decorated, aggregated_topics


def _refresh_topic_views(previous_topics: Optional[dict[str, list[dict]]] = None) -> None:
    decorated, aggregated = _decorate_topics(_cache["topics"], previous_topics)
    _cache["topics"] = decorated
    _cache["aggregated_topics"] = aggregated


def _create_token(user_id: int, username: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode({"sub": str(user_id), "username": username, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _serialize_user_profile(user: dict) -> dict:
    return {
        "id": user["id"],
        "username": user["username"],
        "nickname": user.get("nickname"),
        "avatar_preset": user.get("avatar_preset"),
        "avatar_data": user.get("avatar_data"),
    }


def _build_recommendation_fallback(
    likes: list[dict],
    keywords: list[dict],
    all_topics: list[dict],
) -> dict:
    keyword_values = [str(item.get("value", "")).strip() for item in keywords if item.get("value")]
    like_titles = [str(item.get("value", "")).strip() for item in likes if item.get("value")]
    terms = {value.lower() for value in keyword_values if value}
    for title in like_titles:
        for part in re.findall(r"[\u4e00-\u9fff]{2,}|[A-Za-z]{3,}", title):
            terms.add(part.lower())

    scored_topics = []
    seen: set[str] = set()
    for topic in all_topics:
        title = str(topic.get("title", "")).strip()
        if not title or title in seen:
            continue
        seen.add(title)
        lower = title.lower()
        match_count = sum(1 for term in terms if term and term in lower)
        score = match_count * 10 + max(0, 100 - int(topic.get("rank") or 100))
        if not terms or match_count > 0:
            scored_topics.append((score, topic))

    scored_topics.sort(key=lambda item: item[0], reverse=True)
    selected = [topic for _, topic in scored_topics[:8]] or all_topics[:8]
    interest_tags = keyword_values[:4] or like_titles[:4] or ["全平台热点", "趋势追踪"]

    return {
        "interest_tags": interest_tags,
        "query_summary": "基于你的关键词订阅、收藏话题与当前热榜，为你筛出优先关注的热点方向。",
        "recommended_topics": [
            {
                "title": topic.get("title", ""),
                "url": topic.get("url", ""),
                "platform": topic.get("platform", ""),
                "reason": "命中关注方向" if terms else "当前热度较高",
            }
            for topic in selected
        ],
        "report": "当前环境下已回退到快速推荐模式，优先依据你的关键词、收藏记录和热榜排名给出可立即跟进的话题。",
    }


def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """软认证：有效 token 返回用户信息，否则返回 None（不抛出错误）"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": int(payload["sub"]), "username": payload["username"]}
    except (JWTError, KeyError, ValueError):
        return None


async def _preload_cache():
    """启动时预热缓存，用户进入页面时秒开"""
    global _cache
    print("⏳ 正在预热缓存...")
    previous_topics: dict[str, list[dict]] = {}
    for name in SOURCES:
        try:
            previous_topics[name] = await get_recent_topics(name, limit=50)
        except Exception as exc:
            print(f"[{name}] 读取历史热点失败: {exc}")
            previous_topics[name] = []
    _cache["previous_topics"] = previous_topics
    tasks = [
        _fetch_single_source(name, source)
        for name, source in SOURCES.items()
    ]
    results = await asyncio.gather(*tasks)
    for name, topics in results:
        if topics:
            _cache["topics"][name] = topics
    _refresh_topic_views(previous_topics)
    _cache["previous_topics"] = {
        platform: [dict(topic) for topic in topics]
        for platform, topics in _cache["topics"].items()
    }
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
frontend_dist_dir = os.path.join(frontend_dir, "dist")
frontend_dist_assets_dir = os.path.join(frontend_dist_dir, "assets")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")
if os.path.exists(frontend_dist_assets_dir):
    app.mount("/assets", StaticFiles(directory=frontend_dist_assets_dir), name="assets")


# ======================== 请求模型 ========================

class AnalyzeRequest(BaseModel):
    topic: str = ""

class ChatRequest(BaseModel):
    question: str
    session_id: Optional[int] = None

class LikeRequest(BaseModel):
    platform: str
    title: str
    url: str = ""

class UnlikeRequest(BaseModel):
    title: str

class KeywordRequest(BaseModel):
    keyword: str

class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str


class ProfileUpdateRequest(BaseModel):
    nickname: Optional[str] = None
    avatar_preset: Optional[str] = None
    avatar_data: Optional[str] = None


# ======================== API 路由 ========================

@app.get("/")
async def index():
    """返回前端页面"""
    dist_index_path = os.path.join(frontend_dist_dir, "index.html")
    legacy_index_path = os.path.join(frontend_dir, "legacy-index.html")
    source_index_path = os.path.join(frontend_dir, "index.html")

    if os.path.exists(dist_index_path):
        return FileResponse(dist_index_path)
    if os.path.exists(legacy_index_path):
        return FileResponse(legacy_index_path)
    if os.path.exists(source_index_path):
        return FileResponse(source_index_path)
    return {"message": "AI Hot Research API", "docs": "/docs"}


# ======================== 认证路由 ========================

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    """注册新用户（默认最多2人，可通过环境变量调整）"""
    username = req.username.strip()
    if not username or len(username) > 32:
        raise HTTPException(status_code=400, detail="用户名需为1-32个字符")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="密码至少4个字符")
    if await get_user_by_name(username):
        raise HTTPException(status_code=400, detail="用户名已存在")
    existing_count = await count_users()
    if existing_count >= MAX_REGISTERED_USERS:
        raise HTTPException(status_code=403, detail="注册已关闭")

    password_hash = pwd_context.hash(req.password)
    user = await create_user(username, password_hash)

    # 第一个用户继承未关联的历史偏好数据
    if existing_count == 0:
        await migrate_preferences_to_user(user["id"])

    token = _create_token(user["id"], user["username"])
    return {"token": token, **_serialize_user_profile(user)}


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    """用户登录，返回 JWT"""
    user = await get_user_by_name(req.username.strip())
    if not user or not pwd_context.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token = _create_token(user["id"], user["username"])
    return {"token": token, **_serialize_user_profile(user)}


@app.get("/api/auth/me")
async def auth_me(authorization: Optional[str] = Header(None)):
    """验证 token，返回当前用户信息"""
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="未登录或 token 无效")
    fresh_user = await get_user_by_id(user["id"])
    if not fresh_user:
        raise HTTPException(status_code=401, detail="用户不存在")
    return _serialize_user_profile(fresh_user)


@app.patch("/api/auth/profile")
@app.post("/api/auth/profile")
async def patch_profile(
    req: ProfileUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    token_user = get_current_user(authorization)
    if not token_user:
        raise HTTPException(status_code=401, detail="未登录或 token 无效")

    current = await get_user_by_id(token_user["id"])
    if not current:
        raise HTTPException(status_code=404, detail="用户不存在")

    nickname = req.nickname if req.nickname is not None else current.get("nickname")
    if nickname is not None:
        nickname = nickname.strip()
        if nickname == "":
            nickname = None
        elif len(nickname) > 20:
            raise HTTPException(status_code=400, detail="昵称需为1-20个字符")

    avatar_preset = (
        req.avatar_preset
        if req.avatar_preset is not None
        else current.get("avatar_preset")
    )
    if avatar_preset == "":
        avatar_preset = None
    if avatar_preset is not None and avatar_preset not in ALLOWED_AVATAR_PRESETS:
        raise HTTPException(status_code=400, detail="头像预设无效")

    avatar_data = (
        req.avatar_data
        if req.avatar_data is not None
        else current.get("avatar_data")
    )
    if avatar_data == "":
        avatar_data = None
    if avatar_data is not None:
        if not re.match(r"^data:image/(png|jpeg|jpg|webp);base64,", avatar_data):
            raise HTTPException(status_code=400, detail="仅支持 PNG、JPEG、WebP 图片")
        if len(avatar_data) > 1_500_000:
            raise HTTPException(status_code=400, detail="头像图片过大，请压缩后重试")
        avatar_preset = None

    updated = await update_user_profile(
        token_user["id"],
        nickname,
        avatar_preset,
        avatar_data,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="用户不存在")
    return _serialize_user_profile(updated)


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
        previous_topics = {
            platform: [dict(topic) for topic in topics]
            for platform, topics in _cache["topics"].items()
        }
        tasks = [
            _fetch_single_source(name, source)
            for name, source in SOURCES.items()
        ]
        results = await asyncio.gather(*tasks)
        for name, topics in results:
            if topics:
                _cache["topics"][name] = topics
                await save_topics(name, topics)
        _refresh_topic_views(previous_topics)
        _cache["previous_topics"] = {
            platform: [dict(topic) for topic in topics]
            for platform, topics in _cache["topics"].items()
        }
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
            previous_topics = {
                key: [dict(topic) for topic in topics]
                for key, topics in _cache["topics"].items()
            }

            for name, topics in results:
                if topics:
                    _cache["topics"][name] = topics
                    await save_topics(name, topics)

            _refresh_topic_views(previous_topics)
            _cache["previous_topics"] = {
                key: [dict(topic) for topic in topics]
                for key, topics in _cache["topics"].items()
            }
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
        "aggregated_topics": _cache["aggregated_topics"],
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
async def ai_chat(req: ChatRequest, authorization: Optional[str] = Header(None)):
    """与 AI 对话讨论热点，需要登录"""
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录后再使用 AI 功能")
    if not req.question:
        raise HTTPException(status_code=400, detail="请输入问题")

    all_topics = []
    for platform, topics in _cache["topics"].items():
        for t in topics:
            t_copy = dict(t)
            t_copy["platform"] = platform
            all_topics.append(t_copy)

    answer = await chat_about_trends(req.question, all_topics)

    session_id = req.session_id

    if user:
        if not session_id:
            # 用问题前20字作为标题
            title = req.question[:20] + ("…" if len(req.question) > 20 else "")
            session_id = await create_chat_session(user["id"], title)
        await save_chat_message(session_id, "user", req.question)
        await save_chat_message(session_id, "assistant", answer)

    return {"answer": answer, "session_id": session_id}


# ======================== 聊天历史路由 ========================

@app.get("/api/chat/sessions")
async def list_chat_sessions(authorization: Optional[str] = Header(None)):
    """获取当前用户的会话列表"""
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")
    sessions = await get_chat_sessions(user["id"])
    # 序列化 datetime
    for s in sessions:
        if hasattr(s.get("created_at"), "isoformat"):
            s["created_at"] = s["created_at"].isoformat()
    return {"sessions": sessions}


@app.get("/api/chat/sessions/{session_id}/messages")
async def get_session(session_id: int, authorization: Optional[str] = Header(None)):
    """获取指定会话的消息列表"""
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")
    # 验证会话属于该用户
    sessions = await get_chat_sessions(user["id"], limit=200)
    if not any(s["id"] == session_id for s in sessions):
        raise HTTPException(status_code=404, detail="会话不存在")
    messages = await get_session_messages(session_id)
    for m in messages:
        if hasattr(m.get("created_at"), "isoformat"):
            m["created_at"] = m["created_at"].isoformat()
    return {"messages": messages}


@app.delete("/api/chat/sessions/{session_id}")
async def remove_session(session_id: int, authorization: Optional[str] = Header(None)):
    """删除指定会话"""
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")
    await delete_chat_session(session_id, user["id"])
    return {"status": "ok"}


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


# ======================== 个性化偏好 ========================

@app.get("/api/preferences")
async def get_preferences(authorization: Optional[str] = Header(None)):
    """获取用户所有偏好（收藏 + 关键词）"""
    user = get_current_user(authorization)
    user_id = user["id"] if user else None
    likes = await get_likes(user_id)
    keywords = await get_keywords(user_id)
    return {"likes": likes, "keywords": keywords, "logged_in": user is not None}


@app.post("/api/preferences/like")
async def add_like(req: LikeRequest, authorization: Optional[str] = Header(None)):
    """收藏话题"""
    user = get_current_user(authorization)
    user_id = user["id"] if user else None
    await save_like(req.platform, req.title, req.url, user_id)
    return {"status": "ok", "title": req.title}


@app.post("/api/preferences/unlike")
async def remove_like(req: UnlikeRequest, authorization: Optional[str] = Header(None)):
    """取消收藏"""
    user = get_current_user(authorization)
    user_id = user["id"] if user else None
    await delete_like(req.title, user_id)
    return {"status": "ok", "title": req.title}


@app.post("/api/preferences/keyword")
async def add_keyword(req: KeywordRequest, authorization: Optional[str] = Header(None)):
    """添加关键词订阅"""
    kw = req.keyword.strip()[:50]
    if not kw:
        raise HTTPException(status_code=400, detail="关键词不能为空")
    user = get_current_user(authorization)
    user_id = user["id"] if user else None
    await save_keyword(kw, user_id)
    keywords = await get_keywords(user_id)
    return {"status": "ok", "keywords": keywords}


@app.delete("/api/preferences/keyword/{keyword_id}")
async def remove_keyword(keyword_id: int, authorization: Optional[str] = Header(None)):
    """删除关键词订阅"""
    user = get_current_user(authorization)
    user_id = user["id"] if user else None
    await delete_keyword(keyword_id, user_id)
    return {"status": "ok"}


@app.get("/api/feed")
async def get_feed(keywords: str = ""):
    """轻量级外部新闻抓取（Google News / Bing RSS），供我的页面实时展示"""
    kw_list = [k.strip() for k in keywords.split(",") if k.strip()][:10]
    if not kw_list:
        return {"articles": []}
    articles = await rss_fetch_by_keywords(kw_list)
    return {"articles": articles}


@app.post("/api/recommend")
async def get_recommendations(authorization: Optional[str] = Header(None)):
    """生成个性化推荐：筛选热点 + 爬取 RSS + AI 报告"""
    user = get_current_user(authorization)
    user_id = user["id"] if user else None
    likes = await get_likes(user_id)
    keywords = await get_keywords(user_id)

    # 收集全部缓存话题
    all_topics = []
    for platform, topics in _cache["topics"].items():
        for t in topics:
            t_copy = dict(t)
            t_copy["platform"] = platform
            all_topics.append(t_copy)

    keyword_values = [k["value"] for k in keywords]

    # 并发：AI 分析 + RSS 抓取
    ai_task = generate_personal_report(likes, keywords, all_topics)

    async def _empty_rss():
        return []

    rss_task = rss_fetch_by_keywords(keyword_values) if keyword_values else _empty_rss()

    ai_result, rss_articles = await asyncio.gather(
        asyncio.wait_for(ai_task, timeout=18),
        asyncio.wait_for(rss_task, timeout=12),
        return_exceptions=True,
    )

    if isinstance(ai_result, Exception):
        ai_result = _build_recommendation_fallback(likes, keywords, all_topics)
    if isinstance(rss_articles, Exception):
        rss_articles = []

    # 存储 RSS 文章到 DB
    if rss_articles:
        from collections import defaultdict
        by_kw = defaultdict(list)
        for a in rss_articles:
            by_kw[a["keyword"]].append(a)
        for kw, arts in by_kw.items():
            await save_personal_articles(kw, arts)

    # 保存 AI 分析结果
    await save_analysis(
        "personal_report",
        json.dumps({"likes": len(likes), "keywords": keyword_values}, ensure_ascii=False),
        json.dumps(ai_result, ensure_ascii=False)
    )

    return {
        **ai_result,
        "fetched_articles": rss_articles,
    }
