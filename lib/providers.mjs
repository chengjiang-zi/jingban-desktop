import { endpoint } from './config.mjs';
import { speechText } from './speech-text.mjs';

const auth = key => key ? { Authorization: `Bearer ${key}` } : {};
async function checked(response) {
  if (!response.ok) throw new Error(`服务返回 HTTP ${response.status}，请检查地址、模型和密钥`);
  return response;
}
export async function ttsReady(config, key, signal) {
  if (!config.baseUrl || !config.voice) throw new Error('请配置语音服务地址和音色 ID');
  if (config.kind === 'breeze') {
    const response = await checked(await fetch(endpoint(config.baseUrl, '/v1/voices/' + encodeURIComponent(config.voice)), { headers: auth(key), signal }));
    const voice = await response.json();
    if (!voice.saved || voice.id !== config.voice) throw new Error('固定音色未保存，请先在语音服务中创建该音色');
    if (config.referenceText && voice.ref_text !== config.referenceText && voice.reference_text !== config.referenceText) throw new Error('固定音色参考文本不匹配，请检查音色配置');
    return { ready: true, voice: config.voice, validated: true };
  }
  return { ready: true, voice: config.voice, validated: false, note: '兼容服务音色将在生成时验证' };
}
export async function synthesize(config, key, text, signal) {
  text=speechText(text);
  if(!text)return new Response(new Uint8Array());
  await ttsReady(config,key,signal);
  const body = {input:text,voice:config.voice,response_format:'pcm'};
  if (config.model) body.model=config.model;
  if (config.kind === 'breeze') Object.assign(body,{instructions:config.instructions,seed:config.seed,cfg_scale:1});
  return checked(await fetch(endpoint(config.baseUrl,'/v1/audio/speech'), {method:'POST',headers:{'Content-Type':'application/json',...auth(key)},body:JSON.stringify(body),signal}));
}
export async function chat(config,key,messages,signal) {
  if (!config.baseUrl || !config.model) throw new Error('请先在连接设置中配置对话服务，或由 DSH 调用朗读接口');
  return checked(await fetch(endpoint(config.baseUrl,'/chat/completions'), {method:'POST',headers:{'Content-Type':'application/json',...auth(key)},body:JSON.stringify({model:config.model,messages:[{role:'system',content:config.system},...messages],stream:true}),signal}));
}
export async function transcribe(config,key,body,signal) {
  if (!config.baseUrl || !config.model) throw new Error('请先配置本地或远程语音识别服务');
  const form = new FormData();
  form.append('model',config.model);
  form.append('file',new Blob([Buffer.from(body.audio,'base64')],{type:body.mime}),body.mime.includes('ogg')?'speech.ogg':'speech.webm');
  const response = await checked(await fetch(endpoint(config.baseUrl,'/audio/transcriptions'),{method:'POST',headers:auth(key),body:form,signal}));
  const result=await response.json();
  if(typeof result.text!=='string')throw new Error('识别接口没有返回 text');
  return result.text;
}
