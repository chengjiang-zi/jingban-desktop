export function understandingScore(notes=[],memories=[]){
 const facts=new Map();
 for(const item of [...notes.map(n=>({text:n.text,confirmed:true})),...memories.map(m=>({text:m.memory,confirmed:m.metadata?.confirmed===true}))]){
   if(typeof item.text!=='string')continue;
   const key=item.text.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{Z}\s]/gu,'');if(key.length<2)continue;
   const weight=item.confirmed?1:.5;facts.set(key,Math.max(facts.get(key)||0,weight));
 }
 const weight=[...facts.values()].reduce((a,b)=>a+b,0);
 return {score:Math.min(100,Math.round(100*(1-Math.exp(-weight/20)))),facts:facts.size,confirmed:[...facts.values()].filter(w=>w===1).length};
}
