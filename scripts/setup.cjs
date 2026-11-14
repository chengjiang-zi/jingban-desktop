// Install from the lockfile with `npm ci --ignore-scripts`, then run this.
// better-sqlite3 13 ships N-API binaries; do not run npm's implicit node-gyp.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
if(Number(process.versions.node.split('.')[0])<24)throw new Error('Please install Node.js 24 or newer.');
function run(command,args,cwd=root){const result=spawnSync(command,args,{cwd,stdio:'inherit',windowsHide:true});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
run(process.execPath,['node_modules/electron/install.js']);
require('onnxruntime-node'); // The CPU runtime ships in the package on all supported platforms.
require('sharp'); // Current sharp uses platform binaries supplied by npm.
run(process.execPath,['scripts/prepare-icons.cjs']);
run(process.execPath,['scripts/patch-renderer.cjs']);
const db=new (require('better-sqlite3'))(':memory:');db.prepare('SELECT 1').get();db.close();
console.log('Desktop runtime, renderer and database are ready. Run npm start.');
