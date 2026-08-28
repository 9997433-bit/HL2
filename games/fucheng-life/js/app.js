/* ============================================================
   《浮城人生》URBAN LIFE SIMULATOR — 主界面逻辑
   · 都市夜景渲染引擎（视差天际线 / 霓虹灯牌 / 雨幕 / 湿地倒影）
   · 主菜单交互、设置持久化、启动序列
   Round 1 · main shell · 无依赖
   ============================================================ */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     0. 基础工具
     --------------------------------------------------------- */
  const D = document;
  const $ = (sel, root) => (root || D).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || D).querySelectorAll(sel));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rng(seed) {
    const f = mulberry32(seed);
    return {
      f,
      r: (a, b) => a + f() * (b - a),
      i: (a, b) => Math.floor(a + f() * (b - a + 1)),
      pick: (arr) => arr[Math.floor(f() * arr.length)],
      chance: (p) => f() < p,
    };
  }

  const prefersCalm =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1. 设置
     --------------------------------------------------------- */
  const SETTINGS_KEY = 'fucheng-life.settings.v1';
  // screens.js 写的存档在前，旧键留作兼容
  const SAVE_KEYS = ['fucheng.save.v1', 'fucheng-life.save.v1'];

  const DEFAULTS = {
    quality: 'high',
    qualityAuto: true, // 未被用户显式指定时允许自动降级
    rain: true,
    bloom: true,
    audio: false,
    volume: 45,
    calm: prefersCalm,
  };

  function readStore(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeStore(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* 隐私模式下静默失败 */
    }
  }

  const settings = Object.assign({}, DEFAULTS, readStore(SETTINGS_KEY, {}));
  const saveSettings = () => writeStore(SETTINGS_KEY, settings);

  const QUALITY = {
    high: { dpr: 2, rain: 250, grain: true, reflect: true, slice: 3, flicker: 220, clouds: 6 },
    medium: { dpr: 1.5, rain: 130, grain: false, reflect: true, slice: 5, flicker: 110, clouds: 4 },
    // 省电档也保留倒影，只是切得更粗——雨夜反光是这套视觉的骨架
    low: { dpr: 1, rain: 55, grain: false, reflect: true, slice: 10, flicker: 40, clouds: 2 },
  };

  /* ---------------------------------------------------------
     2. 城市素材：调色与灯牌文案
     --------------------------------------------------------- */
  const NEON = [
    { c: '#4fe3ff', g: 'rgba(79,227,255,' }, // 青
    { c: '#ff3fa4', g: 'rgba(255,63,164,' }, // 品红
    { c: '#ffc861', g: 'rgba(255,200,97,' }, // 金
    { c: '#34e0a1', g: 'rgba(52,224,161,' }, // 玉
    { c: '#ff5a4d', g: 'rgba(255,90,77,' }, // 朱
    { c: '#a97bff', g: 'rgba(169,123,255,' }, // 紫
  ];

  // 灯牌用词取自五层城市意象：市井 → 资本 → 暗流
  const SIGN_V = ['夜市', '典当', '麻将', '网吧', '旅馆', '洗浴', '药房', '中介', '招聘', '面馆', '彩票', '按摩'];
  const SIGN_H = ['城中村', '便利店', '写字楼', '人力中介', '二十四小时', '会所', '早市', '外卖站', '合租房', '拆迁办'];

  const WINDOW_WARM = ['#ffcf8a', '#ffb95e', '#ffdca8', '#ff9f5a', '#f7e3b6'];
  const WINDOW_COOL = ['#cfe9ff', '#9fd4ff', '#e8f4ff', '#8fd0e8', '#b9c9ff'];

  const LAYERS = [
    {
      key: 'far',
      parallax: 10,
      hMin: 0.2,
      hMax: 0.44,
      wMin: 20,
      wMax: 46,
      gapMin: -3,
      gapMax: 7,
      top: '#16223f',
      bottom: '#0a1122',
      lit: 0.2,
      winW: 2,
      winH: 2,
      stepX: 5,
      stepY: 6,
      dim: 0.5,
      signs: 0,
      beacon: 0.18,
      baseOff: -22,
    },
    {
      key: 'mid',
      parallax: 30,
      hMin: 0.3,
      hMax: 0.68,
      wMin: 30,
      wMax: 72,
      gapMin: -2,
      gapMax: 12,
      top: '#101a34',
      bottom: '#060b18',
      lit: 0.3,
      winW: 3,
      winH: 4,
      stepX: 8,
      stepY: 10,
      dim: 0.82,
      signs: 0.3,
      beacon: 0.34,
      baseOff: -6,
    },
    {
      key: 'near',
      parallax: 68,
      hMin: 0.4,
      hMax: 0.96,
      wMin: 52,
      wMax: 128,
      gapMin: 6,
      gapMax: 40,
      top: '#080d1c',
      bottom: '#03060e',
      lit: 0.26,
      winW: 5,
      winH: 7,
      stepX: 13,
      stepY: 17,
      dim: 1,
      signs: 0.62,
      beacon: 0.5,
      baseOff: 26,
    },
  ];

  /* ---------------------------------------------------------
     3. 都市夜景渲染引擎
     --------------------------------------------------------- */
  function CityScene(canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });

    const scene = {
      canvas,
      ctx,
      W: 0,
      H: 0,
      dpr: 1,
      horizon: 0,
      seed: 20260828,
      layers: [],
      drops: [],
      ripples: [],
      headlights: [],
      clouds: [],
      stars: [],
      cloudSprite: null,
      grainSprite: null,
      aircraft: null,
      train: null,
      trainTimer: 9,
      lightning: 0,
      lightningTimer: 26,
      rainScale: 0.85,
      rainTarget: 0.85,
      pointer: { x: 0, y: 0, tx: 0, ty: 0 },
      t: 0,
      raf: 0,
      running: false,
      q: QUALITY[settings.quality] || QUALITY.high,
      frameSamples: [],
      lastMutate: 0,
      lastDowngrade: -99,
    };

    /* ---------- 尺寸 ---------- */
    function measure() {
      const W = Math.max(320, window.innerWidth);
      const H = Math.max(360, window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, scene.q.dpr);
      const changed = W !== scene.W || Math.abs(dpr - scene.dpr) > 0.01;
      scene.W = W;
      scene.H = H;
      scene.dpr = dpr;
      // 地平线抬高一点，把雨夜反光的水面留足
      scene.horizon = Math.round(H * (H < 520 ? 0.72 : 0.735));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return changed;
    }

    /* ---------- 灯牌预渲染 ---------- */
    function makeSign(text, neon, size, vertical) {
      const pad = Math.round(size * 0.55);
      const cw = vertical ? size + pad * 2 : text.length * size * 1.06 + pad * 2;
      const ch = vertical ? text.length * size * 1.12 + pad * 2 : size + pad * 2;
      const cv = D.createElement('canvas');
      const px = scene.dpr;
      cv.width = Math.ceil(cw * px);
      cv.height = Math.ceil(ch * px);
      const g = cv.getContext('2d');
      g.scale(px, px);

      // 灯箱底板
      g.fillStyle = 'rgba(6,10,20,0.72)';
      g.strokeStyle = neon.g + '0.5)';
      g.lineWidth = 1;
      roundRect(g, 0.5, 0.5, cw - 1, ch - 1, Math.min(6, size * 0.35));
      g.fill();
      g.stroke();

      g.font = '600 ' + size + 'px "PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';

      const chars = text.split('');
      for (let pass = 0; pass < 3; pass++) {
        g.shadowColor = neon.g + (pass === 2 ? '0.35)' : '0.9)');
        g.shadowBlur = pass === 0 ? size * 0.5 : pass === 1 ? size * 1.4 : size * 2.6;
        g.fillStyle = pass === 0 ? '#ffffff' : neon.c;
        for (let i = 0; i < chars.length; i++) {
          const x = vertical ? cw / 2 : pad + size * 0.53 + i * size * 1.06;
          const y = vertical ? pad + size * 0.56 + i * size * 1.12 : ch / 2;
          g.fillText(chars[i], x, y);
        }
      }
      g.shadowBlur = 0;
      return { canvas: cv, w: cw, h: ch };
    }

    function roundRect(g, x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      g.beginPath();
      g.moveTo(x + rr, y);
      g.arcTo(x + w, y, x + w, y + h, rr);
      g.arcTo(x + w, y + h, x, y + h, rr);
      g.arcTo(x, y + h, x, y, rr);
      g.arcTo(x, y, x + w, y, rr);
      g.closePath();
    }

    /* ---------- 天际线生成 ---------- */
    function buildLayer(def, index) {
      const r = rng(scene.seed + index * 7919);
      const P = def.parallax;
      const cssW = scene.W + P * 2;
      const genHorizon = scene.horizon;
      const cssH = genHorizon + 140;
      const scale = clamp(scene.W / 1280, 0.62, 1.35);

      const cv = D.createElement('canvas');
      cv.width = Math.ceil(cssW * scene.dpr);
      cv.height = Math.ceil(cssH * scene.dpr);
      const g = cv.getContext('2d');
      g.scale(scene.dpr, scene.dpr);

      // CBD 隆起：两三处高峰让天际线有节奏
      const peaks = [];
      const peakCount = r.i(2, 3);
      for (let i = 0; i < peakCount; i++) {
        peaks.push({ x: r.r(0.1, 0.9) * cssW, w: r.r(0.14, 0.3) * cssW, a: r.r(0.35, 0.85) });
      }
      const profile = (x) => {
        let v = 0;
        for (let i = 0; i < peaks.length; i++) {
          const d = (x - peaks[i].x) / peaks[i].w;
          v += peaks[i].a * Math.exp(-d * d);
        }
        return clamp(v, 0, 1);
      };

      const flickers = [];
      const signs = [];
      const beacons = [];
      const baseline = genHorizon + def.baseOff;

      let x = -r.r(10, 50);
      while (x < cssW + 40) {
        const w = Math.round(r.r(def.wMin, def.wMax) * scale);
        const tall = profile(x + w / 2);
        const hf = lerp(def.hMin, def.hMax, Math.pow(r.f(), 1.5) * 0.55 + tall * 0.62);
        const h = Math.round(clamp(hf, 0.08, 1.05) * genHorizon);
        const y = baseline - h;
        const office = r.chance(0.42 + tall * 0.3);

        drawBuilding(g, r, def, x, y, w, baseline, office, flickers, signs, beacons, scale, cssW);
        x += w + r.r(def.gapMin, def.gapMax) * scale;
      }

      return {
        def,
        canvas: cv,
        ctx: g,
        cssW,
        cssH,
        genHorizon,
        px: scene.dpr,
        flickers,
        signs,
        beacons,
      };
    }

    function drawBuilding(g, r, def, x, y, w, baseline, office, flickers, signs, beacons, scale, cssW) {
      const h = baseline - y;
      if (h < 12 || w < 6) return;

      // 楼体：顶部受城市辉光影响更亮
      const grad = g.createLinearGradient(0, y, 0, baseline);
      grad.addColorStop(0, def.top);
      grad.addColorStop(0.55, mix(def.top, def.bottom, 0.6));
      grad.addColorStop(1, def.bottom);
      g.fillStyle = grad;
      g.fillRect(x, y, w, h);

      // 退台：部分高楼收一层塔冠
      let capY = y;
      if (h > baseline * 0.42 && r.chance(0.45)) {
        const cw = w * r.r(0.4, 0.72);
        const cx = x + (w - cw) / 2 + r.r(-w * 0.1, w * 0.1);
        const chh = h * r.r(0.08, 0.2);
        g.fillStyle = mix(def.top, def.bottom, 0.35);
        g.fillRect(cx, y - chh, cw, chh);
        capY = y - chh;
      }

      // 女儿墙高光 / 边缘描光
      g.fillStyle = 'rgba(150,190,255,' + 0.16 * def.dim + ')';
      g.fillRect(x, capY, w, 1);
      g.fillStyle = 'rgba(120,170,240,' + 0.09 * def.dim + ')';
      g.fillRect(x + w - 1, y, 1, h);

      // 窗户
      const wW = Math.max(1, Math.round(def.winW * scale));
      const wH = Math.max(1, Math.round(def.winH * scale));
      const sx = Math.max(wW + 2, Math.round(def.stepX * scale));
      const sy = Math.max(wH + 2, Math.round(def.stepY * scale));
      const marginX = Math.max(2, Math.round(w * 0.1));
      const cols = Math.floor((w - marginX * 2 + (sx - wW)) / sx);
      if (cols < 1) return;
      const startX = x + Math.round((w - (cols * sx - (sx - wW))) / 2);
      const palette = office ? WINDOW_COOL : WINDOW_WARM;
      const litP = def.lit + (office ? 0.14 : 0.06);

      for (let wy = y + sy; wy < baseline - wH; wy += sy) {
        const floorLit = office && r.chance(0.3); // 整层加班
        for (let c = 0; c < cols; c++) {
          const wx = startX + c * sx;
          if (!floorLit && !r.chance(litP)) continue;
          const col = r.pick(palette);
          const a = floorLit ? r.r(0.5, 0.78) : r.r(0.35, 0.95);
          g.fillStyle = withAlpha(col, a * def.dim);
          g.fillRect(wx, wy, wW, wH);
          // 玻璃上的一点溢光
          if (def.dim > 0.7 && r.chance(0.22)) {
            g.fillStyle = withAlpha(col, 0.1 * def.dim);
            g.fillRect(wx - 1, wy - 1, wW + 2, wH + 2);
          }
          if (r.chance(0.035) && flickers.length < scene.q.flicker) {
            flickers.push({
              x: wx,
              y: wy,
              w: wW,
              h: wH,
              col: col,
              bg: mix(def.top, def.bottom, (wy - y) / Math.max(1, h)),
              a: a * def.dim,
              ph: r.r(0, TAU),
              sp: r.r(0.4, 3.2),
            });
          }
        }
      }

      // 霓虹灯牌
      if (def.signs > 0 && r.chance(def.signs) && w > 26 * scale) {
        const neon = r.pick(NEON);
        const vertical = r.chance(0.62);
        const size = Math.round(clamp((vertical ? w * 0.3 : w * 0.16), 7, 22) * (def.key === 'near' ? 1 : 0.82));
        if (size >= 7) {
          const text = vertical ? r.pick(SIGN_V) : r.pick(SIGN_H);
          const sprite = makeSign(text, neon, size, vertical);
          let px, py;
          if (vertical) {
            px = r.chance(0.5) ? x - sprite.w * 0.28 : x + w - sprite.w * 0.72;
            py = y + h * r.r(0.12, 0.42);
          } else {
            px = x + (w - sprite.w) / 2;
            py = y + h * r.r(0.06, 0.28);
          }
          if (px > -sprite.w && px < cssW) {
            signs.push({
              sprite,
              x: px,
              y: py,
              neon,
              ph: r.r(0, TAU),
              sp: r.r(0.5, 1.6),
              broken: r.chance(0.22),
              base: r.r(0.72, 1),
              shaft: def.key === 'near' && r.chance(0.45) ? r.r(90, 210) : 0,
            });
          }
        }
      }

      // 屋顶：航空障碍灯 / 天线 / 水箱
      if (r.chance(def.beacon) && h > baseline * 0.3) {
        const mx = x + w * r.r(0.3, 0.7);
        const mh = h * r.r(0.05, 0.16);
        g.strokeStyle = 'rgba(120,150,200,' + 0.4 * def.dim + ')';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(Math.round(mx) + 0.5, capY);
        g.lineTo(Math.round(mx) + 0.5, capY - mh);
        g.stroke();
        beacons.push({ x: mx, y: capY - mh, ph: r.r(0, TAU), r: r.r(1.4, 2.6) });
      }
      if (def.key !== 'far' && r.chance(0.5)) {
        const bw = w * r.r(0.14, 0.3);
        const bh = Math.min(h * 0.08, 10 * scale);
        g.fillStyle = mix(def.top, def.bottom, 0.2);
        g.fillRect(x + w * r.r(0.1, 0.6), capY - bh, bw, bh);
      }
    }

    /* ---------- 颜色工具 ---------- */
    function hex2rgb(hex) {
      const v = parseInt(hex.slice(1), 16);
      return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    }
    function mix(a, b, t) {
      const A = hex2rgb(a);
      const B = hex2rgb(b);
      return 'rgb(' + Math.round(lerp(A[0], B[0], t)) + ',' + Math.round(lerp(A[1], B[1], t)) + ',' + Math.round(lerp(A[2], B[2], t)) + ')';
    }
    function withAlpha(hex, a) {
      const c = hex2rgb(hex);
      return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
    }

    /* ---------- 雨 / 云 / 星 / 车灯 ---------- */
    function seedWeatherBits() {
      const r = rng(scene.seed + 1301);
      scene.drops = [];
      for (let i = 0; i < scene.q.rain; i++) scene.drops.push(makeDrop(r, true));

      scene.stars = [];
      for (let i = 0; i < 46; i++) {
        scene.stars.push({
          x: r.r(0, scene.W),
          y: r.r(0, scene.horizon * 0.52),
          a: r.r(0.08, 0.4),
          ph: r.r(0, TAU),
        });
      }

      scene.clouds = [];
      for (let i = 0; i < scene.q.clouds; i++) {
        scene.clouds.push({
          x: r.r(-0.2, 1.2) * scene.W,
          y: r.r(0.02, 0.42) * scene.horizon,
          s: r.r(0.8, 2.6),
          a: r.r(0.05, 0.16),
          v: r.r(2, 7),
        });
      }

      scene.headlights = [];
      for (let i = 0; i < 7; i++) {
        scene.headlights.push({
          x: r.r(0, scene.W),
          y: scene.horizon + r.r(6, 54),
          v: r.chance(0.5) ? r.r(70, 190) : -r.r(70, 190),
          w: r.r(18, 62),
          a: r.r(0.25, 0.8),
          warm: r.chance(0.45),
        });
      }
      scene.ripples = [];
    }

    function makeDrop(r, spread) {
      return {
        x: r.r(-0.1, 1.1) * scene.W,
        y: spread ? r.r(-scene.H, scene.horizon) : -r.r(10, 200),
        len: r.r(9, 34),
        v: r.r(560, 1180),
        a: r.r(0.1, 0.42),
        w: r.chance(0.15) ? 1.4 : 0.8,
      };
    }

    function makeCloudSprite() {
      const S = 256;
      const cv = D.createElement('canvas');
      cv.width = S;
      cv.height = S / 2;
      const g = cv.getContext('2d');
      const r = rng(4242);
      for (let i = 0; i < 16; i++) {
        const cx = r.r(0.15, 0.85) * S;
        const cy = r.r(0.35, 0.7) * (S / 2);
        const rad = r.r(0.08, 0.22) * S;
        const grd = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
        grd.addColorStop(0, 'rgba(120,150,210,0.5)');
        grd.addColorStop(1, 'rgba(120,150,210,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(cx, cy, rad, 0, TAU);
        g.fill();
      }
      return cv;
    }

    function makeGrainSprite() {
      const S = 128;
      const cv = D.createElement('canvas');
      cv.width = S;
      cv.height = S;
      const g = cv.getContext('2d');
      const img = g.createImageData(S, S);
      const r = mulberry32(9182);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 120 + r() * 135;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 26;
      }
      g.putImageData(img, 0, 0);
      return cv;
    }

    /* ---------- 生成 / 重建 ---------- */
    function generate() {
      scene.layers = LAYERS.map(buildLayer);
      seedWeatherBits();
      if (!scene.cloudSprite) scene.cloudSprite = makeCloudSprite();
      if (!scene.grainSprite) scene.grainSprite = makeGrainSprite();
      scene.aircraft = null;
      scene.train = null;
      scene.trainTimer = 8;
    }

    /* ---------- 渲染分段 ---------- */
    function drawSky() {
      const W = scene.W;
      const H = scene.H;
      const hz = scene.horizon;

      const sky = ctx.createLinearGradient(0, 0, 0, hz);
      sky.addColorStop(0, '#04060e');
      sky.addColorStop(0.42, '#070d1e');
      sky.addColorStop(0.76, '#101a33');
      sky.addColorStop(1, '#1d2647');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, hz + 2);

      // 星（多被城市辉光吞掉）
      if (scene.q !== QUALITY.low) {
        for (let i = 0; i < scene.stars.length; i++) {
          const s = scene.stars[i];
          const tw = 0.6 + 0.4 * Math.sin(scene.t * 1.4 + s.ph);
          ctx.fillStyle = 'rgba(220,235,255,' + (s.a * tw).toFixed(3) + ')';
          ctx.fillRect(s.x, s.y, 1.2, 1.2);
        }
      }

      // 月：被云翳遮住的一枚冷光
      const mx = W * 0.82;
      const my = hz * 0.16;
      const halo = ctx.createRadialGradient(mx, my, 0, mx, my, hz * 0.42);
      halo.addColorStop(0, 'rgba(190,215,255,0.2)');
      halo.addColorStop(0.35, 'rgba(150,185,255,0.07)');
      halo.addColorStop(1, 'rgba(150,185,255,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(mx - hz * 0.45, my - hz * 0.45, hz * 0.9, hz * 0.9);
      // 月盘本身也蒙着水汽，不给硬边
      const mr = Math.max(7, hz * 0.026);
      const disc = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 1.7);
      disc.addColorStop(0, 'rgba(232,242,255,0.42)');
      disc.addColorStop(0.52, 'rgba(214,230,255,0.26)');
      disc.addColorStop(1, 'rgba(200,222,255,0)');
      ctx.fillStyle = disc;
      ctx.fillRect(mx - mr * 1.8, my - mr * 1.8, mr * 3.6, mr * 3.6);

      // 云层
      ctx.globalAlpha = 1;
      for (let i = 0; i < scene.clouds.length; i++) {
        const c = scene.clouds[i];
        const w = 256 * c.s;
        const h = 128 * c.s;
        ctx.globalAlpha = c.a;
        ctx.drawImage(scene.cloudSprite, c.x - w / 2, c.y - h / 2, w, h);
      }
      ctx.globalAlpha = 1;

      // 地平线城市辉光（光污染）
      const glow = ctx.createLinearGradient(0, hz - hz * 0.42, 0, hz);
      glow.addColorStop(0, 'rgba(255,150,90,0)');
      glow.addColorStop(0.6, 'rgba(255,140,80,0.06)');
      glow.addColorStop(1, 'rgba(255,170,110,0.17)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, hz - hz * 0.42, W, hz * 0.42);

      const glow2 = ctx.createRadialGradient(W * 0.3, hz, 0, W * 0.3, hz, W * 0.5);
      glow2.addColorStop(0, 'rgba(79,227,255,0.1)');
      glow2.addColorStop(1, 'rgba(79,227,255,0)');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, hz - W * 0.5, W, W * 0.5);
    }

    function layerOffset(layer) {
      const P = layer.def.parallax;
      const drift = settings.calm ? 0 : Math.sin(scene.t * 0.06) * P * 0.32;
      const dx = -P + (-scene.pointer.x * P * 0.9 + drift);
      const dy = scene.horizon - layer.genHorizon + -scene.pointer.y * P * 0.22;
      return { dx, dy };
    }

    function drawLayer(layer) {
      const off = layerOffset(layer);
      ctx.drawImage(
        layer.canvas,
        0, 0, layer.canvas.width, layer.canvas.height,
        off.dx, off.dy, layer.cssW, layer.cssH
      );

      // 会呼吸的窗户
      if (!settings.calm) {
        for (let i = 0; i < layer.flickers.length; i++) {
          const f = layer.flickers[i];
          const s = Math.sin(scene.t * f.sp + f.ph);
          if (s > -0.2) continue;
          ctx.fillStyle = f.bg;
          ctx.fillRect(off.dx + f.x, off.dy + f.y, f.w, f.h);
          const a = f.a * clamp((s + 1) * 0.9, 0, 1);
          if (a > 0.02) {
            ctx.fillStyle = withAlpha(f.col, a);
            ctx.fillRect(off.dx + f.x, off.dy + f.y, f.w, f.h);
          }
        }
      }

      // 障碍灯
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < layer.beacons.length; i++) {
        const b = layer.beacons[i];
        const blink = Math.pow(Math.max(0, Math.sin(scene.t * 1.7 + b.ph)), 8);
        if (blink < 0.02) continue;
        const bx = off.dx + b.x;
        const by = off.dy + b.y;
        const grd = ctx.createRadialGradient(bx, by, 0, bx, by, b.r * 6);
        grd.addColorStop(0, 'rgba(255,80,80,' + (0.9 * blink).toFixed(3) + ')');
        grd.addColorStop(1, 'rgba(255,60,60,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(bx - b.r * 6, by - b.r * 6, b.r * 12, b.r * 12);
      }

      // 灯牌辉光
      if (settings.bloom) {
        for (let i = 0; i < layer.signs.length; i++) {
          const s = layer.signs[i];
          let a = s.base * (0.82 + 0.18 * Math.sin(scene.t * s.sp + s.ph));
          if (s.broken && !settings.calm) {
            const n = Math.sin(scene.t * 13.7 + s.ph) * Math.sin(scene.t * 5.1 + s.ph * 2);
            a *= n > 0.55 ? 0.15 : 1;
          }

          // 雨里的一柱光
          if (s.shaft) {
            const cx = off.dx + s.x + s.sprite.w / 2;
            const cy = off.dy + s.y + s.sprite.h * 0.85;
            const len = s.shaft;
            const w0 = s.sprite.w * 0.55;
            const w1 = s.sprite.w * 1.9;
            const grd = ctx.createLinearGradient(cx, cy, cx, cy + len);
            grd.addColorStop(0, s.neon.g + (0.14 * a).toFixed(3) + ')');
            grd.addColorStop(0.55, s.neon.g + (0.05 * a).toFixed(3) + ')');
            grd.addColorStop(1, s.neon.g + '0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.moveTo(cx - w0, cy);
            ctx.lineTo(cx + w0, cy);
            ctx.lineTo(cx + w1, cy + len);
            ctx.lineTo(cx - w1, cy + len);
            ctx.closePath();
            ctx.fill();
          }

          ctx.globalAlpha = clamp(a, 0, 1);
          ctx.drawImage(
            s.sprite.canvas,
            0, 0, s.sprite.canvas.width, s.sprite.canvas.height,
            off.dx + s.x, off.dy + s.y, s.sprite.w, s.sprite.h
          );
        }
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawHaze(yTop, height, alpha, phase) {
      const a = alpha * (0.75 + 0.25 * Math.sin(scene.t * 0.22 + phase));
      const grd = ctx.createLinearGradient(0, yTop, 0, yTop + height);
      grd.addColorStop(0, 'rgba(90,120,175,0)');
      grd.addColorStop(0.55, 'rgba(90,120,175,' + (a * 0.7).toFixed(3) + ')');
      grd.addColorStop(1, 'rgba(110,135,190,' + a.toFixed(3) + ')');
      ctx.fillStyle = grd;
      ctx.fillRect(0, yTop, scene.W, height);
    }

    function drawTrain(dt) {
      if (!scene.train) {
        scene.trainTimer -= dt;
        if (scene.trainTimer <= 0) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          const len = clamp(scene.W * 0.34, 160, 460);
          scene.train = {
            dir,
            len,
            x: dir > 0 ? -len - 30 : scene.W + 30,
            y: scene.horizon - clamp(scene.horizon * 0.18, 40, 120),
            v: clamp(scene.W * 0.22, 110, 320),
            h: clamp(scene.W * 0.011, 7, 15),
          };
        }
        return;
      }
      const tr = scene.train;
      tr.x += tr.dir * tr.v * dt;
      if ((tr.dir > 0 && tr.x > scene.W + 40) || (tr.dir < 0 && tr.x + tr.len < -40)) {
        scene.train = null;
        scene.trainTimer = 14 + Math.random() * 16;
        return;
      }

      // 高架轨道
      ctx.fillStyle = 'rgba(18,26,46,0.85)';
      ctx.fillRect(0, tr.y + tr.h, scene.W, 2.5);

      // 车厢
      ctx.fillStyle = 'rgba(24,34,58,0.95)';
      roundRect(ctx, tr.x, tr.y, tr.len, tr.h, tr.h * 0.28);
      ctx.fill();

      // 车窗
      ctx.globalCompositeOperation = 'lighter';
      const step = tr.h * 1.15;
      for (let i = tr.h * 0.5; i < tr.len - tr.h * 0.5; i += step) {
        const a = 0.55 + 0.35 * Math.sin(i * 0.7 + scene.t * 3);
        ctx.fillStyle = 'rgba(210,236,255,' + a.toFixed(3) + ')';
        ctx.fillRect(tr.x + i, tr.y + tr.h * 0.22, step * 0.55, tr.h * 0.5);
      }
      // 拖影
      const gx = tr.dir > 0 ? tr.x : tr.x + tr.len;
      const grd = ctx.createLinearGradient(gx - tr.dir * tr.len * 0.6, 0, gx, 0);
      grd.addColorStop(0, 'rgba(150,215,255,0)');
      grd.addColorStop(1, 'rgba(150,215,255,0.16)');
      ctx.fillStyle = grd;
      ctx.fillRect(Math.min(gx, gx - tr.dir * tr.len * 0.6), tr.y, tr.len * 0.6, tr.h);
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawAircraft(dt) {
      if (!scene.aircraft) {
        if (Math.random() < dt * 0.035) {
          scene.aircraft = {
            x: -40,
            y: scene.horizon * (0.1 + Math.random() * 0.35),
            v: 22 + Math.random() * 26,
            ph: Math.random() * TAU,
          };
        }
        return;
      }
      const a = scene.aircraft;
      a.x += a.v * dt;
      a.y -= a.v * dt * 0.06;
      if (a.x > scene.W + 40) {
        scene.aircraft = null;
        return;
      }
      ctx.globalCompositeOperation = 'lighter';
      const blink = Math.pow(Math.max(0, Math.sin(scene.t * 3.1 + a.ph)), 6);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(a.x, a.y, 1.6, 1.6);
      if (blink > 0.05) {
        ctx.fillStyle = 'rgba(255,90,90,' + (0.9 * blink).toFixed(3) + ')';
        ctx.fillRect(a.x - 3, a.y + 0.5, 2, 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawStreet(dt) {
      const hz = scene.horizon;
      const H = scene.H;
      const W = scene.W;
      const bandH = H - hz;

      // 湿沥青
      const road = ctx.createLinearGradient(0, hz, 0, H);
      road.addColorStop(0, '#111a30');
      road.addColorStop(0.22, '#0a1122');
      road.addColorStop(1, '#04060e');
      ctx.fillStyle = road;
      ctx.fillRect(0, hz, W, bandH);

      // 倒影：把天际线按切片抹进水面
      if (settings.bloom && scene.q.reflect) {
        const slice = scene.q.slice;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, hz, W, bandH);
        ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        for (let li = 1; li < scene.layers.length; li++) {
          const layer = scene.layers[li];
          const off = layerOffset(layer);
          const px = layer.px;
          const maxD = Math.min(bandH, hz * 0.55);
          for (let d = 0; d < maxD; d += slice) {
            const srcY = layer.genHorizon - d - slice;
            if (srcY < 0) break;
            const fade = (1 - d / maxD) * 0.44 * (li === 2 ? 1 : 0.62);
            if (fade <= 0.005) continue;
            const wob = settings.calm ? 0 : Math.sin(d * 0.09 + scene.t * 1.9) * (0.8 + d * 0.055);
            ctx.globalAlpha = fade;
            ctx.drawImage(
              layer.canvas,
              0, srcY * px, layer.canvas.width, slice * px,
              off.dx + wob, hz + d, layer.cssW, slice + 0.6
            );
          }
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      }

      // 车灯拖影
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < scene.headlights.length; i++) {
        const c = scene.headlights[i];
        c.x += c.v * dt;
        if (c.v > 0 && c.x > W + c.w) c.x = -c.w - Math.random() * 200;
        if (c.v < 0 && c.x < -c.w) c.x = W + c.w + Math.random() * 200;
        const x0 = c.v > 0 ? c.x - c.w : c.x;
        const grd = ctx.createLinearGradient(x0, 0, x0 + c.w, 0);
        const col = c.warm ? '255,190,120' : '190,225,255';
        grd.addColorStop(c.v > 0 ? 0 : 1, 'rgba(' + col + ',0)');
        grd.addColorStop(c.v > 0 ? 1 : 0, 'rgba(' + col + ',' + c.a.toFixed(2) + ')');
        ctx.fillStyle = grd;
        ctx.fillRect(x0, c.y, c.w, 2.2);
        // 水面拉长的反射
        ctx.globalAlpha = 0.32;
        ctx.fillRect(x0, c.y + 4, c.w, 9);
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'source-over';

      // 涟漪
      if (settings.rain && !settings.calm) {
        if (Math.random() < scene.rainScale * 0.9) {
          scene.ripples.push({
            x: Math.random() * W,
            y: hz + Math.random() * bandH,
            r: 0,
            max: 4 + Math.random() * 14,
            a: 0.16 + Math.random() * 0.16,
          });
        }
        for (let i = scene.ripples.length - 1; i >= 0; i--) {
          const rp = scene.ripples[i];
          rp.r += dt * 26;
          if (rp.r <= 0 || rp.r > rp.max) {
            scene.ripples.splice(i, 1);
            continue;
          }
          const k = 1 - rp.r / rp.max;
          ctx.strokeStyle = 'rgba(175,210,255,' + (rp.a * k).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.32, 0, 0, TAU);
          ctx.stroke();
        }
      }

      // 积水的横向反光条
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const y = hz + bandH * (0.12 + i * 0.17);
        const a = 0.03 + 0.022 * Math.sin(scene.t * 0.5 + i);
        const grd = ctx.createLinearGradient(0, y, W, y);
        grd.addColorStop(0, 'rgba(120,170,235,0)');
        grd.addColorStop(0.4, 'rgba(140,190,245,' + a.toFixed(3) + ')');
        grd.addColorStop(0.7, 'rgba(255,190,130,' + (a * 0.7).toFixed(3) + ')');
        grd.addColorStop(1, 'rgba(120,170,235,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, y, W, bandH * 0.09);
      }
      ctx.globalCompositeOperation = 'source-over';

      // 近处路面压暗，把 UI 托住
      const dark = ctx.createLinearGradient(0, H - bandH * 0.55, 0, H);
      dark.addColorStop(0, 'rgba(3,5,12,0)');
      dark.addColorStop(1, 'rgba(3,5,12,0.66)');
      ctx.fillStyle = dark;
      ctx.fillRect(0, H - bandH * 0.55, W, bandH * 0.55);
    }

    function drawRain(dt) {
      if (!settings.rain || scene.rainScale < 0.05) return;
      const wind = Math.sin(scene.t * 0.31) * 0.16 + 0.13;
      const count = Math.round(scene.drops.length * clamp(scene.rainScale, 0, 1.5));
      const buckets = [[], [], []];
      for (let i = 0; i < count && i < scene.drops.length; i++) {
        const d = scene.drops[i];
        d.y += d.v * dt;
        d.x += d.v * dt * wind;
        if (d.y > scene.H + 20 || d.x > scene.W + 60 || d.x < -60) {
          d.y = -Math.random() * 160;
          d.x = -0.1 * scene.W + Math.random() * scene.W * 1.2;
        }
        buckets[d.w > 1 ? 2 : d.a > 0.28 ? 1 : 0].push(d);
      }
      const styles = ['rgba(178,208,245,0.2)', 'rgba(205,228,255,0.36)', 'rgba(225,242,255,0.55)'];
      const widths = [0.7, 0.9, 1.4];
      for (let b = 0; b < 3; b++) {
        if (!buckets[b].length) continue;
        ctx.strokeStyle = styles[b];
        ctx.lineWidth = widths[b];
        ctx.beginPath();
        for (let i = 0; i < buckets[b].length; i++) {
          const d = buckets[b][i];
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.len * wind, d.y - d.len);
        }
        ctx.stroke();
      }
    }

    function drawLightning(dt) {
      if (settings.calm) return;
      scene.lightningTimer -= dt;
      if (scene.lightningTimer <= 0 && scene.rainScale > 0.9) {
        scene.lightning = 0.7;
        scene.lightningTimer = 22 + Math.random() * 40;
      }
      if (scene.lightning > 0) {
        scene.lightning = Math.max(0, scene.lightning - dt * 2.6);
        const f = scene.lightning * (Math.random() > 0.4 ? 1 : 0.25);
        ctx.fillStyle = 'rgba(190,215,255,' + (f * 0.16).toFixed(3) + ')';
        ctx.fillRect(0, 0, scene.W, scene.H);
      }
    }

    function drawGrain() {
      if (!scene.q.grain || settings.calm) return;
      const s = scene.grainSprite;
      const ox = -Math.random() * 128;
      const oy = -Math.random() * 128;
      ctx.globalAlpha = 0.5;
      ctx.globalCompositeOperation = 'overlay';
      for (let x = ox; x < scene.W; x += 128) {
        for (let y = oy; y < scene.H; y += 128) ctx.drawImage(s, x, y);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    /* ---------- 城市呼吸：偶尔有人开关灯 ---------- */
    function mutateWindows() {
      if (scene.t - scene.lastMutate < 1.6 || settings.calm) return;
      scene.lastMutate = scene.t;
      for (let n = 0; n < 3; n++) {
        const layer = scene.layers[1 + Math.floor(Math.random() * 2)];
        if (!layer || !layer.flickers.length) continue;
        const f = layer.flickers[Math.floor(Math.random() * layer.flickers.length)];
        const g = layer.ctx;
        g.fillStyle = f.bg;
        g.fillRect(f.x, f.y, f.w, f.h);
        if (Math.random() < 0.55) {
          g.fillStyle = withAlpha(f.col, f.a);
          g.fillRect(f.x, f.y, f.w, f.h);
        }
      }
    }

    /* ---------- 主循环 ---------- */
    let last = 0;
    function frame(now) {
      if (!scene.running) return;
      scene.raf = requestAnimationFrame(frame);
      // rAF 的时间戳可能早于 start() 里记录的 performance.now()，须夹住下界
      const dt = clamp((now - last) / 1000, 0.001, 0.05);
      last = now;
      scene.t += dt;

      // 指针平滑
      scene.pointer.x = lerp(scene.pointer.x, scene.pointer.tx, 1 - Math.pow(0.001, dt));
      scene.pointer.y = lerp(scene.pointer.y, scene.pointer.ty, 1 - Math.pow(0.001, dt));
      scene.rainScale = lerp(scene.rainScale, scene.rainTarget, 1 - Math.pow(0.2, dt));

      for (let i = 0; i < scene.clouds.length; i++) {
        const c = scene.clouds[i];
        c.x += c.v * dt * 0.14;
        if (c.x - 256 * c.s > scene.W) c.x = -256 * c.s;
      }

      drawSky();
      drawAircraft(dt);
      drawLayer(scene.layers[0]);
      drawHaze(scene.horizon - scene.horizon * 0.3, scene.horizon * 0.3, 0.1, 0);
      drawLayer(scene.layers[1]);
      drawTrain(dt);
      drawHaze(scene.horizon - scene.horizon * 0.2, scene.horizon * 0.2, 0.07, 2);
      drawLayer(scene.layers[2]);
      drawStreet(dt);
      drawRain(dt);
      drawLightning(dt);
      drawGrain();
      mutateWindows();

      sampleFps(dt);
    }

    function sampleFps(dt) {
      if (!settings.qualityAuto || settings.quality === 'low') return;
      // 重新生成场景后会有一段抖动，先让它稳下来
      if (scene.t - scene.lastDowngrade < 6) return;
      scene.frameSamples.push(dt);
      if (scene.frameSamples.length < 180) return;
      const avg = scene.frameSamples.reduce((a, b) => a + b, 0) / scene.frameSamples.length;
      scene.frameSamples.length = 0;
      if (avg > 0.033) {
        const next = settings.quality === 'high' ? 'medium' : 'low';
        api.setQuality(next, true);
        scene.lastDowngrade = scene.t;
        D.dispatchEvent(new CustomEvent('fucheng:quality', { detail: next }));
      }
    }

    /* ---------- 对外接口 ---------- */
    const api = {
      scene,
      start() {
        if (scene.running) return;
        scene.running = true;
        last = performance.now();
        scene.raf = requestAnimationFrame(frame);
      },
      stop() {
        scene.running = false;
        cancelAnimationFrame(scene.raf);
      },
      init() {
        measure();
        generate();
        api.start();
      },
      resize() {
        const structural = measure();
        if (structural) generate();
        else seedWeatherBits();
      },
      setQuality(q, auto) {
        settings.quality = q;
        if (!auto) settings.qualityAuto = false;
        scene.q = QUALITY[q] || QUALITY.high;
        D.body.dataset.quality = q;
        saveSettings();
        measure();
        generate();
      },
      setRainTarget(v) {
        scene.rainTarget = v;
      },
      look(nx, ny) {
        scene.pointer.tx = clamp(nx, -1, 1);
        scene.pointer.ty = clamp(ny, -1, 1);
      },
    };
    return api;
  }

  /* ---------------------------------------------------------
     4. 环境音（程序生成，无外部素材）
     --------------------------------------------------------- */
  const Ambience = (function () {
    let actx = null;
    let master = null;
    let nodes = [];

    function noiseBuffer(ctx, seconds) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
      const data = buf.getChannelData(0);
      const r = mulberry32(777);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < data.length; i++) {
        const white = r() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099;
        b1 = 0.963 * b1 + white * 0.2965;
        b2 = 0.57 * b2 + white * 1.0526;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.16;
      }
      return buf;
    }

    return {
      start(volume) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        if (!actx) {
          actx = new AC();
          master = actx.createGain();
          master.gain.value = 0;
          master.connect(actx.destination);

          const buf = noiseBuffer(actx, 3);

          // 雨声：带通白噪 + 缓慢起伏
          const rain = actx.createBufferSource();
          rain.buffer = buf;
          rain.loop = true;
          const bp = actx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 1450;
          bp.Q.value = 0.55;
          const rainGain = actx.createGain();
          rainGain.gain.value = 0.85;
          rain.connect(bp).connect(rainGain).connect(master);

          // 城市底噪：低通轰鸣
          const hum = actx.createBufferSource();
          hum.buffer = buf;
          hum.loop = true;
          const lp = actx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 190;
          const humGain = actx.createGain();
          humGain.gain.value = 0.5;
          hum.connect(lp).connect(humGain).connect(master);

          // 风的起伏
          const lfo = actx.createOscillator();
          lfo.frequency.value = 0.06;
          const lfoGain = actx.createGain();
          lfoGain.gain.value = 340;
          lfo.connect(lfoGain).connect(bp.frequency);

          rain.start(0);
          hum.start(0);
          lfo.start(0);
          nodes = [rain, hum, lfo];
        }
        if (actx.state === 'suspended') actx.resume();
        this.setVolume(volume);
        return true;
      },
      stop() {
        if (!master) return;
        master.gain.cancelScheduledValues(actx.currentTime);
        master.gain.setTargetAtTime(0, actx.currentTime, 0.4);
      },
      setVolume(v) {
        if (!master) return;
        const g = Math.pow(clamp(v, 0, 100) / 100, 1.7) * 0.5;
        master.gain.setTargetAtTime(g, actx.currentTime, 0.3);
      },
    };
  })();

  /* ---------------------------------------------------------
     5. 界面：启动序列 / 时钟 / 箴言 / 分层高亮
     --------------------------------------------------------- */
  const EPIGRAPHS = [
    '「没钱的人没有秘密。账单就是他们的隐私。」',
    '「钱是氧气。稀薄的时候，连呼吸都要计价。」',
    '「人情是第二货币，只是从来没有汇率表。」',
    '「账单比闹钟准时，它不设贪睡键。」',
    '「霓虹沉默，潮汐准时。城市不问你今天过得好不好。」',
    '「地铁早高峰，一百万人同时决定不迟到。」',
    '「城中村的灯牌亮到三点，CBD 的玻璃亮到天明。」',
    '「上升通道里没有电梯，只有楼梯和排队的人。」',
    '「房租每年长个子，工资每年装睡。」',
  ];

  const WEATHERS = [
    { name: '小雨', temp: 12, rain: 0.8 },
    { name: '中雨', temp: 11, rain: 1.2 },
    { name: '雨转阴', temp: 13, rain: 0.35 },
    { name: '夜雾', temp: 14, rain: 0.12 },
    { name: '雷雨', temp: 10, rain: 1.45 },
  ];

  function initBoot(onDone) {
    const boot = $('#boot');
    if (!boot) return onDone();
    const lines = $$('.boot__log li', boot);
    const bar = $('.boot__bar span', boot);
    const step = settings.calm || prefersCalm ? 70 : 190;
    let done = false;
    const timers = [];

    lines.forEach((li, i) => {
      timers.push(setTimeout(() => li.classList.add('is-on'), 120 + i * step));
      timers.push(setTimeout(() => li.classList.add('is-ok'), 120 + i * step + step * 0.75));
      timers.push(
        setTimeout(() => {
          if (bar) bar.style.width = Math.round(((i + 1) / lines.length) * 100) + '%';
        }, 120 + i * step + step * 0.6)
      );
    });

    function finish() {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      if (bar) bar.style.width = '100%';
      boot.classList.add('is-done');
      setTimeout(() => {
        D.body.dataset.boot = 'off';
        onDone();
      }, 700);
    }

    timers.push(setTimeout(finish, 240 + lines.length * step + 420));
    boot.addEventListener('pointerdown', finish);
    D.addEventListener('keydown', function once(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        D.removeEventListener('keydown', once);
        finish();
      }
    });
  }

  function initClock(city) {
    const el = $('#cityClock');
    const wEl = $('#cityWeather');
    let minutes = 23 * 60 + 47;
    let wIndex = 0;

    function applyWeather() {
      const w = WEATHERS[wIndex];
      if (wEl) wEl.textContent = w.name + ' · ' + w.temp + '°C';
      city.setRainTarget(settings.rain ? w.rain : 0);
    }
    applyWeather();

    setInterval(() => {
      minutes = (minutes + 1) % 1440;
      if (el) {
        const h = String(Math.floor(minutes / 60)).padStart(2, '0');
        const m = String(minutes % 60).padStart(2, '0');
        el.textContent = h + ':' + m;
      }
    }, 1600);

    setInterval(() => {
      wIndex = (wIndex + 1 + Math.floor(Math.random() * 2)) % WEATHERS.length;
      applyWeather();
    }, 78000);

    return { applyWeather };
  }

  function initEpigraph() {
    const host = $('#epigraph');
    if (!host) return;
    const quote = $('.epigraph__quote', host);
    let i = 0;
    setInterval(() => {
      i = (i + 1) % EPIGRAPHS.length;
      quote.classList.add('is-out');
      setTimeout(() => {
        quote.textContent = EPIGRAPHS[i];
        quote.classList.remove('is-out');
      }, 560);
    }, 7600);
  }

  function initStrata() {
    const items = $$('.strata__item');
    if (!items.length) return;
    let i = items.length - 1;
    const tick = () => {
      items.forEach((el) => el.classList.remove('is-live'));
      items[i].classList.add('is-live');
      i = (i - 1 + items.length) % items.length;
    };
    tick();
    setInterval(tick, 2200);
  }

  /* ---------------------------------------------------------
     6. Toast
     --------------------------------------------------------- */
  let toastTimer = 0;
  function toast(text, ms) {
    const el = $('#toast');
    if (!el) return;
    $('.toast__text', el).textContent = text;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('is-on');
      setTimeout(() => {
        el.hidden = true;
      }, 400);
    }, ms || 2800);
  }

  /* ---------------------------------------------------------
     7. 路由：与后续界面对接，缺页时优雅提示
     --------------------------------------------------------- */
  /* 后续界面通过 routes.json（或页面内的 window.FUCHENG_ROUTES）声明入口；
     没有声明时再回落到探测，探测失败则给出提示而不是把用户丢到 404。 */
  const FALLBACK_PROBES = {
    'new-game': ['register.html', 'origin.html'],
    continue: ['dashboard.html', 'city.html'],
  };
  const routes = Object.assign({}, window.FUCHENG_ROUTES || {});
  const declared = Object.keys(routes);
  const routeCache = {};

  function loadRouteManifest() {
    if (typeof fetch !== 'function' || location.protocol === 'file:') return Promise.resolve();
    return fetch('routes.json', { cache: 'no-store' })
      .then((res) => (res && res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return;
        Object.keys(json).forEach((k) => {
          if (k.charAt(0) === '$') return;
          declared.push(k);
          if (json[k] && !routes[k]) routes[k] = json[k];
        });
      })
      .catch(() => {});
  }

  function resolveRoute(action) {
    if (routes[action]) return Promise.resolve(routes[action]);
    // 清单里已显式登记为空，就不再逐个探测（避免无谓的 404）
    if (declared.indexOf(action) >= 0) return Promise.resolve(null);
    if (routeCache[action] !== undefined) return Promise.resolve(routeCache[action]);
    if (typeof fetch !== 'function' || location.protocol === 'file:') {
      routeCache[action] = null;
      return Promise.resolve(null);
    }
    let chain = Promise.resolve(null);
    (FALLBACK_PROBES[action] || []).forEach((path) => {
      chain = chain.then((found) => {
        if (found) return found;
        return fetch(path, { method: 'HEAD', cache: 'no-store' })
          .then((res) => (res && res.ok ? path : null))
          .catch(() => null);
      });
    });
    return chain.then((found) => {
      routeCache[action] = found;
      return found;
    });
  }

  function leaveTo(href) {
    D.body.classList.add('is-leaving');
    setTimeout(() => {
      window.location.href = href;
    }, 520);
  }

  /* ---------------------------------------------------------
     8. 设置面板
     --------------------------------------------------------- */
  function initSettings(city, clock) {
    const modal = $('#settingsModal');
    if (!modal) return { open() {}, close() {} };
    const panel = $('.modal__panel', modal);
    let lastFocus = null;

    const rainBox = $('#setRain');
    const bloomBox = $('#setBloom');
    const audioBox = $('#setAudio');
    const calmBox = $('#setCalm');
    const volume = $('#setVolume');
    const volumeOut = $('#volumeOut');

    function syncUI() {
      rainBox.checked = !!settings.rain;
      bloomBox.checked = !!settings.bloom;
      audioBox.checked = !!settings.audio;
      calmBox.checked = !!settings.calm;
      volume.value = settings.volume;
      volumeOut.textContent = settings.volume;
      volume.style.setProperty('--fill', settings.volume + '%');
      $$('[data-quality-set]', modal).forEach((b) => {
        b.setAttribute('aria-checked', String(b.dataset.qualitySet === settings.quality));
      });
      D.body.classList.toggle('is-calm', !!settings.calm);
      D.body.dataset.quality = settings.quality;
    }

    function open() {
      lastFocus = D.activeElement;
      modal.hidden = false;
      syncUI();
      const first = $('button, input, [tabindex]', panel);
      if (first) first.focus();
    }
    function close() {
      modal.hidden = true;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    $$('[data-close]', modal).forEach((el) => el.addEventListener('click', close));

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = $$('button, input[type="checkbox"], input[type="range"]', panel).filter(
        (el) => !el.disabled && el.offsetParent !== null
      );
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && D.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && D.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    $$('[data-quality-set]', modal).forEach((btn) => {
      btn.addEventListener('click', () => {
        city.setQuality(btn.dataset.qualitySet, false);
        syncUI();
        toast('画质已切换：' + btn.textContent.trim());
      });
    });

    rainBox.addEventListener('change', () => {
      settings.rain = rainBox.checked;
      saveSettings();
      clock.applyWeather();
    });

    bloomBox.addEventListener('change', () => {
      settings.bloom = bloomBox.checked;
      saveSettings();
    });

    calmBox.addEventListener('change', () => {
      settings.calm = calmBox.checked;
      saveSettings();
      D.body.classList.toggle('is-calm', settings.calm);
      if (settings.calm) city.look(0, 0);
    });

    audioBox.addEventListener('change', () => {
      settings.audio = audioBox.checked;
      saveSettings();
      if (settings.audio) {
        const ok = Ambience.start(settings.volume);
        if (!ok) {
          settings.audio = false;
          audioBox.checked = false;
          toast('当前环境不支持音频输出');
        }
      } else {
        Ambience.stop();
      }
    });

    volume.addEventListener('input', () => {
      settings.volume = Number(volume.value);
      volumeOut.textContent = settings.volume;
      volume.style.setProperty('--fill', settings.volume + '%');
      if (settings.audio) Ambience.setVolume(settings.volume);
    });
    volume.addEventListener('change', saveSettings);

    $('#btnResetSettings').addEventListener('click', () => {
      Object.assign(settings, DEFAULTS, { calm: prefersCalm });
      saveSettings();
      Ambience.stop();
      city.setQuality(settings.quality, true);
      settings.qualityAuto = true;
      clock.applyWeather();
      syncUI();
      toast('已恢复默认设置');
    });

    syncUI();
    return { open, close, syncUI };
  }

  /* ---------------------------------------------------------
     9. 菜单
     --------------------------------------------------------- */
  // screens.js 若已载入就用它的中文名，否则退回 id
  function nameOf(collection, id, fallback) {
    const list = window.FC && window.FC[collection];
    if (list) {
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i].name;
      }
    }
    return fallback || id;
  }

  function loadSave() {
    for (let i = 0; i < SAVE_KEYS.length; i++) {
      const v = readStore(SAVE_KEYS[i], null);
      if (v && typeof v === 'object' && (v.eraId || v.originId || v.month || v.age)) return v;
    }
    return null;
  }

  function initMenu(panel) {
    const menu = $('.menu');
    const btnContinue = $('#btnContinue');
    const meta = $('#continueMeta');
    const save = loadSave();

    if (!save && btnContinue) {
      btnContinue.classList.add('is-locked');
      btnContinue.setAttribute('aria-disabled', 'true');
      if (meta) meta.textContent = 'CONTINUE · 尚无存档';
    } else if (save && meta) {
      const bits = [];
      if (save.eraId) bits.push(save.eraId + ' ' + nameOf('ERAS', save.eraId, ''));
      if (save.originId) bits.push(nameOf('ORIGINS', save.originId, '出身'));
      meta.textContent = bits.length
        ? 'CONTINUE · ' + bits.join(' · ').replace(/\s+/g, ' ').trim()
        : 'CONTINUE · 读取上次存档';
    }

    function act(action, el) {
      if (el && el.getAttribute('aria-disabled') === 'true') {
        toast('尚无存档。先完成一次入城登记。');
        return;
      }
      if (action === 'settings') {
        panel.open();
        return;
      }
      resolveRoute(action).then((href) => {
        if (href) {
          leaveTo(href);
        } else if (action === 'new-game') {
          toast('入城登记模块正在接入——年代 E1–E7 与出身选择即将开放。', 3400);
        } else {
          toast('人生仪表盘正在接入。', 3000);
        }
      });
    }

    $$('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => act(btn.dataset.action, btn));
    });

    const quick = $('#btnQuickSettings');
    if (quick) quick.addEventListener('click', () => panel.open());

    // 方向键在菜单内移动焦点
    if (menu) {
      menu.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const items = $$('.mbtn', menu);
        const i = items.indexOf(D.activeElement);
        if (i < 0) return;
        e.preventDefault();
        const next = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next].focus();
      });
    }
  }

  /* ---------------------------------------------------------
     10. 启动
     --------------------------------------------------------- */
  function boot() {
    const canvas = $('#cityCanvas');
    D.body.dataset.quality = settings.quality;
    D.body.classList.toggle('is-calm', !!settings.calm);

    const city = CityScene(canvas);
    city.init();
    loadRouteManifest();

    const clock = initClock(city);
    const panel = initSettings(city, clock);
    initMenu(panel);
    initEpigraph();
    initStrata();

    if (settings.audio) {
      // 自动播放策略：等一次用户手势
      const kick = () => {
        Ambience.start(settings.volume);
        D.removeEventListener('pointerdown', kick);
        D.removeEventListener('keydown', kick);
      };
      D.addEventListener('pointerdown', kick, { once: true });
      D.addEventListener('keydown', kick, { once: true });
    }

    // 视差
    let pointerRaf = 0;
    function look(cx, cy) {
      if (settings.calm) return;
      cancelAnimationFrame(pointerRaf);
      pointerRaf = requestAnimationFrame(() => {
        city.look((cx / window.innerWidth) * 2 - 1, (cy / window.innerHeight) * 2 - 1);
      });
    }
    window.addEventListener('pointermove', (e) => look(e.clientX, e.clientY), { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) look(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('pointerleave', () => city.look(0, 0));

    // 尺寸变化（移动端地址栏抖动做防抖）
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => city.resize(), 180);
    });
    window.addEventListener('orientationchange', () => setTimeout(() => city.resize(), 320));

    // 后台标签暂停
    D.addEventListener('visibilitychange', () => {
      if (D.hidden) city.stop();
      else city.start();
    });

    // 全局快捷键
    D.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#settingsModal').hidden) return;
      if (e.key.toLowerCase() === 's' && !e.metaKey && !e.ctrlKey && e.target === D.body) panel.open();
    });

    D.addEventListener('fucheng:quality', () => panel.syncUI && panel.syncUI());

    initBoot(() => {
      D.body.classList.add('is-ready');
    });

    // 供后续界面复用
    window.FuchengShell = {
      city,
      settings,
      toast,
      routes,
      saveKeys: SAVE_KEYS,
      version: '0.1.0',
    };
  }

  function start() {
    if (window.FC && window.FC.ready) window.FC.ready.then(boot, boot);
    else boot();
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();
})();
