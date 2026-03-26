# Synapse 开发进度日志

---

## [Current Status]

**M1（后端骨架）+ M6（前端骨架）+ 突触图标系统 已全部完成。**

当前阶段处于"前后端联调 + 真实 LLM 接入"的起点。后端 FastAPI 服务和前端 Expo 应用均可独立运行，UI 已实现黑白极简风格并搭载完整的突触/神经元自定义图标体系。SSE 流式输出框架已就绪，但尚未接入真实 LLM API 进行端到端验证。

---

## [Endpoints]

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端 API（沙盒临时） | `https://8000-iiast3p8qmio3jic9ncds-252806aa.sg1.manus.computer` | 沙盒关闭后失效 |
| 前端 Web 预览（沙盒临时） | `https://8081-iiast3p8qmio3jic9ncds-252806aa.sg1.manus.computer` | 沙盒关闭后失效 |
| 后端本地 | `http://localhost:8000` | 本地开发时使用 |
| 前端本地 | `http://localhost:8081` | 本地开发时使用 |
| 生产后端（待部署） | 尚未部署到 Railway/Render | 下一步任务 |

> 注意：沙盒临时地址会在会话结束后失效。生产环境需要部署到 Railway 或 Render，详见下方 Next Plan。

---

## [Completed]

### M1: 后端骨架 (FastAPI + LangGraph)

后端采用 FastAPI 框架，项目结构位于 `backend/` 目录下。

**已完成的路由模块：**

| 路由文件 | 端点 | 功能 |
|----------|------|------|
| `routers/chat.py` | `POST /api/chat/sse` | SSE 流式群聊（核心端点） |
| `routers/agents.py` | `GET/POST/DELETE /api/agents/` | Agent CRUD 管理 |
| `routers/workflows.py` | `GET /api/workflows/templates` | 工作流模板列表 |
| `routers/memory.py` | `GET /api/memory/prompts` | 5 个内置 Prompt 模板 |
| `routers/upload.py` | `POST /api/upload/` | 文件上传（占位） |
| `routers/export.py` | `GET /api/export/markdown`, `/pdf` | 对话导出 |
| `main.py` | `GET /health` | 健康检查 |

**已完成的服务层：**

| 服务文件 | 功能 |
|----------|------|
| `services/orchestrator.py` | LangGraph 多模式编排器，支持 sequential / debate / vote / single 四种讨论模式 |
| `services/agent_factory.py` | 多供应商 LLM 工厂，支持 OpenAI / Gemini / Claude，统一接口调用 |
| `services/cost_tracker.py` | Token 费用实时追踪，按 provider+model 计费 |
| `core/config.py` | 全局配置（CORS、版本号等） |
| `core/security.py` | API Key AES 加密/解密 |
| `models/schemas.py` | Pydantic 数据模型（Agent、Message、ChatRequest 等） |
| `models/database.py` | 内存存储（开发阶段），后续迁移至 PostgreSQL + pgvector |

**内置 Prompt 模板（5个）：** 法律顾问、代码审查员、文案策划、数据分析师、学术研究员。

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
| `services/api.ts` | REST API 封装，含 health / agents CRUD / chat SSE / prompts / workflows 等接口 |
| `stores/useAppStore.ts` | Zustand 全局状态管理，含 agents / messages / discussionMode / backendUrl / totalCostUsd 等状态 |

### 突触图标系统

共 10 个 AI 生成的自定义 PNG 图标，全部位于 `mobile/assets/icons/` 目录：

| 图标文件 | 用途 | 视觉描述 | 当前尺寸 |
|----------|------|----------|----------|
| `tab-chat.png` | 群聊 Tab | 双神经元节点 + 电信号火花 | 34px |
| `tab-agents.png` | 成员 Tab | 三角形神经网络（三节点互联） | 34px |
| `tab-settings.png` | 设置 Tab | 神经中枢 + 放射状树突 | 34px |
| `mode-sequential.png` | 顺序模式 | 链式节点，信号单向传导 | 24px |
| `mode-debate.png` | 辩论模式 | X 交叉路径，信号双向对冲 | 24px |
| `mode-vote.png` | 投票模式 | 三节点汇聚到一个收集点 | 24px |
| `mode-single.png` | 指定模式 | 单焦点节点 + 定向脉冲 | 24px |
| `send-pulse.png` | 发送按钮 | 神经脉冲箭头（白色反色） | 26px |
| `empty-agents.png` | 成员空状态 | 休眠神经元（灰色淡化） | 100px |
| `add-neuron.png` | 添加成员按钮 | 带 + 号的神经元树突 | 28px |

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

下一棒开发者需要接手的具体任务，按优先级排列：

### 优先级 P0：端到端 SSE 流式对话验证

**起点文件：** `backend/app/services/orchestrator.py` 第 45 行 `async def run_sequential()`

**具体步骤：**
1. 在 `mobile/app/(tabs)/settings.tsx` 中配置真实后端地址
2. 在 `mobile/app/(tabs)/agents.tsx` 中添加至少 2 个 Agent（需要真实的 OpenAI/Gemini/Claude API Key）
3. 在群聊页面发送消息，验证 SSE 流式输出是否正常工作
4. 调试 `backend/app/services/agent_factory.py` 中的 `call_llm()` 方法，确保各供应商 API 调用正确
5. 验证四种讨论模式（顺序/辩论/投票/指定）的编排逻辑

### 优先级 P1：部署后端到 Railway/Render

**起点文件：** `backend/Dockerfile`（已就绪）

**具体步骤：**
1. 在 Railway 或 Render 创建新项目，连接 GitHub 仓库
2. 设置构建目录为 `backend/`
3. 设置环境变量 `ENCRYPTION_KEY`（用于 API Key 加密）
4. 部署后将生产 URL 更新到本文件的 [Endpoints] 表格中
5. 在前端 settings 页面配置生产后端地址

### 优先级 P2：M2 里程碑 — RAG 管道

**起点文件：** 需新建 `backend/app/services/rag_pipeline.py`

**具体步骤：**
1. 安装 `pgvector`、`langchain`、`chromadb` 依赖
2. 实现文档上传 → 分块 → Embedding → 向量存储流程
3. 完善 `backend/app/routers/upload.py` 中的占位逻辑
4. 在 orchestrator 中集成 RAG 检索，作为 Agent 的上下文增强

### 优先级 P3：M3 里程碑 — 工作流引擎

**起点文件：** `backend/app/routers/workflows.py`（已有模板列表端点）

**具体步骤：**
1. 实现工作流的创建、保存、执行逻辑
2. 在前端添加工作流编辑器页面
3. 支持自定义 Agent 执行顺序和条件分支

### 优先级 P4：Expo Go 移动端预览

**说明：** 当前 `npx expo start --tunnel` 需要 ngrok 支持。本地开发时可直接运行：

```bash
cd mobile
npm install
npx expo start --tunnel
```

用 Expo Go App 扫描终端中的二维码即可在安卓手机上预览。

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
| `6fcd546` | style: 调大所有突触图标尺寸 |
| `6817b68` | docs: 更新 PROGRESS.md 记录突触图标系统完成 |
| `8b078d0` | feat: 全部图标替换为突触/神经元风格 |
| `5c545aa` | feat: M1+M6 初始化 - FastAPI后端骨架 + Expo前端骨架 + 黑白极简UI |
| `975d17b` | Initial commit |

---

*最后更新: 2026-03-27 (最终存档 — Session End)*
