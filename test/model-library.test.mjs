import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const {ModelLibrary,inspectModel}=createRequire(import.meta.url)('../desktop/model-library.cjs');
test('model library remembers the original, imports, switches, persists and rejects broken resources',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'companion-models-'));
  try{
    async function fixture(name,bongo=false){const dir=path.join(root,name);await fs.mkdir(dir);await fs.writeFile(path.join(dir,'model.moc3'),'MOC3fixture');await fs.writeFile(path.join(dir,'texture.png'),'fixture');await fs.writeFile(path.join(dir,'display.json'),JSON.stringify({Parameters:bongo?[{Id:'CatParamLeftHandDown'}]:[]}));const entry=path.join(dir,'cat.model3.json');await fs.writeFile(entry,JSON.stringify({FileReferences:{Moc:'model.moc3',Textures:['texture.png'],DisplayInfo:'display.json'}}));return entry;}
    const original=await fixture('original'),bongo=await fixture('bongo',true);let config={model:{entry:original}},changes=[];
    const store={get:()=>structuredClone(config),save:async patch=>{config=patch;}};
    const lib=await new ModelLibrary(root,store,item=>changes.push(item)).init();
    await lib.import(bongo);assert.equal(config.model.entry,bongo);assert.equal(changes.at(-1).kind,'bongo');assert.equal(lib.list().items.length,2);
    await lib.select(lib.list().items.find(x=>x.entry===original).id);assert.equal(config.model.entry,original);
    const restored=await new ModelLibrary(root,store,()=>{}).init();assert.equal(restored.list().items.length,2);
    await fs.unlink(path.join(root,'bongo/texture.png'));await assert.rejects(()=>lib.select(lib.list().items.find(x=>x.entry===bongo).id));assert.equal(config.model.entry,original);
    await assert.rejects(()=>inspectModel(path.join(root,'file.txt')));
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
