"""
AI Hot Research - DeepSeek AI 服务
使用 DeepSeek (deepseek-chat) 进行热点分析
API 文档: https://api-docs.deepseek.com/zh-cn/
"""

import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

# DeepSeek 使用 OpenAI 兼容接口
client = AsyncOpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY", ""),
    base_url="https://api.deepseek.com"
)

MODEL = "deepseek-chat"


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


async def chat_about_trends(question: str, context_topics: list[dict] = None) -> str:
    """
    基于热点数据的自由对话
    """
    context = ""
    if context_topics:
        context = "当前热搜数据参考：\n" + "\n".join(
            f"- [{t.get('platform', '')}] {t.get('title', '')}"
            for t in context_topics[:30]
        )

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": f"你是一位智能热点分析助手。{context}"},
                {"role": "user", "content": question}
            ],
            temperature=0.8,
            max_tokens=1000,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"AI 服务调用失败: {str(e)}"
