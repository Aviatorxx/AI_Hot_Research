"""
AI Hot Research - 数据库模块
使用 PostgreSQL (asyncpg) 存储热点数据和 AI 分析结果
"""

import asyncpg
import os
from datetime import datetime
from typing import Optional

_pool: Optional[asyncpg.Pool] = None

DATABASE_URL = os.getenv("DATABASE_URL", "")


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    return _pool


async def init_db():
    """初始化数据库表（所有表）"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        # 热点话题
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS hot_topics (
                id SERIAL PRIMARY KEY,
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
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_hot_topics_platform
            ON hot_topics(platform, fetched_at)
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_hot_topics_time
            ON hot_topics(fetched_at)
        """)
        # AI 分析
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS ai_analyses (
                id SERIAL PRIMARY KEY,
                analysis_type TEXT NOT NULL,
                content TEXT NOT NULL,
                result TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        # 用户
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        # 用户偏好（含 user_id）
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL CHECK(type IN ('like', 'keyword')),
                value TEXT NOT NULL,
                platform TEXT,
                url TEXT,
                created_at TEXT NOT NULL,
                UNIQUE(user_id, type, value)
            )
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_prefs_user
            ON user_preferences(user_id, type)
        """)
        # 个人文章
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS personal_articles (
                id SERIAL PRIMARY KEY,
                keyword TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT,
                source TEXT,
                published_at TEXT,
                fetched_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_personal_articles_keyword
            ON personal_articles(keyword, fetched_at)
        """)
        # 会话
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        # 消息
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)


# ======================== 热点话题 ========================

async def save_topics(platform: str, topics: list[dict]):
    """保存热搜数据到数据库"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pool = await get_pool()
    async with pool.acquire() as conn:
        for t in topics:
            try:
                await conn.execute(
                    """INSERT INTO hot_topics
                       (platform, title, url, hot_value, rank, category, fetched_at)
                       VALUES ($1, $2, $3, $4, $5, $6, $7)
                       ON CONFLICT (platform, title, fetched_at) DO NOTHING""",
                    platform, t.get("title", ""), t.get("url", ""),
                    str(t.get("hot_value", "")), t.get("rank", 0),
                    t.get("category", ""), now
                )
            except Exception:
                pass


async def get_recent_topics(platform: str = None, limit: int = 50):
    """获取最近的热点数据"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if platform:
            rows = await conn.fetch(
                """SELECT * FROM hot_topics
                   WHERE platform = $1
                   ORDER BY fetched_at DESC, rank ASC
                   LIMIT $2""",
                platform, limit
            )
        else:
            rows = await conn.fetch(
                """SELECT * FROM hot_topics
                   ORDER BY fetched_at DESC, rank ASC
                   LIMIT $1""",
                limit
            )
        return [dict(row) for row in rows]


# ======================== AI 分析 ========================

async def save_analysis(analysis_type: str, content: str, result: str):
    """保存 AI 分析结果"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO ai_analyses (analysis_type, content, result, created_at)
               VALUES ($1, $2, $3, $4)""",
            analysis_type, content, result, now
        )


async def get_recent_analyses(limit: int = 10):
    """获取最近的 AI 分析"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM ai_analyses ORDER BY created_at DESC LIMIT $1",
            limit
        )
        return [dict(row) for row in rows]


# ======================== 用户 ========================

async def create_user(username: str, password_hash: str) -> dict:
    """创建新用户，返回用户记录"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO users (username, password_hash)
               VALUES ($1, $2)
               RETURNING id, username, created_at""",
            username, password_hash
        )
        return dict(row)


async def get_user_by_name(username: str) -> Optional[dict]:
    """按用户名查找用户"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, username, password_hash FROM users WHERE username = $1",
            username
        )
        return dict(row) if row else None


async def count_users() -> int:
    """返回用户总数"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchval("SELECT COUNT(*) FROM users")


async def migrate_preferences_to_user(user_id: int):
    """将 NULL user_id 的偏好记录迁移给第一个注册用户"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE user_preferences SET user_id = $1 WHERE user_id IS NULL",
            user_id
        )


# ======================== 用户偏好 ========================

async def save_like(platform: str, title: str, url: str, user_id: Optional[int] = None):
    """收藏话题"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO user_preferences (user_id, type, value, platform, url, created_at)
               VALUES ($1, 'like', $2, $3, $4, $5)
               ON CONFLICT (user_id, type, value) DO NOTHING""",
            user_id, title, platform, url, now
        )


async def delete_like(title: str, user_id: Optional[int] = None):
    """取消收藏"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM user_preferences WHERE type='like' AND value=$1 AND user_id=$2",
            title, user_id
        )


async def get_likes(user_id: Optional[int] = None) -> list[dict]:
    """获取收藏列表"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM user_preferences
               WHERE type='like' AND user_id=$1
               ORDER BY created_at DESC""",
            user_id
        )
        return [dict(row) for row in rows]


async def save_keyword(keyword: str, user_id: Optional[int] = None):
    """添加关键词订阅"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO user_preferences (user_id, type, value, created_at)
               VALUES ($1, 'keyword', $2, $3)
               ON CONFLICT (user_id, type, value) DO NOTHING""",
            user_id, keyword, now
        )


async def delete_keyword(keyword_id: int, user_id: Optional[int] = None):
    """删除关键词订阅"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM user_preferences WHERE id=$1 AND type='keyword' AND user_id=$2",
            keyword_id, user_id
        )


async def get_keywords(user_id: Optional[int] = None) -> list[dict]:
    """获取所有关键词订阅"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM user_preferences
               WHERE type='keyword' AND user_id=$1
               ORDER BY created_at ASC""",
            user_id
        )
        return [dict(row) for row in rows]


# ======================== 个人文章 ========================

async def save_personal_articles(keyword: str, articles: list[dict]):
    """保存关键词抓取的文章"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pool = await get_pool()
    async with pool.acquire() as conn:
        for a in articles:
            try:
                await conn.execute(
                    """INSERT INTO personal_articles
                       (keyword, title, url, source, published_at, fetched_at)
                       VALUES ($1, $2, $3, $4, $5, $6)""",
                    keyword, a.get("title", ""), a.get("url", ""),
                    a.get("source", ""), a.get("published_at", ""), now
                )
            except Exception:
                pass


async def get_personal_articles(keywords: list[str] = None, limit: int = 50) -> list[dict]:
    """获取最近抓取的个性化文章"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if keywords:
            rows = await conn.fetch(
                """SELECT * FROM personal_articles
                   WHERE keyword = ANY($1::text[])
                   ORDER BY fetched_at DESC LIMIT $2""",
                keywords, limit
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM personal_articles ORDER BY fetched_at DESC LIMIT $1",
                limit
            )
        return [dict(row) for row in rows]


# ======================== 聊天会话 ========================

async def create_chat_session(user_id: int, title: str = "新对话") -> int:
    """创建新会话，返回会话 ID"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        session_id = await conn.fetchval(
            "INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id",
            user_id, title
        )
        return session_id


async def update_session_title(session_id: int, title: str, user_id: int):
    """更新会话标题"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE chat_sessions SET title=$1 WHERE id=$2 AND user_id=$3",
            title, session_id, user_id
        )


async def save_chat_message(session_id: int, role: str, content: str):
    """保存一条聊天消息"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)",
            session_id, role, content
        )


async def get_chat_sessions(user_id: int, limit: int = 30) -> list[dict]:
    """获取用户的会话列表"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, title, created_at FROM chat_sessions
               WHERE user_id = $1
               ORDER BY created_at DESC LIMIT $2""",
            user_id, limit
        )
        return [dict(row) for row in rows]


async def get_session_messages(session_id: int) -> list[dict]:
    """获取会话的所有消息"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT role, content, created_at FROM chat_messages
               WHERE session_id = $1
               ORDER BY created_at ASC""",
            session_id
        )
        return [dict(row) for row in rows]


async def delete_chat_session(session_id: int, user_id: int):
    """删除会话（级联删除消息）"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM chat_sessions WHERE id=$1 AND user_id=$2",
            session_id, user_id
        )
