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

  /* 存档只吃能进 JSON 的东西：先整段深拷贝，拷不动（循环引用等）就退一步做浅拷贝，
     并逐个丢掉自身不可序列化的字段，保证返回值一定能跟着存档写出去。 */
  function serializableCopy(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      var out = {};
      Object.keys(obj).forEach(function (k) {
        var v = obj[k];
        if (typeof v === "function" || v === undefined) return;
        try {
          out[k] = JSON.parse(JSON.stringify(v));
        } catch (e2) { /* 这一格存不住，就当它不存在 */ }
      });
      return out;
    }
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
    neighbor: "介绍过换房的人",
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
        if (added.length) FC.Sim.queueNpcFollowups(run, npc.id, added);
        out.push({
          id: npc.id, name: npc.name, balance: npc.balance,
          delta: delta, added: added, cleared: cleared, note: note
        });
      });
      return out;
    },

    /* R8：挂上欠账 flag 后 2–4 月内定向插队回账事件，不再只靠 O1 随机抽中。 */
    NPC_FOLLOWUPS: {
      owe_rent: { eventId: "EV88", delayMin: 2, delayMax: 4 },
      owe_dinner: { eventId: "EV89", delayMin: 2, delayMax: 4 },
      owe_shift: { eventId: "EV90", delayMin: 2, delayMax: 4 },
      hosted_amin: { eventId: "EV91", delayMin: 3, delayMax: 6 },
      lent_amin: { eventId: "EV91", delayMin: 3, delayMax: 6 },
      charged_bike: { eventId: "EV92", delayMin: 2, delayMax: 5 },
      ran_route: { eventId: "EV92", delayMin: 2, delayMax: 5 },
      trusted: { eventId: "EV92", delayMin: 2, delayMax: 5 }
    },

    queueNpcFollowups: function (run, npcId, flags) {
      if (!run || !flags || !flags.length) return;
      if (!run.npcQueue) run.npcQueue = [];
      var map = FC.Sim.NPC_FOLLOWUPS;
      flags.forEach(function (flag) {
        var spec = map[flag];
        if (!spec) return;
        var already = false;
        run.npcQueue.forEach(function (q) {
          if (q.eventId === spec.eventId && !q.fired) already = true;
        });
        if (already) return;
        var span = Math.max(0, (spec.delayMax || 4) - (spec.delayMin || 2));
        var delay = (spec.delayMin || 2) + Math.floor(Math.random() * (span + 1));
        run.npcQueue.push({
          eventId: spec.eventId,
          npc: npcId,
          flag: flag,
          dueMonth: (run.months || 0) + delay,
          fired: false
        });
      });
    },

    /** 到期且未抽过的回账事件 id；没有则 null。 */
    dueNpcFollowup: function (run) {
      if (!run || !run.npcQueue || !run.npcQueue.length) return null;
      var months = run.months || 0;
      var hit = null;
      run.npcQueue.forEach(function (q) {
        if (!q || q.fired || months < q.dueMonth) return;
        if (run.done && run.done[q.eventId]) { q.fired = true; return; }
        if (!hit || q.dueMonth < hit.dueMonth) hit = q;
      });
      return hit;
    },

    markNpcFollowupFired: function (run, eventId) {
      if (!run || !run.npcQueue) return;
      run.npcQueue.forEach(function (q) {
        if (q && q.eventId === eventId) q.fired = true;
      });
    },

    /* R12：主动互动后的人情余波（日志回响，不额外弹窗）。 */
    NPC_RIPPLE_KINDS: {
      dine: ["dine_thanks", "dine_invite"],
      ask: ["ask_collect", "ask_awkward"],
      repay: ["repay_nod"]
    },

    NPC_ARCS: {
      chenjie: {
        title: "门锁与口风",
        steps: [
          {
            id: "keys",
            text: "陈姐把备用钥匙塞给你：「晚点回来自己开。」门锁轻了一点，房租的口气也软了一点。",
            d: { social: 2 },
            effects: [{ id: "chenjie", balance: 1, flag: "handy", note: "有过备用钥匙" }]
          },
          {
            id: "refer",
            text: "陈姐把你介绍给楼上换房的人。介绍费她没收，只说：「别给我丢人。」",
            d: { money: 1, rep: 2 },
            effects: [{ id: "chenjie", balance: 1, flag: "neighbor", note: "替你说过一句好话" }]
          }
        ]
      },
      laozhou: {
        title: "班次与烟",
        steps: [
          {
            id: "cover",
            text: "老周替你顶了半个晚班，只留一句：「下次我抽烟，你别打报告。」",
            d: { health: -1, social: 2 },
            effects: [{ id: "laozhou", balance: 1, note: "顶过一次班" }]
          },
          {
            id: "route",
            text: "老周把一条不容易撞上领导的路线画给你。走廊里的脚步声，忽然没那么响了。",
            d: { rep: 3 },
            effects: [{ id: "laozhou", balance: 1, flag: "trusted", note: "教过你一条路" }]
          }
        ]
      },
      amin: {
        title: "同乡的夜",
        steps: [
          {
            id: "bowl",
            text: "阿敏请你吃了一碗几乎不赚钱的面。「出门在外，别老算。」",
            d: { health: 2, social: 2 },
            effects: [{ id: "amin", balance: 1, note: "请过一碗面" }]
          },
          {
            id: "loan",
            text: "阿敏把一笔小钱转到你账上：「先顶着，别问利息。」人情账又沉了一格。",
            d: { money: 2 },
            effects: [{ id: "amin", balance: -1, flag: "lent_amin", note: "转过一笔应急" }]
          }
        ]
      },
      wangzong: {
        title: "饭局的座位",
        steps: [
          {
            id: "seat",
            text: "王总让你坐到他右手边。这一晚你没怎么说话，但名片夹厚了一点。",
            d: { social: 3, rep: 1 },
            effects: [{ id: "wangzong", balance: 1, note: "给过一个好座位" }]
          },
          {
            id: "intro",
            text: "王总在酒桌上点了你的名。有人加你微信，备注写着「王总的人」。",
            d: { social: 2, money: 1 },
            effects: [{ id: "wangzong", balance: 1, flag: "trusted", note: "酒桌上点过名" }]
          }
        ]
      },
      xiaoyu: {
        title: "楼道里的灯",
        steps: [
          {
            id: "bulb",
            text: "小余修好了楼道灯。黑暗少了一截，闲话也少了一截。",
            d: { health: 1, social: 1 },
            effects: [{ id: "xiaoyu", balance: 1, note: "一起修过灯" }]
          },
          {
            id: "watch",
            text: "你出差那周，小余帮你看了快递和绿植。「没事，顺手。」",
            d: { social: 2 },
            effects: [{ id: "xiaoyu", balance: 1, flag: "trusted", note: "帮你看过家" }]
          }
        ]
      }
    },

    queueNpcRipple: function (run, npcId, kind) {
      if (!run || !npcId || !kind) return;
      if (!run.npcRipple) run.npcRipple = [];
      var pool = FC.Sim.NPC_RIPPLE_KINDS[kind];
      if (!pool || !pool.length) return;
      var rippleId = pool[Math.floor(Math.random() * pool.length)];
      var delay = 1 + Math.floor(Math.random() * 2);
      if (kind === "ask") delay = 2 + Math.floor(Math.random() * 2);
      run.npcRipple.push({
        id: rippleId,
        npc: npcId,
        from: kind,
        dueMonth: (run.months || 0) + delay,
        fired: false
      });

      /* 约饭可推进该 NPC 短线：未完成时排队下一步。 */
      if (kind === "dine") {
        var arc = FC.Sim.NPC_ARCS[npcId];
        if (!run.npcArc) run.npcArc = {};
        if (!run.npcArc[npcId]) run.npcArc[npcId] = { step: 0 };
        var st = run.npcArc[npcId];
        if (arc && !st.done && st.step < arc.steps.length) {
          var pending = false;
          run.npcRipple.forEach(function (q) {
            if (q && !q.fired && q.npc === npcId && String(q.id).indexOf("arc_") === 0) pending = true;
          });
          if (!pending) {
            run.npcRipple.push({
              id: "arc_" + st.step,
              npc: npcId,
              from: "arc",
              dueMonth: (run.months || 0) + 1,
              fired: false
            });
          }
        }
      }
    },

    dueNpcRipple: function (run) {
      if (!run || !run.npcRipple || !run.npcRipple.length) return null;
      var months = run.months || 0;
      var hit = null;
      run.npcRipple.forEach(function (q) {
        if (!q || q.fired || months < q.dueMonth) return;
        if (!hit || q.dueMonth < hit.dueMonth) hit = q;
      });
      return hit;
    },

    resolveNpcRipple: function (run, item, era, origin) {
      if (!run || !item) return null;
      item.fired = true;
      var npc = FC.Sim.npcById(run, item.npc);
      if (!npc) return null;
      var inc = FC.Sim.income(run, era, origin);
      var name = npc.name;
      var text = "";
      var d = {};
      var effects = [];

      if (String(item.id).indexOf("arc_") === 0) {
        var arc = FC.Sim.NPC_ARCS[item.npc];
        if (!run.npcArc) run.npcArc = {};
        if (!run.npcArc[item.npc]) run.npcArc[item.npc] = { step: 0 };
        var st = run.npcArc[item.npc];
        var idx = st.step;
        if (!arc || st.done || idx >= arc.steps.length) {
          return { text: name + "这边暂时没新动静。", applied: {}, ledger: [], npc: npc, kind: "ripple" };
        }
        var step = arc.steps[idx];
        text = "【" + arc.title + " · " + (idx + 1) + "/" + arc.steps.length + "】" + step.text;
        d = step.d || {};
        effects = step.effects || [];
        st.step = idx + 1;
        if (st.step >= arc.steps.length) st.done = true;
      } else if (item.id === "dine_thanks") {
        text = name + "隔天发来一句「上次那顿我请下回」。账本上淡淡多了一笔人情。";
        d = { social: 1 };
        effects = [{ id: item.npc, balance: 1, note: "说要回请" }];
      } else if (item.id === "dine_invite") {
        text = name + "把你拉进一个小群：「有空露个面。」座位比饭局本身更贵。";
        d = { social: 2, health: -1 };
        effects = [{ id: item.npc, balance: 1, note: "拉过你进群" }];
      } else if (item.id === "ask_collect") {
        text = name + "来收人情了：「上次那事，你心里有数。」你得吐出一点，或者再欠一笔。";
        d = { money: -2, social: -1 };
        effects = [{ id: item.npc, balance: -1, note: "来收过人情" }];
      } else if (item.id === "ask_awkward") {
        text = name + "在楼道里看见你，点头比以前短半拍。开口借过的人，走路会轻一点。";
        d = { social: -2 };
        effects = [{ id: item.npc, balance: -1, note: "楼道里短了一拍" }];
      } else if (item.id === "repay_nod") {
        text = name + "后来跟人提起你：「这人还算明白。」闲话偶尔也能当通行证。";
        d = { rep: 2, social: 1 };
        effects = [{ id: item.npc, balance: 1, note: "对外说过好话" }];
      } else {
        text = name + "那边有一点余波，但风很快过去了。";
      }

      var applied = FC.Sim.applyDeltas(run, d, inc);
      var ledger = FC.Sim.applyNpcEffects(run, effects);
      return { text: text, applied: applied, ledger: ledger, npc: npc, kind: "ripple" };
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
        npcActMonth: {},
        npcRipple: [],
        npcArc: {},
        lastCrisisMonth: 0,
        recentCrisis: [],
        zoneAftershock: null,
        pendingModal: null,
        challengeMonths: (function () {
          var mode = null;
          try {
            if (FC.read) mode = FC.read().playMode;
          } catch (e) { /* ignore */ }
          return mode === "challenge" ? 60 : 0;
        })(),
        goal: null,
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
      if (run.contract && run.contract.resolutionPending === undefined) {
        run.contract.resolutionPending = false;
      }
      if (run.secondaryContract === undefined) run.secondaryContract = null;
      if (!run.assets) run.assets = { property: null, vehicle: null, sideFund: 0, owned: [] };
      if (!run.assets.owned) run.assets.owned = [];
      if (run.career) {
        /* 旧档没有 picked 字段时：已推进过的档默认当作选过；显式 false
           （手动入口取消后）必须保留，不能靠 months>0 再强推。 */
        if (run.career.picked == null) {
          run.career.picked = (run.months || 0) > 0 ? true : !!run.career.track;
        }
      }
      if (!run.talents || !run.talents.length) run.talents = loadInheritedTalents();
      if (!run.npcQueue) run.npcQueue = [];
      if (!run.npcActMonth) run.npcActMonth = {};
      if (!run.npcRipple) run.npcRipple = [];
      if (!run.npcArc) run.npcArc = {};
      if (run.lastCrisisMonth == null) run.lastCrisisMonth = 0;
      if (!run.recentCrisis) run.recentCrisis = [];
      if (run.zoneAftershock === undefined) run.zoneAftershock = null;
      if (run.pendingModal === undefined) run.pendingModal = null;
      if (run.challengeMonths == null) {
        var mode = null;
        try { if (FC.read) mode = FC.read().playMode; } catch (e) { /* ignore */ }
        run.challengeMonths = mode === "challenge" ? 60 : 0;
      }
      if (run.goal === undefined) run.goal = null;
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

    /* R16：把还没答完的事件卡挂在存档上。刷新、切页、误关弹窗之后，
       这张卡还能原样再开一次，不至于让危机凭空消失。
       payload 形如 { kind: "crisis"|"o1"|"npc", event: <事件卡> }，
       event 要带 openEvent 需要的 id/title/choices。存不下的卡一律不挂，
       挂了半张比没挂更糟 —— 与其留个开不出来的残卡，不如当没有。 */
    setPendingModal: function (run, payload) {
      if (!run) return null;
      if (!payload || typeof payload !== "object") {
        run.pendingModal = null;
        return null;
      }
      var snap = serializableCopy(payload);
      if (!snap || !snap.event || typeof snap.event !== "object" || !snap.event.id) {
        run.pendingModal = null;
        return null;
      }
      if (typeof snap.kind !== "string" || !snap.kind) snap.kind = null;
      run.pendingModal = snap;
      return snap;
    },

    clearPendingModal: function (run) {
      if (!run) return false;
      var had = FC.Sim.hasPendingModal(run);
      run.pendingModal = null;
      return had;
    },

    hasPendingModal: function (run) {
      var p = run && run.pendingModal;
      return !!(p && p.event && typeof p.event === "object" && p.event.id);
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
        2026 年第一年就签完了 —— 同一张合约要在七个时代都值同样多的力气。
        R8：再与「当前现金 × 1.5」取高，避免开局就买得起的出身一签即赢。 */
    contractGoal: function (def, run, era, origin) {
      if (!def) return 100;
      if (def.id !== "home") return def.goal || 100;
      var inc = 0;
      try { inc = FC.Sim.income(run, era, origin) || 0; } catch (e) { inc = 0; }
      var scale = def.goalMonthsOfIncome || 70;
      var raw = Math.round(inc * scale / 1000) * 1000;
      raw = Math.max(def.goalMin || 60000, Math.min(def.goalMax || 1500000, raw));
      var cash = (run.money || 0) + ((run.assets && run.assets.sideFund) || 0);
      var floor = Math.round(cash * 1.5 / 1000) * 1000;
      return Math.max(raw, floor);
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
        status: "active",
        resolutionPending: false
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
      /* R8 落户：学历只贡献 35% 打底，其余靠居住年限 / 进修加分 / 合约事件。
         旧公式 edu+points 让寒门（edu≈86）近乎签约即达成。 */
      return round1(clamp((run.edu || 0) * 0.35 + (c.points || 0), 0, 100));
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
        /* R8：月度居住分约 0.4–0.6，36 月自然攒 ~18 分，其余靠进修与事件。 */
        FC.Sim.creditContract(run, 0.35 + (run.edu || 0) / 100 * 0.25);
      }
      var settled = FC.Sim.updateContract(run, era, origin);
      /* R15：快进时结算弹窗可能被跳过。挂一个待办位，等 UI 补放再清。 */
      if (settled && (settled.status === "won" || settled.status === "failed")) {
        c.resolutionPending = true;
      }
      return settled;
    },

    /** R15：合约已结算但结算弹窗还没放过 —— 需要补一次。 */
    needsContractResolution: function (run) {
      var c = run && run.contract;
      if (!c || !c.status || c.status === "active") return false;
      return c.resolutionPending === true;
    },

    /** R15：补弹放完后销账。返回是否真的清掉了一笔待办。 */
    markContractResolutionDone: function (run) {
      var c = run && run.contract;
      if (!c || c.resolutionPending !== true) return false;
      c.resolutionPending = false;
      return true;
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
      /* R12：老周翻脸（drifted）——班次上处处不顺，收入缩一截。 */
      var laozhou = FC.Sim.npcById(run, "laozhou");
      if (laozhou && laozhou.flags && laozhou.flags.indexOf("drifted") >= 0) gross *= 0.92;
      return Math.round(gross);
    },

    bills: function (run, era, origin) {
      var layer = FC.Sim.layerOf(run, origin);
      var burden = [0, 0.8, 0.74, 0.71, 0.6, 0.68][layer] || 0.74;
      var inc = FC.Sim.income(run, era, origin);
      var base = inc * burden;
      if (run.talents.indexOf("frugal") >= 0) base *= 0.95;
      var rent = Math.round(base * 0.46);
      /* R12：陈姐拉黑 —— 房租上浮，账单里写得清清楚楚。 */
      var chenjie = FC.Sim.npcById(run, "chenjie");
      if (chenjie && chenjie.flags && chenjie.flags.indexOf("blacklist") >= 0) {
        rent = Math.round(rent * 1.2);
      }
      var rows = [
        { k: "房租", v: rent },
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

    /** R9：本月最该干什么。返回 { actionId, reason, urgency } 或 null（该推进月份）。
        R15 可选 opts：
          skipExplore —— 快进/无人值守时别把玩家推去探区（探区会开弹窗）；
          preferWorkIfPoor —— 现金撑不过一个月时先去挣钱，休息线一并收紧到健康危机级。 */
    suggestMonth: function (run, era, origin, opts) {
      if (!run) return null;
      var o = opts || {};
      var skipExplore = o.skipExplore === true;
      var preferWorkIfPoor = o.preferWorkIfPoor === true;

      if ((run.ap || 0) <= 0) {
        return { actionId: null, reason: "行动点已用尽，点「推进一个月」结算。", urgency: "tick" };
      }

      var restFloor = preferWorkIfPoor ? 30 : 38;
      if ((run.health || 0) < restFloor) {
        return { actionId: "rest", reason: "健康偏低，先休息一口，别在工位上倒下。", urgency: "high" };
      }

      if (preferWorkIfPoor) {
        var monthly = 0;
        try {
          if (era && origin) monthly = FC.Sim.income(run, era, origin) || 0;
        } catch (e) { monthly = 0; }
        if (!monthly) monthly = run.income || 0;
        if (monthly > 0 && (run.money || 0) < monthly) {
          return {
            actionId: "work",
            reason: "现金还不够一个月流水：先上班把账面稳住。",
            urgency: "high"
          };
        }
      }

      var debtor = FC.Sim.debtNpc(run);
      if (debtor) {
        return {
          actionId: "network",
          reason: debtor.name + "账本结余已到 " + debtor.balance + "，人情快上门了——去饭局转转。",
          urgency: "high"
        };
      }

      var c = run.contract;
      if (c && c.status === "active") {
        if (c.id === "hukou") {
          return { actionId: "study", reason: "落户合约进行中：进修最能抬积分。", urgency: "mid" };
        }
        if (c.id === "promote") {
          return { actionId: "work", reason: "升职合约进行中：上班/加班抬 KPI。", urgency: "mid" };
        }
        if (c.id === "home") {
          return { actionId: "side", reason: "攒首付进行中：副业能往基金里塞钱。", urgency: "mid" };
        }
      }

      /* R11：闯城主目标牵引建议（健康/讨债/进行中合约仍优先）。 */
      if (run.goal && run.challengeMonths > 0) {
        var gp = FC.Sim.goalProgress(run, era, origin);
        if (gp < 100) {
          if (run.goal.id === "hukou") {
            return {
              actionId: "study",
              reason: "主目标「落户上岸」：进修抬学历与落户分。",
              urgency: "mid"
            };
          }
          if (run.goal.id === "debtfree") {
            return {
              actionId: "work",
              reason: "主目标「还清负债」：先稳住收入再还。",
              urgency: "mid"
            };
          }
          if (run.goal.id === "rise") {
            return {
              actionId: "work",
              reason: "主目标「" + (run.goal.name || "向上爬一层") + "」：上班抬声望与现金。",
              urgency: "mid"
            };
          }
          if (run.goal.id === "downpay") {
            return {
              actionId: "side",
              reason: "主目标「攒够首付」：副业往基金里塞钱。",
              urgency: "mid"
            };
          }
        }
      }

      if (run.zoneQueue && !skipExplore) {
        return {
          actionId: "explore",
          reason: "探区目标已设，点「探区」花 1 AP 去触发那里的事。",
          urgency: "mid"
        };
      }

      if ((run.health || 0) < 55) {
        return { actionId: "rest", reason: "身体有点紧，穿插一次休息更稳。", urgency: "low" };
      }

      return { actionId: "work", reason: "本月没有急事：先正常上班稳住收入。", urgency: "low" };
    },

    /** R9：探区地点的风险/收益预览（静态文案，不改数值）。 */
    ZONE_BLURB: {
      broker: { risk: "高", reward: "中", blurb: "灰色中介：可能翻出便宜房，也可能被套路" },
      alley: { risk: "高", reward: "中", blurb: "夜场后巷：人情与麻烦同价" },
      factory: { risk: "高", reward: "低", blurb: "废弃厂区：少有人去，消息却危险" },
      auction: { risk: "高", reward: "高", blurb: "拍卖行：可能捡漏，也可能砸一整月工资" },
      school: { risk: "低", reward: "中", blurb: "重点中学：学历与人脉的慢变量" },
      exam: { risk: "中", reward: "中", blurb: "考场：一次机会，换一张纸" },
      jobfair: { risk: "低", reward: "中", blurb: "校招现场：简历堆里翻身" },
      nightclass: { risk: "低", reward: "中", blurb: "夜校：用睡眠换积分" },
      incubator: { risk: "中", reward: "高", blurb: "孵化器：故事好听，钱难赚" },
      office: { risk: "低", reward: "中", blurb: "写字楼：KPI 与茶水间八卦" },
      rent: { risk: "低", reward: "低", blurb: "合租房：房东与室友的日常账" },
      metro: { risk: "低", reward: "低", blurb: "早高峰地铁：迟到与偶遇" },
      mall: { risk: "中", reward: "中", blurb: "连锁商圈：消费陷阱与兼职" },
      bank: { risk: "低", reward: "中", blurb: "银行网点：理财与脸色" },
      village: { risk: "中", reward: "低", blurb: "城中村：房租低，事却不少" },
      market: { risk: "低", reward: "低", blurb: "早市：新鲜与讨价还价" },
      delivery: { risk: "中", reward: "中", blurb: "外卖站点：日结与膝盖" },
      nightfood: { risk: "低", reward: "中", blurb: "夜宵大排档：人情最好下酒" },
      labor: { risk: "中", reward: "中", blurb: "劳务市场：力气换钱" }
    },

    zoneBlurb: function (zoneKey) {
      return FC.Sim.ZONE_BLURB[zoneKey] || null;
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
      var zoneKey = null;
      if (action.zone && run.zoneQueue) {
        zoneKey = run.zoneQueue;
        extra = FC.Sim.pickZoneEvent(run, run.zoneQueue);
        run.zoneQueue = null;
        if (zoneKey) FC.Sim.queueZoneAftershock(run, zoneKey);
      }

      FC.Sim.maybePromote(run);
      return {
        action: action,
        applied: applied,
        text: action.text,
        zoneEvent: extra
      };
    },

    /** R13：探区余波 —— 下月日志回响，不额外弹窗。 */
    queueZoneAftershock: function (run, zoneKey) {
      if (!run || !zoneKey) return;
      var blurb = FC.Sim.zoneBlurb(zoneKey);
      var sting = blurb && blurb.risk === "高";
      run.zoneAftershock = {
        zone: zoneKey,
        dueMonth: (run.months || 0) + 1,
        sting: !!sting,
        fired: false
      };
    },

    resolveZoneAftershock: function (run, era, origin) {
      var z = run && run.zoneAftershock;
      if (!z || z.fired) return null;
      if ((run.months || 0) < z.dueMonth) return null;
      z.fired = true;
      run.zoneAftershock = null;
      var name = z.zone;
      var blurb = FC.Sim.zoneBlurb(z.zone);
      if (blurb && blurb.blurb) {
        /* blurb 首词常是地点感觉，名称仍用 key；文案里拼可读性 */
        name = z.zone;
      }
      var d;
      var text;
      if (z.sting) {
        d = { money: -1, health: -2 };
        text = "探区「" + name + "」的余波还在：有人追着问你昨晚看见了什么。" +
          (blurb ? "（" + blurb.blurb + "）" : "");
      } else {
        d = { social: 1, rep: 1 };
        text = "探区「" + name + "」过后，街上多了一两个认得你的人。" +
          (blurb ? "（" + blurb.blurb + "）" : "");
      }
      var applied = FC.Sim.applyDeltas(run, d, FC.Sim.income(run, era, origin));
      return { text: text, applied: applied, zone: z.zone, kind: "zone" };
    },

    /** R13：本月危机 —— 约每 3–5 月一次二选一，打破月份同质感。 */
    MONTH_CRISES: [
      {
        id: "ot_or_rest",
        title: "凌晨的工位灯",
        body: "KPI 和眼皮一起打架。组长说「再顶一晚」，医生说「再顶就住院」。",
        minMonths: 2,
        needHealthBelow: 58,
        choices: [
          { id: "ot", label: "加班顶住", d: { health: -10, money: 2, rep: 2 },
            result: "你把天亮熬成了汇报页。数字亮了，身体暗了。" },
          { id: "rest", label: "请假休息", d: { health: 12, money: -1, rep: -2 },
            result: "你把手机扣过去。群里有人@你，你装没看见。" }
        ]
      },
      {
        id: "debt_or_cash",
        title: "催收短信连响",
        body: "负债像闹钟，比上班更准时。你手里还有一点现金，够还一截，也够撑下个月房租。",
        minMonths: 3,
        needDebtAbove: 8000,
        choices: [
          { id: "pay", label: "先还一截债", d: { money: -2, debt: -3 },
            result: "账少了一截。手机安静了两天，房租开始吵。" },
          { id: "hold", label: "先留现金", d: { social: -2, rep: -1 },
            result: "你没还。催收换了个更有礼貌的语气，礼貌里全是压力。" }
        ]
      },
      {
        id: "dinner_or_sleep",
        title: "酒桌与枕头",
        body: "王总的局定在今晚。你的身体想睡觉，你的人脉想赴约。",
        minMonths: 4,
        needSocialBelow: 55,
        choices: [
          { id: "go", label: "去饭局", d: { social: 4, health: -6, money: -1 },
            result: "你喝得不多，话也不多。但座位在，名字就在。" },
          { id: "sleep", label: "回家睡", d: { health: 8, social: -3 },
            result: "你关了灯。群里有人说「下次吧」，下次总是更贵。" }
        ]
      },
      {
        id: "side_or_study",
        title: "夜校与夜单",
        body: "同一块晚上：左边是进修报名页，右边是副业加急单。两件事都说「就差这一次」。",
        minMonths: 3,
        choices: [
          { id: "study", label: "去进修", d: { edu: 4, health: -2, money: -1 },
            result: "你用睡眠换了一点学历。证书不发光，但门禁认它。" },
          { id: "side", label: "接副业", d: { money: 2, health: -4, social: -1 },
            result: "钱到了。黑眼圈也到了。副业基金里多了一行。" }
        ]
      },
      {
        id: "rent_fight",
        title: "涨租通知",
        body: "陈姐把纸贴在门上：下月起加一成。你可以忍，也可以争。",
        minMonths: 5,
        choices: [
          { id: "accept", label: "咬牙接受", d: { money: -2, social: 1 },
            result: "你签了。门锁还在你这边，钱包轻了一点。" },
          { id: "argue", label: "据理力争", d: { social: -2 },
            result: "你争赢了半成。陈姐没拉黑你，只是话少了。" }
        ]
      },
      {
        id: "city_check",
        title: "突击检查",
        body: "街道办敲门：租住登记、电瓶车、楼道杂物。你要么配合，要么装不在。",
        minMonths: 6,
        gapMonths: 5,
        choices: [
          { id: "comply", label: "配合登记", d: { rep: 2, money: -1 },
            result: "表格填完了。城市记住了你的名字，也收走了一点手续费。" },
          { id: "hide", label: "装不在家", d: { rep: -3, social: -1 },
            result: "你没开门。后来通知贴在了单元门，字比你大。" }
        ]
      },
      /* R17：新增三条钱—身体—家庭向的二选一，补上「非工位」的压力面。
         追加在数组尾部，避免改动既有抽取顺序（等权时首个合格项先中）；
         末位留给无属性门槛的一条，因为它同时是 pickMonthCrisis 的兜底项。 */
      {
        id: "checkup_arrow",
        title: "体检报告上的箭头",
        body: "一行指标带着向上的箭头。复查要排一上午队，工位那边要人。",
        minMonths: 8,
        needHealthBelow: 46,
        choices: [
          { id: "recheck", label: "请假去复查", d: { health: 9, money: -1, rep: -1 },
            result: "队排到中午。医生说再观察，你把这句当成缓刑。" },
          { id: "skip", label: "先拖着", d: { health: -7, social: -1 },
            result: "你把报告塞进抽屉。箭头没走，只是暂时看不见了。" }
        ]
      },
      {
        id: "family_call",
        title: "老家来的电话",
        body: "妈说爸住了两天院，语气很轻——是那种「不用你操心」的轻。",
        minMonths: 6,
        gapMonths: 4,
        choices: [
          { id: "send", label: "先打钱回去", d: { money: -3, social: 3 },
            result: "转账两分钟就好了。你没敢问要不要更多，怕答案是要。" },
          { id: "later", label: "说下个月", d: { social: -3, health: -3 },
            result: "你挂了电话。剩下的话没说出口，在胃里过了一夜。" }
        ]
      },
      {
        id: "wage_delay",
        title: "工资晚了十天",
        body: "财务说在走流程。房东不走流程，花呗也不走。",
        minMonths: 7,
        choices: [
          { id: "press", label: "去要个说法", d: { money: 1, rep: -2, social: -1 },
            result: "钱当天到账。你的名字也进了另一份名单，那份没人给你看。" },
          { id: "wait", label: "再等等看", d: { money: -1, health: -3 },
            result: "第十五天钱到了。这半个月的利息，由你的胃先垫上。" }
        ]
      }
    ],

    pickMonthCrisis: function (run, era, origin) {
      if (!run) return null;
      var months = run.months || 0;
      var since = months - (run.lastCrisisMonth || 0);
      if (since < 3) return null;

      var recent = run.recentCrisis || [];
      var eligible = [];
      var pool = [];
      FC.Sim.MONTH_CRISES.forEach(function (c) {
        if (c.minMonths && months < c.minMonths) return;
        if (c.gapMonths && since < c.gapMonths) return;
        if (c.needHealthBelow != null && (run.health || 0) >= c.needHealthBelow) return;
        if (c.needSocialBelow != null && (run.social || 0) >= c.needSocialBelow) return;
        if (c.needDebtAbove != null && (run.debt || 0) < c.needDebtAbove) return;
        var w = 1;
        if (c.needHealthBelow != null) w += 2;
        if (c.needDebtAbove != null) w += 2;
        if (since >= 5) w += 1;
        eligible.push({ c: c, w: w });
        if (recent.indexOf(c.id) >= 0) return;
        pool.push({ c: c, w: w });
      });

      /* 近 4 次都轮过时不再空手而归，退回全部合格项。 */
      if (!pool.length) pool = eligible;

      if (!pool.length) {
        if (since < 5) return null;
        pool.push({ c: FC.Sim.MONTH_CRISES[FC.Sim.MONTH_CRISES.length - 1], w: 1 });
      }
      if (!pool.length) return null;

      /* R15：冷却到期不等于必然出事。压一道概率闸 —— 3 月起四成半，久旱（5 月以上）
         抬到七成半。否则每三个月准点挨一记，节奏读起来像闹钟。 */
      if (Math.random() >= (since >= 5 ? 0.75 : 0.45)) return null;

      var total = 0;
      pool.forEach(function (p) { total += p.w; });
      var roll = Math.random() * total;
      var acc = 0;
      var picked = pool[pool.length - 1].c;
      var i;
      for (i = 0; i < pool.length; i++) {
        acc += pool[i].w;
        if (roll <= acc) { picked = pool[i].c; break; }
      }
      FC.Sim.noteCrisis(run, picked);
      return picked;
    },

    /** 记住最近几次危机 id，供下次抽取时排除。 */
    noteCrisis: function (run, crisis) {
      if (!run || !crisis || !crisis.id) return;
      var recent = (run.recentCrisis || []).filter(function (id) {
        return id !== crisis.id;
      });
      recent.push(crisis.id);
      run.recentCrisis = recent.slice(-4);
    },

    crisisToEvent: function (crisis, run, origin) {
      if (!crisis) return null;
      var layer = FC.Sim.layerOf(run, origin);
      return {
        id: "crisis_" + crisis.id + "_" + (run.months || 0),
        type: "opportunity",
        title: crisis.title,
        body: crisis.body,
        category: "本月危机",
        layerId: "L" + layer,
        presentation: "modal",
        once: false,
        choices: (crisis.choices || []).map(function (ch) {
          return {
            id: ch.id,
            label: ch.label,
            d: ch.d,
            result: ch.result
          };
        })
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
      if (run.challengeMonths > 0 && (run.months || 0) >= run.challengeMonths) return "challenge";
      if (run.health <= 0 && run.months >= 24) return "health";
      if (run.money <= 0 && run.debt > FC.Sim.income(run, FC.era(), origin) * 10 &&
          run.months >= (bal.minMonthsBeforeBankruptcy || 48)) return "bankruptcy";
      if (run.rep <= 5 && run.months > (bal.minMonthsBeforeRedline || 72)) return "redline";
      if (run.age >= 75) return "elder";
      if (run.age >= 62 && run.months >= 240 && run.months % 12 === 0) return "retire";
      return null;
    },

    /** R11：闯城主目标。仅 challenge 档强制选择。 */
    CHALLENGE_GOALS: [
      {
        id: "hukou", name: "落户上岸",
        blurb: "签下并完成落户合约，把户口钉进这座城。"
      },
      {
        id: "debtfree", name: "还清负债",
        blurb: "把债务清零，别让账单替你决定下个月。"
      },
      {
        id: "rise", name: "向上爬一层",
        blurb: "比入城时再高一层。起点越高，门禁越狠。"
      },
      {
        id: "downpay", name: "攒够首付",
        blurb: "现金加副业基金，凑齐约两年收入的首付目标。"
      }
    ],

    challengeGoals: function () {
      return FC.Sim.CHALLENGE_GOALS;
    },

    goalDef: function (id) {
      var found = null;
      FC.Sim.CHALLENGE_GOALS.forEach(function (g) {
        if (g.id === id) found = g;
      });
      return found;
    },

    /** 主目标 → 对应合约 id；「还清负债」没有合约可签，返回 null。 */
    GOAL_CONTRACT: {
      hukou: "hukou",
      downpay: "home",
      rise: "promote",
      debtfree: null
    },

    contractForGoal: function (goalId) {
      var id = goalId && goalId.id ? goalId.id : goalId;
      if (!id) return null;
      return FC.Sim.GOAL_CONTRACT[id] || null;
    },

    needsChallengeGoal: function (run) {
      return !!(run && run.challengeMonths > 0 && !run.goal);
    },

    pickChallengeGoal: function (run, id, era, origin) {
      var def = FC.Sim.goalDef(id);
      if (!run || !def || !(run.challengeMonths > 0)) return false;
      var inc = FC.Sim.income(run, era, origin) || 3000;
      var downpayGoal = Math.max(60000, Math.round(inc * 24 / 1000) * 1000);
      var startLayer = (origin && origin.layer) || FC.Sim.layerOf(run, origin) || 2;
      var targetLayer = Math.min(4, Math.max(startLayer + 1, 3));
      run.goal = {
        id: def.id,
        name: def.name,
        pickedAt: run.months || 0,
        startDebt: Math.max(0, run.debt || 0),
        startMoney: Math.max(0, run.money || 0),
        startLayer: startLayer,
        targetLayer: targetLayer,
        downpayGoal: downpayGoal,
        doneMonth: null
      };
      if (id === "rise") {
        run.goal.name = "升到 L" + targetLayer;
      }
      return true;
    },

    goalProgress: function (run, era, origin) {
      if (!run || !run.goal) return 0;
      var id = run.goal.id;
      var pct = 0;
      if (id === "hukou") {
        var c = run.contract;
        if (c && c.id === "hukou" && c.status === "won") pct = 100;
        else if (c && c.id === "hukou" && c.status === "active") {
          pct = FC.Sim.contractProgress(run);
        } else {
          pct = clamp((run.edu || 0) * 0.35, 0, 45);
        }
      } else if (id === "debtfree") {
        if ((run.debt || 0) <= 0) pct = 100;
        else {
          var base = Math.max(run.goal.startDebt || 0, FC.Sim.income(run, era, origin) * 8, 1);
          pct = clamp(100 - (run.debt / base) * 100, 0, 99);
        }
      } else if (id === "rise") {
        var layer = FC.Sim.layerOf(run, origin);
        var target = run.goal.targetLayer || 3;
        var start = run.goal.startLayer || 2;
        if (layer >= target) pct = 100;
        else if (layer > start) {
          pct = 55 + clamp((run.rep || 0) / 100 * 30, 0, 30);
        } else {
          pct = 15 + clamp((run.rep || 0) / 100 * 35, 0, 35);
        }
      } else if (id === "downpay") {
        var cash = (run.money || 0) + ((run.assets && run.assets.sideFund) || 0);
        var need = Math.max(1, run.goal.downpayGoal || 80000);
        if (run.contract && run.contract.id === "home" && run.contract.status === "won") pct = 100;
        else pct = clamp(cash / need * 100, 0, 100);
      }
      pct = round1(clamp(pct, 0, 100));
      if (pct >= 100 && run.goal.doneMonth == null) {
        run.goal.doneMonth = run.months || 0;
      }
      return pct;
    },

    scoreChallenge: function (run, era, origin) {
      var progress = FC.Sim.goalProgress(run, era, origin);
      var def = run.goal ? FC.Sim.goalDef(run.goal.id) : null;
      var survival = clamp(
        (run.health || 0) * 0.35 + (run.social || 0) * 0.2 + (run.rep || 0) * 0.25 +
          Math.min(30, Math.max(0, (run.money || 0) / 5000)),
        0, 100
      );
      var early = 0;
      if (run.goal && run.goal.doneMonth != null && run.challengeMonths > 0) {
        early = clamp((run.challengeMonths - run.goal.doneMonth) / run.challengeMonths * 15, 0, 15);
      }
      var score = Math.round(clamp(progress * 0.7 + survival * 0.25 + early, 0, 100));
      var grade = score >= 90 ? "S" : score >= 75 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
      return {
        score: score,
        grade: grade,
        progress: progress,
        survival: Math.round(survival),
        earlyBonus: Math.round(early),
        goalId: run.goal && run.goal.id,
        goalName: (def && def.name) || (run.goal && run.goal.name) || "未选目标",
        done: progress >= 100
      };
    },

    /** R10：关系 Tab 主动互动。kind = repay | dine | ask */
    npcInteractOptions: function (run, npcId) {
      var npc = FC.Sim.npcById(run, npcId);
      if (!npc) return [];
      var opts = [];
      var busy = run.npcActMonth && run.npcActMonth[npcId] === (run.months || 0);
      if (busy) return [{ id: "busy", label: "本月已互动", disabled: true }];
      if (npc.balance < 0 || (npc.flags && npc.flags.length)) {
        opts.push({ id: "repay", label: "还人情", cost: "现金−−", hint: "结清一笔人情账" });
      }
      opts.push({ id: "dine", label: "约饭", cost: "现金−", hint: "花一点钱拉近距离" });
      if (npc.balance >= 1) {
        opts.push({ id: "ask", label: "求助", cost: "人情−−", hint: "开口借一程现金" });
      }
      return opts;
    },

    interactNpc: function (run, npcId, kind, era, origin) {
      var npc = FC.Sim.npcById(run, npcId);
      if (!npc || !run) return null;
      if (!run.npcActMonth) run.npcActMonth = {};
      if (run.npcActMonth[npcId] === (run.months || 0)) {
        return { error: "这个月已经找过" + npc.name + "了，下个月再来。" };
      }
      var inc = FC.Sim.income(run, era, origin);
      var applied = {};
      var effects = [];
      var text = "";

      if (kind === "repay") {
        applied = FC.Sim.applyDeltas(run, { money: -2, social: 1 }, inc);
        effects = [{
          id: npcId, balance: 2,
          clearFlag: (npc.flags || []).filter(function (f) {
            return String(f).indexOf("owe_") === 0 || f === "blacklist";
          }),
          note: "这笔账你主动结了"
        }];
        text = "你找" + npc.name + "把欠着的事了结了一部分。对方点头，账本上淡了一笔。";
      } else if (kind === "dine") {
        applied = FC.Sim.applyDeltas(run, { money: -1, social: 2, health: -1 }, inc);
        effects = [{ id: npcId, balance: 1, note: "一起吃过一顿" }];
        text = "你请" + npc.name + "吃了顿便饭。话题不多，但座位之间的距离近了一点。";
      } else if (kind === "ask") {
        if (npc.balance < 1) return { error: npc.name + "还不觉得欠你，开口会很尴尬。" };
        applied = FC.Sim.applyDeltas(run, { money: 2, social: -1 }, inc);
        effects = [{ id: npcId, balance: -2, note: "开口借过一回" }];
        text = "你开口求" + npc.name + "帮一把。事成了，人情账也往下沉了两格。";
      } else {
        return null;
      }

      var ledger = FC.Sim.applyNpcEffects(run, effects);
      run.npcActMonth[npcId] = run.months || 0;
      FC.Sim.queueNpcRipple(run, npcId, kind);
      return { text: text, applied: applied, ledger: ledger, npc: npc, kind: kind };
    },

    endingMeta: function (kind) {
      var pack = FC.Sim.pack;
      if (!pack || !pack.endings) return { title: "终局", summary: "" };
      return pack.endings[kind] || pack.endings.elder;
    },

    endingMetaForRun: function (kind, run, era, origin) {
      var meta = FC.Sim.endingMeta(kind);
      if (kind !== "challenge" || !run || !(run.challengeMonths > 0)) return meta;
      var scored = FC.Sim.scoreChallenge(run, era, origin);
      return {
        title: "闯城交卷 · " + scored.grade,
        summary: "主目标「" + scored.goalName + "」完成度 " + scored.progress +
          "%。综合评分 " + scored.score + "（生存 " + scored.survival +
          (scored.earlyBonus ? "，提前完成 +" + scored.earlyBonus : "") + "）。" +
          (scored.done ? "目标已达成，这座城给你盖了章。" : "目标未满，但六十个月已经写进履历。")
      };
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
