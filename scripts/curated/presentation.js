"use strict";

/* R5-B · 事件呈现分化的选目表（SSOT）
   四种壳的分派写在这里，而不是散在各条事件里：一眼能看出城市这一局用哪种
   口气说了多少话，也方便下一轮调配比例。

     modal（缺省）  重大抉择 —— 现有 O1 卡
     toast          小插曲   —— 顶部 4 秒通知，单按钮「知道了」
     letter         账单合同 —— 信纸全屏，签字 / 撕掉
     inline         日常     —— 插进日志流的大卡片，不弹窗

   两个消费方：
     scripts/build-gameplay-data.js  build 时把 ambientInline 打进 pack
     scripts/apply-presentation.js   给手写排版的 story.json 定点插字段
   一律只加字段，不动 id —— 存档的 recentModal / done 全部按 id 记账。 */

/* 通知类：城市只是通报一声，不等你回答。第一个选项就是「你顺手做了的那件
   事」，它的账照记，只是不再问一遍，所以这十条挑的都是首选项代价最轻的。 */
const storyToast = [
  "EV05", // 玻璃幕墙的落日 · 拍一张发给家里
  "EV11", // 早市收摊前 · 再等二十分钟
  "EV12", // 车棚里少了一辆 · 报警走完流程
  "EV18", // 一条差评 · 提交申诉
  "EV23", // 周末团建通知 · 去，坐在能说上话的位置
  "EV29", // 餐补取消了 · 开始自己带饭
  "EV31", // 早高峰第三班 · 打车别迟到
  "EV32", // 年终奖的传闻 · 按最坏的数字打算
  "EV71", // 三拼字母 · 抢下来
  "EV87"  // 小余的电车 · 把插线板递出去
];

/* 文书类：有抬头、有落款，底下等一个签名或者一次撕毁。 */
const storyLetter = [
  "EV10", // 账单日 · 扣款短信
  "EV37", // 竞业协议 · 签字页在最后
  "EV39", // 培训班的分期合同 · 二十四期
  "EV52", // 两份合同 · 红线（信纸壳同样有三秒冷静期）
  "EV69"  // 二十年 · 还款计划表
];

/* ambient 升级为 inline：挑的是权重最高、最常复现的那批日常 —— 一年里会
   撞见三四次的事，值得在日志里占一张卡而不是一行灰字。
   值是补写的卡片标题：build 脚本原本按「类目 · 层」拼一个占位标题，那个
   拿来当大标题太敷衍。 */
const ambientInline = {
  U001: "冷水一周",
  U003: "两条短信",
  U004: "建议复查",
  U005: "降本增效",
  U013: "已备案的电钻",
  U022: "够买三天",
  U027: "人脸识别",
  U029: "市场价",
  U033: "坐过站",
  L1_08: "隔壁的电话",
  L1_17: "超时扣款",
  L2_01: "单脚打卡",
  L2_07: "那五百块",
  L3_01: "两个新人",
  L3_03: "公司困难"
};

/* 键序也统一在这里：presentation 紧跟 layerId，读的人先知道事情发生在哪一
   层，再知道城市用什么口气说。build 与迁移脚本走同一个函数，产出才字节一致。 */
function applyAmbient(event) {
  const title = ambientInline[event.id];
  if (!title) return event;
  const out = {};
  Object.keys(event).forEach((key) => {
    if (key === "presentation") return;
    out[key] = key === "title" ? title : event[key];
    if (key === "layerId") out.presentation = "inline";
  });
  if (!out.presentation) out.presentation = "inline";
  out.title = title;
  return out;
}

module.exports = { storyToast, storyLetter, ambientInline, applyAmbient };
