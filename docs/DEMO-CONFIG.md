# 演示模型、音色参数与下载入口

> 2026-11-02 分发范围更新：维护者已决定公开小鱼修改皮肤，源码中的 `bundled-models/DaFeiYu/` 含完整模型及来源说明，新构建将默认选择它；旧版 v0.2.0-beta.1 EXE 不因此自动更新。Live2D Core 仍需自行取得并在设置中选择；D 音色和语音权重仍不提供。历史版本的发布范围以对应版本说明为准。

作者：澄江子。以下为 2026-11-01 本机演示组合，参数从当前配置与实际调用代码核对；不是所有电脑的推荐配置，也不是重现完全相同声音的保证。

| 部分 | 演示使用 | 来源 / 下载 |
|---|---|---|
| 普通 Live2D | 大肥鱼；原画及拆分神宫凉子，建模霓虹猫_NeonNeko | [原作者发布页](https://www.bilibili.com/video/BV1KmxY66EZ3/) |
| Live2D Core | Cubism SDK for Web 的 Core | [Live2D 官方下载](https://www.live2d.com/en/sdk/download/web/) |
| 敲键盘小鱼基础模型 | BongoCat keyboard；桌面/鼠标来自 standard | [上游模型目录](https://github.com/ayangweb/BongoCat/tree/47a73ed1765b13fdd674ec356d51b5b16a6b5a5b/resources/models) |
| 本地语音运行时 | Breeze-TTS-2.cpp，Windows x64 Vulkan v0.1.3 | [运行时下载](https://github.com/HoppouAI/Breeze-TTS-2.cpp/releases/tag/v0.1.3) |
| 本地语音权重 | breeze-tts-2-q8_0.gguf，Q8_0 | [GGUF 下载](https://huggingface.co/HoppouAI/Breeze-TTS-2.cpp/tree/main) · [原模型与许可](https://huggingface.co/BreezeBlue/Breeze-TTS-2) |
| 本地识别 | faster-whisper 1.2.1，Whisper base，CPU int8 | [引擎](https://github.com/SYSTRAN/faster-whisper) · [完整权重](https://huggingface.co/Systran/faster-whisper-base/tree/main) |
| 记忆引擎 | Mem0 OSS Node SDK 3.3.1，SQLite | [Mem0](https://github.com/mem0ai/mem0) |
| 本地检索模型 | bge-small-zh-v1.5，ONNX 量化 | [ONNX 文件](https://huggingface.co/Xenova/bge-small-zh-v1.5/tree/main) · [原模型](https://huggingface.co/BAAI/bge-small-zh-v1.5) |
| 直接 API 对话 | 本机填写的模型 ID 为 deepseek-flash，启用图片能力选项 | [DeepSeek 开放平台](https://platform.deepseek.com/)；实际可用 ID 与图片能力以自己的服务提供方为准 |
| DSH 对话 | 本机 DSH 0.2.1-rc.5；界面显示 DeepSeek-V4.1-Flash / 1017 / Low | [DSH 官方仓库](https://github.com/deepseek-ai/deepseek-harness)；由 DSH 的会话配置选择，不由鲸伴再配置 Key |

模型文件怎么摆放、如何启动服务，见 [安装配置指南](MODELS-AND-SETUP.md)。链接指向原作者或上游，不是鲸伴重新上传的模型镜像。

## D 音色：清亮中带柔和

- 本机音色 ID：`jingyu_bright_soft_d_v1`。这是保存后的本机标识，不是公共预设或下载链接。
- 声音方向：灵动俏皮的少女声，轻快、有精神，清亮中带柔和，少一些播音腔。
- 播报指令：`用轻快、自然、略带俏皮的语气说普通话，声音清亮而柔和，像和熟悉的朋友聊天，不要播音腔，不要夸张卖萌。`
- 合成请求 seed：`73`；`cfg_scale=1`；输出 `PCM16`、单声道、`24000 Hz`。
- 播放：边生成边播放，也可在界面切换成整句生成后播放。
- 保存音色的参考文本：`嘿，你来啦！今天想做点什么？要不要和我一起，试试那个有趣的新点子？`
- 参考文本用于校验已保存音色；单独复制文字、seed 或 ID 并不能还原参考音频及声纹。原始音色设计过程未完整固化为可复现配置，不伪造缺失参数。

请先在 [Breeze 的音色功能](https://github.com/HoppouAI/Breeze-TTS-2.cpp/blob/main/docs/voices.md) 中生成、试听并保存自己的声音，再把真实 ID 填入鲸伴。D 音色没有公开下载地址；本项目不分发其参考音频或声音文件。

## 哪些在本地、哪些会联网

本次配置中，角色渲染、语音识别、语音合成、SQLite 记忆存储与 BGE 向量检索在本机执行。首次下载依赖/模型需要网络；对话和 Mem0 的事实整理调用配置好的大模型服务。当前画面只有主动附加或开启逐次附图后才随消息发送。DSH 模式的数据处理还受 DSH 自身模型及插件设置影响。

可以替换 TTS、ASR、LLM、Embedding 接口。改用云端语音或检索服务后，相应文本、声音或检索内容会交给该服务，不能泛称所有配置都离线。

## 敲键盘小鱼的修改关系

这是基于 BongoCat 资源的外观与显示适配，不是完全原创建模。保留原骨架与动作，修改主贴图、眼位、桌面遮挡与鼠标场景，并接入鲸伴的键鼠反馈。精确提交、目录、许可和修改范围见 [第三方说明](../THIRD_PARTY_NOTICES.md)。小鱼完整修改包现放在 `bundled-models/DaFeiYu/`，随新构建提供；普通大肥鱼模型仍由用户自备；应用图标的来源边界单独说明。

软件代码开源免费，外部 API 可能收费。Breeze 当前权重为研究及非商用许可；各模型、角色及声音按各自条款使用，代码 MIT 不覆盖它们。
