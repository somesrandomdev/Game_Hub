'use strict';

// Ludo's own server messages (the platform's are in lib/messages.js).

const { GameError, addMessages, PLATFORM_ERRORS, PLATFORM_SYSTEM } = require('../../lib/messages');

const LUDO_ERRORS = {
  waitRoundEnd: 'Wait for this round to end',
  roundIsOver: 'The round is over',
  tableDone: 'Your table has finished this round',
  rollFirst: 'Roll the die first',
  alreadyRolled: 'You already rolled: move a piece',
  cantMove: 'That piece can\'t move',
};

const LUDO_SYSTEM = {
  ludoOn: p => `Tournament on! First to ${p.target} points wins.`,
  ludoRound: p => `Round ${p.round}: new tables!`,
};

addMessages({ errors: LUDO_ERRORS, system: LUDO_SYSTEM });

// everything a Ludo client can be sent
const ERRORS = { ...PLATFORM_ERRORS, ...LUDO_ERRORS };
const SYSTEM = { ...PLATFORM_SYSTEM, ...LUDO_SYSTEM };

module.exports = { GameError, ERRORS, SYSTEM };
