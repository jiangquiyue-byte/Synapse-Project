# Embedding Provider Findings (2026-03-30)

## DeepSeek 官方文档核验

已检查页面：

| 来源 | URL | 当前观察 |
| --- | --- | --- |
| DeepSeek API Docs - Your First API Call | https://api-docs.deepseek.com/ | 官方快速开始仅展示 `chat/completions` 调用，页面内未检索到 `embed` 相关内容。 |
| DeepSeek API Docs - Lists Models | https://api-docs.deepseek.com/api/list-models | 官方模型列表文档当前可见信息未显示任何 embedding 模型，需继续用 API 实测或查看其他来源交叉验证。 |

## 暂时结论

基于当前官方文档可见内容，**DeepSeek 至少没有在公开快速开始与模型列表页面中明确提供 embeddings 端点或 embedding 模型说明**。这与此前线上实测 `/v1/embeddings` 返回 404 的现象一致，但仍需继续交叉核验：

1. 是否存在未公开在首页导航中的专用 embeddings 文档；
2. 是否可通过模型列表 API 实测发现 embedding 模型；
3. 是否应优先切换到 Hugging Face Inference 或其他 OpenAI 兼容 embedding 提供商。

## OpenRouter 官方文档核验

已检查页面：

| 来源 | URL | 当前观察 |
| --- | --- | --- |
| OpenRouter Docs - Embeddings API | https://openrouter.ai/docs/api/reference/embeddings | 官方文档明确提供统一 embeddings API，页面可见示例模型包含 `openai/text-embedding-3-small`，并说明可通过统一接口访问多家 embedding 模型。 |

## 更新后的判断

基于当前官方文档可见内容，**OpenRouter 明确支持 embeddings**，并且接口形态与 OpenAI 兼容，较适合作为当前 `langchain_openai.OpenAIEmbeddings` 的上游后端候选。下一步应继续核验：

1. 现有项目是否已有可用的 OpenRouter key 或兼容 base URL；
2. 若无，可否采用 Hugging Face 免费 feature-extraction/inference 方案作为默认远程 embedding 后端；
3. 需要在代码中引入独立的 embedding provider 配置，而不是继续复用聊天模型的 base URL。
