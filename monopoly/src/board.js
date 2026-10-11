'use strict';

// The classic 40-square board and the two card decks. The data is in
// public/board.json so the browser loads exactly what the server plays by.
// Names live in the client (they differ by language: Atlantic City streets in
// English, Paris in French); the server only uses indices.

const { squares: SQUARES, groups: GROUPS, chance: CHANCE, chest: CHEST, jail: JAIL } = require('../public/board.json');

const BUYABLE = new Set(['street', 'rail', 'util']);
const isBuyable = i => BUYABLE.has(SQUARES[i]?.type);
const GROUP_SQUARES = {};
for (const s of SQUARES) if (s.group) (GROUP_SQUARES[s.group] ||= []).push(s.i);

module.exports = { SQUARES, GROUPS, GROUP_SQUARES, CHANCE, CHEST, JAIL, isBuyable };
