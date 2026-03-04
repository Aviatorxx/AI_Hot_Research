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
