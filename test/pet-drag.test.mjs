import test from 'node:test';
import assert from 'node:assert/strict';
import {PetDrag} from '../desktop/pet-drag.cjs';
test('pet follows the OS cursor without accumulating its own window movement',()=>{
  let cursor={x:800,y:600},bounds={x:600,y:200};const moves=[];
  const win={isDestroyed:()=>false,getBounds:()=>({...bounds}),setPosition(x,y){bounds={x,y};moves.push(bounds);}};
  const drag=new PetDrag(()=>({...cursor}));drag.start(win);
  cursor={x:802,y:601};drag.update();assert.equal(moves.length,0);
  cursor={x:850,y:630};drag.update();assert.deepEqual(bounds,{x:650,y:230});
  for(let i=0;i<100;i++)drag.update();assert.equal(moves.length,1);
  cursor={x:820,y:610};drag.update();assert.deepEqual(bounds,{x:620,y:210});
  assert.equal(drag.end(),true);cursor={x:1000,y:1000};drag.update();assert.equal(moves.length,2);
});
test('a click does not move the window and each new drag takes a fresh origin',()=>{
  let cursor={x:20,y:20},bounds={x:0,y:0};const win={isDestroyed:()=>false,getBounds:()=>bounds,setPosition(x,y){bounds={x,y};}};
  const drag=new PetDrag(()=>cursor);drag.start(win);assert.equal(drag.end(),false);
  cursor={x:-100,y:-50};drag.start(win);cursor={x:-120,y:-80};assert.equal(drag.end(),true);assert.deepEqual(bounds,{x:-20,y:-30});
});
