#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "../games/fucheng-life/data/gameplay-pack.json");

const LAYERS = ["L1", "L2", "L3", "L4", "L5"];
const ERAS = ["E1", "E2", "E3", "E4", "E5", "E6", "E7"];
const CATEGORIES = ["职场", "金钱", "人情", "机会", "风险", "健康", "居住", "教育"];
const ORIGIN_BIAS = {
  "humble-scholar": { layers: ["L1", "L3"], tags: ["教育", "机会"] },
  "orphan": { layers: ["L1", "L5"], tags: ["风险", "机会"] },
  "wealthy-merchant": { layers: ["L4", "L5"], tags: ["金钱", "人情"] },
  "state-household": { layers: ["L2", "L3"], tags: ["职场", "人情"] }
};

const ACTION_DEFS = [
  { id: "work", name: "上班", icon: "⌁", ap: 1, d: { money: 1, health: -3, rep: 2 }, text: "打卡、开会、改一版。城市按小时计费。" },
  { id: "overtime", name: "加班", icon: "◐", ap: 1, d: { money: 2, health: -6, rep: 4 }, text: "灯亮到深夜。绩效表上多一格，体检报告多一个箭头。" },
  { id: "study", name: "进修", icon: "✎", ap: 1, d: { money: -1, rep: 5, health: -2 }, edu: 8, text: "证书班的座位永远靠窗。学费是另一种房租。" },
  { id: "network", name: "饭局", icon: "◎", ap: 1, d: { money: -1, social: 8, rep: 2 }, text: "桌上没人递名片——都认识彼此，只有你需要介绍。" },
  { id: "side", name: "副业", icon: "⚡", ap: 1, d: { money: 2, health: -4, rep: 1 }, text: "深夜私活尾款到账。屏幕亮一下，又暗下去。" },
  { id: "rest", name: "休息", icon: "☾", ap: 1, d: { health: 8, money: -1 }, text: "什么都没发生。这也很贵。" },
  { id: "explore", name: "探区", icon: "⌖", ap: 1, zone: true, text: "你在地图上选一处，城市会回你一句报价。" },
  { id: "invest", name: "理财", icon: "¥", ap: 2, d: { money: 3, rep: -2 }, minLayer: 3, text: "数字在 App 里跳动。涨跌都不问你的睡眠。" }
];

const ZONE_KEYS = {
  L1: ["village", "market", "delivery", "nightfood", "labor"],
  L2: ["office", "rent", "metro", "mall", "bank"],
  L3: ["school", "exam", "jobfair", "nightclass", "incubator"],
  L4: ["club", "mansion", "fund", "auction"],
  L5: ["loan", "broker", "alley", "factory"]
};

const ZONE_NAMES = {
  village: "城中村", market: "早市", delivery: "外卖站", nightfood: "大排档", labor: "劳务市场",
  office: "写字楼", rent: "合租房", metro: "地铁", mall: "商圈", bank: "银行",
  school: "重点中学", exam: "考场", jobfair: "校招", nightclass: "夜校", incubator: "孵化器",
  club: "CBD会所", mansion: "江景豪宅", fund: "私募", auction: "拍卖行",
  loan: "地下钱庄", broker: "灰色中介", alley: "夜场后巷", factory: "废弃厂区"
};

const EVENT_TEMPLATES = [
  { cat: "职场", texts: [
    "季度 KPI 出榜，你在中段。主管说「再顶一顶」，没说顶到哪。",
    "工位旁的空椅换过三个人。HR 说「组织优化」，不说优化谁。",
    "项目上线前夜，群消息比心跳还密。",
    "年终奖系数公布。有人微笑，有人去楼梯间。"
  ], d: { rep: 3, health: -3 } },
  { cat: "金钱", texts: [
    "房东在群里发续租通知，涨 300。他加了个笑脸。",
    "信用卡分期提醒：本月最低还款已扣。",
    "工资到账，三秒后分散给五张账单。",
    "便利店关东煮买一送一。这是本周最顺的十分钟。"
  ], d: { money: -1 } },
  { cat: "人情", texts: [
    "老同学婚宴，红包 800。人情账本上你这一栏终于不欠着。",
    "同事请你帮忙背锅。拒绝需要勇气，答应需要更久。",
    "老乡开口借钱，说三个月就还。你答应了，没写借条。",
    "饭局散后没人提菜单价格。昂贵部分记进彼此账本。"
  ], d: { social: 5, money: -1 } },
  { cat: "机会", texts: [
    "猎头私信：涨 18%，代价是每周飞一次。",
    "校招大厅发蓝色手环。有人凭它进终面，有人留作证明。",
    "孵化器免费工位，有偿梦想。隔壁团队上月还在，这月是新的。",
    "拍卖行落槌很轻。买下的是一次被看见的机会。"
  ], d: { rep: 4, money: 1 } },
  { cat: "风险", texts: [
    "熟人介绍「稳赚」周转，年化写在纸巾上。红线在灯下若隐若现。",
    "地下钱庄利息按天算。没有合同，只有名字。",
    "灰色中介报价随需求浮动。他从不问你为什么。",
    "夜场后巷的人情不记账，记仇。"
  ], d: { money: 3, rep: -6 } },
  { cat: "健康", texts: [
    "体检报告两个箭头向上。医生说少熬夜，你打开了电脑。",
    "地铁延误十一分钟。车厢里没人说话。",
    "连续加班后你在工位上失去意识。醒来天花板是白的。",
    "外卖吃腻了，胃记住了每一家的包装颜色。"
  ], d: { health: -5 } },
  { cat: "居住", texts: [
    "合租室友搬走，押金退得很干净。空房间比预想大。",
    "水表之后，群里算出各自该付的小数。",
    "城中村握手楼之间只有一线天。灯牌亮到凌晨三点。",
    "物业费比很多人的房租还高。美景不计入绩效。"
  ], d: { money: -1, health: 2 } },
  { cat: "教育", texts: [
    "雨落在答题卡之外。两小时后有人得到上行通道。",
    "夜校教室的灯到十一点才熄。走廊排名榜每月更新。",
    "证书到手。简历多一行，睡眠少一截。",
    "考场外的家长比考生更安静。"
  ], d: { rep: 5, money: -1 } }
];

const SAGAS = [
  {
    id: "SAGA_METRO",
    title: "迟到链",
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
    steps: [
      { title: "私活邀约", text: "朋友介绍一份周末外包。报价不高，但够交两月房租。", d: { money: 1 } },
      { title: "时间冲突", text: "主业项目也要加班。你只能选一边。", choices: [
        { text: "保主业", d: { rep: 4, money: -1 } },
        { text: "接私活", d: { money: 3, health: -5, rep: -2 } }
      ]},
      { title: "尾款", text: "甲方拖款三周。你在群里催了两次，对方已读不回。", d: { social: -2, health: -3 } },
      { title: "收束", text: "钱到了。你学会把合同写清楚——下次。", d: { rep: 2, money: 1 } }
    ]
  },
  {
    id: "SAGA_FAMILY",
    title: "家链",
    steps: [
      { title: "来电", text: "家里说需要一笔钱。数额不大，但语气很急。", d: { social: -1 } },
      { title: "抉择", text: "你看着余额，又看日历上的还款日。", choices: [
        { text: "立刻转", d: { money: -2, social: 6 } },
        { text: "分期帮", d: { money: -1, social: 3, rep: 1 } },
        { text: "这次不行", d: { social: -4, health: -2 } }
      ]},
      { title: "回音", text: "电话那头沉默了几秒。城市噪音填满了空白。", d: { health: -2 } },
      { title: "余波", text: "亲情没有 KPI，但有利息—— emotional 的那种。", d: { social: 1 } }
    ]
  }
];

function buildEvents() {
  const events = [];
  let n = 0;
  for (const layer of LAYERS) {
    for (const tmpl of EVENT_TEMPLATES) {
      tmpl.texts.forEach((text, ti) => {
        n++;
        events.push({
          id: "GP" + String(n).padStart(3, "0"),
          title: tmpl.cat + " · " + layer,
          layerId: layer,
          category: tmpl.cat,
          text: text,
          weight: tmpl.cat === "风险" ? 2 : 6,
          eraAny: true,
          d: tmpl.d,
          variant: ti
        });
      });
    }
  }
  return events;
}

function buildZoneEvents() {
  const out = {};
  for (const layer of LAYERS) {
    const keys = ZONE_KEYS[layer] || [];
    keys.forEach((key) => {
      out[key] = [
        {
          id: "Z_" + key + "_1",
          title: ZONE_NAMES[key] + " · 见闻",
          text: "你在" + ZONE_NAMES[key] + "站了一会儿。城市照常运转。",
          category: layer === "L5" ? "风险" : "机会",
          layerId: layer,
          weight: 5,
          d: layer === "L5" ? { money: 2, rep: -3 } : { social: 3, money: -1 }
        },
        {
          id: "Z_" + key + "_2",
          title: ZONE_NAMES[key] + " · 代价",
          text: ZONE_NAMES[key] + "有自己的价格表。你今天付了一页。",
          category: "金钱",
          layerId: layer,
          weight: 3,
          d: { money: -1, rep: 2, health: layer === "L1" ? -2 : 0 }
        }
      ];
    });
  }
  return out;
}

const CAREER_TRACKS = [
  { id: "staff", name: "职员线", levels: ["实习生", "专员", "主管", "总监", "副总裁"] },
  { id: "tech", name: "技术线", levels: ["码农", "工程师", "架构师", "专家", "首席"] },
  { id: "sales", name: "业务线", levels: ["跟单", "销售", "大客户经理", "区域负责人", "合伙人"] },
  { id: "gig", name: "零工线", levels: ["日结", "骑手", "个体户", "小老板", "连锁"] }
];

const pack = {
  version: 1,
  actions: ACTION_DEFS,
  ambientEvents: buildEvents(),
  zoneEvents: buildZoneEvents(),
  sagas: SAGAS,
  careerTracks: CAREER_TRACKS,
  lifeStages: [
    { id: "arrival", minAge: 22, maxAge: 27, label: "入城期", apBonus: 0 },
    { id: "climb", minAge: 28, maxAge: 35, label: "爬坡期", apBonus: 0 },
    { id: "weight", minAge: 36, maxAge: 45, label: "承重期", apBonus: -1 },
    { id: "twilight", minAge: 46, maxAge: 59, label: "黄昏期", apBonus: 0 },
    { id: "retire", minAge: 60, maxAge: 99, label: "退潮期", apBonus: 1 }
  ],
  endings: {
    bankruptcy: { title: "氧气耗尽", summary: "账单比人更准时。城市继续运转。" },
    health: { title: "身体先离场", summary: "工位空出来，下一个人已经排队。" },
    redline: { title: "触线", summary: "有些门打开后就关不上。档案里多一个记号。" },
    retire: { title: "退潮", summary: "你终于有时间看江。潮汐仍然准时。" },
    elder: { title: "长夜", summary: "霓虹沉默。你在这座城市留下了足迹与账单。" }
  },
  originBias: ORIGIN_BIAS,
  eraModifiers: {
    E1: { incomeMul: 0.72, volatility: 0.8, tags: ["铁饭碗", "分房"] },
    E2: { incomeMul: 0.95, volatility: 1.3, tags: ["下海", "个体"] },
    E3: { incomeMul: 1.15, volatility: 1.2, tags: ["房改", "按揭"] },
    E4: { incomeMul: 1.05, volatility: 1.1, tags: ["互联网", "创业"] },
    E5: { incomeMul: 1.08, volatility: 1.15, tags: ["移动互联", "网贷"] },
    E6: { incomeMul: 0.98, volatility: 0.95, tags: ["存量", "内卷"] },
    E7: { incomeMul: 1.0, volatility: 1.05, tags: ["灵活用工", "AI"] }
  }
};

fs.writeFileSync(OUT, JSON.stringify(pack, null, 2), "utf8");
console.log("Wrote", OUT);
console.log("ambientEvents:", pack.ambientEvents.length);
console.log("zone keys:", Object.keys(pack.zoneEvents).length);
