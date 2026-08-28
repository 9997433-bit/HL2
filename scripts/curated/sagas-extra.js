"use strict";

/** 额外链式 Saga — 每条 5-6 步，跨月推进 */
module.exports = [
  {
    id: "SAGA_LAYOFF",
    title: "裁员链",
    minMonths: 24,
    steps: [
      { title: "风声", text: "HR 约谈话，邮件标题写「一对一」。办公室开始猜名单。", d: { health: -3, rep: -1 } },
      { title: "谈话", text: "补偿 N+1，签字截止周五。你问能不能内部转岗，答「名额很少」。", choices: [
        { text: "接受补偿", d: { money: 3, rep: -2, gap: 2 } },
        { text: "争取转岗", d: { rep: 2, health: -4, social: -1 } }
      ]},
      { title: "空窗", text: "离职证明在手，简历改第三版。招聘软件已读不回。", d: { health: -4, money: -2 } },
      { title: "面试", text: "一面通过，二面问「为什么离开上家」。你答「组织优化」。", d: { rep: 2, health: -2 } },
      { title: "入职", text: "新工位更小，薪资平移。你学会不再提「以前」。", d: { rep: 3, money: 1 } },
      { title: "余波", text: "前同事群静音。城市不大，圈子更小。", d: { social: -2, health: 2 } }
    ]
  },
  {
    id: "SAGA_PARENT",
    title: "父母链",
    minMonths: 36,
    minAge: 28,
    steps: [
      { title: "电话", text: "母亲声音颤：「你爸体检有问题。」你订了最近的高铁。", d: { social: -1, health: -3 } },
      { title: "返乡", text: "县城医院走廊，消毒水味。专家说「去省城进一步查」。", choices: [
        { text: "立刻转院", d: { money: -3, social: 4, health: -2 } },
        { text: "先观察", d: { money: -1, social: -2, health: -3 } }
      ]},
      { title: "陪护", text: "请假一周，主管说「项目正紧」。你在医院走廊改方案。", d: { rep: -2, health: -4, social: 3 } },
      { title: "费用", text: "医保报销后，自付仍像一座小山。你刷信用卡，分期。", d: { money: -2, debt: 1 } },
      { title: "康复", text: "父亲出院，瘦一圈。他说「没事」，你知有事。", d: { social: 4, health: -1 } },
      { title: "远程", text: "你安装摄像头，教他们视频通话。距离仍在，稍软。", d: { social: 3, edu: 2 } }
    ]
  },
  {
    id: "SAGA_LOVE",
    title: "婚恋链",
    minMonths: 18,
    steps: [
      { title: "介绍", text: "同事说「有个朋友想认识」。你加了微信，头像风景照。", d: { social: 2 } },
      { title: "约会", text: "吃饭聊房子、聊工作、聊未来。账单 AA，你提议，对方同意。", choices: [
        { text: "继续了解", d: { social: 4, money: -1, health: -1 } },
        { text: "慢慢疏远", d: { social: -2, rep: 1 } }
      ]},
      { title: "见家长", text: "对方父母问「有房吗」。你答「在攒」。空气静三秒。", d: { rep: -2, social: 1, health: -3 } },
      { title: "礼金", text: "订婚讨论彩礼，数字在两家之间来回。你像谈判代表。", d: { money: -3, social: 3 } },
      { title: "婚礼", text: "婚礼像项目，表格排宾客。你微笑敬酒，腿酸。", d: { money: -4, social: 5, health: -4 } },
      { title: "日常", text: "蜜月结束，外卖和洗碗开始分工。生活回到账单。", d: { social: 2, health: 1 } }
    ]
  },
  {
    id: "SAGA_SCAM",
    title: "诈骗链",
    minMonths: 12,
    steps: [
      { title: "来电", text: "「公检法」来电，报出你身份证号。你手抖，仍问「什么事」。", d: { health: -4 } },
      { title: "转账", text: "对方要求「验资」，限时两小时。你走到 ATM，停住。", choices: [
        { text: "挂断报警", d: { rep: 3, health: 2 } },
        { text: "试探转账小额", d: { money: -2, rep: -2, health: -3 } }
      ]},
      { title: "余悸", text: "警察做反诈宣传，你领传单。同事笑，你笑不出。", d: { health: -2, edu: 3 } },
      { title: "扩散", text: "家族群转发反诈 App，长辈仍点链接。你耐心教。", d: { social: 2, health: -1 } },
      { title: "收尾", text: "账户无损失。你改密码，像劫后余生。", d: { rep: 1, health: 3 } }
    ]
  },
  {
    id: "SAGA_STARTUP",
    title: "创业链",
    minMonths: 30,
    steps: [
      { title: "想法", text: "深夜和白纸，商业模式画三遍。你看见自己的兴奋。", d: { edu: 3, health: -2 } },
      { title: "合伙", text: "老同学愿意全职，你要留职场的薪。股权怎么分？", choices: [
        { text: "六四开", d: { rep: 2, social: 2, money: -1 } },
        { text: "再观望", d: { rep: -1, edu: 2 } }
      ]},
      { title: "注册", text: "公司名查重三次，经营范围改五版。公章刻了，账仍乱。", d: { money: -2, edu: 2 } },
      { title: "融资", text: "见三个投资人，两个要数据，一个要控制权。你学 term sheet。", d: { edu: 4, health: -3 } },
      { title: "产品", text: "上线第一周，十个用户，五个是亲友。你仍更新版本。", d: { rep: 3, health: -4 } },
      { title: "抉择", text: "账上够撑六月。继续还是回职场？你第一次真正「All in」。", choices: [
        { text: "继续", d: { money: -2, rep: 4, health: -5 } },
        { text: "收缩", d: { rep: 1, money: 1, social: -2 } }
      ]}
    ]
  },
  {
    id: "SAGA_EXAM",
    title: "大考链",
    minMonths: 6,
    maxAge: 35,
    steps: [
      { title: "报名", text: "考证报名最后一天，你加班到十点才填表。照片上传失败两次。", d: { health: -2, money: -1 } },
      { title: "备考", text: "三个月，地铁上看题。朋友约饭，你推了七次。", d: { edu: 6, social: -3, health: -4 } },
      { title: "考场", text: "空调太冷，选择题涂卡手僵。交卷铃响，空两题。", d: { health: -3, rep: 1 } },
      { title: "等分", text: "查分页面转圈。过线一分。你拍桌，又笑。", d: { rep: 4, edu: 4, health: 3 } },
      { title: "挂靠？", text: "中介问要不要挂靠，「一年几万」。你拒，怕毁证。", d: { rep: 2, edu: 2 } }
    ]
  },
  {
    id: "SAGA_RENT",
    title: "租房链",
    minMonths: 3,
    steps: [
      { title: "找房", text: "中介带看五套，照片比真景亮。你算通勤，算阳光，算价格。", d: { health: -3, money: -1 } },
      { title: "签约", text: "押一付三，合同小字「维修自理」。你签字，像签一年租约。", d: { money: -2, rep: 1 } },
      { title: "入住", text: "第一晚发现蟑螂。你下单药，等待。", choices: [
        { text: "自己消杀", d: { money: -1, health: -2 } },
        { text: "要求房东", d: { social: -1, rep: 1, health: 1 } }
      ]},
      { title: "邻居", text: "邻居装修，电钻周末不停。你投诉，物业和稀泥。", d: { health: -4 } },
      { title: "续租", text: "到期涨租 8%。你比价，仍续——搬家太累。", d: { money: -2, health: -2 } }
    ]
  }
];
