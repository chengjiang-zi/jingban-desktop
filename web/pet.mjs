import {setupModelLibrary} from './model-library.mjs';
import {attachUnderstanding} from './understanding.mjs';
import {attachTouchFeedback} from './touch-feedback.mjs';
import {Avatar} from './avatar.mjs';
const $=s=>document.querySelector(s),avatar=new Avatar($('#avatar'));
const orb=$('#orb'),menu=$('#orb-menu'),input=$('#pet-input'),send=$('#pet-send');
const channel=new BroadcastChannel('companion-avatar');
let bubblesEnabled=true;try{bubblesEnabled=localStorage.getItem('pet-bubbles')!=='off';}catch{}
document.body.classList.toggle('bubbles-off',!bubblesEnabled);
let localFrame=0,last=0,bubbleTimer,dragging=false,requestId,requestTimer;
function showBubble(text,delay=10000){$('#bubble-text').textContent=text;document.body.classList.add('bubble-visible');clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>document.body.classList.remove('bubble-visible'),delay);}
function finishRequest(error){clearTimeout(requestTimer);requestId=null;send.disabled=false;if(error){showBubble(error);document.body.classList.add('typing');}else if(!input.value){document.body.classList.remove('typing');}}
channel.onmessage=e=>{const d=e.data;if(typeof d.mouth==='number'){avatar.setMouth(d.mouth);localFrame=last=Date.now();}if(d.expression)avatar.perform(d.expression);if(d.stopAction)avatar.stopAction();if(d.action&&(!d.automatic||display.aiActions))void avatar.playAction(d.action,d.modelVersion,d.automatic).catch(()=>{});if(d.text)showBubble(d.text);if(d.speaking&&document.body.classList.contains('bubble-visible')){clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>document.body.classList.remove('bubble-visible'),6000);}if(d.replyId===requestId&&requestId){if(d.state==='accepted'){clearTimeout(requestTimer);requestTimer=setTimeout(()=>finishRequest('等待回复超时，请在主界面检查服务。'),240000);}else finishRequest(d.error);}};
function closeMenu(){menu.hidden=true;orb.setAttribute('aria-expanded','false');}
function toggleMenu(){menu.hidden=!menu.hidden;orb.setAttribute('aria-expanded',String(!menu.hidden));}
orb.onpointerdown=e=>{if(e.button!==0||dragging)return;e.preventDefault();dragging=true;orb.setPointerCapture(e.pointerId);document.body.classList.add('dragging');orb.classList.add('dragging');closeMenu();window.desktop?.dragPet('start',{x:e.clientX,y:e.clientY}).catch(error=>showBubble(error.message));};
async function endDrag(cancel=false){if(!dragging)return;dragging=false;let moved=true;try{moved=await window.desktop?.dragPet('end');}finally{document.body.classList.remove('dragging');orb.classList.remove('dragging');}if(!cancel&&!moved)toggleMenu();}
orb.onpointerup=()=>endDrag();orb.onpointercancel=()=>endDrag(true);orb.onlostpointercapture=()=>endDrag(true);window.addEventListener('blur',()=>endDrag(true));
orb.onclick=e=>{if(e.detail===0)toggleMenu();};
$('#home').onclick=()=>window.desktop?.main();
$('#pass').onclick=()=>{closeMenu();window.desktop?.passThrough(true);showBubble('已开启鼠标穿透，右下角托盘可恢复操作。');};
$('#type').onclick=()=>{closeMenu();document.body.classList.add('typing');input.focus();};
for(const button of document.querySelectorAll('[data-frame]'))button.onclick=()=>{avatar.setFraming(button.dataset.frame);for(const b of document.querySelectorAll('[data-frame]'))b.setAttribute('aria-pressed',String(b===button));};
async function resize(factor){if(!window.desktop){showBubble('请在桌面软件中调整大小');return;}try{const r=await window.desktop.scalePet(factor);if(!r.changed)showBubble('已经达到当前屏幕的大小限制。');}catch(e){showBubble(e.message);}}
$('#larger').onclick=()=>resize(1.12);$('#smaller').onclick=()=>resize(1/1.12);
const bubbleToggle=$('#bubble-toggle');function updateToggle(){bubbleToggle.setAttribute('aria-checked',String(bubblesEnabled));bubbleToggle.textContent='对话气泡：'+(bubblesEnabled?'显示':'隐藏');}updateToggle();bubbleToggle.onclick=()=>{bubblesEnabled=!bubblesEnabled;document.body.classList.toggle('bubbles-off',!bubblesEnabled);try{localStorage.setItem('pet-bubbles',bubblesEnabled?'on':'off');}catch{}updateToggle();};
attachTouchFeedback($('#avatar'),avatar,()=>dragging);
$('#pet-composer').onsubmit=async e=>{e.preventDefault();const text=input.value.trim();if(!text)return;if(!window.desktop){showBubble('请在桌面软件中使用聊天输入。');return;}clearTimeout(requestTimer);requestId=crypto.randomUUID();const submittedId=requestId;input.value='';send.disabled=false;document.body.classList.add('typing');showBubble('正在想一想…',240000);requestTimer=setTimeout(()=>finishRequest('主界面未回应，请打开主界面检查连接。'),10000);try{await window.desktop.chat({id:requestId,text});}catch(error){if(requestId===submittedId)finishRequest(error.message);}};
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.isComposing)e.preventDefault();});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.orb-dock'))closeMenu();if(!e.target.closest('#pet-composer')&&!requestId)document.body.classList.remove('typing');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();document.body.classList.remove('typing');input.blur();}});
let pointer=null,hoverUntil=0;
document.addEventListener('pointermove',e=>{pointer=e.target.closest('.orb-dock')?null:{x:e.clientX,y:e.clientY,overInput:!!e.target.closest('#pet-composer')};});
document.documentElement.addEventListener('pointerleave',()=>{pointer=null;});
setInterval(()=>{if(!dragging&&pointer&&(pointer.overInput||avatar.touches(pointer.x,pointer.y)))hoverUntil=Date.now()+700;document.body.classList.toggle('touching',!dragging&&Date.now()<hoverUntil);if(Date.now()-last>500)avatar.setMouth(0);},100);
const events=new EventSource('/api/events?client=pet-'+crypto.randomUUID());
events.onmessage=e=>{const event=JSON.parse(e.data);if(event.type==='config'&&event.data.display)applyDisplay(event.data.display);if(event.type==='avatar'&&Date.now()-localFrame>300){avatar.setMouth(event.data.mouth);last=Date.now();}if(event.type==='stop'){avatar.setMouth(0);avatar.stopAction();if(requestId)finishRequest('已停止回复。');}if(event.type==='task'&&event.data.status==='running'){const t=event.data;if(t.command==='perform')avatar.perform(t.payload.expression);if(t.payload.text)showBubble(t.payload.text);}};
avatar.load().catch(e=>showBubble(e.message,30000));

let display={character:true,orb:true};
function applyDisplay(value){if(!value.aiActions)avatar.stopAutomaticAction();display=value;avatar.setInputFeedback(value.inputFeedback);avatar.setFishTouch(value.fishTouch);$('#understanding').hidden=!value.showUnderstanding;window.dispatchEvent(new Event('companion-understanding'));avatar.setFollowCursor(value.followCursor);$('#follow-cursor').textContent='鼠标跟随：'+(value.followCursor?'开启':'关闭');$('#follow-cursor').setAttribute('aria-checked',String(!!value.followCursor));document.body.classList.toggle('character-off',!value.character);document.body.classList.toggle('orb-off',!value.orb);$('#hide-character').textContent=value.character?'隐藏角色':'显示角色';$('#hide-character').setAttribute('aria-pressed',String(value.character));$('#hide-orb').textContent=value.orb?'隐藏悬浮球':'显示悬浮球';$('#hide-orb').setAttribute('aria-pressed',String(value.orb));}
window.desktop?.onVisibility(applyDisplay);
fetch('/api/bootstrap').then(r=>r.json()).then(b=>applyDisplay(b.config.display)).catch(e=>showBubble(e.message));
$('#hide-character').onclick=()=>window.desktop?.visibility({character:!display.character}).then(applyDisplay).catch(e=>showBubble(e.message));
$('#hide-orb').onclick=()=>window.desktop?.visibility({orb:!display.orb}).then(applyDisplay).catch(e=>showBubble(e.message));

$('#follow-cursor').onclick=()=>window.desktop?.visibility({followCursor:!display.followCursor}).then(applyDisplay).catch(e=>showBubble(e.message));

attachUnderstanding($('#understanding'));

setupModelLibrary(avatar,'pet-import-model');
