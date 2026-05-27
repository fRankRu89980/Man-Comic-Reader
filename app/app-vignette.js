// ============================================================
//  POPUP VIGNETTE — Aree cliccabili e zoom ingrandito
// ============================================================

import {
  vignetteDisponibili, defaultLayout,
  state,
  modal, imgZoom,
  vignetteContainer,
  updateStatus
} from "./app-init.js?v=7";

// ── Vignette ─────────────────────────────────────────────────

function generaVignetta(pagina, index) {
  return `vignette/vignetta${pagina}_${index}.jpeg`;
}

function getVignetteLayout() {
  return defaultLayout;
}

export function closeModal() {
  modal.hidden = true;
  state.modalOpen = false;
  imgZoom.removeAttribute("src");
}

function openVignetta(src) {
  if(state.modalOpen || !src) return;
  imgZoom.src = src;
  modal.hidden = false;
  state.modalOpen = true;
}

function createVignetteArea(pagina, index, areaData) {
  const area = document.createElement("div");
  const vignettaSrc = generaVignetta(pagina, index);
  const hasVignetta = vignetteDisponibili.has(vignettaSrc);
  const layoutClass = `vignetta-layout-${index}`;

  area.className = "vignetta-area";
  area.classList.add(layoutClass);
  area.dataset.vignettaSrc = vignettaSrc;
  area.dataset.hasVignetta = hasVignetta ? "true" : "false";

  area.addEventListener("click", event => {
    event.stopPropagation();
    if(!hasVignetta) {
      updateStatus(`Nessuna vignetta dedicata per la pagina ${pagina}.`);
      return;
    }
    openVignetta(vignettaSrc);
  });

  return area;
}

export function creaVignette(pagina) {
  vignetteContainer.innerHTML = "";
  const layout = getVignetteLayout(pagina);
  layout.forEach((areaData, index) => {
    vignetteContainer.appendChild(createVignetteArea(pagina, index, areaData));
  });
}

export function resolveTapTarget(clientX, clientY) {
  const tapped = document.elementFromPoint(clientX, clientY);
  const vignetta = tapped && tapped.closest ? tapped.closest(".vignetta-area") : null;
  if(!vignetta) return;
  if(vignetta.dataset.hasVignetta !== "true") {
    updateStatus(`Nessuna vignetta dedicata per la pagina ${state.paginaCorrente + 1}.`);
    return;
  }
  openVignetta(vignetta.dataset.vignettaSrc);
}
