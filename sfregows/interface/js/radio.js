(function () {
  "use strict";

  var isTauri = typeof window.__TAURI__ !== "undefined" || typeof window.__TAURI_INTERNALS__ !== "undefined";
  var myWindow = null;

  if (isTauri) {
    try {
      if (window.__TAURI__ && window.__TAURI__.window && window.__TAURI__.window.getCurrent) {
        myWindow = window.__TAURI__.window.getCurrent();
      } else if (window.__TAURI__ && window.__TAURI__.webviewWindow) {
        var AppWindow = window.__TAURI__.webviewWindow.WebviewWindow;
        if (AppWindow && AppWindow.getCurrent) {
          myWindow = AppWindow.getCurrent();
        }
      }
    } catch (e) {
      console.error("[radio] Failed to get window:", e);
      isTauri = false;
    }
  }

  var stations = [
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

  var list = document.getElementById("radio-station-list");
  var nowPlaying = document.querySelector("#now-playing span");
  var closeBtn = document.getElementById("radio-close");
  var titlebar = document.getElementById("radio-titlebar");
  var activeStation = null;

  function emitRadio(action, data) {
    if (!isTauri) {
      console.warn("[radio] isTauri=false, emitRadio skipped");
      return;
    }
    try {
      var payload = Object.assign({ action: action }, data || {});
      console.log("[radio] emit radio-action:", payload);
      window.__TAURI__.event.emit("radio-action", payload);
    } catch (e) {
      console.error("[radio] emit failed:", e);
    }
  }

  stations.forEach(function (s) {
    var img = document.createElement("img");
    img.className = "station";
    img.src = s.logo;
    img.title = s.name;
    img.setAttribute("data-url", s.url);
    img.addEventListener("click", function () {
      if (activeStation === s.url) {
        activeStation = null;
        clearActive();
        nowPlaying.textContent = "No station";
        emitRadio("stop");
      } else {
        activeStation = s.url;
        clearActive();
        img.classList.add("active");
        nowPlaying.textContent = s.name;
        emitRadio("play", { url: s.url, name: s.name, short: s.short, logo: s.logo });
      }
    });
    list.appendChild(img);
  });

  function clearActive() {
    var items = list.querySelectorAll(".station");
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove("active");
    }
  }

  console.log("[radio] isTauri:", isTauri, "myWindow:", !!myWindow);

  if (isTauri) {
    window.__TAURI__.event.listen("radio-state", function (event) {
      var payload = event.payload;
      if (payload && payload.station) {
        activeStation = payload.station;
        nowPlaying.textContent = payload.name || payload.station;
        clearActive();
        var items = list.querySelectorAll(".station");
        for (var i = 0; i < items.length; i++) {
          if (items[i].getAttribute("data-url") === payload.station) {
            items[i].classList.add("active");
          }
        }
      } else {
        activeStation = null;
        clearActive();
        nowPlaying.textContent = "No station";
      }
    });
  }

  // === CLOSE: hide instead of close so window can be re-shown ===
  if (closeBtn) {
    closeBtn.addEventListener("mousedown", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (isTauri && myWindow) {
        myWindow.hide();
        emitRadio("radio-hide");
      } else {
        window.close();
      }
    });
  }

  // === TITLEBAR DRAG ===
  var dragSX, dragSY, dragPending = false;
  if (titlebar) {
    titlebar.addEventListener("mousedown", function (e) {
      if (!isTauri || !myWindow) return;
      if (e.target.closest("#radio-close")) return;
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

  // === RESIZE ===
  var resizeHandle = document.getElementById("radio-resize");
  if (resizeHandle && isTauri && myWindow) {
    var resizing = false, rsx, rsy, rsw, rsh;
    var ASPECT = 275 / 400;

    resizeHandle.addEventListener("mousedown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      resizing = true;
      rsx = e.screenX;
      rsy = e.screenY;
      rsw = window.innerWidth;
      rsh = window.innerHeight;
      document.addEventListener("mousemove", onResize);
      document.addEventListener("mouseup", offResize);
    });

    function onResize(e) {
      if (!resizing) return;
      var dx = e.screenX - rsx;
      var dy = e.screenY - rsy;
      var delta = Math.max(dx, dy);
      var newW = Math.max(200, rsw + delta);
      var newH = newW / ASPECT;
      if (newH < 200) { newH = 200; newW = newH * ASPECT; }
      myWindow.setSize({ type: "Logical", width: Math.round(newW), height: Math.round(newH) });
    }

    function offResize() {
      resizing = false;
      document.removeEventListener("mousemove", onResize);
      document.removeEventListener("mouseup", offResize);
    }
  }
})();
