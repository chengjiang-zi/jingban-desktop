import test from 'node:test';
import assert from 'node:assert/strict';
import {gazeTarget,stepGaze} from '../web/gaze.mjs';
test('gaze uses face-relative coordinates, stays bounded, and head follows more slowly than eyes',()=>{
 const bounds={x:100,y:50,width:300,height:600};
 const center=gazeTarget({x:250,y:158},bounds);assert.equal(center.x,0);assert.equal(center.y,0);
 const target=gazeTarget({x:3000,y:-1000},bounds);assert.ok(target.x>0&&target.x<=1);assert.ok(target.y>0&&target.y<=1);
 const first=stepGaze({x:0,y:0,hx:0,hy:0},target,1/30);assert.ok(first.x>first.hx);assert.ok(first.y>first.hy);
 let state=first;for(let i=0;i<120;i++)state=stepGaze(state,gazeTarget(null,bounds),1/30);
 for(const v of Object.values(state))assert.ok(Math.abs(v)<.00001);
 const translated=gazeTarget({x:3100,y:-900},{...bounds,x:200,y:150});assert.deepEqual(translated,target);
});
