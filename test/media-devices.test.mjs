import test from 'node:test';
import assert from 'node:assert/strict';
import {openDevice,stopDevices} from '../web/media-devices.mjs';
test('device preference is used and cancelled acquisition stops late tracks',async t=>{
 const originals={};const set=(key,value)=>{originals[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});};
 t.after(()=>{stopDevices();for(const [key,d] of Object.entries(originals))if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];});
 let constraints,grant,stops=0;
 set('localStorage',{getItem:()=>JSON.stringify({audio:'chosen-mic'})});
 set('navigator',{mediaDevices:{getUserMedia:c=>{constraints=c;return new Promise(r=>grant=r);}}});
 const pending=openDevice('audio');assert.equal(constraints.audio.deviceId.exact,'chosen-mic');assert.equal(constraints.audio.echoCancellation,true);
 stopDevices();grant({getTracks:()=>[{stop(){stops++;}}]});await assert.rejects(pending,{name:'AbortError'});assert.equal(stops,1);
});
