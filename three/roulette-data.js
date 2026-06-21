// ============================================================
//  ROULETTE-DATA — Numeri, colori e soprannomi (Smorfia napoletana)
//  Stessi dati della roulette 2D (app-entertainment.js).
//  DEV ONLY — usato dalla roulette 3D di prova.
// ============================================================

// Ordine reale della ruota europea (0..36)
export const NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27,
  13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1,
  20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const RED_SET = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
]);

export const NICKNAMES = {
  0: "zero",            1: "l'Italia",        2: "a' criatura",
  3: "a' jatta",        4: "o' puorco",       5: "a' mano",
  6: "chella ca guarda nterra", 7: "o' vase", 8: "a' Maronna",
  9: "a' figliata",     10: "e fasule",       11: "e surice",
  12: "e surdate",      13: "Sant'Antonio",   14: "o' mbriaco",
  15: "o' guaglione",   16: "o' culo",        17: "a disgrazia",
  18: "o' sanghe",      19: "a' resata",      20: "a' festa",
  21: "a' femmena annura", 22: "o' pazzo",    23: "o' scemo",
  24: "e guardie",      25: "Natale",         26: "Nanninella",
  27: "o' cantero",     28: "e zzizze",       29: "o' pate d'e criature",
  30: "e palle d'o tenente", 31: "o' padrone 'e casa", 32: "o' capitone",
  33: "ll'anne 'e Cristo", 34: "a' capa",     35: "l'aucielluzzo",
  36: "e castagnelle"
};

// Colore casella: verde (0), rosso, nero
export function colorFor(num) {
  if (num === 0) return 0x1b7a3a;
  return RED_SET.has(num) ? 0xb71c1c : 0x141414;
}
