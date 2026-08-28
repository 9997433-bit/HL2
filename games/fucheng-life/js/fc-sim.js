/* 浮城人生 · fc-sim.js
   Core life simulation: AP, career, relations, assets, sagas, endings. */
(function (global) {
  "use strict";

  var FC = global.FC || (global.FC = {});

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function pickTrack(origin) {
    if (!origin) return "staff";
    if (origin.mods.edu >= 75) return "tech";
    if (origin.mods.social >= 75) return "sales";
    if (origin.layer <= 1) return "gig";
    return "staff";
  }

  function loadInheritedTalents() {
    var out = [];
    try {
      var raw = global.localStorage.getItem("fucheng.inheritedTalents.v1");
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Object.prototype.toString.call(parsed) === "[object Array]") {
          parsed.forEach(function (id) {
            if (id && out.indexOf(id) < 0) out.push(id);
          });
        }
      }
    } catch (e) { /* ignore */ }
    if (!out.length) {
      var single = null;
      try { single = global.localStorage.getItem("fucheng.inheritedTalent.v1"); } catch (e2) { /* ignore */ }
      if (single) out.push(single);
    }
    return out.slice(0, 3);
  }

  /* 人情账本：balance 记的是结余而不是好感 —— 正数是对方欠你，负数是你欠对方。
     让别人替你结账、替你顶班，账面就往下走，直到某个月对方来收。 */
  var NPCS = [
    { id: "laozhou", name: "老周", role: "同事", balance: 1 },
    { id: "chenjie", name: "陈姐", role: "房东", balance: -1 },
    { id: "amin", name: "阿敏", role: "同乡", balance: 1 },
    { id: "wangzong", name: "王总", role: "饭局人脉", balance: 0 },
    { id: "xiaoyu", name: "小余", role: "邻里", balance: 0 }
  ];

  /* 旧档的 relations[] 只有三个泛称，按角色把余额接到具名 NPC 上。 */
  var LEGACY_NPC = { chenjie: "landlord", laozhou: "colleague", amin: "family" };

  var FLAG_LABEL = {
    owe_rent: "欠着这个月的房租",
    owe_shift: "欠老周半天班",
    owe_dinner: "欠一顿饭局",
    hosted_amin: "借住过你的客厅",
    lent_amin: "借出去的钱还没回来",
    charged_bike: "在你家充过电",
    ran_route: "替他跑过两单",
    handy: "帮她修过水管",
    paid_dinner: "那顿饭是你签的单",
    blacklist: "被记在催缴名单上",
    cold: "局上不再有你的位置",
    drifted: "工位之间隔了一层玻璃",
    fell_out: "为一箱货翻过脸",
    trusted: "把备用钥匙交给了你",
    gave_gift: "红包随得体面",
    missed_wedding: "婚礼那天你没到场"
  };

  function isArray(v) {
    return Object.prototype.toString.call(v) === "[object Array]";
  }

  function toList(v) {
    if (v == null) return [];
    return isArray(v) ? v : [v];
  }

  FC.Sim = {
    pack: null,
    NPCS: NPCS,
    FLAG_LABEL: FLAG_LABEL,

    install: function (pack) {
      FC.Sim.pack = pack || FC.gameplay || null;
    },

    freshNpcs: function () {
      return NPCS.map(function (meta) {
        return {
          id: meta.id, name: meta.name, role: meta.role,
          balance: meta.balance, flags: [], last: null
        };
      });
    },

    npcById: function (run, id) {
      var found = null;
      (run && run.npcs ? run.npcs : []).forEach(function (n) {
        if (n.id === id) found = n;
      });
      return found;
    },

    flagLabel: function (flag) {
      return FLAG_LABEL[flag] || flag;
    },

    /** effects: { id, balance, flag, clearFlag, note } 或它们的数组。 */
    applyNpcEffects: function (run, effects) {
      var out = [];
      if (!run || !effects) return out;
      if (!run.npcs) run.npcs = FC.Sim.freshNpcs();
      toList(effects).forEach(function (eff) {
        if (!eff) return;
        var npc = FC.Sim.npcById(run, eff.id || eff.npc);
        if (!npc) return;
        if (!npc.flags) npc.flags = [];
        var before = npc.balance;
        if (typeof eff.balance === "number") {
          npc.balance = clamp(npc.balance + eff.balance, -5, 5);
        }
        var added = [];
        toList(eff.flag).concat(toList(eff.flags)).forEach(function (flag) {
          if (!flag || npc.flags.indexOf(flag) >= 0) return;
          npc.flags.push(flag);
          added.push(flag);
        });
        var cleared = [];
        toList(eff.clearFlag).concat(toList(eff.clearFlags)).forEach(function (flag) {
          var at = npc.flags.indexOf(flag);
          if (at < 0) return;
          npc.flags.splice(at, 1);
          cleared.push(flag);
        });
        var delta = npc.balance - before;
        var note = eff.note ||
          (added.length ? FC.Sim.flagLabel(added[added.length - 1]) : null) ||
          (cleared.length ? "这笔账清了" : null) ||
          (delta > 0 ? "对方欠你一笔" : delta < 0 ? "你欠对方一笔" : null);
        if (note) npc.last = note;
        out.push({
          id: npc.id, name: npc.name, balance: npc.balance,
          delta: delta, added: added, cleared: cleared, note: note
        });
      });
      return out;
    },

    /** requires: { npc, minBalance, maxBalance, flag, notFlag }，或它们的数组（全部满足）。
        判定唯一实现在 fc-events.js（pick 才是消费方）；抽卡器缺席时按「无法核账即不放行」处理。 */
    npcRequiresMet: function (run, requires) {
      if (FC.events && FC.events.meetsNpc) {
        return FC.events.meetsNpc(run && run.npcs, requires);
      }
      return !requires;
    },

    suggestTrack: pickTrack,

    freshRun: function (era, origin) {
      var money = parseInt(String(origin.start).replace(/[^\d]/g, ""), 10) || 1000;
      return {
        key: era.id + "/" + origin.id,
        version: 4,
        year: era.startYear || era.yearAnchor || 2021,
        month: 3,
        age: 22,
        months: 0,
        money: money,
        health: origin.mods.health,
        social: origin.mods.social,
        rep: Math.round((origin.mods.edu + origin.mods.social) / 2),
        edu: origin.mods.edu,
        debt: origin.layer >= 4 ? 0 : Math.round(money * 0.35),
        income: 0,
        gap: 0,
        sinceModal: 1,
        ap: 3,
        apMax: 3,
        apSpent: [],
        career: { track: pickTrack(origin), level: 0, kpi: 48, title: null, picked: false },
        contract: null,
        secondaryContract: null,
        npcs: FC.Sim.freshNpcs(),
        assets: { property: null, vehicle: null, sideFund: 0, owned: [] },
        saga: null,
        done: {},
        recent: [],
        recentModal: [],
        recentZone: {},
        log: [],
        talents: loadInheritedTalents(),
        zoneQueue: null,
        ended: false
      };
    },

    migrate: function (run, era, origin) {
      if (!run) return FC.Sim.freshRun(era, origin);
      var out = run;
      if (!(run.version >= 2 && run.career)) {
        var fresh = FC.Sim.freshRun(era, origin);
        var keys = ["year", "month", "age", "months", "money", "health", "social", "rep", "debt",
          "income", "gap", "sinceModal", "done", "recent", "recentModal", "log", "relations"];
        keys.forEach(function (k) {
          if (run[k] != null) fresh[k] = run[k];
        });
        fresh.ap = 3;
        fresh.apMax = 3;
        out = fresh;
      }
      return FC.Sim.migrateContract(FC.Sim.migrateNpcs(out));
    },

    /** v2→v4：补合约/二级合约/资产/职业选轨字段。 */
    migrateContract: function (run) {
      if (run.contract === undefined) run.contract = null;
      if (run.secondaryContract === undefined) run.secondaryContract = null;
      if (!run.assets) run.assets = { property: null, vehicle: null, sideFund: 0, owned: [] };
      if (!run.assets.owned) run.assets.owned = [];
      if (run.career) {
        if ((run.months || 0) > 0) run.career.picked = true;
        else if (run.career.picked == null) run.career.picked = !!run.career.track;
      }
      if (!run.talents || !run.talents.length) run.talents = loadInheritedTalents();
      run.version = 4;
      return run;
    },

    /** v2→v3：泛称 relations[] 变成五个有名有姓的人，余额跟着搬过来。 */
    migrateNpcs: function (run) {
      var legacy = {};
      (run.relations || []).forEach(function (r) {
        if (r && r.id) legacy[r.id] = r;
      });
      var saved = {};
      (run.npcs || []).forEach(function (n) {
        if (n && n.id) saved[n.id] = n;
      });
      run.npcs = NPCS.map(function (meta) {
        var cur = saved[meta.id];
        var old = legacy[LEGACY_NPC[meta.id]];
        var balance = cur && typeof cur.balance === "number" ? cur.balance
          : old && typeof old.balance === "number" ? old.balance
            : meta.balance;
        return {
          id: meta.id,
          name: meta.name,
          role: meta.role,
          balance: clamp(Math.round(balance), -5, 5),
          flags: (cur && isArray(cur.flags) ? cur.flags : []).slice(),
          last: (cur && cur.last) || null
        };
      });
      delete run.relations;
      run.version = 4;
      return run;
    },

    assetCatalog: function () {
      return (FC.Sim.pack && FC.Sim.pack.assetCatalog) || [];
    },

    assetDef: function (id) {
      var found = null;
      FC.Sim.assetCatalog().forEach(function (a) {
        if (a.id === id) found = a;
      });
      return found;
    },

    canBuyAsset: function (run, assetId, era, origin) {
      var def = FC.Sim.assetDef(assetId);
      if (!run || !def) return false;
      if (!run.assets) run.assets = { property: null, vehicle: null, sideFund: 0, owned: [] };
      if (!run.assets.owned) run.assets.owned = [];
      if (run.assets.owned.indexOf(assetId) >= 0) return false;
      if (def.type === "vehicle" && run.assets.vehicle) return false;
      if (def.minLayer && FC.Sim.layerOf(run, origin) < def.minLayer) return false;
      var cost = FC.Sim.moneyOf(def.cost || 1, FC.Sim.income(run, era, origin));
      return run.money >= cost;
    },

    buyAsset: function (run, assetId, era, origin) {
      var def = FC.Sim.assetDef(assetId);
      if (!FC.Sim.canBuyAsset(run, assetId, era, origin)) return null;
      var cost = FC.Sim.moneyOf(def.cost || 1, FC.Sim.income(run, era, origin));
      run.money -= cost;
      if (!run.assets.owned) run.assets.owned = [];
      run.assets.owned.push(assetId);
      if (def.type === "vehicle") run.assets.vehicle = def.name;
      if (def.type === "property") run.assets.property = def.name;
      if (def.sideFund) run.assets.sideFund = (run.assets.sideFund || 0) + def.sideFund;
      var applied = { money: -Math.round(cost / 100) * 100 };
      if (def.rep) { run.rep = clamp(run.rep + def.rep, 0, 100); applied.rep = def.rep; }
      return { def: def, applied: applied, cost: cost };
    },

    /* ------------------------------------------------------ 中期人生合约
       入城后第 1–3 月签一张，整局只签一张：落户 / 首付 / 升职。
       进度统一归一到 0–100，这样一根进度条能画三种完全不同的人生目标；
       原始口径（积分 / 首付线 / 职级+KPI）留在 goal 与 points 里给 UI 读。 */

    contracts: function () {
      return (FC.Sim.pack && FC.Sim.pack.contracts) || [];
    },

    contractDef: function (id) {
      var found = null;
      FC.Sim.contracts().forEach(function (c) {
        if (c.id === id) found = c;
      });
      return found;
    },

    /** 首付线 = 签约当月收入 × 房价收入比。写死一个 ¥ 数字的话，1984 年永远签不下，
        2026 年第一年就签完了 —— 同一张合约要在七个时代都值同样多的力气。 */
    contractGoal: function (def, run, era, origin) {
      if (!def) return 100;
      if (def.id !== "home") return def.goal || 100;
      var inc = 0;
      try { inc = FC.Sim.income(run, era, origin) || 0; } catch (e) { inc = 0; }
      var scale = def.goalMonthsOfIncome || 70;
      var raw = Math.round(inc * scale / 1000) * 1000;
      return Math.max(def.goalMin || 60000, Math.min(def.goalMax || 1500000, raw));
    },

    selectContract: function (run, id, era, origin) {
      var def = FC.Sim.contractDef(id);
      if (!run || !def || run.contract) return false;
      run.contract = {
        id: def.id,
        progress: 0,
        target: 100,
        goal: FC.Sim.contractGoal(def, run, era, origin),
        points: 0,
        deadlineMonths: def.deadline,
        chosenMonth: run.months || 0,
        deadlineMonth: (run.months || 0) + def.deadline,
        status: "active"
      };
      FC.Sim.refreshContract(run);
      return run.contract;
    },

    /** 签约弹窗要先说清这张合约今天从几分起步：高学历出身签落户，
        进度条一开始就不在零，这是选择的一部分而不是意外。 */
    contractPreview: function (run, id, era, origin) {
      var def = FC.Sim.contractDef(id);
      if (!def || !run) return 0;
      var saved = run.contract;
      run.contract = {
        id: def.id, progress: 0, target: 100, points: 0,
        goal: FC.Sim.contractGoal(def, run, era, origin)
      };
      var pct = FC.Sim.contractProgress(run);
      run.contract = saved;
      return pct;
    },

    contractMonthsLeft: function (run) {
      var c = run && run.contract;
      if (!c) return 0;
      return c.deadlineMonth - (run.months || 0);
    },

    /** 纯读：算出 0–100 的进度，不写 run。 */
    contractProgress: function (run) {
      var c = run && run.contract;
      if (!c) return 0;
      if (c.id === "home") {
        var cash = (run.money || 0) + ((run.assets && run.assets.sideFund) || 0);
        return round1(clamp(cash / Math.max(1, c.goal) * 100, 0, 100));
      }
      if (c.id === "promote") {
        var lv = (run.career && run.career.level) || 0;
        var kpi = (run.career && run.career.kpi) || 0;
        return round1(Math.min(1, lv / 2) * 55 + Math.min(1, kpi / 70) * 45);
      }
      /* 落户：学历分打底，加分项（进修行动、居住年限、合约事件）补足差额。 */
      return round1(clamp((run.edu || 0) + (c.points || 0), 0, 100));
    },

    refreshContract: function (run) {
      var c = run && run.contract;
      if (!c) return 0;
      c.progress = FC.Sim.contractProgress(run);
      return c.progress;
    },

    /** 落户加分项的唯一入账口（进修行动、学历事件、合约专属事件）。 */
    creditContract: function (run, points) {
      var c = run && run.contract;
      if (!c || c.status !== "active" || c.id !== "hukou" || !points) return 0;
      var before = c.points || 0;
      c.points = round1(Math.max(0, before + points));
      FC.Sim.refreshContract(run);
      return round1(c.points - before);
    },

    /** 结算一次：重算进度，然后看是否达成或到期。返回状态迁移，没有迁移则 null。 */
    updateContract: function (run, era, origin) {
      var c = run && run.contract;
      if (!c || c.status !== "active") return null;
      FC.Sim.refreshContract(run);
      var def = FC.Sim.contractDef(c.id);
      if (c.progress >= c.target) {
        c.status = "won";
        c.settledMonth = run.months || 0;
        return { status: "won", kind: "won", def: def, contract: c };
      }
      if (FC.Sim.contractMonthsLeft(run) <= 0) {
        c.status = "failed";
        c.settledMonth = run.months || 0;
        return { status: "failed", kind: "failed", def: def, contract: c };
      }
      return null;
    },

    /** 每月推进：先累计居住年限分，再结算。dashboard 的 finishMonth 调它。 */
    tickContract: function (run, era, origin) {
      var c = run && run.contract;
      if (!c || c.status !== "active") return null;
      if (c.id === "hukou") {
        FC.Sim.creditContract(run, 0.3 + (run.edu || 0) / 100 * 0.9);
      }
      return FC.Sim.updateContract(run, era, origin);
    },

    /** 二级合约：主合约达成后 6 月内可选一张。 */
    secondaryContracts: function () {
      return (FC.Sim.pack && FC.Sim.pack.secondaryContracts) || [];
    },

    secondaryDef: function (id) {
      var found = null;
      FC.Sim.secondaryContracts().forEach(function (c) {
        if (c.id === id) found = c;
      });
      return found;
    },

    canPickSecondary: function (run) {
      var c = run && run.contract;
      if (!c || c.status !== "won" || run.secondaryContract) return false;
      var windowEnd = (c.settledMonth || 0) + 6;
      return (run.months || 0) <= windowEnd;
    },

    selectSecondaryContract: function (run, id, era, origin) {
      var def = FC.Sim.secondaryDef(id);
      if (!run || !def || !FC.Sim.canPickSecondary(run)) return false;
      var goal = def.goal || 100;
      if (id === "rent" || id === "sidebiz") {
        var inc = FC.Sim.income(run, era, origin) || 0;
        goal = Math.round(inc * (def.goalMonthsOfIncome || 12) / 1000) * 1000;
        goal = Math.max(def.goalMin || 8000, Math.min(def.goalMax || 200000, goal));
      }
      run.secondaryContract = {
        id: def.id,
        progress: 0,
        target: 100,
        goal: goal,
        deadlineMonths: def.deadline,
        chosenMonth: run.months || 0,
        deadlineMonth: (run.months || 0) + def.deadline,
        status: "active"
      };
      FC.Sim.refreshSecondaryContract(run);
      return run.secondaryContract;
    },

    secondaryProgress: function (run, origin) {
      var sc = run && run.secondaryContract;
      if (!sc || sc.status !== "active") return 0;
      if (sc.id === "rent") {
        return round1(clamp((run.money || 0) / Math.max(1, sc.goal) * 100, 0, 100));
      }
      if (sc.id === "marriage") {
        return round1(clamp((run.social || 0) * 0.55 + (run.rep || 0) * 0.45, 0, 100));
      }
      if (sc.id === "sidebiz") {
        var fund = (run.assets && run.assets.sideFund) || 0;
        return round1(clamp(fund / Math.max(1, sc.goal) * 100, 0, 100));
      }
      return sc.progress || 0;
    },

    refreshSecondaryContract: function (run) {
      var sc = run && run.secondaryContract;
      if (!sc) return 0;
      sc.progress = FC.Sim.secondaryProgress(run);
      return sc.progress;
    },

    tickSecondaryContract: function (run) {
      var sc = run && run.secondaryContract;
      if (!sc || sc.status !== "active") return null;
      FC.Sim.refreshSecondaryContract(run);
      var def = FC.Sim.secondaryDef(sc.id);
      if (sc.progress >= sc.target) {
        sc.status = "won";
        sc.settledMonth = run.months || 0;
        return { status: "won", def: def, contract: sc };
      }
      if (sc.deadlineMonth - (run.months || 0) <= 0) {
        sc.status = "failed";
        sc.settledMonth = run.months || 0;
        return { status: "failed", def: def, contract: sc };
      }
      return null;
    },

    secondaryCtx: function (run) {
      var sc = run && run.secondaryContract;
      if (!sc) return null;
      return {
        id: sc.id,
        status: sc.status,
        progress: Math.round(FC.Sim.secondaryProgress(run)),
        monthsLeft: sc.deadlineMonth - (run.months || 0)
      };
    },

    /** 人情账 ≤ −3 时优先抽讨债事件（由 dashboard 传入 draw.debtNpc）。 */
    debtNpc: function (run) {
      var worst = null;
      (run.npcs || []).forEach(function (n) {
        if (!n || typeof n.balance !== "number") return;
        if (n.balance > -3) return;
        if (!worst || n.balance < worst.balance) worst = n;
      });
      return worst;
    },

    contractCtx: function (run) {
      var c = run && run.contract;
      if (!c) return null;
      return {
        id: c.id,
        status: c.status,
        progress: Math.round(FC.Sim.contractProgress(run)),
        monthsLeft: FC.Sim.contractMonthsLeft(run)
      };
    },

    stage: function (run) {
      var pack = FC.Sim.pack;
      if (!pack || !pack.lifeStages) return { label: "入城期", apBonus: 0 };
      var i, st;
      for (i = 0; i < pack.lifeStages.length; i++) {
        st = pack.lifeStages[i];
        if (run.age >= st.minAge && run.age <= st.maxAge) return st;
      }
      return pack.lifeStages[0];
    },

    apMax: function (run, era) {
      var base = 3;
      var st = FC.Sim.stage(run);
      base += st.apBonus || 0;
      if (era && era.id === "E7") base += 0;
      return Math.max(1, base);
    },

    eraMod: function (era) {
      var pack = FC.Sim.pack;
      if (!pack || !pack.eraModifiers || !era) return { incomeMul: 1, volatility: 1 };
      return pack.eraModifiers[era.id] || { incomeMul: 1, volatility: 1 };
    },

    income: function (run, era, origin) {
      var skill = (origin.mods.edu + run.rep + run.edu) / 3;
      var em = FC.Sim.eraMod(era);
      var eraBoost = 0.85 + era.stats.opportunity / 180;
      var layer = FC.Sim.layerOf(run, origin);
      var careerBonus = 1 + run.career.level * 0.12 + (run.career.kpi - 50) / 200;
      var gross = (1500 + skill * 44 + run.social * 16) * eraBoost * em.incomeMul *
        careerBonus * (0.7 + layer * 0.16);
      if (run.gap > 0) gross *= 0.18;
      if (run.talents.indexOf("hustle") >= 0) gross *= 1.08;
      return Math.round(gross);
    },

    bills: function (run, era, origin) {
      var layer = FC.Sim.layerOf(run, origin);
      var burden = [0, 0.8, 0.74, 0.71, 0.6, 0.68][layer] || 0.74;
      var inc = FC.Sim.income(run, era, origin);
      var base = inc * burden;
      if (run.talents.indexOf("frugal") >= 0) base *= 0.95;
      var rows = [
        { k: "房租", v: Math.round(base * 0.46) },
        { k: "通勤", v: Math.round(base * 0.08) },
        { k: "伙食", v: Math.round(base * 0.22) },
        { k: "人情", v: Math.round(base * 0.14) },
        { k: "杂费", v: Math.round(base * 0.1) },
        { k: "还贷", v: Math.round(run.debt * 0.015) }
      ];
      if (run.assets.property) rows.push({ k: "物业费", v: Math.round(base * 0.12) });
      if (run.assets.vehicle) rows.push({ k: "养车", v: Math.round(base * 0.06) });
      return rows;
    },

    layerOf: function (run, origin) {
      if (run.rep < 20) return 5;
      var start = parseInt(String(origin.start).replace(/[^\d]/g, ""), 10) || 1000;
      var mult = run.money / Math.max(start, 800);
      var drift = mult > 60 ? 2 : mult > 8 ? 1 : mult < 0.3 ? -1 : 0;
      return clamp(origin.layer + drift, 1, 4);
    },

    moneyOf: function (units, ref) {
      if (FC.events && FC.events.moneyOf) return FC.events.moneyOf(units, ref);
      return units * Math.max(400, Math.round(ref * 0.3));
    },

    applyDeltas: function (run, d, incomeRef) {
      var applied = {};
      var k, amount;
      for (k in d) {
        if (!Object.prototype.hasOwnProperty.call(d, k)) continue;
        if (k === "money") {
          amount = FC.Sim.moneyOf(d[k], incomeRef);
          run.money += amount;
          applied.money = Math.round(amount / 100) * 100;
        } else if (k === "debt") {
          amount = FC.Sim.moneyOf(d[k], incomeRef);
          run.debt += amount;
          applied.debt = Math.round(amount / 100) * 100;
        } else if (k === "gap") {
          run.gap = Math.max(0, (run.gap || 0) + d[k]);
          applied.gap = d[k];
        } else if (k === "edu") {
          run.edu = clamp(run.edu + d[k], 0, 100);
          applied.edu = d[k];
        } else if (typeof run[k] === "number") {
          run[k] = clamp(run[k] + d[k], 0, 100);
          applied[k] = d[k];
        }
      }
      return applied;
    },

    careerTitle: function (run) {
      var pack = FC.Sim.pack;
      if (!pack) return "职员";
      var tr = null;
      pack.careerTracks.forEach(function (t) {
        if (t.id === run.career.track) tr = t;
      });
      if (!tr) return "职员";
      return tr.levels[clamp(run.career.level, 0, tr.levels.length - 1)];
    },

    maybePromote: function (run) {
      if (run.career.kpi >= 82 && run.career.level < 4 && run.months > run.career.level * 18) {
        run.career.level++;
        run.career.kpi = 54;
        return true;
      }
      if (run.career.kpi < 22 && run.career.level > 0 && Math.random() < 0.22) {
        run.career.level--;
        run.career.kpi = 48;
        return true;
      }
      return false;
    },

    actions: function () {
      return (FC.Sim.pack && FC.Sim.pack.actions) || [];
    },

    canAction: function (run, action, era, origin) {
      if (run.ap < action.ap) return false;
      if (action.minLayer && FC.Sim.layerOf(run, origin) < action.minLayer) return false;
      if (action.id === "explore" && !run.zoneQueue) return false;
      return true;
    },

    doAction: function (run, actionId, era, origin) {
      var action = null;
      FC.Sim.actions().forEach(function (a) {
        if (a.id === actionId) action = a;
      });
      if (!action || !FC.Sim.canAction(run, action, era, origin)) return null;

      run.ap -= action.ap;
      run.apSpent.push(actionId);
      var inc = FC.Sim.income(run, era, origin);
      var applied = FC.Sim.applyDeltas(run, action.d || {}, inc);
      if (action.edu) {
        run.edu = clamp(run.edu + action.edu, 0, 100);
        applied.edu = action.edu;
      }

      if (actionId === "work" || actionId === "overtime") {
        run.career.kpi = clamp(run.career.kpi + (actionId === "overtime" ? 6 : 3), 0, 100);
      }
      if (actionId === "study") {
        run.career.kpi = clamp(run.career.kpi + 2, 0, 100);
        if (run.talents.indexOf("study") >= 0 && action.edu) {
          run.edu = clamp(run.edu + Math.round(action.edu * 0.2), 0, 100);
          applied.edu = (applied.edu || action.edu) + Math.round(action.edu * 0.2);
        }
      }
      if (actionId === "network") {
        FC.Sim.applyNpcEffects(run, [
          { id: "laozhou", balance: 1, note: "一起吃过工作日的午饭" },
          { id: "wangzong", balance: 1, note: "在群里说得上话了" }
        ]);
      }

      var extra = null;
      if (action.zone && run.zoneQueue) {
        extra = FC.Sim.pickZoneEvent(run, run.zoneQueue);
        run.zoneQueue = null;
      }

      FC.Sim.maybePromote(run);
      return {
        action: action,
        applied: applied,
        text: action.text,
        zoneEvent: extra
      };
    },

    eventEligible: function (run, ev, era, origin) {
      var layer = FC.Sim.layerOf(run, origin);
      if (ev.once && run.done[ev.id]) return false;
      if (ev.minMonths && run.months < ev.minMonths) return false;
      if (ev.maxMonths && run.months > ev.maxMonths) return false;
      if (ev.minAge && run.age < ev.minAge) return false;
      if (ev.maxAge && run.age > ev.maxAge) return false;
      if (ev.layerId && layerNum(ev.layerId) > layer + 1) return false;
      if (ev.era && era && ev.era !== era.id) return false;
      if ((run.recent || []).indexOf(ev.id) >= 0) return false;
      return true;
    },

    recentWindow: function () {
      var pack = FC.Sim.pack;
      return (pack && pack.balance && pack.balance.recentAmbientWindow) || 18;
    },

    markAmbientSeen: function (run, ev) {
      if (!ev) return;
      if (ev.once) run.done[ev.id] = true;
      var win = FC.Sim.recentWindow();
      run.recent = (run.recent || []).concat(ev.id).slice(-win);
    },

    originBiasMul: function (ev, origin) {
      var pack = FC.Sim.pack;
      if (!pack || !pack.originBias || !origin) return 1;
      var key = origin.storyId || origin.id;
      var bias = pack.originBias[key];
      if (!bias) return 1;
      var mul = 1;
      if (bias.layers && ev.layerId && bias.layers.indexOf(ev.layerId) >= 0) mul *= 1.75;
      if (bias.tags && ev.category && bias.tags.indexOf(ev.category) >= 0) mul *= 1.45;
      return mul;
    },

    eraTagMul: function (ev, era) {
      var pack = FC.Sim.pack;
      if (!pack || !pack.eraModifiers || !era) return 1;
      var em = pack.eraModifiers[era.id];
      if (!em || !em.tags || !ev.category) return 1;
      var cat = ev.category;
      if (cat === "职场" && em.tags.indexOf("铁饭碗") >= 0) return 1.2;
      if (cat === "金钱" && em.tags.indexOf("房改") >= 0) return 1.15;
      if (cat === "风险" && em.tags.indexOf("网贷") >= 0) return 1.25;
      if (cat === "机会" && em.tags.indexOf("互联网") >= 0) return 1.2;
      return 1;
    },

    pickAmbient: function (run, era, origin) {
      var pack = FC.Sim.pack;
      if (!pack || !pack.ambientEvents) return null;
      var layer = FC.Sim.layerOf(run, origin);
      var pool = [];
      var total = 0;
      pack.ambientEvents.forEach(function (ev) {
        if (!FC.Sim.eventEligible(run, ev, era, origin)) return;
        var w = (ev.weight || 5) * FC.Sim.originBiasMul(ev, origin) * FC.Sim.eraTagMul(ev, era);
        if (era && ev.eraAny && ev.era) w *= 0.15;
        else if (era && ev.era && ev.era === era.id) w *= 1.35;
        if (run.talents.indexOf("luck") >= 0 && ev.category === "机会") w *= 1.12;
        if (run.talents.indexOf("network") >= 0 && ev.category === "人情") w *= 1.15;
        pool.push({ ev: ev, w: w });
        total += w;
      });
      if (!pool.length) return null;
      var r = Math.random() * total;
      var i, picked;
      for (i = 0; i < pool.length; i++) {
        picked = pool[i];
        r -= picked.w;
        if (r <= 0) break;
      }
      picked = pool[Math.min(i, pool.length - 1)];
      var ev = picked.ev;
      FC.Sim.markAmbientSeen(run, ev);
      if (ev.npcEffects) FC.Sim.applyNpcEffects(run, ev.npcEffects);
      return ev;
    },

    pickZoneEvent: function (run, zoneKey) {
      var pack = FC.Sim.pack;
      if (!pack || !pack.zoneEvents || !pack.zoneEvents[zoneKey]) return null;
      var list = pack.zoneEvents[zoneKey];
      if (!list.length) return null;
      if (!run.recentZone) run.recentZone = {};
      var recent = run.recentZone[zoneKey] || [];
      var candidates = [];
      var i;
      for (i = 0; i < list.length; i++) {
        if (recent.indexOf(i) < 0) candidates.push(i);
      }
      /* Tiny custom packs can have fewer entries than the two-pick window.
         In that case preserve the stronger rule: never repeat the last pick. */
      if (!candidates.length) {
        for (i = 0; i < list.length; i++) {
          if (i !== recent[recent.length - 1]) candidates.push(i);
        }
      }
      if (!candidates.length) candidates.push(0);
      var pickedIndex = candidates[Math.floor(Math.random() * candidates.length)];
      run.recentZone[zoneKey] = recent.concat(pickedIndex).slice(-2);
      return list[pickedIndex];
    },

    /** 随机链 + 出身链共用同一个 run.saga 槽位，查找时两个池都要看。 */
    sagaById: function (sagaId) {
      var pack = FC.Sim.pack;
      if (!pack) return null;
      var found = null;
      (pack.sagas || []).concat(pack.originSagas || []).forEach(function (s) {
        if (s.id === sagaId) found = s;
      });
      return found;
    },

    originSagaFor: function (origin) {
      var pack = FC.Sim.pack;
      if (!pack || !pack.originSagas || !origin) return null;
      var key = origin.storyId || origin.id;
      var found = null;
      pack.originSagas.forEach(function (s) {
        if (s.originId === key) found = s;
      });
      return found;
    },

    startSaga: function (run, sagaId) {
      if (run.saga) return false;
      var saga = FC.Sim.sagaById(sagaId);
      if (!saga) return false;
      run.saga = { id: saga.id, step: 0, title: saga.title };
      return true;
    },

    sagaStep: function (run) {
      if (!run.saga) return null;
      var saga = FC.Sim.sagaById(run.saga.id);
      if (!saga || !saga.steps[run.saga.step]) {
        run.saga = null;
        return null;
      }
      return saga.steps[run.saga.step];
    },

    advanceSaga: function (run, choiceIndex, incomeRef) {
      var step = FC.Sim.sagaStep(run);
      if (!step) return null;
      var d = step.d || {};
      if (step.choices && step.choices[choiceIndex]) {
        d = step.choices[choiceIndex].d || {};
      }
      var applied = FC.Sim.applyDeltas(run, d, incomeRef);
      run.saga.step++;
      if (!FC.Sim.sagaStep(run)) run.saga = null;
      return { step: step, applied: applied };
    },

    /** 出身短链：入城后 3–18 月内一次性触发，窗口末月保底。 */
    tryStartOriginSaga: function (run, origin) {
      if (!run.done) run.done = {};
      if (run.saga || run.done.originSaga) return false;
      var saga = FC.Sim.originSagaFor(origin);
      if (!saga) return false;
      var bal = (FC.Sim.pack && FC.Sim.pack.balance) || {};
      var minM = bal.originSagaMinMonths || 3;
      var maxM = bal.originSagaMaxMonths || 18;
      if (run.months < minM) return false;
      if (run.months > maxM) {
        run.done.originSaga = true;
        return false;
      }
      if (run.months < maxM && Math.random() > (bal.originSagaMonthlyOdds || 0.2)) return false;
      run.done.originSaga = true;
      run.done["saga_" + saga.id] = true;
      return FC.Sim.startSaga(run, saga.id);
    },

    tryStartRandomSaga: function (run, era, origin) {
      if (run.saga) return false;
      var pack = FC.Sim.pack;
      var bal = (pack && pack.balance) || {};
      var minM = bal.sagaStartMonths || 18;
      if (run.months < minM) return false;
      if (Math.random() > (bal.sagaMonthlyOdds || 0.045)) return false;
      var eligible = [];
      pack.sagas.forEach(function (s) {
        if (run.done["saga_" + s.id]) return;
        if (s.minMonths && run.months < s.minMonths) return;
        if (s.minAge && run.age < s.minAge) return;
        if (s.maxAge && run.age > s.maxAge) return;
        eligible.push(s);
      });
      if (!eligible.length) return false;
      var pick = eligible[Math.floor(Math.random() * eligible.length)];
      run.done["saga_" + pick.id] = true;
      return FC.Sim.startSaga(run, pick.id);
    },

    resetMonthAp: function (run, era) {
      run.apMax = FC.Sim.apMax(run, era);
      run.ap = run.apMax;
      run.apSpent = [];
    },

    checkEnd: function (run, origin) {
      var pack = FC.Sim.pack;
      var bal = (pack && pack.balance) || {};
      if (run.ended) return null;
      if (run.health <= 0 && run.months >= 24) return "health";
      if (run.money <= 0 && run.debt > FC.Sim.income(run, FC.era(), origin) * 10 &&
          run.months >= (bal.minMonthsBeforeBankruptcy || 48)) return "bankruptcy";
      if (run.rep <= 5 && run.months > (bal.minMonthsBeforeRedline || 72)) return "redline";
      if (run.age >= 75) return "elder";
      if (run.age >= 62 && run.months >= 240 && run.months % 12 === 0) return "retire";
      return null;
    },

    endingMeta: function (kind) {
      var pack = FC.Sim.pack;
      if (!pack || !pack.endings) return { title: "终局", summary: "" };
      return pack.endings[kind] || pack.endings.elder;
    },

    netIncome: function (run, era, origin) {
      var inc = FC.Sim.income(run, era, origin);
      var out = FC.Sim.bills(run, era, origin).reduce(function (a, b) { return a + b.v; }, 0);
      return inc - out;
    }
  };

  function layerNum(id) {
    return parseInt(String(id || "L2").replace(/[^\d]/g, ""), 10) || 2;
  }

  if (FC.gameplay) FC.Sim.install(FC.gameplay);
})(window);
