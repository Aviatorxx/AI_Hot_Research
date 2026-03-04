"""
B站热门数据源
"""

import httpx
from . import BaseSource


class BilibiliSource(BaseSource):
    name = "bilibili"
    icon = "bilibili"

    async def fetch(self) -> list[dict]:
        # B站热搜
        url = "https://api.bilibili.com/x/web-interface/wbi/search/square"
        # 备用：热门视频
        hot_url = "https://api.bilibili.com/x/web-interface/popular"
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Referer": "https://www.bilibili.com",
        }
        results = []
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                # 优先获取搜索热词
                resp = await client.get(url, headers=headers)
                data = resp.json()
                trending = data.get("data", {}).get("trending", {}).get("list", [])
                if trending:
                    for i, item in enumerate(trending[:30]):
                        results.append({
                            "title": item.get("keyword", item.get("show_name", "")),
                            "url": f"https://search.bilibili.com/all?keyword={item.get('keyword', '')}",
                            "hot_value": str(item.get("heat_score", "")),
                            "rank": i + 1,
                            "category": "",
                        })
                else:
                    # 回退到热门视频
                    resp = await client.get(hot_url, headers=headers, params={"ps": 30, "pn": 1})
                    data = resp.json()
                    video_list = data.get("data", {}).get("list", [])
                    for i, item in enumerate(video_list[:30]):
                        results.append({
                            "title": item.get("title", ""),
                            "url": f"https://www.bilibili.com/video/{item.get('bvid', '')}",
                            "hot_value": str(item.get("stat", {}).get("view", "")),
                            "rank": i + 1,
                            "category": item.get("tname", ""),
                        })
                return results
        except Exception as e:
            print(f"[BilibiliSource] 获取失败: {e}")
            return []
