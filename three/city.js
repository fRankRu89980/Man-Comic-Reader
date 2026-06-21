// ============================================================
//  CITY — Gotham procedurale con riciclo infinito
//  Edifici BoxGeometry con FACCIATE PROCEDURALI (materials.js):
//  cemento rumoroso + griglia di finestre emissive. Niente nero
//  piatto, niente immagini esterne, niente mesh-finestra extra.
// ============================================================

import * as THREE from '../lib/three.module.min.js';
import {
  createFacadeMaterials,
  createStructuralMaterials,
  createNeonMaterials,
  createGroundMaterial
} from './materials.js';

// ── Parametri layout ─────────────────────────────────────────
const ROWS          = 22;   // file di palazzi sull'asse Z
const ROW_SPACING   = 26;   // distanza tra file
const COLS_PER_SIDE = 3;    // colonne per lato della strada
const LANE_HALF     = 9;    // metà larghezza strada centrale
const COL_SPACING   = 13;   // distanza tra colonne
const TOTAL_DEPTH   = ROWS * ROW_SPACING;

// ── Pseudo-random deterministico ─────────────────────────────
function sr(seed) {
  const x = Math.sin(seed + 1.0) * 43758.5453123;
  return x - Math.floor(x);
}

export function createCity(scene) {

  // ── Materiali procedurali (generati una volta sola) ───────
  const facadeMats     = createFacadeMaterials(12);   // 12 varianti facciata
  const structuralMats = createStructuralMaterials(4); // cemento liscio
  const neonMats       = createNeonMaterials();        // accenti emissivi

  // Tutti i mesh da riciclare
  const meshes = [];

  // ── Generazione palazzi ───────────────────────────────────
  for (let row = 0; row < ROWS; row++) {
    for (let side = -1; side <= 1; side += 2) {
      for (let col = 0; col < COLS_PER_SIDE; col++) {

        const seed = row * 300 + (side + 2) * 60 + col;

        // Zona rada: colonna esterna ha ~20% di chance di saltare
        if (col === COLS_PER_SIDE - 1 && sr(seed + 99) < 0.20) continue;

        // ── Dimensioni palazzo (distribuzione bimodale) ────
        const heightRoll = sr(seed + 1);
        const h = heightRoll > 0.75
          ? 55 + sr(seed + 2) * 50        // supertall: 55-105
          : 8  + sr(seed + 2) * 40;       // normale:   8-48

        const w = 5.5 + sr(seed)     * 9;
        const d = 5.0 + sr(seed + 3) * 9;

        // ── Posizione palazzo ──────────────────────────────
        const xBase = side * (LANE_HALF + col * COL_SPACING + 4);
        const x = xBase + (sr(seed + 4) - 0.5) * 3;
        const z = -(row * ROW_SPACING) - sr(seed + 5) * 8;

        // ── Facciata procedurale (1 delle 12 varianti) ─────
        // La griglia di finestre emissive è nella texture:
        // niente più mesh-finestra separati → molto più leggero.
        const fMat  = facadeMats[Math.floor(sr(seed + 6) * facadeMats.length)];
        const bGeo  = new THREE.BoxGeometry(w, h, d);
        const bMesh = new THREE.Mesh(bGeo, fMat);
        bMesh.position.set(x, h / 2, z);
        scene.add(bMesh);
        meshes.push(bMesh);

        // ── Antenna (sui palazzi supertall) ────────────────
        if (h > 55 && sr(seed + 8) > 0.30) {
          const aH   = 8 + sr(seed + 9) * 18;
          const aMat = structuralMats[Math.floor(sr(seed + 8) * structuralMats.length)];
          const aGeo = new THREE.BoxGeometry(0.55, aH, 0.55);
          const aM   = new THREE.Mesh(aGeo, aMat);
          aM.position.set(x + (sr(seed + 10) - 0.5) * w * 0.4, h + aH / 2, z);
          scene.add(aM);
          meshes.push(aM);
        }

        // ── Box sul tetto (dettaglio urbanistico) ──────────
        if (h > 20 && h <= 55 && sr(seed + 11) > 0.50) {
          const rW = w * 0.30, rH = 2.5 + sr(seed + 12) * 4, rD = d * 0.30;
          const rMat = structuralMats[Math.floor(sr(seed + 11) * structuralMats.length)];
          const rGeo = new THREE.BoxGeometry(rW, rH, rD);
          const rM   = new THREE.Mesh(rGeo, rMat);
          rM.position.set(
            x + (sr(seed + 13) - 0.5) * w * 0.5,
            h + rH / 2,
            z + (sr(seed + 14) - 0.5) * d * 0.4
          );
          scene.add(rM);
          meshes.push(rM);
        }

        // ── Insegna neon (35% dei palazzi, faccia fronte) ──
        if (sr(seed + 15) > 0.65) {
          const nIdx = Math.floor(sr(seed + 16) * neonMats.length);
          const nW   = 2.5 + sr(seed + 17) * 4.5;
          const nGeo = new THREE.BoxGeometry(nW, 0.55, 0.18);
          const nM   = new THREE.Mesh(nGeo, neonMats[nIdx]);
          nM.position.set(
            x + (sr(seed + 18) - 0.5) * w * 0.65,
            3 + sr(seed + 19) * (Math.min(h, 30) * 0.6),
            z + d / 2 + 0.22
          );
          scene.add(nM);
          meshes.push(nM);
        }
      }
    }
  }

  // ── Terreno (asfalto bagnato riflettente) ─────────────────
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(280, TOTAL_DEPTH * 3.5),
    createGroundMaterial()
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // ── Aggiornamento per città infinita ─────────────────────
  function update(cameraZ) {
    meshes.forEach(mesh => {
      if (mesh.position.z > cameraZ + ROW_SPACING) {
        mesh.position.z -= TOTAL_DEPTH;
      }
    });
    ground.position.z = cameraZ - TOTAL_DEPTH * 0.5;
  }

  return { update };
}
