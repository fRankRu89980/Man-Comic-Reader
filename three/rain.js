// ============================================================
//  RAIN — Pioggia volumetrica su Gotham
//  LineSegments: ogni goccia è un breve segmento verticale che
//  cade e si ricicla. L'intero sistema segue la camera, così la
//  pioggia è sempre attorno all'osservatore. Molto leggero.
// ============================================================

import * as THREE from '../lib/three.module.min.js';

const DROPS    = 1500;  // numero di gocce
const BOX_X    = 130;   // semi-larghezza box pioggia (X)
const BOX_Z    = 240;   // profondità box pioggia (Z, attorno alla camera)
const BOX_TOP  = 150;   // altezza dalla quale cadono
const SLANT_X  = 1.6;   // inclinazione orizzontale (vento)

export function createRain(scene) {
  const positions = new Float32Array(DROPS * 2 * 3); // 2 vertici × 3 coord
  const speed     = new Float32Array(DROPS);
  const yPos      = new Float32Array(DROPS);
  const len       = new Float32Array(DROPS);

  for (let i = 0; i < DROPS; i++) {
    const x = (Math.random() - 0.5) * BOX_X * 2;
    const z = (Math.random() - 0.5) * BOX_Z;
    const y = Math.random() * BOX_TOP;
    const l = 2.2 + Math.random() * 2.8;

    yPos[i]  = y;
    len[i]   = l;
    speed[i] = 95 + Math.random() * 70;   // unità/secondo

    const o = i * 6;
    // Vertice inferiore (coda)
    positions[o]     = x;
    positions[o + 1] = y;
    positions[o + 2] = z;
    // Vertice superiore (testa, leggermente spostato dal vento)
    positions[o + 3] = x + SLANT_X;
    positions[o + 4] = y + l;
    positions[o + 5] = z;
  }

  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);

  const mat = new THREE.LineBasicMaterial({
    color:       0x9fc2ff,
    transparent: true,
    opacity:     0.34,
    fog:         true,         // la pioggia lontana sfuma nella foschia
    depthWrite:  false
  });

  const rain = new THREE.LineSegments(geo, mat);
  rain.frustumCulled = false;
  scene.add(rain);

  function update(cameraZ, delta) {
    const arr = posAttr.array;
    for (let i = 0; i < DROPS; i++) {
      let y = yPos[i] - speed[i] * delta;
      if (y < 0) y += BOX_TOP;       // riciclo verticale
      yPos[i] = y;

      const o = i * 6;
      arr[o + 1] = y;                // coda
      arr[o + 4] = y + len[i];       // testa
    }
    posAttr.needsUpdate = true;

    // Il box di pioggia segue la camera (solo asse Z: la camera
    // si muove in avanti; X resta ~0).
    rain.position.z = cameraZ;
  }

  return { update };
}
