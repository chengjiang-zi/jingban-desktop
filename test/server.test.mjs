import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {startServer,safePath} from '../server.mjs';
import {validateConfig} from '../lib/config.mjs';
import {Tasks} from '../lib/tasks.mjs';

async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'companion-test-'));const app=await startServer({port:0,directory:dir});t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});const page=await fetch(app.origin);await page.text();const cookie=page.headers.get('set-cookie').split(';')[0];const request=(route,data,extra={})=>fetch(app.origin+route,{method:data===undefined?'GET':'POST',headers:{cookie,'Content-Type':'application/json',...extra},body:data===undefined?undefined:JSON.stringify(data)});return {...app,dir,cookie,request};}
test('understanding respects hidden display, memory mode and external agent ownership',async t=>{
 const app=await fixture(t);await app.request('/api/memory',{action:'save_note',text:'喜欢蓝色'});
 const value=await(await app.request('/api/understanding')).json();assert.ok(value.score>0);assert.equal(value.facts,1);
 await app.request('/api/config',{display:{showUnderstanding:false}});
 assert.deepEqual(await(await app.request('/api/understanding')).json(),{hidden:true});
 const saved=JSON.parse(await fs.readFile(path.join(app.dir,'runtime-config.json'),'utf8'));assert.equal(saved.display.showUnderstanding,false);
 await app.request('/api/config',{display:{showUnderstanding:true},connectionMode:'external'});
 assert.equal((await(await app.request('/api/understanding')).json()).score,null);
 await app.request('/api/config',{connectionMode:'direct',memory:'none'});
 assert.equal((await(await app.request('/api/understanding')).json()).score,0);
 assert.equal((await fetch(app.origin+'/api/understanding',{headers:{Authorization:`Bearer ${app.store.token}`}})).status,403);
});
test('emoji-only speech completes silently even without a configured voice',async t=>{
 const app=await fixture(t);const response=await app.request('/api/speech',{text:'😊👩🏽‍💻❤️🇨🇳！'});
 assert.equal(response.status,200);assert.deepEqual(JSON.parse(await response.text()),{type:'done',bytes:0});
});
test('external mode queues explicit input while keeping local memories private',async t=>{
 const app=await fixture(t);await app.request('/api/memory',{action:'save_note',text:'private note'});
 await app.request('/api/config',{connectionMode:'external'});
 const queued=await(await app.request('/api/agent-input',{text:'hello agent'})).json();assert.equal(queued.id,1);
 const headers={Authorization:`Bearer ${app.store.token}`};
 const inbox=await(await fetch(app.origin+'/v1/inputs?after=0',{headers})).json();assert.equal(inbox.inputs[0].text,'hello agent');assert.ok(!JSON.stringify(inbox).includes('private note'));
 assert.equal((await fetch(app.origin+'/api/memory',{headers})).status,403);
 assert.deepEqual((await(await fetch(app.origin+'/v1/inputs?after=1',{headers})).json()).inputs,[]);
 assert.equal((await app.request('/api/chat',{messages:[{role:'user',content:'hello'}]})).status,400);
 await app.request('/api/memory/turn',{user:'external',assistant:'reply',generation:0});assert.equal((await(await app.request('/api/memory')).json()).messages.length,0);
});
test('basic memory is injected for direct chat, and model summaries preserve original messages',async t=>{
 const app=await fixture(t);let received;
 const mock=http.createServer(async(req,res)=>{let data='';for await(const c of req)data+=c;received=JSON.parse(data);res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta:{content:'用户喜欢蓝色。'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');});
 await new Promise(r=>mock.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>mock.close(r)));
 await app.request('/api/config',{memory:'basic',chat:{baseUrl:`http://127.0.0.1:${mock.address().port}`,model:'mock'}});
 await app.request('/api/memory/turn',{user:'记住：我喜欢蓝色',assistant:'好的',generation:0});
 await (await app.request('/api/chat',{messages:[{role:'user',content:'我喜欢什么颜色？'}]})).text();assert.ok(JSON.stringify(received.messages).includes('我喜欢蓝色'));
 const summary=await(await app.request('/api/memory',{action:'summarize'})).json();assert.equal(summary.summary,'用户喜欢蓝色。');assert.equal(summary.messages.length,2);
 await app.request('/api/config',{memory:'none'});await(await app.request('/api/chat',{messages:[{role:'user',content:'hi'}]})).text();assert.ok(!JSON.stringify(received.messages).includes('我喜欢蓝色'));
});
test('loopback API rejects unauthenticated, cross-origin and mismatched Host requests',async t=>{
  const app=await fixture(t);
  assert.equal((await fetch(app.origin+'/api/bootstrap')).status,401);
  assert.equal((await app.request('/api/bootstrap',undefined,{Origin:'https://attacker.example'})).status,403);
  const badHostStatus=await new Promise((resolve,reject)=>{const req=http.get(app.origin+'/api/bootstrap',{headers:{Host:'attacker.example',Cookie:app.cookie}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});
  assert.equal(badHostStatus,403);
  assert.equal((await app.request('/api/bootstrap')).status,200);
  const external={Authorization:`Bearer ${app.store.token}`};
  assert.equal((await fetch(app.origin+'/v1/capabilities',{headers:external})).status,200);
  assert.equal((await fetch(app.origin+'/api/bootstrap',{headers:external})).status,403);
  await app.request('/api/config',{integrationEnabled:false});
  assert.equal((await fetch(app.origin+'/v1/capabilities',{headers:external})).status,401);
});
test('configuration persists settings but never returns or writes plaintext API keys',async t=>{
  const app=await fixture(t);
  const response=await app.request('/api/config',{keys:{chat:'private-test-key'},chat:{baseUrl:'http://127.0.0.1:9999/v1',model:'test'}});
  const publicConfig=await response.text();assert.equal(publicConfig.includes('private-test-key'),false);assert.equal(JSON.parse(publicConfig).credentials.chat,true);
  const disk=await fs.readFile(path.join(app.dir,'runtime-config.json'),'utf8');assert.equal(disk.includes('private-test-key'),false);
  assert.equal((await app.request('/api/config',{tts:{sampleRate:17}})).status,400);
  assert.equal((await app.request('/api/config',{chat:{baseUrl:'file:///private'}})).status,400);
});
test('static modules have correct MIME and traversal is rejected',async t=>{
  const app=await fixture(t);const module=await fetch(app.origin+'/app.mjs');assert.match(module.headers.get('content-type'),/javascript/);await module.text();
  assert.throws(()=>safePath(path.resolve('models'),'../secrets'));
  assert.throws(()=>safePath(path.resolve('models'),'../../secret'));
  const response=await fetch(app.origin+'/%2e%2e%5cpackage.json');assert.equal(response.status,400);
});
test('task claim is exclusive, request IDs are idempotent, cancellation cannot become completion',()=>{
  const events=[];const tasks=new Tasks((...event)=>events.push(event));
  const first=tasks.create('speak',{text:'hello'},'req-1');assert.equal(tasks.create('speak',{text:'hello'},'req-1'),first);
  assert.throws(()=>tasks.create('speak',{text:'different'},'req-1'));
  assert.equal(tasks.claim('req-1','one'),true);assert.equal(tasks.claim('req-1','two'),false);
  assert.throws(()=>tasks.finish('req-1','two','completed'));
  tasks.stop();assert.equal(first.status,'cancelled');assert.throws(()=>tasks.finish('req-1','one','completed'));
  const next=tasks.create('perform',{expression:'happy'});tasks.claim(next.id,'one');tasks.disconnect('one');assert.equal(next.status,'error');
});
test('speech proxy validates fixed voice and aligns odd PCM chunks without data loss',async t=>{
  const app=await fixture(t);let invalid=false;
  const mock=http.createServer(async(req,res)=>{if(req.url.startsWith('/v1/voices/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({id:'fixed',saved:true,ref_text:invalid?'wrong':'reference'}));return;}if(req.url==='/v1/audio/speech'){for await(const _ of req){}res.writeHead(200,{'Content-Type':'application/octet-stream'});res.write(Buffer.from([1,2,3]));setTimeout(()=>res.end(Buffer.from([4,5,6])),30);return;}res.writeHead(404);res.end();});
  await new Promise(r=>mock.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>mock.close(r)));
  await app.request('/api/config',{tts:{baseUrl:`http://127.0.0.1:${mock.address().port}`,voice:'fixed',referenceText:'reference'}});
  let response=await app.request('/api/speech',{text:'hello'});assert.equal(response.status,200);const frames=(await response.text()).trim().split('\n').map(JSON.parse);assert.equal(frames[0].sampleRate,24000);assert.equal(frames.at(-1).type,'done');assert.deepEqual([...Buffer.concat(frames.filter(f=>f.type==='audio').map(f=>Buffer.from(f.data,'base64')))],[1,2,3,4,5,6]);
  invalid=true;response=await app.request('/api/speech',{text:'hello'});assert.equal(response.status,400);assert.match((await response.json()).error,/参考文本/);
});
test('unconfigured chat and ASR return actionable errors, vision is gated',async t=>{
  const app=await fixture(t);
  let response=await app.request('/api/chat',{messages:[{role:'user',content:'hello'}]});assert.equal(response.status,400);assert.match((await response.json()).error,/配置/);
  response=await app.request('/api/asr',{audio:'AAAA',mime:'audio/webm'});assert.equal(response.status,400);assert.match((await response.json()).error,/配置/);
  response=await app.request('/api/chat',{messages:[{role:'user',content:[{type:'text',text:'hi'},{type:'image_url',image_url:{url:'data:image/jpeg;base64,AAAA'}}]}]});assert.equal(response.status,400);assert.match((await response.json()).error,/视觉/);
});
test('configuration does not accept unknown provider fields or unsafe sample rates',()=>{
  assert.throws(()=>validateConfig({tts:{kind:'unknown'}}));assert.throws(()=>validateConfig({tts:{sampleRate:100}}));
  assert.equal(validateConfig({chat:{injected:'unexpected'}}).chat.injected,undefined);
});

test('model URLs are isolated across switches so equal texture names cannot reuse the previous character',async t=>{
 const app=await fixture(t);
 for(const name of ['a','b']){await fs.mkdir(path.join(app.dir,name));await fs.writeFile(path.join(app.dir,name,'cat.model3.json'),'{}');await fs.writeFile(path.join(app.dir,name,'texture.png'),name);}
 await app.store.save({model:{entry:path.join(app.dir,'a/cat.model3.json')}});
 const first=(await(await app.request('/api-model-entry')).json()).url;
 assert.equal(await(await app.request(first.replace('cat.model3.json','texture.png'))).text(),'a');
 await app.store.save({model:{entry:path.join(app.dir,'b/cat.model3.json')}});
 const second=(await(await app.request('/api-model-entry')).json()).url;
 assert.notEqual(first,second);assert.equal(await(await app.request(second.replace('cat.model3.json','texture.png'))).text(),'b');
 assert.notEqual((await app.request(first)).status,200);
});

test('DSH binding approval is local-only and switching routes rejects stale replies',async t=>{
 const app=await fixture(t);
 const external=(route,data)=>fetch(app.origin+route,{method:data===undefined?'GET':'POST',headers:{Authorization:`Bearer ${app.store.token}`,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
 await app.request('/api/config',{connectionMode:'external'});
 await app.request('/api/memory',{action:'save_note',text:'shared confirmed note'});
 for(const id of ['first','second']){
  const r=await(await external('/v1/memory/bindings/request',{sessionId:id,title:id,baseline:[]})).json();
  assert.equal((await external('/api/shared-memory',{action:'approve',id:r.id})).status,403);
  assert.equal((await app.request('/api/shared-memory',{action:'approve',id:r.id})).status,200);
 }
 await external('/v1/memory/sync',{sessionId:'first',messages:[{id:'m1',role:'user',text:'whale mint test'}]});
 const context=await(await external('/v1/memory/context',{sessionId:'second',query:'mint'})).json();
 assert.equal(context.bound,true);assert.equal(context.messages[0].text,'whale mint test');assert.ok(JSON.stringify(context.notes).includes('shared confirmed note'));
 await external('/v1/agent-status',{sessionId:'first',available:true});
 assert.equal((await(await app.request('/api/connection-status')).json()).dshOnline,true);
 const generation=(await(await external('/v1/inputs?after=0')).json()).generation;
 await app.request('/api/config',{connectionMode:'direct'});
 assert.equal((await external('/v1/commands',{command:'show_message',text:'stale',routeGeneration:generation})).status,409);
 await app.request('/api/shared-memory',{action:'unbind',sessionId:'second'});
 const denied=await(await external('/v1/memory/context',{sessionId:'second',query:'mint'})).json();assert.equal(denied.bound,false);assert.ok(!JSON.stringify(denied).includes('shared confirmed note'));
});
