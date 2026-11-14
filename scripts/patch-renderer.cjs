const {spawnSync} = require('node:child_process');
const path = require('node:path');

const command = process.env.JINGBAN_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const result = spawnSync(command, [path.join(__dirname, 'patch_renderer.py')], {stdio: 'inherit', windowsHide: true});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
