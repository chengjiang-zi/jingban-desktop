import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export const embeddingModel='Xenova/bge-small-zh-v1.5';
const revision='75c43b069aac4d136ba6bc1122f995fedcfd2781';
const files={
 'config.json':['git','d590a6643f5dcdd0cfb0477e3c291488c16fc2d7'],
 'tokenizer.json':['git','cdb3043fc938fc918c06e66cf704c2ba58f88747'],
 'tokenizer_config.json':['git','3a59388f0fd1bd22dec2ce7902c1be8e1fb84107'],
 'onnx/model_quantized.onnx':['sha256','15b717c382bcb518ba457b93ea6850ede7f4f1cd8937454aa06972366cd19bcc']
};
async function valid(file,[algorithm,hash]){try{const data=await fs.readFile(file);const h=crypto.createHash(algorithm==='git'?'sha1':algorithm);if(algorithm==='git')h.update(`blob ${data.length}\0`);return h.update(data).digest('hex')===hash;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
async function prepare(directory){
 const root=path.resolve(directory,'embedding-models','bge-small-zh-v1.5');
 for(const [name,hash] of Object.entries(files)){
   const target=path.join(root,name);if(await valid(target,hash))continue;
   await fs.mkdir(path.dirname(target),{recursive:true});
   const curl=process.platform==='win32'?path.join(process.env.SystemRoot||'C:/Windows','System32','curl.exe'):'curl';
   await exec(curl,['--fail','--location','--silent','--show-error','--retry','2','--max-time','180',`https://huggingface.co/${embeddingModel}/resolve/${revision}/${name}`,'--output',target+'.download'],{windowsHide:true,timeout:550000});
   if(!await valid(target+'.download',hash))throw new Error('中文检索模型校验失败，请重试准备模型');
   await fs.rename(target+'.download',target);
 }
 return root;
}
export function localEmbeddings(directory){
  let loading;
  async function ready(){
    if(!loading)loading=(async()=>{
      const {pipeline}=await import('@huggingface/transformers');
      return pipeline('feature-extraction',await prepare(directory),{dtype:'q8',device:'cpu',local_files_only:true});
    })().catch(e=>{loading=null;throw e;});
    return loading;
  }
  async function embed(text){const model=await ready();const result=await model(text,{pooling:'cls',normalize:true});return Array.from(result.data);}
  return {embedQuery:embed,embedDocuments:async texts=>{const out=[];for(const text of texts)out.push(await embed(text));return out;}};
}
