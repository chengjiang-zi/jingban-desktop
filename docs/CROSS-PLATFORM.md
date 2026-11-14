# macOS 和 Linux 预览版

目标为 macOS Apple Silicon（arm64）和 Ubuntu 24.04（x64）。Windows 继续提供原有构建。预览包可在 [Desktop preview 构建记录](https://github.com/chengjiang-zi/jingban-desktop/actions/workflows/desktop-preview.yml)中查看。完成构建和自动验收的任务才会上传产物。Mac 预览包未进行面向公开发行的 Developer ID 签名与公证。

| 功能 | macOS | Linux |
| --- | --- | --- |
| Live2D、聊天、DSH、记忆、语音和 AI 动作 | 共用现有代码。自行配置 Cubism Core、语音和对话服务。 | 同左。 |
| 悬浮窗 | 应用图标可重新打开主界面。 | Wayland 下从悬浮球菜单的「拖动这里移动桌宠」移动窗口，眼睛和头部在鲸伴窗口内跟随。实际置顶和透明度取决于桌面环境。 |
| 小鱼键鼠 | 鲸伴窗口内会对按键和鼠标按钮做出反应。 | 同左。 |
| 登录启动 | 接系统登录项，效果依赖应用签名和系统批准。 | 预览版暂未提供。 |
| 屏幕共享 | 首次需要系统录屏授权。 | Wayland 通过桌面环境的 PipeWire 屏幕共享选择器，需要对应的 portal 服务。 |
| 密钥 | 使用系统钥匙串。 | 有桌面密钥环时加密保存，否则只在本次运行中可用。 |

## 从源码启动

安装 Node.js 24+、Python 3 和 Git 后，在仓库根目录运行：

```sh
npm ci --ignore-scripts
npm run setup
npm start
```

开发版使用仓库的 `.local` 目录。安装包使用当前系统的应用数据目录。角色包需解压后导入 `.model3.json`，Core 和服务配置见[模型下载与放置](MODELS-AND-SETUP.md)。

## 构建与检查

在目标系统的对应架构上运行。Linux 构建需要桌面运行库和 `libopenjp2-tools`。

```sh
npm test
npm run pack:mac -- --arm64       # Apple Silicon，生成 dist/*.dmg
npm run pack:linux -- --x64       # Ubuntu x64，生成 dist/*.deb
npm run smoke:desktop -- --packaged
```

macOS 打开 DMG 后将应用拖入「应用程序」。Ubuntu 执行 `sudo apt install ./jingban-*-linux-*.deb`，然后从应用菜单启动鲸伴。若要测试已安装的 Linux 包，运行 `JINGBAN_SMOKE_EXECUTABLE=/usr/bin/jingban npm run smoke:desktop -- --packaged`。

CI 测试会启动打包后的应用，检查主窗口、悬浮窗缩放、SQLite、ONNX Runtime、内置模型入口及渲染脚本。Linux CI 使用虚拟 X11 显示器。真实的麦克风、摄像头、屏幕共享、Wayland 窗口操作及 macOS 登录启动仍需要相应桌面环境验收。Live2D Core 未随安装包分发，自动验收只检查模型资源和渲染脚本能否加载。

## 可选安装本地语音识别

在自己可写的源码目录运行，需要 Python 和其对应平台的依赖包：

```sh
sh local-asr/setup.sh
.local/asr-venv/bin/python local-asr/server.py --model .local/asr-model
```

在连接设置填入 `http://127.0.0.1:61951/v1`，模型名填 `faster-whisper-base`。独立运行的兼容语音服务也可以直接接入。
