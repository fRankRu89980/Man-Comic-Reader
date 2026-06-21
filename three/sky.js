// ============================================================
//  SKY — Stelle, Luna e Nuvole per Gotham City
//  Tutti gli elementi seguono la camera sull'asse Z (skybox).
//  Non modifica alcun modulo del Comic Reader 2D.
// ============================================================

import * as THREE from '../lib/three.module.min.js';

const CLOUD_COUNT   = 6;
const CLOUD_SPACING = 85; // distanza Z tra una nuvola e l'altra

// ── Stelle ───────────────────────────────────────────────────
// Particelle distribuite nella volta celeste superiore.
// fog:false → non svaniscono nella nebbia urbana.
function createStars(scene) {
  const COUNT = 1800;
  const pos   = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    // Solo emisfero superiore (phi compressa tra 0 e ~75°)
    const phi = Math.acos(1 - Math.random() * 0.88) * 0.48;
    const r   = 285 + Math.random() * 85;
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    color:           0xddeeff,
    size:            0.55,
    sizeAttenuation: true,
    transparent:     true,
    opacity:         0.82,
    fog:             false
  });

  const stars = new THREE.Points(geo, mat);
  stars.frustumCulled = false;
  scene.add(stars);
  return stars;
}

// ── Luna ─────────────────────────────────────────────────────
// Sfera con alone traslucente + luce puntuale di rimbalzo.
function createMoon(scene) {
  const group = new THREE.Group();

  // Disco lunare
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(7, 32, 32),
    new THREE.MeshStandardMaterial({
      color:             0xc8d4f2,
      emissive:          0x7799cc,
      emissiveIntensity: 0.55,
      roughness:         0.92,
      fog:               false
    })
  ));

  // Alone luminoso (halo) — sfera interna con backside
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(11, 32, 32),
    new THREE.MeshBasicMaterial({
      color:      0x2244aa,
      transparent: true,
      opacity:    0.07,
      side:       THREE.BackSide,
      fog:        false,
      depthWrite: false
    })
  ));

  group.position.set(-80, 125, 0); // Z aggiornato ogni frame in update()
  scene.add(group);

  // Luce lunare soffusa
  const moonLight = new THREE.PointLight(0x5577bb, 1.0, 450, 1.5);
  moonLight.position.set(-80, 125, 0);
  scene.add(moonLight);

  return { group, moonLight };
}

// ── Texture nuvola (canvas procedurale) ──────────────────────
// Cinque ellissi radiali sfumati compongono una singola nuvola.
function createCloudTexture() {
  const W = 512, H = 140;
  const c = document.createElement('canvas');
  c.width  = W;
  c.height = H;
  const ctx = c.getContext('2d');

  const puff = (x, y, rx, ry) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0,    'rgba(16, 21, 52, 0.92)');
    g.addColorStop(0.45, 'rgba(12, 16, 42, 0.60)');
    g.addColorStop(1,    'rgba(8,  9,  18, 0.00)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  puff( 80, 70,  78, 48);
  puff(192, 58,  92, 52);
  puff(310, 68,  86, 50);
  puff(428, 60,  80, 46);
  puff(256, 78,  68, 42);

  return new THREE.CanvasTexture(c);
}

// ── Nuvole ───────────────────────────────────────────────────
// Piani traslucenti con texture canvas. Drift lento, riciclo Z.
function createClouds(scene) {
  const tex    = createCloudTexture();
  const clouds = [];

  for (let i = 0; i < CLOUD_COUNT; i++) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(
        105 + Math.random() * 70,
        28  + Math.random() * 18
      ),
      new THREE.MeshBasicMaterial({
        map:        tex,
        transparent: true,
        opacity:    0.68 + Math.random() * 0.22,
        depthWrite: false,
        fog:        false,
        side:       THREE.DoubleSide
      })
    );

    mesh.position.set(
      (Math.random() - 0.5) * 90,
      72 + Math.random() * 38,
      -(i * CLOUD_SPACING + 55)
    );
    mesh.rotation.x     = -(0.06 + Math.random() * 0.06);
    mesh.frustumCulled  = false;
    mesh.userData.speed = 0.4 + Math.random() * 0.5; // unità/s
    scene.add(mesh);
    clouds.push(mesh);
  }

  return clouds;
}

// ── Export ───────────────────────────────────────────────────
export function createSky(scene) {
  const stars = createStars(scene);
  const { group: moonGroup, moonLight } = createMoon(scene);
  const clouds = createClouds(scene);

  function update(cameraZ, delta) {
    // Stelle e luna seguono la camera sull'asse Z (effetto skybox)
    stars.position.z     = cameraZ;
    moonGroup.position.z = cameraZ - 185;
    moonLight.position.z = cameraZ - 185;

    // Nuvole: drift lento verso la camera → riciclo quando superano
    clouds.forEach(cloud => {
      cloud.position.z += cloud.userData.speed * delta * 4;
      if (cloud.position.z > cameraZ + 55) {
        cloud.position.z -= CLOUD_COUNT * CLOUD_SPACING;
      }
    });
  }

  return { update };
}
