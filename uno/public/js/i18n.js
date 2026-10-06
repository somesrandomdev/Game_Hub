// English / French translations.
// Values are strings with {placeholders} or functions of params (for plurals & grammar).
// HTML is only produced by a few keys (rules, log lines); callers escape names first.

const s = n => (n === 1 ? '' : 's');

const COLOR_EN = { red: 'red', yellow: 'yellow', green: 'green', blue: 'blue' };
const COLOR_FR = { red: 'rouge', yellow: 'jaune', green: 'vert', blue: 'bleu' };
const COLOR_FR_F = { red: 'rouge', yellow: 'jaune', green: 'verte', blue: 'bleue' };
const cap = str => str.charAt(0).toUpperCase() + str.slice(1);

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
  'lobby.inviteHint': 'On the same Wi-Fi or your hotspot, they open:',
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
  'confirm.leave': 'Tap again to leave',
  'confirm.end': 'Tap again: end for everyone',

  // ---------- table ----------
  'game.roundTarget': 'Round {n} · first to {target}',
  'game.roundSingle': 'Round {n} · winner takes all',
  'seat.pts': '· {n} pts',
  'seat.catch': 'Catch!',
  'seat.joinsNext': 'joins next round',
  'pile.left': '{n} left',
  'me.spectating': 'spectating',
  'me.you': '(you)',
  'me.meta': p => `<b>${p.n}</b> card${s(p.n)} · ${p.pts} pts`,
  'btn.uno': 'UNO!',
  'btn.unoDone': 'UNO ✓',
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
  'status.challenge': 'Wild Draw Four! Accept or challenge?',
  'status.stack': 'Stack a draw card or take {n}!',
  'status.drawnPass': 'Play the card you drew, or pass',
  'status.drawnForced': 'You must play the card you drew',
  'status.yourTurn': 'Your turn!',
  'status.noMatch': 'Your turn: no match, draw a card',
  'status.theirTurn': "{name}'s turn",
  'status.away': ' (away, autopilot)',

  // ---------- events ----------
  'ev.skipped': '⊘ Skipped',
  'ev.reverse': '⇄ Reverse!',
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
  'value.skip': 'Skip',
  'value.reverse': 'Reverse',
  'value.draw2': 'Draw Two',
  'value.wild': 'Wild',
  'value.wild4': 'Wild Draw Four',
  cardName: ({ color, value }) => {
    if (value === 'wild') return 'Wild';
    if (value === 'wild4') return 'Wild Draw Four';
    const v = { skip: 'Skip', reverse: 'Reverse', draw2: 'Draw Two' }[value] || value;
    return `${cap(COLOR_EN[color])} ${v}`;
  },

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
    <p>Match the top card by <b>color</b> or <b>number/symbol</b>, or play a <b>Wild</b>. Can't (or don't want to)? Draw a card. If it's playable you may play it right away. First to empty their hand wins the round and scores points for every card left in the other players' hands (numbers = face value, action cards = 20, wilds = 50).</p>
    <h3>⚡ Action cards</h3>
    <ul>
      <li><b>Skip</b>: the next player loses their turn.</li>
      <li><b>Reverse</b>: direction flips (with 2 players it acts like Skip).</li>
      <li><b>Draw Two</b>: the next player draws 2 and loses their turn.</li>
      <li><b>Wild</b>: choose the next color.</li>
      <li><b>Wild Draw Four</b>: choose the color, the next player draws 4 and loses their turn. It's only <i>legal</i> if you have no card of the current color. The victim may <b>challenge</b>: if you bluffed, you draw 4; if you were honest, they draw 6.</li>
    </ul>
    <h3>📣 UNO!</h3>
    <p>Hit <b>UNO!</b> when you're down to 2 cards (before playing) or right after you drop to 1. If you forget, anyone can hit <b>Catch!</b> on you before the next player acts, and you draw a penalty.</p>
    <h3>🏠 House rules (host picks in the lobby)</h3>
    <ul>
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
  'lobby.inviteHint': 'Sur le même Wi-Fi ou ton point d\'accès, ils ouvrent :',
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
  'confirm.leave': 'Appuie encore pour quitter',
  'confirm.end': 'Encore une fois : terminer pour tous',

  // ---------- table ----------
  'game.roundTarget': 'Manche {n} · premier à {target}',
  'game.roundSingle': 'Manche {n} · le gagnant rafle tout',
  'seat.pts': '· {n} pts',
  'seat.catch': 'Contre-UNO !',
  'seat.joinsNext': 'joue à la prochaine manche',
  'pile.left': '{n} restantes',
  'me.spectating': 'spectateur',
  'me.you': '(toi)',
  'me.meta': p => `<b>${p.n}</b> carte${s(p.n)} · ${p.pts} pts`,
  'btn.uno': 'UNO !',
  'btn.unoDone': 'UNO ✓',
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
  'status.challenge': 'Super Joker +4 ! Accepter ou contester ?',
  'status.stack': 'Cumule un +2/+4 ou prends {n} cartes !',
  'status.drawnPass': 'Joue la carte piochée ou passe',
  'status.drawnForced': 'Tu dois jouer la carte piochée',
  'status.yourTurn': 'À toi de jouer !',
  'status.noMatch': 'À toi : rien de jouable, pioche une carte',
  'status.theirTurn': 'Au tour de {name}',
  'status.away': ' (absent, pilote auto)',

  // ---------- événements ----------
  'ev.skipped': '⊘ Passe ton tour',
  'ev.reverse': '⇄ Inversion !',
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
  'value.skip': 'Passe ton tour',
  'value.reverse': 'Inversion',
  'value.draw2': '+2',
  'value.wild': 'Joker',
  'value.wild4': 'Super Joker +4',
  cardName: ({ color, value }) => {
    if (value === 'wild') return 'Joker';
    if (value === 'wild4') return 'Super Joker +4';
    if (value === 'skip') return `Passe ton tour ${COLOR_FR[color]}`;
    if (value === 'reverse') return `Inversion ${COLOR_FR_F[color]}`;
    if (value === 'draw2') return `+2 ${COLOR_FR[color]}`;
    return `${value} ${COLOR_FR[color]}`;
  },

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
  'err.unoTooMany': 'Tu ne peux dire UNO qu\'avec 2 cartes ou moins',
  'err.catchSelf': 'Tu ne peux pas te dénoncer toi-même : dis UNO !',
  'err.tooLate': 'Trop tard !',
  'err.hostOnly': 'Seul l\'hôte peut faire ça',
  'err.noGame': 'Aucune partie en cours',
  'err.rulesBetweenGames': 'Change les règles entre deux parties',
  'err.roomFull': 'La salle est pleine',
  'err.roomFullMax': 'Cette salle est pleine (10 joueurs max)',
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
    <p>Pose une carte de la même <b>couleur</b> ou du même <b>numéro/symbole</b> que celle du dessus, ou un <b>Joker</b>. Tu ne peux pas (ou tu ne veux pas) ? Pioche une carte : si elle est jouable, tu peux la poser tout de suite. Le premier à vider sa main gagne la manche et marque les points des cartes restant chez les autres (numéros = leur valeur, cartes action = 20, jokers = 50).</p>
    <h3>⚡ Cartes action</h3>
    <ul>
      <li><b>Passe ton tour</b> : le joueur suivant ne joue pas.</li>
      <li><b>Inversion</b> : le sens du jeu change (à 2 joueurs, ça fait comme « Passe ton tour »).</li>
      <li><b>+2</b> : le joueur suivant pioche 2 cartes et passe son tour.</li>
      <li><b>Joker</b> : tu choisis la couleur suivante.</li>
      <li><b>Super Joker +4</b> : tu choisis la couleur, le joueur suivant pioche 4 cartes et passe son tour. Il n'est <i>légal</i> que si tu n'as aucune carte de la couleur en cours. La victime peut <b>contester</b> : si tu as bluffé, c'est toi qui pioches 4 ; si tu étais honnête, elle pioche 6.</li>
    </ul>
    <h3>📣 UNO !</h3>
    <p>Appuie sur <b>UNO !</b> quand il te reste 2 cartes (avant de jouer) ou juste après être passé à 1. Si tu oublies, n'importe qui peut appuyer sur <b>Contre-UNO !</b> avant que le joueur suivant ne joue, et tu pioches une pénalité.</p>
    <h3>🏠 Règles maison (l'hôte choisit dans le salon)</h3>
    <ul>
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
