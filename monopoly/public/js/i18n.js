// English / French translations.
// Values are strings with {placeholders} or functions of params (for plurals & grammar).
// HTML is only produced by a few keys (rules, log lines); callers escape names first.
// Street names follow each country's board: Atlantic City in English, Paris in French.

const s = n => (n === 1 ? '' : 's');

const SQ_EN = [
  'GO', 'Mediterranean Avenue', 'Community Chest', 'Baltic Avenue', 'Income Tax', 'Reading Railroad', 'Oriental Avenue', 'Chance', 'Vermont Avenue', 'Connecticut Avenue',
  'Jail', 'St. Charles Place', 'Electric Company', 'States Avenue', 'Virginia Avenue', 'Pennsylvania Railroad', 'St. James Place', 'Community Chest', 'Tennessee Avenue', 'New York Avenue',
  'Free Parking', 'Kentucky Avenue', 'Chance', 'Indiana Avenue', 'Illinois Avenue', 'B&O Railroad', 'Atlantic Avenue', 'Ventnor Avenue', 'Water Works', 'Marvin Gardens',
  'Go to Jail', 'Pacific Avenue', 'North Carolina Avenue', 'Community Chest', 'Pennsylvania Avenue', 'Short Line', 'Chance', 'Park Place', 'Luxury Tax', 'Boardwalk',
];
const SQ_FR = [
  'Départ', 'Boulevard de Belleville', 'Caisse de communauté', 'Rue Lecourbe', 'Impôts sur le revenu', 'Gare Montparnasse', 'Rue de Vaugirard', 'Chance', 'Rue de Courcelles', 'Avenue de la République',
  'Prison', 'Boulevard de la Villette', 'Compagnie d\'électricité', 'Avenue de Neuilly', 'Rue de Paradis', 'Gare de Lyon', 'Avenue Mozart', 'Caisse de communauté', 'Boulevard Saint-Michel', 'Place Pigalle',
  'Parc gratuit', 'Avenue Matignon', 'Chance', 'Boulevard Malesherbes', 'Avenue Henri-Martin', 'Gare du Nord', 'Faubourg Saint-Honoré', 'Place de la Bourse', 'Compagnie des eaux', 'Rue La Fayette',
  'Allez en prison', 'Avenue de Breteuil', 'Avenue Foch', 'Caisse de communauté', 'Boulevard des Capucines', 'Gare Saint-Lazare', 'Chance', 'Avenue des Champs-Élysées', 'Taxe de luxe', 'Rue de la Paix',
];

const CHANCE_EN = [
  'Advance to Boardwalk.',
  'Advance to GO. Collect $200.',
  'Advance to Illinois Avenue. If you pass GO, collect $200.',
  'Advance to St. Charles Place. If you pass GO, collect $200.',
  'Advance to the nearest Railroad. If it\'s owned, pay the owner twice the rent.',
  'Advance to the nearest Railroad. If it\'s owned, pay the owner twice the rent.',
  'Advance to the nearest Utility. If it\'s owned, roll the dice and pay the owner ten times the throw.',
  'Bank pays you a dividend of $50.',
  'Get Out of Jail Free. Keep this card until you need it or trade it.',
  'Go back 3 spaces.',
  'Go to Jail. Go directly to Jail, do not pass GO, do not collect $200.',
  'Make general repairs on all your property: $25 per house, $100 per hotel.',
  'Speeding fine: pay $15.',
  'Take a trip to Reading Railroad. If you pass GO, collect $200.',
  'You have been elected Chairman of the Board. Pay each player $50.',
  'Your building loan matures. Collect $150.',
];
const CHEST_EN = [
  'Advance to GO. Collect $200.',
  'Bank error in your favor. Collect $200.',
  'Doctor\'s fee. Pay $50.',
  'From sale of stock you get $50.',
  'Get Out of Jail Free. Keep this card until you need it or trade it.',
  'Go to Jail. Go directly to Jail, do not pass GO, do not collect $200.',
  'Holiday fund matures. Receive $100.',
  'Income tax refund. Collect $20.',
  'It\'s your birthday. Collect $10 from every player.',
  'Life insurance matures. Collect $100.',
  'Pay hospital fees of $100.',
  'Pay school fees of $50.',
  'Receive a $25 consultancy fee.',
  'You are assessed for street repairs: $40 per house, $115 per hotel.',
  'You have won second prize in a beauty contest. Collect $10.',
  'You inherit $100.',
];
const CHANCE_FR = [
  'Rendez-vous Rue de la Paix.',
  'Avancez jusqu\'à la case Départ. Recevez 200 €.',
  'Rendez-vous Avenue Henri-Martin. Si vous passez par la case Départ, recevez 200 €.',
  'Rendez-vous Boulevard de la Villette. Si vous passez par la case Départ, recevez 200 €.',
  'Avancez jusqu\'à la gare la plus proche. Si elle a un propriétaire, payez-lui le double du loyer.',
  'Avancez jusqu\'à la gare la plus proche. Si elle a un propriétaire, payez-lui le double du loyer.',
  'Avancez jusqu\'à la compagnie la plus proche. Si elle a un propriétaire, lancez les dés et payez-lui dix fois le résultat.',
  'La banque vous verse un dividende de 50 €.',
  'Vous êtes libéré de prison. Gardez cette carte jusqu\'à ce qu\'elle serve, ou échangez-la.',
  'Reculez de trois cases.',
  'Allez en prison. Allez directement en prison, ne passez pas par la case Départ, ne recevez pas 200 €.',
  'Faites des réparations dans toutes vos propriétés : 25 € par maison, 100 € par hôtel.',
  'Amende pour excès de vitesse : 15 €.',
  'Allez à la Gare Montparnasse. Si vous passez par la case Départ, recevez 200 €.',
  'Vous êtes élu président du conseil d\'administration. Versez 50 € à chaque joueur.',
  'Votre prêt immobilier vous rapporte 150 €.',
];
const CHEST_FR = [
  'Avancez jusqu\'à la case Départ. Recevez 200 €.',
  'Erreur de la banque en votre faveur. Recevez 200 €.',
  'Payez la note du médecin : 50 €.',
  'La vente de votre stock vous rapporte 50 €.',
  'Vous êtes libéré de prison. Gardez cette carte jusqu\'à ce qu\'elle serve, ou échangez-la.',
  'Allez en prison. Allez directement en prison, ne passez pas par la case Départ, ne recevez pas 200 €.',
  'Votre épargne de vacances vous rapporte 100 €.',
  'Les impôts vous remboursent 20 €.',
  'C\'est votre anniversaire : chaque joueur vous donne 10 €.',
  'Votre assurance-vie vous rapporte 100 €.',
  'Payez l\'hôpital : 100 €.',
  'Payez les frais de scolarité : 50 €.',
  'Recevez 25 € d\'honoraires.',
  'Vous êtes imposé pour des réparations de voirie : 40 € par maison, 115 € par hôtel.',
  'Vous avez gagné le deuxième prix de beauté. Recevez 10 €.',
  'Vous héritez de 100 €.',
];

const listKeys = (prefix, list) => Object.fromEntries(list.map((v, i) => [`${prefix}.${i}`, v]));

const en = {
  'title.page': 'Monopoly Night',
  'title.yourTurn': '🎲 Your turn! · Monopoly',
  'title.language': 'Language',
  'title.rules': 'Rules',
  'title.sound': 'Sound',
  'title.chat': 'Chat',
  'title.menu': 'Menu',
  'title.trade': 'Propose a trade',
  you: 'You',
  someone: 'Someone',
  theHost: 'the host',
  theBank: 'the bank',
  thePot: 'the Free Parking pot',
  worth: 'worth {amount}',

  // ---------- static page ----------
  'home.tagline': 'Buy streets, build hotels, bankrupt your friends. Same Wi-Fi or hotspot, no internet needed.',
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
  'game.room': 'Room',
  'lobby.players': 'Players',
  'lobby.addBot': '+ Add bot',
  'lobby.rules': 'Rules',
  'lobby.invite': 'Invite friends',
  'lobby.scan': 'Scan to join this room',
  'lobby.inviteHint': 'On the same Wi-Fi or hotspot, friends open:',
  'lobby.orCode': 'Or they type the room code',
  'lobby.startGame': 'Start game',
  'lobby.youPick': 'you pick',
  'lobby.hostPicks': 'host picks',
  'lobby.needPlayers': 'Need 2 players (add a bot!)',
  'lobby.start': p => `Start game · ${p.n} players`,
  'lobby.hint': 'Everyone starts on GO. Bots fill in for anyone who drops.',
  'lobby.waiting': p => `Waiting for ${p.name} to start…`,
  'lobby.remove': p => `Remove ${p.name}`,
  'tag.host': 'HOST',
  'tag.you': 'YOU',
  'tag.bot': 'BOT',
  'tag.away': 'away',
  'tag.jail': 'In jail',
  'tag.jailCard': 'Get Out of Jail Free card',
  'tag.bankrupt': 'bankrupt',

  'set.timeLimit': 'Time limit',
  'set.timeLimit.hint': 'When time runs out, the richest player wins',
  'set.startCash': 'Starting cash',
  'set.dealProps': 'Quick start',
  'set.dealProps.hint': 'Deal random properties to everyone at the start',
  'set.turnTimer': 'Turn timer',
  'set.turnTimer.hint': 'Autopilot plays for whoever takes too long',
  'set.auctions': 'Auctions',
  'set.auctions.hint': 'A property nobody buys goes to the highest bidder',
  'set.freeParking': 'Free Parking jackpot',
  'set.freeParking.hint': 'Taxes and fines pile up; landing on Free Parking takes them',
  'set.doubleGo': 'Double on GO',
  'set.doubleGo.hint': 'Landing right on GO pays $400',
  'opt.noLimit': 'No limit',
  'opt.minutes': '{n} min',
  'opt.none': 'Off',
  'opt.props': '{n} each',
  'opt.off': 'Off',
  'opt.seconds': '{n} s',

  'board.collect': 'Collect {amount} salary as you pass',
  'board.inJail': 'IN JAIL',
  'board.visiting': 'JUST VISITING',
  'deck.chance': 'Chance',
  'deck.chest': 'Community Chest',

  'turn.yours': 'Your turn',
  'turn.theirs': '{name}\'s turn',
  'turn.over': 'Game over',
  'status.yourRoll': 'Roll the dice!',
  'status.jailChoice': p => `You're in jail (try ${p.n} of 3): roll doubles, pay, or use a card`,
  'status.youLanded': 'You landed on {square}. Buy it?',
  'status.youDone': 'Build, trade or mortgage, then end your turn',
  'status.deciding': '{name} is thinking about {square}',
  'status.rolling': '{name} is rolling…',
  'status.finishing': '{name} is finishing their turn…',
  'status.auction': 'Auction for {square}!',
  'status.youOwe': 'You owe {amount} to {to}',
  'status.owes': '{name} owes {amount} to {to}…',
  'status.winner': '{name} wins!',
  'clock.left': '⏱ {time} left',
  'clock.lastTurn': '⏱ last turn!',
  'clock.noLimit': 'No time limit',

  'btn.roll': '🎲 Roll',
  'btn.rollDoubles': '🎲 Roll for doubles',
  'btn.payJail': 'Pay {amount}',
  'btn.useCard': '🎫 Use card',
  'btn.buy': 'Buy · {amount}',
  'btn.auction': 'Auction it',
  'btn.skip': 'Don\'t buy',
  'btn.deed': 'Card',
  'btn.endTurn': 'End turn',
  'btn.pay': 'Pay {amount}',
  'btn.bankrupt': 'Declare bankruptcy',
  'btn.openAuction': '🔨 Bid',
  'btn.results': '🏆 Results',
  'btn.cancelOffer': 'Withdraw offer to {name}',
  'btn.seeOffer': '🤝 {name} offers a trade',
  'btn.copy': 'Copy',
  'hint.raise': 'Not enough cash: mortgage something first, or auction it',
  'hint.debt': 'Tap your properties to sell houses or mortgage, then pay.',
  'hint.debtHopeless': 'Even selling everything won\'t cover it.',
  'hint.payFirst': 'Pay what you owe first',
  'bubble.doubles': 'Doubles!',
  'bubble.jail': '🚓 Jail!',
  'bubble.speeding': '3 doubles: speeding!',
  'bubble.free': 'Free!',

  'side.myProps': 'Your properties',
  'side.noProps': 'Nothing yet. Land on a free property to buy it.',
  'side.watching': 'You\'re watching this game. You\'ll play the next one.',
  'side.noPropsThem': 'No properties.',
  'side.canBuild': 'full set: build!',
  'side.allOf': 'full set',
  'side.trading': '{a} ⇄ {b}',

  'deed.title': 'TITLE DEED',
  'deed.titlePlain': 'DEED',
  'deed.rent': 'Rent',
  'deed.withSet': 'Rent with the full color set',
  'deed.withHouses': p => `With ${p.n} house${s(p.n)}`,
  'deed.withHotel': 'With a hotel',
  'deed.houseCost': 'Houses cost',
  'deed.rails': p => `Rent with ${p.n} railroad${s(p.n)} owned`,
  'deed.util1': 'One utility owned: rent is 4× the dice.',
  'deed.util2': 'Both owned: rent is 10× the dice.',
  'deed.mortgage': 'Mortgage value',
  'deed.ownedBy': 'Owned by {name}',
  'deed.forSale': 'For sale · {amount}',
  'deed.mortgaged': 'mortgaged',
  'deed.mortgagedShort': 'M',
  'deed.build': '🏠 Build a house · {amount}',
  'deed.buildHotel': '🏨 Build a hotel · {amount}',
  'deed.sell': 'Sell a building · +{amount}',
  'deed.doMortgage': 'Mortgage · +{amount}',
  'deed.unmortgage': 'Pay off mortgage · {amount}',

  'auction.title': '🔨 Auction',
  'auction.high': 'Top bid: {amount} by {name}',
  'auction.noBids': 'No bids yet',
  'auction.yourCash': 'You have {amount}',
  'auction.custom': 'Your bid',
  'auction.bid': 'Bid',
  'auction.pass': 'Drop out',
  'auction.hide': 'Hide',
  'auction.youreOut': 'You dropped out of this auction.',
  'auction.watching': 'You\'re watching this auction.',
  'auction.outList': 'Out:',

  'trade.title': '🤝 Trade',
  'trade.with': 'Trade with {name}',
  'trade.youGive': 'You give',
  'trade.theyGive': '{name} gives',
  'trade.cash': 'Cash',
  'trade.cards': 'Jail cards',
  'trade.cardsN': p => `${p.n} Get Out of Jail Free card${s(p.n)}`,
  'trade.noProps': 'No properties to trade.',
  'trade.nothing': 'Nothing',
  'trade.send': 'Send offer',
  'offer.title': '{name} offers you a trade',
  'offer.youGet': 'You get',
  'offer.youGive': 'You give',
  'offer.accept': 'Accept',
  'offer.decline': 'Decline',

  'results.youWin': '🏆 You win!',
  'results.wins': '🏆 {name} wins!',
  'results.byTime': 'Time\'s up: ranked by total worth (cash, property, buildings).',
  'results.byBankrupt': 'Last one standing. Everyone else went bankrupt.',
  'results.again': 'Play again',
  'results.lobby': 'Back to lobby',
  'results.waitHost': 'Waiting for {name}…',

  'menu.title': 'Menu',
  'menu.rules': 'How to play',
  'menu.sound': p => `Sound: ${p.on ? 'on' : 'off'}`,
  'menu.fullscreen': 'Fullscreen',
  'menu.end': 'End game (back to lobby)',
  'menu.leave': 'Leave room',
  'modal.close': 'Close',
  'modal.cancel': 'Cancel',
  'rules.title': 'How to play Monopoly',
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
  'confirm.bankrupt': 'Give up everything? Tap again',

  'addr.online': '🌍 Online link',
  'addr.onlineWait': '🌍 Opening the online link…',
  'addr.none': 'No network found: connect to Wi-Fi or turn on Mobile Hotspot.',
  'addr.weak': 'may not work',
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
  'toast.debt': 'You owe {amount}: sell or mortgage to pay it',
  'toast.bankrupt': '{name} went bankrupt!',
  'toast.tradeDone': 'Trade done: {a} ⇄ {b}',
  'toast.tradeDeclined': '{name} declined your offer',
  'toast.offerSent': 'Offer sent to {name}',
  'toast.timeout': 'Time\'s up: autopilot played for you',
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

  // ---------- game log ----------
  'ev.start': '🎲 The game begins. {name} goes first.',
  'ev.dealt': '{name} was dealt {square}',
  'ev.turn': p => (p.me ? '— Your turn —' : `— ${p.name}'s turn —`),
  'ev.roll': p => `${p.name} rolled ${p.dice} = ${p.total}`,
  'ev.move': '{name} moved to {to}',
  'explain.watching': 'You\'re watching. Tap any square to read its card.',
  'explain.wait': 'Waiting for {name}. Meanwhile you can tap squares to read them, or propose a 🤝 trade.',
  'explain.auction': 'Nobody bought it, so everyone bids. Highest bid when the clock runs out wins it.',
  'explain.roll': 'Roll the two dice: your token moves that many squares, clockwise.',
  'explain.doubles': 'You rolled doubles, so you play again! Roll once more.',
  'explain.jail': 'Roll doubles to get out for free, or pay $50 (or use a card) and roll normally. After 3 failed tries you pay anyway.',
  'explain.buy.street': 'Nobody owns {square} yet. Buy it for {price}: from then on, anyone who lands here pays you rent (from {rent}, a lot more with houses).',
  'explain.buy.rail': 'Nobody owns {square} yet. Buy it for {price}: anyone who lands here pays you {rent}, more for each railroad you own.',
  'explain.buy.util': 'Nobody owns {square} yet. Buy it for {price}: anyone who lands here pays you 4× their dice roll.',
  'explain.orAuction': 'If you don\'t buy it, it goes to auction and everyone (you too) can bid.',
  'explain.orSkip': 'Or leave it for someone else.',
  'explain.done': 'Your move is done. Tap End turn. (You can also tap your properties to mortgage, or 🤝 trade first.)',
  'explain.doneBuild': 'You own a full color set! Tap one of its streets (below or on the board) to build houses, then End turn.',
  'where.jail': 'in jail',
  'toast.paidRent': 'You paid {amount} rent to {name} for landing on {square}',
  'toast.gotRent': '{name} paid you {amount} rent for {square} 🎉',
  'intro.title': 'Monopoly in 30 seconds',
  'intro.you': 'This is you on the board. Your square is outlined in your color.',
  'intro.go': 'Let\'s play!',
  'intro.more': 'Full rules',
  'intro.steps': `
    <li><b>🎲 Roll</b> on your turn. Your token moves around the board, clockwise. Passing <b>GO</b> pays you $200.</li>
    <li><b>🏠 Free property?</b> Buy it. Then every player who lands on it pays <b>you</b> rent.</li>
    <li><b>💸 Someone else's?</b> You pay them rent. That's how people go broke.</li>
    <li><b>🏗️ Own a whole color</b> (all streets of one color)? Tap them to build houses: rents go way up.</li>
    <li><b>🏆 Win</b> by being the last one with money, or the richest when the timer at the top runs out.</li>
    <li>The middle of the board always says what just happened and what you can do. Tap any square to read it.</li>`,
  'ev.collect': p => `${p.name} collected ${p.amount}${p.reason === 'go' ? ' for passing GO' : p.reason === 'parking' ? ' from Free Parking' : ''}`,
  'ev.buy': '{name} bought {square} for {amount}',
  'ev.decline': '{name} passed on {square}',
  'ev.rent': '{name} pays {amount} rent to {owner} for {square}',
  'ev.tax': '{name} pays {amount} for {square}',
  'ev.card': '{deck}: <i>{card}</i>',
  'ev.jail': '🚓 {name} went to jail',
  'ev.jailFree': p => `${p.name} got out of jail${p.how === 'doubles' ? ' with doubles' : p.how === 'card' ? ' with a card' : ' by paying'}`,
  'ev.jailStay': p => `${p.name} stays in jail (try ${p.tries} of 3)`,
  'ev.speeding': 'Three doubles in a row: {name} is caught speeding!',
  'ev.auction': '🔨 {square} goes up for auction',
  'ev.bid': '{name} bids {amount}',
  'ev.auctionPass': '{name} drops out',
  'ev.auctionWon': '🔨 {name} wins {square} for {amount}',
  'ev.auctionNone': 'Nobody bid: {square} stays with the bank',
  'ev.build': p => `${p.name} built ${p.houses === 5 ? 'a hotel' : 'a house'} on ${p.square}`,
  'ev.sell': '{name} sold a building on {square} for {amount}',
  'ev.mortgage': '{name} mortgaged {square} for {amount}',
  'ev.unmortgage': '{name} paid off the mortgage on {square}',
  'ev.debt': '{name} owes {amount} and must raise the money',
  'ev.paid': '{name} paid {amount} to {to}',
  'ev.bankrupt': p => `💀 ${p.name} is bankrupt${p.heir ? `: everything goes to ${p.to}` : ''}`,
  'ev.tradeOffer': '🤝 {name} offers {target} a trade',
  'ev.tradeDone': '🤝 {name} and {target} made a trade',
  'ev.tradeDeclined': '{name} declined the trade',
  'ev.tradeCancelled': '{name} withdrew the offer',
  'ev.tradeFailed': 'The trade between {name} and {target} fell through',
  'ev.timeout': '⏱ {name} ran out of time',
  'ev.gameOver': '🏆 Game over!',

  // ---------- server system messages ----------
  'sys.created': '{name} created the room',
  'sys.joined': p => `${p.name} joined${p.waiting ? ' (they\'ll play the next game)' : ''}`,
  'sys.botJoined': p => `${p.name} 🤖 joined${p.waiting ? ' (next game)' : ''}`,
  'sys.removed': '{name} was removed',
  'sys.left': '{name} left',
  'sys.connected': '{name} connected',
  'sys.newHost': '{name} is now the host',
  'sys.lobby': 'Back to the lobby',
  'sys.monoOn': p => (p.minutes ? `Game on! ${p.minutes} minutes, then the richest player wins.` : 'Game on! Last one standing wins.'),

  'err.connection': 'Can\'t reach the server',
  'err.requestFailed': 'Request failed ({status})',
  // rules the client checks itself before asking the server
  'err.needGroup': 'You need the whole color group to build',
  'err.groupMortgaged': 'Pay off the mortgages in this group first',
  'err.maxBuilt': 'This street already has a hotel',
  'err.buildEvenly': 'Build evenly: the other streets of this group first',
  'err.sellEvenly': 'Sell evenly: the other streets of this group first',
  'err.cantAfford': 'Not enough cash',
  'err.auctionRunning': 'Wait for the auction to finish',
  'err.sellBuildingsFirst': 'Sell the buildings in this color group first',
  'err.tradeBusy': 'Another trade is waiting for an answer',
  'err.noHousesLeft': 'The bank is out of houses',
  'err.noHotelsLeft': 'The bank is out of hotels',

  'rules.html': `
    <h3>Goal</h3>
    <p>Be the last player who isn't bankrupt, or the richest one when the time limit runs out (cash + property + buildings).</p>
    <h3>Your turn</h3>
    <ul>
      <li><b>Roll</b> and move. Passing <b>GO</b> pays $200.</li>
      <li>Land on a free property: <b>buy</b> it, or let it go to <b>auction</b> where everyone bids (you too).</li>
      <li>Land on someone's property: pay <b>rent</b>. Owning a whole color set doubles the rent on empty lots.</li>
      <li><b>Doubles</b> roll again. Three doubles in a row send you to jail.</li>
      <li>Chance and Community Chest cards do what they say.</li>
    </ul>
    <h3>Jail</h3>
    <p>Pay $50, use a Get Out of Jail Free card, or try to roll doubles. After 3 misses you pay $50 and move.</p>
    <h3>Building</h3>
    <ul>
      <li>Own a whole color set to build houses. Build <b>evenly</b>: one house on each before a second on any.</li>
      <li>Four houses become a <b>hotel</b>. The bank only has 32 houses and 12 hotels.</li>
      <li>Tap any square on the board, or one of your properties, to see its card and build, sell or mortgage.</li>
    </ul>
    <h3>Money trouble</h3>
    <p>Can't pay? Sell buildings (half price) or <b>mortgage</b> properties (half their price, no rent while mortgaged, +10% to pay it back). If you still can't pay, you're bankrupt: what you own goes to whoever you owed.</p>
    <h3>Trades</h3>
    <p>Tap 🤝 or a player to offer property, cash and jail cards. They accept or decline.</p>
    <h3>Online & bots</h3>
    <ul>
      <li>Bots fill seats and buy, bid, build and trade on their own.</li>
      <li>If someone disconnects, the autopilot plays for them after 10 s. Reopen the page to take your seat back.</li>
      <li>Keyboard: <code>R</code>/<code>Space</code> roll · <code>B</code> buy · <code>A</code> auction · <code>E</code> end turn · <code>T</code> chat.</li>
    </ul>`,

  ...listKeys('sq', SQ_EN),
  ...listKeys('chance', CHANCE_EN),
  ...listKeys('chest', CHEST_EN),
};

const fr = {
  'title.page': 'Monopoly Night',
  'title.yourTurn': '🎲 À toi ! · Monopoly',
  'title.language': 'Langue',
  'title.rules': 'Règles',
  'title.sound': 'Son',
  'title.chat': 'Discussion',
  'title.menu': 'Menu',
  'title.trade': 'Proposer un échange',
  you: 'Toi',
  someone: 'Quelqu\'un',
  theHost: 'l\'hôte',
  theBank: 'la banque',
  thePot: 'la cagnotte du Parc gratuit',
  worth: 'vaut {amount}',

  'home.tagline': 'Achète des rues, construis des hôtels, ruine tes amis. Même Wi-Fi ou partage de connexion, sans internet.',
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
  'game.room': 'Salle',
  'lobby.players': 'Joueurs',
  'lobby.addBot': '+ Ajouter un bot',
  'lobby.rules': 'Règles',
  'lobby.invite': 'Inviter des amis',
  'lobby.scan': 'Scanne pour rejoindre la salle',
  'lobby.inviteHint': 'Sur le même Wi-Fi ou partage de connexion, ouvrez :',
  'lobby.orCode': 'Ou tapez le code de la salle',
  'lobby.startGame': 'Lancer la partie',
  'lobby.youPick': 'tu choisis',
  'lobby.hostPicks': 'l\'hôte choisit',
  'lobby.needPlayers': 'Il faut 2 joueurs (ajoute un bot !)',
  'lobby.start': p => `Lancer · ${p.n} joueurs`,
  'lobby.hint': 'Tout le monde part de la case Départ. Les bots remplacent ceux qui se déconnectent.',
  'lobby.waiting': p => `En attente de ${p.name} pour lancer…`,
  'lobby.remove': p => `Retirer ${p.name}`,
  'tag.host': 'HÔTE',
  'tag.you': 'TOI',
  'tag.bot': 'BOT',
  'tag.away': 'absent',
  'tag.jail': 'En prison',
  'tag.jailCard': 'Carte « Libéré de prison »',
  'tag.bankrupt': 'en faillite',

  'set.timeLimit': 'Durée',
  'set.timeLimit.hint': 'À la fin du temps, le plus riche gagne',
  'set.startCash': 'Argent de départ',
  'set.dealProps': 'Départ rapide',
  'set.dealProps.hint': 'Distribue des propriétés au hasard à chacun au départ',
  'set.turnTimer': 'Chrono par tour',
  'set.turnTimer.hint': 'Le pilote auto joue pour celui qui traîne',
  'set.auctions': 'Enchères',
  'set.auctions.hint': 'Une propriété que personne n\'achète va au plus offrant',
  'set.freeParking': 'Cagnotte du Parc gratuit',
  'set.freeParking.hint': 'Taxes et amendes s\'accumulent ; le Parc gratuit les rafle',
  'set.doubleGo': 'Double sur Départ',
  'set.doubleGo.hint': 'S\'arrêter pile sur Départ rapporte 400 €',
  'opt.noLimit': 'Sans limite',
  'opt.minutes': '{n} min',
  'opt.none': 'Non',
  'opt.props': '{n} chacun',
  'opt.off': 'Non',
  'opt.seconds': '{n} s',

  'board.collect': 'Recevez {amount} en passant',
  'board.inJail': 'PRISON',
  'board.visiting': 'SIMPLE VISITE',
  'deck.chance': 'Chance',
  'deck.chest': 'Caisse de communauté',

  'turn.yours': 'À toi',
  'turn.theirs': 'Tour de {name}',
  'turn.over': 'Partie terminée',
  'status.yourRoll': 'Lance les dés !',
  'status.jailChoice': p => `Tu es en prison (essai ${p.n} sur 3) : fais un double, paie ou utilise une carte`,
  'status.youLanded': 'Tu es sur {square}. Tu l\'achètes ?',
  'status.youDone': 'Construis, échange ou hypothèque, puis finis ton tour',
  'status.deciding': '{name} réfléchit à {square}',
  'status.rolling': '{name} lance les dés…',
  'status.finishing': '{name} finit son tour…',
  'status.auction': 'Enchères pour {square} !',
  'status.youOwe': 'Tu dois {amount} à {to}',
  'status.owes': '{name} doit {amount} à {to}…',
  'status.winner': '{name} gagne !',
  'clock.left': '⏱ encore {time}',
  'clock.lastTurn': '⏱ dernier tour !',
  'clock.noLimit': 'Sans limite de temps',

  'btn.roll': '🎲 Lancer',
  'btn.rollDoubles': '🎲 Tenter un double',
  'btn.payJail': 'Payer {amount}',
  'btn.useCard': '🎫 Utiliser la carte',
  'btn.buy': 'Acheter · {amount}',
  'btn.auction': 'Mettre aux enchères',
  'btn.skip': 'Ne pas acheter',
  'btn.deed': 'Carte',
  'btn.endTurn': 'Finir le tour',
  'btn.pay': 'Payer {amount}',
  'btn.bankrupt': 'Déclarer faillite',
  'btn.openAuction': '🔨 Enchérir',
  'btn.results': '🏆 Résultats',
  'btn.cancelOffer': 'Retirer l\'offre à {name}',
  'btn.seeOffer': '🤝 {name} propose un échange',
  'btn.copy': 'Copier',
  'hint.raise': 'Pas assez d\'argent : hypothèque d\'abord, ou mets aux enchères',
  'hint.debt': 'Touche tes propriétés pour vendre des maisons ou hypothéquer, puis paie.',
  'hint.debtHopeless': 'Même en vendant tout, ça ne suffira pas.',
  'hint.payFirst': 'Paie d\'abord ce que tu dois',
  'bubble.doubles': 'Double !',
  'bubble.jail': '🚓 Prison !',
  'bubble.speeding': '3 doubles : excès de vitesse !',
  'bubble.free': 'Libre !',

  'side.myProps': 'Tes propriétés',
  'side.noProps': 'Rien pour l\'instant. Arrête-toi sur une propriété libre pour l\'acheter.',
  'side.watching': 'Tu regardes cette partie. Tu joueras la suivante.',
  'side.noPropsThem': 'Aucune propriété.',
  'side.canBuild': 'groupe complet : construis !',
  'side.allOf': 'groupe complet',
  'side.trading': '{a} ⇄ {b}',

  'deed.title': 'TITRE DE PROPRIÉTÉ',
  'deed.titlePlain': 'TITRE',
  'deed.rent': 'Loyer',
  'deed.withSet': 'Loyer avec le groupe complet',
  'deed.withHouses': p => `Avec ${p.n} maison${s(p.n)}`,
  'deed.withHotel': 'Avec un hôtel',
  'deed.houseCost': 'Prix d\'une maison',
  'deed.rails': p => `Loyer avec ${p.n} gare${s(p.n)}`,
  'deed.util1': 'Une compagnie : loyer = 4 × les dés.',
  'deed.util2': 'Les deux : loyer = 10 × les dés.',
  'deed.mortgage': 'Valeur hypothécaire',
  'deed.ownedBy': 'À {name}',
  'deed.forSale': 'À vendre · {amount}',
  'deed.mortgaged': 'hypothéquée',
  'deed.mortgagedShort': 'H',
  'deed.build': '🏠 Construire une maison · {amount}',
  'deed.buildHotel': '🏨 Construire un hôtel · {amount}',
  'deed.sell': 'Vendre un bâtiment · +{amount}',
  'deed.doMortgage': 'Hypothéquer · +{amount}',
  'deed.unmortgage': 'Lever l\'hypothèque · {amount}',

  'auction.title': '🔨 Enchères',
  'auction.high': 'Meilleure offre : {amount} par {name}',
  'auction.noBids': 'Pas encore d\'offre',
  'auction.yourCash': 'Tu as {amount}',
  'auction.custom': 'Ton offre',
  'auction.bid': 'Enchérir',
  'auction.pass': 'Abandonner',
  'auction.hide': 'Masquer',
  'auction.youreOut': 'Tu as abandonné ces enchères.',
  'auction.watching': 'Tu regardes ces enchères.',
  'auction.outList': 'Sortis :',

  'trade.title': '🤝 Échange',
  'trade.with': 'Échanger avec {name}',
  'trade.youGive': 'Tu donnes',
  'trade.theyGive': '{name} donne',
  'trade.cash': 'Argent',
  'trade.cards': 'Cartes prison',
  'trade.cardsN': p => `${p.n} carte${s(p.n)} « Libéré de prison »`,
  'trade.noProps': 'Aucune propriété à échanger.',
  'trade.nothing': 'Rien',
  'trade.send': 'Envoyer l\'offre',
  'offer.title': '{name} te propose un échange',
  'offer.youGet': 'Tu reçois',
  'offer.youGive': 'Tu donnes',
  'offer.accept': 'Accepter',
  'offer.decline': 'Refuser',

  'results.youWin': '🏆 Tu as gagné !',
  'results.wins': '🏆 {name} gagne !',
  'results.byTime': 'Temps écoulé : classement par fortune totale (argent, propriétés, bâtiments).',
  'results.byBankrupt': 'Dernier debout. Tous les autres ont fait faillite.',
  'results.again': 'Rejouer',
  'results.lobby': 'Retour au salon',
  'results.waitHost': 'En attente de {name}…',

  'menu.title': 'Menu',
  'menu.rules': 'Comment jouer',
  'menu.sound': p => `Son : ${p.on ? 'activé' : 'coupé'}`,
  'menu.fullscreen': 'Plein écran',
  'menu.end': 'Arrêter la partie (retour au salon)',
  'menu.leave': 'Quitter la salle',
  'modal.close': 'Fermer',
  'modal.cancel': 'Annuler',
  'rules.title': 'Comment jouer au Monopoly',
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
  'confirm.bankrupt': 'Tout abandonner ? Touche encore',

  'addr.online': '🌍 Lien en ligne',
  'addr.onlineWait': '🌍 Ouverture du lien en ligne…',
  'addr.none': 'Aucun réseau : connecte-toi au Wi-Fi ou active le point d\'accès mobile.',
  'addr.weak': 'peut ne pas marcher',
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
  'toast.debt': 'Tu dois {amount} : vends ou hypothèque pour payer',
  'toast.bankrupt': '{name} fait faillite !',
  'toast.tradeDone': 'Échange conclu : {a} ⇄ {b}',
  'toast.tradeDeclined': '{name} a refusé ton offre',
  'toast.offerSent': 'Offre envoyée à {name}',
  'toast.timeout': 'Temps écoulé : le pilote auto a joué pour toi',
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

  'ev.start': '🎲 La partie commence. {name} joue en premier.',
  'ev.dealt': '{name} reçoit {square}',
  'ev.turn': p => (p.me ? '— À toi —' : `— Tour de ${p.name} —`),
  'ev.roll': p => `${p.name} fait ${p.dice} = ${p.total}`,
  'ev.move': '{name} va sur {to}',
  'explain.watching': 'Tu regardes. Touche une case pour lire sa carte.',
  'explain.wait': 'On attend {name}. En attendant, touche les cases pour les lire, ou propose un 🤝 échange.',
  'explain.auction': 'Personne ne l\'a achetée, donc tout le monde enchérit. La meilleure offre quand le chrono finit l\'emporte.',
  'explain.roll': 'Lance les deux dés : ton pion avance d\'autant de cases, dans le sens des aiguilles d\'une montre.',
  'explain.doubles': 'Tu as fait un double : tu rejoues ! Relance.',
  'explain.jail': 'Fais un double pour sortir gratuitement, ou paie 50 € (ou utilise une carte) et lance normalement. Après 3 essais ratés, tu paies quand même.',
  'explain.buy.street': '{square} n\'appartient à personne. Achète-la pour {price} : ensuite, chaque joueur qui s\'arrête ici te paie un loyer (à partir de {rent}, bien plus avec des maisons).',
  'explain.buy.rail': '{square} n\'appartient à personne. Achète-la pour {price} : chaque joueur qui s\'arrête ici te paie {rent}, plus pour chaque gare que tu as.',
  'explain.buy.util': '{square} n\'appartient à personne. Achète-la pour {price} : chaque joueur qui s\'arrête ici te paie 4 × son lancer de dés.',
  'explain.orAuction': 'Si tu ne l\'achètes pas, elle part aux enchères et tout le monde (toi aussi) peut enchérir.',
  'explain.orSkip': 'Ou laisse-la à quelqu\'un d\'autre.',
  'explain.done': 'Ton coup est fini. Touche « Finir le tour ». (Tu peux aussi toucher tes propriétés pour hypothéquer, ou faire un 🤝 échange avant.)',
  'explain.doneBuild': 'Tu as un groupe de couleur complet ! Touche une de ses rues (en bas ou sur le plateau) pour construire des maisons, puis finis ton tour.',
  'where.jail': 'en prison',
  'toast.paidRent': 'Tu as payé {amount} de loyer à {name} pour {square}',
  'toast.gotRent': '{name} t\'a payé {amount} de loyer pour {square} 🎉',
  'intro.title': 'Le Monopoly en 30 secondes',
  'intro.you': 'Voici ton pion sur le plateau. Ta case est entourée de ta couleur.',
  'intro.go': 'On joue !',
  'intro.more': 'Toutes les règles',
  'intro.steps': `
    <li><b>🎲 Lance les dés</b> à ton tour. Ton pion fait le tour du plateau. Passer par <b>Départ</b> te rapporte 200 €.</li>
    <li><b>🏠 Propriété libre ?</b> Achète-la. Ensuite, chaque joueur qui s'y arrête <b>te</b> paie un loyer.</li>
    <li><b>💸 Celle d'un autre ?</b> Tu lui paies le loyer. C'est comme ça qu'on se ruine.</li>
    <li><b>🏗️ Tout un groupe de couleur</b> à toi ? Touche ses rues pour construire des maisons : les loyers explosent.</li>
    <li><b>🏆 Tu gagnes</b> si tu es le dernier à avoir de l'argent, ou le plus riche quand le chrono en haut est fini.</li>
    <li>Le centre du plateau dit toujours ce qui vient de se passer et ce que tu peux faire. Touche une case pour la lire.</li>`,
  'ev.collect': p => `${p.name} reçoit ${p.amount}${p.reason === 'go' ? ' en passant par Départ' : p.reason === 'parking' ? ' du Parc gratuit' : ''}`,
  'ev.buy': '{name} achète {square} pour {amount}',
  'ev.decline': '{name} n\'achète pas {square}',
  'ev.rent': '{name} paie {amount} de loyer à {owner} pour {square}',
  'ev.tax': '{name} paie {amount} : {square}',
  'ev.card': '{deck} : <i>{card}</i>',
  'ev.jail': '🚓 {name} va en prison',
  'ev.jailFree': p => `${p.name} sort de prison${p.how === 'doubles' ? ' grâce à un double' : p.how === 'card' ? ' avec une carte' : ' en payant'}`,
  'ev.jailStay': p => `${p.name} reste en prison (essai ${p.tries} sur 3)`,
  'ev.speeding': 'Trois doubles d\'affilée : {name} est pris en excès de vitesse !',
  'ev.auction': '🔨 {square} est mis aux enchères',
  'ev.bid': '{name} offre {amount}',
  'ev.auctionPass': '{name} abandonne',
  'ev.auctionWon': '🔨 {name} remporte {square} pour {amount}',
  'ev.auctionNone': 'Personne n\'enchérit : {square} reste à la banque',
  'ev.build': p => `${p.name} construit ${p.houses === 5 ? 'un hôtel' : 'une maison'} sur ${p.square}`,
  'ev.sell': '{name} vend un bâtiment sur {square} pour {amount}',
  'ev.mortgage': '{name} hypothèque {square} pour {amount}',
  'ev.unmortgage': '{name} lève l\'hypothèque de {square}',
  'ev.debt': '{name} doit {amount} et doit trouver l\'argent',
  'ev.paid': '{name} paie {amount} à {to}',
  'ev.bankrupt': p => `💀 ${p.name} fait faillite${p.heir ? ` : tout revient à ${p.to}` : ''}`,
  'ev.tradeOffer': '🤝 {name} propose un échange à {target}',
  'ev.tradeDone': '🤝 {name} et {target} ont conclu un échange',
  'ev.tradeDeclined': '{name} refuse l\'échange',
  'ev.tradeCancelled': '{name} retire son offre',
  'ev.tradeFailed': 'L\'échange entre {name} et {target} est tombé à l\'eau',
  'ev.timeout': '⏱ {name} n\'a plus de temps',
  'ev.gameOver': '🏆 Partie terminée !',

  'sys.created': '{name} a créé la salle',
  'sys.joined': p => `${p.name} a rejoint la salle${p.waiting ? ' (jouera la prochaine partie)' : ''}`,
  'sys.botJoined': p => `${p.name} 🤖 a rejoint la salle${p.waiting ? ' (prochaine partie)' : ''}`,
  'sys.removed': '{name} a été retiré',
  'sys.left': '{name} est parti',
  'sys.connected': '{name} est connecté',
  'sys.newHost': '{name} est maintenant l\'hôte',
  'sys.lobby': 'Retour au salon',
  'sys.monoOn': p => (p.minutes ? `C'est parti ! ${p.minutes} minutes, puis le plus riche gagne.` : 'C\'est parti ! Le dernier debout gagne.'),

  'err.connection': 'Impossible de joindre le serveur',
  'err.requestFailed': 'La requête a échoué ({status})',
  'err.needTwoPlayers': 'Il faut au moins 2 joueurs',
  'err.needTwoBot': 'Il faut au moins 2 joueurs : ajoute un bot !',
  'err.tooManyPlayers': p => `Ce jeu se joue à ${p.max} joueurs maximum`,
  'err.roundNotOver': 'La partie n\'est pas terminée',
  'err.notInGame': 'Tu ne fais pas partie de cette partie',
  'err.notYourTurn': 'Ce n\'est pas ton tour',
  'err.hostOnly': 'Seul l\'hôte peut faire ça',
  'err.noGame': 'Aucune partie en cours',
  'err.rulesBetweenGames': 'Change les règles entre deux parties',
  'err.roomFull': 'La salle est pleine',
  'err.roomFullMax': p => `Cette salle est pleine (${p.max || 8} joueurs max)`,
  'err.tooManyRooms': 'Trop de salles ouvertes sur le serveur, réessaie plus tard',
  'err.noSuchPlayer': 'Ce joueur n\'existe pas',
  'err.useLeave': 'Utilise plutôt « Quitter »',
  'err.gameRunning': 'Une partie est déjà en cours',
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
  'err.gameIsOver': 'La partie est terminée',
  'err.waitGameEnd': 'Attends la fin de cette partie',
  'err.rollFirst': 'Lance d\'abord les dés',
  'err.alreadyRolled': 'Tu as déjà lancé les dés',
  'err.notInJail': 'Tu n\'es pas en prison',
  'err.noJailCard': 'Tu n\'as pas de carte « Libéré de prison »',
  'err.nothingToBuy': 'Il n\'y a rien à acheter ici',
  'err.decideFirst': 'Achète-la ou mets-la aux enchères d\'abord',
  'err.cantAfford': 'Tu n\'as pas assez d\'argent',
  'err.auctionRunning': 'Attends la fin des enchères',
  'err.noAuction': 'Il n\'y a pas d\'enchères',
  'err.bidTooLow': p => `Offre plus de ${p.min}`,
  'err.youPassed': 'Tu as abandonné ces enchères',
  'err.notYours': 'Cette propriété n\'est pas à toi',
  'err.notAStreet': 'On ne construit que sur les rues',
  'err.needGroup': 'Il te faut tout le groupe de couleur pour construire',
  'err.groupMortgaged': 'Lève d\'abord les hypothèques de ce groupe',
  'err.buildEvenly': 'Construis de façon égale : d\'abord sur les autres rues du groupe',
  'err.sellEvenly': 'Vends de façon égale : d\'abord sur les autres rues du groupe',
  'err.maxBuilt': 'Cette rue a déjà un hôtel',
  'err.noBuildings': 'Il n\'y a rien à vendre ici',
  'err.noHousesLeft': 'La banque n\'a plus de maisons',
  'err.noHotelsLeft': 'La banque n\'a plus d\'hôtels',
  'err.sellBuildingsFirst': 'Vends d\'abord les bâtiments de ce groupe',
  'err.alreadyMortgaged': 'Déjà hypothéquée',
  'err.notMortgaged': 'Pas hypothéquée',
  'err.inDebt': p => `Trouve d'abord ${p.amount} : vends des bâtiments ou hypothèque, puis paie`,
  'err.noDebt': 'Tu ne dois rien',
  'err.cantPayYet': 'Tu ne peux toujours pas payer : vends, hypothèque ou déclare faillite',
  'err.tradeBusy': 'Un autre échange attend une réponse',
  'err.noTrade': 'Il n\'y a pas d\'échange en cours',
  'err.badTrade': 'Cet échange n\'est plus possible',
  'err.emptyTrade': 'Mets quelque chose dans l\'échange',
  'err.tradeSelf': 'Choisis un autre joueur',

  'rules.html': `
    <h3>But du jeu</h3>
    <p>Être le dernier joueur pas en faillite, ou le plus riche à la fin du temps (argent + propriétés + bâtiments).</p>
    <h3>Ton tour</h3>
    <ul>
      <li><b>Lance</b> les dés et avance. Passer par <b>Départ</b> rapporte 200 €.</li>
      <li>Propriété libre : <b>achète-la</b>, ou laisse-la partir aux <b>enchères</b> où tout le monde enchérit (toi aussi).</li>
      <li>Propriété d'un autre : paie le <b>loyer</b>. Posséder tout un groupe de couleur double le loyer des terrains nus.</li>
      <li>Un <b>double</b> fait rejouer. Trois doubles d'affilée envoient en prison.</li>
      <li>Les cartes Chance et Caisse de communauté font ce qu'elles disent.</li>
    </ul>
    <h3>Prison</h3>
    <p>Paie 50 €, utilise une carte « Libéré de prison », ou tente un double. Après 3 échecs tu paies 50 € et tu avances.</p>
    <h3>Construire</h3>
    <ul>
      <li>Il faut tout un groupe de couleur pour construire. Construis de façon <b>égale</b> : une maison sur chaque avant une deuxième.</li>
      <li>Quatre maisons deviennent un <b>hôtel</b>. La banque n'a que 32 maisons et 12 hôtels.</li>
      <li>Touche une case du plateau ou une de tes propriétés pour voir sa carte et construire, vendre ou hypothéquer.</li>
    </ul>
    <h3>Pas assez d'argent</h3>
    <p>Tu ne peux pas payer ? Vends des bâtiments (moitié prix) ou <b>hypothèque</b> des propriétés (moitié de leur prix, pas de loyer tant qu'elles sont hypothéquées, +10 % pour rembourser). Si ça ne suffit pas, c'est la faillite : tes biens vont à ton créancier.</p>
    <h3>Échanges</h3>
    <p>Touche 🤝 ou un joueur pour proposer propriétés, argent et cartes prison. Il accepte ou refuse.</p>
    <h3>En ligne et bots</h3>
    <ul>
      <li>Les bots occupent des places et achètent, enchérissent, construisent et échangent seuls.</li>
      <li>Si quelqu'un se déconnecte, le pilote auto joue pour lui après 10 s. Rouvre la page pour revenir.</li>
      <li>Clavier : <code>R</code>/<code>Espace</code> lancer · <code>B</code> acheter · <code>A</code> enchères · <code>E</code> finir le tour · <code>T</code> discussion.</li>
    </ul>`,

  ...listKeys('sq', SQ_FR),
  ...listKeys('chance', CHANCE_FR),
  ...listKeys('chest', CHEST_FR),
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

export const sqName = i => t(`sq.${i}`);

// $1,500 in English, 1 500 € in French
export function money(n) {
  const v = Math.round(Number(n) || 0);
  return lang === 'fr' ? `${v.toLocaleString('fr-FR')} €` : `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US')}`;
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

