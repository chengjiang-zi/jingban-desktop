// Recording continues during ASR and replies. Completed new turns replace pending work.
import {openDevice} from './media-devices.mjs';
export class HandsFreeCall {
  constructor({onTurn,onState,onError}){Object.assign(this,{onTurn,onState,onError});this.active=false;}
  async start(){
    if(this.active)return;this.active=true;const generation=this.generation=(this.generation||0)+1;
    try{
      const stream=await openDevice('audio');
      if(!this.active||generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;this.context=new AudioContext();await this.context.resume();
      this.analyser=this.context.createAnalyser();this.analyser.fftSize=1024;
      this.context.createMediaStreamSource(stream).connect(this.analyser);
      stream.getAudioTracks()[0].onended=()=>{if(this.active){this.stop();this.onError(new Error('麦克风已断开，通话结束'));}};
      this.listen(generation);
    }catch(e){this.stop();throw e;}
  }
  listen(generation){
    if(!this.active||generation!==this.generation)return;
    this.onState('listening');const chunks=[];let voiceMs=0,lastVoice=0,started=performance.now(),previous=started;
    const recorder=this.recorder=new MediaRecorder(this.stream);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>{this.stop();this.onError(new Error('麦克风录音失败，通话已结束'));};
    recorder.onstop=()=>{
      if(!this.active||generation!==this.generation)return;
      clearInterval(this.timer);
      if(voiceMs<250){this.listen(generation);return;}
      this.cancelPending();const abort=this.abort=new AbortController();
      this.listen(generation);
      this.onState('processing');
      Promise.resolve().then(()=>{if(!abort.signal.aborted)return this.onTurn(new Blob(chunks,{type:recorder.mimeType}),abort.signal);})
        .catch(e=>{if(this.active&&generation===this.generation&&!abort.signal.aborted&&e.name!=='AbortError')this.onError(e);})
        .finally(()=>{if(this.active&&generation===this.generation&&this.abort===abort){this.abort=null;this.onState('listening');}});
    };
    recorder.start(200);const values=new Float32Array(this.analyser.fftSize);
    this.timer=setInterval(()=>{
      this.analyser.getFloatTimeDomainData(values);const rms=Math.sqrt(values.reduce((n,x)=>n+x*x,0)/values.length);
      const now=performance.now();if(rms>.018){voiceMs+=Math.min(150,now-previous);lastVoice=now;}previous=now;
      if((voiceMs>=250&&now-lastVoice>1000)||now-started>20000||(!lastVoice&&now-started>8000)){
        clearInterval(this.timer);if(recorder.state==='recording')recorder.stop();
      }
    },100);
  }
  cancelPending(){this.abort?.abort();this.abort=null;}
  stop(){this.active=false;this.generation=(this.generation||0)+1;clearInterval(this.timer);this.cancelPending();if(this.recorder?.state==='recording')this.recorder.stop();this.stream?.getTracks().forEach(t=>t.stop());this.context?.close().catch(()=>{});this.onState('ended');}
}
