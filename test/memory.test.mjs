import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createMemory} from '../lib/memory.mjs';
test('memory survives restart, only explicit notes are added, and edits/deletes persist',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pet-memory-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 let m=await createMemory(dir);await m.append('今天很冷','穿暖一点',0);assert.equal(m.get().notes.length,0);
 await m.append('记住：我喜欢简短回答','记住了',0);m=await createMemory(dir);assert.equal(m.get().messages.length,4);assert.equal(m.get().notes[0].text,'我喜欢简短回答');
 const id=m.get().notes[0].id;await m.edit('save_note',{id,text:'我喜欢中文回答'});assert.ok(m.context().some(x=>x.content.includes('我喜欢中文回答')));
 await m.edit('delete_note',{id});assert.equal((await createMemory(dir)).get().notes.length,0);
});
test('clear prevents late turns and stale summaries from resurrecting deleted conversation',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pet-memory-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const m=await createMemory(dir);
 await m.append('记住：喜欢蓝色','好的',0);const old=m.get();await m.edit('clear_history');assert.equal(m.get().notes.length,1);
 await assert.rejects(m.append('旧请求','旧回复',0));await assert.rejects(m.summary('旧摘要',2,old.revision));assert.equal(m.get().messages.length,0);
 await m.edit('clear_all');assert.equal(m.get().notes.length,0);
});
