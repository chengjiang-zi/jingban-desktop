// 鲸伴 · 作者澄江子 · MIT
import fs from 'node:fs/promises';
export function createCompanionClient({baseUrl='http://127.0.0.1:61950',tokenFile,timeoutMs=10000}) {
  const url=new URL(baseUrl);
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw new Error('鲸伴地址必须是 http://127.0.0.1:端口');
  if(!tokenFile)throw new Error('请填写鲸伴外部接入页显示的令牌文件路径');
  return async function call(route,data,signal){
    if(!/^\/v1\/(memory\/(?:bindings(?:\/request)?|context|sync)|agent-status|capabilities|state|inputs(?:\?after=\d+)?|commands)$/.test(route))throw new Error('不支持的接口路径');
    const token=(await fs.readFile(tokenFile,'utf8')).trim();
    if(!token)throw new Error('鲸伴令牌文件为空');
    const response=await fetch(url.origin+route,{method:data===undefined?'GET':'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs)});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||`鲸伴接口错误 ${response.status}`);
    return result;
  };
}
