
if (window.self !== window.top) {
  window.top.location.replace(window.self.location.href);
}

// ── Menu hamburger e utility pagine secondarie ───────────────
(function () {

const secondaryHamburgerToggle = document.getElementById("hamburger-toggle");
const secondaryDrawer = document.getElementById("site-drawer");
const secondaryDrawerOverlay = document.getElementById("site-drawer-overlay");
const secondaryDrawerLinks = Array.from(document.querySelectorAll(".site-drawer-link"));
const secondaryBgVideo = document.getElementById("bg-video");

function setupSecondaryDrawerIcons() {
  const drawerIcons = Array.from(document.querySelectorAll(".site-drawer-link-icon"));

  drawerIcons.forEach(icon => {
    const hideIcon = () => {
      icon.classList.add("is-missing");
    };

    if(icon.complete && icon.naturalWidth === 0) {
      hideIcon();
      return;
    }

    icon.addEventListener("error", hideIcon, { once: true });
  });
}

function setupSecondaryHamburgerMenu() {
  if(!secondaryHamburgerToggle || !secondaryDrawer || !secondaryDrawerOverlay) return;

  let drawerOpen = false;
  let lastFocusedElement = null;
  const desktopDrawerQuery = window.matchMedia("(min-width: 1024px)");

  function isDesktopDrawerMode() {
    return desktopDrawerQuery.matches;
  }

  // Apriamo il drawer e portiamo il focus al primo link disponibile.
  function openDrawer({ focusFirstLink = true } = {}) {
    drawerOpen = true;
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : secondaryHamburgerToggle;
    secondaryHamburgerToggle.setAttribute("aria-expanded", "true");
    secondaryHamburgerToggle.setAttribute("aria-label", "Chiudi menu principale");
    secondaryDrawerOverlay.hidden = false;
    secondaryDrawer.classList.add("is-open");
    secondaryDrawer.removeAttribute("aria-hidden");
    secondaryDrawer.inert = false;
    document.body.classList.add("hamburger-open");

    const firstLink = secondaryDrawerLinks[0];
    if(focusFirstLink && firstLink && typeof firstLink.focus === "function") {
      firstLink.focus();
    }
  }

  // Chiudiamo il drawer senza lasciare il focus dentro il pannello nascosto.
  function closeDrawer({ restoreFocus = true } = {}) {
    drawerOpen = false;
    secondaryHamburgerToggle.setAttribute("aria-expanded", "false");
    secondaryHamburgerToggle.setAttribute("aria-label", "Apri menu principale");
    secondaryDrawer.classList.remove("is-open");
    secondaryDrawer.setAttribute("aria-hidden", "true");
    secondaryDrawer.inert = true;
    secondaryDrawerOverlay.hidden = true;
    document.body.classList.remove("hamburger-open");

    if(
      secondaryDrawer.contains(document.activeElement) &&
      restoreFocus &&
      lastFocusedElement &&
      typeof lastFocusedElement.focus === "function"
    ) {
      lastFocusedElement.focus();
    }
  }

  function syncDrawerMode() {
    if(isDesktopDrawerMode()) {
      openDrawer({ focusFirstLink: false });
      secondaryDrawerOverlay.hidden = true;
      document.body.classList.remove("hamburger-open");
      document.body.classList.add("desktop-drawer-visible");
      return;
    }

    document.body.classList.remove("desktop-drawer-visible");
    closeDrawer({ restoreFocus: false });
  }

  secondaryHamburgerToggle.addEventListener("click", event => {
    event.stopPropagation();
    if(isDesktopDrawerMode()) return;
    if(drawerOpen) {
      closeDrawer();
      return;
    }

    openDrawer();
    secondaryHamburgerToggle.blur();
  });

  secondaryDrawerOverlay.addEventListener("click", () => {
    if(isDesktopDrawerMode()) return;
    closeDrawer();
  });

  secondaryDrawerLinks.forEach(link => {
    link.addEventListener("click", () => {
      if(isDesktopDrawerMode()) return;
      closeDrawer();
    });
  });

  document.addEventListener("keydown", event => {
    if(event.key === "Escape" && drawerOpen && !isDesktopDrawerMode()) {
      closeDrawer();
    }
  });

  if(typeof desktopDrawerQuery.addEventListener === "function") {
    desktopDrawerQuery.addEventListener("change", syncDrawerMode);
  } else if(typeof desktopDrawerQuery.addListener === "function") {
    desktopDrawerQuery.addListener(syncDrawerMode);
  }

  syncDrawerMode();
}

function setupSecondaryMediaPerformance() {
  if(!secondaryBgVideo) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveDataEnabled = navigator.connection && navigator.connection.saveData === true;
  const shouldReduceMedia = prefersReducedMotion || saveDataEnabled;

  if(shouldReduceMedia) {
    secondaryBgVideo.removeAttribute("autoplay");
    secondaryBgVideo.pause();
    secondaryBgVideo.preload = "none";
    return;
  }

  document.addEventListener("visibilitychange", () => {
    if(document.hidden) {
      secondaryBgVideo.pause();
      return;
    }

    const playPromise = secondaryBgVideo.play();
    if(playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  });
}

async function registerSecondaryServiceWorker() {
  if(!("serviceWorker" in navigator)) return;
  if(!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1" && location.hostname !== "::1") {
    return;
  }

  try {
    if(location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "::1") {
      return;
    }

    await navigator.serviceWorker.register("./sw.js?v=8", {
      updateViaCache: "none"
    });
  } catch (error) {
    console.warn("Service worker non registrato nella sezione secondaria:", error);
  }
}

// ── Disclaimer legale (footer) + selettore lingua ───────────
const SECONDARY_DISCLAIMER_IT = "Progetto fan-made no-profit a scopo di studio e passione personale. "
  + "Personaggi, immagini e marchi appartengono ai rispettivi proprietari. "
  + "Nessuna affiliazione o autorizzazione ufficiale.";

const SECONDARY_TRANSLATIONS = [
  { label: "Italiano",   text: SECONDARY_DISCLAIMER_IT },
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

// Selettore: scegli la lingua → l'avviso compare tradotto.
function attachSecondaryLangSelector(el) {
  if(!el || el.querySelector(".site-lang-select")) return;
  const select = document.createElement("select");
  select.className = "site-lang-select";
  select.id = "lang-select-secondary";
  select.setAttribute("aria-label", "Scegli la lingua dell'avviso");
  const def = document.createElement("option");
  def.value = ""; def.textContent = "🌐 Scegli lingua…";
  select.appendChild(def);
  SECONDARY_TRANSLATIONS.forEach((t, i) => {
    const o = document.createElement("option");
    o.value = String(i); o.textContent = t.label;
    select.appendChild(o);
  });
  // Paragrafo dell'avviso da SOSTITUIRE sul posto (no riga extra).
  const target = el.querySelector(".site-disclaimer-text") || el.querySelector("p");
  if(!target) { el.appendChild(select); return; }
  select.addEventListener("change", () => {
    if(select.value === "") return;
    const t = SECONDARY_TRANSLATIONS[Number(select.value)];
    target.textContent = t.text;
    if(t.rtl) target.setAttribute("dir", "rtl"); else target.removeAttribute("dir");
  });
  el.appendChild(select);
}

// Footer legale discreto. Saltato se la pagina ha già il dettaglio (Crediti).
function injectSecondaryDisclaimer() {
  if(document.querySelector(".site-legal-detail")) return;
  if(document.querySelector(".site-disclaimer")) return;
  const footer = document.createElement("footer");
  footer.className = "site-disclaimer";
  footer.setAttribute("role", "contentinfo");
  const p = document.createElement("p");
  p.className = "site-disclaimer-text";
  p.textContent = "Progetto fan-made no-profit a scopo di studio e passione personale. "
    + "Personaggi, immagini e marchi appartengono ai rispettivi proprietari. "
    + "Nessuna affiliazione o autorizzazione ufficiale.";
  footer.appendChild(p);
  document.body.appendChild(footer);
}

// ── Traduzione COMPLETA del disclaimer dettagliato (Crediti) ──
const LEGAL_DETAIL = [
  { label:"Italiano",
    title:"Avviso legale & contenuti",
    intro:"Questo sito è un progetto amatoriale (fan-made) senza scopo di lucro, realizzato esclusivamente per studio, ricerca e passione personale. Non è in vendita, non contiene pubblicità e non genera alcun guadagno.",
    ai:"Alcune immagini sono generate tramite intelligenza artificiale e possono raffigurare personaggi, ambientazioni o persone reali i cui diritti appartengono ai rispettivi titolari.",
    items:[
      "Personaggi, nomi, loghi e marchi citati sono © / ™ dei rispettivi proprietari (case editrici, studi cinematografici, produttori, ecc.).",
      "I riferimenti a persone reali sono usati a fini di omaggio/parodia, senza finalità diffamatorie né commerciali.",
      "Il sito non è affiliato, sponsorizzato né autorizzato da alcun titolare di diritti.",
      "Non viene rivendicato alcun diritto d'autore sui personaggi o sulle opere originali di terzi."
    ],
    contact:"Se sei titolare di diritti e ritieni che un contenuto debba essere modificato o rimosso, è sufficiente segnalarlo e verrà rimosso tempestivamente." },

  { label:"English",
    title:"Legal notice & content",
    intro:"This website is a non-profit, amateur (fan-made) project, created solely for study, research and personal passion. It is not for sale, contains no advertising and generates no profit.",
    ai:"Some images are generated by artificial intelligence and may depict characters, settings or real people whose rights belong to their respective owners.",
    items:[
      "Characters, names, logos and trademarks mentioned are © / ™ of their respective owners (publishers, film studios, producers, etc.).",
      "References to real people are used for tribute/parody purposes, with no defamatory or commercial intent.",
      "This site is not affiliated with, sponsored by, or authorized by any rights holder.",
      "No copyright is claimed over the characters or the original works of third parties."
    ],
    contact:"If you are a rights holder and believe a piece of content should be modified or removed, just report it and it will be removed promptly." },

  { label:"Español",
    title:"Aviso legal y contenidos",
    intro:"Este sitio es un proyecto amateur (fan-made) sin ánimo de lucro, creado exclusivamente con fines de estudio, investigación y pasión personal. No está a la venta, no contiene publicidad y no genera ningún beneficio.",
    ai:"Algunas imágenes están generadas mediante inteligencia artificial y pueden representar personajes, escenarios o personas reales cuyos derechos pertenecen a sus respectivos titulares.",
    items:[
      "Los personajes, nombres, logotipos y marcas mencionados son © / ™ de sus respectivos propietarios (editoriales, estudios de cine, productoras, etc.).",
      "Las referencias a personas reales se usan con fines de homenaje/parodia, sin intención difamatoria ni comercial.",
      "El sitio no está afiliado, patrocinado ni autorizado por ningún titular de derechos.",
      "No se reivindica ningún derecho de autor sobre los personajes ni sobre las obras originales de terceros."
    ],
    contact:"Si eres titular de derechos y consideras que un contenido debe modificarse o eliminarse, basta con notificarlo y se eliminará de inmediato." },

  { label:"Français",
    title:"Mentions légales et contenus",
    intro:"Ce site est un projet amateur (fan-made) à but non lucratif, réalisé uniquement à des fins d'étude, de recherche et de passion personnelle. Il n'est pas à vendre, ne contient aucune publicité et ne génère aucun profit.",
    ai:"Certaines images sont générées par intelligence artificielle et peuvent représenter des personnages, des décors ou des personnes réelles dont les droits appartiennent à leurs titulaires respectifs.",
    items:[
      "Les personnages, noms, logos et marques cités sont © / ™ de leurs propriétaires respectifs (éditeurs, studios de cinéma, producteurs, etc.).",
      "Les références à des personnes réelles sont utilisées à des fins d'hommage/parodie, sans intention diffamatoire ni commerciale.",
      "Le site n'est ni affilié, ni sponsorisé, ni autorisé par aucun titulaire de droits.",
      "Aucun droit d'auteur n'est revendiqué sur les personnages ou les œuvres originales de tiers."
    ],
    contact:"Si vous êtes titulaire de droits et estimez qu'un contenu doit être modifié ou supprimé, il suffit de le signaler et il sera retiré rapidement." },

  { label:"Deutsch",
    title:"Rechtlicher Hinweis & Inhalte",
    intro:"Diese Website ist ein gemeinnütziges Amateur-Projekt (Fan-made), das ausschließlich zu Studien-, Forschungs- und persönlichen Leidenschaftszwecken erstellt wurde. Sie ist nicht zu verkaufen, enthält keine Werbung und erzielt keinen Gewinn.",
    ai:"Einige Bilder werden durch künstliche Intelligenz erzeugt und können Figuren, Schauplätze oder reale Personen darstellen, deren Rechte den jeweiligen Inhabern gehören.",
    items:[
      "Genannte Figuren, Namen, Logos und Marken sind © / ™ ihrer jeweiligen Eigentümer (Verlage, Filmstudios, Produzenten usw.).",
      "Bezüge auf reale Personen dienen der Hommage/Parodie, ohne verleumderische oder kommerzielle Absicht.",
      "Die Seite ist mit keinem Rechteinhaber verbunden und wird von keinem gesponsert oder autorisiert.",
      "Es werden keine Urheberrechte an den Figuren oder den Originalwerken Dritter beansprucht."
    ],
    contact:"Wenn Sie Rechteinhaber sind und der Meinung sind, dass ein Inhalt geändert oder entfernt werden soll, melden Sie es einfach – es wird umgehend entfernt." },

  { label:"Português",
    title:"Aviso legal e conteúdos",
    intro:"Este site é um projeto amador (fan-made) sem fins lucrativos, criado exclusivamente para fins de estudo, pesquisa e paixão pessoal. Não está à venda, não contém publicidade e não gera qualquer lucro.",
    ai:"Algumas imagens são geradas por inteligência artificial e podem retratar personagens, cenários ou pessoas reais cujos direitos pertencem aos respetivos titulares.",
    items:[
      "Personagens, nomes, logótipos e marcas mencionados são © / ™ dos respetivos proprietários (editoras, estúdios de cinema, produtores, etc.).",
      "As referências a pessoas reais são usadas para fins de homenagem/paródia, sem intenção difamatória nem comercial.",
      "O site não é afiliado, patrocinado nem autorizado por qualquer titular de direitos.",
      "Não é reivindicado qualquer direito de autor sobre os personagens ou as obras originais de terceiros."
    ],
    contact:"Se você é titular de direitos e considera que um conteúdo deve ser modificado ou removido, basta comunicá-lo e será removido prontamente." },

  { label:"Русский",
    title:"Правовая информация и контент",
    intro:"Этот сайт — некоммерческий любительский (фанатский) проект, созданный исключительно для изучения, исследования и личного увлечения. Он не продаётся, не содержит рекламы и не приносит дохода.",
    ai:"Некоторые изображения созданы с помощью искусственного интеллекта и могут изображать персонажей, локации или реальных людей, права на которых принадлежат их владельцам.",
    items:[
      "Упомянутые персонажи, имена, логотипы и товарные знаки являются © / ™ их владельцев (издательств, киностудий, продюсеров и т. д.).",
      "Упоминания реальных людей используются в целях оммажа/пародии, без клеветнических или коммерческих намерений.",
      "Сайт не связан, не спонсируется и не авторизован каким-либо правообладателем.",
      "Не заявляется никаких авторских прав на персонажей или оригинальные произведения третьих лиц."
    ],
    contact:"Если вы правообладатель и считаете, что контент следует изменить или удалить, просто сообщите об этом — он будет удалён незамедлительно." },

  { label:"中文",
    title:"法律声明与内容",
    intro:"本网站是一个非营利的业余（粉丝制作）项目，仅用于学习、研究和个人兴趣。不出售、不含广告，也不产生任何收益。",
    ai:"部分图像由人工智能生成，可能描绘角色、场景或真实人物，其权利归各自所有者所有。",
    items:[
      "所提及的角色、名称、徽标和商标均为其各自所有者（出版商、电影公司、制作方等）的 © / ™。",
      "对真实人物的提及仅用于致敬/戏仿，无诽谤或商业意图。",
      "本网站与任何权利持有者均无关联，未获其赞助或授权。",
      "不对任何第三方的角色或原创作品主张著作权。"
    ],
    contact:"如果您是权利持有者并认为某内容应被修改或删除，只需告知，我们将及时删除。" },

  { label:"日本語",
    title:"法的通知とコンテンツ",
    intro:"本サイトは非営利のアマチュア（ファン制作）プロジェクトであり、学習・研究・個人的な情熱のためだけに作成されています。販売しておらず、広告もなく、いかなる収益も生みません。",
    ai:"一部の画像は人工知能によって生成されており、権利が各権利者に帰属するキャラクター・舞台・実在の人物を描写する場合があります。",
    items:[
      "記載されているキャラクター・名称・ロゴ・商標は、各権利者（出版社・映画スタジオ・制作者など）の © / ™ です。",
      "実在の人物への言及は、名誉毀損や商業目的ではなく、オマージュ／パロディを目的としています。",
      "本サイトはいかなる権利者とも提携・後援・許可関係にありません。",
      "第三者のキャラクターや原作について、著作権を一切主張しません。"
    ],
    contact:"あなたが権利者で、コンテンツの修正・削除が必要だと思われる場合は、ご連絡いただければ速やかに削除します。" },

  { label:"العربية", rtl:true,
    title:"إشعار قانوني والمحتويات",
    intro:"هذا الموقع مشروع هاوٍ (من إنشاء المعجبين) غير ربحي، أُنشئ حصريًا لأغراض الدراسة والبحث والشغف الشخصي. وهو ليس للبيع، ولا يحتوي على إعلانات، ولا يحقق أي ربح.",
    ai:"بعض الصور مُولّدة بواسطة الذكاء الاصطناعي وقد تُصوّر شخصيات أو أماكن أو أشخاصًا حقيقيين تعود حقوقهم إلى أصحابها.",
    items:[
      "الشخصيات والأسماء والشعارات والعلامات التجارية المذكورة هي © / ™ لأصحابها (دور النشر، استوديوهات الأفلام، المنتجون، إلخ).",
      "تُستخدَم الإشارات إلى أشخاص حقيقيين لأغراض التكريم/المحاكاة الساخرة، دون نية تشهيرية أو تجارية.",
      "الموقع غير تابع لأي صاحب حقوق ولا مدعوم أو مرخّص منه.",
      "لا يُطالَب بأي حقوق نشر على الشخصيات أو الأعمال الأصلية للغير."
    ],
    contact:"إذا كنت صاحب حقوق وترى أن محتوى ما يجب تعديله أو إزالته، فما عليك سوى الإبلاغ عنه وسيُزال على الفور." },

  { label:"हिन्दी",
    title:"कानूनी सूचना और सामग्री",
    intro:"यह वेबसाइट एक गैर-लाभकारी शौकिया (फैन-निर्मित) परियोजना है, जो केवल अध्ययन, शोध और व्यक्तिगत रुचि के लिए बनाई गई है। यह बिक्री के लिए नहीं है, इसमें कोई विज्ञापन नहीं है और इससे कोई आय नहीं होती।",
    ai:"कुछ चित्र कृत्रिम बुद्धिमत्ता द्वारा बनाए गए हैं और इनमें ऐसे पात्र, स्थान या वास्तविक व्यक्ति दर्शाए जा सकते हैं जिनके अधिकार संबंधित स्वामियों के पास हैं।",
    items:[
      "उल्लिखित पात्र, नाम, लोगो और ट्रेडमार्क उनके संबंधित स्वामियों (प्रकाशक, फ़िल्म स्टूडियो, निर्माता आदि) के © / ™ हैं।",
      "वास्तविक व्यक्तियों के संदर्भ श्रद्धांजलि/पैरोडी हेतु हैं, बिना किसी मानहानिकारक या व्यावसायिक उद्देश्य के।",
      "यह साइट किसी भी अधिकार-धारक से संबद्ध, प्रायोजित या अधिकृत नहीं है।",
      "तीसरे पक्ष के पात्रों या मूल कृतियों पर कोई कॉपीराइट का दावा नहीं किया जाता।"
    ],
    contact:"यदि आप अधिकार-धारक हैं और मानते हैं कि कोई सामग्री संशोधित या हटाई जानी चाहिए, तो बस सूचित करें और उसे तुरंत हटा दिया जाएगा।" },
];

// Ricostruisce TUTTO il blocco dettagliato nella lingua scelta.
function renderLegalDetail(body, d) {
  body.textContent = "";
  if(d.rtl) body.setAttribute("dir", "rtl"); else body.removeAttribute("dir");
  const h = document.createElement("h2"); h.id = "legal-title"; h.textContent = d.title; body.appendChild(h);
  const p1 = document.createElement("p"); p1.textContent = d.intro; body.appendChild(p1);
  const p2 = document.createElement("p"); p2.textContent = d.ai; body.appendChild(p2);
  const ul = document.createElement("ul");
  d.items.forEach(it => { const li = document.createElement("li"); li.textContent = it; ul.appendChild(li); });
  body.appendChild(ul);
  const p3 = document.createElement("p"); p3.textContent = d.contact; body.appendChild(p3);
}

// Selettore per il blocco dettagliato dei Crediti (traduce tutto).
function attachLegalSelector(section) {
  if(!section || section.querySelector(".site-lang-select")) return;
  const body = section.querySelector(".legal-body");
  if(!body) return;
  const select = document.createElement("select");
  select.className = "site-lang-select";
  select.id = "lang-select-legal";
  select.setAttribute("aria-label", "Scegli la lingua dell'avviso");
  const def = document.createElement("option");
  def.value = ""; def.textContent = "🌐 Scegli lingua…";
  select.appendChild(def);
  LEGAL_DETAIL.forEach((d, i) => {
    const o = document.createElement("option");
    o.value = String(i); o.textContent = d.label;
    select.appendChild(o);
  });
  select.addEventListener("change", () => {
    if(select.value === "") return;
    renderLegalDetail(body, LEGAL_DETAIL[Number(select.value)]);
  });
  section.appendChild(select);
}

// Crediti → traduce tutto il blocco; altre pagine → footer conciso.
function enhanceDisclaimers() {
  const detail = document.querySelector(".site-legal-detail");
  if(detail) { attachLegalSelector(detail); return; }
  const foot = document.querySelector(".site-disclaimer");
  if(foot) attachSecondaryLangSelector(foot);
}

function bootSecondaryPage() {
  setupSecondaryDrawerIcons();
  setupSecondaryMediaPerformance();
  setupSecondaryHamburgerMenu();
  registerSecondaryServiceWorker();
  injectSecondaryDisclaimer();
  enhanceDisclaimers();
}

bootSecondaryPage();

})();
