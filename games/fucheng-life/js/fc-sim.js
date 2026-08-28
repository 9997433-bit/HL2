/* 浮城人生 · fc-sim.js
   Core life simulation: AP, career, relations, assets, sagas, endings. */
(function (global) {
  "use strict";

  var FC = global.FC || (global.FC = {});

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function pickTrack(origin) {
    if (!origin) return "staff";
    if (origin.mods.edu >= 75) return "tech";
    if (origin.mods.social >= 75) return "sales";
    if (origin.layer <= 1) return "gig";
    return "staff";
  }

  FC.Sim = {
    pack: null,

    install: function (pack) {
      FC.Sim.pack = pack || FC.gameplay || null;
    },

    freshRun: function (era, origin) {
      var money = parseInt(String(origin.start).replace(/[^\d]/g, ""), 10) || 1000;
      var track = pickTrack(origin);
      return {
        key: era.id + "/" + origin.id,
        version: 2,
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
        career: { track: track, level: 0, kpi: 48, title: null },
        relations: [
          { id: "landlord", name: "房东", balance: -1 },
          { id: "family", name: "家人", balance: 0 },
          { id: "colleague", name: "同事", balance: 1 }
        ],
        assets: { property: null, vehicle: null, sideFund: 0 },
        saga: null,
        done: {},
        recent: [],
        recentModal: [],
        log: [],
        talents: (function () {
          var inh = null;
          try { inh = global.localStorage.getItem("fucheng.inheritedTalent.v1"); } catch (e) { /* ignore */ }
          if (!inh && FC.read) inh = FC.read().inheritedTalent;
          return inh ? [inh] : [];
        })(),
        zoneQueue: null,
        ended: false
      };
    },

    migrate: function (run, era, origin) {
      if (!run) return FC.Sim.freshRun(era, origin);
      if (run.version >= 2 && run.career) return run;
      var fresh = FC.Sim.freshRun(era, origin);
      var keys = ["year", "month", "age", "months", "money", "health", "social", "rep", "debt",
        "income", "gap", "sinceModal", "done", "recent", "recentModal", "log"];
      keys.forEach(function (k) {
        if (run[k] != null) fresh[k] = run[k];
      });
      fresh.version = 2;
      fresh.ap = 3;
      fresh.apMax = 3;
      return fresh;
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
        run.relations.forEach(function (r) {
          if (r.id === "colleague") r.balance = clamp(r.balance + 2, -10, 10);
        });
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
      return ev;
    },

    pickZoneEvent: function (run, zoneKey) {
      var pack = FC.Sim.pack;
      if (!pack || !pack.zoneEvents || !pack.zoneEvents[zoneKey]) return null;
      var list = pack.zoneEvents[zoneKey];
      return list[Math.floor(Math.random() * list.length)];
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
