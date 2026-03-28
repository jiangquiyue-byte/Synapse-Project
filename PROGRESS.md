# Synapse 开发进度日志

---

## [Current Status]

**M4 智能增强阶段 ✅ 已全部完成。RAG 管道、联网搜索、多模态图片分析三大核心功能均已实现并推送。**

### 核心交棒信息

* **当前后端 URL**：`https://synapse-project-seven.vercel.app`
* **环境说明**：当前前端项目完全依赖 **Expo SDK 54**（React 19.1.0, React Native 0.81.5），**不可降级**。所有依赖已通过 `npx expo install --fix` 完美对齐。
* **M4 新增环境变量**：`TAVILY_API_KEY`（联网搜索功能需要）

### 已解决的坑
1. **SDK 51 到 54 的升级适配**：解决了 Expo SDK 54 对 React 19.1.0 和 React Native 0.81.5 的严格 peer dependency 要求，清理了旧缓存并完成了全量依赖对齐。
2. **Vercel 环境变量换行符修复**：修复了 Vercel CLI 设置 `OPENAI_BASE_URL` 时引入尾部换行符导致 SSE 请求报 `Invalid non-printable ASCII character in URL` 的问题。
3. **多智能体无限循环 Bug 修复**：修复了原代码中 `debate_round` 从未递增导致辩论模式无限循环的问题，新增了 `round_counter` 节点正确控制轮次。

---

## [Next Plan] (待办清单)

### 优先级 P0：Vercel 重新部署
* 需要重新部署 Vercel 以使 M4 新增的后端代码生效（rag_pipeline.py, web_search.py, image_analyzer.py）
* 需要在 Vercel 添加环境变量 `TAVILY_API_KEY`

### 优先级 P1：启动 M5 里程碑
* **持久化存储**：将内存存储迁移至 PostgreSQL + pgvector
* **对话记忆**：跨会话上下文记忆
* **工作流模板市场**：预置常用工作流模板

### 优先级 P3：Token 级流式输出（可选优化）
当前实现是 agent 级别的流式（每个 agent 完成后一次性发送），可升级为 token 级别的流式（逐字输出）。

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
| `TAVILY_API_KEY` | ✅ 是 (M4 新增) | Tavily 搜索 API Key，用于联网搜索功能 | ⚠️ 待设置 |
| `ENCRYPTION_KEY` | 否（有默认值） | Fernet 加密密钥，默认 `ghszRjI0495ouFAPRF-V_GahG3nSc8tlmeM_KKCzDCE=` | 使用默认值 |

---

## [Completed]

### M4: 智能增强 ✅ (2026-03-28)

#### 4.1 RAG 管道 ✅
* `backend/app/services/rag_pipeline.py` - 完整 RAG 管道实现
  * 文档解析: PDF (PyMuPDF), DOCX (python-docx), TXT, MD
  * 文本分块: RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
  * 向量化: OpenAI text-embedding-3-small
  * 检索: 余弦相似度向量搜索 + 关键词回退
  * 内存向量存储 (按 session_id 隔离)
* `backend/app/routers/upload.py` - 文件上传 API
  * POST /api/upload/ - 上传文档并自动向量化
  * POST /api/upload/query - 查询文档
  * GET /api/upload/documents/{session_id} - 列出已上传文档
  * DELETE /api/upload/documents/{session_id} - 清除文档
* `backend/app/routers/chat.py` - RAG 上下文自动注入
* `mobile/services/api.ts` - 前端 API 集成 (uploadDocument, queryDocuments, listDocuments)
* `mobile/app/(tabs)/index.tsx` - 前端文档上传按钮 (📎)

#### 4.2 联网搜索 ✅
* `backend/app/services/web_search.py` - Tavily API 集成
  * web_search_tool: LangGraph @tool 装饰器，支持 LLM function calling
  * web_search_async: 异步搜索 API
  * 环境变量: TAVILY_API_KEY
* `backend/app/services/orchestrator.py` - 工具绑定机制
  * _get_tools_for_agent(): 根据 Agent 配置动态加载工具
  * LLM.bind_tools() 实现 function calling
  * 工具调用结果回传 LLM 生成最终回复
  * 工具绑定失败时优雅降级

#### 4.3 多模态增强 ✅
* `backend/app/services/image_analyzer.py` - 图片分析服务
  * analyze_image_standalone(): 独立图片分析
  * build_vision_messages(): 构建视觉消息格式
* `backend/app/services/orchestrator.py` - Vision 集成
  * Agent supports_vision=True 时自动构建多模态消息
* `mobile/app/(tabs)/index.tsx` - 图片选择器 (🖼) + 图片预览条
* `mobile/app/(tabs)/agents.tsx` - 工具选择 UI + Vision 开关

#### 4.4 其他改进
* `backend/app/services/cost_tracker.py` - 新增 gpt-4.1-mini, gpt-4.1-nano, gemini-2.5-flash 定价
* `backend/requirements.txt` & `backend/api/requirements.txt` - 新增 PyMuPDF, python-docx, tavily-python

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
| 辩论模式 | `debate` | [A1→A2→A3] → round_counter × N轮 → Synthesizer → END | Agent 互相质询，round_counter 正确递增辩论轮次 |
| 投票模式 | `vote` | A1 → A2 → A3 → Synthesizer → END | 每个 Agent 独立回答，综合器统计共识与分歧 |
| 指定发言 | `single` (@提及) | A_target → END | 用户通过 @名称 指定某一个 Agent 回复 |

**前端 M3 改进：**
1. **Synthesizer 特殊 UI**：综合结论使用全宽卡片样式，黑色左边框 + 深色图标
2. **模式提示栏**：在模式选择器下方显示当前模式描述
3. **@提及改进**：支持消息任意位置的 @名称 匹配
4. **SSEClient 修复**：改进事件边界处理

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
| AI 工具 | Tavily (搜索), PyMuPDF (PDF), python-docx (DOCX) |
| 数据存储 | 内存存储 (开发阶段) → PostgreSQL + pgvector (生产) |
| 部署平台 | Vercel (Serverless Python) |
| 版本控制 | GitHub (`jiangquiyue-byte/Synapse-Project`) |

---

## [Git Log]

| 提交 | 说明 |
|------|------|
| `912c70d` | feat(M4): implement multimodal image analysis and update cost tracker |
| `d169147` | feat(M4): implement web search with Tavily API integration |
| `89c4095` | feat(M4): implement RAG pipeline with in-memory vector store |
| `a693ccc` | Milestone: SDK 54 Fixed, M3 Modes Verified, Vercel Live |
| `6a9e579` | feat: upgrade Expo SDK 51 → 54 for Expo Go compatibility |
| `b1a4539` | fix: downgrade Expo SDK 55 → 51 for Expo Go compatibility |
| `fabf09f` | docs: update PROGRESS.md - P1 Vercel deployment + M3 discussion modes complete |
| `bb08300` | feat(M3): implement debate/vote/single discussion modes |
| `e25b05c` | feat(P1): Vercel deployment complete - update frontend production URL |
| `7659e17` | feat: add Vercel deployment config for FastAPI backend |

---

*最后更新: 2026-03-28 (M4 智能增强完成：RAG 管道、联网搜索、多模态图片分析)*
