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

## Features

- Full official rules: Skip, Reverse, Draw Two, Wild, Wild Draw Four with **challenges**, UNO calls with **Catch!** penalties, scoring to a target
- House rules: stacking +2/+4, draw until playable, forced play, 7-0 swaps/rotations, jump-in, turn timer, starting hand size, UNO penalty
- **Bots** to fill seats or practice solo
- **Autopilot** for anyone who disconnects; reload or reopen the page to take your seat back
- Players who join mid-game are dealt in at the next round
- Chat, emoji reactions, game log, sounds generated in code, animations, confetti
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
