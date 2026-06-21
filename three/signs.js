// ============================================================
//  SIGNS — Insegne neon di Gotham (WAYNE, GCPD, GOTHAM…)
//  Testo disegnato su canvas con bagliore, montato su piani
//  emissivi lungo il "canyon" della strada. Riciclo infinito.
//  Nessuna dipendenza dai moduli del Comic Reader 2D.
// ============================================================

import * as THREE from '../lib/three.module.min.js';
import { SIGN_CONFIG as CFG } from './signs-config.js';

const ROW_SPACING = 26;            // coerente con city.js
const TOTAL_DEPTH = 22 * ROW_SPACING; // 572

// ── Converte un intero esadecimale in stringa CSS ────────────
function cssHex(hex) {
  return '#' + hex.toString(16).padStart(6, '0');
}

// ── Texture neon orizzontale ─────────────────────────────────
// Disegna il testo con alone (shadowBlur) + nucleo bianco caldo.
// Ritorna { texture, aspect } per dimensionare il piano.
function neonTextureH(text, hex) {
  const fontPx = 150;
  const pad    = 60;
  const css    = cssHex(hex);

  const probe = document.createElement('canvas').getContext('2d');
  probe.font  = `900 ${fontPx}px "Arial Black", Arial, sans-serif`;
  const tw    = Math.ceil(probe.measureText(text).width);

  const canvas = document.createElement('canvas');
  canvas.width  = tw + pad * 2;
  canvas.height = fontPx + pad * 2;
  const ctx = canvas.getContext('2d');

  ctx.font         = `900 ${fontPx}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  const cx = canvas.width / 2, cy = canvas.height / 2;

  // Alone esterno: due passate con blur ampio
  ctx.shadowColor = css;
  ctx.fillStyle   = css;
  ctx.shadowBlur  = 55; ctx.fillText(text, cx, cy);
  ctx.shadowBlur  = 30; ctx.fillText(text, cx, cy);
  // Nucleo caldo: testo quasi bianco con blur ridotto (filamento)
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = '#fff7e6';
  ctx.fillText(text, cx, cy);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: canvas.width / canvas.height };
}

// ── Texture neon verticale (lettere impilate) ────────────────
function neonTextureV(text, hex) {
  const fontPx = 140;
  const pad    = 46;
  const step   = fontPx * 0.98;
  const css    = cssHex(hex);
  const chars  = text.split('');

  const canvas = document.createElement('canvas');
  canvas.width  = fontPx + pad * 2;
  canvas.height = Math.ceil(chars.length * step + pad * 2);
  const ctx = canvas.getContext('2d');

  ctx.font         = `900 ${fontPx}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  const cx = canvas.width / 2;

  chars.forEach((ch, i) => {
    const cy = pad + step * (i + 0.5);
    ctx.shadowColor = css;
    ctx.fillStyle   = css;
    ctx.shadowBlur  = 50; ctx.fillText(ch, cx, cy);
    ctx.shadowBlur  = 28; ctx.fillText(ch, cx, cy);
    ctx.shadowBlur  = 9;
    ctx.fillStyle   = '#fff7e6';
    ctx.fillText(ch, cx, cy);
    ctx.fillStyle   = css; // ripristina per la lettera dopo
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: canvas.width / canvas.height };
}

// ── Path rettangolo arrotondato (compatibile) ───────────────
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

// ── Disegna l'immagine "cover" con focus + zoom (object-position) ──
// focusX/focusY in [0,1]: quale parte dell'immagine mostrare.
// zoom: 1 = riempi; >1 ingrandisce (taglia di più); <1 rimpicciolisce.
function drawCover(ctx, img, W, H, focusX = 0.5, focusY = 0.5, zoom = 1) {
  const scale = Math.max(W / img.width, H / img.height) * zoom;
  const dw = img.width * scale, dh = img.height * scale;
  const dx = (W - dw) * focusX;   // allinea il punto focale orizzontale
  const dy = (H - dh) * focusY;   // allinea il punto focale verticale
  ctx.drawImage(img, dx, dy, dw, dh);
}

// ── Ritratto rifinito: angoli arrotondati, bordi sfumati, ────
// vignette soffusa e alone neon morbido (niente bordo rigido).
function makePortraitTexture(url, hex, frame = {}) {
  const { focusX = 0.5, focusY = 0.5, zoom = 1 } = frame;
  const W = 512, H = 614;                       // 5:6
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const image = new Image();   // stessa origine → canvas non "tainted"
  image.onload = () => {
    const inset  = W * 0.075;
    const radius = Math.min(W, H) * 0.15;
    const rw = W - 2 * inset, rh = H - 2 * inset;
    ctx.clearRect(0, 0, W, H);

    // 1) Immagine a riempimento, con inquadratura (focus + zoom)
    drawCover(ctx, image, W, H, focusX, focusY, zoom);

    // 2) Maschera rounded-rect NETTA (solo 2px di anti-alias, contenuta)
    ctx.globalCompositeOperation = 'destination-in';
    ctx.filter = 'blur(2px)';
    ctx.fillStyle = '#ffffff';
    roundRectPath(ctx, inset, inset, rw, rh, radius);
    ctx.fill();
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';

    // 3) Vignette soffusa interna (solo sulla foto)
    const g = ctx.createRadialGradient(W/2, H*0.45, W*0.18, W/2, H/2, W*0.66);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    // 4) Cornice neon: spessa, COPRE il bordo della foto → niente sbavature.
    //    L'unica morbidezza è l'alone neon verso l'esterno (voluto).
    ctx.lineJoin = 'round';
    ctx.shadowColor = cssHex(hex);
    ctx.shadowBlur  = W * 0.05;             // alone soffuso esterno
    ctx.strokeStyle = cssHex(hex);
    ctx.lineWidth   = W * 0.024;            // spessa: nasconde la transizione
    roundRectPath(ctx, inset, inset, rw, rh, radius);
    ctx.stroke();

    // 5) Filo interno chiaro per un bordo netto e pulito
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth   = Math.max(2, W * 0.004);
    roundRectPath(ctx, inset, inset, rw, rh, radius);
    ctx.stroke();

    tex.needsUpdate = true;
  };
  image.src = url;
  return tex;
}

// ── Crea un piano-insegna e lo aggiunge alla scena ───────────
// height = altezza in unità mondo; la larghezza segue l'aspect.
function makeSign(scene, spec, meshes, photos) {
  const { text, color, vertical, x, y, z, rotY, height, img } = spec;
  const { texture, aspect } =
    vertical ? neonTextureV(text, color) : neonTextureH(text, color);

  const w = height * aspect;
  const geo = new THREE.PlaneGeometry(w, height);
  const mat = new THREE.MeshBasicMaterial({
    map:         texture,
    transparent: true,
    depthWrite:  false,
    fog:         true,          // le insegne lontane sfumano nella foschia
    side:        THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  scene.add(mesh);
  meshes.push(mesh);

  // Alone colorato locale: piccola luce che tinge il palazzo dietro
  const glow = new THREE.PointLight(color, 2.4, 26, 2.0);
  glow.position.set(x, y, z + (Math.cos(rotY) >= 0 ? 1.5 : -1.5));
  scene.add(glow);
  meshes.push(glow); // riciclato insieme all'insegna

  // ── Foto del personaggio sotto al nome ─────────────────────
  // Parte invisibile: l'animazione di entrata/uscita è gestita in
  // update() in base alla distanza della camera (vicinanza = appare).
  if (img) {
    // Valori di default + eventuale override per personaggio (signs-config.js)
    const P  = CFG.photo;
    const ov = CFG.perCharacter[text] || {};
    const pw = ov.photoWidth   ?? P.width;
    const ph = ov.photoHeight  ?? P.height;
    const ox = ov.photoOffsetX ?? P.offsetX;
    const oy = ov.photoOffsetY ?? P.offsetY;
    const oz = ov.photoOffsetZ ?? P.offsetZ;
    // Inquadratura interna (per centrare il volto): config + override
    const frame = {
      focusX: ov.focusX ?? P.focusX,
      focusY: ov.focusY ?? P.focusY,
      zoom:   ov.zoom   ?? P.zoom,
    };

    const tex = makePortraitTexture(encodeURI('./assets/personaggi/' + img), color, frame);
    const pmat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0,
      depthWrite: false, fog: false, side: THREE.DoubleSide
    });
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), pmat);
    photo.position.set(x + ox, y + oy, z + oz);   // posizione (config/override)
    photo.rotation.y = rotY;
    photo.scale.set(P.scaleMin, P.scaleMin, 1);
    photo.visible = false;
    scene.add(photo);
    meshes.push(photo);   // riciclo insieme al nome
    photos.push(photo);   // animazione di vicinanza
  }
}

// ── Posizionamenti (canyon di neon, come nel riferimento) ────
// rotY = 0       → faccia verso la camera in arrivo (+Z)
// rotY = +π/2    → blade sul lato sinistro, rivolta verso il centro (+X)
// rotY = -π/2    → blade sul lato destro,   rivolta verso il centro (-X)
// Tutti i personaggi in FILA INDIANA DAVANTI all'osservatore.
// Orizzontali, al centro della strada (x=0), rivolte verso la camera
// in arrivo (+Z): scorrendo/swipando le si incontra una dopo l'altra
// e si leggono frontalmente. Stessa quota per tutte. Altezza piccola
// così anche i nomi lunghi restano dentro la carreggiata (no collisioni).
// Parametri di posizionamento (quota, passo, foto, animazione)
// → modificabili a mano in three/signs-config.js (oggetto CFG).

// img = file in assets/personaggi/ (nomi reali, anche se l'insegna è accorciata)
const SIGN_NAMES = [
  { text: 'BATMAN',       color: 0x33ffbb, img: 'Batman.jpeg' },
  { text: 'JOKER',        color: 0xaa66ff, img: 'Joker.jpeg' },
  { text: 'CATWOMAN',     color: 0xff66cc, img: 'Catwoman.jpeg' },
  { text: 'BUD SPENCER',  color: 0xffcf6e, img: 'Bud Spencer.jpeg' },
  { text: 'HANS LANDA',   color: 0x4aa8ff, img: 'Colonnello Hans Landa.jpeg' },
  { text: 'DON PIETRO',   color: 0x44ff66, img: 'Don Pietro Savastano.jpeg' },
  { text: 'JACK HARLOW',  color: 0xff3344, img: 'Jack Harlow.jpeg' },
  { text: 'JACK BLACK',   color: 0x33ddff, img: 'Jack Black.jpeg' },
  { text: 'GOHAN',        color: 0xff8833, img: 'Gohan.jpeg' },
  { text: 'C-3PO',        color: 0xffcf6e, img: 'C3PO.jpeg' },
  { text: 'PINOCCHIO',    color: 0x44ff66, img: 'Pinocchio.jpeg' },
  { text: 'BOFFETTI',     color: 0x33ddff, img: 'Boffetti.jpeg' },
  { text: 'DARTH BARDUK', color: 0xff3344, img: 'Darth Barduk.jpeg' },
  { text: 'LA MAGA',      color: 0xaa66ff, img: 'La Maga.jpeg' },
  { text: 'MORFEO',       color: 0x4aa8ff, img: 'Morfeo Belardo.jpeg' },
  { text: 'ACERRA',       color: 0x33ffbb, img: 'Acerra Malta.jpeg' },
  { text: 'DAHMER',       color: 0xff3344, img: 'Jeffrey Dahmer.jpeg' },
  { text: 'PUNK BIONDO',  color: 0xffcf6e, img: 'Punk Biondo.jpeg' },
  { text: 'STAMBECCO',    color: 0x44ff66, img: 'Uomo Stambecco.jpeg' },
];

// Generazione: tutte al centro, frontali alla camera, in fila lungo Z.
const SIGN_PLACEMENTS = SIGN_NAMES.map((n, i) => ({
  text:     n.text,
  color:    n.color,
  img:      n.img,
  vertical: false,                  // orizzontale → leggibile di fronte
  x:        CFG.x,                  // posizione orizzontale (signs-config.js)
  y:        CFG.signY,              // quota dei nomi
  z:        CFG.startZ - i * CFG.step,
  rotY:     0,                      // rivolta verso la camera in arrivo (+Z)
  height:   CFG.signHeight
}));

// ── Export ───────────────────────────────────────────────────
export function createSigns(scene) {
  const meshes = [];
  const photos = [];                       // foto da animare per vicinanza
  SIGN_PLACEMENTS.forEach(spec => makeSign(scene, spec, meshes, photos));

  function update(cameraZ) {
    // Riciclo infinito (nomi, luci e foto)
    meshes.forEach(obj => {
      if (obj.position.z > cameraZ + ROW_SPACING) {
        obj.position.z -= TOTAL_DEPTH;
      }
    });

    // Animazione foto: appare avvicinandosi, sparisce allontanandosi.
    // d = distanza lungo Z (｜>0 prima di raggiungerla, <0 dopo averla passata).
    const A = CFG.anim, smin = CFG.photo.scaleMin;
    for (const p of photos) {
      const d = cameraZ - p.position.z;
      let v;
      if (d > A.appearFar || d < A.gone) v = 0;                                   // lontana
      else if (d > A.fadeInTo)           v = (A.appearFar - d) / (A.appearFar - A.fadeInTo); // entra
      else if (d > A.fullNear)           v = 1;                                   // piena
      else                               v = (d - A.gone) / (A.fullNear - A.gone); // esce
      v = v < 0 ? 0 : v > 1 ? 1 : v;

      p.visible = v > 0.01;
      if (p.visible) {
        p.material.opacity = v;
        const s = smin + (1 - smin) * v;  // scala: cresce entrando, cala uscendo
        p.scale.set(s, s, 1);
        p.position.y = (p.userData.baseY ?? (p.userData.baseY = p.position.y))
                       + (1 - v) * A.slideY;   // lieve scivolata verticale
      }
    }
  }

  return { update };
}
