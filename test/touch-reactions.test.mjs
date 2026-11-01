import test from 'node:test';
import assert from 'node:assert/strict';
import {reactions,chooseReaction,touchPose,TouchSequence} from '../web/touch-reactions.mjs';
test('touch reactions avoid immediate repeats and cover all six reactions across regions',()=>{
 const seen=new Set();for(const zone of ['head','body','edge']){let last;for(let i=0;i<12;i++){const next=chooseReaction(zone,last,()=>i%3/3);assert.notEqual(next,last);seen.add(next);last=next;}}
 assert.equal(seen.size,6);
});

test('rapid clicks transition from the current pose and combo reactions reset after a pause',()=>{
 const sequence=new TouchSequence();sequence.trigger('head',-1,0,()=>0);
 const before=sequence.sample(350);sequence.trigger('body',1,350,()=>0);
 assert.deepEqual(sequence.sample(350),before);
 for(const [key,value] of Object.entries(sequence.sample(351)))assert.ok(Math.abs(value-before[key])<.01);
 assert.deepEqual(sequence.sample(10000),touchPose(null,0));
 const combo=new TouchSequence();const found=[];
 for(let i=0;i<8;i++){const result=combo.trigger('head',1,i*120,()=>0);if(result.notice)found.push(result.kind);}
 assert.deepEqual(found,['cuddle','dance','dizzy']);
 assert.equal(combo.trigger('head',1,3000,()=>0).notice,null);
 assert.ok(!reactions[combo.kind].notice);
});
test('every reaction settles back to neutral and does not control audio mouth opening',()=>{
 for(const [kind,reaction] of Object.entries(reactions)){
   for(let t=0;t<=reaction.duration;t+=50){const p=touchPose(kind,t,-1);assert.ok(Object.values(p).every(Number.isFinite));assert.ok(p.eyeL>=0&&p.eyeL<=1&&p.eyeR>=0&&p.eyeR<=1);assert.equal('mouthOpen' in p,false);}
   assert.deepEqual(touchPose(kind,reaction.duration),touchPose(null,0));
   for(const [key,value] of Object.entries(touchPose(kind,0)))assert.ok(Math.abs(value-touchPose(null,0)[key])<1e-9);
 }
});
