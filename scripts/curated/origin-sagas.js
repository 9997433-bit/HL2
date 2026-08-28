"use strict";

/** 出身 Mini-Saga — 10 种出身各一条 3–4 步短链（originId = story.json origins[].id） */
module.exports = [
  {
    id: "SAGA_O_WORKER",
    originId: "ordinary-worker",
    title: "稳妥的建议",
    steps: [
      {
        title: "一通长途",
        text: "母亲在电话里念市属单位的招考公告，念到「五险一金」时特意停顿。你说再想想。",
        d: { social: 2, health: -1 }
      },
      {
        title: "报还是不报",
        text: "报名费三十八块，备考要三个月。截止日就在下周，表格还摊在桌上。",
        choices: [
          { text: "交表报名", d: { edu: 5, money: -1, health: -4 } },
          { text: "留在现在的公司", d: { rep: 3, social: -2 } }
        ]
      },
      {
        title: "年夜饭",
        text: "亲戚隔着转盘问「稳定了没有」。父亲替你答了句「挺好的」，然后夹菜。",
        d: { social: 1, health: -2 }
      },
      {
        title: "工资卡",
        text: "工资卡里的数字不多不少，刚好够把日子过成直线。母亲没有再提招考的事。",
        d: { rep: 2, health: 2 }
      }
    ]
  },
  {
    id: "SAGA_O_MIDDLE",
    originId: "middle-class",
    title: "体面的月供",
    steps: [
      {
        title: "过户材料",
        text: "父母把学区房的过户材料摊在餐桌上，最底下压着一张没结清的还款计划。",
        d: { money: 2, debt: 1, health: -2 }
      },
      {
        title: "接不接",
        text: "「写你名字，我们帮你还前五年。」母亲说得很轻，像在怕吵醒什么，目光却落在你脸上。",
        choices: [
          { text: "接下房和月供", d: { money: 1, debt: 1, rep: 4, health: -3 } },
          { text: "婉拒，自己租着住", d: { social: -3, rep: 1, health: 2 } }
        ]
      },
      {
        title: "家庭群",
        text: "父亲的体检单被转进家庭群，配一句「小问题」。三个人在打字，谁也没发出去。",
        d: { social: 1, health: -3 }
      },
      {
        title: "记事本",
        text: "月供、体检单和家族群的沉默，都在同一张桌上。你把提醒设成每月一号，然后关掉通知。",
        d: { rep: 2, edu: 2 }
      }
    ]
  },
  {
    id: "SAGA_O_SYSTEM",
    originId: "public-system",
    title: "一句话的门路",
    steps: [
      {
        title: "包间",
        text: "父亲的老同事在包间里问你「想不想换个稳当地方」。茶续了三次，话只说了七分。",
        d: { social: 3, health: -1 }
      },
      {
        title: "分寸",
        text: "回家路上你反复想那句话的落点：是客套，还是真有位置。",
        choices: [
          { text: "自己递简历走流程", d: { rep: 3, social: 1, health: -2 } },
          { text: "客气推掉", d: { social: -2, rep: 2 } },
          { text: "让家里出面打招呼", d: { social: 4, rep: -3 } }
        ]
      },
      {
        title: "回音",
        text: "三周后对方发来一条消息：「今年名额调整了。」句号后面没有解释，你也没问。",
        d: { health: -3, social: -1 }
      },
      {
        title: "家教",
        text: "秩序是家里的日常语言。你终于学会那条家规：留三分给变数。",
        d: { rep: 3, edu: 2 }
      }
    ]
  },
  {
    id: "SAGA_O_MIGRANT",
    originId: "rural-migrant",
    title: "第一张汇款单",
    steps: [
      {
        title: "押一付三",
        text: "城中村单间，房东只收现金，不开收据。你把钱数了两遍，剩下的塞回内袋。",
        d: { money: -2, health: -2 }
      },
      {
        title: "工地还是车间",
        text: "老乡在工地干日结，堂哥说厂里招人管住。两边都要你明天就到。",
        choices: [
          { text: "跟老乡上工地", d: { money: 2, health: -6, social: 2 } },
          { text: "进厂，图个稳定", d: { money: 1, health: -3, rep: 2 } }
        ]
      },
      {
        title: "汇款",
        text: "ATM 前排了十分钟。你留三百，其余汇回去。到账短信的提示音很轻。",
        d: { money: -1, social: 4 }
      },
      {
        title: "车票",
        text: "春运票秒没。你在家族群里说「今年加班给三倍」，然后把手机扣在桌上。",
        d: { money: 1, social: -2, health: -2 }
      }
    ]
  },
  {
    id: "SAGA_O_VILLAGE",
    originId: "urban-village",
    title: "巷口的风声",
    steps: [
      {
        title: "涨租",
        text: "巷子里开始传拆迁。房东先把租金加了两百，说是「补个差价」。",
        d: { money: -1, social: 1 }
      },
      {
        title: "跟不跟",
        text: "签一年还是搬去两个地铁站外？街坊的算法各不相同。",
        choices: [
          { text: "续签，赌一把拆迁", d: { money: -2, rep: 2, health: -2 } },
          { text: "搬去更远的地方", d: { money: 1, health: -4, social: -3 } }
        ]
      },
      {
        title: "小卖部",
        text: "楼下阿姨照旧给你留两瓶冰水，顺口问一句「什么时候搬」。",
        d: { social: 3, health: 1 }
      },
      {
        title: "灯牌",
        text: "公告贴出来又被撕掉，红章只剩半个。灯牌照常亮到凌晨三点。",
        d: { rep: 1, health: -1 }
      }
    ]
  },
  {
    id: "SAGA_O_MERCHANT",
    originId: "wealthy-merchant",
    title: "父亲的担保",
    steps: [
      {
        title: "一页纸",
        text: "父亲的公司要续贷，需要一个共同担保人。纸上你的名字已经打印好，只差签字。",
        d: { health: -3, social: 1 }
      },
      {
        title: "签不签",
        text: "「就一年，走个形式。」他说这句话时没有看你。",
        choices: [
          { text: "签字", d: { money: 3, debt: 2, social: 3, health: -4 } },
          { text: "拒绝", d: { social: -5, rep: 3, money: -1 } }
        ]
      },
      {
        title: "座次",
        text: "宴席上有人敬你「小老板」，也有人只和父亲碰杯。座位表比合同更诚实。",
        d: { social: 2, rep: -1 }
      },
      {
        title: "估值",
        text: "你继承的不只是钱，还有他的债主和敌人。两者都比亲戚更准时。",
        d: { rep: 2, health: -2 }
      }
    ]
  },
  {
    id: "SAGA_O_SCHOLAR",
    originId: "humble-scholar",
    title: "最后一笔学费",
    steps: [
      {
        title: "转账附言",
        text: "家里把最后一笔钱转过来，附言四个字：安心读书。你没敢回消息。",
        d: { money: 1, social: 2, health: -2 }
      },
      {
        title: "兼职还是刷题",
        text: "家教一小时八十，考纲还有六章没看。一天只有二十四小时。",
        choices: [
          { text: "接家教补生活费", d: { money: 2, edu: -2, health: -4 } },
          { text: "闭门备考", d: { edu: 7, money: -2, health: -3 } }
        ]
      },
      {
        title: "考场",
        text: "冬天的考场没开暖气。你写完最后一题，手指僵得几乎握不住笔。",
        d: { health: -4, rep: 2 }
      },
      {
        title: "查分",
        text: "分数出来那天你先给家里打电话，报完喜，又一个人在楼道坐了很久。",
        d: { rep: 4, edu: 3, health: 2 }
      }
    ]
  },
  {
    id: "SAGA_O_ORPHAN",
    originId: "orphan",
    title: "紧急联系人",
    steps: [
      {
        title: "押一付三",
        text: "中介要押一付三，你只拿得出押一。对方说「那就月付，每月多两百」。",
        d: { money: -2, health: -2 }
      },
      {
        title: "担保人一栏",
        text: "合同最后一页留着「担保人」空格，笔尖在上面停住。",
        choices: [
          { text: "开口请同事签字", d: { social: 3, rep: -1, money: 1 } },
          { text: "自己咬牙月付", d: { money: -2, rep: 3, health: -3 } }
        ]
      },
      {
        title: "夜里三十九度",
        text: "挂号页面要求填紧急联系人。你想了几秒，填了自己的号码。",
        d: { health: -5, money: -1, social: -2 }
      },
      {
        title: "抽屉",
        text: "没有人兜底，所以每一步都算数。你洗净体温计，收回抽屉，第二天照常上班。",
        d: { rep: 3, health: 3 }
      }
    ]
  },
  {
    id: "SAGA_O_BLENDED",
    originId: "blended-family",
    title: "客厅里的座位",
    steps: [
      {
        title: "全家福",
        text: "继父在家庭群发了张全家福。你在照片边缘，只露出半张脸。",
        d: { social: 1, health: -2 }
      },
      {
        title: "回不回",
        text: "群里连着三个红包和一句「都回个话」。你盯着输入框。",
        choices: [
          { text: "回一句「挺好的」", d: { social: 3, health: -1 } },
          { text: "装作没看见", d: { social: -2, rep: 1, health: -2 } }
        ]
      },
      {
        title: "私聊",
        text: "同母异父的弟弟单独发来消息：学费差三千，别跟妈说。",
        choices: [
          { text: "先转过去", d: { money: -1, social: 3 } },
          { text: "让他自己开口", d: { social: -2, rep: 2 } }
        ]
      },
      {
        title: "备用钥匙",
        text: "家是安全的，只是要先看客厅里坐着谁。你留着自己那把钥匙。",
        d: { rep: 2, health: 1 }
      }
    ]
  },
  {
    id: "SAGA_O_TRANSNATIONAL",
    originId: "transnational",
    title: "两个时钟",
    steps: [
      {
        title: "凌晨三点",
        text: "父母在另一个时区问你「什么时候回来」。你算了算，那边正是凌晨三点。",
        d: { social: 2, health: -2 }
      },
      {
        title: "身份栏",
        text: "落户材料的「常住地」一栏空着。填哪个地址，都要放弃点什么。",
        choices: [
          { text: "留下来排队落户", d: { rep: 3, money: -1, health: -2 } },
          { text: "两边的门都留着", d: { social: 2, edu: 2, rep: -2 } }
        ]
      },
      {
        title: "口音",
        text: "会上你换了三次语言。散会后有人真诚地夸你：「中文说得真好。」",
        d: { social: 1, rep: -1, edu: 2 }
      },
      {
        title: "时差",
        text: "哪边都能落脚，哪边都不算到家。你把两个时钟都留在手机首页。",
        d: { edu: 2, health: 1 }
      }
    ]
  }
];
