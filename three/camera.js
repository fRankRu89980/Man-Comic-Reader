// ============================================================
//  CAMERA — PerspectiveCamera factory
// ============================================================

import * as THREE from '../lib/three.module.min.js';

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    72,                                     // FOV
    window.innerWidth / window.innerHeight,  // aspect
    0.5,                                    // near
    600                                     // far
  );

  // Posizione iniziale: altezza occhi, davanti alla città
  camera.position.set(0, 7, 30);

  return camera;
}
