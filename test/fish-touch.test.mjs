import test from 'node:test';
import assert from 'node:assert/strict';
import {Avatar} from '../web/avatar.mjs';
import {defaults,validateConfig} from '../lib/config.mjs';

test('fish touch is opt-in and never uses the large character reactions',()=>{
  const avatar=Object.create(Avatar.prototype);
  avatar.model={}; avatar.bongo=true;
  avatar.touchNotice='old';
  assert.equal(avatar.touch(0,0),null);
  assert.equal(avatar.touchNotice,null);
  assert.equal(avatar.tapUntil,undefined);
  avatar.setFishTouch(true);
  assert.equal(avatar.touch(0,0),'fish');
  assert.ok(avatar.tapUntil>performance.now());
  assert.equal(avatar.touchNotice,null);
  avatar.setFishTouch(false);
  assert.equal(avatar.touch(0,0),null);
});

test('fish touch preference defaults off and accepts only a boolean',()=>{
  assert.equal(defaults.display.fishTouch,false);
  assert.equal(validateConfig({display:{fishTouch:true}}).display.fishTouch,true);
  assert.throws(()=>validateConfig({display:{fishTouch:'yes'}}));
});
