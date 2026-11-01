// 澄江子 · 鲸伴 Beta · MIT
export function showWelcome(state){
  document.querySelector('#about-version').textContent=state.version+' · Beta 测试版';
  const modal=document.querySelector('#welcome-dialog');
  const open=()=>{if(!modal.open)modal.showModal();};
  document.querySelector('#welcome-again').onclick=open;
  document.querySelector('#welcome-confirm').onclick=async()=>{const button=document.querySelector('#welcome-confirm');button.disabled=true;try{await window.desktop.welcomeSeen();modal.close();}catch{document.querySelector('#welcome-status').textContent='未能保存提示状态，请重试。';}finally{button.disabled=false;}};
  if(state.welcomeRequired)open();
}
