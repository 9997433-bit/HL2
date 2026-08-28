/* 浮城人生 · fc-ledger.js
   O2 账单抽屉 — the month closes and the city reads out what it took.

   Implements `round2/fable-overlay-spec.md` §2 / §3.3. The overlay stack, the
   scroll lock and the focus trap all come from `FC.overlay`, which fc-events.js
   publishes — this file must load after it.

   Same house style as the rest of the screens: ES5, no build step, file://
   safe. Like the event modal, the sheet is pure UI: it renders the numbers it
   is handed and never touches `run` or localStorage.

   Public API
     FC.ledger.show(payload) → Promise<void>   resolves when the sheet closes
     FC.ledger.close()       → void            force-close (重开人生)
     FC.ledger.isOpen()      → boolean

   payload = {
     ym:     "2021.04",
     rows:   [{ label: "房租", note: "合租主卧", amount: -2208 }, …],
     income: 6400,
     net:    1537
   }
*/
(function (global) {
  "use strict";

  var doc = global.document;
  var FC = global.FC || (global.FC = {});

  if (!FC.overlay) {
    if (global.console) {
      console.warn("fc-ledger.js: FC.overlay is missing — load fc-events.js first");
    }
    return;
  }

  /* The anchor line from the design brief. Fixed copy: the drawer says the
     same sentence every month, which is the whole point of it. */
  var CAPTION = "「账单比闹钟准时。」";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function reduced() {
    return !!(global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function group(n) {
    return Math.abs(Math.round(n)).toLocaleString("zh-CN");
  }

  /* U+2212 for the minus sign, same as the HUD and the event card. */
  function sign(v) {
    return v < 0 ? "−¥" : "+¥";
  }

  function money(v) {
    return sign(v) + group(v);
  }

  function counter() {
    return (FC.fx && FC.fx.countUp) ||
      (global.FCMotion && global.FCMotion.countUp) ||
      (global.FCUI && global.FCUI.countUp) || null;
  }

  var current = null;

  function render(payload, resolve) {
    var soft = reduced();
    var rows = [];
    var i;

    var given = payload.rows || [];
    for (i = 0; i < given.length; i++) {
      /* A bill of zero is not a line of the month — 还贷 with no debt left. */
      if (given[i] && given[i].amount) rows.push(given[i]);
    }
    if (payload.income) {
      rows.push({ label: "月收入", amount: Math.abs(payload.income), income: true });
    }

    var net = Number(payload.net) || 0;
    var rowsHtml = rows.map(function (r, index) {
      return '<li class="fc-ledger__row' + (r.income ? " fc-ledger__row--income" : "") +
        '" style="--i:' + index + '">' +
        '<span class="fc-ledger__label">' + esc(r.label) + "</span>" +
        (r.note ? '<span class="fc-ledger__note">' + esc(r.note) + "</span>" : "") +
        '<b class="fc-ledger__amount" data-value="' + r.amount +
          '" data-delay="' + (index * 90) + '">' + money(r.amount) + "</b>" +
        "</li>";
    }).join("");

    var host = doc.createElement("div");
    host.className = "fc-sheet";
    host.innerHTML =
      '<div class="fc-sheet__scrim"></div>' +
      '<div class="fc-sheet__panel" role="dialog" aria-modal="true" ' +
           'aria-label="本月账单" tabindex="-1">' +
        '<i class="fc-sheet__grip" aria-hidden="true"></i>' +
        '<header class="fc-sheet__head">' +
          '<h2 class="fc-sheet__title">账单日 · ' +
            '<span class="fc-sheet__ym">' + esc(payload.ym || "") + "</span></h2>" +
          '<p class="fc-sheet__caption">' + CAPTION + "</p>" +
        "</header>" +
        '<ul class="fc-ledger">' + rowsHtml + "</ul>" +
        '<div class="fc-ledger__total ' + (net >= 0 ? "up" : "down") +
             '" style="--i:' + rows.length + '" aria-live="polite">' +
          '<span class="fc-ledger__total-label">本月净流</span>' +
          '<b class="fc-ledger__total-value" data-value="' + net +
            '" data-delay="' + (rows.length * 90 + 120) + '">' + money(net) + "</b>" +
        "</div>" +
        '<button class="fc-btn fc-btn--primary fc-sheet__done">结清，继续 ▸</button>' +
      "</div>";

    var panel = host.querySelector(".fc-sheet__panel");
    var totalValue = host.querySelector(".fc-ledger__total-value");
    var settled = false;
    var timers = [];

    function finish(immediate) {
      if (settled) return;
      settled = true;
      for (var t = 0; t < timers.length; t++) global.clearTimeout(timers[t]);
      host.classList.add("is-closing");

      var done = function () {
        if (host.parentNode) host.parentNode.removeChild(host);
        FC.overlay.pop(host);
        if (current && current.host === host) current = null;
        resolve();
      };

      if (soft || immediate) { done(); return; }
      var fallback = global.setTimeout(done, 260);
      panel.addEventListener("animationend", function (e) {
        if (e.animationName !== "fc-sheet-down") return;
        global.clearTimeout(fallback);
        done();
      });
    }

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); finish(); return; }
      if (e.key === "Tab") FC.overlay.trap(panel, e);
    }

    host.querySelector(".fc-sheet__scrim").addEventListener("click", function () { finish(); });
    host.querySelector(".fc-sheet__done").addEventListener("click", function () { finish(); });

    doc.body.appendChild(host);
    if (FC.overlay.push("sheet", host)) FC.overlay.top().onKey = onKey;
    current = { host: host, finish: finish };
    panel.focus();

    /* Every amount is already written into the markup, so the sheet reads
       correctly even if the rolls never run; the count-up only decorates a
       number that is on screen. Each one starts as its row lands. */
    var roll = soft ? null : counter();
    [].slice.call(host.querySelectorAll("[data-value]")).forEach(function (el) {
      if (!roll) return;
      var value = Number(el.getAttribute("data-value"));
      var delay = Number(el.getAttribute("data-delay")) || 0;
      el.textContent = sign(value) + "0";
      timers.push(global.setTimeout(function () {
        roll(el, Math.abs(value), { duration: 400, prefix: sign(value), from: 0 });
      }, delay));
    });

    /* The bottom line lands last and gets the one flash in the drawer. */
    if (!soft) {
      timers.push(global.setTimeout(function () {
        totalValue.classList.add("fc-flash");
      }, rows.length * 90 + 120));
    }
  }

  function show(payload) {
    return new Promise(function (resolve) {
      /* Only one sheet at a time — a second month cannot arrive before the
         first one is settled, but the API has to survive being told it did. */
      if (current) current.finish(true);
      render(payload || {}, resolve);
    });
  }

  function close() {
    if (current) current.finish(true);
  }

  FC.ledger = {
    show: show,
    close: close,
    isOpen: function () { return !!current; }
  };
})(window);
