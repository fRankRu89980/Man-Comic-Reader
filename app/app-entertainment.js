// ============================================================
//  THEME SONG & ROULETTE — Player audio/video sincronizzato,
//  Roulette Napoli
// ============================================================

import {
  rouletteContainer, rouletteCanvas, rouletteBall, rouletteResult, rouletteVoiceBtn,
  themeSongCard, themeSongPlayer,
  themeSongVisualAnimated, themeSongVisualStatic,
  themeSongPlayBtn, themeSongPlayIcon,
  themeSongMuteBtn, themeSongMuteIcon,
  themeSongProgress, themeSongTime,
  themeVideoModal, themeVideoPlayer, themeVideoClose,
  guardDoubleTap, resetUiFocus
} from "./app-init.js?v=12";

import {
  setRuntimeCssVariable
} from "./app-reader.js?v=12";

// ── Theme Song ───────────────────────────────────────────────

export function setupThemeSongVisual() {
  if(
    !themeSongCard ||
    !themeSongPlayer ||
    !themeSongVisualAnimated ||
    !themeSongVisualStatic ||
    !themeSongPlayBtn ||
    !themeSongPlayIcon ||
    !themeSongMuteBtn ||
    !themeSongMuteIcon ||
    !themeSongProgress ||
    !themeSongTime
  ) {
    return;
  }

  const staticCtx = themeSongVisualStatic.getContext("2d");
  if(!staticCtx) return;

  const baseSrc = themeSongVisualAnimated.dataset.src || themeSongVisualAnimated.src;
  let themeVideoReturnFocusEl = null;

  function getThemeVideoFocusTarget() {
    if(
      themeVideoReturnFocusEl &&
      typeof themeVideoReturnFocusEl.focus === "function" &&
      document.contains(themeVideoReturnFocusEl)
    ) {
      return themeVideoReturnFocusEl;
    }

    if(themeSongPlayBtn && typeof themeSongPlayBtn.focus === "function") {
      return themeSongPlayBtn;
    }

    return null;
  }

  function drawStaticFrame() {
    staticCtx.clearRect(0, 0, themeSongVisualStatic.width, themeSongVisualStatic.height);
    staticCtx.drawImage(
      themeSongVisualAnimated,
      0,
      0,
      themeSongVisualStatic.width,
      themeSongVisualStatic.height
    );
  }

  function restartAnimatedVisual() {
    themeSongVisualAnimated.src = "";
    window.requestAnimationFrame(() => {
      themeSongVisualAnimated.src = baseSrc;
    });
  }

  function isThemeVideoOpen() {
    return !!themeVideoModal && !themeVideoModal.hidden;
  }

  async function openThemeVideo() {
    if(!themeVideoModal || !themeVideoPlayer) return;

    themeVideoReturnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : themeSongPlayBtn;
    themeVideoModal.hidden = false;
    themeVideoModal.removeAttribute("aria-hidden");
    themeVideoModal.inert = false;

    if(themeVideoClose && typeof themeVideoClose.focus === "function") {
      themeVideoClose.focus();
    } else if(typeof themeVideoModal.focus === "function") {
      themeVideoModal.focus();
    }

    if(Number.isFinite(themeSongPlayer.currentTime) && themeSongPlayer.currentTime >= 0) {
      try {
        themeVideoPlayer.currentTime = themeSongPlayer.currentTime;
      } catch {}
    }

    try {
      await themeVideoPlayer.play();
    } catch (error) {
      console.warn("Avvio video theme song non riuscito:", error);
    }
  }

  function closeThemeVideo() {
    if(!themeVideoModal || !themeVideoPlayer) return;

    const nextFocusTarget = getThemeVideoFocusTarget();
    if(themeVideoModal.contains(document.activeElement) && nextFocusTarget) {
      nextFocusTarget.focus();
    } else if(themeVideoModal.contains(document.activeElement) && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    themeVideoPlayer.pause();
    themeVideoModal.inert = true;
    themeVideoModal.setAttribute("aria-hidden", "true");
    themeVideoModal.hidden = true;
  }

  function syncThemeVideo() {
    if(!themeVideoPlayer || !isThemeVideoOpen()) return;
    if(!Number.isFinite(themeSongPlayer.currentTime)) return;
    if(!Number.isFinite(themeVideoPlayer.duration)) return;

    const drift = Math.abs(themeVideoPlayer.currentTime - themeSongPlayer.currentTime);
    if(drift > 0.35) {
      try {
        themeVideoPlayer.currentTime = themeSongPlayer.currentTime;
      } catch {}
    }
  }

  function formatThemeSongTime(seconds) {
    if(!Number.isFinite(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function updateThemeSongTime() {
    const current = themeSongPlayer.currentTime || 0;
    const duration = Number.isFinite(themeSongPlayer.duration) ? themeSongPlayer.duration : 0;
    themeSongTime.textContent = `${formatThemeSongTime(current)} / ${formatThemeSongTime(duration)}`;
  }

  function updateThemeSongProgress() {
    const duration = Number.isFinite(themeSongPlayer.duration) ? themeSongPlayer.duration : 0;
    const current = themeSongPlayer.currentTime || 0;
    themeSongProgress.value = duration > 0 ? (current / duration) * 100 : 0;
    updateThemeSongTime();
  }

  function updateThemeSongPlayUi(isPlaying) {
    themeSongCard.classList.toggle("is-playing", isPlaying);
    themeSongPlayBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    themeSongPlayBtn.setAttribute("aria-label", isPlaying ? "Metti in pausa theme song" : "Riproduci theme song");
    themeSongPlayIcon.textContent = isPlaying ? "❚❚" : "▶";
  }

  function updateThemeSongMuteUi() {
    const muted = themeSongPlayer.muted || themeSongPlayer.volume === 0;
    themeSongCard.classList.toggle("is-muted", muted);
    themeSongMuteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    themeSongMuteBtn.setAttribute("aria-label", muted ? "Riattiva audio" : "Disattiva audio");
    themeSongMuteIcon.textContent = muted ? "🔇" : "🔊";
  }

  if(themeSongVisualAnimated.complete) {
    drawStaticFrame();
  } else {
    themeSongVisualAnimated.addEventListener("load", drawStaticFrame, { once: true });
  }

  updateThemeSongPlayUi(false);
  updateThemeSongMuteUi();
  updateThemeSongProgress();

  themeSongPlayBtn.addEventListener("click", async () => {
    if(guardDoubleTap(themeSongPlayBtn, 220)) return;
    if(themeSongPlayer.paused) {
      try {
        await themeSongPlayer.play();
      } catch (error) {
        console.warn("Avvio theme song non riuscito:", error);
      }
      return;
    }

    themeSongPlayer.pause();
    resetUiFocus(themeSongPlayBtn);
  });

  themeSongMuteBtn.addEventListener("click", () => {
    if(guardDoubleTap(themeSongMuteBtn, 220)) return;
    themeSongPlayer.muted = !themeSongPlayer.muted;
    updateThemeSongMuteUi();
    resetUiFocus(themeSongMuteBtn);
  });

  themeSongProgress.addEventListener("input", () => {
    const duration = Number.isFinite(themeSongPlayer.duration) ? themeSongPlayer.duration : 0;
    if(duration <= 0) return;
    themeSongPlayer.currentTime = (Number(themeSongProgress.value) / 100) * duration;
    syncThemeVideo();
    updateThemeSongProgress();
  });

  themeSongPlayer.addEventListener("loadedmetadata", updateThemeSongProgress);
  themeSongPlayer.addEventListener("timeupdate", () => {
    updateThemeSongProgress();
    syncThemeVideo();
  });
  themeSongPlayer.addEventListener("volumechange", updateThemeSongMuteUi);

  themeSongPlayer.addEventListener("play", () => {
    restartAnimatedVisual();
    updateThemeSongPlayUi(true);
    openThemeVideo();
  });

  ["pause", "ended"].forEach(eventName => {
    themeSongPlayer.addEventListener(eventName, () => {
      updateThemeSongPlayUi(false);
      drawStaticFrame();
      if(themeVideoPlayer) {
        themeVideoPlayer.pause();
      }
      if(eventName === "ended") {
        themeSongPlayer.currentTime = 0;
        if(themeVideoPlayer) {
          try {
            themeVideoPlayer.currentTime = 0;
          } catch {}
        }
        closeThemeVideo();
        updateThemeSongProgress();
      }
    });
  });

  if(themeVideoClose) {
    themeVideoClose.addEventListener("click", event => {
      event.stopPropagation();
      if(guardDoubleTap(event.currentTarget, 220)) return;
      closeThemeVideo();
    });
  }

  if(themeVideoModal) {
    themeVideoModal.addEventListener("click", event => {
      if(event.target === themeVideoModal) {
        closeThemeVideo();
      }
    });
  }

  document.addEventListener("keydown", event => {
    if(event.key === "Escape" && isThemeVideoOpen()) {
      closeThemeVideo();
    }
  });
}

// ── Roulette ─────────────────────────────────────────────────

export function setupRoulette() {
  if(!rouletteContainer || !rouletteCanvas || !rouletteBall || !rouletteResult || !rouletteVoiceBtn) {
    return;
  }

  const rouletteCtx = rouletteCanvas.getContext("2d");
  if(!rouletteCtx) return;

  const rouletteNumbers = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27,
    13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1,
    20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  const redRouletteNumbers = new Set([
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
  ]);

  const rouletteNicknames = {
    0: "zero",
    1: "l'Italia",
    2: "a' criatura",
    3: "a' jatta",
    4: "o' puorco",
    5: "a' mano",
    6: "chella ca guarda nterra",
    7: "o' vase",
    8: "a' Maronna",
    9: "a' figliata",
    10: "e fasule",
    11: "e surice",
    12: "e surdate",
    13: "Sant'Antonio",
    14: "o' mbriaco",
    15: "o' guaglione",
    16: "o' culo",
    17: "a disgrazia",
    18: "o' sanghe",
    19: "a' resata",
    20: "a' festa",
    21: "a' femmena annura",
    22: "o' pazzo",
    23: "o' scemo",
    24: "e guardie",
    25: "Natale",
    26: "Nanninella",
    27: "o' cantero",
    28: "e zzizze",
    29: "o' pate d'e criature",
    30: "e palle d'o tenente",
    31: "o' padrone 'e casa",
    32: "o' capitone",
    33: "ll'anne 'e Cristo",
    34: "a' capa",
    35: "l'aucielluzzo",
    36: "e castagnelle"
  };

  let spinning = false;
  let voiceEnabled = true;
  let ballAngle = -Math.PI / 2;
  let animationId = null;
  let safetyUnlockTimer = null;

  function drawRouletteWheel() {
    const cx = rouletteCanvas.width / 2;
    const cy = rouletteCanvas.height / 2;
    const radius = 220;
    const innerRadius = 150;
    const segmentAngle = (Math.PI * 2) / rouletteNumbers.length;

    rouletteCtx.clearRect(0, 0, rouletteCanvas.width, rouletteCanvas.height);

    const outerGradient = rouletteCtx.createRadialGradient(cx, cy, 50, cx, cy, radius + 16);
    outerGradient.addColorStop(0, "#8d6b21");
    outerGradient.addColorStop(1, "#4b3308");

    rouletteCtx.beginPath();
    rouletteCtx.arc(cx, cy, radius + 12, 0, Math.PI * 2);
    rouletteCtx.fillStyle = outerGradient;
    rouletteCtx.fill();

    for(let i = 0; i < rouletteNumbers.length; i++) {
      const start = -Math.PI / 2 + i * segmentAngle;
      const end = start + segmentAngle;
      const num = rouletteNumbers[i];
      let color = "#1f9d55";

      if(num !== 0) {
        color = redRouletteNumbers.has(num) ? "#b71c1c" : "#111111";
      }

      rouletteCtx.beginPath();
      rouletteCtx.moveTo(cx, cy);
      rouletteCtx.arc(cx, cy, radius, start, end);
      rouletteCtx.closePath();
      rouletteCtx.fillStyle = color;
      rouletteCtx.fill();

      rouletteCtx.strokeStyle = "#d4af37";
      rouletteCtx.lineWidth = 2;
      rouletteCtx.stroke();

      const textAngle = start + segmentAngle / 2;
      const tx = cx + Math.cos(textAngle) * 185;
      const ty = cy + Math.sin(textAngle) * 185;

      rouletteCtx.save();
      rouletteCtx.translate(tx, ty);
      rouletteCtx.rotate(textAngle + Math.PI / 2);
      rouletteCtx.fillStyle = "#ffffff";
      rouletteCtx.font = "bold 18px Arial";
      rouletteCtx.textAlign = "center";
      rouletteCtx.textBaseline = "middle";
      rouletteCtx.fillText(num, 0, 0);
      rouletteCtx.restore();
    }

    rouletteCtx.beginPath();
    rouletteCtx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    rouletteCtx.fillStyle = "#4b2e05";
    rouletteCtx.fill();
    rouletteCtx.strokeStyle = "#d4af37";
    rouletteCtx.lineWidth = 6;
    rouletteCtx.stroke();

    rouletteCtx.beginPath();
    rouletteCtx.arc(cx, cy, 36, 0, Math.PI * 2);
    rouletteCtx.fillStyle = "#d4af37";
    rouletteCtx.fill();
  }

  function updateRouletteBallPosition(angle) {
    const rect = rouletteCanvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const ballRadius = rect.width * 0.43;

    const x = centerX + Math.cos(angle) * ballRadius;
    const y = centerY + Math.sin(angle) * ballRadius;

    setRuntimeCssVariable("--roulette-ball-left", `${x}px`);
    setRuntimeCssVariable("--roulette-ball-top", `${y}px`);
  }

  function normalizeRouletteAngle(angle) {
    return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function setRouletteControlsDisabled(disabled) {
    rouletteContainer.setAttribute("aria-disabled", disabled ? "true" : "false");
  }

  function setRouletteVoiceEnabled(enabled) {
    voiceEnabled = enabled;
    rouletteVoiceBtn.textContent = enabled ? "Voce attiva" : "Voce disattivata";
    rouletteVoiceBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
  }

  function speakRoulette(text) {
    if(!voiceEnabled || !("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "it-IT";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn("Errore sintesi vocale roulette:", error);
    }
  }

  function buildRouletteResultText(number) {
    const nickname = rouletteNicknames[number];
    return nickname ? `${number} - ${nickname}` : `${number}`;
  }

  function spinRoulette() {
    if(spinning) return;

    spinning = true;
    setRouletteControlsDisabled(true);
    rouletteResult.textContent = "La pallina gira...";

    if(animationId) {
      window.cancelAnimationFrame(animationId);
      animationId = null;
    }

    if(safetyUnlockTimer) {
      window.clearTimeout(safetyUnlockTimer);
      safetyUnlockTimer = null;
    }

    const winningIndex = Math.floor(Math.random() * rouletteNumbers.length);
    const winningNumber = rouletteNumbers[winningIndex];
    const segmentAngle = (Math.PI * 2) / rouletteNumbers.length;
    const targetAngle = -Math.PI / 2 + winningIndex * segmentAngle + segmentAngle / 2;
    const startAngle = normalizeRouletteAngle(ballAngle);
    const normalizedTarget = normalizeRouletteAngle(targetAngle);
    const extraTurns = Math.PI * 2 * (5 + Math.floor(Math.random() * 3));

    let delta = normalizedTarget - startAngle;
    if(delta < 0) {
      delta += Math.PI * 2;
    }

    const finalAngle = startAngle + extraTurns + delta;
    const duration = 4200;
    const startTime = performance.now();

    function finishSpin() {
      ballAngle = normalizedTarget;
      updateRouletteBallPosition(ballAngle);

      const finalText = buildRouletteResultText(winningNumber);
      rouletteResult.textContent = `Numero uscito: ${finalText}`;
      speakRoulette(finalText);

      spinning = false;
      animationId = null;
      setRouletteControlsDisabled(false);
    }

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const currentAngle = startAngle + (finalAngle - startAngle) * eased;

      updateRouletteBallPosition(currentAngle);

      if(progress < 1) {
        animationId = window.requestAnimationFrame(animate);
      } else {
        finishSpin();
      }
    }

    animationId = window.requestAnimationFrame(animate);

    safetyUnlockTimer = window.setTimeout(() => {
      if(spinning) {
        if(animationId) {
          window.cancelAnimationFrame(animationId);
          animationId = null;
        }
        finishSpin();
      }
    }, duration + 1000);
  }

  drawRouletteWheel();
  updateRouletteBallPosition(ballAngle);
  setRouletteVoiceEnabled(true);

  // ── Modalità roulette: 3D (default) oppure 2D ──────────────
  // Pulsante che mostra la modalità ATTIVA. Default "3D": cliccando la
  // ruota si apre la roulette 3D. Cliccando il pulsante diventa "2D":
  // la ruota gira in 2D nativa, senza aprire l'overlay 3D.
  const rouletteModeBtn = document.getElementById("roulette-mode-btn");
  let mode3d = true;

  function setRouletteMode(use3d) {
    mode3d = use3d;
    if(rouletteModeBtn) {
      rouletteModeBtn.textContent = mode3d ? "3D" : "2D";
      rouletteModeBtn.setAttribute("aria-pressed", mode3d ? "true" : "false");
    }
  }
  setRouletteMode(true);
  if(rouletteModeBtn) {
    rouletteModeBtn.addEventListener("click", () => setRouletteMode(!mode3d));
  }

  function activateRoulette() {
    // Modalità 3D + overlay presente → apri la 3D (niente spin 2D).
    if(mode3d && document.getElementById("roulette3d-overlay")) {
      window.dispatchEvent(new CustomEvent("roulette3d:open"));
      return;
    }
    // Modalità 2D (o nessun overlay) → gira la ruota 2D nativa.
    spinRoulette();
  }

  rouletteContainer.addEventListener("click", activateRoulette);
  rouletteContainer.addEventListener("keydown", event => {
    if(event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateRoulette();
    }
  });

  // Estrazione dalla roulette 3D → posiziona la pallina bianca 2D sul
  // numero uscito (stesso ordine numeri) e aggiorna "Ultima estrazione".
  window.addEventListener("roulette3d:result", event => {
    const detail = (event && event.detail) || {};
    if(typeof detail.number === "number" && !spinning) {
      const idx = rouletteNumbers.indexOf(detail.number);
      if(idx >= 0) {
        const segAngle = (Math.PI * 2) / rouletteNumbers.length;
        ballAngle = normalizeRouletteAngle(-Math.PI / 2 + idx * segAngle + segAngle / 2);
        updateRouletteBallPosition(ballAngle);
      }
    }
    if(detail.text) {
      rouletteResult.textContent = `Numero uscito: ${detail.text}`;
    }
  });
  rouletteVoiceBtn.addEventListener("click", () => {
    setRouletteVoiceEnabled(!voiceEnabled);
  });

  window.addEventListener("resize", () => {
    updateRouletteBallPosition(ballAngle);
  });
}
