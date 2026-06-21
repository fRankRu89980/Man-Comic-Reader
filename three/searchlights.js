// ============================================================
//  SEARCHLIGHTS — Fari volumetrici + luci rosse anti-collisione
//  • Fari: coni di luce additiva che spazzano lentamente il cielo.
//  • Beacon: puntini rossi lampeggianti sulle guglie più alte
//    (come le luci aeronautiche dei grattacieli del riferimento).
//  Tutto riciclato lungo Z. Nessuna dipendenza dal Comic Reader.
// ============================================================

import * as THREE from '../lib/three.module.min.js';

const ROW_SPACING = 26;
const TOTAL_DEPTH = 22 * ROW_SPACING; // 572

// ── Fari (searchlight beams) ─────────────────────────────────
// Cilindro aperto: stretto alla base (proiettore) e largo in cima
// (alone in cielo). Materiale additivo a bassissima opacità.
function makeBeam(scene, { x, z, baseY, height, topR, tint }, beams) {
  const geo = new THREE.CylinderGeometry(topR, 0.5, height, 24, 1, true);
  geo.translate(0, height / 2, 0); // base all'origine, cresce verso +Y

  const mat = new THREE.MeshBasicMaterial({
    color:       tint,
    transparent: true,
    opacity:     0.05,
    side:        THREE.DoubleSide,
    depthWrite:  false,
    fog:         false,
    blending:    THREE.AdditiveBlending
  });

  // Pivot alla base: ruotando il gruppo il fascio spazza il cielo
  const pivot = new THREE.Group();
  pivot.position.set(x, baseY, z);
  pivot.add(new THREE.Mesh(geo, mat));
  scene.add(pivot);

  pivot.userData = {
    phase: Math.random() * Math.PI * 2,
    speed: 0.18 + Math.random() * 0.22,
    range: 0.32 + Math.random() * 0.22,
    tilt:  0.10 + Math.random() * 0.10
  };
  beams.push(pivot);
}

// ── Beacon rosso (luce aeronautica) ──────────────────────────
function makeBeacon(scene, { x, y, z }, beacons) {
  const mat = new THREE.MeshBasicMaterial({
    color:       0xff2a2a,
    transparent: true,
    opacity:     1,
    fog:         true,
    depthWrite:  false
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), mat);
  mesh.position.set(x, y, z);
  mesh.userData = { phase: Math.random() * Math.PI * 2, rate: 1.6 + Math.random() * 1.2 };
  scene.add(mesh);
  beacons.push(mesh);
}

// ── Posizionamenti ───────────────────────────────────────────
const BEAM_PLACEMENTS = [
  { x: -26, z: -110, baseY: 60, height: 230, topR: 16, tint: 0xbfe0ff },
  { x:  30, z: -260, baseY: 70, height: 240, topR: 18, tint: 0xcfe6ff },
  { x: -18, z: -430, baseY: 55, height: 220, topR: 15, tint: 0xb8d4ff },
];

const BEACON_PLACEMENTS = (() => {
  const list = [];
  // Distribuiti in altezza e profondità, su entrambi i lati
  for (let i = 0; i < 18; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    list.push({
      x: side * (12 + (i * 7) % 26),
      y: 60 + (i * 13) % 55,            // sulle guglie alte (60-115)
      z: -(i * 32 + 40)
    });
  }
  return list;
})();

// ── Export ───────────────────────────────────────────────────
export function createSearchlights(scene) {
  const beams   = [];
  const beacons = [];

  BEAM_PLACEMENTS.forEach(p => makeBeam(scene, p, beams));
  BEACON_PLACEMENTS.forEach(p => makeBeacon(scene, p, beacons));

  let time = 0;

  function update(cameraZ, delta) {
    time += delta;

    // Fari: spazzano il cielo (oscillazione su Z) con leggero tilt
    beams.forEach(pivot => {
      const u = pivot.userData;
      pivot.rotation.z = Math.sin(time * u.speed + u.phase) * u.range;
      pivot.rotation.x = u.tilt;
      if (pivot.position.z > cameraZ + ROW_SPACING) {
        pivot.position.z -= TOTAL_DEPTH;
      }
    });

    // Beacon: lampeggio rosso (on/off morbido) + riciclo
    beacons.forEach(b => {
      const s = Math.sin(time * b.userData.rate + b.userData.phase);
      b.material.opacity = s > 0 ? 0.45 + s * 0.55 : 0.12;
      if (b.position.z > cameraZ + ROW_SPACING) {
        b.position.z -= TOTAL_DEPTH;
      }
    });
  }

  return { update };
}
