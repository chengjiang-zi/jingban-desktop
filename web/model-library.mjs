export function setupModelLibrary(avatar,importButton,onChange=()=>{}){
  const select=document.querySelector('#model-library'),button=document.getElementById(importButton),status=document.querySelector('#model-library-status');
  if(!window.desktop?.models){select.disabled=true;button.disabled=true;status.textContent='请在桌面应用中导入和切换角色。';return;}
  let busy=false;
  async function refresh(){const data=await window.desktop.models();select.replaceChildren();for(const item of data.items){const option=document.createElement('option');option.value=item.id;option.textContent=item.name+(item.kind==='bongo'?' · 小鱼敲键盘':' · Live2D');option.selected=item.entry===data.selected;select.append(option);}if(!data.items.length)select.append(new Option('请先导入角色',''));}
  async function run(action){if(busy)return;busy=true;select.disabled=button.disabled=true;try{await action();await refresh();}catch(e){status.textContent=e.message;await refresh().catch(()=>{});}finally{busy=false;select.disabled=button.disabled=false;}}
  select.onchange=()=>run(()=>window.desktop.selectModel(select.value));
  button.onclick=()=>run(()=>window.desktop.chooseModel());
  window.desktop.onModel(async item=>{onChange(item);status.textContent='正在加载角色…';try{await avatar.load();status.textContent=item.kind==='bongo'?'小鱼敲键盘：传递按键标识与鼠标按下状态用于动作和高亮，不记录输入文本。':'角色已切换';await refresh();}catch(e){status.textContent='加载失败：'+e.message;}});
  window.desktop.onHands(value=>{if(value.error)status.textContent=value.error;});
  refresh().catch(e=>status.textContent=e.message);
}
