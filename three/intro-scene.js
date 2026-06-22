// ============================================================
//  INTRO-SCENE — Intro 3D "costruzione a mattoni".
//  All'apertura del sito i mattoni volano in scena dal basso e
//  si assemblano formando il logo del pipistrello (campionato da
//  icon-512.png) e la scritta 3D "BATMAN". Occhi gialli luminosi.
//  Solo Three.js base + InstancedMesh (un solo draw call). ES module.
//  API: initIntro3D(canvas, { logoSrc, title, onDone }) → { dispose }.
// ============================================================

import * as THREE from '../lib/three.module.min.js';
import { FontLoader } from '../lib/FontLoader.js';
import { TextGeometry } from '../lib/TextGeometry.js';

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutCubic = p => 1 - Math.pow(1 - p, 3);
const easeOutBack = p => { const c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

// Colori
const COL_STONE = new THREE.Color(0x5b6675);   // pietra/grafite (corpo pipistrello)
const COL_EYE   = new THREE.Color(0xffd21f);   // occhi gialli
const COL_GOLD  = new THREE.Color(0xd4af37);   // scritta BATMAN

const STEP = 0.12;                // dimensione cella (mattone) in unità mondo
const DUR  = 0.55;                // durata volo del singolo mattone
const REVEAL = 0.95;             // dissolvenza mattoni pipistrello → foto reale del logo
const HOLD2  = 0.9;              // posa finale 3D (foto + testo) prima del done

export function initIntro3D(canvas, { logoSrc = './icons/icon-512.png', title = 'BATMAN', onDone = null } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);              // trasparente: si vede il gradiente CSS dietro
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

  // Luci: key calda + fill freddo + ambient → i mattoni di pietra "leggono" in 3D.
  scene.add(new THREE.AmbientLight(0x3a4456, 0.85));
  const key = new THREE.DirectionalLight(0xfff1d4, 1.35); key.position.set(-5, 7, 9); scene.add(key);
  const fill = new THREE.DirectionalLight(0x5577ff, 0.5); fill.position.set(6, -2, 4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0x9fd0ff, 0.6); rim.position.set(0, 2, -8); scene.add(rim);

  const group = new THREE.Group();
  scene.add(group);

  // Occhi luminosi (aggiunti dopo il build)
  const eyeLights = [];

  // ── Stato animazione ──────────────────────────────────────
  let inst = null, count = 0;
  let starts, targets, sQuat, tQuat, scales, delays, doneFlag;
  let maxEnd = 0, t0 = 0, built = false, doneCalled = false;
  let center = new THREE.Vector3(), halfW = 1, halfH = 1, fitZ = 12;
  const dummy = new THREE.Object3D();
  const _q = new THREE.Quaternion();
  const _p = new THREE.Vector3();
  let imagePlane = null, shadowPlane = null, imgTex = null;
  let textMesh = null, textScale = 1;
  let logoCx = 0, logoCy = 1.15;
  const TEXT_Y = -2.4;            // centro verticale della scritta (come i mattoni testo)

  // ── Campionamento immagine/canvas su griglia ──────────────
  function sampleLogo(img, gridW) {
    const ar = img.height / img.width;
    const gh = Math.max(8, Math.round(gridW * ar));
    const c = document.createElement('canvas'); c.width = gridW; c.height = gh;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, gridW, gh);
    const d = ctx.getImageData(0, 0, gridW, gh).data;
    const out = [];
    for (let y = 0; y < gh; y++) for (let x = 0; x < gridW; x++) {
      const i = (y * gridW + x) * 4;
      const a = d[i + 3] / 255; if (a < 0.5) continue;
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const yellow = r > 0.48 && g > 0.38 && (r + g) > 1.0 && b < r * 0.85;
      if (lum < 0.62 || yellow) out.push({ gx: x, gy: y, eye: yellow });
    }
    return { cells: out, gw: gridW, gh };
  }

  function sampleText(text, gridW) {
    const W = 560, H = 150;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let fs = 130;
    ctx.font = `900 ${fs}px "Arial Black", Arial, sans-serif`;
    while (ctx.measureText(text).width > W * 0.92 && fs > 24) { fs -= 4; ctx.font = `900 ${fs}px "Arial Black", Arial, sans-serif`; }
    ctx.fillText(text, W / 2, H / 2);
    const gh = Math.max(6, Math.round(gridW * H / W));
    const d = ctx.getImageData(0, 0, W, H).data;
    const out = [];
    for (let y = 0; y < gh; y++) for (let x = 0; x < gridW; x++) {
      const sx = Math.min(W - 1, Math.floor((x + 0.5) / gridW * W));
      const sy = Math.min(H - 1, Math.floor((y + 0.5) / gh * H));
      if (d[(sy * W + sx) * 4 + 3] > 110) out.push({ gx: x, gy: y, eye: false });
    }
    return { cells: out, gw: gridW, gh };
  }

  // Mappa celle griglia → mattoni mondo, con colore e "layer" (0 logo, 1 testo).
  function place(s, step, cx, cy, layer, color, all) {
    for (const c of s.cells) {
      all.push({
        wx: cx + (c.gx - s.gw / 2 + 0.5) * step,
        wy: cy + (s.gh / 2 - c.gy - 0.5) * step,
        eye: c.eye, layer, color,
      });
    }
  }

  function build(img) {
    const all = [];
    const logo = sampleLogo(img, 66);
    place(logo, STEP, logoCx, logoCy, 0, COL_STONE, all);

    const txt = sampleText(title, 104);
    const tStep = STEP * 0.62;
    place(txt, tStep, 0, -2.4, 1, COL_GOLD, all);

    count = all.length;
    const geo = new THREE.BoxGeometry(STEP * 0.82, STEP * 0.82, STEP * 0.95);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.25 });
    inst = new THREE.InstancedMesh(geo, mat, count);
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    starts = new Array(count); targets = new Array(count);
    sQuat = new Array(count); tQuat = new Array(count);
    scales = new Float32Array(count); delays = new Float32Array(count);
    doneFlag = new Uint8Array(count);
    const col = new THREE.Color();

    // estensione verticale per lo stagger "dal basso" (per layer)
    const yb = [{ min: Infinity, max: -Infinity }, { min: Infinity, max: -Infinity }];
    for (const c of all) { const L = yb[c.layer]; if (c.wy < L.min) L.min = c.wy; if (c.wy > L.max) L.max = c.wy; }
    const LOGO_BUILD = 0.85, TEXT_START = 1.05, TEXT_BUILD = 0.45;

    const box = new THREE.Box3();
    for (let i = 0; i < count; i++) {
      const c = all[i];
      const tz = (Math.random() - 0.5) * STEP * 0.7;
      targets[i] = new THREE.Vector3(c.wx, c.wy, tz);
      box.expandByPoint(targets[i]);

      // partenza sparsa, con forte componente dal basso (costruzione)
      const ang = Math.random() * Math.PI * 2, rad = 4 + Math.random() * 5;
      starts[i] = new THREE.Vector3(
        c.wx + Math.cos(ang) * rad,
        c.wy + Math.sin(ang) * rad * 0.5 - 3 - Math.random() * 4,
        (Math.random() - 0.5) * 9 - 2
      );
      tQuat[i] = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        (Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.22));
      sQuat[i] = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        Math.random() * 6, Math.random() * 6, Math.random() * 6));
      scales[i] = 0.9 + Math.random() * 0.22;

      const L = yb[c.layer];
      const fb = (c.wy - L.min) / Math.max(0.001, L.max - L.min); // 0 basso .. 1 alto
      delays[i] = (c.layer === 0)
        ? fb * LOGO_BUILD + Math.random() * 0.14
        : TEXT_START + fb * TEXT_BUILD + Math.random() * 0.12;
      maxEnd = Math.max(maxEnd, delays[i] + DUR);

      const cc = c.eye ? COL_EYE : c.color;
      col.copy(cc); inst.setColorAt(i, col);

      // mattoni "fuori scena" all'avvio
      dummy.position.copy(starts[i]); dummy.quaternion.copy(sQuat[i]); dummy.scale.setScalar(0.001);
      dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceColor.needsUpdate = true;
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);

    // inquadratura: calcola centro/estensioni per il fit
    box.getCenter(center);
    const size = new THREE.Vector3(); box.getSize(size);
    halfW = size.x / 2 + 0.4; halfH = size.y / 2 + 0.4;

    // occhi luminosi (centroidi celle "eye", separati per lato)
    const eyes = all.filter(c => c.eye);
    if (eyes.length) {
      const sides = [eyes.filter(e => e.wx < 0), eyes.filter(e => e.wx >= 0)];
      for (const s of sides) {
        if (!s.length) continue;
        const ex = s.reduce((a, e) => a + e.wx, 0) / s.length;
        const ey = s.reduce((a, e) => a + e.wy, 0) / s.length;
        const pl = new THREE.PointLight(0xffd21f, 0, 1.5, 2.4);
        pl.position.set(ex, ey, 0.55);
        eyeLights.push(pl); scene.add(pl);
      }
    }

    // ── Foto reale del logo per il reveal finale (piano 3D, parte invisibile) ──
    imgTex = new THREE.Texture(img);
    imgTex.colorSpace = THREE.SRGBColorSpace;
    imgTex.minFilter = THREE.LinearFilter;
    imgTex.needsUpdate = true;
    const planeW = logo.gw * STEP, planeH = logo.gh * STEP;
    imagePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(planeW, planeH),
      new THREE.MeshBasicMaterial({ map: imgTex, transparent: true, opacity: 0, depthWrite: false }));
    imagePlane.position.set(logoCx, logoCy, 0.5);
    imagePlane.renderOrder = 2;
    group.add(imagePlane);
    // Ombra: stessa sagoma in nero, sfalsata dietro → dà profondità 3D alla foto.
    shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(planeW, planeH),
      new THREE.MeshBasicMaterial({ map: imgTex, color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
    shadowPlane.position.set(logoCx + 0.22, logoCy - 0.3, 0.18);
    shadowPlane.renderOrder = 1;
    group.add(shadowPlane);

    fitCamera();
    built = true; t0 = performance.now();
  }

  function fitCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    const tan = Math.tan((camera.fov * Math.PI / 180) / 2);
    const distH = halfH / tan;
    const distW = (halfW / aspect) / tan;
    fitZ = Math.max(distH, distW) * 1.18 + 0.5;
  }

  // ── Loop ──────────────────────────────────────────────────
  let raf = null;
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!built) { renderer.render(scene, camera); return; }

    const t = (performance.now() - t0) / 1000;

    if (t < maxEnd) {
      // ── Fase costruzione: i mattoni volano e si assemblano ──
      for (let i = 0; i < count; i++) {
        if (doneFlag[i]) continue;
        const lt = (t - delays[i]) / DUR;
        if (lt <= 0) continue;                              // non ancora partito (resta a scala 0)
        if (lt >= 1) {
          dummy.position.copy(targets[i]); dummy.quaternion.copy(tQuat[i]); dummy.scale.setScalar(scales[i]);
          dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
          doneFlag[i] = 1; continue;
        }
        _p.copy(starts[i]).lerp(targets[i], easeOutCubic(lt));
        _q.copy(sQuat[i]).slerp(tQuat[i], easeOutCubic(lt));
        dummy.position.copy(_p); dummy.quaternion.copy(_q);
        dummy.scale.setScalar(scales[i] * easeOutBack(clamp01(lt)));
        dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      const glow = clamp01((t - 0.9) / 0.8);                // occhi si accendono col logo
      for (const pl of eyeLights) pl.intensity = glow * 4;

      // camera: dolly d'ingresso + leggero sway
      const ci = clamp01(t / 1.6);
      const z = fitZ * (1.22 - 0.22 * easeOutCubic(ci));
      const sway = Math.sin(t * 0.7) * 0.25 * (1 - ci * 0.6);
      camera.position.set(center.x + sway, center.y + 0.15 + sway * 0.3, z);
    } else {
      // ── Fase reveal: i mattoni del pipistrello sfumano, appare la FOTO reale ──
      const rt = clamp01((t - maxEnd) / REVEAL);
      const e = rt < 0.5 ? 4 * rt * rt * rt : 1 - Math.pow(-2 * rt + 2, 3) / 2;  // easeInOutCubic
      for (let i = 0; i < count; i++) {                     // garantisci posa finale dei mattoni (una volta)
        if (!doneFlag[i]) {
          dummy.position.copy(targets[i]); dummy.quaternion.copy(tQuat[i]); dummy.scale.setScalar(scales[i]);
          dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); doneFlag[i] = 1;
        }
      }
      // i mattoni (pipistrello + scritta) sfumano tutti insieme
      if (!inst.material.transparent) { inst.material.transparent = true; inst.material.needsUpdate = true; }
      inst.material.opacity = 1 - e;
      if (imagePlane) imagePlane.material.opacity = rt;     // foto reale del logo entra
      if (shadowPlane) shadowPlane.material.opacity = rt * 0.5;
      if (textMesh) {                                       // scritta 3D estrusa: dissolvenza + pop
        textMesh.material.opacity = rt;
        textMesh.scale.setScalar(textScale * (0.86 + 0.14 * e));
      }
      for (const pl of eyeLights) pl.intensity = (1 - rt) * 4;

      // camera: orbita di parallasse → foto e testo mostrano la profondità 3D
      const a = Math.sin((t - maxEnd) * 0.85) * 0.28;
      camera.position.set(center.x + Math.sin(a) * fitZ, center.y + 0.2, Math.cos(a) * fitZ);
    }
    camera.lookAt(center.x, center.y, 0);

    renderer.render(scene, camera);

    if (!doneCalled && t > maxEnd + REVEAL + HOLD2) {
      doneCalled = true;
      if (typeof onDone === 'function') onDone();
    }
  }

  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (built) fitCamera();
  }
  window.addEventListener('resize', onResize);

  // Testo 3D estruso "BATMAN": pulito ed estruso, appare nel reveal finale.
  function createText(font) {
    const geo = new TextGeometry(title, {
      font, size: 1, depth: 0.28, curveSegments: 6,
      bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.035, bevelSegments: 3,
    });
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y, dz = bb.max.z - bb.min.z;
    geo.translate(-(bb.min.x + w / 2), -(bb.min.y + h / 2), -(bb.min.z + dz / 2)); // centra sull'origine
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, metalness: 0.55, roughness: 0.3, transparent: true, opacity: 0,
    });
    textMesh = new THREE.Mesh(geo, mat);
    textScale = 6.4 / w;                      // larghezza ~ quella del logo
    textMesh.scale.setScalar(textScale);
    textMesh.position.set(0, TEXT_Y, 0.4);
    textMesh.renderOrder = 2;
    group.add(textMesh);
  }

  // avvio
  const img = new Image();
  img.onload = () => { try { build(img); } catch (e) { console.warn('Intro build:', e); if (onDone) onDone(); } };
  img.onerror = () => { if (onDone) onDone(); };
  img.src = logoSrc;

  new FontLoader().load(
    'assets/fonts/helvetiker_bold.typeface.json',
    font => { try { createText(font); } catch (e) { console.warn('Intro testo 3D:', e); } },
    undefined,
    err => console.warn('Intro font non caricato:', err)
  );

  frame();

  function dispose() {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    for (const pl of eyeLights) scene.remove(pl);
    if (inst) { inst.geometry.dispose(); inst.material.dispose(); group.remove(inst); }
    if (imagePlane) { imagePlane.geometry.dispose(); imagePlane.material.dispose(); }
    if (shadowPlane) { shadowPlane.geometry.dispose(); shadowPlane.material.dispose(); }
    if (textMesh) { textMesh.geometry.dispose(); textMesh.material.dispose(); }
    if (imgTex) imgTex.dispose();
    renderer.dispose();
  }

  return { dispose };
}
