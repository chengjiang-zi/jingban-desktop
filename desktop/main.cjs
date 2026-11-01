// 鲸伴 Beta · 作者澄江子 / B站澄江子 · MIT
const {app,BrowserWindow,ipcMain,Tray,Menu,nativeImage,dialog,desktopCapturer,session,safeStorage,screen}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
const {existsSync}=require('node:fs');
const {pathToFileURL}=require('node:url');
const {ModelLibrary}=require('./model-library.cjs');
const {BongoInput}=require('./bongo-input.cjs');
let modelLibrary;
const bongoInput=new BongoInput(value=>{for(const win of [main,pet])if(win&&!win.isDestroyed())win.webContents.send('desktop:hands',value);});
const {PetDrag}=require('./pet-drag.cjs');
const {scalePet}=require('./pet-size.cjs');
const {MediaPermissions}=require('./media-permissions.cjs');
const petDrag=new PetDrag(()=>screen.getCursorScreenPoint());
let host,main,pet,tray,quitting=false,selectedSource,dragTimer,dragTimeout,cursorTimer;
function endPetDrag(){clearInterval(dragTimer);clearTimeout(dragTimeout);return petDrag.end();}
app.setName('鲸伴');app.setAppUserModelId('local.desktop-companion');
const iconFolder=path.join(__dirname,'../web/assets');
const appIcon=path.join(iconFolder,existsSync(path.join(iconFolder,'app.ico'))?'app.ico':'public-icon.ico');
if(!app.requestSingleInstanceLock())app.quit();
app.on('second-instance',()=>{main?.show();main?.focus();});
const options={preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'};
function secure(win){
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(host.origin+'/'))event.preventDefault();});
}
function showMain(){main.show();main.focus();}
function showPet(){
  const visible=host.store.get().display;if(!visible.character&&!visible.orb)return;
  if(pet){pet.show();return;}
  const bounds=screen.getPrimaryDisplay().workArea;
  pet=new BrowserWindow({icon:appIcon,width:360,height:560,x:bounds.x+bounds.width-380,y:bounds.y+bounds.height-580,frame:false,transparent:true,alwaysOnTop:true,skipTaskbar:true,resizable:true,minWidth:220,minHeight:320,webPreferences:options});
  secure(pet);pet.loadURL(host.origin+'/pet.html');pet.on('closed',()=>{endPetDrag();pet=null;});pet.on('blur',()=>endPetDrag());
}
let visibilityQueue=Promise.resolve();
function setVisibility(patch){const task=visibilityQueue.then(async()=>{
  const display={...host.store.get().display};for(const key of ['character','orb','followCursor','showUnderstanding','inputFeedback'])if(patch[key]!==undefined){if(typeof patch[key]!=='boolean')throw new Error('显示开关格式错误');display[key]=patch[key];}
  await host.store.save({display});if(patch.character!==undefined||patch.orb!==undefined){if(display.character||display.orb)showPet();else pet?.hide();}
  pet?.webContents.send('desktop:visibility',display);main?.webContents.send('desktop:visibility',display);updateTray();return display;
});visibilityQueue=task.catch(()=>{});return task;}
function updateTray(){if(!tray)return;const d=host.store.get().display;tray.setContextMenu(Menu.buildFromTemplate([
 {label:'打开主界面',click:showMain},
 {label:'显示角色',type:'checkbox',checked:d.character,click:item=>setVisibility({character:item.checked}).catch(()=>{})},
 {label:'显示悬浮球',type:'checkbox',checked:d.orb,click:item=>setVisibility({orb:item.checked}).catch(()=>{})},
 {label:'关闭鼠标穿透',click:()=>pet?.setIgnoreMouseEvents(false)},
 {type:'separator'},{label:'退出鲸伴',click:()=>{quitting=true;app.quit();}}
]));}
function verify(event){if(![main?.webContents,pet?.webContents].includes(event.sender)||!event.senderFrame?.url.startsWith(host.origin+'/'))throw new Error('拒绝非本机界面请求');}
app.whenReady().then(async()=>{
  Menu.setApplicationMenu(null);
  const dataArgument=process.argv.find(value=>value.startsWith('--data-dir='))?.slice(11);
  const data=process.env.COMPANION_DATA || dataArgument || (app.isPackaged?app.getPath('userData'):path.join(__dirname,'../.local'));
  const welcomeFile=path.join(data,'welcome-seen.json');let welcomeRequired=!existsSync(welcomeFile);
  const secretFile=path.join(data,'credentials.bin');
  const secrets={
    async read(){try{if(!await safeStorage.isAsyncEncryptionAvailable())return {};const decrypted=await safeStorage.decryptStringAsync(await fs.readFile(secretFile));return JSON.parse(decrypted.result);}catch(e){if(e.code==='ENOENT')return {};throw new Error('无法解密本机凭据，请检查当前 Windows 用户。');}},
    async write(values){if(!await safeStorage.isAsyncEncryptionAvailable())throw new Error('系统加密不可用，密钥未保存');await fs.writeFile(secretFile,await safeStorage.encryptStringAsync(JSON.stringify(values)));}
  };
  const {startServer}=await import(pathToFileURL(path.join(__dirname,'../server.mjs')));
  host=await startServer({port:61950,directory:data,secrets});
  modelLibrary=await new ModelLibrary(data,host.store,item=>{for(const win of [main,pet])if(win&&!win.isDestroyed())win.webContents.send('desktop:model',item);}).init();
  const mediaPermissions=await new MediaPermissions(path.join(data,'media-permissions.json')).load();
  main=new BrowserWindow({icon:appIcon,width:1240,height:820,minWidth:900,minHeight:650,backgroundColor:'#f4f6fa',title:'鲸伴 · 桌面数字人',webPreferences:options,show:false});
  secure(main);await main.loadURL(host.origin);main.once('ready-to-show',()=>main.show());main.show();
  main.on('close',event=>{if(!quitting){event.preventDefault();main.hide();showPet();}});
  cursorTimer=setInterval(()=>{
    const selected=modelLibrary.list().items.find(x=>x.entry===host.store.get().model.entry);
    bongoInput.setEnabled(selected?.kind==='bongo'&&[main,pet].some(w=>w&&!w.isDestroyed()&&w.isVisible()&&!w.isMinimized()),host.store.get().display.inputFeedback);
    const enabled=host.store.get().display.followCursor;const point=enabled?screen.getCursorScreenPoint():null;
    for(const win of [main,pet]){if(!win||win.isDestroyed()||!win.isVisible()||win.isMinimized())continue;
      const active=enabled&&!(win===pet&&petDrag.session);const bounds=win.getContentBounds(),zoom=win.webContents.getZoomFactor();
      win.webContents.send('desktop:cursor',active?{active:true,x:(point.x-bounds.x)/zoom,y:(point.y-bounds.y)/zoom}:{active:false});
    }
  },50);
  const icon=nativeImage.createFromPath(path.join(iconFolder,existsSync(path.join(iconFolder,'avatar-orb.png'))?'avatar-orb.png':'public-icon.png')).resize({width:32,height:32});
  tray=new Tray(icon);tray.setToolTip('鲸伴 · 桌面数字人');updateTray();tray.on('double-click',showMain);
  ipcMain.handle('desktop:state',event=>{verify(event);return {desktop:true,packaged:app.isPackaged,autoStart:app.getLoginItemSettings().openAtLogin,pet:!!pet,version:app.getVersion(),welcomeRequired};});
  ipcMain.handle('desktop:welcome-seen',async event=>{verify(event);if(event.sender!==main.webContents)throw new Error('请从主界面操作');await fs.writeFile(welcomeFile,JSON.stringify({version:1,seenAt:Date.now()}));welcomeRequired=false;return true;});
  ipcMain.handle('desktop:pet',(event,visible)=>{verify(event);return setVisibility({character:!!visible,orb:!!visible});});
  ipcMain.handle('desktop:visibility',(event,patch)=>{verify(event);return setVisibility(patch);});
  ipcMain.handle('desktop:main',event=>{verify(event);showMain();});
  ipcMain.handle('desktop:scale-pet',(event,factor)=>{
    verify(event);if(!pet||event.sender!==pet.webContents||![1.12,1/1.12].includes(factor))throw new Error('无效缩放');
    endPetDrag();const before=pet.getBounds(),area=screen.getDisplayMatching(before).workArea;
    const next=scalePet(before,area,factor);pet.setBounds(next,false);
    return {changed:next.width!==before.width||next.height!==before.height};
  });
  ipcMain.handle('desktop:drag-pet',(event,phase,anchor)=>{
    verify(event);if(!pet||event.sender!==pet.webContents)return false;
    if(phase==='start'){endPetDrag();if(!anchor||!Number.isFinite(anchor.x)||!Number.isFinite(anchor.y)||anchor.x<0||anchor.y<0||anchor.x>pet.getBounds().width||anchor.y>pet.getBounds().height)return false;petDrag.start(pet,anchor);dragTimer=setInterval(()=>petDrag.update(),16);dragTimeout=setTimeout(endPetDrag,30000);return false;}
    if(phase==='end')return endPetDrag();
    return false;
  });
  ipcMain.handle('desktop:chat',(event,request)=>{
    verify(event);if(event.sender!==pet?.webContents||typeof request?.text!=='string'||!request.text.trim()||request.text.length>2000||typeof request.id!=='string'||request.id.length>100)throw new Error('消息格式错误');
    if(!main||main.isDestroyed())throw new Error('主界面未连接，请重新打开软件');
    main.webContents.send('desktop:chat',request);return true;
  });
  ipcMain.handle('desktop:pass-through',(event,on)=>{verify(event);pet?.setIgnoreMouseEvents(!!on,{forward:true});});
  ipcMain.handle('desktop:startup',(event,on)=>{verify(event);if(!app.isPackaged)throw new Error('开机启动请在打包后的软件中设置');app.setLoginItemSettings({openAtLogin:!!on,path:process.execPath,args:[`--data-dir=${data}`]});return app.getLoginItemSettings().openAtLogin;});
  ipcMain.handle('desktop:models',event=>{verify(event);return modelLibrary.list();});
  ipcMain.handle('desktop:select-model',(event,id)=>{verify(event);return modelLibrary.select(id);});
  ipcMain.handle('desktop:choose-model',async event=>{verify(event);const owner=BrowserWindow.fromWebContents(event.sender);const result=await dialog.showOpenDialog(owner,{title:'导入 Live2D / BongoCat 角色（先解压模型包）',properties:['openFile'],filters:[{name:'Live2D model3.json',extensions:['json']}]});if(result.canceled)return null;const selected=result.filePaths[0];await modelLibrary.import(selected);return selected;});
  ipcMain.handle('desktop:choose-core',async event=>{verify(event);const result=await dialog.showOpenDialog(main,{title:'选择已获许可的 Cubism Core JavaScript',properties:['openFile'],filters:[{name:'JavaScript',extensions:['js']}]});if(result.canceled)return null;await host.store.save({model:{core:result.filePaths[0]}});return result.filePaths[0];});
  ipcMain.handle('desktop:sources',async event=>{verify(event);const sources=await desktopCapturer.getSources({types:['window','screen'],thumbnailSize:{width:280,height:170},fetchWindowIcons:false});return sources.map(s=>({id:s.id,name:s.name,thumbnail:s.thumbnail.toDataURL()}));});
  ipcMain.handle('desktop:select-source',(event,id)=>{verify(event);if(typeof id!=='string')throw new Error('来源格式错误');selectedSource={id,owner:event.sender.id,expires:Date.now()+10000};return true;});
  session.defaultSession.setDisplayMediaRequestHandler(async(request,callback)=>{
    const selected=selectedSource;selectedSource=null;
    if(!selected||selected.expires<Date.now()||request.frame?.url!==host.origin+'/'){callback({});return;}
    const sources=await desktopCapturer.getSources({types:['window','screen']});const source=sources.find(s=>s.id===selected.id);callback(source?{video:source}:{});
  });
  ipcMain.handle('desktop:media-permissions',(event,patch)=>{
    verify(event);if(event.sender!==main.webContents)throw new Error('仅主界面可管理设备权限');
    return mediaPermissions.run(async()=>patch?mediaPermissions.save(patch):{...mediaPermissions.state});
  });
  session.defaultSession.setPermissionCheckHandler((webContents,permission,requestingOrigin,details)=>{
    if(webContents!==main.webContents||requestingOrigin!==host.origin)return false;
    if(permission==='display-capture')return !!selectedSource;
    if(permission!=='media')return false;
    return mediaPermissions.state[details?.mediaType]==='allow';
  });
  session.defaultSession.setPermissionRequestHandler(async(webContents,permission,callback,details)=>{
    if(webContents!==main.webContents||!webContents.getURL().startsWith(host.origin+'/')||!['media','display-capture'].includes(permission)){callback(false);return;}
    if(permission==='display-capture'){callback(!!selectedSource);return;}
    try{callback(await mediaPermissions.request(details.mediaTypes||[],async types=>{
      const kind=types.map(x=>x==='audio'?'麦克风':'摄像头').join('和');
      const result=await dialog.showMessageBox(main,{type:'question',title:'启用设备',message:`允许鲸伴使用${kind}？`,detail:'仅在你开始通话、录音或预览时启用。画面不会自动上传；可在连接设置中撤回授权。',checkboxLabel:'记住授权，以后不再询问',checkboxChecked:true,buttons:['取消','允许'],defaultId:1,cancelId:0});
      return {allowed:result.response===1,remember:result.checkboxChecked};
    }));}catch{callback(false);}
  });
  await fs.writeFile(path.join(data,'desktop-runtime.json'),JSON.stringify({pid:process.pid,origin:host.origin,startedAt:Date.now()}));
}).catch(error=>{dialog.showErrorBox('鲸伴启动失败',error.message);quitting=true;app.quit();});
app.on('before-quit',()=>{quitting=true;bongoInput.setEnabled(false);clearInterval(cursorTimer);host?.close();});
app.on('window-all-closed',()=>{if(quitting)app.quit();});
