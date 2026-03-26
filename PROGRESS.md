# Synapse 开发进度日志

## [Current Status]
**M1 + M6 初始化 + 突触图标系统已完成** — 后端骨架 (FastAPI) 和前端骨架 (Expo) 均已搭建完毕，所有 UI 图标已替换为突触/神经元风格。

当前正在进行：
- 前后端联调验证
- SSE 流式输出端到端测试（需接入真实 LLM API Key 后验证）
- Expo Go 预览通道建立

## [Completed]

### M1: 后端骨架 (FastAPI + LangGraph)
- [x] FastAPI 主入口 (`backend/app/main.py`)
- [x] CORS 中间件配置
- [x] 数据模型 & Schemas (`backend/app/models/schemas.py`)
  - AgentConfig, ChatRequest, WorkflowTemplate, PromptTemplate
  - 支持 4 种讨论模式: sequential / debate / vote / single
- [x] 内存数据库 (`backend/app/models/database.py`)
  - 5 个内置 Prompt 模板（法律顾问、代码审查员、文案策划、数据分析师、学术研究员）
- [x] API 路由完整实现:
  - `POST /api/chat/stream` — SSE 流式多 Agent 对话
  - `GET /api/chat/history/{session_id}` — 聊天历史
  - `GET/POST/PUT/DELETE /api/agents/` — Agent CRUD
  - `POST /api/upload/` — 文件上传（RAG 占位）
  - `GET/POST /api/workflows/templates` — 工作流模板
  - `GET/POST /api/workflows/prompts` — Prompt 模板
  - `GET /api/memory/{session_id}` — 记忆系统（占位）
  - `GET /api/export/markdown/{session_id}` — Markdown 导出
  - `GET /api/export/pdf/{session_id}` — PDF 导出
  - `GET /health` — 健康检查
- [x] LangGraph 多模式编排器 (`backend/app/services/orchestrator.py`)
  - 支持 sequential / debate / vote / single 四种模式
  - 辩论模式支持多轮循环 + 综合结论
  - 投票模式支持独立回答 + 综合结论
- [x] 多供应商 LLM 工厂 (`backend/app/services/agent_factory.py`)
  - 支持 OpenAI / Gemini / Claude
- [x] Token 计数 & 费用估算 (`backend/app/services/cost_tracker.py`)
- [x] API Key 加密/解密 (`backend/app/core/security.py`)
- [x] Dockerfile 已创建

### M6: 前端骨架 (React Native + Expo)
- [x] Expo 项目初始化 (SDK 55, TypeScript)
- [x] expo-router 文件路由配置
- [x] 3 个 Tab 页面:
  - **群聊** (`app/(tabs)/index.tsx`) — 主聊天界面
  - **成员** (`app/(tabs)/agents.tsx`) — AI Agent 管理
  - **设置** (`app/(tabs)/settings.tsx`) — 后端连接 & 费用统计
- [x] 黑白极简 UI 风格（纯黑白 + 灰度配色）
- [x] 4 种讨论模式切换 UI（顺序/辩论/投票/指定）
- [x] @提及指定 Agent 功能
- [x] SSE 客户端 (`services/sseClient.ts`)
- [x] API 服务层 (`services/api.ts`)
- [x] Zustand 全局状态管理 (`stores/useAppStore.ts`)
- [x] Agent 添加表单（支持 OpenAI/Gemini/Claude 选择）
- [x] Token 费用实时显示
- [x] Web 预览验证通过

### 突触图标系统
- [x] 10 个自定义突触/神经元风格图标（AI 生成）
- [x] Tab 栏图标：群聊(双节点电信号)、成员(三角神经网络)、设置(神经中枢树突)
- [x] 模式选择器图标：顺序(链式传导)、辩论(X交叉路径)、投票(汇聚节点)、指定(单焦点)
- [x] 发送按钮：神经脉冲箭头
- [x] 空状态：休眠神经元
- [x] 添加按钮：带+号的神经元树突
- [x] 完全移除所有 emoji，统一突触视觉风格

## [Next Plan]
下一棒开发者需要接手的任务：

1. **M2: LLM 集成测试** — 使用真实 API Key 测试 SSE 流式输出端到端流程
2. **M3: RAG 管道** — 接入 pgvector，实现文档上传 → 向量化 → 检索增强
3. **M4: 高级功能** — 对话分支、消息编辑、工作流模板应用
4. **M5: 部署** — 后端部署到 Railway/Render，配置生产环境
5. **UI 优化** — 打字机效果、消息气泡动画、深色模式

## [Endpoints]
- **后端 API (开发)**: https://8000-iiast3p8qmio3jic9ncds-252806aa.sg1.manus.computer
- **Expo Web 预览**: https://8081-iiast3p8qmio3jic9ncds-252806aa.sg1.manus.computer
- **健康检查**: `GET /health` → `{"status":"alive","app":"Synapse","version":"2.0.0"}`

## [Tech Stack]
| 层级 | 技术 |
|------|------|
| 前端 | React Native + Expo SDK 55 + TypeScript |
| 状态管理 | Zustand |
| 路由 | expo-router (文件路由) |
| 后端 | FastAPI + Python 3.11 |
| AI 编排 | LangGraph (StateGraph) |
| LLM | OpenAI / Gemini / Claude (多供应商) |
| 通信 | SSE (Server-Sent Events) |
| 数据 | 内存存储 (开发阶段) → PostgreSQL + pgvector (生产) |

---
*最后更新: 2026-03-27 (图标系统更新)*
