import test from 'node:test';
import assert from 'node:assert/strict';
import {createBridge,visibleReply} from '../integrations/dsh-plugin/bridge.mjs';
import {createCompanionClient} from '../integrations/dsh-plugin/client.mjs';
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(){
 let cursor=0,items=[],instanceId='one',resolveIdle,connectionMode='external',generation=0;
 const commands=[],prompts=[],messages=[];
 const agent={status:'idle',session:{deriveMessages:()=>messages},followup(m){prompts.push(m);messages.push(m);this.status='running';this.idle=new Promise(r=>resolveIdle=r);},whenIdle(){return this.idle||Promise.resolve();},cancel(){this.status='idle';resolveIdle?.();},finish(text){messages.push({id:'r'+messages.length,role:'assistant',content:[{type:'reasoning',text:'private reasoning'},{type:'text',text}]});this.status='idle';resolveIdle?.();}};
 const bridge=createBridge({getAgent:()=>agent,call:async(route,data)=>{if(route.startsWith('/v1/inputs'))return {inputs:items.filter(i=>i.id>Number(route.split('=')[1])),cursor,instanceId,connectionMode,generation};commands.push(data);return {};}});
 return {bridge,agent,commands,prompts,send(text,image){items.push({id:++cursor,generation,text,...(image?{image}: {})});},mode(mode){connectionMode=mode;generation++;},restart(){instanceId='two';cursor=0;items=[];}};
}
test('DSH bridge skips old input, sends once, returns only visible final answer',async()=>{
 const f=fixture();f.send('old');await f.bridge.poll();assert.equal(f.prompts.length,0);
 f.send('hello');await f.bridge.poll();await tick();assert.equal(f.prompts.length,1);
 await f.bridge.poll();assert.equal(f.prompts.length,1);
 f.agent.finish('你好');await tick();assert.equal(f.commands.find(c=>c.command==='speak').text,'你好');await f.bridge.close();
});
test('new desktop input cancels prior turn and suppresses stale replies',async()=>{
 const f=fixture();await f.bridge.poll();f.send('one');await f.bridge.poll();await tick();
 f.send('two');await f.bridge.poll();await tick();assert.equal(f.prompts.length,2);assert.equal(f.commands.filter(c=>c.command==='speak').length,0);
 f.agent.finish('second');await tick();assert.deepEqual(f.commands.filter(c=>c.command==='speak').map(c=>c.text),['second']);await f.bridge.close();
});
test('images, server reset and unload cannot silently forward stale or unsupported input',async()=>{
 const f=fixture();await f.bridge.poll();f.send('image','data:image/jpeg;base64,a');await f.bridge.poll();await tick();assert.equal(f.prompts.length,0);assert.match(f.commands.at(-1).text,/仅支持文字/);
 f.restart();await f.bridge.poll();assert.match(f.commands.at(-1).text,/重置/);
 f.send('pending');await f.bridge.poll();await tick();await f.bridge.close();f.agent.finish('late');await tick();assert.equal(f.commands.filter(c=>c.command==='speak').length,0);
});
test('unrelated conversation and reasoning are never returned',()=>{
 assert.equal(visibleReply([{id:'old',role:'assistant',content:[{type:'text',text:'secret'}]}],'missing'),'');
 assert.equal(visibleReply([{id:'u',role:'user'},{id:'a',role:'assistant',content:[{type:'reasoning',text:'hidden'}]},{id:'other',role:'user'},{id:'b',role:'assistant',content:[{type:'text',text:'other reply'}]}],'u'),'');
 for(const baseUrl of ['https://127.0.0.1','http://example.com','http://127.0.0.1/path','http://a:b@127.0.0.1'])assert.throws(()=>createCompanionClient({baseUrl,tokenFile:'unused'}));
});

test('switching back to DSH delivers a newly queued message but skips stale input',async()=>{const f=fixture();await f.bridge.poll();f.send('stale');f.mode('direct');f.mode('external');f.send('fresh');await f.bridge.poll();await tick();assert.equal(f.prompts.length,1);assert.equal(f.prompts[0].content[0].text,'fresh');await f.bridge.close();});
