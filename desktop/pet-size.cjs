function scalePet(bounds,area,factor){
  const maximum=Math.min(area.width/bounds.width,area.height/bounds.height);
  const minimum=Math.min(maximum,Math.max(240/bounds.width,380/bounds.height));
  const scale=Math.max(minimum,Math.min(maximum,factor));
  const width=Math.round(bounds.width*scale),height=Math.round(bounds.height*scale);
  // The orb is inset from the bottom-right corner in CSS. Keep that corner
  // stationary so the controls stay under the pointer while resizing.
  const x=Math.round(Math.max(area.x,Math.min(area.x+area.width-width,bounds.x+bounds.width-width)));
  const y=Math.round(Math.max(area.y,Math.min(area.y+area.height-height,bounds.y+bounds.height-height)));
  return {x,y,width,height};
}
module.exports={scalePet};
