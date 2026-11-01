import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

test('typing during a call replaces pending chat and voice submissions preserve the draft',async()=>{
 const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',disabled:false,hidden:false,classList:{add(){},remove(){},toggle(){}},append(){},removeAttribute(){},setAttribute(){},scrollHeight:0});return elements.get(id);};
 const requests=[];
 const sandbox={console,AbortController,TextDecoder,Uint8Array,performance,crypto:{randomUUID:()=> 'test'},
  document:{querySelector:s=>s==='.welcome'?null:element(s),createElement:()=>({append(){}})},
  BroadcastChannel:class{postMessage(){}},HandsFreeCall:class{constructor(options){Object.assign(this,options);this.active=true;}cancelPending(){this.cancelCount=(this.cancelCount||0)+1;}},
  fetch:(url,options)=>new Promise((resolve,reject)=>{requests.push({url,options,resolve});options.signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true});}),
  setTimeout,clearTimeout};
 const source=(await fs.readFile(new URL('../web/app.mjs',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace('init().catch(fail);','');
 vm.createContext(sandbox);vm.runInContext(source+`
 config={connectionMode:'direct',chat:{baseUrl:'http://test',model:'test',vision:false},memory:'session'};
 context={resume:async()=>{}};avatar={setMouth(){},perform(){}};
 globalThis.chatTest={sendChat,stopLocal,controls,call};`,sandbox);
 const h=sandbox.chatTest;h.controls(true);assert.equal(element('#send').disabled,false);
 element('#prompt').value='第一条';const first=h.sendChat();await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,1);assert.equal(element('#prompt').value,'');
 element('#prompt').value='换一个问题';const second=h.sendChat();await Promise.resolve();await Promise.resolve();
 assert.equal(requests[0].options.signal.aborted,true);assert.equal(requests.length,2);
 assert.equal(JSON.parse(requests[1].options.body).messages.at(-1).content,'换一个问题');
 element('#prompt').value='还没打完的草稿';const voice=h.sendChat('语音补充',true);await Promise.resolve();await Promise.resolve();
 assert.equal(requests[1].options.signal.aborted,true);assert.equal(requests.length,3);
 assert.equal(element('#prompt').value,'还没打完的草稿');assert.equal(h.call.cancelCount,2);assert.equal(h.call.active,true);
 h.stopLocal();await Promise.all([first,second,voice]);assert.equal(element('#send').disabled,false);
});
