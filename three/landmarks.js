// ============================================================
//  LANDMARKS — Edifici iconici di Gotham City
//  Wayne Tower, Municipio Gotico, Ace Chemicals.
//  Stesso meccanismo di riciclo di models.js / city.js.
// ============================================================

import * as THREE from '../lib/three.module.min.js';
import { OBJLoader } from '../lib/OBJLoader.js';

// CYCLE_DEPTH ≈ TOTAL_DEPTH di city.js (22 righe × 26 spacing = 572)
const CYCLE_DEPTH = 570;
const RECYCLE_Z   = 40;  // unità oltre la camera prima del riciclo

// ── Caricamento OBJ con materiale PBR ────────────────────────
function loadOBJModel(objPath, textures) {
  return new Promise(resolve => {
    const loader    = new OBJLoader();
    const texLoader = new THREE.TextureLoader();

    const mat = new THREE.MeshStandardMaterial({
      map:          textures.diffuse  ? texLoader.load(textures.diffuse)  : undefined,
      normalMap:    textures.normal   ? texLoader.load(textures.normal)   : undefined,
      roughnessMap: textures.rough    ? texLoader.load(textures.rough)    : undefined,
      metalnessMap: textures.metallic ? texLoader.load(textures.metallic) : undefined,
      roughness:    0.80,
      metalness:    0.20
    });

    loader.load(
      objPath,
      object => {
        object.traverse(child => {
          if (child.isMesh) child.material = mat;
        });
        resolve(object);
      },
      undefined,
      err => {
        console.warn('[Gotham3D] Landmark non caricato:', objPath, err);
        resolve(null); // graceful fallback: la scena continua
      }
    );
  });
}

// ── Normalizzazione scala tramite BoundingBox ─────────────────
function normalizeModel(object, targetHeight) {
  if (!object) return;
  const box  = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return;

  object.scale.setScalar(targetHeight / maxDim);

  // Ricalcola dopo la scala → centra X/Z, appoggia a y=0
  const box2   = new THREE.Box3().setFromObject(object);
  const center = box2.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box2.min.y;
}

// ── Clone + posizionamento ────────────────────────────────────
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
// 2 copie per edificio distanziate di CYCLE_DEPTH:
// la seconda è quella che viene riciclata durante il volo.

// Wayne Tower: grattacielo Art Deco dominante, lato sinistro
const WAYNE_PLACEMENTS = [
  { x: -34, y: 0, z:  -80, rotY:  Math.PI * 0.10 },
  { x: -36, y: 0, z: -650, rotY:  Math.PI * 0.08 },
];

// Municipio Gotico: edificio civile imponente, lato destro
const HALL_PLACEMENTS = [
  { x:  32, y: 0, z: -275, rotY: -Math.PI * 0.12 },
  { x:  30, y: 0, z: -845, rotY: -Math.PI * 0.10 },
];

// Ace Chemicals: fabbrica abbandonata, lato sinistro
const CHEMICALS_PLACEMENTS = [
  { x: -22, y: 0, z: -455, rotY:  Math.PI * 0.05 },
  { x: -24, y: 0, z: -1025, rotY: Math.PI * 0.07 },
];

// ── Export ───────────────────────────────────────────────────
export async function loadLandmarks(scene) {
  const meshes = [];
  const BASE   = './assets/gotham3d';

  const [wayne, hall, chemicals] = await Promise.all([
    loadOBJModel(`${BASE}/wayne_tower/base.obj`, {
      diffuse:  `${BASE}/wayne_tower/texture_diffuse.png`,
      normal:   `${BASE}/wayne_tower/texture_normal.png`,
      rough:    `${BASE}/wayne_tower/texture_roughness.png`,
      metallic: `${BASE}/wayne_tower/texture_metallic.png`
    }),
    loadOBJModel(`${BASE}/city_hall/base.obj`, {
      diffuse:  `${BASE}/city_hall/texture_diffuse.png`,
      normal:   `${BASE}/city_hall/texture_normal.png`,
      rough:    `${BASE}/city_hall/texture_roughness.png`,
      metallic: `${BASE}/city_hall/texture_metallic.png`
    }),
    loadOBJModel(`${BASE}/ace_chemicals/base.obj`, {
      diffuse:  `${BASE}/ace_chemicals/texture_diffuse.png`,
      normal:   `${BASE}/ace_chemicals/texture_normal.png`,
      rough:    `${BASE}/ace_chemicals/texture_roughness.png`,
      metallic: `${BASE}/ace_chemicals/texture_metallic.png`
    })
  ]);

  // Altezze target in unità Three.js
  normalizeModel(wayne,     72); // Torre Wayne: domina lo skyline
  normalizeModel(hall,      48); // Municipio: imponente, non sproporzionato
  normalizeModel(chemicals, 38); // Fabbrica: alta ma squadrata

  placeInstances(scene, wayne,     WAYNE_PLACEMENTS,     meshes);
  placeInstances(scene, hall,      HALL_PLACEMENTS,      meshes);
  placeInstances(scene, chemicals, CHEMICALS_PLACEMENTS, meshes);

  // Riciclo: stesso meccanismo di city.js
  function update(cameraZ) {
    meshes.forEach(mesh => {
      if (mesh.position.z > cameraZ + RECYCLE_Z) {
        mesh.position.z -= CYCLE_DEPTH;
      }
    });
  }

  return { update };
}
