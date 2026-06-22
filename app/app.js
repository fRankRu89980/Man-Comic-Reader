
if (window.self !== window.top) {
  window.top.location.replace(window.self.location.href);
}

import {
  state,
  title
} from "./app-init.js?v=8";

import {
  mostraPagina,
  setupMediaPerformance,
  setupReaderZoom,
  setupNavigation
} from "./app-reader.js?v=8";

import {
  setupDrawerIcons,
  setupHamburgerMenu
} from "./app-hamburger.js?v=8";

import {
  setupSwipe
} from "./app-swipe.js?v=8";

import {
  setupMenu,
  getInitialPageIndexFromQuery
} from "./app-seasons.js?v=8";

import {
  setupInstallUi,
  setupPostLoginRefreshBridge,
  registerServiceWorker
} from "./app-pwa.js?v=8";

import {
  setupThemeSongVisual,
  setupRoulette
} from "./app-entertainment.js?v=8";

import {
  injectDisclaimer
} from "./site-disclaimer.js?v=8";

import {
  setupIntro
} from "./intro.js?v=8";

function setupTitleEffects() {
  if(!title) return;

  title.setAttribute("data-text", title.textContent);
  title.animate(
    [
      { transform: "scale(1) translateY(0)" },
      { transform: "scale(1.02) translateY(-2px)" },
      { transform: "scale(1) translateY(0)" }
    ],
    { duration: 2400, iterations: 1, easing: "ease-out", delay: 200 }
  );

  function doGlitch() {
    title.classList.add("glitch");
    title.classList.add("glitch-flash");
    window.setTimeout(() => {
      title.classList.remove("glitch");
      title.classList.remove("glitch-flash");
    }, 360);
  }

  function scheduleGlitch() {
    const delay = 6000 + Math.random() * 6000;
    window.setTimeout(() => {
      doGlitch();
      scheduleGlitch();
    }, delay);
  }

  scheduleGlitch();

  ["mouseenter", "touchstart"].forEach(eventName => {
    title.addEventListener(eventName, () => {
      title.classList.add("is-touch-pulse");
      window.setTimeout(() => {
        title.classList.remove("is-touch-pulse");
      }, 220);
    }, { passive: true });
  });
}


function boot() {
  setupIntro();
  state.paginaCorrente = getInitialPageIndexFromQuery();
  setupMediaPerformance();
  setupDrawerIcons();
  setupHamburgerMenu();
  setupMenu();
  setupReaderZoom();
  setupNavigation();
  setupTitleEffects();
  setupSwipe();
  setupInstallUi();
  setupPostLoginRefreshBridge();
  setupThemeSongVisual();
  setupRoulette();
  registerServiceWorker();
  injectDisclaimer();
  mostraPagina(state.paginaCorrente);
}

boot();
