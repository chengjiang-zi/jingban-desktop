import {McpServer} from '@modelcontextprotocol/server';
import {StdioServerTransport} from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export function createBridge({baseUrl,tokenFile}) {
  const url=new URL(baseUrl);
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.pathname!=='/'||url.username||url.password||url.search||url.hash)throw new Error('MCP bridge only connects to an explicit 127.0.0.1 HTTP endpoint');
  const server=new McpServer({name:'jingban-companion',version:'0.1.0'});
  const result=value=>({content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value});
  async function call(route,data,signal){
    const token=(await fs.readFile(tokenFile,'utf8')).trim();
    const response=await fetch(baseUrl.replace(/\/$/,'')+route,{method:data?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
    const body=await response.json();if(!response.ok)throw new Error(body.error||`Companion HTTP ${response.status}`);return body;
  }
  server.registerTool('companion_capabilities',{description:'Query the locally running companion. Reports configured providers and whether a playback window is connected. This does not grant access to memory, camera or screen.',inputSchema:z.object({}),annotations:{readOnlyHint:true}},async(_args,extra)=>result(await call('/v1/capabilities',undefined,extra.signal)));
  server.registerTool('companion_present',{description:'Ask the local avatar to speak text, show a message, show an expression or display task status. Returns a queued task, not proof of playback completion. Use companion_state to check completion. Does not execute desktop actions or save memory.',inputSchema:z.object({command:z.enum(['speak','show_message','perform','set_task_status']),text:z.string().max(2000).optional(),expression:z.enum(['neutral','happy','thinking','surprised']).optional(),requestId:z.string().regex(/^[\w-]{1,100}$/).optional()})},async(args,extra)=>result(await call('/v1/commands',args,extra.signal)));
  server.registerTool('companion_state',{description:'Read task status. completed for a speak task means all received audio has finished playback. error and cancelled are not success.',inputSchema:z.object({taskId:z.string().optional()}),annotations:{readOnlyHint:true}},async(args,extra)=>{const state=await call('/v1/state',undefined,extra.signal);if(args.taskId)state.tasks=state.tasks.filter(t=>t.id===args.taskId);return result(state);});
  server.registerTool('companion_inputs',{description:'Poll user messages explicitly submitted in external-agent mode. Returns only shared text and optional frames, not local memory. Save cursor and pass it as after next time; reply with companion_present. This tool does not wake or run the agent automatically.',inputSchema:z.object({after:z.number().int().min(0).default(0)}),annotations:{readOnlyHint:true}},async(args,extra)=>{const data=await call('/v1/inputs?after='+args.after,undefined,extra.signal);const images=data.inputs.filter(i=>i.image);const safe={...data,inputs:data.inputs.map(({image,...item})=>({...item,hasImage:!!image}))};const out=result(safe);for(const item of images)out.content.push({type:'text',text:'用户输入 '+item.id+' 附加的画面：'},{type:'image',mimeType:'image/jpeg',data:item.image.split(',')[1]});return out;});
  server.registerTool('companion_stop',{description:'Stop current speech and cancel all queued companion tasks. Does not stop the caller agent or alter its memory.',inputSchema:z.object({})},async(_args,extra)=>result(await call('/v1/commands',{command:'stop'},extra.signal)));
  return server;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const bridge=createBridge({baseUrl:process.env.COMPANION_URL||'http://127.0.0.1:61950',tokenFile:process.env.COMPANION_TOKEN_FILE||path.join(root,'.local/integration-token')});
  await bridge.connect(new StdioServerTransport());
}
