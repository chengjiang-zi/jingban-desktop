const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop',{
  state:()=>ipcRenderer.invoke('desktop:state'),
  onCursor:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('desktop:cursor',listener);return ()=>ipcRenderer.removeListener('desktop:cursor',listener);},
  mediaPermissions:patch=>ipcRenderer.invoke('desktop:media-permissions',patch),
  pet:visible=>ipcRenderer.invoke('desktop:pet',!!visible),
  visibility:patch=>ipcRenderer.invoke('desktop:visibility',patch),
  onVisibility:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('desktop:visibility',listener);return ()=>ipcRenderer.removeListener('desktop:visibility',listener);},
  main:()=>ipcRenderer.invoke('desktop:main'),
  dragPet:(phase,anchor)=>ipcRenderer.invoke('desktop:drag-pet',phase,anchor),
  scalePet:factor=>ipcRenderer.invoke('desktop:scale-pet',factor),
  chat:request=>ipcRenderer.invoke('desktop:chat',request),
  onPetChat:callback=>{const listener=(_event,request)=>callback(request);ipcRenderer.on('desktop:chat',listener);return ()=>ipcRenderer.removeListener('desktop:chat',listener);},
  passThrough:on=>ipcRenderer.invoke('desktop:pass-through',!!on),
  startup:on=>ipcRenderer.invoke('desktop:startup',!!on),
  chooseModel:()=>ipcRenderer.invoke('desktop:choose-model'),
  chooseCore:()=>ipcRenderer.invoke('desktop:choose-core'),
  sources:()=>ipcRenderer.invoke('desktop:sources'),
  selectSource:id=>ipcRenderer.invoke('desktop:select-source',id)
});
