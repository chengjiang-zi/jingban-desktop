import test from 'node:test';
import assert from 'node:assert/strict';
import {scalePet} from '../desktop/pet-size.cjs';
test('enlarging grows the whole window and retains its aspect ratio inside the display',()=>{
  const a={x:0,y:0,width:1920,height:1040},b={x:1500,y:460,width:360,height:560};
  const next=scalePet(b,a,1.12);assert.ok(next.width>b.width&&next.height>b.height);
  assert.ok(Math.abs(next.width/next.height-b.width/b.height)<.003);
  assert.equal(next.y+next.height,b.y+b.height);
  assert.equal(next.x+next.width,b.x+b.width);
  assert.ok(next.x+next.width<=a.width&&next.y+next.height<=a.height);
});
test('alternating sizes keeps the orb anchor fixed without cumulative position drift',()=>{
 const area={x:0,y:0,width:1920,height:1080};let bounds={x:900,y:400,width:360,height:560};
 const right=bounds.x+bounds.width,bottom=bounds.y+bounds.height;
 for(let i=0;i<40;i++){
  bounds=scalePet(bounds,area,i%2?1/1.12:1.12);
  assert.equal(bounds.x+bounds.width,right);assert.equal(bounds.y+bounds.height,bottom);
 }
});
test('repeated enlargement stops at screen bounds, including a display with negative coordinates',()=>{
  const a={x:-1280,y:-100,width:1280,height:900};let b={x:-400,y:300,width:360,height:560};
  for(let i=0;i<30;i++){b=scalePet(b,a,1.12);assert.ok(b.x>=a.x&&b.y>=a.y);assert.ok(b.x+b.width<=a.x+a.width&&b.y+b.height<=a.y+a.height);}
  assert.deepEqual(scalePet(b,a,1.12),b);
});
