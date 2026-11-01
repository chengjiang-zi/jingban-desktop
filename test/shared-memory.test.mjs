import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createSharedMemory} from '../lib/shared-memory.mjs';
import {installSharedMemory,visibleMessages} from '../integrations/dsh-plugin/shared.mjs';
test('shared memory requires approval, shares bound history, persists and never replays cleared messages',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'jingban-shared-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));let bank=await createSharedMemory(dir);
 const r=await bank.request({sessionId:'a',title:'A',baseline:['old']});assert.equal(bank.search('a','猫').bound,false);
 await assert.rejects(bank.sync('a',[]));await bank.edit({action:'approve',id:r.id,includeHistory:false});
 const m=[{id:'old',role:'user',text:'old private'},{id:'new',role:'user',text:'我喜欢小猫和蓝色'},{id:'reply',role:'assistant',text:'好呀'}];
 const first=await bank.sync('a',m);assert.equal(first.saved,1);assert.equal(first.replies.length,1);assert.equal((await bank.sync('a',m)).replies.length,0);
 const b=await bank.request({sessionId:'b',title:'B',baseline:[]});await bank.edit({action:'approve',id:b.id,main:true});assert.equal(bank.state().bindings.filter(b=>b.main).length,1);assert.match(bank.search('b','小猫').messages[0].text,/小猫/);
 bank=await createSharedMemory(dir);assert.equal(bank.state().messageCount,2);await bank.clear();await bank.sync('a',m);assert.equal(bank.state().messageCount,0);
 await bank.edit({action:'unbind',sessionId:'a'});assert.equal(bank.search('a','小猫').bound,false);await assert.rejects(bank.sync('a',m));
});
test('history opt-in imports old text without speaking it and filters reasoning/tool output',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'jingban-history-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const bank=await createSharedMemory(dir);
 const r=await bank.request({sessionId:'a',title:'A',baseline:['old']});await bank.edit({action:'approve',id:r.id,includeHistory:true});const result=await bank.sync('a',[{id:'old',role:'assistant',text:'旧回复'}]);assert.equal(result.replies.length,0);assert.equal(bank.state().messageCount,1);
 const agent={session:{deriveMessages:()=>[{id:'jingban-memory-x',role:'user',content:[{type:'text',text:'injected'}]},{id:'u',role:'user',content:[{type:'text',text:'hi'}]},{id:'a',role:'assistant',content:[{type:'reasoning',text:'secret'},{type:'text',text:'hello'}]},{id:'runtime',role:'user',source:{kind:'runtime-context'},content:[{type:'text',text:'runtime paths'}]},{id:'t',role:'tool',content:[{type:'text',text:'file contents'}]}]}};
 assert.deepEqual(visibleMessages(agent).map(m=>m.text),['hi','hello']);
});
test('DSH memory hook preserves next decision and leaves unbound conversations untouched',async()=>{
 const handlers={},requests=[],disposers=[];const ctx={agents:{get:()=>null},on:(name,fn)=>handlers[name]=fn,effect:fn=>disposers.push(fn())};
 const shared=installSharedMemory(ctx,async(route,data)=>{requests.push({route,data});if(route==='/v1/memory/bindings')return {bindings:[{sessionId:'bound',main:true}]};if(route==='/v1/memory/context')return {bound:true,notes:['喜欢蓝色'],messages:[]};return {replies:[]};});
 await new Promise(r=>setImmediate(r));const decision={kind:'enter',messages:[{id:'u',role:'user',content:[{type:'text',text:'颜色'}]}],startsRequestSeries:true};
 const payload={agent:{id:'other'},messages:decision.messages,signal:new AbortController().signal};assert.equal(await handlers['agent/pre-step'](payload,async()=>decision),decision);assert.equal(requests.some(r=>r.route.endsWith('/context')),false);
 const agent={id:'bound',status:'running',session:{deriveMessages:()=>[]}};const next=await handlers['agent/pre-step']({...payload,agent},async()=>decision);assert.equal(next.startsRequestSeries,true);assert.match(next.messages[0].id,/^jingban-memory-/);assert.equal(next.messages[1],decision.messages[0]);assert.equal(shared.primary(),'bound');disposers.forEach(fn=>fn());
});

test('muting a bound conversation preserves text delivery without replaying past replies',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'jingban-mute-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const bank=await createSharedMemory(dir);
 const r=await bank.request({sessionId:'quiet',title:'Quiet',baseline:[]});await bank.edit({action:'approve',id:r.id,voice:false});
 const message={id:'reply',role:'assistant',text:'text remains visible'};
 assert.deepEqual((await bank.sync('quiet',[message])).replies,[{id:'reply',text:message.text,voice:false}]);
 await bank.edit({action:'update',sessionId:'quiet',voice:true});assert.equal((await bank.sync('quiet',[message])).replies.length,0);
});

import {installMemoryTool} from '../integrations/dsh-plugin/memory-tool.mjs';
test('binding tool submits only the invoking conversation and validates titles',async()=>{
 let tool,request;installMemoryTool({tools:{register:t=>{tool=t;}}},async(route,data)=>{request={route,data};return {status:'pending',id:'request'};});
 assert.equal(tool.parameters.type,'object');
 const execution={agent:{id:'only-this-session',session:{deriveMessages:()=>[{id:'visible',role:'user'},{id:'tool-output',role:'tool'}]}}};
 await assert.rejects(tool.execute({title:''},execution));
 await assert.rejects(tool.execute({title:'a',sessionId:'other'},execution));
 const result=await tool.execute({title:'测试会话'},execution);assert.equal(result.status,'pending');assert.equal(request.data.sessionId,'only-this-session');assert.deepEqual(request.data.baseline,['visible']);assert.match(tool.output.render({},result)[0].text,/确认/);
});
