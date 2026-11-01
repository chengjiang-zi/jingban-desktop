import test from 'node:test';
import assert from 'node:assert/strict';
import {Avatar} from '../web/avatar.mjs';

test('model selected on a hidden page restores drawing buffer when shown',()=>{
  const sizes=[], scales=[];
  const renderer={width:0,height:0,resolution:2,resize(w,h){sizes.push([w,h]);this.width=w*2;this.height=h*2;}};
  const avatar={container:{clientWidth:0,clientHeight:0},app:{renderer},bongo:true,
    model:{internalModel:{width:600,height:400},scale:{set(v){scales.push(v);}},position:{set(){}}}};
  Avatar.prototype.fit.call(avatar);
  assert.deepEqual(sizes,[]);
  assert.deepEqual(scales,[]);
  Object.assign(avatar.container,{clientWidth:480,clientHeight:320});
  Avatar.prototype.fit.call(avatar);
  assert.deepEqual(sizes,[[480,320]]);
  assert.equal(scales[0],.768);
  Avatar.prototype.fit.call(avatar);
  assert.equal(sizes.length,1);
  avatar.container.clientWidth=600;
  Avatar.prototype.fit.call(avatar);
  assert.deepEqual(sizes[1],[600,320]);
});
