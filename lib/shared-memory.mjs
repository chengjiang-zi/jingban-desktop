// 鲸伴 · 作者澄江子 · MIT
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=160;
const words=text=>new Set(String(text).toLowerCase().match(/[a-z0-9_]{2,}|[\p{Script=Han}]{2}/gu)||[]);
export async function createSharedMemory(directory){
 const file=path.join(directory,'shared-memory.json');let state={bindings:[],requests:[],messages:[]},queue=Promise.resolve();
 try{state=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 function mutate(fn){const task=queue.then(async()=>{const next=structuredClone(state);const result=fn(next);await fs.writeFile(file+'.tmp',JSON.stringify(next),{mode:0o600});await fs.rename(file+'.tmp',file);state=next;return result;});queue=task.catch(()=>{});return task;}
 const binding=id=>state.bindings.find(b=>b.sessionId===id);
 const publicBinding=b=>{const {seen,voiceSeen,...safe}=b;return safe;};
 return {
  clear:()=>mutate(s=>{s.messages=[];return {ok:true};}),
  state:()=>({bindings:state.bindings.map(publicBinding),requests:state.requests.map(({baseline,...r})=>r),messageCount:state.messages.length}),
  binding:id=>binding(id)?publicBinding(binding(id)):null,
  request(data){return mutate(s=>{
   if(!validId(data.sessionId)||typeof data.title!=='string'||!data.title.trim()||data.title.length>120)throw new Error('请提供会话 ID 与名称');
   if(!Array.isArray(data.baseline)||data.baseline.length>20000||data.baseline.some(id=>!validId(id)))throw new Error('会话消息索引格式错误');
   const bound=s.bindings.find(b=>b.sessionId===data.sessionId);if(bound)return {status:'bound',sessionId:bound.sessionId};
   const old=s.requests.find(r=>r.sessionId===data.sessionId);if(old)return {status:'pending',id:old.id};
   if(s.requests.length>=20)throw new Error('待确认绑定已满');
   const r={id:randomUUID(),sessionId:data.sessionId,title:data.title.trim(),baseline:[...new Set(data.baseline)],at:Date.now()};s.requests.push(r);return {id:r.id,status:'pending'};
  });},
  edit(data){return mutate(s=>{
   if(data.action==='approve'){
    const r=s.requests.find(r=>r.id===data.id);if(!r)throw new Error('绑定申请不存在');
    const main=!s.bindings.length||data.main===true;if(main)for(const b of s.bindings)b.main=false;
    s.bindings.push({sessionId:r.sessionId,title:r.title,main,voice:data.voice!==false,includeHistory:data.includeHistory===true,at:Date.now(),seen:data.includeHistory?[]:r.baseline,voiceSeen:r.baseline});s.requests=s.requests.filter(x=>x!==r);
   }else if(data.action==='reject')s.requests=s.requests.filter(r=>r.id!==data.id);
   else if(data.action==='update'){
    const b=s.bindings.find(b=>b.sessionId===data.sessionId);if(!b)throw new Error('会话未绑定');
    if(data.main===true){for(const x of s.bindings)x.main=false;b.main=true;}
    if(typeof data.voice==='boolean')b.voice=data.voice;
   }else if(data.action==='unbind'){
    const wasMain=s.bindings.find(b=>b.sessionId===data.sessionId)?.main;s.bindings=s.bindings.filter(b=>b.sessionId!==data.sessionId);if(wasMain&&s.bindings.length)s.bindings[0].main=true;
    if(data.forget===true)s.messages=s.messages.filter(m=>m.sessionId!==data.sessionId);
   }else throw new Error('未知绑定操作');
   return {ok:true};
  });},
  sync(sessionId,messages){return mutate(s=>{
   const b=s.bindings.find(b=>b.sessionId===sessionId);if(!b)throw new Error('此 DSH 会话未绑定共享记忆');
   if(!Array.isArray(messages)||messages.length>50)throw new Error('每批最多 50 条消息');
   const seen=new Set(b.seen),voiceSeen=new Set(b.voiceSeen),learn=[],replies=[];
   for(const m of messages){
    if(!validId(m.id)||!['user','assistant'].includes(m.role)||typeof m.text!=='string'||m.text.length>8000)throw new Error('共享消息格式错误');
    if(!m.text.trim())continue;
    if(!seen.has(m.id)){
     if(s.messages.length>=20000)throw new Error('共享记录已达上限，请整理后再同步');
     s.messages.push({sessionId,id:m.id,role:m.role,text:m.text,at:Date.now()});seen.add(m.id);if(m.role==='user')learn.push(m.text);
    }
    if(!voiceSeen.has(m.id)){voiceSeen.add(m.id);if(m.role==='assistant')replies.push({id:m.id,text:m.text,voice:b.voice});}
   }
   b.seen=[...seen];b.voiceSeen=[...voiceSeen];return {saved:learn.length,replies,learn};
  });},
  search(sessionId,query){
   if(!binding(sessionId))return {bound:false,messages:[]};
   const terms=words(String(query).slice(0,2000));
   const rows=state.messages.map((m,index)=>({m,index,score:[...terms].reduce((n,w)=>n+(m.text.toLowerCase().includes(w)?1:0),0)})).filter(r=>!terms.size||r.score>0).sort((a,b)=>b.score-a.score||b.index-a.index).slice(0,6);
   return {bound:true,messages:rows.map(({m})=>({...m,text:m.text.slice(0,1000)}))};
  }
 };
}
