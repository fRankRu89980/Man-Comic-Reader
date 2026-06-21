// ============================================================
//  SIGNS-CONFIG — Posizionamento nomi + foto personaggi (Gotham 3D)
//  ⚠️ NOTA: le foto sono oggetti 3D nel canvas WebGL, non HTML:
//  si posizionano con coordinate (NON con CSS). Modifica QUI a mano.
//  Tutti i valori sono in "unità mondo" Three.js. Assi:
//    x → sinistra(-)/destra(+)   y → basso/alto   z → avanti(-)/dietro(+)
// ============================================================

export const SIGN_CONFIG = {
  // ── Nomi neon (fila al centro, frontali alla camera) ──────
  x:          0,     // posizione orizzontale (0 = centro strada)
  signY:      12,    // quota verticale dei nomi
  signHeight: 2.2,   // dimensione del testo
  step:       24,    // distanza fra un personaggio e il successivo (Z)
  startZ:    -22,    // Z del primo personaggio (davanti alla partenza)

  // ── Foto sotto al nome (valori di default per tutte) ──────
  photo: {
    width:    5,     // larghezza piano foto
    height:   6,     // altezza piano foto
    offsetX:  0,     // spostamento orizzontale rispetto al nome
    offsetY: -4.8,   // quanto sotto il nome (negativo = più in basso)
    offsetZ:  0,     // avanti/dietro rispetto al nome
    scaleMin: 0.7,   // scala minima durante entrata/uscita

    // ── INQUADRATURA interna (come si vede la faccia) ───────
    // Sposta/zooma l'immagine DENTRO la cornice (non muove il piano):
    focusX:   0.5,   // 0 = mostra sinistra · 0.5 = centro · 1 = destra
    focusY:   0.5,   // 0 = mostra ALTO (volto) · 0.5 = centro · 1 = basso
    zoom:     1,     // 1 = riempi · >1 = zoom avanti · <1 = zoom indietro
  },

  // ── Animazione comparsa/scomparsa per vicinanza camera ────
  anim: {
    appearFar:  60,  // distanza a cui la foto inizia a comparire
    fadeInTo:   18,  // da qui in giù è piena (fine dissolvenza in)
    fullNear:    2,  // resta piena fino a qui
    gone:      -10,  // oltre il sorpasso → completamente sparita
    slideY:    1.5,  // lieve scivolata verticale durante l'animazione
  },

  // ── Override per SINGOLO personaggio (facoltativo) ────────
  // Chiave = testo dell'insegna (come in SIGN_NAMES di signs.js).
  //
  // Posizione del PIANO (dove sta la foto nello spazio):
  //   photoWidth, photoHeight, photoOffsetX, photoOffsetY, photoOffsetZ
  // INQUADRATURA dentro la cornice (per far vedere bene il volto):
  //   focusX  → 0 sinistra · 0.5 centro · 1 destra
  //   focusY  → 0 alto(volto) · 0.5 centro · 1 basso
  //   zoom    → 1 riempi · >1 ingrandisci · <1 rimpicciolisci
  //
  // Esempi pratici (decommenta e regola i numeri):
  perCharacter: {
    // Volto in alto tagliato → mostro la parte alta e zoomo un po':
    // 'BATMAN':     { focusY: 0.25, zoom: 1.15 },
    // Faccia spostata a destra:
    // 'JOKER':      { focusX: 0.7 },
    // Inquadratura larga + piano più grande:
    // 'BUD SPENCER':{ zoom: 0.9, photoWidth: 5.6, photoHeight: 6.7 },
    'BATMAN':         { focusY: 0.3, zoom: 1.15 },
    'JOKER':          { focusY: 0.55, zoom: 1.4 },
    'CATWOMAN':       { focusY: 0.2, zoom: 1.2 },
    'JACK BLACK':     { focusY: 0.4, zoom: 0.9 },
    'C-3PO':          { focusY: 0.4, zoom: 0.9 },
    'DARTH BARDUK':   { focusY: 0, zoom: 1.3 },
    'LA MAGA':        { focusY: 0.3 },
    'MORFEO':         { focusY: 0.28, focusX: 0.6, zoom: 1.5 },
    'DAHMER':         { focusY: 0.4, zoom: 0.9},
    'PUNK BIONDO':    { focusY: 0.76 },
    'STAMBECCO':      { focusY: 0 }
  },
};
