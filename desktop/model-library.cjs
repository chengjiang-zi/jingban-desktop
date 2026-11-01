const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
async function inspectModel(entry){
  if(typeof entry!=='string'||!entry.toLowerCase().endsWith('.model3.json'))throw new Error('请选择 .model3.json 文件');
  const base=await fs.realpath(path.dirname(entry));
  const data=JSON.parse(await fs.readFile(entry,'utf8')),r=data.FileReferences;
  if(!r?.Moc||!Array.isArray(r.Textures)||!r.Textures.length)throw new Error('模型缺少骨架或贴图');
  const references=[r.Moc,...r.Textures,...['DisplayInfo','Physics','Pose','UserData'].map(k=>r[k]).filter(Boolean),...(r.Expressions||[]).map(x=>x.File),...Object.values(r.Motions||{}).flat().flatMap(x=>[x.File,x.Sound].filter(Boolean))];
  for(const item of references){
    if(typeof item!=='string')throw new Error('模型资源路径错误');
    const real=await fs.realpath(path.resolve(base,item));
    if(!real.startsWith(base+path.sep))throw new Error('模型资源必须位于模型文件夹内');
  }
  const moc=await fs.open(path.join(base,r.Moc),'r');try{const header=Buffer.alloc(4);await moc.read(header,0,4,0);if(header.toString()!=='MOC3')throw new Error('不是有效的 Cubism MOC3 骨架文件');}finally{await moc.close();}
  let bongo=false;
  if(r.DisplayInfo){try{const cdi=JSON.parse(await fs.readFile(path.join(base,r.DisplayInfo),'utf8'));bongo=cdi.Parameters?.some(p=>p.Id==='CatParamLeftHandDown')||false;}catch{}}
  return {id:crypto.createHash('sha256').update(entry).digest('hex').slice(0,20),name:path.basename(base),entry,kind:bongo?'bongo':'live2d'};
}
class ModelLibrary{
  constructor(directory,store,changed){this.file=path.join(directory,'model-library.json');this.directory=directory;this.store=store;this.changed=changed;this.items=[];this.queue=Promise.resolve();}
  async init(){try{this.items=JSON.parse(await fs.readFile(this.file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
    const entry=this.store.get().model.entry;if(entry)try{await this.remember(entry);}catch{}
    try{for(const folder of await fs.readdir(path.join(this.directory,'models'),{withFileTypes:true})){if(!folder.isDirectory())continue;const base=path.join(this.directory,'models',folder.name);for(const file of await fs.readdir(base))if(file.endsWith('.model3.json'))try{await this.remember(path.join(base,file));}catch{}}}catch(e){if(e.code!=='ENOENT')throw e;}
    return this;
  }
  async remember(entry){const item=await inspectModel(entry);this.items=this.items.filter(x=>x.entry!==entry);this.items.push(item);await fs.writeFile(this.file,JSON.stringify(this.items,null,2));return item;}
  list(){return {items:this.items,selected:this.store.get().model.entry};}
  run(job){const pending=this.queue.then(job);this.queue=pending.catch(()=>{});return pending;}
  select(id){return this.run(async()=>{const item=this.items.find(x=>x.id===id);if(!item)throw new Error('模型不在角色库中');await inspectModel(item.entry);await this.store.save({model:{entry:item.entry}});this.changed(item);return this.list();});}
  import(entry){return this.run(async()=>{const item=await this.remember(entry);await this.store.save({model:{entry:item.entry}});this.changed(item);return this.list();});}
}
module.exports={ModelLibrary,inspectModel};
