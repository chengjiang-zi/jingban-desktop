# 模型放哪里 · 新用户配置指南

返回 [首页](../README.md)。下面的目录以仓库根目录 `jingban-desktop/` 为起点。**角色可以存放在任意本地目录，但必须在连接设置中选择文件；仅把文件复制进去不会自动加载。** 语音识别和 Mem0 的默认本地安装路径则由程序管理。

## 先选你需要的功能

| 想使用的功能 | 要准备什么 | 推荐位置 / 配置入口 |
|---|---|---|
| 显示桌面角色 | 完整 Live2D 模型目录 | `models/DeepSeek/`，设置中选择 `.model3.json` |
| 渲染 Live2D | 官方 Cubism Core JS | `models/runtime/live2dcubismcore.min.js`，设置中选择 Core |
| 文字聊天、看图 | 对话 / 视觉 API | 连接设置填写地址、模型 ID、Key，不用往仓库放模型 |
| 本地发声 | Breeze 运行时和 GGUF 权重 | 独立目录，如 `D:/AI/Breeze/`，启动其服务再连接 |
| 固定声音 | Breeze 中生成并保存的音色 | Breeze 的 `voices/`，鲸伴里填写真实音色 ID |
| 本地听懂语音 | faster-whisper + Whisper base 权重 | 安装脚本自动放到 `.local/asr-model/` |
| 本地长期记忆检索 | 中文 BGE 检索权重 | Mem0 面板自动准备到数据目录的 `embedding-models/` |
| 外部智能体控制 | HTTP 或 MCP 桥接 | 看 [外部接入指南](../integrations/README.md)，由外部智能体管理对话与记忆 |

不需要的服务可以不装。先验证文字聊天，再逐项开启声音、识别和记忆，比较容易定位问题。

## 演示所用资源与来源

这里记录当前本机演示配置；不是声称已经发布了视频，也不代表必须使用同一组合。

| 部分 | 演示配置 | 获取入口 |
|---|---|---|
| 角色 | DeepSeek「大肥鱼」；原画及拆分：神宫凉子；建模：霓虹猫_NeonNeko | [作者发布视频](https://www.bilibili.com/video/BV1KmxY66EZ3/)，下载及使用说明以作者页面为准 |
| Live2D 运行库 | Cubism Core for Web | [官方 SDK 下载页](https://www.live2d.com/en/sdk/download/web/)；自行阅读并接受官方条款 |
| 本地语音运行时 | Breeze-TTS-2.cpp，演示使用 Windows x64 Vulkan v0.1.3 | [项目](https://github.com/HoppouAI/Breeze-TTS-2.cpp) · [发布下载](https://github.com/HoppouAI/Breeze-TTS-2.cpp/releases/tag/v0.1.3) |
| 语音生成权重 | `breeze-tts-2-q8_0.gguf` | [GGUF 权重仓库](https://huggingface.co/HoppouAI/Breeze-TTS-2.cpp) · [原始 Breeze 模型](https://huggingface.co/BreezeBlue/Breeze-TTS-2) |
| 固定音色 | 本机生成并保存的 D「清亮中带柔和」 | [Breeze 音色说明](https://github.com/HoppouAI/Breeze-TTS-2.cpp/blob/main/docs/voices.md)；本仓库不附带 D 音色或参考音频 |
| 本地语音识别 | faster-whisper，Whisper base，CPU int8 | [识别引擎](https://github.com/SYSTRAN/faster-whisper) · [转换后的权重](https://huggingface.co/Systran/faster-whisper-base) |
| 长期记忆 | Mem0 OSS + SQLite | [Mem0 项目](https://github.com/mem0ai/mem0)，库依赖随 npm 安装 |
| 本地记忆检索 | BGE small Chinese v1.5，ONNX 量化版 | [原始模型](https://huggingface.co/BAAI/bge-small-zh-v1.5) · [使用的 ONNX 转换](https://huggingface.co/Xenova/bge-small-zh-v1.5) |

角色入口和作者署名参考了 [鲸语项目的公开说明](https://github.com/InariNGT-Ofiicial/jingyu-live2d-agent#先准备模型与运行库)。鲸伴与鲸语是不同项目，启动命令、端口和目录约定不要混用。大肥鱼卡通应用图标的来源说明见 [图标说明](../web/assets/README.md)。

## 1. 放好角色和 Core

推荐结构（实际文件名以下载包为准）：

```text
jingban-desktop/
  models/
    runtime/
      live2dcubismcore.min.js
    DeepSeek/
      大肥鱼.model3.json
      大肥鱼.moc3
      ...原包里的贴图、物理、表情、动作及使用说明...
```

1. 从作者入口获取完整模型，完整解压。不要只复制 `.model3.json`，也不要随意移动它引用的贴图或改名。
2. 从 Live2D 官方 SDK 找到 `Core/live2dcubismcore.min.js`，放到上面的 runtime 目录。
3. 打开鲸伴 → 连接设置 → 选择模型文件、选择 Core 文件，各选一次，按界面提示保存或重载。
4. 如果放在别的盘，直接选择那个盘里的文件即可。目录名不是强制要求，程序使用保存的路径。

这些模型和运行库不随 GitHub 源码提供。`models/` 已被 Git 忽略，原作者的完整模型也不要重新上传到 Issue 或仓库。

## 2. 接入 Breeze 本地语音

Breeze 是独立服务，不是把 GGUF 放进鲸伴就能运行。先从上表下载适合电脑的运行时和权重。示例布局：

```text
D:/AI/Breeze/
  runtime/
    breeze-server.exe
    ...压缩包里的其他运行文件，完整保留...
  models/
    breeze-tts-2-q8_0.gguf
  voices/
    ...在 Breeze 中保存后产生的音色文件...
```

在该目录打开 PowerShell，运行（路径按实际位置修改）：

```powershell
cd D:/AI/Breeze
./runtime/breeze-server.exe ./models/breeze-tts-2-q8_0.gguf --host 127.0.0.1 --port 8137 --webui --voices-dir ./voices
```

保持服务运行，打开 `http://127.0.0.1:8137/`，先在 Breeze 自带界面生成、试听并保存一个音色。若界面随版本变化，以 [Breeze 服务文档](https://github.com/HoppouAI/Breeze-TTS-2.cpp/blob/main/docs/server.md) 为准。

然后在鲸伴的“声音 / TTS”填写：

| 字段 | 填什么 |
|---|---|
| 适配器 | Breeze 本地固定音色 |
| 服务根地址 | `http://127.0.0.1:8137`，不要重复加 `/v1` |
| 音色 ID | 你在 Breeze 中实际保存的 ID |
| 参考文本 | 保存音色时的参考原文；不确定时清空该字段，避免默认示例文本不匹配 |
| 采样率 | 演示使用 `24000` |

演示中的 `jingyu_bright_soft_d_v1` 只是本机保存音色的标识；新安装默认不填音色 ID。**填写这个名字不会下载或生成 D 音色。** GGUF 是生成模型，`.breeze` 是保存的声音资料，两者用途不同。鲸伴不会替你启动外部 Breeze 服务。

想自己调出类似方向，可以从“灵动俏皮的少女声，轻快、有精神，清亮中带柔和，少一些播音腔”开始试听，再保存喜欢的结果；这不是完全复现演示音色的保证。

Breeze 运行时代码与权重使用不同许可；当前权重标注 Research and Non-Commercial。请查看 [官方模型许可](https://huggingface.co/BreezeBlue/Breeze-TTS-2)，不要把本项目的 MIT 当成权重或声音输出的商用许可。

## 3. 安装本地语音识别

在鲸伴仓库根目录运行：

```powershell
./local-asr/setup.ps1
./start.ps1 -Development
```

脚本创建 `.local/asr-venv/`，下载完整模型到 `.local/asr-model/`，其中包含 `model.bin`、配置和 tokenizer 等文件。下载完成前不要只拷贝单个权重文件来替代整个目录。`start.ps1` 在这些文件齐备时启动本地识别服务；普通 `npm start` 不负责启动该 Python 服务。

在连接设置中填识别地址 `http://127.0.0.1:61951/v1`，模型名 `faster-whisper-base`。先用“录音转文字”确认能转写，再测试通话。Python 依赖安装失败时，建议使用 64 位 Python 3.11 或 3.12 重试，并检查下载网络。

自行运行其他识别服务时，只需更换地址、模型名与密钥；它应支持 `/audio/transcriptions` 和返回 JSON `text` 字段，不能保证任意本地模型文件直接兼容。

## 4. 准备 Mem0 长期记忆

连接设置中点击“准备检索并启用 Mem0”。程序会下载并校验中文检索文件，不需要手工选择 ONNX：

```text
.local/
  embedding-models/bge-small-zh-v1.5/
    config.json
    tokenizer.json
    tokenizer_config.json
    onnx/model_quantized.onnx
  mem0/
    ...自动创建的记忆数据库...
```

这个路径适用于源码版或使用仓库 `start.ps1` 启动的版本。直接运行打包程序时可能使用 Windows 用户数据目录，**以软件界面显示的数据目录为准**。别把数据库放进模型文件夹，也不要上传 `.local`。

检索模型只负责把文字变成可检索向量。整理事实还需要配置好的聊天模型 API，默认复用对话服务；可以另外填写自己的整理模型和检索 API。更换检索模型后，在面板使用迁移功能，不要直接把不同维度的数据库混到一起。

## 5. 对话、视觉及常见问题

对话服务只填实际 API 地址、模型 ID 和密钥；本应用不直接加载聊天模型权重。本地聊天模型也需要先由其他软件提供兼容服务。视觉要求选用支持图片输入的模型，并主动附加画面或开启每次对话附加最新一帧。

| 现象 | 先检查 |
|---|---|
| 角色空白、缺少贴图 | Core 是否选对、模型是否完整解压、`.model3.json` 的相对文件是否都在 |
| 找不到固定音色 | Breeze 是否启动、音色是否保存、ID 是否一致；演示 ID 不是公共下载资源 |
| 固定音色参考文本不匹配 | 改成保存音色时原文，或清空该校验字段 |
| 语音接口 404 | Breeze 填根地址；识别常用含 `/v1` 的地址；不要把完整接口路径当基础地址 |
| 对话能用但看不到摄像头 | 预览不等于发送；确认附图和模型图片能力 |
| ASR 连接失败 | 本地安装是否完成、是否通过启动脚本启动服务、61951 是否被占用 |
| 没有长期记忆 | 是否选择 Mem0、检索准备是否完成、整理模型 API 是否可用；可运行面板自检 |

使用其他服务时，接口和音频格式必须满足当前适配器要求。兼容 TTS 当前会在所填根地址后附加 `/v1/audio/speech`，并要求返回所选采样率的单声道 PCM16；不是任意 MP3 接口都能直接替换。

## 6. 角色库、小鱼敲键盘模式与来源

主界面「连接设置 → 角色与桌面 → 角色库」和悬浮球菜单「切换角色」使用同一份角色库，选择后两个窗口立即更新，聊天和记忆不受影响。两个位置均可导入新模型：先解压角色包，再选择其中的 `.model3.json`，保留其贴图、骨架和其他引用资源。

导入保存的是本机文件路径，请勿移动或删除原模型目录。模型列表保存在用户数据目录的 `model-library.json`，当前选择随应用配置保存。模型文件不加入开源仓库。

含 `CatParamLeftHandDown` / `CatParamRightHandDown` 参数的 BongoCat 角色可以由左右手状态驱动。Windows 桌面版在角色显示期间读取按键/鼠标按钮的按下状态，启用键位反馈时向本机渲染窗口发送当前按键标识和左右手/鼠标状态（不发送文本字符），不保存、上传或传递按键内容。切换普通模型或所有窗口隐藏时停止读取，退出应用后辅助进程也会停止。具有对应键位图片的模型支持按键亮起反馈；当前不包含手柄映射或完整特效系统。

本机大肥鱼试验皮肤放在用户数据目录 `models/DaFeiYu/`，启动时自动加入角色库（也扫描 models 下其他角色子文件夹）。这是基于 BongoCat 模型的换肤试验，不等于重新制作的独立模型；上游出处与贴图说明随角色文件夹保留。公开源码和通用安装包不捆绑该试验皮肤。

本机小鱼皮肤另带 `companion-scene.json`，用于鲸伴的眼部位置/比例修正、隐藏重复桌沿和鼠标场景层。这是鲸伴的可选显示配置，BongoCat 本体不会读取它；不修改原 MOC 骨架。场景保持原版脸型与双手，鼠标是独立场景对象，并非重新绑定的握鼠标手臂。

「键盘按键与鼠标按钮亮起反馈」可在连接设置中立即关闭。键位图片来自模型自己的 `resources/left-keys`、`resources/right-keys`，按原图坐标叠加，兼容旧 BongoCat 青色标记样式；没有对应图片则不高亮。禁用后停止具体键位传递并清除高亮，基本敲击动作保留。

### 两种角色模式的区别

| 项目 | 普通 Live2D 伙伴 | 小鱼敲键盘 |
|---|---|---|
| 用途 | 聊天、语音、表情、鼠标跟随 | 键盘敲击、鼠标按下反馈、陪伴 |
| 模型要求 | 完整 Cubism model3 模型及 Core | 带 BongoCat 手部参数的完整模型，可选键位图 |
| 操作入口 | 应用角色库或悬浮球切换 | 同一个角色库切换，不是第二个独立程序 |
| 键鼠反馈 | 无专用键盘场景 | 左右手与左右鼠标反馈，设置可关闭具体键位高亮 |
| 本机演示素材 | 原作者提供的大肥鱼模型 | 本机试验换肤与场景修正，不随公共下载包提供 |

BongoCat 上游及角色格式参见 [ayangweb/BongoCat](https://github.com/ayangweb/BongoCat)。鲸伴的场景修正文件 `companion-scene.json` 仅由鲸伴识别，导入 BongoCat 本体时不保证呈现相同眼位、桌沿与鼠标效果。当前不能声称已经完成独立重绑定或兼容全部 BongoCat 角色。

### Windows 下载包怎样放模型

下载包不需要 Node.js。完整解压 Windows 包后双击 `jingban.exe`；便携 EXE（若 Release 提供）可直接启动。角色与 Core 可放在 `D:/WhaleModels/` 等自选目录，再用应用中的文件选择器导入。语音服务仍独立安装、启动；GGUF 不放在鲸伴 EXE 旁自动生效。本地 ASR 辅助脚本见下载包 `local-asr/` 的说明，或按本页源码步骤安装。直接双击 EXE 不会自动拉起 Python ASR 服务。
