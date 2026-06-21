// ============================================================
//  CONTROLS — Scroll e touch per muovere la camera in avanti
// ============================================================

export function createControls() {
  let velocity  = 0;
  let touchLastY = 0;

  function onWheel(event) {
    // deltaY > 0 = scroll giù = avanza nella città
    velocity += event.deltaY * 0.018;
  }

  function onTouchStart(event) {
    touchLastY = event.touches[0].clientY;
  }

  function onTouchMove(event) {
    const delta = touchLastY - event.touches[0].clientY;
    velocity += delta * 0.04;
    touchLastY = event.touches[0].clientY;
  }

  window.addEventListener("wheel",      onWheel,      { passive: true });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove",  onTouchMove,  { passive: true });

  function getVelocity() {
    velocity *= 0.90;   // attrito — rallenta da solo
    return velocity;
  }

  function destroy() {
    window.removeEventListener("wheel",      onWheel);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove",  onTouchMove);
  }

  return { getVelocity, destroy };
}
