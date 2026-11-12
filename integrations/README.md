# 鲸伴接入

## 直接模式
在连接设置选择“直接连接模型 API”，填写地址、模型与密钥。基础记忆保存在本机 `.local/memory.json`，只保存文字；历史图片不落盘。明确记忆、聊天记录和摘要可在设置管理。关闭记忆或选择外部模式不代表删除本机数据。

## 外部智能体模式
选择“由外部智能体接入”，并启用外部接口。鲸伴不调用自己的对话模型。默认普通外部接口不读取本机记忆；只有在界面确认绑定的 DSH 会话，才通过共享记忆接口检索和贡献同一记忆库。

1. 从 `GET /v1/inputs?after=0` 或 MCP `companion_inputs` 获取用户明确发送的文字／画面。
2. 保存返回的 `cursor`，下一次请求传作 `after`；`truncated` 表示重启或积压导致需检查消息连续性。队列仅在内存保存最近 10 条。
3. 由接入方负责会话、记忆与推理，再用 `companion_present` 或 `POST /v1/commands` 返回 `speak` / `show_message` / `perform`。
4. 用 `companion_state` 检查播放结果。HTTP 客户端也可订阅 `/v1/events` 的 `agent_input`。

两种模式共用 TTS、Live2D 和播放能力；外部模式的连续通话由接入方协调，当前界面保留录音转文字和文字发送。

## 三种接入方法

| 方法 | 需要鲸伴专用 DSH 插件 | 适合 |
|---|---|---|
| [轻量 DSH 插件](dsh-plugin/README.md) | 是 | 桌宠文字自动唤醒指定 DSH 会话，回复自动回传 |
| MCP（dsh.example.yml） | 否；使用 DSH 官方 MCP 客户端 | 智能体按需调用朗读、动作、读取输入；不会自动唤醒 |
| HTTP / 命令行 | 否 | DSH 或其他智能体直接用本机接口，自行处理轮询与会话 |

不要让自动插件和另一个轮询程序同时处理同一条桌宠输入，避免重复回复。

## 无插件命令行

Node.js 24+；无需为该命令行安装 npm 依赖。设置 `COMPANION_URL` 和 `COMPANION_TOKEN_FILE`（在鲸伴“外部接入”页查看），然后：

```sh
node integrations/companion-cli.mjs capabilities
node integrations/companion-cli.mjs inputs 0
node integrations/companion-cli.mjs speak "你好，我已连上鲸伴。"
node integrations/companion-cli.mjs state
node integrations/companion-cli.mjs stop
```

`speak` 返回任务已入队，不代表播完；检查 state 的对应任务 status。不要在命令行参数里传 token 原文。输入队列返回的 `instanceId` 改变或 `truncated=true` 时，应提示用户重新发送，而非假定所有旧消息仍在。

## HTTP

仅监听 127.0.0.1；请求带 `Authorization: Bearer <从本地令牌文件读取>`。开关关闭时拒绝调用。普通外部接口不能主动开启摄像头或共享屏幕。共享记忆接口只允许已确认绑定的会话读写；外部程序只能申请绑定，不能替用户批准。

| 方法与路径 | 内容 |
|---|---|
| GET /v1/capabilities | 配置能力、接入模式、在线播放窗口数 |
| GET /v1/inputs?after=游标 | 明确提交的文字/可选图片、cursor、instanceId、truncated |
| POST /v1/commands | `{ "command": "speak", "text": "你好", "requestId": "唯一请求标识" }` |
| GET /v1/state | 任务列表与播放状态 |
| GET /v1/events | SSE 状态与 agent_input 事件；客户端需携带授权头 |

commands 支持 speak、show_message、perform、animate、set_task_status、stop。perform 使用 expression（neutral/happy/thinking/surprised）。同一个 requestId 只对应同一条命令，用于重试去重。

### 角色动作

先读取 capabilities 的 `avatar.actions`，使用其中的 `modelVersion` 和参数。没有角色或关闭了 AI 动作时，该字段为 null。HTTP 调用 `POST /v1/commands`，MCP 调用 `companion_present`，两者参数相同：

```json
{
  "command": "animate",
  "modelVersion": "从 capabilities 获取",
  "action": { "frames": [[0, {}], [400, {"tilt": 0.5}], [900, {"nod": -0.6}], [1400, {}]] }
}
```

`action` 也接受 `{"preset":"agree"}` 或 `{"motion":{"group":"组名","index":0}}`。自定义动作最多 12 帧、8 秒。时间从 0 开始递增，首尾回到默认姿态。参数范围为 -1 到 1。任务状态 `completed` 表示渲染器已接受并开始动作。

## 让 DSH 协助安装

可以把仓库链接与以下要求一起发给 DSH。**链接不是自动安装协议**；DSH 仍需能访问仓库、执行本地命令，并取得你的配置选择。不要直接 `dsh plugin add github:chengjiang-zi/jingban-desktop`：仓库根目录是 Electron 应用，不是插件包；必须安装 integrations/dsh-plugin 子目录或其 tgz。

> 请阅读 https://github.com/chengjiang-zi/jingban-desktop 中的 integrations/dsh-plugin/README.md。帮我将鲸伴接入当前 DSH：先确认仓库里已有插件文件和当前 DSH 版本，克隆到本机，从 integrations/dsh-plugin 安装轻量插件。保留并备份现有 profile 配置，不覆盖其他插件。使用一个我选择的专用 DSH 会话；从鲸伴外部接入页确认本机地址与 token 文件路径，不把密钥内容输出到聊天。完成后分别验证文字转发、回复回传、再次发送打断和禁用插件。若当前版本不兼容，请使用 integrations/dsh.example.yml 的 MCP 方案或 companion-cli.mjs，不要声称尚未验证的功能已成功。

如果在线仓库尚无上述文件，说明此功能尚未发布，不能按链接安装；可使用作者提供的本地 Beta 插件包。

## 验证范围

MCP 协议与 HTTP 已有自动测试；轻量插件已通过模拟对话测试、本机真实 Cordis 加载测试，以及 DSH 真实模型回复回传并完成朗读的端到端测试。共享记忆与多会话绑定另有自动测试；见 docs/VALIDATION.md 的真实联调范围。

官方参考：[MCP 配置](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)。

## DSH 共同记忆接口

- `GET /v1/memory/bindings`：绑定与待确认申请，不返回聊天正文。
- `POST /v1/memory/bindings/request`：sessionId、title、baseline（申请时已有消息 ID 列表），只产生待确认申请。
- `POST /v1/memory/context`：sessionId、query；未绑定返回 bound=false，已绑定返回相关共享摘录、明确记忆、摘要和可选 Mem0 结果。
- `POST /v1/memory/sync`：sessionId、messages（每批最多50条，id/role/text），已绑定才允许，按消息 ID 去重；原始 DSH 聊天不删除。

批准/取消绑定、主对话与朗读开关只由鲸伴本机界面操作。每个对话绑定时可单独选择旧聊天是否纳入。普通 HTTP 接入者可复用这套申请与确认流程，不必安装 DSH 插件。
