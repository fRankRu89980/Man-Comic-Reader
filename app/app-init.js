// ============================================================
//  INIZIALIZZAZIONE — Costanti, dati, stato, DOM, utility
// ============================================================

// ── Costanti di configurazione ──────────────────────────────
export const APP_VERSION = "7";
export const SERVICE_WORKER_URL = `./sw.js?v=${APP_VERSION}`;
export const APP_STORAGE_PREFIX = "comic-reader-";
export const INSTALL_DISMISS_KEY = "comic-reader-install-dismissed";
export const LOGIN_SUCCESS_EVENT = "comic-reader:login-success";
export const SWIPE_INTENT_THRESHOLD = 10;
export const TAP_MAX_DISTANCE = 12;
export const SWIPE_TRIGGER_RATIO = 0.25;
export const READER_ZOOM_STORAGE_KEY = `${APP_STORAGE_PREFIX}reader-zoom`;

// ── Struttura dati delle stagioni ───────────────────────────
export const seasonPageSources = [
  {
    label: "Volume I - L'estate prolungata",
    folder: "Batman 1 - L'estate prolungata",
    pages: Array.from({ length: 44 }, (_, index) => `PG${index}.jpeg`)
  },
  {
    label: "Volume II - L'inverno sta arrivando",
    folder: "Batman 2 - L'inverno sta arrivando",
    pages: Array.from({ length: 53 }, (_, index) => `PG${index}.jpeg`)
  },
  {
    label: "Volume III - L'Abisso",
    folder: "Batman 3 - L'abisso",
    pages: Array.from({ length: 48 }, (_, index) => `PG${index}.jpeg`)
  },
  {
    label: "Volume IV - A Million Miles From Home",
    folder: "Batman 4 - A Million Miles From Home",
    pages: Array.from({ length: 52 }, (_, index) => `PG${index}.jpeg`)
  }
];

export const fumetti = seasonPageSources.flatMap(season =>
  season.pages.map(fileName => encodeURI(`tavole/${season.folder}/${fileName}`))
);

export const vignetteDisponibili = new Set([
  "vignette/vignetta1_0.jpeg",
  "vignette/vignetta2_0.jpeg",
  "vignette/vignetta3_0.jpeg"
]);

export const seasonLabels = (() => {
  let currentStart = 1;
  return seasonPageSources.map(season => {
    const range = {
      start: currentStart,
      end: currentStart + season.pages.length - 1,
      label: season.label
    };
    currentStart = range.end + 1;
    return range;
  });
})();

export const defaultLayout = [{ top: 0, left: 0, width: 100, height: 100 }];

// ── Stato mutabile dell'applicazione ────────────────────────
//    Le proprietà vengono lette e scritte da app.js come state.xxx
export const state = {
  paginaCorrente: 0,
  modalOpen: false,
  renderToken: 0,
  deferredInstallPrompt: null,
  installPromptInFlight: false,
  runtimeStyleSheet: null
};

// ── Riferimenti al DOM ───────────────────────────────────────
//    Ricercati una sola volta al caricamento del modulo.
//    I moduli ES sono deferred: il DOM è già pronto.
export const pageStage        = document.querySelector(".page-stage");
export const prevLayer        = document.querySelector(".page-layer.prev");
export const currentLayer     = document.querySelector(".page-layer.current");
export const nextLayer        = document.querySelector(".page-layer.next");
export const prevComic        = document.getElementById("comic-prev");
export const currentComic     = document.getElementById("comic-current");
export const nextComic        = document.getElementById("comic-next");
export const pageCounter      = document.getElementById("page-counter");
export const modal            = document.getElementById("modal");
export const imgZoom          = document.getElementById("img-zoom");
export const seasonLinks      = Array.from(document.querySelectorAll(".link"));
export const wrapper          = document.querySelector(".comic-wrapper");
export const shadow           = document.getElementById("page-shadow");
export const vignetteContainer = document.getElementById("vignette-container");
export const menu             = document.querySelector(".menu");
export const statusChip       = document.getElementById("reader-status");
export const titleSub         = document.getElementById("title-sub");
export const prevBtn          = document.getElementById("prev-btn");
export const nextBtn          = document.getElementById("next-btn");
export const pageInput        = document.getElementById("page-input");
export const pageBtn          = document.getElementById("page-btn");
export const readerZoomRange  = document.getElementById("reader-zoom-range");
export const readerZoomValue  = document.getElementById("reader-zoom-value");
export const readerZoomReset  = document.getElementById("reader-zoom-reset");
export const title            = document.querySelector(".title-main");
export const installBtn       = document.getElementById("install-app-btn");
export const iosInstallModal  = document.getElementById("ios-install-modal");
export const iosInstallCard   = iosInstallModal ? iosInstallModal.querySelector(".install-modal-card") : null;
export const iosInstallTitle       = document.getElementById("ios-install-title");
export const iosInstallDescription = document.getElementById("ios-install-description");
export const iosInstallSteps       = document.getElementById("ios-install-steps");
export const iosInstallClose       = document.getElementById("ios-install-close");
export const iosInstallDismiss     = document.getElementById("ios-install-dismiss");
export const rouletteContainer = document.getElementById("roulette-container");
export const rouletteCanvas    = document.getElementById("roulette-wheel");
export const rouletteBall      = document.getElementById("roulette-ball");
export const rouletteResult    = document.getElementById("roulette-result");
export const rouletteVoiceBtn  = document.getElementById("roulette-voice-btn");
export const themeSongCard            = document.querySelector(".theme-song-card");
export const themeSongPlayer          = document.getElementById("theme-song-player");
export const themeSongVisualAnimated  = document.getElementById("theme-song-visual-animated");
export const themeSongVisualStatic    = document.getElementById("theme-song-visual-static");
export const themeSongPlayBtn         = document.getElementById("theme-song-play");
export const themeSongPlayIcon        = document.getElementById("theme-song-play-icon");
export const themeSongMuteBtn         = document.getElementById("theme-song-mute");
export const themeSongMuteIcon        = document.getElementById("theme-song-mute-icon");
export const themeSongProgress        = document.getElementById("theme-song-progress");
export const themeSongTime            = document.getElementById("theme-song-time");
export const themeVideoModal   = document.getElementById("theme-video-modal");
export const themeVideoPlayer  = document.getElementById("theme-video-player");
export const themeVideoClose   = document.getElementById("theme-video-close");
export const seasonPopupCompact = document.getElementById("season-popup-compact");
export const seasonPopupCode    = document.getElementById("season-popup-code");
export const seasonPopupLabel   = document.getElementById("season-popup-label");
export const seasonMenuClose    = document.getElementById("season-menu-close");
export const hamburgerToggle    = document.getElementById("hamburger-toggle");
export const siteDrawer         = document.getElementById("site-drawer");
export const siteDrawerOverlay  = document.getElementById("site-drawer-overlay");
export const siteDrawerLinks    = Array.from(document.querySelectorAll(".site-drawer-link"));
export const bgVideo            = document.getElementById("bg-video");

// ── Cache e stato UI installazione ──────────────────────────
export const runtimeRuleCache = new Map();

export const installUiState = {
  sessionClosed: false,
  lastFocusedElement: null
};

// ── Selettore e funzioni di utilità UI ──────────────────────
export const interactiveUiSelector = [
  "button",
  "input",
  "select",
  "textarea",
  "a",
  "[role='button']",
  ".menu",
  ".hamburger-toggle",
  ".site-drawer",
  ".site-drawer-overlay",
  ".season-popup-row",
  ".season-popup-compact",
  ".toolbar",
  ".page-jump",
  ".install-app-btn",
  ".install-modal",
  ".theme-song-player-shell",
  ".theme-video-modal",
  ".modal"
].join(", ");

export function isInteractiveElement(target) {
  return target instanceof Element && Boolean(target.closest(interactiveUiSelector));
}

// Stato privato del modulo per il rilevamento doppio tap.
// Non è nel state{} perché usato solo qui dentro.
let _lastUiTapTime = 0;
let _lastUiTapTarget = null;

export function guardDoubleTap(target, ms = 320) {
  const now = Date.now();
  if(target && _lastUiTapTarget === target && now - _lastUiTapTime < ms) {
    return true;
  }
  _lastUiTapTarget = target || null;
  _lastUiTapTime = now;
  return false;
}

export function resetUiFocus(target) {
  if(target instanceof HTMLElement && typeof target.blur === "function") {
    target.blur();
  }
}

export function updateStatus(message) {
  if(statusChip) statusChip.textContent = message;
}
