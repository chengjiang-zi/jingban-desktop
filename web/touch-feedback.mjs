import {reactions} from './touch-reactions.mjs';
export function attachTouchFeedback(container,avatar,blocked=()=>false){
  let down,last=0;
  container.addEventListener('pointerdown',e=>{if(e.button===0)down={x:e.clientX,y:e.clientY,time:performance.now()};});
  container.addEventListener('pointercancel',()=>down=null);
  container.addEventListener('pointerup',e=>{
    const start=down;down=null;const now=performance.now();
    if(!start||blocked()||now-last<90||now-start.time>700||Math.hypot(e.clientX-start.x,e.clientY-start.y)>6||!avatar.touches(e.clientX,e.clientY))return;
    last=now;const kind=avatar.touch(e.clientX,e.clientY);if(!kind)return;const reaction=kind==='fish'?{glyph:'✦',color:'#82b8cb'}:reactions[kind];if(!reaction)return;
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(avatar.touchNotice){
      document.querySelector('.touch-notice')?.remove();const note=document.createElement('span');note.className='touch-notice';note.textContent=avatar.touchNotice;
      note.style.cssText=`position:fixed;z-index:21;pointer-events:none;left:${Math.max(110,Math.min(innerWidth-110,e.clientX))}px;top:${Math.max(16,e.clientY-65)}px;transform:translateX(-50%);max-width:210px;padding:9px 14px;border-radius:18px;background:rgba(255,255,255,.94);color:#655b87;font:14px sans-serif;box-shadow:0 4px 18px #887baf26;`;
      note.setAttribute('role','status');document.body.append(note);if(!reduce)note.animate([{opacity:0,translate:'0 6px'},{opacity:1,translate:'0 0',offset:.15},{opacity:1,offset:.8},{opacity:0}],{duration:2000,fill:'forwards'});setTimeout(()=>note.remove(),2100);
    }
    const sparks=[...document.querySelectorAll('.touch-spark')];while(sparks.length>15)sparks.shift().remove();
    for(let i=0;i<(reduce?1:3);i++){
      const item=document.createElement('span');item.className='touch-spark';item.textContent=reaction.glyph;
      item.style.cssText=`position:fixed;z-index:20;pointer-events:none;left:${Math.max(12,Math.min(innerWidth-24,e.clientX+(i-1)*17))}px;top:${Math.max(30,e.clientY)}px;font:26px sans-serif;color:${reaction.color};text-shadow:0 1px 4px white;`;
      item.setAttribute('aria-hidden','true');document.body.append(item);
      if(!reduce)item.animate([{opacity:0,transform:'translate(-50%,-20%) scale(.5)'},{opacity:1,offset:.2},{opacity:0,transform:`translate(${(i-1)*30-50}%,-${180+i*70}%) scale(1.15)`}],{duration:850+i*100,easing:'ease-out',fill:'forwards'});
      setTimeout(()=>item.remove(),reduce?350:1100);
    }
  });
}
