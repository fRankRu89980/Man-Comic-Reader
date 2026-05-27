1// ============================================================
//  PWA & SERVICE WORKER — Installazione, cache, aggiornamento
//  Post-login refresh, iOS fallback, prompt nativi
// ============================================================

import {
  APP_VERSION, SERVICE_WORKER_URL, APP_STORAGE_PREFIX,
  INSTALL_DISMISS_KEY, LOGIN_SUCCESS_EVENT,
  state,
  installBtn,
  iosInstallModal, iosInstallCard, iosInstallTitle, iosInstallDescription,
  iosInstallSteps, iosInstallClose, iosInstallDismiss,
  installUiState,
  guardDoubleTap, resetUiFocus
} from "./app-init.js?v=7";

// ── Rilevamento ambiente ─────────────────────────────────────

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIos() {
  const ua = window.navigator.userAgent;
  const touchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/i.test(ua) || touchMac;
}

function isSafari() {
  const ua = window.navigator.userAgent;
  return /safari/i.test(ua) && !/crios|fxios|edgios|chrome|android/i.test(ua);
}

function isIosChrome() {
  return isIos() && /crios/i.test(window.navigator.userAgent);
}

function isIosSafari() {
  return isIos() && isSafari();
}

function isLocalDevelopmentHost() {
  return location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "::1";
}

// ── Install helpers ──────────────────────────────────────────

function installDismissed() {
  return window.localStorage.getItem(INSTALL_DISMISS_KEY) === "1";
}

function hideInstallUi() {
  installBtn.hidden = true;
  closeInstallInstructions({ restoreFocus: false });
}

function showInstallButton(label) {
  if(isStandalone() || installDismissed()) return;
  installBtn.textContent = label;
  installBtn.setAttribute("aria-label", label);
  installBtn.hidden = false;
}

function getIosInstallContent() {
  if(isIosChrome()) {
    return {
      buttonLabel: "Aggiungi alla Home",
      title: "Aggiungi con Chrome",
      description: "Su iPhone, Chrome non mostra un prompt installabile. Puoi comunque aggiungere Comic Reader alla schermata Home dal menu di condivisione.",
      steps: [
        "Apri il menu di condivisione di Chrome.",
        "Scegli \"Aggiungi alla schermata Home\".",
        "Conferma per salvare l'app sulla Home."
      ]
    };
  }

  return {
    buttonLabel: "Aggiungi alla Home",
    title: "Aggiungi con Safari",
    description: "Su iPhone, Safari permette di aggiungere Comic Reader alla schermata Home tramite il menu Condividi.",
    steps: [
      "Tocca il pulsante Condividi di Safari.",
      "Seleziona \"Aggiungi alla schermata Home\".",
      "Conferma con \"Aggiungi\" per creare l'icona."
    ]
  };
}

function renderInstallInstructions(content) {
  if(!iosInstallTitle || !iosInstallDescription || !iosInstallSteps) return;

  iosInstallTitle.textContent = content.title;
  iosInstallDescription.textContent = content.description;
  iosInstallSteps.innerHTML = "";

  content.steps.forEach(step => {
    const item = document.createElement("li");
    item.textContent = step;
    iosInstallSteps.appendChild(item);
  });
}

function openInstallInstructions() {
  if(!iosInstallModal || installUiState.sessionClosed || isStandalone()) return;

  renderInstallInstructions(getIosInstallContent());
  installUiState.lastFocusedElement = document.activeElement;
  iosInstallModal.hidden = false;
  iosInstallModal.setAttribute("aria-hidden", "false");

  if(iosInstallCard) {
    iosInstallCard.focus();
  }
}

function closeInstallInstructions(options = {}) {
  if(!iosInstallModal) return;

  const { restoreFocus = true, rememberSessionClose = false } = options;
  iosInstallModal.hidden = true;
  iosInstallModal.setAttribute("aria-hidden", "true");

  if(rememberSessionClose) {
    installUiState.sessionClosed = true;
  }

  if(restoreFocus && installUiState.lastFocusedElement && typeof installUiState.lastFocusedElement.focus === "function") {
    installUiState.lastFocusedElement.focus();
  }
}

// ── Cache e auth state ───────────────────────────────────────

function clearPrefixedStorage(storage, prefix = APP_STORAGE_PREFIX) {
  if(!storage) return;

  const removableKeys = [];

  for(let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if(typeof key === "string" && key.startsWith(prefix)) {
      removableKeys.push(key);
    }
  }

  removableKeys.forEach(key => {
    storage.removeItem(key);
  });
}

function clearClientAuthState() {
  try {
    clearPrefixedStorage(window.localStorage);
  } catch (error) {
    console.warn("Impossibile pulire localStorage:", error);
  }

  try {
    clearPrefixedStorage(window.sessionStorage);
  } catch (error) {
    console.warn("Impossibile pulire sessionStorage:", error);
  }
}

function buildCacheBustUrl(url, version = APP_VERSION) {
  const absoluteUrl = new URL(url, window.location.href);
  absoluteUrl.searchParams.set("_appVersion", version);
  absoluteUrl.searchParams.set("_ts", `${Date.now()}`);
  return absoluteUrl.toString();
}

async function invalidateAppCaches() {
  if(!("caches" in window)) return;

  try {
    const keys = await window.caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith("comic-reader-"))
        .map(key => window.caches.delete(key))
    );
  } catch (error) {
    console.warn("Impossibile invalidare le cache applicative:", error);
  }
}

async function refreshServiceWorkerState() {
  if(!("serviceWorker" in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if(!registration) return false;

    await registration.update();
    await invalidateAppCaches();
    return true;
  } catch (error) {
    console.warn("Aggiornamento service worker non riuscito:", error);
    return false;
  }
}

async function fetchFreshJson(url, options = {}) {
  const response = await fetch(buildCacheBustUrl(url, options.appVersion), {
    method: options.method || "GET",
    credentials: options.credentials || "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.headers || {})
    }
  });

  if(!response.ok) {
    throw new Error(`Fresh fetch fallita: ${response.status}`);
  }

  return response.json();
}

async function handlePostLoginRefresh(options = {}) {
  const {
    sessionUrl = null,
    appVersion = APP_VERSION,
    reloadUrl = window.location.href,
    forceReload = false
  } = options;

  clearClientAuthState();
  await refreshServiceWorkerState();

  let shouldReload = forceReload;

  if(sessionUrl) {
    try {
      const sessionState = await fetchFreshJson(sessionUrl, { appVersion });

      if(sessionState && typeof sessionState === "object") {
        shouldReload = shouldReload || sessionState.requiresReload === true;
        shouldReload = shouldReload || (
          typeof sessionState.appVersion === "string" &&
          sessionState.appVersion !== appVersion
        );
      }
    } catch (error) {
      console.warn("Verifica sessione post-login non riuscita:", error);
      shouldReload = true;
    }
  }

  if(shouldReload) {
    window.location.assign(buildCacheBustUrl(reloadUrl, appVersion));
  }
}

// ── Exports ──────────────────────────────────────────────────

export function setupPostLoginRefreshBridge() {
  window.addEventListener(LOGIN_SUCCESS_EVENT, event => {
    handlePostLoginRefresh(event.detail || {});
  });
}

export async function registerServiceWorker() {
  if(!("serviceWorker" in navigator)) return;
  if(!window.isSecureContext && !isLocalDevelopmentHost()) return;

  try {
    if(isLocalDevelopmentHost()) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));

      if("caches" in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(
          cacheKeys
            .filter(key => key.startsWith("comic-reader-"))
            .map(key => window.caches.delete(key))
        );
      }

      return;
    }

    let reloadingAfterSwUpdate = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if(reloadingAfterSwUpdate) return;
      reloadingAfterSwUpdate = true;
      window.location.reload();
    });

    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      updateViaCache: "none"
    });

    await registration.update();
  } catch (error) {
    console.warn("Service worker non registrato:", error);
  }
}

export function setupInstallUi() {
  if(!installBtn || !iosInstallModal) return;

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    state.installPromptInFlight = false;
    showInstallButton("Installa App");
  });

  window.addEventListener("appinstalled", () => {
    state.deferredInstallPrompt = null;
    state.installPromptInFlight = false;
    hideInstallUi();
  });

  installBtn.addEventListener("click", async () => {
    if(guardDoubleTap(installBtn, 320)) return;

    if(state.deferredInstallPrompt) {
      if(state.installPromptInFlight) return;

      state.installPromptInFlight = true;

      try {
        await state.deferredInstallPrompt.prompt();
        const choiceResult = await state.deferredInstallPrompt.userChoice;

        if(choiceResult && choiceResult.outcome === "accepted") {
          hideInstallUi();
        } else if(!isStandalone()) {
          hideInstallUi();
        }
      } catch (error) {
        console.warn("Install prompt non completato:", error);
        if(!isStandalone()) {
          hideInstallUi();
        }
      } finally {
        state.deferredInstallPrompt = null;
        state.installPromptInFlight = false;
      }

      resetUiFocus(installBtn);
      return;
    }

    if(isIos() && !isStandalone()) {
      openInstallInstructions();
      resetUiFocus(installBtn);
      return;
    }

    resetUiFocus(installBtn);
  });

  iosInstallClose.addEventListener("click", event => {
    closeInstallInstructions({ rememberSessionClose: true });
    resetUiFocus(event.currentTarget);
  });

  iosInstallDismiss.addEventListener("click", event => {
    window.localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    hideInstallUi();
    resetUiFocus(event.currentTarget);
  });

  iosInstallModal.addEventListener("click", event => {
    if(event.target === iosInstallModal) {
      closeInstallInstructions({ rememberSessionClose: true });
    }
  });

  document.addEventListener("keydown", event => {
    if(event.key === "Escape" && !iosInstallModal.hidden) {
      closeInstallInstructions({ rememberSessionClose: true });
    }
  });

  if(isStandalone()) {
    hideInstallUi();
    return;
  }

  if(isIos() && !installDismissed()) {
    const content = getIosInstallContent();
    renderInstallInstructions(content);
    showInstallButton(content.buttonLabel);
    return;
  }
}
