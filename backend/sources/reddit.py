"""
Reddit 热点数据源
使用 Reddit 公开 JSON API（无需认证）
"""

import httpx
from . import BaseSource


class RedditSource(BaseSource):
    name = "reddit"
    icon = "reddit"

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }

    async def fetch(self) -> list[dict]:
        """尝试多种方式获取 Reddit 热点"""
        methods = [
            self._fetch_popular,
            self._fetch_hot,
        ]
        for method in methods:
            try:
                results = await method()
                if results:
                    print(f"[RedditSource] {method.__name__} 成功, 获取 {len(results)} 条")
                    return results
            except Exception as e:
                print(f"[RedditSource] {method.__name__} 失败: {e}")
        return []

    async def _fetch_popular(self) -> list[dict]:
        """Reddit r/popular 热门帖子（公开 JSON 接口，无需 API key）"""
        url = "https://www.reddit.com/r/popular.json"
        params = {"limit": 30, "raw_json": 1}
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=self.HEADERS, params=params)
            resp.raise_for_status()
            data = resp.json()
            children = data.get("data", {}).get("children", [])
            results = []
            for i, child in enumerate(children):
                post = child.get("data", {})
                title = post.get("title", "")
                if not title:
                    continue
                subreddit = post.get("subreddit", "")
                score = post.get("score", 0)
                permalink = post.get("permalink", "")
                results.append({
                    "title": title,
                    "url": f"https://www.reddit.com{permalink}" if permalink else "",
                    "hot_value": f"↑{score:,}" if score else "",
                    "rank": i + 1,
                    "category": f"r/{subreddit}" if subreddit else "",
                })
            return results

    async def _fetch_hot(self) -> list[dict]:
        """Reddit r/all 热门作为备用"""
        url = "https://www.reddit.com/r/all/hot.json"
        params = {"limit": 30, "raw_json": 1}
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=self.HEADERS, params=params)
            resp.raise_for_status()
            data = resp.json()
            children = data.get("data", {}).get("children", [])
            results = []
            for i, child in enumerate(children):
                post = child.get("data", {})
                title = post.get("title", "")
                if not title:
                    continue
                subreddit = post.get("subreddit", "")
                score = post.get("score", 0)
                permalink = post.get("permalink", "")
                results.append({
                    "title": title,
                    "url": f"https://www.reddit.com{permalink}" if permalink else "",
                    "hot_value": f"↑{score:,}" if score else "",
                    "rank": i + 1,
                    "category": f"r/{subreddit}" if subreddit else "",
                })
            return results
