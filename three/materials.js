// ============================================================
//  MATERIALS — Texture e materiali PROCEDURALI per Gotham 3D
//  Tutto generato a runtime con <canvas> (CanvasTexture):
//  NESSUNA immagine esterna, nessun asset, nessuno shader pesante.
//
//  Genera:
//   • Facciate: cemento rumoroso + griglia di finestre, alcune
//     accese (calde/fredde) → map (diffuse) + emissiveMap (bagliore)
//   • Strutture: cemento senza finestre (antenne, box sui tetti)
//   • Neon: materiali emissivi per le insegne accento
//
//  Indipendente dal Comic Reader 2D.
// ============================================================

import * as THREE from '../lib/three.module.min.js';

// Dimensioni tile facciata (potenza di 2 → upload GPU efficiente)
const TILE_W = 256;
const TILE_H = 512;

// ── Palette base "cemento / blu Gotham" (MAI #000000) ────────
const BASE_COLORS = ['#2a2f3a', '#3a4250', '#323a48', '#2f3640', '#353d4a', '#272d38'];
const WARM_WIN    = ['#ffd27a', '#ffbe66', '#ffcf8c', '#ffb84d']; // tungsteno
const COLD_WIN    = ['#bcd6ff', '#d6e6ff', '#9fc0ef', '#cfe2ff']; // fluorescente

// ── Utility ──────────────────────────────────────────────────
function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr)  { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Cemento rumoroso (anti "nero piatto") ────────────────────
// Riempie il canvas con il colore base, poi aggiunge:
//  • puntinatura chiaro/scuro (grana del cemento)
//  • striature orizzontali (sporco/umidità)
//  • bande verticali leggere (montanti architettonici)
function paintConcrete(ctx, w, h, base) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Grana: migliaia di micro-pixel chiari e scuri
  const grains = Math.floor(w * h * 0.05);
  for (let i = 0; i < grains; i++) {
    const x = Math.random() * w, y = Math.random() * h;
    ctx.fillStyle = Math.random() > 0.5
      ? 'rgba(255,255,255,0.035)'
      : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 1, 1);
  }

  // Striature verticali di sporco/colatura
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * w;
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(x, 0, rand(1, 3), h);
  }

  // Marcapiani orizzontali (cornici architettoniche)
  for (let i = 0; i < 10; i++) {
    const y = Math.random() * h;
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, y, w, rand(1, 2));
  }
}

// ── Costruisce UNA facciata: due canvas paralleli ────────────
// diffuse  → cemento + finestre (accese colorate, spente vetro scuro)
// emissive → nero, con SOLO le finestre accese che brillano
function buildFacade() {
  const base      = pick(BASE_COLORS);
  const cols      = Math.floor(rand(4, 7));
  const rows      = Math.floor(rand(9, 16));
  const litChance = rand(0.20, 0.50); // % di appartamenti accesi

  const dCanvas = document.createElement('canvas');
  dCanvas.width = TILE_W; dCanvas.height = TILE_H;
  const d = dCanvas.getContext('2d');

  const eCanvas = document.createElement('canvas');
  eCanvas.width = TILE_W; eCanvas.height = TILE_H;
  const e = eCanvas.getContext('2d');

  // Sfondo: cemento sul diffuse, nero puro SOLO sull'emissive
  paintConcrete(d, TILE_W, TILE_H, base);
  e.fillStyle = '#000000';
  e.fillRect(0, 0, TILE_W, TILE_H);

  // Griglia finestre
  const mX = TILE_W * 0.08, mY = TILE_H * 0.04;
  const cellW = (TILE_W - mX * 2) / cols;
  const cellH = (TILE_H - mY * 2) / rows;
  const winW  = cellW * 0.62, winH = cellH * 0.60;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = mX + c * cellW + (cellW - winW) / 2;
      const y = mY + r * cellH + (cellH - winH) / 2;

      if (Math.random() < litChance) {
        // ── Finestra ACCESA ──────────────────────────────
        const col = Math.random() < 0.6 ? pick(WARM_WIN) : pick(COLD_WIN);
        d.fillStyle = col; d.fillRect(x, y, winW, winH);   // diffuse
        e.fillStyle = col; e.fillRect(x, y, winW, winH);   // emissive (brilla)
        // nucleo più chiaro: effetto lampada
        e.fillStyle = 'rgba(255,255,255,0.28)';
        e.fillRect(x + winW * 0.22, y + winH * 0.22, winW * 0.56, winH * 0.56);
      } else {
        // ── Finestra SPENTA: vetro blu scuro (NON nero) ──
        d.fillStyle = 'rgba(22,30,46,0.9)';
        d.fillRect(x, y, winW, winH);
      }
    }
  }

  const map = new THREE.CanvasTexture(dCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const emissiveMap = new THREE.CanvasTexture(eCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;

  return { map, emissiveMap };
}

// ── Pool di materiali-facciata (riuso = performance) ─────────
// Genera N varianti una volta sola; ogni palazzo ne pesca una
// in base alla propria seed → varietà senza costo per-frame.
export function createFacadeMaterials(count = 12) {
  const mats = [];
  for (let i = 0; i < count; i++) {
    const { map, emissiveMap } = buildFacade();
    mats.push(new THREE.MeshStandardMaterial({
      map,
      emissive:          0xffffff,   // colore preso dall'emissiveMap
      emissiveMap,
      emissiveIntensity: 1.35,
      roughness:         rand(0.55, 0.95), // variazione richiesta
      metalness:         rand(0.05, 0.30)  // accenti metallici leggeri
    }));
  }
  return mats;
}

// ── Materiali strutturali (antenne, box tetto) ───────────────
// Cemento procedurale senza finestre.
export function createStructuralMaterials(count = 4) {
  const mats = [];
  for (let i = 0; i < count; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    paintConcrete(canvas.getContext('2d'), 128, 128, pick(BASE_COLORS));

    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;

    mats.push(new THREE.MeshStandardMaterial({
      map,
      roughness: rand(0.7, 0.95),
      metalness: rand(0.10, 0.35)
    }));
  }
  return mats;
}

// ── Materiali neon (insegne accento sui palazzi) ─────────────
export function createNeonMaterials() {
  const colors = [0x8800ff, 0x0055ff, 0xff1144, 0x00ee66, 0x33ddff];
  return colors.map(c => new THREE.MeshStandardMaterial({
    color:             0x000000,
    emissive:          c,
    emissiveIntensity: 3.6,
    roughness:         1.0
  }));
}

// ── Materiale terreno (asfalto bagnato riflettente) ──────────
export function createGroundMaterial() {
  return new THREE.MeshStandardMaterial({
    color:             0x0a0e16,
    emissive:          0x05080f,
    emissiveIntensity: 0.18,
    roughness:         0.32,   // basso → riflette i neon
    metalness:         0.28
  });
}
