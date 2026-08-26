'use strict';

const SYMBOLS = ['A', 'B', 'C', 'D', 'E', 'F'];
const COLORS = ['#d6efc7', '#ffd6cc', '#ffe7ad', '#cce8ff', '#e0d3ff', '#ffd7eb'];
const TRAY_SLOTS = 7;

function createTileTrio(platform) {
  const { context: ctx, width, height } = platform;
  const tileSize = Math.min(64, (width - 40) / 4);
  const boardTop = Math.max(110, height * 0.2);
  const trayTop = height - 112;
  const resetButton = { x: width - 92, y: 22, width: 72, height: 34 };

  let tiles = [];
  let tray = [];
  let message = '';
  let running = false;

  function reset() {
    const baseLeft = width / 2 - tileSize * 2;
    const upperLeft = width / 2 - tileSize * 1.5;
    tiles = [];

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const index = row * 4 + col;
        tiles.push(makeTile(
          index,
          baseLeft + col * tileSize,
          boardTop + row * tileSize,
          0,
          Math.floor(index / 3)
        ));
      }
    }

    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const index = row * 3 + col;
        tiles.push(makeTile(
          12 + index,
          upperLeft + col * tileSize,
          boardTop + tileSize / 2 + row * tileSize,
          1,
          4 + Math.floor(index / 3)
        ));
      }
    }

    tray = [];
    message = 'Tap an uncovered tile';
    running = true;
    render();
  }

  function makeTile(id, x, y, layer, type) {
    return { id, x, y, layer, type, state: 'board' };
  }

  function overlaps(a, b) {
    return a.x < b.x + tileSize
      && b.x < a.x + tileSize
      && a.y < b.y + tileSize
      && b.y < a.y + tileSize;
  }

  function isLocked(tile) {
    return tiles.some((other) => (
      other.state === 'board'
      && other.layer > tile.layer
      && overlaps(other, tile)
    ));
  }

  function hitTile(point) {
    return tiles
      .filter((tile) => tile.state === 'board')
      .sort((a, b) => b.layer - a.layer || b.id - a.id)
      .find((tile) => (
        point.x >= tile.x
        && point.x <= tile.x + tileSize
        && point.y >= tile.y
        && point.y <= tile.y + tileSize
      ));
  }

  function pick(tile) {
    if (!running || !tile) return;
    if (isLocked(tile)) {
      message = 'That tile is covered';
      render();
      return;
    }

    tile.state = 'tray';
    const previousSame = tray.map((item) => item.type).lastIndexOf(tile.type);
    if (previousSame >= 0) tray.splice(previousSame + 1, 0, tile);
    else tray.push(tile);
    platform.vibrate();

    const matching = tray.filter((item) => item.type === tile.type);
    if (matching.length === 3) {
      matching.forEach((item) => {
        item.state = 'gone';
        tray.splice(tray.indexOf(item), 1);
      });
      message = `Matched ${SYMBOLS[tile.type]}`;
    }

    if (tiles.every((item) => item.state === 'gone')) {
      running = false;
      message = 'Cleared! Tap Restart';
    } else if (tray.length >= TRAY_SLOTS) {
      running = false;
      message = 'Tray full. Tap Restart';
    }
    render();
  }

  function onTouch(point) {
    if (inside(point, resetButton)) {
      reset();
      return;
    }
    pick(hitTile(point));
  }

  function inside(point, rect) {
    return point.x >= rect.x
      && point.x <= rect.x + rect.width
      && point.y >= rect.y
      && point.y <= rect.y + rect.height;
  }

  function drawTile(tile, x, y, locked) {
    const gap = 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(x + 3, y + 5, tileSize - gap, tileSize - gap);
    ctx.fillStyle = COLORS[tile.type];
    ctx.fillRect(x, y, tileSize - gap, tileSize - gap);
    if (locked) {
      ctx.fillStyle = 'rgba(12, 22, 31, 0.55)';
      ctx.fillRect(x, y, tileSize - gap, tileSize - gap);
    }
    ctx.strokeStyle = locked ? '#526475' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, tileSize - gap - 2, tileSize - gap - 2);
    ctx.fillStyle = locked ? '#8fa1af' : '#17212b';
    ctx.font = `bold ${Math.round(tileSize * 0.42)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SYMBOLS[tile.type], x + tileSize / 2, y + tileSize / 2);
  }

  function render() {
    ctx.fillStyle = '#17212b';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#f3f7fb';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Tile Trio', 20, 45);

    ctx.fillStyle = '#33485b';
    ctx.fillRect(resetButton.x, resetButton.y, resetButton.width, resetButton.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Restart', resetButton.x + resetButton.width / 2, resetButton.y + 23);

    ctx.fillStyle = '#9fb3c8';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(message, 20, 74);

    tiles
      .filter((tile) => tile.state === 'board')
      .sort((a, b) => a.layer - b.layer || a.id - b.id)
      .forEach((tile) => drawTile(tile, tile.x, tile.y, isLocked(tile)));

    const slotSize = Math.min(tileSize, (width - 24) / TRAY_SLOTS);
    const trayLeft = (width - slotSize * TRAY_SLOTS) / 2;
    ctx.strokeStyle = '#526475';
    ctx.lineWidth = 1;
    for (let index = 0; index < TRAY_SLOTS; index += 1) {
      ctx.strokeRect(trayLeft + index * slotSize, trayTop, slotSize, slotSize);
    }
    tray.forEach((tile, index) => {
      const x = trayLeft + index * slotSize;
      ctx.fillStyle = COLORS[tile.type];
      ctx.fillRect(x + 2, trayTop + 2, slotSize - 4, slotSize - 4);
      ctx.fillStyle = '#17212b';
      ctx.font = `bold ${Math.round(slotSize * 0.42)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SYMBOLS[tile.type], x + slotSize / 2, trayTop + slotSize / 2);
    });
  }

  function start() {
    platform.onTouchStart(onTouch);
    platform.onShow(render);
    reset();
  }

  return {
    start,
    reset,
    render,
    state() {
      return {
        running,
        boardTiles: tiles.filter((tile) => tile.state === 'board').length,
        trayTiles: tray.length,
        clearedTiles: tiles.filter((tile) => tile.state === 'gone').length
      };
    }
  };
}

module.exports = { createTileTrio };
