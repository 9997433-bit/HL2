/* 浮城人生 · dashboard-app.js — AP, tabs, sim tick, endings */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var era, origin, run, logSeq = 0, painted = [], lastLayer = null;
  var MODAL_ODDS = [0, 0, 0.28, 0.42, 0.72];
  var STAT_NAME = { money: "现金", health: "健康", social: "人脉", rep: "声望", edu: "学历" };
  var fmt = function (n) { return n.toLocaleString("zh-CN"); };
  var esc = function (s) { return FC.esc(s); };

  function income() { return FC.Sim.income(run, era, origin); }
  function bills() { return FC.Sim.bills(run, era, origin); }
  function layerOf() { return FC.Sim.layerOf(run, origin); }

  function loadRun() {
    var inh = null;
    try { inh = localStorage.getItem("fucheng.inheritedTalent.v1"); } catch (e) { /* ignore */ }
    if (inh) FC.write({ inheritedTalent: inh });
    var saved = FC.read().run;
    if (saved && saved.key === era.id + "/" + origin.id) {
      run = FC.Sim.migrate(saved, era, origin);
    } else {
      run = FC.Sim.freshRun(era, origin);
    }
    if (FC.read().zoneQueue) {
      run.zoneQueue = FC.read().zoneQueue;
      FC.write({ zoneQueue: null });
    }
    if (typeof run.ap !== "number") FC.Sim.resetMonthAp(run, era);
    logSeq = 0;
    for (var s = run.log.length - 1; s >= 0; s--) run.log[s].seq = ++logSeq;
  }

  function pushLog(entry) {
    entry.seq = ++logSeq;
    run.log.unshift(entry);
    if (run.log.length > 60) run.log.length = 60;
    return entry;
  }

  function ts() {
    return run.year + "." + (run.month < 10 ? "0" : "") + run.month;
  }

  function paintNumber(id, value, prefix) {
    var el = $(id);
    value = Math.round(value);
    if (window.FCMotion && FCMotion.countUp) FCMotion.countUp(el, value, { prefix: prefix || "" });
    else el.textContent = (prefix || "") + fmt(value);
  }

  function bump(el) {
    el.classList.remove("fc-flash");
    void el.offsetWidth;
    el.classList.add("fc-flash");
  }

  function flyMoney(amounts, source) {
    if (!window.FCMotion || !FCMotion.moneyFloat) return;
    var shown = 0;
    for (var i = 0; i < amounts.length && shown < 3; i++) {
      if (!amounts[i] || Math.abs(amounts[i]) < 50) continue;
      FCMotion.moneyFloat(amounts[i], { target: $("sMoney"), from: source, delay: shown * 150 });
      shown++;
    }
  }

  function renderActions() {
    var grid = $("actionGrid");
    if (!grid) return;
    grid.innerHTML = FC.Sim.actions().map(function (a) {
      var ok = FC.Sim.canAction(run, a, era, origin);
      return '<button type="button" class="fc-action-btn' + (ok ? "" : " is-disabled") + '" data-action="' +
        a.id + '" ' + (ok ? "" : "disabled") + ">" +
        '<span class="fc-action-btn__icon">' + esc(a.icon) + "</span>" +
        "<b>" + esc(a.name) + "</b><span>−" + a.ap + " AP</span></button>";
    }).join("");

    $("apLabel").textContent = run.ap + "/" + run.apMax;
    var dots = $("apDots");
    dots.innerHTML = "";
    for (var i = 0; i < run.apMax; i++) {
      var d = document.createElement("span");
      d.className = "fc-ap-dot" + (i < run.ap ? " is-full" : "");
      dots.appendChild(d);
    }
    $("stageChip").textContent = FC.Sim.stage(run).label;
    $("tickBtn").disabled = run.ap > 0;
    $("apHint").textContent = run.zoneQueue
      ? "已选探区目标，可点「探区」消耗行动点。"
      : run.ap > 0
        ? "用完行动点后再推进一月。地图可设定探区目标。"
        : "行动点已用尽，可以推进一月。";
  }

  /* 人情账落地后附在日志末尾：「（人情账 · 陈姐 −2，欠着这个月的房租）」 */
  function npcNote(ledger) {
    if (!ledger || !ledger.length) return "";
    return "（人情账 · " + ledger.map(function (row) {
      var move = row.delta === 0 ? "±0" : (row.delta > 0 ? "+" : "−") + Math.abs(row.delta);
      return row.name + " " + move + (row.note ? "，" + row.note : "");
    }).join("；") + "）";
  }

  function renderNpcs() {
    var list = $("relList");
    if (!list) return;
    if (!run.npcs) FC.Sim.migrateNpcs(run);
    list.innerHTML = run.npcs.map(function (n) {
      var cls = n.balance > 0 ? "up" : n.balance < 0 ? "down" : "";
      var flag = n.flags && n.flags.length ? n.flags[n.flags.length - 1] : null;
      var last = flag ? FC.Sim.flagLabel(flag) : n.last || "暂时两不相欠";
      return '<li class="fc-relations__item fc-npc">' +
        '<div class="fc-npc__head"><span class="fc-npc__name">' + esc(n.name) +
          '<i class="fc-npc__role">' + esc(n.role) + "</i></span>" +
          '<b class="' + cls + '">' + (n.balance > 0 ? "+" : "") + n.balance + "</b></div>" +
        '<div class="fc-npc__bar" role="img" aria-label="人情结余 ' + n.balance + ' / 5">' +
          '<i class="' + cls + '" style="width:' + Math.abs(n.balance) * 10 + "%;" +
            (n.balance < 0 ? "right:50%" : "left:50%") + '"></i></div>' +
        '<p class="fc-npc__last">' + esc(last) + "</p></li>";
    }).join("");
  }

  function renderTabsExtra() {
    var trName = "职员线";
    if (FC.Sim.pack && FC.Sim.pack.careerTracks) {
      FC.Sim.pack.careerTracks.forEach(function (t) {
        if (t.id === run.career.track) trName = t.name;
      });
    }
    $("careerTitle").textContent = FC.Sim.careerTitle(run) + " · " + trName;
    $("kpiVal").textContent = run.career.kpi + " / 100";
    $("kpiMeter").style.width = run.career.kpi + "%";
    renderNpcs();
    $("assetKv").innerHTML =
      "<dt>房产</dt><dd>" + esc(run.assets.property || "无") + "</dd>" +
      "<dt>副业基金</dt><dd>¥" + fmt(run.assets.sideFund || 0) + "</dd>" +
      "<dt>负债本金</dt><dd>¥" + fmt(run.debt) + "</dd>" +
      "<dt>学历</dt><dd>" + run.edu + " / 100</dd>" +
      (run.talents.length ? "<dt>印记</dt><dd>" + esc(run.talents.join("、")) + "</dd>" : "");
  }

  function render(flash) {
    var L = layerOf();
    var layer = FC.LAYERS[L - 1];
    var inc = income();
    var out = bills().reduce(function (a, b) { return a + b.v; }, 0);
    run.income = inc - out;

    $("identity").textContent = origin.name + "　·　" + era.name;
    $("eraChip").textContent = era.id + " · " + era.name + "　" + era.years;
    $("originChip").textContent = "出身 " + origin.name + " / " + origin.en;
    $("layerChip").textContent = layer.id + " " + layer.name;
    $("layerChip").style.color = "var(--" + layer.key + ")";
    $("layerChip").style.borderColor = "var(--" + layer.key + ")";
    $("clock").textContent = ts();
    $("season").textContent = ["深冬 · 暖气与欠费", "早春 · 招聘季", "雨季 · 账单日临近", "盛夏 · 电费翻倍", "秋汛 · 年底考核"]
      [Math.floor(run.month / 2.5) % 5];

    var starving = run.money < out;
    $("moneyStat").classList.toggle("is-warning", starving);
    $("moneyWarn").hidden = !starving;

    paintNumber("sMoney", run.money, "¥");
    $("dMoney").textContent = run.gap > 0
      ? "空窗期 · 剩 " + run.gap + " 个月　月净流 " + (run.income >= 0 ? "+¥" : "−¥") + fmt(Math.abs(run.income))
      : "月净流 " + (run.income >= 0 ? "+¥" : "−¥") + fmt(Math.abs(run.income));
    $("dMoney").className = "fc-stat__delta " + (run.income >= 0 ? "up" : "down");

    paintNumber("sHealth", run.health);
    $("mHealth").style.width = run.health + "%";
    paintNumber("sSocial", run.social);
    $("mSocial").style.width = run.social + "%";
    paintNumber("sRep", run.rep);
    $("mRep").style.width = run.rep + "%";
    paintNumber("sAge", run.age);
    $("dAge").textContent = "已在城中 " + run.months + " 个月 · " + FC.Sim.stage(run).label;
    paintNumber("sDebt", run.debt, "¥");

    $("bills").innerHTML = bills().map(function (b) {
      return "<dt>" + b.k + "</dt><dd>−¥" + fmt(b.v) + "</dd>";
    }).join("") + "<dt>月收入</dt><dd style='color:var(--ok)'>+¥" + fmt(inc) + "</dd>";

    var ratio = Math.round((out / Math.max(inc, 1)) * 100);
    $("ratio").textContent = ratio + "% 支出占比";
    $("mRatio").style.width = Math.min(100, ratio) + "%";

    $("elevatorPanel").style.setProperty("--tint", "var(--" + layer.key + ")");
    $("elevator").innerHTML = FC.LAYERS.map(function (l, i) {
      return '<div class="fc-elevator__step ' + (i + 1 === L ? "is-here" : "") +
        '" style="--tint:var(--' + l.key + ')"><b>' + l.id + "</b><span>" + l.name + "</span></div>";
    }).join("");
    $("layerNote").textContent = layer.description;

    var sagaBanner = $("sagaBanner");
    if (sagaBanner) {
      if (run.saga) {
        var sagaMeta = FC.Sim.sagaById ? FC.Sim.sagaById(run.saga.id) : null;
        var sagaTotal = sagaMeta && sagaMeta.steps ? sagaMeta.steps.length : "?";
        sagaBanner.textContent = "链式事件 · " + run.saga.title + " · 第 " +
          (run.saga.step + 1) + "/" + sagaTotal + " 步";
        sagaBanner.hidden = false;
      } else {
        sagaBanner.hidden = true;
      }
    }

    renderActions();
    renderTabsExtra();
    if (lastLayer !== null && lastLayer !== L && window.FCMotion && FCMotion.layerPulse) {
      FCMotion.layerPulse($("elevatorPanel"), L);
    }
    lastLayer = L;
    if (flash) { bump($("sMoney")); bump($("sHealth")); }
    FC.write({ run: run });
  }

  function logItem(e, i) {
    var deltas = Object.keys(e.d || {}).map(function (k) {
      var v = e.d[k];
      return '<span class="' + (v >= 0 ? "up" : "down") + '">' + (STAT_NAME[k] || k) +
        " " + (v >= 0 ? "+" : "−") + Math.abs(v) + "</span>";
    }).join("");
    return '<li class="fc-log__item is-new" style="--i:' + Math.min(i, 7) + '">' +
      '<div class="fc-log__time">' + e.t + "</div><div class=fc-log__body>" +
      '<span class="fc-log__tag" style="color:' + e.tint + '">' + esc(e.tag) + "</span><p>" +
      esc(e.text) + '</p><div class="fc-log__delta">' + deltas + "</div></div></li>";
  }

  function renderLog() {
    var list = $("log");
    var head = run.log.slice(0, 24);
    var top = painted.length ? painted[0] : 0;
    var fresh = [], i;
    for (i = 0; i < head.length; i++) {
      if (head[i].seq <= top) break;
      fresh.push(head[i]);
    }
    if (!painted.length || list.children.length !== painted.length || fresh.length === head.length) {
      list.innerHTML = head.map(logItem).join("");
    } else if (fresh.length) {
      for (i = fresh.length - 1; i >= 0; i--) list.insertAdjacentHTML("afterbegin", logItem(fresh[i], i));
      while (list.children.length > head.length) list.removeChild(list.lastChild);
    }
    painted = head.map(function (e) { return e.seq; });
  }

  function ambientToLog(ev, applied) {
    return {
      /* 151/301 ambient 事件没写 layerId；缺省按 L2，别让整月结算炸掉 */
      t: ts(), tag: ev.category || "城市", tint: "var(--l" + (parseInt(String(ev.layerId || "L2").replace(/\D/g, ""), 10) || 2) + ")",
      text: ev.text || ev.title, d: applied
    };
  }

  function settleMonth(moves) {
    moves.push(run.income);
    run.money += run.income;
    run.debt = Math.max(0, run.debt - Math.round(run.debt * 0.015));
    if (run.money < 0) { run.debt += -run.money; run.money = 0; }
    var rest = run.income > 0 ? 2.4 : 1.0;
    var wear = 0.28 + Math.max(0, (run.age - 38) * 0.035);
    run.health = Math.max(0, Math.min(100, run.health + rest - wear));
  }

  function buildLedgerPayload() {
    var RENT = ["城中村单间", "合租主卧", "一室一厅", "江景两居", "临时落脚"];
    return {
      ym: ts(),
      rows: bills().map(function (b) {
        var note = b.k === "房租" ? RENT[layerOf() - 1] || "" : b.k === "还贷" ? "月供利息" : "";
        return { label: b.k, note: note, amount: -b.v };
      }),
      income: income(),
      net: run.income
    };
  }

  function maybeShowLedger(silent) {
    if (silent || !FC.ledger) return;
    if (run.months === 1 || run.income < 0 || run.month === 12) FC.ledger.show(buildLedgerPayload());
  }

  function drawModalEvent() {
    if (!FC.events || FC.events.isOpen()) return null;
    run.sinceModal = (run.sinceModal || 0) + 1;
    if (Math.random() >= MODAL_ODDS[Math.min(run.sinceModal, 4)]) return null;
    if (!run.done) run.done = {};
    var draw = {
      layer: layerOf(),
      avoid: run.recentModal || [],
      era: era.id,
      months: run.months,
      done: run.done,
      npcs: run.npcs
    };
    var ev = FC.events.pick(draw);
    if (!ev) return null;
    if (ev.type === "redline" && (run.months < 6 || (run.lastRedline && run.months - run.lastRedline < 12))) {
      draw.allowRedline = false;
      ev = FC.events.pick(draw);
      if (!ev) return null;
    }
    if (ev.type === "redline") run.lastRedline = run.months;
    if (ev.once) run.done[ev.id] = true;
    run.sinceModal = 0;
    /* Eight is roughly two years of knocks: with a deck this size a window of
       three still let the same door repeat within the year. */
    run.recentModal = (run.recentModal || []).concat(ev.id).slice(-8);
    return ev;
  }

  function openEvent(ev, silent) {
    return FC.events.show(ev, { moneyRef: income() }).then(function (res) {
      if (res.dismissed) return true;
      var applied = FC.Sim.applyDeltas(run, res.deltas, income());
      var ledger = FC.Sim.applyNpcEffects(run, res.choice && res.choice.npcEffects);
      pushLog({
        t: ts(), tag: ledger.length ? ledger[0].name : (FC.events.TYPE_LABEL[ev.type] || ev.category),
        tint: ledger.length ? "var(--neon-amber)" : "var(--l" + ev.layerIndex + ")",
        text: "【" + ev.title + "】" + ((res.choice && res.choice.result) || "") + npcNote(ledger),
        d: applied
      });
      render(true); renderLog(); flyMoney([applied.money], null);
      maybeShowLedger(silent);
      return true;
    });
  }

  function checkEnding() {
    var kind = FC.Sim.checkEnd(run, origin);
    if (!kind || !FC.ending) return Promise.resolve(false);
    run.ended = true;
    var payload = FC.ending.buildPayload(run, era, origin, kind);
    return FC.ending.show(payload).then(function () {
      FC.write({ run: null });
      window.location.href = "../index.html";
    });
  }

  function sagaTag() {
    var meta = FC.Sim.sagaById ? FC.Sim.sagaById(run.saga.id) : null;
    return meta && meta.kind === "origin"
      ? { label: "出身 · " + run.saga.title, tint: "var(--neon-amber)" }
      : { label: "链式事件", tint: "var(--neon-violet)" };
  }

  function resolveSagaStep(step, silent) {
    var tag = sagaTag();
    if (step.choices && step.choices.length && FC.events) {
      var sagaEv = {
        id: "saga_" + run.saga.id + "_" + run.saga.step,
        type: "opportunity",
        title: step.title || run.saga.title,
        body: step.text,
        category: tag.label,
        layerId: "L" + layerOf(),
        choices: step.choices.map(function (c, i) {
          return { id: String(i), label: c.text, d: c.d, result: c.text };
        })
      };
      return FC.events.show(sagaEv, { moneyRef: income() }).then(function (res) {
        if (res.dismissed) return false;
        var idx = res.choiceId != null ? parseInt(res.choiceId, 10) || 0 : 0;
        var applied = FC.Sim.advanceSaga(run, idx, income());
        pushLog({
          t: ts(), tag: tag.label, tint: tag.tint,
          text: step.text, d: applied.applied
        });
        render(true);
        renderLog();
        return true;
      });
    }
    var applied = FC.Sim.advanceSaga(run, 0, income());
    pushLog({ t: ts(), tag: tag.label, tint: tag.tint, text: step.text, d: applied.applied });
    return Promise.resolve(true);
  }

  function finishMonth(moves, silent) {
    var amb = FC.Sim.pickAmbient(run, era, origin);
    if (amb) {
      var apAmb = FC.Sim.applyDeltas(run, amb.d || {}, income());
      if (apAmb.money) moves.push(apAmb.money);
      pushLog(ambientToLog(amb, apAmb));
    }

    if (run.gap > 0) run.gap--;
    settleMonth(moves);

    if (run.health <= 4) {
      var fee = Math.round(income() * 2.2);
      run.money -= fee;
      if (run.money < 0) { run.debt += -run.money; run.money = 0; }
      run.health = 26;
      moves.push(-fee);
      pushLog({ t: ts(), tag: "透支", tint: "var(--bad)", text: "你在工位上失去意识。身体的账单，最后一起结。", d: { money: -fee, health: 22 } });
    }

    FC.Sim.resetMonthAp(run, era);
    render(true);
    renderLog();
    flyMoney(moves, $("tickBtn"));

    return checkEnding().then(function (ended) {
      if (ended) return true;
      var ev = drawModalEvent();
      if (!ev) { maybeShowLedger(silent); return false; }
      return openEvent(ev, silent);
    });
  }

  function tick(silent) {
    if (run.ap > 0) {
      pushLog({ t: ts(), tag: "系统", tint: "var(--text-faint)", text: "还有 " + run.ap + " 点行动点未使用。", d: {} });
      renderLog();
      return Promise.resolve(false);
    }

    run.months++;
    run.month++;
    if (run.month > 12) { run.month = 1; run.year++; }
    if (run.months % 12 === 0) run.age++;

    if (!FC.Sim.tryStartOriginSaga(run, origin)) FC.Sim.tryStartRandomSaga(run, era, origin);
    var moves = [];

    var sagaChain = Promise.resolve();
    if (run.saga) {
      var step = FC.Sim.sagaStep(run);
      if (step) sagaChain = resolveSagaStep(step, silent);
    }

    return sagaChain.then(function () {
      return finishMonth(moves, silent);
    });
  }

  function onAction(id) {
    var res = FC.Sim.doAction(run, id, era, origin);
    if (!res) return;
    pushLog({ t: ts(), tag: "行动", tint: "var(--neon-cyan)", text: res.text, d: res.applied });
    if (res.zoneEvent) {
      var zd = FC.Sim.applyDeltas(run, res.zoneEvent.d || {}, income());
      pushLog(ambientToLog(res.zoneEvent, zd));
      flyMoney([zd.money], null);
    }
    render(true);
    renderLog();
  }

  function bindTabs() {
    document.querySelectorAll(".fc-tabs__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tab = btn.dataset.tab;
        document.querySelectorAll(".fc-tabs__btn").forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        });
        document.querySelectorAll(".fc-tabpanel").forEach(function (p) {
          var on = p.id === "tab-" + tab;
          p.hidden = !on;
          p.classList.toggle("is-active", on);
        });
      });
    });
  }

  function init() {
    era = FC.era();
    origin = FC.effectiveOrigin ? FC.effectiveOrigin() : FC.origin();
    loadRun();

    $("actionGrid").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (btn && !btn.disabled) onAction(btn.dataset.action);
    });

    $("tickBtn").addEventListener("click", function () { tick(false); });
    $("tick6Btn").addEventListener("click", function () {
      if (!window.confirm("快进会连续推进 3 个月（每月仍需先花完行动点）。确定？")) return;
      (function step(i) {
        if (i >= 3) return;
        tick(i < 2).then(function (hit) {
          if (!hit) step(i + 1);
          else pushLog({ t: ts(), tag: "系统", tint: "var(--text-faint)", text: "快进被一件事打断。", d: {} });
        });
      })(0);
    });
    $("ledgerBtn").addEventListener("click", function () { FC.ledger.show(buildLedgerPayload()); });
    $("resetBtn").addEventListener("click", function () {
      if (FC.events) FC.events.close();
      if (FC.ledger) FC.ledger.close();
      run = FC.Sim.freshRun(era, origin);
      FC.Sim.resetMonthAp(run, era);
      run.log = [];
      pushLog({ t: ts(), tag: "入城", tint: "var(--neon-amber)", text: "你在" + era.name + "走出车站。", d: {} });
      render(true); renderLog();
    });
    $("log").addEventListener("animationend", function (ev) {
      if (ev.animationName === "fc-logslide") ev.target.classList.remove("is-new");
    });

    bindTabs();
    if (FC.events) FC.events.load();
    if (!run.log.length) {
      pushLog({ t: ts(), tag: "入城", tint: "var(--neon-amber)",
        text: "你在" + era.name + "走出车站。城市照常运转，你只是千万进程里的一个节点。", d: {} });
    }
    $("tickBtn").disabled = false;
    $("tick6Btn").disabled = false;
    $("resetBtn").disabled = false;
    $("ledgerBtn").disabled = !FC.ledger;
    render(false);
    renderLog();
  }

  FC.ready.then(init, function () {
    $("identity").textContent = "市民档案读取失败";
    $("season").textContent = "请通过本地服务器打开";
  });
})();
