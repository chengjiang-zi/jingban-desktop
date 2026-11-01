const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../web/assets');
// Preserve the supplied character icon; use the generic fallback if absent.
if(!fs.existsSync(path.join(root,'app.ico')))fs.copyFileSync(path.join(root,'public-icon.ico'),path.join(root,'app.ico'));
