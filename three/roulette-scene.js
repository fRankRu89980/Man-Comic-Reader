// ============================================================
//  ROULETTE-SCENE — Roulette napoletana 3D cinematografica
//  Ruota a ciotola (frette dorate, mozzo, numeri) + pallina
//  riflettente che orbita sulla rotaia e cade nella casella.
//  Camera a 3 stati (overview → close-up → ritorno) con easing.
//  Solo Three.js base, niente physics. ES module isolato.
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

  // ── Scena ─────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d12);
  scene.fog = new THREE.Fog(0x0b0d12, 16, 34);

  // ── Environment map (HDRI Poly Haven) ─────────────────────
  // Image-Based Lighting per riflessi realistici su metalli/pallina.
  // Lo sfondo resta scuro/cinematografico: la HDRI serve solo ai riflessi.
  renderer.toneMappingExposure = 1.0;
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
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  const POSES = {
    overview: { pos: new THREE.Vector3(0, 6.6, 7.2),  look: new THREE.Vector3(0, 0, 0) },
    closeup:  { pos: new THREE.Vector3(0.2, 2.0, 5.2), look: new THREE.Vector3(0, 0.15, 1.7) },
  };
  let camTarget = "overview";
  camera.position.copy(POSES.overview.pos);
  const curLook = POSES.overview.look.clone();
  camera.lookAt(curLook);

  // ── Luci cinematografiche ─────────────────────────────────
  scene.add(new THREE.AmbientLight(0x4a5570, 0.4));  // ridotta: l'IBL (HDRI) fa già da fill
  const key = new THREE.DirectionalLight(0xfff2d8, 1.6);
  key.position.set(-5, 9, 6);
  scene.add(key);
  const top = new THREE.PointLight(0xffe9c0, 60, 26, 2);   // luce sopra la roulette
  top.position.set(0, 6, 1.5);
  scene.add(top);
  const fill = new THREE.PointLight(0x6680ff, 14, 24, 2);
  fill.position.set(5, 2.5, 5);
  scene.add(fill);

  // ── Parametri ─────────────────────────────────────────────
  const R = 3.0;
  const SEG = (Math.PI * 2) / NUMBERS.length;
  const BALL_R   = 0.12;
  const FRET_IN  = R * 0.24, FRET_OUT = R * 0.88;  // muri/frette: 0.72 .. 2.64
  const RAIL_R   = R * 0.95, RAIL_H = 0.55;         // orbita pallina (sopra tutto)
  const POCKET_R = R * 0.57, POCKET_H = 0.02 + BALL_R; // riposo: appoggiata sul fondo
  const NUM_R    = R * 0.85;
  const HUB_R    = R * 0.15;                         // raggio mozzo centrale

  // ── Texture legno PBR (Poly Haven "Dark Wood", CC0) ───────
  const texLoader = new THREE.TextureLoader();
  function woodMap(file, srgb = false) {
    const t = texLoader.load('assets/roulette3d/wood/' + file);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const woodDiff  = woodMap('wood_diff.jpg', true);
  const woodNor   = woodMap('wood_nor.jpg');
  const woodRough = woodMap('wood_rough.jpg');

  // Materiali — i PBR usano automaticamente scene.environment (riflessi HDRI).
  const matWood = new THREE.MeshPhysicalMaterial({
    map: woodDiff, normalMap: woodNor, roughnessMap: woodRough,
    roughness: 1.0, metalness: 0.0,
    clearcoat: 0.6, clearcoatRoughness: 0.28, envMapIntensity: 1.0,
  });
  const matRim = new THREE.MeshPhysicalMaterial({
    map: woodDiff, normalMap: woodNor, roughnessMap: woodRough,
    roughness: 0.9, metalness: 0.0,
    clearcoat: 0.85, clearcoatRoughness: 0.16, envMapIntensity: 1.1,
  });
  const matTrack  = new THREE.MeshStandardMaterial({ color: 0xb9b9c0, roughness: 0.12, metalness: 1.0, envMapIntensity: 1.4 });
  const matFret   = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.18, metalness: 1.0, envMapIntensity: 1.3 });
  const matHub    = new THREE.MeshStandardMaterial({ color: 0xc9a23a, roughness: 0.22, metalness: 1.0, envMapIntensity: 1.3 });
  const sectorMat = {
    red:   new THREE.MeshStandardMaterial({ color: 0xb01818, roughness: 0.35, metalness: 0.0, envMapIntensity: 0.6 }),
    black: new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.40, metalness: 0.0, envMapIntensity: 0.5 }),
    green: new THREE.MeshStandardMaterial({ color: 0x1b7a3a, roughness: 0.35, metalness: 0.0, envMapIntensity: 0.6 }),
  };
  function matForNum(n) {
    const c = colorFor(n);
    return c === 0x1b7a3a ? sectorMat.green : (RED_SET.has(n) ? sectorMat.red : sectorMat.black);
  }

  // ── Gruppo ruota (orizzontale) ────────────────────────────
  const wheelGroup = new THREE.Group();
  wheelGroup.rotation.x = -Math.PI / 2;   // disco in piano (XZ mondo)
  scene.add(wheelGroup);

  // Ciotola/base statica
  const bowl = new THREE.Mesh(new THREE.CircleGeometry(R * 1.45, 64), matWood);
  bowl.position.z = -0.06; wheelGroup.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 1.2, 0.22, 20, 80), matRim);
  rim.position.z = 0.06; wheelGroup.add(rim);
  const track = new THREE.Mesh(new THREE.TorusGeometry(RAIL_R, 0.06, 16, 90), matTrack);
  track.position.z = 0.34; wheelGroup.add(track);   // sotto la quota d'orbita della pallina

  // Disco rotante
  const disk = new THREE.Group();
  wheelGroup.add(disk);

  disk.add(new THREE.Mesh(new THREE.CircleGeometry(R * 1.02, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.7, metalness: 0.3 })));

  function numberTexture(num) {
    const s = 128;
    const c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(s * 0.62)}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(num), s / 2, s / 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  // Settori + numeri + frette
  const fretGeo = new THREE.BoxGeometry(FRET_OUT - FRET_IN, 0.05, 0.12);
  const midR = (FRET_IN + FRET_OUT) / 2;
  const labels = [];   // numeri: { mesh, flatZ }
  for (let i = 0; i < NUMBERS.length; i++) {
    const num = NUMBERS[i];
    const aMid = i * SEG + SEG / 2;

    const sector = new THREE.Mesh(new THREE.CircleGeometry(R, 20, i * SEG, SEG), matForNum(num));
    sector.position.z = 0.02; disk.add(sector);

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.48),
      new THREE.MeshBasicMaterial({ map: numberTexture(num), transparent: true })
    );
    label.position.set(Math.cos(aMid) * NUM_R, Math.sin(aMid) * NUM_R, 0.06);
    label.rotation.z = aMid - Math.PI / 2;
    disk.add(label);
    labels.push({ mesh: label, flatZ: aMid - Math.PI / 2 });

    // Fretta dorata sul confine i*SEG
    const a = i * SEG;
    const fret = new THREE.Mesh(fretGeo, matFret);
    fret.position.set(Math.cos(a) * midR, Math.sin(a) * midR, 0.06);
    fret.rotation.z = a;
    disk.add(fret);
  }

  // Anello interno + mozzo (turret)
  disk.add(new THREE.Mesh(new THREE.CircleGeometry(FRET_IN, 48),
    new THREE.MeshStandardMaterial({ color: 0x241a0c, roughness: 0.4, metalness: 0.5 })).translateZ(0.04));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(HUB_R * 0.7, HUB_R, 0.3, 32), matHub);
  hub.rotation.x = Math.PI / 2; hub.position.z = 0.18; disk.add(hub);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(HUB_R * 0.5, 0.55, 28), matHub);
  cone.rotation.x = -Math.PI / 2; cone.position.z = 0.5; disk.add(cone);

  // ── Pallina riflettente (figlia del disco) ────────────────
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_R, 48, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0xf6f4ee, roughness: 0.25, metalness: 0.0,
      clearcoat: 1.0, clearcoatRoughness: 0.05, envMapIntensity: 1.2,
    })
  );
  disk.add(ball);
  let ballAngle = SEG / 2;        // riposo iniziale: casella indice 0
  let ballRadius = POCKET_R, ballLift = POCKET_H;
  function placeBall() {
    ball.position.set(Math.cos(ballAngle) * ballRadius, Math.sin(ballAngle) * ballRadius, ballLift);
  }
  placeBall();

  // Numeri: piatti sul disco durante il giro; rivolti all'utente da fermo.
  function setLabelsFlat() {
    for (const l of labels) l.mesh.rotation.set(0, 0, l.flatZ);
  }
  const _camPos = new THREE.Vector3();
  function billboardLabels() {
    camera.getWorldPosition(_camPos);
    for (const l of labels) l.mesh.lookAt(_camPos);
  }

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
    setLabelsFlat();                       // durante il giro: numeri piatti (invariato)
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
  let active = false, animId = null;
  const clock = new THREE.Clock();
  function frame() {
    animId = requestAnimationFrame(frame);
    const delta = Math.min(clock.getDelta(), 0.05);

    // Camera: easing morbido verso la posa target (lerp frame-indip.)
    const k = 1 - Math.pow(0.0009, delta);
    camera.position.lerp(POSES[camTarget].pos, k);
    curLook.lerp(POSES[camTarget].look, k);
    camera.lookAt(curLook);

    // Da fermo (idle/ritorno): numeri rivolti all'utente per leggibilità.
    if (phase !== "spinning") billboardLabels();

    if (phase === "spinning") {
      const p = Math.min((performance.now() - sp.t0) / sp.dur, 1);
      const e = easeOutCubic(p);
      disk.rotation.z = sp.d0 + (sp.dF - sp.d0) * e;       // FASE 2: rotazione
      ballAngle = sp.b0 + (sp.bF - sp.b0) * e;
      // FASE 3: la pallina cade nella casella SOLO a fine giro, quando
      // l'angolo è ormai fermo → scende nel vuoto tra due frette (no clip).
      const dropStart = 0.88;
      if (p < dropStart) {
        ballRadius = RAIL_R; ballLift = RAIL_H;       // orbita sopra le frette
      } else {
        const de = easeInOut((p - dropStart) / (1 - dropStart));
        ballRadius = lerp(RAIL_R, POCKET_R, de);
        ballLift = lerp(RAIL_H, POCKET_H, de);
      }
      placeBall();
      if (p >= 1) finishSpin();
    }

    renderer.render(scene, camera);
  }
  function setActive(on) {
    if (on && !active) { active = true; clock.getDelta(); frame(); }
    else if (!on && active) { active = false; if (animId) cancelAnimationFrame(animId); animId = null; }
  }

  return { spin: startSpin, setActive, resize };
}
