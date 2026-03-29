# Hugging Face 零付费语义记忆落地结论

## 结论摘要

当前项目无法直接使用 Hugging Face 托管 embeddings 接口作为匿名免费后端：

- `https://api-inference.huggingface.co/...` 已返回 **410**，官方要求迁移到 `router.huggingface.co`。
- `https://router.huggingface.co/hf-inference/models/...` 在无 token 情况下返回 **401**，因此不能作为当前项目的零配置生产 embeddings 远端。

但通过 `fastembed` 直接下载并运行 Hugging Face / Qdrant 兼容 ONNX 模型是可行的，属于**零额外付费**方案。

## 实测结果

- `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`：可正常下载并生成向量，维度 **384**。
- `BAAI/bge-small-en-v1.5`：可正常下载并生成向量，维度 **384**，但英文偏向，不适合作为中英混合主方案。
- `intfloat/multilingual-e5-small`：当前 `fastembed` 的 `TextEmbedding` 不支持该模型。

## 对当前项目的直接影响

当前数据库 pgvector 维度仍为 **1536**。为避免立即做破坏性迁移，可以采用以下最小改造策略：

1. 将 `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` 作为默认免费语义 embedding 模型；
2. 生成 384 维真实语义向量后，在服务层统一补零到 `PGVECTOR_DIMENSION`（当前为 1536）；
3. 记忆检索和 RAG 查询都走同一套语义 embedding 服务；
4. 仅在本地模型初始化失败时，再回退到哈希向量，而不是把哈希向量作为主路径。

## 决策

本轮 Synapse V2.5 升级应采用：

> **Hugging Face 本地 ONNX embedding 模型 + fastembed 运行时 + 向量补零兼容现有 pgvector 维度**

这能在不增加用户付费成本的前提下，把当前“哈希回退检索”升级为真正的语义检索。
