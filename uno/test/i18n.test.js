'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ERRORS, SYSTEM } = require('../src/messages');

const PUBLIC = path.join(__dirname, '..', 'public');
const SRC = fs.readFileSync(path.join(PUBLIC, 'js', 'i18n.js'), 'utf8');

// Pull the key names out of the `const en = {...}` / `const fr = {...}` blocks.
function keysOf(name) {
  const start = SRC.indexOf(`const ${name} = {`);
  const end = SRC.indexOf('\n};', start);
  assert.ok(start >= 0 && end > start, `dictionary ${name} not found`);
  const body = SRC.slice(start, end);
  const keys = new Set();
  for (const m of body.matchAll(/^\s{2}(?:'([^']+)'|([A-Za-z_]\w*)):/gm)) keys.add(m[1] || m[2]);
  return keys;
}

const en = keysOf('en');
const fr = keysOf('fr');

test('every English key has a French translation', () => {
  const missing = [...en].filter(k => !fr.has(k));
  assert.deepEqual(missing, []);
});

test('no stray French-only keys', () => {
  const extra = [...fr].filter(k => !en.has(k) && !k.startsWith('err.'));
  assert.deepEqual(extra, []);
});

test('every server error and system message is translated', () => {
  for (const code of Object.keys(ERRORS)) assert.ok(fr.has(`err.${code}`), `fr is missing err.${code}`);
  for (const code of Object.keys(SYSTEM)) {
    assert.ok(en.has(`sys.${code}`), `en is missing sys.${code}`);
    assert.ok(fr.has(`sys.${code}`), `fr is missing sys.${code}`);
  }
});

test('every key used in the client exists', () => {
  const used = new Set();
  for (const file of ['app.js', 'cards.js']) {
    const src = fs.readFileSync(path.join(PUBLIC, 'js', file), 'utf8');
    for (const m of src.matchAll(/\bt\('([^'`$]+)'/g)) used.add(m[1]);
  }
  const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
  for (const m of html.matchAll(/data-i18n(?:-html|-placeholder|-title|-aria)?="([^"]+)"/g)) used.add(m[1]);
  const missing = [...used].filter(k => !en.has(k));
  assert.deepEqual(missing, []);
});

test('the dictionary module loads and translates', async () => {
  globalThis.navigator ??= { language: 'fr-FR' };
  const mod = await import(path.join(PUBLIC, 'js', 'i18n.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
  assert.equal(typeof mod.t, 'function');
  assert.ok(['en', 'fr'].includes(mod.getLang()));
  const card = mod.t('cardName', { color: 'green', value: 'reverse' });
  assert.ok(card === 'Green Reverse' || card === 'Inversion verte', card);
  assert.equal(mod.t('no.such.key'), 'no.such.key');
});
