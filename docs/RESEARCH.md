# 同类项目检索 · 2026-11-01

结论：不能支持“全网首发”或“此前没人做得这么全面”。已经存在直接面向 DSH 的鲸鱼娘桌宠，也有覆盖语音、视觉、透明桌宠和可替换模型的项目。公开检索不能证明不存在其他实现；这里也没有对所有项目进行安装实测。

| 项目 | 官方仓库/文档已描述的能力 | 对本项目定位的影响 |
|---|---|---|
| [Andersen216/dsh-whale-girl-live2d](https://github.com/Andersen216/dsh-whale-girl-live2d) | DSH Web 界面中的 Live2D 鲸鱼娘、随 agent 状态切换表情与动作、点击对话 | “DSH + 鲸鱼娘桌宠”已有直接先例 |
| [Open-LLM-VTuber](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/main/README.CN.md) | 语音对话、打断、摄像头/屏幕视觉、Live2D、透明置顶鼠标穿透、可换 LLM/ASR/TTS | “一站式语音视觉桌宠”也不是空白 |
| [AIRI](https://github.com/moeru-ai/airi) | 自托管虚拟伙伴、实时语音交流、网页与 Windows/macOS 支持 | 完整数字伙伴产品已有成熟方向 |

可尝试的实际差异：面向大肥鱼使用者的安装与配置体验；稳定音色方案；明确的可替换模块与素材边界；用同一套宿主承接 DSH 和其他智能体。不把这些差异写成“唯一”或“首个”，需用可演示的体验证明价值。

现阶段标题可用：**[开源原型] 让大肥鱼住进你的桌面｜语音陪伴，可接 DSH**。
“可视频通话”应在连续语音输入、回声处理、视觉链路和真实模型端到端体验完成后再使用；本轮采用按键录音、主动附加画面的交互。

## 技术依据

- [Electron 自定义窗口](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions)
- [Electron 安全配置](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron 屏幕捕获](https://www.electronjs.org/docs/latest/api/desktop-capturer)
- [DSH MCP 客户端官方说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [faster-whisper](https://github.com/SYSTRAN/faster-whisper)

研究只用于能力与接口核对；未复制上述项目的产品界面或业务实现。
