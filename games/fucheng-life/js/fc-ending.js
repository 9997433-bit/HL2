/* 浮城人生 · fc-ending.js — life summary ritual + talent inheritance */
(function (global) {
  "use strict";

  var doc = global.document;
  var FC = global.FC || (global.FC = {});

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function grade(val) {
    if (val >= 85) return { t: "极高", c: "var(--neon-gold)" };
    if (val >= 65) return { t: "偏高", c: "var(--ok)" };
    if (val >= 40) return { t: "中等", c: "var(--text-hi)" };
    if (val >= 20) return { t: "偏低", c: "var(--neon-amber)" };
    return { t: "危险", c: "var(--bad)" };
  }

  var TALENTS = [
    { id: "hustle", name: "耐熬", desc: "收入 +8%" },
    { id: "frugal", name: "省门", desc: "账单 −5%" },
    { id: "network", name: "识人", desc: "人脉事件权重 +15%" },
    { id: "luck", name: "偏运", desc: "机遇事件 +10%" },
    { id: "study", name: "书骨", desc: "进修效果 +20%" }
  ];

  FC.ending = {
    show: function (payload) {
      return new Promise(function (resolve) {
        var root = doc.createElement("div");
        root.className = "fc-ending";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.innerHTML =
          '<div class="fc-ending__scrim"></div>' +
          '<div class="fc-ending__panel fc-glass-panel fc-glass-panel--3">' +
            '<p class="fc-eyebrow">LIFE REPORT · 人生总结</p>' +
            '<h2 class="fc-ending__title">' + esc(payload.title) + "</h2>" +
            '<p class="fc-ending__summary">' + esc(payload.summary) + "</p>" +
            '<dl class="fc-kv fc-ending__stats">' +
              payload.stats.map(function (s) {
                var g = grade(s.v);
                return "<dt>" + esc(s.k) + "</dt><dd style='color:" + g.c + "'>" +
                  esc(String(s.v)) + " · " + g.t + "</dd>";
              }).join("") +
            "</dl>" +
            '<p class="fc-quote fc-ending__inherit">带走一个印记，进入下一局：</p>' +
            '<div class="fc-ending__talents" id="talentPick"></div>' +
            '<button type="button" class="fc-btn fc-btn--primary" id="endingOk">重新入城</button>' +
          "</div>";

        doc.body.appendChild(root);
        if (FC.overlay) FC.overlay.push("modal", root);

        var pick = root.querySelector("#talentPick");
        var chosen = TALENTS[Math.floor(Math.random() * TALENTS.length)];
        TALENTS.slice(0, 3).forEach(function (t) {
          var btn = doc.createElement("button");
          btn.type = "button";
          btn.className = "fc-btn fc-btn--ghost fc-ending__talent" +
            (t.id === chosen.id ? " is-selected" : "");
          btn.dataset.id = t.id;
          btn.innerHTML = "<b>" + esc(t.name) + "</b><span>" + esc(t.desc) + "</span>";
          btn.addEventListener("click", function () {
            chosen = t;
            pick.querySelectorAll(".fc-ending__talent").forEach(function (b) {
              b.classList.toggle("is-selected", b.dataset.id === t.id);
            });
          });
          pick.appendChild(btn);
        });

        root.querySelector("#endingOk").addEventListener("click", function () {
          try {
            global.localStorage.setItem("fucheng.inheritedTalent.v1", chosen.id);
          } catch (e) { /* ignore */ }
          if (FC.overlay) FC.overlay.pop(root);
          root.remove();
          resolve({ talent: chosen.id });
        });
      });
    },

    buildPayload: function (run, era, origin, kind) {
      var meta = FC.Sim.endingMeta(kind);
      return {
        kind: kind,
        title: meta.title,
        summary: meta.summary + " 你在" + era.name + "以" + origin.name + "的身份生活了 " +
          run.months + " 个月。",
        stats: [
          { k: "现金结余", v: "¥" + run.money.toLocaleString("zh-CN") },
          { k: "健康", v: run.health },
          { k: "人脉", v: run.social },
          { k: "声望", v: run.rep },
          { k: "学历", v: run.edu },
          { k: "职业", v: FC.Sim.careerTitle(run) },
          { k: "圈层", v: "L" + FC.Sim.layerOf(run, origin) },
          { k: "年龄", v: run.age + " 岁" }
        ]
      };
    }
  };
})(window);
