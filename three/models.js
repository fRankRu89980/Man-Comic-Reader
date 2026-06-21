// ============================================================
//  MODELS — Caricamento OBJ + texture PBR e piazzamento scena
//  Gargoyle, lampione, torre d'acqua con riciclo automatico.
// ============================================================

import * as THREE from '../lib/three.module.min.js';
import { OBJLoader } from '../lib/OBJLoader.js';

const ROW_SPACING = 26;          // deve corrispondere a city.js
const TOTAL_DEPTH = 22 * ROW_SPACING; // 572 — profondità totale prima del riciclo

// ── Carica un OBJ e applica materiale MeshStandardMaterial ──
// Ritorna una Promise<THREE.Group | null>.
// In caso di errore non blocca la scena: ritorna null (modello omesso).
function loadOBJModel(objPath, textures) {
  return new Promise((resolve) => {
    const loader    = new OBJLoader();
    const texLoader = new THREE.TextureLoader();

    const mat = new THREE.MeshStandardMaterial({
      map:          textures.diffuse  ? texLoader.load(textures.diffuse)  : undefined,
      normalMap:    textures.normal   ? texLoader.load(textures.normal)   : undefined,
      roughnessMap: textures.rough    ? texLoader.load(textures.rough)    : undefined,
      metalnessMap: textures.metallic ? texLoader.load(textures.metallic) : undefined,
      roughness:    0.75,
      metalness:    0.15
    });

    loader.load(
      objPath,
      (object) => {
        object.traverse(child => {
          if (child.isMesh) child.material = mat;
        });
        resolve(object);
      },
      undefined,
      (err) => {
        console.warn("[Gotham3D] Modello non caricato:", objPath, err);
        resolve(null); // graceful fallback
      }
    );
  });
}

// ── Normalizza altezza tramite BoundingBox e appoggia a y=0 ─
// Tutti i modelli, indipendentemente dalla scala originale,
// vengono ridimensionati al targetHeight specificato.
function normalizeModel(object, targetHeight) {
  if (!object) return;

  const box  = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return;

  object.scale.setScalar(targetHeight / maxDim);

  // Ricalcola dopo la scala: centra X/Z, appoggia il fondo a y=0
  const box2   = new THREE.Box3().setFromObject(object);
  const center = box2.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box2.min.y;
}

// ── Clona il modello base e inserisce le copie nella scena ──
function placeInstances(scene, base, placements, meshes) {
  if (!base) return;
  placements.forEach(({ x, y, z, rotY = 0 }) => {
    const clone = base.clone();
    clone.position.set(x, y, z);
    clone.rotation.y = rotY;
    scene.add(clone);
    meshes.push(clone);
  });
}

// ── Posizionamenti ───────────────────────────────────────────

// Gargoyle: su cornicioni di palazzi alti (y ≈ 38-52)
const GARGOYLE_PLACEMENTS = [
  { x: -15, y: 40, z:  -30, rotY: 0 },
  { x:  15, y: 43, z: -110, rotY: Math.PI },
  { x: -28, y: 48, z: -200, rotY:  Math.PI * 0.5 },
  { x:  28, y: 52, z: -290, rotY: -Math.PI * 0.5 },
  { x: -15, y: 38, z: -380, rotY: 0 },
  { x:  15, y: 45, z: -465, rotY: Math.PI },
];

// Lampione: lungo i bordi della strada (y = 0), alternati sx/dx
const LAMP_PLACEMENTS = (() => {
  const lamps = [];
  for (let i = 0; i < 9; i++) {
    const z = -(i * 65 + 10);
    lamps.push({ x: -11, y: 0, z,       rotY: 0 });
    lamps.push({ x:  11, y: 0, z: z-30, rotY: Math.PI });
  }
  return lamps;
})();

// Torre d'acqua: su tetti di edifici medi (y ≈ 26-32)
const TOWER_PLACEMENTS = [
  { x: -15, y: 28, z:  -55, rotY: 0 },
  { x:  14, y: 32, z: -160, rotY:  Math.PI * 0.25 },
  { x: -27, y: 26, z: -270, rotY: 0 },
  { x:  26, y: 30, z: -375, rotY:  Math.PI * 0.5 },
  { x: -14, y: 29, z: -475, rotY: 0 },
];

// ── Export principale ────────────────────────────────────────
// Carica in parallelo i 3 modelli; se uno fallisce la scena
// continua normalmente senza di esso.
export async function loadCityModels(scene) {
  const meshes = [];
  const BASE   = "./assets/gotham3d";

  const [gargoyle, lamp, tower] = await Promise.all([
    loadOBJModel(`${BASE}/gargoyle/base.obj`, {
      diffuse:  `${BASE}/gargoyle/texture_diffuse.png`,
      normal:   `${BASE}/gargoyle/texture_normal.png`,
      rough:    `${BASE}/gargoyle/texture_roughness.png`,
      metallic: `${BASE}/gargoyle/texture_metallic.png`
    }),
    loadOBJModel(`${BASE}/streetlamp/base.obj`, {
      diffuse:  `${BASE}/streetlamp/texture_diffuse.png`,
      normal:   `${BASE}/streetlamp/texture_normal.png`,
      rough:    `${BASE}/streetlamp/texture_roughness.png`,
      metallic: `${BASE}/streetlamp/texture_metallic.png`
    }),
    loadOBJModel(`${BASE}/watertower/base.obj`, {
      diffuse:  `${BASE}/watertower/texture_diffuse.png`,
      normal:   `${BASE}/watertower/texture_normal.png`,
      rough:    `${BASE}/watertower/texture_roughness.png`,
      metallic: `${BASE}/watertower/texture_metallic.png`
    })
  ]);

  // Normalizza altezze in unità Three.js
  normalizeModel(gargoyle,  4);   // 4 unità: ornamento su cornicione
  normalizeModel(lamp,     11);   // 11 unità: palo alto
  normalizeModel(tower,     8);   // 8 unità: serbatoio da tetto

  // Piazza le istanze
  placeInstances(scene, gargoyle, GARGOYLE_PLACEMENTS, meshes);
  placeInstances(scene, lamp,     LAMP_PLACEMENTS,     meshes);
  placeInstances(scene, tower,    TOWER_PLACEMENTS,    meshes);

  // Riciclo: stesso meccanismo di city.js
  function update(cameraZ) {
    meshes.forEach(mesh => {
      if (mesh.position.z > cameraZ + ROW_SPACING) {
        mesh.position.z -= TOTAL_DEPTH;
      }
    });
  }

  return { update };
}
