// 鲸伴 · 作者澄江子 · MIT
import {createCompanionClient} from './client.mjs?v=beta1-r4';
import {installMemoryTool} from './memory-tool.mjs?v=beta1-r4';
import {createBridge} from './bridge.mjs?v=beta1-r4';
import {installSharedMemory} from './shared.mjs?v=beta1-r4';
export const name='jingban';
export const inject=['agents'];
export function apply(ctx,config={}){
  if(!config.enabled)return;
  if(typeof config.sessionId!=='string'||!config.sessionId.trim())throw new Error('jingban.sessionId 必须绑定一个专用 DSH 会话');
  if(config.speak!==undefined&&typeof config.speak!=='boolean')throw new Error('jingban.speak 必须是布尔值');
  const pollMs=config.pollMs??600;
  if(!Number.isInteger(pollMs)||pollMs<250||pollMs>10000)throw new Error('jingban.pollMs 应在 250–10000 之间');
  const call=createCompanionClient(config);
  const onError=error=>console.error('[jingban]',error.message);
  const shared=config.sharedMemory===true?installSharedMemory(ctx,call,{onError}):null;
  ctx.inject(['tools'],toolCtx=>installMemoryTool(toolCtx,call));
  const bridge=createBridge({getAgent:()=>ctx.agents.get(shared?shared.primary():config.sessionId),call,speak:config.speak!==false,emitReplies:!shared,pollMs,onError});
  ctx.effect(()=>{bridge.start();return ()=>bridge.close();});
}
