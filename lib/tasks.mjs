import crypto from 'node:crypto';
export class Tasks {
  constructor(emit) { this.tasks=new Map(); this.emit=emit; }
  create(command,payload,requestId) {
    if (requestId && this.tasks.has(requestId)) {
      const prior=this.tasks.get(requestId);
      if(prior.command!==command || JSON.stringify(prior.payload)!==JSON.stringify(payload))throw new Error('requestId 已用于不同任务');
      return prior;
    }
    const task={id:requestId || crypto.randomUUID(),command,payload,status:'queued',createdAt:Date.now()};
    if(this.tasks.size>=100){const oldest=[...this.tasks.values()].find(t=>['completed','cancelled','error'].includes(t.status));if(!oldest)throw new Error('任务队列已满');this.tasks.delete(oldest.id);}
    this.tasks.set(task.id,task);this.emit('task',task);return task;
  }
  claim(id,client) {const t=this.tasks.get(id);if(!t || t.status!=='queued')return false;t.status='running';t.client=client;t.updatedAt=Date.now();this.emit('task',t);return true;}
  finish(id,client,status,error) {
    const t=this.tasks.get(id);
    if(!t || t.status!=='running' || t.client!==client || !['completed','cancelled','error'].includes(status))throw new Error('任务状态不允许此操作');
    t.status=status;t.error=error?.slice(0,300);t.updatedAt=Date.now();this.emit('task',t);return t;
  }
  stop() {for(const t of this.tasks.values())if(['queued','running'].includes(t.status)){t.status='cancelled';t.updatedAt=Date.now();this.emit('task',t);}this.emit('stop',{});}
  disconnect(client) {for(const t of this.tasks.values())if(t.client===client && t.status==='running'){t.status='error';t.error='播放客户端断开';t.updatedAt=Date.now();this.emit('task',t);}}
  list(){return [...this.tasks.values()].map(t=>({...t}));}
}
