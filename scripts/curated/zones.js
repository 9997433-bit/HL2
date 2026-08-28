"use strict";

/** 23 个探区地点 · 每区 5 条手写事件 */
module.exports = {
  village: [
    { id: "Z_village_1", title: "城中村 · 晨间", text: "握手楼缝隙里，早餐摊蒸汽升起。油条两块，豆浆一块五。你吃完，一天才算开始。", category: "居住", d: { money: -1, health: 2 } },
    { id: "Z_village_2", title: "城中村 · 房东", text: "房东上门收租，顺手检查电表。他说「本月跳得快」，你解释是夏天。", category: "金钱", d: { money: -1, social: -1 } },
    { id: "Z_village_3", title: "城中村 · 招工", text: "墙贴「急招」浆糊还湿。你记了电话，没打——上次是传销。", category: "机会", d: { edu: 2 } },
    { id: "Z_village_4", title: "城中村 · 夜归", text: "十一点巷口仍亮。外卖箱堆在消防栓旁，你侧身过。", category: "健康", d: { health: -2, rep: 1 } },
    { id: "Z_village_5", title: "城中村 · 搬迁", text: "墙上红字「拆」。邻居开始比补偿，你数窗户，像数筹码。", category: "机会", d: { money: 2, social: -2 } }
  ],
  market: [
    { id: "Z_market_1", title: "早市 · 讲价", text: "菜贩说「都是实价」。你转一圈，回来贵了两毛。", category: "金钱", d: { money: -1 } },
    { id: "Z_market_2", title: "早市 · 见闻", text: "老人带孙子买鱼，摊主多送葱。你想起远方父母。", category: "人情", d: { social: 2, health: -1 } },
    { id: "Z_market_3", title: "早市 · 兼职", text: "搬运工缺人，日结一百二。你干半天，腰告诉你不值。", category: "职场", d: { money: 1, health: -4 } },
    { id: "Z_market_4", title: "早市 · 假货", text: "土鸡蛋比超市便宜一半。回去煮，黄像颜料。", category: "风险", d: { money: -1, health: -2 } },
    { id: "Z_market_5", title: "早市 · 熟脸", text: "摊主认出你，多给一把青菜。城市少数记得你名字的地方。", category: "人情", d: { social: 3, health: 1 } }
  ],
  delivery: [
    { id: "Z_delivery_1", title: "外卖站 · 早会", text: "站长强调「超时一秒扣两块」。大家点头，没人问保险。", category: "职场", d: { rep: 1, health: -2 } },
    { id: "Z_delivery_2", title: "外卖站 · 爆单", text: "雨天单量翻倍，电梯又坏。你爬楼，顾客说「怎么晚了」。", category: "健康", d: { health: -4, money: 1 } },
    { id: "Z_delivery_3", title: "外卖站 · 事故", text: "路口擦碰，对方要私了。你赶时间，赔了三百。", category: "金钱", d: { money: -2, health: -2 } },
    { id: "Z_delivery_4", title: "外卖站 · 好评", text: "顾客备注「放门口别敲门」。你照做，收到五星和小费。", category: "机会", d: { money: 1, rep: 2 } },
    { id: "Z_delivery_5", title: "外卖站 · 排行", text: "站点排行榜贴墙。你在中段，名字小，仍被看见。", category: "职场", d: { rep: 2, health: -3 } }
  ],
  nightfood: [
    { id: "Z_nightfood_1", title: "大排档 · 加班", text: "同事请客，烤串和啤酒。你聊到凌晨，明天仍要打卡。", category: "人情", d: { social: 3, health: -4 } },
    { id: "Z_nightfood_2", title: "大排档 · 冲突", text: "邻桌划拳声大，你戴耳机。城市夜晚很少真正安静。", category: "健康", d: { health: -2 } },
    { id: "Z_nightfood_3", title: "大排档 · 情报", text: "听老板聊商铺转让，租金降了。你记在心里。", category: "机会", d: { edu: 2, money: -1 } },
    { id: "Z_nightfood_4", title: "大排档 · 肠胃", text: "便宜海鲜，第二天你请病假。老板不信，要证明。", category: "健康", d: { health: -5, rep: -1 } },
    { id: "Z_nightfood_5", title: "大排档 · 独行", text: "一个人吃面，老板多给半份。你谢了，没多说。", category: "人情", d: { social: 1, health: 1 } }
  ],
  labor: [
    { id: "Z_labor_1", title: "劳务市场 · 蹲活", text: "太阳晒，工头挑人看指甲。你剪短了，仍没被选。", category: "职场", d: { health: -3, rep: -1 } },
    { id: "Z_labor_2", title: "劳务市场 · 日结", text: "搬货一天，手破皮。钱现结，没有合同。", category: "金钱", d: { money: 1, health: -4 } },
    { id: "Z_labor_3", title: "劳务市场 · 骗局", text: "「先交押金跟车」。你看见有人交钱，选择走开。", category: "风险", d: { rep: 2 } },
    { id: "Z_labor_4", title: "劳务市场 · 老乡", text: "同乡介绍去工厂，包吃住。你去了，发现是流水线。", category: "机会", d: { rep: 1, health: -3 } },
    { id: "Z_labor_5", title: "劳务市场 · 技能", text: "电工证培训班发传单。你问价，决定再攒俩月。", category: "教育", d: { edu: 3 } }
  ],
  office: [
    { id: "Z_office_1", title: "写字楼 · 门禁", text: "早高峰闸机排队，你卡迟到边缘。打卡成功，汗已出。", category: "职场", d: { rep: 1, health: -2 } },
    { id: "Z_office_2", title: "写字楼 · 咖啡", text: "楼下咖啡三十一杯。你自带速溶，在工位冲。", category: "金钱", d: { money: 1, health: -1 } },
    { id: "Z_office_3", title: "写字楼 · 消防", text: "消防演练，整楼疏散。你在楼梯间遇见 CEO，点头。", category: "机会", d: { rep: 2, social: 1 } },
    { id: "Z_office_4", title: "写字楼 · 加班", text: "深夜办公室仍亮三分之一。保洁阿姨问你「还不走」。", category: "职场", d: { health: -4, rep: 2 } },
    { id: "Z_office_5", title: "写字楼 · 裁员", text: "隔壁公司搬空，纸箱堆走廊。你加快脚步。", category: "健康", d: { health: -3, edu: 2 } }
  ],
  rent: [
    { id: "Z_rent_1", title: "合租房 · 公约", text: "室友不洗碗，群里 @ 三次。你最后洗了，生闷气。", category: "居住", d: { health: -2, social: -1 } },
    { id: "Z_rent_2", title: "合租房 · 涨租", text: "房东通知涨两百，「周边都这价」。你比价，属实。", category: "金钱", d: { money: -2 } },
    { id: "Z_rent_3", title: "合租房 · 介绍", text: "同事求租，你介绍空房。室友变同事，边界模糊。", category: "人情", d: { social: 2, rep: 1 } },
    { id: "Z_rent_4", title: "合租房 · 维修", text: "洗衣机坏，房东拖两周。你手洗，像回到大学。", category: "健康", d: { health: -3, money: -1 } },
    { id: "Z_rent_5", title: "合租房 · 搬离", text: "室友搬走，押金扯皮。你作证，少一个朋友。", category: "人情", d: { social: -2, rep: 1 } }
  ],
  metro: [
    { id: "Z_metro_1", title: "地铁 · 限流", text: "早高峰限流，排队绕站。你算时间，仍迟到。", category: "职场", d: { rep: -2, health: -2 } },
    { id: "Z_metro_2", title: "地铁 · 阅读", text: "车厢里有人背考研单词。你装睡，其实听。", category: "教育", d: { edu: 2 } },
    { id: "Z_metro_3", title: "地铁 · 拾物", text: "捡到钱包交站务，失主谢你。没有奖金，有片刻干净。", category: "人情", d: { rep: 3, social: 1 } },
    { id: "Z_metro_4", title: "地铁 · 延误", text: "信号故障，广播道歉。全车人同步叹气。", category: "健康", d: { health: -2 } },
    { id: "Z_metro_5", title: "地铁 · 推销", text: "扫码送纸巾，你扫了。关注号推送广告。", category: "金钱", d: { money: -1 } }
  ],
  mall: [
    { id: "Z_mall_1", title: "商圈 · 橱窗", text: "橱窗里的包，标签等于你两月结余。你拍张照，走了。", category: "金钱", d: { health: -1, edu: 1 } },
    { id: "Z_mall_2", title: "商圈 · 兼职", text: "促销员日结，站八小时。脚肿，挣两百。", category: "职场", d: { money: 1, health: -4 } },
    { id: "Z_mall_3", title: "商圈 · 偶遇", text: "遇见前同事，他升职了。你们聊五分钟，各自忙。", category: "人情", d: { social: 1, rep: -1 } },
    { id: "Z_mall_4", title: "商圈 · 样本", text: "化妆品试用装，填问卷。你填真实收入，被筛掉。", category: "机会", d: { rep: -1 } },
    { id: "Z_mall_5", title: "商圈 · 空调", text: "夏天来蹭空调，保安巡视。你买杯最便宜的坐。", category: "金钱", d: { money: -1, health: 2 } }
  ],
  bank: [
    { id: "Z_bank_1", title: "银行 · 排队", text: "窗口只开两个，老人业务慢。你取号，等四十分钟。", category: "健康", d: { health: -2, edu: 1 } },
    { id: "Z_bank_2", title: "银行 · 理财", text: "经理推荐「稳健型」，实际是浮动。你看小字，没签。", category: "风险", d: { rep: 2, edu: 2 } },
    { id: "Z_bank_3", title: "银行 · 贷款", text: "征信查询，多一条。利率比广告高，仍要贷。", category: "金钱", d: { money: 2, rep: -1 } },
    { id: "Z_bank_4", title: "银行 · 挂失", text: "卡丢，挂失补卡二十。你恨自己粗心。", category: "金钱", d: { money: -1, health: -2 } },
    { id: "Z_bank_5", title: "银行 · 数字", text: "教父母用手机银行，他们怕按错。你写步骤，像教小孩。", category: "人情", d: { social: 3, health: -1 } }
  ],
  school: [
    { id: "Z_school_1", title: "重点中学 · 门口", text: "家长排队接送，车堵三条街。你路过，想起自己没这资源。", category: "教育", d: { edu: 2, health: -1 }, minAge: 28 },
    { id: "Z_school_2", title: "重点中学 · 开放日", text: "参观校园，宣传册厚。你问升学率，老师微笑。", category: "教育", d: { money: -1, edu: 3 } },
    { id: "Z_school_3", title: "重点中学 · 赞助", text: "家委会倡议「自愿」捐空调。你接龙，心里算数。", category: "金钱", d: { money: -2, social: 2 } },
    { id: "Z_school_4", title: "重点中学 · 回忆", text: "校门口小吃摊还在，味道变贵。你买一串，像买时间。", category: "人情", d: { social: 1, money: -1 } },
    { id: "Z_school_5", title: "重点中学 · 讲座", text: "升学讲座，机构发袋。你拿资料，不拿焦虑——难。", category: "健康", d: { health: -2, edu: 2 } }
  ],
  exam: [
    { id: "Z_exam_1", title: "考场 · 氛围", text: "家长比考生多。你想起自己的考试，仍会做噩梦。", category: "健康", d: { health: -2, edu: 1 } },
    { id: "Z_exam_2", title: "考场 · 复读", text: "复读班广告：「再战一年」。你计算年龄，放弃。", category: "教育", d: { edu: 2, rep: -1 } },
    { id: "Z_exam_3", title: "考场 · 证件", text: "忘带身份证，跑回家。迟到十五分钟，允许进。", category: "职场", d: { health: -4, rep: 1 } },
    { id: "Z_exam_4", title: "考场 · 证书", text: "考过一门，证书邮寄。你贴墙，提醒自己还可以。", category: "机会", d: { rep: 3, edu: 2 } },
    { id: "Z_exam_5", title: "考场 · 失败", text: "差两分过线。你复读评论，关掉。", category: "健康", d: { health: -3, edu: 1 } }
  ],
  jobfair: [
    { id: "Z_jobfair_1", title: "校招 · 排队", text: "热门公司排百人。你递简历，收表人说「网上投」。", category: "职场", d: { rep: -1, health: -3 } },
    { id: "Z_jobfair_2", title: "校招 · 面试", text: "群面，七人抢话。你说了三句，不知是否被听见。", category: "机会", d: { rep: 2, health: -2 } },
    { id: "Z_jobfair_3", title: "校招 · offer", text: "拿到 offer，薪资比预期低。你签，先活着。", category: "职场", d: { rep: 3, money: 1 } },
    { id: "Z_jobfair_4", title: "校招 · 对比", text: "同学拿大包，你祝贺。回宿舍算 rent。", category: "人情", d: { social: -1, edu: 2 } },
    { id: "Z_jobfair_5", title: "校招 · 宣讲", text: "HR 画饼，Q&A 环节问「加班吗」。全场笑，无答。", category: "教育", d: { edu: 2 } }
  ],
  nightclass: [
    { id: "Z_nightclass_1", title: "夜校 · 迟到", text: "下班赶课，迟到十分钟。老师点名，你答到。", category: "教育", d: { edu: 3, health: -3 } },
    { id: "Z_nightclass_2", title: "夜校 · 同学", text: "同学是各行各业，讨论比课本有趣。", category: "人情", d: { social: 3, edu: 2 } },
    { id: "Z_nightclass_3", title: "夜校 · 考试", text: "结业考开卷，仍难。你过线，证书到手。", category: "机会", d: { rep: 2, edu: 4 } },
    { id: "Z_nightclass_4", title: "夜校 · 放弃", text: "加班冲突，缺课三次。你退费一半，心疼。", category: "金钱", d: { money: -1, health: -2 } },
    { id: "Z_nightclass_5", title: "夜校 · 路灯", text: "下课走夜路，路灯坏一段。你开手电，像学生时代。", category: "健康", d: { health: -1, edu: 1 } }
  ],
  incubator: [
    { id: "Z_incubator_1", title: "孵化器 · 路演", text: "五分钟 pitch，评委玩 phone。你讲完，掌声礼貌。", category: "机会", d: { rep: 2, health: -2 } },
    { id: "Z_incubator_2", title: "孵化器 · 工位", text: "免费工位，咖啡收费。隔壁团队换名重开。", category: "职场", d: { edu: 3, money: -1 } },
    { id: "Z_incubator_3", title: "孵化器 · 投资", text: "天使要看数据，你没有。他说「下次有 traction 再来」。", category: "机会", d: { rep: 1, edu: 2 } },
    { id: "Z_incubator_4", title: "孵化器 · 加班", text: "创业团队睡沙发，你借插座充电。聊至凌晨，像热血片。", category: "人情", d: { social: 2, health: -4 } },
    { id: "Z_incubator_5", title: "孵化器 · 关闭", text: "熟悉的 logo 摘了。你收名片，没扔。", category: "健康", d: { health: -2, edu: 2 } }
  ],
  club: [
    { id: "Z_club_1", title: "CBD会所 · 门禁", text: "着装不符，门卫拦。你回去换衬衫。", category: "职场", d: { rep: -1, money: -1 } },
    { id: "Z_club_2", title: "CBD会所 · 球局", text: "高尔夫谈合作，杆数不重要。你陪笑，谈成了。", category: "机会", d: { rep: 3, social: 2, health: -2 } },
    { id: "Z_club_3", title: "CBD会所 · 账单", text: "一杯水五十，服务费另算。你签字，公司报销。", category: "金钱", d: { money: 1, rep: 1 } },
    { id: "Z_club_4", title: "CBD会所 · 隐私", text: "听见竞品八卦，你装没听。信息有价，耳朵也有。", category: "风险", d: { edu: 2, rep: 1 } },
    { id: "Z_club_5", title: "CBD会所 · 孤独", text: "会员制健身房，人很少。你跑步，像给健康交会员费。", category: "健康", d: { money: -2, health: 4 } }
  ],
  mansion: [
    { id: "Z_mansion_1", title: "江景豪宅 · 看房", text: "销售说「一线江景」。雾霾天，江是灰的。", category: "金钱", d: { money: -1, edu: 2 } },
    { id: "Z_mansion_2", title: "江景豪宅 · 样本", text: "精装样板，照片比实际亮。你问交付标准，答「以合同为准」。", category: "机会", d: { rep: 1, edu: 2 } },
    { id: "Z_mansion_3", title: "江景豪宅 · 门槛", text: "验资五百万。你账户够，心不够。", category: "健康", d: { health: -2, rep: 2 } },
    { id: "Z_mansion_4", title: "江景豪宅 · 邻居", text: "邻居开的车，你查价格。查完，安静吃饭。", category: "人情", d: { social: -1, edu: 1 } },
    { id: "Z_mansion_5", title: "江景豪宅 · 夜", text: "夜景灯带，像城市项链。你站十分钟，回去还房贷。", category: "居住", d: { health: -1, rep: 2 } }
  ],
  fund: [
    { id: "Z_fund_1", title: "私募 · 门槛", text: "合格投资者认证，资产一百万。你够线，风险教育签字。", category: "金钱", d: { money: -2, edu: 3 } },
    { id: "Z_fund_2", title: "私募 · 路演", text: "PPT 讲 TAM，你问回撤。经理说「长期」。", category: "机会", d: { edu: 3, rep: 1 } },
    { id: "Z_fund_3", title: "私募 · 净值", text: "净值更新，绿了一周。你加仓还是止损？睡不着的题。", category: "健康", d: { health: -3, money: -1 } },
    { id: "Z_fund_4", title: "私募 · 赎回", text: "赎回 T+7，你急用钱。先刷信用卡顶着。", category: "金钱", d: { money: -2, health: -2 } },
    { id: "Z_fund_5", title: "私募 · 暴雷", text: "同策略产品暴雷新闻。你查持仓，不是同一家，仍怕。", category: "风险", d: { health: -4, edu: 2 } }
  ],
  auction: [
    { id: "Z_auction_1", title: "拍卖行 · 预展", text: "拍品标价，你换算成工资月数。艺术贵，人便宜。", category: "教育", d: { edu: 2, health: -1 } },
    { id: "Z_auction_2", title: "拍卖行 · 举牌", text: "举了一次牌，价格飞。你放下，看戏。", category: "机会", d: { social: 2, rep: 1 } },
    { id: "Z_auction_3", title: "拍卖行 · 社交", text: " champagne 交流，名片交换。你回家搜人，补背景。", category: "人情", d: { social: 3, money: -1 } },
    { id: "Z_auction_4", title: "拍卖行 · 法拍", text: "法拍房信息，价格低风险高。你研究条款，先不动。", category: "风险", d: { edu: 3, rep: 1 } },
    { id: "Z_auction_5", title: "拍卖行 · 离场", text: "落槌声轻，像关一扇门。你走出，夜风真实。", category: "健康", d: { health: 2 } }
  ],
  loan: [
    { id: "Z_loan_1", title: "地下钱庄 · 诱惑", text: "「当天放款，不看征信」。你把传单揉了。", category: "风险", d: { rep: 2, health: -1 } },
    { id: "Z_loan_2", title: "地下钱庄 · 见闻", text: "听见有人被催收，电话打给通讯录。你加快脚步。", category: "健康", d: { health: -3 } },
    { id: "Z_loan_3", title: "地下钱庄 · 熟人", text: "朋友借高利贷，求你担保。你拒，友谊减一。", category: "人情", d: { social: -3, rep: 2 } },
    { id: "Z_loan_4", title: "地下钱庄 · 对比", text: "正规银行利率，你算复利。数字仍让人清醒。", category: "教育", d: { edu: 3, money: -1 } },
    { id: "Z_loan_5", title: "地下钱庄 · 红线", text: "「过桥」七个字，背后是一条链。你当没看见。", category: "风险", d: { rep: 1 } }
  ],
  broker: [
    { id: "Z_broker_1", title: "灰色中介 · 报价", text: "「加钱能插队办」。你选排队，慢但稳。", category: "机会", d: { rep: 1, health: -2 } },
    { id: "Z_broker_2", title: "灰色中介 · 合同", text: "合同漏洞，律师朋友提醒。你重签，多付两千。", category: "金钱", d: { money: -1, rep: 2 } },
    { id: "Z_broker_3", title: "灰色中介 · 跑路", text: "中介关门，定金难追。你立案，排队维权。", category: "风险", d: { money: -2, health: -3 } },
    { id: "Z_broker_4", title: "灰色中介 · 信息", text: "听到「内部指标」，你核实，假的。信息也是商品。", category: "教育", d: { edu: 2, rep: 1 } },
    { id: "Z_broker_5", title: "灰色中介 · 拒绝", text: "「包过」留学，你先交五万。你查资质，撤了。", category: "风险", d: { rep: 3, money: -1 } }
  ],
  alley: [
    { id: "Z_alley_1", title: "夜场后巷 · 噪音", text: "音乐震耳，垃圾堆满。你绕路，仍闻到啤酒。", category: "健康", d: { health: -2 } },
    { id: "Z_alley_2", title: "夜场后巷 · 冲突", text: "两人争吵，你远离。城市背面，规则不同。", category: "风险", d: { health: -3, rep: 1 } },
    { id: "Z_alley_3", title: "夜场后巷 · 工作", text: "代驾司机等单，抽烟。你打车，他聊行业苦。", category: "人情", d: { social: 1, edu: 2 } },
    { id: "Z_alley_4", title: "夜场后巷 · 诱惑", text: "「轻松兼职」传单，你知套路。撕了。", category: "风险", d: { rep: 2 } },
    { id: "Z_alley_5", title: "夜场后巷 · 黎明", text: "散场人流，天将亮。你看见城市洗脸。", category: "健康", d: { health: 1, social: 1 } }
  ],
  factory: [
    { id: "Z_factory_1", title: "废弃厂区 · 探险", text: "网红拍照点，墙绘新。你拍一张，想起产业迁移。", category: "教育", d: { edu: 2, health: -1 } },
    { id: "Z_factory_2", title: "废弃厂区 · 租仓", text: "低价仓库，合同一月。你存旧物，怕跑路。", category: "金钱", d: { money: -1, rep: -1 } },
    { id: "Z_factory_3", title: "废弃厂区 · 电影", text: "剧组封路拍摄，你绕远。城市也是布景。", category: "机会", d: { social: 1 } },
    { id: "Z_factory_4", title: "废弃厂区 · 安全", text: "铁架生锈，警示牌倒。你未深入，生命贵。", category: "健康", d: { health: 2, rep: 1 } },
    { id: "Z_factory_5", title: "废弃厂区 · 回忆", text: "老工人回来看，眼湿。你听懂几句方言。", category: "人情", d: { social: 2, health: -1 } }
  ]
};
