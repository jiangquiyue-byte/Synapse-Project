# Synapse 开发进度日志

---

## [Current Status]

**M4 智能增强 ✅ + UI 重构 ✅ + 后端兼容性加固 ✅ 全部完成。**

### 核心交棒信息

* **当前后端 URL**：`https://synapse-project-seven.vercel.app`
* **环境说明**：当前前端项目完全依赖 **Expo SDK 54**（React 19.1.0, React Native 0.81.5），**不可降级**。
* **M4 新增环境变量**：`TAVILY_API_KEY`（联网搜索功能需要）
* **版本号**：v2.1.0

### 已解决的坑
1. **SDK 51 到 54 的升级适配**：解决了 Expo SDK 54 对 React 19.1.0 和 React Native 0.81.5 的严格 peer dependency 要求。
2. **Vercel 环境变量换行符修复**：修复了 Vercel CLI 设置 `OPENAI_BASE_URL` 时引入尾部换行符的问题。
3. **多智能体无限循环 Bug 修复**：修复了 `debate_round` 从未递增导致辩论模式无限循环的问题。
4. **JSON Parse Error 修复**：前端 `safeJson()` 包装器 + 后端全局异常处理，确保任何情况下都返回合法 JSON。

---

## [Next Plan] (待办清单)

### 优先级 P0：Vercel 重新部署
* 需要重新部署 Vercel 以使新增后端代码生效
* 需要在 Vercel 添加环境变量 `TAVILY_API_KEY`

### 优先级 P1：启动 M5 里程碑
* **持久化存储**：将内存存储迁移至 PostgreSQL + pgvector
* **对话记忆**：跨会话上下文记忆
* **工作流模板市场**：预置常用工作流模板

### 优先级 P3：Token 级流式输出（可选优化）
当前实现是 agent 级别的流式，可升级为 token 级别的流式（逐字输出）。

---

## [Endpoints]

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端 API（Vercel 生产） | `https://synapse-project-seven.vercel.app` | 永久 URL，已部署 |
| Health Check | `https://synapse-project-seven.vercel.app/health` | 返回 `{"status":"alive","app":"Synapse","version":"2.1.0"}` |
| 后端本地 | `http://localhost:8000` | 本地开发时使用 |
| 前端本地 | `http://localhost:8081` | 本地开发时使用 |

---

## [环境变量要求]

| 变量名 | 必需 | 说明 | Vercel 状态 |
|--------|------|------|-------------|
| `OPENAI_API_KEY` | ✅ 是 | OpenAI API Key | ✅ 已设置 |
| `OPENAI_BASE_URL` | ✅ 是 | OpenAI 兼容 API 的 Base URL | ✅ 已设置 |
| `TAVILY_API_KEY` | ✅ 是 (M4 新增) | Tavily 搜索 API Key | ⚠️ 待设置 |
| `ENCRYPTION_KEY` | 否（有默认值） | Fernet 加密密钥 | 使用默认值 |

---

## [Completed]

### UI 重构：黑白实验室风格 ✅ (2026-03-28)

**设计语言：**
* 色调：背景 #000000，文字 #FFFFFF，边框 #262626
* 组件：直角设计（borderRadius: 2），去除阴影，monospace 字体标签
* 输入区：底部悬浮式设计，极简线条

**输入框交互重构：**
* 左侧 `+` 按钮：弹出菜单支持「上传图片」和「上传文档」
* 模式药丸切换器：SEQ/DBT/VOT/@1 快速切换讨论模式
* 图片预览条：选择图片后在输入栏上方显示缩略图

**后端兼容性加固：**
* `agent_factory.py`：新增 `custom_openai` 供应商，支持自定义 base_url（DeepSeek、Qwen 等国内 API）
* `schemas.py`：新增 `CUSTOM_OPENAI` 枚举、`custom_base_url` 字段
* `main.py`：全局异常处理器（500/404/422），确保始终返回 JSON
* `upload.py`：所有端点 try-catch 包装，返回标准 JSON 错误
* `api.ts`：`safeJson()` 包装器，防止非 JSON 响应导致前端崩溃
* `agents.tsx`：Agent 编辑页新增 Custom 供应商选项和 API Base URL 输入框

### M4: 智能增强 ✅ (2026-03-28)

#### 4.1 RAG 管道 ✅
* `backend/app/services/rag_pipeline.py` - 完整 RAG 管道实现
  * 文档解析: PDF (PyMuPDF), DOCX (python-docx), TXT, MD
  * 文本分块: RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
  * 向量化: OpenAI text-embedding-3-small
  * 检索: 余弦相似度向量搜索 + 关键词回退
  * 内存向量存储 (按 session_id 隔离)

#### 4.2 联网搜索 ✅
* `backend/app/services/web_search.py` - Tavily API 集成
  * web_search_tool: LangGraph @tool，支持 LLM function calling
  * 工具绑定失败时优雅降级

#### 4.3 多模态增强 ✅
* `backend/app/services/image_analyzer.py` - 图片分析服务
* Vision 集成：supports_vision=True 时自动构建多模态消息

#### 4.4 其他改进
* `cost_tracker.py` - 新增 gpt-4.1-mini, gpt-4.1-nano, gemini-2.5-flash 定价

### P1: Vercel 部署 ✅ (2026-03-28)
### M3: 多模式对话引擎 ✅ (2026-03-28)
### M1: 后端骨架 (FastAPI + LangGraph)
### M6: 前端骨架 (Expo SDK 54 + TypeScript)

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
| LLM 供应商 | OpenAI, Gemini, Claude, Custom OpenAI (DeepSeek/Qwen) |
| 数据存储 | 内存存储 (开发阶段) → PostgreSQL + pgvector (生产) |
| 部署平台 | Vercel (Serverless Python) |
| 版本控制 | GitHub (`jiangquiyue-byte/Synapse-Project`) |

---

## [Git Log]

| 提交 | 说明 |
|------|------|
| `ed4d757` | feat: full UI overhaul - black lab aesthetic + input redesign + custom provider |
| `8f22492` | feat: add custom_openai provider + global JSON error handling |
| `bf3b9ba` | docs: update PROGRESS.md - M4 milestone complete |
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

*最后更新: 2026-03-28 (UI 重构 + 后端兼容性加固完成)*
