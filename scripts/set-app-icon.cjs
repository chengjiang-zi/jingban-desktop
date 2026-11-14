const {execFileSync}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
const root=path.resolve(__dirname,'..');
if(process.platform!=='win32')process.exit(0);
// The bundled resource editor does not handle non-ASCII target filenames.
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'jingban-icon-'));
const target=path.join(root,process.env.JINGBAN_BUILD_OUTPUT||'dist','win-unpacked/jingban.exe');
try{
 fs.copyFileSync(target,path.join(temp,'app.exe'));
 fs.copyFileSync(path.join(root,'web/assets/app.ico'),path.join(temp,'app.ico'));
 execFileSync(path.join(root,'node_modules/rcedit/bin/rcedit-x64.exe'),['app.exe','--set-icon','app.ico'],{cwd:temp,windowsHide:true});
 fs.copyFileSync(path.join(temp,'app.exe'),target);
}finally{
 for(const file of ['app.exe','app.ico']){const p=path.join(temp,file);if(fs.existsSync(p))fs.unlinkSync(p);}
 fs.rmdirSync(temp);
}
console.log('Application icon updated');
