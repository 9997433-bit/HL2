/* 浮城人生 · screens.js
   Story-schema adapters + tiny save-state helpers for the core screens.
   Content lives in data/story.json; this file only maps it for legacy views. */
(function (global) {
  "use strict";

  var SAVE_KEY = "fucheng.save.v1";
  var FC = global.FC || (global.FC = {});

  /* --------------------------------------------------------------- state */
  function read() {
    try {
      return JSON.parse(global.localStorage.getItem(SAVE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function write(patch) {
    var next = read();
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) next[k] = patch[k];
    }
    try {
      global.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch (e) {
      /* private mode / file:// — the screens still work, just without memory */
    }
    return next;
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id || list[i].storyId === id || list[i].legacyId === id) return list[i];
    }
    return null;
  }

  function money(value) {
    var number = Number(value) || 0;
    return "¥ " + number.toLocaleString("zh-CN");
  }

  function adaptEra(era) {
    return {
      id: era.id,
      name: era.name,
      yearAnchor: era.yearAnchor,
      startYear: era.simulationStartYear || era.yearAnchor,
      years: era.yearLabel || String(era.yearAnchor),
      glyph: era.glyph || era.name.charAt(0),
      tint: era.color,
      desc: era.description || era.tagline,
      line: era.tagline,
      tags: era.tags || [],
      stats: era.stats || { opportunity: 50, threshold: 50, volatility: 50 },
      start: {
        layer: era.start && era.start.layer || 1,
        money: money(era.start && era.start.money),
        note: era.start && era.start.note || ""
      }
    };
  }

  function adaptOrigin(origin) {
    var stats = origin.uiStats || {};
    return {
      /* Existing saves use O01…O10; storyId retains the canonical JSON id. */
      id: origin.legacyId || origin.id,
      storyId: origin.id,
      legacyId: origin.legacyId,
      name: origin.name,
      en: origin.englishName || origin.id.toUpperCase(),
      glyph: origin.glyph || origin.name.charAt(0),
      layer: origin.layer || 1,
      desc: origin.description,
      line: origin.tagline || origin.description,
      tags: origin.tags || [],
      mods: {
        money: stats.money == null ? 50 : stats.money,
        health: stats.health == null ? 50 : stats.health,
        social: stats.social == null ? 50 : stats.social,
        edu: stats.education == null ? 50 : stats.education
      },
      statModifiers: origin.statModifiers,
      start: money(origin.startMoney)
    };
  }

  function adaptLayer(layer) {
    return {
      id: layer.id,
      name: layer.name,
      key: layer.key || layer.id.toLowerCase(),
      description: layer.description,
      unlockLevel: layer.unlockLevel,
      color: layer.color
    };
  }

  function installStory(story) {
    FC.ERAS = story.eras.map(adaptEra);
    FC.ORIGINS = story.origins.map(adaptOrigin);
    FC.LAYERS = story.layers.map(adaptLayer);
    FC.EVENTS = story.events;
    FC.uiCopy = story.uiCopy;
    return story;
  }

  FC.ERAS = FC.ERAS || [];
  FC.ORIGINS = FC.ORIGINS || [];
  FC.LAYERS = FC.LAYERS || [];
  FC.EVENTS = FC.EVENTS || [];
  FC.read = read;
  FC.write = write;
  FC.byId = byId;
  FC.era = function () {
    return byId(FC.ERAS, read().eraId) || FC.ERAS[FC.ERAS.length - 1] || null;
  };
  FC.origin = function () {
    return byId(FC.ORIGINS, read().originId) || FC.ORIGINS[0] || null;
  };
  FC.esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };

  if (FC.story) installStory(FC.story);
  if (FC.ready) {
    FC.ready = FC.ready.then(installStory);
  } else {
    FC.ready = Promise.reject(new Error("story-loader.js must load before screens.js"));
  }
})(window);
