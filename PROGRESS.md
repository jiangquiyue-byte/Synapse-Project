# Synapse 开发进度日志

---

## [Current Status]

**M1（后端骨架）+ M6（前端骨架）+ 突触图标系统 + SSE 流式多智能体对话 已全部完成。**

当前阶段已完成"前后端联调 + 真实 LLM 接入"。后端 FastAPI 服务已部署到公网，SSE 流式多智能体对话已通过端到端验证，支持 sequential / debate / vote / single 四种模式。前端 Expo 应用可通过 Expo Go 预览。

---

## [Endpoints]

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端 API（当前部署） | `https://8000-itjpuatlcc84icpovyuc5-2b4d9b54.sg1.manus.computer` | 沙盒公网 URL |
| Expo 预览 | `exp://zv4mr80-anonymous-8081.exp.direct` | Expo Go 扫码预览 |
| 后端本地 | `http://localhost:8000` | 本地开发时使用 |
| 前端本地 | `http://localhost:8081` | 本地开发时使用 |
| 生产后端（待部署） | 尚未部署到 Railway/Render | 需要 Render 账号验证 |

> 注意：沙盒 URL 会在会话结束后失效。生产环境需要部署到 Railway 或 Render。

---

## [Completed]

### M1: 后端骨架 (FastAPI + LangGraph)

后端采用 FastAPI 框架，项目结构位于 `backend/` 目录下。

**已完成的路由模块：**

| 路由文件 | 端点 | 功能 |
|----------|------|------|
| `routers/chat.py` | `POST /api/chat/stream` | SSE 流式群聊（核心端点） |
| `routers/agents.py` | `GET/POST/DELETE /api/agents/` | Agent CRUD 管理 |
| `routers/workflows.py` | `GET /api/workflows/templates` | 工作流模板列表 |
| `routers/memory.py` | `GET /api/memory/prompts` | 5 个内置 Prompt 模板 |
| `routers/upload.py` | `POST /api/upload/` | 文件上传（占位） |
| `routers/export.py` | `GET /api/export/markdown`, `/pdf` | 对话导出 |
| `main.py` | `GET /health` | 健康检查 |

**已完成的服务层：**

| 服务文件 | 功能 |
|----------|------|
| `services/orchestrator.py` | LangGraph 多模式编排器，**已接入真实 LLM API**，支持 sequential / debate / vote / single 四种讨论模式 |
| `services/agent_factory.py` | 多供应商 LLM 工厂，支持 OpenAI / Gemini / Claude，**环境变量 API Key 回退机制** |
| `services/cost_tracker.py` | Token 费用实时追踪，按 provider+model 计费 |
| `core/config.py` | 全局配置（CORS、版本号、**稳定 Fernet 加密密钥**） |
| `core/security.py` | API Key AES 加密/解密，**使用稳定配置密钥** |
| `models/schemas.py` | Pydantic 数据模型（Agent、Message、ChatRequest 等） |
| `models/database.py` | 内存存储（开发阶段），后续迁移至 PostgreSQL + pgvector |

### SSE 流式多智能体对话 ✅ (本次迭代完成)

**核心改动：**

| 文件 | 改动说明 |
|------|----------|
| `orchestrator.py` | 接入真实 LLM API (OpenAI/Gemini/Claude)，消息增加 UUID id 字段，LangGraph StateGraph 编排 |
| `agent_factory.py` | 环境变量 API Key 回退机制，关闭 streaming 兼容性 |
| `chat.py` | 新增 `agent_start` SSE 事件，确保消息 ID 用于分支回放 |
| `config.py` | 稳定的 Fernet 加密密钥，支持 OPENAI_API_KEY 环境变量 |
| `security.py` | 移除随机密钥生成，使用稳定配置密钥 |
| `api.ts` | 默认后端 URL 更新为部署地址 |

**SSE 事件协议：**

```
event: agent_start    → {"agent_name": "技术专家", "agent_id": "uuid"}
event: agent_message  → {"id": "uuid", "role": "agent_id", "agent_name": "...", "content": "...", "timestamp": "...", "token_count": N, "cost_usd": 0.001}
event: cost_summary   → {"total_cost_usd": 0.002}
event: done           → {}
```

**验证结果：**
- 单 Agent 对话 ✅
- 多 Agent 顺序对话 (sequential) ✅
- 真实 LLM API 调用 (gpt-4.1-mini, gpt-4.1-nano) ✅
- 费用追踪 ✅

### M6: 前端骨架 (Expo SDK 55 + TypeScript)

前端采用 Expo + React Native + TypeScript，项目结构位于 `mobile/` 目录下，使用 expo-router 文件系统路由。

**已完成的页面：**

| 页面文件 | Tab 名称 | 功能 |
|----------|----------|------|
| `app/(tabs)/index.tsx` | 群聊 | 主聊天界面，含模式选择器（顺序/辩论/投票/指定）、消息气泡、SSE 流式接收、@提及、费用显示 |
| `app/(tabs)/agents.tsx` | 成员 | AI Agent 管理，支持添加/删除 Agent，选择 LLM 供应商和模型，设置 Temperature |
| `app/(tabs)/settings.tsx` | 设置 | 后端地址配置、连接测试、费用统计仪表盘、关于页 |
| `app/(tabs)/_layout.tsx` | — | Tab 导航布局，突触图标 + 黑白极简风格 |
| `app/_layout.tsx` | — | 根布局，SafeAreaProvider + StatusBar |

**已完成的服务层：**

| 服务文件 | 功能 |
|----------|------|
| `services/sseClient.ts` | SSE 客户端，解析 Server-Sent Events 流，支持 agent_start / token / agent_end / done / error 事件 |
| `services/api.ts` | REST API 封装，含 health / agents CRUD / chat SSE / prompts / workflows 等接口，**默认指向部署后端** |
| `stores/useAppStore.ts` | Zustand 全局状态管理，含 agents / messages / discussionMode / backendUrl / totalCostUsd 等状态 |

### 突触图标系统

共 10 个 AI 生成的自定义 PNG 图标，全部位于 `mobile/assets/icons/` 目录。

### UI 设计规范

整体风格为**黑白极简**，具体参数如下：

| 属性 | 值 |
|------|-----|
| 主色 | `#000000`（纯黑） |
| 背景色 | `#FFFFFF`（纯白） |
| 卡片背景 | `#FAFAFA` |
| 输入框背景 | `#F5F5F5` |
| 分割线 | `#E5E5E5`，0.5px |
| 次要文字 | `#999999` |
| 用户气泡 | 黑底白字 |
| Agent 气泡 | 浅灰底黑字 |
| 圆角 | 按钮 24px，卡片 12px，气泡 18px |

---

## [Next Plan]

### 优先级 P1：部署后端到 Railway/Render（生产环境）

**说明：** 当前后端运行在沙盒公网 URL，会在会话结束后失效。需要部署到 Render 或 Railway 获取永久 URL。

**具体步骤：**
1. 在 Render 完成账号验证（需要手动完成 hCaptcha）
2. 连接 GitHub 仓库，设置构建目录为 `backend/`
3. 设置环境变量 `OPENAI_API_KEY`、`ENCRYPTION_KEY`
4. 部署后更新 `api.ts` 中的默认后端 URL

### 优先级 P2：M2 里程碑 — RAG 管道

**起点文件：** 需新建 `backend/app/services/rag_pipeline.py`

### 优先级 P3：M3 里程碑 — 工作流引擎

**起点文件：** `backend/app/routers/workflows.py`

### 优先级 P4：Token 级流式输出（可选优化）

当前实现是 agent 级别的流式（每个 agent 完成后一次性发送），可升级为 token 级别的流式（逐字输出）。

---

## [Tech Stack]

| 层级 | 技术 |
|------|------|
| 前端框架 | React Native + Expo SDK 55 |
| 路由 | expo-router (文件系统路由) |
| 状态管理 | Zustand |
| 后端框架 | FastAPI (Python 3.11) |
| 编排引擎 | LangGraph |
| 通信协议 | SSE (Server-Sent Events) |
| 数据存储 | 内存存储 (开发阶段) → PostgreSQL + pgvector (生产) |
| 容器化 | Docker (Dockerfile 已就绪) |
| 版本控制 | GitHub (`jiangquiyue-byte/Synapse-Project`) |

---

## [Git Log]

| 提交 | 说明 |
|------|------|
| `f7f99d3` | feat: implement SSE multi-agent streaming with real LLM API |
| `6fcd546` | style: 调大所有突触图标尺寸 |
| `6817b68` | docs: 更新 PROGRESS.md 记录突触图标系统完成 |
| `8b078d0` | feat: 全部图标替换为突触/神经元风格 |
| `5c545aa` | feat: M1+M6 初始化 - FastAPI后端骨架 + Expo前端骨架 + 黑白极简UI |
| `975d17b` | Initial commit |

---

*最后更新: 2026-03-27 (SSE 多智能体流式对话完成)*
