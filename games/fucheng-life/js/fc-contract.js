/* 浮城人生 · fc-contract.js
   中期人生合约 · UI 层 — the one promise the city lets you make out loud.

   引擎在 fc-sim.js（`FC.Sim.selectContract` / `updateContract` / `tickContract`），
   合约文案在 `data/gameplay-pack.json → contracts[]`。这里只负责两块屏幕：

     1. 签约弹窗 —— 自己的 overlay，不进 O1 池。三张卡要同时说清目标、期限和
        进度来源，O1 卡片的「一段正文 + 三行选项」体例装不下。
     2. 结算弹窗 —— 借 O1 的卡片形状走一遍 `FC.events.show`，奖惩数字的滚动、
        日志落账和键盘陷阱就不必再写第二份。

   overlay 栈、滚动锁与焦点陷阱都来自 `FC.overlay`（fc-events.js 发布），
   所以本文件必须在它之后加载。ES5，无构建，file:// 可直开。

   Public API
     FC.contract.PICK_WINDOW              → 可签约的最后一个月（含）
     FC.contract.defs()                   → [def]（来自 pack）
     FC.contract.canPick(run)             → 还在签约窗口内且没签过
     FC.contract.showPicker(opts)         → Promise<id|null>
     FC.contract.closePicker()
     FC.contract.isPicking()
     FC.contract.resolutionEvent(run)     → O1 形状的结算弹窗载荷
     FC.contract.creditAction(run, id, res)
     FC.contract.creditDeltas(run, applied)
     FC.contract.progressLabel(run)       → 「¥120,000 / ¥260,000」这类右侧读数
     FC.contract.deadlineLabel(run)       → 「剩 21 个月」
     FC.contract.targetLabel(def, goal)
*/
(function (global) {
  "use strict";

  var doc = global.document;
  var FC = global.FC || (global.FC = {});

  /* freshRun 的 months 从 0 起跳，所以「入城后头三个月」= months ∈ [0, 3]。 */
  var PICK_WINDOW = 3;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function reduced() {
    return !!(global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function money(n) {
    return "¥" + Math.abs(Math.round(n)).toLocaleString("zh-CN");
  }

  function defs() {
    return (FC.Sim && FC.Sim.contracts && FC.Sim.contracts()) || [];
  }

  function defOf(id) {
    return (FC.Sim && FC.Sim.contractDef && FC.Sim.contractDef(id)) || null;
  }

  function targetLabel(def, goal) {
    if (!def) return "—";
    if (def.id === "home") return money(goal);
    if (def.id === "promote") return "职级 2 · KPI 70";
    return (def.goal || 100) + " 分";
  }

  function progressLabel(run) {
    var c = run && run.contract;
    if (!c) return "—";
    var pct = Math.round(FC.Sim.contractProgress(run));
    if (c.id === "home") {
      var cash = (run.money || 0) + ((run.assets && run.assets.sideFund) || 0);
      return money(cash) + " / " + money(c.goal) + "　" + pct + "%";
    }
    if (c.id === "promote") {
      return "职级 " + ((run.career && run.career.level) || 0) +
        " · KPI " + Math.round((run.career && run.career.kpi) || 0) + "　" + pct + "%";
    }
    return pct + " / 100 分";
  }

  function deadlineLabel(run) {
    var c = run && run.contract;
    if (!c) return "—";
    if (c.status === "won") return "已达成 · 第 " + c.settledMonth + " 月";
    if (c.status === "failed") return "已到期 · 第 " + c.settledMonth + " 月";
    var leftMonths = FC.Sim.contractMonthsLeft(run);
    return "剩 " + Math.max(0, leftMonths) + " / " + c.deadlineMonths + " 个月";
  }

  /* 结算弹窗借 O1 的卡片：唯一那个选项承载奖惩，dashboard 的 openEvent 照常落账。 */
  function resolutionEvent(run) {
    var c = run && run.contract;
    if (!c || c.status === "active") return null;
    var def = defOf(c.id);
    if (!def) return null;
    var won = c.status === "won";
    var face = won ? def.won : def.failed;
    var choice = {
      id: c.status,
      label: face.label,
      cost: won ? "合约达成" : "合约到期",
      d: won ? def.reward : def.penalty,
      result: face.result
    };
    if (won && c.id === "home") choice.property = "首付已缴 · 小两居";
    if (c.id === "promote") choice.kpi = won ? 6 : -8;

    var raw = {
      id: "contract_" + c.id + "_" + c.status,
      type: won ? "opportunity" : "bill",
      layerId: won ? "L3" : "L2",
      scene: "人生合约 · " + def.name,
      category: "合约",
      contract: c.id,
      title: face.title,
      body: face.body,
      weight: 1,
      choices: [choice]
    };
    /* 走一遍 toPayload：卡片需要 layerIndex 才知道自己该是什么颜色。 */
    return FC.events && FC.events.toPayload ? FC.events.toPayload(raw) : raw;
  }

  /* 落户是唯一的累加型合约，所以只有它需要行动与事件的入账口。 */
  function creditAction(run, actionId, res) {
    var gain = 0;
    if (actionId === "study") gain += 2;
    if (res && res.applied && res.applied.edu) gain += res.applied.edu * 0.25;
    if (!gain) return 0;
    return FC.Sim.creditContract(run, gain);
  }

  function creditDeltas(run, applied) {
    if (!applied || !applied.edu) return 0;
    return FC.Sim.creditContract(run, applied.edu * 0.3);
  }

  /* ------------------------------------------------------------ 签约弹窗 */
  var picker = null;

  function cardHtml(def, run, era, origin) {
    var goal = FC.Sim.contractGoal(def, run, era, origin);
    var start = Math.round(FC.Sim.contractPreview(run, def.id, era, origin));
    return '<button type="button" class="fc-contract-card" data-id="' + esc(def.id) +
      '" style="--tint:' + (def.tint || "var(--neon-cyan)") + '">' +
      '<span class="fc-contract-card__en">' + esc(def.en || "") + "</span>" +
      '<b class="fc-contract-card__name">' + esc(def.name) + "</b>" +
      '<span class="fc-contract-card__pitch">' + esc(def.pitch) + "</span>" +
      '<dl class="fc-contract-card__meta">' +
        "<dt>目标</dt><dd>" + esc(targetLabel(def, goal)) + "</dd>" +
        "<dt>期限</dt><dd>" + def.deadline + " 个月</dd>" +
        "<dt>今天</dt><dd>" + start + "%</dd>" +
      "</dl>" +
      '<span class="fc-contract-card__detail">' + esc(def.detail) + "</span>" +
      '<span class="fc-contract-card__source">' + esc(def.source) + "</span>" +
      "</button>";
  }

  function renderPicker(opts, resolve) {
    var soft = reduced();
    var list = defs();
    var host = doc.createElement("div");
    host.className = "fc-contract-pick";
    host.innerHTML =
      '<div class="fc-contract-pick__scrim"></div>' +
      '<div class="fc-contract-pick__panel" role="dialog" aria-modal="true" ' +
           'aria-labelledby="fcContractTitle" tabindex="-1">' +
        '<p class="fc-contract-pick__eyebrow">MID-TERM CONTRACT · 中期人生合约</p>' +
        '<h2 class="fc-contract-pick__title" id="fcContractTitle">这一局，你打算跟城市要什么？</h2>' +
        '<p class="fc-contract-pick__lede">三张合约只能签一张，整局有效。签下之后，' +
          '仪表盘顶上会一直挂着它的进度与剩余月数；到期那天，城市会自己结算。</p>' +
        '<div class="fc-contract-pick__grid">' +
          list.map(function (def) {
            return cardHtml(def, opts.run || {}, opts.era, opts.origin);
          }).join("") +
        "</div>" +
        '<button type="button" class="fc-btn fc-btn--ghost fc-contract-pick__skip">' +
          "再想想（第 " + PICK_WINDOW + " 月之前都还能签）</button>" +
      "</div>";

    var panel = host.querySelector(".fc-contract-pick__panel");
    var settled = false;

    function finish(id) {
      if (settled) return;
      settled = true;
      host.classList.add("is-closing");
      var done = function () {
        if (host.parentNode) host.parentNode.removeChild(host);
        FC.overlay.pop(host);
        picker = null;
        resolve(id || null);
      };
      if (soft) done();
      else global.setTimeout(done, 200);
    }

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); finish(null); return; }
      if (e.key === "Tab") { FC.overlay.trap(panel, e); return; }
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= list.length) {
        e.preventDefault();
        finish(list[n - 1].id);
      }
    }

    [].slice.call(host.querySelectorAll(".fc-contract-card")).forEach(function (btn) {
      btn.addEventListener("click", function () { finish(btn.getAttribute("data-id")); });
    });
    host.querySelector(".fc-contract-pick__skip")
      .addEventListener("click", function () { finish(null); });
    host.querySelector(".fc-contract-pick__scrim")
      .addEventListener("click", function () { finish(null); });

    doc.body.appendChild(host);
    if (FC.overlay.push("modal", host)) FC.overlay.top().onKey = onKey;
    picker = { host: host, finish: finish };
    panel.focus();

    if (soft) host.classList.add("is-open");
    else global.requestAnimationFrame(function () { host.classList.add("is-open"); });
  }

  FC.contract = {
    PICK_WINDOW: PICK_WINDOW,
    SECONDARY_WINDOW: 6,
    defs: defs,
    def: defOf,
    targetLabel: targetLabel,
    progressLabel: progressLabel,
    deadlineLabel: deadlineLabel,
    resolutionEvent: resolutionEvent,
    creditAction: creditAction,
    creditDeltas: creditDeltas,
    isPicking: function () { return !!picker; },
    closePicker: function () { if (picker) picker.finish(null); },

    canPick: function (run) {
      if (!run || run.contract) return false;
      if (!defs().length) return false;
      return (run.months || 0) <= PICK_WINDOW;
    },

    canPickSecondary: function (run) {
      return !!(FC.Sim && FC.Sim.canPickSecondary && FC.Sim.canPickSecondary(run));
    },

    secondaryDefs: function () {
      return (FC.Sim && FC.Sim.secondaryContracts && FC.Sim.secondaryContracts()) || [];
    },

    showSecondaryPicker: function (opts) {
      opts = opts || {};
      return new Promise(function (resolve) {
        var list = FC.contract.secondaryDefs();
        if (!doc || !FC.overlay || !list.length) { resolve(null); return; }
        if (picker || (FC.events && FC.events.isOpen())) { resolve(null); return; }

        var host = doc.createElement("div");
        host.className = "fc-contract-pick fc-contract-pick--secondary";
        host.innerHTML =
          '<div class="fc-contract-pick__scrim"></div>' +
          '<div class="fc-contract-pick__panel" role="dialog" aria-modal="true" tabindex="-1">' +
            '<p class="fc-contract-pick__eyebrow">SECOND CHAPTER · 二级合约</p>' +
            '<h2 class="fc-contract-pick__title">主线已达成，下一章签什么？</h2>' +
            '<p class="fc-contract-pick__lede">六个月内可选一张副线目标：换租、结婚备案或副业备案。</p>' +
            '<div class="fc-contract-pick__grid">' +
              list.map(function (def) {
                return '<button type="button" class="fc-contract-card" data-id="' + esc(def.id) +
                  '" style="--tint:' + (def.tint || "var(--neon-jade)") + '">' +
                  '<span class="fc-contract-card__en">' + esc(def.en || "") + "</span>" +
                  '<b class="fc-contract-card__name">' + esc(def.name) + "</b>" +
                  '<span class="fc-contract-card__pitch">' + esc(def.pitch) + "</span>" +
                  '<span class="fc-contract-card__detail">' + esc(def.detail) + "</span>" +
                  "</button>";
              }).join("") +
            "</div>" +
            '<button type="button" class="fc-btn fc-btn--ghost fc-contract-pick__skip">先不签</button>' +
          "</div>";

        var panel = host.querySelector(".fc-contract-pick__panel");
        var settled = false;

        function finish(id) {
          if (settled) return;
          settled = true;
          if (host.parentNode) host.parentNode.removeChild(host);
          FC.overlay.pop(host);
          resolve(id || null);
        }

        [].slice.call(host.querySelectorAll(".fc-contract-card")).forEach(function (btn) {
          btn.addEventListener("click", function () { finish(btn.getAttribute("data-id")); });
        });
        host.querySelector(".fc-contract-pick__skip").addEventListener("click", function () { finish(null); });
        host.querySelector(".fc-contract-pick__scrim").addEventListener("click", function () { finish(null); });

        doc.body.appendChild(host);
        if (FC.overlay.push("modal", host)) {
          FC.overlay.top().onKey = function (e) {
            if (e.key === "Escape") { e.preventDefault(); finish(null); }
            if (e.key === "Tab") FC.overlay.trap(panel, e);
          };
        }
        panel.focus();
        host.classList.add("is-open");
      });
    },

    showPicker: function (opts) {
      opts = opts || {};
      return new Promise(function (resolve) {
        if (!doc || !FC.overlay || !defs().length) { resolve(null); return; }
        if (picker || (FC.events && FC.events.isOpen())) { resolve(null); return; }
        renderPicker(opts, resolve);
      });
    }
  };
})(window);
