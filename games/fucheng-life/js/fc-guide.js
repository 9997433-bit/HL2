/* 浮城人生 · fc-guide.js — 聚光灯式逐步教学（coach marks） */
(function (global) {
  "use strict";

  var doc = global.document;
  var FC = global.FC || (global.FC = {});

  /* v2：旧版居中弹窗太容易被点掉，且桌面高亮了隐藏的手机底栏。 */
  var KEY = "fucheng.guide.v2";

  var STEPS = [
    {
      title: "① 行动点 AP",
      body: "每个月有 3 点行动点。点下面这些按钮（上班、休息、探区…）把它们花完 —— 这是你这个月在城里做的事。",
      target: "actionGrid",
      fallback: "apDots"
    },
    {
      title: "② 推进一个月",
      body: "行动点用尽后，点这里结算收支、抽城市事件。没花完 AP 时它会是灰的。",
      target: "tickBtn"
    },
    {
      title: "③ 人生合约",
      body: "入城头三个月会让你签一张合约（落户 / 首付 / 升职）。进度条一直挂在这里，到期城市会结算。",
      target: "contractHud",
      fallback: "vitalsPanel"
    },
    {
      title: "④ 生命体征",
      body: "现金、健康、人脉、声望在这里跳动。现金见底会危险，健康掉光也会提前离场。",
      target: "vitalsPanel",
      fallback: "moneyStat"
    },
    {
      title: "⑤ 事件日志",
      body: "城市敲门、人情账、合约结算，都会写进日志。选完选项后看这里，就能知道发生了什么。",
      target: "log"
    }
  ];

  var active = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function resolveTarget(step) {
    var el = doc.getElementById(step.target);
    if (el && el.offsetParent !== null) return el;
    if (step.fallback) {
      el = doc.getElementById(step.fallback);
      if (el && el.offsetParent !== null) return el;
    }
    /* offsetParent 对 fixed/sticky 可能为 null；再退一步只看是否存在。 */
    el = doc.getElementById(step.target);
    return el || (step.fallback ? doc.getElementById(step.fallback) : null);
  }

  function placeHole(hole, el) {
    var pad = 8;
    var r = el.getBoundingClientRect();
    hole.style.top = Math.max(8, r.top - pad) + "px";
    hole.style.left = Math.max(8, r.left - pad) + "px";
    hole.style.width = Math.min(r.width + pad * 2, global.innerWidth - 16) + "px";
    hole.style.height = Math.min(r.height + pad * 2, global.innerHeight - 16) + "px";
  }

  function placeTip(tip, el) {
    var r = el.getBoundingClientRect();
    var tipW = tip.offsetWidth || 300;
    var tipH = tip.offsetHeight || 160;
    var gap = 14;
    var left = Math.min(
      Math.max(12, r.left + r.width / 2 - tipW / 2),
      global.innerWidth - tipW - 12
    );
    var top;
    if (r.bottom + gap + tipH < global.innerHeight - 12) {
      top = r.bottom + gap;
      tip.classList.remove("is-above");
      tip.classList.add("is-below");
    } else {
      top = Math.max(12, r.top - tipH - gap);
      tip.classList.remove("is-below");
      tip.classList.add("is-above");
    }
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }

  FC.guide = {
    KEY: KEY,
    STEPS: STEPS,

    shouldShow: function () {
      try {
        if (global.localStorage.getItem(KEY)) return false;
        /* 旧版 v1 视为未完成新教学，仍要再教一次。 */
        return true;
      } catch (e) {
        return false;
      }
    },

    dismiss: function () {
      try {
        global.localStorage.setItem(KEY, "1");
        global.localStorage.setItem("fucheng.guide.v1", "1");
      } catch (e) { /* ignore */ }
    },

    reset: function () {
      try {
        global.localStorage.removeItem(KEY);
        global.localStorage.removeItem("fucheng.guide.v1");
      } catch (e) { /* ignore */ }
    },

    isOpen: function () { return !!active; },

    show: function (opts) {
      opts = opts || {};
      return new Promise(function (resolve) {
        if (!doc || !FC.overlay) { resolve(false); return; }
        if (!opts.force && !FC.guide.shouldShow()) { resolve(false); return; }
        if (active) { resolve(false); return; }

        var step = 0;
        var host = doc.createElement("div");
        host.className = "fc-coach";
        host.setAttribute("role", "dialog");
        host.setAttribute("aria-modal", "true");
        host.innerHTML =
          '<div class="fc-coach__hole" id="coachHole" aria-hidden="true"></div>' +
          '<div class="fc-coach__tip" id="coachTip" tabindex="-1">' +
            '<p class="fc-coach__eyebrow">新手教学 · ' + STEPS.length + " 步</p>" +
            '<h2 class="fc-coach__title" id="coachTitle"></h2>' +
            '<p class="fc-coach__body" id="coachBody"></p>' +
            '<div class="fc-coach__dots" id="coachDots"></div>' +
            '<div class="fc-coach__actions">' +
              '<button type="button" class="fc-btn fc-btn--ghost" id="coachSkip">跳过</button>' +
              '<button type="button" class="fc-btn fc-btn--primary" id="coachNext">下一步</button>' +
            "</div>" +
          "</div>";

        var hole = host.querySelector("#coachHole");
        var tip = host.querySelector("#coachTip");
        var titleEl = host.querySelector("#coachTitle");
        var bodyEl = host.querySelector("#coachBody");
        var dotsEl = host.querySelector("#coachDots");
        var nextBtn = host.querySelector("#coachNext");
        var skipBtn = host.querySelector("#coachSkip");
        if (!hole || !tip || !titleEl || !bodyEl || !nextBtn) {
          resolve(false);
          return;
        }

        var highlight = null;
        var settled = false;

        function paintDots() {
          dotsEl.innerHTML = STEPS.map(function (_, i) {
            return '<span class="fc-coach__dot' + (i === step ? " is-on" : "") +
              '" aria-hidden="true"></span>';
          }).join("");
        }

        function clearHighlight() {
          if (highlight) highlight.classList.remove("fc-coach-target");
          highlight = null;
        }

        function paintStep() {
          var s = STEPS[step];
          titleEl.textContent = s.title;
          bodyEl.textContent = s.body;
          paintDots();
          clearHighlight();
          var el = resolveTarget(s);
          if (el) {
            highlight = el;
            el.classList.add("fc-coach-target");
            try { el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) { /* ignore */ }
            placeHole(hole, el);
            placeTip(tip, el);
          } else {
            hole.style.top = "20%";
            hole.style.left = "20%";
            hole.style.width = "60%";
            hole.style.height = "40%";
            tip.style.left = "50%";
            tip.style.top = "55%";
            tip.style.transform = "translateX(-50%)";
          }
          nextBtn.textContent = step >= STEPS.length - 1
            ? "开始生活"
            : "下一步 (" + (step + 1) + "/" + STEPS.length + ")";
        }

        function finish(completed) {
          if (settled) return;
          settled = true;
          if (completed || !opts.force) FC.guide.dismiss();
          clearHighlight();
          global.removeEventListener("resize", onResize);
          if (host.parentNode) host.parentNode.removeChild(host);
          FC.overlay.pop(host);
          active = null;
          resolve(!!completed);
        }

        function onResize() { paintStep(); }

        function onKey(e) {
          if (e.key === "Escape") { e.preventDefault(); finish(false); return; }
          if (e.key === "Enter") {
            e.preventDefault();
            if (step >= STEPS.length - 1) finish(true);
            else { step++; paintStep(); }
            return;
          }
          if (e.key === "Tab") FC.overlay.trap(tip, e);
        }

        nextBtn.addEventListener("click", function () {
          if (step >= STEPS.length - 1) finish(true);
          else { step++; paintStep(); }
        });
        skipBtn.addEventListener("click", function () { finish(false); });
        /* 点遮罩不关闭 —— 逐步教学必须点「下一步 / 跳过」。 */

        doc.body.appendChild(host);
        if (FC.overlay.push("modal", host)) FC.overlay.top().onKey = onKey;
        active = { host: host, finish: finish };
        global.addEventListener("resize", onResize);
        paintStep();
        tip.focus();
        host.classList.add("is-open");
      });
    }
  };
})(window);
