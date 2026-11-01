export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function gazeTarget(point,bounds){
  if(!point||!bounds||bounds.width<=0||bounds.height<=0)return {x:0,y:0};
  const dx=point.x-(bounds.x+bounds.width*.5),dy=(bounds.y+bounds.height*.18)-point.y;
  return {x:Math.tanh(dx/Math.max(160,bounds.width*.8)),y:Math.tanh(dy/Math.max(140,bounds.height*.4))};
}
export function stepGaze(state,target,seconds){
  const dt=clamp(seconds,0,.1),eyes=1-Math.exp(-dt/ .1),head=1-Math.exp(-dt/ .28);
  return {x:state.x+(target.x-state.x)*eyes,y:state.y+(target.y-state.y)*eyes,hx:state.hx+(target.x-state.hx)*head,hy:state.hy+(target.y-state.hy)*head};
}
