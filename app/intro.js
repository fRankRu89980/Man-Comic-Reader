// ============================================================
//  INTRO — Sequenza animata col logo del progetto all'apertura.
//  Si mostra una volta per sessione, poi sfuma rivelando il sito.
//  Saltabile con click / Esc / Invio.
// ============================================================

const SEEN_KEY = "introSeen";

export function setupIntro() {
  const overlay = document.getElementById("intro-overlay");
  if (!overlay) return;

  // Già vista in questa sessione → rimuovi subito (niente replay).
  let seen = false;
  try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch (e) {}
  if (seen) { overlay.remove(); return; }

  document.body.classList.add("intro-lock");

  let closed = false;
  function finish() {
    if (closed) return;
    closed = true;
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch (e) {}
    overlay.classList.add("intro-done");
    document.body.classList.remove("intro-lock");
    const remove = () => { if (overlay.parentNode) overlay.remove(); };
    overlay.addEventListener("transitionend", remove, { once: true });
    window.setTimeout(remove, 1000); // fallback
  }

  // Fine animazione → dissolvenza automatica
  window.setTimeout(finish, 2400);

  // Skip manuale
  overlay.addEventListener("click", finish);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
  }, { once: true });
}
