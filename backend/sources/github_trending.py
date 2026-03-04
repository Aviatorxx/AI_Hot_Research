"""
GitHub Trending 数据源
通过解析 GitHub Trending 页面获取热门项目
"""

import re
import httpx
from . import BaseSource


class GitHubTrendingSource(BaseSource):
    name = "github"
    icon = "github"

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
    }

    async def fetch(self) -> list[dict]:
        """获取 GitHub Trending 热门项目（API 优先，更快）"""
        results = await self._fetch_trending_api()
        if results:
            return results

        results = await self._fetch_trending_page()
        if results:
            return results

        return []

    async def _fetch_trending_page(self) -> list[dict]:
        """方法一：解析 GitHub Trending 页面"""
        url = "https://github.com/trending"
        results = []
        try:
            async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
                resp = await client.get(url, headers=self.HEADERS)
                if resp.status_code != 200:
                    return []

                html = resp.text

                # 匹配 trending 仓库条目
                # 每个条目包含在 <article class="Box-row"> 中
                articles = re.findall(
                    r'<article class="Box-row">(.*?)</article>',
                    html,
                    re.DOTALL,
                )

                for i, article in enumerate(articles[:30]):
                    # 提取仓库名: /owner/repo (exactly two segments)
                    repo_match = re.search(
                        r'<h2[^>]*>\s*<a[^>]*href="(/[^/]+/[^/"]+)"',
                        article,
                        re.DOTALL,
                    )
                    if not repo_match:
                        continue

                    repo_path = repo_match.group(1).strip()
                    repo_name = repo_path.lstrip("/")

                    # 提取描述
                    desc_match = re.search(
                        r'<p class="[^"]*col-9[^"]*"[^>]*>(.*?)</p>',
                        article,
                        re.DOTALL,
                    )
                    description = ""
                    if desc_match:
                        description = re.sub(r'<[^>]+>', '', desc_match.group(1)).strip()

                    # 提取语言
                    lang_match = re.search(
                        r'<span\s+itemprop="programmingLanguage">(.*?)</span>',
                        article,
                    )
                    language = lang_match.group(1).strip() if lang_match else ""

                    # 提取今日 star 数
                    stars_match = re.search(
                        r'(\d[\d,]*)\s+stars\s+today',
                        article,
                    )
                    stars_today = stars_match.group(1).replace(",", "") if stars_match else ""

                    # 提取总 star 数
                    total_stars_match = re.search(
                        r'<a[^>]*href="' + re.escape(repo_path) + r'/stargazers"[^>]*>\s*(?:<[^>]*>)*\s*([\d,]+)\s*',
                        article,
                        re.DOTALL,
                    )
                    total_stars = ""
                    if total_stars_match:
                        total_stars = total_stars_match.group(1).replace(",", "").strip()

                    # 热度值：优先用今日 star，否则用总 star
                    hot_value = f"⭐ {stars_today} today" if stars_today else f"⭐ {total_stars}" if total_stars else ""

                    title = repo_name
                    if description:
                        title = f"{repo_name} - {description[:80]}"

                    results.append({
                        "title": title,
                        "url": f"https://github.com{repo_path}",
                        "hot_value": hot_value,
                        "rank": i + 1,
                        "category": language or "Trending",
                    })

                print(f"[GitHubTrending] 页面解析获取 {len(results)} 个项目")
                return results

        except Exception as e:
            print(f"[GitHubTrending] 页面解析失败: {e}")
            return []

    async def _fetch_trending_api(self) -> list[dict]:
        """方法二：使用 GitHub Search API 获取近期热门仓库（无需认证）"""
        url = "https://api.github.com/search/repositories"
        params = {
            "q": "created:>2024-01-01 stars:>100",
            "sort": "stars",
            "order": "desc",
            "per_page": 30,
        }
        results = []
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.get(
                    url,
                    params=params,
                    headers={
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "AI-Hot-Research/1.0",
                    },
                )
                if resp.status_code != 200:
                    return []

                data = resp.json()
                items = data.get("items", [])

                for i, item in enumerate(items[:30]):
                    full_name = item.get("full_name", "")
                    description = item.get("description", "") or ""
                    stars = item.get("stargazers_count", 0)
                    language = item.get("language", "") or ""

                    title = full_name
                    if description:
                        title = f"{full_name} - {description[:80]}"

                    results.append({
                        "title": title,
                        "url": item.get("html_url", f"https://github.com/{full_name}"),
                        "hot_value": f"⭐ {stars:,}",
                        "rank": i + 1,
                        "category": language or "Trending",
                    })

                print(f"[GitHubTrending] API获取 {len(results)} 个项目")
                return results

        except Exception as e:
            print(f"[GitHubTrending] API获取失败: {e}")
            return []
