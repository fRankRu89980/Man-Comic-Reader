// ============================================================
//  BAT-SIGNAL — Proiettore con logo Batman nel cielo di Gotham
//  Tutto in un THREE.Group che segue la camera sull'asse Z:
//  il segnale è sempre visibile mentre si vola sulla città.
//  Nessuna dipendenza da moduli del Comic Reader 2D.
// ============================================================

import * as THREE from '../lib/three.module.min.js';

// ── Texture bat-logo disegnata su canvas ──────────────────────
// Cerchio giallo + silhouette pipistrello nera, 512×512.
function createBatLogoTexture() {
  const S  = 512;
  const cx = S / 2, cy = S / 2;
  const r  = S * 0.44;

  const canvas = document.createElement('canvas');
  canvas.width  = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');

  // Alone giallo del proiettore
  const radGrad = ctx.createRadialGradient(cx, cy, r * 0.20, cx, cy, r);
  radGrad.addColorStop(0,    '#ffe94d');
  radGrad.addColorStop(0.65, '#ffd600');
  radGrad.addColorStop(1,    'rgba(255, 195, 0, 0)');
  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Silhouette pipistrello
  drawBat(ctx, cx, cy + r * 0.04, r * 0.80);

  return new THREE.CanvasTexture(canvas);
}

// Traccia il pipistrello: ali arcuate, due orecchie appuntite,
// corpo centrale. Il canvas ha Y crescente verso il basso.
function drawBat(ctx, cx, cy, r) {
  ctx.fillStyle = '#080810';
  ctx.beginPath();

  // Partenza: base centrale del corpo
  ctx.moveTo(cx, cy + r * 0.38);

  // ── Ala sinistra (bordo esterno) ──────────────────────────
  ctx.bezierCurveTo(
    cx - r*0.28, cy + r*0.48,
    cx - r*0.86, cy + r*0.26,
    cx - r*0.94, cy + r*0.02
  );
  // Rientro verso l'orecchio
  ctx.bezierCurveTo(
    cx - r*0.86, cy - r*0.30,
    cx - r*0.60, cy - r*0.10,
    cx - r*0.42, cy - r*0.08
  );

  // ── Orecchio sinistro ─────────────────────────────────────
  ctx.lineTo(cx - r*0.50, cy - r*0.62);  // punta
  ctx.lineTo(cx - r*0.23, cy - r*0.20);  // base interna

  // ── Sommità (nuca tra le orecchie) ────────────────────────
  ctx.bezierCurveTo(
    cx - r*0.12, cy - r*0.44,
    cx + r*0.12, cy - r*0.44,
    cx + r*0.23, cy - r*0.20
  );

  // ── Orecchio destro ───────────────────────────────────────
  ctx.lineTo(cx + r*0.50, cy - r*0.62);  // punta
  ctx.lineTo(cx + r*0.42, cy - r*0.08);  // base esterna

  // ── Ala destra (speculare) ────────────────────────────────
  ctx.bezierCurveTo(
    cx + r*0.60, cy - r*0.10,
    cx + r*0.86, cy - r*0.30,
    cx + r*0.94, cy + r*0.02
  );
  ctx.bezierCurveTo(
    cx + r*0.86, cy + r*0.26,
    cx + r*0.28, cy + r*0.48,
    cx, cy + r*0.38
  );

  ctx.closePath();
  ctx.fill();
}

// ── Export principale ─────────────────────────────────────────
export function createBatSignal(scene) {
  // Group unico → segue cameraZ in update()
  const group = new THREE.Group();
  scene.add(group);

  // ── Corpo proiettore (cilindro metallico sul tetto) ───────
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 1.05, 2.8, 16),
    new THREE.MeshStandardMaterial({ color: 0x1e2033, roughness: 0.65, metalness: 0.55 })
  );
  body.position.set(14, 33.4, -95);
  group.add(body);

  // Lente emissiva (disco frontale del proiettore)
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.78, 32),
    new THREE.MeshBasicMaterial({ color: 0xfffce0, fog: false })
  );
  lens.position.set(14, 34.85, -95);
  lens.rotation.x = -Math.PI * 0.12;
  group.add(lens);

  // ── SpotLight ─────────────────────────────────────────────
  const spot = new THREE.SpotLight(0xffe866, 20, 450, Math.PI / 13, 0.22, 1.1);
  spot.position.set(14, 34.5, -95);
  spot.target.position.set(0, 196, -216);
  group.add(spot);
  group.add(spot.target);

  // ── Raggio volumetrico ────────────────────────────────────
  // CylinderGeometry: radiusTop largo (in cielo), radiusBottom stretto (proiettore)
  // top è a +height/2 → y = 34 + 170 ≈ 204  ✓
  // bottom è a -height/2 → y = 34             ✓
  const beamMat = new THREE.MeshBasicMaterial({
    color:      0xffe880,
    transparent: true,
    opacity:    0.024,
    side:       THREE.DoubleSide,
    depthWrite: false,
    fog:        false
  });
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(19, 0.6, 170, 32, 1, true),
    beamMat
  );
  // Centro a metà: y = 34 + 85 = 119
  beam.position.set(7, 119, -155);
  beam.rotation.x =  0.32;  // tilt verso il cielo/logo
  beam.rotation.z = -0.06;
  group.add(beam);

  // ── Disco bat-logo nel cielo ──────────────────────────────
  const logoTex = createBatLogoTexture();
  const logoMat = new THREE.MeshBasicMaterial({
    map:        logoTex,
    transparent: true,
    opacity:    0.90,
    side:       THREE.DoubleSide,
    depthWrite: false,
    fog:        false
  });
  const logo = new THREE.Mesh(
    new THREE.CircleGeometry(17, 64),
    logoMat
  );
  logo.position.set(-1, 200, -218);
  logo.rotation.x = Math.PI * 0.12; // tilt lieve verso la camera
  group.add(logo);

  // Luce di rimbalzo attorno al logo
  const logoLight = new THREE.PointLight(0xffe866, 2.8, 90, 2.0);
  logoLight.position.set(-1, 200, -218);
  group.add(logoLight);

  // ── Animazione flicker ────────────────────────────────────
  // Due sinusoidi a frequenze prime → effetto arco voltaico realistico
  let time = 0;

  function update(cameraZ, delta) {
    // Segue la camera mantenendo distanza costante
    group.position.z = cameraZ - 35;

    // Flicker: combinazione di due frequenze prime
    time += delta;
    const f = 0.92
      + Math.sin(time *  9.1) * 0.04
      + Math.sin(time * 20.7) * 0.03;

    spot.intensity      = 20  * f;
    beamMat.opacity     = 0.024 * f;
    logoMat.opacity     = 0.90 * f;
    logoLight.intensity = 2.8 * f;
  }

  return { update };
}
