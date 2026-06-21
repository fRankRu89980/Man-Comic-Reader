// ============================================================
//  ROULETTE3D-LAUNCH — Avvia la roulette 3D in overlay.
//  Three.js viene caricato SOLO al primo click (dynamic import),
//  così la home resta leggera. Transizione professionale via CSS.
// ============================================================

const overlay = document.getElementById("roulette3d-overlay");

if (overlay) {
  const canvas   = document.getElementById("roulette3d-overlay-canvas");
  const closeBtn = document.getElementById("roulette3d-overlay-close");
  const spinBtn  = document.getElementById("roulette3d-overlay-spin");
  const voiceBtn = document.getElementById("roulette3d-overlay-voice");
  const resultEl = document.getElementById("roulette3d-overlay-result");

  let controller = null;
  let loading = false;

  async function open() {
    if (loading) return;

    // Mostra overlay e fa partire la transizione (reflow → classe)
    overlay.hidden = false;
    overlay.removeAttribute("inert");
    overlay.setAttribute("aria-hidden", "false");
    void overlay.offsetWidth;
    overlay.classList.add("is-open");
    document.body.classList.add("roulette3d-lock");

    if (!controller) {
      loading = true;
      if (resultEl) resultEl.textContent = "Caricamento…";
      try {
        const mod = await import("../three/roulette-scene.js?v=7");
        controller = mod.initRoulette3D(canvas, {
          resultEl, spinBtn, voiceBtn,
          // Comunica l'estrazione alla roulette 2D: aggiorna il pannello
          // e posiziona la pallina bianca sul numero uscito.
          onResult: (text, number) => {
            window.dispatchEvent(new CustomEvent("roulette3d:result", { detail: { number, text } }));
          }
        });
      } catch (e) {
        console.error("Roulette 3D:", e);
        if (resultEl) resultEl.textContent = "Errore di caricamento";
        loading = false;
        return;
      }
      loading = false;
    }

    controller.setActive(true);
    controller.resize();
    controller.spin();            // gira appena aperta
  }

  function close() {
    overlay.classList.remove("is-open");
    document.body.classList.remove("roulette3d-lock");
    if (controller) controller.setActive(false);
    window.setTimeout(() => {
      overlay.hidden = true;
      overlay.setAttribute("inert", "");
      overlay.setAttribute("aria-hidden", "true");
    }, 450);
  }

  // Apertura: la roulette 2D, al click, emette questo evento (app-entertainment.js)
  window.addEventListener("roulette3d:open", open);
  if (closeBtn) closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
  });
}
