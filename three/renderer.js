// ============================================================
//  RENDERER — WebGLRenderer factory
// ============================================================

import * as THREE from '../lib/three.module.min.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // ACESFilmic: tone mapping cinematico, rispetta i neri
  // e valorizza i colori neon senza bruciare le aree scure.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.90;

  return renderer;
}
