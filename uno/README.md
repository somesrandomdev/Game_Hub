# UNO Night 🃏

Browser UNO for 2–10 players on the same Wi-Fi or hotspot, one of the [Game Night](../README.md) games.

## Play

UNO runs on the Game Night server at the repo root: double-click **`start.bat`** there (or run `node server.js`), pick **UNO** on the home page, and share the address it prints. See the [main README](../README.md) for hotspots, firewall and the online link.

## Features

- Full official rules: Skip, Reverse, Draw Two, Wild, Wild Draw Four with **challenges**, UNO calls with **Catch!** penalties, scoring to a target
- **UNO Flip** (lobby option): two-sided cards with a light and a dark side. Flip turns every card over; the dark side brings Draw Five, Skip Everyone and Wild Draw Color. You can see the other side of everyone else's cards
- **Voice chat** 🎧: talk with the table (peer-to-peer WebRTC, the server only relays the setup). The mic needs the https online link or the server PC itself; on a plain LAN address you can listen only
- **Multi-card play**: drop several cards of the same number/symbol at once, any colors (on by default)
- **Last one standing**: going out doesn't end the round; the last player holding cards scores 0, the others 50 pts per player still in when they went out (on by default)
- **QR code** in the lobby so phones can join in one scan
- **Game feel**: drag cards (or a whole multi-card group) onto the pile, cards fly on arcs and flip over mid-air, impacts with sparks and shockwaves, +2/+4 shake the screen, giant UNO! / COMBO callouts, a direction ring with real momentum on Reverse. Toggle with ✨ in the ☰ menu (follows the system "reduce motion" setting by default)
- Poker-style round table: opponents around the felt, you at the bottom, a glowing ring + countdown around whoever plays, a pointer from the center, a spinning direction ring, a live leaderboard as players go out, dark glass UI
- House rules: UNO only on the last card, stacking +2/+4, draw until playable, forced play, 7-0 swaps/rotations, jump-in, turn timer, starting hand size, UNO penalty
- **Bots** to fill seats or practice solo
- **Autopilot** for anyone who disconnects; reload or reopen the page to take your seat back
- Players who join mid-game are dealt in at the next round
- Chat, emoji reactions, game log, sounds generated in code, animations, confetti
- **English & French** 🌐: each player picks their own language (French browsers get it automatically)
- Works on phones (fullscreen option in the ☰ menu)
- Keyboard: `D` draw · `P` pass · `U` UNO (press it before playing to call UNO with your play) · `C` challenge · `S` sort · `T` chat · `V` mute mic · `Esc` close

## Project layout

```
src/plugin.js      what the hub server needs to run UNO (moves, bot timing)
src/game.js        pure UNO rules engine
src/ai.js          bot / autopilot strategy
src/messages.js    UNO's server messages
public/            the browser client, served at /uno/ (HTML, CSS, JS; no build step, no CDN)
test/              engine unit tests, 300 simulated games, translations
```

The server, voice chat and other shared pieces live at the repo root. Run every test with `npm test` there.
