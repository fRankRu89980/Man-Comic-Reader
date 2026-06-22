// ============================================================
//  GESTIONE STAGIONI — Menu popup, badge, navigazione
// ============================================================

import {
  menu, seasonLinks, seasonPopupCompact, seasonMenuClose,
  guardDoubleTap, resetUiFocus
} from "./app-init.js?v=8";

import {
  mostraPagina
} from "./app-reader.js?v=8";

// ── Navigazione da query string ──────────────────────────────

export function getInitialPageIndexFromQuery() {
  const season = new URLSearchParams(window.location.search).get("season");
  if(!season) return 0;

  // Supporto semplice per i link della libreria "Storie".
  const seasonMap = {
    s1: 0,
    s2: 44,
    s3: 97,
    s4: 143
  };

  return Object.prototype.hasOwnProperty.call(seasonMap, season)
    ? seasonMap[season]
    : 0;
}

// ── Menu stagioni ────────────────────────────────────────────

export function setupMenu() {
  if(!menu || !seasonPopupCompact) return;

  let menuOpened = false;

  function openSeasonMenu() {
    setMenuExpandedState(true);
  }

  function closeSeasonMenu() {
    setMenuExpandedState(false);
  }

  function setMenuExpandedState(expanded) {
    menuOpened = expanded;
    menu.classList.toggle("is-compact-hidden", !expanded);
    menu.classList.remove("hidden");
    seasonPopupCompact.classList.toggle("is-hidden", expanded);
    seasonPopupCompact.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  setMenuExpandedState(false);

  seasonPopupCompact.addEventListener("click", event => {
    event.stopPropagation();
    if(guardDoubleTap(event.currentTarget)) return;
    openSeasonMenu();
    resetUiFocus(event.currentTarget);
  });

  if(seasonMenuClose) {
    seasonMenuClose.addEventListener("click", event => {
      event.stopPropagation();
      if(guardDoubleTap(event.currentTarget)) return;
      closeSeasonMenu();
      resetUiFocus(event.currentTarget);
    });
  }

  seasonLinks.forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const page = parseInt(link.dataset.page, 10);
      if(!Number.isNaN(page)) {
        mostraPagina(page - 1);
      }
      resetUiFocus(event.currentTarget);
    });
  });

  let touchTimer = null;
  seasonLinks.forEach(link => {
    link.addEventListener("touchstart", () => {
      if(link.classList.contains("expanded")) return;
      seasonLinks.forEach(item => {
        if(item !== link) item.classList.remove("expanded");
      });
      link.classList.add("expanded");
      if(touchTimer) {
        window.clearTimeout(touchTimer);
      }
      touchTimer = window.setTimeout(() => {
        link.classList.remove("expanded");
      }, 2500);
    }, { passive: true });
  });

  document.addEventListener("touchstart", event => {
    if(!event.target.closest(".menu") && !event.target.closest(".season-popup-row")) {
      seasonLinks.forEach(link => link.classList.remove("expanded"));
      if(touchTimer) {
        window.clearTimeout(touchTimer);
        touchTimer = null;
      }
    }
  }, { passive: true });

  let lastScrollY = window.scrollY || 0;
  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY || 0;
    const scrollingDown = currentScrollY > lastScrollY;

    if(menuOpened) {
      if(scrollingDown && currentScrollY > 80) {
        menu.classList.add("hidden");
      } else {
        menu.classList.remove("hidden");
      }
    }

    lastScrollY = currentScrollY;
  }, { passive: true });

  document.addEventListener("click", event => {
    if(!menuOpened) return;
    if(event.target.closest(".menu") || event.target.closest(".season-popup-row")) return;
    closeSeasonMenu();
  });
}
