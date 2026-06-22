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
  let opener = null;   // elemento che ha aperto l'overlay (per ripristinare il focus)

  // Su smartphone la roulette 3D va usata in orizzontale: in verticale si mostra
  // il gate (CSS) e si attende la rotazione prima di far partire il giro.
  const portraitPhone = window.matchMedia("(orientation: portrait) and (max-width: 600px) and (pointer: coarse)");
  let waitingLandscape = false;

  function startSpinWhenReady() {
    if (portraitPhone.matches) {
      waitingLandscape = true;      // il giro parte appena lo schermo è orizzontale
      if (resultEl) resultEl.textContent = "Ruota lo schermo…";
    } else {
      waitingLandscape = false;
      controller.spin();
    }
  }

  function onOrientationChange() {
    if (!waitingLandscape) return;
    if (!overlay.classList.contains("is-open")) return;
    if (!portraitPhone.matches && controller) {
      waitingLandscape = false;
      controller.resize();
      controller.spin();
    }
  }

  // matchMedia change: addEventListener moderno + fallback addListener (Safari datati)
  if (portraitPhone.addEventListener) portraitPhone.addEventListener("change", onOrientationChange);
  else if (portraitPhone.addListener) portraitPhone.addListener(onOrientationChange);

  async function open() {
    if (loading) return;
    opener = document.activeElement;   // per ripristinare il focus alla chiusura

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
        const mod = await import("../three/roulette-scene.js?v=11");
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
    startSpinWhenReady();         // su smartphone in verticale: attende la rotazione
  }

  function close() {
    // a11y: togli il focus dall'overlay PRIMA di renderlo aria-hidden/inert,
    // così nessun elemento con focus resta dentro un contenitore nascosto.
    if (overlay.contains(document.activeElement)) {
      if (opener && opener !== document.body && typeof opener.focus === "function") opener.focus();
      else document.activeElement.blur();
    }
    overlay.classList.remove("is-open");
    document.body.classList.remove("roulette3d-lock");
    waitingLandscape = false;
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
