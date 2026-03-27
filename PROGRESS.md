# Synapse 开发进度日志

---

## [Current Status]

**P1 Vercel 部署 ✅ + M3 讨论模式（辩论/投票/单点）✅ + Expo SDK 54 升级 ✅ 已全部完成并验证。**

### 核心交棒信息

* **当前后端 URL**：`https://synapse-project-seven.vercel.app`
* **环境说明**：当前前端项目完全依赖 **Expo SDK 54**（React 19.1.0, React Native 0.81.5），**不可降级**。所有依赖已通过 `npx expo install --fix` 完美对齐。

### 已解决的坑
1. **SDK 51 到 54 的升级适配**：解决了 Expo SDK 54 对 React 19.1.0 和 React Native 0.81.5 的严格 peer dependency 要求，清理了旧缓存并完成了全量依赖对齐。
2. **Vercel 环境变量换行符修复**：修复了 Vercel CLI 设置 `OPENAI_BASE_URL` 时引入尾部换行符导致 SSE 请求报 `Invalid non-printable ASCII character in URL` 的问题。
3. **多智能体无限循环 Bug 修复**：修复了原代码中 `debate_round` 从未递增导致辩论模式无限循环的问题，新增了 `round_counter` 节点正确控制轮次。

---

## [Next Plan] (待办清单)

### 优先级 P0：启动 M4 里程碑
* **RAG 管道**：实现检索增强生成，接入外部知识库。
* **Tavily 搜索**：集成 Tavily API，赋予 Agent 实时联网搜索能力。
* **多模态图片识别**：支持用户上传图片，并由具备 Vision 能力的 Agent（如 gpt-4.1-mini）进行分析和讨论。

### 优先级 P3：Token 级流式输出（可选优化）
当前实现是 agent 级别的流式（每个 agent 完成后一次性发送），可升级为 token 级别的流式（逐字输出）。

### 优先级 P4：持久化存储
将内存存储迁移至 PostgreSQL + pgvector。

---

## [Endpoints]

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端 API（Vercel 生产） | `https://synapse-project-seven.vercel.app` | 永久 URL，已部署 |
| Health Check | `https://synapse-project-seven.vercel.app/health` | 返回 `{"status":"alive","app":"Synapse","version":"2.0.0"}` |
| 后端本地 | `http://localhost:8000` | 本地开发时使用 |
| 前端本地 | `http://localhost:8081` | 本地开发时使用 |

---

## [环境变量要求]

后端运行需要以下环境变量（Vercel 已配置）：

| 变量名 | 必需 | 说明 | Vercel 状态 |
|--------|------|------|-------------|
| `OPENAI_API_KEY` | ✅ 是 | OpenAI API Key，用于 synthesizer 节点和 Agent 的环境变量回退 | ✅ 已设置 |
| `OPENAI_BASE_URL` | ✅ 是 | OpenAI 兼容 API 的 Base URL | ✅ 已设置 |
| `ENCRYPTION_KEY` | 否（有默认值） | Fernet 加密密钥，默认 `ghszRjI0495ouFAPRF-V_GahG3nSc8tlmeM_KKCzDCE=` | 使用默认值 |

---

## [Completed]

### P1: Vercel 部署 ✅ (2026-03-28)

**部署配置：**
* `vercel.json`：Vercel 部署配置，Python Serverless Function + 路由重写
* `backend/api/index.py`：Vercel Serverless 入口，re-export FastAPI app
* `backend/api/requirements.txt`：Vercel Python 依赖列表

### M3: 多模式对话引擎 ✅ (2026-03-28 重构并验证)

**orchestrator.py 四种讨论模式：**

| 模式 | 标识 | 图结构 | 说明 |
|------|------|--------|------|
| 顺序发言 | `sequential` | A1 → A2 → A3 → END | 默认模式，Agent 按顺序依次发言 |
| 辩论模式 | `debate` | [A1→A2→A3] → round_counter × N轮 → Synthesizer → END | Agent 互相质询，可查看前序发言并反驳，round_counter 节点正确递增辩论轮次 |
| 投票模式 | `vote` | A1 → A2 → A3 → Synthesizer → END | 每个 Agent 独立回答（vote 模式下 prev_msgs 被隐藏），综合器统计共识与分歧 |
| 指定发言 | `single` (@提及) | A_target → END | 用户通过 @名称 或 target_agent_id 指定某一个 Agent 回复 |

**前端 M3 改进：**
1. **Synthesizer 特殊 UI**：综合结论使用全宽卡片样式，黑色左边框 + 深色图标，与普通 Agent 气泡区分。
2. **模式提示栏**：在模式选择器下方显示当前模式描述（如"辩论模式 · 3 轮交锋"）。
3. **@提及改进**：支持消息任意位置的 @名称 匹配（原来仅支持开头）。
4. **SSEClient 修复**：改进事件边界处理，正确处理 SSE 空行分隔和事件类型重置。

### M1: 后端骨架 (FastAPI + LangGraph)
后端采用 FastAPI 框架，项目结构位于 `backend/` 目录下。已完成核心路由（chat, agents, workflows, memory 等）和服务层（orchestrator, agent_factory, cost_tracker 等）。

### M6: 前端骨架 (Expo SDK 54 + TypeScript)
前端采用 Expo + React Native + TypeScript，项目结构位于 `mobile/` 目录下，使用 expo-router 文件系统路由。已完成群聊、成员管理、设置等核心页面。

### 突触图标系统
共 10 个 AI 生成的自定义 PNG 图标，全部位于 `mobile/assets/icons/` 目录。

---

## [Tech Stack]

| 层级 | 技术 |
|------|------|
| 前端框架 | React Native 0.81.5 + Expo SDK 54 |
| 路由 | expo-router v6 (文件系统路由) |
| 状态管理 | Zustand v4 |
| 后端框架 | FastAPI (Python 3.11) |
| 编排引擎 | LangGraph |
| 通信协议 | SSE (Server-Sent Events) |
| 数据存储 | 内存存储 (开发阶段) → PostgreSQL + pgvector (生产) |
| 部署平台 | Vercel (Serverless Python) |
| 版本控制 | GitHub (`jiangquiyue-byte/Synapse-Project`) |

---

## [Git Log]

| 提交 | 说明 |
|------|------|
| (pending) | Milestone: SDK 54 Fixed, M3 Modes Verified, Vercel Live |
| `6a9e579` | feat: upgrade Expo SDK 51 → 54 for Expo Go compatibility |
| `b1a4539` | fix: downgrade Expo SDK 55 → 51 for Expo Go compatibility |
| `fabf09f` | docs: update PROGRESS.md - P1 Vercel deployment + M3 discussion modes complete |
| `bb08300` | feat(M3): implement debate/vote/single discussion modes |
| `e25b05c` | feat(P1): Vercel deployment complete - update frontend production URL |
| `7659e17` | feat: add Vercel deployment config for FastAPI backend |

---

*最后更新: 2026-03-28 (SDK 54 升级完成，M3 验证通过，Vercel 部署上线，准备交棒)*
