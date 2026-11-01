const key='companion-media-devices';
const streams=new Set();let generation=0;
function preferences(){try{return JSON.parse(localStorage.getItem(key)||'{}');}catch{return {};}}
export function stopDevices(){generation++;for(const stream of streams)stream.getTracks().forEach(t=>t.stop());streams.clear();}
export async function openDevice(kind){
  const version=generation,prefs=preferences();
  const constraint=kind==='audio'?{echoCancellation:true,noiseSuppression:true,autoGainControl:true}:{};
  if(prefs[kind])constraint.deviceId={exact:prefs[kind]};
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({[kind]:constraint});}
  catch(e){if(e.name==='OverconstrainedError')throw new Error('已选设备不可用，请在连接设置中重新选择设备或改用系统默认。');if(e.name==='NotAllowedError')throw new Error('设备未获授权，请检查连接设置中的设备权限及系统隐私设置。');throw e;}
  if(version!==generation){stream.getTracks().forEach(t=>t.stop());throw new DOMException('设备请求已取消','AbortError');}
  for(const old of streams)if(old.getTracks().every(t=>t.readyState==='ended'))streams.delete(old);
  streams.add(stream);globalThis.window?.dispatchEvent(new Event('companion-devices'));return stream;
}
export async function setupDevices(stop){
  const panel=document.createElement('article');panel.className='card memory-card';
  panel.innerHTML='<h3>设备与权限</h3><p class="hint">选择会自动保存在本机。开始通话、录音或预览时才启用设备；挂断会关闭麦克风和画面。屏幕共享每次选择要共享的窗口。</p><label>麦克风<select id="device-audio"></select></label><label>摄像头<select id="device-video"></select></label><div id="device-permissions"><label>麦克风权限<select id="permission-audio"><option value="ask">使用时询问</option><option value="allow">允许并记住</option><option value="deny">禁止使用</option></select></label><label>摄像头权限<select id="permission-video"><option value="ask">使用时询问</option><option value="allow">允许并记住</option><option value="deny">禁止使用</option></select></label></div><button type="button" id="devices-refresh" class="outline">刷新设备列表</button><button type="button" id="devices-reset" class="text-button">清除设备选择与授权</button><p id="devices-status" role="status"></p>';
  document.querySelector('#settings').append(panel);
  const status=panel.querySelector('#devices-status');
  async function refresh(){
    const devices=await navigator.mediaDevices.enumerateDevices(),prefs=preferences();
    for(const kind of ['audio','video']){
      const select=panel.querySelector('#device-'+kind);select.replaceChildren(new Option('系统默认设备',''));
      for(const device of devices.filter(d=>d.kind===kind+'input'&&d.deviceId))select.add(new Option(device.label||'设备（授权后显示名称）',device.deviceId));
      if(prefs[kind]&&![...select.options].some(o=>o.value===prefs[kind]))select.add(new Option('已选设备（暂不可用）',prefs[kind]));
      select.value=prefs[kind]||'';
    }
    if(window.desktop?.mediaPermissions){const p=await desktop.mediaPermissions();for(const kind of ['audio','video'])panel.querySelector('#permission-'+kind).value=p[kind];}
  }
  const fail=e=>{status.textContent=e.message;};
  for(const kind of ['audio','video']){
    panel.querySelector('#device-'+kind).onchange=e=>{stop();stopDevices();localStorage.setItem(key,JSON.stringify({...preferences(),[kind]:e.target.value}));status.textContent='设备选择已保存，下次启用时生效。';};
    panel.querySelector('#permission-'+kind).onchange=async e=>{stop();stopDevices();try{await desktop.mediaPermissions({[kind]:e.target.value});status.textContent='权限已保存，当前采集已停止。';}catch(error){fail(error);await refresh();}};
  }
  if(!window.desktop?.mediaPermissions){panel.querySelector('#device-permissions').hidden=true;status.textContent='网页版的设备权限由浏览器管理。';}
  panel.querySelector('#devices-refresh').onclick=()=>refresh().catch(fail);
  panel.querySelector('#devices-reset').onclick=async()=>{stop();stopDevices();localStorage.removeItem(key);try{if(window.desktop?.mediaPermissions)await desktop.mediaPermissions({audio:'ask',video:'ask'});await refresh();status.textContent=window.desktop?'已清除，下次使用会重新询问。':'设备选择已清除；网站授权请在浏览器中撤回。';}catch(e){fail(e);}};
  navigator.mediaDevices.addEventListener('devicechange',()=>refresh().catch(fail));
  window.addEventListener('companion-devices',()=>refresh().catch(fail));
  await refresh().catch(fail);
}
