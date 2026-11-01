import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import permissionModule from '../desktop/media-permissions.cjs';
const {MediaPermissions}=permissionModule;
test('device grants survive restart, stay separate, and can be revoked',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'companion-permissions-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const file=path.join(dir,'permissions.json'),p=await new MediaPermissions(file).load();let prompts=0;
 const allow=async types=>{prompts++;assert.deepEqual(types,['audio']);return {allowed:true,remember:true};};
 assert.equal(await p.request(['audio'],allow),true);
 const restored=await new MediaPermissions(file).load();assert.equal(await restored.request(['audio'],allow),true);assert.equal(prompts,1);assert.equal(restored.state.video,'ask');
 await restored.run(()=>restored.save({audio:'deny'}));assert.equal(await restored.request(['audio'],allow),false);assert.equal(prompts,1);
 await restored.run(()=>restored.save({audio:'ask'}));await restored.request(['audio'],allow);assert.equal(prompts,2);
 assert.equal(await restored.request([],allow),false);assert.equal(await restored.request(['unknown'],allow),false);
});
test('one-time grants and cancelled prompts do not persist, concurrent requests ask once',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'companion-permissions-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const p=await new MediaPermissions(path.join(dir,'permissions.json')).load();
 assert.equal(await p.request(['video'],async()=>({allowed:false,remember:true})),false);assert.equal(p.state.video,'ask');
 assert.equal(await p.request(['video'],async()=>({allowed:true,remember:false})),true);assert.equal(p.state.video,'ask');
 let prompts=0;const prompt=async()=>{prompts++;return {allowed:true,remember:true};};
 assert.deepEqual(await Promise.all([p.request(['audio'],prompt),p.request(['audio'],prompt)]),[true,true]);assert.equal(prompts,1);
});
