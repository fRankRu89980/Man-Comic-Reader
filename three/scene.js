// ============================================================
//  SCENE — Entry point Gotham 3D Mode
//  Assembla renderer, camera, città, luci e loop d'animazione.
//  Non modifica alcun modulo del Comic Reader 2D.
// ============================================================

import * as THREE from '../lib/three.module.min.js';
import { createRenderer } from './renderer.js';
import { createCamera }   from './camera.js';
import { createControls } from './controls.js';
import { createLights }    from './lights.js';
import { createGlbCity }   from './glb-city.js';
import { createSky }        from './sky.js';
import { createBatSignal }  from './batsignal.js';
import { createSigns }        from './signs.js';
import { createRain }         from './rain.js';
import { createSearchlights } from './searchlights.js';

// ── Canvas ───────────────────────────────────────────────────
const canvas = document.getElementById("gotham-canvas");
if (!canvas) throw new Error("[Gotham3D] Canvas #gotham-canvas non trovato.");

// ── Renderer ─────────────────────────────────────────────────
const renderer = createRenderer(canvas);

// ── Scena ────────────────────────────────────────────────────
const scene = new THREE.Scene();

// Colore di sfondo: blu profondo (NON nero puro)
scene.background = new THREE.Color(0x0c1018);

// Nebbia lineare con colore blu-grigio LEGGIBILE: i palazzi
// lontani sfumano nella foschia (non in silhouette nere).
// near 22 / far 165 → forte senso di profondità urbana.
scene.fog = new THREE.Fog(0x1a2434, 22, 165);

// ── Camera ───────────────────────────────────────────────────
const camera = createCamera();

// ── DEV: mantieni la posizione tra i reload di Live Server ───
// Solo in locale (localhost): salva/ripristina la Z della camera in
// sessionStorage. Così quando salvi un parametro e Live Server ricarica,
// NON riparti dall'inizio ma resti dove stavi guardando.
// In produzione (GitHub Pages, non-localhost) non si attiva mai.
const DEV     = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
const CAM_KEY = 'gotham3d_camZ';
if (DEV) {
  const savedZ = parseFloat(sessionStorage.getItem(CAM_KEY));
  if (!Number.isNaN(savedZ)) camera.position.z = savedZ;   // riprendi da dov'eri
}
let devSaveAcc = 0;

// ── Città Blender (GLB) con riciclo infinito ─────────────────
// Sostituisce la città procedurale: contiene palazzi PBR,
// finestre emissive e modelli, esportati da Blender (~5 MB).
const hint = document.querySelector(".gotham-hint");
const { update: updateGlbCity } = createGlbCity(
  scene,
  "./assets/gotham3d/export/gotham.glb?v=12",
  {
    onProgress: f => { if (hint) hint.textContent = `Caricamento città… ${Math.round(f*100)}%`; },
    onReady:    () => { if (hint) hint.textContent = "Scrolla o swipe per camminare nella città"; }
  }
);

// ── Illuminazione ────────────────────────────────────────────
const { update: updateLights } = createLights(scene);

// ── Cielo (stelle, luna, nuvole) ─────────────────────────────
const { update: updateSky } = createSky(scene);

// ── Bat-Signal ───────────────────────────────────────────────
const { update: updateBatSignal } = createBatSignal(scene);

// ── Insegne neon (WAYNE, GCPD, GOTHAM, ACE, MONARCH, GCN) ────
const { update: updateSigns } = createSigns(scene);

// ── Pioggia ──────────────────────────────────────────────────
const { update: updateRain } = createRain(scene);

// ── Fari nel cielo + luci rosse anti-collisione ──────────────
const { update: updateSearchlights } = createSearchlights(scene);

// ── Controlli input ──────────────────────────────────────────
const controls = createControls();

// ── Resize ───────────────────────────────────────────────────
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);

// ── Loop animazione ──────────────────────────────────────────
const clock = new THREE.Clock();
let animId;

function animate() {
  animId = requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const vel   = controls.getVelocity();

  // Movimento camera in avanti (asse -Z)
  camera.position.z -= vel * delta * 60;

  // DEV: salva la posizione ogni ~0.3s (per i reload di Live Server)
  if (DEV) {
    devSaveAcc += delta;
    if (devSaveAcc > 0.3) {
      sessionStorage.setItem(CAM_KEY, camera.position.z.toFixed(2));
      devSaveAcc = 0;
    }
  }

  // Aggiorna luci (follow light + neon stradali)
  updateLights(camera.position.z);

  // Cielo: stelle, luna, nuvole
  updateSky(camera.position.z, delta);

  // Bat-Signal: flicker + segue la camera
  updateBatSignal(camera.position.z, delta);

  // Insegne neon: riciclo lungo Z
  updateSigns(camera.position.z);

  // Pioggia: caduta + segue la camera
  updateRain(camera.position.z, delta);

  // Fari + beacon rossi lampeggianti
  updateSearchlights(camera.position.z, delta);

  // Ricicla la città GLB per la città infinita (attivo dopo il caricamento)
  updateGlbCity(camera.position.z);

  renderer.render(scene, camera);
}

animate();

// ── Cleanup su uscita dalla pagina ───────────────────────────
window.addEventListener("pagehide", () => {
  // DEV: salva la posizione esatta appena prima del reload
  if (DEV) sessionStorage.setItem(CAM_KEY, camera.position.z.toFixed(2));
  cancelAnimationFrame(animId);
  controls.destroy();
  window.removeEventListener("resize", onResize);
  renderer.dispose();
}, { once: true });
