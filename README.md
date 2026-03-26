# Synapse — 多智能体群聊协作系统

> 突触 · 连接智慧，协同思考  
> Multi-Agent Collaborative Chat System

Synapse 是一款基于 **React Native (Expo)** 和 **FastAPI** 构建的多智能体群聊 App。用户可以在一个群聊界面中同时与多个 AI Agent 对话，支持顺序发言、自由辩论、投票表决和指定发言四种讨论模式。后端通过 **LangGraph** 实现多 Agent 编排，支持 OpenAI、Google Gemini 和 Anthropic Claude 三大 LLM 供应商。

## 技术架构

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 前端 | React Native + Expo SDK 55 | TypeScript，黑白极简 UI |
| 状态管理 | Zustand | 轻量级全局状态 |
| 路由 | expo-router | 基于文件系统的路由 |
| 后端 | FastAPI + Python 3.11 | 异步高性能 API |
| AI 编排 | LangGraph | 多模式 StateGraph |
| 通信协议 | SSE (Server-Sent Events) | 实时流式输出 |
| 数据存储 | 内存 → PostgreSQL + pgvector | 开发/生产分离 |

## 项目结构

```
Synapse-Project/
├── backend/                  # FastAPI 后端
│   ├── app/
│   │   ├── main.py          # 主入口
│   │   ├── core/            # 配置 & 安全
│   │   ├── models/          # 数据模型
│   │   ├── routers/         # API 路由
│   │   └── services/        # 业务逻辑
│   ├── Dockerfile
│   └── requirements.txt
├── mobile/                   # Expo 前端
│   ├── app/                 # expo-router 页面
│   │   ├── (tabs)/          # Tab 导航
│   │   │   ├── index.tsx    # 群聊主界面
│   │   │   ├── agents.tsx   # AI 成员管理
│   │   │   └── settings.tsx # 设置页面
│   │   └── _layout.tsx      # 根布局
│   ├── services/            # API & SSE 客户端
│   ├── stores/              # Zustand 状态
│   └── package.json
├── PROGRESS.md              # 开发进度日志
└── README.md
```

## 快速开始

**后端启动：**

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**前端启动：**

```bash
cd mobile
npm install
npx expo start --tunnel
```

在 Expo Go 中扫描二维码即可预览。

## 开发进度

详见 [PROGRESS.md](./PROGRESS.md)。

## 许可证

MIT License
