const fs=require('node:fs/promises');
class MediaPermissions {
  constructor(file){this.file=file;this.state={audio:'ask',video:'ask'};this.queue=Promise.resolve();}
  async load(){try{const data=JSON.parse(await fs.readFile(this.file,'utf8'));for(const key of ['audio','video'])if(['ask','allow','deny'].includes(data[key]))this.state[key]=data[key];}catch(e){if(e.code!=='ENOENT')throw e;}return this;}
  run(fn){const job=this.queue.then(fn);this.queue=job.catch(()=>{});return job;}
  async save(patch){for(const [key,value] of Object.entries(patch))if(!['audio','video'].includes(key)||!['ask','allow','deny'].includes(value))throw new Error('设备权限格式错误');const next={...this.state,...patch};await fs.writeFile(this.file+'.tmp',JSON.stringify(next));await fs.rename(this.file+'.tmp',this.file);this.state=next;return {...next};}
  request(types,prompt){return this.run(async()=>{
    if(!types.length||types.some(key=>!['audio','video'].includes(key)))return false;
    if(types.some(key=>this.state[key]==='deny'))return false;
    const missing=types.filter(key=>this.state[key]!=='allow');if(!missing.length)return true;
    const result=await prompt(missing);
    if(result.allowed&&result.remember)await this.save(Object.fromEntries(missing.map(key=>[key,'allow'])));
    return result.allowed;
  });}
}
module.exports={MediaPermissions};
