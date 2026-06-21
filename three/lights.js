// ============================================================
//  LIGHTS — Illuminazione cinematografica di Gotham
//  • Directional fredda (luna) dall'alto-sinistra
//  • Ambient debole ma sufficiente: nessuna faccia diventa nera
//  • Point light neon riciclabili lungo la strada
//  • Alone che segue la camera
//  Nessuna dipendenza dal Comic Reader 2D.
// ============================================================

import * as THREE from '../lib/three.module.min.js';

const STREET_LIGHT_COUNT  = 8;
const STREET_LIGHT_STRIDE = 55;
const STREET_LIGHT_DEPTH  = STREET_LIGHT_COUNT * STREET_LIGHT_STRIDE;

// Palette neon stradali: viola, blu, rosso, verde
const NEON_COLORS = [0x6600ff, 0x0055ff, 0xcc0044, 0x00cc66];

export function createLights(scene) {

  // ── Ambient — cielo notturno blu (riempimento minimo) ───
  // Valore scelto per garantire leggibilità delle facciate:
  // evita le "silhouette nere piatte" anche in ombra.
  const ambient = new THREE.AmbientLight(0x223150, 2.6);
  scene.add(ambient);

  // ── Luna — directional fredda dall'alto-sinistra ────────
  // Allineata al disco lunare di sky.js (x ≈ -80).
  const moon = new THREE.DirectionalLight(0x7ea0d8, 2.3);
  moon.position.set(-70, 120, 30);
  scene.add(moon);

  // Controluce caldo tenue dal basso-fronte: stacca i bordi
  // degli edifici dallo sfondo (rim light cinematografico).
  const rim = new THREE.DirectionalLight(0x3a4a66, 0.8);
  rim.position.set(20, 10, -60);
  scene.add(rim);

  // ── Luci neon stradali (riciclabili) ────────────────────
  const streetLights = [];
  for (let i = 0; i < STREET_LIGHT_COUNT; i++) {
    const color = NEON_COLORS[i % NEON_COLORS.length];
    const side  = i % 2 === 0 ? -9 : 9;
    const light = new THREE.PointLight(color, 3.5, 28, 2.0);
    light.position.set(side, 3, -i * STREET_LIGHT_STRIDE);
    scene.add(light);
    streetLights.push(light);
  }

  // ── Alone che segue la camera ───────────────────────────
  const followLight = new THREE.PointLight(0x4455cc, 2.2, 55, 1.6);
  scene.add(followLight);

  // ── Update per il loop ──────────────────────────────────
  function update(cameraZ) {
    followLight.position.set(0, 9, cameraZ);
    streetLights.forEach(light => {
      if (light.position.z > cameraZ + STREET_LIGHT_STRIDE) {
        light.position.z -= STREET_LIGHT_DEPTH;
      }
    });
  }

  return { update };
}
