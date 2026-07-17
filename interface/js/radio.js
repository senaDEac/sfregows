(function () {
  "use strict";

  var radioAudio = document.getElementById("radio-audio");
  var marquee = document.querySelector("#marquee span");
  var stopBtn = document.getElementById("stop");

  // === STOP ===
  if (stopBtn) {
    stopBtn.addEventListener("click", function () {
      if (radioAudio && radioAudio.src) {
        radioAudio.pause();
        radioAudio.removeAttribute("src");
        radioAudio.load();
        if (marquee) marquee.textContent = "Sfregows - Music Player";

        var isTauri = typeof window.__TAURI__ !== "undefined";
        if (isTauri) {
          try {
            var appWindow = window.__TAURI__.window.getCurrent();
            appWindow.emit("radio-state", { station: null, name: null });
          } catch (e) {}
        }
      }
    });
  }

  // === Expose for main.js ===
  window._sfregowsRadio = {
    getAudio: function () { return radioAudio; },
    getMarquee: function () { return marquee; }
  };
})();
