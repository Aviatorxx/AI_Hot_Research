"""
个性化 RSS 抓取模块
根据用户关键词，从 Google News / Bing News RSS 获取相关内容
无需额外依赖，使用内置 xml.etree.ElementTree 解析
"""

import asyncio
import xml.etree.ElementTree as ET
from urllib.parse import quote
from datetime import datetime

import httpx

TIMEOUT = 8  # 每个关键词的超时时间（秒）
MAX_ITEMS_PER_KEYWORD = 10  # 每个关键词最多返回条数


# RSS 源优先级：Google News → Bing News（服务器可能 GFW 限制 Google，自动 fallback）
def _google_news_url(keyword: str) -> str:
    kw = quote(keyword)
    return f"https://news.google.com/rss/search?q={kw}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans"


def _bing_news_url(keyword: str) -> str:
    kw = quote(keyword)
    return f"https://www.bing.com/news/search?q={kw}&format=RSS"


def _parse_rss(xml_text: str, keyword: str) -> list[dict]:
    """解析 RSS XML，返回标准化文章列表"""
    items = []
    try:
        root = ET.fromstring(xml_text)
        # RSS 2.0: root > channel > item
        channel = root.find("channel")
        if channel is None:
            return items
        for item in channel.findall("item")[:MAX_ITEMS_PER_KEYWORD]:
            title_el = item.find("title")
            link_el = item.find("link")
            source_el = item.find("source")
            pubdate_el = item.find("pubDate")

            title = title_el.text.strip() if title_el is not None and title_el.text else ""
            url = link_el.text.strip() if link_el is not None and link_el.text else ""
            source = source_el.text.strip() if source_el is not None and source_el.text else ""
            pub = pubdate_el.text.strip() if pubdate_el is not None and pubdate_el.text else ""

            if title:
                # 过滤 Google News 的 HTML 残留（title 里有时包含来源后缀 " - 源网站"）
                if " - " in title:
                    title, *rest = title.rsplit(" - ", 1)
                    if not source and rest:
                        source = rest[0]
                items.append({
                    "title": title.strip(),
                    "url": url,
                    "source": source,
                    "published_at": pub,
                    "keyword": keyword,
                })
    except ET.ParseError:
        pass
    return items


async def _fetch_keyword(client: httpx.AsyncClient, keyword: str) -> list[dict]:
    """抓取单个关键词的 RSS（Google News 优先，失败时 fallback 到 Bing）"""
    for url_fn in [_google_news_url, _bing_news_url]:
        url = url_fn(keyword)
        try:
            resp = await client.get(url, timeout=TIMEOUT)
            if resp.status_code == 200 and "<rss" in resp.text:
                items = _parse_rss(resp.text, keyword)
                if items:
                    return items
        except Exception:
            continue
    return []


async def fetch_by_keywords(keywords: list[str]) -> list[dict]:
    """
    并发抓取多个关键词的 RSS 新闻
    返回: [{title, url, source, published_at, keyword}, ...]
    """
    if not keywords:
        return []

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; RSS-Reader/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml",
    }

    async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
        tasks = [_fetch_keyword(client, kw) for kw in keywords]
        results = await asyncio.gather(*tasks)

    articles = []
    for result in results:
        articles.extend(result)
    return articles
