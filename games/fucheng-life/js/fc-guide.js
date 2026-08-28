/* 浮城人生 · fc-guide.js — 聚光灯式逐步教学（coach marks） */
(function (global) {
  "use strict";

  var doc = global.document;
  var FC = global.FC || (global.FC = {});

  /* v4：合约这一步补上「与闯城主目标对齐」的提示。 */
  var KEY = "fucheng.guide.v4";

  var STEPS = [
    {
      title: "① 行动点 AP",
      body: "每个月有 3 点行动点。电脑用上方按钮，手机用底部行动栏（上班、休息、探区…）把它们花完。",
      target: "actionGrid",
      fallback: "mobileDock"
    },
    {
      title: "② 探区：先选地点",
      body: "先点「探区目标」选街区，再点行动「探区」才会花 1 点 AP 去触发事件。只选地点、不点「探区」，什么都不会发生。",
      target: "locChip",
      fallback: "locPanel"
    },
    {
      title: "③ 推进一个月",
      body: "行动点用尽后，点「推进一个月」结算收支、抽城市事件。手机端它会出现在底部行动栏。",
      target: "tickBtn",
      fallback: "mobileDock"
    },
    {
      title: "④ 人生合约",
      body: "入城头三个月会让你签一张合约（落户 / 首付 / 升职）。进度条一直挂在这里，到期城市会结算。" +
        "闯城档记得让它对齐主目标：目标落户就签落户积分，攒首付就签攒首付，向上爬一层就签升职——两条进度条一起走才划算。",
      target: "contractHud",
      fallback: "vitalsPanel"
    },
    {
      title: "⑤ 生命体征",
      body: "现金、健康、人脉、声望在这里跳动。现金见底会危险，健康掉光也会提前离场。手机可点「展开」看完整项。",
      target: "vitalsPanel",
      fallback: "moneyStat"
    },
    {
      title: "⑥ 事件日志",
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
    function usable(el) {
      if (!el) return false;
      try {
        var style = global.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
      } catch (e) { /* ignore */ }
      var r = el.getBoundingClientRect();
      /* fixed 底栏 offsetParent 常为 null，改用尺寸判断 */
      return r.width > 2 && r.height > 2;
    }
    var el = doc.getElementById(step.target);
    if (usable(el)) return el;
    if (step.fallback) {
      el = doc.getElementById(step.fallback);
      if (usable(el)) return el;
    }
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

  function boxesOverlap(a, b) {
    return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  }

  /** 气泡绝不能盖住正在教的按钮；下方空间不够就改到上方或侧面。 */
  function placeTip(tip, el) {
    tip.style.transform = "";
    var r = el.getBoundingClientRect();
    var tipW = Math.max(tip.offsetWidth || 0, 280);
    var tipH = Math.max(tip.offsetHeight || 0, 160);
    var gap = 18;
    var pad = 12;
    var vw = global.innerWidth;
    var vh = global.innerHeight;
    var targetBox = {
      left: r.left - 6,
      top: r.top - 6,
      right: r.right + 6,
      bottom: r.bottom + 6
    };

    function clampPos(top, left) {
      return {
        top: Math.min(Math.max(pad, top), Math.max(pad, vh - tipH - pad)),
        left: Math.min(Math.max(pad, left), Math.max(pad, vw - tipW - pad))
      };
    }

    var candidates = [
      { top: r.top - tipH - gap, left: r.left + r.width / 2 - tipW / 2, cls: "is-above" },
      { top: r.bottom + gap, left: r.left + r.width / 2 - tipW / 2, cls: "is-below" },
      { top: r.top + r.height / 2 - tipH / 2, left: r.right + gap, cls: "is-right" },
      { top: r.top + r.height / 2 - tipH / 2, left: r.left - tipW - gap, cls: "is-left" },
      { top: pad, left: (vw - tipW) / 2, cls: "is-above" }
    ];

    /* 目标在屏幕下半：优先上方 / 右侧，避免气泡压住「推进一个月」。 */
    if (r.top > vh * 0.4) {
      candidates = [
        candidates[0],
        candidates[2],
        candidates[3],
        { top: pad + 48, left: pad, cls: "is-above" },
        candidates[1],
        candidates[4]
      ];
    }

    var chosen = null;
    var i, c, pos, box;
    for (i = 0; i < candidates.length; i++) {
      c = candidates[i];
      pos = clampPos(c.top, c.left);
      box = {
        left: pos.left,
        top: pos.top,
        right: pos.left + tipW,
        bottom: pos.top + tipH
      };
      if (!boxesOverlap(box, targetBox)) {
        chosen = { top: pos.top, left: pos.left, cls: c.cls };
        break;
      }
    }
    if (!chosen) {
      chosen = { top: pad, left: pad, cls: "is-above" };
    }

    tip.classList.remove("is-above", "is-below", "is-left", "is-right");
    tip.classList.add(chosen.cls);
    tip.style.left = chosen.left + "px";
    tip.style.top = chosen.top + "px";
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
        global.localStorage.setItem("fucheng.guide.v3", "1");
        global.localStorage.setItem("fucheng.guide.v2", "1");
        global.localStorage.setItem("fucheng.guide.v1", "1");
      } catch (e) { /* ignore */ }
    },

    reset: function () {
      try {
        global.localStorage.removeItem(KEY);
        global.localStorage.removeItem("fucheng.guide.v3");
        global.localStorage.removeItem("fucheng.guide.v2");
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
          tip.style.transform = "";
          var el = resolveTarget(s);
          function layout() {
            if (!el) {
              hole.style.top = "18%";
              hole.style.left = "18%";
              hole.style.width = "64%";
              hole.style.height = "36%";
              tip.style.left = "12px";
              tip.style.top = "12px";
              return;
            }
            placeHole(hole, el);
            placeTip(tip, el);
          }
          if (el) {
            highlight = el;
            el.classList.add("fc-coach-target");
            try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { /* ignore */ }
          }
          layout();
          /* 文案撑开高度后再量一次，避免 tipH 低估导致压住按钮。 */
          global.requestAnimationFrame(function () {
            global.requestAnimationFrame(layout);
          });
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
