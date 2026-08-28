/* 浮城人生 · fc-events.js
   O1 事件弹窗 — a Reigns-style interruption card.

   Self-contained on purpose: it only needs a DOM and `css/fc-events.css`.
   If `story-loader.js` is present it reuses `FC.story`; otherwise it fetches
   `data/story.json` itself and falls back to the offline mirror at the bottom
   of this file so the modal still works from a file:// double-click.

   Public API (window.FC.events):
     load()               → Promise<deck>
     deck()               → array | null
     pick({layer, avoid}) → event | null
     show(event, opts)    → Promise<{event, choice, deltas} | null>
     isOpen()             → boolean
*/
(function (global) {
  "use strict";

  var doc = global.document;
  var FC = global.FC || (global.FC = {});

  var STAT_LABEL = { money: "现金", health: "健康", social: "人脉", rep: "声望" };
  var STRENGTH = ["", "轻微", "中等", "明显"];
  var LAYER_NAME = {
    L1: "市井层", L2: "工薪层", L3: "上升通道", L4: "资本名利", L5: "暗流"
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function layerNum(id) {
    var n = parseInt(String(id || "L2").replace(/[^\d]/g, ""), 10);
    return n >= 1 && n <= 5 ? n : 2;
  }

  function reduced() {
    return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* ------------------------------------------------------------------ 剧本
     story.json carries the scene; the branching lives here. Deltas use the
     same unit scale as the dashboard pool: money is in "roughly a third of a
     month's income" steps, the other three are raw points out of 100. */
  var SCRIPT = {
    EV01: {
      weight: 10,
      choices: [
        { label: "接下这一单", hint: "天亮前还能再跑两趟", d: { money: 1, health: -3 },
          outcome: "你把手机塞回外套内袋。第一笔到账短信来的时候，天还没有亮透。" },
        { label: "再睡两个小时", hint: "身体先于账单开口", d: { health: 4, money: -1 },
          outcome: "闹钟被按掉两次。醒来时太阳已经越过巷口，欠的那部分还在原处等你。" },
        { label: "在站点群里问问长期的活", hint: "认识人比跑单慢，也比跑单久", d: { social: 4, health: -1 },
          outcome: "站长记下了你的名字，说下个月排班时想着你。这句话不值钱，但可以先记着。" }
      ]
    },
    EV02: {
      weight: 10,
      choices: [
        { label: "按人头平摊", hint: "省事，也省了争执", d: { money: -1, social: 2 },
          outcome: "你转出那一份，群里很快恢复表情包。合租的默契就是不追问细节。" },
        { label: "把自己那份算清楚", hint: "分寸有时会被当成计较", d: { social: -3, rep: 2 },
          outcome: "你把用量截图发了出去，数字没有人反驳。之后几天，厨房安静了一些。" },
        { label: "先垫上，不提这事", hint: "垫的钱通常回不来", d: { money: -2, social: 5 },
          outcome: "你先把账缴了。有人说下次一定还，你点了点头，没有记在备忘录里。" }
      ]
    },
    EV03: {
      weight: 10,
      choices: [
        { label: "回工位再改一版", hint: "今晚不会结束", d: { rep: 4, health: -5 },
          outcome: "你在空掉的办公室里改到两点。第二天没有人提起，文件安静地过了。" },
        { label: "回复「明早处理」", hint: "边界要自己划", d: { rep: -2, health: 3 },
          outcome: "消息发出后你把手机倒扣。第二天九点，那句「再改一版」还在，你也还在。" },
        { label: "在车上改", hint: "隧道里没有信号", d: { rep: 2, health: -3 },
          outcome: "笔记本架在膝盖上，改到出站才发的。你分不清是效率，还是不肯浪费的那点时间。" }
      ]
    },
    EV04: {
      weight: 8,
      choices: [
        { label: "把最后一道大题写完", hint: "多留十分钟", d: { rep: 5, health: -3 },
          outcome: "收卷铃响时你才落笔。走出考场，雨已经停了，路面还亮着。" },
        { label: "提前交卷", hint: "换回一点确定的东西", d: { rep: -1, health: 3 },
          outcome: "你比大多数人早出来。空荡的走廊里，你第一次听见自己的脚步声。" }
      ]
    },
    EV05: {
      weight: 10,
      choices: [
        { label: "拍一张，发给家里", hint: "有些东西不计入绩效", d: { social: 3, health: 2 },
          outcome: "家里回了一句「真好看」，然后问你吃饭没有。你说吃过了，其实还没有。" },
        { label: "继续把表填完", hint: "日落不影响截止时间", d: { rep: 3, health: -3 },
          outcome: "表格在天黑前提交。窗外的金色退回成灰色，办公室的灯准时替它上岗。" },
        { label: "提前十分钟下班", hint: "早走的人会被记住", d: { rep: -2, health: 4 },
          outcome: "你在电梯里遇见同一层的陌生人。街上的风还带着白天的温度。" }
      ]
    },
    EV06: {
      weight: 8,
      choices: [
        { label: "排进终面的队伍", hint: "队很长，机会只有几个", d: { rep: 5, health: -4 },
          outcome: "你站到下午三点。面试八分钟，对方说会有通知，通知一直没有具体日期。" },
        { label: "投两个摊位就走", hint: "把力气留给下一场", d: { social: 2, health: 1 },
          outcome: "两份简历，两句客气话。你把手环收进包里，它比offer先到手。" },
        { label: "退出，转投熟人内推", hint: "人情要先欠下才能用", d: { social: 5, rep: -1 },
          outcome: "学长答应帮你递进去，附了一句「别抱太大希望」。这话你听得懂。" }
      ]
    },
    EV07: {
      weight: 6,
      choices: [
        { label: "跟着进去", hint: "门内的规矩由别人定", d: { social: 6, rep: 2, money: -2 },
          outcome: "有人替你介绍了半句身份，剩下半句留给你自己补。你补得还算得体。" },
        { label: "在大堂等人下来", hint: "不进门，也不缺席", d: { social: -1, health: 1 },
          outcome: "你在沙发上坐了四十分钟。散场时有人和你握手，说下次一起上去。" },
        { label: "说句抱歉，先走", hint: "退出比进入省钱", d: { social: -3, health: 3 },
          outcome: "你在门口叫了车。回程路上，城市的灯一格一格退到身后。" }
      ]
    },
    EV08: {
      weight: 6,
      choices: [
        { label: "把账结了", hint: "现金买回一点主动", d: { money: -3, social: 4, rep: 3 },
          outcome: "你去前台签了单，回来时没有说。第二天有人在群里提了一句，你说小事。" },
        { label: "让对方结，记下这笔", hint: "人情会计息", d: { social: 6, rep: -2 },
          outcome: "这一顿你没有付钱。人情账本上多了一行，落款是你。" },
        { label: "AA，把话说明白", hint: "清楚，但不热络", d: { money: -1, social: -2, rep: 2 },
          outcome: "你提议平摊，桌上短暂安静，然后有人笑着答应。此后联系少了一些。" }
      ]
    },
    EV09: {
      weight: 4,
      redline: true,
      choices: [
        { label: "按纸上的数还回去", hint: "退出要付全款", d: { money: -4, rep: 4 },
          outcome: "你把钱转过去，对方发来一个句号。借据被撕掉，名字终于不再流通。" },
        { label: "先拖着，等对方开口", hint: "拖延也是一种利息", risk: true, d: { money: 1, rep: -5, social: -2 },
          outcome: "没有人来催。三周后，一个陌生号码开始每天固定时间响两声。" },
        { label: "找中间人重新谈", hint: "第三个人也要分成", risk: true, d: { money: -2, social: -3, rep: -1 },
          outcome: "中间人把数字压下来一些，条件是这件事以后由他记着。" }
      ]
    },
    EV10: {
      weight: 10,
      choices: [
        { label: "先还最急的那笔", hint: "把火压回一格", d: { money: -2, rep: 2 },
          outcome: "你按到期日排了序，还掉最上面的一笔。剩下的往后挪了一个月。" },
        { label: "分期，把利息摊开", hint: "现在轻，以后重", d: { money: -1, health: -1, rep: -2 },
          outcome: "分期页面只要三次点击。每月多出的那个数字很小，也一直都在。" },
        { label: "关掉短信提醒", hint: "看不见不等于不存在", risk: true, d: { health: 2, rep: -3 },
          outcome: "世界安静了两天。第三天，电话代替短信找了过来。" }
      ]
    }
  };

  /* Events the JSON adds later still work — they just get a neutral pair. */
  var GENERIC = [
    { label: "照常过去", hint: "不做记号的一天", d: { health: 1 },
      outcome: "这一天没有留下什么。城市照常运转，你也是。" },
    { label: "多留意一会儿", hint: "记住细节，未必有用", d: { rep: 1, health: -1 },
      outcome: "你多站了一会儿，把这件事记住了。用处以后再说。" }
  ];

  /* --------------------------------------------------------------- 数据装载 */
  var deck = null;
  var loading = null;

  function build(events) {
    var out = [];
    for (var i = 0; i < events.length; i++) {
      var raw = events[i];
      if (!raw || !raw.id) continue;
      var script = SCRIPT[raw.id] || {};
      out.push({
        id: raw.id,
        title: raw.title,
        text: raw.text,
        category: raw.category || "城市",
        layerId: raw.layerId || "L2",
        layer: layerNum(raw.layerId),
        weight: script.weight || raw.weight || 8,
        redline: !!script.redline || raw.category === "风险",
        /* choices ride along in story.json when authored there; the script
           table is the fallback so the two can be merged later without churn */
        choices: raw.choices || script.choices || GENERIC
      });
    }
    return out;
  }

  function storyUrl() {
    var s = doc && doc.currentScript;
    if (s && s.src) return new URL("../data/story.json", s.src).href;
    return new URL("./data/story.json", global.location.href).href;
  }

  var URL_STORY = storyUrl();

  function fetchStory() {
    if (typeof global.fetch !== "function") return Promise.reject(new Error("no fetch"));
    return global.fetch(URL_STORY, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function load() {
    if (deck) return Promise.resolve(deck);
    if (loading) return loading;

    var source;
    if (FC.story && (FC.story.events || FC.story.sampleEvents)) {
      source = Promise.resolve(FC.story);
    } else if (global.location.protocol === "file:") {
      /* A fetch from file:// is blocked before it leaves the page and Chrome
         logs it as an error; go straight to the mirror instead. */
      source = Promise.reject(new Error("file://"));
    } else if (FC.ready && typeof FC.ready.then === "function") {
      source = FC.ready.catch(fetchStory);
    } else {
      source = fetchStory();
    }

    loading = source.then(function (data) {
      var events = data && (data.events || data.sampleEvents);
      if (!events || !events.length) throw new Error("story has no events");
      return events;
    }).catch(function () {
      /* file:// double-click, offline, or a story.json that moved */
      return SEED;
    }).then(function (events) {
      deck = build(events);
      return deck;
    });

    return loading;
  }

  /* ------------------------------------------------------------------ 抽取
     The city knocks on the door you actually live behind: same-layer events
     are common, distant ones rare, and the undercurrent mostly stays shut. */
  function weightOf(ev, layer) {
    var base = ev.weight;
    if (ev.layer === 5) return layer >= 4 ? base * 1.2 : base * 0.3;
    var dist = Math.abs(ev.layer - layer);
    return base * (dist === 0 ? 3 : dist === 1 ? 1.4 : 0.45);
  }

  function pick(opts) {
    opts = opts || {};
    if (!deck || !deck.length) return null;
    var layer = opts.layer || 2;
    var avoid = opts.avoid || [];
    var pool = [], weights = [], total = 0, i;

    for (i = 0; i < deck.length; i++) {
      if (avoid.indexOf(deck[i].id) >= 0) continue;
      var w = weightOf(deck[i], layer);
      pool.push(deck[i]);
      weights.push(w);
      total += w;
    }
    if (!pool.length) return null;

    var r = Math.random() * total;
    for (i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  /* ------------------------------------------------------------------ 视图 */
  var openHost = null;

  function magnitude(k, v) {
    var a = Math.abs(v);
    if (k === "money") return a >= 4 ? 3 : a >= 2 ? 2 : 1;
    return a >= 7 ? 3 : a >= 4 ? 2 : 1;
  }

  function previewHtml(d) {
    var keys = Object.keys(d || {});
    if (!keys.length) return '<span class="fc-ev__pv fc-ev__pv--none">代价未知</span>';
    return keys.map(function (k) {
      var v = d[k];
      var n = magnitude(k, v);
      var dots = "";
      for (var i = 1; i <= 3; i++) dots += '<i' + (i <= n ? ' class="on"' : "") + "></i>";
      return '<span class="fc-ev__pv ' + (v >= 0 ? "is-up" : "is-down") + '">' +
        '<span class="fc-ev__pv-k">' + esc(STAT_LABEL[k] || k) + "</span>" +
        '<span class="fc-ev__pv-dots" aria-hidden="true">' + dots + "</span>" +
        '<span class="fc-sr">' + (v >= 0 ? "上升" : "下降") + " " + STRENGTH[n] + "</span>" +
        "</span>";
    }).join("");
  }

  function focusables(root) {
    return [].slice.call(root.querySelectorAll("button:not([disabled])"));
  }

  function show(ev, opts) {
    opts = opts || {};
    if (openHost) return Promise.resolve(null);

    return new Promise(function (resolve) {
      var lastFocus = doc.activeElement;
      var soft = reduced();

      var host = doc.createElement("div");
      host.className = "fc-ev";
      host.setAttribute("data-layer", "l" + ev.layer);
      host.style.setProperty("--tint", "var(--fc-ev-l" + ev.layer + ")");

      var scene = (ev.layerId || "L2") + " " + (LAYER_NAME[ev.layerId] || "城市") +
        " · " + ev.category;

      host.innerHTML =
        '<div class="fc-ev__veil"></div>' +
        '<div class="fc-ev__card" role="dialog" aria-modal="true" ' +
             'aria-labelledby="fc-ev-title" aria-describedby="fc-ev-text">' +
          '<div class="fc-ev__head">' +
            '<span class="fc-ev__scene">' + esc(scene) + "</span>" +
            '<span class="fc-ev__code">' + esc(ev.id) + "</span>" +
          "</div>" +
          '<h2 class="fc-ev__title" id="fc-ev-title">' + esc(ev.title) + "</h2>" +
          '<p class="fc-ev__text" id="fc-ev-text">' + esc(ev.text) + "</p>" +
          '<div class="fc-ev__body"></div>' +
        "</div>";

      var card = host.querySelector(".fc-ev__card");
      var body = host.querySelector(".fc-ev__body");
      var settled = false;
      var chosen = null;

      function close(result) {
        if (settled) return;
        settled = true;
        doc.removeEventListener("keydown", onKey, true);
        host.classList.add("is-closing");
        var done = function () {
          if (host.parentNode) host.parentNode.removeChild(host);
          doc.body.classList.remove("fc-ev-lock");
          openHost = null;
          if (lastFocus && lastFocus.focus) lastFocus.focus();
          resolve(result);
        };
        if (soft) done();
        else global.setTimeout(done, 200);
      }

      function onKey(e) {
        if (e.key === "Escape") {
          /* An event is an interruption, not a dialog: it can only be closed
             once a choice has been paid for. */
          if (chosen) {
            e.preventDefault();
            close(chosen);
          } else {
            card.classList.remove("fc-ev__card--nudge");
            void card.offsetWidth;
            card.classList.add("fc-ev__card--nudge");
          }
          return;
        }
        if (e.key !== "Tab") return;
        var items = focusables(card);
        if (!items.length) return;
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }

      function renderChoices() {
        var html = '<div class="fc-ev__choices">';
        for (var i = 0; i < ev.choices.length; i++) {
          var c = ev.choices[i];
          html += '<button type="button" class="fc-ev__choice' + (c.risk ? " is-risk" : "") +
            '" data-i="' + i + '">' +
            '<span class="fc-ev__choice-main">' +
              '<span class="fc-ev__label">' + esc(c.label) + "</span>" +
              (c.hint ? '<span class="fc-ev__hint">' + esc(c.hint) + "</span>" : "") +
            "</span>" +
            '<span class="fc-ev__preview">' + previewHtml(c.d) + "</span>" +
            "</button>";
        }
        html += "</div>";
        html += '<p class="fc-ev__foot">' +
          (ev.redline ? "红线事件 · 代价只标强度，不标确数。" : "预览只显示影响的方向与强度。") +
          "</p>";
        body.innerHTML = html;

        var buttons = focusables(body);
        buttons.forEach(function (b) {
          b.addEventListener("click", function () {
            choose(ev.choices[parseInt(b.getAttribute("data-i"), 10)]);
          });
        });

        if (ev.redline && !opts.skipCooldown) coolDown(buttons);
        else if (buttons[0]) buttons[0].focus();
      }

      /* Some decisions need three seconds. It doubles as mis-tap protection. */
      function coolDown(buttons) {
        var left = 3;
        var note = doc.createElement("p");
        note.className = "fc-ev__cool";
        body.appendChild(note);
        buttons.forEach(function (b) { b.disabled = true; });

        var paint = function () {
          note.textContent = left > 0 ? "冷静期 " + left + " 秒" : "";
        };
        paint();
        var timer = global.setInterval(function () {
          left--;
          paint();
          if (left > 0) return;
          global.clearInterval(timer);
          if (settled) return;
          note.parentNode && note.parentNode.removeChild(note);
          buttons.forEach(function (b) { b.disabled = false; });
          if (buttons[0]) buttons[0].focus();
        }, 1000);
      }

      function choose(choice) {
        var deltas = choice.d || {};
        var applied = opts.apply ? opts.apply(deltas, choice, ev) : deltas;
        chosen = { event: ev, choice: choice, deltas: applied };
        host.classList.add("is-resolved");

        var ticks = Object.keys(applied || {}).map(function (k, i) {
          var v = applied[k];
          return '<span class="fc-ev__tick ' + (v >= 0 ? "up" : "down") + '" ' +
            'style="animation-delay:' + (soft ? 0 : 90 * i) + 'ms">' +
            esc(STAT_LABEL[k] || k) + " " + (v >= 0 ? "+" : "−") +
            Math.abs(v).toLocaleString("zh-CN") + "</span>";
        }).join("");

        body.innerHTML =
          '<div class="fc-ev__result">' +
            '<p class="fc-ev__picked">你选择了：' + esc(choice.label) + "</p>" +
            '<p class="fc-ev__outcome">' + esc(choice.outcome || "") + "</p>" +
            '<div class="fc-ev__ticks">' + ticks + "</div>" +
            '<button type="button" class="fc-ev__go">继续这个月 ▸</button>' +
          "</div>";

        var go = body.querySelector(".fc-ev__go");
        go.addEventListener("click", function () {
          close(chosen);
        });
        go.focus();
      }

      renderChoices();
      doc.body.appendChild(host);
      doc.body.classList.add("fc-ev-lock");
      doc.addEventListener("keydown", onKey, true);
      openHost = host;

      /* let the first frame paint the closed state before opening */
      if (soft) host.classList.add("is-open");
      else global.requestAnimationFrame(function () { host.classList.add("is-open"); });
    });
  }

  FC.events = {
    load: load,
    deck: function () { return deck; },
    pick: pick,
    show: show,
    isOpen: function () { return !!openHost; },
    STAT_LABEL: STAT_LABEL
  };

  /* ------------------------------------------------------- offline mirror
     Mirrors data/story.json → sampleEvents. Only used when the JSON cannot be
     read (typically file://). Keep in sync when the story file changes. */
  var SEED = [
    { id: "EV01", title: "凌晨四点的灯", layerId: "L1", category: "生计",
      text: "外卖站的卷帘门升起一半。有人开始今天，有人还没结束昨天。你的手机先亮了，余额没有。" },
    { id: "EV02", title: "水表之后", layerId: "L2", category: "居住",
      text: "合租群里安静了三分钟，随后每个人都算出自己该付的那一份。城市把亲密切成精确的小数。" },
    { id: "EV03", title: "末班地铁", layerId: "L2", category: "职场",
      text: "末班车关门前，你收到一句“再改一版”。隧道没有信号，短暂替你保住了沉默。" },
    { id: "EV04", title: "考场窗外", layerId: "L3", category: "教育",
      text: "雨落在答题卡之外。两小时后，有些人得到一条上行通道，有些人只得到标准答案。" },
    { id: "EV05", title: "玻璃幕墙的落日", layerId: "L2", category: "职场",
      text: "夕阳把整栋写字楼镀成金色，工位上的人没有抬头。美景不计入本季度绩效。" },
    { id: "EV06", title: "校招手环", layerId: "L3", category: "机会",
      text: "大厅里发放同一种蓝色手环。有人凭它进入终面，有人把它留作来过这座城市的证明。" },
    { id: "EV07", title: "会所电梯", layerId: "L4", category: "人情",
      text: "电梯没有楼层按钮。侍者认得邀请人的姓氏，也认得所有不该出现在这里的人。" },
    { id: "EV08", title: "第二种货币", layerId: "L4", category: "关系",
      text: "饭局散后，没有人提起菜单价格。真正昂贵的部分，已经记进彼此的人情账本。" },
    { id: "EV09", title: "潮汐线下的借据", layerId: "L5", category: "风险",
      text: "江水准时退去，露出一张被雨泡软的借据。名字还清楚，承诺已经晕开。" },
    { id: "EV10", title: "账单日", layerId: "L1", category: "金钱",
      text: "闹钟还没响，扣款短信先到了。没钱的人没有秘密，账单就是他们的隐私。" }
  ];
})(window);
