// 鲸伴 · 作者澄江子 · MIT
import {createCompanionClient} from './dsh-plugin/client.mjs';
const [command,...args]=process.argv.slice(2);
if(!command||command==='help'){
 console.log('用法：node integrations/companion-cli.mjs capabilities | state | inputs [cursor] | speak 文本 | message 文本 | stop');
 console.log('环境变量：COMPANION_URL、COMPANION_TOKEN_FILE（从鲸伴外部接入页获取）');
}else{
 try{
  const call=createCompanionClient({baseUrl:process.env.COMPANION_URL,tokenFile:process.env.COMPANION_TOKEN_FILE});
  const routes={capabilities:'/v1/capabilities',state:'/v1/state'};
  let result;
  if(routes[command])result=await call(routes[command]);
  else if(command==='inputs'){const cursor=Number(args[0]??0);if(!Number.isSafeInteger(cursor)||cursor<0)throw new Error('cursor 必须为非负整数');result=await call('/v1/inputs?after='+cursor);}
  else if(['speak','message','stop'].includes(command))result=await call('/v1/commands',{command:command==='message'?'show_message':command,...(command==='stop'?{}:{text:args.join(' ')})});
  else throw new Error('未知命令，请运行 help');
  console.log(JSON.stringify(result,null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
