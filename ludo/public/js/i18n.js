// English / French translations.
// Values are strings with {placeholders} or functions of params (for plurals & grammar).
// HTML is only produced by a few keys (rules, log lines); callers escape names first.

const s = n => (n === 1 ? '' : 's');

const en = {
  'title.page': 'Ludo Night',
  'title.yourTurn': '🎲 Your turn! · Ludo',
  'title.language': 'Language',
  'title.rules': 'How to play',
  'title.sound': 'Sound',
  'title.chat': 'Chat',
  'title.menu': 'Menu',
  you: 'You',
  someone: 'Someone',
  theHost: 'the host',
  'color.red': 'Red',
  'color.green': 'Green',
  'color.yellow': 'Yellow',
  'color.blue': 'Blue',
  'place.1': '1st',
  'place.2': '2nd',
  'place.3': '3rd',
  'place.4': '4th',

  'home.tagline': 'A Ludo tournament: tables of 4, new opponents every round, first to the score wins. Same Wi-Fi, no internet needed.',
  'home.name': 'Your name',
  'home.namePh': 'e.g. Khalil',
  'home.create': 'Create a room',
  'home.or': 'or join a friend',
  'home.code': 'Room code',
  'home.join': 'Join',
  'home.friendsFrom': 'Friends join from',
  'home.lookingUp': 'Looking up addresses…',
  'home.howTo': 'How to play',
  'home.allGames': '← All games',
  'top.leave': '← Leave',
  'top.room': 'ROOM',
  'top.round': 'Round {n} · first to {target} pts',
  'game.room': 'Room',

  'lobby.players': 'Players',
  'lobby.addBot': '+ Add bot',
  'lobby.rules': 'Rules',
  'lobby.invite': 'Invite friends',
  'lobby.scan': 'Scan to join this room',
  'lobby.inviteHint': 'On the same Wi-Fi or hotspot, friends open:',
  'lobby.orCode': 'Or they type the room code',
  'lobby.startGame': 'Start the tournament',
  'lobby.youPick': 'you pick',
  'lobby.hostPicks': 'host picks',
  'lobby.needPlayers': 'Need 2 players (add a bot!)',
  'lobby.start': p => `Start the tournament · ${p.n} players`,
  'lobby.hint': 'Tables are re-mixed after every round.',
  'lobby.waiting': p => `Waiting for ${p.name} to start…`,
  'lobby.remove': p => `Remove ${p.name}`,
  'lobby.oneTable': 'Everyone plays at one table.',
  'lobby.tables': 'Split into {n} tables ({sizes}), re-mixed every round.',
  'tag.host': 'HOST',
  'tag.you': 'YOU',
  'tag.bot': 'BOT',
  'tag.away': 'away',

  'set.target': 'Score to win',
  'set.target.hint': '1st place at a table: 3 pts, 2nd: 2, 3rd: 1',
  'set.pieces': 'Pieces each',
  'set.pieces.hint': 'Fewer pieces = shorter rounds',
  'set.quick': 'Quick rounds',
  'set.quick.hint': 'A table stops when its first player gets every piece home',
  'set.turnTimer': 'Turn timer',
  'set.turnTimer.hint': 'Autopilot plays for whoever takes too long',
  'set.autoNext': 'Next round by itself',
  'set.autoNext.hint': 'A short break, then new tables',
  'opt.points': '{n} points',
  'opt.pieces': '{n} pieces',
  'opt.off': 'Off',
  'opt.seconds': '{n} s',

  'turn.yours': 'Your turn!',
  'turn.theirs': '{name}\'s turn',
  'turn.tableDone': 'This table is done',
  'turn.roundOver': 'Round over',
  'turn.over': 'Tournament over',
  'status.roll': 'Tap the die to roll',
  'status.move': 'You rolled {n}!',
  'status.waiting': '{name} ({color}) is playing…',
  'status.tableDone': 'This table has finished.',
  'status.youPlaced': 'You finished {place}: +{points} pts',
  'status.roundOver': 'Round over!',
  'status.champion': '🏆 {name} wins the tournament!',
  'explain.needSix': 'All your pieces are at the start: you need a 6 to bring one out.',
  'explain.roll': 'Roll, then move one of your pieces that many squares.',
  'explain.move': 'Tap a glowing piece to move it {n} squares.',
  'explain.raid': 'A piece in its lane is within reach: tap it (red glow) to catch it, or tap one of yours to move it {n} squares.',
  'explain.trapped': 'Your piece is stuck in an opponent\'s lane: it backs out one square on each 6 or 1.',
  'explain.youAre': 'You are {color}, bottom left. Your pieces go clockwise to the middle.',
  'explain.watching': 'You\'re watching another table.',
  'explain.waitTables': 'Waiting for the other tables to finish, then everyone gets new opponents.',
  'explain.nextRound': 'New tables in a moment: you\'ll face different players.',

  'side.standings': 'Standings',
  'side.story': 'Latest moves',
  'autoplay.on': 'Play for me',
  'autoplay.off': 'I’m back',
  'autoplay.title': 'The computer plays your turns until you tap “I’m back” or move yourself',
  'status.autoplay': 'The computer is playing for you',
  'tag.autoplay': 'auto',
  'side.tables': 'Tables',
  'side.target': 'first to {n}',
  'side.atTable': 'table {n}',
  'side.waiting': 'next round',
  'tables.name': 'Table {n}',
  'tables.short': 'T{n}',
  'tables.turn': '{name} playing',
  'tables.won': '{name} won',
  'watch.spectator': 'You join in next round. Watching table {n}.',
  'watch.other': 'Watching table {n}.',
  'watch.back': 'Back to my table',

  'die.roll': 'ROLL',
  'bubble.six': 'Six! Roll again',
  'bubble.noMove': 'No move',
  'bubble.threeSixes': 'Three 6s: turn lost',
  'bubble.captured': 'Captured!',
  'bubble.again.capture': 'Capture! Roll again',
  'bubble.again.home': 'Home! Roll again',
  'fx.yourTurn': 'Your turn!',
  'fx.home': 'HOME!',
  'fx.finished': p => `${p.name} finished!`,
  'fx.youFinished': 'All home!',
  'fx.first': '1st place!',
  'fx.round': p => `Round ${p.n}`,
  'fx.champion': 'CHAMPION!',
  'fx.winner': p => `${p.name} wins!`,
  'menu.fx': p => `✨ Effects: ${p.on ? 'on' : 'off'}`,
  'toast.fxOn': '✨ Effects on',
  'toast.fxOff': 'Effects off: calm mode',

  'ev.round': p => `Round ${p.n} begins`,
  'ev.roll': '{name} rolled a {value}',
  'ev.out': '{name} brought a piece out',
  'ev.move': p => `${p.name} moved ${p.steps} square${s(p.steps)}`,
  'ev.raid': p => `${p.name} broke into ${p.victimMe ? 'your' : `${p.victim}'s`} lane!`,
  'ev.back': '{name} backed out one square',
  'ev.backOut': '{name} got out of the lane',
  'ev.capture': p => (p.victimMe ? `${p.name} captured your piece!` : `${p.name} captured ${p.victim}'s piece!`),
  'ev.home': '{name} got a piece home',
  'ev.finished': '{name} got every piece home ({place})',
  'ev.noMove': '{name} rolled a {value}: no piece can move',
  'ev.threeSixes': p => `Three 6s in a row: ${p.me ? 'you lose' : `${p.name} loses`} the turn`,
  'ev.again': p => `${p.name} ${p.me ? 'roll' : 'rolls'} again${p.why === 'six' ? ' (six)' : p.why === 'capture' ? ' (capture)' : ' (piece home)'}`,
  'ev.timeout': '{name} ran out of time',
  'ev.tableDone': 'Table {table} done: {places}',
  'ev.roundOver': '— Round over —',
  'ev.gameOver': 'Tournament over!',
  'ev.leave': '{name} left the table',

  'results.round': 'Round {n} results',
  'results.youWin': '🏆 You win the tournament!',
  'results.champion': '🏆 {name} wins the tournament!',
  'results.nextIn': 'Next round in',
  'results.mixed': 'new tables, new opponents',
  'results.nextNow': 'Next round now',
  'results.again': 'New tournament',
  'results.lobby': 'Back to lobby',
  'results.waitHost': 'Waiting for {name}…',

  'intro.title': 'Ludo in 30 seconds',
  'intro.you': 'You are {color}. Your corner is always at the bottom left of the board.',
  'intro.go': 'Let\'s play!',
  'intro.more': 'Full rules',
  'intro.steps': `
    <li><b>🎲 Tap the die</b> on your turn. You need a <b>6</b> to bring a piece out of your corner.</li>
    <li><b>👆 Tap a glowing piece</b> to move it. Pieces go clockwise around the board, then up your colored lane to the middle.</li>
    <li><b>💥 Land on someone</b> to send their piece back to their corner (not on ★ squares).</li>
    <li><b>🔁 Roll again</b> after a 6, a capture or getting a piece home.</li>
    <li><b>🏆 Tournament:</b> places at your table earn points (3, 2, 1). After each round, tables are re-mixed. First to the target score wins.</li>`,

  'menu.title': 'Menu',
  'menu.rules': 'How to play',
  'menu.sound': p => `Sound: ${p.on ? 'on' : 'off'}`,
  'menu.fullscreen': 'Fullscreen',
  'menu.end': 'End tournament (back to lobby)',
  'menu.leave': 'Leave room',
  'modal.close': 'Close',
  'rules.title': 'How to play Ludo',
  'rules.ok': 'Got it',
  'drawer.chat': 'Chat',
  'drawer.log': 'Log',
  'drawer.close': 'Close',
  'chat.placeholder': 'Say something…',
  'chat.send': 'Send',
  'conn.reconnecting': 'Reconnecting…',
  'confirm.sure': 'Sure?',
  'confirm.leave': 'Leave? Tap again',
  'confirm.end': 'End it? Tap again',

  'addr.online': '🌍 Online link',
  'addr.onlineWait': '🌍 Opening the online link…',
  'addr.none': 'No network found: connect to Wi-Fi or turn on Mobile Hotspot.',
  'addr.weak': 'may not work',
  'btn.copy': 'Copy',
  'rooms.rejoin': 'Rejoin as {name}',
  'rooms.rejoinTag': 'yours',
  'rooms.desc': p => `${p.host}'s room · ${p.n} player${s(p.n)}`,
  'rooms.status.lobby': 'lobby',
  'rooms.status.playing': 'playing',
  'rooms.status.finished': 'finished',

  'toast.enterName': 'Enter your name first',
  'toast.enterNameJoin': 'Enter your name to join room {code}',
  'toast.pressJoin': 'Press Join to enter room {code}',
  'toast.codeLength': 'Room codes have 4 letters',
  'toast.roomGone': 'That room is gone',
  'toast.left': 'You left the room',
  'toast.copied': 'Copied!',
  'toast.lang': 'English',
  'toast.fullscreenNA': 'Fullscreen isn\'t available here',
  'toast.timeout': 'Time\'s up: autopilot played for you',
  'toast.newTable': p => `Round ${p.round}: you're playing ${p.names}`,
  'toast.placed': 'You finished {place} at your table: +{points} pts',
  'kick.kicked': 'You were removed from the room',
  'kick.left': 'You left the room',

  'voice.join': 'Join voice chat',
  'voice.leave': 'Leave voice chat',
  'voice.mute': 'Mute your mic (V)',
  'voice.unmute': 'Unmute your mic (V)',
  'voice.onTag': 'In voice chat',
  'voice.mutedTag': 'In voice chat (muted)',
  'voice.needHttps': 'Mics only work on the secure online link (https://) or on the server PC: you can listen but not talk',
  'voice.noMic': 'No microphone access: you can listen but not talk',
  'voice.unsupported': 'This browser doesn\'t support voice chat',

  'sys.created': '{name} created the room',
  'sys.joined': p => `${p.name} joined${p.waiting ? ' (they\'ll play from the next round)' : ''}`,
  'sys.botJoined': p => `${p.name} 🤖 joined${p.waiting ? ' (next round)' : ''}`,
  'sys.removed': '{name} was removed',
  'sys.left': '{name} left',
  'sys.connected': '{name} connected',
  'sys.newHost': '{name} is now the host',
  'sys.lobby': 'Back to the lobby',
  'sys.ludoOn': 'Tournament on! First to {target} points wins.',
  'sys.ludoRound': 'Round {round}: new tables!',

  'err.connection': 'Can\'t reach the server',
  'err.requestFailed': 'Request failed ({status})',

  'rules.html': `
    <h3>A round of Ludo</h3>
    <ul>
      <li>Everyone has pieces in their corner. Roll a <b>6</b> to bring one out onto your start square.</li>
      <li>Move one piece by the number you roll. Pieces go clockwise all the way around, then up your colored lane to the middle (<b>home</b>). You need the exact number to get home.</li>
      <li>Land on an opponent's piece to <b>capture</b> it: it goes back to their corner. Start squares and ★ squares are <b>safe</b>.</li>
      <li><b>Raid:</b> a piece in its colored lane isn't safe. Roll exactly onto it and you can catch it (or just move on). Your piece then stays in that lane and backs out one square on each <b>6</b> or <b>1</b>; the lane's owner can catch it there.</li>
      <li>Roll again after a <b>6</b>, a <b>capture</b> or getting a piece <b>home</b>. Three 6s in a row lose the turn.</li>
      <li>If only one move is possible it plays itself.</li>
    </ul>
    <h3>The tournament</h3>
    <ul>
      <li>Players are split into tables of at most 4.</li>
      <li>Each table plays a round. Places score <b>3, 2, 1, 0</b> points (2 players: 3 and 0).</li>
      <li>Quick rounds (on by default): a table stops when its first player gets every piece home; the others are ranked by how far their pieces got.</li>
      <li>When every table is done, everyone is <b>re-seated</b> so you meet new opponents.</li>
      <li>The first to the target score at the end of a round wins. Ties go to who won more tables.</li>
    </ul>
    <h3>Tips</h3>
    <ul>
      <li>Your corner is always shown at the bottom left. Tap "Tables" on the side to watch the others.</li>
      <li>People who join mid-round play from the next round. Disconnected players get the autopilot.</li>
      <li>Keyboard: <code>R</code>/<code>Space</code> roll · <code>1</code>–<code>4</code> move that piece · <code>T</code> chat.</li>
    </ul>`,
};

const fr = {
  'title.page': 'Ludo Night',
  'title.yourTurn': '🎲 À toi ! · Ludo',
  'title.language': 'Langue',
  'title.rules': 'Comment jouer',
  'title.sound': 'Son',
  'title.chat': 'Discussion',
  'title.menu': 'Menu',
  you: 'Toi',
  someone: 'Quelqu\'un',
  theHost: 'l\'hôte',
  'color.red': 'Rouge',
  'color.green': 'Vert',
  'color.yellow': 'Jaune',
  'color.blue': 'Bleu',
  'place.1': '1er',
  'place.2': '2e',
  'place.3': '3e',
  'place.4': '4e',

  'home.tagline': 'Un tournoi de Ludo : tables de 4, nouveaux adversaires à chaque manche, le premier au score gagne. Même Wi-Fi, sans internet.',
  'home.name': 'Ton nom',
  'home.namePh': 'ex. Khalil',
  'home.create': 'Créer une salle',
  'home.or': 'ou rejoindre un ami',
  'home.code': 'Code de la salle',
  'home.join': 'Rejoindre',
  'home.friendsFrom': 'Tes amis se connectent sur',
  'home.lookingUp': 'Recherche des adresses…',
  'home.howTo': 'Comment jouer',
  'home.allGames': '← Tous les jeux',
  'top.leave': '← Quitter',
  'top.room': 'SALLE',
  'top.round': 'Manche {n} · premier à {target} pts',
  'game.room': 'Salle',

  'lobby.players': 'Joueurs',
  'lobby.addBot': '+ Ajouter un bot',
  'lobby.rules': 'Règles',
  'lobby.invite': 'Inviter des amis',
  'lobby.scan': 'Scanne pour rejoindre la salle',
  'lobby.inviteHint': 'Sur le même Wi-Fi ou partage de connexion, ouvrez :',
  'lobby.orCode': 'Ou tapez le code de la salle',
  'lobby.startGame': 'Lancer le tournoi',
  'lobby.youPick': 'tu choisis',
  'lobby.hostPicks': 'l\'hôte choisit',
  'lobby.needPlayers': 'Il faut 2 joueurs (ajoute un bot !)',
  'lobby.start': p => `Lancer le tournoi · ${p.n} joueurs`,
  'lobby.hint': 'Les tables sont remélangées après chaque manche.',
  'lobby.waiting': p => `En attente de ${p.name} pour lancer…`,
  'lobby.remove': p => `Retirer ${p.name}`,
  'lobby.oneTable': 'Tout le monde joue à une seule table.',
  'lobby.tables': 'Répartis en {n} tables ({sizes}), remélangées à chaque manche.',
  'tag.host': 'HÔTE',
  'tag.you': 'TOI',
  'tag.bot': 'BOT',
  'tag.away': 'absent',

  'set.target': 'Score pour gagner',
  'set.target.hint': '1er à sa table : 3 pts, 2e : 2, 3e : 1',
  'set.pieces': 'Pions par joueur',
  'set.pieces.hint': 'Moins de pions = manches plus courtes',
  'set.quick': 'Manches rapides',
  'set.quick.hint': 'Une table s\'arrête quand son premier joueur a rentré tous ses pions',
  'set.turnTimer': 'Chrono par tour',
  'set.turnTimer.hint': 'Le pilote auto joue pour celui qui traîne',
  'set.autoNext': 'Manche suivante automatique',
  'set.autoNext.hint': 'Une courte pause, puis de nouvelles tables',
  'opt.points': '{n} points',
  'opt.pieces': '{n} pions',
  'opt.off': 'Non',
  'opt.seconds': '{n} s',

  'turn.yours': 'À toi !',
  'turn.theirs': 'Tour de {name}',
  'turn.tableDone': 'Cette table a fini',
  'turn.roundOver': 'Manche terminée',
  'turn.over': 'Tournoi terminé',
  'status.roll': 'Touche le dé pour le lancer',
  'status.move': 'Tu as fait {n} !',
  'status.waiting': '{name} ({color}) joue…',
  'status.tableDone': 'Cette table a fini.',
  'status.youPlaced': 'Tu finis {place} : +{points} pts',
  'status.roundOver': 'Manche terminée !',
  'status.champion': '🏆 {name} gagne le tournoi !',
  'explain.needSix': 'Tous tes pions sont au départ : il te faut un 6 pour en sortir un.',
  'explain.roll': 'Lance le dé, puis avance un de tes pions d\'autant de cases.',
  'explain.move': 'Touche un pion qui brille pour l\'avancer de {n} cases.',
  'explain.raid': 'Un pion adverse dans son couloir est à ta portée : touche-le (lueur rouge) pour l\'attraper, ou touche un de tes pions pour l\'avancer de {n} cases.',
  'explain.trapped': 'Ton pion est coincé dans un couloir adverse : il recule d\'une case à chaque 6 ou 1.',
  'explain.youAre': 'Tu es {color}, en bas à gauche. Tes pions tournent dans le sens des aiguilles d\'une montre jusqu\'au centre.',
  'explain.watching': 'Tu regardes une autre table.',
  'explain.waitTables': 'On attend que les autres tables finissent, puis tout le monde change d\'adversaires.',
  'explain.nextRound': 'Nouvelles tables dans un instant : tu affronteras d\'autres joueurs.',

  'side.standings': 'Classement',
  'side.story': 'Derniers coups',
  'autoplay.on': 'Joue pour moi',
  'autoplay.off': 'Je reprends',
  'autoplay.title': 'L’ordinateur joue à ta place jusqu’à ce que tu touches « Je reprends » ou que tu joues toi-même',
  'status.autoplay': 'L’ordinateur joue à ta place',
  'tag.autoplay': 'auto',
  'side.tables': 'Tables',
  'side.target': 'premier à {n}',
  'side.atTable': 'table {n}',
  'side.waiting': 'prochaine manche',
  'tables.name': 'Table {n}',
  'tables.short': 'T{n}',
  'tables.turn': '{name} joue',
  'tables.won': '{name} a gagné',
  'watch.spectator': 'Tu joues à la prochaine manche. Tu regardes la table {n}.',
  'watch.other': 'Tu regardes la table {n}.',
  'watch.back': 'Retour à ma table',

  'die.roll': 'LANCER',
  'bubble.six': 'Six ! Rejoue',
  'bubble.noMove': 'Aucun coup',
  'bubble.threeSixes': 'Trois 6 : tour perdu',
  'bubble.captured': 'Capturé !',
  'bubble.again.capture': 'Capture ! Rejoue',
  'bubble.again.home': 'Arrivé ! Rejoue',
  'fx.yourTurn': 'À toi !',
  'fx.home': 'ARRIVÉ !',
  'fx.finished': p => `${p.name} a fini !`,
  'fx.youFinished': 'Tous arrivés !',
  'fx.first': '1re place !',
  'fx.round': p => `Manche ${p.n}`,
  'fx.champion': 'CHAMPION !',
  'fx.winner': p => `${p.name} gagne !`,
  'menu.fx': p => `✨ Effets : ${p.on ? 'activés' : 'coupés'}`,
  'toast.fxOn': '✨ Effets activés',
  'toast.fxOff': 'Effets coupés : mode calme',

  'ev.round': p => `La manche ${p.n} commence`,
  'ev.roll': p => (p.me ? `Tu fais un ${p.value}` : `${p.name} fait un ${p.value}`),
  'ev.out': p => (p.me ? 'Tu sors un pion' : `${p.name} sort un pion`),
  'ev.move': p => `${p.me ? 'Tu avances' : `${p.name} avance`} de ${p.steps} case${s(p.steps)}`,
  'ev.raid': p => `${p.me ? 'Tu entres' : `${p.name} entre`} dans le couloir ${p.victimMe ? 'de ton pion' : `de ${p.victim}`} !`,
  'ev.back': p => (p.me ? 'Tu recules d\'une case' : `${p.name} recule d'une case`),
  'ev.backOut': p => (p.me ? 'Tu sors du couloir' : `${p.name} sort du couloir`),
  'ev.capture': p => (p.victimMe ? `${p.name} capture un de tes pions !` : p.me ? `Tu captures un pion de ${p.victim} !` : `${p.name} capture un pion de ${p.victim} !`),
  'ev.home': p => (p.me ? 'Tu rentres un pion' : `${p.name} rentre un pion`),
  'ev.finished': p => (p.me ? `Tu as rentré tous tes pions (${p.place})` : `${p.name} a rentré tous ses pions (${p.place})`),
  'ev.noMove': p => `${p.me ? 'Tu fais' : `${p.name} fait`} un ${p.value} : aucun pion ne peut bouger`,
  'ev.threeSixes': p => `Trois 6 d'affilée : ${p.me ? 'tu perds ton' : `${p.name} perd son`} tour`,
  'ev.again': p => `${p.me ? 'Tu rejoues' : `${p.name} rejoue`}${p.why === 'six' ? ' (six)' : p.why === 'capture' ? ' (capture)' : ' (pion rentré)'}`,
  'ev.timeout': p => (p.me ? 'Tu n\'as plus de temps' : `${p.name} n'a plus de temps`),
  'ev.tableDone': 'Table {table} terminée : {places}',
  'ev.roundOver': '— Fin de la manche —',
  'ev.gameOver': 'Tournoi terminé !',
  'ev.leave': p => (p.me ? 'Tu as quitté la table' : `${p.name} a quitté la table`),

  'results.round': 'Résultats de la manche {n}',
  'results.youWin': '🏆 Tu gagnes le tournoi !',
  'results.champion': '🏆 {name} gagne le tournoi !',
  'results.nextIn': 'Manche suivante dans',
  'results.mixed': 'nouvelles tables, nouveaux adversaires',
  'results.nextNow': 'Manche suivante maintenant',
  'results.again': 'Nouveau tournoi',
  'results.lobby': 'Retour au salon',
  'results.waitHost': 'En attente de {name}…',

  'intro.title': 'Le Ludo en 30 secondes',
  'intro.you': 'Tu es {color}. Ton coin est toujours en bas à gauche du plateau.',
  'intro.go': 'On joue !',
  'intro.more': 'Toutes les règles',
  'intro.steps': `
    <li><b>🎲 Touche le dé</b> à ton tour. Il faut un <b>6</b> pour sortir un pion de ton coin.</li>
    <li><b>👆 Touche un pion qui brille</b> pour l'avancer. Les pions font le tour du plateau, puis montent ton couloir de couleur jusqu'au centre.</li>
    <li><b>💥 Arrête-toi sur un adversaire</b> pour renvoyer son pion dans son coin (pas sur les cases ★).</li>
    <li><b>🔁 Rejoue</b> après un 6, une capture ou un pion rentré.</li>
    <li><b>🏆 Tournoi :</b> ta place à ta table rapporte des points (3, 2, 1). Après chaque manche, les tables sont remélangées. Le premier au score gagne.</li>`,

  'menu.title': 'Menu',
  'menu.rules': 'Comment jouer',
  'menu.sound': p => `Son : ${p.on ? 'activé' : 'coupé'}`,
  'menu.fullscreen': 'Plein écran',
  'menu.end': 'Arrêter le tournoi (retour au salon)',
  'menu.leave': 'Quitter la salle',
  'modal.close': 'Fermer',
  'rules.title': 'Comment jouer au Ludo',
  'rules.ok': 'Compris',
  'drawer.chat': 'Discussion',
  'drawer.log': 'Journal',
  'drawer.close': 'Fermer',
  'chat.placeholder': 'Dis quelque chose…',
  'chat.send': 'Envoyer',
  'conn.reconnecting': 'Reconnexion…',
  'confirm.sure': 'Sûr ?',
  'confirm.leave': 'Quitter ? Touche encore',
  'confirm.end': 'Arrêter ? Touche encore',

  'addr.online': '🌍 Lien en ligne',
  'addr.onlineWait': '🌍 Ouverture du lien en ligne…',
  'addr.none': 'Aucun réseau : connecte-toi au Wi-Fi ou active le point d\'accès mobile.',
  'addr.weak': 'peut ne pas marcher',
  'btn.copy': 'Copier',
  'rooms.rejoin': 'Revenir en tant que {name}',
  'rooms.rejoinTag': 'la tienne',
  'rooms.desc': p => `Salle de ${p.host} · ${p.n} joueur${s(p.n)}`,
  'rooms.status.lobby': 'salon',
  'rooms.status.playing': 'en jeu',
  'rooms.status.finished': 'terminée',

  'toast.enterName': 'Entre d\'abord ton nom',
  'toast.enterNameJoin': 'Entre ton nom pour rejoindre la salle {code}',
  'toast.pressJoin': 'Appuie sur Rejoindre pour entrer dans la salle {code}',
  'toast.codeLength': 'Les codes de salle ont 4 lettres',
  'toast.roomGone': 'Cette salle n\'existe plus',
  'toast.left': 'Tu as quitté la salle',
  'toast.copied': 'Copié !',
  'toast.lang': 'Français',
  'toast.fullscreenNA': 'Le plein écran n\'est pas disponible ici',
  'toast.timeout': 'Temps écoulé : le pilote auto a joué pour toi',
  'toast.newTable': p => `Manche ${p.round} : tu joues contre ${p.names}`,
  'toast.placed': 'Tu finis {place} à ta table : +{points} pts',
  'kick.kicked': 'Tu as été retiré de la salle',
  'kick.left': 'Tu as quitté la salle',

  'voice.join': 'Rejoindre le chat vocal',
  'voice.leave': 'Quitter le chat vocal',
  'voice.mute': 'Couper ton micro (V)',
  'voice.unmute': 'Rallumer ton micro (V)',
  'voice.onTag': 'Dans le chat vocal',
  'voice.mutedTag': 'Dans le chat vocal (micro coupé)',
  'voice.needHttps': 'Le micro ne marche que sur le lien en ligne sécurisé (https://) ou sur le PC serveur : tu peux écouter, pas parler',
  'voice.noMic': 'Pas d\'accès au micro : tu peux écouter, pas parler',
  'voice.unsupported': 'Ce navigateur ne gère pas le chat vocal',

  'sys.created': '{name} a créé la salle',
  'sys.joined': p => `${p.name} a rejoint la salle${p.waiting ? ' (jouera dès la prochaine manche)' : ''}`,
  'sys.botJoined': p => `${p.name} 🤖 a rejoint la salle${p.waiting ? ' (prochaine manche)' : ''}`,
  'sys.removed': '{name} a été retiré',
  'sys.left': '{name} est parti',
  'sys.connected': '{name} est connecté',
  'sys.newHost': '{name} est maintenant l\'hôte',
  'sys.lobby': 'Retour au salon',
  'sys.ludoOn': 'C\'est parti ! Le premier à {target} points gagne.',
  'sys.ludoRound': 'Manche {round} : nouvelles tables !',

  'err.connection': 'Impossible de joindre le serveur',
  'err.requestFailed': 'La requête a échoué ({status})',
  'err.needTwoPlayers': 'Il faut au moins 2 joueurs',
  'err.needTwoBot': 'Il faut au moins 2 joueurs : ajoute un bot !',
  'err.tooManyPlayers': p => `Ce jeu se joue à ${p.max} joueurs maximum`,
  'err.roundNotOver': 'La manche n\'est pas terminée',
  'err.notInGame': 'Tu ne joues pas cette manche',
  'err.notYourTurn': 'Ce n\'est pas ton tour',
  'err.hostOnly': 'Seul l\'hôte peut faire ça',
  'err.noGame': 'Aucune partie en cours',
  'err.rulesBetweenGames': 'Change les règles entre deux tournois',
  'err.roomFull': 'La salle est pleine',
  'err.roomFullMax': p => `Cette salle est pleine (${p.max || 16} joueurs max)`,
  'err.tooManyRooms': 'Trop de salles ouvertes sur le serveur, réessaie plus tard',
  'err.noSuchPlayer': 'Ce joueur n\'existe pas',
  'err.useLeave': 'Utilise plutôt « Quitter »',
  'err.gameRunning': 'Un tournoi est déjà en cours',
  'err.unknownReaction': 'Réaction inconnue',
  'err.unknownAction': 'Action inconnue',
  'err.unknownGame': 'Jeu inconnu',
  'err.wrongGame': 'Cette salle joue à un autre jeu',
  'err.requestTooLarge': 'Requête trop volumineuse',
  'err.badJson': 'Données invalides',
  'err.roomNotFound': p => `Aucune salle avec le code ${p.code || '(vide)'}`,
  'err.memberNotFound': 'Salle ou joueur introuvable',
  'err.sessionExpired': 'Session expirée',
  'err.notFound': 'Introuvable',
  'err.methodNotAllowed': 'Méthode non autorisée',
  'err.serverError': 'Erreur du serveur',
  'err.waitRoundEnd': 'Attends la fin de la manche',
  'err.roundIsOver': 'La manche est terminée',
  'err.tableDone': 'Ta table a fini cette manche',
  'err.rollFirst': 'Lance d\'abord le dé',
  'err.alreadyRolled': 'Tu as déjà lancé : avance un pion',
  'err.cantMove': 'Ce pion ne peut pas bouger',

  'rules.html': `
    <h3>Une manche de Ludo</h3>
    <ul>
      <li>Chacun a ses pions dans son coin. Fais un <b>6</b> pour en sortir un sur ta case de départ.</li>
      <li>Avance un pion du nombre obtenu. Les pions font tout le tour dans le sens des aiguilles d'une montre, puis montent ton couloir de couleur jusqu'au centre (<b>l'arrivée</b>). Il faut le nombre exact pour arriver.</li>
      <li>Arrête-toi sur un pion adverse pour le <b>capturer</b> : il retourne dans son coin. Les cases de départ et les cases ★ sont <b>protégées</b>.</li>
      <li><b>Raid :</b> un pion dans son couloir de couleur n'est pas à l'abri. Fais pile le nombre pour tomber dessus et tu peux l'attraper (ou simplement avancer). Ton pion reste alors dans ce couloir et recule d'une case à chaque <b>6</b> ou <b>1</b> ; le propriétaire du couloir peut l'y capturer.</li>
      <li>Rejoue après un <b>6</b>, une <b>capture</b> ou un pion <b>rentré</b>. Trois 6 d'affilée font perdre le tour.</li>
      <li>S'il n'y a qu'un seul coup possible, il se joue tout seul.</li>
    </ul>
    <h3>Le tournoi</h3>
    <ul>
      <li>Les joueurs sont répartis en tables de 4 maximum.</li>
      <li>Chaque table joue une manche. Les places rapportent <b>3, 2, 1, 0</b> points (à 2 : 3 et 0).</li>
      <li>Manches rapides (par défaut) : une table s'arrête quand son premier joueur a rentré tous ses pions ; les autres sont classés selon l'avancée de leurs pions.</li>
      <li>Quand toutes les tables ont fini, tout le monde est <b>replacé</b> pour affronter de nouveaux adversaires.</li>
      <li>Le premier au score visé à la fin d'une manche gagne. En cas d'égalité, celui qui a gagné le plus de tables.</li>
    </ul>
    <h3>Astuces</h3>
    <ul>
      <li>Ton coin est toujours affiché en bas à gauche. Touche « Tables » sur le côté pour regarder les autres.</li>
      <li>Ceux qui arrivent en cours de manche jouent dès la suivante. Les joueurs déconnectés ont le pilote auto.</li>
      <li>Clavier : <code>R</code>/<code>Espace</code> lancer · <code>1</code>–<code>4</code> avancer ce pion · <code>T</code> discussion.</li>
    </ul>`,
};

const DICTS = { en, fr };
export const LANGS = ['en', 'fr'];
export { DICTS };

// the language choice is shared by every game on this server
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
