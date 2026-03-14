# 重新部署流程（直接命令版）

## 1. 本地先确认代码无误

```bash
cd /Users/aviator/Documents/code/codefather/AI_Hot_Research
git status
```

确保只包含你要发布的改动。

## 2. 提交并推送到 GitHub

```bash
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

# 拉完切回官方地址（保持仓库配置干净）
git remote set-url origin https://github.com/Aviatorxx/AI_Hot_Research.git
```

## 4. 重启后端服务（当前稳定方式）

```bash
fuser -k 8000/tcp
sleep 2
nohup venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn.log 2>&1 &
sleep 2
```

## 5. 立即做线上健康检查

```bash
# 看进程/端口
ss -lntp | grep 8000

# 看日志是否报错
tail -n 80 /tmp/uvicorn.log
```

然后用浏览器验证关键功能（登录、AI INSIGHTS、收藏、会话）。

## 部署失败时快速回滚

```bash
cd /root/AI_Hot_Research
git log --oneline -n 5
git reset --hard <稳定commitID>
fuser -k 8000/tcp
sleep 2
nohup venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn.log 2>&1 &
```

## 对应脚本（可选）

如果你想用脚本跑第 3-5 步：

```bash
cd /root/AI_Hot_Research/deploy
bash 03_pull_latest.sh
bash 04_restart_backend.sh
bash 05_health_check.sh
```
