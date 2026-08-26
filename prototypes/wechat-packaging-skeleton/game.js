'use strict';

const { createPlatform } = require('./src/platform');
const { createTileTrio } = require('./src/tile-trio');

const platform = createPlatform(wx);
const game = createTileTrio(platform);

game.start();

module.exports = game;
