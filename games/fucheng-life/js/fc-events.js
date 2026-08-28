/* 浮城人生 · fc-events.js
   O1 事件弹窗 — the city knocks, and you have to answer.

   Implements `round2/fable-overlay-spec.md` §1 / §3.1 / §3.2 / §4.
   Ships the shared overlay stack (`FC.overlay`) the spec assigns to O2 as
   well, so the ledger sheet can reuse the trap and the scroll lock verbatim.

   `data/story.json → events[]` is the SSOT for the deck: every event carries
   its own title, body, weight and `choices[]`. This module only adapts and
   picks; it does not author.

   ES5-flavoured, no build step, and it still runs from a file:// double-click:
   `FC.story` is used when story-loader.js published it, story.json is fetched
   when the page is served, and the mirror at the bottom of this file covers
   the case where neither is reachable.

   Public API
     FC.overlay.push(kind, el) / .pop(el) / .top() / .trap(el, event)
     FC.events.load()                → Promise<deck>
     FC.events.deck()                → array | null
     FC.events.pick({layer, avoid, allowRedline, era, months, done})
     FC.events.show(payload, opts?)  → Promise<{choiceId, choice, deltas, event, dismissed}>
     FC.events.close()               → force-close, resolves dismissed:true
     FC.events.moneyOf(units, ref)   → ¥ amount for a money delta
*/
(function (global) {
  "use strict";

  var doc = global.document;
  var FC = global.FC || (global.FC = {});

  var STAT_LABEL = { money: "现金", health: "健康", social: "人脉", rep: "声望" };
  var LAYER_NAME = {
    L1: "市井层", L2: "工薪层", L3: "上升通道", L4: "资本名利", L5: "暗流"
  };
  var TYPE_LABEL = {
    opportunity: "机遇", bill: "账单", relation: "人情", redline: "红线"
  };
  /* story.json only carries a Chinese `category`; overlay-spec §4.2 maps it. */
  var CATEGORY_TYPE = {
    "机会": "opportunity",
    "金钱": "bill", "生计": "bill", "居住": "bill",
    "人情": "relation", "关系": "relation",
    "风险": "redline"
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function reduced() {
    return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function layerNum(id) {
    var n = parseInt(String(id || "L2").replace(/[^\d]/g, ""), 10);
    return n >= 1 && n <= 5 ? n : 2;
  }

  function fmt(n) {
    return Math.abs(Math.round(n)).toLocaleString("zh-CN");
  }

  function signed(v, prefix) {
    return (v < 0 ? "−" : "+") + (prefix || "") + fmt(v);
  }

  /* ------------------------------------------------------- FC.overlay 栈
     One keydown listener for the whole app; the top of the stack owns it. */
  if (!FC.overlay) {
    var stack = [];

    FC.overlay = {
      push: function (kind, el) {
        for (var i = 0; i < stack.length; i++) {
          if (stack[i].kind === kind) {
            if (global.console) console.warn("FC.overlay: " + kind + " is already open");
            return false;
          }
        }
        el.style.zIndex = kind === "sheet" ? 200 : 300;
        if (!stack.length) doc.body.classList.add("fc-scroll-lock");
        stack.push({ kind: kind, rootEl: el, returnFocus: doc.activeElement });
        return true;
      },
      pop: function (el) {
        for (var i = stack.length - 1; i >= 0; i--) {
          if (stack[i].rootEl !== el) continue;
          var entry = stack.splice(i, 1)[0];
          if (!stack.length) doc.body.classList.remove("fc-scroll-lock");
          if (entry.returnFocus && entry.returnFocus.focus) entry.returnFocus.focus();
          return true;
        }
        return false;
      },
      top: function () {
        return stack.length ? stack[stack.length - 1] : null;
      },
      trap: function (rootEl, e) {
        if (e.key !== "Tab") return;
        var items = [].slice.call(
          rootEl.querySelectorAll("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")
        );
        if (!items.length) return;
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    doc.addEventListener("keydown", function (e) {
      var top = FC.overlay.top();
      if (top && top.onKey) top.onKey(e);
    }, true);
  }

  /* --------------------------------------------------------------- 数据装载
     Money deltas are authored in units of "about a third of a month's income"
     rather than absolute ¥: a life in 1984 and a life in 2026 are lived at
     different magnitudes, and a choice should cost the same share of either.
     `FC.events.moneyOf` turns a unit into the ¥ the player will see. */
  var deck = null;
  var loading = null;

  function toPayload(raw) {
    var type = CATEGORY_TYPE[raw.category] || "opportunity";
    var layer = raw.layerId || raw.layer || "L2";
    return {
      id: raw.id,
      type: raw.type || type,
      layer: layer,
      layerIndex: layerNum(layer),
      scene: raw.scene || (layer + " · " + (LAYER_NAME[layer] || "城市")),
      category: raw.category || "",
      title: raw.title,
      body: raw.body || raw.text,
      weight: raw.weight || 8,
      /* Gating metadata travels with the payload so `pick` can filter on it
         without reaching back into story.json. */
      eras: raw.eras && raw.eras.length ? raw.eras : null,
      once: !!raw.once,
      minMonths: raw.minMonths || 0,
      maxMonths: raw.maxMonths || 0,
      requires: raw.requires || null,
      choices: raw.choices || []
    };
  }

  function build(events) {
    var out = [];
    for (var i = 0; i < events.length; i++) {
      if (events[i] && events[i].id) out.push(toPayload(events[i]));
    }
    return out;
  }

  function storyUrl() {
    var s = doc && doc.currentScript;
    if (s && s.src) return new URL("../data/story.json", s.src).href;
    return new URL("./data/story.json", global.location.href).href;
  }

  var URL_STORY = storyUrl();

  function fetchStory() {
    if (typeof global.fetch !== "function") return Promise.reject(new Error("no fetch"));
    return global.fetch(URL_STORY, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  /* story.json → `events`; `sampleEvents` is the pre-migration spelling. */
  function eventsOf(data) {
    return data && (data.events || data.sampleEvents);
  }

  function load() {
    if (deck) return Promise.resolve(deck);
    if (loading) return loading;

    var source;
    if (eventsOf(FC.story)) {
      source = Promise.resolve(FC.story);
    } else if (global.location.protocol === "file:") {
      /* A fetch from file:// is refused before it leaves the page and Chrome
         logs it as an error; go straight to the mirror instead. */
      source = Promise.reject(new Error("file://"));
    } else if (FC.ready && typeof FC.ready.then === "function") {
      source = FC.ready.catch(fetchStory);
    } else {
      source = fetchStory();
    }

    loading = source.then(function (data) {
      var events = eventsOf(data);
      if (!events || !events.length) throw new Error("story has no events");
      return events;
    }).catch(function () {
      return SEED;
    }).then(function (events) {
      deck = build(events);
      return deck;
    });

    return loading;
  }

  /* ------------------------------------------------------------------ 抽取
     The city knocks on the door you actually live behind: same-layer events
     are common, distant ones rare, and the undercurrent mostly stays shut. */
  function weightOf(ev, layer) {
    if (ev.layerIndex === 5) return layer >= 4 ? ev.weight * 1.2 : ev.weight * 0.3;
    var dist = Math.abs(ev.layerIndex - layer);
    return ev.weight * (dist === 0 ? 3 : dist === 1 ? 1.4 : 0.45);
  }

  /* An event with no `eras` belongs to every era — it is one of the city's
     constants. A tagged one only shows up in the decades it was written for,
     and then twice as loudly, because three of them have to be heard over
     fifty that are always in the deck. */
  function fitsEra(ev, era) {
    if (!ev.eras) return true;
    return !!era && ev.eras.indexOf(era) >= 0;
  }

  function fitsMonths(ev, months) {
    if (months == null) return true;
    if (ev.minMonths && months < ev.minMonths) return false;
    if (ev.maxMonths && months > ev.maxMonths) return false;
    return true;
  }

  /* ------------------------------------------------------------ 人情账门禁
     `requires` 读的是 run.npcs 那本账：欠了老周半天班，他才会在某个月来问；
     还清了，这扇门就重新关上。一条规则形如
       { npc, minBalance, maxBalance, flag, notFlag }
     数组表示全部满足。账本读不到时一律不放行 —— 无法核账的债不该上门。 */
  function ruleMet(npcs, rule) {
    if (!rule) return true;
    var id = rule.npc || rule.id;
    var npc = null, i;
    for (i = 0; i < npcs.length; i++) {
      if (npcs[i] && npcs[i].id === id) { npc = npcs[i]; break; }
    }
    if (!npc) return false;
    var flags = npc.flags || [];
    var lo = rule.minBalance != null ? rule.minBalance : rule.balanceMin;
    var hi = rule.maxBalance != null ? rule.maxBalance : rule.balanceMax;
    if (lo != null && npc.balance < lo) return false;
    if (hi != null && npc.balance > hi) return false;
    var need = rule.flag == null ? [] : [].concat(rule.flag);
    for (i = 0; i < need.length; i++) {
      if (flags.indexOf(need[i]) < 0) return false;
    }
    var banned = rule.notFlag == null ? [] : [].concat(rule.notFlag);
    for (i = 0; i < banned.length; i++) {
      if (flags.indexOf(banned[i]) >= 0) return false;
    }
    return true;
  }

  function meetsNpc(npcs, requires) {
    if (!requires) return true;
    if (!npcs || !npcs.length) return false;
    var rules = [].concat(requires);
    for (var i = 0; i < rules.length; i++) {
      if (!ruleMet(npcs, rules[i])) return false;
    }
    return true;
  }

  /* opts: { layer, avoid, allowRedline, era, months, done, npcs } — all optional,
     so a caller that knows nothing about the run still gets an event. */
  function pick(opts) {
    opts = opts || {};
    if (!deck || !deck.length) return null;
    var layer = opts.layer || 2;
    var avoid = opts.avoid || [];
    var done = opts.done || null;
    var pool = [], weights = [], total = 0, i;

    for (i = 0; i < deck.length; i++) {
      if (avoid.indexOf(deck[i].id) >= 0) continue;
      if (opts.allowRedline === false && deck[i].type === "redline") continue;
      if (!fitsEra(deck[i], opts.era)) continue;
      if (!fitsMonths(deck[i], opts.months)) continue;
      if (deck[i].once && done && done[deck[i].id]) continue;
      if (deck[i].requires && !meetsNpc(opts.npcs, deck[i].requires)) continue;
      var w = weightOf(deck[i], layer);
      if (deck[i].eras) w *= 2;
      /* A debt that has come due should be heard over the ambient city. */
      if (deck[i].requires) w *= 2.4;
      pool.push(deck[i]);
      weights.push(w);
      total += w;
    }
    if (!pool.length) return null;

    var r = Math.random() * total;
    for (i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  /* Single source of truth for the unit→¥ conversion, shared with the caller
     so the result face and the HUD can never disagree. */
  function moneyOf(units, ref) {
    return units * Math.max(400, Math.round((ref || 0) * 0.3));
  }

  /* --------------------------------------------------------------- 预览点
     Reigns rule: announce which dimensions move and how far, never which way. */
  function bucket(stat, value, moneyRef) {
    var a = Math.abs(value);
    if (stat !== "money") return a <= 3 ? "s" : a <= 7 ? "m" : "l";
    var amount = Math.abs(moneyOf(value, moneyRef));
    var ref = moneyRef ? Math.abs(moneyRef) : 0;
    if (!ref) return amount <= 1000 ? "s" : amount <= 6000 ? "m" : "l";
    return amount <= 0.4 * ref ? "s" : amount <= 1.2 * ref ? "m" : "l";
  }

  function dotsHtml(choice, moneyRef) {
    if (choice.preview) {
      return choice.preview.map(function (p) {
        return '<i class="fc-dot fc-dot--' + p.stat + " fc-dot--" + p.size + '"></i>';
      }).join("");
    }
    var d = choice.d || choice.deltas || {};
    return Object.keys(d).filter(function (k) { return d[k]; }).map(function (k) {
      return '<i class="fc-dot fc-dot--' + k + " fc-dot--" + bucket(k, d[k], moneyRef) + '"></i>';
    }).join("");
  }

  function affectedNames(choice) {
    var d = choice.d || choice.deltas || {};
    return Object.keys(d).filter(function (k) { return d[k]; }).map(function (k) {
      return STAT_LABEL[k] || k;
    }).join("、");
  }

  function countTo(el, value, prefix) {
    var counter = (FC.fx && FC.fx.countUp) ||
      (global.FCMotion && global.FCMotion.countUp) ||
      (global.FCUI && global.FCUI.countUp);
    if (counter) counter(el, value, { duration: 400, prefix: prefix || "", from: 0 });
    else el.textContent = (prefix || "") + fmt(value);
  }

  /* ------------------------------------------------------------------ 视图 */
  var current = null;
  var queue = [];

  function render(ev, opts, resolve) {
    var soft = reduced();
    var moneyRef = opts.moneyRef || 0;
    var ack = !ev.choices || !ev.choices.length;
    var isRedline = ev.type === "redline" && !ack;

    var host = doc.createElement("div");
    host.className = "fc-event";
    host.setAttribute("data-layer", ev.layer);
    host.setAttribute("data-type", ev.type);

    var choicesHtml = ack
      ? '<button class="fc-choice fc-choice--ack" data-i="-1">' +
          '<span class="fc-choice__label">继续 ▸</span></button>'
      : ev.choices.map(function (c, i) {
          return '<button class="fc-choice' + (c.risk ? " fc-choice--risk" : "") +
            '" data-i="' + i + '">' +
            '<span class="fc-choice__num">' + (i + 1) + "</span>" +
            '<span class="fc-choice__label">' + esc(c.label) + "</span>" +
            (c.cost ? '<span class="fc-choice__cost">' + esc(c.cost) + "</span>" : "") +
            '<span class="fc-choice__dots" aria-hidden="true">' + dotsHtml(c, moneyRef) + "</span>" +
            '<span class="fc-sr">影响：' + esc(affectedNames(c) || "未知") + "</span>" +
            (isRedline ? '<i class="fc-choice__cooling" aria-hidden="true"></i>' : "") +
            "</button>";
        }).join("");

    host.innerHTML =
      '<div class="fc-event__scrim"></div>' +
      '<div class="fc-event__card" role="dialog" aria-modal="true" tabindex="-1" ' +
           'aria-labelledby="fcEvTitle" aria-describedby="fcEvBody">' +
        '<i class="fc-event__accent" aria-hidden="true"></i>' +
        '<div class="fc-event__head">' +
          '<span class="fc-event__scene">' + esc(ev.scene) + "</span>" +
          '<span class="fc-event__badge">' + esc(TYPE_LABEL[ev.type] || "事件") + "</span>" +
        "</div>" +
        '<div class="fc-event__face fc-event__face--ask">' +
          '<h2 class="fc-event__title" id="fcEvTitle">' + esc(ev.title) + "</h2>" +
          '<p class="fc-event__body" id="fcEvBody">' + esc(ev.body) + "</p>" +
          '<div class="fc-event__choices" role="group" aria-label="选择">' + choicesHtml + "</div>" +
        "</div>" +
        '<div class="fc-event__face fc-event__face--result" hidden></div>' +
      "</div>";

    var card = host.querySelector(".fc-event__card");
    var badge = host.querySelector(".fc-event__badge");
    var askFace = host.querySelector(".fc-event__face--ask");
    var resultFace = host.querySelector(".fc-event__face--result");
    var buttons = [].slice.call(host.querySelectorAll(".fc-choice"));

    var settled = false;
    var cooling = isRedline;
    var answered = null;
    var coolTimer = null;

    function finish(result) {
      if (settled) return;
      settled = true;
      if (coolTimer) global.clearInterval(coolTimer);
      host.classList.add("is-closing");
      var done = function () {
        if (host.parentNode) host.parentNode.removeChild(host);
        FC.overlay.pop(host);
        current = null;
        resolve(result);
        var next = queue.shift();
        if (next) render(next.ev, next.opts, next.resolve);
      };
      if (soft) done();
      else global.setTimeout(done, 200);
    }

    function deny() {
      if (soft || cooling) return;
      card.classList.remove("is-denied");
      void card.offsetWidth;
      card.classList.add("is-denied");
    }

    /* Closing an event: an interruption has to be answered, so ESC and the
       scrim only work once a choice has been paid for (overlay-spec §1.8). */
    function requestClose() {
      if (answered) finish(answered);
      else if (ack) answer(null);
      else deny();
    }

    function answer(choice) {
      if (settled || cooling) return;
      var deltas = {};
      var d = (choice && (choice.d || choice.deltas)) || {};
      for (var k in d) {
        if (Object.prototype.hasOwnProperty.call(d, k) && d[k]) deltas[k] = d[k];
      }
      answered = {
        choiceId: choice ? choice.id : null,
        choice: choice,
        deltas: deltas,
        event: ev,
        dismissed: false
      };

      /* ack mode has nothing to settle — the button *is* the acknowledgement */
      if (!choice) { finish(answered); return; }

      var keys = Object.keys(deltas);
      resultFace.innerHTML =
        (choice && choice.result
          ? '<p class="fc-event__result">' + esc(choice.result) + "</p>" : "") +
        '<ul class="fc-event__deltas" aria-live="polite">' +
          keys.map(function (k, i) {
            var isMoney = k === "money";
            var value = isMoney ? moneyOf(deltas[k], moneyRef) : deltas[k];
            return '<li class="fc-event__delta-row ' + (value >= 0 ? "up" : "down") +
              '" style="--i:' + i + '">' +
              "<span>" + esc(STAT_LABEL[k] || k) + "</span>" +
              '<b data-value="' + value + '"' + (isMoney ? ' data-money="1"' : "") + ">" +
              signed(value, isMoney ? "¥" : "") + "</b></li>";
          }).join("") +
        "</ul>" +
        '<button class="fc-btn fc-btn--primary fc-event__continue">记入日志，继续 ▸</button>';

      /* Bound before the face swap: the button is in the DOM the moment the
         markup lands, and it must never exist without its handler. */
      var go = resultFace.querySelector(".fc-event__continue");
      go.addEventListener("click", function () { finish(answered); });

      var swap = function () {
        askFace.hidden = true;
        resultFace.hidden = false;
        host.classList.add("is-resolved");
        [].slice.call(resultFace.querySelectorAll("b[data-value]")).forEach(function (b) {
          var v = Number(b.getAttribute("data-value"));
          var money = b.getAttribute("data-money");
          b.textContent = (v < 0 ? "−" : "+") + (money ? "¥" : "");
          var span = doc.createElement("span");
          b.appendChild(span);
          countTo(span, Math.abs(v));
        });
        go.focus();
      };

      if (soft) swap();
      else {
        askFace.classList.add("is-leaving");
        global.setTimeout(swap, 200);
      }
    }

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (cooling) return;
        requestClose();
        return;
      }
      if (e.key === "Tab") { FC.overlay.trap(card, e); return; }
      if (answered || cooling) return;
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= buttons.length && !buttons[n - 1].disabled) {
        e.preventDefault();
        buttons[n - 1].click();
      }
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        var i = parseInt(b.getAttribute("data-i"), 10);
        answer(i >= 0 ? ev.choices[i] : null);
      });
    });

    host.querySelector(".fc-event__scrim").addEventListener("click", requestClose);

    doc.body.appendChild(host);
    FC.overlay.push("modal", host);
    FC.overlay.top().onKey = onKey;
    current = { host: host, finish: finish, event: ev };

    /* Some decisions need three seconds. It doubles as mis-tap protection,
       so it survives prefers-reduced-motion (overlay-spec §1.7). */
    if (isRedline) {
      var left = 3;
      var label = TYPE_LABEL.redline;
      buttons.forEach(function (b) { b.disabled = true; b.classList.add("is-cooling"); });
      badge.textContent = label + " · " + left;
      card.focus();
      coolTimer = global.setInterval(function () {
        left--;
        if (left > 0) { badge.textContent = label + " · " + left; return; }
        global.clearInterval(coolTimer);
        coolTimer = null;
        if (settled) return;
        cooling = false;
        badge.textContent = label;
        buttons.forEach(function (b) {
          b.disabled = false;
          b.classList.remove("is-cooling");
          var bar = b.querySelector(".fc-choice__cooling");
          if (bar) bar.parentNode.removeChild(bar);
        });
        buttons[0].focus();
      }, 1000);
    } else {
      buttons[0].focus();
    }

    if (soft) host.classList.add("is-open");
    else global.requestAnimationFrame(function () { host.classList.add("is-open"); });
  }

  function show(payload, opts) {
    var ev = payload && payload.layerIndex ? payload : toPayload(payload || {});
    opts = opts || {};
    return new Promise(function (resolve) {
      if (current) queue.push({ ev: ev, opts: opts, resolve: resolve });
      else render(ev, opts, resolve);
    });
  }

  function close() {
    var pending = queue.splice(0, queue.length);
    pending.forEach(function (q) {
      q.resolve({ choiceId: null, choice: null, deltas: {}, event: q.ev, dismissed: true });
    });
    if (current) {
      current.finish({
        choiceId: null, choice: null, deltas: {}, event: current.event, dismissed: true
      });
    }
  }

  FC.events = {
    load: load,
    deck: function () { return deck; },
    pick: pick,
    show: show,
    close: close,
    isOpen: function () { return !!current; },
    moneyOf: moneyOf,
    toPayload: toPayload,
    meetsNpc: meetsNpc,
    STAT_LABEL: STAT_LABEL,
    TYPE_LABEL: TYPE_LABEL,
    _bucket: bucket
  };

  /* ------------------------------------------------------- offline mirror
     A ten-event lifeboat for the case where story.json cannot be read at all
     (typically file://), so a double-clicked page still offers real choices.
     It mirrors the first ten entries of data/story.json — 与 story.json 同步维护
     —— and is deliberately not the full deck: story.json is the SSOT. */
  var SEED = [
    { id: "EV01", title: "凌晨四点的灯", layerId: "L1", category: "生计", weight: 10,
      body: "外卖站的卷帘门升起一半。有人开始今天，有人还没结束昨天。你的手机先亮了，余额没有。",
      choices: [
        { id: "run", label: "接下这一单", cost: "整夜 −",
          d: { money: 1, health: -3 }, result: "你把手机塞回外套内袋。第一笔到账短信来的时候，天还没有亮透。" },
        { id: "sleep", label: "再睡两个小时", cost: "收入 −",
          d: { health: 4, money: -1 }, result: "闹钟被按掉两次。醒来时太阳已经越过巷口，欠的那部分还在原处等你。" },
        { id: "ask", label: "在站点群里问问长期的活", cost: "先欠个人情",
          d: { social: 4, health: -1 }, result: "站长记下了你的名字，说下个月排班时想着你。这句话不值钱，但可以先记着。" }
      ] },
    { id: "EV02", title: "水表之后", layerId: "L2", category: "居住", weight: 9,
      body: "合租群里安静了三分钟，随后每个人都算出自己该付的那一份。城市把亲密切成精确的小数。",
      choices: [
        { id: "split", label: "按人头平摊", cost: "现金 −",
          d: { money: -1, social: 2 }, result: "你转出那一份，群里很快恢复表情包。合租的默契就是不追问细节。" },
        { id: "exact", label: "把自己那份算清楚", cost: "关系 −",
          d: { social: -3, rep: 2 }, result: "你把用量截图发了出去，数字没有人反驳。之后几天，厨房安静了一些。" },
        { id: "cover", label: "先垫上，不提这事", cost: "现金 −−",
          d: { money: -2, social: 5 }, result: "你先把账缴了。有人说下次一定还，你点了点头，没有记在备忘录里。" }
      ] },
    { id: "EV03", title: "末班地铁", layerId: "L2", category: "职场", weight: 10,
      body: "末班车关门前，你收到一句“再改一版”。隧道没有信号，短暂替你保住了沉默。",
      choices: [
        { id: "back", label: "回工位再改一版", cost: "健康 −",
          d: { rep: 4, health: -5 }, result: "你在空掉的办公室里改到两点。第二天没有人提起，文件安静地过了。" },
        { id: "tomorrow", label: "回复「明早处理」", cost: "声望 −",
          d: { rep: -2, health: 3 }, result: "消息发出后你把手机倒扣。第二天九点，那句「再改一版」还在，你也还在。" },
        { id: "onboard", label: "在车上改", cost: "折中",
          d: { rep: 2, health: -3 }, result: "笔记本架在膝盖上，改到出站才发的。你分不清是效率，还是不肯浪费的那点时间。" }
      ] },
    { id: "EV04", title: "考场窗外", layerId: "L3", category: "教育", weight: 9,
      body: "雨落在答题卡之外。两小时后，有些人得到一条上行通道，有些人只得到标准答案。",
      choices: [
        { id: "finish", label: "把最后一道大题写完", cost: "多留十分钟",
          d: { rep: 5, health: -3 }, result: "收卷铃响时你才落笔。走出考场，雨已经停了，路面还亮着。" },
        { id: "leave", label: "提前交卷", cost: "声望 −",
          d: { rep: -1, health: 3 }, result: "你比大多数人早出来。空荡的走廊里，你第一次听见自己的脚步声。" }
      ] },
    { id: "EV05", title: "玻璃幕墙的落日", layerId: "L2", category: "职场", weight: 8,
      body: "夕阳把整栋写字楼镀成金色，工位上的人没有抬头。美景不计入本季度绩效。",
      choices: [
        { id: "photo", label: "拍一张，发给家里", cost: "两分钟",
          d: { social: 3, health: 2 }, result: "家里回了一句「真好看」，然后问你吃饭没有。你说吃过了，其实还没有。" },
        { id: "form", label: "继续把表填完", cost: "健康 −",
          d: { rep: 3, health: -3 }, result: "表格在天黑前提交。窗外的金色退回成灰色，办公室的灯准时替它上岗。" },
        { id: "early", label: "提前十分钟下班", cost: "声望 −",
          d: { rep: -2, health: 4 }, result: "你在电梯里遇见同一层的陌生人。街上的风还带着白天的温度。" }
      ] },
    { id: "EV06", title: "校招手环", layerId: "L3", category: "机会", weight: 10,
      body: "大厅里发放同一种蓝色手环。有人凭它进入终面，有人把它留作来过这座城市的证明。",
      choices: [
        { id: "queue", label: "排进终面的队伍", cost: "一个下午",
          d: { rep: 5, health: -4 }, result: "你站到下午三点。面试八分钟，对方说会有通知，通知一直没有具体日期。" },
        { id: "two", label: "投两个摊位就走", cost: "机会 −",
          d: { social: 2, health: 1 }, result: "两份简历，两句客气话。你把手环收进包里，它比 offer 先到手。" },
        { id: "refer", label: "退出，转投熟人内推", cost: "人情 −",
          d: { social: 5, rep: -1 }, result: "学长答应帮你递进去，附了一句「别抱太大希望」。这话你听得懂。" }
      ] },
    { id: "EV07", title: "会所电梯", layerId: "L4", category: "人情", weight: 8,
      body: "电梯没有楼层按钮。侍者认得邀请人的姓氏，也认得所有不该出现在这里的人。",
      choices: [
        { id: "up", label: "跟着进去", cost: "现金 −−",
          d: { social: 6, rep: 2, money: -2 }, result: "有人替你介绍了半句身份，剩下半句留给你自己补。你补得还算得体。" },
        { id: "lobby", label: "在大堂等人下来", cost: "四十分钟",
          d: { social: -1, health: 1 }, result: "你在沙发上坐了四十分钟。散场时有人和你握手，说下次一起上去。" },
        { id: "go", label: "说句抱歉，先走", cost: "人脉 −",
          d: { social: -3, health: 3 }, result: "你在门口叫了车。回程路上，城市的灯一格一格退到身后。" }
      ] },
    { id: "EV08", title: "第二种货币", layerId: "L4", category: "关系", weight: 8,
      body: "饭局散后，没有人提起菜单价格。真正昂贵的部分，已经记进彼此的人情账本。",
      choices: [
        { id: "pay", label: "把账结了", cost: "现金 −−−",
          d: { money: -3, social: 4, rep: 3 }, result: "你去前台签了单，回来时没有说。第二天有人在群里提了一句，你说小事。" },
        { id: "owe", label: "让对方结，记下这笔", cost: "人情 ▲",
          d: { social: 6, rep: -2 }, result: "这一顿你没有掏钱。人情账本上多了一行字，落款是你。" },
        { id: "aa", label: "AA，把话说明白", cost: "关系 −",
          d: { money: -1, social: -2, rep: 2 }, result: "你提议平摊，桌上短暂安静，然后有人笑着答应。后来联系少了一些。" }
      ] },
    { id: "EV09", title: "潮汐线下的借据", layerId: "L5", category: "风险", weight: 7, type: "redline",
      body: "江水准时退去，露出一张被雨泡软的借据。名字还清楚，承诺已经晕开。",
      choices: [
        { id: "repay", label: "按纸上的数还回去", cost: "现金 −−−−",
          d: { money: -4, rep: 4 }, result: "你把钱转过去，对方发来一个句号。借据被撕掉，名字终于不再流通。" },
        { id: "stall", label: "先拖着，等对方开口", cost: "风险 ▲", risk: true,
          d: { money: 1, rep: -5, social: -2 }, result: "没有人来催。三周后，一个陌生号码开始每天固定时间响两声。" },
        { id: "broker", label: "找中间人重新谈", cost: "风险 ▲", risk: true,
          d: { money: -2, social: -3, rep: -1 }, result: "中间人把数字压下来一些，条件是这件事以后由他记着。" }
      ] },
    { id: "EV10", title: "账单日", layerId: "L1", category: "金钱", weight: 10,
      body: "闹钟还没响，扣款短信先到了。没钱的人没有秘密，账单就是他们的隐私。",
      choices: [
        { id: "urgent", label: "先还最急的那笔", cost: "现金 −−",
          d: { money: -2, rep: 2 }, result: "你按到期日排了序，还掉最上面的一笔。剩下的往后挪了一个月。" },
        { id: "instal", label: "分期，把利息摊开", cost: "以后 −",
          d: { money: -1, health: -1, rep: -2 }, result: "分期页面只要三次点击。每月多出的那个数字很小，也一直都在。" },
        { id: "mute", label: "关掉短信提醒", cost: "风险 ▲", risk: true,
          d: { health: 2, rep: -3 }, result: "世界安静了两天。第三天，电话代替短信找了过来。" }
      ] }
  ];
})(window);
