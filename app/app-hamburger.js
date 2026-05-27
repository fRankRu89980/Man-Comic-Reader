// ============================================================
//  MENU HAMBURGER — Drawer laterale, accessibilità, desktop
// ============================================================

import {
  hamburgerToggle, siteDrawer, siteDrawerOverlay, siteDrawerLinks,
  guardDoubleTap, resetUiFocus
} from "./app-init.js?v=7";

// ── Icone drawer ─────────────────────────────────────────────

export function setupDrawerIcons() {
  const drawerIcons = Array.from(document.querySelectorAll(".site-drawer-link-icon"));

  drawerIcons.forEach(icon => {
    const hideIcon = () => {
      icon.classList.add("is-missing");
    };

    if(icon.complete && icon.naturalWidth === 0) {
      hideIcon();
      return;
    }

    icon.addEventListener("error", hideIcon, { once: true });
  });
}

// ── Menu hamburger ───────────────────────────────────────────

export function setupHamburgerMenu() {
  if(!hamburgerToggle || !siteDrawer || !siteDrawerOverlay) return;

  let drawerOpen = false;
  let lastDrawerFocus = null;
  const desktopDrawerQuery = window.matchMedia("(min-width: 1024px)");

  function isDesktopDrawerMode() {
    return desktopDrawerQuery.matches;
  }

  // Apriamo il drawer spostando il focus al primo link utile.
  function openDrawer({ focusFirstLink = true } = {}) {
    drawerOpen = true;
    lastDrawerFocus = document.activeElement instanceof HTMLElement ? document.activeElement : hamburgerToggle;
    hamburgerToggle.setAttribute("aria-expanded", "true");
    hamburgerToggle.setAttribute("aria-label", "Chiudi menu principale");
    siteDrawerOverlay.hidden = false;
    siteDrawer.classList.add("is-open");
    siteDrawer.removeAttribute("aria-hidden");
    siteDrawer.inert = false;
    document.body.classList.add("hamburger-open");

    const firstLink = siteDrawerLinks[0];
    if(focusFirstLink && firstLink && typeof firstLink.focus === "function") {
      firstLink.focus();
    }
  }

  // Chiudiamo il drawer e riportiamo il focus al trigger.
  function closeDrawer({ restoreFocus = true } = {}) {
    drawerOpen = false;
    hamburgerToggle.setAttribute("aria-expanded", "false");
    hamburgerToggle.setAttribute("aria-label", "Apri menu principale");
    siteDrawer.classList.remove("is-open");
    siteDrawer.setAttribute("aria-hidden", "true");
    siteDrawer.inert = true;
    siteDrawerOverlay.hidden = true;
    document.body.classList.remove("hamburger-open");

    if(
      siteDrawer.contains(document.activeElement) &&
      restoreFocus &&
      lastDrawerFocus &&
      typeof lastDrawerFocus.focus === "function"
    ) {
      lastDrawerFocus.focus();
    }
  }

  function syncDrawerMode() {
    if(isDesktopDrawerMode()) {
      openDrawer({ focusFirstLink: false });
      siteDrawerOverlay.hidden = true;
      document.body.classList.remove("hamburger-open");
      document.body.classList.add("desktop-drawer-visible");
      return;
    }

    document.body.classList.remove("desktop-drawer-visible");
    closeDrawer({ restoreFocus: false });
  }

  function toggleDrawer() {
    if(drawerOpen) {
      closeDrawer();
      return;
    }
    openDrawer();
  }

  hamburgerToggle.addEventListener("click", event => {
    event.stopPropagation();
    if(isDesktopDrawerMode()) return;
    if(guardDoubleTap(event.currentTarget, 220)) return;
    toggleDrawer();
    resetUiFocus(event.currentTarget);
  });

  siteDrawerOverlay.addEventListener("click", () => {
    if(isDesktopDrawerMode()) return;
    closeDrawer();
  });

  siteDrawerLinks.forEach(link => {
    link.addEventListener("click", () => {
      if(isDesktopDrawerMode()) return;
      closeDrawer();
    });
  });

  document.addEventListener("keydown", event => {
    if(event.key === "Escape" && drawerOpen && !isDesktopDrawerMode()) {
      closeDrawer();
    }
  });

  if(typeof desktopDrawerQuery.addEventListener === "function") {
    desktopDrawerQuery.addEventListener("change", syncDrawerMode);
  } else if(typeof desktopDrawerQuery.addListener === "function") {
    desktopDrawerQuery.addListener(syncDrawerMode);
  }

  syncDrawerMode();
}
