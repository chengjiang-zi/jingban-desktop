export const reactions={
  pat:{name:'摸摸头',duration:1500,glyph:'♡',color:'#df91b2'},
  wink:{name:'俏皮眨眼',duration:1100,glyph:'✦',color:'#a099df'},
  nod:{name:'轻轻点头',duration:1400,glyph:'✧',color:'#82b8cb'},
  sway:{name:'开心摇摆',duration:1800,glyph:'♪',color:'#8eacd9'},
  shy:{name:'害羞躲闪',duration:1600,glyph:'♡',color:'#e9a5b1'},
  surprise:{name:'好奇探头',duration:1300,glyph:'○',color:'#a6b9df'},
  cuddle:{name:'摸摸充能',duration:2400,glyph:'♥',color:'#e39ab7',notice:'摸摸能量充满啦～'},
  dance:{name:'鱼鱼小舞步',duration:2600,glyph:'♪',color:'#a399df',notice:'好啦，给你跳个小舞～'},
  dizzy:{name:'连点小抗议',duration:2200,glyph:'✧',color:'#8ab5ce',notice:'慢一点，鱼鱼要转圈啦～'}
};
export function chooseReaction(zone,last,random=Math.random){
  const pool=(zone==='head'?['pat','wink','nod']:zone==='edge'?['sway','surprise','wink']:['shy','sway','surprise']).filter(k=>k!==last);
  return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
}
export function touchPose(kind,elapsed,side=1){
  const pose={x:0,y:0,z:0,bodyX:0,bodyZ:0,eyeL:1,eyeR:1,smile:0,brow:0};
  const r=reactions[kind];if(!r||elapsed<0||elapsed>=r.duration)return pose;
  const u=elapsed/r.duration,e=Math.sin(Math.PI*u),wave=Math.sin(u*Math.PI*4)*e;
  if(kind==='pat')Object.assign(pose,{y:-9*e,z:side*9*e,eyeL:1-.65*e,eyeR:1-.65*e,smile:e});
  if(kind==='wink')Object.assign(pose,{x:side*8*e,z:side*6*e,eyeL:side<0?1-e:1,eyeR:side>0?1-e:1,smile:e});
  if(kind==='nod')Object.assign(pose,{y:12*wave,x:side*3*e,bodyZ:side*2*e,smile:.7*e});
  if(kind==='sway')Object.assign(pose,{x:10*wave,z:8*wave,bodyX:7*wave,bodyZ:5*wave,eyeL:1-.35*e,eyeR:1-.35*e,smile:e});
  if(kind==='shy')Object.assign(pose,{x:-side*18*e,y:-10*e,z:-side*8*e,bodyX:-side*5*e,eyeL:1-.45*e,eyeR:1-.45*e,smile:.6*e});
  if(kind==='surprise')Object.assign(pose,{x:side*14*e,y:8*e,z:side*13*e,bodyZ:side*4*e,brow:.8*e,smile:.3*e});
  if(kind==='cuddle')Object.assign(pose,{y:-7*e,z:side*12*e,x:side*4*e,eyeL:1-.85*e,eyeR:1-.85*e,smile:e});
  if(kind==='dance')Object.assign(pose,{x:12*wave,y:5*Math.sin(u*Math.PI*8)*e,z:10*wave,bodyX:8*wave,bodyZ:6*wave,smile:e});
  if(kind==='dizzy')Object.assign(pose,{x:10*Math.cos(u*Math.PI*4)*e,y:7*wave,z:side*12*e,eyeL:1-.6*e,eyeR:1-.6*e,brow:.4*e,smile:.5*e});
  return pose;
}

export class TouchSequence {
  constructor(){this.last=-Infinity;this.count=0;this.headCount=0;this.started=-Infinity;this.kind=null;this.side=1;this.from=touchPose(null,0);}
  sample(now){
    const elapsed=now-this.started,next=touchPose(this.kind,elapsed,this.side);
    const u=Math.max(0,Math.min(1,elapsed/220)),blend=u*u*(3-2*u);
    return Object.fromEntries(Object.keys(next).map(key=>[key,this.from[key]*(1-blend)+next[key]*blend]));
  }
  trigger(zone,side,now,random=Math.random){
    if(now-this.last>1300){this.count=0;this.headCount=0;}
    this.last=now;this.count++;this.headCount=zone==='head'?this.headCount+1:0;
    const special=this.count===8?'dizzy':this.count===5?'dance':this.headCount===3?'cuddle':null;
    // Give a discovered reaction a moment to be seen even during rapid tapping.
    if(!special&&reactions[this.kind]?.notice&&now-this.started<650)return {kind:this.kind,notice:null};
    this.from=this.sample(now);this.kind=special||chooseReaction(zone,this.kind,random);this.side=side;this.started=now;
    return {kind:this.kind,notice:reactions[this.kind].notice||null};
  }
}
