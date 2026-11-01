const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const keyPattern=/^(?:Key[A-Z]|Num[0-9]|Space|Enter|Backspace|Tab|Escape|Delete|CapsLock|Slash|BackQuote|(?:Left|Right|Up|Down)Arrow|(?:Shift|Control|Alt)(?:Left|Right))$/;
function parseInput(line){const [raw,detail='']=line.split('|');if(!/^(?:[0-9]|1[0-5])$/.test(raw)||line.length>1800)return null;const mask=Number(raw);return {left:!!(mask&1),right:!!(mask&2),mouseLeft:!!(mask&4),mouseRight:!!(mask&8),keys:[...new Set(detail.split(',').filter(k=>keyPattern.test(k)))].slice(0,64)};}
class BongoInput{
  constructor(send){this.send=send;this.process=null;this.failed=false;}
  setEnabled(enabled,details=false){
    if(this.process&&details!==this.details){this.process.kill();this.process=null;}this.details=details;
    if(!enabled){this.failed=false;if(this.process){this.process.kill();this.process=null;this.send({left:false,right:false});}return;}
    if(this.process||this.failed||process.platform!=='win32')return;
    const child=spawn(path.join(process.env.SystemRoot||'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from('$companionDetails = $'+(details?'true':'false')+'\n$companionParent = [System.Diagnostics.Process]::GetProcessById('+process.pid+')\n'+fs.readFileSync(path.join(__dirname,'bongo-input.ps1'),'utf8'),'utf16le').toString('base64')],{windowsHide:true,stdio:['ignore','pipe','pipe']});this.process=child;
    let pending='';child.stdout.on('data',data=>{pending+=data.toString();const lines=pending.split(/\r?\n/);pending=lines.pop();for(const line of lines){const state=parseInput(line);if(state)this.send(state);}});
    child.stderr.resume();
    const stopped=()=>{if(this.process!==child)return;this.process=null;this.failed=true;this.send({left:false,right:false,error:'全局敲击未启动，可在应用内点击或敲键互动'});};child.on('error',stopped);child.on('exit',stopped);
  }
}
module.exports={BongoInput,parseInput};

