(function () {
  "use strict";

  // === DOM ===
  var vis = document.getElementById("visualizer");
  var radioAudio = document.getElementById("radio-audio");
  if (!vis) return;

  // === CANVAS (76x16 como Webamp) ===
  var canvas = document.createElement("canvas");
  var W = 76;
  var H = 16;
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.imageRendering = "pixelated";
  vis.appendChild(canvas);
  var ctx = canvas.getContext("2d");

  // === CORES VISCOLOR.TXT (Winamp 2.91) ===
  var COLORS = [
    "rgb(0,0,0)",         // 0  - background
    "rgb(24,33,41)",      // 1  - grid dots
    "rgb(239,49,16)",     // 2  - spectrum top (red)
    "rgb(206,41,16)",     // 3
    "rgb(214,90,0)",      // 4
    "rgb(214,102,0)",     // 5
    "rgb(214,115,0)",     // 6
    "rgb(198,123,8)",     // 7
    "rgb(222,165,24)",    // 8
    "rgb(214,181,33)",    // 9
    "rgb(189,222,41)",    // 10
    "rgb(148,222,33)",    // 11
    "rgb(41,206,16)",     // 12
    "rgb(50,190,16)",     // 13
    "rgb(57,181,16)",     // 14
    "rgb(49,156,8)",      // 15
    "rgb(41,148,0)",      // 16
    "rgb(24,132,8)",      // 17 - spectrum bottom (green)
    "rgb(255,255,255)",   // 18 - osc 1 (white, center)
    "rgb(214,214,222)",   // 19 - osc 2
    "rgb(181,189,189)",   // 20 - osc 3
    "rgb(160,170,175)",   // 21 - osc 4
    "rgb(148,156,165)",   // 22 - osc 5 (dim, edge)
    "rgb(150,150,150)"    // 23 - peak dots (gray)
  ];

  // === FIRE COLORS ===
  var FIRE_COLORS = [
    "rgb(0,0,0)",         // 0  - empty
    "rgb(30,0,0)",        // 1
    "rgb(60,0,0)",        // 2
    "rgb(100,0,0)",       // 3
    "rgb(140,0,0)",       // 4
    "rgb(180,10,0)",      // 5
    "rgb(210,20,0)",      // 6
    "rgb(230,30,0)",      // 7
    "rgb(240,50,0)",      // 8
    "rgb(245,70,0)",      // 9
    "rgb(250,90,0)",      // 10
    "rgb(255,110,0)",     // 11
    "rgb(255,130,10)",    // 12
    "rgb(255,155,20)",    // 13
    "rgb(255,180,30)",    // 14
    "rgb(255,200,50)",    // 15
    "rgb(255,220,80)",    // 16
    "rgb(255,240,120)"    // 17 - fire top (bright yellow)
  ];

  // === ESTADO ===
  var mode = 4; // 0=bars, 1=fire, 2=dots, 3=scope, 4=off
  var modes = ["Spectrum", "Fire", "Dots", "Scope", "Off"];

  // === AUDIO ===
  var audioCtx = null;
  var analyser = null;
  var source = null;
  var connected = false;

  // === SPECTRUM STATE ===
  var saData = new Float32Array(76);
  var saFalloff = new Float32Array(76);
  var saPeaks = new Float32Array(76);
  var saPeakDrop = new Float32Array(76);
  var barPeak = new Float32Array(76);

  var FALLOFF = 12;
  var PEAK_FALLOFF = 1.1;
  var PEAK_DROP_INIT = 3;

  // === FIRE STATE ===
  var fireData = new Float32Array(76);

  // === OSCILLOSCOPE STATE ===
  var lastOscY = 8;

  // === SETUP UNICO ===
  function setupAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;

      source = audioCtx.createMediaElementSource(radioAudio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      connected = true;
    } catch (e) {
      connected = false;
    }
  }

  // === GET FREQUENCY DATA (shared by bars, fire, dots) ===
  function getFrequencyData() {
    if (!analyser || !connected) return null;

    var dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    var maxFreqIndex = analyser.frequencyBinCount;
    var logMax = Math.log10(maxFreqIndex);
    var scale = 0.91;
    var result = new Float32Array(76);

    for (var x = 0; x < 75; x++) {
      var linearIdx = (x / 74) * (maxFreqIndex - 1);
      var logIdx = Math.pow(10, (logMax * x) / 74);
      var scaledIdx = (1.0 - scale) * linearIdx + scale * logIdx;

      var idx1 = Math.floor(scaledIdx);
      var idx2 = Math.ceil(scaledIdx);
      if (idx1 >= maxFreqIndex) idx1 = maxFreqIndex - 1;
      if (idx2 >= maxFreqIndex) idx2 = maxFreqIndex - 1;

      var val;
      if (idx1 === idx2) {
        val = dataArray[idx1];
      } else {
        var frac = scaledIdx - idx1;
        val = (1 - frac) * dataArray[idx1] + frac * dataArray[idx2];
      }

      result[x] = (val / 255) * 15;
      if (result[x] > 15) result[x] = 15;
    }

    return result;
  }

  // ====================== SPECTRUM ANALYZER (BARS) ======================

  function drawBars() {
    ctx.fillStyle = COLORS[0];
    ctx.fillRect(0, 0, W, H);

    var freqData = getFrequencyData();
    if (!freqData) return;

    for (var x = 0; x < 75; x++) {
      saData[x] = freqData[x];

      saFalloff[x] -= FALLOFF / 16.0;
      if (saFalloff[x] < saData[x]) {
        saFalloff[x] = saData[x];
      }

      if (saPeaks[x] <= Math.round(saFalloff[x])) {
        saPeaks[x] = Math.round(saFalloff[x]);
        saPeakDrop[x] = PEAK_DROP_INIT;
      }

      barPeak[x] = saPeaks[x];

      saPeaks[x] -= saPeakDrop[x];
      saPeakDrop[x] *= PEAK_FALLOFF;
      if (saPeaks[x] < 0) saPeaks[x] = 0;

      if (barPeak[x] < 1) barPeak[x] = -3;

      var barH = Math.round(saFalloff[x]);
      if (barH > 0) {
        var colorIdx = 2 + (15 - barH);
        if (colorIdx < 2) colorIdx = 2;
        if (colorIdx > 17) colorIdx = 17;

        ctx.fillStyle = COLORS[colorIdx];
        ctx.fillRect(x, H - barH, 1, barH);
      }

      if (barPeak[x] >= 1) {
        var peakY = H - Math.round(barPeak[x]) - 1;
        if (peakY >= 0 && peakY < H) {
          ctx.fillStyle = COLORS[23];
          ctx.fillRect(x, peakY, 1, 1);
        }
      }
    }
  }

  // ====================== FIRE MODE ======================

  function drawFire() {
    // Shift fire up (each frame)
    for (var x = 0; x < 76; x++) {
      fireData[x] = Math.max(0, fireData[x] - 0.8);
    }

    ctx.fillStyle = FIRE_COLORS[0];
    ctx.fillRect(0, 0, W, H);

    var freqData = getFrequencyData();
    if (!freqData) return;

    for (var x = 0; x < 75; x++) {
      var val = freqData[x];
      if (val > fireData[x]) {
        fireData[x] = val;
      }

      var fireH = Math.round(fireData[x]);
      if (fireH > 0) {
        for (var y = H - fireH; y < H; y++) {
          var relY = H - y;
          var colorIdx = Math.min(17, Math.round((relY / fireH) * 17));
          if (colorIdx < 1) colorIdx = 1;
          ctx.fillStyle = FIRE_COLORS[colorIdx];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  // ====================== DOTS MODE ======================

  function drawDots() {
    ctx.fillStyle = COLORS[0];
    ctx.fillRect(0, 0, W, H);

    var freqData = getFrequencyData();
    if (!freqData) return;

    for (var x = 0; x < 75; x++) {
      saData[x] = freqData[x];

      saFalloff[x] -= FALLOFF / 16.0;
      if (saFalloff[x] < saData[x]) {
        saFalloff[x] = saData[x];
      }

      var dotH = Math.round(saFalloff[x]);
      if (dotH > 0) {
        var colorIdx = 2 + (15 - dotH);
        if (colorIdx < 2) colorIdx = 2;
        if (colorIdx > 17) colorIdx = 17;

        var dotY = H - dotH;
        ctx.fillStyle = COLORS[colorIdx];
        ctx.fillRect(x, dotY, 1, 1);
      }
    }
  }

  // ====================== OSCILLOSCOPE ======================

  function drawScope() {
    ctx.fillStyle = COLORS[0];
    ctx.fillRect(0, 0, W, H);

    if (!analyser || !connected) return;

    var dataArray = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(dataArray);

    var bandwidth = Math.min(dataArray.length, 576);
    var sliceWidth = Math.floor(bandwidth / 75);

    for (var x = 0; x <= 75; x++) {
      var idx = x * sliceWidth;
      if (idx >= bandwidth) break;

      var amplitude = dataArray[idx];
      // CORRECAO: mapear 0-255 para 0-15, centro em 7.5
      var y = Math.round(((amplitude - 128) / 128) * 7 + 7.5);
      y = Math.max(0, Math.min(15, y));

      var top, bottom;
      if (x === 0) {
        top = y;
        bottom = y;
      } else {
        if (y >= lastOscY) {
          top = lastOscY;
          bottom = y;
        } else {
          top = y;
          bottom = lastOscY;
          if (top < bottom) top++;
        }
      }
      lastOscY = y;

      for (var py = top; py <= bottom; py++) {
        var ci = oscColorIndex(py);
        ctx.fillStyle = COLORS[18 + ci];
        ctx.fillRect(x, py, 1, 1);
      }
    }
  }

  function oscColorIndex(y) {
    if (y >= 14) return 4;
    if (y >= 12) return 3;
    if (y >= 10) return 2;
    if (y >= 8)  return 1;
    if (y >= 6)  return 0;
    if (y >= 4)  return 1;
    if (y >= 2)  return 2;
    if (y >= 0)  return 3;
    return 4;
  }

  // ====================== OFF ======================
  function drawOff() {
    ctx.fillStyle = COLORS[0];
    ctx.fillRect(0, 0, W, H);
  }

  // ====================== ANIMATION LOOP ======================
  function animate() {
    requestAnimationFrame(animate);
    if (!connected && mode !== 4) return;
    if (mode === 0) drawBars();
    else if (mode === 1) drawFire();
    else if (mode === 2) drawDots();
    else if (mode === 3) drawScope();
    else drawOff();
  }

  // ====================== CLICK TO CYCLE ======================
  function cycleMode() {
    mode = (mode + 1) % 5;
    vis.title = modes[mode];
  }

  // === RESUME ON PLAY ===
  radioAudio.addEventListener("play", function () {
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  });

  vis.style.cursor = "pointer";
  vis.addEventListener("click", function () {
    setupAudio();

    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    if (connected) {
      cycleMode();
    }
  });

  // Start with spectrum (no text message)
  vis.title = modes[mode];
  animate();
})();
