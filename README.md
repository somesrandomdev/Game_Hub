# Game Night 🎮

Browser games to play with friends during the break, on the same Wi-Fi or a phone/PC hotspot. **No internet needed**: one PC runs the server, everyone else opens a link and picks a game.

| Game | Players | Folder |
|---|---|---|
| 🃏 **UNO Night**: full rules, UNO Flip, house rules, bots, voice chat | 2–10 | [`uno/`](uno/) |
| 🎩 **Monopoly Night**: auctions, trades, houses & hotels, time limit, bots | 2–8 | [`monopoly/`](monopoly/) |
| 🎲 **Ludo Night**: tournament with tables of 4, re-mixed every round, first to the score wins | 2–16 | [`ludo/`](ludo/) |

## Play in 30 seconds

You need [Node.js](https://nodejs.org) (v18+) on the host PC. There's nothing to `npm install`: zero dependencies.

1. On the host PC, double-click **`start.bat`**. It opens the game hub and prints addresses like `http://192.168.1.8:3000`.
2. Friends join the **same network**:
   - same Wi-Fi router (it doesn't need internet), **or**
   - no router? Turn on **Windows Mobile Hotspot** (Settings → Network & internet → Mobile hotspot) and have them connect to it. The address will look like `http://192.168.137.1:3000`.
3. Everyone opens that address in any browser (PC or phone), picks a game, types a name and creates or joins a room. Open rooms of every game show on the hub, and a room code typed anywhere finds the right game.
4. If Windows Firewall shows a popup, click **Allow**. If friends still can't connect, run **`allow-firewall.bat`** once (it asks for admin rights).

Or from a terminal: `node server.js` (optional port: `node server.js 8080`).

## Play online (friends at home)

1. Double-click **`start-online.bat`** (or run `node server.js --online`).
2. The first time, it downloads Cloudflare's free `cloudflared` tool into `bin/` (~20 MB). No account, router or firewall changes.
3. After a few seconds the window prints a link like `https://some-random-words.trycloudflare.com`. It also shows on the hub and in every lobby as the 🌍 link, with a QR code.
4. Send that link to your friends.

Notes: the games run on your PC, so keep the window open and the PC awake. You get a new link every time. Anyone with the link can open it, so only share it with friends. macOS: `brew install cloudflared` first.

## How it's built

```
server.js        the hub server: rooms, chat, voice setup, reconnects, Server-Sent Events / long polling
lib/             shared server code (messages, online tunnel)
hub/             the home page: pick a game, see open rooms, join by code
shared/          shared browser code and styles (voice chat, game effects, toasts, QR codes, the look)
uno/ monopoly/ ludo/  one folder per game: src/plugin.js (rules engine + bots) and public/ (its page)
test/            end-to-end server tests
```

Adding a game means a new folder with a `src/plugin.js` (see `uno/src/plugin.js` for the shape: settings, `create`, `action`, `schedule`), its `public/` page, and one line in `server.js`.

## Tests

```bash
npm test
```

Tests run automatically on every push (GitHub Actions).
