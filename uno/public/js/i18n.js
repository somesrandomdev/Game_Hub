// English / French translations.
// Values are strings with {placeholders} or functions of params (for plurals & grammar).
// HTML is only produced by a few keys (rules, log lines); callers escape names first.

const s = n => (n === 1 ? '' : 's');

const COLOR_EN = { red: 'red', yellow: 'yellow', green: 'green', blue: 'blue', pink: 'pink', teal: 'teal', orange: 'orange', purple: 'purple' };
const COLOR_FR = { red: 'rouge', yellow: 'jaune', green: 'vert', blue: 'bleu', pink: 'rose', teal: 'turquoise', orange: 'orange', purple: 'violet' };
const COLOR_FR_F = { red: 'rouge', yellow: 'jaune', green: 'verte', blue: 'bleue', pink: 'rose', teal: 'turquoise', orange: 'orange', purple: 'violette' };
const cap = str => str.charAt(0).toUpperCase() + str.slice(1);
const ordFr = n => (Number(n) === 1 ? '1er' : `${n}e`);
const ordEn = n => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]}`;

const en = {
  // ---------- static page ----------
  'home.tagline': 'Play with friends on the same Wi-Fi or hotspot. No internet needed.',
  'home.name': 'Your name',
  'home.namePh': 'e.g. Khalil',
  'home.create': 'Create a room',
  'home.or': 'or join a friend',
  'home.code': 'Room code',
  'home.join': 'Join',
  'home.friendsFrom': 'Friends join from',
  'home.lookingUp': 'Looking up addresses…',
  'home.howTo': 'How to play & connect',
  'home.allGames': '← All games',
  'top.leave': '← Leave',
  'top.room': 'ROOM',
  'title.rules': 'Rules',
  'title.sound': 'Sound',
  'title.chat': 'Chat',
  'title.menu': 'Menu',
  'title.scores': 'Scores',
  'title.language': 'Langue : français',
  'lobby.players': 'Players',
  'lobby.addBot': '＋ Add bot',
  'lobby.rules': 'House rules',
  'lobby.invite': 'Invite friends',
  'lobby.inviteHint': 'Send them a link (the 🌍 one works from anywhere, the others on your Wi-Fi):',
  'lobby.orCode': '…or open the site and type the code',
  'lobby.startGame': 'Start game',
  'game.room': 'Room',
  'pile.draw': 'Draw pile',
  'pile.discard': 'Discard pile',
  'btn.sortTitle': 'Change how your hand is sorted',
  'drawer.chat': 'Chat',
  'drawer.log': 'Game log',
  'drawer.close': 'Close',
  'chat.placeholder': 'Talk trash…',
  'chat.send': 'Send',
  'modal.pickColor': 'Pick a color',
  'modal.swapWith': 'Swap hands with…',
  'modal.cancel': 'Cancel',
  'modal.close': 'Close',
  'menu.title': 'Menu',
  'menu.fullscreen': '⛶ Toggle fullscreen',
  'menu.fx': p => `✨ Effects: ${p.on ? 'MAX' : 'off'}`,
  'toast.fxOn': '✨ Effects on: full show!',
  'toast.fxOff': 'Effects off: calm mode',
  'menu.end': '⏹ End game for everyone',
  'menu.leave': '🚪 Leave room',
  'rules.title': 'How to play',
  'rules.ok': 'Got it',
  'conn.reconnecting': 'Reconnecting…',
  'title.page': 'UNO Night',
  'title.turn': '▶ Your turn! · UNO',

  // ---------- toasts ----------
  'err.connection': 'Connection problem, try again',
  'err.requestFailed': 'Request failed ({status})',
  'toast.roomGone': 'That room is gone (maybe the server restarted).',
  'toast.left': 'You left the room',
  'toast.copied': 'Link copied 📋',
  'toast.enterName': 'Enter your name first ✏️',
  'toast.codeLength': 'Room codes have 4 letters',
  'toast.pressJoin': 'Press Join to enter room {code}',
  'toast.enterNameJoin': 'Enter your name, then join room {code}',
  'toast.fullscreenNA': 'Fullscreen not available',
  'toast.lang': 'Language: English',
  'kick.kicked': 'The host removed you from the room',
  'kick.left': 'You left the room',

  // ---------- home ----------
  'addr.none': 'No network found on the server PC. Connect it to Wi-Fi or turn on Mobile Hotspot.',
  'addr.weak': 'probably not reachable',
  'addr.online': '🌍 Online link: works from anywhere',
  'addr.onlineWait': '🌍 Opening the online link…',
  'btn.copy': 'Copy',
  'rooms.rejoin': 'Rejoin as {name}',
  'rooms.rejoinTag': 'rejoin',
  'rooms.desc': p => `${p.host}'s room · ${p.n} player${s(p.n)}`,
  'rooms.status.playing': 'in game',
  'rooms.status.lobby': 'lobby',
  'rooms.status.finished': 'finished',

  // ---------- settings ----------
  'set.startCards': 'Starting hand',
  'set.targetScore': 'Play to',
  'set.targetScore.hint': 'Points needed to win the game',
  'set.turnTimer': 'Turn timer',
  'set.turnTimer.hint': 'Autopilot moves when time runs out',
  'set.unoPenalty': 'Forgot UNO penalty',
  'set.stacking': 'Stacking',
  'set.stacking.hint': 'Answer +2 with +2/+4, and +4 with +4',
  'set.challenge': 'Challenge +4',
  'set.challenge.hint': 'Call out an illegal Wild Draw Four (off while stacking)',
  'set.drawUntilPlayable': 'Draw until playable',
  'set.drawUntilPlayable.hint': 'Keep drawing until you can play',
  'set.forcePlay': 'Forced play',
  'set.forcePlay.hint': 'A playable drawn card must be played',
  'set.sevenZero': '7-0 rule',
  'set.sevenZero.hint': '7 swaps hands, 0 rotates all hands',
  'set.jumpIn': 'Jump-in',
  'set.jumpIn.hint': 'Play an identical card out of turn',
  'set.flip': 'UNO Flip',
  'set.flip.hint': 'Two-sided cards: a Flip card turns everything over to the nasty dark side',
  'set.challengeColor': 'Challenge Draw Color',
  'set.challengeColor.hint': 'A Wild Draw Color can be challenged like a +4',
  'set.multiPlay': 'Multi-card play',
  'set.multiPlay.hint': 'Play several cards with the same number or symbol at once, any colors',
  'set.lastStanding': 'Last one standing',
  'set.lastStanding.hint': 'Going out doesn\'t end the round: the last player holding cards loses',
  'set.bonuses': 'Bonus points',
  'set.bonuses.hint': 'Catch someone +10, combos of 3+ cards, go out on an action card +20, win streaks',
  'bonus.catch': 'Caught them!',
  'bonus.combo': 'Combo',
  'bonus.finish': 'Action finish',
  'bonus.streak': 'Win streak',
  'toast.bonus': '⭐ {label}: +{pts} pts',
  'log.bonus': p => `${p.who} ⭐ ${p.label} +${p.pts}`,
  'set.unoLastCard': 'UNO on the last card',
  'set.unoLastCard.hint': 'The UNO! button only shows once you hold a single card',

  // ---------- multi-card play & last one standing ----------
  'multi.hint': 'Tap other “{v}” cards to add them, then press Play',
  'multi.play': p => `Play (${p.n}) card${s(p.n)}`,
  'seat.place': p => `🏁 ${ordEn(p.n)} (out)`,
  'seat.score': '{n} pts',
  'seat.now': 'Playing',
  'seat.next': 'Next',
  'strip.title': 'Order of play',
  'strip.now': 'playing',
  'strip.next': 'next',
  'dir.cw': 'Clockwise',
  'dir.ccw': 'Counter-clockwise',
  'menu.rules': '❓ How to play',
  'menu.sound': p => `${p.on ? '🔊' : '🔇'} Sound: ${p.on ? 'on' : 'off'}`,
  'board.title': 'Leaderboard',
  'fx.combo': '×{n} COMBO!',
  'board.rank': p => ordEn(p.n),
  'me.out': '🏁 out, #{place} · {pts} pts',
  'status.finished': "🏁 You're out (#{place})! {name}'s turn",
  'toast.finishedMe': "🏁 You're out in place #{place}! +{pts} pts",
  'toast.finished': '🏁 {name} is out (#{place})',
  'ev.lastOne': '🃏 Last one!',
  'log.finished': p => `<b>${p.who} ${p.me ? 'are' : 'is'} out</b> in place #${p.place} (+${p.pts} pts)`,
  'log.lastOne': p => `<b>${p.who} ${p.me ? 'are' : 'is'} the last one holding cards</b> (0 pts)${p.over ? '. Game over!' : ''}`,
  'res.lastSub': '{name} kept cards to the end: 0 points · first to {target} wins',
  'lobby.scan': 'Scan with a phone to join',
  'opt.cards': p => `${p.n} cards`,
  'opt.oneRound': 'One round',
  'opt.points': '{n} pts',
  'opt.off': 'Off',
  'opt.seconds': '{n} sec',

  // ---------- lobby ----------
  'lobby.youPick': 'you pick',
  'lobby.hostPicks': 'host picks',
  'tag.host': 'HOST',
  'tag.you': 'YOU',
  'tag.bot': 'BOT',
  'tag.away': 'AWAY',
  'lobby.remove': 'Remove {name}',
  'lobby.needPlayers': 'Need 2+ players: add a bot or a friend',
  'lobby.start': 'Start game ({n} players)',
  'lobby.allDealt': 'Everyone in the list will be dealt in.',
  'lobby.waiting': 'Waiting for {name} to start…',
  'theHost': 'the host',
  'confirm.sure': 'Sure?',
  'confirm.draw': 'Draw anyway?',
  'rotate.title': 'Turn your phone sideways',
  'rotate.text': 'The table gets bigger and your cards are easier to play.',
  'rotate.lock': '🔄 Play sideways',
  'rotate.skip': 'Keep it upright',
  'rotate.manual': 'Turn your phone sideways (and check that auto-rotate is on)',
  'confirm.leave': 'Tap again to leave',
  'confirm.end': 'Tap again: end for everyone',

  // ---------- table ----------
  'game.roundTarget': 'Round {n} · first to {target}',
  'game.roundSingle': 'Round {n} · winner takes all',
  'seat.catch': 'Catch!',
  'seat.joinsNext': 'joins next round',
  'pile.left': '{n} left',
  'me.spectating': 'spectating',
  'me.you': '(you)',
  'me.meta': p => `<b>${p.n}</b> card${s(p.n)} · ${p.pts} pts`,
  'btn.uno': 'UNO!',
  'btn.unoDone': 'UNO ✓',
  'btn.unoArmed': 'UNO ready',
  'btn.takeUntil': 'Draw until {color}',
  'btn.accept': 'Accept +{n}',
  'btn.take': 'Take +{n}',
  'btn.draw': 'Draw',
  'btn.pass': 'Pass',
  'btn.challenge': 'Challenge!',
  'sort.color': 'Sort: color',
  'sort.value': 'Sort: number',
  'sort.none': 'Sort: off',

  'status.gameOver': 'Game over!',
  'status.roundOver': 'Round over!',
  'status.spectating': "👀 Spectating · {name}'s turn",
  'status.challenge': '{card}! Accept or challenge?',
  'status.stack': 'Stack a draw card or take {n}!',
  'status.drawnPass': 'Play the card you drew, or pass',
  'status.drawnForced': 'You must play the card you drew',
  'status.yourTurn': 'Your turn!',
  'status.thenNext': ' Next: {name}',
  'status.youNext': " · you're next!",
  'status.youIn': ' · you play in {n} turns',
  'status.noMatch': 'Your turn: no match, draw a card',
  'status.theirTurn': "{name}'s turn",
  'status.away': ' (away, autopilot)',

  // ---------- events ----------
  'ev.skipped': '⊘ Skipped',
  'ev.reverse': '⇄ Reverse!',
  'ev.flip': 'FLIP!',
  'ev.caught': 'Caught! 🚨',
  'ev.jumpIn': 'Jump-in! ⚡',
  'ev.iWin': 'I win! 🎉',
  'ev.out': '🎉 Out!',
  'toast.caught': '{by} caught {who} without UNO! +{n}',
  'toast.caughtMe': '{by} caught you without UNO! +{n}',
  'toast.youCaught': 'You caught {who} without UNO! +{n}',
  'toast.challengeOk': 'Challenge! {a} vs {b}: bluff caught 🕵️ (+4)',
  'toast.challengeBad': 'Challenge! {a} vs {b}: it was legal (+6)',
  'toast.swap': '🔄 Hand swap: {a} ⇄ {b}',
  'toast.rotate': '🔄 Zero! Every hand moves along',
  'toast.timeoutMe': "⏰ Time's up! Autopilot played for you",
  'toast.timeout': '⏰ {name} ran out of time',
  'toast.reshuffle': '♻️ Discard pile shuffled back into the deck',
  'toast.roundStart': 'Round {n}: deal! 🃏',
  'toast.abandoned': 'Not enough players left to continue',

  // ---------- log ----------
  'you': 'You',
  'someone': 'Someone',
  'log.play': p => `${p.who} played <b>${p.card}</b>${p.color ? ` → ${p.color}` : ''}`,
  'log.draw': p => `${p.who} drew ${p.n} card${s(p.n)}${p.reason}`,
  'log.reason.draw2': ' (+2)',
  'log.reason.wild4': ' (+4)',
  'log.reason.draw1': ' (+1)',
  'log.reason.draw5': ' (+5)',
  'log.reason.wild2': ' (+2)',
  'log.reason.wildColor': ' (draw color)',
  'log.flip': p => `<b>Flip!</b> ${p.dark ? 'Dark' : 'Light'} side up, ${p.color}`,
  'log.reason.caught': ' (forgot UNO)',
  'log.reason.challenge': ' (challenge)',
  'log.pass': '{who} passed',
  'log.skip': p => (p.me ? 'You were skipped' : `${p.who} was skipped`),
  'log.reverse': 'Direction reversed',
  'log.uno': '<b>{who} called UNO!</b>',
  'log.caught': p => `${p.by} caught ${p.whoMe ? 'you' : p.who} without UNO`,
  'log.challenge': p => `${p.who} challenged ${p.targetMe ? 'you' : p.target}: ${p.ok ? 'bluff caught' : 'it was legal'}`,
  'log.swap': 'Hand swap: {who} ⇄ {target}',
  'log.rotate': 'All hands rotated',
  'log.jumpIn': '{who} jumped in!',
  'log.timeout': '{who} ran out of time',
  'log.reshuffle': 'Deck reshuffled',
  'log.roundStart': '<b>Round {n}</b>, {dealer} dealt. First card: {card}',
  'log.roundOver': p => `<b>${p.who} won the round</b> (+${p.pts} pts)${p.over ? '. Game over!' : ''}`,
  'log.abandoned': 'Game ended: not enough players',
  'log.leave': 'A player left the game',

  // ---------- can't play ----------
  'reason.notTurnJump': 'Not your turn (jump-in needs the exact same card)',
  'reason.notTurn': 'Not your turn',
  'reason.onlyDrawn': 'You can only play the card you just drew',
  'reason.stack': 'Stack a draw card or take {n}',
  'reason.take': 'Take the {n} cards',
  'reason.takeUntil': 'Draw until you get a {color} card',
  'reason.noMatch': "{card} doesn't match: play {color} or a {value}",

  // ---------- pickers ----------
  'picker.inHand': '{n} in hand',
  'cards.count': p => `${p.n} card${s(p.n)}`,

  // ---------- results ----------
  'res.gameOverTitle': 'Game over',
  'res.notEnough': 'Not enough players left to keep going.',
  'res.youWinGame': '🏆 You win the game!',
  'res.winsGame': '🏆 {name} wins the game!',
  'res.youWonRound': 'You won round {n}!',
  'res.wonRound': '{name} won round {n}!',
  'res.final': 'Final score: {pts} points',
  'res.targetSuffix': ' (target {target})',
  'res.roundSub': '+{pts} points · first to {target} wins',
  'res.out': '🎉 out!',
  'res.viewTable': 'View table',
  'res.lobby': 'Back to lobby',
  'res.again': 'Play again',
  'res.next': 'Next round ▶',
  'res.waitNew': 'Waiting for {name} to start a new game…',
  'res.waitNext': 'Waiting for {name} to deal the next round…',
  'res.youSuffix': ' (you)',
  'sb.title': 'Scoreboard',
  'sb.subTarget': 'Round {n} · first to {target} points',
  'sb.subSingle': 'Round {n} · one round decides it',
  'sb.rules': 'House rules: {list} · UNO penalty {n}',
  'sb.classic': 'classic',
  'sb.timer': ' · {n}s timer',

  // ---------- cards ----------
  'color.red': 'red',
  'color.yellow': 'yellow',
  'color.green': 'green',
  'color.blue': 'blue',
  'color.pink': 'pink',
  'color.teal': 'teal',
  'color.orange': 'orange',
  'color.purple': 'purple',
  'value.skip': 'Skip',
  'value.reverse': 'Reverse',
  'value.draw2': 'Draw Two',
  'value.wild': 'Wild',
  'value.wild4': 'Wild Draw Four',
  'value.draw1': 'Draw One',
  'value.draw5': 'Draw Five',
  'value.wild2': 'Wild Draw Two',
  'value.wildColor': 'Wild Draw Color',
  'value.skipAll': 'Skip Everyone',
  'value.flip': 'Flip',
  cardName: ({ color, value }) => {
    const wild = { wild: 'Wild', wild4: 'Wild Draw Four', wild2: 'Wild Draw Two', wildColor: 'Wild Draw Color' }[value];
    if (wild) return wild;
    const v = { skip: 'Skip', reverse: 'Reverse', draw2: 'Draw Two', draw1: 'Draw One', draw5: 'Draw Five', skipAll: 'Skip Everyone', flip: 'Flip' }[value] || value;
    return `${cap(COLOR_EN[color])} ${v}`;
  },

  // ---------- UNO Flip ----------
  'side.light': '☀️ Light side',
  'side.dark': '🌑 Dark side',
  'flip.backsTitle': 'The other side of their cards',
  'flip.backsOf': "{name}'s cards, seen from your side",
  'modal.pickColorFlip': 'A wild turned up: pick its color',

  // ---------- voice chat ----------
  'voice.join': 'Join the voice chat',
  'voice.leave': 'Leave the voice chat',
  'voice.mute': 'Mute your mic (V)',
  'voice.unmute': 'Unmute your mic (V)',
  'voice.onTag': 'In the voice chat',
  'voice.mutedTag': 'In the voice chat (muted)',
  'voice.needHttps': 'The mic only works on the secure online link (https://) or on the server PC: you can listen, not talk',
  'voice.noMic': 'No microphone access: you can listen, not talk',
  'voice.unsupported': 'This browser does not support voice chat',

  // ---------- server errors (English text comes from the server) ----------

  // ---------- system chat ----------
  'sys.created': '{name} created the room',
  'sys.joined': p => `${p.name} joined${p.waiting ? ' — they will be dealt in next round' : ''}`,
  'sys.botJoined': p => `${p.name} 🤖 joined${p.waiting ? ' (next round)' : ''}`,
  'sys.removed': '{name} was removed',
  'sys.left': '{name} left',
  'sys.connected': '{name} connected',
  'sys.newHost': '{name} is now the host',
  'sys.gameOn': p => (p.target ? `Game on! First to ${p.target} points.` : 'Game on! One round decides it.'),
  'sys.lobby': 'Back to the lobby',

  // ---------- rules ----------
  'rules.html': `
    <h3>📶 Connecting (no internet needed)</h3>
    <ol>
      <li>One PC runs <code>start.bat</code> (that's the server).</li>
      <li>Everyone must be on the <b>same network</b>: the same Wi-Fi router, <i>or</i> turn on <b>Windows Mobile Hotspot</b> (Settings → Network → Mobile hotspot) and have friends join it. The router doesn't need internet.</li>
      <li>Friends open the address shown (like <code>http://192.168.1.8:3000</code>) in any browser, including phones.</li>
      <li>Can't connect? Run <code>allow-firewall.bat</code> once on the server PC, or click "Allow" on the Windows Firewall popup.</li>
    </ol>
    <h3>🃏 Basics</h3>
    <p>Match the top card by <b>color</b> or <b>number/symbol</b>, or play a <b>Wild</b>. Can't (or don't want to)? Draw a card. If it's playable you may play it right away. First to empty their hand wins the round and scores the cards left in the other players' hands, divided by the square root of the number of opponents (numbers = face value, action cards = 20, wilds = 50), so a game lasts about as long with 3 players as with 10.</p>
    <h3>⚡ Action cards</h3>
    <ul>
      <li><b>Skip</b>: the next player loses their turn.</li>
      <li><b>Reverse</b>: direction flips (with 2 players it acts like Skip).</li>
      <li><b>Draw Two</b>: the next player draws 2 and loses their turn.</li>
      <li><b>Wild</b>: choose the next color.</li>
      <li><b>Wild Draw Four</b>: choose the color, the next player draws 4 and loses their turn. It's only <i>legal</i> if you have no card of the current color. The victim may <b>challenge</b>: if you bluffed, you draw 4; if you were honest, they draw 6.</li>
    </ul>
    <h3>⭐ Bonus points (on by default)</h3>
    <ul>
      <li>🚨 Catch someone who forgot UNO: <b>+10</b></li>
      <li>⚡ Play 3 or more cards at once: <b>+5 per card</b></li>
      <li>🎯 Go out on an action card or a wild: <b>+20</b></li>
      <li>🔥 Win rounds in a row: <b>+10</b>, <b>+20</b>, then <b>+30</b> for each win after that</li>
    </ul>
    <h3>📣 UNO!</h3>
    <p>Hit <b>UNO!</b> when you're down to 2 cards (before playing) or right after you drop to 1 (with the <b>UNO on the last card</b> rule: only once you're down to 1). If you forget, anyone can hit <b>Catch!</b> on you before the next player acts, and you draw a penalty.</p>
    <h3>🌗 UNO Flip (host picks it in the lobby)</h3>
    <p>Every card has a <b>light side</b> and a <b>dark side</b>. You play the light side first. You see the side of your cards that's in play, and everyone else sees their other side, so watch what your opponents are holding! Tap a player to see their cards up close.</p>
    <ul>
      <li><b>Flip</b>: every card turns over: hands, deck and discard pile. If a wild turns up on top, you pick its color.</li>
      <li>☀️ <b>Draw One</b>: the next player draws 1 and loses their turn. <b>Wild Draw Two</b>: choose the color, the next player draws 2 and loses their turn (can be challenged like a +4).</li>
      <li>🌑 <b>Draw Five</b>: the next player draws 5 and loses their turn. <b>Skip Everyone</b>: you play again. <b>Wild Draw Color</b>: choose a color, the next player draws until they get that color and loses their turn. It can't be challenged, unless the host turns on <b>Challenge Draw Color</b>.</li>
      <li>Scoring: Draw One 10, Draw Five / Reverse / Skip / Flip 20, Skip Everyone 30, Wild 40, Wild Draw Two 50, Wild Draw Color 60.</li>
    </ul>
    <h3>🎧 Voice chat</h3>
    <p>Hit <b>🎧</b> to talk with the table, and <b>🎙️</b> (or <b>V</b>) to mute. The mic needs the secure <b>online link</b> (https://) or the server PC itself; on a plain Wi-Fi address you can still listen. Whoever is talking lights up green.</p>
    <h3>🏠 House rules (host picks in the lobby)</h3>
    <ul>
      <li><b>Multi-card play</b>: play several cards with the same number or symbol in one go, whatever their colors (e.g. four 1s). Only the first has to match; the last one sets the color. Action cards add up: two +2s make +4, two Skips skip two players.</li>
      <li><b>Last one standing</b>: emptying your hand doesn't end the round, you just sit out. The round ends when only one player still has cards, and they score 0. Points go by place: 100 for the first one out, down to 0 for the last (with 5 players: 100, 75, 50, 25, 0).</li>
      <li><b>Stacking</b>: answer a +2 with a +2 or +4, or a +4 with a +4. The penalty grows until someone can't stack.</li>
      <li><b>Draw until playable</b>: keep drawing until you get a card you can play.</li>
      <li><b>Forced play</b>: if the drawn card is playable, you must play it.</li>
      <li><b>7-0</b>: a 7 swaps your hand with a player of your choice; a 0 passes every hand along in the direction of play.</li>
      <li><b>Jump-in</b>: holding the exact same card (color and number) as the top card? Play it any time, even out of turn. Play continues from you.</li>
      <li><b>Turn timer</b>: when time runs out, autopilot moves for you.</li>
    </ul>
    <h3>💡 Tips</h3>
    <ul>
      <li>If someone disconnects, autopilot plays for them after 10s. Reopen the page to come back.</li>
      <li>Add bots to fill the table or to practice solo.</li>
      <li>Tap <b>Sort</b> to switch between sorting by color, by number, or not at all.</li>
      <li>Each player can pick their own language with the 🌐 button.</li>
    </ul>`,
};

const fr = {
  // ---------- page statique ----------
  'home.tagline': 'Joue avec tes amis sur le même Wi-Fi ou point d\'accès. Pas besoin d\'internet.',
  'home.name': 'Ton prénom',
  'home.namePh': 'ex. Khalil',
  'home.create': 'Créer une salle',
  'home.or': 'ou rejoins un ami',
  'home.code': 'Code de la salle',
  'home.join': 'Rejoindre',
  'home.friendsFrom': 'Tes amis se connectent via',
  'home.lookingUp': 'Recherche des adresses…',
  'home.howTo': 'Règles et connexion',
  'home.allGames': '← Tous les jeux',
  'top.leave': '← Quitter',
  'top.room': 'SALLE',
  'title.rules': 'Règles',
  'title.sound': 'Son',
  'title.chat': 'Discussion',
  'title.menu': 'Menu',
  'title.scores': 'Scores',
  'title.language': 'Language: English',
  'lobby.players': 'Joueurs',
  'lobby.addBot': '＋ Ajouter un bot',
  'lobby.rules': 'Règles maison',
  'lobby.invite': 'Inviter des amis',
  'lobby.inviteHint': 'Envoie-leur un lien (le 🌍 marche de partout, les autres sur ton Wi-Fi) :',
  'lobby.orCode': '…ou ils ouvrent le site et tapent le code',
  'lobby.startGame': 'Lancer la partie',
  'game.room': 'Salle',
  'pile.draw': 'Pioche',
  'pile.discard': 'Défausse',
  'btn.sortTitle': 'Changer le tri de ta main',
  'drawer.chat': 'Discussion',
  'drawer.log': 'Historique',
  'drawer.close': 'Fermer',
  'chat.placeholder': 'Chambre tes potes…',
  'chat.send': 'Envoyer',
  'modal.pickColor': 'Choisis une couleur',
  'modal.swapWith': 'Échanger ta main avec…',
  'modal.cancel': 'Annuler',
  'modal.close': 'Fermer',
  'menu.title': 'Menu',
  'menu.fullscreen': '⛶ Plein écran',
  'menu.fx': p => `✨ Effets : ${p.on ? 'MAX' : 'désactivés'}`,
  'toast.fxOn': '✨ Effets activés : grand spectacle !',
  'toast.fxOff': 'Effets désactivés : mode calme',
  'menu.end': '⏹ Terminer la partie pour tous',
  'menu.leave': '🚪 Quitter la salle',
  'rules.title': 'Comment jouer',
  'rules.ok': 'Compris',
  'conn.reconnecting': 'Reconnexion…',
  'title.page': 'UNO Night',
  'title.turn': '▶ À toi de jouer ! · UNO',

  // ---------- notifications ----------
  'err.connection': 'Problème de connexion, réessaie',
  'err.requestFailed': 'La requête a échoué ({status})',
  'toast.roomGone': 'Cette salle n\'existe plus (le serveur a peut-être redémarré).',
  'toast.left': 'Tu as quitté la salle',
  'toast.copied': 'Lien copié 📋',
  'toast.enterName': 'Entre d\'abord ton prénom ✏️',
  'toast.codeLength': 'Les codes de salle ont 4 lettres',
  'toast.pressJoin': 'Appuie sur Rejoindre pour entrer dans la salle {code}',
  'toast.enterNameJoin': 'Entre ton prénom, puis rejoins la salle {code}',
  'toast.fullscreenNA': 'Plein écran indisponible',
  'toast.lang': 'Langue : français',
  'kick.kicked': 'L\'hôte t\'a retiré de la salle',
  'kick.left': 'Tu as quitté la salle',

  // ---------- accueil ----------
  'addr.none': 'Aucun réseau trouvé sur le PC serveur. Connecte-le au Wi-Fi ou active le point d\'accès mobile.',
  'addr.weak': 'probablement inaccessible',
  'addr.online': '🌍 Lien en ligne : marche de partout',
  'addr.onlineWait': '🌍 Ouverture du lien en ligne…',
  'btn.copy': 'Copier',
  'rooms.rejoin': 'Revenir en tant que {name}',
  'rooms.rejoinTag': 'revenir',
  'rooms.desc': p => `Salle de ${p.host} · ${p.n} joueur${s(p.n)}`,
  'rooms.status.playing': 'en partie',
  'rooms.status.lobby': 'salon',
  'rooms.status.finished': 'terminée',

  // ---------- réglages ----------
  'set.startCards': 'Cartes au départ',
  'set.targetScore': 'Partie en',
  'set.targetScore.hint': 'Points nécessaires pour gagner la partie',
  'set.turnTimer': 'Chrono par tour',
  'set.turnTimer.hint': 'Le pilote auto joue quand le temps est écoulé',
  'set.unoPenalty': 'Pénalité oubli du UNO',
  'set.stacking': 'Cumul',
  'set.stacking.hint': 'Réponds à un +2 par un +2/+4, et à un +4 par un +4',
  'set.challenge': 'Contester le +4',
  'set.challenge.hint': 'Dénonce un +4 joué illégalement (désactivé avec le cumul)',
  'set.drawUntilPlayable': 'Piocher jusqu\'à pouvoir jouer',
  'set.drawUntilPlayable.hint': 'Continue de piocher tant que tu ne peux pas jouer',
  'set.forcePlay': 'Jeu obligatoire',
  'set.forcePlay.hint': 'Une carte piochée jouable doit être jouée',
  'set.sevenZero': 'Règle du 7-0',
  'set.sevenZero.hint': 'Le 7 échange deux mains, le 0 fait tourner toutes les mains',
  'set.jumpIn': 'Interception',
  'set.jumpIn.hint': 'Joue une carte identique même hors de ton tour',
  'set.flip': 'UNO Flip',
  'set.flip.hint': 'Cartes à deux faces : une carte Flip retourne tout vers le redoutable côté obscur',
  'set.challengeColor': 'Contester la Pioche Couleur',
  'set.challengeColor.hint': 'Le Joker Pioche Couleur peut être contesté comme un +4',
  'set.multiPlay': 'Pose multiple',
  'set.multiPlay.hint': 'Pose d\'un coup plusieurs cartes du même chiffre ou symbole, toutes couleurs',
  'set.lastStanding': 'Dernier survivant',
  'set.lastStanding.hint': 'Vider sa main ne finit pas la manche : le dernier à avoir des cartes perd',
  'set.bonuses': 'Points bonus',
  'set.bonuses.hint': 'Contre-UNO +10, combos de 3 cartes ou plus, finir sur une carte action +20, séries de victoires',
  'bonus.catch': 'Contre-UNO réussi',
  'bonus.combo': 'Combo',
  'bonus.finish': 'Final en action',
  'bonus.streak': 'Série de victoires',
  'toast.bonus': '⭐ {label} : +{pts} pts',
  'log.bonus': p => `${p.who} ⭐ ${p.label} +${p.pts}`,
  'set.unoLastCard': 'UNO à la dernière carte',
  'set.unoLastCard.hint': "Le bouton UNO n'apparaît que quand il te reste une seule carte",

  // ---------- pose multiple & dernier survivant ----------
  'multi.hint': 'Touche d\'autres « {v} » pour les ajouter, puis Poser',
  'multi.play': p => `Poser (${p.n}) carte${s(p.n)}`,
  'seat.place': p => `🏁 ${ordFr(p.n)} (sorti)`,
  'seat.score': '{n} pts',
  'seat.now': 'Joue',
  'seat.next': 'Suivant',
  'strip.title': 'Ordre de jeu',
  'strip.now': 'joue',
  'strip.next': 'ensuite',
  'dir.cw': 'Sens horaire',
  'dir.ccw': 'Sens anti-horaire',
  'menu.rules': '❓ Règles du jeu',
  'menu.sound': p => `${p.on ? '🔊' : '🔇'} Son : ${p.on ? 'activé' : 'coupé'}`,
  'board.title': 'Classement',
  'fx.combo': '×{n} COMBO !',
  'board.rank': p => ordFr(p.n),
  'me.out': p => `🏁 fini, ${ordFr(p.place)} · ${p.pts} pts`,
  'status.finished': p => `🏁 Tu as fini (${ordFr(p.place)}) ! Au tour de ${p.name}`,
  'toast.finishedMe': p => `🏁 Tu as fini ${ordFr(p.place)} ! +${p.pts} pts`,
  'toast.finished': p => `🏁 ${p.name} a fini (${ordFr(p.place)})`,
  'ev.lastOne': '🃏 Dernier !',
  'log.finished': p => `<b>${p.me ? 'Tu as' : `${p.who} a`} fini</b> ${ordFr(p.place)} (+${p.pts} pts)`,
  'log.lastOne': p => `<b>${p.me ? 'Tu es' : `${p.who} est`} le dernier à avoir des cartes</b> (0 pt)${p.over ? '. Partie terminée !' : ''}`,
  'res.lastSub': '{name} a gardé des cartes jusqu\'au bout : 0 point · le premier à {target} gagne',
  'lobby.scan': 'Scanne avec ton téléphone pour rejoindre',
  'opt.cards': p => `${p.n} cartes`,
  'opt.oneRound': 'Une manche',
  'opt.points': '{n} pts',
  'opt.off': 'Désactivé',
  'opt.seconds': '{n} s',

  // ---------- salon ----------
  'lobby.youPick': 'tu choisis',
  'lobby.hostPicks': 'l\'hôte choisit',
  'tag.host': 'HÔTE',
  'tag.you': 'TOI',
  'tag.bot': 'BOT',
  'tag.away': 'ABSENT',
  'lobby.remove': 'Retirer {name}',
  'lobby.needPlayers': 'Il faut 2 joueurs ou plus : ajoute un bot ou un ami',
  'lobby.start': 'Lancer la partie ({n} joueurs)',
  'lobby.allDealt': 'Tous les joueurs de la liste recevront des cartes.',
  'lobby.waiting': 'En attente que {name} lance la partie…',
  'theHost': 'l\'hôte',
  'confirm.sure': 'Sûr ?',
  'confirm.draw': 'Piocher quand même ?',
  'rotate.title': 'Tourne ton téléphone',
  'rotate.text': 'La table est plus grande et tes cartes plus faciles à jouer.',
  'rotate.lock': '🔄 Jouer en paysage',
  'rotate.skip': 'Rester en portrait',
  'rotate.manual': 'Tourne ton téléphone (et vérifie que la rotation auto est activée)',
  'confirm.leave': 'Appuie encore pour quitter',
  'confirm.end': 'Encore une fois : terminer pour tous',

  // ---------- table ----------
  'game.roundTarget': 'Manche {n} · premier à {target}',
  'game.roundSingle': 'Manche {n} · le gagnant rafle tout',
  'seat.catch': 'Contre-UNO !',
  'seat.joinsNext': 'joue à la prochaine manche',
  'pile.left': '{n} restantes',
  'me.spectating': 'spectateur',
  'me.you': '(toi)',
  'me.meta': p => `<b>${p.n}</b> carte${s(p.n)} · ${p.pts} pts`,
  'btn.uno': 'UNO !',
  'btn.unoDone': 'UNO ✓',
  'btn.unoArmed': 'UNO prêt',
  'btn.takeUntil': 'Piocher jusqu\'au {color}',
  'btn.accept': 'Accepter +{n}',
  'btn.take': 'Prendre +{n}',
  'btn.draw': 'Piocher',
  'btn.pass': 'Passer',
  'btn.challenge': 'Contester !',
  'sort.color': 'Tri : couleur',
  'sort.value': 'Tri : numéro',
  'sort.none': 'Tri : aucun',

  'status.gameOver': 'Partie terminée !',
  'status.roundOver': 'Manche terminée !',
  'status.spectating': '👀 Spectateur · au tour de {name}',
  'status.challenge': '{card} ! Accepter ou contester ?',
  'status.stack': 'Cumule un +2/+4 ou prends {n} cartes !',
  'status.drawnPass': 'Joue la carte piochée ou passe',
  'status.drawnForced': 'Tu dois jouer la carte piochée',
  'status.yourTurn': 'À toi de jouer !',
  'status.thenNext': ' Ensuite : {name}',
  'status.youNext': ' · tu joues juste après !',
  'status.youIn': ' · tu joues dans {n} tours',
  'status.noMatch': 'À toi : rien de jouable, pioche une carte',
  'status.theirTurn': 'Au tour de {name}',
  'status.away': ' (absent, pilote auto)',

  // ---------- événements ----------
  'ev.skipped': '⊘ Passe ton tour',
  'ev.reverse': '⇄ Inversion !',
  'ev.flip': 'FLIP !',
  'ev.caught': 'Contre-UNO ! 🚨',
  'ev.jumpIn': 'Interception ! ⚡',
  'ev.iWin': 'J\'ai gagné ! 🎉',
  'ev.out': '🎉 Fini !',
  'toast.caught': '{by} a eu {who} : pas de UNO ! +{n}',
  'toast.caughtMe': '{by} t\'a eu : tu n\'as pas dit UNO ! +{n}',
  'toast.youCaught': 'Tu as eu {who} : pas de UNO ! +{n}',
  'toast.challengeOk': 'Contestation ! {a} contre {b} : bluff démasqué 🕵️ (+4)',
  'toast.challengeBad': 'Contestation ! {a} contre {b} : le +4 était légal (+6)',
  'toast.swap': '🔄 Échange de mains : {a} ⇄ {b}',
  'toast.rotate': '🔄 Zéro ! Toutes les mains tournent',
  'toast.timeoutMe': '⏰ Temps écoulé ! Le pilote auto a joué pour toi',
  'toast.timeout': '⏰ {name} a dépassé le temps',
  'toast.reshuffle': '♻️ La défausse est remélangée dans la pioche',
  'toast.roundStart': 'Manche {n} : distribution ! 🃏',
  'toast.abandoned': 'Plus assez de joueurs pour continuer',

  // ---------- historique ----------
  'you': 'Toi',
  'someone': 'Quelqu\'un',
  'log.play': p => `${p.me ? 'Tu as' : `${p.who} a`} joué <b>${p.card}</b>${p.color ? ` → ${p.color}` : ''}`,
  'log.draw': p => `${p.me ? 'Tu as' : `${p.who} a`} pioché ${p.n} carte${s(p.n)}${p.reason}`,
  'log.reason.draw2': ' (+2)',
  'log.reason.wild4': ' (+4)',
  'log.reason.draw1': ' (+1)',
  'log.reason.draw5': ' (+5)',
  'log.reason.wild2': ' (+2)',
  'log.reason.wildColor': ' (pioche couleur)',
  'log.flip': p => `<b>Flip !</b> Côté ${p.dark ? 'obscur' : 'clair'}, ${p.color}`,
  'log.reason.caught': ' (oubli du UNO)',
  'log.reason.challenge': ' (contestation)',
  'log.pass': p => (p.me ? 'Tu as passé' : `${p.who} a passé`),
  'log.skip': p => (p.me ? 'Tu passes ton tour' : `${p.who} passe son tour`),
  'log.reverse': 'Sens inversé',
  'log.uno': p => `<b>${p.me ? 'Tu as' : `${p.who} a`} dit UNO !</b>`,
  'log.caught': p => (p.whoMe ? `${p.by} t'a eu sans UNO` : `${p.byMe ? 'Tu as' : `${p.by} a`} eu ${p.who} sans UNO`),
  'log.challenge': p => `${p.me ? 'Tu as' : `${p.who} a`} contesté ${p.targetMe ? 'ton +4' : `le +4 de ${p.target}`} : ${p.ok ? 'bluff démasqué' : 'il était légal'}`,
  'log.swap': 'Échange de mains : {who} ⇄ {target}',
  'log.rotate': 'Toutes les mains ont tourné',
  'log.jumpIn': p => `${p.me ? 'Tu as' : `${p.who} a`} intercepté !`,
  'log.timeout': p => (p.me ? 'Ton temps est écoulé' : `${p.who} a dépassé le temps`),
  'log.reshuffle': 'Pioche remélangée',
  'log.roundStart': '<b>Manche {n}</b>, {dealer} distribue. Première carte : {card}',
  'log.roundOver': p => `<b>${p.me ? 'Tu as' : `${p.who} a`} gagné la manche</b> (+${p.pts} pts)${p.over ? '. Partie terminée !' : ''}`,
  'log.abandoned': 'Partie arrêtée : plus assez de joueurs',
  'log.leave': 'Un joueur a quitté la partie',

  // ---------- coup impossible ----------
  'reason.notTurnJump': 'Ce n\'est pas ton tour (l\'interception exige exactement la même carte)',
  'reason.notTurn': 'Ce n\'est pas ton tour',
  'reason.onlyDrawn': 'Tu ne peux jouer que la carte que tu viens de piocher',
  'reason.stack': 'Cumule un +2/+4 ou prends {n} cartes',
  'reason.take': 'Prends les {n} cartes',
  'reason.takeUntil': 'Pioche jusqu\'à tomber sur une carte {color}',
  'reason.noMatch': '{card} ne va pas : il faut du {color} ou « {value} »',

  // ---------- choix ----------
  'picker.inHand': '{n} en main',
  'cards.count': p => `${p.n} carte${s(p.n)}`,

  // ---------- résultats ----------
  'res.gameOverTitle': 'Partie terminée',
  'res.notEnough': 'Plus assez de joueurs pour continuer.',
  'res.youWinGame': '🏆 Tu remportes la partie !',
  'res.winsGame': '🏆 {name} remporte la partie !',
  'res.youWonRound': 'Tu as gagné la manche {n} !',
  'res.wonRound': '{name} a gagné la manche {n} !',
  'res.final': 'Score final : {pts} points',
  'res.targetSuffix': ' (objectif {target})',
  'res.roundSub': '+{pts} points · le premier à {target} gagne',
  'res.out': '🎉 fini !',
  'res.viewTable': 'Voir la table',
  'res.lobby': 'Retour au salon',
  'res.again': 'Rejouer',
  'res.next': 'Manche suivante ▶',
  'res.waitNew': 'En attente que {name} lance une nouvelle partie…',
  'res.waitNext': 'En attente que {name} distribue la manche suivante…',
  'res.youSuffix': ' (toi)',
  'sb.title': 'Scores',
  'sb.subTarget': 'Manche {n} · premier à {target} points',
  'sb.subSingle': 'Manche {n} · une seule manche décide',
  'sb.rules': 'Règles maison : {list} · pénalité UNO {n}',
  'sb.classic': 'classiques',
  'sb.timer': ' · chrono {n} s',

  // ---------- cartes ----------
  'color.red': 'rouge',
  'color.yellow': 'jaune',
  'color.green': 'vert',
  'color.blue': 'bleu',
  'color.pink': 'rose',
  'color.teal': 'turquoise',
  'color.orange': 'orange',
  'color.purple': 'violet',
  'value.skip': 'Passe ton tour',
  'value.reverse': 'Inversion',
  'value.draw2': '+2',
  'value.wild': 'Joker',
  'value.wild4': 'Super Joker +4',
  'value.draw1': '+1',
  'value.draw5': '+5',
  'value.wild2': 'Joker +2',
  'value.wildColor': 'Joker Pioche Couleur',
  'value.skipAll': 'Passe pour tous',
  'value.flip': 'Flip',
  cardName: ({ color, value }) => {
    const wild = { wild: 'Joker', wild4: 'Super Joker +4', wild2: 'Joker +2', wildColor: 'Joker Pioche Couleur' }[value];
    if (wild) return wild;
    if (value === 'skip') return `Passe ton tour ${COLOR_FR[color]}`;
    if (value === 'skipAll') return `Passe pour tous ${COLOR_FR[color]}`;
    if (value === 'reverse') return `Inversion ${COLOR_FR_F[color]}`;
    if (value === 'flip') return `Flip ${COLOR_FR[color]}`;
    if (value === 'draw1' || value === 'draw2' || value === 'draw5') return `+${value.slice(4)} ${COLOR_FR[color]}`;
    return `${value} ${COLOR_FR[color]}`;
  },

  // ---------- UNO Flip ----------
  'side.light': '☀️ Côté clair',
  'side.dark': '🌑 Côté obscur',
  'flip.backsTitle': 'L\'autre face de ses cartes',
  'flip.backsOf': 'Les cartes de {name}, vues de ton côté',
  'modal.pickColorFlip': 'Un joker est apparu : choisis sa couleur',

  // ---------- chat vocal ----------
  'voice.join': 'Rejoindre le chat vocal',
  'voice.leave': 'Quitter le chat vocal',
  'voice.mute': 'Couper ton micro (V)',
  'voice.unmute': 'Rallumer ton micro (V)',
  'voice.onTag': 'Dans le chat vocal',
  'voice.mutedTag': 'Dans le chat vocal (micro coupé)',
  'voice.needHttps': 'Le micro ne marche que sur le lien en ligne sécurisé (https://) ou sur le PC serveur : tu peux écouter, pas parler',
  'voice.noMic': 'Pas d\'accès au micro : tu peux écouter, pas parler',
  'voice.unsupported': 'Ce navigateur ne gère pas le chat vocal',

  // ---------- erreurs du serveur ----------
  'err.needTwoPlayers': 'Il faut au moins 2 joueurs',
  'err.needTwoBot': 'Il faut au moins 2 joueurs : ajoute un bot !',
  'err.roundIsOver': 'La manche est terminée',
  'err.roundNotOver': 'La manche n\'est pas terminée',
  'err.waitRoundEnd': 'Attends la fin de la manche',
  'err.notInGame': 'Tu ne fais pas partie de cette partie',
  'err.notYourTurn': 'Ce n\'est pas ton tour',
  'err.noCard': 'Tu n\'as pas cette carte',
  'err.onlyDrawn': 'Tu ne peux jouer que la carte piochée (ou passer)',
  'err.stackOrTake': p => `Cumule un +2/+4 ou prends ${p.count} cartes`,
  'err.noMatch': 'Cette carte ne correspond pas',
  'err.pickColor': 'Choisis une couleur pour le joker',
  'err.pickTarget': 'Choisis un joueur avec qui échanger ta main',
  'err.playOrPass': 'Joue la carte piochée ou passe',
  'err.drawFirst': 'Pioche d\'abord une carte',
  'err.forcedPlay': 'Jeu obligatoire activé : tu dois jouer la carte piochée',
  'err.nothingToChallenge': 'Il n\'y a rien à contester',
  'err.unoTooMany': 'Tu ne peux dire UNO que si un seul coup te laisse une carte',
  'err.oneCardOnly': 'La pose multiple est désactivée : une carte à la fois',
  'err.sameValueOnly': 'Les cartes posées ensemble doivent avoir le même chiffre ou symbole',
  'err.catchSelf': 'Tu ne peux pas te dénoncer toi-même : dis UNO !',
  'err.tooLate': 'Trop tard !',
  'err.hostOnly': 'Seul l\'hôte peut faire ça',
  'err.noGame': 'Aucune partie en cours',
  'err.rulesBetweenGames': 'Change les règles entre deux parties',
  'err.roomFull': 'La salle est pleine',
  'err.roomFullMax': p => `Cette salle est pleine (${p.max || 10} joueurs max)`,
  'err.tooManyPlayers': p => `Ce jeu se joue à ${p.max} joueurs maximum`,
  'err.unknownGame': 'Jeu inconnu',
  'err.wrongGame': 'Cette salle joue à un autre jeu',
  'err.tooManyRooms': 'Trop de salles ouvertes sur le serveur, réessaie plus tard',
  'err.noSuchPlayer': 'Ce joueur n\'existe pas',
  'err.useLeave': 'Utilise plutôt « Quitter »',
  'err.gameRunning': 'Une partie est déjà en cours',
  'err.unknownReaction': 'Réaction inconnue',
  'err.unknownAction': 'Action inconnue',
  'err.requestTooLarge': 'Requête trop volumineuse',
  'err.badJson': 'Données invalides',
  'err.roomNotFound': p => `Aucune salle avec le code ${p.code || '(vide)'}`,
  'err.memberNotFound': 'Salle ou joueur introuvable',
  'err.sessionExpired': 'Session expirée',
  'err.notFound': 'Introuvable',
  'err.methodNotAllowed': 'Méthode non autorisée',
  'err.serverError': 'Erreur du serveur',

  // ---------- messages système ----------
  'sys.created': '{name} a créé la salle',
  'sys.joined': p => `${p.name} a rejoint la salle${p.waiting ? ' (jouera à la prochaine manche)' : ''}`,
  'sys.botJoined': p => `${p.name} 🤖 a rejoint la salle${p.waiting ? ' (prochaine manche)' : ''}`,
  'sys.removed': '{name} a été retiré',
  'sys.left': '{name} est parti',
  'sys.connected': '{name} est connecté',
  'sys.newHost': '{name} est maintenant l\'hôte',
  'sys.gameOn': p => (p.target ? `C'est parti ! Premier à ${p.target} points.` : 'C\'est parti ! Une seule manche décide.'),
  'sys.lobby': 'Retour au salon',

  // ---------- règles ----------
  'rules.html': `
    <h3>📶 Connexion (pas besoin d'internet)</h3>
    <ol>
      <li>Un PC lance <code>start.bat</code> : c'est le serveur.</li>
      <li>Tout le monde doit être sur le <b>même réseau</b> : le même routeur Wi-Fi, <i>ou</i> active le <b>point d'accès mobile Windows</b> (Paramètres → Réseau → Point d'accès mobile) et tes amis s'y connectent. Le routeur n'a pas besoin d'internet.</li>
      <li>Tes amis ouvrent l'adresse affichée (par ex. <code>http://192.168.1.8:3000</code>) dans n'importe quel navigateur, téléphone compris.</li>
      <li>Ça ne se connecte pas ? Lance <code>allow-firewall.bat</code> une fois sur le PC serveur, ou clique sur « Autoriser » dans la fenêtre du pare-feu Windows.</li>
    </ol>
    <h3>🃏 Les bases</h3>
    <p>Pose une carte de la même <b>couleur</b> ou du même <b>numéro/symbole</b> que celle du dessus, ou un <b>Joker</b>. Tu ne peux pas (ou tu ne veux pas) ? Pioche une carte : si elle est jouable, tu peux la poser tout de suite. Le premier à vider sa main gagne la manche et marque les points des cartes restant chez les autres, divisés par la racine carrée du nombre d'adversaires (numéros = leur valeur, cartes action = 20, jokers = 50) : une partie dure à peu près autant à 3 qu'à 10.</p>
    <h3>⚡ Cartes action</h3>
    <ul>
      <li><b>Passe ton tour</b> : le joueur suivant ne joue pas.</li>
      <li><b>Inversion</b> : le sens du jeu change (à 2 joueurs, ça fait comme « Passe ton tour »).</li>
      <li><b>+2</b> : le joueur suivant pioche 2 cartes et passe son tour.</li>
      <li><b>Joker</b> : tu choisis la couleur suivante.</li>
      <li><b>Super Joker +4</b> : tu choisis la couleur, le joueur suivant pioche 4 cartes et passe son tour. Il n'est <i>légal</i> que si tu n'as aucune carte de la couleur en cours. La victime peut <b>contester</b> : si tu as bluffé, c'est toi qui pioches 4 ; si tu étais honnête, elle pioche 6.</li>
    </ul>
    <h3>⭐ Points bonus (activés par défaut)</h3>
    <ul>
      <li>🚨 Contre-UNO réussi : <b>+10</b></li>
      <li>⚡ Poser 3 cartes ou plus d'un coup : <b>+5 par carte</b></li>
      <li>🎯 Finir sur une carte action ou un joker : <b>+20</b></li>
      <li>🔥 Gagner des manches d'affilée : <b>+10</b>, <b>+20</b>, puis <b>+30</b> à chaque victoire suivante</li>
    </ul>
    <h3>📣 UNO !</h3>
    <p>Appuie sur <b>UNO !</b> quand il te reste 2 cartes (avant de jouer) ou juste après être passé à 1 (avec la règle <b>UNO à la dernière carte</b> : seulement une fois à 1 carte). Si tu oublies, n'importe qui peut appuyer sur <b>Contre-UNO !</b> avant que le joueur suivant ne joue, et tu pioches une pénalité.</p>
    <h3>🌗 UNO Flip (l'hôte l'active dans le salon)</h3>
    <p>Chaque carte a un <b>côté clair</b> et un <b>côté obscur</b>. On commence côté clair. Tu vois la face en jeu de tes cartes, et les autres voient leur autre face : surveille ce que tiennent tes adversaires ! Touche un joueur pour voir ses cartes en grand.</p>
    <ul>
      <li><b>Flip</b> : toutes les cartes se retournent, mains, pioche et défausse. Si un joker apparaît sur le dessus, tu choisis sa couleur.</li>
      <li>☀️ <b>+1</b> : le joueur suivant pioche 1 carte et passe son tour. <b>Joker +2</b> : tu choisis la couleur, le suivant pioche 2 et passe son tour (contestable comme un +4).</li>
      <li>🌑 <b>+5</b> : le suivant pioche 5 et passe son tour. <b>Passe pour tous</b> : tu rejoues. <b>Joker Pioche Couleur</b> : tu choisis une couleur, le suivant pioche jusqu'à tomber dessus et passe son tour. On ne peut pas le contester, sauf si l'hôte active <b>Contester la Pioche Couleur</b>.</li>
      <li>Points : +1 = 10, +5 / Inversion / Passe / Flip = 20, Passe pour tous = 30, Joker = 40, Joker +2 = 50, Joker Pioche Couleur = 60.</li>
    </ul>
    <h3>🎧 Chat vocal</h3>
    <p>Appuie sur <b>🎧</b> pour parler avec la table, et sur <b>🎙️</b> (ou <b>V</b>) pour couper ton micro. Le micro demande le <b>lien en ligne</b> sécurisé (https://) ou le PC serveur lui-même ; sur une simple adresse Wi-Fi tu peux quand même écouter. Celui qui parle s'allume en vert.</p>
    <h3>🏠 Règles maison (l'hôte choisit dans le salon)</h3>
    <ul>
      <li><b>Pose multiple</b> : pose d'un coup plusieurs cartes du même chiffre ou symbole, quelle que soit leur couleur (par ex. quatre « 1 »). Seule la première doit correspondre ; la dernière choisit la couleur. Les cartes action s'additionnent : deux +2 font +4, deux « Passe ton tour » sautent deux joueurs.</li>
      <li><b>Dernier survivant</b> : vider ta main ne finit pas la manche, tu sors simplement du jeu. La manche s'arrête quand un seul joueur a encore des cartes : il marque 0 point. Les points dépendent de ta place : 100 pour le premier sorti, jusqu'à 0 pour le dernier (à 5 joueurs : 100, 75, 50, 25, 0).</li>
      <li><b>Cumul</b> : réponds à un +2 par un +2 ou un +4, ou à un +4 par un +4. La pénalité grossit jusqu'à ce que quelqu'un ne puisse plus cumuler.</li>
      <li><b>Piocher jusqu'à pouvoir jouer</b> : continue de piocher jusqu'à avoir une carte jouable.</li>
      <li><b>Jeu obligatoire</b> : si la carte piochée est jouable, tu dois la jouer.</li>
      <li><b>7-0</b> : un 7 échange ta main avec le joueur de ton choix ; un 0 fait passer toutes les mains au voisin dans le sens du jeu.</li>
      <li><b>Interception</b> : tu as exactement la même carte (couleur et numéro) que celle du dessus ? Pose-la quand tu veux, même hors de ton tour. Le jeu reprend après toi.</li>
      <li><b>Chrono par tour</b> : quand le temps est écoulé, le pilote auto joue pour toi.</li>
    </ul>
    <h3>💡 Astuces</h3>
    <ul>
      <li>Si quelqu'un se déconnecte, le pilote auto joue pour lui après 10 s. Rouvre la page pour revenir.</li>
      <li>Ajoute des bots pour compléter la table ou t'entraîner seul.</li>
      <li>Appuie sur <b>Tri</b> pour trier ta main par couleur, par numéro, ou pas du tout.</li>
      <li>Chaque joueur peut choisir sa langue avec le bouton 🌐.</li>
    </ul>`,
};

const DICTS = { en, fr };
export const LANGS = ['en', 'fr'];

function detect() {
  try {
    const saved = localStorage.getItem('uno.lang');
    if (LANGS.includes(saved)) return saved;
  } catch { /* storage blocked */ }
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return nav.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

let lang = detect();
const listeners = [];

export function getLang() { return lang; }

export function has(key) { return key in DICTS[lang] || key in en; }

export function t(key, params = {}) {
  const v = DICTS[lang][key] ?? en[key];
  if (v === undefined) return key;
  if (typeof v === 'function') return v(params);
  return v.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? ''));
}

export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  try { localStorage.setItem('uno.lang', lang); } catch { /* ignore */ }
  applyStatic();
  for (const fn of listeners) fn(lang);
}

export function onLangChange(fn) { listeners.push(fn); }

// Fill every element tagged with data-i18n* attributes.
export function applyStatic(root = document) {
  document.documentElement.lang = lang;
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of root.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const el of root.querySelectorAll('[data-i18n-title]')) {
    el.title = t(el.dataset.i18nTitle);
    el.setAttribute('aria-label', el.title);
  }
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  for (const el of root.querySelectorAll('.lang-btn')) el.textContent = `🌐 ${lang.toUpperCase()}`;
}
