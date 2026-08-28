#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "../games/fucheng-life/data/gameplay-pack.json");
const ambientCore = require("./curated/ambient-core");
const ambientLayers = require("./curated/ambient-layers");
const zones = require("./curated/zones");
const sagasExtra = require("./curated/sagas-extra");

const LAYERS = ["L1", "L2", "L3", "L4", "L5"];

const ORIGIN_BIAS = {
  "humble-scholar": { layers: ["L1", "L3"], tags: ["教育", "机会"] },
  orphan: { layers: ["L1", "L5"], tags: ["风险", "机会"] },
  "wealthy-merchant": { layers: ["L4", "L5"], tags: ["金钱", "人情"] },
  "state-household": { layers: ["L2", "L3"], tags: ["职场", "人情"] },
  "factory-youth": { layers: ["L1", "L2"], tags: ["职场", "健康"] },
  "urban-white-collar": { layers: ["L2", "L3"], tags: ["职场", "金钱"] },
  "small-business": { layers: ["L2", "L4"], tags: ["机会", "金钱"] }
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
    sagaMonthlyOdds: 0.045,
    recentAmbientWindow: 18,
    minMonthsBeforeBankruptcy: 48,
    minMonthsBeforeRedline: 72
  },
  actions: ACTION_DEFS,
  ambientEvents: buildAmbientEvents(),
  zoneEvents: buildZoneEvents(),
  sagas: BASE_SAGAS.concat(sagasExtra),
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
