/* 浮城人生 · dashboard-app.js — AP, tabs, sim tick, endings */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var era, origin, run, logSeq = 0, painted = [], lastLayer = null;
  var MODAL_ODDS = [0, 0, 0.28, 0.42, 0.72];
  var STAT_NAME = { money: "现金", health: "健康", social: "人脉", rep: "声望", edu: "学历" };
  var NPC_LAYER = { laozhou: 2, chenjie: 1, amin: 1, wangzong: 4, xiaoyu: 2 };
  var CONTRACT_RING_C = 100.53;
  var fmt = function (n) { return n.toLocaleString("zh-CN"); };
  var esc = function (s) { return FC.esc(s); };

  /* Mini map zones — keys must match gameplay-pack zoneEvents + city-map.html */
  var ZONE_PICKER = [
    { id: "L5", zones: [
      { key: "broker", name: "灰色中介" },
      { key: "alley", name: "夜场后巷" },
      { key: "factory", name: "废弃厂区" }
    ]},
    { id: "L4", zones: [
      { key: "auction", name: "拍卖行" }
    ]},
    { id: "L3", zones: [
      { key: "school", name: "重点中学" },
      { key: "exam", name: "考场" },
      { key: "jobfair", name: "校招现场" },
      { key: "nightclass", name: "夜校 / 证书班" },
      { key: "incubator", name: "创业孵化器" }
    ]},
    { id: "L2", zones: [
      { key: "office", name: "写字楼" },
      { key: "rent", name: "合租房" },
      { key: "metro", name: "早高峰地铁" },
      { key: "mall", name: "连锁商圈" },
      { key: "bank", name: "银行网点" }
    ]},
    { id: "L1", zones: [
      { key: "village", name: "城中村" },
      { key: "market", name: "早市" },
      { key: "delivery", name: "外卖站点" },
      { key: "nightfood", name: "夜宵大排档" },
      { key: "labor", name: "劳务市场" }
    ]}
  ];
  var ZONE_BY_KEY = {};
  var zonePickerHost = null;
  var zonePickerLayerId = "L2";

  ZONE_PICKER.forEach(function (stratum) {
    stratum.zones.forEach(function (z) {
      ZONE_BY_KEY[z.key] = { name: z.name, layerId: stratum.id };
    });
  });

  function zoneLabel(key) {
    return key && ZONE_BY_KEY[key] ? ZONE_BY_KEY[key].name : null;
  }

  function zoneLayerTint(key) {
    var meta = ZONE_BY_KEY[key];
    if (!meta) return "var(--neon-cyan)";
    var layer = FC.byId(FC.LAYERS, meta.layerId);
    return layer ? "var(--" + layer.key + ")" : "var(--neon-cyan)";
  }

  function renderLocationChip() {
    var textEl = $("locChipText");
    var chip = $("locChip");
    if (!textEl || !chip) return;
    var key = run.zoneQueue;
    textEl.textContent = zoneLabel(key) || "未设探区";
    chip.classList.toggle("is-set", !!key);
    chip.style.setProperty("--tint", key ? zoneLayerTint(key) : "var(--text-faint)");
  }

  function zonePickerBodyHtml() {
    var target = run.zoneQueue;
    var strip = FC.LAYERS.map(function (l) {
      return '<button type="button" class="fc-elevator__step is-pick' +
        (l.id === zonePickerLayerId ? " is-active" : "") +
        '" data-layer="' + l.id + '" style="--tint:var(--' + l.key + ')">' +
        "<b>" + l.id + "</b><span>" + esc(l.name) + "</span></button>";
    }).join("");

    var zones = [];
    ZONE_PICKER.forEach(function (s) {
      if (s.id === zonePickerLayerId) zones = s.zones;
    });
    var activeLayer = FC.byId(FC.LAYERS, zonePickerLayerId);
    var tint = activeLayer ? "var(--" + activeLayer.key + ")" : "var(--neon-cyan)";
    var zoneBtns = zones.map(function (z) {
      var meta = FC.Sim.zoneBlurb ? FC.Sim.zoneBlurb(z.key) : null;
      var preview = meta
        ? '<small class="fc-zone-mini__meta">风险' + esc(meta.risk) +
          ' · 收益' + esc(meta.reward) + "</small>" +
          '<small class="fc-zone-mini__blurb">' + esc(meta.blurb) + "</small>"
        : "";
      return '<button type="button" class="fc-zone-mini__btn' +
        (target === z.key ? " is-target" : "") +
        '" data-zone="' + z.key + '" style="--tint:' + tint + '">' +
        "<b>" + esc(z.name) + "</b>" + preview + "</button>";
    }).join("");

    return '<div class="fc-zone-mini" style="--tint:' + tint + '">' +
      '<div class="fc-zone-mini__strip"><div class="fc-elevator">' + strip + "</div></div>" +
      '<div class="fc-zone-mini__zones">' + zoneBtns + "</div></div>";
  }

  function closeZonePicker() {
    if (!zonePickerHost) return;
    zonePickerHost.classList.add("is-closing");
    var host = zonePickerHost;
    var done = function () {
      if (host.parentNode) host.parentNode.removeChild(host);
      if (zonePickerHost === host) zonePickerHost = null;
    };
    host.addEventListener("animationend", function (e) {
      if (e.animationName === "fc-sheet-down") done();
    });
    setTimeout(done, 400);
    if (FC.overlay) FC.overlay.pop(host);
  }

  function paintZonePicker() {
    if (!zonePickerHost) return;
    var body = zonePickerHost.querySelector(".fc-zone-picker__body");
    if (body) body.innerHTML = zonePickerBodyHtml();
  }

  function selectZone(key) {
    run.zoneQueue = key;
    FC.write({ run: run });
    closeZonePicker();
    renderActions();
    renderLocationChip();
    $("apHint").textContent = "已选探区「" + zoneLabel(key) + "」，可点「探区」消耗行动点。";
  }

  function openZonePicker() {
    if (zonePickerHost) {
      paintZonePicker();
      return;
    }
    var meta = run.zoneQueue && ZONE_BY_KEY[run.zoneQueue];
    zonePickerLayerId = meta ? meta.layerId : ("L" + layerOf());

    zonePickerHost = document.createElement("div");
    zonePickerHost.id = "zonePicker";
    zonePickerHost.className = "fc-sheet";
    zonePickerHost.innerHTML =
      '<div class="fc-sheet__scrim"></div>' +
      '<div class="fc-sheet__panel" role="dialog" aria-modal="true" aria-label="选择探区" tabindex="-1">' +
        '<i class="fc-sheet__grip" aria-hidden="true"></i>' +
        '<header class="fc-sheet__head">' +
          '<h2 class="fc-sheet__title">选择探区 <span class="fc-sheet__ym">ZONE</span></h2>' +
          '<p class="fc-sheet__caption">左边 L1–L5 是城市圈层，右边是该层的具体地点。' +
            '<b>点选一个地点只是设目标</b>；回到仪表盘再点行动「探区」，才会花 1 点 AP 去那里触发事件。</p>' +
        "</header>" +
        '<div class="fc-zone-picker__body"></div>' +
        '<p class="fc-quote" style="margin:12px 0 0;font-size:12px">例：选「拍卖行」≠ 立刻进场；还要再点一次「探区」行动。</p>' +
        '<a class="fc-btn fc-btn--ghost fc-sheet__done" href="city-map.html" style="width:100%;margin-top:12px">打开完整城市地图</a>' +
        '<button type="button" class="fc-btn fc-btn--primary fc-sheet__done" style="width:100%;margin-top:8px">选好了，点「探区」行动</button>' +
      "</div>";

    var panel = zonePickerHost.querySelector(".fc-sheet__panel");
    zonePickerHost.querySelector(".fc-zone-picker__body").innerHTML = zonePickerBodyHtml();

    function onKey(e) {
      if (e.key === "Escape") closeZonePicker();
      if (e.key === "Tab" && FC.overlay) FC.overlay.trap(panel, e);
    }

    zonePickerHost.addEventListener("click", function (e) {
      if (e.target.closest(".fc-sheet__scrim")) closeZonePicker();
      var layerBtn = e.target.closest("[data-layer]");
      if (layerBtn && layerBtn.classList.contains("is-pick")) {
        zonePickerLayerId = layerBtn.dataset.layer;
        paintZonePicker();
        return;
      }
      var zoneBtn = e.target.closest("[data-zone]");
      if (zoneBtn) selectZone(zoneBtn.dataset.zone);
      if (e.target.closest(".fc-sheet__done") && e.target.tagName === "BUTTON") closeZonePicker();
    });

    document.body.appendChild(zonePickerHost);
    if (FC.overlay && FC.overlay.push("sheet", zonePickerHost)) {
      FC.overlay.top().onKey = onKey;
    }
    panel.focus();
  }

  function income() { return FC.Sim.income(run, era, origin); }
  function bills() { return FC.Sim.bills(run, era, origin); }
  function layerOf() { return FC.Sim.layerOf(run, origin); }

  function loadRun() {
    var inh = null;
    try {
      var raw = localStorage.getItem("fucheng.inheritedTalents.v1");
      if (raw) inh = JSON.parse(raw);
    } catch (e) { /* ignore */ }
    if (!inh || !inh.length) {
      try { inh = localStorage.getItem("fucheng.inheritedTalent.v1"); } catch (e2) { /* ignore */ }
      if (inh) inh = [inh];
    }
    if (inh && inh.length) FC.write({ inheritedTalent: inh[0], inheritedTalents: inh });
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

  /* 高频四行动常驻手机底栏；其余收进「更多」抽屉 */
  var QUICK_ACTIONS = ["work", "rest", "explore", "network"];

  function actionBtn(a, extra, suggestId) {
    var ok = FC.Sim.canAction(run, a, era, origin);
    var suggested = suggestId && a.id === suggestId;
    return '<button type="button" class="fc-action-btn' + (ok ? "" : " is-disabled") +
      (suggested ? " is-suggested" : "") +
      (extra ? " " + extra : "") + '" data-action="' +
      a.id + '" ' + (ok ? "" : "disabled") + ">" +
      (suggested ? '<span class="fc-action-btn__badge">建议</span>' : "") +
      '<span class="fc-action-btn__icon">' + esc(a.icon) + "</span>" +
      "<b>" + esc(a.name) + "</b><span>−" + a.ap + " AP</span></button>";
  }

  function monthAdvice() {
    if (!FC.Sim.suggestMonth) return null;
    return FC.Sim.suggestMonth(run, era, origin);
  }

  function renderMonthAdvice() {
    var el = $("monthAdvice");
    if (!el) return;
    var tip = monthAdvice();
    if (!tip) { el.hidden = true; return; }
    el.hidden = false;
    el.className = "fc-month-advice is-" + (tip.urgency || "low");
    var label = tip.actionId === null ? "推进一月"
      : tip.actionId === "side" ? "副业"
        : tip.actionId === "study" ? "进修"
          : tip.actionId === "rest" ? "休息"
            : tip.actionId === "explore" ? "探区"
              : tip.actionId === "network" ? "饭局"
                : tip.actionId === "work" ? "上班" : "行动";
    el.innerHTML = '<span class="fc-month-advice__tag">本月建议 · ' + esc(label) + "</span>" +
      '<span class="fc-month-advice__text">' + esc(tip.reason) + "</span>";
  }

  function apDotsHtml() {
    var html = "";
    for (var i = 0; i < run.apMax; i++) {
      html += '<span class="fc-ap-dot' + (i < run.ap ? " is-full" : "") + '"></span>';
    }
    return html;
  }

  /* 手机底栏：AP 点 + 4 高频行动 + 「更多」；AP 用尽时换成「推进一月」主按钮 */
  function renderDock() {
    var dock = $("mobileDock");
    if (!dock) return;
    var tip = monthAdvice();
    var suggestId = tip && tip.actionId;
    var all = FC.Sim.actions();
    var byId = {}, quick = [], rest = [], i;
    for (i = 0; i < all.length; i++) byId[all[i].id] = all[i];
    for (i = 0; i < QUICK_ACTIONS.length; i++) {
      if (byId[QUICK_ACTIONS[i]]) quick.push(byId[QUICK_ACTIONS[i]]);
    }
    for (i = 0; i < all.length; i++) {
      if (QUICK_ACTIONS.indexOf(all[i].id) < 0) rest.push(all[i]);
    }

    $("dockDots").innerHTML = apDotsHtml();
    if (run.ap <= 0) {
      $("dockActions").innerHTML =
        '<button type="button" class="fc-btn fc-btn--primary fc-dock__tick" data-dock-tick>推进一月 ▸</button>';
    } else {
      $("dockActions").innerHTML = quick.map(function (a) {
        return actionBtn(a, "fc-dock__btn", suggestId);
      }).join("") +
        '<button type="button" class="fc-action-btn fc-dock__btn" data-dock-more aria-haspopup="dialog">' +
        '<span class="fc-action-btn__icon">⋯</span><b>更多</b><span>' + rest.length + " 项</span></button>";
    }
    var drawerGrid = $("drawerActions");
    if (drawerGrid) {
      drawerGrid.innerHTML = rest.map(function (a) { return actionBtn(a, "", suggestId); }).join("");
    }
  }

  function renderActions() {
    var grid = $("actionGrid");
    if (!grid) return;
    var tip = monthAdvice();
    var suggestId = tip && tip.actionId;
    grid.innerHTML = FC.Sim.actions().map(function (a) {
      return actionBtn(a, "", suggestId);
    }).join("");

    $("apLabel").textContent = run.ap + "/" + run.apMax;
    $("apDots").innerHTML = apDotsHtml();
    $("stageChip").textContent = FC.Sim.stage(run).label;
    $("tickBtn").disabled = run.ap > 0;

    var blurb = run.zoneQueue && FC.Sim.zoneBlurb ? FC.Sim.zoneBlurb(run.zoneQueue) : null;
    if (run.ap <= 0) {
      $("apHint").textContent = "行动点已用尽，可以推进一月。";
    } else if (run.zoneQueue && blurb) {
      $("apHint").textContent = "探区「" + (zoneLabel(run.zoneQueue) || "") +
        "」· 风险" + blurb.risk + " / 收益" + blurb.reward + " — " + blurb.blurb +
        "　点「探区」消耗 1 AP。";
    } else if (run.zoneQueue) {
      $("apHint").textContent = "已选探区「" + (zoneLabel(run.zoneQueue) || run.zoneQueue) +
        "」，可点「探区」消耗行动点。";
    } else if (tip && tip.reason) {
      $("apHint").textContent = tip.reason;
    } else {
      $("apHint").textContent = "用完行动点后再推进一月。上方可设定探区目标。";
    }
    renderMonthAdvice();
    renderDock();
  }

  /* 人情账落地后附在日志末尾：「（人情账 · 陈姐 −2，欠着这个月的房租）」 */
  function npcNote(ledger) {
    if (!ledger || !ledger.length) return "";
    return "（人情账 · " + ledger.map(function (row) {
      var move = row.delta === 0 ? "±0" : (row.delta > 0 ? "+" : "−") + Math.abs(row.delta);
      return row.name + " " + move + (row.note ? "，" + row.note : "");
    }).join("；") + "）";
  }

  function npcFlagLine(n) {
    var flag = n.flags && n.flags.length ? n.flags[n.flags.length - 1] : null;
    var arc = run.npcArc && run.npcArc[n.id];
    var arcMeta = FC.Sim.NPC_ARCS && FC.Sim.NPC_ARCS[n.id];
    var arcLine = "";
    if (arcMeta && arc) {
      if (arc.done) arcLine = "短线「" + arcMeta.title + "」已完结";
      else if (arc.step > 0) arcLine = "短线「" + arcMeta.title + "」" + arc.step + "/" + arcMeta.steps.length;
    }
    if (flag) {
      return "「" + FC.Sim.flagLabel(flag) + " · 第" + run.months + "月」" +
        (arcLine ? " · " + arcLine : "");
    }
    if (arcLine) return "「" + arcLine + "」";
    if (n.last) return "「" + n.last + " · 第" + run.months + "月」";
    return "「暂时两不相欠」";
  }

  function setContractRing(ratio, label) {
    var ring = $("contractRing");
    if (!ring) return;
    var pct = Math.max(0, Math.min(1, ratio || 0));
    ring.style.strokeDasharray = String(CONTRACT_RING_C);
    ring.style.strokeDashoffset = String(CONTRACT_RING_C * (1 - pct));
    var lbl = $("contractRingLabel");
    if (lbl) lbl.textContent = label || "";
  }

  function renderNpcs() {
    var list = $("relList");
    if (!list) return;
    if (!run.npcs) FC.Sim.migrateNpcs(run);
    list.innerHTML = run.npcs.map(function (n) {
      var cls = n.balance > 0 ? "up" : n.balance < 0 ? "down" : "";
      var layer = NPC_LAYER[n.id] || 2;
      var barW = Math.abs(n.balance) * 10;
      var barStyle = n.balance > 0
        ? 'left:50%;width:' + barW + '%'
        : n.balance < 0
          ? 'right:50%;width:' + barW + '%'
          : 'width:0';
      var score = n.balance > 0 ? "+" + n.balance : String(n.balance);
      var acts = FC.Sim.npcInteractOptions
        ? FC.Sim.npcInteractOptions(run, n.id)
        : [];
      var actHtml = acts.map(function (a) {
        return '<button type="button" class="fc-npc-act' + (a.disabled ? " is-disabled" : "") +
          '" data-npc="' + n.id + '" data-npc-act="' + a.id + '" ' +
          (a.disabled ? "disabled" : "") + " title=\"" + esc(a.hint || a.cost || "") + "\">" +
          esc(a.label) + "</button>";
      }).join("");
      return '<li class="fc-npc-card" style="--ring:var(--l' + layer + ')">' +
        '<div class="fc-npc-card__avatar" aria-hidden="true"><span>' +
          esc(n.name.charAt(0)) + "</span></div>" +
        '<div class="fc-npc-card__body">' +
          '<div class="fc-npc-card__head">' +
            '<b class="fc-npc-card__name">' + esc(n.name) + "</b>" +
            '<span class="fc-npc-card__role">' + esc(n.role) + "</span></div>" +
          '<div class="fc-npc-card__balance" role="img" aria-label="人情结余 ' + n.balance + ' / 5">' +
            '<div class="fc-npc-card__bar"><i class="' + cls + '" style="' + barStyle + '"></i></div>' +
            '<span class="fc-npc-card__score ' + cls + '">' + score + "</span></div>" +
          '<p class="fc-npc-card__flag">' + esc(npcFlagLine(n)) + "</p>" +
          (actHtml ? '<div class="fc-npc-card__acts">' + actHtml + "</div>" : "") +
          "</div></li>";
    }).join("");
    /* 关系 Tab 内重绘时补回 fc-rise，否则 is-active 规则会把新卡压成透明。 */
    if (list.closest(".fc-tabpanel.is-active")) {
      var cards = list.querySelectorAll(".fc-npc-card");
      for (var i = 0; i < cards.length; i++) cards[i].classList.add("fc-rise");
    }
  }

  function onNpcInteract(npcId, kind) {
    if (!FC.Sim.interactNpc) return;
    var res = FC.Sim.interactNpc(run, npcId, kind, era, origin);
    if (!res) return;
    if (res.error) {
      $("apHint").textContent = res.error;
      return;
    }
    pushLog({
      t: ts(), tag: res.npc.name, tint: "var(--neon-amber)",
      text: res.text + npcNote(res.ledger) + "（余波可能下月上门。）",
      d: res.applied, kind: "npc"
    });
    render(true);
    renderLog();
    flyMoney([res.applied && res.applied.money], null);
  }

  /* 合约 HUD 常驻在圈层条下面：签了就一直挂着进度和剩余月数，没签就挂一个入口。 */
  function renderContract() {
    var hud = $("contractHud");
    if (!hud || !FC.contract) return;
    var c = run.contract;
    var btn = $("contractPickBtn");
    var state = $("contractState");
    var prompt = $("contractPrompt");
    var canPick = FC.contract.canPick(run);
    var awaiting = canPick && !c;

    hud.hidden = false;
    hud.classList.toggle("is-idle", !c);
    hud.classList.toggle("is-active", !!(c && c.status === "active"));
    hud.classList.toggle("is-awaiting", awaiting);
    if (btn) btn.hidden = !canPick;
    if (prompt) prompt.hidden = !awaiting;

    if (!c) {
      hud.style.setProperty("--tint", awaiting ? "var(--warn)" : "var(--text-dim)");
      $("contractName").textContent = "尚未签约";
      state.textContent = canPick ? "可签" : "已错过";
      state.className = "fc-contract-hud__state" + (canPick ? " is-urgent" : "");
      $("contractBar").style.width = "0%";
      $("contractProgress").textContent = canPick
        ? "落户 / 首付 / 升职，三选一"
        : "这一局没有签下任何合约";
      $("contractDeadline").textContent = canPick
        ? "第 " + FC.contract.PICK_WINDOW + " 月前有效"
        : "签约窗口已关闭";
      if (canPick) {
        var pickSpan = FC.contract.PICK_WINDOW + 1;
        var pickLeft = Math.max(0, pickSpan - (run.months || 0));
        setContractRing(pickLeft / pickSpan, pickLeft + "月");
      } else {
        setContractRing(0, "");
      }
      return;
    }

    var def = FC.contract.def(c.id) || {};
    var pct = FC.Sim.refreshContract(run);
    var monthsLeft = FC.Sim.contractMonthsLeft(run);
    var deadlineTotal = c.deadlineMonths || def.deadline || 1;
    hud.style.setProperty("--tint", def.tint || "var(--neon-cyan)");
    $("contractName").textContent = def.name || c.id;
    $("contractBar").style.width = Math.min(100, pct) + "%";
    $("contractProgress").textContent = FC.contract.progressLabel(run);
    $("contractDeadline").textContent = FC.contract.deadlineLabel(run);

    state.textContent = c.status === "won" ? "已达成"
      : c.status === "failed" ? "已失效"
        : monthsLeft <= 6 ? "倒计时" : "进行中";
    state.className = "fc-contract-hud__state" +
      (c.status === "won" ? " is-won"
        : c.status === "failed" ? " is-failed"
          : monthsLeft <= 6 ? " is-urgent" : "");

    if (c.status === "active") {
      setContractRing(
        Math.max(0, monthsLeft) / deadlineTotal,
        Math.max(0, monthsLeft) + "月"
      );
    } else {
      setContractRing(c.status === "won" ? 1 : 0, c.status === "won" ? "✓" : "×");
    }
  }

  /* 选轨卡被补弹逻辑推到下次进门时，玩家不该只能等：工具区留一个手动入口，
     选完就自己收起来。 */
  function renderCareerPickBtn() {
    var btn = $("careerPickBtn");
    if (!btn) return;
    btn.hidden = !(FC.career && FC.career.needsPick(run));
  }

  /* 自动行动永远不替玩家去探区：探区是唯一带地点选择的行动，替玩家点掉
     等于替他花了 zoneQueue，而且高风险地点的余波要他自己认。 */
  var AUTO_SKIP = { explore: 1 };

  function actById(id) {
    var acts = FC.Sim.actions();
    for (var i = 0; i < acts.length; i++) if (acts[i].id === id) return acts[i];
    return null;
  }

  function canDo(act) {
    return !!act && FC.Sim.canAction(run, act, era, origin);
  }

  /* 现金撑不过这个月的账单时，自动行动别再拿 AP 去进修 / 休息烧成负债。
     suggestMonth 的 high 级建议（健康见底、人情要债）仍然压过这条护栏。 */
  function cashTight() {
    var out = bills().reduce(function (a, b) { return a + b.v; }, 0);
    return run.money < out;
  }

  /* 自动行动挑谁：先听 suggestMonth（带 skipExplore / preferWorkIfPoor），
     它这月点不动就挑第一个能点的行动 —— 探区始终不算在候选里。 */
  function pickAutoAction() {
    var tip = FC.Sim.suggestMonth
      ? FC.Sim.suggestMonth(run, era, origin, { skipExplore: true, preferWorkIfPoor: true })
      : null;
    var id = tip && tip.actionId;
    var act = id && !AUTO_SKIP[id] ? actById(id) : null;
    if (!canDo(act)) act = null;

    /* Sim 还没实现 preferWorkIfPoor 时，这里自己兜一层现金护栏。 */
    if (cashTight() && id !== "work" && (!act || !tip || tip.urgency !== "high")) {
      var work = actById("work");
      if (canDo(work)) return work;
    }
    if (act) return act;

    var acts = FC.Sim.actions();
    for (var i = 0; i < acts.length; i++) {
      if (AUTO_SKIP[acts[i].id]) continue;
      if (canDo(acts[i])) return acts[i];
    }
    return null;
  }

  /* 自动花 AP：一轮下来 AP 没少，说明没有行动可点了，收手让调用方去解释剩下的点。 */
  function autoSpendAp() {
    var keepZone = run.zoneQueue;
    var guard = 0;
    while (run.ap > 0 && guard++ < 24) {
      var act = pickAutoAction();
      if (!act) break;
      var before = run.ap;
      onAction(act.id);
      if (run.ap >= before) break;
    }
    /* 探区目标是玩家自己设的，快进结束后必须原样留在那儿。 */
    if (keepZone && run.zoneQueue !== keepZone) {
      run.zoneQueue = keepZone;
      renderLocationChip();
    }
    return run.ap;
  }

  function sysLog(text) {
    pushLog({ t: ts(), tag: "系统", tint: "var(--text-faint)", text: text, d: {} });
    renderLog();
  }

  var fastForwarding = false;

  /* 快进：每个月先自动花完 AP 再推进。AP 花不完、撞上强弹窗、或者走到结局，
     都停在当月，并把停下的原因写进日志。 */
  function fastForwardMonths(n) {
    n = n || 3;
    if (fastForwarding || run.ended) return Promise.resolve(true);
    fastForwarding = true;
    return (function step(i) {
      if (i >= n) return Promise.resolve(false);
      autoSpendAp();
      if (run.ap > 0) {
        sysLog("快进走了 " + i + "/" + n + " 月：还剩 " + run.ap +
          " 点行动点花不出去。快进不会替你去探区，探区请自己点。");
        return Promise.resolve(true);
      }
      return tick(i < n - 1).then(function (hit) {
        if (hit) {
          sysLog("快进走了 " + (i + 1) + "/" + n + " 月，被一件事打断" +
            (i + 1 >= n ? "。" : "，剩下的月份没走。"));
          return true;
        }
        return step(i + 1);
      });
    })(0).then(function (hit) {
      fastForwarding = false;
      return hit;
    }, function (err) {
      fastForwarding = false;
      sysLog("快进出错，已停在当月。");
      throw err;
    });
  }

  var FF_MONTHS = 3;

  /* R15 的三条护栏原样写进确认面板：问的人得先知道快进替他做什么、不做什么。 */
  function ffConfirmItems() {
    return [
      "不会自动去探区：探区目标留着，要你自己点「探区」。",
      "现金紧时优先上班，不会拿行动点去进修 / 休息。",
      "遇到大事会停下。"
    ];
  }

  /* FC.confirm 没加载时（旧缓存、或者直接双击开页）仍要问一句再走。 */
  function nativeConfirm(text) {
    if (typeof window === "undefined" || !window.confirm) return true;
    return !!window.confirm(text + "确定？");
  }

  function startFastForward() {
    if (fastForwarding || run.ended) return Promise.resolve(false);
    var items = ffConfirmItems();
    var ask = FC.confirm
      ? FC.confirm({
        title: "快进 " + FF_MONTHS + " 个月？",
        body: "会自动花完行动点并连续推进 " + FF_MONTHS + " 个月。",
        items: items,
        confirmLabel: "开始快进",
        cancelLabel: "再等等",
        layer: "L" + layerOf()
      })
      : Promise.resolve(nativeConfirm(
        "快进会自动花完行动点并连续推进 " + FF_MONTHS + " 个月。\n· " +
          items.join("\n· ") + "\n"
      ));
    return ask.then(function (ok) {
      if (!ok) return false;
      return fastForwardMonths(FF_MONTHS);
    });
  }

  /* 签约窗口只有头三个月。「再想想」记下当月，下个月才会再问一次。 */
  function maybeOfferContract() {
    if (!run.done) run.done = {};
    if (!FC.contract || !FC.contract.canPick(run)) return Promise.resolve(false);
    if (run.done.contractSkipped === run.months) return Promise.resolve(false);
    return FC.contract.showPicker({ run: run, era: era, origin: origin }).then(function (id) {
      if (!id) {
        run.done.contractSkipped = run.months;
        render(false);
        return false;
      }
      FC.Sim.selectContract(run, id, era, origin);
      var def = FC.contract.def(id) || {};
      pushLog({
        t: ts(), tag: "合约", tint: "var(--neon-gold)",
        text: "你签下了「" + def.name + "」。" + def.pitch +
          "　期限 " + def.deadline + " 个月，从这个月开始算。",
        d: {}, kind: "contract"
      });
      render(true);
      renderLog();
      return true;
    });
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
    var talentNames = (run.talents || []).map(function (id) {
      var map = { hustle: "耐熬", frugal: "省门", network: "识人", luck: "偏运", study: "书骨" };
      return map[id] || id;
    });
    $("assetKv").innerHTML =
      "<dt>房产</dt><dd>" + esc(run.assets.property || "无") + "</dd>" +
      "<dt>交通工具</dt><dd>" + esc(run.assets.vehicle || "无") + "</dd>" +
      "<dt>副业基金</dt><dd>¥" + fmt(run.assets.sideFund || 0) + "</dd>" +
      "<dt>负债本金</dt><dd>¥" + fmt(run.debt) + "</dd>" +
      "<dt>学历</dt><dd>" + run.edu + " / 100</dd>" +
      (talentNames.length ? "<dt>印记</dt><dd>" + esc(talentNames.join("、")) + "</dd>" : "");
    renderAssetShop();
  }

  function renderAssetShop() {
    var host = $("assetShop");
    if (!host || !FC.Sim.assetCatalog) return;
    var items = FC.Sim.assetCatalog();
    if (!items.length) { host.innerHTML = ""; return; }
    host.innerHTML = items.map(function (a) {
      var ok = FC.Sim.canBuyAsset(run, a.id, era, origin);
      var owned = run.assets.owned && run.assets.owned.indexOf(a.id) >= 0;
      return '<button type="button" class="fc-btn fc-btn--ghost fc-asset-buy' +
        (owned ? " is-owned" : ok ? "" : " is-disabled") + '" data-asset="' + a.id + '" ' +
        (ok && !owned ? "" : "disabled") + ">" +
        esc(a.name) + (owned ? " · 已持有" : " · ¥≈" + fmt(FC.Sim.moneyOf(a.cost || 1, income()))) +
        "</button>";
    }).join("");
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
    if (run.challengeMonths > 0) {
      var left = Math.max(0, run.challengeMonths - (run.months || 0));
      $("dAge").textContent = "闯城 " + run.months + "/" + run.challengeMonths +
        " 月 · 剩 " + left + " · " + FC.Sim.stage(run).label;
    } else {
      $("dAge").textContent = "已在城中 " + run.months + " 个月 · " + FC.Sim.stage(run).label;
    }
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
    renderContract();
    renderCareerPickBtn();
    renderGoalHud();
    renderLocationChip();
    renderTabsExtra();
    if (lastLayer !== null && lastLayer !== L && window.FCMotion && FCMotion.layerPulse) {
      FCMotion.layerPulse($("elevatorPanel"), L);
    }
    lastLayer = L;
    if (flash) { bump($("sMoney")); bump($("sHealth")); }
    FC.write({ run: run });
  }

  function logDeltas(d) {
    return Object.keys(d || {}).map(function (k) {
      var v = d[k];
      return '<span class="' + (v >= 0 ? "up" : "down") + '">' + (STAT_NAME[k] || k) +
        " " + (v >= 0 ? "+" : "−") + Math.abs(v) + "</span>";
    }).join("");
  }

  /* 日志存的是字段不是 HTML —— 存档要经得起换皮，卡片每次渲染现画。 */
  function inlineHtmlOf(e) {
    if (!FC.events || !FC.events.showInline) return "";
    return FC.events.showInline({
      id: e.id,
      title: e.title,
      body: e.text,
      category: e.tag,
      layerId: e.layerId || "L2",
      type: e.type,
      presentation: "inline"
    }, { tag: e.tag, note: e.note }).html;
  }

  function logCardItem(e, i) {
    /* presentation: "inline" 的事件走 fc-events 画的那张卡；探区回执仍走本地
       这张。时间列和左侧轨道两者共用，时间线不会断。 */
    var receiptCls = e.receipt || e.kind === "zone" ? " fc-log__card--receipt" : "";
    var body = e.inline
      ? inlineHtmlOf(e) + '<div class="fc-log__delta">' + logDeltas(e.d) + "</div>"
      : '<article class="fc-log__card' + receiptCls + '">' +
        (e.receipt || e.kind === "zone"
          ? '<span class="fc-log__stamp" aria-hidden="true">ZONE RECEIPT</span>' : "") +
        '<span class="fc-log__tag" style="color:' + e.tint + '">' + esc(e.tag) + "</span>" +
        (e.title ? '<h3 class="fc-log__card-title">' + esc(e.title) + "</h3>" : "") +
        '<p class="fc-log__card-text">' + esc(e.text) + "</p>" +
        (e.note ? '<p class="fc-log__card-note">' + esc(e.note) + "</p>" : "") +
        '<div class="fc-log__delta">' + logDeltas(e.d) + "</div></article>";
    return '<li class="fc-log__item fc-log__item--card is-new"' +
      (e.kind ? ' data-tag="' + e.kind + '"' : "") +
      ' style="--i:' + Math.min(i, 7) +
      ";--tint:" + (e.tint || "var(--l2)") + '">' +
      '<div class="fc-log__time">' + e.t + '</div><div class="fc-log__body">' +
      body + "</div></li>";
  }

  /* Timeline 分级：ambient 灰细条，O1/链式/人情/合约/探区 走层色左边框 */
  var LOG_MAJOR = { o1: 1, saga: 1, npc: 1, contract: 1, zone: 1 };

  function logKindClass(e) {
    if (e.kind === "ambient") return " fc-log__item--muted";
    if (LOG_MAJOR[e.kind]) return " fc-log__item--major";
    return "";
  }

  function logItem(e, i) {
    if (e.card) return logCardItem(e, i);
    var deltas = logDeltas(e.d);
    var tint = LOG_MAJOR[e.kind] ? ";--tint:" + (e.tint || "var(--l2)") : "";
    return '<li class="fc-log__item' + logKindClass(e) + ' is-new"' +
      (e.kind ? ' data-tag="' + e.kind + '"' : "") +
      ' style="--i:' + Math.min(i, 7) + tint + '">' +
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

  function layerNumOf(ev) {
    /* 151/301 ambient 事件没写 layerId；缺省按 L2，别让整月结算炸掉 */
    return parseInt(String(ev.layerId || "L2").replace(/\D/g, ""), 10) || 2;
  }

  /* presentation: "inline" 的 ambient 不再是日志里的一行灰字 —— 它拿到一张
     有标题、有左边框的卡。其余的照旧：一个月里值得抬头看的事只有那么几件。 */
  function ambientToLog(ev, applied) {
    var entry = {
      t: ts(),
      tag: ev.category || "城市",
      tint: "var(--l" + layerNumOf(ev) + ")",
      text: ev.text || ev.title,
      d: applied,
      kind: "ambient"
    };
    if (FC.events && FC.events.presentationOf(ev) === "inline") {
      entry.id = ev.id;
      entry.title = ev.title || "";
      entry.layerId = ev.layerId || "L2";
      entry.card = true;
      entry.inline = true;
    }
    return entry;
  }

  function zoneEventToLog(ev, applied, zoneKey) {
    var name = zoneLabel(zoneKey) || (ev && ev.title) || "探区";
    var blurb = zoneKey && FC.Sim.zoneBlurb ? FC.Sim.zoneBlurb(zoneKey) : null;
    var preview = blurb
      ? "风险" + blurb.risk + " · 收益" + blurb.reward + " — " + blurb.blurb
      : "";
    var entry = {
      t: ts(),
      tag: "探区回执",
      tint: "var(--l" + layerNumOf(ev) + ")",
      title: "探区回执 · " + name,
      text: ev.text || "",
      note: preview,
      receipt: true,
      card: true,
      d: applied,
      kind: "zone"
    };
    if (FC.events && FC.events.presentationOf(ev) === "inline") {
      entry.id = ev.id;
      entry.layerId = ev.layerId || "L2";
      entry.inline = true;
    }
    return entry;
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
    var chenjie = FC.Sim.npcById(run, "chenjie");
    var blacklisted = chenjie && chenjie.flags && chenjie.flags.indexOf("blacklist") >= 0;
    return {
      ym: ts(),
      rows: bills().map(function (b) {
        var note = "";
        if (b.k === "房租") {
          note = blacklisted ? "陈姐拉黑 · 上浮" : (RENT[layerOf() - 1] || "");
        } else if (b.k === "还贷") {
          note = "月供利息";
        }
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
    if (!run.done) run.done = {};

    /* R13：本月危机插队 —— 比随机 O1 更优先，仍让人情回账（R8）先敲门。 */
    var forced = FC.Sim.dueNpcFollowup(run);
    if (forced) {
      var forcedEv = FC.events.byId
        ? FC.events.byId(forced.eventId)
        : (FC.events.deck() || []).filter(function (e) { return e.id === forced.eventId; })[0];
      if (forcedEv && !(forcedEv.once && run.done[forcedEv.id])) {
        if (FC.events.meetsNpc(run.npcs, forcedEv.requires)) {
          if (forcedEv.once) run.done[forcedEv.id] = true;
          FC.Sim.markNpcFollowupFired(run, forced.eventId);
          run.sinceModal = 0;
          run.recentModal = (run.recentModal || []).concat(forcedEv.id).slice(-8);
          return forcedEv;
        }
        FC.Sim.markNpcFollowupFired(run, forced.eventId);
      } else {
        FC.Sim.markNpcFollowupFired(run, forced.eventId);
      }
    }

    if (FC.Sim.pickMonthCrisis && FC.Sim.crisisToEvent) {
      var crisis = FC.Sim.pickMonthCrisis(run, era, origin);
      if (crisis) {
        run.lastCrisisMonth = run.months || 0;
        run.sinceModal = 0;
        return FC.Sim.crisisToEvent(crisis, run, origin);
      }
    }

    run.sinceModal = (run.sinceModal || 0) + 1;
    if (Math.random() >= MODAL_ODDS[Math.min(run.sinceModal, 4)]) return null;
    var draw = {
      layer: layerOf(),
      avoid: run.recentModal || [],
      era: era.id,
      months: run.months,
      done: run.done,
      npcs: run.npcs,
      contract: FC.Sim.contractCtx(run)
    };
    var debtor = FC.Sim.debtNpc(run);
    if (debtor) draw.debtNpc = debtor.id;
    var ev = FC.events.pick(draw);
    if (!ev) return null;
    if (ev.type === "redline" && (run.months < 6 || (run.lastRedline && run.months - run.lastRedline < 12))) {
      draw.allowRedline = false;
      ev = FC.events.pick(draw);
      if (!ev) return null;
    }
    if (ev.type === "redline") run.lastRedline = run.months;
    if (ev.once) run.done[ev.id] = true;
    FC.Sim.markNpcFollowupFired(run, ev.id);
    run.sinceModal = 0;
    /* Eight is roughly two years of knocks: with a deck this size a window of
       three still let the same door repeat within the year. */
    run.recentModal = (run.recentModal || []).concat(ev.id).slice(-8);
    return ev;
  }

  /* 合约事件的选项可以直接动 KPI、房产和落户加分 —— 这三样都不在
     story.json 允许的 d 里（那里只有现金/健康/人脉/声望），只能单独走一趟。 */
  function applyContractChoice(choice) {
    if (!choice) return;
    if (choice.kpi) {
      run.career.kpi = Math.max(0, Math.min(100, run.career.kpi + choice.kpi));
    }
    if (choice.property) run.assets.property = choice.property;
    if (choice.contractProgress) FC.Sim.creditContract(run, choice.contractProgress);
    if (choice.track && run.career) {
      run.career.track = choice.track;
      run.career.picked = true;
    }
  }

  function maybeOfferSecondaryContract() {
    if (!FC.contract || !FC.contract.canPickSecondary(run)) return Promise.resolve(false);
    if (!run.done) run.done = {};
    if (run.done.secondarySkipped === run.months) return Promise.resolve(false);
    return FC.contract.showSecondaryPicker({ run: run, era: era, origin: origin }).then(function (id) {
      if (!id) {
        run.done.secondarySkipped = run.months;
        return false;
      }
      FC.Sim.selectSecondaryContract(run, id, era, origin);
      var def = FC.Sim.secondaryDef(id) || {};
      pushLog({
        t: ts(), tag: "副线", tint: "var(--neon-jade)",
        text: "你签下了二级合约「" + def.name + "」。" + def.pitch,
        d: {}, kind: "contract"
      });
      render(true);
      renderLog();
      return true;
    });
  }

  /* 无参调用（进门自动弹）走不可取消语义：这张卡必须选完才放行。
     手动点「选轨」是玩家自己翻开来看的，允许关掉，关掉就当没发生过。 */
  function maybeOfferCareerTrack(opts) {
    opts = opts || {};
    if (!FC.career || !FC.career.needsPick(run)) return Promise.resolve(false);
    var pick = { run: run, era: era, origin: origin };
    if (opts.manual) pick.cancelable = true;
    return FC.career.showPicker(pick).then(function (id) {
      if (!id) return false;
      FC.career.applyTrack(run, id);
      var trackName = id;
      ((FC.Sim.pack && FC.Sim.pack.careerTracks) || []).forEach(function (t) {
        if (t.id === id && t.name) trackName = t.name;
      });
      pushLog({
        t: ts(), tag: "职场", tint: "var(--neon-violet)",
        text: "你选择了「" + trackName + "」轨道作为起点。", d: {}, kind: "saga"
      });
      render(true);
      renderLog();
      return true;
    });
  }

  function maybeOfferChallengeGoal() {
    if (!FC.Sim.needsChallengeGoal || !FC.Sim.needsChallengeGoal(run)) {
      return Promise.resolve(false);
    }
    var goals = FC.Sim.challengeGoals();
    if (!goals || !goals.length || !FC.overlay) return Promise.resolve(false);
    return new Promise(function (resolve) {
      var host = document.createElement("div");
      host.className = "fc-career-pick";
      host.innerHTML =
        '<div class="fc-career-pick__scrim"></div>' +
        '<div class="fc-career-pick__panel" role="dialog" aria-modal="true" tabindex="-1" ' +
             'aria-labelledby="fcChallengeTitle" aria-describedby="fcChallengeLede">' +
          '<p class="fc-eyebrow">CHALLENGE · 闯城 60 月</p>' +
          '<h2 class="fc-career-pick__title" id="fcChallengeTitle">这六十个月，你赌哪一张牌？</h2>' +
          '<p class="fc-career-pick__lede" id="fcChallengeLede">选一个主目标。期满按完成度与生存质量打分，不是混满月数就算赢。必须选定一张才能往下走。</p>' +
          '<div class="fc-career-pick__grid">' +
            goals.map(function (g) {
              return '<button type="button" class="fc-career-card" data-goal="' + esc(g.id) + '">' +
                "<b>" + esc(g.name) + "</b><span>" + esc(g.blurb) + "</span></button>";
            }).join("") +
          "</div></div>";
      var panel = host.querySelector(".fc-career-pick__panel");
      var settled = false;
      function finish(id) {
        if (settled) return;
        settled = true;
        FC.Sim.pickChallengeGoal(run, id || goals[0].id, era, origin);
        var def = FC.Sim.goalDef(run.goal.id);
        pushLog({
          t: ts(), tag: "闯城", tint: "var(--neon-gold)",
          text: "主目标定为「" + ((def && def.name) || run.goal.id) + "」。六十个月后按此交卷。",
          d: {}, kind: "saga"
        });
        host.classList.add("is-closing");
        setTimeout(function () {
          if (host.parentNode) host.parentNode.removeChild(host);
          FC.overlay.pop(host);
          render(true);
          renderLog();
          resolve(true);
        }, 180);
      }

      /* 吞掉的按键要有回音，否则玩家只会以为键盘没进来、接着一路猛敲 Esc。
         连按得能重新起拍：先摘类、强制回流，再挂上去；旧的那次回调靠 gen 比对
         自己作废，不用 clearTimeout —— onKey 跑在 overlay 的分发里，多依赖一个
         全局就多一个把整条键盘链炸掉的机会。摸不到 classList 就干脆不抖。 */
      var escPulses = 0;
      function pulseEsc() {
        if (settled || !panel || !panel.classList) return;
        var gen = ++escPulses;
        panel.classList.remove("is-esc-pulse");
        void panel.offsetWidth;
        panel.classList.add("is-esc-pulse");
        setTimeout(function () {
          if (gen !== escPulses) return;
          panel.classList.remove("is-esc-pulse");
        }, 320);
      }

      /* 主目标不可取消：Esc 只吞掉按键，不当作「随便给你一张」也不放行，
         否则这局没有目标可以计分 —— 宁可让玩家再看一眼这三张牌。 */
      function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); pulseEsc(); return; }
        if (e.key === "Tab" && panel) { FC.overlay.trap(panel, e); return; }
      }

      host.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-goal]");
        if (btn) finish(btn.getAttribute("data-goal"));
      });

      document.body.appendChild(host);
      if (FC.overlay.push("modal", host)) FC.overlay.top().onKey = onKey;
      if (panel && panel.focus) panel.focus();
      requestAnimationFrame(function () { host.classList.add("is-open"); });
    });
  }

  function renderGoalHud() {
    var hud = $("goalHud");
    if (!hud) return;
    if (!(run.challengeMonths > 0) || !run.goal) {
      hud.hidden = true;
      return;
    }
    hud.hidden = false;
    var pct = FC.Sim.goalProgress(run, era, origin);
    var def = FC.Sim.goalDef(run.goal.id);
    $("goalName").textContent = (def && def.name) || run.goal.name || run.goal.id;
    $("goalPct").textContent = Math.round(pct) + "%";
    $("goalBar").style.width = Math.max(0, Math.min(100, pct)) + "%";
    var left = Math.max(0, run.challengeMonths - (run.months || 0));
    if (pct >= 100) {
      $("goalHint").textContent = "目标已达成。剩余 " + left + " 月用来抬评分，或稳稳交卷。";
    } else if (run.goal.id === "downpay" && run.goal.downpayGoal) {
      $("goalHint").textContent = "首付目标约 ¥" + fmt(run.goal.downpayGoal) +
        " · 剩 " + left + " 月";
    } else {
      $("goalHint").textContent = (def && def.blurb ? def.blurb + " · " : "") + "剩 " + left + " 月";
    }
  }

  /* 一条事件解析完之后进日志。modal / toast / letter 都留一行「【标题】结果」，
     inline 没有弹过窗，日志卡就是它唯一的现身方式，所以整段叙事都写进卡里。 */
  function eventToLog(ev, res, applied, ledger) {
    var entry = {
      t: ts(),
      tag: ev.contract ? "合约"
        : ledger.length ? ledger[0].name : (FC.events.TYPE_LABEL[ev.type] || ev.category),
      tint: ev.contract ? "var(--neon-gold)"
        : ledger.length ? "var(--neon-amber)" : "var(--l" + ev.layerIndex + ")",
      text: "【" + ev.title + "】" + ((res.choice && res.choice.result) || "") + npcNote(ledger),
      d: applied,
      kind: ev.contract ? "contract" : ledger.length ? "npc" : "o1"
    };
    if (res.inline) {
      /* res.event 是归一化后的 payload —— 原始事件不一定带 layer/body。 */
      var payload = res.event || ev;
      entry.id = payload.id;
      entry.title = payload.title;
      entry.text = payload.body;
      entry.note = res.card.note + npcNote(ledger);
      entry.layerId = payload.layer;
      entry.type = payload.type;
      entry.card = true;
      entry.inline = true;
    }
    return entry;
  }

  /* R16：危机 / O1 / 人情讨债这类强弹窗，在弹出之前先挂到存档上。玩家没答完
     就刷新、切页、误关，这张卡都还欠着，下次进门原样补弹；答完才销账。
     Sim 给了 API 就用 Sim 的，缺了退回 run.pendingModal 这一份本地记账。 */
  function pendingModalOf() {
    var p = run && run.pendingModal;
    return p && p.event && p.event.id ? p : null;
  }

  function hasPendingModal() {
    if (!run) return false;
    if (FC.Sim && typeof FC.Sim.hasPendingModal === "function") {
      return !!FC.Sim.hasPendingModal(run);
    }
    return !!pendingModalOf();
  }

  /* 危机与 O1 补弹时的标签不同，日志读起来才知道这张卡是从哪儿来的。 */
  function pendingKindOf(ev) {
    if (!ev) return "modal";
    if (ev.category === "本月危机") return "crisis";
    /* 合约进度事件也常带 requires，但语义是合约门禁，不是 NPC 人情。 */
    if (ev.contract) return "contract";
    if (ev.requires) return "npc";
    return "o1";
  }

  function setPendingModal(ev, kind) {
    if (!run || !ev || !ev.id) return null;
    var cur = pendingModalOf();
    if (cur && cur.event.id === ev.id) return cur;
    var payload = { kind: kind || pendingKindOf(ev), event: ev };
    if (FC.Sim && typeof FC.Sim.setPendingModal === "function") {
      FC.Sim.setPendingModal(run, payload);
    } else {
      run.pendingModal = payload;
    }
    FC.write({ run: run });
    return pendingModalOf();
  }

  function clearPendingModal() {
    if (!run) return false;
    var had = hasPendingModal();
    if (FC.Sim && typeof FC.Sim.clearPendingModal === "function") {
      FC.Sim.clearPendingModal(run);
    }
    run.pendingModal = null;
    FC.write({ run: run });
    return had;
  }

  /* 合约结算走自己的 resolutionPending，由调用方显式传 pending:false 让开这条
     通道；除它以外的强弹窗一律挂账 —— 合约「要不要接这单」这类带 ev.contract
     的机会卡也要挂，不然刷掉就永远丢了。 */
  function isContractResolutionEvent(ev) {
    return !!(ev && typeof ev.id === "string" &&
      ev.id.indexOf("contract_") === 0 && ev.category === "合约");
  }

  function tracksPending(ev, opts) {
    if (opts && typeof opts.pending === "boolean") return opts.pending;
    if (!ev || !ev.id) return false;
    return !isContractResolutionEvent(ev);
  }

  /* onApplied 只在玩家真把这张卡结掉时才跑：被 dismiss 的卡没落账，
     调用方也就不该把它记成「已结算」。 */
  function openEvent(ev, silent, onApplied, opts) {
    opts = opts || {};
    var tracked = tracksPending(ev, opts);
    if (tracked) setPendingModal(ev, opts.kind);
    return FC.events.show(ev, { moneyRef: income() }).then(function (res) {
      if (res.dismissed) {
        /* 关掉不算答完：这张卡继续挂在存档上，下次进门再敲一次门。 */
        if (tracked && run.pendingModal) FC.write({ run: run });
        return true;
      }
      var applied = FC.Sim.applyDeltas(run, res.deltas, income());
      var ledger = FC.Sim.applyNpcEffects(run, res.choice && res.choice.npcEffects);
      applyContractChoice(res.choice);
      if (FC.contract) FC.contract.creditDeltas(run, applied);
      pushLog(eventToLog(ev, res, applied, ledger));
      render(true); renderLog(); flyMoney([applied.money], null);
      maybeShowLedger(silent);
      if (onApplied) onApplied(res);
      if (tracked) clearPendingModal();
      return true;
    });
  }

  /* 合约结算的奖惩挂在弹窗那唯一一个选项上：卡没弹、或者弹了被刷新掉，
     奖励就没进账。Sim / contract 侧提供判定与标记时用它们的，缺了就退回
     合约自身的一个本地标记，至少保证同一张卡不会每月重弹。 */
  function contractResolutionPending(run0) {
    var c = run0 && run0.contract;
    if (!c || c.status === "active") return false;
    if (FC.Sim && typeof FC.Sim.needsContractResolution === "function") {
      return !!FC.Sim.needsContractResolution(run0);
    }
    if (FC.contract && typeof FC.contract.needsResolutionReplay === "function") {
      return !!FC.contract.needsResolutionReplay(run0);
    }
    return !c.resolutionDone;
  }

  function markContractResolutionDone(run0) {
    if (FC.Sim && typeof FC.Sim.markContractResolutionDone === "function") {
      FC.Sim.markContractResolutionDone(run0);
    }
    if (FC.contract && typeof FC.contract.markResolutionDone === "function") {
      FC.contract.markResolutionDone(run0);
    }
    var c = run0 && run0.contract;
    if (c && c.status !== "active") c.resolutionDone = true;
    FC.write({ run: run0 });
  }

  /* 进门时补弹：上一局停在「合约已结算但奖惩没落账」，这里把那张卡补回来。 */
  function replayContractResolution() {
    if (!contractResolutionPending(run)) return Promise.resolve(false);
    if (!FC.events || !FC.contract || !FC.contract.resolutionEvent) return Promise.resolve(false);
    var resolution = FC.contract.resolutionEvent(run);
    if (!resolution) {
      markContractResolutionDone(run);
      return Promise.resolve(false);
    }
    return openEvent(resolution, true, function () {
      markContractResolutionDone(run);
    }, { pending: false }).then(function () { return true; });
  }

  /* 挂账那一刻合约还在手上，补弹时可能已经结算或换签 —— 只拦「合约没了 /
     换签了 / 已结算」；进度/期限窗口漂移仍补弹，避免 KPI 回落把 EV97 一类
     门禁卡永久销掉。 */
  function pendingContractStale(ev) {
    if (!ev || !ev.contract) return false;
    if (!FC.Sim || typeof FC.Sim.contractCtx !== "function") return false;
    var ctx = FC.Sim.contractCtx(run);
    return !ctx || ctx.id !== ev.contract || ctx.status !== "active";
  }

  /* 进门时补弹：上一局停在「危机 / O1 已经敲过门但没答完」，这里把那张卡
     原样开回来。玩家再关一次就继续欠着，下次进门再弹。 */
  function replayPendingModal(silent) {
    if (!FC.events || !hasPendingModal()) return Promise.resolve(false);
    var pending = run.pendingModal;
    var ev = pending && pending.event;
    if (!ev || !ev.id) {
      clearPendingModal();
      return Promise.resolve(false);
    }
    /* 销掉过期合约卡时返回 false：这一步没弹窗，不该占掉本轮的敲门额度。 */
    if (pendingContractStale(ev)) {
      clearPendingModal();
      sysLog("那张合约相关的通知过期了，不再补弹。");
      FC.write({ run: run });
      return Promise.resolve(false);
    }
    return openEvent(ev, silent !== false, null, {
      pending: true,
      kind: pending.kind
    }).then(function () { return true; });
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

  /* 返回值是「这一步弹过窗没有」，不是「玩家选没选」—— 月度弹窗额度按敲门次数算。 */
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
        if (res.dismissed) return true;
        var idx = res.choiceId != null ? parseInt(res.choiceId, 10) || 0 : 0;
        var applied = FC.Sim.advanceSaga(run, idx, income());
        pushLog({
          t: ts(), tag: tag.label, tint: tag.tint,
          text: step.text, d: applied.applied, kind: "saga"
        });
        render(true);
        renderLog();
        return true;
      });
    }
    var applied = FC.Sim.advanceSaga(run, 0, income());
    pushLog({ t: ts(), tag: tag.label, tint: tag.tint, text: step.text, d: applied.applied, kind: "saga" });
    return Promise.resolve(false);
  }

  function finishMonth(moves, silent, sagaShown) {
    /* R12：人情余波先落账，再走城市 ambient —— 人比天气先敲门。 */
    var ripple = FC.Sim.dueNpcRipple ? FC.Sim.dueNpcRipple(run) : null;
    if (ripple && FC.Sim.resolveNpcRipple) {
      var rip = FC.Sim.resolveNpcRipple(run, ripple, era, origin);
      if (rip) {
        if (rip.applied && rip.applied.money) moves.push(rip.applied.money);
        pushLog({
          t: ts(),
          tag: "人情余波",
          tint: "var(--neon-amber)",
          title: (rip.npc && rip.npc.name) ? ("余波 · " + rip.npc.name) : "人情余波",
          text: rip.text + npcNote(rip.ledger),
          card: true,
          d: rip.applied || {},
          kind: "npc"
        });
      }
    }

    /* R13：探区余波（高风险地点更疼）。 */
    if (FC.Sim.resolveZoneAftershock) {
      var zRip = FC.Sim.resolveZoneAftershock(run, era, origin);
      if (zRip) {
        if (zRip.applied && zRip.applied.money) moves.push(zRip.applied.money);
        pushLog({
          t: ts(),
          tag: "探区余波",
          tint: "var(--neon-cyan)",
          title: "探区余波",
          text: zRip.text,
          card: true,
          d: zRip.applied || {},
          kind: "zone"
        });
      }
    }

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

    /* 合约每月只结算一次，在月结之后、抽卡之前：到期那天城市先把账算完，
       再决定今晚还要不要敲门。 */
    var settled = FC.Sim.tickContract(run, era, origin);
    var settledSecondary = FC.Sim.tickSecondaryContract(run);

    FC.Sim.resetMonthAp(run, era);
    render(true);
    renderLog();
    flyMoney(moves, $("tickBtn"));

    return checkEnding().then(function (ended) {
      if (ended) return true;
      if (settledSecondary && settledSecondary.status === "won") {
        var scDef = settledSecondary.def || {};
        var scApplied = FC.Sim.applyDeltas(run, scDef.reward || {}, income());
        pushLog({
          t: ts(), tag: "副线", tint: "var(--neon-jade)",
          text: "二级合约「" + (scDef.name || "") + "」达成。",
          d: scApplied, kind: "contract"
        });
        render(true);
        renderLog();
        flyMoney([scApplied.money], null);
      }
      return monthModal(settled, silent, sagaShown);
    });
  }

  /* 要约被「再想想」推掉也算敲过门：picker 会把当月记进 done。 */
  function offerShownThisMonth() {
    var d = run.done || {};
    return d.secondarySkipped === run.months || d.contractSkipped === run.months;
  }

  /* R14：一个月最多敲一次门 —— 合约结算 > 二级/主合约要约 > 危机 / O1。
     命中的那一扇负责把账本补上，后面的强弹窗一律顺延到下个月；链式事件
     这个月已经弹过窗的话，最低优先级的危机 / O1 也让位。 */
  function monthModal(settled, silent, sagaShown) {
    if (settled && FC.contract && FC.contract.resolutionEvent) {
      var resolution = FC.contract.resolutionEvent(run);
      /* openEvent 结束时自己会 maybeShowLedger，这里不必再叫一次。 */
      if (resolution) {
        return openEvent(resolution, silent, function () {
          markContractResolutionDone(run);
        }, { pending: false }).then(function () { return true; });
      }
    }
    return maybeOfferSecondaryContract().then(function (hit) {
      if (hit) return true;
      return maybeOfferContract();
    }).then(function (hit) {
      if (hit) {
        maybeShowLedger(silent);
        return true;
      }
      /* 被推掉的要约、以及本月已经弹过的链式事件，都占掉这个月的名额。 */
      if (offerShownThisMonth() || sagaShown) {
        maybeShowLedger(silent);
        return true;
      }
      /* 上个月被关掉 / 刷新掉的那张卡还欠玩家一次：先补它，本月新抽的危机
         与 O1 顺延到下个月，两张卡不叠在一起。 */
      if (hasPendingModal()) return replayPendingModal(silent);
      var ev = drawModalEvent();
      if (!ev) { maybeShowLedger(silent); return false; }
      setPendingModal(ev);
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

    var sagaChain = Promise.resolve(false);
    if (run.saga) {
      var step = FC.Sim.sagaStep(run);
      if (step) sagaChain = resolveSagaStep(step, silent);
    }

    return sagaChain.then(function (sagaShown) {
      return finishMonth(moves, silent, sagaShown);
    });
  }

  function onAction(id) {
    var pendingZone = id === "explore" ? run.zoneQueue : null;
    var res = FC.Sim.doAction(run, id, era, origin);
    if (!res) return;
    if (FC.contract) FC.contract.creditAction(run, id, res);
    pushLog({ t: ts(), tag: "行动", tint: "var(--neon-cyan)", text: res.text, d: res.applied });
    if (res.zoneEvent) {
      var zd = FC.Sim.applyDeltas(run, res.zoneEvent.d || {}, income());
      var zLedger = FC.Sim.applyNpcEffects(run, res.zoneEvent.npcEffects);
      pushLog(zoneEventToLog(res.zoneEvent, zd, pendingZone));
      if (zLedger.length) {
        pushLog({
          t: ts(), tag: "人情", tint: "var(--neon-amber)",
          text: "探区之后，人情账有变动。" + npcNote(zLedger), d: {}, kind: "npc"
        });
      }
      flyMoney([zd.money], null);
    }
    render(true);
    renderLog();
  }

  function animateTabPanel(panel) {
    if (!panel || !window.FCMotion) return;
    var nodes = panel.querySelectorAll(".fc-panel, .fc-npc-card, .fc-statline, .fc-kv");
    var i;
    for (i = 0; i < nodes.length; i++) nodes[i].classList.remove("fc-rise");
    if (FCMotion.reduced && FCMotion.reduced()) {
      for (i = 0; i < nodes.length; i++) nodes[i].classList.add("fc-rise");
      return;
    }
    FCMotion.stagger(nodes, { max: 8 });
  }

  /* 生命体征折叠：手机默认收起（只露现金/健康，合约条紧随其下），桌面默认全开 */
  function bindVitals() {
    var panel = $("vitalsPanel");
    var btn = $("vitalsToggle");
    if (!panel || !btn) return;
    function setOpen(open) {
      panel.classList.toggle("is-collapsed", !open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "收起 ▴" : "展开全部 ▾";
    }
    var mobile = false;
    try {
      mobile = !!(window.matchMedia && window.matchMedia("(max-width: 640px)").matches);
    } catch (e) { /* ignore */ }
    setOpen(!mobile);
    btn.addEventListener("click", function () {
      setOpen(panel.classList.contains("is-collapsed"));
    });
  }

  function openDrawer() {
    var d = $("dockDrawer");
    if (d) d.hidden = false;
  }

  function closeDrawer() {
    var d = $("dockDrawer");
    if (d) d.hidden = true;
  }

  function bindDock() {
    var dock = $("mobileDock");
    var drawer = $("dockDrawer");
    if (dock) {
      dock.addEventListener("click", function (e) {
        var t = e.target.closest("[data-action],[data-dock-more],[data-dock-tick]");
        if (!t || t.disabled) return;
        if (t.hasAttribute("data-dock-tick")) { tick(false); return; }
        if (t.hasAttribute("data-dock-more")) { openDrawer(); return; }
        onAction(t.dataset.action);
      });
    }
    if (drawer) {
      drawer.addEventListener("click", function (e) {
        if (e.target.closest("[data-drawer-close]")) { closeDrawer(); return; }
        if (e.target.closest("[data-drawer-tick6]")) {
          closeDrawer();
          startFastForward();
          return;
        }
        if (e.target.closest("[data-drawer-reset]")) {
          closeDrawer();
          if ($("resetBtn")) $("resetBtn").click();
          return;
        }
        var btn = e.target.closest("[data-action]");
        if (btn && !btn.disabled) {
          onAction(btn.dataset.action);
          closeDrawer();
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !drawer.hidden) closeDrawer();
      });
    }
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
          if (on) animateTabPanel(p);
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

    if ($("relList")) {
      $("relList").addEventListener("click", function (e) {
        var act = e.target.closest("[data-npc-act]");
        if (!act || act.disabled || act.classList.contains("is-disabled")) return;
        var kind = act.getAttribute("data-npc-act");
        var npcId = act.getAttribute("data-npc");
        if (kind && npcId && kind !== "busy") onNpcInteract(npcId, kind);
      });
    }

    $("tickBtn").addEventListener("click", function () { tick(false); });
    $("tick6Btn").addEventListener("click", startFastForward);
    $("ledgerBtn").addEventListener("click", function () { FC.ledger.show(buildLedgerPayload()); });
    $("resetBtn").addEventListener("click", function () {
      if (FC.events) FC.events.close();
      if (FC.ledger) FC.ledger.close();
      run = FC.Sim.freshRun(era, origin);
      FC.Sim.resetMonthAp(run, era);
      run.log = [];
      pushLog({ t: ts(), tag: "入城", tint: "var(--neon-amber)", text: "你在" + era.name + "走出车站。", d: {} });
      render(true); renderLog();
      maybeOfferContract();
    });
    $("log").addEventListener("animationend", function (ev) {
      if (ev.animationName === "fc-logslide") ev.target.classList.remove("is-new");
    });
    if ($("contractPickBtn")) {
      $("contractPickBtn").addEventListener("click", function () {
        run.done.contractSkipped = -1;
        maybeOfferContract();
      });
    }
    if ($("locChip")) {
      $("locChip").addEventListener("click", openZonePicker);
    }
    if ($("guideBtn") && FC.guide) {
      $("guideBtn").addEventListener("click", function () {
        if (FC.guide.isOpen && FC.guide.isOpen()) return;
        FC.guide.show({ force: true });
      });
    }
    if ($("careerPickBtn")) {
      $("careerPickBtn").addEventListener("click", function () {
        maybeOfferCareerTrack({ manual: true });
      });
    }

    bindVitals();
    bindDock();
    bindTabs();
    if ($("assetShop")) {
      $("assetShop").addEventListener("click", function (e) {
        var btn = e.target.closest("[data-asset]");
        if (!btn || btn.disabled) return;
        var bought = FC.Sim.buyAsset(run, btn.dataset.asset, era, origin);
        if (!bought) return;
        pushLog({
          t: ts(), tag: "资产", tint: "var(--neon-gold)",
          text: "你买下了「" + bought.def.name + "」。", d: bought.applied, kind: "o1"
        });
        render(true);
        renderLog();
      });
    }
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
    /* 补弹结算 → 补弹危机/O1 → 选轨 → 合约 → 教学：欠玩家的那两张卡排在
       最前面，合约结算先于危机，因为它带的是上个月已经判定完的账；
       教学要指着已经挂上的合约 HUD 与行动区，所以放在几张选卡之后；
       点遮罩不会关掉，必须「下一步 / 跳过」。
       只要补弹真的发生过，这一次进门就到此为止：选轨 / 合约 / 教学都顺延到
       下次进门，免得补的那张卡后面又排一串新弹窗。唯一的例外是闯城主目标 ——
       没选目标这一局没法计分，所以它照弹。 */
    var replayed = false;
    replayContractResolution()
      .then(function (shown) {
        if (shown) replayed = true;
        return replayPendingModal();
      })
      .then(function (shown) {
        if (shown) replayed = true;
        /* 轨道没选过时 maybeOfferCareerTrack 自己会兜底，这里跳过只是把它
           推到下次进门；已经选过就本来也没这一步。 */
        if (replayed) return false;
        return maybeOfferCareerTrack();
      })
      .then(function () { return maybeOfferChallengeGoal(); })
      .then(function () {
        if (replayed) return false;
        return maybeOfferContract();
      })
      .then(function () {
        if (replayed) return false;
        if (FC.guide && FC.guide.shouldShow()) return FC.guide.show();
        return false;
      });
  }

  FC.ready.then(init, function () {
    $("identity").textContent = "市民档案读取失败";
    $("season").textContent = "请通过本地服务器打开";
  });
})();
