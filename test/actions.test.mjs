import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {startServer} from '../server.mjs';
import {installAvatarPrompt,installAvatarTool} from '../integrations/dsh-plugin/avatar-tool.mjs';
import {actionCatalog,actionPrefix,createActionReply,sampleAction,validateAction} from '../web/actions.mjs';

test('composed poses interpolate, return to idle, and reject unsupported or unsafe tracks',()=>{
  const catalog=actionCatalog(['ParamAngleX','ParamAngleZ'],{Greeting:[{File:'wave.motion3.json'}]});
  const action={frames:[[0,{}],[400,{turn:.6,tilt:-.5}],[1000,{}]]};
  assert.deepEqual(validateAction(action,catalog),action);
  assert.deepEqual(sampleAction(action.frames,200),{turn:.3,tilt:-.25});
  assert.deepEqual(sampleAction(action.frames,1000),{});
  assert.deepEqual(validateAction({motion:{group:'Greeting',index:0}},catalog),{motion:{group:'Greeting',index:0},duration:4000});
  for(const frames of [
    [[0,{}],[400,{nod:1}],[1000,{}]], [[0,{}],[400,{tilt:1.1}],[1000,{}]],
    [[0,{}],[400,{tilt:1}],[400,{}]], [[0,{}],[400,{tilt:1}],[9000,{}]],
    [[0,{}],[400,{tilt:1}]], [[0,{}],[400,{}]]
  ])assert.throws(()=>validateAction({frames},catalog));
});

test('action metadata stays out of streamed chat, speech and memory text',()=>{
  const actions=[];
  const parser=createActionReply(action=>actions.push(action));
  const input=actionPrefix+JSON.stringify({preset:'agree'})+'\r\n好呀，点两下。';
  assert.equal([...input].map(c=>parser.push(c)).join('')+parser.push('',true),'好呀，点两下。');
  assert.deepEqual(actions,[{preset:'agree'}]);
  const ordinary=createActionReply(()=>assert.fail('ordinary reply'));
  assert.equal(ordinary.push('你好')+ordinary.push('。',true),'你好。');
  const malformed=createActionReply(()=>assert.fail('invalid action'));
  assert.equal(malformed.push(actionPrefix+'x'.repeat(4000))+malformed.push('\n你好。'),'你好。');
});

test('external actions are validated for the active model and switch',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'jingban-actions-'));
  const app=await startServer({port:0,directory:dir});
  t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
  const page=await fetch(app.origin);
  const headers={Cookie:page.headers.get('set-cookie').split(';')[0],'Content-Type':'application/json'};
  const request=(route,data)=>fetch(app.origin+route,{headers,...(data?{method:'POST',body:JSON.stringify(data)}:{})});
  const model=path.join(dir,'test.model3.json');
  await fs.writeFile(model,JSON.stringify({FileReferences:{DisplayInfo:'test.cdi3.json',Motions:{Test:[{File:'motion.motion3.json'}]}}}));
  await fs.writeFile(path.join(dir,'test.cdi3.json'),JSON.stringify({Parameters:[{Id:'ParamAngleZ'}]}));
  await app.store.save({model:{entry:model,core:'configured.js'}});
  const events=await request('/api/events?client=animation-test');
  const {actions}= (await (await request('/v1/capabilities')).json()).avatar;
  assert.deepEqual(actions.channels,['tilt']);
  assert.equal(actions.native[0].group,'Test');
  const payload={command:'animate',modelVersion:actions.modelVersion,action:{preset:'curious'}};
  assert.equal((await request('/v1/commands',payload)).status,202);
  assert.equal((await request('/v1/commands',{...payload,modelVersion:'other-model'})).status,400);
  assert.equal((await request('/v1/commands',{...payload,action:{frames:[[0,{}],[300,{nod:.8}],[600,{}]]}})).status,400);
  await app.store.save({display:{aiActions:false}});
  assert.equal((await request('/v1/commands',payload)).status,400);
  assert.equal((await request('/v1/commands',{command:'perform',expression:'happy'})).status,202);
  await events.body.cancel();
});

test('DSH system prompt only suggests the action tool when the current session can use it',async()=>{
  let hook,requests=0;
  const state={connectionMode:'external',players:1,avatar:{actions:{}}};
  installAvatarPrompt({on(name,handler){assert.equal(name,'system-prompt/assemble');hook=handler;}},async route=>{
    assert.equal(route,'/v1/capabilities');
    requests++;
    return state;
  },id=>id==='bound');
  const assembly={sections:[{name:'original',text:'原角色设定'}],tools:[{name:'jingban_avatar_action'}]};
  const run=(id,result=assembly)=>hook({}, {agent:{id}},async()=>result);
  assert.equal(await run('other'),assembly);
  const restricted={...assembly,tools:[]};
  assert.equal(await run('bound',restricted),restricted);
  assert.equal(requests,0);
  const expanded=await run('bound');
  assert.equal(expanded.sections[0],assembly.sections[0]);
  assert.match(expanded.sections[1].text,/实际调用 jingban_avatar_action/);
  state.avatar.actions=null;
  assert.equal(await run('bound'),assembly);
  state.avatar={}; // Legacy desktop release with no avatar action catalogue.
  assert.equal(await run('bound'),assembly);
});

test('DSH action tool only submits from the invoking, approved conversation',async()=>{
  let tool;
  const calls=[];
  installAvatarTool({tools:{register(value){tool=value;}}},async(route,data)=>{
    calls.push([route,data]);
    if(route==='/v1/memory/bindings')return {connectionMode:'external',generation:4,bindings:[{sessionId:'bound'}]};
    if(route==='/v1/capabilities')return {avatar:{actions:{modelVersion:'model'}}};
    return {status:'queued',id:'task'};
  },{sharedMemory:true});
  await assert.rejects(()=>tool.execute({}, {agent:{id:'other'}}),/已绑定/);
  const execution={agent:{id:'bound'}};
  assert.equal((await tool.execute({},execution)).actions.modelVersion,'model');
  assert.deepEqual(await tool.execute({modelVersion:'model',action:{preset:'agree'}},execution),{status:'queued',taskId:'task'});
  assert.equal(calls.at(-1)[1].routeGeneration,4);
});
