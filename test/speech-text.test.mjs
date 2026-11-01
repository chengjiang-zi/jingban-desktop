import test from 'node:test';
import assert from 'node:assert/strict';
import { speechText } from '../lib/speech-text.mjs';
import { synthesize } from '../lib/providers.mjs';

test('speech removes compound emoji without losing ordinary numbers and text',()=>{
  assert.equal(speechText('你好👩🏽‍💻，今天开心吗😊？'), '你好 ，今天开心吗 ？');
  assert.equal(speechText('🇨🇳 1️⃣ ❤️ 👨‍👩‍👧‍👦 👍🏿'), '');
  assert.equal(speechText('今天 2026 年，价格 3.14 元！Hello world.'), '今天 2026 年，价格 3.14 元！Hello world.');
  assert.equal(speechText('😊✨！……'), '');
});
test('emoji-only speech never contacts the speech provider',async()=>{
  const response=await synthesize({},'', '👩🏽‍💻❤️🇨🇳');
  assert.equal((await response.arrayBuffer()).byteLength,0);
});
