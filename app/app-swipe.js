// ============================================================
//  SWIPE MOBILE — Gesti touch: swipe, scroll, tap vignette
// ============================================================

import {
  SWIPE_INTENT_THRESHOLD, TAP_MAX_DISTANCE, SWIPE_TRIGGER_RATIO,
  fumetti,
  state,
  wrapper, currentLayer, shadow, vignetteContainer,
  isInteractiveElement
} from "./app-init.js?v=7";

import {
  setLayerTransitions,
  setLayerTransforms,
  getPageWidth,
  mostraPagina
} from "./app-reader.js?v=7";

import {
  resolveTapTarget
} from "./app-vignette.js?v=7";

// ── Swipe / scroll / tap ─────────────────────────────────────

export function setupSwipe() {
  if(!wrapper || !currentLayer || !shadow) return;

  let touchStartX = 0;
  let touchStartY = 0;
  let touchCurrentX = 0;
  let touchCurrentY = 0;
  let dragging = false;
  let gestureMode = null;
  let gestureBlocked = false;
  let pendingFrame = false;
  let lastDeltaX = 0;

  function canPreventTouch(event) {
    return !!event && event.cancelable === true;
  }

  function getConstrainedDelta(deltaX) {
    if(state.paginaCorrente === 0 && deltaX > 0) {
      return deltaX * 0.35;
    }
    if(state.paginaCorrente === fumetti.length - 1 && deltaX < 0) {
      return deltaX * 0.35;
    }
    return deltaX;
  }

  function resetTransform(animated = true) {
    setLayerTransitions(animated);
    setLayerTransforms(0);
    wrapper.classList.remove("is-swiping");
  }

  function scheduleDrag(deltaX) {
    lastDeltaX = getConstrainedDelta(deltaX);
    if(pendingFrame) return;
    pendingFrame = true;
    window.requestAnimationFrame(() => {
      pendingFrame = false;
      if(!dragging || gestureMode !== "swipe") return;
      setLayerTransforms(lastDeltaX);
    });
  }

  function clearGesture() {
    dragging = false;
    gestureMode = null;
    gestureBlocked = false;
    lastDeltaX = 0;
    pendingFrame = false;
    wrapper.classList.remove("is-swiping");
    vignetteContainer.querySelectorAll(".vignetta-area.active-touch").forEach(area => {
      area.classList.remove("active-touch");
    });
  }

  wrapper.addEventListener("touchstart", event => {
    if(state.modalOpen || event.touches.length !== 1) return;
    if(isInteractiveElement(event.target)) {
      gestureBlocked = true;
      return;
    }
    dragging = true;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchCurrentX = touchStartX;
    touchCurrentY = touchStartY;
    gestureMode = null;
    setLayerTransitions(false);
  }, { passive: true });

  wrapper.addEventListener("touchmove", event => {
    if(gestureBlocked || !dragging) return;

    touchCurrentX = event.touches[0].clientX;
    touchCurrentY = event.touches[0].clientY;

    const deltaX = touchCurrentX - touchStartX;
    const deltaY = touchCurrentY - touchStartY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if(!gestureMode) {
      if(absX < SWIPE_INTENT_THRESHOLD && absY < SWIPE_INTENT_THRESHOLD) {
        return;
      }
      if(absX > absY) {
        gestureMode = "swipe";
        wrapper.classList.add("is-swiping");
      } else {
        gestureMode = "scroll";
        resetTransform(false);
        return;
      }
    }

    if(gestureMode === "swipe") {
      if(canPreventTouch(event)) {
        event.preventDefault();
      }
      scheduleDrag(deltaX);
    }
  }, { passive: false });

  wrapper.addEventListener("touchend", event => {
    if(gestureBlocked) {
      clearGesture();
      return;
    }

    if(!dragging || state.modalOpen) {
      clearGesture();
      return;
    }

    const deltaX = touchCurrentX - touchStartX;
    const deltaY = touchCurrentY - touchStartY;
    const constrainedDeltaX = getConstrainedDelta(deltaX);
    const absX = Math.abs(constrainedDeltaX);
    const absY = Math.abs(deltaY);
    const pageWidth = getPageWidth();
    const swipeThreshold = pageWidth * SWIPE_TRIGGER_RATIO;

    if(gestureMode === "swipe" && absX >= swipeThreshold) {
      const direction = constrainedDeltaX < 0 ? 1 : -1;
      const targetDeltaX = direction === 1 ? -pageWidth : pageWidth;
      setLayerTransitions(true);
      setLayerTransforms(targetDeltaX);
      window.setTimeout(() => {
        if(direction === 1) {
          mostraPagina(state.paginaCorrente + 1);
        } else {
          mostraPagina(state.paginaCorrente - 1);
        }
      }, 280);
    } else {
      resetTransform(true);
      if(gestureMode !== "swipe" && absX <= TAP_MAX_DISTANCE && absY <= TAP_MAX_DISTANCE) {
        const changedTouch = event.changedTouches[0];
        resolveTapTarget(changedTouch.clientX, changedTouch.clientY);
      }
    }

    clearGesture();
  }, { passive: false });

  wrapper.addEventListener("touchcancel", () => {
    resetTransform(true);
    clearGesture();
  }, { passive: true });
}
