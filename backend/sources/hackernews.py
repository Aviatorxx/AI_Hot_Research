"""
Hacker News 热点数据源
使用 HN 官方 Firebase API（无需认证，全球可访问）
"""

import asyncio
import httpx
from . import BaseSource


class HackerNewsSource(BaseSource):
    name = "hackernews"
    icon = "hackernews"

    BASE_URL = "https://hacker-news.firebaseio.com/v0"

    async def fetch(self) -> list[dict]:
        """获取 Hacker News Top Stories"""
        results = []
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                # 获取 top story IDs
                resp = await client.get(f"{self.BASE_URL}/topstories.json")
                resp.raise_for_status()
                story_ids = resp.json()[:30]

                # 全部30条并发获取详情（单批）
                tasks = [
                    client.get(f"{self.BASE_URL}/item/{sid}.json")
                    for sid in story_ids
                ]
                responses = await asyncio.gather(*tasks, return_exceptions=True)
                if True:  # 保持缩进一致
                    for resp in responses:
                        if isinstance(resp, Exception):
                            continue
                        item = resp.json()
                        if not item or not item.get("title"):
                            continue

                        title = item["title"]
                        score = item.get("score", 0)
                        item_id = item.get("id", "")
                        url = item.get("url", "")
                        item_type = item.get("type", "story")

                        # 如果没有外部链接，使用 HN 讨论页
                        if not url:
                            url = f"https://news.ycombinator.com/item?id={item_id}"

                        # 评论数
                        descendants = item.get("descendants", 0)
                        hot_str = f"▲{score}"
                        if descendants:
                            hot_str += f" · {descendants} comments"

                        results.append({
                            "title": title,
                            "url": url,
                            "hot_value": hot_str,
                            "rank": len(results) + 1,
                            "category": item_type.capitalize() if item_type != "story" else "",
                        })

                print(f"[HackerNews] 获取 {len(results)} 条热门")
                return results

        except Exception as e:
            print(f"[HackerNews] 获取失败: {e}")
            return []
