'use strict';

// Monopoly's own server messages (the platform's are in lib/messages.js).

const { GameError, addMessages, PLATFORM_ERRORS, PLATFORM_SYSTEM } = require('../../lib/messages');

const MONO_ERRORS = {
  gameIsOver: 'The game is over',
  waitGameEnd: 'Wait for this game to end',
  rollFirst: 'Roll the dice first',
  alreadyRolled: 'You already rolled',
  notInJail: 'You are not in jail',
  noJailCard: 'You have no Get Out of Jail Free card',
  nothingToBuy: 'There is nothing to buy here',
  decideFirst: 'Buy it or put it up for auction first',
  cantAfford: 'You don\'t have enough cash',
  auctionRunning: 'Wait for the auction to finish',
  noAuction: 'There is no auction',
  bidTooLow: p => `Bid more than ${p.min}`,
  youPassed: 'You dropped out of this auction',
  notYours: 'That property is not yours',
  notAStreet: 'You can only build on streets',
  needGroup: 'You need the whole color group to build',
  groupMortgaged: 'Pay off the mortgages in this group first',
  buildEvenly: 'Build evenly: put houses on the other streets of this group first',
  sellEvenly: 'Sell evenly: sell from the other streets of this group first',
  maxBuilt: 'This street already has a hotel',
  noBuildings: 'There is nothing to sell here',
  noHousesLeft: 'The bank is out of houses',
  noHotelsLeft: 'The bank is out of hotels',
  sellBuildingsFirst: 'Sell the buildings in this color group first',
  alreadyMortgaged: 'Already mortgaged',
  notMortgaged: 'Not mortgaged',
  inDebt: p => `Raise ${p.amount} first: sell buildings or mortgage, then pay`,
  noDebt: 'You don\'t owe anything',
  cantPayYet: 'You still can\'t cover it: sell, mortgage or declare bankruptcy',
  tradeBusy: 'Another trade is waiting for an answer',
  noTrade: 'There is no trade to answer',
  badTrade: 'That trade doesn\'t work anymore',
  emptyTrade: 'Put something in the trade',
  tradeSelf: 'Pick another player to trade with',
};

const MONO_SYSTEM = {
  monoOn: p => (p.minutes ? `Game on! ${p.minutes} minutes, then the richest player wins.` : 'Game on! Last one standing wins.'),
};

addMessages({ errors: MONO_ERRORS, system: MONO_SYSTEM });

// everything a Monopoly client can be sent
const ERRORS = { ...PLATFORM_ERRORS, ...MONO_ERRORS };
const SYSTEM = { ...PLATFORM_SYSTEM, ...MONO_SYSTEM };

module.exports = { GameError, ERRORS, SYSTEM };
