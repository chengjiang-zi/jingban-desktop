// Some older Bongo rigs park inactive effects outside their declared canvas.
// Cubism's renderer resets PIXI mask state, so exclude fully off-canvas meshes
// for the draw call itself, restoring the model immediately afterwards.
export function outsideCanvas(vertices,canvas){
  const unit=canvas.PixelsPerUnit,left=-canvas.CanvasOriginX/unit,right=(canvas.CanvasWidth-canvas.CanvasOriginX)/unit;
  const top=canvas.CanvasOriginY/unit,bottom=-(canvas.CanvasHeight-canvas.CanvasOriginY)/unit;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(let i=0;i<vertices.length;i+=2){minX=Math.min(minX,vertices[i]);maxX=Math.max(maxX,vertices[i]);minY=Math.min(minY,vertices[i+1]);maxY=Math.max(maxY,vertices[i+1]);}
  return maxX<left||minX>right||maxY<bottom||minY>top;
}
export function transformEye(vertices,style){
  const original=vertices.slice();let cx=0,cy=0;
  for(let i=0;i<vertices.length;i+=2){cx+=vertices[i];cy+=vertices[i+1];}cx/=vertices.length/2;cy/=vertices.length/2;
  const value=(key,fallback,limit)=>Number.isFinite(style[key])?Math.max(-limit,Math.min(limit,style[key])):fallback;
  const sx=value('sx',1,3),sy=value('sy',1,3),dx=value('dx',0,.2),dy=value('dy',0,.2);
  for(let i=0;i<vertices.length;i+=2){vertices[i]=cx+(vertices[i]-cx)*sx+dx;vertices[i+1]=cy+(vertices[i+1]-cy)*sy+dy;}
  return original;
}
export function constrainBongoScene(internal,style={}){
  const draw=internal.draw,core=internal.coreModel.getModel();
  internal.draw=function(...args){
    const d=core.drawables,hidden=[],edited=[];
    for(let i=0;i<d.count;i++){
      if(d.opacities[i]&&(style.hideDrawables?.includes(d.ids[i])||outsideCanvas(d.vertexPositions[i],core.canvasinfo))){hidden.push([i,d.opacities[i]]);d.opacities[i]=0;}
      if(style.eyes?.[d.ids[i]])edited.push([i,transformEye(d.vertexPositions[i],style.eyes[d.ids[i]])]);
    }
    try{return draw.apply(this,args);}finally{for(const [i,alpha] of hidden)d.opacities[i]=alpha;for(const [i,vertices] of edited)d.vertexPositions[i].set(vertices);}
  };
}
