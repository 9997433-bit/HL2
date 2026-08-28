/* 浮城人生 · fc-motion.js
   Shared motion layer for the core screens: number count-up, list stagger,
   page-to-page wipe transition and the global scanline/noise veil.
   No build step, no dependencies, safe on file:// — every effect degrades to
   an instant, static result under `prefers-reduced-motion`. */
(function (global) {
  "use strict";

  var doc = global.document;
  var LOCALE = "zh-CN";
  var WIPE_OUT = 300;
  var FLAG = "fucheng.wipe";

  function reduced() {
    return !!(
      global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /* ------------------------------------------------------------- count-up */

  /* Reads whatever number is on screen right now, so a roll always starts from
     what the player can see rather than from an internal value they can't. */
  function currentValue(el) {
    var n = Number(String(el.textContent || "").replace(/[^\d.-]/g, ""));
    return isFinite(n) ? n : 0;
  }

  function format(value, decimals) {
    var n = decimals ? Number(value.toFixed(decimals)) : Math.round(value);
    try {
      return n.toLocaleString(LOCALE, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    } catch (e) {
      return String(n);
    }
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  var counters = typeof WeakMap === "function" ? new WeakMap() : null;

  /* Rolls el to `to` on rAF with an ease-out. The duration is taken from the
     size of the jump — 400ms for a nudge, up to 800ms for a number that gets
     rewritten — so a big month visibly takes longer to land than a small one.
     `suffix` is markup owned by the calling screen (e.g. "<small>/100</small>"),
     never anything the player typed. */
  function countUp(el, to, opts) {
    if (!el) return;
    opts = opts || {};
    to = Number(to) || 0;

    var decimals = opts.decimals || 0;
    var prefix = opts.prefix || "";
    var suffix = opts.suffix || "";
    var from = typeof opts.from === "number" ? opts.from : currentValue(el);

    function paint(value) {
      var text = prefix + format(value, decimals);
      if (suffix) el.innerHTML = text + suffix;
      else el.textContent = text;
    }

    var running = counters && counters.get(el);
    if (running) {
      cancelAnimationFrame(running);
      counters["delete"](el);
    }

    if (reduced() || from === to || !global.requestAnimationFrame) {
      paint(to);
      return;
    }

    var span = Math.abs(to - from);
    var scale = Math.max(Math.abs(to), Math.abs(from), 1);
    var dur = opts.duration || Math.round(400 + Math.min(1, span / scale) * 400);
    var start = 0;

    function frame(now) {
      if (!start) start = now;
      var p = Math.min(1, (now - start) / dur);
      paint(from + (to - from) * easeOutCubic(p));
      if (p < 1 && counters) counters.set(el, requestAnimationFrame(frame));
      else if (p < 1) requestAnimationFrame(frame);
      else if (counters) counters["delete"](el);
    }

    if (counters) counters.set(el, requestAnimationFrame(frame));
    else requestAnimationFrame(frame);
  }

  /* --------------------------------------------------------- money float */

  /* A ¥ delta peels off whatever caused it and flies into the HUD figure it
     changes, so the number the player watches move is the number they were
     shown. Fixed-position and self-removing; four in flight is the cap,
     because a month that moves money five ways is no longer readable. */
  var FLOAT_MS = 640;
  var flying = 0;

  function centerOf(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function moneyFloat(amount, opts) {
    opts = opts || {};
    amount = Math.round(Number(amount) || 0);

    var target = typeof opts.target === "string" ? doc.getElementById(opts.target) : opts.target;
    if (!amount || !target || !doc.body || reduced() || flying >= 4) return;

    var to = centerOf(target);
    var from = opts.from && opts.from.nodeType === 1
      ? centerOf(opts.from)
      : { x: to.x, y: to.y + 96 };

    var el = doc.createElement("span");
    el.className = "fc-float " + (amount >= 0 ? "is-up" : "is-down");
    el.setAttribute("aria-hidden", "true");
    el.textContent = (amount >= 0 ? "+¥" : "−¥") + format(Math.abs(amount), 0);
    el.style.left = Math.round(from.x) + "px";
    el.style.top = Math.round(from.y) + "px";

    var delay = opts.delay || 0;
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var base = "translate(-50%, -50%) ";

    flying++;
    doc.body.appendChild(el);

    function drop() {
      if (!el.parentNode) return;
      el.parentNode.removeChild(el);
      flying = Math.max(0, flying - 1);
    }

    if (el.animate) {
      /* Lifts clear of its source before it commits to the trip — a straight
         line between two points reads as a tooltip, not as money moving. */
      var run = el.animate(
        [
          { transform: base + "translate(0, 6px) scale(.82)", opacity: 0 },
          { transform: base + "translate(" + dx * 0.16 + "px, " + (dy * 0.1 - 18) + "px) scale(1.06)", opacity: 1, offset: 0.24 },
          { transform: base + "translate(" + dx * 0.86 + "px, " + dy * 0.86 + "px) scale(1)", opacity: 0.92, offset: 0.78 },
          { transform: base + "translate(" + dx + "px, " + dy + "px) scale(.78)", opacity: 0 }
        ],
        {
          duration: FLOAT_MS,
          delay: delay,
          easing: "cubic-bezier(.22, 1, .36, 1)",
          fill: "both"
        }
      );
      run.onfinish = drop;
      run.oncancel = drop;
    } else {
      el.style.animationDelay = delay + "ms";
      el.classList.add("fc-float--rise");
    }

    /* Belt and braces: a tab backgrounded mid-flight never fires onfinish. */
    global.setTimeout(drop, delay + FLOAT_MS + 260);
  }

  /* -------------------------------------------------------------- stagger */

  /* Sets --i on each node so CSS can derive its own animation-delay, then adds
     the entrance class. Delays are capped so a long list never crawls in. */
  function stagger(nodes, opts) {
    opts = opts || {};
    var cls = opts.className === undefined ? "fc-rise" : opts.className;
    var cap = opts.max === undefined ? 12 : opts.max;
    var list = nodes && nodes.length !== undefined ? nodes : nodes ? [nodes] : [];
    for (var i = 0; i < list.length; i++) {
      list[i].style.setProperty("--i", String(Math.min(i, cap)));
      if (cls) list[i].classList.add(cls);
    }
    return list;
  }

  /* ----------------------------------------------------------------- veil */

  function mountVeil() {
    if (!doc.body || doc.querySelector(".fc-veil")) return;
    var veil = doc.createElement("div");
    veil.className = "fc-veil";
    veil.setAttribute("aria-hidden", "true");
    doc.body.appendChild(veil);
  }

  /* ----------------------------------------------------- page transitions */

  /* Screen order decides which way the sheet travels, so going forward and
     coming back feel like opposite moves rather than the same one twice. */
  var ORDER = {
    "index.html": 0,
    "era-select.html": 1,
    "origin-select.html": 2,
    "dashboard.html": 3,
    "city-map.html": 4
  };

  var wipe = null;

  function fileOf(path) {
    var parts = String(path).split("/");
    var last = parts[parts.length - 1];
    return last || "index.html";
  }

  function directionTo(path) {
    var from = ORDER[fileOf(global.location.pathname)];
    var to = ORDER[fileOf(path)];
    if (from === undefined || to === undefined) return "fwd";
    return to < from ? "back" : "fwd";
  }

  function mountWipe() {
    if (wipe && wipe.parentNode) return wipe;
    wipe = doc.createElement("div");
    wipe.className = "fc-wipe";
    wipe.setAttribute("aria-hidden", "true");
    wipe.innerHTML = '<span class="fc-wipe__sheet"></span>';
    doc.body.appendChild(wipe);
    return wipe;
  }

  function leaveTo(href, dir, opts) {
    opts = opts || {};
    if (reduced()) {
      global.location.href = href;
      return;
    }
    try {
      global.sessionStorage.setItem(FLAG, dir);
      if (opts.layerAscend) global.sessionStorage.setItem(FLAG + ".layer", "1");
    } catch (e) {
      /* private mode — the arriving page simply skips its reveal */
    }

    var el = mountWipe();
    el.setAttribute("data-dir", dir);
    el.classList.toggle("is-layer-ascend", !!opts.layerAscend);
    el.classList.remove("is-in", "is-covered");
    el.classList.add("is-active", "is-out");

    var gone = false;
    function navigate() {
      if (gone) return;
      gone = true;
      global.location.href = href;
    }
    el.addEventListener("animationend", navigate, { once: true });
    global.setTimeout(navigate, WIPE_OUT + 140);
  }

  function revealOnArrival() {
    var dir = "";
    var layerAscend = false;
    try {
      dir = global.sessionStorage.getItem(FLAG) || "";
      layerAscend = global.sessionStorage.getItem(FLAG + ".layer") === "1";
      global.sessionStorage.removeItem(FLAG);
      global.sessionStorage.removeItem(FLAG + ".layer");
    } catch (e) {
      dir = "";
    }
    if (!dir || reduced()) return;

    var el = mountWipe();
    el.setAttribute("data-dir", dir);
    el.classList.toggle("is-layer-ascend", layerAscend);
    el.classList.add("is-active", "is-covered");
    requestAnimationFrame(function () {
      el.classList.remove("is-covered");
      el.classList.add("is-in");
    });
    el.addEventListener(
      "animationend",
      function () {
        el.classList.remove("is-active", "is-in");
      },
      { once: true }
    );
  }

  function closest(node, sel) {
    while (node && node.nodeType === 1) {
      if (node.matches ? node.matches(sel) : false) return node;
      node = node.parentNode;
    }
    return null;
  }

  function onClick(e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var a = closest(e.target, "a[href]");
    if (!a) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download")) return;
    if (a.hasAttribute("data-no-transition")) return;
    if (a.getAttribute("aria-disabled") === "true") return;

    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#") return;

    var url;
    try {
      url = new URL(a.href, global.location.href);
    } catch (err) {
      return;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:" && url.protocol !== "file:") return;
    if (url.origin !== global.location.origin && url.protocol !== "file:") return;
    if (url.pathname === global.location.pathname && url.hash) return;

    e.preventDefault();
    leaveTo(url.href, directionTo(url.pathname));
  }

  function init() {
    /* screens.js may have defined FC after this file parsed. */
    if (global.FC && !global.FC.motion) global.FC.motion = global.FCMotion;
    mountVeil();
    revealOnArrival();
    doc.addEventListener("click", onClick);
    /* Back/forward out of the bfcache must not restore a covering sheet. */
    global.addEventListener("pageshow", function (ev) {
      if (ev.persisted && wipe) wipe.classList.remove("is-active", "is-out", "is-in", "is-covered");
    });
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();

  /* ----------------------------------------------------------- 3D tilt */

  function bindTilt(root, selector) {
    if (!root || reduced()) return;
    var sel = selector || ".fc-card";
    var cards = root.querySelectorAll(sel);
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        card.classList.add("fc-tilt");
        card.addEventListener("pointermove", function (e) {
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform =
            "perspective(900px) rotateY(" + (x * 10).toFixed(2) + "deg) rotateX(" +
            (-y * 10).toFixed(2) + "deg) translateZ(8px)";
        });
        card.addEventListener("pointerleave", function () {
          card.style.transform = card.classList.contains("is-selected") ? "translateZ(6px)" : "";
        });
      })(cards[i]);
    }
  }

  /* ------------------------------------------------------- layer pulse */

  function layerPulse(el, layerIndex) {
    if (!el || reduced()) return;
    el.classList.remove("fc-layer-pulse");
    void el.offsetWidth;
    el.classList.add("fc-layer-pulse");
    el.style.setProperty("--tint", "var(--l" + layerIndex + ")");
  }

  global.FCMotion = {
    reduced: reduced,
    countUp: countUp,
    moneyFloat: moneyFloat,
    stagger: stagger,
    leaveTo: leaveTo,
    bindTilt: bindTilt,
    layerPulse: layerPulse,
    format: function (n, decimals) {
      return format(Number(n) || 0, decimals || 0);
    }
  };

  /* Convenience alias so screens can call FC.motion.* alongside FC.read/write. */
  if (global.FC) global.FC.motion = global.FCMotion;
})(window);
