import {setupSharedMemory} from './shared-memory.mjs';
import {showWelcome} from './welcome.mjs';
import {setupModelLibrary} from './model-library.mjs';
import {attachUnderstanding} from './understanding.mjs';
import {setupMem0} from './mem0-panel.mjs';
import {attachTouchFeedback} from './touch-feedback.mjs';
import {Avatar} from './avatar.mjs';
import {PCMPlayer} from './pcm.mjs';
import {HandsFreeCall} from './call.mjs';
import {openDevice,setupDevices,stopDevices} from './media-devices.mjs';
const $=selector=>document.querySelector(selector);
const client=crypto.randomUUID();
const avatarChannel=new BroadcastChannel('companion-avatar');
let memoryGeneration=0,editingNote=null;
let config,avatar,context,analyser,outputGain,player,speechController,chatController,capture,recorder,recordTimer,attachedImage,epoch=0,queue=Promise.resolve(),history=[],busy=false,lastTelemetry=0,telemetryPending=false,lastBroadcast=0,wasSpeaking=false;
const status=(text,error=false)=>{$('#status').textContent=text;$('#status').classList.toggle('error',error);};
async function api(url,data,signal){const response=await fetch(url,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal});if(!response.ok){let error;try{error=(await response.json()).error;}catch{}throw new Error(error||`HTTP ${response.status}`);}return response;}
function message(role,text){const welcome=$('.welcome');if(welcome)welcome.remove();const node=document.createElement('div');node.className='message '+role;const label=document.createElement('small');label.textContent=role==='user'?'你':'大肥鱼';const content=document.createElement('span');content.textContent=text;node.append(label,content);$('#messages').append(node);$('#messages').scrollTop=$('#messages').scrollHeight;return content;}
function fail(error){status(error.message||String(error),true);}
function controls(on){busy=on;$('#read').disabled=on||call.active;$('#send').disabled=false;$('#playback').disabled=on;}
async function audioReady(){if(!context){context=new AudioContext();analyser=context.createAnalyser();analyser.fftSize=512;outputGain=context.createGain();analyser.connect(outputGain);outputGain.connect(context.destination);applyAudio();}await context.resume();}
function stopLocal(){epoch++;speechController?.abort();chatController?.abort();player?.stop();avatar?.setMouth(0);queue=Promise.resolve();controls(false);$('#avatar-state').textContent='安静陪着你';status('已停止 · 待播语音已清空');}
async function speak(text,expectedEpoch=epoch){
  if(expectedEpoch!==epoch)return;
  await audioReady();if(expectedEpoch!==epoch)return;
  speechController=new AbortController();const controller=speechController;
  const mode=$('#playback').value;const chunks=[];let sampleRate=24000,done=false,first=true;
  if(!chatController)avatarChannel.postMessage({text});
  const started=performance.now();player=new PCMPlayer(context,analyser);const currentPlayer=player;
  controls(true);$('#avatar-state').textContent='正在准备声音';status(mode==='stream'?'正在生成，首段到达后播放…':'正在生成完整语音…');
  try{
    const response=await api('/api/speech',{text},controller.signal);const reader=response.body.getReader();const decoder=new TextDecoder();let pending='';
    while(true){const next=await reader.read();if(controller.signal.aborted)return;pending+=decoder.decode(next.value||new Uint8Array(),{stream:!next.done});const lines=pending.split('\n');pending=lines.pop();for(const line of lines){if(!line.trim())continue;const frame=JSON.parse(line);if(frame.type==='error')throw new Error(frame.error);if(frame.type==='format')sampleRate=frame.sampleRate;if(frame.type==='done')done=true;if(frame.type==='audio'){
      const bytes=Uint8Array.from(atob(frame.data),c=>c.charCodeAt(0));
      if(mode==='buffered')chunks.push(bytes);else{currentPlayer.enqueue(bytes,sampleRate);if(first){$('#status').dataset.firstAudioMs=String(Math.round(performance.now()-started));first=false;}status('正在边生成边播放');$('#avatar-state').textContent='正在和你说话';}
    }}if(next.done)break;}
    if(!done)throw new Error('语音流中断，请重试');
    $('#status').dataset.receiveDoneMs=String(Math.round(performance.now()-started));
    if(mode==='buffered'){for(const chunk of chunks)currentPlayer.enqueue(chunk,sampleRate);$('#status').dataset.firstAudioMs=String(Math.round(performance.now()-started));status('生成完成，正在播放');$('#avatar-state').textContent='正在和你说话';}
    await currentPlayer.drain(controller.signal);if(expectedEpoch!==epoch)return;
    $('#status').dataset.underruns=String(currentPlayer.underruns);status(`播放完成 · ${mode==='stream'?'流式':'整句'}模式`);$('#avatar-state').textContent='安静陪着你';
  }catch(error){currentPlayer.stop();if(error.name!=='AbortError'&&expectedEpoch===epoch){fail(error);throw error;}}
  finally{if(expectedEpoch===epoch){avatar?.setMouth(0);if(!chatController)controls(false);}if(speechController===controller)speechController=null;}
}
function enqueueSpeech(text){const version=epoch;const job=queue.catch(()=>{}).then(()=>speak(text,version));queue=job.catch(()=>{});return job;}
function animate(){
  let mouth=0;if(analyser&&player?.playing){const values=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(values);let sum=0;for(const value of values)sum+=value*value;mouth=Math.min(1,Math.max(0,(Math.sqrt(sum/values.length)-.008)*7));}
  avatar?.setMouth(mouth);$('#status').dataset.mouth=mouth.toFixed(3);$('#status').dataset.playing=String(!!player?.playing);
  const now=performance.now(),speaking=!!player?.playing;
  if(now-lastBroadcast>32){avatarChannel.postMessage({mouth,speaking});lastBroadcast=now;}
  if((speaking||wasSpeaking)&&now-lastTelemetry>120&&!telemetryPending){lastTelemetry=now;wasSpeaking=speaking;telemetryPending=true;api('/api/telemetry',{mouth,speaking}).catch(()=>{}).finally(()=>telemetryPending=false);}
  requestAnimationFrame(animate);
}
async function sendChat(submittedText,fromVoice=false){
  const fromComposer=typeof submittedText!=='string';
  const text=(fromComposer?$('#prompt').value:submittedText).trim();if(!text)return;
  if(!fromVoice)call.cancelPending();
  if(config.connectionMode==='external'){const connection=await refreshRoute();if(!connection?.enabled||(connection.primary&&!connection.dshOnline)){status('DSH 尚未连接或主对话未打开，请先检查连接；没有切换到 API。',true);return;}stopLocal();const version=epoch;const image=capture&&$('#live-vision').checked?snapshot():attachedImage;await api('/api/agent-input',{text,...(image?{image}:{})});if(version!==epoch)return;message('user',text);if(fromComposer&&$('#prompt').value.trim()===text)$('#prompt').value='';removeFrame();status('已交给外部智能体，等待接入方读取并回复');avatarChannel.postMessage({text:'已交给外部智能体，正在等待回复。'});return true;}
  if(!config.chat.baseUrl||!config.chat.model){status('先在连接设置中填写对话服务地址和模型；现在可以使用“朗读”。',true);return;}
  if(capture&&$('#live-vision').checked){attachedImage=snapshot();}
  if(attachedImage&&!config.chat.vision){status('当前模型未启用视觉，请移除画面或更换支持视觉的模型。',true);return;}
  stopLocal();const version=epoch;controls(true);
  const content=attachedImage?[{type:'text',text},{type:'image_url',image_url:{url:attachedImage}}]:text;
  message('user',text+(attachedImage?'\n[已附加画面]':''));if(fromComposer)$('#prompt').value='';removeFrame();
  const output=message('assistant','…');const messages=[...(config.memory==='session'?history:[]),{role:'user',content}];let full='',buffer='',complete=false,voiceError;
  chatController=new AbortController();const controller=chatController;status('正在思考…');$('#avatar-state').textContent='正在想一想';avatar?.perform('thinking');
  const voice=part=>{if(version!==epoch||!config.audio.autoSpeak)return;for(let start=0;start<part.length;start+=450){const piece=part.slice(start,start+450).trim();if(piece)enqueueSpeech(piece).catch(e=>voiceError=e.message);}};
  try{
    await audioReady();if(version!==epoch)return;
    const response=await api('/api/chat',{messages},controller.signal);const reader=response.body.getReader(),decoder=new TextDecoder();let pending='';
    while(true){const next=await reader.read();if(controller.signal.aborted)return;pending+=decoder.decode(next.value||new Uint8Array(),{stream:!next.done});const lines=pending.split('\n');pending=lines.pop();for(const line of lines){if(!line.startsWith('data:'))continue;const data=line.slice(5).trim();if(data==='[DONE]'){complete=true;continue;}if(!data)continue;let frame;try{frame=JSON.parse(data);}catch{continue;}if(frame.error)throw new Error('对话服务返回错误');const delta=frame.choices?.[0]?.delta?.content||'';if(frame.choices?.[0]?.finish_reason)complete=true;if(typeof delta!=='string')continue;full+=delta;buffer+=delta;output.textContent=full;if(delta)avatarChannel.postMessage({text:full});$('#messages').scrollTop=$('#messages').scrollHeight;
      // Queue complete clauses while the model is still producing the rest.
      const boundary=buffer.search(/[。！？!?\n]/);if(boundary>=0){voice(buffer.slice(0,boundary+1));buffer=buffer.slice(boundary+1);}if(buffer.length>=350){voice(buffer.slice(0,350));buffer=buffer.slice(350);}
    }if(next.done)break;}
    if(!full||!complete)throw new Error('对话流未正常完成');voice(buffer);
    if(version!==epoch)return;
    history=config.memory==='session'?[...history,{role:'user',content:text},{role:'assistant',content:full}].slice(-40):[];
    if(['basic','mem0'].includes(config.memory)&&version===epoch){await api('/api/memory/turn',{user:text,assistant:full,generation:memoryGeneration});}
    await queue;if(version===epoch){avatarChannel.postMessage({text:full});status(voiceError?`回复完成，语音失败：${voiceError}`:'回复与播放完成',!!voiceError);if(voiceError&&call.active)throw new Error(voiceError);return true;}
  }catch(error){if(error.name!=='AbortError'&&version===epoch){fail(error);if(!full)output.textContent=error.message;if(call.active)throw error;}}
  finally{if(chatController===controller)chatController=null;if(version===epoch){controls(false);$('#avatar-state').textContent='安静陪着你';}}
}
function applyAudio(){if(outputGain)outputGain.gain.setTargetAtTime(config.audio.muted?0:config.audio.volume,context.currentTime,.02);}
function populateAudio(){ $('#voice-volume').value=Math.round(config.audio.volume*100);$('#volume-value').textContent=Math.round(config.audio.volume*100)+'%';$('#voice-muted').checked=config.audio.muted;$('#voice-auto').checked=config.audio.autoSpeak;$('#preferred-playback').value=config.playback;applyAudio();}
function populate(){populateAudio();$('#chat-route').value=config.connectionMode;document.querySelector('.rail-bottom small').textContent=config.connectionMode==='external'?'记忆由外部智能体管理':config.memory==='mem0'?'Mem0 长期记忆':'本地基础记忆';$('#connection-mode').value=config.connectionMode;$('#memory-mode').disabled=config.connectionMode==='external';$('#call').disabled=config.connectionMode==='external';$('#call').title=config.connectionMode==='external'?'外部模式请通过录音转文字发送，通话由接入方协调':'';$('#show-character').checked=config.display.character;$('#show-orb').checked=config.display.orb;$('#show-understanding').checked=config.display.showUnderstanding;$('#understanding').hidden=!config.display.showUnderstanding;window.dispatchEvent(new Event('companion-understanding'));$('#input-feedback').checked=config.display.inputFeedback;avatar?.setInputFeedback(config.display.inputFeedback);$('#follow-cursor').checked=config.display.followCursor;avatar?.setFollowCursor(config.display.followCursor);$('#memory-mode').value=config.memory==='external'?'none':config.memory;for(const element of $('#settings-form').elements){if(!element.name||element.name.startsWith('keys.'))continue;const [group,key]=element.name.split('.');const value=config[group]?.[key];if(element.type==='checkbox')element.checked=!!value;else element.value=value??'';}$('#playback').value=config.playback;$('#integration-enabled').checked=config.integrationEnabled;$('#config-status').textContent=config.secretsPersistent?'密钥由 Windows 加密保存；留空保留已保存密钥。':'网页预览的密钥仅存于服务进程内存，重启后需重新填写。';$('#record').title=config.asr.baseUrl?'录音转文字（最长 60 秒）':'请先配置语音识别服务';}
async function checkVoice(){try{const state=await(await api('/api/tts/status')).json();$('#voice-state').textContent=state.ready?`固定音色 · ${config.tts.voice==='jingyu_bright_soft_d_v1'?'D · 清亮中带柔和':config.tts.voice}`:state.error;$('#voice-state').title=state.error||state.note||'已校验保存音色';}catch(e){$('#voice-state').textContent=e.message;}}
function removeFrame(){attachedImage=null;$('#attachment').hidden=true;$('#attachment img').removeAttribute('src');}
function snapshot(){const video=$('#preview');if(!video.videoWidth||video.readyState<2)throw new Error('画面尚未就绪，请稍后再说');const canvas=document.createElement('canvas');const scale=Math.min(1,1280/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.75);}
function captureLabel(){if(capture)$('#capture-label').textContent=(capture.getVideoTracks()[0]?.label||'画面')+($('#live-vision').checked?' · 每次对话发送最新画面':' · 仅本地预览');}
function stopCapture(){capture?.getTracks().forEach(track=>track.stop());capture=null;$('#preview').srcObject=null;$('#media-panel').hidden=true;$('#live-vision').checked=false;removeFrame();}
async function showCapture(stream,label){stopCapture();capture=stream;$('#preview').srcObject=stream;$('#media-panel').hidden=false;captureLabel();for(const track of stream.getVideoTracks())track.onended=()=>stopCapture();await $('#preview').play();}
const call=new HandsFreeCall({
  onState:state=>{const active=state!=='ended';$('#call').textContent=active?'挂断通话':'开始通话';$('#call').classList.toggle('recording',active);$('#call-status').hidden=!active;$('#call-status').textContent={listening:'通话中 · 持续聆听，停顿一秒发送并替换上一条回复',processing:'通话中 · 正在回复，也在听你说；可随时打字或继续说话',ended:''}[state];$('#record').disabled=active;$('#read').disabled=active||busy;$('#send').disabled=false;},
  onError:fail,
  onTurn:async(blob,signal)=>{stopLocal();let binary='';const bytes=new Uint8Array(await blob.arrayBuffer());for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));const result=await(await api('/api/asr',{audio:btoa(binary),mime:blob.type},signal)).json();if(signal.aborted)return;if(!result.text?.trim())return;await sendChat(result.text,true);}
});
function endCall(){call.stop();stopCapture();stopDevices();stopLocal();api('/api/stop',{}).catch(()=>{});}
async function record(){
  if(recorder?.state==='recording'){recorder.stop();return;}
  if(!config.asr.baseUrl||!config.asr.model){status('请先在连接设置中配置语音识别服务。',true);return;}
  let stream;
  try{stream=await openDevice('audio');const chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>{clearTimeout(recordTimer);stream.getTracks().forEach(t=>t.stop());$('#record').classList.remove('recording');$('#record').setAttribute('aria-label','录音转文字');status('正在识别录音…');try{const blob=new Blob(chunks,{type:recorder.mimeType});const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));const result=await(await api('/api/asr',{audio:btoa(binary),mime:blob.type})).json();$('#prompt').value=result.text;status('识别完成 · 请检查文字后发送');}catch(e){fail(e);}};recorder.start(250);recordTimer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},60000);$('#record').classList.add('recording');$('#record').setAttribute('aria-label','停止录音');status('正在录音 · 再点一次停止，最长 60 秒');}catch(e){stream?.getTracks().forEach(t=>t.stop());fail(e);}
}

const claimed=new Set();let taskQueue=Promise.resolve();
function handleTask(task){if(task.status!=='queued'||claimed.has(task.id))return;claimed.add(task.id);taskQueue=taskQueue.catch(()=>{}).then(async()=>{
  const {claimed:ok}=await(await api('/api/tasks/claim',{id:task.id,client})).json();if(!ok)return;
  const version=epoch;let state='completed',error;
  try{if(task.command==='speak'){message('assistant',task.payload.text);await enqueueSpeech(task.payload.text);if(version!==epoch)state='cancelled';}else if(task.command==='perform')avatar?.perform(task.payload.expression);else if(task.command==='show_message')message('assistant',task.payload.text);else if(task.command==='set_task_status'){$('#avatar-state').textContent=task.payload.text;status(task.payload.text);}}
  catch(e){state='error';error=e.message;}
  await api('/api/tasks/finish',{id:task.id,client,status:state,error}).catch(()=>{});
}).catch(fail);}
function connectEvents(){const events=new EventSource('/api/events?client='+client);events.onmessage=messageEvent=>{const event=JSON.parse(messageEvent.data);if(event.type==='config'){if(event.data.connectionMode&&event.data.connectionMode!==config.connectionMode){config.connectionMode=event.data.connectionMode;populate();}if(event.data.display){config.display=event.data.display;$('#show-character').checked=config.display.character;$('#show-orb').checked=config.display.orb;$('#show-understanding').checked=config.display.showUnderstanding;$('#understanding').hidden=!config.display.showUnderstanding;window.dispatchEvent(new Event('companion-understanding'));$('#input-feedback').checked=config.display.inputFeedback;avatar?.setInputFeedback(config.display.inputFeedback);$('#follow-cursor').checked=config.display.followCursor;avatar?.setFollowCursor(config.display.followCursor);}}if(event.type==='stop')stopLocal();if(event.type==='snapshot')for(const task of event.data.tasks)handleTask(task);if(event.type==='task'){handleTask(event.data);const log=$('#event-log');log.textContent=`${event.data.command} · ${event.data.status}\n${log.textContent}`.slice(0,2000);}};events.onerror=()=>status('连接中断，正在重连…',true);}

async function refreshMemory(restore=false){
 const m=await(await api('/api/memory')).json();memoryGeneration=m.generation;$('#memory-summary').value=m.summary;$('#memory-status').textContent=`已保存 ${m.messages.length/2} 轮对话、${m.notes.length} 条明确记忆`+(m.summaryError?' · 摘要更新失败，可重试':'');$('#memory-notes').replaceChildren();
 for(const note of m.notes){const row=document.createElement('div');row.className='memory-note';const text=document.createElement('span');text.textContent=note.text;const edit=document.createElement('button');edit.textContent='编辑';edit.onclick=()=>{editingNote=note.id;$('#note-text').value=note.text;$('#note-text').focus();};const del=document.createElement('button');del.textContent='删除';del.onclick=async()=>{try{await api('/api/memory',{action:'delete_note',id:note.id});await refreshMemory();}catch(e){$('#memory-status').textContent=e.message;}};row.append(text,edit,del);$('#memory-notes').append(row);}
 if(restore&&['basic','mem0'].includes(config.memory)&&config.connectionMode==='direct'){$('#messages').replaceChildren();for(const item of m.messages.slice(-40))message(item.role,item.content);}
}
async function refreshRoute(){try{const s=await(await api('/api/connection-status')).json();$('#chat-route-state').textContent=s.mode==='direct'?(s.apiConfigured?'使用已配置的模型 API':'尚未配置 API，请打开连接设置'):!s.enabled?'外部接口已关闭':!s.primary?'等待外部智能体接入；可在设置中绑定 DSH 主对话':s.dshOnline?'主对话：'+s.primary.title:'主对话：'+s.primary.title+' · DSH 未连接或会话未打开';return s;}catch(e){$('#chat-route-state').textContent='无法检查连接：'+e.message;}}
async function switchRoute(mode){const old=config.connectionMode;if(mode===old)return;$('#chat-route').disabled=true;call.stop();stopLocal();try{config=await(await api('/api/config',{connectionMode:mode})).json();history=[];populate();await refreshRoute();status('已切换聊天方式，后续消息使用新连接；草稿已保留。');}catch(e){$('#chat-route').value=old;fail(e);}finally{$('#chat-route').disabled=false;}}
async function init(){
  setupSharedMemory(api);
  const bootstrap=await(await api('/api/bootstrap')).json();config=bootstrap.config;populate();checkVoice();$('#api-address').textContent=bootstrap.integration.baseUrl;$('#token-path').textContent=bootstrap.integration.tokenFile;
  avatar=new Avatar($('#avatar'));avatar.setInputFeedback(config.display.inputFeedback);avatar.setFollowCursor(config.display.followCursor);attachTouchFeedback($('#avatar'),avatar);avatar.load().then(()=>$('#avatar-loading').remove()).catch(error=>{$('#avatar-loading').textContent=error.message;});
  attachUnderstanding($('#understanding'));connectEvents();animate();await refreshMemory(true);
  setupMem0({api,enabled:config.memory==='mem0',onEnable:async()=>{if(config.connectionMode==='external')throw new Error('请先切换到直接连接模型 API 模式');config=await(await api('/api/config',{memory:'mem0'})).json();populate();await refreshMemory(true);}});
  await setupDevices(()=>{if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop();clearTimeout(recordTimer);$('#record').classList.remove('recording');$('#record').setAttribute('aria-label','录音转文字');}endCall();});
  window.desktop?.onVisibility(value=>{config.display=value;$('#show-character').checked=value.character;$('#show-orb').checked=value.orb;$('#show-understanding').checked=value.showUnderstanding;$('#understanding').hidden=!value.showUnderstanding;window.dispatchEvent(new Event('companion-understanding'));$('#input-feedback').checked=value.inputFeedback;avatar?.setInputFeedback(value.inputFeedback);$('#follow-cursor').checked=value.followCursor;avatar?.setFollowCursor(value.followCursor);});
  window.desktop?.onPetChat(async request=>{
    const reply=data=>avatarChannel.postMessage({replyId:request.id,...data});
    reply({state:'accepted'});
    try{await sendChat(request.text);reply({state:'done'});}
    catch(error){reply({state:'error',error:error.message});}
  });
  if(window.desktop){const state=await desktop.state();showWelcome(state);$('#desktop-badge').textContent='独立桌面软件';$('#autostart').checked=state.autoStart;$('#autostart').disabled=!state.packaged;}else{$('#pet-open').disabled=true;$('#choose-model').disabled=true;$('#choose-core').disabled=true;$('#autostart').disabled=true;}
  for(const button of document.querySelectorAll('.nav'))button.onclick=()=>{document.querySelectorAll('.nav,.page').forEach(n=>n.classList.remove('active'));button.classList.add('active');$('#'+button.dataset.tab).classList.add('active');$('#page-title').textContent={home:'让陪伴，近一点。',settings:'自由连接，你的选择。',integration:'接入更大的世界。',preferences:'让鲸伴，更合你意。'}[button.dataset.tab];};
  $('#read').onclick=()=>{const text=$('#prompt').value.trim();if(!text)return;if(text.length>500){status('单次朗读最多 500 字，请缩短内容。',true);return;}enqueueSpeech(text).catch(()=>{});};
  $('#chat-route').onchange=()=>switchRoute($('#chat-route').value);
  $('#chat-route-settings').onclick=()=>document.querySelector('.nav[data-tab=settings]').click();
  void refreshRoute();setInterval(()=>void refreshRoute(),3000);
  $('#send').onclick=()=>sendChat().catch(fail);$('#prompt').onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))sendChat().catch(fail);};
  $('#stop').onclick=()=>{call.stop();stopLocal();api('/api/stop',{}).catch(fail);};
  $('#clear-chat').onclick=async()=>{call.stop();stopLocal();try{if(config.connectionMode==='direct'&&['basic','mem0'].includes(config.memory)){const m=await(await api('/api/memory',{action:'clear_history'})).json();memoryGeneration=m.generation;}history=[];$('#messages').replaceChildren();removeFrame();await refreshMemory();status('会话和摘要已清空，明确记忆保留');}catch(e){fail(e);}};
  $('#expression').onclick=()=>{avatar.perform('happy');avatarChannel.postMessage({expression:'happy'});};
  const viewButton=document.createElement('button');viewButton.className='pill';viewButton.textContent='近景';viewButton.title='切换近景与全身';viewButton.onclick=()=>viewButton.textContent=avatar.toggleView()?'全身':'近景';$('.stage-top').insertBefore(viewButton,$('#expression'));
  document.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>{if(call.active)return;$('#prompt').value=b.dataset.prompt;enqueueSpeech(b.dataset.prompt).catch(()=>{});});
  $('#playback').onchange=()=>api('/api/config',{playback:$('#playback').value}).then(r=>r.json()).then(c=>{config=c;populateAudio();}).catch(fail);
  let audioSave=Promise.resolve();
  const saveAudio=()=>{
    const audio={volume:Number($('#voice-volume').value)/100,muted:$('#voice-muted').checked,autoSpeak:$('#voice-auto').checked};
    config.audio=audio;applyAudio();$('#volume-value').textContent=Math.round(audio.volume*100)+'%';
    audioSave=audioSave.catch(()=>{}).then(()=>api('/api/config',{audio})).then(()=>{$('#preferences-status').textContent='声音设置已保存';}).catch(e=>{$('#preferences-status').textContent='保存失败：'+e.message;});
  };
  $('#voice-volume').oninput=()=>{config.audio.volume=Number($('#voice-volume').value)/100;applyAudio();$('#volume-value').textContent=$('#voice-volume').value+'%';};
  for(const id of ['voice-volume','voice-muted','voice-auto'])$('#'+id).onchange=saveAudio;
  $('#preferred-playback').onchange=async()=>{try{config=await(await api('/api/config',{playback:$('#preferred-playback').value})).json();$('#playback').value=config.playback;populateAudio();}catch(e){$('#preferences-status').textContent=e.message;}};
  $('#settings-form').onsubmit=async e=>{e.preventDefault();const input={memory:$('#memory-mode').value,connectionMode:$('#connection-mode').value};for(const element of e.target.elements){if(!element.name)continue;const [group,key]=element.name.split('.');if(group==='keys'&&!element.value)continue;(input[group]??={})[key]=element.type==='checkbox'?element.checked:['sampleRate','embeddingDimensions'].includes(key)?Number(element.value):element.value;}try{if(input.connectionMode!==config.connectionMode){call.stop();stopLocal();}config=await(await api('/api/config',input)).json();if(config.memory!=='session')history=[];populate();await refreshMemory(true);document.querySelectorAll('input[type=password]').forEach(e=>e.value='');$('#config-status').textContent='连接设置已保存；角色文件更改后点击“重载角色”。';checkVoice();}catch(error){$('#config-status').textContent=error.message;}};
  $('#connection-mode').onchange=()=>{$('#memory-mode').disabled=$('#connection-mode').value==='external';};
  for(const [id,key] of [['show-character','character'],['show-orb','orb'],['follow-cursor','followCursor'],['show-understanding','showUnderstanding'],['input-feedback','inputFeedback']])$('#'+id).onchange=async()=>{try{if(window.desktop)await desktop.visibility({[key]:$('#'+id).checked});else await api('/api/config',{display:{[key]:$('#'+id).checked}});}catch(e){fail(e);}};
  $('#note-save').onclick=async()=>{try{await api('/api/memory',{action:'save_note',id:editingNote||undefined,text:$('#note-text').value});editingNote=null;$('#note-text').value='';await refreshMemory();}catch(e){$('#memory-status').textContent=e.message;}};
  $('#note-cancel').onclick=()=>{editingNote=null;$('#note-text').value='';};
  $('#summary-save').onclick=async()=>{try{await api('/api/memory',{action:'save_summary',text:$('#memory-summary').value});await refreshMemory();}catch(e){$('#memory-status').textContent=e.message;}};
  $('#summary-build').onclick=async()=>{const b=$('#summary-build');b.disabled=true;$('#memory-status').textContent='正在整理摘要…';try{const r=await(await api('/api/memory',{action:'summarize'})).json();await refreshMemory();if(r.summaryError)$('#memory-status').textContent=r.summaryError;}catch(e){$('#memory-status').textContent=e.message;}finally{b.disabled=false;}};
  $('#memory-clear').onclick=async()=>{if(!confirm('删除全部聊天记录、会话摘要和明确记忆？'))return;call.stop();stopLocal();try{await api('/api/memory',{action:'clear_all'});history=[];$('#messages').replaceChildren();await refreshMemory();}catch(e){$('#memory-status').textContent=e.message;}};
  $('#pet-open').onclick=()=>desktop.pet(true).catch(fail);$('#autostart').onchange=()=>desktop.startup($('#autostart').checked).catch(fail);
  setupModelLibrary(avatar,'choose-model',item=>{config.model.entry=item.entry;$('[name="model.entry"]').value=item.entry;});
  $('#choose-core').onclick=async()=>{try{const result=await desktop.chooseCore();if(result)$('[name="model.core"]').value=result;}catch(e){fail(e);}};
  $('#reload').onclick=()=>location.reload();$('#integration-enabled').onchange=()=>api('/api/config',{integrationEnabled:$('#integration-enabled').checked}).catch(fail);
  $('#record').onclick=()=>record();$('#camera').onclick=async()=>{try{await showCapture(await openDevice('video'),'摄像头');}catch(e){fail(e);}};
  $('#screen').onclick=async()=>{try{if(window.desktop){const sources=await desktop.sources();$('#sources').replaceChildren();for(const source of sources){const button=document.createElement('button');const img=document.createElement('img');img.src=source.thumbnail;img.alt='';const name=document.createElement('span');name.textContent=source.name;button.append(img,name);button.onclick=async()=>{try{await desktop.selectSource(source.id);$('#source-dialog').close();await showCapture(await navigator.mediaDevices.getDisplayMedia({video:true,audio:false}),'屏幕共享');}catch(e){fail(e);}};$('#sources').append(button);}$('#source-dialog').showModal();}else await showCapture(await navigator.mediaDevices.getDisplayMedia({video:true,audio:false}),'屏幕共享');}catch(e){fail(e);}};
  $('#source-close').onclick=()=>$('#source-dialog').close();$('#capture-stop').onclick=stopCapture;
  $('#attach-frame').onclick=()=>{try{attachedImage=snapshot();$('#attachment img').src=attachedImage;$('#attachment').hidden=false;status('已附加画面，发送消息后交给模型');}catch(e){fail(e);}};
  $('#live-vision').onchange=()=>{if($('#live-vision').checked&&!config.chat.vision){$('#live-vision').checked=false;fail(new Error('请先在连接设置中启用支持图片理解的模型'));}captureLabel();};
  $('#call').onclick=async()=>{if(call.active){endCall();return;}if(!config.asr.baseUrl||!config.asr.model||!config.chat.baseUrl||!config.chat.model){fail(new Error('请先配置对话和语音识别服务'));return;}if(recorder?.state==='recording'){fail(new Error('请先结束当前手动录音'));return;}try{stopLocal();await audioReady();await call.start();}catch(e){fail(e);}};
  $('#remove-frame').onclick=removeFrame;
  window.addEventListener('beforeunload',()=>{stopDevices();call.stop();stopCapture();if(recorder?.state==='recording')recorder.stop();stopLocal();});
}
init().catch(fail);
