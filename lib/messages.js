'use strict';

// Server-side messages are sent as { code, params } so each client can show them in
// its own language. The English text here is the fallback (and what tests/logs see).
// The platform's own messages live here; each game adds its own with addMessages().

const ERRORS = {
  needTwoPlayers: 'Need at least 2 players',
  needTwoBot: 'Need at least 2 players — add a bot!',
  tooManyPlayers: p => `This game takes at most ${p.max} players`,
  roundNotOver: 'The round is not over',
  notInGame: 'You are not in this game',
  notYourTurn: 'Not your turn',
  hostOnly: 'Only the host can do that',
  noGame: 'No game in progress',
  rulesBetweenGames: 'Change rules between games',
  roomFull: 'The room is full',
  roomFullMax: p => `That room is full (${p.max || 10} players max)`,
  tooManyRooms: 'The server has too many rooms open right now, try again later',
  noSuchPlayer: 'No such player',
  useLeave: 'Use Leave instead',
  gameRunning: 'A game is already running',
  unknownReaction: 'Unknown reaction',
  unknownAction: 'Unknown action',
  unknownGame: 'Unknown game',
  wrongGame: p => `That room is playing ${p.game}`,
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
  lobby: () => 'Back to the lobby',
};

const PLATFORM_ERRORS = { ...ERRORS };
const PLATFORM_SYSTEM = { ...SYSTEM };

// Games register their own codes. Codes are global, so games must not reuse one
// with a different meaning.
function addMessages({ errors = {}, system = {} } = {}) {
  Object.assign(ERRORS, errors);
  Object.assign(SYSTEM, system);
}

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

module.exports = { GameError, errorText, systemText, addMessages, PLATFORM_ERRORS, PLATFORM_SYSTEM };
