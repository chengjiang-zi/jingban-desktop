# 项目工作、参考与致谢

返回 [首页](../README.md) · [完整使用手册](USER-GUIDE.md) · [演示模型与参数](DEMO-CONFIG.md)

鲸伴的作者 / 维护者有且仅有 **澄江子**。以下上游项目与模型作者是来源和致谢，不是鲸伴的联合开发者。

## 这个项目做的是什么

鲸伴的工作是把已有角色渲染、语音、识别、记忆和智能体能力接入同一个 Windows 桌面应用，并实现可配置、可切换的使用流程。它不是训练一个新的大模型，也不是从零发明 Live2D、语音合成或记忆算法。

| 本项目的工作 | 具体内容 | 边界 |
|---|---|---|
| 桌面应用 | 主操作界面、透明角色窗口、悬浮球、托盘、显示开关和窗口位置管理 | 基于 Electron 等组件 |
| 角色管理与互动 | 模型库、导入切换、四档取景、整体缩放、眼睛和头部跟随、触摸与连续点击反馈 | 模型骨架、贴图与基础动作来自用户提供的角色包 |
| 语音交互整合 | 固定音色配置、流式 / 整句播放、音量嘴型、emoji 过滤、停止与新输入打断 | TTS / ASR 模型来自上游；非音素级口型、非端到端全双工 |
| 画面输入 | 摄像头与屏幕预览、主动附图和逐轮附图 | 模型负责理解图片；不等于持续视频理解 |
| 记忆管理 | 基础记忆、Mem0 接入、检索设置、管理面板、导入导出与迁移 | 使用 Mem0 原库，不称为自研记忆算法 |
| 外部接入 | 本机 HTTP 协议、MCP 桥接、DSH 轻量插件、主对话路由、多对话确认绑定与共享记忆 | DSH 负责其会话与模型调用；插件当前自动桥接文字 |
| 小鱼模式 | 贴图修改与场景适配，眼位、桌沿遮挡、独立鼠标与键位反馈 | 基于 BongoCat 资源保留原骨架，不是原创重绑定 |
| 发布与配置体验 | Windows Beta 打包、可选插件包、首次启动说明、配置指南、验证记录 | 仍需用户准备模型和服务，并非所有配置开箱即用 |

## 参考、使用与调研的区别

| 项目 | 与鲸伴的关系 |
|---|---|
| [鲸语 jingyu-live2d-agent](https://github.com/InariNGT-Ofiicial/jingyu-live2d-agent) | 参考角色资源入口和使用说明组织方式；旧环境用于功能验证。鲸伴自己的入口、桌面界面和协议适配另行实现 |
| [Open-LLM-VTuber](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber) | 参考语音、视觉和虚拟角色结合的产品方向；不把此类能力称为首创 |
| [BongoCat](https://github.com/ayangweb/BongoCat) | 实际使用其模型素材制作本机小鱼试验皮肤，并实现鲸伴侧输入反馈与渲染适配 |
| [Mem0](https://github.com/mem0ai/mem0) | 实际使用开源 SDK 实现可选长期记忆，不使用“自研记忆算法”的表述 |
| [DeepSeek Harness / DSH](https://github.com/deepseek-ai/deepseek-harness) | 按其官方插件及 Agent API 实现轻量连接器；插件随鲸伴仓库提供、可选安装 |
| [AIRI](https://github.com/moeru-ai/airi)、[dsh-whale-girl-live2d](https://github.com/Andersen216/dsh-whale-girl-live2d) | 同类能力调研，不据此声称使用了它们的代码 |

渲染依赖 Electron、PixiJS、pixi-live2d-display、Live2D Cubism Core；本地语音与识别使用 Breeze-TTS-2.cpp、Breeze-TTS-2、faster-whisper / Whisper。记忆检索涉及 Transformers.js、SQLite 和 BGE。准确版本、具体上游提交及许可记录见 [第三方说明](../THIRD_PARTY_NOTICES.md)。

## 大肥鱼与小鱼的来源

普通大肥鱼 Live2D：原画及拆分 **神宫凉子**，建模 **霓虹猫_NeonNeko**，[原作者发布入口](https://www.bilibili.com/video/BV1KmxY66EZ3/)。下载与使用须遵循原作者说明。

敲键盘小鱼：**澄江子基于 BongoCat 素材修改**。基础为上游 keyboard 模型；桌沿、鼠标图集来自 standard。以提供的卡通头像为参考，用图片生成工具辅助修改贴图，再做鲸伴侧的眼位、遮挡和鼠标场景调整，保留原骨架和手部动作。并非完整复制 BongoCat 应用，也不是全新建模。

小鱼的 `companion-scene.json` 是鲸伴扩展，BongoCat 本体不会读取；不能保证把该皮肤导入 BongoCat 后得到相同显示效果。公开仓库和程序包不捆绑本机试验皮肤，完整修改关系见 [第三方说明](../THIRD_PARTY_NOTICES.md#小鱼敲键盘角色的具体来源与修改)。

卡通应用图标按维护者要求随仓库提供，但原图作者来源仍有待补充；不冒认为 Live2D 原画作者的作品，不纳入代码 MIT。见 [图标说明](../web/assets/README.md)。

## 宣传时怎样描述

可以说：**“我把角色、语音、视觉、记忆和外部助手接入整合成了一个桌面应用，还做了可选 DSH 插件和基于 BongoCat 修改的小鱼模式。”**

不要说“全部自研”“模型由我原创”“首个实现全部功能”“全部本地离线”或“所有素材可商用”。软件代码的开源许可不改变上游模型、角色和声音的使用条件。演示采用什么配置、什么在本地，见 [演示配置](DEMO-CONFIG.md)。
