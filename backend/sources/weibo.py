"""
微博热搜数据源 - 多端点容错
"""

import httpx
from . import BaseSource


class WeiboSource(BaseSource):
    name = "weibo"
    icon = "weibo"

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://weibo.com/",
        "X-Requested-With": "XMLHttpRequest",
    }

    async def fetch(self) -> list[dict]:
        """尝试多种方式获取微博热搜"""
        methods = [
            self._fetch_hot_band,
            self._fetch_side_hot,
            self._fetch_mobile,
        ]
        for method in methods:
            try:
                results = await method()
                if results:
                    print(f"[WeiboSource] {method.__name__} 成功, 获取 {len(results)} 条")
                    return results
            except Exception as e:
                print(f"[WeiboSource] {method.__name__} 失败: {e}")
        return []

    async def _fetch_hot_band(self) -> list[dict]:
        """热搜榜 hot_band 接口（推荐，免登录实时热搜）"""
        url = "https://weibo.com/ajax/statuses/hot_band"
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=self.HEADERS)
            resp.raise_for_status()
            data = resp.json()
            band_list = data.get("data", {}).get("band_list", [])
            if not band_list:
                return []
            results = []
            for i, item in enumerate(band_list[:50]):
                word = item.get("word", item.get("note", ""))
                if not word:
                    continue
                results.append({
                    "title": word,
                    "url": f"https://s.weibo.com/weibo?q=%23{word}%23",
                    "hot_value": str(item.get("num", item.get("raw_hot", 0))),
                    "rank": i + 1,
                    "category": item.get("category", item.get("label_name", "")),
                })
            return results

    async def _fetch_side_hot(self) -> list[dict]:
        """侧边栏热搜接口"""
        url = "https://weibo.com/ajax/side/hotSearch"
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=self.HEADERS)
            resp.raise_for_status()
            data = resp.json()
            realtime = data.get("data", {}).get("realtime", [])
            if not realtime:
                return []
            return self._parse_realtime(realtime)

    async def _fetch_mobile(self) -> list[dict]:
        """移动端容器接口"""
        url = "https://m.weibo.cn/api/container/getIndex"
        params = {"containerid": "106003type=25&t=3&disable_hot=1&filter_type=realtimehot"}
        headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                          "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                          "Version/17.0 Mobile/15E148 Safari/604.1",
            "Accept": "application/json",
            "Referer": "https://m.weibo.cn/",
            "X-Requested-With": "XMLHttpRequest",
        }
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()
            cards = data.get("data", {}).get("cards", [])
            if not cards:
                return []
            card_group = cards[0].get("card_group", [])
            results = []
            for i, item in enumerate(card_group[:30]):
                desc = item.get("desc", "")
                if not desc:
                    continue
                results.append({
                    "title": desc,
                    "url": item.get("scheme", f"https://s.weibo.com/weibo?q=%23{desc}%23"),
                    "hot_value": str(item.get("desc_extr", "")),
                    "rank": i + 1,
                    "category": "",
                })
            return results

    def _parse_realtime(self, realtime: list) -> list[dict]:
        results = []
        for i, item in enumerate(realtime[:30]):
            word = item.get("word", item.get("note", ""))
            if not word:
                continue
            results.append({
                "title": word,
                "url": f"https://s.weibo.com/weibo?q=%23{word}%23",
                "hot_value": str(item.get("num", item.get("raw_hot", ""))),
                "rank": i + 1,
                "category": item.get("category", ""),
            })
        return results
