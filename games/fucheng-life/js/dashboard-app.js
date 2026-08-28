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
      return '<button type="button" class="fc-zone-mini__btn' +
        (target === z.key ? " is-target" : "") +
        '" data-zone="' + z.key + '" style="--tint:' + tint + '">' +
        esc(z.name) + "</button>";
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
          '<p class="fc-sheet__caption">点选地点设为探区目标，本月「探区」行动将在此触发事件。</p>' +
        "</header>" +
        '<div class="fc-zone-picker__body"></div>' +
        '<a class="fc-btn fc-btn--ghost fc-sheet__done" href="city-map.html" style="width:100%;margin-top:12px">打开完整城市地图</a>' +
        '<button type="button" class="fc-btn fc-btn--primary fc-sheet__done" style="width:100%;margin-top:8px">取消</button>' +
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

  function actionBtn(a, extra) {
    var ok = FC.Sim.canAction(run, a, era, origin);
    return '<button type="button" class="fc-action-btn' + (ok ? "" : " is-disabled") +
      (extra ? " " + extra : "") + '" data-action="' +
      a.id + '" ' + (ok ? "" : "disabled") + ">" +
      '<span class="fc-action-btn__icon">' + esc(a.icon) + "</span>" +
      "<b>" + esc(a.name) + "</b><span>−" + a.ap + " AP</span></button>";
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
        return actionBtn(a, "fc-dock__btn");
      }).join("") +
        '<button type="button" class="fc-action-btn fc-dock__btn" data-dock-more aria-haspopup="dialog">' +
        '<span class="fc-action-btn__icon">⋯</span><b>更多</b><span>' + rest.length + " 项</span></button>";
    }
    var drawerGrid = $("drawerActions");
    if (drawerGrid) {
      drawerGrid.innerHTML = rest.map(function (a) { return actionBtn(a); }).join("");
    }
  }

  function renderActions() {
    var grid = $("actionGrid");
    if (!grid) return;
    grid.innerHTML = FC.Sim.actions().map(function (a) { return actionBtn(a); }).join("");

    $("apLabel").textContent = run.ap + "/" + run.apMax;
    $("apDots").innerHTML = apDotsHtml();
    $("stageChip").textContent = FC.Sim.stage(run).label;
    $("tickBtn").disabled = run.ap > 0;
    $("apHint").textContent = run.zoneQueue
      ? "已选探区「" + (zoneLabel(run.zoneQueue) || run.zoneQueue) + "」，可点「探区」消耗行动点。"
      : run.ap > 0
        ? "用完行动点后再推进一月。侧栏可设定探区目标。"
        : "行动点已用尽，可以推进一月。";
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
    if (flag) return "「" + FC.Sim.flagLabel(flag) + " · 第" + run.months + "月」";
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
          '<p class="fc-npc-card__flag">' + esc(npcFlagLine(n)) + "</p></div></li>";
    }).join("");
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
    renderContract();
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
    var body = e.inline
      ? inlineHtmlOf(e) + '<div class="fc-log__delta">' + logDeltas(e.d) + "</div>"
      : '<article class="fc-log__card">' +
        '<span class="fc-log__tag" style="color:' + e.tint + '">' + esc(e.tag) + "</span>" +
        (e.title ? '<h3 class="fc-log__card-title">' + esc(e.title) + "</h3>" : "") +
        '<p class="fc-log__card-text">' + esc(e.text) + '</p>' +
        '<div class="fc-log__delta">' + logDeltas(e.d) + "</div></article>";
    return '<li class="fc-log__item fc-log__item--card is-new"' +
      (e.kind ? ' data-tag="' + e.kind + '"' : "") +
      ' style="--i:' + Math.min(i, 7) +
      ";--tint:" + (e.tint || "var(--l2)") + '">' +
      '<div class="fc-log__time">' + e.t + '</div><div class="fc-log__body">' +
      body + "</div></li>";
  }

  /* Timeline 分级：ambient 灰细条，O1/链式/人情/合约 走层色左边框 */
  var LOG_MAJOR = { o1: 1, saga: 1, npc: 1, contract: 1 };

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

  function zoneEventToLog(ev, applied) {
    var entry = {
      t: ts(),
      tag: ev.category || "探区",
      tint: "var(--l" + layerNumOf(ev) + ")",
      title: ev.title || "",
      text: ev.text || "",
      card: true,
      d: applied
    };
    /* 探区回执默认还是 R5-C 那张本地卡；zone 数据一旦标了 inline，就换成
       fc-events 的呈现壳，不必再改这里。 */
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
    if (!run.done) run.done = {};

    /* R8：人情回账到期时插队，不走 MODAL_ODDS —— 账到了就会敲门。 */
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

  function maybeOfferCareerTrack() {
    if (!FC.career || !FC.career.needsPick(run)) return Promise.resolve(false);
    return FC.career.showPicker({ run: run, era: era, origin: origin }).then(function (id) {
      FC.career.applyTrack(run, id);
      pushLog({
        t: ts(), tag: "职场", tint: "var(--neon-violet)",
        text: "你选择了「" + id + "」轨道作为起点。", d: {}, kind: "saga"
      });
      render(true);
      renderLog();
      return true;
    });
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

  function openEvent(ev, silent) {
    return FC.events.show(ev, { moneyRef: income() }).then(function (res) {
      if (res.dismissed) return true;
      var applied = FC.Sim.applyDeltas(run, res.deltas, income());
      var ledger = FC.Sim.applyNpcEffects(run, res.choice && res.choice.npcEffects);
      applyContractChoice(res.choice);
      if (FC.contract) FC.contract.creditDeltas(run, applied);
      pushLog(eventToLog(ev, res, applied, ledger));
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
          text: step.text, d: applied.applied, kind: "saga"
        });
        render(true);
        renderLog();
        return true;
      });
    }
    var applied = FC.Sim.advanceSaga(run, 0, income());
    pushLog({ t: ts(), tag: tag.label, tint: tag.tint, text: step.text, d: applied.applied, kind: "saga" });
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
      if (settled && FC.contract) {
        var resolution = FC.contract.resolutionEvent(run);
        if (resolution) return openEvent(resolution, silent);
      }
      if (settledSecondary && settledSecondary.status === "won") {
        pushLog({
          t: ts(), tag: "副线", tint: "var(--neon-jade)",
          text: "二级合约「" + ((settledSecondary.def && settledSecondary.def.name) || "") + "」达成。",
          d: (settledSecondary.def && settledSecondary.def.reward) || {}, kind: "contract"
        });
      }
      return maybeOfferSecondaryContract();
    }).then(function (hit) {
      if (hit) return true;
      return maybeOfferContract();
    }).then(function (hit) {
      if (hit) return true;
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
    if (FC.contract) FC.contract.creditAction(run, id, res);
    pushLog({ t: ts(), tag: "行动", tint: "var(--neon-cyan)", text: res.text, d: res.applied });
    if (res.zoneEvent) {
      var zd = FC.Sim.applyDeltas(run, res.zoneEvent.d || {}, income());
      var zLedger = FC.Sim.applyNpcEffects(run, res.zoneEvent.npcEffects);
      pushLog(zoneEventToLog(res.zoneEvent, zd));
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
    maybeOfferCareerTrack().then(function () {
      if (FC.guide && FC.guide.shouldShow()) return FC.guide.show();
      return false;
    }).then(function () {
      maybeOfferContract();
    });
  }

  FC.ready.then(init, function () {
    $("identity").textContent = "市民档案读取失败";
    $("season").textContent = "请通过本地服务器打开";
  });
})();
