---

## [Current Status]

**M5 生产化升级已完成最终生产激活：Vercel 生产环境现已接入 Neon PostgreSQL、pgvector 持久化、跨会话记忆、Token 级流式输出、Tavily 联网搜索、五页面导航以及三种导出链路。当前生产后端健康检查已稳定返回 `database=postgresql+pgvector` 与 `tavily_enabled=true`，说明生产骨架已经从“待激活”进入“可交付”状态。**

### 核心交棒信息

| 项目 | 当前值 | 说明 |
|------|--------|------|
| 当前后端 URL | `https://synapse-project-seven.vercel.app` | 已绑定正式别名 |
| 当前版本 | `v2.2.0` | 生产健康检查返回该版本 |
| 数据库状态 | `postgresql+pgvector` | 生产 `/health` 已验证 |
| 联网搜索状态 | `true` | 生产 `/health` 已验证 |
| 前端结构 | 五页面 | 聊天 / 成员 / 记忆 / 工作流 / 设置 |
| UI 风格 | 白底黑字极简风 | 全中文按钮与标签 |

### 本轮生产激活结论

| 维度 | 结果 | 说明 |
|------|------|------|
| 会话与消息持久化 | ✅ 已完成 | 线上聊天消息已真实写入 PostgreSQL |
| 跨会话记忆 | ✅ 已完成 | 线上两会话回忆验证已通过 |
| Token 级流式输出 | ✅ 已完成 | `/api/chat/stream` 已完成线上回归 |
| Tavily 联网搜索 | ✅ 已激活 | 生产环境已注入 `TAVILY_API_KEY` |
| 导出链路 | ✅ 已修复 | Markdown / PDF / JSON 均可用 |
| 设置页连接状态 | ✅ 已修复 | 前端已能自动探测后端健康状态 |
| Expo Web 预览 | ✅ 可用 | 静态导出预览已可用于交互验收 |

### 当前仍需知晓的技术事实

第一，当前生产记忆链路已经稳定可用，但**外部 OpenAI 兼容 embeddings 接口并不可靠**。实测现有 DeepSeek 路径上的 `/embeddings` 返回 404，因此后端新增了统一的 `embedding_service.py`，采用“远程 embedding 可用则优先使用；失败则自动降级到本地哈希向量”的策略。也就是说，系统已经具备**稳定的向量化记忆能力与 pgvector 落库能力**，但若后续要切换为更高质量的外部 embedding，需要补充一个真正支持 `/embeddings` 的提供商凭证，而不是继续复用当前 DeepSeek 路径。

第二，当前生产数据库已从 SQLite 开发兜底迁移到 Neon PostgreSQL。为兼容 Neon 连接串与 `asyncpg`，数据库初始化层已加入 query 参数清洗与 SSL 兼容处理，因此后续若更换数据库供应商，优先检查 `backend/app/models/database.py` 中的连接串标准化逻辑，而不是只改环境变量。

第三，当前导出链路已完成一轮重要修复。此前 PDF 导出在 WeasyPrint 不可用时会把 HTML 字节伪装成 PDF 返回，JSON 导出则完全缺失后端路由；本轮已统一补齐，生产环境现已提供真实 PDF 字节与结构化 JSON 导出接口。

---

## [Next Plan] (待办清单)

### 优先级 P0：补齐真正的远程 Embedding 供应商

| 项目 | 当前状态 | 下一步 |
|------|----------|--------|
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | 已存在，但当前路径不稳定支持 embeddings | 更换为支持 `/embeddings` 的 OpenAI 兼容服务 |
| `EMBEDDING_MODEL` | 已可配置 | 与新供应商一起验证维度是否匹配 `PGVECTOR_DIMENSION=1536` |
| 记忆质量回归 | 仅完成稳定性验证 | 完成一次“远程 embedding 已生效”的精度回归 |

### 优先级 P1：补充前端正式预览/打包流程

当前用于验收的是 **Expo Web 静态导出预览**。它足以完成页面交互验证，但还不是正式分发形态。下一任开发者应继续补齐移动端正式构建与分发流程，并确认静态导出页不再依赖手动修补 `index.html` 的模块脚本声明。

### 优先级 P2：体验收尾

可以继续优化记忆中心、工作流市场和成员页的空状态表现，并把更多线上验证脚本沉淀为无密版本的自动化检查资产，供 CI 或接任开发者复用。

---

## [Endpoints]

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端 API（Vercel 生产） | `https://synapse-project-seven.vercel.app` | 正式生产地址 |
| Health Check | `https://synapse-project-seven.vercel.app/health` | 当前返回 `status=alive`、`version=2.2.0`、`database=postgresql+pgvector`、`tavily_enabled=true` |
| 后端本地 | `http://localhost:8000` | 本地开发使用 |
| 前端本地 | `http://localhost:8081` | Expo 开发预览 |
| 前端静态预览 | `http://localhost:8082` | 本地静态导出验收使用 |

---

## [环境变量要求]

| 变量名 | 必需 | 说明 | 当前生产状态 |
|--------|------|------|-------------|
| `OPENAI_API_KEY` | ✅ 是 | OpenAI 兼容 API Key | ✅ 已设置 |
| `OPENAI_BASE_URL` | ✅ 是 | OpenAI 兼容 API 的 Base URL | ✅ 已设置 |
| `DATABASE_URL` | ✅ 是 | Neon PostgreSQL 连接串 | ✅ 已设置 |
| `TAVILY_API_KEY` | ✅ 是 | Tavily 搜索 API Key | ✅ 已设置 |
| `EMBEDDING_MODEL` | 建议设置 | 记忆/文档向量化模型 | ✅ 已设置（但仍需真正支持 embeddings 的供应商配合） |
| `ENCRYPTION_KEY` | 否 | Fernet 加密密钥 | 使用默认值 |
| `PGVECTOR_DIMENSION` | 建议设置 | 当前默认 `1536`，需与 embedding 维度一致 | 使用代码默认值 |

### 安全交接规范（严禁把密钥明文提交到 GitHub）

| 场景 | 正确做法 | 禁止做法 |
|------|----------|----------|
| Vercel Token 交接 | 由接任开发者在本地或密码管理器中保存，并通过部署平台或本地环境变量注入 | 把 token 写进仓库、README、PROGRESS.md、脚本或截图 |
| 数据库连接串交接 | 仅在部署平台环境变量中维护，必要时通过安全渠道单独传递 | 写入 `.env.example` 的真实值或提交到任意代码文件 |
| API Key 轮换 | 在部署平台替换后立即重新部署并做健康检查 | 在 Git 提交记录中保留旧密钥 |
| 调试脚本 | 仅保留无密模板，实际密钥运行时注入 | 把真实 `api_key`、`DATABASE_URL`、`TAVILY_API_KEY` 写进脚本 |

> 交接文档中只允许记录**变量名、用途、配置位置、轮换方式与验证步骤**，不允许记录任何真实密钥值。这是本仓库的硬性安全规则。

---

## [Completed]

### M5 生产最终激活 ✅ (2026-03-29)

#### 5.6 生产数据库与联网搜索完成激活 ✅

* 生产环境已写入 `DATABASE_URL` 与 `TAVILY_API_KEY`
* `/health` 已返回 `database=postgresql+pgvector` 与 `tavily_enabled=true`
* 线上聊天、历史记录与配置接口均已恢复稳定

#### 5.7 Neon / asyncpg 兼容性修复 ✅

* `backend/app/models/database.py`：新增 Neon 连接串 query 参数清洗
* 将不被 `asyncpg` 接受的参数转换或剔除，避免生产初始化直接失败
* 保留 SQLite 本地开发兜底能力

#### 5.8 Embedding 稳定性修复 ✅

* 新增 `backend/app/services/embedding_service.py`
* 记忆服务与 RAG 管道统一改为调用共享 embedding 服务
* 当远程 embedding 初始化失败或调用 404 时，自动回退到本地哈希向量，保证跨会话记忆与文档检索不中断

#### 5.9 生产运行时与导出链路修复 ✅

* `backend/api/requirements.txt`：补充 `fastapi`，修复 Vercel Python 函数运行时导入失败
* `backend/app/routers/export.py`：补齐 `/api/export/json/{session_id}`
* PDF 导出改为生成真实 PDF 字节，不再返回伪装的 HTML 内容
* Markdown / PDF / JSON 三条导出链路均已完成生产验证

#### 5.10 五页面最终复测 ✅

* 聊天页：可发送消息、读取历史、触发导出
* 成员页：导航正常，空状态显示符合预期
* 记忆页：可访问并读取记忆检索入口
* 工作流页：模板/提示词市场可正常显示
* 设置页：已自动显示“已连接”，且测试连接按钮工作正常

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

### M5: 生产化升级 ✅（主要能力已落地，2026-03-29）

#### 5.1 PostgreSQL + pgvector 持久化底座 ✅
* `backend/app/models/database.py`：完成 SQLAlchemy 异步持久化重构
  * 支持生产环境 `PostgreSQL + pgvector`
  * 支持本地 `SQLite` 平滑降级开发
  * 覆盖会话、消息、Agent、工作流、用户配置、文档、记忆记录等核心对象
* `backend/app/routers/state.py`：新增状态同步路由
  * 提供会话列表与用户配置持久化接口
* `backend/app/main.py`：接入数据库初始化与释放逻辑
* `backend/requirements.txt` / `backend/api/requirements.txt`：补齐 ORM、异步驱动与向量相关依赖

#### 5.2 跨会话记忆系统 ✅
* `backend/app/services/memory_service.py`：新增真实记忆服务层
  * 支持记忆写入、跨会话检索、上下文拼装
  * 支持中文 CJK 关键词切分与降级召回
* `backend/app/routers/memory.py`：从占位接口升级为真实记忆 API
* `backend/app/routers/chat.py`：聊天链路中接入记忆写入与检索注入

#### 5.3 Token 级流式输出 ✅
* `backend/app/services/orchestrator.py`：支持 Token 级逐字流式编排
* `backend/app/routers/chat.py`：`/api/chat/stream` 已可输出 `event: token`
* `mobile/services/sseClient.ts`：升级为 React Native 可用的流式解析器
* `mobile/stores/useAppStore.ts`：新增消息增量 patch / upsert 能力
* `mobile/app/(tabs)/index.tsx`：前端已可逐字更新消息内容并保留最终持久化结果

#### 5.4 五页面扩展与交互补齐 ✅
* 原三页面扩展为五页面：聊天 / 成员 / 记忆中心 / 工作流市场 / 设置
* 新增 `mobile/app/(tabs)/memory.tsx`
* 新增 `mobile/app/(tabs)/workflows.tsx`
* 聊天页新增“导出对话”入口
* 设置页新增 Tavily 联网搜索开关
* 继续保持纯代码 SVG + 1px 黑线极简风格

#### 5.5 上一阶段已知上线前事项（现已完成）
* `DATABASE_URL` 已完成生产注入
* `TAVILY_API_KEY` 已完成生产注入
* 导出链路已完成联通修复与验证
* embedding 稳定性已通过统一回退服务解决

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
| 通信协议 | SSE (Server-Sent Events)，已支持 Token 级逐字流式 |
| AI 工具 | Tavily (搜索), PyMuPDF (PDF), python-docx (DOCX) |
| LLM 供应商 | OpenAI, Gemini, Claude, Custom OpenAI (DeepSeek/Qwen) |
| 数据存储 | SQLite（本地降级） / PostgreSQL + pgvector（生产） |
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

*最后更新: 2026-03-29（M5 生产激活完成：PostgreSQL/pgvector、跨会话记忆、Token 流式、Tavily、五页面、Markdown/PDF/JSON 导出与设置页连接状态均已完成生产验证；后续重点转向真正支持 embeddings 的远程供应商接入与正式移动端分发流程。）*
