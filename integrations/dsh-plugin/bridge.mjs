// 鲸伴 · 作者澄江子 · MIT
import {randomUUID} from 'node:crypto';
export function visibleReply(messages,userId){
  const start=messages.findIndex(m=>m.id===userId);
  if(start<0)return '';
  const replies=[];
  for(const m of messages.slice(start+1)){
    if(m.role==='user')break;
    if(m.role==='assistant'){
      const text=m.content.filter(b=>b.type==='text').map(b=>b.text).join('');
      if(text.trim())replies.push(text);
    }
  }
  return replies.at(-1)||'';
}
export function createBridge({getAgent,call,speak=true,emitReplies=true,pollMs=600,onError=()=>{}}){
  let routeGeneration,routeMode,cursor,instanceId,closed=false,timer,polling=false,generation=0,active,delivery=Promise.resolve();
  const lifetime=new AbortController();
  const request=(route,data)=>call(route,data,lifetime.signal);
  const present=(text)=>request('/v1/commands',{command:'show_message',text:text.slice(0,2000)});
  function accept(item){
    const version=++generation;
    // Invalidate stale replies before any awaited HTTP request.
    let cancelled;
    if(active){const previous=active;previous.cancel({kind:'user'});cancelled=previous.whenIdle();active=null;}
    delivery=delivery.catch(()=>{}).then(async()=>{
      if(cancelled)await cancelled;
      if(closed||version!==generation)return;
      await request('/v1/commands',{command:'stop'});
      if(closed||version!==generation)return;
      if(item.image){await present('DSH 轻量连接器当前仅支持文字。请移除附图后重发；图片可通过 MCP 接入。');return;}
      const agent=getAgent();
      if(!agent){await present('请先在 DSH 中打开插件绑定的会话，再重新发送这条消息。');return;}
      if(agent.status!=='idle'){await present('绑定的 DSH 会话正在处理其他任务，请稍后重发；建议使用专用桌宠会话。');return;}
      const message={id:randomUUID(),role:'user',source:{kind:'user'},content:[{type:'text',text:item.text}]};
      active=agent;
      try{agent.followup(message);}catch(error){active=null;throw error;}
      // Do not block polling while the model is working: new input can interrupt it.
      void agent.whenIdle().then(async()=>{
        if(closed||version!==generation||active!==agent)return;
        active=null;
        if(!emitReplies)return;
        const reply=visibleReply(agent.session.deriveMessages(),message.id);
        if(!reply){await present('DSH 本轮没有可回传的文字回复，请到 DSH 查看任务状态。');return;}
        const chunkSize=speak?450:1800;
        for(let i=0;i<reply.length;i+=chunkSize){
          if(closed||version!==generation)return;
          await request('/v1/commands',{command:speak?'speak':'show_message',...(routeGeneration!==undefined?{routeGeneration}:{}),text:reply.slice(i,i+chunkSize),requestId:`jingban-${message.id}-${i}`});
        }
      }).catch(report);
    }).catch(report);
  }
  function report(error){if(!closed){onError(error);void present('DSH 桥接失败，请检查 DSH 插件日志与鲸伴连接。').catch(()=>{});}}
  async function poll(){
    if(closed||polling)return;polling=true;
    try{
      const batch=await request('/v1/inputs?after='+(cursor??0));
      if(closed)return;
      const changed=routeGeneration!==undefined&&batch.generation!==undefined&&batch.generation!==routeGeneration;
      if(batch.connectionMode==='direct'||changed){++generation;active?.cancel({kind:'user'});active=null;}
      if(batch.connectionMode==='direct'){cursor=batch.cursor;instanceId=batch.instanceId;routeGeneration=batch.generation;routeMode=batch.connectionMode;return;}
      routeGeneration=batch.generation;routeMode=batch.connectionMode;
      if(cursor===undefined||batch.truncated||(instanceId&&batch.instanceId&&instanceId!==batch.instanceId)){
        const reset=cursor!==undefined;
        cursor=batch.cursor;instanceId=batch.instanceId;
        if(reset){++generation;active?.cancel({kind:'user'});active=null;await present('鲸伴连接已重置或消息有缺失，请重新发送。');}
        return; // Never replay retained messages on startup/reload.
      }
      instanceId=batch.instanceId;cursor=batch.cursor;
      for(const item of batch.inputs)if(item.generation===undefined||item.generation===routeGeneration)accept(item);
    }catch(error){if(!closed)onError(error);}
    finally{polling=false;}
  }
  return {
    poll,
    start(){if(!timer){void poll();timer=setInterval(()=>void poll(),pollMs);timer.unref?.();}},
    async close(){closed=true;++generation;clearInterval(timer);lifetime.abort();active?.cancel({kind:'user'});active=null;await delivery;},
  };
}
