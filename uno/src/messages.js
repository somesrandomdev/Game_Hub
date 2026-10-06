'use strict';

// Server-side messages are sent as { code, params } so each client can show them in
// its own language. The English text here is the fallback (and what tests/logs see).

const ERRORS = {
  needTwoPlayers: 'Need at least 2 players',
  needTwoBot: 'Need at least 2 players — add a bot!',
  roundIsOver: 'The round is over',
  roundNotOver: 'The round is not over',
  waitRoundEnd: 'Wait for the round to end',
  notInGame: 'You are not in this game',
  notYourTurn: 'Not your turn',
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
  unoTooMany: 'You can only call UNO with 2 or fewer cards',
  catchSelf: 'You cannot catch yourself — call UNO!',
  tooLate: 'Too late!',
  hostOnly: 'Only the host can do that',
  noGame: 'No game in progress',
  rulesBetweenGames: 'Change rules between games',
  roomFull: 'The room is full',
  roomFullMax: 'That room is full (10 players max)',
  noSuchPlayer: 'No such player',
  useLeave: 'Use Leave instead',
  gameRunning: 'A game is already running',
  unknownReaction: 'Unknown reaction',
  unknownAction: 'Unknown action',
  requestTooLarge: 'Request too large',
  badJson: 'Bad JSON',
  roomNotFound: p => `No room called ${p.code || '(empty)'}`,
  memberNotFound: 'Room or player not found',
  sessionExpired: 'Session expired',
  notFound: 'Not found',
  methodNotAllowed: 'Method not allowed',
  serverError: 'Server error',
};

const SYSTEM = {
  created: p => `${p.name} created the room`,
  joined: p => `${p.name} joined${p.waiting ? ' — they will be dealt in next round' : ''}`,
  botJoined: p => `${p.name} 🤖 joined${p.waiting ? ' (next round)' : ''}`,
  removed: p => `${p.name} was removed`,
  left: p => `${p.name} left`,
  connected: p => `${p.name} connected`,
  newHost: p => `${p.name} is now the host`,
  gameOn: p => (p.target ? `Game on! First to ${p.target} points.` : 'Game on! One round decides it.'),
  lobby: () => 'Back to the lobby',
};

function render(table, code, params = {}) {
  const m = table[code];
  if (m === undefined) return code;
  return typeof m === 'function' ? m(params) : m;
}

class GameError extends Error {
  constructor(code, params = {}) {
    super(render(ERRORS, code, params));
    this.code = code;
    this.params = params;
  }
}

const errorText = (code, params) => render(ERRORS, code, params);
const systemText = (code, params) => render(SYSTEM, code, params);

module.exports = { GameError, errorText, systemText, ERRORS, SYSTEM };
