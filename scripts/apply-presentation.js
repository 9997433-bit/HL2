#!/usr/bin/env node
"use strict";

/* R5-B · 事件呈现分化的一次性迁移脚本
   只加字段，不动 id、不动 choices、不动权重 —— 存档里的 recentModal / done
   全都按 id 记账，改一个 id 就是把玩家已经走过的路抹掉一条。

   story.json          10 条 → toast（纯通知类，第一个选项就是「顺手做了的那件事」）
   story.json           5 条 → letter（账单 / 合同 / 风险文书）
   gameplay-pack.json  15 条 ambient → inline（复现率最高的那批日常，顺带补标题）

   story.json 是手写排版（choices 一行一条），所以这里做的是定点插行而不是
   JSON 重排 —— 重排会把八万字全部改成另一种缩进。gameplay-pack.json 由
   build-gameplay-data.js 生成，可以安全地按同样的 JSON.stringify(…, null, 2)
   写回去。两边都幂等：字段已经在了就跳过。 */

const fs = require("fs");
const path = require("path");

const presentation = require("./curated/presentation");

const STORY = path.join(__dirname, "../games/fucheng-life/data/story.json");
const PACK = path.join(__dirname, "../games/fucheng-life/data/gameplay-pack.json");

const TOAST = presentation.storyToast;
const LETTER = presentation.storyLetter;
const INLINE = presentation.ambientInline;

function migrateStory() {
  let text = fs.readFileSync(STORY, "utf8");
  const missing = [];
  let added = 0;

  const apply = (ids, presentation) => ids.forEach((id) => {
    /* 定位到这条事件的 layerId 行，presentation 紧跟其后：读的人先知道事情
       发生在哪一层，再知道城市用什么口气说。 */
    const anchor = new RegExp(
      '(^([ \\t]+)"id": "' + id + '",\\n(?:\\2"[a-zA-Z]+": .*\\n)*?\\2"layerId": "L\\d",\\n)',
      "m"
    );
    const match = text.match(anchor);
    if (!match) { missing.push(id); return; }

    const already = new RegExp('"id": "' + id + '",[\\s\\S]{0,400}?"presentation"');
    if (already.test(text)) return;

    const line = match[2] + '"presentation": "' + presentation + '",\n';
    text = text.replace(anchor, match[1] + line);
    added++;
  });

  apply(TOAST, "toast");
  apply(LETTER, "letter");

  if (missing.length) throw new Error("story.json is missing event ids: " + missing.join(", "));

  /* 改完必须还是合法 JSON，而且事件条数一条不多一条不少。 */
  const parsed = JSON.parse(text);
  if (parsed.events.length !== 97) {
    throw new Error("story.json event count changed: " + parsed.events.length);
  }
  fs.writeFileSync(STORY, text, "utf8");
  return { toast: TOAST.length, letter: LETTER.length, added: added };
}

function migratePack() {
  const pack = JSON.parse(fs.readFileSync(PACK, "utf8"));
  const byId = new Map();
  pack.ambientEvents.forEach((event) => byId.set(event.id, event));
  const missing = [];

  Object.keys(INLINE).forEach((id) => {
    const event = byId.get(id);
    if (!event) { missing.push(id); return; }
    /* build 走的是同一个函数，所以「先 build 再迁移」和「直接 build」产出
       同一份文件。 */
    pack.ambientEvents[pack.ambientEvents.indexOf(event)] =
      presentation.applyAmbient(event);
  });

  if (missing.length) {
    throw new Error("gameplay-pack.json is missing ambient ids: " + missing.join(", "));
  }

  fs.writeFileSync(PACK, JSON.stringify(pack, null, 2), "utf8");
  return { inline: Object.keys(INLINE).length };
}

const story = migrateStory();
const pack = migratePack();
console.log(
  `story.json: ${story.toast} toast + ${story.letter} letter (${story.added} written); ` +
  `gameplay-pack.json: ${pack.inline} inline ambient.`
);
