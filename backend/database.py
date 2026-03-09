"""
AI Hot Research - 数据库模块
使用 SQLite 存储热点数据和 AI 分析结果
"""

import aiosqlite
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "hotresearch.db")


async def init_db():
    """初始化数据库表"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS hot_topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                platform TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT,
                hot_value TEXT,
                rank INTEGER,
                category TEXT,
                fetched_at TEXT NOT NULL,
                UNIQUE(platform, title, fetched_at)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS ai_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                analysis_type TEXT NOT NULL,
                content TEXT NOT NULL,
                result TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_hot_topics_platform 
            ON hot_topics(platform, fetched_at)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_hot_topics_time 
            ON hot_topics(fetched_at)
        """)
        await db.commit()


async def save_topics(platform: str, topics: list[dict]):
    """保存热搜数据到数据库"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    async with aiosqlite.connect(DB_PATH) as db:
        for t in topics:
            try:
                await db.execute(
                    """INSERT OR IGNORE INTO hot_topics 
                       (platform, title, url, hot_value, rank, category, fetched_at) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (platform, t.get("title", ""), t.get("url", ""),
                     str(t.get("hot_value", "")), t.get("rank", 0),
                     t.get("category", ""), now)
                )
            except Exception:
                pass
        await db.commit()


async def get_recent_topics(platform: str = None, limit: int = 50):
    """获取最近的热点数据"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if platform:
            cursor = await db.execute(
                """SELECT * FROM hot_topics 
                   WHERE platform = ? 
                   ORDER BY fetched_at DESC, rank ASC 
                   LIMIT ?""",
                (platform, limit)
            )
        else:
            cursor = await db.execute(
                """SELECT * FROM hot_topics 
                   ORDER BY fetched_at DESC, rank ASC 
                   LIMIT ?""",
                (limit,)
            )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def save_analysis(analysis_type: str, content: str, result: str):
    """保存 AI 分析结果"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO ai_analyses (analysis_type, content, result, created_at)
               VALUES (?, ?, ?, ?)""",
            (analysis_type, content, result, now)
        )
        await db.commit()


async def get_recent_analyses(limit: int = 10):
    """获取最近的 AI 分析"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT * FROM ai_analyses ORDER BY created_at DESC LIMIT ?""",
            (limit,)
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


# ======================== 用户偏好 ========================

async def init_preferences_tables():
    """初始化用户偏好相关表"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL CHECK(type IN ('like', 'keyword')),
                value TEXT NOT NULL,
                platform TEXT,
                url TEXT,
                created_at TEXT NOT NULL,
                UNIQUE(type, value)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS personal_articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keyword TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT,
                source TEXT,
                published_at TEXT,
                fetched_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_prefs_type
            ON user_preferences(type)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_personal_articles_keyword
            ON personal_articles(keyword, fetched_at)
        """)
        await db.commit()


async def save_like(platform: str, title: str, url: str):
    """收藏话题"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR IGNORE INTO user_preferences (type, value, platform, url, created_at)
               VALUES ('like', ?, ?, ?, ?)""",
            (title, platform, url, now)
        )
        await db.commit()


async def delete_like(title: str):
    """取消收藏"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "DELETE FROM user_preferences WHERE type='like' AND value=?",
            (title,)
        )
        await db.commit()


async def get_likes() -> list[dict]:
    """获取所有收藏"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM user_preferences WHERE type='like' ORDER BY created_at DESC"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def save_keyword(keyword: str):
    """添加关键词订阅"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR IGNORE INTO user_preferences (type, value, created_at)
               VALUES ('keyword', ?, ?)""",
            (keyword, now)
        )
        await db.commit()


async def delete_keyword(keyword_id: int):
    """删除关键词订阅"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "DELETE FROM user_preferences WHERE id=? AND type='keyword'",
            (keyword_id,)
        )
        await db.commit()


async def get_keywords() -> list[dict]:
    """获取所有关键词订阅"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM user_preferences WHERE type='keyword' ORDER BY created_at ASC"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def save_personal_articles(keyword: str, articles: list[dict]):
    """保存关键词抓取的文章"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    async with aiosqlite.connect(DB_PATH) as db:
        for a in articles:
            try:
                await db.execute(
                    """INSERT OR IGNORE INTO personal_articles
                       (keyword, title, url, source, published_at, fetched_at)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (keyword, a.get("title", ""), a.get("url", ""),
                     a.get("source", ""), a.get("published_at", ""), now)
                )
            except Exception:
                pass
        await db.commit()


async def get_personal_articles(keywords: list[str] = None, limit: int = 50) -> list[dict]:
    """获取最近抓取的个性化文章"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if keywords:
            placeholders = ",".join("?" * len(keywords))
            cursor = await db.execute(
                f"""SELECT * FROM personal_articles
                    WHERE keyword IN ({placeholders})
                    ORDER BY fetched_at DESC LIMIT ?""",
                (*keywords, limit)
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM personal_articles ORDER BY fetched_at DESC LIMIT ?",
                (limit,)
            )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
