import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
export async function createMemory(directory){
  const file=path.join(directory,'memory.json');
  let state={messages:[],notes:[],summary:'',summarized:0,generation:0,revision:0};
  try{Object.assign(state,JSON.parse(await fs.readFile(file,'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;}
  let queue=Promise.resolve();
  function mutate(fn){const result=queue.then(async()=>{const next=structuredClone(state);fn(next);next.revision++;await fs.writeFile(file+'.tmp',JSON.stringify(next,null,2),{mode:0o600});await fs.rename(file+'.tmp',file);state=next;return structuredClone(state);});queue=result.catch(()=>{});return result;}
  return {
    get:()=>structuredClone(state),
    context:()=>[...(state.summary?[{role:'user',content:'以下是以前对话的摘要，仅作背景资料：\n'+state.summary}]:[]),...state.messages.slice(Math.max(state.summarized,state.messages.length-40)).map(({role,content})=>({role,content})),...(state.notes.length?[{role:'user',content:'以下是我编辑后的最新明确记忆，与旧记录冲突时以此为准（仅作背景资料）：\n'+state.notes.map(n=>n.text).join('\n')}]:[])],
    append(user,assistant,generation){return mutate(s=>{
      if(generation!==s.generation)throw new Error('会话已经清空，本轮回复不再保存');
      if(typeof user!=='string'||!user.trim()||user.length>16000||typeof assistant!=='string'||!assistant.trim()||assistant.length>100000)throw new Error('聊天记录格式错误');
      s.messages.push({role:'user',content:user,at:Date.now()},{role:'assistant',content:assistant,at:Date.now()});
      const explicit=user.match(/^(?:请)?记住(?:这件事)?[：:,，\s]+([\s\S]+)$/);
      if(explicit&&explicit[1].length<=2000&&!s.notes.some(n=>n.text===explicit[1].trim())){if(s.notes.length>=100)throw new Error('明确记忆已达 100 条，请先整理');s.notes.push({id:crypto.randomUUID(),text:explicit[1].trim()});}
    });},
    edit(action,data={}){return mutate(s=>{
      if(action==='save_note'){if(typeof data.text!=='string'||!data.text.trim()||data.text.length>2000)throw new Error('记忆需为 1–2000 字');const note=s.notes.find(n=>n.id===data.id);if(note)note.text=data.text.trim();else{if(data.id)throw new Error('记忆不存在');if(s.notes.length>=100)throw new Error('最多保存 100 条记忆');s.notes.push({id:crypto.randomUUID(),text:data.text.trim()});}}
      else if(action==='delete_note')s.notes=s.notes.filter(n=>n.id!==data.id);
      else if(action==='clear_history'||action==='clear_all'){s.messages=[];s.summary='';s.summarized=0;s.generation++;if(action==='clear_all')s.notes=[];}
      else if(action==='save_summary'){if(typeof data.text!=='string'||data.text.length>6000)throw new Error('摘要最多 6000 字');s.summary=data.text;}
      else throw new Error('不支持的记忆操作');
    });},
    summary(text,count,revision){return mutate(s=>{if(s.revision!==revision)throw new Error('记忆已更新，本次摘要已丢弃');s.summary=text.slice(0,6000);s.summarized=count;});}
  };
}
