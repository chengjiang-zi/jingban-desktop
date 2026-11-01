import {TouchSequence} from './touch-reactions.mjs';
import {gazeTarget,stepGaze,clamp} from './gaze.mjs';
export class Avatar {
  constructor(container){this.container=container;this.mouth=0;this.expression='neutral';this.followCursor=true;this.gaze={x:0,y:0,hx:0,hy:0};this.touchSequence=new TouchSequence();
    if(window.desktop?.onCursor)window.desktop.onCursor(point=>{this.gazePoint=point.active?point:null;this.gazeAt=performance.now();});
    else{document.addEventListener('pointermove',e=>{this.gazePoint={x:e.clientX,y:e.clientY};});document.documentElement.addEventListener('pointerleave',()=>this.gazePoint=null);}
  }
  setFollowCursor(on){this.followCursor=!!on;}
  async load(){
    const response=await fetch('/api-model-entry');const {url}=await response.json();
    if(!url)throw new Error('在连接设置中选择角色模型和 Cubism Core');
    if(!window.PIXI?.live2d)throw new Error('角色渲染库未加载，请检查 Cubism Core 路径');
    this.app=new PIXI.Application({resizeTo:this.container,backgroundAlpha:0,antialias:true,preserveDrawingBuffer:true,resolution:Math.max(2,Math.min(devicePixelRatio,3)),autoDensity:true});
    this.app.ticker.maxFPS=30;
    this.container.append(this.app.view);
    this.model=await PIXI.live2d.Live2DModel.from(url,{autoInteract:false,autoUpdate:true});
    this.app.stage.addChild(this.model);this.model.anchor.set(.5,.5);
    const internal=this.model.internalModel;
    internal.renderer.setClippingMaskBufferSize(2048);
    internal.on('beforeModelUpdate',()=>{
      const t=performance.now()/1000,c=internal.coreModel;
      const now=performance.now(),rect=this.container.getBoundingClientRect(),bounds=this.model.getBounds();
      const point=this.followCursor&&(!window.desktop?.onCursor||now-(this.gazeAt||0)<300)?this.gazePoint:null;
      const target=gazeTarget(point,{x:rect.left+bounds.x,y:rect.top+bounds.y,width:bounds.width,height:bounds.height});
      this.gaze=stepGaze(this.gaze,target,(now-(this.gazeTime??now))/1000);this.gazeTime=now;
      const g=this.gaze;
      const pose=this.touchSequence.sample(now);
      c.setParameterValueById('ParamMouthOpenY',this.mouth);
      c.setParameterValueById('ParamAngleX',clamp(Math.sin(t*.55)*3+(this.expression==='thinking'?8:0)+pose.x+g.hx*18,-30,30));
      c.setParameterValueById('ParamAngleZ',clamp(Math.sin(t*.43)*2+pose.z-g.hx*3,-20,20));
      c.setParameterValueById('ParamAngleY',clamp(pose.y+g.hy*12,-30,30));c.setParameterValueById('ParamBodyAngleZ',pose.bodyZ);c.setParameterValueById('ParamBodyAngleX',pose.bodyX);
      c.setParameterValueById('ParamEyeBallX',g.x*.85);c.setParameterValueById('ParamEyeBallY',g.y*.75);
      c.setParameterValueById('ParamBreath',(Math.sin(t*1.7)+1)/2);
      const blink=(t%4.7)<.15?Math.abs((t%4.7)/.075-1):1;
      c.setParameterValueById('ParamEyeLOpen',blink*pose.eyeL);c.setParameterValueById('ParamEyeROpen',blink*pose.eyeR);
      c.setParameterValueById('ParamMouthForm',this.expression==='happy'?1:pose.smile);
      c.setParameterValueById('ParamBrowLY',this.expression==='surprised'?.6:pose.brow);c.setParameterValueById('ParamBrowRY',this.expression==='surprised'?.6:pose.brow);
    });
    this.observer=new ResizeObserver(()=>this.fit());this.observer.observe(this.container);this.fit();
  }
  fit(){if(!this.model)return;const w=this.container.clientWidth,h=this.container.clientHeight;const internal=this.model.internalModel;const framing=this.framing||(this.closeup?'close':'full');const zoom=({full:.96,half:1.85,close:2.6,detail:3.4}[framing])*(this.zoom||1);this.model.scale.set(Math.min(w/internal.width,h/internal.height)*zoom);this.model.position.set(w/2,h/2+h*({full:0,half:.36,close:.68,detail:1.02}[framing]));}
  resizeBy(factor){this.zoom=Math.max(.65,Math.min(1.8,(this.zoom||1)*factor));this.fit();}
  touches(x,y){
    if(!this.app||!this.model)return false;
    const canvas=this.app.view,r=canvas.getBoundingClientRect();
    if(x<r.left||x>=r.right||y<r.top||y>=r.bottom)return false;
    if(!this.hitCanvas){this.hitCanvas=document.createElement('canvas');this.hitCanvas.width=this.hitCanvas.height=1;this.hitContext=this.hitCanvas.getContext('2d',{willReadFrequently:true});}
    const ctx=this.hitContext;ctx.clearRect(0,0,1,1);ctx.drawImage(canvas,Math.floor((x-r.left)*canvas.width/r.width),Math.floor((y-r.top)*canvas.height/r.height),1,1,0,0,1,1);
    return ctx.getImageData(0,0,1,1).data[3]>35;
  }
  setFraming(value){if(!['full','half','close','detail'].includes(value))return;this.framing=value;this.closeup=value==='close';this.zoom=1;this.fit();}
  toggleView(){this.framing=null;this.closeup=!this.closeup;this.fit();return this.closeup;}
  touch(x,y){const rect=this.container.getBoundingClientRect(),bounds=this.model.getBounds();const nx=(x-rect.left-bounds.x)/bounds.width,ny=(y-rect.top-bounds.y)/bounds.height;const zone=ny<.28?'head':(nx<.2||nx>.8)?'edge':'body';const result=this.touchSequence.trigger(zone,nx<.5?-1:1,performance.now());this.touchNotice=result.notice;return result.kind;}
  setMouth(value){this.mouth=Math.max(0,Math.min(1,value));}
  perform(expression){this.expression=expression;clearTimeout(this.timer);this.timer=setTimeout(()=>this.expression='neutral',4000);}
}
