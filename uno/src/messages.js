'use strict';

// UNO's own server messages (the platform's are in lib/messages.js).

const { GameError, addMessages, PLATFORM_ERRORS, PLATFORM_SYSTEM } = require('../../lib/messages');

const UNO_ERRORS = {
  roundIsOver: 'The round is over',
  waitRoundEnd: 'Wait for the round to end',
  noCard: 'You do not have that card',
  onlyDrawn: 'You can only play the card you drew (or pass)',
  stackOrTake: p => `Stack a draw card or take ${p.count}`,
  noMatch: 'That card does not match',
  pickColor: 'Pick a color for the wild card',
  pickTarget: 'Pick a player to swap hands with',
  playOrPass: 'Play the card you drew or pass',
  drawFirst: 'Draw a card first',
  forcedPlay: 'Forced play is on: you must play the card you drew',
  nothingToChallenge: 'There is nothing to challenge',
  unoTooMany: 'You can only call UNO when one play leaves you with a single card',
  oneCardOnly: 'Multi-card play is off: one card at a time',
  sameValueOnly: 'Cards played together must have the same number or symbol',
  catchSelf: 'You cannot catch yourself — call UNO!',
  tooLate: 'Too late!',
};

const UNO_SYSTEM = {
  gameOn: p => (p.target ? `Game on! First to ${p.target} points.` : 'Game on! One round decides it.'),
};

addMessages({ errors: UNO_ERRORS, system: UNO_SYSTEM });

// everything an UNO client can be sent
const ERRORS = { ...PLATFORM_ERRORS, ...UNO_ERRORS };
const SYSTEM = { ...PLATFORM_SYSTEM, ...UNO_SYSTEM };

module.exports = { GameError, ERRORS, SYSTEM };
