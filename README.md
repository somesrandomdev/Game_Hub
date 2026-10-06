# Game Hub 🎮

Browser games to play with friends during the break, on the same Wi-Fi or a phone/PC hotspot. **No internet needed**: one PC runs the server and everyone else opens a link.

| Game | Players | Folder |
|---|---|---|
| 🃏 **UNO Night**: full rules, house rules, bots, chat, English/Français | 2–10 | [`uno/`](uno/) |
| *more coming…* | | |

## Quick start

You need [Node.js](https://nodejs.org) (v18+) on the host PC. There's nothing to `npm install`: every game has zero dependencies.

```bash
cd uno
node server.js        # or double-click start.bat on Windows
```

The server prints the address friends should open, e.g. `http://192.168.1.8:3000`. See each game's README for details.

## Tests

```bash
cd uno && npm test
```

Tests run automatically on every push (GitHub Actions).
