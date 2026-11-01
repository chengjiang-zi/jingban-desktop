import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createConfigStore,validateConfig} from '../lib/config.mjs';
test('audio preferences survive restart and unrelated saves; invalid gain is rejected',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'jingban-audio-'));
 try{
  const store=await createConfigStore(dir);
  await store.save({audio:{volume:.35,muted:true,autoSpeak:false}});
  await store.save({display:{orb:false}});
  const reopened=await createConfigStore(dir);
  assert.deepEqual(reopened.get().audio,{volume:.35,muted:true,autoSpeak:false});
  for(const volume of [-1,1.01,NaN,Infinity,'0.5'])assert.throws(()=>validateConfig({audio:{volume}}));
  assert.equal(validateConfig({audio:{volume:0}}).audio.volume,0);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
