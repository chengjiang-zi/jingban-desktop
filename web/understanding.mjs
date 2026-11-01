export function attachUnderstanding(element){
 let busy=false,revision=0;
 async function refresh(){if(busy)return;busy=true;const current=revision;try{
   const response=await fetch('/api/understanding');if(!response.ok)throw new Error();const value=await response.json();
   if(current!==revision)return;
   element.hidden=!!value.hidden;if(value.hidden)return;
   element.textContent=value.score===null?`了解度 · ${value.reason}`:`了解度 ${value.score}/100`;
   element.title=value.score===null?value.reason:`基于 ${value.facts} 项去重记忆估算，其中 ${value.confirmed} 项由你明确维护。仅作互动参考，不代表准确率或真实理解程度。`;
 }catch{element.textContent='了解度 · 暂不可用';}finally{busy=false;if(current!==revision)refresh();}}
 refresh();setInterval(refresh,10000);window.addEventListener('companion-understanding',()=>{revision++;refresh();});return refresh;
}
