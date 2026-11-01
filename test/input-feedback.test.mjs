import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {validateConfig,defaults} from '../lib/config.mjs';
const {parseInput}=createRequire(import.meta.url)('../desktop/bongo-input.cjs');
test('input frames accept only supported key identifiers, not typed content',()=>{
  assert.deepEqual(parseInput('13|KeyA,KeyA,Space,Num2,private text'),{left:true,right:false,mouseLeft:true,mouseRight:true,keys:['KeyA','Space','Num2']});
  assert.equal(parseInput('99|KeyA'),null);
  assert.deepEqual(parseInput('0|').keys,[]);
  assert.deepEqual(parseInput('2').keys,[]);
});
test('input feedback can be disabled without disabling character or cursor tracking',()=>{
  const config=validateConfig({display:{inputFeedback:false}});
  assert.equal(config.display.inputFeedback,false);
  assert.equal(config.display.character,defaults.display.character);
  assert.equal(config.display.followCursor,defaults.display.followCursor);
  assert.throws(()=>validateConfig({display:{inputFeedback:'false'}}));
});
