/* 浮城人生 · fc-guide.js — 新手指引三步 */
(function (global) {
  "use strict";

  var doc = global.document;
  var FC = global.FC || (global.FC = {});

  var KEY = "fucheng.guide.v1";
  var STEPS = [
    {
      title: "行动点 AP",
      body: "每月 3 点行动点。先花完 AP（上班/休息/探区等），再点「推进一月」结算收支。",
      target: "mobileDock"
    },
    {
      title: "中期合约",
      body: "入城头三个月签一张人生合约（落户/首付/升职）。HUD 顶栏会一直显示进度与倒计时。",
      target: "contractHud"
    },
    {
      title: "城市事件",
      body: "推进月份后城市会敲门：重大抉择走弹窗，小插曲可能是通知或信函。选完看日志入账。",
      target: "log"
    }
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  FC.guide = {
    KEY: KEY,

    shouldShow: function () {
      try { return !global.localStorage.getItem(KEY); } catch (e) { return false; }
    },

    dismiss: function () {
      try { global.localStorage.setItem(KEY, "1"); } catch (e) { /* ignore */ }
    },

    show: function () {
      return new Promise(function (resolve) {
        if (!doc || !FC.overlay || !FC.guide.shouldShow()) { resolve(false); return; }

        var step = 0;
        var host = doc.createElement("div");
        host.className = "fc-guide";
        host.innerHTML =
          '<div class="fc-guide__scrim"></div>' +
          '<div class="fc-guide__panel fc-glass-panel" role="dialog" aria-modal="true" tabindex="-1">' +
            '<p class="fc-eyebrow">ONBOARDING · 新手指引</p>' +
            '<h2 class="fc-guide__title" id="guideTitle"></h2>' +
            '<p class="fc-guide__body" id="guideBody"></p>' +
            '<div class="fc-guide__dots" id="guideDots"></div>' +
            '<button type="button" class="fc-btn fc-btn--primary" id="guideNext">下一步</button>' +
            '<button type="button" class="fc-btn fc-btn--ghost fc-guide__skip" id="guideSkip">跳过</button>' +
          "</div>";

        var panel = host.querySelector(".fc-guide__panel");
        var titleEl = host.querySelector("#guideTitle");
        var bodyEl = host.querySelector("#guideBody");
        var dotsEl = host.querySelector("#guideDots");
        var nextBtn = host.querySelector("#guideNext");
        var skipBtn = host.querySelector("#guideSkip");
        var scrim = host.querySelector(".fc-guide__scrim");
        if (!panel || !titleEl || !bodyEl || !dotsEl || !nextBtn) {
          resolve(false);
          return;
        }

        function paintDots() {
          dotsEl.innerHTML = STEPS.map(function (_, i) {
            return '<span class="fc-guide__dot' + (i === step ? " is-on" : "") + '"></span>';
          }).join("");
        }

        function clearHighlight() {
          if (highlight) highlight.classList.remove("fc-guide-highlight");
          highlight = null;
        }

        function paintStep() {
          var s = STEPS[step];
          titleEl.textContent = s.title;
          bodyEl.textContent = s.body;
          paintDots();
          clearHighlight();
          var el = doc.getElementById(s.target);
          if (el) {
            highlight = el;
            el.classList.add("fc-guide-highlight");
          }
          nextBtn.textContent =
            step >= STEPS.length - 1 ? "开始生活" : "下一步 (" + (step + 1) + "/" + STEPS.length + ")";
        }

        var highlight = null;

        function finish() {
          FC.guide.dismiss();
          clearHighlight();
          if (host.parentNode) host.parentNode.removeChild(host);
          FC.overlay.pop(host);
          resolve(true);
        }

        function onKey(e) {
          if (e.key === "Escape") { e.preventDefault(); finish(); return; }
          if (e.key === "Tab") FC.overlay.trap(panel, e);
        }

        nextBtn.addEventListener("click", function () {
          if (step >= STEPS.length - 1) finish();
          else { step++; paintStep(); }
        });
        if (skipBtn) skipBtn.addEventListener("click", finish);
        if (scrim) scrim.addEventListener("click", finish);

        doc.body.appendChild(host);
        if (FC.overlay.push("modal", host)) FC.overlay.top().onKey = onKey;
        paintStep();
        if (panel.focus) panel.focus();
        host.classList.add("is-open");
      });
    }
  };
})(window);
