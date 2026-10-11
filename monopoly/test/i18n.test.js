'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { ERRORS, SYSTEM } = require('../src/messages');
const board = require('../public/board.json');

const PUBLIC = path.join(__dirname, '..', 'public');
const url = pathToFileURL(path.join(PUBLIC, 'js', 'i18n.js')).href;

async function load() {
  globalThis.navigator ??= { language: 'en-US' };
  return import(url);
}

test('English and French have the same keys', async () => {
  const { DICTS } = await load();
  const en = Object.keys(DICTS.en);
  const fr = new Set(Object.keys(DICTS.fr));
  assert.deepEqual(en.filter(k => !fr.has(k)), []);
  assert.deepEqual([...fr].filter(k => !(k in DICTS.en) && !k.startsWith('err.')), []);
});

test('every square and card has a name in both languages', async () => {
  const { DICTS } = await load();
  for (const d of [DICTS.en, DICTS.fr]) {
    board.squares.forEach((_, i) => assert.ok(d[`sq.${i}`], `sq.${i}`));
    board.chance.forEach((_, i) => assert.ok(d[`chance.${i}`], `chance.${i}`));
    board.chest.forEach((_, i) => assert.ok(d[`chest.${i}`], `chest.${i}`));
  }
});

test('every server error and system message is translated', async () => {
  const { DICTS } = await load();
  for (const code of Object.keys(ERRORS)) assert.ok(`err.${code}` in DICTS.fr, `fr is missing err.${code}`);
  for (const code of Object.keys(SYSTEM)) {
    assert.ok(`sys.${code}` in DICTS.en, `en is missing sys.${code}`);
    assert.ok(`sys.${code}` in DICTS.fr, `fr is missing sys.${code}`);
  }
});

test('every key used in the client exists', async () => {
  const { DICTS } = await load();
  const used = new Set();
  const src = fs.readFileSync(path.join(PUBLIC, 'js', 'app.js'), 'utf8');
  for (const m of src.matchAll(/\bt\('([^'`$]+)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/\? '([a-z]+\.[A-Za-z.]+)' : '([a-z]+\.[A-Za-z.]+)'/g)) { used.add(m[1]); used.add(m[2]); }
  const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
  for (const m of html.matchAll(/data-i18n(?:-html|-placeholder|-title|-aria)?="([^"]+)"/g)) used.add(m[1]);
  // log lines exist for the events worth reading
  for (const type of ['roll', 'buy', 'rent', 'card', 'jail', 'auctionWon', 'build', 'bankrupt', 'tradeDone', 'gameOver']) used.add(`ev.${type}`);
  assert.deepEqual([...used].filter(k => !(k in DICTS.en)), []);
});

test('money and names follow the language', async () => {
  const { money, sqName, setLang, getLang } = await load();
  globalThis.document ??= { documentElement: {}, querySelectorAll: () => [] };
  setLang('en');
  assert.equal(money(1500), '$1,500');
  assert.equal(sqName(39), 'Boardwalk');
  setLang('fr');
  assert.match(money(1500), /^1\s500 €$/);
  assert.equal(sqName(39), 'Rue de la Paix');
  assert.equal(getLang(), 'fr');
});
