# 重新部署流程（新前端架构版）

当前版本的部署核心变化：

- `frontend/src` 是唯一前端逻辑源
- `frontend/dist` 是必须重新生成的构建产物
- FastAPI 优先服务 `frontend/dist/index.html`
- 只拉代码并重启后端已经不够，必须把前端重新 build

## 1. 本地先确认代码和构建都正常

```bash
cd /Users/aviator/Documents/code/codefather/AI_Hot_Research
git status

cd frontend
npm run check
npm run build
```

确保前端检查和构建都通过，再推送代码。

## 2. 提交并推送到 GitHub

```bash
cd /Users/aviator/Documents/code/codefather/AI_Hot_Research
git add .
git commit -m "chore: redeploy update"
git push origin main
```

## 3. 登录应用服务器并拉取最新代码

```bash
ssh root@117.72.193.220
cd /root/AI_Hot_Research

# 临时切换为 ghfast 拉取
git remote set-url origin https://ghfast.top/https://github.com/Aviatorxx/AI_Hot_Research.git
git pull

# 拉完切回官方地址
git remote set-url origin https://github.com/Aviatorxx/AI_Hot_Research.git
```

## 4. 在服务器重新安装并构建前端

```bash
cd /root/AI_Hot_Research/frontend
npm install
rm -rf dist
npm run build
```

这里的目的不是开发预览，而是确保线上真正服务的是当前源码生成的最新 `dist`。

## 5. 重启后端服务

```bash
cd /root/AI_Hot_Research
fuser -k 8000/tcp
sleep 2
nohup venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn.log 2>&1 &
sleep 2
```

## 6. 立即做线上健康检查

```bash
# 看进程/端口
ss -lntp | grep 8000

# 看日志是否报错
tail -n 80 /tmp/uvicorn.log

# 确认首页来自新 dist，而不是旧 fallback
curl -s http://127.0.0.1:8000/ | grep "data-action=\"refreshData\""
curl -s http://127.0.0.1:8000/ | grep -q "onclick=" && echo "still old" || echo "new runtime ok"
```

然后用浏览器验证关键功能：

- 登录
- 切平台
- 搜索与清空
- AI INSIGHTS
- 收藏与关键词
- 会话发送

## 部署失败时快速回滚

```bash
cd /root/AI_Hot_Research
git log --oneline -n 5
git reset --hard <稳定commitID>

cd frontend
npm install
rm -rf dist
npm run build

cd ..
fuser -k 8000/tcp
sleep 2
nohup venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn.log 2>&1 &
```

## 兼容说明（旧版本流程）

旧流程“拉代码后直接重启 FastAPI”只适用于前端还是单文件静态页面的时候。  
现在后端优先读取 `frontend/dist`，所以如果不重新 build，线上可能继续服务旧产物。

## 对应脚本

当前脚本已经按新流程更新，顺序如下：

```bash
cd /root/AI_Hot_Research/deploy
bash 03_pull_latest.sh
bash 04_restart_backend.sh
bash 05_health_check.sh
```

其中：

- `03_pull_latest.sh`：拉取代码并自动恢复官方 remote
- `04_restart_backend.sh`：重新构建 `frontend/dist` 后再重启 FastAPI
- `05_health_check.sh`：检查端口、日志，并验证首页来自新 dist
