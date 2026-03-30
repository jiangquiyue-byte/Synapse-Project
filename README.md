<div align="center">
  <img src="mobile/assets/icon.png" width="120" alt="Synapse Logo" />
  <h1>Synapse</h1>
  <p><strong>突触 · 连接智慧，协同思考</strong></p>
  <p>商业级多智能体群聊协作平台</p>
</div>

---

## 📖 项目简介

**Synapse** 是一款基于 **React Native (Expo)** 和 **FastAPI** 构建的商业级多智能体群聊 App。它打破了传统“单对单”的 AI 对话模式，允许用户在一个群聊界面中同时与多个不同领域的 AI Agent 协作。

通过后端的 **LangGraph** 编排引擎，Synapse 支持顺序发言、自由辩论、投票表决和指定发言等多种讨论模式。系统内置了“AI 名人堂”身份生态、精准的双币计费引擎、语义记忆知识库以及实时性能看板，是一个从 Demo 走向生产环境的完整解决方案。

---

## ✨ 核心功能指南

### 1. 多 Agent 协作与群聊 UI
- **@ 提及系统**：在输入框输入 `@` 即可唤出 Agent 选择面板，实现单会话内多专家协作。
- **群聊布局**：左侧展示 AI 官方 SVG 图标（如 GPT-4o、Claude、DeepSeek 等），右侧展示用户自定义头像，还原真实的群聊体验。
- **多模式讨论**：支持 Agent 之间的自由辩论或按顺序发言，适合头脑风暴和复杂问题拆解。

### 2. AI 名人堂身份生态
- **官方头像映射**：系统自动为前 20 名主流模型（基于 LMSYS Chatbot Arena 排名）映射高清官方 SVG 头像。
- **强制用户身份**：新用户首次进入必须设置“昵称 + 头像颜色”，确保多端同步时的身份一致性。

### 3. 精准双币计费引擎 (Financial Engine)
- **多模型计费算法**：后端严格区分各家模型 Prompt 与 Completion 的不同权重（如 1:3 或 1:4 计费逻辑）。
- **实时双币显示**：按实时汇率在所有统计界面同步显示消耗的 **$ (USD)** 和 **¥ (CNY)**。
- **账单颗粒度**：每条消息在数据库中精确记录其生成的 Token 成本。

### 4. 语义记忆与 RAG 知识库
- **Hugging Face 语义检索**：接入 `hf-local-fastembed`，确保真实的向量化语义检索，而非简单的哈希回退。
- **知识库管理**：支持上传文档，并在聊天时通过开关关联检索，让 Agent 拥有长期记忆和专属知识。

### 5. 实时进度与性能看板 (Heartbeat Dashboard)
- **可视化看板**：在“设置”页实时展示项目进度、累计 Token 消耗、双币账单总额。
- **技术指标监控**：展示实时响应延迟 (ms) 与当前激活的 Embedding 后端状态。

---

## 🌐 2025-2026 全球 AI API 接口选型指南

Synapse 支持接入国内外多种主流大模型 API。以下是截至 2026 年初，支持**联网搜索**及具备高性价比的 API 推荐列表，供开发者配置 `.env` 时参考。

### 🇨🇳 国内大模型 API (适合中文语境与国内网络)

| 模型提供商 | 推荐模型版本 | 联网搜索能力 | 价格 (输入/输出 每百万 Token) | 免费额度 / 优势 |
|-----------|-------------|-------------|---------------------------|----------------|
| **DeepSeek (深度求索)** | DeepSeek-V3 / R1 | 支持 (需配合工具) | V3: ¥1.0 / ¥2.0<br>R1: ¥4.0 / ¥16.0 | **性价比之王**。V3 缓存命中低至 ¥0.1/1M，代码与逻辑能力顶尖。 |
| **通义千问 (阿里云)** | qwen-max / qwen-plus | **原生内置** | Plus: ¥0.8 / ¥2.4<br>Max: ¥2.4 / ¥9.6 | 阿里云百炼平台提供 **100万 Token 永久免费**。中文理解极佳。 |
| **智谱清言 (GLM)** | GLM-4-Plus / Flash | **原生内置** | Flash: **免费**<br>Plus: ¥5.0 / ¥5.0 | GLM-4-Flash 完全免费，支持长文本与联网。Plus 版本意图识别强。 |
| **豆包 (字节跳动)** | doubao-pro-128k | **原生内置** | Pro: ¥0.8 / ¥2.0 | 火山引擎提供每日 **200万 Token 免费**。联网搜索速度极快。 |
| **文心一言 (百度)** | ERNIE-4.0-8K | **原生内置** | 4.0: ¥30.0 / ¥90.0 | 百度千帆平台，内置强大的百度搜索 Grounding 能力。 |
| **腾讯混元** | hunyuan-lite | 支持 | Lite: **免费** | 腾讯云提供 Hunyuan-Lite 完全免费（有效期1年），适合轻量任务。 |

### 🌍 国际大模型 API (适合代码生成与复杂推理)

| 模型提供商 | 推荐模型版本 | 联网搜索能力 | 价格 (输入/输出 每百万 Token) | 核心优势 |
|-----------|-------------|-------------|---------------------------|---------|
| **OpenAI** | GPT-4o / GPT-4.5 | **原生内置** (Search Preview) | 4o: $2.50 / $10.00<br>Search: +$10/1k次 | 综合能力最强。最新的 Search Preview 模型提供极高质量的网页总结。 |
| **Anthropic** | Claude 3.5 Sonnet | 支持 (需配合工具) | $3.00 / $15.00 | **编程之神**。代码生成与长文本（200K）处理能力目前业界第一。 |
| **Google** | Gemini 2.5 Pro / Flash | **原生内置** (Google Search) | Pro: $1.25 / $10.00<br>Flash: $0.075 / $0.30 | 免费层提供高频调用。内置 Google Search Grounding（$35/1k次请求）。 |
| **Grok (xAI)** | Grok 2 / 3 | **原生内置** (X 平台数据) | 动态定价 | 拥有 X (Twitter) 实时数据独家访问权，适合追踪突发新闻。 |

> **💡 Synapse 配置建议**：
> 1. **日常对话与搜索**：推荐配置 `qwen-plus` 或 `doubao-pro`，速度快且自带联网，成本极低。
> 2. **代码与复杂逻辑**：推荐配置 `Claude 3.5 Sonnet` 或 `DeepSeek-V3`。
> 3. **多 Agent 辩论**：可同时配置 GPT-4o（正方）、Claude（反方）和 DeepSeek（裁判），利用 Synapse 的群聊功能观察顶级 AI 的思维碰撞。

---

## 🛠️ 技术架构与部署

### 技术栈
- **前端**：React Native + Expo SDK 55 + TypeScript + Zustand + TailwindCSS
- **后端**：FastAPI + Python 3.11 + LangGraph + PostgreSQL (pgvector)
- **通信**：SSE (Server-Sent Events) 实时流式输出

### 本地开发指南

**1. 克隆仓库**
```bash
git clone https://github.com/jiangquiyue-byte/Synapse-Project.git
cd Synapse-Project
```

**2. 后端启动 (FastAPI)**
```bash
cd backend
pip install -r requirements.txt
# 配置 .env 文件填入 API Keys
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**3. 前端启动 (Expo)**
```bash
cd mobile
npm install -g pnpm
pnpm install
npx expo start
```
在手机上下载 **Expo Go** App，扫描终端中的二维码即可预览。

### 生产环境部署
- **后端**：已配置 `vercel.json`，支持一键部署至 Vercel（Serverless 架构）。
- **前端**：已配置 `eas.json`，支持通过 Expo EAS Build 云端打包生成 Android APK 和 iOS IPA。

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源许可证。
