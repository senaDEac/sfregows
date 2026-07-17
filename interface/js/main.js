(function () {
  "use strict";

  var sfregows = document.getElementById("sfregows");
  var main = document.getElementById("main");
  var volumeInput = document.querySelector("#volume input");
  var balanceInput = document.querySelector("#balance input");
  var volumeDiv = document.getElementById("volume");
  var balanceDiv = document.getElementById("balance");
  var radioAudio = document.getElementById("radio-audio");
  var ejectBtn = document.getElementById("eject");
  var marquee = document.querySelector("#marquee span");
  var titlebarEl = document.getElementById("titlebar");
  var shadeBtn = document.getElementById("shade");
  var minimizeBtn = document.getElementById("minimize");
  var closeBtn = document.getElementById("close");
  var aotBtn = document.getElementById("cb-aot");
  var resizeHandle = document.getElementById("resize-handle");
  var radioToggleBtn = document.getElementById("radio-button");
  var eqToggleBtn = document.getElementById("eq-button");
  var plToggleBtn = document.getElementById("pl-button");
  var videoToggleBtn = document.getElementById("video-button");

  // === TAURI ===
  var isTauri = typeof window.__TAURI__ !== "undefined" || typeof window.__TAURI_INTERNALS__ !== "undefined";
  var appWindow = null;
  if (isTauri) {
    try {
      var w = window.__TAURI__.window;
      if (w && w.getCurrent) {
        appWindow = w.getCurrent();
      }
    } catch (e) {
      console.error("[sfregows] Failed to get appWindow:", e);
      isTauri = false;
    }
  }

  // === BROWSER MODE ===
  if (!isTauri) {
    document.body.classList.add("browser-mode");
    if (sfregows) sfregows.classList.add("browser-mode");
  }

  // === STATE ===
  var isShade = false;
  var isAOT = false;
  var FULL_W = 275;
  var FULL_H = 116;
  var SHADE_H = 14;
  var ASPECT = FULL_W / FULL_H;
  var currentScale = 1;
  var radioWin = null;
  var eqVisible = false;
  var plVisible = false;
  var videoVisible = false;

  // === FILE INPUT ===
  var fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "audio/*";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  fileInput.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var url = URL.createObjectURL(file);
    if (radioAudio) {
      radioAudio.src = url;
      radioAudio.play();
      if (marquee) marquee.textContent = "FILE: " + file.name;
      if (isTauri && appWindow) {
        appWindow.emit("radio-state", { station: null, name: "FILE: " + file.name });
      }
    }
  });

  // === TITLEBAR DRAG (threshold) ===
  var dragSX, dragSY, dragPending = false;
  if (titlebarEl) {
    titlebarEl.addEventListener("mousedown", function (e) {
      if (!isTauri || !appWindow) return;
      if (e.target.closest("#option, #minimize, #shade, #close")) return;
      if (e.button !== 0) return;
      dragSX = e.screenX;
      dragSY = e.screenY;
      dragPending = true;
      document.addEventListener("mousemove", onDragIntent);
      document.addEventListener("mouseup", onDragCancel);
    });
  }
  function onDragIntent(e) {
    if (!dragPending) return;
    if (Math.abs(e.screenX - dragSX) > 3 || Math.abs(e.screenY - dragSY) > 3) {
      dragPending = false;
      document.removeEventListener("mousemove", onDragIntent);
      document.removeEventListener("mouseup", onDragCancel);
      if (appWindow) appWindow.startDragging();
    }
  }
  function onDragCancel() {
    dragPending = false;
    document.removeEventListener("mousemove", onDragIntent);
    document.removeEventListener("mouseup", onDragCancel);
  }

  // === MINIMIZE ===
  if (minimizeBtn) {
    minimizeBtn.addEventListener("mousedown", function (e) {
      e.stopPropagation(); e.preventDefault();
      if (isTauri && appWindow) appWindow.minimize();
    });
  }

  // === CLOSE ===
  if (closeBtn) {
    closeBtn.addEventListener("mousedown", function (e) {
      e.stopPropagation(); e.preventDefault();
      if (isTauri && appWindow) {
        if (radioWin) { radioWin.close(); radioWin = null; }
        appWindow.close();
      }
    });
  }

  // === SHADE MODE ===
  function toggleShade() {
    isShade = !isShade;
    if (isShade) {
      sfregows.classList.add("shade");
      if (isTauri && appWindow) {
        appWindow.setSize({ type: "Logical", width: FULL_W, height: SHADE_H });
      }
    } else {
      sfregows.classList.remove("shade");
      if (isTauri && appWindow) {
        appWindow.setSize({ type: "Logical", width: FULL_W, height: FULL_H });
      }
    }
    updateScale();
  }

  if (shadeBtn) {
    shadeBtn.addEventListener("mousedown", function (e) {
      e.stopPropagation(); e.preventDefault();
      toggleShade();
    });
  }
  if (titlebarEl) {
    titlebarEl.addEventListener("dblclick", function (e) {
      if (e.target.closest("#option, #minimize, #shade, #close")) return;
      toggleShade();
    });
  }

  // === ALWAYS ON TOP ===
  function toggleAOT() {
    isAOT = !isAOT;
    if (isTauri && appWindow) appWindow.setAlwaysOnTop(isAOT);
    if (aotBtn) aotBtn.classList.toggle("aot-active", isAOT);
  }
  if (aotBtn) {
    aotBtn.addEventListener("mousedown", function (e) {
      e.stopPropagation(); e.preventDefault();
      toggleAOT();
    });
  }

  // === RESIZE HANDLE (aspect ratio locked) ===
  if (resizeHandle) {
    var resizing = false, rsx, rsy, rsw, rsh;

    resizeHandle.addEventListener("mousedown", function (e) {
      if (!isTauri || !appWindow) return;
      e.preventDefault(); e.stopPropagation();
      resizing = true;
      rsx = e.screenX;
      rsy = e.screenY;
      rsw = window.innerWidth;
      rsh = window.innerHeight;

      document.addEventListener("mousemove", onResizeMove);
      document.addEventListener("mouseup", onResizeUp);
    });

    function onResizeMove(e) {
      if (!resizing) return;
      var dx = e.screenX - rsx;
      var dy = e.screenY - rsy;
      var delta = Math.max(dx, dy);
      var newW = Math.max(FULL_W, rsw + delta);
      var newH = newW / ASPECT;
      if (newH < (isShade ? SHADE_H : FULL_H)) {
        newH = isShade ? SHADE_H : FULL_H;
        newW = newH * ASPECT;
      }
      appWindow.setSize({ type: "Logical", width: Math.round(newW), height: Math.round(newH) });
    }

    function onResizeUp() {
      resizing = false;
      document.removeEventListener("mousemove", onResizeMove);
      document.removeEventListener("mouseup", onResizeUp);
    }
  }

  // === RADIO WINDOW ===
  var radioWin = null;
  var radioVisible = false;

  // Browser fallback stations
  var radioBrowserStations = [
    { name: "Radio 80FM", short: "80FM", logo: "images/radios/radio80fm.png", url: "http://104.247.221.130:9020/;" },
    { name: "89FM SP", short: "89fm", logo: "images/radios/89fm.png", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_89FM.mp3" },
    { name: "Jovem Pan Noticias SP", short: "jovempan", logo: "images/radios/jovempan.png", url: "https://ice.fabricahost.com.br/jovempanourinhos/" },
    { name: "KISS FM SP", short: "kissfm", logo: "images/radios/kissfm.png", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_KISSFMAAC.aac" },
    { name: "Antena 1 SP", short: "antena1", logo: "images/radios/antena1.png", url: "https://antenaone.crossradio.com.br/stream/1" },
    { name: "Transamerica SP", short: "transamerica", logo: "images/radios/transamerica.png", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RT_SPAAC.aac" },
    { name: "Cidade", short: "cidade", logo: "images/radios/cidade.png", url: "https://s06.hstbr.net:8042/live" },
    { name: "Band News FM", short: "bandnews", logo: "images/radios/bandnewsfm_rj.png", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/BANDNEWSFM.aac" },
    { name: "Alpha FM SP", short: "alphafm", logo: "images/radios/alphafmsp.png", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_ALPHAFM.mp3" }
  ];

  // === TAURI: show/hide pre-defined radio window ===
  async function toggleRadioTauri() {
    try {
      var WebviewWindow = window.__TAURI__.webviewWindow.WebviewWindow;
      if (!WebviewWindow) return false;

      if (!radioWin) {
        radioWin = await WebviewWindow.getByLabel("radio");
      }
      if (!radioWin) return false;

      var vis = await radioWin.isVisible();
      if (vis) {
        await radioWin.hide();
        radioVisible = false;
      } else {
        await radioWin.show();
        await radioWin.setFocus();
        radioVisible = true;
      }
      return true;
    } catch (err) {
      console.error("[sfregows] Radio toggle error:", err);
      return false;
    }
  }

  // === BROWSER: window.open with inline HTML ===
  function toggleRadioBrowser() {
    if (radioWin && !radioWin.closed) {
      radioWin.close();
      radioWin = null;
      return;
    }
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>Sfregows Radio</title><style>' +
      '*{margin:0;padding:0;box-sizing:border-box}' +
      'body{background:#1a1a2e;color:#eee;font-family:sans-serif;padding:12px;min-height:100vh}' +
      'h2{font-size:14px;margin-bottom:8px;color:#00ff00;text-shadow:0 0 3px #00ff00}' +
      '.s{display:flex;align-items:center;gap:10px;padding:8px;cursor:pointer;border-radius:4px;transition:background .15s}' +
      '.s:hover{background:#333}' +
      '.s img{width:40px;height:40px;border-radius:4px;object-fit:cover}' +
      '.s .n{font-size:13px}' +
      '.np{font-size:11px;color:#888;border-bottom:1px solid #333;padding-bottom:8px;margin-bottom:8px}' +
      '</style></head><body>' +
      '<h2>Sfregows Radio</h2>' +
      '<div class="np" id="np">No station selected</div>' +
      '<div id="list"></div>' +
      '<script>' +
      'var st=' + JSON.stringify(radioBrowserStations) + ';' +
      'var list=document.getElementById("list");' +
      'var np=document.getElementById("np");' +
      'st.forEach(function(s){' +
      '  var d=document.createElement("div");d.className="s";' +
      '  d.innerHTML="<img src=\x27"+s.logo+"\x27><div class=\x27n\x27>"+s.name+"</div>";' +
      '  d.onclick=function(){np.textContent="Playing: "+s.name;window.opener.postMessage({action:"radio-play",url:s.url,name:s.name,short:s.short},"*");};' +
      '  list.appendChild(d);' +
      '});' +
      '</script></body></html>';
    var blob = new Blob([html], { type: "text/html" });
    radioWin = window.open(URL.createObjectURL(blob), "sfregows-radio", "width=340,height=420");
    if (radioWin) {
      radioWin.onbeforeunload = function () { radioWin = null; };
    }
  }

  // === UNIFIED TOGGLE ===
  async function toggleRadioWindow() {
    if (isTauri) {
      var ok = await toggleRadioTauri();
      if (ok) {
        if (radioVisible) {
          radioToggleBtn.classList.add("selected");
        } else {
          radioToggleBtn.classList.remove("selected");
        }
        return;
      }
    }
    // Browser fallback
    toggleRadioBrowser();
    if (radioWin && !radioWin.closed) {
      radioToggleBtn.classList.add("selected");
    } else {
      radioToggleBtn.classList.remove("selected");
    }
  }

  if (radioToggleBtn) {
    radioToggleBtn.addEventListener("mousedown", function (e) {
      e.stopPropagation(); e.preventDefault();
      toggleRadioWindow();
    });
  }

  // === GENERIC WINDOW TOGGLE (eq, pl, video) ===
  var subWindows = {};

  async function toggleSubWindow(label, url, width, height) {
    // Browser fallback
    if (!isTauri) {
      if (subWindows[label] && !subWindows[label].closed) {
        subWindows[label].close();
        subWindows[label] = null;
        return { visible: false };
      }
      subWindows[label] = window.open(url, "sfregows-" + label, "width=" + width + ",height=" + height);
      if (subWindows[label]) {
        subWindows[label].onbeforeunload = function () { subWindows[label] = null; };
      }
      return { visible: !!subWindows[label] };
    }
    // Tauri
    try {
      var WebviewWindow = window.__TAURI__.webviewWindow.WebviewWindow;
      if (!WebviewWindow) return { visible: false };
      var win = await WebviewWindow.getByLabel(label);
      if (!win) return { visible: false };
      var vis = await win.isVisible();
      if (vis) { await win.hide(); return { visible: false }; }
      else { await win.show(); await win.setFocus(); return { visible: true }; }
    } catch (err) {
      console.error("[sfregows] " + label + " toggle error:", err);
      return { visible: false };
    }
  }

  // === EQ TOGGLE ===
  if (eqToggleBtn) {
    eqToggleBtn.addEventListener("mousedown", async function (e) {
      e.stopPropagation(); e.preventDefault();
      var r = await toggleSubWindow("eq", "eq.html", 275, 116);
      eqVisible = r.visible;
      eqToggleBtn.classList.toggle("selected", eqVisible);
    });
  }

  // === PL TOGGLE ===
  if (plToggleBtn) {
    plToggleBtn.addEventListener("mousedown", async function (e) {
      e.stopPropagation(); e.preventDefault();
      var r = await toggleSubWindow("pl", "pl.html", 275, 332);
      plVisible = r.visible;
      plToggleBtn.classList.toggle("selected", plVisible);
    });
  }

  // === VIDEO TOGGLE ===
  if (videoToggleBtn) {
    videoToggleBtn.addEventListener("mousedown", async function (e) {
      e.stopPropagation(); e.preventDefault();
      var r = await toggleSubWindow("video", "video.html", 275, 184);
      videoVisible = r.visible;
      videoToggleBtn.classList.toggle("selected", videoVisible);
    });
  }

  // === RADIO EVENTS (Tauri inter-window communication) ===
  if (isTauri) {
    window.__TAURI__.event.listen("radio-action", function (event) {
      var p = event.payload;
      console.log("[main] radio-action received:", p);
      if (p.action === "play") {
        radioAudio.src = p.url;
        radioAudio.play().catch(function () {});
        if (marquee) marquee.textContent = "RADIO: " + (p.short || p.name);
        if (appWindow) {
          appWindow.emit("radio-state", { station: p.url, name: p.short || p.name });
        }
      } else if (p.action === "stop") {
        radioAudio.pause();
        radioAudio.removeAttribute("src");
        radioAudio.load();
        if (marquee) marquee.textContent = "Sfregows - Music Player";
        if (appWindow) {
          appWindow.emit("radio-state", { station: null, name: null });
        }
      }
    });

    window.__TAURI__.event.listen("radio-hide", function () {
      radioVisible = false;
      if (radioToggleBtn) radioToggleBtn.classList.remove("selected");
    });

    // === EQ EVENTS ===
    window.__TAURI__.event.listen("eq-action", function (event) {
      var p = event.payload;
      console.log("[main] eq-action:", p);
    });
    window.__TAURI__.event.listen("eq-hide", function () {
      eqVisible = false;
      if (eqToggleBtn) eqToggleBtn.classList.remove("selected");
    });

    // === PL EVENTS ===
    window.__TAURI__.event.listen("pl-action", function (event) {
      var p = event.payload;
      console.log("[main] pl-action:", p);
      if (p.action === "play" && p.url) {
        radioAudio.src = p.url;
        radioAudio.play().catch(function () {});
        if (marquee) marquee.textContent = "PLAY: " + (p.name || "");
      } else if (p.action === "stop") {
        radioAudio.pause();
        radioAudio.removeAttribute("src");
        radioAudio.load();
        if (marquee) marquee.textContent = "Sfregows - Music Player";
      } else if (p.action === "pause") {
        if (radioAudio.paused) radioAudio.play().catch(function () {});
        else radioAudio.pause();
      }
    });
    window.__TAURI__.event.listen("pl-hide", function () {
      plVisible = false;
      if (plToggleBtn) plToggleBtn.classList.remove("selected");
    });

    // === VIDEO EVENTS ===
    window.__TAURI__.event.listen("video-action", function (event) {
      var p = event.payload;
      console.log("[main] video-action:", p);
    });
    window.__TAURI__.event.listen("video-hide", function () {
      videoVisible = false;
      if (videoToggleBtn) videoToggleBtn.classList.remove("selected");
    });

    // Browser message listener for window.open fallback
    window.addEventListener("message", function (e) {
      if (e.data && e.data.action === "radio-play") {
        radioAudio.src = e.data.url;
        radioAudio.play().catch(function () {});
        if (marquee) marquee.textContent = "RADIO: " + (e.data.short || e.data.name);
      }
    });

    radioAudio.addEventListener("play", function () {
      if (appWindow && radioAudio.src) {
        appWindow.emit("radio-state", { station: radioAudio.src, name: marquee.textContent });
      }
    });
    radioAudio.addEventListener("pause", function () {
      if (appWindow) {
        appWindow.emit("radio-state", { station: null, name: null });
      }
    });
  } else {
    // Browser: listen for postMessage from radio popup
    window.addEventListener("message", function (e) {
      if (e.data && e.data.action === "radio-play") {
        radioAudio.src = e.data.url;
        radioAudio.play().catch(function () {});
        if (marquee) marquee.textContent = "RADIO: " + (e.data.short || e.data.name);
      }
    });
  }

  // === SCALING ===
  function updateScale() {
    if (!sfregows || !main) return;
    var playerW = FULL_W;
    var playerH = isShade ? SHADE_H : FULL_H;
    var scaleX = main.clientWidth / playerW;
    var scaleY = main.clientHeight / playerH;
    currentScale = Math.min(scaleX, scaleY, 4);
    sfregows.style.transform = "scale(" + currentScale + ")";
    sfregows.style.transformOrigin = "top center";
    var offsetX = (main.clientWidth - playerW * currentScale) / 2;
    sfregows.style.marginLeft = offsetX + "px";
  }

  function updateVolumeBg() {
    if (!volumeInput || !volumeDiv) return;
    var val = parseInt(volumeInput.value, 10);
    var sprite = Math.round((val / 100) * 28);
    var offset = Math.max(0, sprite - 1) * 15;
    volumeDiv.style.backgroundPosition = "0 -" + offset + "px";
  }

  function updateBalanceBg() {
    if (!balanceInput || !balanceDiv) return;
    var val = parseInt(balanceInput.value, 10);
    var distance = Math.abs(val) / 100;
    var sprite = Math.round(distance * 27);
    var offset = sprite * 15;
    balanceDiv.style.backgroundPosition = "-9px -" + offset + "px";
  }

  function updateDigits(elem, val) {
    var str = val < 10 ? "0" + val : "" + val;
    var digits = elem.querySelectorAll(".digit");
    for (var i = 0; i < digits.length; i++) {
      digits[i].setAttribute("data-digit", str[i] || "0");
    }
  }

  function updateTime(min, sec) {
    updateDigits(document.getElementById("time"), min * 100 + sec);
  }

  window.addEventListener("resize", updateScale);
  updateScale();

  if (volumeInput) { volumeInput.addEventListener("input", updateVolumeBg); updateVolumeBg(); }
  if (balanceInput) { balanceInput.addEventListener("input", updateBalanceBg); updateBalanceBg(); }
  updateTime(0, 0);

  var buttons = document.querySelectorAll("#actions div, #eject, #shuffle-repeat div, #windows div");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener("mousedown", function (e) { e.preventDefault(); });
  }

  if (ejectBtn) {
    ejectBtn.addEventListener("click", function () { fileInput.click(); });
  }

  window._sfregows = {
    updateTime: updateTime,
    isShade: function () { return isShade; }
  };
})();
