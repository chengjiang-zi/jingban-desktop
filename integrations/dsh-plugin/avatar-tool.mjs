// 鲸伴 · 作者澄江子 · MIT
const toolName='jingban_avatar_action';

export function installAvatarPrompt(ctx, call, isBound) {
  ctx.on('system-prompt/assemble', async (_assembly, {agent}, next) => {
    const assembly=await next();
    if(!agent||!isBound(agent.id)||!assembly.tools.some(tool=>tool.name===toolName))return assembly;
    let state;
    try{state=await call('/v1/capabilities');}catch{return assembly;}
    if(state.connectionMode!=='external'||!state.avatar?.actions||!state.players)return assembly;
    const section={
      name:'jingban:avatar-actions',
      interpolate:false,
      text:[
        '当前会话连接了鲸伴桌宠。用户要求角色做动作时，请实际调用 jingban_avatar_action；合适的日常对话也可以配合一个简短动作。',
        '先传空对象查询当前角色的动作列表和 modelVersion，再用返回的 modelVersion 执行。单个动作可选 preset 或 motion，连续动作优先用 frames 合成一段。',
        'frames 每帧是 [毫秒, 参数对象]，仅使用查询返回的参数。首尾为空姿态，最多 12 帧、8 秒。一次编排后正常回复，工具参数留在工具调用中。工具未执行时如实告知。'
      ].join('\n')
    };
    return {...assembly,sections:[...assembly.sections,section]};
  });
}

export function installAvatarTool(ctx, call, {sessionId, sharedMemory}) {
  ctx.tools.register({
    name: toolName,
    description: '在已绑定的鲸伴 DSH 会话中，让桌宠配合当前回复表演。先以空参数查询当前角色支持的动作和参数，再传 action 执行。可以选内置动作、模型自带动作，或用关键帧编排新动作。只在合适时表演一次，之后正常回复用户。',
    parameters: {
      type: 'object',
      properties: {
        modelVersion: {type:'string',description:'查询动作时返回的当前角色版本'},
        action: {
          type: 'object',
          description: '例如 {"preset":"agree"} 或 {"frames":[[0,{}],[400,{"tilt":0.5}],[1200,{}]]}。关键帧从 0 开始，单位毫秒，首尾为空对象，最多 12 帧、8000 毫秒。',
          properties: {
            preset: {type:'string'},
            motion: {type:'object',properties:{group:{type:'string'},index:{type:'integer'}},required:['group','index'],additionalProperties:false},
            duration: {type:'integer'},
            frames: {type:'array',items:{type:'array'}}
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    output: {
      schema: {type:'object',properties:{status:{type:'string'},taskId:{type:'string'},actions:{type:'object'}},required:['status']},
      render: (_args,value) => [{type:'text',text:JSON.stringify(value)}]
    },
    async execute(args,{agent,signal}) {
      const route=await call('/v1/memory/bindings',undefined,signal);
      const bound=sharedMemory?route.bindings.some(item=>item.sessionId===agent.id):agent.id===sessionId;
      if(route.connectionMode!=='external'||!bound)throw new Error('请在鲸伴已绑定的 DSH 会话中使用动作工具');
      if(!args?.action){
        const state=await call('/v1/capabilities',undefined,signal);
        if(!state.avatar.actions)throw new Error('请在鲸伴加载角色并开启 AI 动作');
        return {status:'available',actions:state.avatar.actions};
      }
      if(typeof args.modelVersion!=='string')throw new Error('请先查询当前角色的动作能力');
      const task=await call('/v1/commands',{command:'animate',action:args.action,modelVersion:args.modelVersion,routeGeneration:route.generation},signal);
      return {status:task.status,taskId:task.id};
    }
  });
}
