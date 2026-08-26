/**
 * Canvas 2D renderer for the stacked match-3 prototype.
 *
 * Everything is drawn in a fixed 720x1280 design space and mapped onto the real
 * canvas with a letterbox transform, so the same code fits a phone viewport, a
 * desktop browser window, or a WeChat mini-game canvas.
 */

import { TILE_SPAN, TILE_STATE, progress } from './core.js';

export const DESIGN = { w: 720, h: 1280 };

const BOARD_AREA = { x: 30, y: 196, w: 660, h: 730 };
const TRAY = { y: 1000, slot: 84, gap: 8 };

const GLYPHS = ['🌿', '🍄', '🌰', '🥕', '🌻', '🍇', '🐑', '🪵', '🧶', '🔔', '🍯', '🥬'];
const TILE_FILLS = [
  '#fef3c7', '#e0f2fe', '#fce7f3', '#dcfce7', '#ede9fe', '#ffedd5',
  '#f1f5f9', '#ccfbf1', '#fee2e2', '#e7e5e4', '#fef9c3', '#e0e7ff',
];

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let view = { scale: 1, dx: 0, dy: 0 };
  let geom = null;

  function resize(pixelWidth, pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const scale = Math.min(pixelWidth / DESIGN.w, pixelHeight / DESIGN.h);
    view = {
      scale,
      dx: (pixelWidth - DESIGN.w * scale) / 2,
      dy: (pixelHeight - DESIGN.h * scale) / 2,
    };
  }

  /** Canvas pixel coordinates -> design-space coordinates. */
  function toDesign(px, py) {
    return { x: (px - view.dx) / view.scale, y: (py - view.dy) / view.scale };
  }

  /** Recompute the board-to-pixel mapping; cheap, so it runs every frame. */
  function measure(game) {
    let maxHX = 0;
    let maxHY = 0;
    for (const t of game.tiles) {
      maxHX = Math.max(maxHX, t.hx + TILE_SPAN);
      maxHY = Math.max(maxHY, t.hy + TILE_SPAN);
    }
    const half = Math.min(BOARD_AREA.w / maxHX, BOARD_AREA.h / maxHY);
    const size = half * TILE_SPAN;
    geom = {
      half,
      size,
      originX: BOARD_AREA.x + (BOARD_AREA.w - maxHX * half) / 2,
      originY: BOARD_AREA.y + (BOARD_AREA.h - maxHY * half) / 2,
    };
    return geom;
  }

  function boardPos(tile) {
    return { x: geom.originX + tile.hx * geom.half, y: geom.originY + tile.hy * geom.half };
  }

  function traySlotPos(game, index) {
    const total = game.level.slots * TRAY.slot + (game.level.slots - 1) * TRAY.gap;
    const startX = (DESIGN.w - total) / 2;
    return { x: startX + index * (TRAY.slot + TRAY.gap), y: TRAY.y };
  }

  function drawTile(tile, x, y, size, { dim = false, lift = 0, shake = 0 } = {}) {
    ctx.save();
    ctx.translate(x + size / 2 + shake, y + size / 2 - lift);

    ctx.shadowColor = 'rgba(15,23,42,0.28)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = TILE_FILLS[tile.type % TILE_FILLS.length];
    roundRect(ctx, -size / 2, -size / 2, size, size, size * 0.22);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = 'rgba(120,113,108,0.55)';
    ctx.lineWidth = Math.max(1, size * 0.035);
    ctx.stroke();

    ctx.font = `${size * 0.56}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(GLYPHS[tile.type % GLYPHS.length], 0, size * 0.04);

    if (dim) {
      ctx.fillStyle = 'rgba(30,41,59,0.42)';
      roundRect(ctx, -size / 2, -size / 2, size, size, size * 0.22);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHeader(game) {
    const { done, total, ratio } = progress(game);

    ctx.fillStyle = '#1c1917';
    ctx.font = '600 40px system-ui, -apple-system, "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(game.level.name, 40, 84);

    ctx.font = '26px system-ui, -apple-system, "PingFang SC", sans-serif';
    ctx.fillStyle = '#57534e';
    ctx.textAlign = 'right';
    ctx.fillText(`${done} / ${total}`, DESIGN.w - 40, 84);

    const bar = { x: 40, y: 108, w: DESIGN.w - 80, h: 14 };
    ctx.fillStyle = '#e7e5e4';
    roundRect(ctx, bar.x, bar.y, bar.w, bar.h, 7);
    ctx.fill();
    ctx.fillStyle = '#65a30d';
    roundRect(ctx, bar.x, bar.y, Math.max(bar.h, bar.w * ratio), bar.h, 7);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = '22px system-ui, -apple-system, "PingFang SC", sans-serif';
    ctx.fillStyle = '#78716c';
    ctx.fillText(`seed ${game.seed} · 槽位 ${game.tray.length}/${game.level.slots}`, 40, 164);
  }

  function drawTray(game, anim) {
    for (let i = 0; i < game.level.slots; i++) {
      const { x, y } = traySlotPos(game, i);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, TRAY.slot, TRAY.slot, 16);
      ctx.fill();
      ctx.stroke();
    }
    game.tray.forEach((tile, i) => {
      const slot = traySlotPos(game, i);
      const pos = anim[tile.id] || slot;
      drawTile(tile, pos.x + 6, pos.y + 6, TRAY.slot - 12);
    });
  }

  function drawButtons(game, buttons) {
    for (const btn of buttons) {
      const enabled = btn.enabled(game);
      ctx.fillStyle = enabled ? '#1c1917' : '#d6d3d1';
      roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 18);
      ctx.fill();

      ctx.fillStyle = enabled ? '#fafaf9' : '#a8a29e';
      ctx.font = '600 26px system-ui, -apple-system, "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label(game), btn.x + btn.w / 2, btn.y + btn.h / 2);
    }
  }

  function drawBanner(game) {
    if (game.status === 'playing') return;
    const won = game.status === 'won';
    ctx.fillStyle = 'rgba(28,25,23,0.72)';
    ctx.fillRect(0, 0, DESIGN.w, DESIGN.h);

    ctx.fillStyle = '#fafaf9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 76px system-ui, -apple-system, "PingFang SC", sans-serif';
    ctx.fillText(won ? '通关！' : '槽位已满', DESIGN.w / 2, DESIGN.h / 2 - 60);

    ctx.font = '30px system-ui, -apple-system, "PingFang SC", sans-serif';
    ctx.fillStyle = '#d6d3d1';
    const { done, total } = progress(game);
    ctx.fillText(
      won ? `${game.stats.picks} 次点击清空 ${total} 张牌` : `已消除 ${done} / ${total}`,
      DESIGN.w / 2,
      DESIGN.h / 2 + 10
    );
    ctx.fillText('点击任意位置重开本关', DESIGN.w / 2, DESIGN.h / 2 + 70);
  }

  function draw(game, ui = {}) {
    const { anim = {}, buttons = [], shakeId = null, hintId = null } = ui;
    measure(game);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.dx, view.dy);

    const bg = ctx.createLinearGradient(0, 0, 0, DESIGN.h);
    bg.addColorStop(0, '#f7fee7');
    bg.addColorStop(1, '#d9f99d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, DESIGN.w, DESIGN.h);

    drawHeader(game);

    const onBoard = game.tiles
      .filter((t) => t.state === TILE_STATE.BOARD)
      .sort((a, b) => a.layer - b.layer || a.hy - b.hy || a.hx - b.hx);

    for (const tile of onBoard) {
      const covered = game.coverGraph[tile.id].some(
        (c) => game.tiles[c].state === TILE_STATE.BOARD
      );
      const { x, y } = boardPos(tile);
      drawTile(tile, x, y, geom.size, {
        dim: covered,
        lift: tile.id === hintId ? 6 : 0,
        shake: tile.id === shakeId ? Math.sin(Date.now() / 18) * 5 : 0,
      });
      if (tile.id === hintId) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 5;
        roundRect(ctx, x - 3, y - 9, geom.size + 6, geom.size + 6, geom.size * 0.24);
        ctx.stroke();
      }
    }

    drawTray(game, anim);
    drawButtons(game, buttons);
    drawBanner(game);
  }

  /** Topmost pickable-looking tile under a design-space point, or null. */
  function hitTest(game, dx, dy) {
    if (!geom) measure(game);
    const candidates = game.tiles
      .filter((t) => t.state === TILE_STATE.BOARD)
      .sort((a, b) => b.layer - a.layer);
    for (const tile of candidates) {
      const { x, y } = boardPos(tile);
      if (dx >= x && dx <= x + geom.size && dy >= y && dy <= y + geom.size) return tile;
    }
    return null;
  }

  return {
    resize,
    draw,
    hitTest,
    toDesign,
    traySlotPos,
    // Callers may ask for a tile position before the first frame has measured
    // the board, so fall back to measuring on demand.
    boardPos(game, tile) {
      if (!geom) measure(game);
      return boardPos(tile);
    },
  };
}
