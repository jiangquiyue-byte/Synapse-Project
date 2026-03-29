# Synapse V2.5 交付说明

本次已按你的要求完成 **方案 A** 的核心落地，并把移动端默认后端切到当前可访问的本地公开实例，便于你直接验证 **不用 OpenRouter 充值也能跑通的语义记忆**。

| 交付项 | 状态 | 说明 |
|---|---:|---|
| 免费语义记忆 | 已完成 | 后端语义搜索已走免费 Hugging Face 路径，并在无远程 token 时自动回退到本地 FastEmbed，避免再落回纯哈希检索。 |
| 官方工作流模板 | 已完成 | 已补齐 **深度研报**、**多专家圆桌**、**代码审计** 三个官方模板，并验证一键套用接口可用。 |
| 搜索结果卡片化 | 已完成 | 记忆中心已升级为卡片式召回结果，展示会话、角色、时间与相似度信息。 |
| 导出格式弹窗 | 已完成 | 聊天页导出入口已升级为格式选择弹窗，支持 Markdown / PDF / JSON。 |
| 纯 SVG 视觉补齐 | 已完成 | 补充并统一了导出与记忆结果所需的纯 SVG 图标资产。 |
| Expo 预览 | 已启动 | 已启动临时预览与公开后端，链接见下方。 |

当前可用的临时预览地址如下。

| 类型 | 链接 | 用途 |
|---|---|---|
| 浏览器预览 | https://8088-ixafhd05b8x5b0if7w98b-36b18062.sg1.manus.computer | 直接在浏览器打开查看当前 Expo Web 预览。 |
| Expo Go 设备预览 | exp://bztcbn0-anonymous-8088.exp.direct | 在手机 Expo Go 中打开移动端预览。 |
| 当前公开后端 | https://8006-ixafhd05b8x5b0if7w98b-36b18062.sg1.manus.computer | 预览默认连接的后端实例。 |

这次联调中，语义记忆返回了明确的后端标签：

> `hf-local-fastembed:sentence-transformers/all-MiniLM-L6-v2`

这说明当前环境下已经不是之前的哈希回退，而是 **真实语义向量召回**。同时，工作流模板接口与三套模板的一键套用均已通过本地联调验证。

| 已验证接口 | 结果 |
|---|---|
| `/api/memory/search` | 返回 200，并带有 `backend_label` 与语义召回结果。 |
| `/api/memory/context` | 返回 200，并正确生成记忆注入上下文。 |
| `/api/workflows/templates` | 返回 200，并包含官方模板集合。 |
| `/api/workflows/templates/official_deep_research/apply` | 返回 200。 |
| `/api/workflows/templates/official_expert_roundtable/apply` | 返回 200。 |
| `/api/workflows/templates/official_code_audit/apply` | 返回 200。 |
| 导出 Markdown / JSON | 返回 200。 |

需要说明的是，这些预览与公开地址基于当前临时运行环境，**在沙箱结束后会失效**。如果你下一步要我继续，我建议直接做两件事：第一，把当前版本提交到代码仓库；第二，把移动端默认后端地址改成你自己的长期部署域名，这样你后面就能持续使用，而不是依赖临时隧道。
