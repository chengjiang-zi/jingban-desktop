import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const defaults = {
  model: { entry: '', core: '' },
  tts: { kind: 'breeze', baseUrl: 'http://127.0.0.1:8137', voice: '', model: '', instructions: '用轻快、自然、略带俏皮的语气说普通话，声音清亮而柔和，像和熟悉的朋友聊天，不要播音腔，不要夸张卖萌。', seed: 73, sampleRate: 24000, referenceText: '' },
  chat: { kind: 'compatible', baseUrl: '', model: '', vision: false, system: '你是大肥鱼，一位灵动俏皮、清亮温柔的桌面伙伴。用自然简洁的中文交流，不要假装看到未提供的画面或完成未执行的任务。' },
  asr: { kind: 'compatible', baseUrl: '', model: '' },
  mem0: { llmBaseUrl:'', llmModel:'', embeddingProvider:'local', embeddingBaseUrl:'', embeddingModel:'', embeddingDimensions:1536 },
  audio: { volume: 1, muted: false, autoSpeak: true },
  playback: 'stream', memory: 'basic', connectionMode: 'direct', integrationEnabled: true,
  display: { character: true, orb: true, followCursor: true, showUnderstanding: true, inputFeedback: true }
};

export function endpoint(base, suffix) {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('服务地址需为不含凭据、查询参数的 HTTP(S) 地址');
  return base.replace(/\/+$/, '') + suffix;
}
export function validateConfig(input, current = defaults) {
  const out = structuredClone(current);
  for (const group of ['model','tts','chat','asr','display','mem0','audio']) {
    if (input[group] === undefined) continue;
    if (!input[group] || typeof input[group] !== 'object') throw new Error('配置格式错误');
    for (const key of Object.keys(defaults[group])) {
      if (input[group][key] === undefined) continue;
      if (typeof input[group][key] !== typeof defaults[group][key]) throw new Error(`${group}.${key} 类型错误`);
      if (typeof input[group][key] === 'string' && input[group][key].length > 4000) throw new Error('配置内容过长');
      out[group][key] = input[group][key];
    }
  }
  if (!Number.isFinite(out.audio.volume) || out.audio.volume < 0 || out.audio.volume > 1) throw new Error('音量需在 0–100% 之间');
  for (const group of ['tts','chat','asr']) if (out[group].baseUrl) endpoint(out[group].baseUrl, '');
  for(const key of ['llmBaseUrl','embeddingBaseUrl'])if(out.mem0[key])endpoint(out.mem0[key],'');
  if(!['local','compatible'].includes(out.mem0.embeddingProvider))throw new Error('不支持的检索模型接口');
  if(!Number.isSafeInteger(out.mem0.embeddingDimensions)||out.mem0.embeddingDimensions<1||out.mem0.embeddingDimensions>8192)throw new Error('向量维度需为 1–8192 的整数');
  if (!['breeze','compatible'].includes(out.tts.kind)) throw new Error('不支持的语音适配器');
  if (![16000,22050,24000,44100,48000].includes(out.tts.sampleRate)) throw new Error('不支持的采样率');
  if (!Number.isSafeInteger(out.tts.seed) || out.tts.seed < 0) throw new Error('seed 必须为非负整数');
  if (input.playback !== undefined) {
    if (!['stream','buffered'].includes(input.playback)) throw new Error('播放模式错误');
    out.playback = input.playback;
  }
  if (input.integrationEnabled !== undefined) {
    if (typeof input.integrationEnabled !== 'boolean') throw new Error('接口开关类型错误');
    out.integrationEnabled = input.integrationEnabled;
  }
  if (input.memory !== undefined) {
    if (!['basic','mem0','session','none','external'].includes(input.memory)) throw new Error('记忆模式错误');
    out.memory = input.memory;
  }
  if(input.connectionMode!==undefined){if(!['direct','external'].includes(input.connectionMode))throw new Error('接入模式错误');out.connectionMode=input.connectionMode;}
  return out;
}

export async function createConfigStore(directory, secrets) {
  await fs.mkdir(directory, { recursive: true });
  const filename = path.join(directory, 'runtime-config.json');
  let config = structuredClone(defaults);
  try { config = validateConfig(JSON.parse(await fs.readFile(filename, 'utf8'))); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  let token;
  try { token = (await fs.readFile(path.join(directory, 'integration-token'), 'utf8')).trim(); }
  catch { token = crypto.randomBytes(32).toString('hex'); await fs.writeFile(path.join(directory, 'integration-token'), token, {mode:0o600}); }
  let saveQueue=Promise.resolve();
  const keys = new Map();
  if (secrets?.read) for (const [key,value] of Object.entries(await secrets.read())) keys.set(key,value);
  return {
    directory, token,
    get: () => structuredClone(config),
    key: name => keys.get(name) || '',
    public: () => ({ ...structuredClone(config), credentials: Object.fromEntries(['tts','chat','asr','memoryChat','memoryEmbedding'].map(k=>[k,!!keys.get(k)])), secretsPersistent: !!secrets }),
    save(input) {
      const job=saveQueue.then(async()=>{
      const next = validateConfig(input, config);
      const nextKeys = new Map(keys);
      for (const group of ['tts','chat','asr','memoryChat','memoryEmbedding']) if (typeof input.keys?.[group] === 'string') {
        if (input.keys[group].length > 4096) throw new Error('密钥过长');
        nextKeys.set(group, input.keys[group]);
      }
      await fs.writeFile(filename + '.tmp', JSON.stringify(next,null,2), {mode:0o600});
      await fs.rename(filename + '.tmp',filename);
      if (secrets?.write) await secrets.write(Object.fromEntries(nextKeys));
      config = next;
      keys.clear(); for (const pair of nextKeys) keys.set(...pair);
      return this.public();
      });saveQueue=job.catch(()=>{});return job;
    }
  };
}
