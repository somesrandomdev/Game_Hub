# Monopoly Night 🎩

Browser Monopoly for 2–8 players on the same Wi-Fi or hotspot, one of the [Game Night](../README.md) games. Start the server at the repo root, pick **Monopoly** on the home page, and share the address it prints.

## Features

- The classic board and rules: buying, rent (doubled on a full color set), railroads and utilities, Chance and Community Chest (all 32 cards), jail with doubles / fine / Get Out of Jail Free, three doubles = speeding
- **Auctions**: a property nobody buys goes to the highest bidder, live, with a clock that restarts on every bid
- **Building** houses and hotels evenly, with the bank's limited stock (32 houses, 12 hotels); selling back at half price
- **Mortgages** (half the price, +10% to pay back; interest when a mortgaged property changes hands)
- **Trades** between any two players: properties, cash and jail cards
- **Debts and bankruptcy**: raise cash by selling and mortgaging, or go bankrupt to whoever you owe
- **Time limit** (60 min by default): when it runs out the richest player wins, so a game fits in a break
- House rules: starting cash, quick start (deal properties at the start), Free Parking jackpot, double salary on GO, turn timer, auctions on/off
- **Bots** that buy, bid, build, mortgage and propose trades; **autopilot** for anyone who disconnects
- Board names follow the language: Atlantic City in English, Paris in French 🌐
- Voice chat, chat, emoji reactions, game log, generated sounds, walking tokens and rolling dice
- Works on phones: the board fills the width, everything else scrolls below. Tap any square for its title deed
- Keyboard: `R`/`Space` roll · `B` buy · `A` auction · `E` end turn · `T` chat · `V` mute mic · `Esc` close

## Project layout

```
src/plugin.js      what the hub server needs to run Monopoly (moves, bot and auction timing)
src/game.js        pure rules engine
src/ai.js          bot / autopilot strategy
src/board.js       board helpers; the data itself is public/board.json, shared with the browser
src/messages.js    Monopoly's server messages
public/            the browser client, served at /monopoly/ (no build step, no CDN)
test/              engine unit tests, 300 simulated bot games, translations
```
