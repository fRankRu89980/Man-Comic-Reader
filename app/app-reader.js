// ============================================================
//  READER — CSS runtime, layer, zoom, navigazione, vignette
// ============================================================

import {
  READER_ZOOM_STORAGE_KEY,
  fumetti, seasonLabels,
  state,
  pageStage, wrapper,
  prevLayer, currentLayer, nextLayer,
  prevComic, currentComic, nextComic,
  pageCounter, modal, imgZoom,
  seasonLinks,
  titleSub,
  prevBtn, nextBtn, pageInput, pageBtn,
  readerZoomRange, readerZoomValue, readerZoomReset,
  seasonPopupCode, seasonPopupLabel,
  bgVideo,
  runtimeRuleCache,
  guardDoubleTap, resetUiFocus, updateStatus
} from "./app-init.js?v=7";

import {
  creaVignette,
  closeModal,
  resolveTapTarget
} from "./app-vignette.js?v=7";

// ── CSS runtime variable system ──────────────────────────────

function getRuntimeStyleSheet() {
  if(state.runtimeStyleSheet) return state.runtimeStyleSheet;

  state.runtimeStyleSheet = Array.from(document.styleSheets).find(sheet => {
    try {
      return typeof sheet.href === "string" && sheet.href.includes("/app.css");
    } catch {
      return false;
    }
  }) || null;

  return state.runtimeStyleSheet;
}

function getRuntimeRule(selector) {
  if(runtimeRuleCache.has(selector)) {
    return runtimeRuleCache.get(selector);
  }

  const sheet = getRuntimeStyleSheet();
  if(!sheet) return null;

  let matchedRule = null;

  try {
    matchedRule = Array.from(sheet.cssRules).find(rule =>
      rule instanceof CSSStyleRule && rule.selectorText === selector
    ) || null;
  } catch (error) {
    console.warn(`Impossibile leggere la regola CSS ${selector}:`, error);
    return null;
  }

  if(!matchedRule) return null;

  runtimeRuleCache.set(selector, matchedRule);
  return matchedRule;
}

export function setRuntimeCssVariable(name, value) {
  const rootRule = getRuntimeRule(":root");
  if(!rootRule) return;
  rootRule.style.setProperty(name, value);
}

// ── Zoom del reader ──────────────────────────────────────────

function getReaderZoomBounds() {
  const min = Number(readerZoomRange?.min);
  const max = Number(readerZoomRange?.max);
  const normalizedMin = Number.isFinite(min) ? min : 50;
  const normalizedMax = Number.isFinite(max) ? max : 115;

  if(normalizedMax <= normalizedMin) {
    return { min: 50, max: 115 };
  }

  return { min: normalizedMin, max: normalizedMax };
}

function clampReaderZoom(value) {
  const { min, max } = getReaderZoomBounds();
  return Math.min(max, Math.max(min, value));
}

function updateReaderZoomUi(value) {
  const clampedValue = clampReaderZoom(value);
  const { min, max } = getReaderZoomBounds();
  const progress = ((clampedValue - min) / (max - min)) * 100;
  setRuntimeCssVariable("--reader-zoom-scale", `${clampedValue / 100}`);
  setRuntimeCssVariable("--reader-zoom-progress", `${progress}%`);

  if(readerZoomRange) {
    readerZoomRange.value = String(clampedValue);
  }

  if(readerZoomValue) {
    readerZoomValue.textContent = `${clampedValue}%`;
  }
}

export function setupReaderZoom() {
  if(!readerZoomRange || !readerZoomValue || !readerZoomReset) return;

  const savedValue = Number(window.localStorage.getItem(READER_ZOOM_STORAGE_KEY));
  const initialValue = Number.isFinite(savedValue) ? clampReaderZoom(savedValue) : 100;
  updateReaderZoomUi(initialValue);

  readerZoomRange.addEventListener("input", event => {
    const nextValue = clampReaderZoom(Number(event.currentTarget.value));
    updateReaderZoomUi(nextValue);
    window.localStorage.setItem(READER_ZOOM_STORAGE_KEY, String(nextValue));
  });

  readerZoomReset.addEventListener("click", event => {
    if(guardDoubleTap(event.currentTarget, 180)) return;
    updateReaderZoomUi(100);
    window.localStorage.setItem(READER_ZOOM_STORAGE_KEY, "100");
    resetUiFocus(event.currentTarget);
  });
}

export function setupMediaPerformance() {
  if(!bgVideo) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveDataEnabled = navigator.connection && navigator.connection.saveData === true;
  const shouldReduceMedia = prefersReducedMotion || saveDataEnabled;

  if(shouldReduceMedia) {
    bgVideo.removeAttribute("autoplay");
    bgVideo.pause();
  }

  document.addEventListener("visibilitychange", () => {
    if(document.hidden) {
      bgVideo.pause();
      return;
    }

    const playPromise = bgVideo.play();
    if(playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  });
}


// ── Navigazione pagine: utilità ──────────────────────────────

function updateNavButtons() {
  prevBtn.disabled = state.paginaCorrente === 0;
  nextBtn.disabled = state.paginaCorrente === fumetti.length - 1;
}


function getSeasonForPage(pageNumber) {
  return seasonLabels.find(season => pageNumber >= season.start && pageNumber <= season.end) || seasonLabels[0];
}

function updateSeasonUi(pageNumber) {
  const activeSeason = getSeasonForPage(pageNumber);
  titleSub.textContent = activeSeason.label;

  seasonLinks.forEach((link, index) => {
    const startPage = parseInt(link.dataset.page, 10);
    const nextStart = seasonLinks[index + 1] ? parseInt(seasonLinks[index + 1].dataset.page, 10) : fumetti.length + 1;
    const isActive = pageNumber >= startPage && pageNumber < nextStart;
    link.classList.toggle("active", isActive);
  });

  const activeLink = seasonLinks.find(link => link.classList.contains("active"));
  if(activeLink && seasonPopupCode && seasonPopupLabel) {
    seasonPopupCode.textContent = activeLink.querySelector(".link-icon")?.textContent?.trim() || "S1";
    seasonPopupLabel.textContent = activeLink.dataset.label || "Stagioni";
  }
}

// ── Layer e rendering ────────────────────────────────────────

export function getPageWidth() {
  return pageStage.getBoundingClientRect().width || wrapper.offsetWidth || window.innerWidth;
}

function getPageSrc(index) {
  return index >= 0 && index < fumetti.length ? fumetti[index] : "";
}

function setStageAspectRatio(width, height) {
  if(width > 0 && height > 0) {
    setRuntimeCssVariable("--page-stage-aspect-ratio", `${width} / ${height}`);
  }
}

export function setLayerTransitions(enabled) {
  setRuntimeCssVariable("--page-layer-transition", enabled ? "transform .3s ease" : "none");
}

export function setLayerTransforms(deltaX) {
  const width = getPageWidth();
  const progress = width ? deltaX / width : 0;
  const limited = Math.max(-1, Math.min(progress, 1));

  setRuntimeCssVariable("--prev-layer-transform", `translate3d(${deltaX - width}px,0,0)`);
  setRuntimeCssVariable("--current-layer-transform", `translate3d(${deltaX}px,0,0)`);
  setRuntimeCssVariable("--next-layer-transform", `translate3d(${deltaX + width}px,0,0)`);
  setRuntimeCssVariable("--page-shadow-opacity", `${Math.min(Math.abs(limited) * 0.55, 0.55)}`);
  setRuntimeCssVariable(
    "--page-shadow-background",
    limited < 0
      ? "linear-gradient(to left, rgba(0,0,0,0.5), transparent)"
      : "linear-gradient(to right, rgba(0,0,0,0.5), transparent)"
  );
}

function setEmptyLayer(layer, image) {
  layer.classList.add("is-empty");
  image.removeAttribute("src");
}

function renderLayer(layer, image, pageIndex, token, options = {}) {
  const src = getPageSrc(pageIndex);
  if(!src) {
    setEmptyLayer(layer, image);
    return;
  }

  layer.classList.remove("is-empty");
  const preload = new Image();
  preload.onload = () => {
    if(token !== state.renderToken) return;
    image.src = src;
    if(options.updateRatio) {
      setStageAspectRatio(preload.naturalWidth, preload.naturalHeight);
    }
  };
  preload.onerror = () => {
    if(token !== state.renderToken) return;
    setEmptyLayer(layer, image);
    if(options.updateRatio) {
      updateStatus(`Immagine mancante: ${src}`);
    }
  };
  preload.src = src;
}

function renderPageLayers() {
  const token = ++state.renderToken;
  renderLayer(currentLayer, currentComic, state.paginaCorrente, token, { updateRatio: true });
  renderLayer(prevLayer, prevComic, state.paginaCorrente - 1, token);
  renderLayer(nextLayer, nextComic, state.paginaCorrente + 1, token);
  setLayerTransitions(false);
  setLayerTransforms(0);
}

// ── Cambio pagina ────────────────────────────────────────────

export function mostraPagina(index) {
  state.paginaCorrente = Math.max(0, Math.min(index, fumetti.length - 1));
  const pageNumber = state.paginaCorrente + 1;

  updateStatus(`Pagina ${pageNumber} di ${fumetti.length}`);
  updateSeasonUi(pageNumber);
  updateNavButtons();
  pageCounter.textContent = `${pageNumber} / ${fumetti.length}`;
  renderPageLayers();
  creaVignette(pageNumber);
}

function nextPage() {
  mostraPagina(state.paginaCorrente + 1);
}

function prevPage() {
  mostraPagina(state.paginaCorrente - 1);
}

// ── Setup navigazione (tastiera, bottoni, modal) ─────────────

export function setupNavigation() {
  prevBtn.addEventListener("click", event => {
    if(guardDoubleTap(event.currentTarget, 180)) return;
    prevPage();
    resetUiFocus(event.currentTarget);
  });

  nextBtn.addEventListener("click", event => {
    if(guardDoubleTap(event.currentTarget, 180)) return;
    nextPage();
    resetUiFocus(event.currentTarget);
  });

  pageBtn.addEventListener("click", event => {
    if(guardDoubleTap(event.currentTarget, 220)) return;
    const page = parseInt(pageInput.value, 10);
    if(!Number.isNaN(page) && page >= 1 && page <= fumetti.length) {
      mostraPagina(page - 1);
      pageInput.value = "";
    } else {
      updateStatus(`Inserisci una pagina tra 1 e ${fumetti.length}.`);
    }
    resetUiFocus(event.currentTarget);
  });

  pageInput.addEventListener("keydown", event => {
    if(event.key === "Enter") {
      pageBtn.click();
    }
  });

  modal.addEventListener("click", closeModal);
  imgZoom.addEventListener("error", () => {
    closeModal();
    updateStatus("La vignetta selezionata non e' disponibile.");
  });

  document.addEventListener("keydown", event => {
    if(document.activeElement && document.activeElement.tagName === "INPUT") return;
    if(event.key === "Escape" && state.modalOpen) {
      closeModal();
      return;
    }
    if(state.modalOpen) return;
    if(event.key === "ArrowRight") nextPage();
    if(event.key === "ArrowLeft") prevPage();
  });
}
