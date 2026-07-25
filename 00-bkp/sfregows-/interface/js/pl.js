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
  var tracks = [];
  var selectedIndex = -1;
  var playingIndex = -1;

  // === ELEMENTS ===
  var listEl = document.getElementById("pl-list");
  var timeEl = document.getElementById("pl-time-total");
  var fileInput = document.getElementById("pl-file-input");
  var dirInput = document.getElementById("pl-dir-input");

  // === EMIT ===
  function emitPl(action, data) {
    if (!isTauri) return;
    try {
      window.__TAURI__.event.emit("pl-action", Object.assign({ action: action }, data || {}));
    } catch (e) {
      console.error("[pl] emit failed:", e);
    }
  }

  // === RENDER LIST ===
  function renderList() {
    if (!listEl) return;
    listEl.innerHTML = "";
    var totalSeconds = 0;
    tracks.forEach(function (t, i) {
      var div = document.createElement("div");
      div.className = "pl-track";
      if (i === selectedIndex) div.className += " selected";
      if (i === playingIndex) div.className += " playing";
      div.innerHTML = '<span class="pl-track-num">' + (i + 1) + '.</span>' +
        '<span class="pl-track-title">' + (t.name || t.file || "Unknown") + '</span>' +
        '<span class="pl-track-duration">' + (t.duration || "--:--") + '</span>';
      div.addEventListener("click", function (e) {
        selectedIndex = i;
        renderList();
      });
      div.addEventListener("dblclick", function () {
        playTrack(i);
      });
      listEl.appendChild(div);
      if (t.seconds) totalSeconds += t.seconds;
    });
    if (timeEl) {
      var m = Math.floor(totalSeconds / 60);
      var s = Math.floor(totalSeconds % 60);
      timeEl.textContent = m + ":" + (s < 10 ? "0" : "") + s;
    }
  }

  // === ADD FILES ===
  function addFiles(fileList) {
    for (var i = 0; i < fileList.length; i++) {
      var f = fileList[i];
      var url = URL.createObjectURL(f);
      tracks.push({ name: f.name, file: f.name, url: url, duration: "--:--", seconds: 0 });
    }
    renderList();
    emitPl("tracks-changed", { count: tracks.length });
  }

  // === ADD URL ===
  function addUrl(url) {
    if (!url) return;
    var name = url.split("/").pop() || url;
    tracks.push({ name: name, file: url, url: url, duration: "--:--", seconds: 0 });
    renderList();
    emitPl("tracks-changed", { count: tracks.length });
  }

  // === PLAY TRACK ===
  function playTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    playingIndex = index;
    selectedIndex = index;
    renderList();
    emitPl("play", { index: index, url: tracks[index].url, name: tracks[index].name });
  }

  // === STOP ===
  function stopPlayback() {
    playingIndex = -1;
    renderList();
    emitPl("stop");
  }

  // === BUTTONS ===
  var addBtn = document.getElementById("pl-add");
  var remBtn = document.getElementById("pl-rem");
  var selBtn = document.getElementById("pl-sel");
  var miscBtn = document.getElementById("pl-misc");
  var addMenu = document.getElementById("pl-add-menu");
  var remMenu = document.getElementById("pl-rem-menu");
  var selMenu = document.getElementById("pl-sel-menu");
  var miscMenu = document.getElementById("pl-misc-menu");

  function closeAllMenus() {
    [addMenu, remMenu, selMenu, miscMenu].forEach(function (m) { if (m) m.classList.add("hidden"); });
  }

  if (addBtn) addBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closeAllMenus();
    if (addMenu) addMenu.classList.toggle("hidden");
  });
  if (remBtn) remBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closeAllMenus();
    if (remMenu) remMenu.classList.toggle("hidden");
  });
  if (selBtn) selBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closeAllMenus();
    if (selMenu) selMenu.classList.toggle("hidden");
  });
  if (miscBtn) miscBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closeAllMenus();
    if (miscMenu) miscMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", function () { closeAllMenus(); });

  // === DROPDOWN ACTIONS ===
  document.querySelectorAll(".pl-dropdown-item").forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.stopPropagation();
      var action = this.getAttribute("data-action");
      closeAllMenus();
      handleAction(action);
    });
  });

  function handleAction(action) {
    switch (action) {
      case "add-files": fileInput.click(); break;
      case "add-dir": dirInput.click(); break;
      case "add-url": showUrlDialog(); break;
      case "rem-selected":
        if (selectedIndex >= 0) { tracks.splice(selectedIndex, 1); selectedIndex = -1; renderList(); }
        break;
      case "rem-all": tracks = []; selectedIndex = -1; playingIndex = -1; renderList(); break;
      case "rem-dead":
        tracks = tracks.filter(function (t) { return t.url && !t.url.startsWith("blob:"); });
        renderList();
        break;
      case "sel-all": renderList(); break;
      case "sel-none": selectedIndex = -1; renderList(); break;
      case "sel-invert": if (selectedIndex >= 0) selectedIndex = -1; renderList(); break;
      case "sort-title":
        tracks.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
        renderList();
        break;
      case "sort-file":
        tracks.sort(function (a, b) { return (a.file || "").localeCompare(b.file || ""); });
        renderList();
        break;
      case "reverse": tracks.reverse(); renderList(); break;
      case "shuffle-list":
        for (var i = tracks.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = tracks[i]; tracks[i] = tracks[j]; tracks[j] = tmp;
        }
        renderList();
        break;
    }
  }

  // === URL DIALOG ===
  var urlDialog = document.getElementById("pl-url-dialog");
  var urlInput = document.getElementById("pl-url-input");
  var urlOk = document.getElementById("pl-url-ok");
  var urlCancel = document.getElementById("pl-url-cancel");

  function showUrlDialog() {
    if (urlDialog) urlDialog.classList.remove("hidden");
    if (urlInput) { urlInput.value = ""; urlInput.focus(); }
  }

  if (urlOk) urlOk.addEventListener("click", function () {
    addUrl(urlInput.value);
    if (urlDialog) urlDialog.classList.add("hidden");
  });
  if (urlCancel) urlCancel.addEventListener("click", function () {
    if (urlDialog) urlDialog.classList.add("hidden");
  });
  if (urlInput) urlInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { addUrl(urlInput.value); urlDialog.classList.add("hidden"); }
    if (e.key === "Escape") { urlDialog.classList.add("hidden"); }
  });

  // === FILE INPUTS ===
  if (fileInput) fileInput.addEventListener("change", function () {
    addFiles(this.files);
    this.value = "";
  });
  if (dirInput) dirInput.addEventListener("change", function () {
    addFiles(this.files);
    this.value = "";
  });

  // === TRANSPORT ===
  var prevBtn = document.getElementById("pl-prev");
  var playBtn = document.getElementById("pl-play");
  var pauseBtn = document.getElementById("pl-pause");
  var stopBtn = document.getElementById("pl-stop");
  var nextBtn = document.getElementById("pl-next");

  if (prevBtn) prevBtn.addEventListener("click", function () {
    if (playingIndex > 0) playTrack(playingIndex - 1);
  });
  if (playBtn) playBtn.addEventListener("click", function () {
    if (playingIndex >= 0) playTrack(playingIndex);
    else if (selectedIndex >= 0) playTrack(selectedIndex);
    else if (tracks.length > 0) playTrack(0);
  });
  if (pauseBtn) pauseBtn.addEventListener("click", function () {
    emitPl("pause");
  });
  if (stopBtn) stopBtn.addEventListener("click", function () {
    stopPlayback();
  });
  if (nextBtn) nextBtn.addEventListener("click", function () {
    if (playingIndex < tracks.length - 1) playTrack(playingIndex + 1);
  });

  // === CLOSE ===
  var closeBtn = document.getElementById("pl-close");
  if (closeBtn) {
    closeBtn.addEventListener("mousedown", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (isTauri && myWindow) {
        myWindow.hide();
        emitPl("pl-hide");
      } else {
        window.close();
      }
    });
  }

  // === TITLEBAR DRAG ===
  var titlebar = document.getElementById("pl-titlebar");
  var dragSX, dragSY, dragPending = false;
  if (titlebar) {
    titlebar.addEventListener("mousedown", function (e) {
      if (!isTauri || !myWindow) return;
      if (e.target.closest("#pl-close")) return;
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
    window.__TAURI__.event.listen("pl-state", function (event) {
      var p = event.payload;
      if (p && typeof p.playingIndex === "number") {
        playingIndex = p.playingIndex;
        renderList();
      }
      if (p && p.tracks) {
        tracks = p.tracks;
        renderList();
      }
    });
  }

  // === INIT ===
  renderList();
})();
