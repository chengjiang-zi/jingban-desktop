import {KeyFeedback} from './key-feedback.mjs';
import {constrainBongoScene} from './bongo-scene.mjs';
import {TouchSequence} from './touch-reactions.mjs';
import {gazeTarget,stepGaze,clamp} from './gaze.mjs';
import {actionCatalog,actionChannels,gestures,sampleAction,validateAction} from './actions.mjs';
export class Avatar {
  constructor(container){this.container=container;this.mouth=0;this.expression='neutral';this.followCursor=true;this.gaze={x:0,y:0,hx:0,hy:0};this.touchSequence=new TouchSequence();this.hands={left:false,right:false};
    const updateHands=value=>{this.hands=value;this.keyFeedback?.update(value.keys||[]);const now=performance.now();if(value.left||((this.mouseRig||this.mouseSprite)&&value.right))this.leftUntil=now+100;if(value.right)this.rightUntil=now+100;if(value.mouseLeft)this.mouseLeftUntil=now+100;if(value.mouseRight)this.mouseRightUntil=now+100;};
    this.globalCursor=false;
    const features=window.desktop?.features?.()??Promise.resolve({});
    features.catch(()=>({})).then(({globalInput,globalCursor})=>{
      if(globalInput)window.desktop.onHands(value=>{if(value.error){this.setupLocalInput(updateHands);}updateHands(value);});
      else this.setupLocalInput(updateHands);
      this.globalCursor=!!globalCursor;
      if(globalCursor)window.desktop.onCursor(point=>{this.gazePoint=point.active?point:null;this.gazeAt=performance.now();});
      else{
        document.addEventListener('pointermove',e=>{this.gazePoint={x:e.clientX,y:e.clientY};});
        document.documentElement.addEventListener('pointerleave',()=>this.gazePoint=null);
      }
    });
    window.addEventListener('blur',()=>{updateHands({left:false,right:false});if(!this.globalCursor)this.gazePoint=null;});
  }
  setupLocalInput(update){
    if(this.localInput)return;
    this.localInput=true;
    const keys=new Set(),buttons=new Set();
    const isLeft=code=>/^(Key[QWERTASDFGZXCVB]|Digit[1-5])$/.test(code);
    const label=code=>code.replace(/^Digit([0-9])$/,'Num$1').replace(/^Arrow(Left|Right|Up|Down)$/,'$1Arrow');
    const send=()=>update({left:[...keys].some(isLeft),right:[...keys].some(code=>!isLeft(code)),mouseLeft:buttons.has(0),mouseRight:buttons.has(2),keys:[...keys].map(label)});
    document.addEventListener('keydown',event=>{if(event.code){keys.add(event.code);send();}});
    document.addEventListener('keyup',event=>{keys.delete(event.code);send();});
    document.addEventListener('pointerdown',event=>{buttons.add(event.button);send();});
    document.addEventListener('pointerup',event=>{buttons.delete(event.button);send();});
    for(const event of ['blur','pointercancel'])window.addEventListener(event,()=>{keys.clear();buttons.clear();send();});
  }
  setInputFeedback(on){this.inputFeedback=!!on;this.keyFeedback?.setEnabled(on);}
  setFishTouch(on){this.fishTouch=!!on;}
  setFollowCursor(on){this.followCursor=!!on;}
  async load(){
    const generation=this.loadGeneration=(this.loadGeneration||0)+1;
    const response=await fetch('/api-model-entry');const {url,version,keyImages={}}=await response.json();
    if(!url)throw new Error('在连接设置中选择角色模型和 Cubism Core');
    if(!window.Live2DCubismCore || !window.PIXI?.live2d?.Live2DModel)throw new Error('小鱼已内置，请先在连接设置中选择 Cubism Core 文件');
    const model=await PIXI.live2d.Live2DModel.from(url,{autoInteract:false,autoUpdate:true});
    const parameters=model.internalModel.coreModel.getModel().parameters.ids;const bongo=parameters.includes('CatParamLeftHandDown');
    let scene={},mouseTexture=null;if(bongo){try{const r=await fetch(new URL('companion-scene.json',new URL(url,location.href)));if(r.ok)scene=await r.json();if(scene.mouseSprite){mouseTexture=await PIXI.Texture.fromURL(new URL('resources/mouse-atlas.png',new URL(url,location.href)).href);}}catch{}}
    let background=null;if(bongo){try{background=await PIXI.Texture.fromURL(new URL('resources/background.png',new URL(url,location.href)).href);}catch{}}
    if(generation!==this.loadGeneration){model.destroy();return;}
    this.stopAction();
    this.observer?.disconnect();this.keyFeedback?.destroy();
    if(this.app)this.app.destroy(true,{children:true,texture:false,baseTexture:false});
    this.app=new PIXI.Application({resizeTo:this.container,backgroundAlpha:0,antialias:true,preserveDrawingBuffer:true,resolution:Math.max(2,Math.min(devicePixelRatio,3)),autoDensity:true});
    this.app.ticker.maxFPS=30;this.container.append(this.app.view);
    this.model=model;
    this.modelVersion=version;
    const internal=model.internalModel;
    this.actions=actionCatalog(parameters,internal.motionManager.definitions);
    this.actionParameters=Object.fromEntries(Object.entries(actionChannels).map(([channel,ids])=>[
      channel,ids.filter(id=>parameters.includes(id))
    ]));
    this.bongo=bongo;this.mouseRig=parameters.includes('ParamMouseX');
    this.background=null;if(background){this.background=new PIXI.Sprite(background);this.background.anchor.set(.5,.5);this.app.stage.addChild(this.background);}
    this.framing='full';this.closeup=false;this.zoom=1;
    this.app.stage.addChild(this.model);this.model.anchor.set(.5,.5);
    // This skin's desk is a foreground layer: cover hair and cuffs below its edge.
    if(scene.mouseSprite&&this.background)this.app.stage.addChild(this.background);
    this.mouseSprite=null;if(mouseTexture){this.mouseSprite=new PIXI.Sprite(new PIXI.Texture(mouseTexture.baseTexture,new PIXI.Rectangle(258,204,90,83)));this.mouseSprite.anchor.set(.5,.5);this.app.stage.addChild(this.mouseSprite);}
    this.keyFeedback=this.bongo?new KeyFeedback(this.app,new URL(url,location.href),keyImages):null;this.keyFeedback?.setEnabled(this.inputFeedback!==false);
    this.mouseFeedback=null;if(this.mouseSprite){this.mouseFeedback=new PIXI.Graphics();this.mouseSprite.addChild(this.mouseFeedback);}
    if(this.bongo)constrainBongoScene(internal,scene);
    if(!this.bongo)internal.renderer.setClippingMaskBufferSize(2048);
    internal.on('beforeModelUpdate',()=>{
      const t=performance.now()/1000,c=internal.coreModel;
      const now=performance.now(),rect=this.container.getBoundingClientRect(),bounds=this.model.getBounds();
      const point=this.followCursor&&(!this.globalCursor||now-(this.gazeAt||0)<300)?this.gazePoint:null;
      const target=gazeTarget(point,{x:rect.left+bounds.x,y:rect.top+bounds.y,width:bounds.width,height:bounds.height});
      this.gaze=stepGaze(this.gaze,target,(now-(this.gazeTime??now))/1000);this.gazeTime=now;
      const g=this.gaze;this.keyFeedback?.tick(this.model);
      if(this.mouseFeedback){const f=this.mouseFeedback;f.clear();if(this.inputFeedback!==false){if(this.hands.mouseLeft||now<(this.mouseLeftUntil||0))f.beginFill(0x70a5ff,.7).drawEllipse(-12,-14,10,13).endFill();if(this.hands.mouseRight||now<(this.mouseRightUntil||0))f.beginFill(0xa08aff,.7).drawEllipse(10,-10,10,13).endFill();}}
      const action=this.action;
      const elapsed=action?now-action.start:0;
      if(action?.frames&&elapsed>=action.frames.at(-1)[0])this.action=null;
      const animated=action?.frames?sampleAction(action.frames,elapsed):{};
      const native=!!action?.native;
      const pose=this.touchSequence.sample(now);
      if(this.bongo){
        const left=this.hands.left||((this.mouseRig||this.mouseSprite)&&this.hands.right)||now<Math.max(this.tapUntil||0,this.leftUntil||0);
        const right=this.mouseSprite?this.hands.mouseLeft||this.hands.mouseRight:this.hands.right||now<(this.rightUntil||0);
        if(left||!native)c.setParameterValueById('CatParamLeftHandDown',left?1:Math.max(0,animated.handL??0));
        if(right||!native)c.setParameterValueById('CatParamRightHandDown',right?1:Math.max(0,animated.handR??0));
        if(!native){c.setParameterValueById('ParamEyeBallX',g.x*.4);c.setParameterValueById('ParamEyeBallY',g.y*.35);}
        if(this.mouseSprite){const scale=this.model.scale.x;this.mouseSprite.position.set(this.model.x+(-160+g.x*12)*scale,this.model.y+(68-g.y*8)*scale);this.mouseSprite.tint=0xffffff;}
        if(this.mouseRig){c.setParameterValueById('ParamMouseX',g.x*10);c.setParameterValueById('ParamMouseY',g.y*10);c.setParameterValueById('ParamMouseLeftDown',this.hands.mouseLeft?1:0);c.setParameterValueById('ParamMouseRightDown',this.hands.mouseRight?1:0);}
        if(this.mouth>0)c.setParameterValueById('ParamMouthOpenY',this.mouth);
        this.applyActionPose(c,animated);
        return;
      }
      c.setParameterValueById('ParamMouthOpenY',this.mouth);
      if(native)return;
      c.setParameterValueById('ParamAngleX',clamp(Math.sin(t*.55)*3+(this.expression==='thinking'?8:0)+pose.x+g.hx*18,-30,30));
      c.setParameterValueById('ParamAngleZ',clamp(Math.sin(t*.43)*2+pose.z-g.hx*3,-20,20));
      c.setParameterValueById('ParamAngleY',clamp(pose.y+g.hy*12,-30,30));c.setParameterValueById('ParamBodyAngleZ',pose.bodyZ);c.setParameterValueById('ParamBodyAngleX',pose.bodyX);
      c.setParameterValueById('ParamEyeBallX',g.x*.85);c.setParameterValueById('ParamEyeBallY',g.y*.75);
      c.setParameterValueById('ParamBreath',(Math.sin(t*1.7)+1)/2);
      const blink=(t%4.7)<.15?Math.abs((t%4.7)/.075-1):1;
      c.setParameterValueById('ParamEyeLOpen',blink*pose.eyeL);c.setParameterValueById('ParamEyeROpen',blink*pose.eyeR);
      c.setParameterValueById('ParamMouthForm',this.expression==='happy'?1:pose.smile);
      c.setParameterValueById('ParamBrowLY',this.expression==='surprised'?.6:pose.brow);c.setParameterValueById('ParamBrowRY',this.expression==='surprised'?.6:pose.brow);
      this.applyActionPose(c,animated);
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
  touch(x,y){if(!this.model)return null;if(this.bongo){this.touchNotice=null;if(!this.fishTouch)return null;this.tapUntil=performance.now()+180;return 'fish';}const rect=this.container.getBoundingClientRect(),bounds=this.model.getBounds();const nx=(x-rect.left-bounds.x)/bounds.width,ny=(y-rect.top-bounds.y)/bounds.height;const zone=ny<.28?'head':(nx<.2||nx>.8)?'edge':'body';const result=this.touchSequence.trigger(zone,nx<.5?-1:1,performance.now());this.touchNotice=result.notice;return result.kind;}
  setMouth(value){this.mouth=Math.max(0,Math.min(1,value));}
  applyActionPose(core,pose){
    const {minimumValues,maximumValues}=core.getModel().parameters;
    for(const [channel,value] of Object.entries(pose)){
      if(!value||channel==='handL'||channel==='handR')continue;
      for(const id of this.actionParameters[channel]||[]){
        const index=core.getParameterIndex(id);
        const current=core.getParameterValueByIndex(index);
        const eye=channel==='eyeL'||channel==='eyeR';
        const target=(eye?value<0:value>0)?maximumValues[index]:minimumValues[index];
        core.setParameterValueByIndex(index,current+(target-current)*Math.abs(value));
      }
    }
  }
  stopAction(){
    const action=this.action;
    this.action=null;
    if(action?.native){
      clearTimeout(action.timer);
      action.manager.off('motionFinish',action.finish);
      action.manager.stopAllMotions();
      // Cubism saves the last keyed values as its next base pose.
      if(action.base){
        const core=this.model.internalModel.coreModel;
        action.base.forEach((value,index)=>core.setParameterValueByIndex(index,value));
        core.saveParameters();
      }
    }
  }
  stopAutomaticAction(){
    if(this.action?.automatic)this.stopAction();
  }
  async playAction(input,modelVersion=this.modelVersion,automatic=false){
    if(!this.model||!this.actions)throw new Error('请先加载角色');
    if(modelVersion!==this.modelVersion)throw new Error('角色已切换，请重新选择动作');
    const action=validateAction(input,this.actions);
    this.stopAction();
    if(!action.motion){
      this.action={frames:action.frames||gestures[action.preset].frames,start:performance.now(),automatic};
      return true;
    }
    const model=this.model;
    const manager=model.internalModel.motionManager;
    const base=Array.from(model.internalModel.coreModel.getModel().parameters.values);
    const current={native:true,automatic,manager,base,finish:()=>{if(this.action===current)this.stopAction();}};
    this.action=current;
    const runtime=PIXI.live2d.config;
    const sound=runtime.sound;
    try{
      // The renderer reads this flag synchronously, before loading the clip.
      let playing;
      try{
        runtime.sound=false;
        playing=model.motion(action.motion.group,action.motion.index,3);
      }finally{runtime.sound=sound;}
      const started=await playing;
      if(this.action!==current)return false;
      if(!started)throw new Error('模型原生动作加载失败');
      manager.once('motionFinish',current.finish);
      current.timer=setTimeout(current.finish,action.duration);
      return true;
    }catch(error){
      if(this.action===current)this.stopAction();
      throw error;
    }
  }
  perform(expression){this.expression=expression;clearTimeout(this.timer);this.timer=setTimeout(()=>this.expression='neutral',4000);}
}
