# dsh-jingban · 鲸伴轻量连接器（Beta）

作者：**澄江子**。MIT。此包不包含桌宠应用、模型、声音、密钥或聊天记录，也没有安装脚本和第三方运行依赖。

## 主对话、多对话绑定与共同记忆

- 鲸伴软件中的输入自动发到一个 DSH **主对话**，回复由鲸伴生成声音并驱动角色。鲸伴不需要再填对话模型 API，但 DSH 自身仍需可用的模型服务；ASR/TTS 使用鲸伴配置。
- 任意 DSH 历史会话里，用户可以要求调用 `jingban_bind_conversation` 申请绑定。在鲸伴设置中确认，选择是否纳入旧聊天、自动朗读和设为主对话。
- 所有已确认绑定的会话检索同一份鲸伴记忆；新对话的用户/助手文字正文自动同步到共同记忆。原记录仍留在 DSH，不搬走、不删除。
- 只有一个主对话，其他绑定对话也可自动朗读；未绑定会话不读取或贡献记忆。语音不读取思考过程、工具输出或图片。
- 共同记忆包括鲸伴现有明确记忆、摘要、相关的共享聊天摘录；启用 Mem0 时还检索同一 Mem0 记忆库并提取已绑定会话的用户发言。Mem0 整理仍需要其配置的模型服务，DSH 的登录凭据不会被复制给鲸伴。
- 基础模式是持久保存、按话题检索文字摘录，不宣称具备完整语义理解；Mem0 负责更进一步的事实整理。助手发言以助手摘录保留，不自动当作用户事实。

## 安装

鲸伴 0.2.2-beta.1 与新版插件提供 `jingban_avatar_action`。当已绑定会话可用该工具时，插件自动在 DSH 系统提示词中说明怎么查询动作和编排关键帧。开启鲸伴的「设置 → 桌宠与互动 → 允许 AI 控制角色动作」，然后对 DSH 说「先歪头，再眨眼，最后点两下头」即可尝试。已有绑定配置可以沿用。

先在鲸伴选择“由外部智能体接入”，启用外部调用，并在“外部接入”页查看服务地址和令牌文件路径。保留鲸伴主进程运行。

先创建一个专用 DSH 会话并在 DSH 中打开它，复制其 session ID。不要绑定正在进行其他工作的会话。

克隆鲸伴仓库后，从仓库根目录执行（`desktop` 换成实际使用的 profile）：

```sh
dsh plugin --profile desktop add ./integrations/dsh-plugin
```

也可以在插件目录执行 `npm pack` 得到小型 `.tgz`，然后：

```sh
dsh plugin --profile desktop add /absolute/path/dsh-jingban-0.2.2-beta.1.tgz
```

安装后默认停用。在该 profile 的 `cordis.patch.yml` 覆盖 **jingban** 这一行，不覆盖整个配置文件：

```yaml
- id: jingban
  config:
    enabled: true
    sessionId: '你的专用会话 ID'
    baseUrl: 'http://127.0.0.1:61950'
    tokenFile: 'C:/你的鲸伴数据目录/integration-token'
    speak: true
    pollMs: 600
    sharedMemory: true
```

DSH 配置层覆盖会替换整份 config，因此请保留这一行的全部配置。重启或重新加载 DSH 插件，打开准备绑定的会话，要求它调用 jingban_bind_conversation。到鲸伴设置确认绑定，并选一个主对话。sharedMemory=true 时以鲸伴里选定的主对话为准；sessionId 用于旧版单会话模式。切勿把 token 文件内容贴到聊天或提交 GitHub。插件只访问 127.0.0.1，不适用于 DSH 在云端、另一台电脑或独立网络容器的情况。

卸载：`dsh plugin --profile desktop remove dsh-jingban`；同时删除用户配置中的 jingban 覆盖行。不会删除 DSH 对话或鲸伴数据。

## 兼容性与已知边界

- 基于官方 Agent API：`ctx.agents.get`、`followup`、`cancel`、`whenIdle`、`session.deriveMessages`。
- 本机 DSH 0.2.1-rc.5 已实测：鲸伴发送测试文字 → 真实 DSH 会话回复 → 鲸伴朗读任务 completed。框架加载/卸载也已测试。另已实测两个独立 DSH 会话共享测试记忆、按会话静音和解除绑定隔离；详见仓库验证说明。
- 第一版自动桥接仅支持文字。附图会提示移除后重发；视觉可使用 MCP 的 companion_inputs。连续语音通话暂不支持外部模式。
- DSH 完整回复后才送给 TTS；TTS 自身可流式播放，不等同于 DSH 文本逐字流式回传。
- 主对话需先在 DSH 中打开；未打开时提示重发，不擅自创建、恢复或切换。其他绑定历史会话需在 DSH 中打开一次，宿主才能读到其文字并同步。
- 首次启动/插件重载跳过已有队列，避免重复执行旧指令；鲸伴重启或队列截断会提示重新发送。队列只保留最近 10 条，不能保证离线消息送达。
- 同一批未处理新消息采用最新一条替换前面的输入；建议等连接就绪后逐条发送。
- 插件不代替 DSH 的工具审批，等待审批时请到 DSH 处理。
- 桌宠的停止按钮目前停止声音；插件中的 DSH 任务由新消息打断，或在 DSH 中手动停止。

## 无依赖安装备用方案

若 `dsh plugin add` 因用户原有其他依赖校验失败，不要修改那些依赖或关闭校验。可在现有 profile 的 cordis.patch.yml 追加本地绝对路径插件行（先备份）：

```yaml
- insert:
    - id: jingban
      name: 'C:/你的仓库/integrations/dsh-plugin/index.mjs'
      config:
        enabled: true
        sessionId: '准备绑定的会话 ID'
        baseUrl: 'http://127.0.0.1:61950'
        tokenFile: 'C:/鲸伴数据目录/integration-token'
        pollMs: 600
        sharedMemory: true
```

该方式使用 DSH 已有的 Agent 与工具注册接口，没有第三方运行依赖，不修改其他插件依赖，也不另带一份 DSH。

## 共享记忆数据与撤销

`shared-memory.json` 与鲸伴现有记忆位于同一个本机数据目录，包含绑定关系、去重消息索引、贡献会话 ID 和正文。不会上传 GitHub。正文中自行发出的隐私文字也属于聊天内容；只绑定愿意加入共同记忆的会话。

解除绑定仅停止后续读写和朗读，先前贡献的共同记忆保留。鲸伴“删除全部本地记忆”也清空共享摘录；保留去重索引以避免插件重启重新灌入旧记录。DSH 自己的原会话和先前已注入的上下文不因此删除。

## 来源

按官方接口独立实现：
- [插件与生命周期](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/index.md)
- [插件打包与安装](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)
- [Agent 会话驱动](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/agent/README.md)

上游仍在快速变化，升级 DSH 后请先做一次文字发送、回复、打断与插件关闭测试。
