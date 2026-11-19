# Game Night: design brief

## What it is
Game Night is a set of party games that friends play in the browser on the same Wi-Fi or a phone hotspot during a break. One PC runs a Node server (no dependencies, no internet needed). Everyone else opens a link on their phone or laptop, picks a game, types a name and joins a 4-letter room. An online mode shares the server through a Cloudflare tunnel link with a QR code.

- **UNO Night** (2–10 players): full rules, UNO Flip (light and dark card sides), house rules (stacking, 7-0, jump-in, last one standing), bots, catching players who forget UNO
- **Monopoly Night** (2–8 players): auctions, trades, houses and hotels, mortgages, a 60-minute time limit so a game fits in a break
- **Ludo Night** (2–16 players): a tournament of 4-player tables, re-seated every round, first to the target score wins

Shared across all games: voice chat (WebRTC), text chat, emoji reactions, game log, bots and autopilot for disconnected players, English and French, sounds generated in code.

## Who uses it, and how
- A group of 3–10 friends in one room, mostly on **phones held in portrait**, some on laptops
- Games are short and loud. People glance at the screen between talking, so **whose turn it is and what I can do** must be readable in under a second
- Many players are casual and new to the house rules

## Screens to design
1. **Hub**: pick a game, see open rooms, join by code, show the LAN or online address and a QR code
2. **Game home** (one per game): enter a name, create or join a room
3. **Lobby**: room code, player list (humans and bots), host settings (house rules), invite QR, voice and chat
4. **Game table**
   - UNO: opponents around a round table, discard pile and draw pile in the middle, direction ring, my hand at the bottom, action buttons (Draw / Pass / **UNO!** / Challenge), turn timer ring
   - Monopoly: square board filling the width, player cash panel, buy / auction / end-turn actions, title deed, trade and auction modals
   - Ludo: board with my corner always bottom-left, die, a status card ("what's happening, what to do")
5. **Overlays**: color picker (wild cards), swap-target picker, round results and leaderboard, menu, rules, chat drawer, toasts

## Current visual language (keep or replace deliberately)
- Defined in `shared/base.css`: cream paper background with a faint dot grid, 2px ink outlines, flat saturated colors, hard offset shadows (`0 3px 0 ink`), board-game-box feel
- Colors: red `#e5322d`, yellow `#f5b800`, green `#2f9e4f`, blue `#1f6fd1`, ink `#1d1a16`, paper `#f4ecdc`; UNO Flip dark side uses pink, teal, orange and purple
- Fonts: system fonts only (Segoe UI, Arial Rounded, Arial Black). No web fonts, because the app must work offline
- Heavy "game feel" effects: cards fly on arcs, screen shake, giant UNO! callouts, confetti. They can be turned off, and they follow reduce-motion

### Problems with the current design
- **Visual drift**: the UNO table uses a "dark glass felt" look while the hub and lobbies use cream paper. The three games each restyle the shared base differently (UNO's stylesheet is about 1,100 lines, Monopoly's 400, Ludo's 240)
- Emoji used as icons (🎧 💬 🎙️), which render differently on every platform
- The top bar is crowded with icon buttons on phones
- Too much is competing for attention at the table: effects, badges, glowing "hot" buttons

## Constraints
- **Offline-first**: no CDN, no web fonts, no build step. Plain HTML, CSS and JS served by the Node server
- Mobile first: 360px width, safe areas, thumb reach for the main actions; it must also work at desktop width
- Up to 10 seats at the UNO table, and up to 16 players in the Ludo lobby
- Two languages: French strings run about 20–30% longer than English
- Color is the core game mechanic (UNO colors, Ludo players). Never rely on color alone: always add a symbol or label, and check contrast

## Design goal
**One coherent system** across the hub and all three games. Tokens (color, type scale, spacing, radius, elevation, motion), plus a small set of components: button, icon button, panel, modal sheet, player seat, chip/badge, toast, card. Each game then adds only its board.

Tone: playful and tactile like a good board game box, but calm and precise, never cluttered. Restraint over effects. Every element should earn its place.

## Engineering goal (for the rebuild after the design)
Small, readable, deliberate code, "Karpathy style": a few files you can read top to bottom.
- Pure rules engines already exist and are tested: `*/src/game.js` (no I/O)
- The clients are the weak spot: three `app.js` files (1,700–2,400 lines each) duplicate the home, lobby, chat, menu and toast logic. The redesign should pull that into `shared/` so each game page is only its board and its actions
- One token file (`shared/base.css`) that every game uses as-is, with no per-game overrides of the basics
