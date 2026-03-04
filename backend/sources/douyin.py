"""
抖音热点数据源
"""

import httpx
from . import BaseSource


class DouyinSource(BaseSource):
    name = "douyin"
    icon = "douyin"

    async def fetch(self) -> list[dict]:
        url = "https://www.douyin.com/aweme/v1/web/hot/search/list/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Referer": "https://www.douyin.com/",
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url, headers=headers)
                data = resp.json()
                word_list = data.get("data", {}).get("word_list", [])
                results = []
                for i, item in enumerate(word_list[:30]):
                    results.append({
                        "title": item.get("word", ""),
                        "url": f"https://www.douyin.com/search/{item.get('word', '')}",
                        "hot_value": str(item.get("hot_value", "")),
                        "rank": i + 1,
                        "category": item.get("word_type", ""),
                    })
                return results
        except Exception as e:
            print(f"[DouyinSource] 获取失败: {e}")
            return []
