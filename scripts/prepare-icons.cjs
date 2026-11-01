const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../web/assets');
// Personal artwork is an optional local override, excluded from the public repo.
if(!fs.existsSync(path.join(root,'app.ico')))fs.copyFileSync(path.join(root,'public-icon.ico'),path.join(root,'app.ico'));
