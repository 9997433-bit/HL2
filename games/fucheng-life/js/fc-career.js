/* 浮城人生 · fc-career.js — 入职选轨 + 转岗提示 */
(function (global) {
  "use strict";

  var doc = global.document;
  var FC = global.FC || (global.FC = {});

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function tracks() {
    return (FC.Sim && FC.Sim.pack && FC.Sim.pack.careerTracks) || [];
  }

  function suggestTrack(origin) {
    if (FC.Sim && FC.Sim.suggestTrack) return FC.Sim.suggestTrack(origin);
    return "staff";
  }

  var picker = null;

  FC.career = {
    needsPick: function (run) {
      return !!(run && run.career && !run.career.picked);
    },

    applyTrack: function (run, trackId) {
      if (!run || !run.career) return false;
      run.career.track = trackId || suggestTrack();
      run.career.picked = true;
      run.career.level = 0;
      run.career.kpi = 48;
      return true;
    },

    showPicker: function (opts) {
      opts = opts || {};
      return new Promise(function (resolve) {
        if (!doc || !FC.overlay || !tracks().length) { resolve(null); return; }
        if (picker || (FC.events && FC.events.isOpen())) { resolve(null); return; }

        var hint = suggestTrack(opts.origin);
        var host = doc.createElement("div");
        host.className = "fc-career-pick";
        host.innerHTML =
          '<div class="fc-career-pick__scrim"></div>' +
          '<div class="fc-career-pick__panel" role="dialog" aria-modal="true" tabindex="-1">' +
            '<p class="fc-eyebrow">CAREER TRACK · 入职选轨</p>' +
            '<h2 class="fc-career-pick__title">第一份工，你打算走哪条线？</h2>' +
            '<p class="fc-career-pick__lede">轨道决定职级名称与 KPI 成长节奏。之后仍可能转岗，但起点会影响前两年的手感。</p>' +
            '<div class="fc-career-pick__grid">' +
              tracks().map(function (tr) {
                var rec = tr.id === hint ? ' <span class="fc-career-pick__rec">推荐</span>' : "";
                return '<button type="button" class="fc-career-card" data-track="' + esc(tr.id) + '">' +
                  '<b>' + esc(tr.name) + rec + "</b>" +
                  '<span>' + esc(tr.levels[0]) + " → " + esc(tr.levels[tr.levels.length - 1]) + "</span>" +
                  "</button>";
              }).join("") +
            "</div></div>";

        var panel = host.querySelector(".fc-career-pick__panel");
        if (!panel) { resolve(null); return; }
        var settled = false;

        function finish(id) {
          if (settled) return;
          settled = true;
          host.classList.add("is-closing");
          var done = function () {
            if (host.parentNode) host.parentNode.removeChild(host);
            FC.overlay.pop(host);
            picker = null;
            resolve(id || hint);
          };
          global.setTimeout(done, 180);
        }

        function onKey(e) {
          if (e.key === "Escape") { e.preventDefault(); finish(hint); return; }
          if (e.key === "Tab") { FC.overlay.trap(panel, e); return; }
        }

        [].slice.call(host.querySelectorAll(".fc-career-card")).forEach(function (btn) {
          btn.addEventListener("click", function () {
            finish(btn.getAttribute("data-track"));
          });
        });
        var scrim = host.querySelector(".fc-career-pick__scrim");
        if (scrim) scrim.addEventListener("click", function () { finish(hint); });

        doc.body.appendChild(host);
        if (FC.overlay.push("modal", host)) FC.overlay.top().onKey = onKey;
        picker = { host: host, finish: finish };
        if (panel && panel.focus) panel.focus();
        global.requestAnimationFrame(function () { host.classList.add("is-open"); });
      });
    }
  };
})(window);
