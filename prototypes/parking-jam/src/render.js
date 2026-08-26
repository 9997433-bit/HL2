/**
 * Canvas presentation for Gridlock Garage.
 *
 * Everything drawn here is generated from primitives — no sprite sheets, no
 * imported assets. That is deliberate: the study replicates the *mechanic* of
 * the WeChat parking puzzles, so the art has to be original, and vector cars
 * also keep the whole prototype inside a few kilobytes.
 */

import { HORIZONTAL, cellsOf } from './core.js';

const LOT = {
  tarmac: '#2b3240',
  tarmacAlt: '#2f3747',
  stall: 'rgba(255,255,255,0.10)',
  wall: '#1b2028',
  wallEdge: '#3c4553',
};

/** Blocker paints, picked by label so a car keeps its colour across a restart. */
const PAINTS = [
  { body: '#5b7cfa', roof: '#7d97ff' },
  { body: '#3fa9a0', roof: '#5fc7be' },
  { body: '#b05fd6', roof: '#c886e8' },
  { body: '#4d94d1', roof: '#6fb1e8' },
  { body: '#8d93a8', roof: '#a8aec2' },
  { body: '#c06b8f', roof: '#d98cab' },
  { body: '#6a8f4a', roof: '#88ad64' },
  { body: '#a9793f', roof: '#c79a5f' },
];

const TARGET_PAINT = { body: '#f2b632', roof: '#ffd166' };

export function paintFor(vehicle) {
  if (vehicle.isTarget) return TARGET_PAINT;
  let h = 0;
  for (const ch of vehicle.label) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return PAINTS[Math.abs(h) % PAINTS.length];
}

/** Geometry shared by the renderer and by hit-testing in main.js. */
export function layoutFor(canvas, state) {
  const pad = Math.round(Math.min(canvas.width, canvas.height) * 0.085);
  const cell = Math.floor(Math.min((canvas.width - pad * 2) / state.cols, (canvas.height - pad * 2) / state.rows));
  const boardW = cell * state.cols;
  const boardH = cell * state.rows;
  return {
    cell,
    boardW,
    boardH,
    x0: Math.round((canvas.width - boardW) / 2),
    y0: Math.round((canvas.height - boardH) / 2),
  };
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawLot(ctx, state, L) {
  const wall = Math.max(6, Math.round(L.cell * 0.16));
  ctx.fillStyle = LOT.wall;
  roundRect(ctx, L.x0 - wall, L.y0 - wall, L.boardW + wall * 2, L.boardH + wall * 2, wall);
  ctx.fill();

  ctx.fillStyle = LOT.tarmac;
  ctx.fillRect(L.x0, L.y0, L.boardW, L.boardH);

  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if ((r + c) % 2 === 0) continue;
      ctx.fillStyle = LOT.tarmacAlt;
      ctx.fillRect(L.x0 + c * L.cell, L.y0 + r * L.cell, L.cell, L.cell);
    }
  }

  // Painted stall markings: a short tick at every cell seam.
  ctx.strokeStyle = LOT.stall;
  ctx.lineWidth = Math.max(1.5, L.cell * 0.05);
  ctx.lineCap = 'round';
  const tick = L.cell * 0.3;
  for (let r = 1; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const y = L.y0 + r * L.cell;
      const x = L.x0 + c * L.cell + L.cell / 2;
      ctx.beginPath();
      ctx.moveTo(x - tick, y);
      ctx.lineTo(x + tick, y);
      ctx.stroke();
    }
  }

  drawExits(ctx, state, L, wall);
}

function drawExits(ctx, state, L, wall) {
  for (const exit of state.exits) {
    const along = exit.axis === HORIZONTAL;
    const cx = along
      ? L.x0 + (exit.dir > 0 ? L.boardW + wall / 2 : -wall / 2)
      : L.x0 + (exit.line + 0.5) * L.cell;
    const cy = along
      ? L.y0 + (exit.line + 0.5) * L.cell
      : L.y0 + (exit.dir > 0 ? L.boardH + wall / 2 : -wall / 2);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(along ? (exit.dir > 0 ? 0 : Math.PI) : exit.dir > 0 ? Math.PI / 2 : -Math.PI / 2);

    // Gap in the wall.
    ctx.fillStyle = LOT.tarmac;
    ctx.fillRect(-wall / 2 - 1, -L.cell * 0.44, wall + 2, L.cell * 0.88);

    // Chevrons pointing out of the lot.
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(2, L.cell * 0.07);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 2; i++) {
      const ox = wall * 0.9 + i * L.cell * 0.22;
      const s = L.cell * 0.16;
      ctx.globalAlpha = 0.85 - i * 0.3;
      ctx.beginPath();
      ctx.moveTo(ox - s, -s);
      ctx.lineTo(ox, 0);
      ctx.lineTo(ox - s, s);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/**
 * One car. `offset` is a live drag/animation displacement in pixels along the
 * vehicle's own axis; `fade` dims it as it drives out of the lot.
 */
function drawCar(ctx, vehicle, L, { offset = 0, fade = 1, lifted = false, flash = 0 } = {}) {
  const horiz = vehicle.orient === HORIZONTAL;
  const inset = L.cell * 0.11;
  const x = L.x0 + vehicle.col * L.cell + inset + (horiz ? offset : 0);
  const y = L.y0 + vehicle.row * L.cell + inset + (horiz ? 0 : offset);
  const w = (horiz ? vehicle.len : 1) * L.cell - inset * 2;
  const h = (horiz ? 1 : vehicle.len) * L.cell - inset * 2;
  const paint = paintFor(vehicle);
  const radius = L.cell * 0.26;

  ctx.save();
  ctx.globalAlpha = fade;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = lifted ? L.cell * 0.28 : L.cell * 0.12;
  ctx.shadowOffsetY = lifted ? L.cell * 0.12 : L.cell * 0.05;
  ctx.fillStyle = paint.body;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.restore();

  // Cabin: a lighter inset panel plus a glass strip, so orientation reads at a
  // glance even for the 1x2 cars.
  const cabInset = Math.min(w, h) * 0.16;
  ctx.fillStyle = paint.roof;
  if (horiz) roundRect(ctx, x + w * 0.2, y + cabInset, w * 0.6, h - cabInset * 2, radius * 0.6);
  else roundRect(ctx, x + cabInset, y + h * 0.2, w - cabInset * 2, h * 0.6, radius * 0.6);
  ctx.fill();

  ctx.fillStyle = 'rgba(22,28,38,0.55)';
  if (horiz) roundRect(ctx, x + w * 0.3, y + h * 0.26, w * 0.4, h * 0.48, radius * 0.4);
  else roundRect(ctx, x + w * 0.26, y + h * 0.3, w * 0.48, h * 0.4, radius * 0.4);
  ctx.fill();

  // Headlights at both ends: these cars reverse as happily as they drive.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const lampR = L.cell * 0.055;
  const lamps = horiz
    ? [[x + w * 0.06, y + h * 0.25], [x + w * 0.06, y + h * 0.75], [x + w * 0.94, y + h * 0.25], [x + w * 0.94, y + h * 0.75]]
    : [[x + w * 0.25, y + h * 0.06], [x + w * 0.75, y + h * 0.06], [x + w * 0.25, y + h * 0.94], [x + w * 0.75, y + h * 0.94]];
  for (const [lx, ly] of lamps) {
    ctx.beginPath();
    ctx.arc(lx, ly, lampR, 0, Math.PI * 2);
    ctx.fill();
  }

  if (vehicle.isTarget) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(1.5, L.cell * 0.035);
    roundRect(ctx, x + 2, y + 2, w - 4, h - 4, radius * 0.9);
    ctx.stroke();
  }

  if (flash > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${0.85 * flash})`;
    ctx.lineWidth = Math.max(2, L.cell * 0.09);
    roundRect(ctx, x - 2, y - 2, w + 4, h + 4, radius);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw a frame.
 *
 * `view` carries the transient presentation state main.js owns:
 *   { dragging: {vehicle, offset}, animation: {vehicle, offset, fade}, hint }
 */
export function draw(ctx, canvas, state, view = {}) {
  const L = layoutFor(canvas, state);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawLot(ctx, state, L);

  state.vehicles.forEach((vehicle, i) => {
    if (state.out[i] && view.animation?.vehicle !== i) return;
    const opts = {};
    if (view.dragging?.vehicle === i) {
      opts.offset = view.dragging.offset;
      opts.lifted = true;
    }
    if (view.animation?.vehicle === i) {
      opts.offset = view.animation.offset;
      opts.fade = view.animation.fade ?? 1;
    }
    if (view.hint === i) opts.flash = view.hintPulse ?? 1;
    drawCar(ctx, vehicle, L, opts);
  });

  return L;
}
