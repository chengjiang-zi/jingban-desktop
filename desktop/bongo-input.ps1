$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class CompanionHands {
  [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
  public static string Read(bool details) {
    var keys = new System.Collections.Generic.List<string>();
    int state=0;
    for(int key=1;key<255;key++) {
      if((GetAsyncKeyState(key)&0x8001)==0) continue;
      if(details) {
        string code=null;
        if(key>=65 && key<=90) code="Key"+(char)key;
        else if(key>=48 && key<=57) code="Num"+(char)key;
        else switch(key){case 8:code="Backspace";break;case 9:code="Tab";break;case 13:code="Enter";break;case 27:code="Escape";break;case 32:code="Space";break;case 37:code="LeftArrow";break;case 38:code="UpArrow";break;case 39:code="RightArrow";break;case 40:code="DownArrow";break;case 46:code="Delete";break;case 160:code="ShiftLeft";break;case 161:code="ShiftRight";break;case 162:code="ControlLeft";break;case 163:code="ControlRight";break;case 164:code="AltLeft";break;case 165:code="AltRight";break;case 20:code="CapsLock";break;case 191:code="Slash";break;case 192:code="BackQuote";break;}
        if(code!=null)keys.Add(code);
      }
      if(key==1) state|=4;
      else if(key==2) state|=8;
      else if("12345QWERTASDFGZXCVB".IndexOf((char)key)>=0) state|=1;
      else state|=2;
    }
    return state+"|"+String.Join(",",keys);
  }
}
'@
$previous = ''
while (-not $companionParent.HasExited) {
  $hands = [CompanionHands]::Read($companionDetails)
  if ($hands -ne $previous) { [Console]::WriteLine($hands); $previous = $hands }
  Start-Sleep -Milliseconds 24
}
