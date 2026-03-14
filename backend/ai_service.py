"""
AI Hot Research - DeepSeek AI 服务
使用 DeepSeek (deepseek-chat) 进行热点分析
API 文档: https://api-docs.deepseek.com/zh-cn/
"""

import os
import json
import asyncio
from typing import AsyncIterator
from openai import AsyncOpenAI
from dotenv import load_dotenv

try:
    from ddgs import DDGS
    _DDGS_AVAILABLE = True
except ImportError:
    try:
        from duckduckgo_search import DDGS
        _DDGS_AVAILABLE = True
    except ImportError:
        _DDGS_AVAILABLE = False

load_dotenv()

# DeepSeek 使用 OpenAI 兼容接口
client = AsyncOpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY", ""),
    base_url="https://api.deepseek.com"
)

MODEL = "deepseek-chat"


def _build_chat_messages(question: str, context_topics: list[dict] = None) -> list[dict]:
    import re

    hot_topics = context_topics or []
    hot_context = ""
    if hot_topics:
        hot_context = "\n\n【当前热搜实时数据】\n" + "\n".join(
            f"- [{t.get('platform', '')}] {t.get('title', '')}"
            for t in hot_topics[:50]
        )

    # --- Smart search routing ---
    # Extract English/technical tokens from the question
    en_tokens = re.findall(r'[A-Za-z][A-Za-z0-9\-\.]{1,}', question)
    has_chinese = any('\u4e00' <= c <= '\u9fff' for c in question)
    # Detect "X是什么 / X是啥 / what is X" definitional patterns
    is_definition_query = bool(re.search(r'是什么|是啥|介绍|讲讲|说说|what\s+is|tell me about', question, re.I))

    search_tasks = []
    if has_chinese and en_tokens and is_definition_query:
        # For "TQNET是什么" style: Chinese DDG gives noisy/wrong brand results.
        # Search in English ONLY using the technical term + "what is" for clean results.
        en_query = f"what is {' '.join(en_tokens)}"
        search_tasks.append(_web_search(en_query))
        # Also search English term + "paper" / "definition" for academic terms
        search_tasks.append(_web_search(f"{' '.join(en_tokens)} paper definition"))
    elif has_chinese and en_tokens:
        # Mixed query: search both Chinese original and English tokens in parallel
        search_tasks.append(_web_search(question))
        search_tasks.append(_web_search(" ".join(en_tokens)))
    else:
        # Pure Chinese or pure English
        search_tasks.append(_web_search(question))
        if not has_chinese and len(question) < 60:
            search_tasks.append(_web_search(question + " 中文"))

    return {
        "hot_context": hot_context,
        "search_tasks": search_tasks,
        "question": question,
    }


async def _prepare_chat_messages(question: str, context_topics: list[dict] = None) -> list[dict]:
    chat_input = _build_chat_messages(question, context_topics)
    search_results_list = await asyncio.gather(*chat_input["search_tasks"])
    combined = "\n".join(r for r in search_results_list if r)

    web_context = ""
    if combined:
        web_context = (
            "\n\n【网络搜索参考资料】\n"
            "注意：以下为搜索引擎返回的片段，可能存在同名歧义。"
            "请综合自身知识进行甄别，优先选取与问题最相关的含义。\n"
            f"{combined}"
        )

    system_prompt = (
        "你是一个全知全能的智能助手，同时具备深厚的百科知识和实时资讯获取能力。\n\n"
        "回答原则：\n"
        "1. **知识库优先**——你的训练知识是最可靠的信息来源，务必以此为主。\n"
        "2. **搜索结果辅助参考**——搜索片段可能混有同名品牌、公司、产品等干扰项，"
        "若某条搜索结果明显与问题语境不符（如问学术概念却返回了企业产品），直接忽略。\n"
        "3. **英文缩写/技术术语**——优先从学术/技术角度解释，英文来源比中文更权威；"
        "若存在多个同名缩写，列出最主流的 1-2 个并说明各自含义。\n"
        "4. **时效性问题**——如询问最新新闻/动态，参考搜索结果补充知识截止日期后的信息。\n"
        "5. 回答条理清晰，用 **加粗** 标注关键词，段落间空行分隔，不超过 400 字，中文为主。\n"
        "直接给出最佳答案，不加任何免责声明或来源标注。"
        f"{chat_input['hot_context']}{web_context}"
    )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": question},
    ]


async def analyze_hotspots(topics: list[dict]) -> dict:
    """
    分析多平台热点，识别趋势、归类、生成洞察
    """
    topics_text = "\n".join(
        f"[{t.get('platform', '未知')}] #{t.get('rank', '?')} {t.get('title', '')} "
        f"(热度: {t.get('hot_value', 'N/A')})"
        for t in topics[:60]  # 限制数量避免 token 过多
    )

    prompt = f"""你是一位专业的热点分析师。请分析以下来自多个平台的实时热搜数据，完成以下任务：

1. **热点聚类**：将相关话题归为同一事件/主题，给出 5-8 个核心热点集群
2. **趋势判断**：每个集群的热度趋势（上升🔥/稳定➡️/下降📉）
3. **情感分析**：每个集群的公众情感倾向（正面/中性/负面）
4. **关注建议**：哪些值得重点关注，为什么

当前热搜数据：
{topics_text}

请以以下 JSON 格式返回（不要包含 markdown 代码块标记）：
{{
  "clusters": [
    {{
      "name": "集群名称",
      "keywords": ["关键词1", "关键词2"],
      "topics": ["相关话题1", "相关话题2"],
      "trend": "rising|stable|falling",
      "sentiment": "positive|neutral|negative",
      "heat_score": 85,
      "summary": "一句话总结",
      "reason": "为什么值得关注"
    }}
  ],
  "overview": "整体热点概况（2-3句话）",
  "recommendation": "最值得关注的话题及原因"
}}"""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "你是一位资深的互联网热点分析师，擅长从海量信息中提取关键趋势和洞察。请始终返回有效的 JSON 格式。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000,
        )
        content = response.choices[0].message.content.strip()
        # 尝试清理可能的 markdown 代码块
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
        return json.loads(content)
    except json.JSONDecodeError:
        return {"error": "AI 返回格式解析失败", "raw": content}
    except Exception as e:
        return {"error": f"AI 服务调用失败: {str(e)}"}


async def analyze_single_topic(topic_title: str) -> dict:
    """
    深度分析单个热点话题
    """
    prompt = f"""请深度分析以下热点话题：

「{topic_title}」

请从以下维度分析（JSON 格式返回，不要包含 markdown 代码块标记）：
{{
  "title": "{topic_title}",
  "background": "事件背景（2-3句话）",
  "timeline": ["时间线关键节点1", "时间线关键节点2"],
  "key_figures": ["关键人物/机构"],
  "public_opinion": {{
    "positive": "正面观点概要",
    "negative": "负面观点概要",
    "neutral": "中立观点概要"
  }},
  "trend_prediction": "未来走向预测",
  "related_topics": ["关联话题1", "关联话题2"],
  "impact_score": 75,
  "category": "分类（如：科技/娱乐/社会/财经/体育/国际）"
}}"""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "你是一位专业的新闻分析师，请提供客观、深入的分析。返回有效 JSON 格式。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500,
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
        return json.loads(content)
    except json.JSONDecodeError:
        return {"error": "AI 返回格式解析失败", "raw": content}
    except Exception as e:
        return {"error": f"AI 服务调用失败: {str(e)}"}


async def generate_personal_report(
    likes: list[dict],
    keywords: list[dict],
    all_topics: list[dict],
) -> dict:
    """
    根据用户收藏和关键词订阅，生成个性化兴趣画像和推荐报告
    """
    likes_text = "\n".join(
        f"- [{l.get('platform', '')}] {l.get('value', '')}"
        for l in likes[:30]
    )
    keywords_text = "、".join(k.get("value", "") for k in keywords)
    topics_text = "\n".join(
        f"[{t.get('platform', '未知')}] {t.get('title', '')}"
        for t in all_topics[:80]
    )

    prompt = f"""你是一位个性化推荐引擎。根据用户的兴趣数据，从当前热搜中为用户精选内容并生成报告。

用户收藏的话题：
{likes_text or "（暂无收藏）"}

用户订阅的关键词：{keywords_text or "（暂无关键词）"}

当前全平台热搜数据（共 {len(all_topics)} 条）：
{topics_text}

请完成以下任务（JSON 格式，不含 markdown 代码块标记）：
1. 从收藏和关键词中提炼用户兴趣标签（3-8 个）
2. 从热搜数据中筛选最符合用户兴趣的话题（10-15 条），并给出推荐理由
3. 撰写一段 200-400 字的个性化趋势摘要报告
4. 用一句话概括用户兴趣画像

返回格式：
{{
  "interest_tags": ["标签1", "标签2"],
  "query_summary": "一句话描述用户兴趣画像",
  "recommended_topics": [
    {{"title": "话题标题", "url": "原始URL", "platform": "平台", "reason": "推荐理由（15字以内）"}}
  ],
  "report": "个性化趋势摘要报告全文"
}}"""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "你是一位专业的个性化内容推荐系统，请根据用户兴趣精准筛选和分析。返回有效 JSON 格式。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
            max_tokens=2000,
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
        return json.loads(content)
    except json.JSONDecodeError:
        return {"error": "AI 返回格式解析失败", "raw": content}
    except Exception as e:
        return {"error": f"AI 服务调用失败: {str(e)}"}


async def _web_search(query: str, max_results: int = 6, timeout: float = 6.0) -> str:
    """DuckDuckGo 网络搜索，带超时保护，返回格式化摘要文本。"""
    if not _DDGS_AVAILABLE:
        return ""
    try:
        loop = asyncio.get_event_loop()
        results = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                lambda: list(DDGS().text(query, max_results=max_results))
            ),
            timeout=timeout
        )
        if not results:
            return ""
        lines = []
        for r in results:
            title = r.get('title', '')
            body = r.get('body', '')[:250]
            lines.append(f"- {title}: {body}")
        return "\n".join(lines)
    except Exception:
        return ""


async def chat_about_trends(question: str, context_topics: list[dict] = None) -> str:
    """
    全能智能助手：融合实时热搜数据 + 网络搜索 + 自身知识库
    """
    try:
        messages = await _prepare_chat_messages(question, context_topics)
        response = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=800,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"AI 服务调用失败: {str(e)}"


async def stream_chat_about_trends(
    question: str,
    context_topics: list[dict] = None,
) -> AsyncIterator[str]:
    """以 token 级流式输出聊天回答。"""
    messages = await _prepare_chat_messages(question, context_topics)
    stream = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=800,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            yield delta
