// ============================================================
//  ROULETTE-SCENE — Roulette europea 3D fotorealistica
//  Obiettivo: deve sembrare una roulette VERA filmata, non un
//  modello 3D. Realismo ottenuto con: ombre soffite reali, tavolo
//  da casinò che àncora la scena, ciotola in legno laccato tornita
//  (LatheGeometry), pista pallina con losanghe/deflettori cromati,
//  caselle in vernice lucida con separatori metallici in rilievo,
//  numeri dipinti SUL piatto (niente billboard), torretta cromata e
//  illuminazione a lampada-pendente da tavolo verde.
//  Solo Three.js base + IBL (HDRI). ES module isolato.
//  Interfaccia invariata: initRoulette3D(canvas, opts)
//                         → { spin, setActive, resize }.
// ============================================================

import * as THREE from '../lib/three.module.min.js';
import { createRenderer } from './renderer.js';
import { HDRLoader } from '../lib/HDRLoader.js';
import { NUMBERS, RED_SET, NICKNAMES, colorFor } from './roulette-data.js';

const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = p => 1 - Math.pow(1 - p, 3);
const easeInOut = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

export function initRoulette3D(canvas, { resultEl = null, spinBtn = null, voiceBtn = null, onResult = null } = {}) {
  const renderer = createRenderer(canvas);

  // Ombre reali: il singolo accorgimento che toglie di più l'aspetto "CG".
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;   // PCFSoftShadowMap è deprecato in r184
  renderer.toneMappingExposure = 1.05;

  // ── Scena ─────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080b);
  scene.fog = new THREE.Fog(0x07080b, 20, 46);

  // ── Environment map (HDRI Poly Haven) ─────────────────────
  // IBL per riflessi realistici su metalli/pallina. Lo sfondo resta
  // scuro/cinematografico: la HDRI serve solo a illuminare i riflessi.
  const pmrem = new THREE.PMREMGenerator(renderer);
  new HDRLoader().load(
    'assets/roulette3d/env/studio.hdr',
    (hdr) => {
      const env = pmrem.fromEquirectangular(hdr).texture;
      scene.environment = env;
      hdr.dispose();
      pmrem.dispose();
    },
    undefined,
    (err) => console.warn('HDRI roulette non caricata:', err)
  );

  // ── Camera + pose (3 stati) ───────────────────────────────
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
  const POSES = {
    overview: { pos: new THREE.Vector3(0, 6.2, 7.6),  look: new THREE.Vector3(0, 0.1, 0) },
    closeup:  { pos: new THREE.Vector3(0.4, 2.2, 5.6), look: new THREE.Vector3(0, 0.25, 1.6) },
  };
  let camTarget = "overview";
  camera.position.copy(POSES.overview.pos);
  const curLook = POSES.overview.look.clone();
  camera.lookAt(curLook);

  // ── Parametri (mappatura angolare invariata) ──────────────
  const R = 3.0;
  const SEG = (Math.PI * 2) / NUMBERS.length;
  const BALL_R   = 0.12;
  const POCKET_IN = R * 0.50, POCKET_OUT = R * 0.86; // banda caselle (anello, non spicchi)
  const FRET_IN  = R * 0.24;                          // raggio mozzo/anello interno
  const RAIL_R   = R * 0.95, RAIL_H = 0.55;           // orbita pallina (pista alta)
  const POCKET_R = R * 0.60, POCKET_H = 0.02 + BALL_R; // riposo: nella casella
  const NUM_R    = R * 0.70;
  const HUB_R    = R * 0.15;

  // ── Texture procedurali (canvas, CSP-safe: niente fetch) ──
  function feltTexture() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0b3a23'; ctx.fillRect(0, 0, s, s);
    const img = ctx.getImageData(0, 0, s, s);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 26;
      d[i] = Math.max(0, d[i] + n);
      d[i + 1] = Math.max(0, d[i + 1] + n);
      d[i + 2] = Math.max(0, d[i + 2] + n * 0.6);
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 6);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }

  // ── Texture legno PBR (Poly Haven "Dark Wood", CC0) ───────
  const texLoader = new THREE.TextureLoader();
  function woodMap(file, srgb = false, rep = 2) {
    const t = texLoader.load('assets/roulette3d/wood/' + file);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep, rep);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const woodDiff  = woodMap('wood_diff.jpg', true);
  const woodNor   = woodMap('wood_nor.jpg');
  const woodRough = woodMap('wood_rough.jpg');

  // ── Materiali ─────────────────────────────────────────────
  // Cromo lucido (separatori, deflettori, anelli): più realistico dell'oro pieno.
  const matChrome = new THREE.MeshStandardMaterial({
    color: 0xd8dbe0, roughness: 0.12, metalness: 1.0, envMapIntensity: 1.6,
  });
  // Ottone caldo (torretta centrale) — accento brand dorato.
  const matBrass = new THREE.MeshStandardMaterial({
    color: 0xcaa64a, roughness: 0.2, metalness: 1.0, envMapIntensity: 1.4,
  });
  // Caselle: vernice semi-lucida (clearcoat) — non opaca/piatta.
  function paintMat(hex) {
    return new THREE.MeshPhysicalMaterial({
      color: hex, roughness: 0.34, metalness: 0.0,
      clearcoat: 0.5, clearcoatRoughness: 0.25, envMapIntensity: 0.7,
    });
  }
  const sectorMat = {
    red:   paintMat(0x8e1414),
    black: paintMat(0x0c0c0f),
    green: paintMat(0x0f5a2c),
  };
  function matForNum(n) {
    const c = colorFor(n);
    return c === 0x1b7a3a ? sectorMat.green : (RED_SET.has(n) ? sectorMat.red : sectorMat.black);
  }

  // ── Tavolo da casinò (àncora la scena: niente "vuoto") ────
  const table = new THREE.Mesh(
    new THREE.CircleGeometry(16, 80),
    new THREE.MeshStandardMaterial({ map: feltTexture(), roughness: 0.95, metalness: 0.0 })
  );
  table.rotation.x = -Math.PI / 2;
  table.position.y = -0.02;
  table.receiveShadow = true;
  scene.add(table);

  // ── Ciotola in legno tornita (LatheGeometry) ──────────────
  // Profilo (raggio, altezza Y) dall'orlo interno fino al tavolo.
  // La pista della pallina è la gola attorno a r≈2.85, y≈0.55.
  const bowlProfile = [
    [2.28, 0.10], [2.42, 0.22], [2.66, 0.44], [2.86, 0.55],
    [3.02, 0.66], [3.34, 0.60], [3.78, 0.34], [4.18, 0.10], [4.45, 0.0],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(bowlProfile, 96),
    new THREE.MeshPhysicalMaterial({
      map: woodDiff, normalMap: woodNor, roughnessMap: woodRough,
      roughness: 0.95, metalness: 0.0,
      clearcoat: 0.6, clearcoatRoughness: 0.22, envMapIntensity: 1.05,
      side: THREE.DoubleSide,
    })
  );
  bowl.receiveShadow = true;
  bowl.castShadow = true;
  scene.add(bowl);

  // Cerchio cromato sul bordo della pista (rifinitura metallica).
  const trackRing = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.045, 20, 120), matChrome);
  trackRing.rotation.x = Math.PI / 2;
  trackRing.position.y = 0.66;
  trackRing.castShadow = true;
  scene.add(trackRing);

  // Deflettori (losanghe/"canoe") cromati sulla pista — segno inequivocabile
  // di roulette vera. 8 disposti come sulle ruote reali (4 + 4 sfalsati).
  const diamondGeo = new THREE.OctahedronGeometry(0.16);
  diamondGeo.scale(1, 0.55, 2.0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + (Math.PI / 8);
    const d = new THREE.Mesh(diamondGeo, matChrome);
    const dr = 2.66;
    d.position.set(Math.cos(a) * dr, 0.42, Math.sin(a) * dr);
    d.rotation.y = -a;
    d.castShadow = true;
    scene.add(d);
  }

  // ── Gruppo ruota (il piatto rotante orizzontale) ──────────
  const wheelGroup = new THREE.Group();
  wheelGroup.rotation.x = -Math.PI / 2;   // disco in piano (XZ mondo)
  scene.add(wheelGroup);

  // Disco rotante (caselle, frette, numeri, mozzo, pallina)
  const disk = new THREE.Group();
  wheelGroup.add(disk);

  // Base scura del piatto
  const plate = new THREE.Mesh(new THREE.CircleGeometry(R * 0.92, 80),
    new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.6, metalness: 0.35 }));
  plate.receiveShadow = true;
  disk.add(plate);

  function numberTexture(num) {
    const s = 128;
    const c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f4f1e8';                    // bianco avorio (no bianco puro = più reale)
    ctx.font = `bold ${Math.floor(s * 0.6)}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(num), s / 2, s / 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }

  // Banda caselle (anello, NON spicchi fino al centro) + numeri dipinti + frette
  const bandMid = (POCKET_IN + POCKET_OUT) / 2;
  const fretH = 0.16;                                            // altezza separatori in rilievo
  const fretGeo = new THREE.BoxGeometry(POCKET_OUT - POCKET_IN, fretH, 0.05);
  for (let i = 0; i < NUMBERS.length; i++) {
    const num = NUMBERS[i];
    const aMid = i * SEG + SEG / 2;

    // Fondo casella: settore d'anello in vernice lucida, leggermente incassato
    const sector = new THREE.Mesh(
      new THREE.RingGeometry(POCKET_IN, POCKET_OUT, 8, 1, i * SEG, SEG), matForNum(num));
    sector.position.z = 0.02;
    sector.receiveShadow = true;
    disk.add(sector);

    // Numero dipinto sul fondo, piatto e radiale (base verso il centro) come su ruota vera
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.44),
      new THREE.MeshStandardMaterial({ map: numberTexture(num), transparent: true, roughness: 0.7 })
    );
    label.position.set(Math.cos(aMid) * NUM_R, Math.sin(aMid) * NUM_R, 0.035);
    label.rotation.z = aMid - Math.PI / 2;
    disk.add(label);

    // Separatore metallico in rilievo sul confine i*SEG (solo lungo la banda)
    const a = i * SEG;
    const fret = new THREE.Mesh(fretGeo, matChrome);
    fret.position.set(Math.cos(a) * bandMid, Math.sin(a) * bandMid, fretH / 2);
    fret.rotation.z = a;
    fret.castShadow = true;
    disk.add(fret);
  }

  // Conca interna (dal mozzo alla banda): superficie scura lucida, come la
  // conca di una ruota vera. Niente spicchi colorati che arrivano al centro.
  const innerCone = new THREE.Mesh(
    new THREE.RingGeometry(FRET_IN, POCKET_IN, 64, 1),
    new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.3, metalness: 0.55, envMapIntensity: 1.0 }));
  innerCone.position.z = 0.03;
  innerCone.receiveShadow = true;
  disk.add(innerCone);
  // Anello mozzo
  disk.add(new THREE.Mesh(new THREE.CircleGeometry(FRET_IN, 56),
    new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.35, metalness: 0.6 })).translateZ(0.03));
  const turret = new THREE.Group();
  const tBase = new THREE.Mesh(new THREE.CylinderGeometry(HUB_R, HUB_R * 1.15, 0.12, 40), matChrome);
  tBase.rotation.x = Math.PI / 2; tBase.position.z = 0.08; tBase.castShadow = true; turret.add(tBase);
  const tMid = new THREE.Mesh(new THREE.CylinderGeometry(HUB_R * 0.62, HUB_R * 0.8, 0.4, 36), matBrass);
  tMid.rotation.x = Math.PI / 2; tMid.position.z = 0.32; tMid.castShadow = true; turret.add(tMid);
  const tCone = new THREE.Mesh(new THREE.ConeGeometry(HUB_R * 0.42, 0.55, 32), matChrome);
  tCone.rotation.x = -Math.PI / 2; tCone.position.z = 0.74; tCone.castShadow = true; turret.add(tCone);
  const tKnob = new THREE.Mesh(new THREE.SphereGeometry(HUB_R * 0.26, 24, 24), matBrass);
  tKnob.position.z = 1.04; tKnob.castShadow = true; turret.add(tKnob);
  disk.add(turret);

  // ── Pallina riflettente (figlia del disco) ────────────────
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_R, 48, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0xf6f4ee, roughness: 0.18, metalness: 0.0,
      clearcoat: 1.0, clearcoatRoughness: 0.04, envMapIntensity: 1.3,
    })
  );
  ball.castShadow = true;
  disk.add(ball);
  let ballAngle = SEG / 2;
  let ballRadius = POCKET_R, ballLift = POCKET_H;
  function placeBall() {
    ball.position.set(Math.cos(ballAngle) * ballRadius, Math.sin(ballAngle) * ballRadius, ballLift);
  }
  placeBall();

  // ── Luci ──────────────────────────────────────────────────
  // Lampada-pendente sopra il tavolo: pozza di luce calda + ombre soffite.
  scene.add(new THREE.AmbientLight(0x2a3344, 0.28));   // fill bassa: l'IBL fa il resto
  const key = new THREE.SpotLight(0xfff1d6, 900, 30, Math.PI / 5, 0.45, 1.6);
  key.position.set(0.5, 11, 1.5);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 3;
  key.shadow.camera.far = 26;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key); scene.add(key.target);
  // Faretto di taglio freddo (rim) per staccare i metalli dallo sfondo.
  const rim = new THREE.DirectionalLight(0x88a0ff, 0.5);
  rim.position.set(-7, 4, -6);
  scene.add(rim);
  // Piccola luce calda di riempimento frontale.
  const fillL = new THREE.PointLight(0xffd9a0, 12, 18, 2);
  fillL.position.set(4, 2.4, 5);
  scene.add(fillL);

  // Numeri: sempre piatti sul disco (dipinti). Ruotano col piatto = realismo.

  // ── Stato / animazione ────────────────────────────────────
  let phase = "idle";             // idle | spinning | returning
  let voiceEnabled = true;
  const sp = { t0: 0, dur: 6500, d0: 0, dF: 0, b0: 0, bF: 0, num: 0, idleTimer: null };

  function speak(text) {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "it-IT"; u.rate = 0.95; u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch (e) { console.warn("Voce roulette:", e); }
  }

  function startSpin() {
    if (phase === "spinning") return;
    if (sp.idleTimer) { clearTimeout(sp.idleTimer); sp.idleTimer = null; }
    phase = "spinning";
    camTarget = "closeup";                 // FASE 1: zoom cinematico
    if (spinBtn) spinBtn.disabled = true;
    if (resultEl) resultEl.textContent = "La pallina gira…";

    const idx = Math.floor(Math.random() * NUMBERS.length);
    const aWin = idx * SEG + SEG / 2;
    sp.num = NUMBERS[idx];
    sp.t0 = performance.now(); sp.dur = 6500;
    sp.d0 = disk.rotation.z;
    sp.dF = sp.d0 + Math.PI * 2 * (6 + Math.floor(Math.random() * 3));
    sp.b0 = ballAngle;
    sp.bF = aWin - Math.PI * 2 * (10 + Math.floor(Math.random() * 4));
  }

  function finishSpin() {
    ballAngle = sp.bF % (Math.PI * 2);
    ballRadius = POCKET_R; ballLift = POCKET_H;
    placeBall();
    phase = "returning";
    camTarget = "overview";                // FASE 4: ritorno overview
    const nick = NICKNAMES[sp.num];
    const text = nick ? `${sp.num} - ${nick}` : `${sp.num}`;
    if (resultEl) resultEl.textContent = `Numero uscito: ${text}`;
    if (typeof onResult === "function") onResult(text, sp.num);
    speak(text);
    if (spinBtn) spinBtn.disabled = false;
    sp.idleTimer = window.setTimeout(() => { if (phase === "returning") phase = "idle"; }, 2000);
  }

  // ── Controlli ─────────────────────────────────────────────
  if (spinBtn) spinBtn.addEventListener("click", startSpin);
  canvas.addEventListener("click", startSpin);
  if (voiceBtn) voiceBtn.addEventListener("click", () => {
    voiceEnabled = !voiceEnabled;
    voiceBtn.textContent = voiceEnabled ? "Voce attiva" : "Voce disattivata";
    voiceBtn.setAttribute("aria-pressed", voiceEnabled ? "true" : "false");
  });

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", resize);

  // ── Loop ──────────────────────────────────────────────────
  // Delta calcolato a mano (THREE.Clock è deprecato in r184).
  let active = false, animId = null, lastT = 0;
  function frame() {
    animId = requestAnimationFrame(frame);
    const now = performance.now();
    const delta = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0;
    lastT = now;

    // Camera: easing morbido verso la posa target + leggera deriva idle.
    const k = 1 - Math.pow(0.0009, delta);
    camera.position.lerp(POSES[camTarget].pos, k);
    curLook.lerp(POSES[camTarget].look, k);
    camera.lookAt(curLook);

    if (phase === "spinning") {
      const p = Math.min((performance.now() - sp.t0) / sp.dur, 1);
      const e = easeOutCubic(p);
      disk.rotation.z = sp.d0 + (sp.dF - sp.d0) * e;       // FASE 2: rotazione piatto
      ballAngle = sp.b0 + (sp.bF - sp.b0) * e;
      // FASE 3: la pallina cade nella casella SOLO a fine giro, quando
      // l'angolo è ormai fermo → scende nel vuoto tra due frette (no clip).
      const dropStart = 0.86;
      if (p < dropStart) {
        ballRadius = RAIL_R; ballLift = RAIL_H;            // orbita sulla pista alta
      } else {
        const de = easeInOut((p - dropStart) / (1 - dropStart));
        ballRadius = lerp(RAIL_R, POCKET_R, de);
        ballLift = lerp(RAIL_H, POCKET_H, de);
      }
      placeBall();
      if (p >= 1) finishSpin();
    } else {
      // Da fermo: il piatto continua a girare pianissimo (mai del tutto immobile).
      disk.rotation.z += delta * 0.12;
    }

    renderer.render(scene, camera);
  }
  function setActive(on) {
    if (on && !active) { active = true; lastT = performance.now(); frame(); }
    else if (!on && active) { active = false; if (animId) cancelAnimationFrame(animId); animId = null; }
  }

  return { spin: startSpin, setActive, resize };
}
