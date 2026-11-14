const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const packaged = process.argv.includes('--packaged');
function packagedExecutable() {
  const out = path.resolve(root, process.env.JINGBAN_BUILD_OUTPUT || 'dist');
  if (process.platform === 'win32') return path.join(out, 'win-unpacked', 'jingban.exe');
  if (process.platform === 'linux') return path.join(out, 'linux-unpacked', 'jingban');
  const app = fs.readdirSync(out, {withFileTypes: true})
    .filter(entry => entry.isDirectory() && /^mac(?:-|$)/.test(entry.name))
    .map(entry => path.join(out, entry.name, 'jingban.app', 'Contents', 'MacOS', 'jingban'))
    .find(candidate => fs.existsSync(candidate));
  assert.ok(app, 'No built macOS application found');
  return app;
}

const binary = packaged ? process.env.JINGBAN_SMOKE_EXECUTABLE || packagedExecutable() : require('electron');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jingban-smoke-'));
try {
  const args = [...(packaged ? [] : [root]), '--jingban-smoke-test'];
  const result = spawnSync(binary, args, {
    cwd: root,
    env: {...process.env, COMPANION_DATA: directory},
    stdio: 'inherit',
    timeout: 60000,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `Electron failed to start or did not exit cleanly (${result.signal ?? 'no signal'})`);
  const report = JSON.parse(fs.readFileSync(path.join(directory, 'desktop-smoke-result.json'), 'utf8'));
  assert.equal(report.packaged, packaged);
  assert.equal(report.platform, process.platform);
  assert.equal(report.arch, process.arch);
  console.log(JSON.stringify(report, null, 2));
} finally {
  fs.rmSync(directory, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
}
