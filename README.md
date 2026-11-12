# 鲸伴 · 桌面数字人（Beta）

> 2026-11-02 分发范围更新：维护者已决定公开小鱼修改皮肤，源码中的 `bundled-models/DaFeiYu/` 含完整模型及来源说明，新构建将默认选择它；旧版 v0.2.0-beta.1 EXE 不因此自动更新。Live2D Core 仍需自行取得并在设置中选择；D 音色和语音权重仍不提供。历史版本的发布范围以对应版本说明为准。

**让大肥鱼住进你的桌面。语音、视觉、记忆与桌面互动，一站接入。**

鲸伴是澄江子制作的 Windows 桌面伙伴：平时做桌宠，聊天时可以开口回应，也能切换成陪你敲键盘的小鱼。角色、声音、语音识别和对话服务可分别配置；可以直接接 API，也可以安装可选 DSH 插件，让已有助手通过鲸伴与桌面互动。

[下载 Windows Beta（内置小鱼）](https://github.com/chengjiang-zi/jingban-desktop/releases/download/v0.2.2-beta.1/jingban-0.2.2-beta.1-windows-x64.exe) · [完整使用手册](docs/USER-GUIDE.md) · [模型下载与放置](docs/MODELS-AND-SETUP.md) · [DSH 插件](integrations/dsh-plugin/README.md)

**0.2.2-beta.1 · Beta 测试版，非正式版本 · 源码与 Windows 体验包。** 目前仅支持 Windows；macOS 和 Linux 暂不支持。内置小鱼模型；首次使用仍需自行配置 Cubism Core 和所需服务，不是开箱即用的完整视频通话产品。公开仓库包含小鱼模型、大肥鱼卡通应用图标及通用备用图标，不包含普通大肥鱼角色模型、声音权重或 Cubism Core。图标素材不纳入代码 MIT，见 [素材说明](web/assets/README.md)。

作者：**澄江子** · B站：**澄江子**。软件代码完全开源免费，采用 MIT 许可；第三方素材与服务不因此改变许可或变成免费服务。

## 我做了哪些工作

这是整合与产品化实践：桌面窗口与悬浮球、设置和角色库、语音播放与打断、画面输入、记忆管理、可替换服务的适配，以及 DSH / MCP / HTTP 接入。敲键盘小鱼由澄江子基于 BongoCat 模型素材修改，并加入鲸伴侧的眼位、桌沿、鼠标场景与键位反馈适配；保留上游骨架，不是从零制作的新 Live2D 模型。

不把 Live2D 角色、TTS / ASR 模型、Mem0 算法或第三方组件称为自研。具体工作、借鉴关系与致谢见 **[项目工作与来源](docs/WORK-AND-CREDITS.md)**。

## 先看哪份文档

**希望让 DSH 帮你配置到接近视频的效果？** 先读 [演示复现与 DSH 配置入口](docs/REPRODUCE-DEMO.md)，其中有资源位置、实际填写值、可复制的配置请求和逐项验收步骤。小鱼修改皮肤已公开，D 音色文件未公开，不能承诺声音原样复现。

| 你想做什么 | 文档 |
|---|---|
| 下载后从头配置、学会日常操作 | [完整使用手册](docs/USER-GUIDE.md) |
| 找模型、放文件、启动声音和识别服务 | [模型配置指南](docs/MODELS-AND-SETUP.md) |
| 找视频里的角色、声音、模型及参数 | [演示配置与资源链接](docs/DEMO-CONFIG.md) |
| 安装 DSH 插件、绑定主对话和共享记忆 | [DSH 插件说明](integrations/dsh-plugin/README.md) |
| 不装插件，用自己的智能体调用 | [MCP / HTTP 接入](integrations/README.md) |
| 了解实现工作、参考项目和素材来源 | [项目工作与来源](docs/WORK-AND-CREDITS.md)、[第三方说明](THIRD_PARTY_NOTICES.md) |
| 查看已测范围与现有限制 | [验证记录](docs/VALIDATION.md) |

## 模型与演示资源

**Windows 下载**：[鲸伴 Beta（内置小鱼）](https://github.com/chengjiang-zi/jingban-desktop/releases/download/v0.2.2-beta.1/jingban-0.2.2-beta.1-windows-x64.exe)。首次仍需按下方指南取得并选择 Cubism Core，语音与对话服务另配。

首次使用：在 [Live2D 官方页面](https://www.live2d.com/en/sdk/download/web/) 按官方许可取得 Cubism SDK for Web，解压后打开鲸伴的“连接设置”，选择 `Core/live2dcubismcore.min.js`，再点击“重载角色”。小鱼模型已内置，不必重复导入。语音和对话功能需要另行配置。

**小鱼触摸反馈（测试版）**：在“设置 → 桌宠与互动”中开启，默认关闭。开启后轻触小鱼会触发轻拍和星星反馈；小鱼不使用大肥鱼的触摸台词，键盘与鼠标亮键反馈仍可单独控制。

第一次使用请先看 **[模型放哪里 · 新用户配置指南](docs/MODELS-AND-SETUP.md)**：包含目录结构、角色作者入口、Live2D 官方下载、本地 Breeze 运行时及权重、固定音色创建、Whisper 安装和 Mem0 检索准备。

本机演示组合：**大肥鱼 Live2D / BongoCat 小鱼改版、Breeze-TTS-2 Q8_0（本机 D 音色）、Whisper base、Mem0 OSS + BGE 中文检索、DSH 中配置的 DeepSeek-V4.1-Flash**。具体模型 ID、资源链接和配置边界见 [演示配置](docs/DEMO-CONFIG.md)。

宣传片包含虚构文档、绘制摄像头与 UI 场景动画，不是自动操作 Word 或实时识别摄像头内容的实录。模型跟随、触摸、大小切换和小鱼反馈使用实际角色渲染。

## 已有功能

- 透明置顶桌宠与悬浮球，分别显示/隐藏；拖动、四档取景、整体缩放、聊天气泡、托盘恢复。
- 主界面和悬浮球均可导入、切换 Live2D / BongoCat 角色，保留角色库和当前选择。
- BongoCat 敲击互动；有对应素材的键帽按下亮起、松开淡出，鼠标左右键分别反馈，设置中可关闭。
- 首次启动说明、Beta 标识和开发者名单。
- 眼睛与头部跟随鼠标；六种触摸反馈及连续点击彩蛋。
- 主界面右上角「✧」可预览动作。开启「设置 → 桌宠与互动 → 允许 AI 控制角色动作」后，在对话里说「先歪头，再眨眼，最后点两下头」即可尝试。直连 API 自动加入动作说明，DSH 模式需安装新版插件并绑定会话。动作范围取决于角色模型。
- 文本聊天、语音识别、持续聆听；新文字或识别完成的新语音可以中断上一条回复，通话中仍可打字。
- 流式生成播放 / 整句播放切换；音频振幅驱动嘴型，朗读过滤 emoji。
- 摄像头和屏幕预览，主动附图或每次对话附加最新一帧。**不是持续视频流理解**，需要支持图像输入的模型。
- 基础记忆、可选 Mem0 长期记忆，支持查看、编辑、删除、导入、导出和迁移。
- 0–100 了解度：按当前去重记忆估算，明确维护的信息权重较高；不因点击刷分、不因离线扣分。设置中可隐藏，不删除记忆，也不代表准确率。
- 直接连接模型 API，或通过 HTTP / MCP 让外部智能体控制桌宠。外部模式由接入方管理记忆，了解度不擅自估分。

## Beta 范围

这是可体验的早期 Beta，不是稳定正式版。Windows 桌面版已测试；仍可能遇到模型适配、音频设备与不同 API 服务兼容问题。反馈请附复现步骤、版本号与脱敏日志，不要提交 API Key、记忆库或完整录音。

BongoCat 全局输入检测仅用于即时动作和键位反馈；键位名称短暂存在本机进程内存，经本机 IPC 发给角色窗口，不写入日志、记忆或网络接口。关闭按键反馈后只传递左右手/鼠标按钮状态。使用按键素材时只显示其中的高亮部分，不覆盖角色外观。无对应素材的键位不凭空标亮。

## 从源码运行

Windows 10/11，安装 **Node.js 24+、Python 3 和 Git**，并加入 PATH。首次安装需要联网下载依赖。

```powershell
git clone https://github.com/chengjiang-zi/jingban-desktop.git
cd jingban-desktop
npm ci --ignore-scripts
npm run setup
npm start
```

`setup` 安装桌面运行时并验证数据库预编译文件，避免安装工具误触发本机源码编译。

启动后到“连接设置”：

1. 选择自行取得使用许可的 Live2D `.model3.json` 和 Cubism Core JavaScript 文件。模型旁的贴图、动作等文件应保持原目录结构。
2. 填入对话服务地址、实际模型 ID 和 API Key。地址应包含服务需要的版本前缀（如 `/v1`），不要填完整 `/chat/completions` 路径。只有模型确实支持图像时才启用图片理解。
3. 选择 Breeze 或兼容语音接口，填写实际音色；示例音色 ID 不会自动提供对应声音。兼容 TTS 需返回所选采样率的 PCM16 单声道音频。
4. 可选配置语音识别 API；使用本地 Whisper 时先运行 `./local-asr/setup.ps1`，再用 `./start.ps1 -Development` 启动桌面和识别服务。

也可参考 `runtime-config.example.json`。设置里的 API Key 留空表示保留原密钥。

```powershell
npm test        # 自动测试
npm run pack    # 构建 Windows 目录版
./start.ps1     # 优先启动目录版，并启动已安装的本地识别服务
```

构建产物位于 `dist/win-unpacked`。关闭主界面会收进托盘，从托盘选择退出才会结束软件。开机启动默认关闭。首次从启动脚本运行前，请先执行 `npm start` 或 `npm run pack`，生成渲染补丁和图标。

## 记忆与数据

基础记忆支持明确记忆与会话记录。Mem0 使用开源 SDK 和本地 SQLite；默认中文检索模型约 24 MB，首次启用下载并校验，无需 Docker 或 Mem0 云账户。**本地检索不等于全程离线**：整理事实默认调用已配置的对话模型，也可以单独配置模型和 Embeddings API。

换对话模型保留事实；换检索模型会建立独立库，可在面板迁移并重新生成向量。导出采用 Mem0 的 `results` JSON，导入兼容该对象及记录数组；不包含密钥、原始向量或完整聊天，不承诺所有平台无损互通。清空会话保留长期记忆，删除全部本地记忆会清空各本地检索配置的记忆库。自动提取可能遗漏或保留过时信息，可手动修正。

通过仓库启动脚本运行时，数据保存在 `.local`；其他启动方式使用界面显示的数据目录。桌面密钥由 Windows 加密保存，聊天与记忆文件仍是本地可读数据。纯网页模式密钥只保留在进程内存。录音和画面不默认落盘；发送内容会交给你配置的服务。仅开启画面预览不会自动发给模型。

## 外部智能体接入

本机接口仅监听 `127.0.0.1:61950`。开启外部接入后，以界面所示令牌文件内容作为 `Authorization: Bearer <token>`，不要公开该文件。

| 接口 | 用途 |
|---|---|
| `GET /v1/capabilities` | 能力与播放客户端状态 |
| `POST /v1/commands` | 朗读、动作、气泡、任务状态、停止 |
| `GET /v1/state` | 任务结果；completed 表示播放结束 |
| `GET /v1/inputs` | 读取发给外部智能体的输入 |
| `GET /v1/events` | SSE 状态通知 |

提供三种外部接入：**轻量 DSH 插件（Beta）**、通用 MCP、直接 HTTP / 命令行。插件把桌宠文字转交给选定的 DSH 主对话，并回传回复；其他经用户确认绑定的对话共用鲸伴记忆、可自动朗读，可选择纳入旧聊天；不装插件也可使用五个 MCP 工具或本机 HTTP 接口。安装方法、限制，以及可直接交给 DSH 的安装提示词见 [接入说明](integrations/README.md) 和 [插件说明](integrations/dsh-plugin/README.md)。已实测本机 DSH 真实回复回传并完成朗读；共享记忆与多对话绑定另有测试，具体范围见验证说明；不承诺仅粘贴链接就能无配置安装。

## 预览版边界

真人麦克风、扬声器回声、不同屏幕缩放、多显示器和干净机器安装仍需更多实测。当前嘴型为音量开合；通话为持续识别后分轮回复，并非原生端到端全双工语音。开机启动未进行系统重启验证，构建未签名，仍有上游依赖安全告警待处理。验证记录见 [docs/VALIDATION.md](docs/VALIDATION.md)。

欢迎提交复现步骤和不含密钥、私人聊天的日志。不要在 Issue 中上传 `.local` 目录。

## 许可与来源

本项目自主编写的代码采用 [MIT](LICENSE)。第三方组件、角色素材、Cubism Core、语音模型分别遵循自身许可，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。宿主开源不代表外部模型可商用。

应用及悬浮球使用 `web/assets/avatar-orb.png` 与 `app.ico`，按维护者要求随源码提供；通用鲸鱼备用图标仍保留。两类图标的来源和许可边界见 [素材说明](web/assets/README.md)。参考关系见 [项目工作与来源](docs/WORK-AND-CREDITS.md)。

## 开发者与致谢

- 作者 / 维护：澄江子。
- 组件与参考：Electron、PixiJS、pixi-live2d-display、Mem0、BongoCat 等，见 [第三方说明](THIRD_PARTY_NOTICES.md) 与 [项目工作与来源](docs/WORK-AND-CREDITS.md)。
- 不将第三方模型、开源组件或记忆算法称为自研成果。软件为整合与产品化实践。
- [版本记录](CHANGELOG.md)。

### 聊天方式与 DSH 共享记忆

聊天输入框旁可直接选择 **DSH 助手** 或 **直接 API**。DSH 模式使用设置中指定的主会话，无需另填鲸伴对话 API；语音合成和识别仍需各自配置。切换保留草稿、停止旧回复，不静默切换服务。

在任意 DSH 会话中要求绑定鲸伴，插件会提交申请；到鲸伴「设置 → DSH 对话与共享记忆」确认，选择是否纳入旧聊天、是否自动朗读、是否作为主会话。所有已绑定会话共享一个记忆库，并持续贡献新的文字聊天；原会话不移动、不删除。未安装插件也可使用 [MCP 或 HTTP 接入](integrations/README.md)。

交流反馈：**澄江子项目交流群（总群）QQ 881553935**。请勿在群里公开 API 密钥或私人聊天记录。

### Windows 玩家下载

请下载[内置小鱼的 Windows Beta](https://github.com/chengjiang-zi/jingban-desktop/releases/download/v0.2.2-beta.1/jingban-0.2.2-beta.1-windows-x64.exe)，不要把绿色 Code → Download ZIP 当成安装程序。Windows 目录包完整解压后运行 `jingban.exe`，保留同目录的 resources、DLL 等文件。便携 EXE 若列在附件中，可直接打开。软件本体免费；第三方 API 可能收费，模型与素材遵循各自许可。

推荐版内置小鱼，但不附带普通大肥鱼角色、Core、语音权重或 D 音色。请先阅读 [模型下载、放置与服务配置](docs/MODELS-AND-SETUP.md)。小鱼敲键盘是同一软件中的另一种角色模式，基于 BongoCat 模型资源改造；来源与修改明细见 [第三方说明](THIRD_PARTY_NOTICES.md)。

演示用到的全部模型链接、D 音色合成参数，以及本地/联网处理范围，见 [演示配置表](docs/DEMO-CONFIG.md)。
