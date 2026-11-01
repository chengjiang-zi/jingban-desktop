import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createMem0} from '../lib/mem0.mjs';

test('real Mem0 persists, recalls, edits and forgets with configurable model APIs',async t=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'companion-mem0-'));let llmCalls=0;
 const mock=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const b=JSON.parse(raw);res.setHeader('Content-Type','application/json');
   if(req.url.endsWith('/embeddings')){const inputs=Array.isArray(b.input)?b.input:[b.input];res.end(JSON.stringify({data:inputs.map((_,index)=>({index,embedding:[1,0,0]}))}));}
   else{llmCalls++;assert.ok(b.messages.every(m=>typeof m.content==='string'));res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({memory:[{id:'0',text:'用户喜欢蓝色',attributed_to:'user'}]})}}]}));}
 });await new Promise(r=>mock.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${mock.address().port}/v1`,config={memory:'mem0',connectionMode:'direct',chat:{baseUrl:base,model:'test'},mem0:{embeddingProvider:'compatible',embeddingBaseUrl:base,embeddingModel:'test',embeddingDimensions:3}};
 const store={get:()=>config,key:()=>''};let m=createMem0(directory,store);
 t.after(async()=>{await m.close();await new Promise(r=>mock.close(r));await fs.rm(directory,{recursive:true,force:true});});
 await m.learn('我喜欢蓝色');assert.equal(llmCalls,1);let facts=await m.list();assert.equal(facts.length,1);assert.equal(facts[0].memory,'用户喜欢蓝色');
 await m.close();m=createMem0(directory,store);assert.equal((await m.search('颜色偏好'))[0].memory,'用户喜欢蓝色');
 await m.save('用户现在喜欢绿色',facts[0].id);assert.equal((await m.list())[0].memory,'用户现在喜欢绿色');
 await m.delete(facts[0].id);assert.deepEqual(await m.search('颜色偏好'),[]);
 await m.save('迁移后仍然喜欢绿色');const previous=(await m.stores()).find(s=>s.current).scope;
 config.mem0.embeddingModel='replacement-embedding';assert.deepEqual(await m.list(),[]);
 assert.equal((await m.migrate(previous)).imported,1);assert.equal((await m.migrate(previous)).skipped,1);assert.equal(llmCalls,1);
 const exported=await m.export();assert.ok(Array.isArray(exported.results));assert.equal(exported.results[0].memory,'迁移后仍然喜欢绿色');assert.ok(!JSON.stringify(exported).includes('embedding'));
 config.chat.model='replacement-chat';assert.equal((await m.list()).length,1);
 assert.equal((await m.import(exported.results)).skipped,1);
 config.connectionMode='external';await m.learn('不应自动保存');assert.equal(llmCalls,1);config.connectionMode='direct';
 await m.save('将被清空');const delayed=m.learn('也要被清空');const clearing=m.clearAll();await delayed;await clearing;assert.deepEqual(await m.list(),[]);
 assert.ok((await m.stores()).every(s=>s.count===0));
});
