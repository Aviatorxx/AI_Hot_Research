"""
X (Twitter) 热点数据源
使用多个公开趋势接口容错
"""

import httpx
from . import BaseSource


class TwitterSource(BaseSource):
    name = "twitter"
    icon = "twitter"

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
    }

    async def fetch(self) -> list[dict]:
        """尝试多种方式获取 X/Twitter 趋势"""
        methods = [
            self._fetch_twittertrends,
            self._fetch_trends24,
            self._fetch_trendsmap,
        ]
        for method in methods:
            try:
                results = await method()
                if results:
                    print(f"[TwitterSource] {method.__name__} 成功, 获取 {len(results)} 条")
                    return results
            except Exception as e:
                print(f"[TwitterSource] {method.__name__} 失败: {e}")
        return []

    async def _fetch_twittertrends(self) -> list[dict]:
        """通过第三方 API 获取 Twitter/X 全球趋势"""
        url = "https://api.twittertrends.org/v1/trending"
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=self.HEADERS)
            resp.raise_for_status()
            data = resp.json()
            trends = data if isinstance(data, list) else data.get("trends", data.get("data", []))
            results = []
            for i, item in enumerate(trends[:30]):
                if isinstance(item, str):
                    name = item
                    volume = ""
                    url_link = f"https://x.com/search?q={name}"
                else:
                    name = item.get("name", item.get("keyword", item.get("trend", "")))
                    volume = str(item.get("tweet_volume", item.get("volume", ""))) if item.get("tweet_volume") or item.get("volume") else ""
                    url_link = item.get("url", f"https://x.com/search?q={name}")
                if not name:
                    continue
                results.append({
                    "title": name,
                    "url": url_link,
                    "hot_value": volume,
                    "rank": i + 1,
                    "category": "Trending",
                })
            return results

    async def _fetch_trends24(self) -> list[dict]:
        """通过 trends24.in 获取趋势（HTML 解析备用方案）"""
        url = "https://trends24.in/"
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers={
                **self.HEADERS,
                "Accept": "text/html,application/xhtml+xml",
            })
            resp.raise_for_status()
            html = resp.text

            # 简单正则提取趋势词
            import re
            # 匹配 <a href="/...">趋势词</a> 模式
            pattern = r'<a[^>]*class="[^"]*trend-link[^"]*"[^>]*>([^<]+)</a>'
            matches = re.findall(pattern, html)
            if not matches:
                # 备用模式
                pattern = r'<li[^>]*>\s*<a[^>]*>([^<]+)</a>'
                matches = re.findall(pattern, html)

            results = []
            seen = set()
            for i, name in enumerate(matches):
                name = name.strip()
                if not name or name in seen or len(name) < 2:
                    continue
                seen.add(name)
                results.append({
                    "title": name,
                    "url": f"https://x.com/search?q={name}",
                    "hot_value": "",
                    "rank": len(results) + 1,
                    "category": "Trending",
                })
                if len(results) >= 30:
                    break
            return results

    async def _fetch_trendsmap(self) -> list[dict]:
        """通过 getdaytrends.com 做最后回退"""
        url = "https://getdaytrends.com/"
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers={
                **self.HEADERS,
                "Accept": "text/html,application/xhtml+xml",
            })
            resp.raise_for_status()
            html = resp.text

            import re
            pattern = r'<a[^>]*href="/[^"]*trend/[^"]*"[^>]*>([^<]+)</a>'
            matches = re.findall(pattern, html)
            if not matches:
                pattern = r'class="tag[^"]*"[^>]*>([^<]+)<'
                matches = re.findall(pattern, html)

            results = []
            seen = set()
            for name in matches:
                name = name.strip().lstrip('#')
                if not name or name in seen or len(name) < 2:
                    continue
                seen.add(name)
                results.append({
                    "title": name,
                    "url": f"https://x.com/search?q={name}",
                    "hot_value": "",
                    "rank": len(results) + 1,
                    "category": "Trending",
                })
                if len(results) >= 30:
                    break
            return results
