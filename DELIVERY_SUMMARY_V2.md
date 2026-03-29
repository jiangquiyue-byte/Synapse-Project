# Synapse 视觉全重构与 UI 代码化净化 V2 交付摘要

本次已按要求优先从 **SynapsePulse** 的纯 SVG Logo 动画开始落地，并完成当前阶段的核心重构。

## 已完成内容

| 模块 | 完成情况 | 说明 |
|---|---:|---|
| 项目接管 | 已完成 | 已接管 GitHub 仓库，并基于 **Expo SDK 54** 持续修改，未做降级。 |
| 设计参考分析 | 已完成 | 已读取 `Synapse_终极执行蓝图_v2.docx`，并参考指定 SVG 动画风格进行代码实现。 |
| SynapsePulse Logo 动画 | 已完成 | 已实现纯黑线条风格的 `react-native-svg` 组件，中间小黑点支持上下往复脉冲运动。 |
| 全站功能图标去图片化 | 已完成 | 运行时功能性图标已全部替换为纯代码 SVG，相关 PNG 功能图标已删除。 |
| 输入框交互重构 | 已完成 | 已将输入框左侧重构为 Gemini 风格：整合上传按钮与模式切换按钮，并全部改为 1px 级纯 SVG 线性图标。 |
| DeepSeek / custom_openai 连接修复 | 已完成 | 已修复后端 `custom_openai` 链路，避免错误回退到系统 OpenAI Key，并兼容前端掩码 API Key 的对话场景。 |
| 类型检查 | 已完成 | 前端 `npx tsc --noEmit` 已通过。 |
| 预览服务 | 已完成 | 已启动最新 Expo tunnel 预览。 |

## 最新 Expo tunnel 预览链接

> `exp://bztcbn0-anonymous-8081.exp.direct`

如果你使用 Expo Go，可直接通过该链接或终端中的二维码进行预览。

## 关键改动文件

| 文件 | 作用 |
|---|---|
| `mobile/components/SynapsePulse.tsx` | 新增品牌 Logo 动画组件，统一 Loading 图标。 |
| `mobile/components/SynapseIcons.tsx` | 新增全站纯代码 SVG 图标库。 |
| `mobile/app/(tabs)/index.tsx` | 聊天页输入栏重构、发送图标替换、空状态替换、Loading 接入 SynapsePulse。 |
| `mobile/app/(tabs)/agents.tsx` | 成员页空状态图标去图片化。 |
| `mobile/app/(tabs)/_layout.tsx` | 底部 Tab 图标全部替换为纯代码 SVG。 |
| `backend/app/routers/chat.py` | 修复 inline agents 与掩码密钥回退逻辑。 |
| `backend/app/services/agent_factory.py` | 修复 custom_openai / DeepSeek API Key 与 Base URL 解析逻辑。 |

## 已删除的功能性位图图标

以下运行时功能性图标已删除，不再参与界面渲染：

- `mobile/assets/icons/add-neuron.png`
- `mobile/assets/icons/empty-agents.png`
- `mobile/assets/icons/mode-debate.png`
- `mobile/assets/icons/mode-sequential.png`
- `mobile/assets/icons/mode-single.png`
- `mobile/assets/icons/mode-vote.png`
- `mobile/assets/icons/send-pulse.png`
- `mobile/assets/icons/tab-agents.png`
- `mobile/assets/icons/tab-chat.png`
- `mobile/assets/icons/tab-settings.png`

## 验证结论

| 验证项 | 结果 |
|---|---:|
| 运行时位图图标引用扫描 | 通过 |
| TypeScript 编译检查 | 通过 |
| custom_openai 对话链路 | 通过 |
| 掩码密钥场景回归 | 通过 |

## 说明

保留的 `mobile/assets/icon.png`、`mobile/assets/splash-icon.png`、Android 图标与 favicon 属于应用安装包 / 平台清单资源，不属于运行时功能性按钮图标，因此未纳入本次“去图片化”删除范围。
