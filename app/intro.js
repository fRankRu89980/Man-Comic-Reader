// ============================================================
//  INTRO — Sequenza animata all'apertura del sito.
//  Modalità 3D "costruzione a mattoni" (Three.js, caricato solo
//  alla prima visita di sessione). Fallback statico (logo+titolo)
//  se WebGL non c'è o l'utente preferisce meno animazioni.
//  Si mostra una volta per sessione. Saltabile con click / Esc / Invio.
// ============================================================

const SEEN_KEY = "introSeen";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (e) { return false; }
}

export function setupIntro() {
  const overlay = document.getElementById("intro-overlay");
  if (!overlay) return;

  // Già vista in questa sessione → rimuovi subito (niente replay, niente Three.js).
  let seen = false;
  try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch (e) {}
  if (seen) { overlay.remove(); return; }

  document.body.classList.add("intro-lock");

  let closed = false;
  let controller = null;
  let safety = null;

  function finish() {
    if (closed) return;
    closed = true;
    if (safety) { window.clearTimeout(safety); safety = null; }
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch (e) {}
    if (controller) { try { controller.dispose(); } catch (e) {} controller = null; }
    overlay.classList.add("intro-done");
    document.body.classList.remove("intro-lock");
    const remove = () => { if (overlay.parentNode) overlay.remove(); };
    overlay.addEventListener("transitionend", remove, { once: true });
    window.setTimeout(remove, 1000); // fallback
  }

  // Skip manuale
  overlay.addEventListener("click", finish);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
  }, { once: true });

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("intro-canvas");

  // Fallback statico: nessun 3D → comportamento classico (logo+titolo, fade).
  if (reduce || !canvas || !hasWebGL()) {
    window.setTimeout(finish, 2400);
    return;
  }

  // Modalità 3D: nascondi il fallback statico e mostra il canvas.
  overlay.classList.add("intro-3d");
  safety = window.setTimeout(finish, 8000); // chiude comunque se qualcosa va storto

  import("../three/intro-scene.js?v=11")
    .then(mod => {
      if (closed) return;
      controller = mod.initIntro3D(canvas, {
        logoSrc: "./icons/icon-512.png",
        title: "BATMAN",
        onDone: finish,
      });
    })
    .catch(err => {
      console.warn("Intro 3D non disponibile:", err);
      if (closed) return;
      overlay.classList.remove("intro-3d");   // torna al fallback statico
      window.setTimeout(finish, 1200);
    });
}
