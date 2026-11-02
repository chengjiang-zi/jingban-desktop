# 鲸伴 Beta 发布文案

## 主视频标题

**【开源免费】让大肥鱼住进你的桌面！语音、视觉、记忆一站接入｜鲸伴 Beta**

备用标题：

- 【开源桌宠】我把大肥鱼接上了语音、视觉和记忆，还能连接 DSH！
- 让大肥鱼陪你工作：会聊天、会看图，还能变成敲键盘的小鱼

封面大字：**大肥鱼 / 住进桌面！**；角标：**免费开源**；小字：**Live2D × 语音 × 视觉 × 记忆**、**支持 DSH**。不使用未经证实的“全网首发”。

## 视频简介

我是澄江子。我把 Live2D、语音、视觉和记忆接到了一起，做成了「鲸伴」——让大肥鱼住进桌面，陪你聊天、看你分享的画面，也陪你敲键盘。

我主要做了桌面应用、角色互动、各服务的整合配置、共享记忆接入，以及可选的 DSH 轻量插件。聊天框旁就能切换 API / DSH；角色、语音识别、语音合成和记忆服务也可以按需更换。敲键盘的小鱼模式是我基于 BongoCat 素材修改的。

参考与致谢：鲸语、Open-LLM-VTuber 提供了方向参考；小鱼模式使用 BongoCat 上游资源，长期记忆接入 Mem0。大肥鱼 Live2D 原画及拆分：神宫凉子；建模：霓虹猫_NeonNeko。软件整合与修改由我完成，模型和上游项目的功劳属于各自作者。

演示配置：Breeze-TTS-2 Q8_0 + 本地固定 D 音色「清亮中带柔和」；faster-whisper / Whisper base；Mem0 + BGE-small-zh；DSH 中的 DeepSeek-V4.1-Flash。完整下载链接、音色参数和放置方法见下方文档，D 音色名称不是可直接下载的公共预设。

项目：https://github.com/chengjiang-zi/jingban-desktop
下载：https://github.com/chengjiang-zi/jingban-desktop/releases
模型下载与放置：https://github.com/chengjiang-zi/jingban-desktop/blob/main/docs/MODELS-AND-SETUP.md
演示模型、音色参数：https://github.com/chengjiang-zi/jingban-desktop/blob/main/docs/DEMO-CONFIG.md
我的工作与参考来源：https://github.com/chengjiang-zi/jingban-desktop/blob/main/docs/WORK-AND-CREDITS.md
大肥鱼模型原发布：https://www.bilibili.com/video/BV1KmxY66EZ3/
DSH / MCP / HTTP 接入：https://github.com/chengjiang-zi/jingban-desktop/blob/main/integrations/README.md

本次演示的角色渲染、TTS、ASR 和记忆存储/检索在本地运行；对话、画面理解与记忆整理使用配置的模型服务。切换服务后以你的实际配置为准。

视频中的通话、摄像头和文档场景包含操作动画及虚构内容；角色跟随、触摸、小鱼键鼠反馈使用实际角色渲染。视觉采用手动或逐轮附图，尚不是持续视频理解。

这是 Beta 测试版，模型和服务需自行配置。软件代码免费开源；第三方模型和素材遵循各自许可，外部 API 可能收费。DSH 插件在同一仓库内，自选安装，目前自动桥接文字对话。

作者 / B站：澄江子
澄江子项目交流群（总群）：QQ 881553935

## 置顶评论

下载和完整配置：https://github.com/chengjiang-zi/jingban-desktop

先看 README 里的「完整使用手册」和「模型下载与放置」。这是 Beta，角色和语音模型需要自己准备；视频里的声音参数、资源来源也都列好了。用 DSH 的朋友可以选装同仓库的插件，不用 DSH 就直接接 API。

遇到问题可以带上版本、使用模式和复现步骤提 Issue，截图记得遮住密钥和私人对话。也欢迎来我的项目总群：881553935。

## 后续单功能选题

1. 给大肥鱼换声音：本地 TTS 与固定音色配置。
2. 不想重复填 API？让鲸伴接入 DSH 的完整流程。
3. 桌宠如何记住你：基础记忆、Mem0 与共享记忆的区别。
4. 敲键盘小鱼：角色来源、键位反馈和模型切换。
5. 它真的能看见吗：摄像头、屏幕附图与连续视频的区别。
6. 只录桌宠，不露桌面：宣传素材制作和隐私保护。

## 本轮宣传片

当前预览约 64 秒：角色开口 → 上下左右跟随 → 连续触摸 → 多档大小 → 写作陪伴场景 → 通话操作动画 → 小鱼键鼠反馈 → DSH/API 与记忆 → 下载与演示配置。字幕覆盖在完整画面上，转场留出短暂停顿。模型与音色参数放在简介链接。

跟随、触摸、小鱼键鼠反馈采用模拟输入驱动真实角色渲染；DSH/API 使用实际界面状态截图配合操作动画。通话段标注“操作示意”，摄像头是绘制画面，聊天内容为虚构演示，不作为实际视觉识别结果。

录制范围为角色画布，另使用已检查的鲸伴界面图；不包含桌面、任务栏、DSH 其他会话名称或正文。未发布到 B站。
