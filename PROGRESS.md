# Synapse 开发进度日志

---

## [Current Status]

**P1 Vercel 部署 ✅ + M3 讨论模式（辩论/投票/单点）✅ 已全部完成并验证。**

后端已成功部署至 Vercel 生产环境，永久 URL 为 `https://synapse-project-seven.vercel.app`。四种讨论模式（sequential / debate / vote / single）已通过端到端 SSE 流式验证。前端已更新生产环境配置指向 Vercel URL。

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

**问题诊断与修复：**

| 问题 | 原因 | 修复方案 |
|------|------|----------|
| SSE 调用返回 `Invalid non-printable ASCII character in URL` | Vercel 环境变量中 OPENAI_BASE_URL 含换行符 | 使用 `printf '%s'` 重新设置环境变量，避免 `echo` 的尾部换行 |
| agent_factory.py 缺少 base_url 支持 | ChatOpenAI 初始化未传递 OPENAI_BASE_URL | 在 agent_factory.py 和 orchestrator.py 中添加 base_url 参数 |
| 前端 backendUrl 为空时阻止发送 | useAppStore 中 backendUrl 初始为空字符串 | 改用 api.getChatStreamUrl() 判断（内含 DEFAULT_BACKEND_URL 回退） |

**部署配置：**

| 文件 | 说明 |
|------|------|
| `vercel.json` | Vercel 部署配置，Python Serverless Function + 路由重写 |
| `backend/api/index.py` | Vercel Serverless 入口，re-export FastAPI app |
| `backend/api/requirements.txt` | Vercel Python 依赖列表 |

### M3: 多模式对话引擎 ✅ (2026-03-28 重构并验证)

**orchestrator.py 四种讨论模式：**

| 模式 | 标识 | 图结构 | 说明 |
|------|------|--------|------|
| 顺序发言 | `sequential` | A1 → A2 → A3 → END | 默认模式，Agent 按顺序依次发言 |
| 辩论模式 | `debate` | [A1→A2→A3] → round_counter × N轮 → Synthesizer → END | Agent 互相质询，可查看前序发言并反驳，round_counter 节点正确递增辩论轮次 |
| 投票模式 | `vote` | A1 → A2 → A3 → Synthesizer → END | 每个 Agent 独立回答（vote 模式下 prev_msgs 被隐藏），综合器统计共识与分歧 |
| 指定发言 | `single` (@提及) | A_target → END | 用户通过 @名称 或 target_agent_id 指定某一个 Agent 回复 |

**本次重构修复的关键问题：**

1. **debate_round 递增 Bug**：原代码中 debate_round 从未递增，导致辩论会无限循环。新增 `round_counter` 节点，在每轮所有 Agent 发言后递增 debate_round。
2. **vote 模式信息泄漏**：原代码中 vote 模式的 Agent 仍能看到其他 Agent 的 prev_msgs。修复为在 vote 模式下清空 prev_msgs，确保独立回答。
3. **Synthesizer 提示词优化**：为 debate 和 vote 模式分别编写专用的综合提示词，debate 侧重"论点-共识-分歧-结论"，vote 侧重"立场-多数共识-少数异见-结论"。

**前端 M3 改进：**

1. **Synthesizer 特殊 UI**：综合结论使用全宽卡片样式，黑色左边框 + 深色图标，与普通 Agent 气泡区分。
2. **模式提示栏**：在模式选择器下方显示当前模式描述（如"辩论模式 · 3 轮交锋"）。
3. **@提及改进**：支持消息任意位置的 @名称 匹配（原来仅支持开头）。
4. **SSEClient 修复**：改进事件边界处理，正确处理 SSE 空行分隔和事件类型重置。

**端到端验证结果（Vercel 生产环境）：**

| 测试项 | 结果 | 说明 |
|--------|------|------|
| Sequential 模式 | ✅ 通过 | 单 Agent 和多 Agent 顺序发言正常 |
| Debate 模式（1轮） | ✅ 通过 | 2 Agent 辩论 + Synthesizer 综合结论，debate_round 正确递增 |
| Vote 模式 | ✅ 通过 | 2 Agent 独立回答 + Synthesizer 统计共识 |
| Single 模式 | ✅ 通过 | 仅指定 Agent 回复，其他 Agent 不参与 |
| SSE 流式传输 | ✅ 通过 | agent_start → agent_message → cost_summary → done 事件序列正确 |
| LLM API 调用 | ✅ 通过 | gpt-4.1-nano / gpt-4.1-mini 调用成功 |

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
| `services/orchestrator.py` | LangGraph 多模式编排器，支持 sequential / debate / vote / single |
| `services/agent_factory.py` | 多供应商 LLM 工厂，支持 OpenAI / Gemini / Claude + OPENAI_BASE_URL |
| `services/cost_tracker.py` | Token 费用实时追踪 |
| `core/config.py` | 全局配置 |
| `core/security.py` | API Key AES 加密/解密 |
| `models/schemas.py` | Pydantic 数据模型 |
| `models/database.py` | 内存存储 |

### SSE 流式多智能体对话 ✅

**SSE 事件协议：**

```
event: agent_start    → {"agent_name": "技术专家", "agent_id": "uuid"}
event: agent_message  → {"id": "uuid", "role": "agent_id", "agent_name": "...", "content": "...", "timestamp": "...", "token_count": N, "cost_usd": 0.001}
event: cost_summary   → {"total_cost_usd": 0.002}
event: done           → {}
```

### M6: 前端骨架 (Expo SDK 55 + TypeScript)

**已完成的页面：**

| 页面文件 | Tab 名称 | 功能 |
|----------|----------|------|
| `app/(tabs)/index.tsx` | 群聊 | 主聊天界面，含模式选择器、消息气泡、SSE 流式接收、@提及、Synthesizer 特殊 UI |
| `app/(tabs)/agents.tsx` | 成员 | AI Agent 管理 |
| `app/(tabs)/settings.tsx` | 设置 | 后端地址配置、连接测试、费用统计 |

**已完成的服务层：**

| 服务文件 | 功能 |
|----------|------|
| `services/sseClient.ts` | SSE 客户端，正确处理事件边界 |
| `services/api.ts` | REST API 封装，默认指向 Vercel 生产 URL |
| `stores/useAppStore.ts` | Zustand 全局状态管理 |

### 突触图标系统

共 10 个 AI 生成的自定义 PNG 图标，全部位于 `mobile/assets/icons/` 目录。

---

## [Next Plan]

### 优先级 P2：M2 里程碑 — RAG 管道

**起点文件：** 需新建 `backend/app/services/rag_pipeline.py`

### 优先级 P3：Token 级流式输出（可选优化）

当前实现是 agent 级别的流式（每个 agent 完成后一次性发送），可升级为 token 级别的流式（逐字输出）。

### 优先级 P4：M4 里程碑 — 持久化存储

将内存存储迁移至 PostgreSQL + pgvector。

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
| 部署平台 | Vercel (Serverless Python) |
| 版本控制 | GitHub (`jiangquiyue-byte/Synapse-Project`) |

---

## [UI 设计规范]

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
| Synthesizer 卡片 | 浅灰底 + 黑色左边框 |
| 圆角 | 按钮 24px，卡片 12px，气泡 18px |

---

## [Git Log]

| 提交 | 说明 |
|------|------|
| `bb08300` | feat(M3): implement debate/vote/single discussion modes |
| `e25b05c` | feat(P1): Vercel deployment complete - update frontend production URL |
| `7659e17` | feat: add Vercel deployment config for FastAPI backend |
| `6000a19` | docs: update PROGRESS.md with SSE streaming completion |
| `f7f99d3` | feat: implement SSE multi-agent streaming with real LLM API |
| `6fcd546` | style: 调大所有突触图标尺寸 |
| `6817b68` | docs: 更新 PROGRESS.md 记录突触图标系统完成 |
| `8b078d0` | feat: 全部图标替换为突触/神经元风格 |
| `5c545aa` | feat: M1+M6 初始化 - FastAPI后端骨架 + Expo前端骨架 + 黑白极简UI |
| `975d17b` | Initial commit |

---

*最后更新: 2026-03-28 (P1 Vercel 部署完成 + M3 讨论模式重构并验证)*
