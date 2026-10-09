# UNO Night 🃏

Browser UNO for 2–10 players on the same Wi-Fi or hotspot. **No internet needed and nothing to install** except Node.js on the PC that hosts.

## Play in 30 seconds

1. On the host PC, double-click **`start.bat`**. It opens the game and prints addresses like `http://192.168.1.8:3000`.
2. Your friend joins the **same network**:
   - same Wi-Fi router (it doesn't need internet), **or**
   - no router? Turn on **Windows Mobile Hotspot** (Settings → Network & internet → Mobile hotspot) and have them connect to it. The address will look like `http://192.168.137.1:3000`.
3. Your friend opens that address in any browser (PC or phone), types a name and joins your room code. Open rooms also show up on the home screen.
4. If Windows Firewall shows a popup, click **Allow**. If your friend still can't connect, run **`allow-firewall.bat`** once (it asks for admin rights).

Or from a terminal: `node server.js` (optional port: `node server.js 8080`).

## Play online (friends at home)

1. On the host PC, double-click **`start-online.bat`** (or run `node server.js --online`).
2. The first time, it downloads Cloudflare's free `cloudflared` tool into `bin/` (~20 MB). You don't need an account, router changes or firewall changes.
3. After a few seconds the window prints a link like `https://some-random-words.trycloudflare.com`. It also appears in the lobby as the 🌍 link, with a QR code.
4. Send that link to your friends. They open it, type a name and join your room.

Notes:
- The game still runs on your PC, so keep the window open and the PC awake. Close the window to take the game offline.
- You get a **new link every time** you start it. If the connection drops it reconnects with a new link (shown in the window and the lobby).
- Anyone who has the link can open the game, so only share it with friends.
- macOS: install the tool first with `brew install cloudflared`.

## Features

- Full official rules: Skip, Reverse, Draw Two, Wild, Wild Draw Four with **challenges**, UNO calls with **Catch!** penalties, scoring to a target
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
- Keyboard: `D` draw · `P` pass · `U` UNO · `C` challenge · `S` sort · `T` chat · `Esc` close

## Project layout

```
server.js          HTTP server, rooms, Server-Sent Events, bots/timers
src/game.js        pure UNO rules engine
src/ai.js          bot / autopilot strategy
public/            the browser client (HTML, CSS, JS; no build step, no CDN)
test/              engine unit tests, 300 simulated games, end-to-end server tests
```

Run the tests with `npm test`.
