# Embedding Endpoint Probe Results (2026-03-30)

本文件仅记录 **状态码与脱敏响应摘要**，不写入任何明文密钥。

### 项目当前 OpenAI 兼容代理 /embeddings

- URL: `https://api.manus.im/api/llm-proxy/v1/embeddings`
- HTTP Status: `404`
- Response Snippet: `{"status":"not found"}`

### 使用项目现有 KEY 直连 OpenAI 官方 /v1/embeddings

- URL: `https://api.openai.com/v1/embeddings`
- HTTP Status: `401`
- Response Snippet: `{ "error": { "message": "Incorrect API key provided: sk-9vkbk*************UofT. You can find your API key at https://platform.openai.com/account/api-keys.", "type": "[REDACTED]", "code": "invalid_api_key", "param": null }, "status": 401 }`

### Hugging Face router 免费推理端点（未带 token）

- URL: `https://router.huggingface.co/hf-inference/models/intfloat/multilingual-e5-large`
- HTTP Status: `401`
- Response Snippet: `<!DOCTYPE html> <html class="" lang="en"> <head> <meta charset="utf-8" /> <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" /> <meta name="description" content="We're on a journey to advance and democratize artificial intelligence through open source and open science." /> <meta property="fb:app_id" content="1321688464574422" /> <meta name="twitter:card" content="summary_large_image" /> <meta name="twitter:site" content="@huggingface" /> <meta property="og:ti`

### Hugging Face 经典 Inference API（未带 token）

- URL: `https://api-inference.huggingface.co/models/intfloat/multilingual-e5-large`
- HTTP Status: `410`
- Response Snippet: `{"error":"https://api-inference.huggingface.co is no longer supported. Please use https://router.huggingface.co instead."}`

