/* 浮城人生 · shared lightweight UI effects (no dependencies). */
(function (global) {
  "use strict";

  var motionQuery = global.matchMedia
    ? global.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function initParticles(canvas, options) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    if (!canvas || !canvas.getContext) return null;
    options = options || {};

    var context = canvas.getContext("2d", { alpha: true });
    if (!context) return null;

    var count = clamp(
      Number(options.count || canvas.getAttribute("data-particle-count")) || 84,
      12,
      120
    );
    var particles = [];
    var width = 0;
    var height = 0;
    var dpr = 1;
    var frameId = 0;
    var lastFrame = 0;
    var resizeTimer = 0;

    function random(min, max) {
      return min + Math.random() * (max - min);
    }

    function makeParticle(scatter) {
      var depth = random(0.35, 1);
      return {
        x: random(0, width),
        y: scatter ? random(0, height) : random(-40, -4),
        depth: depth,
        size: random(0.45, 1.25) * depth,
        speed: random(8, 24) * depth,
        drift: random(2, 7),
        alpha: random(0.08, 0.3) * depth,
        warm: Math.random() > 0.82
      };
    }

    function seed() {
      particles = [];
      for (var i = 0; i < count; i++) particles.push(makeParticle(true));
    }

    function resize() {
      width = Math.max(320, global.innerWidth || 320);
      height = Math.max(360, global.innerHeight || 360);
      dpr = Math.min(global.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      draw(false, 0);
    }

    function draw(update, delta) {
      context.clearRect(0, 0, width, height);
      context.save();
      context.globalCompositeOperation = "lighter";
      context.lineCap = "round";

      for (var i = 0; i < particles.length; i++) {
        var particle = particles[i];
        if (update) {
          particle.y += particle.speed * delta;
          particle.x += particle.drift * delta;
          if (particle.y > height + 10 || particle.x > width + 10) {
            particles[i] = particle = makeParticle(false);
          }
        }

        var color = particle.warm ? "255, 214, 102" : "79, 227, 255";
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(
          particle.x - particle.drift * 0.45,
          particle.y - 5 * particle.depth
        );
        context.strokeStyle = "rgba(" + color + "," + particle.alpha + ")";
        context.lineWidth = particle.size;
        context.stroke();
      }
      context.restore();
    }

    function shouldAnimate() {
      return !document.hidden && !motionQuery.matches;
    }

    function animate(time) {
      if (!shouldAnimate()) {
        frameId = 0;
        return;
      }
      if (!lastFrame) lastFrame = time;
      if (time - lastFrame >= 1000 / 30) {
        draw(true, Math.min((time - lastFrame) / 1000, 0.05));
        lastFrame = time;
      }
      frameId = global.requestAnimationFrame(animate);
    }

    function sync() {
      if (shouldAnimate() && !frameId) {
        lastFrame = 0;
        frameId = global.requestAnimationFrame(animate);
      } else if (!shouldAnimate() && frameId) {
        global.cancelAnimationFrame(frameId);
        frameId = 0;
        draw(false, 0);
      }
    }

    function onResize() {
      global.clearTimeout(resizeTimer);
      resizeTimer = global.setTimeout(resize, 140);
    }

    resize();
    sync();
    global.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", sync);
    if (motionQuery.addEventListener) motionQuery.addEventListener("change", sync);

    return {
      count: count,
      pause: function () {
        if (frameId) global.cancelAnimationFrame(frameId);
        frameId = 0;
      },
      resume: sync,
      destroy: function () {
        this.pause();
        global.clearTimeout(resizeTimer);
        global.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", sync);
        if (motionQuery.removeEventListener) motionQuery.removeEventListener("change", sync);
      }
    };
  }

  var api = global.FCUI || {};
  api.initParticles = initParticles;
  api.reducedMotion = function () { return !!motionQuery.matches; };
  global.FCUI = api;

  function autoInit() {
    var canvases = document.querySelectorAll("[data-fc-particles]");
    for (var i = 0; i < canvases.length; i++) initParticles(canvases[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit, { once: true });
  } else {
    autoInit();
  }
})(window);
