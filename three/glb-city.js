// ============================================================
//  GLB-CITY — Città Gotham esportata da Blender, con riciclo
//  infinito. Sostituisce city.js + models.js + landmarks.js:
//  il GLB contiene già palazzi PBR, finestre emissive e modelli.
//  Usato dalla scena principale (scene.js → gotham-dev.html).
// ============================================================

import * as THREE from '../lib/three.module.min.js';
import { GLTFLoader } from '../lib/GLTFLoader.js';

const TOTAL_DEPTH = 572;   // coerente con la città originale (22 × 26)
const SEGMENTS    = 2;     // segmenti riciclati → città "infinita"

// Carica il GLB e prepara il riciclo. Ritorna { update(cameraZ) }.
// Il caricamento è asincrono: update è un no-op finché non è pronto.
export function createGlbCity(scene, url, { onReady, onProgress } = {}) {
  const segments = [];
  let ready = false;

  new GLTFLoader().load(
    url,
    (gltf) => {
      const base = gltf.scene;

      // Rimuovi eventuali camere incorporate nel GLB (usiamo la nostra)
      const cams = [];
      base.traverse(o => { if (o.isCamera) cams.push(o); });
      cams.forEach(c => c.parent && c.parent.remove(c));

      // Segmento 0 = originale; gli altri = cloni sfalsati in -Z.
      // clone(true) condivide geometrie e materiali → leggero in memoria.
      for (let i = 0; i < SEGMENTS; i++) {
        const seg = (i === 0) ? base : base.clone(true);
        seg.position.z = -i * TOTAL_DEPTH;
        scene.add(seg);
        segments.push(seg);
      }

      ready = true;
      if (typeof onReady === "function") onReady(gltf);
    },
    (e) => { if (onProgress && e.total) onProgress(e.loaded / e.total); },
    (err) => console.error("[Gotham GLB] Errore di caricamento:", err)
  );

  // Riciclo: quando un segmento è interamente dietro la camera,
  // lo si sposta davanti (stesso principio di city.js, per segmenti).
  function update(cameraZ) {
    if (!ready) return;
    for (const seg of segments) {
      if (seg.position.z - TOTAL_DEPTH > cameraZ) {
        seg.position.z -= SEGMENTS * TOTAL_DEPTH;
      }
    }
  }

  return { update };
}
