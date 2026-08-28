/* 浮城人生 · screens.js
   Shared data + tiny save-state helpers for the core game screens.
   No build step, no dependencies — plain ES5-ish so it runs off file:// too. */
(function (global) {
  "use strict";

  var SAVE_KEY = "fucheng.save.v1";

  /* ---------------------------------------------------------------- eras */
  var ERAS = [
    {
      id: "E1",
      name: "单位时代",
      years: "1978 — 1988",
      glyph: "章",
      tint: "#c9a227",
      desc: "钟声、食堂、分房名单。人生由单位安排，稳定是最贵的资产，也是最紧的绳。",
      line: "那时候没人问你想做什么，只问你在哪个单位。",
      tags: ["铁饭碗", "粮票", "分房", "集体"],
      stats: { opportunity: 28, threshold: 40, volatility: 18 },
      start: { layer: 2, money: "¥ 420", note: "工资按月，分毫不差" }
    },
    {
      id: "E2",
      name: "下海时代",
      years: "1988 — 1996",
      glyph: "潮",
      tint: "#ff8b4a",
      desc: "南方来的风吹开了办公室的窗。有人辞职，有人观望，第一批个体户在街口支起摊子。",
      line: "他把辞职报告压在茶杯下，走了三条街才敢回头。",
      tags: ["个体户", "南下", "倒爷", "第一桶金"],
      stats: { opportunity: 72, threshold: 30, volatility: 68 },
      start: { layer: 1, money: "¥ 1,800", note: "本钱是借的，胆子是自己的" }
    },
    {
      id: "E3",
      name: "地产时代",
      years: "1996 — 2003",
      glyph: "楼",
      tint: "#ff5f7e",
      desc: "房改把家变成资产。塔吊长在天际线上，拆迁红线画过老巷，第一批业主学会了看均价。",
      line: "城市开始长高，人开始被价格分层。",
      tags: ["房改", "拆迁", "按揭", "均价"],
      stats: { opportunity: 78, threshold: 46, volatility: 62 },
      start: { layer: 2, money: "¥ 9,600", note: "首付永远差一点" }
    },
    {
      id: "E4",
      name: "互联网时代",
      years: "2003 — 2010",
      glyph: "网",
      tint: "#35e0ff",
      desc: "网吧的烟味、门户的滚动新闻、深夜的拨号声。世界第一次比城市更大。",
      line: "屏幕是唯一不收房租的房间。",
      tags: ["网吧", "门户", "第一批网民", "创业潮"],
      stats: { opportunity: 74, threshold: 52, volatility: 58 },
      start: { layer: 3, money: "¥ 14,200", note: "学历开始明码标价" }
    },
    {
      id: "E5",
      name: "移动互联时代",
      years: "2010 — 2016",
      glyph: "流",
      tint: "#a56bff",
      desc: "补贴烧进每个人的口袋，外卖箱和共享单车铺满街道。机会很多，睡眠很少。",
      line: "所有东西都能送到家，除了明天。",
      tags: ["智能机", "补贴", "外卖", "融资"],
      stats: { opportunity: 86, threshold: 58, volatility: 72 },
      start: { layer: 3, money: "¥ 26,000", note: "花钱的速度第一次超过挣钱" }
    },
    {
      id: "E6",
      name: "存量时代",
      years: "2016 — 2020",
      glyph: "卷",
      tint: "#7fa8d4",
      desc: "增量退潮，位置固定。加班变成默认值，杠杆开始收紧，教培的灯亮到最后一刻。",
      line: "跑得快没有用，得比旁边那个人快。",
      tags: ["内卷", "去杠杆", "教培", "KPI"],
      stats: { opportunity: 52, threshold: 74, volatility: 56 },
      start: { layer: 3, money: "¥ 41,500", note: "账单准时，涨薪不准时" }
    },
    {
      id: "E7",
      name: "当前时代",
      years: "2020 — 至今",
      glyph: "浮",
      tint: "#ffb547",
      desc: "降本增效写进邮件标题，AI 替人加班，慢就业成为体面的说法。城市照常运转，只是不再等人。",
      line: "没钱的人没有秘密。账单就是他们的隐私。",
      tags: ["降本增效", "AI", "慢就业", "副业"],
      stats: { opportunity: 58, threshold: 82, volatility: 80 },
      start: { layer: 2, money: "¥ 33,000", note: "存款是唯一的安全带" }
    }
  ];

  /* ------------------------------------------------------------- origins */
  var ORIGINS = [
    {
      id: "O01",
      name: "普通工薪",
      en: "SALARIED",
      glyph: "薪",
      layer: 2,
      desc: "父母在两个不同的工厂上班，家里有一套还完贷的老房子。没有余粮，也没有窟窿。",
      line: "不缺一顿饭，也不多一条路。",
      tags: ["稳定", "无背景", "有房无贷"],
      mods: { money: 42, health: 66, social: 40, edu: 52 },
      start: "¥ 12,000"
    },
    {
      id: "O02",
      name: "中产",
      en: "MIDDLE CLASS",
      glyph: "中",
      layer: 3,
      desc: "学区房、补习班、一年一次的短途旅行。体面像一层玻璃，看得见，也碎得掉。",
      line: "他们供得起你的体面，供不起你的失败。",
      tags: ["学区房", "补习", "高期待"],
      mods: { money: 66, health: 70, social: 56, edu: 78 },
      start: "¥ 68,000"
    },
    {
      id: "O03",
      name: "体制内",
      en: "IN THE SYSTEM",
      glyph: "编",
      layer: 3,
      desc: "父辈端着铁饭碗，家里的电话总在饭点响。规则你从小就懂，越界的代价你也懂。",
      line: "关系是家学，分寸是家教。",
      tags: ["人脉", "规则熟", "风险敏感"],
      mods: { money: 54, health: 72, social: 82, edu: 70 },
      start: "¥ 38,000"
    },
    {
      id: "O04",
      name: "农村进城",
      en: "RURAL MIGRANT",
      glyph: "迁",
      layer: 1,
      desc: "行李是编织袋，地址是老乡给的。城市对你只有两个字：招工。",
      line: "回不去的村，进不去的城。",
      tags: ["能吃苦", "无根", "汇款压力"],
      mods: { money: 18, health: 84, social: 26, edu: 30 },
      start: "¥ 2,300"
    },
    {
      id: "O05",
      name: "城中村",
      en: "URBAN VILLAGE",
      glyph: "巷",
      layer: 1,
      desc: "握手楼之间只有一线天，楼下是灯牌和油烟。你比谁都熟这座城，也比谁都难离开这条巷。",
      line: "灯牌亮到凌晨三点，租金涨到你搬走为止。",
      tags: ["地头熟", "杂讯多", "低成本"],
      mods: { money: 30, health: 62, social: 64, edu: 34 },
      start: "¥ 6,400"
    },
    {
      id: "O06",
      name: "富商",
      en: "MERCHANT WEALTH",
      glyph: "金",
      layer: 4,
      desc: "家里的生意比你年纪大。资源随手可得，代价是你的人生早被写进别人的规划书。",
      line: "你继承的不只是钱，还有他的债主和敌人。",
      tags: ["资本", "人脉", "被安排"],
      mods: { money: 96, health: 64, social: 88, edu: 62 },
      start: "¥ 1,240,000"
    },
    {
      id: "O07",
      name: "寒门",
      en: "POOR SCHOLAR",
      glyph: "寒",
      layer: 1,
      desc: "全家的希望压在一张成绩单上。你唯一能兑换的东西，是自己的时间和身体。",
      line: "他们把最后一点钱换成你的书本，然后等。",
      tags: ["高韧性", "唯一通道", "无退路"],
      mods: { money: 10, health: 58, social: 18, edu: 86 },
      start: "¥ 900"
    },
    {
      id: "O08",
      name: "重组家庭",
      en: "BLENDED FAMILY",
      glyph: "缝",
      layer: 2,
      desc: "两个姓氏共用一张餐桌。你学会了察言观色，也学会了不把话说满。",
      line: "家是安全的，只是要先看谁在客厅。",
      tags: ["察言观色", "关系复杂", "早熟"],
      mods: { money: 44, health: 60, social: 58, edu: 50 },
      start: "¥ 15,600"
    },
    {
      id: "O09",
      name: "孤儿",
      en: "ORPHAN",
      glyph: "孑",
      layer: 1,
      desc: "档案很薄，签名栏永远空着一格。没有人替你兜底，也没有人替你决定。",
      line: "自由是真的，冷也是真的。",
      tags: ["完全自由", "零兜底", "高风险"],
      mods: { money: 8, health: 54, social: 12, edu: 44 },
      start: "¥ 300"
    },
    {
      id: "O10",
      name: "跨国家庭",
      en: "TRANSNATIONAL",
      glyph: "渡",
      layer: 4,
      desc: "护照上有两枚章，父母在两个时区里争论你的未来。视野辽阔，归属含糊。",
      line: "哪边都能落脚，哪边都不算到家。",
      tags: ["视野", "语言", "身份模糊"],
      mods: { money: 74, health: 68, social: 52, edu: 88 },
      start: "¥ 320,000"
    }
  ];

  var LAYERS = [
    { id: "L1", name: "市井层", key: "l1" },
    { id: "L2", name: "工薪层", key: "l2" },
    { id: "L3", name: "上升通道", key: "l3" },
    { id: "L4", name: "资本名利", key: "l4" },
    { id: "L5", name: "暗流", key: "l5" }
  ];

  /* --------------------------------------------------------------- state */
  function read() {
    try {
      return JSON.parse(global.localStorage.getItem(SAVE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function write(patch) {
    var next = read();
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) next[k] = patch[k];
    }
    try {
      global.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch (e) {
      /* private mode / file:// — the screens still work, just without memory */
    }
    return next;
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  global.FC = {
    ERAS: ERAS,
    ORIGINS: ORIGINS,
    LAYERS: LAYERS,
    read: read,
    write: write,
    era: function () {
      return byId(ERAS, read().eraId) || ERAS[6];
    },
    origin: function () {
      return byId(ORIGINS, read().originId) || ORIGINS[0];
    },
    esc: function (s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    }
  };
})(window);
