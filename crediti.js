function setupCreditsPlayer() {
  const card        = document.getElementById("credits-player-card");
  const videoEl     = document.getElementById("credits-video-player");
  const playBtn     = document.getElementById("credits-play");
  const playIcon    = document.getElementById("credits-play-icon");
  const muteBtn     = document.getElementById("credits-mute");
  const muteIcon    = document.getElementById("credits-mute-icon");
  const progressEl  = document.getElementById("credits-progress");
  const timeEl      = document.getElementById("credits-time");
  const visualAnimated = document.getElementById("credits-visual-animated");
  const visualStatic   = document.getElementById("credits-visual-static");

  if(!card || !videoEl || !playBtn || !playIcon || !muteBtn || !muteIcon || !progressEl || !timeEl) return;

  const staticCtx = visualStatic ? visualStatic.getContext("2d") : null;
  const baseSrc   = visualAnimated ? (visualAnimated.dataset.src || visualAnimated.src) : "";

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function drawStaticFrame() {
    if(!staticCtx || !visualAnimated) return;
    staticCtx.clearRect(0, 0, visualStatic.width, visualStatic.height);
    staticCtx.drawImage(visualAnimated, 0, 0, visualStatic.width, visualStatic.height);
  }

  function restartAnimatedVisual() {
    if(!visualAnimated) return;
    visualAnimated.src = "";
    window.requestAnimationFrame(function() {
      visualAnimated.src = baseSrc;
    });
  }

  function updateTime() {
    const current  = videoEl.currentTime || 0;
    const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;
    timeEl.textContent = formatTime(current) + " / " + formatTime(duration);
  }

  function updateProgress() {
    const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;
    const current  = videoEl.currentTime || 0;
    progressEl.value = duration > 0 ? (current / duration) * 100 : 0;
    updateTime();
  }

  function updatePlayUi(isPlaying) {
    card.classList.toggle("is-playing", isPlaying);
    playBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    playBtn.setAttribute("aria-label", isPlaying ? "Metti in pausa" : "Riproduci video crediti");
    playIcon.textContent = isPlaying ? "❚❚" : "▶";
  }

  function updateMuteUi() {
    const muted = videoEl.muted || videoEl.volume === 0;
    card.classList.toggle("is-muted", muted);
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    muteBtn.setAttribute("aria-label", muted ? "Riattiva audio" : "Disattiva audio");
    muteIcon.textContent = muted ? "🔇" : "🔊";
  }

  // Cattura il frame statico iniziale dal GIF visualizzatore
  if(visualAnimated) {
    if(visualAnimated.complete) {
      drawStaticFrame();
    } else {
      visualAnimated.addEventListener("load", drawStaticFrame, { once: true });
    }
  }

  updateProgress();

  playBtn.addEventListener("click", function() {
    if(videoEl.paused) {
      videoEl.play().catch(function(err) {
        console.warn("Avvio video crediti non riuscito:", err);
      });
      return;
    }
    videoEl.pause();
  });

  muteBtn.addEventListener("click", function() {
    videoEl.muted = !videoEl.muted;
    updateMuteUi();
  });

  progressEl.addEventListener("input", function() {
    const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;
    if(duration <= 0) return;
    videoEl.currentTime = (Number(progressEl.value) / 100) * duration;
    updateProgress();
  });

  videoEl.addEventListener("loadedmetadata", updateProgress);
  videoEl.addEventListener("timeupdate", updateProgress);
  videoEl.addEventListener("volumechange", updateMuteUi);

  videoEl.addEventListener("play", function() {
    restartAnimatedVisual();
    updatePlayUi(true);
  });

  ["pause", "ended"].forEach(function(eventName) {
    videoEl.addEventListener(eventName, function() {
      updatePlayUi(false);
      drawStaticFrame();
      if(eventName === "ended") {
        videoEl.currentTime = 0;
      }
    });
  });
}

setupCreditsPlayer();
