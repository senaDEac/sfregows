(function () {
  "use strict";

  var isTauri = typeof window.__TAURI__ !== "undefined" || typeof window.__TAURI_INTERNALS__ !== "undefined";
  var myWindow = null;

  if (isTauri) {
    try {
      if (window.__TAURI__ && window.__TAURI__.window && window.__TAURI__.window.getCurrent) {
        myWindow = window.__TAURI__.window.getCurrent();
      } else if (window.__TAURI__ && window.__TAURI__.webviewWindow) {
        var W = window.__TAURI__.webviewWindow.WebviewWindow;
        if (W && W.getCurrent) myWindow = W.getCurrent();
      }
    } catch (e) {
      isTauri = false;
    }
  }

  // === STATE ===
  var eqEnabled = false;
  var autoEnabled = false;
  var bands = { preamp: 0, 60: 0, 170: 0, 310: 0, 600: 0, "1k": 0, "3k": 0, "6k": 0, "12k": 0, "14k": 0, "16k": 0 };
  var bandOrder = ["60", "170", "310", "600", "1k", "3k", "6k", "12k", "14k", "16k"];

  // === PRESETS ===
  var presets = {
    flat:       { 60: 0, 170: 0, 310: 0, 600: 0, "1k": 0, "3k": 0, "6k": 0, "12k": 0, "14k": 0, "16k": 0 },
    rock:       { 60: 5, 170: 4, 310: -3, 600: -5, "1k": -2, "3k": 3, "6k": 6, "12k": 7, "14k": 7, "16k": 7 },
    pop:        { 60: -1, 170: 3, 310: 5, 600: 5, "1k": 3, "3k": -1, "6k": -2, "12k": -2, "14k": -1, "16k": -1 },
    classical:  { 60: 0, 170: 0, 310: 0, 600: 0, "1k": 0, "3k": 0, "6k": -5, "12k": -5, "14k": -5, "16k": -8 },
    techno:     { 60: 6, 170: 5, 310: 0, 600: -4, "1k": -3, "3k": 0, "6k": 5, "12k": 6, "14k": 6, "16k": 5 },
    jazz:       { 60: 4, 170: 3, 310: 1, 600: 2, "1k": -2, "3k": -2, "6k": 0, "12k": 2, "14k": 3, "16k": 4 },
    dance:      { 60: 7, 170: 6, 310: 2, 600: 0, "1k": 0, "3k": -4, "6k": -5, "12k": -5, "14k": 0, "16k": 0 },
    fullbass:   { 60: 8, 170: 8, 310: 8, 600: 5, "1k": -1, "3k": -4, "6k": -5, "12k": -5, "14k": -5, "16k": -5 },
    fulltreble: { 60: -7, 170: -7, 310: -7, 600: -3, "1k": 2, "3k": 8, "6k": 10, "12k": 10, "14k": 10, "16k": 10 },
    laptop:     { 60: 4, 170: 8, 310: 4, 600: -2, "1k": -1, "3k": 1, "6k": 3, "12k": 6, "14k": 8, "16k": 8 },
    live:       { 60: -3, 170: 0, 310: 3, 600: 4, "1k": 4, "3k": 4, "6k": 3, "12k": 2, "14k": 2, "16k": 1 },
    party:      { 60: 6, 170: 6, 310: 0, 600: 0, "1k": 0, "3k": 0, "6k": 0, "12k": 0, "14k": 4, "16k": 4 },
    reggae:     { 60: 0, 170: 0, 310: 0, 600: -3, "1k": 0, "3k": 4, "6k": 4, "12k": 0, "14k": 0, "16k": 0 },
    soft:       { 60: 3, 170: 1, 310: 0, 600: -1, "1k": 0, "3k": 0, "6k": 2, "12k": 5, "14k": 6, "16k": 7 },
    ska:        { 60: -2, 170: -3, 310: -2, 600: 0, "1k": 3, "3k": 5, "6k": 6, "12k": 6, "14k": 6, "16k": 6 }
  };

  // === ELEMENTS ===
  var onBtn = document.getElementById("eq-on");
  var autoBtn = document.getElementById("eq-auto");
  var presetsBtn = document.getElementById("eq-presets-btn");
  var presetsDropdown = document.getElementById("eq-presets-dropdown");
  var canvas = document.getElementById("eq-canvas");
  var ctx = canvas ? canvas.getContext("2d") : null;
  var sliders = document.querySelectorAll(".eq-slider");

  // === EMIT ===
  function emitEq(action, data) {
    if (!isTauri) return;
    try {
      window.__TAURI__.event.emit("eq-action", Object.assign({ action: action }, data || {}));
    } catch (e) {
      console.error("[eq] emit failed:", e);
    }
  }

  // === ON/OFF ===
  if (onBtn) {
    onBtn.addEventListener("click", function () {
      eqEnabled = !eqEnabled;
      onBtn.classList.toggle("active", eqEnabled);
      emitEq("toggle", { enabled: eqEnabled });
    });
  }

  // === AUTO ===
  if (autoBtn) {
    autoBtn.addEventListener("click", function () {
      autoEnabled = !autoEnabled;
      autoBtn.classList.toggle("active", autoEnabled);
      emitEq("auto", { auto: autoEnabled });
    });
  }

  // === SLIDERS ===
  sliders.forEach(function (slider) {
    slider.addEventListener("input", function () {
      var band = this.closest(".eq-band").getAttribute("data-band");
      var val = parseInt(this.value, 10);
      bands[band] = val;
      emitEq("band", { band: band, value: val });
      drawSpline();
    });
  });

  // === PRESETS ===
  if (presetsBtn) {
    presetsBtn.addEventListener("click", function () {
      presetsDropdown.classList.toggle("hidden");
    });
  }

  document.querySelectorAll(".preset-item").forEach(function (item) {
    item.addEventListener("click", function () {
      var name = this.getAttribute("data-preset");
      var p = presets[name];
      if (!p) return;
      Object.keys(p).forEach(function (band) {
        bands[band] = p[band];
        var slider = document.querySelector('.eq-band[data-band="' + band + '"] .eq-slider');
        if (slider) slider.value = p[band];
      });
      emitEq("preset", { name: name, bands: p });
      drawSpline();
      presetsDropdown.classList.add("hidden");
    });
  });

  // === SPLINE DRAWING ===
  function drawSpline() {
    if (!ctx) return;
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw center line
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Draw band points
    var points = [];
    for (var i = 0; i < bandOrder.length; i++) {
      var x = (i / (bandOrder.length - 1)) * w;
      var val = bands[bandOrder[i]];
      var y = h / 2 - (val / 12) * (h / 2);
      points.push({ x: x, y: y });
    }

    // Draw spline
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (var i = 1; i < points.length; i++) {
      var prev = points[i - 1];
      var curr = points[i];
      var cpx = (prev.x + curr.x) / 2;
      ctx.quadraticCurveTo(prev.x + (cpx - prev.x) * 0.5, prev.y, cpx, (prev.y + curr.y) / 2);
      ctx.quadraticCurveTo(curr.x - (curr.x - cpx) * 0.5, curr.y, curr.x, curr.y);
    }
    ctx.stroke();

    // Draw points
    for (var i = 0; i < points.length; i++) {
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(points[i].x - 1, points[i].y - 1, 3, 3);
    }
  }

  // === CLOSE ===
  var closeBtn = document.getElementById("eq-close");
  if (closeBtn) {
    closeBtn.addEventListener("mousedown", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (isTauri && myWindow) {
        myWindow.hide();
        emitEq("eq-hide");
      } else {
        window.close();
      }
    });
  }

  // === TITLEBAR DRAG ===
  var titlebar = document.getElementById("eq-titlebar");
  var dragSX, dragSY, dragPending = false;
  if (titlebar) {
    titlebar.addEventListener("mousedown", function (e) {
      if (!isTauri || !myWindow) return;
      if (e.target.closest("#eq-close")) return;
      if (e.button !== 0) return;
      dragSX = e.screenX;
      dragSY = e.screenY;
      dragPending = true;
      document.addEventListener("mousemove", onDrag);
      document.addEventListener("mouseup", offDrag);
    });
  }
  function onDrag(e) {
    if (!dragPending) return;
    if (Math.abs(e.screenX - dragSX) > 3 || Math.abs(e.screenY - dragSY) > 3) {
      dragPending = false;
      document.removeEventListener("mousemove", onDrag);
      document.removeEventListener("mouseup", offDrag);
      if (myWindow) myWindow.startDragging();
    }
  }
  function offDrag() {
    dragPending = false;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", offDrag);
  }

  // === LISTEN STATE ===
  if (isTauri) {
    window.__TAURI__.event.listen("eq-state", function (event) {
      var p = event.payload;
      if (p && p.bands) {
        Object.keys(p.bands).forEach(function (band) {
          bands[band] = p.bands[band];
          var slider = document.querySelector('.eq-band[data-band="' + band + '"] .eq-slider');
          if (slider) slider.value = p.bands[band];
        });
        drawSpline();
      }
      if (typeof p.enabled === "boolean") {
        eqEnabled = p.enabled;
        if (onBtn) onBtn.classList.toggle("active", eqEnabled);
      }
    });
  }

  // === INIT ===
  drawSpline();
})();
