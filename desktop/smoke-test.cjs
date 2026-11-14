const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

async function verifyDesktop({main, showPet, pet, data}) {
  const db = new (require('better-sqlite3'))(':memory:');
  try {
    assert.equal(db.prepare('SELECT 1 AS ok').get().ok, 1);
  } finally {
    db.close();
  }
  assert.equal(typeof require('onnxruntime-node').InferenceSession.create, 'function');

  const state = await main.webContents.executeJavaScript(`(async () => {
    const desktop = await window.desktop.state();
    const [bootstrap, model, renderer] = await Promise.all([
      fetch('/api/bootstrap').then(r => r.json()),
      fetch('/api-model-entry').then(r => r.json()),
      fetch('/vendor/live2d.js')
    ]);
    const assets = await fetch(model.url).then(r => r.json());
    return {
      packaged: desktop.packaged,
      version: desktop.version,
      features: desktop.features,
      hasSettings: !!document.querySelector('#settings-form'),
      hasMemory: !!bootstrap.config.memory,
      hasModel: !!assets.FileReferences?.Moc && Object.keys(model.keyImages).length > 0,
      rendererReady: renderer.ok && (await renderer.text()).includes('Live2DModel'),
    };
  })()`);
  assert.ok(state.hasSettings && state.hasMemory && state.hasModel && state.rendererReady);
  assert.equal(state.features.globalInput, process.platform === 'win32');

  await showPet();
  const window = pet();
  assert.ok(window, 'Floating window was not created');
  const floating = await window.webContents.executeJavaScript(`(async () => {
    const previous = await window.desktop.state();
    const resized = await window.desktop.scalePet(1 / 1.12);
    return previous.pet && resized.changed && !!document.querySelector('#orb');
  })()`);
  assert.equal(floating, true);
  await fs.writeFile(path.join(data, 'desktop-smoke-result.json'), JSON.stringify({
    platform: process.platform,
    arch: process.arch,
    ...state,
    floating,
  }, null, 2));
}

module.exports = {verifyDesktop};
