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

  // === ELEMENTS ===
  var video = document.getElementById("video-player");
  var overlay = document.getElementById("video-overlay");
  var seekBar = document.getElementById("video-seek-bar");
  var volumeSlider = document.getElementById("video-volume");
  var timeCurrent = document.getElementById("video-time-current");
  var timeTotal = document.getElementById("video-time-total");
  var fileInput = document.getElementById("video-file-input");
  var urlDialog = document.getElementById("video-url-dialog");
  var urlInput = document.getElementById("video-url-input");

  // === EMIT ===
  function emitVideo(action, data) {
    if (!isTauri) return;
    try {
      window.__TAURI__.event.emit("video-action", Object.assign({ action: action }, data || {}));
    } catch (e) {
      console.error("[video] emit failed:", e);
    }
  }

  // === FORMAT TIME ===
  function fmt(sec) {
    if (!sec || isNaN(sec)) return "0:00";
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  // === VIDEO EVENTS ===
  if (video) {
    video.addEventListener("loadedmetadata", function () {
      if (timeTotal) timeTotal.textContent = fmt(video.duration);
      if (overlay) overlay.classList.add("hidden");
    });

    video.addEventListener("timeupdate", function () {
      if (timeCurrent) timeCurrent.textContent = fmt(video.currentTime);
      if (seekBar && video.duration) {
        seekBar.value = (video.currentTime / video.duration) * 1000;
      }
    });

    video.addEventListener("ended", function () {
      emitVideo("ended");
    });

    video.addEventListener("play", function () {
      emitVideo("play", { src: video.src });
    });

    video.addEventListener("pause", function () {
      emitVideo("pause");
    });
  }

  // === SEEK ===
  if (seekBar) {
    seekBar.addEventListener("input", function () {
      if (video && video.duration) {
        video.currentTime = (seekBar.value / 1000) * video.duration;
      }
    });
  }

  // === VOLUME ===
  if (volumeSlider) {
    volumeSlider.addEventListener("input", function () {
      if (video) video.volume = volumeSlider.value / 100;
    });
  }

  // === TRANSPORT ===
  var prevBtn = document.getElementById("video-prev");
  var playBtn = document.getElementById("video-play");
  var pauseBtn = document.getElementById("video-pause");
  var stopBtn = document.getElementById("video-stop");
  var nextBtn = document.getElementById("video-next");
  var fullscreenBtn = document.getElementById("video-fullscreen");

  if (prevBtn) prevBtn.addEventListener("click", function () {
    emitVideo("prev");
  });

  if (playBtn) playBtn.addEventListener("click", function () {
    if (video && video.src) video.play();
    else fileInput.click();
  });

  if (pauseBtn) pauseBtn.addEventListener("click", function () {
    if (video) video.pause();
  });

  if (stopBtn) stopBtn.addEventListener("click", function () {
    if (video) { video.pause(); video.currentTime = 0; }
    if (overlay) overlay.classList.remove("hidden");
    emitVideo("stop");
  });

  if (nextBtn) nextBtn.addEventListener("click", function () {
    emitVideo("next");
  });

  if (fullscreenBtn) fullscreenBtn.addEventListener("click", function () {
    var el = document.getElementById("video-display");
    if (el) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        el.requestFullscreen();
      }
    }
  });

  // === FILE INPUT ===
  if (fileInput) {
    fileInput.addEventListener("change", function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var url = URL.createObjectURL(f);
      if (video) {
        video.src = url;
        video.play();
        if (overlay) overlay.classList.add("hidden");
      }
      emitVideo("play", { src: url, name: f.name });
      this.value = "";
    });
  }

  // === DOUBLE-CLICK TO OPEN FILE ===
  var display = document.getElementById("video-display");
  if (display) {
    display.addEventListener("dblclick", function () {
      fileInput.click();
    });
  }

  // === URL DIALOG ===
  var urlOk = document.getElementById("video-url-ok");
  var urlCancel = document.getElementById("video-url-cancel");

  function showUrlDialog() {
    if (urlDialog) urlDialog.classList.remove("hidden");
    if (urlInput) { urlInput.value = ""; urlInput.focus(); }
  }

  if (urlOk) urlOk.addEventListener("click", function () {
    var url = urlInput.value;
    if (url && video) {
      video.src = url;
      video.play();
      if (overlay) overlay.classList.add("hidden");
      emitVideo("play", { src: url, name: url });
    }
    if (urlDialog) urlDialog.classList.add("hidden");
  });

  if (urlCancel) urlCancel.addEventListener("click", function () {
    if (urlDialog) urlDialog.classList.add("hidden");
  });

  if (urlInput) urlInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && urlInput.value) {
      video.src = urlInput.value;
      video.play();
      if (overlay) overlay.classList.add("hidden");
      emitVideo("play", { src: urlInput.value, name: urlInput.value });
      urlDialog.classList.add("hidden");
    }
    if (e.key === "Escape") urlDialog.classList.add("hidden");
  });

  // === CLOSE ===
  var closeBtn = document.getElementById("video-close");
  if (closeBtn) {
    closeBtn.addEventListener("mousedown", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (isTauri && myWindow) {
        myWindow.hide();
        emitVideo("video-hide");
      } else {
        window.close();
      }
    });
  }

  // === TITLEBAR DRAG ===
  var titlebar = document.getElementById("video-titlebar");
  var dragSX, dragSY, dragPending = false;
  if (titlebar) {
    titlebar.addEventListener("mousedown", function (e) {
      if (!isTauri || !myWindow) return;
      if (e.target.closest("#video-close")) return;
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
  var resizeHandle = document.getElementById("video-resize");
  if (resizeHandle && isTauri && myWindow) {
    var resizing = false, rsx, rsy, rsw, rsh;
    resizeHandle.addEventListener("mousedown", function (e) {
      e.preventDefault(); e.stopPropagation();
      resizing = true;
      rsx = e.screenX; rsy = e.screenY;
      rsw = window.innerWidth; rsh = window.innerHeight;
      document.addEventListener("mousemove", onResize);
      document.addEventListener("mouseup", offResize);
    });
    function onResize(e) {
      if (!resizing) return;
      var dx = e.screenX - rsx;
      var dy = e.screenY - rsy;
      var newW = Math.max(275, rsw + dx);
      var newH = Math.max(184, rsh + dy);
      myWindow.setSize({ type: "Logical", width: Math.round(newW), height: Math.round(newH) });
    }
    function offResize() {
      resizing = false;
      document.removeEventListener("mousemove", onResize);
      document.removeEventListener("mouseup", offResize);
    }
  }

  // === LISTEN STATE ===
  if (isTauri) {
    window.__TAURI__.event.listen("video-state", function (event) {
      var p = event.payload;
      if (p && p.src && video) {
        video.src = p.src;
        video.play();
        if (overlay) overlay.classList.add("hidden");
      }
      if (p && typeof p.muted === "boolean" && video) {
        video.muted = p.muted;
      }
      if (typeof p.volume === "number" && video) {
        video.volume = p.volume;
        if (volumeSlider) volumeSlider.value = p.volume * 100;
      }
    });
  }
})();
