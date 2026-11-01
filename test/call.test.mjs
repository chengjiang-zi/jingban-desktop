import test from 'node:test';
import assert from 'node:assert/strict';
import {HandsFreeCall} from '../web/call.mjs';

function devices(t){
  let time=0,volume=0,tick,stopped=0;
  const track={stop(){stopped++;}},stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
  const original={};
  const replace=(key,value)=>{original[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
  replace('navigator',{mediaDevices:{getUserMedia:async()=>stream}});
  replace('AudioContext',class{async resume(){}async close(){}createMediaStreamSource(){return {connect(){}};}createAnalyser(){return {fftSize:1024,getFloatTimeDomainData(a){a.fill(volume);}};}});
  const recordings=[];
  replace('MediaRecorder',class{constructor(){this.state='inactive';this.mimeType='audio/webm';recordings.push(this);}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['voice'])});this.onstop?.();}});
  replace('setInterval',f=>{tick=f;return 1;});replace('clearInterval',()=>{});
  replace('performance',{now:()=>time});
  t.after(()=>{for(const [key,value] of Object.entries(original)){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
  return {recordings,stream,stopped:()=>stopped,advance(count,level){volume=level;for(let i=0;i<count;i++){time+=100;tick();}}};
}
test('listening continues during replies and a completed new turn cancels the previous turn',async t=>{
  const d=devices(t);let turns=0;const signals=[],states=[];
  const call=new HandsFreeCall({onState:s=>states.push(s),onError:e=>{throw e;},onTurn:async(b,s)=>{turns++;signals.push(s);assert.ok(b.size);await new Promise(()=>{});}});
  await call.start();d.advance(81,0);await Promise.resolve();assert.equal(turns,0);
  d.advance(5,.1);d.advance(12,0);await Promise.resolve();assert.equal(turns,1);
  assert.equal(d.recordings.at(-1).state,'recording');assert.equal(signals[0].aborted,false);
  d.advance(5,.1);assert.equal(signals[0].aborted,false);
  d.advance(12,0);await Promise.resolve();assert.equal(turns,2);assert.equal(signals[0].aborted,true);
  call.cancelPending();assert.equal(signals[1].aborted,true);assert.equal(call.active,true);assert.equal(d.recordings.at(-1).state,'recording');
  call.stop();assert.equal(d.stopped(),1);assert.equal(call.active,false);
});

test('hanging up while permission/device acquisition is pending releases the late stream',async t=>{
  const d=devices(t);let grant;
  navigator.mediaDevices.getUserMedia=()=>new Promise(r=>grant=r);
  const call=new HandsFreeCall({onState(){},onError(){},onTurn(){assert.fail('must not send');}});
  const pending=call.start();call.stop();grant(d.stream);await pending;
  assert.equal(d.stopped(),1);assert.equal(d.recordings.length,0);assert.equal(call.active,false);
});
test('microphone permission failure resets active state',async t=>{
  devices(t);navigator.mediaDevices.getUserMedia=async()=>{throw new Error('denied');};
  const call=new HandsFreeCall({onState(){},onError(){},onTurn(){}});
  await assert.rejects(call.start(),/denied/);assert.equal(call.active,false);
});
