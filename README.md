# 🔥 AI Hot Research — AI 驱动的热点监控工具

实时聚合多平台热搜数据，结合 DeepSeek AI 进行智能分析。Cyberpunk OLED 暗黑风格单页应用。

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 功能特性

- **7 大平台热搜聚合** — 微博、知乎、百度、抖音、B站、GitHub Trending、Hacker News
- **DeepSeek AI 智能分析** — 一键生成热点趋势洞察、单话题深度分析、自由对话
- **Cyberpunk UI** — OLED 暗黑主题，Bento Grid 布局，流畅动画
- **极速响应** — 启动预热缓存、单源超时保护、后台静默刷新
- **自动刷新** — 5 分钟自动更新，支持手动强制刷新
- **分页浏览** — 每页 20 条，大数据量下流畅阅读

## 📸 预览

```
┌─────────────────────────────────────────────────┐
│  🔥 AI HOT RESEARCH                            │
├───────────────────────┬─────────────────────────┤
│  LIVE FEED (7 cols)   │  AI INSIGHTS (5 cols)   │
│  Platform tabs        │  DeepSeek 分析结果       │
│  Paginated topics     ├─────────────────────────┤
│  Click to open link   │  AI CHAT (5 cols)       │
│                       │  自由对话                │
└───────────────────────┴─────────────────────────┘
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Aviatorxx/AI_Hot_Research.git
cd AI_Hot_Research
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入你的 DeepSeek API Key
```

### 4. 启动服务

```bash
uvicorn backend.main:app --reload --port 8000
```

浏览器打开 http://localhost:8000

## 📁 项目结构

```
AI_Hot_Research/
├── backend/
│   ├── main.py              # FastAPI 主入口，路由 & 缓存
│   ├── ai_service.py        # DeepSeek AI 集成
│   ├── database.py          # SQLite 数据持久化
│   └── sources/             # 数据源模块
│       ├── __init__.py      # BaseSource 抽象基类
│       ├── weibo.py         # 微博热搜（3 种回退策略）
│       ├── zhihu.py         # 知乎热榜
│       ├── baidu.py         # 百度热搜
│       ├── douyin.py        # 抖音热点
│       ├── bilibili.py      # B站热门
│       ├── github_trending.py  # GitHub Trending
│       ├── hackernews.py    # Hacker News
│       ├── twitter.py       # X/Twitter（已注释）
│       └── reddit.py        # Reddit（已注释）
├── frontend/
│   └── index.html           # 单页 SPA（~1950 行）
├── .env.example             # 环境变量模板
├── requirements.txt         # Python 依赖
└── start_server.sh          # 启动脚本
```

## 🔧 技术栈

| 层 | 技术 |
|---|------|
| 后端 | FastAPI + Python 3.11, async/await |
| AI | DeepSeek (deepseek-chat) via OpenAI SDK |
| 数据库 | SQLite + aiosqlite |
| 网络 | httpx (异步 HTTP 客户端) |
| 前端 | 原生 HTML/CSS/JS, Tailwind-style tokens |
| 字体 | Fira Code + Fira Sans |

## ⚡ 性能优化

- **启动预热** — 应用启动时后台预加载所有数据源缓存
- **单源超时** — 每个源独立 8s 超时，慢源不拖累全局
- **Stale-while-revalidate** — 有旧缓存时秒返回，后台更新
- **5 分钟 TTL** — 缓存有效期内直接返回（~2ms 响应）

## 📝 License

MIT
