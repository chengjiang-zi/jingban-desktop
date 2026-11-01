# 鲸伴接入

## 直接模式
在连接设置选择“直接连接模型 API”，填写地址、模型与密钥。基础记忆保存在本机 `.local/memory.json`，只保存文字；历史图片不落盘。明确记忆、聊天记录和摘要可在设置管理。关闭记忆或选择外部模式不代表删除本机数据。

## 外部智能体模式
选择“由外部智能体接入”，并启用外部接口。鲸伴不调用对话模型，也不注入本机记忆。

1. 从 `GET /v1/inputs?after=0` 或 MCP `companion_inputs` 获取用户明确发送的文字／画面。
2. 保存返回的 `cursor`，下一次请求传作 `after`；`truncated` 表示重启或积压导致需检查消息连续性。队列仅在内存保存最近 10 条。
3. 由接入方负责会话、记忆与推理，再用 `companion_present` 或 `POST /v1/commands` 返回 `speak` / `show_message` / `perform`。
4. 用 `companion_state` 检查播放结果。HTTP 客户端也可订阅 `/v1/events` 的 `agent_input`。

两种模式共用 TTS、Live2D 和播放能力；外部模式的连续通话由接入方协调，当前界面保留录音转文字和文字发送。

## DSH
DSH 已提供 `@deepseek-ai/dsh-mcp-client`，使用 `dsh.example.yml` 的 stdio 配置即可暴露工具。不必为工具调用再写专用插件。
MCP 工具不会自动唤醒 DSH。接入方需主动读取输入；若需要无人干预的桌宠消息自动启动／续接 DSH 会话，应另做监听事件并调用 DSH 会话服务的薄插件。本仓库尚未在真实 DSH 会话中联调，不宣称已经完成自动双向聊天。

官方参考：https://deepseek-harness.github.io/deepseek-harness/en/guide/mcp-memory

令牌文件与本地记忆不得随公开仓库或安装包分发。外部接口不暴露本机记忆管理，也不主动开启摄像头或屏幕。
