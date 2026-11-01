// 鲸伴 · 澄江子 / B站澄江子. MIT; third-party artwork keeps its own license.
export class KeyFeedback{
  constructor(app,baseUrl,images){
    this.app=app;this.baseUrl=baseUrl;this.images=images;this.items=new Map();this.pressed=new Set();this.enabled=true;
    this.layer=new PIXI.Container();app.stage.addChild(this.layer);
    // Upstream key artwork includes a hand; retain only the cyan key marking.
    this.filter=new PIXI.Filter(undefined,`varying vec2 vTextureCoord;uniform sampler2D uSampler;void main(){vec4 c=texture2D(uSampler,vTextureCoord);float mark=smoothstep(.08,.22,min(c.g,c.b)-c.r);gl_FragColor=vec4(.38,.59,1.,1.)*c.a*mark*.85;}`);
    this.layer.filters=[this.filter];
  }
  setEnabled(on){this.enabled=!!on;this.layer.visible=this.enabled;if(!on){this.pressed.clear();for(const item of this.items.values())item.until=0;}}
  update(keys=[]){
    if(!this.enabled||this.dead)return;
    const next=new Set(keys),now=performance.now();for(const key of this.pressed)if(!next.has(key)&&this.items.has(key))this.items.get(key).until=now;this.pressed=next;
    for(const key of this.pressed){
      const src=this.images[key];if(!src)continue;
      let item=this.items.get(key);if(!item){item={until:now+100};this.items.set(key,item);PIXI.Texture.fromURL(new URL(src,this.baseUrl).href).then(texture=>{if(this.dead)return;item.sprite=new PIXI.Sprite(texture);item.sprite.anchor.set(.5,.5);this.layer.addChild(item.sprite);}).catch(()=>{});}
      item.until=now+100;
    }
  }
  tick(model){
    if(this.dead)return;const now=performance.now();this.layer.position.copyFrom(model.position);
    for(const [key,item] of this.items){if(!item.sprite)continue;item.sprite.width=model.internalModel.width*model.scale.x;item.sprite.height=model.internalModel.height*model.scale.y;item.sprite.alpha=this.pressed.has(key)?1:Math.max(0,Math.min(1,(item.until+150-now)/150));}
  }
  destroy(){this.dead=true;this.items.clear();this.pressed.clear();this.filter.destroy();}
}
