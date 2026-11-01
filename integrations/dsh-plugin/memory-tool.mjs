// 鲸伴 · 作者澄江子 · MIT
export function installMemoryTool(ctx,call){
 ctx.tools.register({
  name:'jingban_bind_conversation',
  description:'用户明确要求让当前 DSH 会话绑定鲸伴、共享鲸伴记忆或自动朗读时使用。仅发送绑定申请；用户须在鲸伴设置中确认，可选择纳入旧聊天、开启朗读、设为主对话。未确认前不读取共享记忆、不导入聊天。打开任意历史会话即可申请绑定该会话。',
  parameters:{type:'object',properties:{title:{type:'string',description:'用户可辨认的当前会话名称，最多120字。'}},required:['title'],additionalProperties:false},
  output:{schema:{type:'object',properties:{id:{type:'string'},status:{type:'string'},sessionId:{type:'string'}},required:['status'],additionalProperties:false},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)+'；请到鲸伴 设置 → DSH 对话与共享记忆确认。'}]},
  async execute(args,execution){if(!args||typeof args.title!=='string'||!args.title.trim()||args.title.length>120||Object.keys(args).some(k=>k!=='title'))throw new Error('请提供最多 120 字的会话名称');return call('/v1/memory/bindings/request',{sessionId:execution.agent.id,title:args.title,baseline:execution.agent.session.deriveMessages().filter(m=>['user','assistant'].includes(m.role)).map(m=>m.id)},execution.signal);}
 });
}
