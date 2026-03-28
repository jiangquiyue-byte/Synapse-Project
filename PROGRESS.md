# Synapse 开发进度日志

---

## [Current Status]

**M4 智能增强 ✅ + UI 重构 ✅ + 后端兼容性加固 ✅ + 聊天修复 ✅ + 连通性修复 ✅ 全部完成。App 已在手机端正常运行并可对话。**

### 核心交棒信息

* **当前后端 URL**：`https://synapse-project-seven.vercel.app`
* **环境说明**：当前前端项目完全依赖 **Expo SDK 54**（React 19.1.0, React Native 0.81.5），**不可降级**。
* **M4 新增环境变量**：`TAVILY_API_KEY`（联网搜索功能需要）
* **版本号**：v2.1.0
* **UI 风格**：白底黑字简洁风格，全中文按钮和标签

### 已解决的坑
1. **SDK 51 到 54 的升级适配**：解决了 Expo SDK 54 对 React 19.1.0 和 React Native 0.81.5 的严格 peer dependency 要求。
2. **Vercel 环境变量换行符修复**：修复了 Vercel CLI 设置 `OPENAI_BASE_URL` 时引入尾部换行符的问题。
3. **多智能体无限循环 Bug 修复**：修复了 `debate_round` 从未递增导致辩论模式无限循环的问题。
4. **JSON Parse Error 修复**：前端 `safeJson()` 包装器 + 后端全局异常处理，确保任何情况下都返回合法 JSON。
5. **Expo Go 蓝屏修复**：删除冲突的 `pnpm-lock.yaml`（锁定 SDK 55 依赖）+ 移除 `tintColor` 样式属性 + 清理 Metro 缓存。
6. **Serverless 聊天失败修复**：新增 `inline_agents` 机制，前端每次聊天请求直接携带完整 Agent 配置（含 API Key），彻底绕过 Vercel Serverless 无状态内存限制。
7. **No response body 修复**：React Native 的 `fetch` 不支持 `response.body`（ReadableStream），导致 SSE 流式读取失败。新增 `/api/chat/send` 非流式 JSON 端点，前端改用标准 fetch + JSON 方式通信，彻底解决兼容性问题。
8. **图标资源过大导致蓝屏**：原始图标每个 4-7MB（共 ~100MB），Expo Go 通过 tunnel 加载时内存溢出/超时崩溃。压缩至 64x64/128x128 优化 PNG（共 ~24KB），彻底解决。

---

## [Next Plan] (待办清单)

### 优先级 P0：Vercel 环境变量
* 需要在 Vercel 添加环境变量 `TAVILY_API_KEY` 以启用联网搜索

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

### Expo Go 蓝屏修复 + 聊天修复 ✅ (2026-03-28)

**蓝屏问题：**
* 根因：`pnpm-lock.yaml` 锁定 SDK 55/RN 0.83/React 19.2 依赖，与 package.json 的 SDK 54 冲突
* 修复：删除 pnpm-lock.yaml + 移除所有 tintColor 样式 + 清理 Metro 缓存

**聊天不通问题：**
* 根因：Vercel Serverless 无状态，Agent 保存在内存中，chat 请求可能路由到不同实例
* 修复：新增 `inline_agents` 字段，前端发送聊天时直接携带完整 Agent 配置
* 验证：DeepSeek (custom_openai) 端到端测试通过

**UI 调整：**
* 从黑底白字改为白底黑字简洁风格
* 所有按钮和标签改为中文

### UI 重构 ✅ (2026-03-28)

**输入框交互重构：**
* 左侧 `+` 按钮：弹出菜单支持「上传图片」和「上传文档」
* 模式药丸切换器：顺序/辩论/投票/指定 快速切换讨论模式
* 图片预览条：选择图片后在输入栏上方显示缩略图

**后端兼容性加固：**
* `agent_factory.py`：新增 `custom_openai` 供应商，支持自定义 base_url（DeepSeek、Qwen 等国内 API）
* `schemas.py`：新增 `CUSTOM_OPENAI` 枚举、`custom_base_url` 字段、`InlineAgentConfig` 模型
* `chat.py`：优先使用 `inline_agents`，回退到内存查找
* `main.py`：全局异常处理器（500/404/422），确保始终返回 JSON
* `upload.py`：所有端点 try-catch 包装，返回标准 JSON 错误
* `api.ts`：`safeJson()` 包装器，防止非 JSON 响应导致前端崩溃
* `agents.tsx`：Agent 编辑页新增「自定义」供应商选项和 API 地址输入框

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
| `1871015` | fix: compress icons from ~100MB to ~24KB, fix Expo Go crash |
| `3db8222` | docs: update PROGRESS.md - No response body fix recorded |
| `d9811dc` | fix: non-streaming /chat/send endpoint for React Native compatibility |
| `fc51902` | fix: inline_agents for stateless Serverless chat + white UI + Chinese labels |
| `ed4d757` | feat: full UI overhaul - black lab aesthetic + input redesign + custom provider |
| `8f22492` | feat: add custom_openai provider + global JSON error handling |
| `bf3b9ba` | docs: update PROGRESS.md - M4 milestone complete |
| `912c70d` | feat(M4): implement multimodal image analysis and update cost tracker |
| `d169147` | feat(M4): implement web search with Tavily API integration |
| `89c4095` | feat(M4): implement RAG pipeline with in-memory vector store |
| `a693ccc` | Milestone: SDK 54 Fixed, M3 Modes Verified, Vercel Live |

---

*最后更新: 2026-03-28 (全部修复完成，App 正常运行 + DeepSeek 对话验证通过)*
