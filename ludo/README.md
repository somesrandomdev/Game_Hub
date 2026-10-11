# Ludo Night 🎲

A Ludo **tournament** for 2–16 players on the same Wi-Fi or hotspot, one of the [Game Night](../README.md) games. Start the server at the repo root, pick **Ludo** on the home page, and share the address it prints.

## How the tournament works

- Everyone is split into tables of **at most 4** (as even as possible: 8 → 4 + 4, 9 → 3 + 3 + 3).
- Each table plays a round of Ludo. Places score **3, 2, 1, 0** points (2 players: 3 and 0).
- With **quick rounds** (on by default) a table stops as soon as one player has every piece home; the others are ranked by how far their pieces got.
- When every table is done there's a short break with the results, then everyone is **re-seated**, picking the seating where people have met each other least.
- The first to the **target score** (checked at the end of a round) wins. Ties go to who won more tables.

## Rules (Ludo King style)

- Roll a 6 to bring a piece out. Move one piece by the roll, clockwise around the board, then up your colored lane to the middle. Exact roll to get home.
- Land on an opponent's piece to send it back to their corner. Start squares and ★ squares are safe.
- Roll again after a 6, a capture, or a piece reaching home. Three 6s in a row lose the turn.
- If only one move is possible it plays itself.

## Made to be easy to follow

- Your corner is always drawn **bottom left**, with your name on it; the yard of whoever is playing glows.
- The pieces you can move glow and bounce; the die says ROLL when it's your turn.
- A card next to the board says what's happening, what to do, and the last few moves.
- A 30-second intro the first time, full rules behind **?**. Watch any other table from the side panel.

Settings: target score, pieces per player (2–4; fewer = shorter rounds), quick rounds, turn timer, next round by itself.

## Project layout

```
src/plugin.js      what the hub server needs to run Ludo (moves, bot timing, the break between rounds)
src/game.js        pure tournament + rules engine
src/ai.js          bot / autopilot strategy
src/messages.js    Ludo's server messages
public/            the browser client, served at /ludo/ (no build step, no CDN)
test/              engine unit tests, 200 simulated tournaments, translations
```
