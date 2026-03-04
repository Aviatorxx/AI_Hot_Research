"""
百度热搜数据源 - 多端点容错
"""

import httpx
from . import BaseSource


class BaiduSource(BaseSource):
    name = "baidu"
    icon = "baidu"

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
    }

    async def fetch(self) -> list[dict]:
        """尝试多种方式获取百度热搜"""
        methods = [
            self._fetch_pc_api,
            self._fetch_wise_api,
        ]
        for method in methods:
            try:
                results = await method()
                if results:
                    print(f"[BaiduSource] {method.__name__} 成功, 获取 {len(results)} 条")
                    return results
            except Exception as e:
                print(f"[BaiduSource] {method.__name__} 失败: {e}")
        return []

    async def _fetch_pc_api(self) -> list[dict]:
        """PC端 API（推荐，返回50条完整数据）"""
        url = "https://top.baidu.com/api/board?tab=realtime"
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=self.HEADERS)
            resp.raise_for_status()
            data = resp.json()
            cards = data.get("data", {}).get("cards", [])
            if not cards:
                return []
            content = cards[0].get("content", [])
            results = []
            for i, item in enumerate(content[:50]):
                word = item.get("word", item.get("query", ""))
                if not word:
                    continue
                results.append({
                    "title": word,
                    "url": item.get("url", f"https://www.baidu.com/s?wd={word}"),
                    "hot_value": str(item.get("hotScore", "")),
                    "rank": i + 1,
                    "category": item.get("tag", ""),
                })
            return results

    async def _fetch_wise_api(self) -> list[dict]:
        """移动端 API（备选）"""
        url = "https://top.baidu.com/api/board?platform=wise&tab=realtime"
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=self.HEADERS)
            resp.raise_for_status()
            data = resp.json()
            cards = data.get("data", {}).get("cards", [])
            if not cards:
                return []
            content = cards[0].get("content", [])
            results = []
            for i, item in enumerate(content[:50]):
                word = item.get("word", item.get("query", ""))
                if not word:
                    continue
                results.append({
                    "title": word,
                    "url": item.get("url", f"https://www.baidu.com/s?wd={word}"),
                    "hot_value": str(item.get("hotScore", "")),
                    "rank": i + 1,
                    "category": item.get("tag", ""),
                })
            return results
