# 第三方组件与素材边界

本仓库的桌面入口、界面、服务适配、本机控制协议和 MCP 桥接代码采用根目录 MIT 许可。第三方组件与用户提供的素材分别适用其自身许可；本仓库的 MIT 不覆盖它们。

| 组件 | 来源 | 本原型中的使用 |
|---|---|---|
| Electron 45.2.1 | https://github.com/electron/electron | MIT；Chromium 等的 notices 随 Electron 分发包保留 |
| PixiJS 6.5.10 | https://github.com/pixijs/pixijs | MIT；通过 npm 使用官方发行文件 |
| pixi-live2d-display 0.4.0 | https://github.com/guansss/pixi-live2d-display | MIT；通过 npm 使用 Cubism 4 适配库 |
| MCP TypeScript SDK 2.4.0 | https://github.com/modelcontextprotocol/typescript-sdk | Apache-2.0；服务端桥接和测试客户端 |
| Zod 4.6.7 | https://github.com/colinhacks/zod | MIT；MCP 输入校验 |
| faster-whisper 1.2.1 | https://github.com/SYSTRAN/faster-whisper | MIT；可选、独立 Python 本地识别服务 |
| Whisper base CTranslate2 权重 | https://huggingface.co/Systran/faster-whisper-base | 模型页面标注 MIT；下载到忽略目录，来源 revision 记录在 source.json |

可选运行时还包含 PyAV/FFmpeg、CTranslate2、ONNX Runtime 等依赖，完整版本在 `local-asr/requirements-lock.txt`，各自许可随安装包保留。桌面包不包含这个 Python 环境或识别权重。

## 不随仓库或桌面分发包提供

- Live2D Cubism Core：用户自行提供已获许可的官方文件，适用 Live2D 官方条款。官方说明：https://www.live2d.com/en/sdk/license/ 。允许本机使用不等于可以任意重新分发。
- 大肥鱼角色模型及贴图：本机测试引用已有目录；原画神宫凉子、模型霓虹猫_NeonNeko。发布演示、分发角色或商业使用前应按原作者的使用须知确认权限。
- Breeze TTS 运行时、权重、参考声音：连接用户已有服务。当前本机权重使用 Research and Non-Commercial 许可，不能因为宿主代码开源就宣称整体可商用。运行时与权重的许可须分别核对。
- API 密钥、Windows 加密凭据、集成令牌、本机绝对路径配置、会话文本、录音和屏幕画面。

旧 Jingyu / Open-LLM-VTuber 目录保留为已有验证环境。本仓库独立编写产品界面、桌面生命周期与协议适配，不复制其业务源文件。对通用功能的比较与参考列在 `docs/RESEARCH.md`，不宣称这些功能是首创。

渲染修复：scripts/patch_renderer.py 将逐部件 multiply/screen 颜色支持回补至固定版本 pixi-live2d-display，基于此前本机验证脚本，公式参考 Live2D 官方 CubismWebFramework。生成文件保留原依赖许可归属，源与输出哈希记录于 renderer-patch.json。

## Mem0 长期记忆

- Mem0 OSS Node SDK 3.3.1：Apache-2.0，https://github.com/mem0ai/mem0 。许可证随包放在 licenses/mem0-Apache-2.0.txt。使用原库，不声称是自研记忆算法；已关闭 SDK 遥测。
- Transformers.js 3.8.1：Apache-2.0；better-sqlite3 13.0.3：MIT。依赖原有许可证随依赖保留。
- BAAI/bge-small-zh-v1.5：模型卡标注 MIT，https://huggingface.co/BAAI/bge-small-zh-v1.5 。使用 Xenova ONNX 转换版本，固定 revision 75c43b069aac4d136ba6bc1122f995fedcfd2781；下载后按官方文件哈希校验，权重保存在本机数据目录，不提交到源码仓库。
- 整理记忆复用用户配置的对话 API（或独立 API）；默认向量检索在本地，用户也可以配置自己的 Embeddings API。云服务条款及费用由服务提供方决定。

## 应用图标（单独素材）

维护者提供的大肥鱼卡通头像与对应 ICO 随仓库提供，具体卡通原图作者待补充；不将该图案归入代码 MIT，也不冒认与 Live2D 原画作者相同。完整来源记录、通用备用图标及使用边界见 [web/assets/README.md](web/assets/README.md)。角色模型、贴图包和声音仍不随仓库提供。

## BongoCat 兼容与本机试验皮肤

参考项目：https://github.com/ayangweb/BongoCat （仓库 Apache-2.0；上游注明受 MMmmmoko / Bongo-Cat-Mver 启发）。鲸伴自行实现输入采样、键位反馈与渲染适配，不复制整个 BongoCat 应用。公开源码不捆绑其角色骨架、键位图集或本机试验换肤；用户导入素材时仍须保留来源及相应许可。

本机试验使用 keyboard / standard 模型资源并保留上游 LICENSE；换肤图由用户图标辅助生成，不能据此宣称原素材由鲸伴作者原创或全部可商用。

### 小鱼敲键盘角色的具体来源与修改

- 上游提交：[`47a73ed1765b13fdd674ec356d51b5b16a6b5a5b`](https://github.com/ayangweb/BongoCat/tree/47a73ed1765b13fdd674ec356d51b5b16a6b5a5b)。
- 基础角色：[`resources/models/keyboard/`](https://github.com/ayangweb/BongoCat/tree/47a73ed1765b13fdd674ec356d51b5b16a6b5a5b/resources/models/keyboard)。原 MOC3 骨架、左右手参数、动作、表情、左右键位图保留，不声称是鲸伴原创建模。
- 桌沿和鼠标图集：同一提交的 [`resources/models/standard/`](https://github.com/ayangweb/BongoCat/tree/47a73ed1765b13fdd674ec356d51b5b16a6b5a5b/resources/models/standard)。
- 外观修改：以维护者提供的应用图标为参考，使用图片生成工具修改主贴图 `demomodel2.1024/texture_00.png`，保留原图集布局；角色仍使用原骨架，并非全新重绑定。
- 鲸伴侧修改：`companion-scene.json` 调整眼睛形状及位置、隐藏重复桌沿、桌面前景遮挡和独立鼠标场景；加入本机按键/鼠标反馈及开关。该扩展仅鲸伴识别。
- 本机角色目录保留 `source.json`、`UPSTREAM-LICENSE` 和修改说明；公开仓库发布适配代码和来源链接，不捆绑该修改角色包。上游 Apache-2.0 不自动覆盖另行提供的头像素材。
