import {KeyFeedback} from './key-feedback.mjs';
import {constrainBongoScene} from './bongo-scene.mjs';
import {TouchSequence} from './touch-reactions.mjs';
import {gazeTarget,stepGaze,clamp} from './gaze.mjs';
export class Avatar {
  constructor(container){this.container=container;this.mouth=0;this.expression='neutral';this.followCursor=true;this.gaze={x:0,y:0,hx:0,hy:0};this.touchSequence=new TouchSequence();this.hands={left:false,right:false};
    window.desktop?.onHands(value=>{this.hands=value;this.keyFeedback?.update(value.keys||[]);const now=performance.now();if(value.left||((this.mouseRig||this.mouseSprite)&&value.right))this.leftUntil=now+100;if(value.right)this.rightUntil=now+100;if(value.mouseLeft)this.mouseLeftUntil=now+100;if(value.mouseRight)this.mouseRightUntil=now+100;});
    document.addEventListener('keydown',e=>{if(!window.desktop?.onHands)this.hands[e.code.match(/^(Key[QWERTASDFGZXCVB]|Digit[1-5])$/)?'left':'right']=true;});
    document.addEventListener('keyup',()=>{if(!window.desktop?.onHands)this.hands={left:false,right:false};});
    window.addEventListener('blur',()=>this.hands={left:false,right:false});
    if(window.desktop?.onCursor)window.desktop.onCursor(point=>{this.gazePoint=point.active?point:null;this.gazeAt=performance.now();});
    else{document.addEventListener('pointermove',e=>{this.gazePoint={x:e.clientX,y:e.clientY};});document.documentElement.addEventListener('pointerleave',()=>this.gazePoint=null);}
  }
  setInputFeedback(on){this.inputFeedback=!!on;this.keyFeedback?.setEnabled(on);}
  setFollowCursor(on){this.followCursor=!!on;}
  async load(){
    const generation=this.loadGeneration=(this.loadGeneration||0)+1;
    const response=await fetch('/api-model-entry');const {url,keyImages={}}=await response.json();
    if(!url)throw new Error('在连接设置中选择角色模型和 Cubism Core');
    if(!window.PIXI?.live2d)throw new Error('角色渲染库未加载，请检查 Cubism Core 路径');
    const model=await PIXI.live2d.Live2DModel.from(url,{autoInteract:false,autoUpdate:true});
    const parameters=model.internalModel.coreModel.getModel().parameters.ids;const bongo=parameters.includes('CatParamLeftHandDown');
    let scene={},mouseTexture=null;if(bongo){try{const r=await fetch(new URL('companion-scene.json',new URL(url,location.href)));if(r.ok)scene=await r.json();if(scene.mouseSprite){mouseTexture=await PIXI.Texture.fromURL(new URL('resources/mouse-atlas.png',new URL(url,location.href)).href);}}catch{}}
    let background=null;if(bongo){try{background=await PIXI.Texture.fromURL(new URL('resources/background.png',new URL(url,location.href)).href);}catch{}}
    if(generation!==this.loadGeneration){model.destroy();return;}
    this.observer?.disconnect();this.keyFeedback?.destroy();
    if(this.app)this.app.destroy(true,{children:true,texture:false,baseTexture:false});
    this.app=new PIXI.Application({resizeTo:this.container,backgroundAlpha:0,antialias:true,preserveDrawingBuffer:true,resolution:Math.max(2,Math.min(devicePixelRatio,3)),autoDensity:true});
    this.app.ticker.maxFPS=30;this.container.append(this.app.view);
    this.model=model;
    this.bongo=bongo;this.mouseRig=parameters.includes('ParamMouseX');
    this.background=null;if(background){this.background=new PIXI.Sprite(background);this.background.anchor.set(.5,.5);this.app.stage.addChild(this.background);}
    this.framing='full';this.closeup=false;this.zoom=1;
    this.app.stage.addChild(this.model);this.model.anchor.set(.5,.5);
    // This skin's desk is a foreground layer: cover hair and cuffs below its edge.
    if(scene.mouseSprite&&this.background)this.app.stage.addChild(this.background);
    this.mouseSprite=null;if(mouseTexture){this.mouseSprite=new PIXI.Sprite(new PIXI.Texture(mouseTexture.baseTexture,new PIXI.Rectangle(258,204,90,83)));this.mouseSprite.anchor.set(.5,.5);this.app.stage.addChild(this.mouseSprite);}
    this.keyFeedback=this.bongo?new KeyFeedback(this.app,new URL(url,location.href),keyImages):null;this.keyFeedback?.setEnabled(this.inputFeedback!==false);
    this.mouseFeedback=null;if(this.mouseSprite){this.mouseFeedback=new PIXI.Graphics();this.mouseSprite.addChild(this.mouseFeedback);}
    const internal=this.model.internalModel;
    if(this.bongo)constrainBongoScene(internal,scene);
    if(!this.bongo)internal.renderer.setClippingMaskBufferSize(2048);
    internal.on('beforeModelUpdate',()=>{
      const t=performance.now()/1000,c=internal.coreModel;
      const now=performance.now(),rect=this.container.getBoundingClientRect(),bounds=this.model.getBounds();
      const point=this.followCursor&&(!window.desktop?.onCursor||now-(this.gazeAt||0)<300)?this.gazePoint:null;
      const target=gazeTarget(point,{x:rect.left+bounds.x,y:rect.top+bounds.y,width:bounds.width,height:bounds.height});
      this.gaze=stepGaze(this.gaze,target,(now-(this.gazeTime??now))/1000);this.gazeTime=now;
      const g=this.gaze;this.keyFeedback?.tick(this.model);
      if(this.mouseFeedback){const f=this.mouseFeedback;f.clear();if(this.inputFeedback!==false){if(this.hands.mouseLeft||now<(this.mouseLeftUntil||0))f.beginFill(0x70a5ff,.7).drawEllipse(-12,-14,10,13).endFill();if(this.hands.mouseRight||now<(this.mouseRightUntil||0))f.beginFill(0xa08aff,.7).drawEllipse(10,-10,10,13).endFill();}}
      const pose=this.touchSequence.sample(now);
      if(this.bongo){c.setParameterValueById('CatParamLeftHandDown',this.hands.left||((this.mouseRig||this.mouseSprite)&&this.hands.right)||now<Math.max(this.tapUntil||0,this.leftUntil||0)?1:0);c.setParameterValueById('CatParamRightHandDown',this.mouseSprite?(this.hands.mouseLeft||this.hands.mouseRight?1:0):(this.hands.right||now<(this.rightUntil||0)?1:0));c.setParameterValueById('ParamEyeBallX',g.x*.4);c.setParameterValueById('ParamEyeBallY',g.y*.35);if(this.mouseSprite){const scale=this.model.scale.x;this.mouseSprite.position.set(this.model.x+(-160+g.x*12)*scale,this.model.y+(68-g.y*8)*scale);this.mouseSprite.tint=0xffffff;}if(this.mouseRig){c.setParameterValueById('ParamMouseX',g.x*10);c.setParameterValueById('ParamMouseY',g.y*10);c.setParameterValueById('ParamMouseLeftDown',this.hands.mouseLeft?1:0);c.setParameterValueById('ParamMouseRightDown',this.hands.mouseRight?1:0);}return;}
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
  fit(){if(!this.model)return;const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;
    // Settings hide the canvas: restore its drawing buffer when the page returns.
    if(this.app.renderer.width!==Math.round(w*this.app.renderer.resolution)||this.app.renderer.height!==Math.round(h*this.app.renderer.resolution))this.app.renderer.resize(w,h);
    const internal=this.model.internalModel;const framing=this.framing||(this.closeup?'close':'full');const zoom=((this.bongo?{full:.96,half:1.1,close:1.25,detail:1.4}:{full:.96,half:1.85,close:2.6,detail:3.4})[framing])*(this.zoom||1);this.model.scale.set(Math.min(w/internal.width,h/internal.height)*zoom);this.model.position.set(w/2,h/2+(this.bongo?0:h*({full:0,half:.36,close:.68,detail:1.02}[framing])));if(this.mouseSprite)this.mouseSprite.scale.set(this.model.scale.x*.85);if(this.background){this.background.width=internal.width*this.model.scale.x;this.background.height=internal.height*this.model.scale.y;this.background.position.copyFrom(this.model.position);}}

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
  touch(x,y){if(!this.model)return 'head';if(this.bongo)this.tapUntil=performance.now()+180;const rect=this.container.getBoundingClientRect(),bounds=this.model.getBounds();const nx=(x-rect.left-bounds.x)/bounds.width,ny=(y-rect.top-bounds.y)/bounds.height;const zone=ny<.28?'head':(nx<.2||nx>.8)?'edge':'body';const result=this.touchSequence.trigger(zone,nx<.5?-1:1,performance.now());this.touchNotice=result.notice;return result.kind;}
  setMouth(value){this.mouth=Math.max(0,Math.min(1,value));}
  perform(expression){this.expression=expression;clearTimeout(this.timer);this.timer=setTimeout(()=>this.expression='neutral',4000);}
}
