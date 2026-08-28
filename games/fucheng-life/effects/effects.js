(function () {
  "use strict";

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canvas = document.getElementById("city-rain");
  const particleOutput = document.querySelector("[data-particle-count]");
  const motionToggle = document.querySelector("[data-motion-toggle]");
  const motionLabel = document.querySelector("[data-motion-label]");
  const ctx = canvas && canvas.getContext("2d", { alpha: true });

  let manuallyPaused = false;
  let pageVisible = !document.hidden;
  let animationFrame = 0;
  let lastFrameTime = 0;
  let resizeTimer = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rain = [];
  let lights = [];
  let motes = [];
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const random = (min, max) => min + Math.random() * (max - min);

  class RainDrop {
    constructor(initial) {
      this.reset(initial);
    }

    reset(initial) {
      this.depth = random(.24, 1);
      this.x = random(-width * .15, width * 1.1);
      this.y = initial ? random(-height * .1, height) : random(-height * .3, -20);
      this.length = random(10, 36) * this.depth;
      this.speed = random(4.5, 13) * this.depth;
      this.alpha = random(.08, .34) * this.depth;
      this.width = Math.max(.35, this.depth * .9);
    }

    update() {
      this.y += this.speed;
      this.x += .45 + pointer.x * 1.35 * this.depth;
      if (this.y > height + this.length || this.x > width + 50) {
        this.reset(false);
      }
    }

    draw() {
      const drift = 3 + pointer.x * 8 * this.depth;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + drift, this.y + this.length);
      ctx.strokeStyle = `rgba(79, 227, 255, ${this.alpha})`;
      ctx.lineWidth = this.width;
      ctx.stroke();
    }
  }

  class CityLight {
    constructor() {
      this.x = random(0, width);
      this.y = random(height * .48, height * .98);
      this.radius = random(.35, 1.7);
      this.alpha = random(.1, .62);
      this.pulse = random(0, Math.PI * 2);
      this.speed = random(.006, .02);
      this.warm = Math.random() > .62;
      this.heightScale = random(.8, 1.8);
    }

    update() {
      this.pulse += this.speed;
    }

    draw() {
      const glow = this.alpha * (.72 + Math.sin(this.pulse) * .28);
      const x = this.x + pointer.x * (this.y / height) * 5;
      const y = this.y + pointer.y * 2;
      ctx.fillStyle = this.warm
        ? `rgba(255, 203, 119, ${glow})`
        : `rgba(79, 227, 255, ${glow})`;
      ctx.fillRect(x, y, this.radius, this.radius * this.heightScale);
    }
  }

  class Mote {
    constructor(initial) {
      this.reset(initial);
    }

    reset(initial) {
      this.x = random(0, width);
      this.y = initial ? random(0, height) : height + 10;
      this.radius = random(.35, 1.2);
      this.speed = random(.08, .34);
      this.alpha = random(.08, .28);
      this.phase = random(0, Math.PI * 2);
    }

    update() {
      this.phase += .008;
      this.y -= this.speed;
      this.x += Math.sin(this.phase) * .12 + pointer.x * .04;
      if (this.y < -10) this.reset(false);
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(174, 114, 255, ${this.alpha})`;
      ctx.fill();
    }
  }

  function createParticleField() {
    const area = width * height;
    const rainCount = clamp(Math.round(area / 11500), 45, 155);
    const lightCount = clamp(Math.round(width / 8), 45, 180);
    const moteCount = clamp(Math.round(area / 26000), 20, 70);

    rain = Array.from({ length: rainCount }, () => new RainDrop(true));
    lights = Array.from({ length: lightCount }, () => new CityLight());
    motes = Array.from({ length: moteCount }, () => new Mote(true));

    if (particleOutput) {
      particleOutput.textContent = String(rainCount + lightCount + moteCount).padStart(3, "0");
    }
  }

  function resizeCanvas() {
    if (!ctx) return;
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createParticleField();
    drawFrame(false);
  }

  function drawFrame(update) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";

    pointer.x += (pointer.targetX - pointer.x) * .035;
    pointer.y += (pointer.targetY - pointer.y) * .035;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = "#4fe3ff";
    ctx.shadowBlur = 4;
    lights.forEach((light) => {
      if (update) light.update();
      light.draw();
    });
    ctx.shadowBlur = 0;
    motes.forEach((mote) => {
      if (update) mote.update();
      mote.draw();
    });
    rain.forEach((drop) => {
      if (update) drop.update();
      drop.draw();
    });
    ctx.restore();
  }

  function shouldAnimate() {
    return ctx && pageVisible && !manuallyPaused && !reducedMotionQuery.matches;
  }

  function animate(time) {
    if (time - lastFrameTime >= 1000 / 30) {
      drawFrame(true);
      lastFrameTime = time;
    }
    if (shouldAnimate()) {
      animationFrame = window.requestAnimationFrame(animate);
    } else {
      animationFrame = 0;
    }
  }

  function syncAnimationState() {
    document.body.classList.toggle("motion-paused", manuallyPaused);
    if (motionToggle) {
      motionToggle.setAttribute("aria-pressed", String(manuallyPaused));
    }
    if (motionLabel) {
      motionLabel.textContent = manuallyPaused ? "动态暂停" : "动态开启";
    }

    if (shouldAnimate() && !animationFrame) {
      animationFrame = window.requestAnimationFrame(animate);
    } else if (!shouldAnimate() && animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      drawFrame(false);
    }
  }

  if (ctx) {
    resizeCanvas();
    syncAnimationState();

    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resizeCanvas, 140);
    }, { passive: true });

    window.addEventListener("pointermove", (event) => {
      pointer.targetX = (event.clientX / Math.max(width, 1) - .5) * 2;
      pointer.targetY = (event.clientY / Math.max(height, 1) - .5) * 2;
    }, { passive: true });

    document.addEventListener("visibilitychange", () => {
      pageVisible = !document.hidden;
      syncAnimationState();
    });

    reducedMotionQuery.addEventListener("change", syncAnimationState);
  }

  if (motionToggle) {
    motionToggle.addEventListener("click", () => {
      manuallyPaused = !manuallyPaused;
      syncAnimationState();
    });
  }

  const consoleElement = document.querySelector("[data-layer-console]");
  if (consoleElement) {
    const stage = consoleElement.querySelector(".layer-stage");
    const tabs = Array.from(consoleElement.querySelectorAll("[data-layer-target]"));
    const panels = Array.from(consoleElement.querySelectorAll("[data-city-layer]"));
    const progress = consoleElement.querySelector("[data-layer-progress]");
    const colors = {
      1: { hex: "#ffb454", rgb: "255, 180, 84" },
      2: { hex: "#8fa8c8", rgb: "143, 168, 200" },
      3: { hex: "#3be8b0", rgb: "59, 232, 176" },
      4: { hex: "#f0c75e", rgb: "240, 199, 94" },
      5: { hex: "#e3255f", rgb: "227, 37, 95" }
    };
    let activeLayer = 1;
    let queuedLayer = null;
    let transitionTimer = 0;
    let revealTimer = 0;
    let transitioning = false;

    function updateControls(layer) {
      tabs.forEach((tab) => {
        const selected = Number(tab.dataset.layerTarget) === layer;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
    }

    function applyLayer(layer) {
      const color = colors[layer];
      stage.dataset.activeLayer = String(layer);
      stage.style.setProperty("--active-color", color.hex);
      stage.style.setProperty("--active-rgb", color.rgb);
      consoleElement.style.setProperty("--active-color", color.hex);
      consoleElement.style.setProperty("--active-rgb", color.rgb);
      if (progress) progress.style.width = `${layer * 20}%`;

      panels.forEach((panel) => {
        const isCurrent = Number(panel.dataset.cityLayer) === layer;
        panel.hidden = !isCurrent;
        panel.classList.toggle("is-active", isCurrent);
      });
    }

    function finishTransition() {
      stage.classList.remove("is-revealing");
      transitioning = false;
      if (queuedLayer && queuedLayer !== activeLayer) {
        const nextLayer = queuedLayer;
        queuedLayer = null;
        selectLayer(nextLayer);
      }
    }

    function selectLayer(layer) {
      if (!colors[layer]) return;
      updateControls(layer);

      if (transitioning) {
        queuedLayer = layer;
        return;
      }
      if (layer === activeLayer) return;

      if (reducedMotionQuery.matches || manuallyPaused) {
        activeLayer = layer;
        applyLayer(layer);
        return;
      }

      transitioning = true;
      stage.classList.remove("is-revealing");
      stage.classList.add("is-transitioning");

      transitionTimer = window.setTimeout(() => {
        activeLayer = layer;
        applyLayer(layer);
        stage.classList.remove("is-transitioning");
        stage.classList.add("is-revealing");
        revealTimer = window.setTimeout(finishTransition, 760);
      }, 540);
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => selectLayer(Number(tab.dataset.layerTarget)));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        let nextIndex = index;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = tabs.length - 1;
        tabs[nextIndex].focus();
        selectLayer(Number(tabs[nextIndex].dataset.layerTarget));
      });
    });

    applyLayer(activeLayer);

    window.addEventListener("pagehide", () => {
      window.clearTimeout(transitionTimer);
      window.clearTimeout(revealTimer);
    }, { once: true });
  }

  const sections = Array.from(document.querySelectorAll(".effect-section"));
  const navigationLinks = Array.from(document.querySelectorAll(".topbar__nav a"));
  if ("IntersectionObserver" in window && sections.length && navigationLinks.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navigationLinks.forEach((link) => {
          const isCurrent = link.hash === `#${entry.target.id}`;
          link.toggleAttribute("aria-current", isCurrent);
        });
      });
    }, { rootMargin: "-30% 0px -62% 0px" });
    sections.forEach((section) => sectionObserver.observe(section));
  }
})();
