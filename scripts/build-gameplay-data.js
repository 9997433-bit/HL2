#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "../games/fucheng-life/data/gameplay-pack.json");
const ambientCore = require("./curated/ambient-core");
const ambientLayers = require("./curated/ambient-layers");
const zones = require("./curated/zones");
const sagasExtra = require("./curated/sagas-extra");
const originSagas = require("./curated/origin-sagas");

const LAYERS = ["L1", "L2", "L3", "L4", "L5"];

const ORIGIN_BIAS = {
  "humble-scholar": { layers: ["L1", "L3"], tags: ["教育", "机会"] },
  orphan: { layers: ["L1", "L5"], tags: ["风险", "机会"] },
  "wealthy-merchant": { layers: ["L4", "L5"], tags: ["金钱", "人情"] },
  "blended-family": { layers: ["L2", "L3"], tags: ["人情", "居住"] },
  "transnational": { layers: ["L3", "L4"], tags: ["机会", "教育"] },
  "public-system": { layers: ["L2", "L3"], tags: ["职场", "人情"] },
  "rural-migrant": { layers: ["L1", "L2"], tags: ["职场", "金钱"] }
};

/** 行动回报略降 — 拉长积累周期 */
const ACTION_DEFS = [
  { id: "work", name: "上班", icon: "⌁", ap: 1, d: { money: 1, health: -2, rep: 2 }, text: "打卡、开会、改一版。城市按小时计费。" },
  { id: "overtime", name: "加班", icon: "◐", ap: 1, d: { money: 1, health: -5, rep: 3 }, text: "灯亮到深夜。绩效表上多一格，体检报告多一个箭头。" },
  { id: "study", name: "进修", icon: "✎", ap: 1, d: { money: -1, rep: 4, health: -2 }, edu: 6, text: "证书班的座位永远靠窗。学费是另一种房租。" },
  { id: "network", name: "饭局", icon: "◎", ap: 1, d: { money: -1, social: 6, rep: 1 }, text: "桌上没人递名片——都认识彼此，只有你需要介绍。" },
  { id: "side", name: "副业", icon: "⚡", ap: 1, d: { money: 1, health: -3, rep: 1 }, text: "深夜私活尾款到账。屏幕亮一下，又暗下去。" },
  { id: "rest", name: "休息", icon: "☾", ap: 1, d: { health: 6, money: -1 }, text: "什么都没发生。这也很贵。" },
  { id: "explore", name: "探区", icon: "⌖", ap: 1, zone: true, text: "你在地图上选一处，城市会回你一句报价。" },
  { id: "invest", name: "理财", icon: "¥", ap: 2, d: { money: 2, rep: -1 }, minLayer: 3, text: "数字在 App 里跳动。涨跌都不问你的睡眠。" }
];

const BASE_SAGAS = [
  {
    id: "SAGA_METRO",
    title: "迟到链",
    minMonths: 8,
    steps: [
      { title: "地铁延误", text: "早高峰停了十一分钟。你打卡时队伍已经很长。", d: { rep: -2, health: -2 } },
      { title: "主管约谈", text: "「本月考勤要注意。」办公室空调很冷。", choices: [
        { text: "解释并道歉", d: { rep: 1, social: -1 } },
        { text: "沉默点头", d: { rep: -1, health: -2 } }
      ]},
      { title: "KPI 余波", text: "季度名单中段有你。再顶一顶，还是换岗？", choices: [
        { text: "加班补进度", d: { money: 1, health: -6, rep: 3 } },
        { text: "申请调组", d: { social: 2, rep: -2 } }
      ]},
      { title: "尾声", text: "地铁恢复了。你学会把闹钟提前十五分钟。", d: { rep: 2 } }
    ]
  },
  {
    id: "SAGA_HOME",
    title: "首付链",
    minMonths: 36,
    minAge: 26,
    steps: [
      { title: "看房", text: "小两居，首付要掏空所有卡。签字的手很稳，心跳不稳。", d: { money: -3 } },
      { title: "按揭", text: "银行表格三份，笔拴着链子。利率比你想象的高一点。", choices: [
        { text: "签长期", d: { money: -2, rep: 4 } },
        { text: "再等等", d: { rep: -1, social: 1 } }
      ]},
      { title: "搬家", text: "空房间有油漆味。窗外是另一片天际线。", d: { health: 3, money: -1 } },
      { title: "月供第一年", text: "账单日比生日记得更牢。你成了有地址的人。", d: { rep: 5, health: -2 } }
    ]
  },
  {
    id: "SAGA_POACH",
    title: "跳槽链",
    minMonths: 18,
    steps: [
      { title: "猎头来电", text: "涨 18%，代价是每周飞一次。你要了三天考虑期。", d: { social: 2 } },
      { title: "现公司挽留", text: "HR 谈话，提到股权和「感情」。", choices: [
        { text: "留下", d: { rep: 3, money: 1 } },
        { text: "离开", d: { money: 2, social: -3, rep: 4 } }
      ]},
      { title: "新工位", text: "名片还没印好，项目已经压下来。", d: { health: -4, rep: 2 } },
      { title: "复盘", text: "跳槽没有对错，只有价码。", d: { rep: 1 } }
    ]
  },
  {
    id: "SAGA_SIDE",
    title: "副业链",
    minMonths: 12,
    steps: [
      { title: "私活邀约", text: "朋友介绍一份周末外包。报价不高，但够交两月房租。", d: { money: 1 } },
      { title: "时间冲突", text: "主业项目也要加班。你只能选一边。", choices: [
        { text: "保主业", d: { rep: 4, money: -1 } },
        { text: "接私活", d: { money: 2, health: -5, rep: -2 } }
      ]},
      { title: "尾款", text: "甲方拖款三周。你在群里催了两次，对方已读不回。", d: { social: -2, health: -3 } },
      { title: "收束", text: "钱到了。你学会把合同写清楚——下次。", d: { rep: 2, money: 1 } }
    ]
  },
  {
    id: "SAGA_FAMILY",
    title: "家链",
    minMonths: 24,
    steps: [
      { title: "来电", text: "家里说需要一笔钱。数额不大，但语气很急。", d: { social: -1 } },
      { title: "抉择", text: "你看着余额，又看日历上的还款日。", choices: [
        { text: "立刻转", d: { money: -2, social: 6 } },
        { text: "分期帮", d: { money: -1, social: 3, rep: 1 } },
        { text: "这次不行", d: { social: -4, health: -2 } }
      ]},
      { title: "回音", text: "电话那头沉默了几秒。城市噪音填满了空白。", d: { health: -2 } },
      { title: "余波", text: "亲情没有 KPI，但有利息——情绪的那种。", d: { social: 1 } }
    ]
  }
];

function normalizeEvent(raw, defaults) {
  const ev = Object.assign({}, defaults, raw);
  ev.title = ev.title || (ev.category + " · " + (ev.layerId || "城市"));
  ev.weight = ev.weight == null ? 6 : ev.weight;
  return ev;
}

function buildAmbientEvents() {
  const events = [];
  const seen = new Set();

  function push(ev) {
    if (seen.has(ev.id)) throw new Error("duplicate event id: " + ev.id);
    seen.add(ev.id);
    events.push(normalizeEvent(ev, {}));
  }

  ambientCore.universal.forEach((e) => push(Object.assign({}, e)));

  ambientCore.milestones.forEach((e) => push(Object.assign({ once: true }, e)));

  Object.keys(ambientCore.byEra).forEach((eraId) => {
    ambientCore.byEra[eraId].forEach((e) => {
      push(Object.assign({ era: eraId }, e));
    });
  });

  LAYERS.forEach((layerId) => {
    (ambientLayers[layerId] || []).forEach((e) => {
      push(Object.assign({ layerId }, e));
    });
  });

  return events;
}

function buildZoneEvents() {
  const out = {};
  Object.keys(zones).forEach((key) => {
    out[key] = zones[key].map((z) => normalizeEvent(z, { layerId: z.layerId || inferLayer(key) }));
  });
  return out;
}

function inferLayer(key) {
  const map = {
    village: "L1", market: "L1", delivery: "L1", nightfood: "L1", labor: "L1",
    office: "L2", rent: "L2", metro: "L2", mall: "L2", bank: "L2",
    school: "L3", exam: "L3", jobfair: "L3", nightclass: "L3", incubator: "L3",
    club: "L4", mansion: "L4", fund: "L4", auction: "L4",
    loan: "L5", broker: "L5", alley: "L5", factory: "L5"
  };
  return map[key] || "L2";
}

/** story.json 是出身表的 SSOT：只打包它声明的出身，且必须一条不缺。 */
function buildOriginSagas() {
  const story = JSON.parse(fs.readFileSync(path.join(__dirname, "../games/fucheng-life/data/story.json"), "utf8"));
  const declared = new Set(story.origins.map((o) => o.id));
  const seenIds = new Set();
  const seenOrigins = new Set();
  const out = [];

  originSagas.forEach((saga) => {
    if (!saga.id || !saga.originId) throw new Error("origin saga needs id + originId");
    if (seenIds.has(saga.id)) throw new Error("duplicate origin saga id: " + saga.id);
    if (seenOrigins.has(saga.originId)) throw new Error("duplicate origin saga origin: " + saga.originId);
    seenIds.add(saga.id);
    seenOrigins.add(saga.originId);
    if (!Array.isArray(saga.steps) || saga.steps.length < 3 || saga.steps.length > 4) {
      throw new Error("origin saga " + saga.id + " needs 3-4 steps");
    }
    if (!saga.steps.some((s) => Array.isArray(s.choices) && s.choices.length >= 2)) {
      throw new Error("origin saga " + saga.id + " needs at least one choice step");
    }
    if (declared.has(saga.originId)) out.push(Object.assign({ kind: "origin", once: true }, saga));
  });

  const missing = [...declared].filter((id) => !seenOrigins.has(id));
  if (missing.length) throw new Error("origins without a mini-saga: " + missing.join(", "));

  const dormant = [...seenOrigins].filter((id) => !declared.has(id));
  if (dormant.length) console.log("origin sagas held back (not in story.json):", dormant.join(", "));
  return out;
}

/** 中期人生合约：入城头三个月三选一，整局只签一张。
    `goal` 是原始口径（积分 / 首付线 / 合成分），引擎再把它归一到 0–100。 */
const CONTRACTS = [
  {
    id: "hukou",
    name: "落户积分",
    en: "RESIDENCY POINTS",
    tint: "var(--neon-cyan)",
    deadline: 36,
    goal: 100,
    pitch: "把学历、社保和居住年限换成一张准迁证。",
    detail: "36 个月内攒满 100 分。学历分打底，进修行动、居住年限和加分项补差额。",
    source: "进度来源 · 学历 + 进修行动 + 落户事件",
    reward: { rep: 8, social: 4, health: 3 },
    penalty: { rep: -5, health: -4 },
    won: {
      title: "准迁证",
      body: "窗口把回执推出来，纸角还带着打印机的余温。上面印着你的名字、你的编号，" +
        "以及一个排了三年才排到的行政事实。",
      label: "收下这张纸",
      result: "你把回执折好塞进内袋。走出大厅时外面正下雨，你第一次没有去算这场雨要多花多少钱。"
    },
    failed: {
      title: "窗口关上了",
      body: "细则又改了一版，年限那一栏往后挪。轮到你的时候，工作人员说这批已经截止，" +
        "让你明年再来——明年这句话，你听过三次了。",
      label: "认下这笔账",
      result: "你把材料袋抱回出租屋，塞进床底。它还在，只是从今天起不再是一件正在进行的事。"
    }
  },
  {
    id: "home",
    name: "攒首付",
    en: "DOWN PAYMENT",
    tint: "var(--neon-gold)",
    deadline: 48,
    goal: 0,
    goalMonthsOfIncome: 30,
    goalMin: 60000,
    goalMax: 800000,
    pitch: "用四年时间，把一个地址从租来的变成写自己名字的。",
    detail: "48 个月内让现金加副业基金越过首付线。首付线按签约当月的收入折算。",
    source: "进度来源 · 现金余额 + 副业基金",
    reward: { rep: 8, health: 5, social: 3 },
    penalty: { health: -6, social: -3 },
    won: {
      title: "首付线",
      body: "余额界面上的数字第一次越过那条线。你截了图，又删掉，又重新截一次，" +
        "像是怕它自己缩回去。",
      label: "把它变成地址",
      result: "签约那天售楼处放着很吵的音乐。你在合同末页写下名字，笔尖顿了顿，然后一笔到底。"
    },
    failed: {
      title: "又涨了一轮",
      body: "四年过去，你攒钱的速度没有输给自己，只输给了挂在中介橱窗里的那张价目表。" +
        "同一个户型，如今多出一辆车的钱。",
      label: "认下这笔账",
      result: "你把那个账户改了名字，从「首付」改成「备用」。改完之后它还是原来的数字。"
    }
  },
  {
    id: "promote",
    name: "升职",
    en: "PROMOTION",
    tint: "var(--neon-violet)",
    deadline: 24,
    goal: 100,
    pitch: "两年之内挤进能签字的那一层。",
    detail: "24 个月内做到职级 2 且 KPI 不低于 70。进度由职级（55）与 KPI（45）合成。",
    source: "进度来源 · 职级 + KPI",
    reward: { rep: 7, social: 5, money: 3 },
    penalty: { rep: -4, health: -4 },
    won: {
      title: "新的工位",
      body: "任命邮件发在周五下午，抄送整个部门。你的名字后面多了两个字，" +
        "座位从窗边挪进走廊尽头那间有门的屋子。",
      label: "收下这一页",
      result: "第一次以新身份主持会议，你讲得很慢。散会后有人留下来问你要不要喝咖啡，你说好。"
    },
    failed: {
      title: "名单上没有你",
      body: "名单贴出来那天你正在改第七版方案。你从头看到尾，又从尾看到头，" +
        "确认自己没有看漏——两年就这样结算完毕。",
      label: "认下这笔账",
      result: "你把方案存成最终版，关掉电脑。楼下便利店的关东煮还冒着热气，你买了一份站着吃完。"
    }
  }
];

const CAREER_TRACKS = [
  { id: "staff", name: "职员线", levels: ["实习生", "专员", "主管", "总监", "副总裁"] },
  { id: "tech", name: "技术线", levels: ["码农", "工程师", "架构师", "专家", "首席"] },
  { id: "sales", name: "业务线", levels: ["跟单", "销售", "大客户经理", "区域负责人", "合伙人"] },
  { id: "gig", name: "零工线", levels: ["日结", "骑手", "个体户", "小老板", "连锁"] }
];

const pack = {
  version: 2,
  balance: {
    apBase: 3,
    sagaStartMonths: 18,
    sagaMonthlyOdds: 0.09,
    recentAmbientWindow: 18,
    minMonthsBeforeBankruptcy: 48,
    minMonthsBeforeRedline: 72,
    originSagaMinMonths: 3,
    originSagaMaxMonths: 18,
    originSagaMonthlyOdds: 0.2
  },
  actions: ACTION_DEFS,
  contracts: CONTRACTS,
  ambientEvents: buildAmbientEvents(),
  zoneEvents: buildZoneEvents(),
  sagas: BASE_SAGAS.concat(sagasExtra),
  originSagas: buildOriginSagas(),
  careerTracks: CAREER_TRACKS,
  lifeStages: [
    { id: "arrival", minAge: 22, maxAge: 27, label: "入城期", apBonus: 0 },
    { id: "climb", minAge: 28, maxAge: 35, label: "爬坡期", apBonus: 0 },
    { id: "weight", minAge: 36, maxAge: 45, label: "承重期", apBonus: -1 },
    { id: "twilight", minAge: 46, maxAge: 59, label: "黄昏期", apBonus: 0 },
    { id: "retire", minAge: 60, maxAge: 99, label: "退潮期", apBonus: 1 }
  ],
  endings: {
    bankruptcy: { title: "氧气耗尽", summary: "账单比人更准时。城市继续运转，下一个人已经站在你的工位前。" },
    health: { title: "身体先离场", summary: "工位空出来。体检报告上的箭头，最后比 KPI 更诚实。" },
    redline: { title: "触线", summary: "有些门打开后就关不上。档案里多一个记号，城市少一个名字。" },
    retire: { title: "退潮", summary: "你终于有时间看江。潮汐仍然准时，只是你不再赶它。" },
    elder: { title: "长夜", summary: "霓虹沉默。你在这座城市留下了足迹、账单，和几段没人读完的故事。" }
  },
  originBias: ORIGIN_BIAS,
  eraModifiers: {
    E1: { incomeMul: 0.72, volatility: 0.8, tags: ["铁饭碗", "分房"] },
    E2: { incomeMul: 0.95, volatility: 1.3, tags: ["下海", "个体"] },
    E3: { incomeMul: 1.12, volatility: 1.2, tags: ["房改", "按揭"] },
    E4: { incomeMul: 1.04, volatility: 1.1, tags: ["互联网", "创业"] },
    E5: { incomeMul: 1.06, volatility: 1.15, tags: ["移动互联", "网贷"] },
    E6: { incomeMul: 0.96, volatility: 0.95, tags: ["存量", "内卷"] },
    E7: { incomeMul: 1.0, volatility: 1.05, tags: ["灵活用工", "AI"] }
  }
};

fs.writeFileSync(OUT, JSON.stringify(pack, null, 2), "utf8");
console.log("Wrote", OUT);
console.log("ambientEvents:", pack.ambientEvents.length);
console.log("zone keys:", Object.keys(pack.zoneEvents).length);
console.log("zone events:", Object.values(pack.zoneEvents).reduce((a, b) => a + b.length, 0));
console.log("sagas:", pack.sagas.length);
console.log("origin sagas:", pack.originSagas.length);
