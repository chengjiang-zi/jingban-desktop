export class PCMPlayer {
  constructor(context,destination){this.context=context;this.destination=destination;this.sources=new Set();this.cursor=0;this.first=0;this.underruns=0;this.stopped=false;}
  enqueue(bytes,sampleRate){
    if(this.stopped)return;
    if(bytes.byteLength%2)throw new Error('PCM 数据未按采样对齐');
    const pcm=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const buffer=this.context.createBuffer(1,bytes.byteLength/2,sampleRate);const samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=pcm.getInt16(i*2,true)/32768;
    const now=this.context.currentTime;
    if(this.cursor<now+.015){if(this.cursor)this.underruns++;this.cursor=now+.12;}
    if(!this.first)this.first=this.cursor;
    const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.destination);this.sources.add(source);
    source.onended=()=>{source.disconnect();this.sources.delete(source);};source.start(this.cursor);this.cursor+=buffer.duration;
  }
  get playing(){return !this.stopped&&this.context.currentTime>=this.first&&this.context.currentTime<this.cursor;}
  async drain(signal){while(this.sources.size&&!this.stopped){if(signal?.aborted)throw new DOMException('已停止','AbortError');await new Promise(r=>setTimeout(r,25));}}
  stop(){this.stopped=true;for(const source of this.sources){try{source.stop();}catch{}source.disconnect();}this.sources.clear();}
}
