# Synapse 开发进度日志

---

## [Current Status]

**M1（后端骨架）+ M6（前端骨架）+ 突触图标系统 + SSE 流式多智能体对话 + M3 多模式对话引擎 已全部完成。**

当前阶段已完成"前后端联调 + 真实 LLM 接入 + 多模式对话引擎（sequential / debate / vote / single）"。Vercel 部署已完成 CLI 授权和配置文件创建，但尚未完成最终部署推送（详见下方"Vercel 部署接力"章节）。后端代码已全部就绪，SSE 流式多智能体对话已通过端到端验证。

---

## [Vercel 部署接力] — 下一棒必读

### 当前部署状态

| 项目 | 状态 | 说明 |
|------|------|------|
| Vercel 账号 | ✅ 已注册并验证 | 通过 GitHub OAuth 注册，手机号 SMS 验证通过 |
| Vercel CLI | ✅ 已安装并授权 | v50.37.1，已通过设备码授权登录 |
| vercel.json | ✅ 已创建 | 位于项目根目录，配置 Python Serverless Function |
| backend/api/index.py | ✅ 已创建 | Vercel Serverless 入口文件，re-export FastAPI app |
| 最终部署推送 | ❌ 未完成 | CLI 授权完成后，尚未执行 `vercel --prod` |

### Vercel 部署配置文件

**vercel.json**（项目根目录）：
```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    { "src": "/health", "dest": "backend/api/index.py" },
    { "src": "/api/(.*)", "dest": "backend/api/index.py" },
    { "src": "/(.*)", "dest": "backend/api/index.py" }
  ]
}
```

**backend/api/index.py**（Serverless 入口）：
```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.main import app
```

**backend/api/requirements.txt**（Vercel Python 依赖）：
```
fastapi>=0.115.0
uvicorn[standard]
sse-starlette
pydantic-settings
python-multipart
python-dotenv
cryptography
httpx
markdown
langchain
langchain-openai
langchain-google-genai
langchain-anthropic
langgraph
tiktoken
```

### 下一棒操作步骤

1. **在沙盒中执行部署**（Vercel CLI 已授权，可直接使用）：
   ```bash
   cd /home/ubuntu/Synapse-Project
   vercel --prod --yes 2>&1
   ```
   如果提示选择项目，选择 "Link to existing project" 或创建新项目，Root Directory 设为 `.`（项目根目录）。

2. **设置 Vercel 环境变量**（关键！）：
   ```bash
   vercel env add OPENAI_API_KEY production
   vercel env add ENCRYPTION_KEY production
   ```
   - `OPENAI_API_KEY`：用于 synthesizer 节点和环境变量回退机制
   - `ENCRYPTION_KEY`：值为 `ghszRjI0495ouFAPRF-V_GahG3nSc8tlmeM_KKCzDCE=`

3. **验证部署**：
   ```bash
   curl https://<your-app>.vercel.app/health
   # 应返回 {"status":"alive","app":"Synapse","version":"2.0.0"}
   ```

4. **更新前端 API_BASE_URL**：
   修改 `mobile/services/api.ts` 中的 `DEFAULT_BACKEND_URL` 为 Vercel 永久 URL。

### 可能遇到的问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| Vercel Python 构建失败 | `@vercel/python` 默认 Python 版本可能不兼容 | 在 vercel.json 中添加 `"functions": {"backend/api/index.py": {"runtime": "python3.11"}}` |
| SSE 流式超时 | Vercel Serverless Function 默认 10s 超时（Hobby 计划） | 多 Agent 对话可能超时，需升级 Pro 或减少 Agent 数量；或改用 Railway/Render |
| 模块导入失败 | `sys.path` 未正确设置 | 确认 `backend/api/index.py` 中 `sys.path.insert(0, ...)` 指向 `backend/` 目录 |
| 环境变量缺失 | 未在 Vercel Dashboard 设置 | 通过 CLI 或 Dashboard 添加 `OPENAI_API_KEY` 和 `ENCRYPTION_KEY` |

> **重要提醒**：Vercel Serverless Function（Hobby 计划）有 **10 秒执行超时限制**。多 Agent 辩论模式（3 轮 x 3 个 Agent = 9 次 LLM 调用）可能超时。如果遇到此问题，建议：
> - 升级 Vercel Pro（60 秒超时）
> - 或改用 Railway（无超时限制，`railway.toml` 已在仓库中）
> - 或使用 Render（`render.yaml` 已在仓库中）

---

## [Endpoints]

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端 API（沙盒临时） | `https://8000-itjpuatlcc84icpovyuc5-2b4d9b54.sg1.manus.computer` | 会话结束后失效 |
| Expo 预览（沙盒临时） | `exp://zv4mr80-anonymous-8081.exp.direct` | 会话结束后失效 |
| 后端本地 | `http://localhost:8000` | 本地开发时使用 |
| 前端本地 | `http://localhost:8081` | 本地开发时使用 |
| Vercel 生产（待部署） | 待执行 `vercel --prod` 后获取 | 见上方接力步骤 |

> 注意：沙盒 URL 会在会话结束后失效。需按上方接力步骤完成 Vercel 部署获取永久 URL。

---

## [环境变量要求]

后端运行需要以下环境变量：

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `OPENAI_API_KEY` | ✅ 是 | OpenAI API Key，用于 synthesizer 节点和 Agent 的环境变量回退 |
| `ENCRYPTION_KEY` | 否（有默认值） | Fernet 加密密钥，默认 `ghszRjI0495ouFAPRF-V_GahG3nSc8tlmeM_KKCzDCE=` |
| `TAVILY_API_KEY` | 否 | Tavily 搜索 API Key（未来 RAG 功能使用） |
| `DATABASE_URL` | 否（有默认值） | 数据库连接字符串，当前使用内存存储 |

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

### M3: 多模式对话引擎 ✅ (本次迭代完成)

**orchestrator.py 已实现四种讨论模式：**

| 模式 | 标识 | 图结构 | 说明 |
|------|------|--------|------|
| 顺序发言 | `sequential` | A1 → A2 → A3 → END | 默认模式，Agent 按顺序依次发言 |
| 辩论模式 | `debate` | [A1→A2→A3] × N轮 → Synthesizer → END | Agent 互相质询，可查看前序发言并反驳，最终由综合器总结 |
| 投票模式 | `vote` | A1 → A2 → A3 → Synthesizer → END | 每个 Agent 独立回答（vote 模式下 system prompt 要求不参考他人），综合器统计共识与分歧 |
| 指定发言 | `single` (@Single) | A_target → END | 用户通过 `target_agent_id` 指定某一个 Agent 立即回复 |

**辩论模式核心逻辑：**
- `debate_should_continue()` 函数控制辩论轮次
- 每轮所有 Agent 按顺序发言，可看到前序所有发言记录
- 达到 `max_debate_rounds` 后进入 `synthesizer_node` 综合结论
- 综合器使用系统级 `OPENAI_API_KEY`（gpt-4.1-mini）

**投票模式核心逻辑：**
- 每个 Agent 的 system prompt 包含"请独立回答，不要参考其他 Agent 的回答"
- 所有 Agent 发言完毕后进入综合器，统计共识与分歧

**指定发言核心逻辑：**
- `chat.py` 路由在 mode=single 时过滤 `agent_configs`，仅保留 `target_agent_id` 对应的 Agent
- 构建单节点图：A_target → END

### SSE 流式多智能体对话 ✅

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
| `services/sseClient.ts` | SSE 客户端，解析 Server-Sent Events 流 |
| `services/api.ts` | REST API 封装，默认指向沙盒后端（待更新为 Vercel URL） |
| `stores/useAppStore.ts` | Zustand 全局状态管理 |

### 突触图标系统

共 10 个 AI 生成的自定义 PNG 图标，全部位于 `mobile/assets/icons/` 目录。

### Vercel 部署配置 ✅ (本次迭代完成)

| 文件 | 说明 |
|------|------|
| `vercel.json` | Vercel 部署配置，Python Serverless Function + 路由重写 |
| `backend/api/index.py` | Vercel Serverless 入口，re-export FastAPI app |
| `backend/api/requirements.txt` | Vercel Python 依赖列表 |
| `render.yaml` | Render 部署配置（备选方案） |
| `backend/railway.toml` | Railway 部署配置（备选方案） |

---

## [Next Plan]

### 优先级 P1：完成 Vercel 部署（接力点）

**说明：** Vercel CLI 已授权，配置文件已就绪，需执行 `vercel --prod` 完成最终部署。详见上方"Vercel 部署接力"章节。

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
| 容器化 | Docker (Dockerfile 已就绪) |
| 部署平台 | Vercel (Serverless Python) / Railway / Render (备选) |
| 版本控制 | GitHub (`jiangquiyue-byte/Synapse-Project`) |

---

## [UI 设计规范]

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

## [Git Log]

| 提交 | 说明 |
|------|------|
| (pending) | End of session: P0 verified, Vercel deployment initiated |
| `df59bca` | feat: add Vercel deployment config for FastAPI backend |
| `6000a19` | docs: update PROGRESS.md with SSE streaming completion |
| `f7f99d3` | feat: implement SSE multi-agent streaming with real LLM API |
| `6fcd546` | style: 调大所有突触图标尺寸 |
| `6817b68` | docs: 更新 PROGRESS.md 记录突触图标系统完成 |
| `8b078d0` | feat: 全部图标替换为突触/神经元风格 |
| `5c545aa` | feat: M1+M6 初始化 - FastAPI后端骨架 + Expo前端骨架 + 黑白极简UI |
| `975d17b` | Initial commit |

---

*最后更新: 2026-03-28 (Vercel 部署配置完成，M3 多模式对话引擎完成，会话收尾同步)*
