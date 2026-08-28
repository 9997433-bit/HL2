/* 浮城人生 · story-loader.js
   Loads the story SSOT and publishes a stable window.FC.story shape. */
(function (global) {
  "use strict";

  var FC = global.FC || (global.FC = {});
  var script = global.document && global.document.currentScript;
  var explicitPath = script && script.getAttribute("data-story-src");
  var storyUrl;

  if (explicitPath) {
    storyUrl = new URL(explicitPath, global.document.baseURI).href;
  } else if (script && script.src) {
    storyUrl = new URL("../data/story.json", script.src).href;
  } else {
    storyUrl = new URL("./data/story.json", global.location.href).href;
  }

  function normalize(raw) {
    if (!raw || !Array.isArray(raw.eras) || !Array.isArray(raw.origins)) {
      throw new Error("story.json is missing eras or origins");
    }

    var layers = raw.layers || raw.cityLayers;
    var events = raw.events || raw.sampleEvents;
    if (!Array.isArray(layers) || !Array.isArray(events)) {
      throw new Error("story.json is missing cityLayers or sampleEvents");
    }

    return {
      eras: raw.eras,
      origins: raw.origins,
      layers: layers,
      events: events,
      uiCopy: raw.uiCopy || {}
    };
  }

  function publish(raw) {
    FC.story = normalize(raw);
    FC.storyError = null;
    return FC.story;
  }

  function loadFileSync() {
    return new Promise(function (resolve, reject) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", storyUrl, false);
        xhr.send(null);
        if ((xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) && xhr.responseText) {
          resolve(publish(JSON.parse(xhr.responseText)));
          return;
        }
        reject(new Error("Unable to read local story.json (status " + xhr.status + ")"));
      } catch (error) {
        reject(error);
      }
    });
  }

  function loadHttp() {
    if (typeof global.fetch === "function") {
      return global.fetch(storyUrl, { cache: "no-store" }).then(function (response) {
        if (!response.ok) throw new Error("Unable to load story.json (HTTP " + response.status + ")");
        return response.json();
      }).then(publish);
    }

    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", storyUrl, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(publish(JSON.parse(xhr.responseText)));
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error("Unable to load story.json (HTTP " + xhr.status + ")"));
        }
      };
      xhr.send(null);
    });
  }

  FC.storyUrl = storyUrl;
  FC.loadStory = function () {
    var task = global.location.protocol === "file:" ? loadFileSync() : loadHttp();
    return task.catch(function (error) {
      FC.storyError = error;
      throw error;
    });
  };
  FC.ready = FC.loadStory();
})(window);
