"""
知乎热榜数据源 - 多端点容错
"""

import re
import json
import httpx
from . import BaseSource


class ZhihuSource(BaseSource):
    name = "zhihu"
    icon = "zhihu"

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
    }

    async def fetch(self) -> list[dict]:
        """尝试多种方式获取知乎热榜"""
        methods = [
            self._fetch_api_hot_list,
            self._fetch_top_search,
        ]
        for method in methods:
            try:
                results = await method()
                if results:
                    print(f"[ZhihuSource] {method.__name__} 成功, 获取 {len(results)} 条")
                    return results
            except Exception as e:
                print(f"[ZhihuSource] {method.__name__} 失败: {e}")
        return []

    async def _fetch_api_hot_list(self) -> list[dict]:
        """api.zhihu.com 热榜接口（推荐，免登录返回30条）"""
        url = "https://api.zhihu.com/topstory/hot-list"
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=self.HEADERS)
            resp.raise_for_status()
            data = resp.json()
            items = data.get("data", [])
            if not items:
                return []
            results = []
            for i, item in enumerate(items[:50]):
                target = item.get("target", {})
                title = target.get("title", "")
                if not title:
                    continue
                qid = target.get("id", "")
                detail = item.get("detail_text", "")  # e.g. "568 万热度"
                results.append({
                    "title": title,
                    "url": f"https://www.zhihu.com/question/{qid}" if qid else "https://www.zhihu.com/hot",
                    "hot_value": detail,
                    "rank": i + 1,
                    "category": target.get("type", "question"),
                })
            return results

    async def _fetch_top_search(self) -> list[dict]:
        """知乎热搜词接口（备选，免登录返回10条热搜词）"""
        url = "https://www.zhihu.com/api/v4/search/top_search"
        headers = {**self.HEADERS, "Referer": "https://www.zhihu.com/"}
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            words = data.get("top_search", {}).get("words", [])
            if not words:
                return []
            results = []
            for i, item in enumerate(words[:20]):
                query = item.get("display_query", item.get("query", ""))
                if not query:
                    continue
                results.append({
                    "title": query,
                    "url": f"https://www.zhihu.com/search?type=content&q={query}",
                    "hot_value": "",
                    "rank": i + 1,
                    "category": "search",
                })
            return results
