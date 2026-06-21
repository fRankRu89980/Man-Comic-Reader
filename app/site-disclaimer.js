// ============================================================
//  SITE-DISCLAIMER — Footer legale (fan-made / no-profit) +
//  selettore lingua: scegli una lingua → l'avviso compare tradotto.
//  Usato dalla home (index). Le pagine secondarie hanno una copia
//  equivalente in site-menu.js.
// ============================================================

const DISCLAIMER_TEXT =
  "Progetto fan-made no-profit a scopo di studio e passione personale. " +
  "Personaggi, immagini e marchi appartengono ai rispettivi proprietari. " +
  "Nessuna affiliazione o autorizzazione ufficiale.";

// Avviso tradotto (Italiano in testa = testo originale).
export const DISCLAIMER_TRANSLATIONS = [
  { label: "Italiano",   text: DISCLAIMER_TEXT },
  { label: "English",    text: "Non-profit fan-made project for personal study and passion. Characters, images and trademarks belong to their respective owners. No affiliation or official authorization." },
  { label: "Español",    text: "Proyecto de fans sin ánimo de lucro, con fines de estudio y pasión personal. Los personajes, imágenes y marcas pertenecen a sus respectivos propietarios. Sin afiliación ni autorización oficial." },
  { label: "Français",   text: "Projet de fans à but non lucratif, à des fins d'étude et de passion personnelle. Les personnages, images et marques appartiennent à leurs propriétaires respectifs. Aucune affiliation ni autorisation officielle." },
  { label: "Deutsch",    text: "Nicht-kommerzielles Fan-Projekt zu Studien- und Leidenschaftszwecken. Charaktere, Bilder und Marken gehören ihren jeweiligen Eigentümern. Keine Zugehörigkeit oder offizielle Genehmigung." },
  { label: "Português",  text: "Projeto de fãs sem fins lucrativos, para estudo e paixão pessoal. Personagens, imagens e marcas pertencem aos respetivos proprietários. Sem afiliação ou autorização oficial." },
  { label: "Русский",    text: "Некоммерческий фанатский проект для личного изучения. Персонажи, изображения и товарные знаки принадлежат их владельцам. Без аффилиации и официального разрешения." },
  { label: "中文",        text: "非营利粉丝项目，仅供个人学习与兴趣。角色、图像和商标均归各自所有者所有。无任何官方关联或授权。" },
  { label: "日本語",      text: "非営利のファン制作・個人的な学習と情熱のためのプロジェクトです。キャラクター・画像・商標は各権利者に帰属します。公式とは一切関係ありません。" },
  { label: "العربية",    text: "مشروع من إنشاء المعجبين غير ربحي لأغراض الدراسة والشغف الشخصي. الشخصيات والصور والعلامات التجارية ملك لأصحابها. لا يوجد أي ارتباط أو ترخيص رسمي.", rtl: true },
  { label: "हिन्दी",       text: "अध्ययन और व्यक्तिगत रुचि हेतु बनी गैर-लाभकारी फैन परियोजना। पात्र, चित्र और ट्रेडमार्क संबंधित स्वामियों के हैं। कोई आधिकारिक संबद्धता या अनुमति नहीं।" },
];

// Aggiunge un selettore lingua sotto a un elemento: scegliendo una
// lingua, l'avviso completo compare tradotto in quella lingua.
export function attachLangSelector(el) {
  if (!el || el.querySelector(".site-lang-select")) return;

  // Paragrafo dell'avviso da SOSTITUIRE sul posto (no riga extra).
  const target = el.querySelector(".site-disclaimer-text") || el.querySelector("p");
  if (!target) return;

  const select = document.createElement("select");
  select.className = "site-lang-select";
  select.id = "lang-select-disclaimer";
  select.setAttribute("aria-label", "Scegli la lingua dell'avviso");

  const def = document.createElement("option");
  def.value = "";
  def.textContent = "🌐 Scegli lingua…";
  select.appendChild(def);

  DISCLAIMER_TRANSLATIONS.forEach((t, i) => {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = t.label;
    select.appendChild(o);
  });

  select.addEventListener("change", () => {
    if (select.value === "") return;
    const t = DISCLAIMER_TRANSLATIONS[Number(select.value)];
    target.textContent = t.text;                                  // sostituisce in loco
    if (t.rtl) target.setAttribute("dir", "rtl"); else target.removeAttribute("dir");
  });

  el.appendChild(select);
}

export function injectDisclaimer() {
  if (document.querySelector(".site-legal-detail")) return;
  if (document.querySelector(".site-disclaimer")) return;

  const footer = document.createElement("footer");
  footer.className = "site-disclaimer";
  footer.setAttribute("role", "contentinfo");

  const p = document.createElement("p");
  p.className = "site-disclaimer-text";
  p.textContent = DISCLAIMER_TEXT;
  footer.appendChild(p);

  attachLangSelector(footer);
  document.body.appendChild(footer);
}
