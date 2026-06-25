// ============================================================
//  INTRO — Sequenza animata + SCHERMATA DI CARICAMENTO.
//  Modalità 3D "costruzione a mattoni" (Three.js, caricato solo
//  alla prima visita di sessione). Fallback statico (logo+titolo)
//  se WebGL non c'è o l'utente preferisce meno animazioni.
//  L'intro NON sfuma finché il sito non è pronto (risorse iniziali
//  + prima tavola caricate): così i dispositivi lenti non vedono un
//  sito "smontato". Tetto massimo di sicurezza. Saltabile con
//  click / Esc / Invio. Si mostra una volta per sessione.
// ============================================================

const SEEN_KEY = "introSeen";
const MAX_WAIT = 12000;    // tetto: oltre questo l'intro si chiude comunque

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
  let hardCap = null;
  let animDone = false;     // animazione/sequenza intro completata
  let pageReady = false;    // struttura del sito caricata (risorse iniziali + prima tavola)

  // Indicatore "Caricamento" (mostrato solo se a fine animazione il sito non è ancora pronto).
  const loadingEl = document.createElement("div");
  loadingEl.className = "intro-loading";
  const lbl = document.createElement("span");
  lbl.textContent = "Caricamento";
  loadingEl.appendChild(lbl);
  for (let i = 0; i < 3; i++) loadingEl.appendChild(document.createElement("i"));
  overlay.appendChild(loadingEl);

  function finish() {
    if (closed) return;
    closed = true;
    if (hardCap) { window.clearTimeout(hardCap); hardCap = null; }
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch (e) {}
    if (controller) { try { controller.dispose(); } catch (e) {} controller = null; }
    overlay.classList.add("intro-done");
    document.body.classList.remove("intro-lock");
    const remove = () => { if (overlay.parentNode) overlay.remove(); };
    overlay.addEventListener("transitionend", remove, { once: true });
    window.setTimeout(remove, 1000); // fallback
  }

  // Sfuma SOLO quando animazione finita E sito pronto.
  function maybeFinish() {
    if (animDone && pageReady) { finish(); return; }
    if (animDone && !pageReady) loadingEl.classList.add("is-visible"); // ancora in caricamento
  }

  // Skip manuale (bypassa i gate: l'utente può sempre saltare).
  overlay.addEventListener("click", finish);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
  }, { once: true });

  // Tetto di sicurezza: non bloccare mai oltre MAX_WAIT.
  hardCap = window.setTimeout(finish, MAX_WAIT);

  // ── Attesa "sito pronto": risorse iniziali + prima tavola del fumetto ──
  (function waitForReady() {
    const tasks = [];
    // 1) risorse iniziali della pagina
    if (document.readyState === "complete") tasks.push(Promise.resolve());
    else tasks.push(new Promise(r => window.addEventListener("load", r, { once: true })));
    // 2) prima tavola (#comic-current): il reader le imposta lo src dopo il preload
    const firstImg = document.getElementById("comic-current");
    if (firstImg) {
      tasks.push(new Promise(r => {
        if (firstImg.complete && firstImg.naturalWidth > 0) { r(); return; }
        firstImg.addEventListener("load", r, { once: true });
        firstImg.addEventListener("error", r, { once: true });
        // lo src arriva in modo asincrono dal reader → ricontrollo periodico
        const iv = window.setInterval(() => {
          if (firstImg.complete && firstImg.naturalWidth > 0) { window.clearInterval(iv); r(); }
        }, 250);
        window.setTimeout(() => { window.clearInterval(iv); r(); }, MAX_WAIT);
      }));
    }
    Promise.all(tasks).then(() => { pageReady = true; maybeFinish(); });
  })();

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("intro-canvas");

  // Fallback statico: nessun 3D → logo+titolo, durata minima poi gate "pronto".
  if (reduce || !canvas || !hasWebGL()) {
    window.setTimeout(() => { animDone = true; maybeFinish(); }, 2400);
    return;
  }

  // Modalità 3D: nascondi il fallback statico e mostra il canvas.
  overlay.classList.add("intro-3d");

  import("../three/intro-scene.js?v=12")
    .then(mod => {
      if (closed) return;
      controller = mod.initIntro3D(canvas, {
        logoSrc: "./icons/icon-512.png",
        title: "BATMAN",
        onDone: () => { animDone = true; maybeFinish(); },
      });
    })
    .catch(err => {
      console.warn("Intro 3D non disponibile:", err);
      if (closed) return;
      overlay.classList.remove("intro-3d");   // torna al fallback statico
      window.setTimeout(() => { animDone = true; maybeFinish(); }, 1200);
    });
}
