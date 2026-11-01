import test from 'node:test';
import assert from 'node:assert/strict';
import {outsideCanvas,constrainBongoScene} from '../web/bongo-scene.mjs';
test('Bongo corrections remain confined to rendering and never accumulate across frames',()=>{
  const canvasinfo={PixelsPerUnit:1,CanvasWidth:2,CanvasHeight:2,CanvasOriginX:1,CanvasOriginY:1};
  assert.equal(outsideCanvas(new Float32Array([0,2,.1,3]),canvasinfo),true);
  assert.equal(outsideCanvas(new Float32Array([0,0,.1,2]),canvasinfo),false);
  const eye=new Float32Array([-.1,-.1,.1,.1]),original=eye.slice();let calls=0;
  const core={canvasinfo,drawables:{count:2,ids:['eye','table'],opacities:new Float32Array([1,1]),vertexPositions:[eye,new Float32Array([0,0,1,1])]}};
  const internal={coreModel:{getModel:()=>core},draw(){calls++;assert.equal(core.drawables.opacities[1],0);assert.ok(eye[0]>original[0]);assert.ok(eye[1]<original[1]);}};
  constrainBongoScene(internal,{hideDrawables:['table'],eyes:{eye:{sx:1,sy:1.8,dx:.02}}});
  for(let i=0;i<4;i++){internal.draw();assert.deepEqual(eye,original);assert.equal(core.drawables.opacities[1],1);}
  assert.equal(calls,4);
});
