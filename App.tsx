import { useState, useRef, useEffect } from "react";
import JSZip from "jszip";

type BlockType = "heading" | "text" | "linkbtn" | "embed" | "hero" | "features" | "cta" | "footer";

interface Block {
  id: string;
  type: BlockType;
  content: string;
  url?: string;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
  italic?: boolean;
  // Section-specific fields
  variant?: string; // hero variant: "centered" | "split" | "gradient" | "image"
  subtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
  imageUrl?: string;
  bgColor?: string;
  items?: { title: string; desc: string; icon?: string }[];
}

interface Page {
  id: string;
  name: string;
  blocks: Block[];
  background: string;
}

interface SiteData {
  // legacy fields (single page) — kept for backward compat
  blocks?: Block[];
  background?: string;
  // new multi-page fields
  pages?: Page[];
  activePageId?: string;
}

// Migrate any old single-page site to multi-page format
function normalizeSite(data: SiteData): { pages: Page[]; activePageId: string } {
  if (data.pages && data.pages.length > 0) {
    return {
      pages: data.pages,
      activePageId: data.activePageId && data.pages.find(p => p.id === data.activePageId)
        ? data.activePageId
        : data.pages[0].id,
    };
  }
  // Old format → wrap into a single "Home" page
  const homePage: Page = {
    id: uid(),
    name: "Home",
    blocks: data.blocks || [],
    background: data.background || "bg-light",
  };
  return { pages: [homePage], activePageId: homePage.id };
}

const BACKGROUNDS = [
  // --- Image backgrounds (21 total) ---
  { id: "bg-clock", type: "image", value: "https://images.unsplash.com/photo-1501139083538-0139583c060f?w=600" },
  { id: "bg-img-mountain", type: "image", value: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600" },
  { id: "bg-img-beach", type: "image", value: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600" },
  { id: "bg-img-forest", type: "image", value: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600" },
  { id: "bg-img-city", type: "image", value: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600" },
  { id: "bg-img-night", type: "image", value: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=600" },
  { id: "bg-img-desert", type: "image", value: "https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=600" },
  { id: "bg-img-snow", type: "image", value: "https://images.unsplash.com/photo-1551582045-6ec9c11d8697?w=600" },
  { id: "bg-img-flowers", type: "image", value: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=600" },
  { id: "bg-img-ocean", type: "image", value: "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=600" },
  { id: "bg-img-space", type: "image", value: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=600" },
  { id: "bg-img-galaxy", type: "image", value: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600" },
  { id: "bg-img-aurora", type: "image", value: "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=600" },
  { id: "bg-img-sunset", type: "image", value: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=600" },
  { id: "bg-img-tropic", type: "image", value: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600" },
  { id: "bg-img-marble", type: "image", value: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=600" },
  { id: "bg-img-wood", type: "image", value: "https://images.unsplash.com/photo-1503602642458-232111445657?w=600" },
  { id: "bg-img-paper", type: "image", value: "https://images.unsplash.com/photo-1517697471339-4aa32003c11a?w=600" },
  { id: "bg-img-abstract", type: "image", value: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=600" },
  { id: "bg-img-neon", type: "image", value: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600" },
  { id: "bg-img-tech", type: "image", value: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600" },
  // --- Solid colors ---
  { id: "bg-white", type: "color", value: "#ffffff" },
  { id: "bg-navy", type: "color", value: "#0d2c54" },
  { id: "bg-light", type: "color", value: "#f5f7fb" },
  { id: "bg-gray", type: "color", value: "#e5e7eb" },
  { id: "bg-cream", type: "color", value: "#fef3c7" },
  { id: "bg-mint", type: "color", value: "#d1fae5" },
  { id: "bg-pink", type: "color", value: "#fce7f3" },
  { id: "bg-black", type: "color", value: "#0a0a0a" },
  // --- Gradients ---
  { id: "bg-grad1", type: "gradient", value: "linear-gradient(135deg,#667eea,#764ba2)" },
  { id: "bg-grad2", type: "gradient", value: "linear-gradient(135deg,#f093fb,#f5576c)" },
  { id: "bg-grad3", type: "gradient", value: "linear-gradient(135deg,#4facfe,#00f2fe)" },
  { id: "bg-grad4", type: "gradient", value: "linear-gradient(135deg,#43e97b,#38f9d7)" },
  { id: "bg-grad5", type: "gradient", value: "linear-gradient(135deg,#fa709a,#fee140)" },
  { id: "bg-grad6", type: "gradient", value: "linear-gradient(135deg,#30cfd0,#330867)" },
  { id: "bg-grad7", type: "gradient", value: "linear-gradient(135deg,#a8edea,#fed6e3)" },
  { id: "bg-grad8", type: "gradient", value: "linear-gradient(135deg,#ff9a9e,#fad0c4)" },
];

// ------------ Languages / i18n ------------
const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "zh", name: "Mandarin Chinese", flag: "🇨🇳" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "bn", name: "Bengali", flag: "🇧🇩" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "ur", name: "Urdu", flag: "🇵🇰" },
];

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    designTools: "DESIGN TOOLS", aiBuilder: "AI BUILDER", backgrounds: "BACKGROUNDS",
    editBlock: "EDIT BLOCK", heading: "Heading", text: "Text", linkBtn: "Link Btn",
    embed: "Embed", aiBlock: "AI Block", tips: "Tips", preview: "PREVIEW",
    downloadCode: "DOWNLOAD CODE", downloadBackend: "DOWNLOAD BACKEND (ZIP)", getLiveUrl: "GET LIVE URL", language: "LANGUAGE",
    livePreview: "Live Preview", liveUrlReady: "Live URL Ready", copyUrl: "COPY URL",
    copied: "COPIED ✓", openLive: "Open Live Site ↗", close: "Close",
    canvasEmpty: "Your canvas is empty.", canvasHint: "Add elements from the sidebar to get started.",
    sections: "SECTIONS", hero: "Hero", features: "Features", cta: "CTA", footer: "Footer",
    heroCentered: "Centered Hero", heroSplit: "Split Hero", heroGradient: "Gradient Hero", heroImage: "Image Hero",
  },
  zh: {
    designTools: "设计工具", aiBuilder: "AI 构建器", backgrounds: "背景",
    editBlock: "编辑模块", heading: "标题", text: "文本", linkBtn: "链接按钮",
    embed: "嵌入", aiBlock: "AI 模块", tips: "提示", preview: "预览",
    downloadCode: "下载代码", downloadBackend: "下载后端 (ZIP)", getLiveUrl: "获取实时链接", language: "语言",
    sections: "部分", hero: "主区", features: "功能", cta: "号召", footer: "页脚",
    heroCentered: "居中主区", heroSplit: "分屏主区", heroGradient: "渐变主区", heroImage: "图片主区",
    livePreview: "实时预览", liveUrlReady: "实时链接就绪", copyUrl: "复制链接",
    copied: "已复制 ✓", openLive: "打开实时网站 ↗", close: "关闭",
    canvasEmpty: "您的画布是空的。", canvasHint: "从侧边栏添加元素以开始。",
  },
  hi: {
    designTools: "डिज़ाइन उपकरण", aiBuilder: "एआई बिल्डर", backgrounds: "पृष्ठभूमि",
    editBlock: "ब्लॉक संपादित करें", heading: "शीर्षक", text: "टेक्स्ट", linkBtn: "लिंक बटन",
    embed: "एम्बेड", aiBlock: "एआई ब्लॉक", tips: "सुझाव", preview: "पूर्वावलोकन",
    downloadCode: "कोड डाउनलोड करें", downloadBackend: "बैकएंड डाउनलोड (ZIP)", getLiveUrl: "लाइव यूआरएल प्राप्त करें", language: "भाषा",
    sections: "खंड", hero: "हीरो", features: "विशेषताएं", cta: "CTA", footer: "फुटर",
    heroCentered: "केंद्रित हीरो", heroSplit: "स्प्लिट हीरो", heroGradient: "ग्रेडिएंट हीरो", heroImage: "छवि हीरो",
    livePreview: "लाइव पूर्वावलोकन", liveUrlReady: "लाइव यूआरएल तैयार", copyUrl: "यूआरएल कॉपी करें",
    copied: "कॉपी हो गया ✓", openLive: "लाइव साइट खोलें ↗", close: "बंद करें",
    canvasEmpty: "आपका कैनवास खाली है।", canvasHint: "शुरू करने के लिए साइडबार से तत्व जोड़ें।",
  },
  es: {
    designTools: "HERRAMIENTAS DE DISEÑO", aiBuilder: "CONSTRUCTOR IA", backgrounds: "FONDOS",
    editBlock: "EDITAR BLOQUE", heading: "Título", text: "Texto", linkBtn: "Botón Enlace",
    embed: "Insertar", aiBlock: "Bloque IA", tips: "Consejos", preview: "VISTA PREVIA",
    downloadCode: "DESCARGAR CÓDIGO", downloadBackend: "DESCARGAR BACKEND (ZIP)", getLiveUrl: "OBTENER URL EN VIVO", language: "IDIOMA",
    sections: "SECCIONES", hero: "Hero", features: "Características", cta: "CTA", footer: "Pie",
    heroCentered: "Hero Centrado", heroSplit: "Hero Dividido", heroGradient: "Hero Degradado", heroImage: "Hero Imagen",
    livePreview: "Vista Previa en Vivo", liveUrlReady: "URL en Vivo Lista", copyUrl: "COPIAR URL",
    copied: "COPIADO ✓", openLive: "Abrir Sitio en Vivo ↗", close: "Cerrar",
    canvasEmpty: "Tu lienzo está vacío.", canvasHint: "Agrega elementos desde la barra lateral para comenzar.",
  },
  fr: {
    designTools: "OUTILS DE DESIGN", aiBuilder: "CONSTRUCTEUR IA", backgrounds: "ARRIÈRE-PLANS",
    editBlock: "MODIFIER LE BLOC", heading: "Titre", text: "Texte", linkBtn: "Bouton Lien",
    embed: "Intégrer", aiBlock: "Bloc IA", tips: "Conseils", preview: "APERÇU",
    downloadCode: "TÉLÉCHARGER LE CODE", downloadBackend: "TÉLÉCHARGER BACKEND (ZIP)", getLiveUrl: "OBTENIR L'URL EN DIRECT", language: "LANGUE",
    sections: "SECTIONS", hero: "Héros", features: "Fonctions", cta: "CTA", footer: "Pied",
    heroCentered: "Héros Centré", heroSplit: "Héros Divisé", heroGradient: "Héros Dégradé", heroImage: "Héros Image",
    livePreview: "Aperçu en Direct", liveUrlReady: "URL en Direct Prête", copyUrl: "COPIER L'URL",
    copied: "COPIÉ ✓", openLive: "Ouvrir le Site ↗", close: "Fermer",
    canvasEmpty: "Votre toile est vide.", canvasHint: "Ajoutez des éléments depuis la barre latérale pour commencer.",
  },
  ar: {
    designTools: "أدوات التصميم", aiBuilder: "منشئ الذكاء الاصطناعي", backgrounds: "الخلفيات",
    editBlock: "تحرير الكتلة", heading: "عنوان", text: "نص", linkBtn: "زر رابط",
    embed: "تضمين", aiBlock: "كتلة AI", tips: "نصائح", preview: "معاينة",
    downloadCode: "تحميل الكود", downloadBackend: "تحميل الخلفية (ZIP)", getLiveUrl: "الحصول على رابط مباشر", language: "اللغة",
    sections: "الأقسام", hero: "البطل", features: "الميزات", cta: "دعوة", footer: "تذييل",
    heroCentered: "بطل مركزي", heroSplit: "بطل مقسم", heroGradient: "بطل متدرج", heroImage: "بطل صورة",
    livePreview: "معاينة مباشرة", liveUrlReady: "الرابط المباشر جاهز", copyUrl: "نسخ الرابط",
    copied: "تم النسخ ✓", openLive: "فتح الموقع المباشر ↗", close: "إغلاق",
    canvasEmpty: "لوحتك فارغة.", canvasHint: "أضف عناصر من الشريط الجانبي للبدء.",
  },
  bn: {
    designTools: "ডিজাইন সরঞ্জাম", aiBuilder: "এআই বিল্ডার", backgrounds: "পটভূমি",
    editBlock: "ব্লক সম্পাদনা", heading: "শিরোনাম", text: "টেক্সট", linkBtn: "লিঙ্ক বাটন",
    embed: "এম্বেড", aiBlock: "এআই ব্লক", tips: "টিপস", preview: "প্রিভিউ",
    downloadCode: "কোড ডাউনলোড", downloadBackend: "ব্যাকএন্ড ডাউনলোড (ZIP)", getLiveUrl: "লাইভ ইউআরএল পান", language: "ভাষা",
    sections: "বিভাগ", hero: "হিরো", features: "বৈশিষ্ট্য", cta: "CTA", footer: "ফুটার",
    heroCentered: "কেন্দ্রীয় হিরো", heroSplit: "বিভক্ত হিরো", heroGradient: "গ্রেডিয়েন্ট হিরো", heroImage: "ছবি হিরো",
    livePreview: "লাইভ প্রিভিউ", liveUrlReady: "লাইভ ইউআরএল প্রস্তুত", copyUrl: "ইউআরএল কপি",
    copied: "কপি হয়েছে ✓", openLive: "লাইভ সাইট খুলুন ↗", close: "বন্ধ",
    canvasEmpty: "আপনার ক্যানভাস খালি।", canvasHint: "শুরু করতে সাইডবার থেকে উপাদান যোগ করুন।",
  },
  pt: {
    designTools: "FERRAMENTAS DE DESIGN", aiBuilder: "CONSTRUTOR IA", backgrounds: "FUNDOS",
    editBlock: "EDITAR BLOCO", heading: "Título", text: "Texto", linkBtn: "Botão Link",
    embed: "Incorporar", aiBlock: "Bloco IA", tips: "Dicas", preview: "PRÉ-VISUALIZAR",
    downloadCode: "BAIXAR CÓDIGO", downloadBackend: "BAIXAR BACKEND (ZIP)", getLiveUrl: "OBTER URL AO VIVO", language: "IDIOMA",
    sections: "SEÇÕES", hero: "Herói", features: "Recursos", cta: "CTA", footer: "Rodapé",
    heroCentered: "Herói Central", heroSplit: "Herói Dividido", heroGradient: "Herói Gradiente", heroImage: "Herói Imagem",
    livePreview: "Pré-visualização ao Vivo", liveUrlReady: "URL ao Vivo Pronto", copyUrl: "COPIAR URL",
    copied: "COPIADO ✓", openLive: "Abrir Site ao Vivo ↗", close: "Fechar",
    canvasEmpty: "Sua tela está vazia.", canvasHint: "Adicione elementos da barra lateral para começar.",
  },
  ru: {
    designTools: "ИНСТРУМЕНТЫ ДИЗАЙНА", aiBuilder: "ИИ КОНСТРУКТОР", backgrounds: "ФОНЫ",
    editBlock: "РЕДАКТИРОВАТЬ БЛОК", heading: "Заголовок", text: "Текст", linkBtn: "Кнопка-Ссылка",
    embed: "Встроить", aiBlock: "ИИ Блок", tips: "Советы", preview: "ПРЕДПРОСМОТР",
    downloadCode: "СКАЧАТЬ КОД", downloadBackend: "СКАЧАТЬ БЭКЕНД (ZIP)", getLiveUrl: "ПОЛУЧИТЬ ССЫЛКУ", language: "ЯЗЫК",
    sections: "РАЗДЕЛЫ", hero: "Герой", features: "Функции", cta: "CTA", footer: "Подвал",
    heroCentered: "Центрированный", heroSplit: "Разделенный", heroGradient: "Градиент", heroImage: "Изображение",
    livePreview: "Живой Предпросмотр", liveUrlReady: "Ссылка Готова", copyUrl: "КОПИРОВАТЬ",
    copied: "СКОПИРОВАНО ✓", openLive: "Открыть Сайт ↗", close: "Закрыть",
    canvasEmpty: "Ваш холст пуст.", canvasHint: "Добавьте элементы из боковой панели, чтобы начать.",
  },
  ur: {
    designTools: "ڈیزائن کے اوزار", aiBuilder: "اے آئی بلڈر", backgrounds: "پس منظر",
    editBlock: "بلاک میں ترمیم کریں", heading: "عنوان", text: "متن", linkBtn: "لنک بٹن",
    embed: "ایمبیڈ", aiBlock: "اے آئی بلاک", tips: "تجاویز", preview: "پیش نظارہ",
    downloadCode: "کوڈ ڈاؤن لوڈ کریں", downloadBackend: "بیک اینڈ ڈاؤن لوڈ (ZIP)", getLiveUrl: "لائیو یو آر ایل حاصل کریں", language: "زبان",
    sections: "حصے", hero: "ہیرو", features: "خصوصیات", cta: "CTA", footer: "فوٹر",
    heroCentered: "مرکزی ہیرو", heroSplit: "تقسیم ہیرو", heroGradient: "گریڈینٹ ہیرو", heroImage: "تصویری ہیرو",
    livePreview: "لائیو پیش نظارہ", liveUrlReady: "لائیو یو آر ایل تیار", copyUrl: "یو آر ایل کاپی کریں",
    copied: "کاپی ہو گیا ✓", openLive: "لائیو سائٹ کھولیں ↗", close: "بند کریں",
    canvasEmpty: "آپ کا کینوس خالی ہے۔", canvasHint: "شروع کرنے کے لیے سائڈبار سے عناصر شامل کریں۔",
  },
};

const uid = () => Math.random().toString(36).slice(2, 9);

function makeDefaultBlock(type: BlockType, variant?: string): Block {
  const id = uid();
  if (type === "heading") {
    return { id, type, content: "New Heading", align: "left", color: "#111827" };
  }
  if (type === "text") {
    return { id, type, content: "Add your text here...", align: "left", color: "#374151" };
  }
  if (type === "linkbtn") {
    return { id, type, content: "Click Here", url: "https://example.com", align: "left", color: "#2563eb" };
  }
  if (type === "embed") {
    return {
      id,
      type,
      content: '<iframe width="100%" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>',
      align: "left",
    };
  }
  if (type === "hero") {
    const v = variant || "centered";
    return {
      id,
      type,
      variant: v,
      content: "Build Beautiful Websites",
      subtitle: "Create stunning, modern websites in minutes with our powerful drag-and-drop builder. No coding required.",
      buttonText: "Get Started",
      buttonUrl: "#",
      color: v === "gradient" || v === "image" ? "#ffffff" : "#0f172a",
      bgColor: v === "gradient" ? "linear-gradient(135deg,#667eea,#764ba2)" : v === "image" ? "" : "#f8fafc",
      imageUrl: v === "image" ? "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1600" : v === "split" ? "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800" : "",
      align: "center",
    };
  }
  if (type === "features") {
    return {
      id,
      type,
      content: "Why Choose Us",
      subtitle: "Everything you need to build amazing websites",
      color: "#0f172a",
      bgColor: "#ffffff",
      align: "center",
      items: [
        { title: "Fast & Easy", desc: "Build your website in minutes with our intuitive editor.", icon: "⚡" },
        { title: "Beautiful Design", desc: "Choose from professionally designed templates.", icon: "🎨" },
        { title: "No Code Needed", desc: "Drag and drop your way to a perfect website.", icon: "🚀" },
      ],
    };
  }
  if (type === "cta") {
    return {
      id,
      type,
      content: "Ready to Get Started?",
      subtitle: "Join thousands of happy customers building with us today.",
      buttonText: "Start Now",
      buttonUrl: "#",
      color: "#ffffff",
      bgColor: "linear-gradient(135deg,#2563eb,#7c3aed)",
      align: "center",
    };
  }
  if (type === "footer") {
    return {
      id,
      type,
      content: "© 2026 My Company. All rights reserved.",
      subtitle: "Made with ❤️ using Web Builder",
      color: "#94a3b8",
      bgColor: "#0f172a",
      align: "center",
    };
  }
  return { id, type: "text" as BlockType, content: "" };
}

function encodeSite(data: SiteData): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  } catch {
    return "";
  }
}

function decodeSite(s: string): SiteData | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(s))));
  } catch {
    return null;
  }
}

// ------------ Live View Page (loaded via #site=...) ------------
function LiveView({ data }: { data: SiteData }) {
  const norm = normalizeSite(data);
  const [currentPageId, setCurrentPageId] = useState<string>(norm.activePageId);
  const currentPage = norm.pages.find((p) => p.id === currentPageId) || norm.pages[0];
  const bg = BACKGROUNDS.find((b) => b.id === currentPage.background) || BACKGROUNDS[21];
  const bgStyle: React.CSSProperties =
    bg.type === "image"
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: "cover", backgroundPosition: "center" }
      : bg.type === "gradient"
      ? { backgroundImage: bg.value }
      : { backgroundColor: bg.value };

  return (
    <div className="min-h-screen w-full" style={bgStyle}>
      {/* Navigation bar (only if multiple pages) */}
      {norm.pages.length > 1 && (
        <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur shadow-sm border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2 overflow-x-auto">
            {norm.pages.map((p) => (
              <button
                key={p.id}
                onClick={() => setCurrentPageId(p.id)}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
                  p.id === currentPageId
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </nav>
      )}
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-6">
        {currentPage.blocks.map((b) => (
          <RenderBlock key={b.id} block={b} />
        ))}
      </div>
    </div>
  );
}

function RenderBlock({ block }: { block: Block }) {
  const style: React.CSSProperties = {
    fontSize: block.fontSize ? `${block.fontSize}px` : undefined,
    color: block.color,
    textAlign: block.align,
    fontWeight: block.bold ? 700 : undefined,
    fontStyle: block.italic ? "italic" : undefined,
  };
  if (block.type === "heading") {
    return (
      <h1 className="font-extrabold leading-tight" style={{ fontSize: 64, ...style }}>
        {block.content || "Heading"}
      </h1>
    );
  }
  if (block.type === "text") {
    return (
      <p className="leading-relaxed" style={{ fontSize: 18, ...style }}>
        {block.content || "Text content..."}
      </p>
    );
  }
  if (block.type === "linkbtn") {
    return (
      <div style={{ textAlign: block.align || "left" }}>
        <a
          href={block.url || "#"}
          target="_blank"
          rel="noreferrer"
          className="inline-block px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
          style={{ backgroundColor: block.color || undefined }}
        >
          {block.content || "Click Here"}
        </a>
      </div>
    );
  }
  if (block.type === "embed") {
    return (
      <div
        className="rounded-lg overflow-hidden border border-gray-200"
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    );
  }
  if (block.type === "hero" || block.type === "features" || block.type === "cta" || block.type === "footer") {
    return <SectionRender block={block} />;
  }
  return null;
}

function SectionRender({ block }: { block: Block }) {
  const bgStyle: React.CSSProperties = {};
  if (block.bgColor) {
    if (block.bgColor.startsWith("linear-gradient")) bgStyle.backgroundImage = block.bgColor;
    else bgStyle.backgroundColor = block.bgColor;
  }
  if (block.type === "hero" && block.variant === "image" && block.imageUrl) {
    bgStyle.backgroundImage = `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)),url(${block.imageUrl})`;
    bgStyle.backgroundSize = "cover";
    bgStyle.backgroundPosition = "center";
  }

  if (block.type === "hero") {
    if (block.variant === "split") {
      return (
        <div className="rounded-xl overflow-hidden -mx-8" style={bgStyle}>
          <div className="grid md:grid-cols-2 gap-8 px-8 py-16 items-center">
            <div style={{ color: block.color }}>
              <h1 className="text-5xl font-extrabold leading-tight mb-4">{block.content}</h1>
              <p className="text-lg opacity-80 mb-6">{block.subtitle}</p>
              {block.buttonText && (
                <a href={block.buttonUrl || "#"} className="inline-block px-7 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
                  {block.buttonText}
                </a>
              )}
            </div>
            {block.imageUrl && (
              <img src={block.imageUrl} alt="" className="rounded-xl shadow-lg w-full h-auto" />
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-xl overflow-hidden -mx-8 px-8 py-20 text-center" style={bgStyle}>
        <h1 className="text-6xl font-extrabold leading-tight mb-4" style={{ color: block.color }}>
          {block.content}
        </h1>
        <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: block.color, opacity: 0.85 }}>
          {block.subtitle}
        </p>
        {block.buttonText && (
          <a href={block.buttonUrl || "#"} className="inline-block px-8 py-4 rounded-lg bg-white text-gray-900 font-bold hover:bg-gray-100 shadow-lg">
            {block.buttonText}
          </a>
        )}
      </div>
    );
  }

  if (block.type === "features") {
    return (
      <div className="rounded-xl -mx-8 px-8 py-16" style={bgStyle}>
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold mb-3" style={{ color: block.color }}>{block.content}</h2>
          <p className="text-lg opacity-70" style={{ color: block.color }}>{block.subtitle}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {(block.items || []).map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">{item.title}</h3>
              <p className="text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "cta") {
    return (
      <div className="rounded-xl -mx-8 px-8 py-16 text-center" style={bgStyle}>
        <h2 className="text-4xl font-extrabold mb-3" style={{ color: block.color }}>{block.content}</h2>
        <p className="text-lg mb-6 opacity-90" style={{ color: block.color }}>{block.subtitle}</p>
        {block.buttonText && (
          <a href={block.buttonUrl || "#"} className="inline-block px-8 py-4 rounded-lg bg-white text-blue-600 font-bold hover:bg-gray-100">
            {block.buttonText}
          </a>
        )}
      </div>
    );
  }

  if (block.type === "footer") {
    return (
      <div className="rounded-xl -mx-8 px-8 py-10 text-center" style={bgStyle}>
        <p className="font-semibold" style={{ color: block.color }}>{block.content}</p>
        <p className="text-sm mt-2 opacity-80" style={{ color: block.color }}>{block.subtitle}</p>
      </div>
    );
  }

  return null;
}

// ------------ Builder ------------
// ------------ Saved Sites Storage ------------
interface SavedSite {
  id: string;
  name: string;
  data: SiteData;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
}

// ------------ Auth & Users ------------
interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // simple hashed password (NOT cryptographically secure — demo only)
  fullName?: string;
  avatar?: string; // emoji avatar
  createdAt: number;
}

const USERS_KEY = "wb-users";
const SESSION_KEY = "wb-session"; // currently logged-in user id

// Simple "hash" — XOR-based, just to avoid storing plain text
// (NOTE: this is NOT secure. For demo / offline-first only.)
function hashPassword(password: string): string {
  let h = 0;
  const salt = "wb-salt-2026";
  const s = salt + password + salt;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  // mix with another pass for length
  return btoa(`${h.toString(36)}:${password.length}:${s.length}`);
}

function loadUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function getSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}
function setSession(userId: string | null) {
  if (userId) localStorage.setItem(SESSION_KEY, userId);
  else localStorage.removeItem(SESSION_KEY);
}
function getCurrentUser(): User | null {
  const id = getSession();
  if (!id) return null;
  return loadUsers().find((u) => u.id === id) || null;
}

// Per-user storage keys (so each user has their own sites)
function userKey(base: string, userId: string | null): string {
  return userId ? `${base}::${userId}` : base;
}

const SITES_BASE = "wb-sites";
const TRASH_BASE = "wb-trash";
const CURRENT_BASE = "wb-current";
const DRAFT_BASE = "wb-draft";

// Dynamic getters that respect the active session
function SITES_KEY_FN() { return userKey(SITES_BASE, getSession()); }
function TRASH_KEY_FN() { return userKey(TRASH_BASE, getSession()); }
function CURRENT_KEY_FN() { return userKey(CURRENT_BASE, getSession()); }
function DRAFT_KEY_FN() { return userKey(DRAFT_BASE, getSession()); }

// Backward-compat constants — read from the per-user key
const SITES_KEY = SITES_BASE;
const TRASH_KEY = TRASH_BASE;
const CURRENT_KEY = CURRENT_BASE;
const DRAFT_KEY = DRAFT_BASE;
void SITES_KEY; void TRASH_KEY; void CURRENT_KEY; void DRAFT_KEY;
const TRASH_RETENTION_DAYS = 30;

interface TrashedSite extends SavedSite {
  deletedAt: number;
}

function loadSites(): SavedSite[] {
  try {
    const raw = localStorage.getItem(SITES_KEY_FN());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveSites(sites: SavedSite[]) {
  localStorage.setItem(SITES_KEY_FN(), JSON.stringify(sites));
}
function loadTrash(): TrashedSite[] {
  try {
    const raw = localStorage.getItem(TRASH_KEY_FN());
    const arr: TrashedSite[] = raw ? JSON.parse(raw) : [];
    // Auto-purge items older than TRASH_RETENTION_DAYS
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const fresh = arr.filter((s) => s.deletedAt > cutoff);
    if (fresh.length !== arr.length) localStorage.setItem(TRASH_KEY_FN(), JSON.stringify(fresh));
    return fresh;
  } catch {
    return [];
  }
}
function saveTrash(trash: TrashedSite[]) {
  localStorage.setItem(TRASH_KEY_FN(), JSON.stringify(trash));
}
function moveSiteToTrash(id: string): boolean {
  const sites = loadSites();
  const idx = sites.findIndex((s) => s.id === id);
  if (idx < 0) return false;
  const [site] = sites.splice(idx, 1);
  saveSites(sites);
  const trash = loadTrash();
  trash.unshift({ ...site, deletedAt: Date.now() });
  saveTrash(trash);
  return true;
}
function restoreSiteFromTrash(id: string): boolean {
  const trash = loadTrash();
  const idx = trash.findIndex((s) => s.id === id);
  if (idx < 0) return false;
  const [site] = trash.splice(idx, 1);
  saveTrash(trash);
  const sites = loadSites();
  const { deletedAt: _ignored, ...restored } = site;
  void _ignored;
  sites.unshift({ ...restored, updatedAt: Date.now() });
  saveSites(sites);
  return true;
}
function permanentlyDelete(id: string): boolean {
  const trash = loadTrash();
  const next = trash.filter((s) => s.id !== id);
  if (next.length === trash.length) return false;
  saveTrash(next);
  return true;
}
function emptyTrash() {
  saveTrash([]);
}
function daysUntilPurge(deletedAt: number): number {
  const ms = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000 - (Date.now() - deletedAt);
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function App() {
  // ---- Auth state ----
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [authView, setAuthView] = useState<"login" | "signup">("login");

  // If URL has #site=..., act as live view (published page)
  const [liveData, setLiveData] = useState<SiteData | null>(null);
  // App view: 'landing' or 'builder'
  const [view, setView] = useState<"landing" | "builder">(() => {
    // If there's a draft (in-progress design), reopen the builder
    return localStorage.getItem(DRAFT_KEY_FN()) || localStorage.getItem(CURRENT_KEY_FN()) ? "builder" : "landing";
  });
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(() => localStorage.getItem(CURRENT_KEY_FN()));

  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#site=")) {
        const data = decodeSite(hash.slice(6));
        if (data) setLiveData(data);
      } else {
        setLiveData(null);
      }
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  // Live view (public published page) doesn't need auth
  if (liveData) return <LiveView data={liveData} />;

  // ---- Not logged in: show login/signup ----
  if (!user) {
    return (
      <AuthPage
        mode={authView}
        onSwitchMode={(m) => setAuthView(m)}
        onAuthSuccess={(u) => {
          setSession(u.id);
          setUser(u);
          // Re-read keys for newly logged-in user
          setCurrentSiteId(localStorage.getItem(CURRENT_KEY_FN()));
          setView(
            localStorage.getItem(DRAFT_KEY_FN()) || localStorage.getItem(CURRENT_KEY_FN())
              ? "builder"
              : "landing"
          );
        }}
      />
    );
  }

  const handleLogout = () => {
    setSession(null);
    setUser(null);
    setCurrentSiteId(null);
    setView("landing");
  };

  if (view === "landing") {
    return (
      <LandingPage
        user={user}
        onLogout={handleLogout}
        onStartNew={() => {
          // Clear current site & draft → fresh website
          localStorage.removeItem(CURRENT_KEY_FN());
          localStorage.removeItem(DRAFT_KEY_FN());
          setCurrentSiteId(null);
          setView("builder");
        }}
        onOpenSite={(id) => {
          localStorage.setItem(CURRENT_KEY_FN(), id);
          localStorage.removeItem(DRAFT_KEY_FN());
          setCurrentSiteId(id);
          setView("builder");
        }}
      />
    );
  }

  return (
    <Builder
      key={currentSiteId || "new"}
      user={user}
      onLogout={handleLogout}
      currentSiteId={currentSiteId}
      onSetCurrentSiteId={(id) => {
        setCurrentSiteId(id);
        if (id) localStorage.setItem(CURRENT_KEY_FN(), id);
        else localStorage.removeItem(CURRENT_KEY_FN());
      }}
      onGoHome={() => {
        localStorage.removeItem(DRAFT_KEY_FN());
        setView("landing");
      }}
    />
  );
}

// ------------ Auth Page (Login + Signup) ------------
function AuthPage({
  mode,
  onSwitchMode,
  onAuthSuccess,
}: {
  mode: "login" | "signup";
  onSwitchMode: (m: "login" | "signup") => void;
  onAuthSuccess: (user: User) => void;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setErr(null);
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirm("");
    setFullName("");
  };

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    // Simulate small delay
    await new Promise((r) => setTimeout(r, 350));

    try {
      if (mode === "signup") {
        // Validation
        if (!username.trim() || username.trim().length < 3) {
          throw new Error("Username must be at least 3 characters.");
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
          throw new Error("Username can only contain letters, numbers, and underscores.");
        }
        if (!validateEmail(email)) {
          throw new Error("Please enter a valid email address.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        if (password !== confirm) {
          throw new Error("Passwords do not match.");
        }
        const users = loadUsers();
        if (users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
          throw new Error("That username is already taken.");
        }
        if (users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
          throw new Error("An account with that email already exists.");
        }
        const avatars = ["🦊", "🐼", "🦁", "🐯", "🐻", "🐰", "🐸", "🐵", "🦄", "🐲", "🦅", "🐺"];
        const newUser: User = {
          id: uid(),
          username: username.trim(),
          email: email.trim().toLowerCase(),
          passwordHash: hashPassword(password),
          fullName: fullName.trim() || undefined,
          avatar: avatars[Math.floor(Math.random() * avatars.length)],
          createdAt: Date.now(),
        };
        users.push(newUser);
        saveUsers(users);
        onAuthSuccess(newUser);
      } else {
        // login
        if (!username.trim() || !password) {
          throw new Error("Please enter your username/email and password.");
        }
        const users = loadUsers();
        const u = users.find(
          (u) =>
            u.username.toLowerCase() === username.trim().toLowerCase() ||
            u.email.toLowerCase() === username.trim().toLowerCase()
        );
        if (!u) throw new Error("No account found with that username or email.");
        if (u.passwordHash !== hashPassword(password)) throw new Error("Incorrect password.");
        onAuthSuccess(u);
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-300/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="text-center text-white mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-sm font-bold">
            <span className="text-xl">&lt;/&gt;</span>
            WEB BUILDER
          </div>
          <h1 className="text-3xl font-extrabold drop-shadow">
            {isLogin ? "Welcome Back!" : "Create Your Account"}
          </h1>
          <p className="text-white/80 mt-1 text-sm">
            {isLogin
              ? "Sign in to access your saved websites"
              : "Sign up to start building beautiful websites"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <form onSubmit={submit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Full Name (optional)</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Muhammad Taqi"
                    className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Username *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="taqi_king"
                    autoComplete="username"
                    required
                    className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition"
                  />
                </div>
              </>
            )}
            {isLogin && (
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Username or Email *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="taqi_king or you@example.com"
                  autoComplete="username"
                  required
                  className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Password *</label>
              <div className="relative mt-1">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 text-sm font-bold"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            {!isLogin && (
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Confirm Password *</label>
                <input
                  type={showPwd ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition"
                />
              </div>
            )}

            {err && (
              <div className="px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-semibold flex items-start gap-2">
                <span>⚠️</span>
                <span>{err}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white rounded-xl font-extrabold text-lg shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M21 12a9 9 0 1 1-6.2-8.5" />
                  </svg>
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                <>{isLogin ? "🔓 SIGN IN" : "✨ CREATE ACCOUNT"}</>
              )}
            </button>
          </form>

          {/* Switch mode */}
          <div className="mt-6 text-center text-sm text-gray-600">
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => { onSwitchMode("signup"); reset(); }}
                  className="text-blue-600 hover:text-blue-800 font-bold"
                >
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { onSwitchMode("login"); reset(); }}
                  className="text-blue-600 hover:text-blue-800 font-bold"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-white/70 text-xs mt-6">
          WEB BUILDER © 2026 — Created and Owned by <strong>Muhammad Taqi</strong><br />
          <span className="opacity-70">CORE GROUP OF COMPANY · Nexura</span>
        </p>
      </div>
    </div>
  );
}

// ------------ User Menu (account dropdown) ------------
function UserMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 shadow-sm font-semibold text-gray-700"
        title={user.username}
      >
        <span className="text-2xl">{user.avatar || "👤"}</span>
        <span className="hidden sm:inline text-sm">{user.username}</span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-40 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-4 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{user.avatar || "👤"}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{user.fullName || user.username}</div>
                  <div className="text-xs text-white/80 truncate">@{user.username}</div>
                  <div className="text-xs text-white/70 truncate">{user.email}</div>
                </div>
              </div>
            </div>
            {/* Items */}
            <div className="py-1">
              <div className="px-4 py-2 text-xs text-gray-500">
                Member since {formatDate(user.createdAt)}
              </div>
              <button
                onClick={() => { setOpen(false); onLogout(); }}
                className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 font-semibold flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ------------ Landing Page ------------
function LandingPage({
  user,
  onLogout,
  onStartNew,
  onOpenSite,
}: {
  user: User;
  onLogout: () => void;
  onStartNew: () => void;
  onOpenSite: (id: string) => void;
}) {
  const [sites, setSites] = useState<SavedSite[]>(() => loadSites());
  const [trash, setTrash] = useState<TrashedSite[]>(() => loadTrash());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [confirmPermDelete, setConfirmPermDelete] = useState<string | null>(null);
  const [undoToast, setUndoToast] = useState<{ id: string; name: string } | null>(null);

  // Move to trash (Google Sites style: undo within toast, otherwise stays in trash for 30 days)
  const deleteSite = (id: string) => {
    const site = sites.find((s) => s.id === id);
    if (!site) return;
    moveSiteToTrash(id);
    setSites(loadSites());
    setTrash(loadTrash());
    setConfirmDelete(null);
    setUndoToast({ id, name: site.name });
    // Auto-hide toast after 6 seconds
    setTimeout(() => setUndoToast((cur) => (cur?.id === id ? null : cur)), 6000);
  };

  const restoreSite = (id: string) => {
    restoreSiteFromTrash(id);
    setSites(loadSites());
    setTrash(loadTrash());
    setUndoToast(null);
  };

  const permDeleteSite = (id: string) => {
    permanentlyDelete(id);
    setTrash(loadTrash());
    setConfirmPermDelete(null);
  };

  const handleEmptyTrash = () => {
    emptyTrash();
    setTrash([]);
    setConfirmEmptyTrash(false);
  };

  const renameSite = (id: string, name: string) => {
    const next = sites.map((s) => (s.id === id ? { ...s, name, updatedAt: Date.now() } : s));
    setSites(next);
    saveSites(next);
  };

  const duplicateSite = (s: SavedSite) => {
    const copy: SavedSite = {
      ...s,
      id: uid(),
      name: s.name + " (Copy)",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [copy, ...sites];
    setSites(next);
    saveSites(next);
  };

  const downloadSiteHtml = (s: SavedSite) => {
    const html = generateHtml(s.data, s.name);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Hero header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-95" />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.1) 0%, transparent 50%)",
        }} />
        {/* Top bar with user menu */}
        <div className="relative max-w-6xl mx-auto px-6 pt-5 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-sm font-bold text-white">
            <span className="text-xl">&lt;/&gt;</span>
            WEB BUILDER
          </div>
          <UserMenu user={user} onLogout={onLogout} />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-20 text-center text-white">
          <div className="text-white/90 text-base font-semibold mb-4">
            👋 Welcome back, <strong>{user.fullName || user.username}</strong>!
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight drop-shadow-lg">
            Created and Owned by<br />
            <span className="bg-gradient-to-r from-amber-300 to-yellow-100 bg-clip-text text-transparent">
              Muhammad Taqi
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-10">
            Build beautiful websites in minutes. Drag, drop, customize, save, preview, and publish — all in one place. No coding required.
          </p>
          <button
            onClick={onStartNew}
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-blue-700 rounded-2xl font-extrabold text-lg shadow-2xl hover:scale-105 hover:shadow-3xl transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            START CREATING
          </button>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-white/80 text-sm">
            <span className="flex items-center gap-2">✓ Auto-save</span>
            <span className="flex items-center gap-2">✓ 10 Languages</span>
            <span className="flex items-center gap-2">✓ AI Block</span>
            <span className="flex items-center gap-2">✓ Export Backend (Node.js)</span>
            <span className="flex items-center gap-2">✓ Live URL Sharing</span>
          </div>
        </div>
      </div>

      {/* Saved sites */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-800">Your Saved Websites</h2>
            <p className="text-sm text-gray-500 mt-1">
              {sites.length === 0 ? "No websites yet — click 'Start Creating' to begin!" : `${sites.length} saved website${sites.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTrash(true)}
              className="px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-xl font-semibold flex items-center gap-2 shadow-sm"
              title="Trash"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
              <span className="hidden sm:inline">Trash</span>
              {trash.length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {trash.length}
                </span>
              )}
            </button>
            <button
              onClick={onStartNew}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-md"
            >
              <span className="text-xl">+</span> New Site
            </button>
          </div>
        </div>

        {sites.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No websites saved yet</h3>
            <p className="text-gray-500 mb-6">
              Start creating your first website. It will be auto-saved and appear here.
            </p>
            <button
              onClick={onStartNew}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold"
            >
              Create your first site →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {sites
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((s) => (
                <SiteCard
                  key={s.id}
                  site={s}
                  onOpen={() => onOpenSite(s.id)}
                  onDelete={() => setConfirmDelete(s.id)}
                  onRename={(name) => renameSite(s.id, name)}
                  onDuplicate={() => duplicateSite(s)}
                  onDownload={() => downloadSiteHtml(s)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-gray-500 text-sm border-t border-gray-200 bg-white/50">
        <p>WEB BUILDER © 2026 — Created and Owned by <strong>Muhammad Taqi</strong></p>
      </div>

      {/* Delete confirmation - Google Sites style */}
      {confirmDelete && (() => {
        const siteToDelete = sites.find((s) => s.id === confirmDelete);
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Move to trash?</h3>
                  <p className="text-gray-600 text-sm">
                    <strong className="text-gray-900 break-words">"{siteToDelete?.name}"</strong> will be moved to Trash and permanently deleted in {TRASH_RETENTION_DAYS} days.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteSite(confirmDelete)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                  </svg>
                  Move to Trash
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Undo toast (after delete) */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom">
          <div className="bg-gray-900 text-white rounded-xl shadow-2xl px-5 py-4 flex items-center gap-4 max-w-md">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>
                <strong>"{undoToast.name}"</strong> moved to trash
              </span>
            </div>
            <button
              onClick={() => restoreSite(undoToast.id)}
              className="text-blue-400 hover:text-blue-300 font-bold text-sm uppercase tracking-wide"
            >
              Undo
            </button>
            <button
              onClick={() => setUndoToast(null)}
              className="text-gray-400 hover:text-white text-xl leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Trash modal */}
      {showTrash && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowTrash(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">Trash</h2>
                  <p className="text-xs text-gray-500">Items in trash for more than {TRASH_RETENTION_DAYS} days are deleted forever</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {trash.length > 0 && (
                  <button
                    onClick={() => setConfirmEmptyTrash(true)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-semibold text-sm"
                  >
                    Empty Trash
                  </button>
                )}
                <button
                  onClick={() => setShowTrash(false)}
                  className="w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-500 text-xl"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-6">
              {trash.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">🗑️</div>
                  <h3 className="text-lg font-bold text-gray-700 mb-1">Trash is empty</h3>
                  <p className="text-sm text-gray-500">Deleted websites will appear here for {TRASH_RETENTION_DAYS} days.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trash
                    .sort((a, b) => b.deletedAt - a.deletedAt)
                    .map((s) => {
                      const days = daysUntilPurge(s.deletedAt);
                      const norm = normalizeSite(s.data);
                      const firstPage = norm.pages[0];
                      const bg = BACKGROUNDS.find((b) => b.id === firstPage.background) || BACKGROUNDS[21];
                      const previewStyle: React.CSSProperties =
                        bg.type === "image"
                          ? { backgroundImage: `url(${bg.value})`, backgroundSize: "cover", backgroundPosition: "center" }
                          : bg.type === "gradient"
                          ? { backgroundImage: bg.value }
                          : { backgroundColor: bg.value };
                      return (
                        <div key={s.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50">
                          <div className="w-16 h-16 rounded-lg flex-shrink-0 border border-gray-200" style={previewStyle} />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">{s.name}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Deleted {formatDate(s.deletedAt)} · {norm.pages.length} page{norm.pages.length !== 1 ? "s" : ""}
                            </p>
                            <p className="text-xs text-amber-600 font-semibold mt-0.5">
                              {days > 0 ? `Permanently deleted in ${days} day${days !== 1 ? "s" : ""}` : "Will be deleted soon"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => restoreSite(s.id)}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm flex items-center gap-1.5"
                              title="Restore"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <polyline points="1 4 1 10 7 10" />
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                              </svg>
                              Restore
                            </button>
                            <button
                              onClick={() => setConfirmPermDelete(s.id)}
                              className="px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-gray-300 hover:border-red-300 rounded-lg font-semibold text-sm"
                              title="Delete forever"
                            >
                              Delete forever
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permanently delete confirm */}
      {confirmPermDelete && (() => {
        const item = trash.find((s) => s.id === confirmPermDelete);
        return (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => setConfirmPermDelete(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-4 mb-2">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Delete forever?</h3>
                  <p className="text-gray-600 text-sm">
                    <strong>"{item?.name}"</strong> will be permanently deleted. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setConfirmPermDelete(null)}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => permDeleteSite(confirmPermDelete)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                >
                  Delete forever
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Empty trash confirm */}
      {confirmEmptyTrash && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => setConfirmEmptyTrash(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-2">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Empty trash?</h3>
                <p className="text-gray-600 text-sm">
                  All <strong>{trash.length}</strong> item{trash.length !== 1 ? "s" : ""} in trash will be permanently deleted. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setConfirmEmptyTrash(false)}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleEmptyTrash}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
              >
                Empty Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SiteCard({
  site,
  onOpen,
  onDelete,
  onRename,
  onDuplicate,
  onDownload,
}: {
  site: SavedSite;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDownload: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(site.name);
  const [showActionDialog, setShowActionDialog] = useState(false);

  const norm = normalizeSite(site.data);
  const firstPage = norm.pages[0];
  const bg = BACKGROUNDS.find((b) => b.id === firstPage.background) || BACKGROUNDS[21];
  const previewStyle: React.CSSProperties =
    bg.type === "image"
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: "cover", backgroundPosition: "center" }
      : bg.type === "gradient"
      ? { backgroundImage: bg.value }
      : { backgroundColor: bg.value };

  // Find a heading or first text block for preview
  const firstHeading = firstPage.blocks.find((b) => b.type === "heading" || b.type === "hero");
  const previewText = firstHeading?.content || firstPage.blocks[0]?.content || "Untitled";
  const pageCount = norm.pages.length;

  return (
    <div className="group bg-white rounded-xl shadow-md hover:shadow-xl transition border border-gray-100 overflow-hidden">
      {/* Thumbnail - clicking opens action dialog */}
      <button
        onClick={() => setShowActionDialog(true)}
        className="block w-full h-40 relative overflow-hidden"
        style={previewStyle}
      >
        <div className="absolute inset-0 flex items-center justify-center p-3 bg-black/10 group-hover:bg-black/0 transition">
          <span
            className="text-2xl font-extrabold text-center line-clamp-3"
            style={{ color: firstHeading?.color || "#0f172a", textShadow: "0 1px 2px rgba(255,255,255,0.5)" }}
          >
            {previewText}
          </span>
        </div>
        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="px-4 py-2 bg-white text-blue-700 rounded-lg font-bold text-sm shadow-lg">
            👆 Choose Action
          </span>
        </div>
      </button>

      {/* Action chooser dialog (Edit OR Move to Trash) */}
      {showActionDialog && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowActionDialog(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview header */}
            <div className="h-32 relative" style={previewStyle}>
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center px-4">
                <span
                  className="text-2xl font-extrabold text-center line-clamp-2"
                  style={{ color: firstHeading?.color || "#0f172a", textShadow: "0 1px 3px rgba(255,255,255,0.6)" }}
                >
                  {previewText}
                </span>
              </div>
              <button
                onClick={() => setShowActionDialog(false)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 text-lg font-bold shadow-md"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Title */}
            <div className="px-6 pt-5 pb-3 text-center">
              <h3 className="text-xl font-extrabold text-gray-900 truncate">{site.name}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(site.updatedAt)} · {pageCount} page{pageCount !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Two big action buttons */}
            <div className="px-6 pb-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowActionDialog(false);
                  onOpen();
                }}
                className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold shadow-md hover:shadow-lg transition"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span className="text-base">Edit</span>
              </button>
              <button
                onClick={() => {
                  setShowActionDialog(false);
                  onDelete();
                }}
                className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold shadow-md hover:shadow-lg transition"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                </svg>
                <span className="text-sm leading-tight">Move to Trash</span>
              </button>
            </div>

            {/* Cancel link */}
            <div className="px-6 pb-5 -mt-1 text-center">
              <button
                onClick={() => setShowActionDialog(false)}
                className="text-sm text-gray-500 hover:text-gray-800 font-semibold underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (name.trim()) onRename(name.trim());
                  setEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (name.trim()) onRename(name.trim());
                    setEditing(false);
                  }
                }}
                className="w-full px-2 py-1 text-base font-bold border border-blue-400 rounded outline-none"
              />
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="text-base font-bold text-gray-800 truncate block w-full text-left hover:text-blue-600"
                title="Click to rename"
              >
                {site.name}
              </button>
            )}
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatDate(site.updatedAt)} · {pageCount} page{pageCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-2xl border border-gray-200 z-40 py-1">
                  <MenuItem icon="✏️" label="Rename" onClick={() => { setEditing(true); setMenuOpen(false); }} />
                  <MenuItem icon="📋" label="Duplicate" onClick={() => { onDuplicate(); setMenuOpen(false); }} />
                  <MenuItem icon="⬇️" label="Download HTML" onClick={() => { onDownload(); setMenuOpen(false); }} />
                  <div className="border-t my-1" />
                  <MenuItem icon="🗑️" label="Delete" danger onClick={() => { onDelete(); setMenuOpen(false); }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm ${danger ? "text-red-600" : "text-gray-700"}`}
    >
      <span>{icon}</span> {label}
    </button>
  );
}

function Builder({
  user,
  onLogout,
  currentSiteId,
  onSetCurrentSiteId,
  onGoHome,
}: {
  user: User;
  onLogout: () => void;
  currentSiteId: string | null;
  onSetCurrentSiteId: (id: string | null) => void;
  onGoHome: () => void;
}) {
  // Load initial state: from saved site, draft, or defaults
  const initial = (() => {
    // Priority 1: draft (in-progress unsaved changes)
    try {
      const draftRaw = localStorage.getItem(DRAFT_KEY_FN());
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        if (draft.pages || draft.blocks) {
          const norm = normalizeSite(draft);
          return { ...norm, siteName: draft.siteName || "Untitled Site" };
        }
      }
    } catch {}
    // Priority 2: opened saved site
    if (currentSiteId) {
      const sites = loadSites();
      const site = sites.find((s) => s.id === currentSiteId);
      if (site) {
        const norm = normalizeSite(site.data);
        return { ...norm, siteName: site.name };
      }
    }
    // Priority 3: blank — default with one Home page
    const homeId = uid();
    return {
      pages: [{
        id: homeId,
        name: "Home",
        blocks: [{ id: uid(), type: "heading" as BlockType, content: "My Website", color: "#1d4ed8", align: "center" as const }],
        background: "bg-light",
      }],
      activePageId: homeId,
      siteName: "Untitled Site",
    };
  })();

  const [pages, setPages] = useState<Page[]>(initial.pages);
  const [activePageId, setActivePageId] = useState<string>(initial.activePageId);

  // Helpers: get/set blocks & background for the ACTIVE page
  const activePage = pages.find((p) => p.id === activePageId) || pages[0];
  const blocks = activePage.blocks;
  const background = activePage.background;

  const setBlocks = (updater: Block[] | ((prev: Block[]) => Block[])) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== activePageId) return p;
        const next = typeof updater === "function" ? (updater as (b: Block[]) => Block[])(p.blocks) : updater;
        return { ...p, blocks: next };
      })
    );
  };
  const setBackground = (bg: string) => {
    setPages((prev) => prev.map((p) => (p.id === activePageId ? { ...p, background: bg } : p)));
  };

  // Page management
  const addPage = () => {
    const id = uid();
    const newPage: Page = {
      id,
      name: `Page ${pages.length + 1}`,
      blocks: [{ id: uid(), type: "heading" as BlockType, content: "New Page", color: "#1d4ed8", align: "center" }],
      background: "bg-light",
    };
    setPages([...pages, newPage]);
    setActivePageId(id);
  };
  const deletePage = (id: string) => {
    if (pages.length <= 1) return; // Don't delete last page
    const idx = pages.findIndex((p) => p.id === id);
    const next = pages.filter((p) => p.id !== id);
    setPages(next);
    if (activePageId === id) {
      setActivePageId(next[Math.max(0, idx - 1)].id);
    }
  };
  const renamePage = (id: string, name: string) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };
  const duplicatePage = (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    const newId = uid();
    const copy: Page = {
      id: newId,
      name: page.name + " (Copy)",
      blocks: page.blocks.map((b) => ({ ...b, id: uid() })),
      background: page.background,
    };
    const idx = pages.findIndex((p) => p.id === id);
    const next = [...pages.slice(0, idx + 1), copy, ...pages.slice(idx + 1)];
    setPages(next);
    setActivePageId(newId);
  };
  const movePage = (id: string, dir: -1 | 1) => {
    const idx = pages.findIndex((p) => p.id === id);
    const newIdx = idx + dir;
    if (idx < 0 || newIdx < 0 || newIdx >= pages.length) return;
    const arr = [...pages];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setPages(arr);
  };

  const [siteName, setSiteName] = useState<string>(initial.siteName || "Untitled Site");
  const [editingName, setEditingName] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [lang, setLang] = useState<string>(() => localStorage.getItem("wb-lang") || "en");
  const [contentLang, setContentLang] = useState<string>("en"); // tracks current content language
  const [copied, setCopied] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState({ done: 0, total: 0 });

  const t = (key: string): string => TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const isRtl = lang === "ar" || lang === "ur";

  useEffect(() => {
    localStorage.setItem("wb-lang", lang);
  }, [lang]);

  // ---- Auto-save draft on every change ----
  useEffect(() => {
    setSaveStatus("unsaved");
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY_FN(), JSON.stringify({ pages, activePageId, siteName }));
      } catch {}
    }, 400);
    return () => clearTimeout(handle);
  }, [pages, activePageId, siteName]);

  // ---- Save site to library (manual save button) ----
  const saveToLibrary = () => {
    setSaveStatus("saving");
    const sites = loadSites();
    const now = Date.now();
    const data: SiteData = { pages, activePageId };

    if (currentSiteId) {
      // Update existing
      const idx = sites.findIndex((s) => s.id === currentSiteId);
      if (idx >= 0) {
        sites[idx] = { ...sites[idx], name: siteName, data, updatedAt: now };
      } else {
        sites.unshift({ id: currentSiteId, name: siteName, data, createdAt: now, updatedAt: now });
      }
    } else {
      // Create new
      const id = uid();
      sites.unshift({ id, name: siteName, data, createdAt: now, updatedAt: now });
      onSetCurrentSiteId(id);
    }
    saveSites(sites);
    localStorage.removeItem(DRAFT_KEY_FN());
    setTimeout(() => setSaveStatus("saved"), 300);
  };

  // Translate the entire website content to a target language
  const translateWebsite = async (targetLang: string, fromLang: string) => {
    if (targetLang === fromLang) return;
    if (!blocks.length) {
      setContentLang(targetLang);
      return;
    }

    // Collect all translatable strings
    const tasks: { blockId: string; field: keyof Block | "itemTitle" | "itemDesc"; index?: number; text: string }[] = [];
    for (const b of blocks) {
      if (b.content) tasks.push({ blockId: b.id, field: "content", text: b.content });
      if (b.subtitle) tasks.push({ blockId: b.id, field: "subtitle", text: b.subtitle });
      if (b.buttonText) tasks.push({ blockId: b.id, field: "buttonText", text: b.buttonText });
      if (b.items) {
        b.items.forEach((it, i) => {
          if (it.title) tasks.push({ blockId: b.id, field: "itemTitle", index: i, text: it.title });
          if (it.desc) tasks.push({ blockId: b.id, field: "itemDesc", index: i, text: it.desc });
        });
      }
    }

    if (!tasks.length) {
      setContentLang(targetLang);
      return;
    }

    setTranslating(true);
    setTranslateProgress({ done: 0, total: tasks.length });

    // Translate each string using MyMemory API (free, no key)
    const translations: Record<number, string> = {};
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(task.text)}&langpair=${fromLang}|${targetLang}`;
        const res = await fetch(url);
        const json = await res.json();
        const translated = json?.responseData?.translatedText || task.text;
        translations[i] = translated;
      } catch {
        translations[i] = task.text;
      }
      setTranslateProgress({ done: i + 1, total: tasks.length });
    }

    // Apply translations to blocks
    const newBlocks = blocks.map((b) => {
      const updated = { ...b };
      if (b.items) updated.items = b.items.map((it) => ({ ...it }));
      tasks.forEach((task, i) => {
        if (task.blockId !== b.id) return;
        const tr = translations[i];
        if (task.field === "content") updated.content = tr;
        else if (task.field === "subtitle") updated.subtitle = tr;
        else if (task.field === "buttonText") updated.buttonText = tr;
        else if (task.field === "itemTitle" && updated.items && task.index !== undefined) updated.items[task.index].title = tr;
        else if (task.field === "itemDesc" && updated.items && task.index !== undefined) updated.items[task.index].desc = tr;
      });
      return updated;
    });

    setBlocks(newBlocks);
    setContentLang(targetLang);
    setTranslating(false);
  };

  // When the user changes language: translate UI labels (automatic via t()) AND offer to translate content
  const handleLanguageChange = async (newLang: string) => {
    const prevContentLang = contentLang;
    setLang(newLang);
    setShowLangMenu(false);
    // Auto-translate site content
    if (newLang !== prevContentLang && blocks.length > 0) {
      await translateWebsite(newLang, prevContentLang);
    } else {
      setContentLang(newLang);
    }
  };

  const selected = blocks.find((b) => b.id === selectedId) || null;
  const bg = BACKGROUNDS.find((b) => b.id === background) || BACKGROUNDS[3];

  const addBlock = (type: BlockType, variant?: string) => {
    const newBlock: Block = makeDefaultBlock(type, variant);
    setBlocks([...blocks, newBlock]);
    setSelectedId(newBlock.id);
  };

  const updateBlock = (id: string, patch: Partial<Block>) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const arr = [...blocks];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setBlocks(arr);
  };

  const siteData: SiteData = { pages, activePageId };

  const downloadCode = () => {
    const html = generateHtml(siteData, siteName);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-website.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBackend = async () => {
    const zip = new JSZip();
    const files: Record<string, string> = generateBackendProject(siteData, siteName);
    Object.entries(files).forEach(([path, content]) => {
      zip.file(path, content);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-website-backend.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  const liveUrl = `${window.location.origin}${window.location.pathname}#site=${encodeSite(siteData)}`;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const bgStyle: React.CSSProperties =
    bg.type === "image"
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: "cover", backgroundPosition: "center" }
      : bg.type === "gradient"
      ? { backgroundImage: bg.value }
      : { backgroundColor: bg.value };

  return (
    <div className="h-screen w-screen flex bg-gray-50 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {/* Sidebar */}
      <aside className="w-80 flex flex-col bg-white border-r border-gray-200" dir="ltr">
        {/* Logo + Language */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 text-2xl font-bold">&lt;/&gt;</span>
            <span className="text-lg font-extrabold tracking-tight">WEB BUILDER</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold"
              title={t("language")}
            >
              <span className="text-base">{currentLang.flag}</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showLangMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowLangMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-40 py-2 max-h-80 overflow-auto">
                  <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">
                    {t("language")}
                  </div>
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => handleLanguageChange(l.code)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-blue-50 transition ${
                        lang === l.code ? "bg-blue-100 text-blue-700 font-semibold" : ""
                      }`}
                    >
                      <span className="text-xl">{l.flag}</span>
                      <span className="text-sm">{l.name}</span>
                      {lang === l.code && (
                        <svg className="w-4 h-4 ml-auto text-blue-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Scrollable tools */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Pages panel */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs tracking-widest text-gray-400 font-semibold">📄 {t("pages")}</h3>
              <button
                onClick={addPage}
                className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1"
                title={t("addPage")}
              >
                <span className="text-base leading-none">+</span> {t("add")}
              </button>
            </div>
            <div className="space-y-1.5">
              {pages.map((p, i) => (
                <PageItem
                  key={p.id}
                  page={p}
                  index={i}
                  isActive={p.id === activePageId}
                  canDelete={pages.length > 1}
                  canMoveUp={i > 0}
                  canMoveDown={i < pages.length - 1}
                  onSelect={() => setActivePageId(p.id)}
                  onRename={(name) => renamePage(p.id, name)}
                  onDelete={() => deletePage(p.id)}
                  onDuplicate={() => duplicatePage(p.id)}
                  onMoveUp={() => movePage(p.id, -1)}
                  onMoveDown={() => movePage(p.id, 1)}
                />
              ))}
            </div>
          </div>

          {/* Design tools */}
          <div>
            <h3 className="text-xs tracking-widest text-gray-400 font-semibold mb-3">{t("designTools")}</h3>
            <div className="grid grid-cols-2 gap-3">
              <ToolButton label={t("heading")} onClick={() => addBlock("heading")} icon={<span className="font-bold text-2xl">T</span>} />
              <ToolButton
                label={t("text")}
                onClick={() => addBlock("text")}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="18" x2="14" y2="18" />
                  </svg>
                }
              />
              <ToolButton
                label={t("linkBtn")}
                onClick={() => addBlock("linkbtn")}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
                    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
                  </svg>
                }
              />
              <ToolButton
                label={t("embed")}
                onClick={() => addBlock("embed")}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* AI Builder & Tips */}
          <div>
            <h3 className="text-xs tracking-widest text-gray-400 font-semibold mb-3">{t("aiBuilder")}</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowAIModal(true)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:shadow-lg transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
                </svg>
                <span className="text-sm font-bold">{t("aiBlock")}</span>
              </button>
              <button
                onClick={() => setShowTips(true)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white hover:shadow-lg transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.4 1 2.3h6c0-.9.3-1.7 1-2.3A7 7 0 0 0 12 2z" />
                </svg>
                <span className="text-sm font-bold">{t("tips")}</span>
              </button>
            </div>
          </div>

          {/* Sections */}
          <div>
            <h3 className="text-xs tracking-widest text-gray-400 font-semibold mb-3">{t("sections")}</h3>
            <div className="grid grid-cols-2 gap-2">
              <SectionCard
                label={t("heroCentered")}
                gradient="from-blue-500 to-cyan-500"
                onClick={() => addBlock("hero", "centered")}
                preview="🎯"
              />
              <SectionCard
                label={t("heroSplit")}
                gradient="from-emerald-500 to-teal-500"
                onClick={() => addBlock("hero", "split")}
                preview="◧"
              />
              <SectionCard
                label={t("heroGradient")}
                gradient="from-pink-500 to-rose-500"
                onClick={() => addBlock("hero", "gradient")}
                preview="🌈"
              />
              <SectionCard
                label={t("heroImage")}
                gradient="from-violet-500 to-fuchsia-500"
                onClick={() => addBlock("hero", "image")}
                preview="🖼️"
              />
              <SectionCard
                label={t("features")}
                gradient="from-amber-500 to-orange-500"
                onClick={() => addBlock("features")}
                preview="✨"
              />
              <SectionCard
                label={t("cta")}
                gradient="from-indigo-500 to-purple-600"
                onClick={() => addBlock("cta")}
                preview="📢"
              />
              <SectionCard
                label={t("footer")}
                gradient="from-slate-600 to-slate-800"
                onClick={() => addBlock("footer")}
                preview="⬇️"
              />
            </div>
          </div>

          {/* Backgrounds */}
          <div>
            <h3 className="text-xs tracking-widest text-gray-400 font-semibold mb-3">{t("backgrounds")}</h3>
            <div className="grid grid-cols-4 gap-2">
              {BACKGROUNDS.map((b) => {
                const style: React.CSSProperties =
                  b.type === "image"
                    ? { backgroundImage: `url(${b.value})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : b.type === "gradient"
                    ? { backgroundImage: b.value }
                    : { backgroundColor: b.value };
                return (
                  <button
                    key={b.id}
                    onClick={() => setBackground(b.id)}
                    style={style}
                    className={`aspect-square rounded-md border-2 transition ${
                      background === b.id ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-400"
                    }`}
                    title={b.id}
                  />
                );
              })}
            </div>
          </div>

          {/* Selected block editor */}
          {selected && (
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-xs tracking-widest text-gray-400 font-semibold mb-3">{t("editBlock")}</h3>
              <BlockEditor
                block={selected}
                onChange={(p) => updateBlock(selected.id, p)}
                onDelete={() => deleteBlock(selected.id)}
                onMoveUp={() => moveBlock(selected.id, -1)}
                onMoveDown={() => moveBlock(selected.id, 1)}
              />
            </div>
          )}
        </div>

        {/* Bottom action buttons */}
        <div className="p-4 space-y-3 border-t border-gray-100 bg-white">
          <button
            onClick={() => setShowPreview(true)}
            className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 rounded-xl shadow-md transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {t("preview")}
          </button>
          <button
            onClick={downloadCode}
            className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-md transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t("downloadCode")}
          </button>
          <button
            onClick={downloadBackend}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white font-bold py-4 rounded-xl shadow-md transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" />
              <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
            </svg>
            {t("downloadBackend")}
          </button>
          <button
            onClick={() => setShowLiveModal(true)}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-md transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            {t("getLiveUrl")}
          </button>
        </div>
      </aside>

      {/* Canvas + Top Bar */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 bg-white border-b border-gray-200 shadow-sm" dir="ltr">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                // Auto-save draft to library before leaving (so they don't lose it)
                if (saveStatus !== "saved") saveToLibrary();
                onGoHome();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 font-medium"
              title="Back to home"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 12l9-9 9 9" />
                <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
              </svg>
              <span className="hidden sm:inline">Home</span>
            </button>
            <div className="h-6 w-px bg-gray-300" />
            {editingName ? (
              <input
                autoFocus
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
                className="px-2 py-1 text-base font-bold border-2 border-blue-400 rounded outline-none min-w-0"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-base font-bold text-gray-800 hover:text-blue-600 truncate max-w-xs"
                title="Click to rename"
              >
                {siteName} <span className="text-gray-400 font-normal text-xs">✏️</span>
              </button>
            )}
            <span className={`text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-full ${
              saveStatus === "saved" ? "bg-green-100 text-green-700" :
              saveStatus === "saving" ? "bg-blue-100 text-blue-700" :
              "bg-amber-100 text-amber-700"
            }`}>
              {saveStatus === "saved" ? "✓ Saved" : saveStatus === "saving" ? "⟳ Saving..." : "● Unsaved"}
            </span>
          </div>
          <button
            onClick={saveToLibrary}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white rounded-xl font-bold shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            SAVE
          </button>
        </div>

        {/* Canvas scroll area */}
        <div className="flex-1 overflow-auto p-6">
        <div
          className="min-h-full rounded-lg border-2 border-blue-500 shadow-sm transition-all"
          style={bgStyle}
          onClick={() => setSelectedId(null)}
        >
          <div className="max-w-5xl mx-auto px-8 py-16 space-y-4">
            {blocks.length === 0 && (
              <div className="text-center py-32 text-gray-400">
                <p className="text-lg">{t("canvasEmpty")}</p>
                <p className="text-sm mt-2">{t("canvasHint")}</p>
              </div>
            )}
            {blocks.map((b) => (
              <EditableBlock
                key={b.id}
                block={b}
                isSelected={selectedId === b.id}
                onSelect={(e) => {
                  e.stopPropagation();
                  setSelectedId(b.id);
                }}
                onChange={(p) => updateBlock(b.id, p)}
              />
            ))}
          </div>
        </div>
        </div>
      </main>

      {/* Live URL Modal */}
      {showLiveModal && (
        <Modal onClose={() => setShowLiveModal(false)}>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
              <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
                <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold mb-4">{t("liveUrlReady")}</h2>
            <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-700 font-mono break-all max-h-24 overflow-auto">
              {liveUrl}
            </div>
          </div>
          <button
            onClick={copyUrl}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl mb-3"
          >
            {copied ? t("copied") : t("copyUrl")}
          </button>
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-center w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold py-3 rounded-xl mb-3"
          >
            {t("openLive")}
          </a>
          <button
            onClick={() => setShowLiveModal(false)}
            className="w-full text-gray-700 hover:text-gray-900 font-semibold py-3 underline"
          >
            {t("close")}
          </button>
        </Modal>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal data={siteData} onClose={() => setShowPreview(false)} />
      )}

      {/* AI Block Modal */}
      {showAIModal && (
        <AIBlockModal
          onClose={() => setShowAIModal(false)}
          onApply={(newBlocks, newBg, actions) => {
            if (newBlocks.length) setBlocks([...blocks, ...newBlocks]);
            if (newBg) setBackground(newBg);
            // Execute actions: download, preview, liveurl
            if (actions.includes("download")) {
              setTimeout(() => downloadCode(), 300);
            }
            if (actions.includes("preview")) {
              setTimeout(() => setShowPreview(true), 300);
            }
            if (actions.includes("liveurl")) {
              setTimeout(() => setShowLiveModal(true), 300);
            }
          }}
        />
      )}

      {/* Tips Modal */}
      {showTips && <TipsModal onClose={() => setShowTips(false)} />}

      {/* Translation Progress Overlay */}
      {translating && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
              <svg className="w-10 h-10 text-white animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 12a9 9 0 1 1-6.2-8.5" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold mb-2">🌍 Translating Website</h2>
            <p className="text-gray-600 mb-4">
              Converting all content to <strong>{currentLang.name}</strong> {currentLang.flag}
            </p>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all"
                style={{ width: `${translateProgress.total ? (translateProgress.done / translateProgress.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">
              {translateProgress.done} / {translateProgress.total} items translated
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition bg-white"
    >
      <div className="text-gray-700">{icon}</div>
      <span className="text-sm font-medium text-gray-800">{label}</span>
    </button>
  );
}

function PageItem({
  page,
  index,
  isActive,
  canDelete,
  canMoveUp,
  canMoveDown,
  onSelect,
  onRename,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  page: Page;
  index: number;
  isActive: boolean;
  canDelete: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(page.name);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`group rounded-lg border-2 transition ${
        isActive ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"
      }`}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <button onClick={onSelect} className="flex-1 flex items-center gap-2 min-w-0 text-left">
          <span className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
            isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
          }`}>
            {index + 1}
          </span>
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={() => {
                if (name.trim()) onRename(name.trim());
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (name.trim()) onRename(name.trim());
                  setEditing(false);
                }
              }}
              className="flex-1 min-w-0 px-1.5 py-0.5 text-sm border border-blue-400 rounded outline-none"
            />
          ) : (
            <span className="text-sm font-semibold truncate">{page.name}</span>
          )}
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded hover:bg-gray-200 opacity-60 group-hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-2xl border border-gray-200 z-40 py-1">
                <MenuItem icon="✏️" label="Rename" onClick={() => { setEditing(true); setMenuOpen(false); }} />
                <MenuItem icon="📋" label="Duplicate" onClick={() => { onDuplicate(); setMenuOpen(false); }} />
                {canMoveUp && <MenuItem icon="⬆️" label="Move Up" onClick={() => { onMoveUp(); setMenuOpen(false); }} />}
                {canMoveDown && <MenuItem icon="⬇️" label="Move Down" onClick={() => { onMoveDown(); setMenuOpen(false); }} />}
                {canDelete && (
                  <>
                    <div className="border-t my-1" />
                    <MenuItem icon="🗑️" label="Delete" danger onClick={() => { onDelete(); setMenuOpen(false); }} />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  label, gradient, preview, onClick,
}: { label: string; gradient: string; preview: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-gradient-to-br ${gradient} text-white hover:shadow-lg hover:scale-105 transition`}
    >
      <span className="text-xl">{preview}</span>
      <span className="text-xs font-bold leading-tight text-center">{label}</span>
    </button>
  );
}

function EditableBlock({
  block,
  isSelected,
  onSelect,
  onChange,
}: {
  block: Block;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onChange: (p: Partial<Block>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const style: React.CSSProperties = {
    fontSize: block.fontSize ? `${block.fontSize}px` : undefined,
    color: block.color,
    textAlign: block.align,
    fontWeight: block.bold ? 700 : undefined,
    fontStyle: block.italic ? "italic" : undefined,
    outline: "none",
  };

  const wrapperClass = `relative rounded-md cursor-pointer transition ${
    isSelected ? "ring-2 ring-blue-500 ring-offset-2" : "hover:ring-1 hover:ring-blue-300"
  }`;

  if (block.type === "heading") {
    return (
      <div className={wrapperClass} onClick={onSelect}>
        <h1
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onChange({ content: e.currentTarget.textContent || "" })}
          className="font-extrabold leading-tight"
          style={{ fontSize: 64, ...style }}
        >
          {block.content}
        </h1>
      </div>
    );
  }
  if (block.type === "text") {
    return (
      <div className={wrapperClass} onClick={onSelect}>
        <p
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onChange({ content: e.currentTarget.textContent || "" })}
          className="leading-relaxed"
          style={{ fontSize: 18, ...style }}
        >
          {block.content}
        </p>
      </div>
    );
  }
  if (block.type === "linkbtn") {
    return (
      <div className={wrapperClass} onClick={onSelect} style={{ textAlign: block.align || "left" }}>
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onChange({ content: e.currentTarget.textContent || "" })}
          className="inline-block px-6 py-3 rounded-lg text-white font-semibold"
          style={{ backgroundColor: block.color || "#2563eb" }}
        >
          {block.content}
        </span>
      </div>
    );
  }
  if (block.type === "embed") {
    return (
      <div className={wrapperClass} onClick={onSelect}>
        <div
          className="rounded-lg overflow-hidden border border-gray-200 pointer-events-none"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      </div>
    );
  }
  if (block.type === "hero" || block.type === "features" || block.type === "cta" || block.type === "footer") {
    return (
      <div className={wrapperClass} onClick={onSelect}>
        <SectionRender block={block} />
      </div>
    );
  }
  return null;
}

function BlockEditor({
  block,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  block: Block;
  onChange: (p: Partial<Block>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500 uppercase">{block.type}</div>

      {block.type === "embed" ? (
        <div>
          <label className="text-xs font-semibold text-gray-600">Embed HTML</label>
          <textarea
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value })}
            className="w-full mt-1 p-2 border border-gray-300 rounded text-xs font-mono h-24"
          />
        </div>
      ) : (
        <div>
          <label className="text-xs font-semibold text-gray-600">Content</label>
          <input
            type="text"
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value })}
            className="w-full mt-1 p-2 border border-gray-300 rounded text-sm"
          />
        </div>
      )}

      {block.type === "linkbtn" && (
        <div>
          <label className="text-xs font-semibold text-gray-600">Link URL</label>
          <input
            type="text"
            value={block.url || ""}
            onChange={(e) => onChange({ url: e.target.value })}
            className="w-full mt-1 p-2 border border-gray-300 rounded text-sm"
            placeholder="https://..."
          />
        </div>
      )}

      {(block.type === "hero" || block.type === "features" || block.type === "cta" || block.type === "footer") && (
        <>
          <div>
            <label className="text-xs font-semibold text-gray-600">Subtitle</label>
            <textarea
              value={block.subtitle || ""}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              className="w-full mt-1 p-2 border border-gray-300 rounded text-sm h-16"
            />
          </div>
          {(block.type === "hero" || block.type === "cta") && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-600">Button Text</label>
                <input
                  type="text"
                  value={block.buttonText || ""}
                  onChange={(e) => onChange({ buttonText: e.target.value })}
                  className="w-full mt-1 p-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Button URL</label>
                <input
                  type="text"
                  value={block.buttonUrl || ""}
                  onChange={(e) => onChange({ buttonUrl: e.target.value })}
                  className="w-full mt-1 p-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </>
          )}
          {block.type === "hero" && (block.variant === "split" || block.variant === "image") && (
            <div>
              <label className="text-xs font-semibold text-gray-600">Image URL</label>
              <input
                type="text"
                value={block.imageUrl || ""}
                onChange={(e) => onChange({ imageUrl: e.target.value })}
                className="w-full mt-1 p-2 border border-gray-300 rounded text-sm"
              />
            </div>
          )}
          <div className="flex gap-2 items-center">
            <label className="text-xs font-semibold text-gray-600 w-20">BG Color</label>
            <input
              type="color"
              value={(block.bgColor || "").startsWith("#") ? block.bgColor : "#ffffff"}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
            />
          </div>
        </>
      )}

      {block.type !== "embed" && (
        <>
          <div className="flex gap-2 items-center">
            <label className="text-xs font-semibold text-gray-600 w-16">Color</label>
            <input
              type="color"
              value={block.color || "#000000"}
              onChange={(e) => onChange({ color: e.target.value })}
              className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Align</label>
            <div className="flex gap-1 mt-1">
              {(["left", "center", "right"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => onChange({ align: a })}
                  className={`flex-1 py-1 text-xs rounded border ${
                    block.align === a ? "bg-blue-600 text-white border-blue-600" : "border-gray-300"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Font Size: {block.fontSize || (block.type === "heading" ? 64 : 18)}px</label>
            <input
              type="range"
              min={12}
              max={120}
              value={block.fontSize || (block.type === "heading" ? 64 : 18)}
              onChange={(e) => onChange({ fontSize: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={onMoveUp} className="flex-1 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded">↑ Up</button>
        <button onClick={onMoveDown} className="flex-1 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded">↓ Down</button>
        <button onClick={onDelete} className="flex-1 py-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded">Delete</button>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function PreviewModal({ data, onClose }: { data: SiteData; onClose: () => void }) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const html = generateHtml(data);
  const widths = { desktop: "100%", tablet: "768px", mobile: "375px" };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <h2 className="text-xl font-bold">Live Preview</h2>
        </div>
        <div className="flex items-center gap-2">
          {(["desktop", "tablet", "mobile"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`px-4 py-2 rounded text-sm font-medium capitalize ${
                device === d ? "bg-blue-600 text-white" : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              {d}
            </button>
          ))}
          <button
            onClick={onClose}
            className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-bold"
          >
            ✕ Close
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-gray-200 p-6 flex justify-center">
        <iframe
          title="preview"
          srcDoc={html}
          className="bg-white shadow-2xl rounded-lg transition-all"
          style={{ width: widths[device], height: "100%", maxWidth: "100%" }}
        />
      </div>
    </div>
  );
}

// ------------ HTML generator ------------
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function blockToHtml(b: Block): string {
  const styleParts: string[] = [];
  if (b.fontSize) styleParts.push(`font-size:${b.fontSize}px`);
  if (b.color) styleParts.push(`color:${b.color}`);
  if (b.align) styleParts.push(`text-align:${b.align}`);
  if (b.bold) styleParts.push(`font-weight:700`);
  if (b.italic) styleParts.push(`font-style:italic`);
  const style = styleParts.join(";");

  if (b.type === "heading") {
    return `<h1 style="font-size:64px;font-weight:800;line-height:1.1;margin:0 0 16px;${style}">${escapeHtml(b.content)}</h1>`;
  }
  if (b.type === "text") {
    return `<p style="font-size:18px;line-height:1.6;margin:0 0 16px;${style}">${escapeHtml(b.content)}</p>`;
  }
  if (b.type === "linkbtn") {
    return `<div style="text-align:${b.align || "left"};margin:16px 0;"><a href="${escapeHtml(b.url || "#")}" target="_blank" style="display:inline-block;padding:12px 24px;background:${b.color || "#2563eb"};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">${escapeHtml(b.content)}</a></div>`;
  }
  if (b.type === "embed") {
    return `<div style="margin:16px 0;border-radius:8px;overflow:hidden;">${b.content}</div>`;
  }
  if (b.type === "hero") {
    let bgCss = "";
    if (b.bgColor) {
      bgCss = b.bgColor.startsWith("linear-gradient") ? `background-image:${b.bgColor};` : `background-color:${b.bgColor};`;
    }
    if (b.variant === "image" && b.imageUrl) {
      bgCss = `background-image:linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)),url('${b.imageUrl}');background-size:cover;background-position:center;`;
    }
    if (b.variant === "split") {
      return `<section class="hero-split" style="${bgCss}border-radius:12px;padding:64px 32px;margin:24px 0;">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center;max-width:1200px;margin:0 auto;">
    <div style="color:${b.color || "#0f172a"};">
      <h1 style="font-size:48px;font-weight:800;margin:0 0 16px;">${escapeHtml(b.content)}</h1>
      <p style="font-size:18px;opacity:0.85;margin:0 0 24px;">${escapeHtml(b.subtitle || "")}</p>
      <a href="${escapeHtml(b.buttonUrl || "#")}" style="display:inline-block;padding:14px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">${escapeHtml(b.buttonText || "Get Started")}</a>
    </div>
    ${b.imageUrl ? `<img src="${escapeHtml(b.imageUrl)}" alt="" style="width:100%;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.15);" />` : ""}
  </div>
</section>`;
    }
    return `<section class="hero" style="${bgCss}border-radius:12px;padding:96px 32px;margin:24px 0;text-align:center;">
  <h1 style="font-size:64px;font-weight:800;line-height:1.1;margin:0 0 16px;color:${b.color || "#0f172a"};">${escapeHtml(b.content)}</h1>
  <p style="font-size:20px;max-width:640px;margin:0 auto 32px;color:${b.color || "#0f172a"};opacity:0.85;">${escapeHtml(b.subtitle || "")}</p>
  ${b.buttonText ? `<a href="${escapeHtml(b.buttonUrl || "#")}" style="display:inline-block;padding:16px 32px;background:#fff;color:#111;border-radius:8px;text-decoration:none;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,0.15);">${escapeHtml(b.buttonText)}</a>` : ""}
</section>`;
  }
  if (b.type === "features") {
    const items = (b.items || [])
      .map(
        (it) =>
          `<div style="background:#fff;padding:24px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.05);"><div style="font-size:36px;margin-bottom:12px;">${it.icon || ""}</div><h3 style="font-size:20px;font-weight:700;margin:0 0 8px;color:#111;">${escapeHtml(it.title)}</h3><p style="color:#475569;margin:0;">${escapeHtml(it.desc)}</p></div>`
      )
      .join("");
    return `<section style="background:${b.bgColor || "#fff"};padding:64px 32px;border-radius:12px;margin:24px 0;">
  <div style="text-align:center;margin-bottom:40px;">
    <h2 style="font-size:36px;font-weight:800;margin:0 0 12px;color:${b.color || "#0f172a"};">${escapeHtml(b.content)}</h2>
    <p style="font-size:18px;opacity:0.7;color:${b.color || "#0f172a"};">${escapeHtml(b.subtitle || "")}</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1100px;margin:0 auto;">${items}</div>
</section>`;
  }
  if (b.type === "cta") {
    const bgCss = b.bgColor?.startsWith("linear-gradient") ? `background-image:${b.bgColor};` : `background:${b.bgColor || "#2563eb"};`;
    return `<section style="${bgCss}padding:64px 32px;border-radius:12px;margin:24px 0;text-align:center;color:${b.color || "#fff"};">
  <h2 style="font-size:36px;font-weight:800;margin:0 0 12px;">${escapeHtml(b.content)}</h2>
  <p style="font-size:18px;margin:0 0 24px;opacity:0.9;">${escapeHtml(b.subtitle || "")}</p>
  ${b.buttonText ? `<a href="${escapeHtml(b.buttonUrl || "#")}" style="display:inline-block;padding:16px 32px;background:#fff;color:#2563eb;border-radius:8px;text-decoration:none;font-weight:700;">${escapeHtml(b.buttonText)}</a>` : ""}
</section>`;
  }
  if (b.type === "footer") {
    return `<footer style="background:${b.bgColor || "#0f172a"};padding:40px 32px;border-radius:12px;margin:24px 0;text-align:center;color:${b.color || "#94a3b8"};">
  <p style="font-weight:600;margin:0 0 8px;">${escapeHtml(b.content)}</p>
  <p style="font-size:14px;opacity:0.8;margin:0;">${escapeHtml(b.subtitle || "")}</p>
</footer>`;
  }
  return "";
}

function pageBgCss(page: Page): string {
  const bg = BACKGROUNDS.find((b) => b.id === page.background) || BACKGROUNDS[21];
  return bg.type === "image"
    ? `background-image:url('${bg.value}');background-size:cover;background-position:center;`
    : bg.type === "gradient"
    ? `background-image:${bg.value};`
    : `background-color:${bg.value};`;
}

function renderNavBar(pages: Page[], activeId: string): string {
  if (pages.length <= 1) return "";
  const links = pages
    .map((p) => {
      const isActive = p.id === activeId;
      const slug = p.id === pages[0].id ? "index" : pageSlug(p);
      return `<a href="${slug}.html" style="padding:10px 18px;border-radius:8px;font-weight:600;text-decoration:none;transition:all 0.2s;${isActive ? "background:#2563eb;color:#fff;" : "color:#374151;"}">${escapeHtml(p.name)}</a>`;
    })
    .join("");
  return `<nav style="position:sticky;top:0;z-index:40;background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);box-shadow:0 1px 3px rgba(0,0,0,0.05);border-bottom:1px solid #e5e7eb;">
  <div style="max-width:1200px;margin:0 auto;padding:12px 24px;display:flex;gap:8px;overflow-x:auto;">${links}</div>
</nav>`;
}

function pageSlug(p: Page): string {
  return p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || p.id;
}

// ------------ Brand & Meta Properties ------------
const META_PROPERTIES = {
  organization: "CORE GROUP OF COMPANY",
  parentCompany: "Nexura",
  author: "Muhammad Taqi",
  builderName: "WEB BUILDER",
  builderCredit: "Built with WEB BUILDER — Created and Owned by Muhammad Taqi",
  themeColor: "#2563eb",
  organizationUrl: "https://wwwz.oneapp.dev/",
  parentUrl: "https://www0.oneapp.dev/",
  socialLinks: {
    facebook: "https://www.facebook.com/profile.php?id=61564542980463",
    instagram: "https://www.instagram.com/muhammad_taqi_king/",
    tiktok: "https://www.tiktok.com/@muhammad_taqi_king",
    youtube1: "https://www.youtube.com/@king12597",
    youtube2: "https://www.youtube.com/@MuhammadTaqi-w6t",
  },
};

// Get the first plain-text content from blocks for description
function extractDescription(page: Page, max = 160): string {
  for (const b of page.blocks) {
    if ((b.type === "text" || b.type === "heading" || b.type === "hero") && b.content) {
      const txt = b.content.trim();
      if (txt) return txt.length > max ? txt.slice(0, max - 1) + "…" : txt;
    }
    if (b.subtitle) {
      const txt = b.subtitle.trim();
      if (txt) return txt.length > max ? txt.slice(0, max - 1) + "…" : txt;
    }
  }
  return `${page.name} — ${META_PROPERTIES.builderCredit}`;
}

// Get the first image URL from blocks (for og:image)
function extractImage(page: Page): string {
  for (const b of page.blocks) {
    if (b.imageUrl) return b.imageUrl;
  }
  // fallback to background image if it's an image background
  const bg = BACKGROUNDS.find((b) => b.id === page.background);
  if (bg && bg.type === "image") return bg.value as string;
  return "";
}

function buildMetaTags(opts: {
  title: string;
  description: string;
  pageName: string;
  siteName: string;
  image?: string;
  url?: string;
}): string {
  const { title, description, siteName, image, url } = opts;
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeSite = escapeHtml(siteName);
  const ogImage = image ? `\n  <meta property="og:image" content="${escapeHtml(image)}">\n  <meta name="twitter:image" content="${escapeHtml(image)}">` : "";
  const canonical = url ? `\n  <link rel="canonical" href="${escapeHtml(url)}">` : "";

  // Schema.org JSON-LD with full organization + person + sameAs links
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "name": siteName,
        "description": description,
        "publisher": { "@id": "#organization" },
        "author": { "@id": "#author" },
      },
      {
        "@type": "Organization",
        "@id": "#organization",
        "name": META_PROPERTIES.organization,
        "url": META_PROPERTIES.organizationUrl,
        "parentOrganization": {
          "@type": "Organization",
          "name": META_PROPERTIES.parentCompany,
          "url": META_PROPERTIES.parentUrl,
        },
        "sameAs": Object.values(META_PROPERTIES.socialLinks),
        "founder": { "@id": "#author" },
      },
      {
        "@type": "Person",
        "@id": "#author",
        "name": META_PROPERTIES.author,
        "jobTitle": "Founder & Developer",
        "worksFor": { "@id": "#organization" },
        "sameAs": Object.values(META_PROPERTIES.socialLinks),
      },
    ],
  };

  return `  <!-- Primary Meta Tags -->
  <meta name="title" content="${safeTitle}">
  <meta name="description" content="${safeDesc}">
  <meta name="author" content="${escapeHtml(META_PROPERTIES.author)}">
  <meta name="generator" content="${escapeHtml(META_PROPERTIES.builderName)}">
  <meta name="publisher" content="${escapeHtml(META_PROPERTIES.organization)}">
  <meta name="copyright" content="© ${new Date().getFullYear()} ${escapeHtml(META_PROPERTIES.organization)} — ${escapeHtml(META_PROPERTIES.author)}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="${META_PROPERTIES.themeColor}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:site_name" content="${safeSite}">
  <meta property="og:locale" content="en_US">${ogImage}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:creator" content="@muhammad_taqi_king">

  <!-- Organization & Author -->
  <meta name="organization" content="${escapeHtml(META_PROPERTIES.organization)}">
  <meta name="parent-organization" content="${escapeHtml(META_PROPERTIES.parentCompany)}">

  <!-- Social profile links (machine-readable) -->
  <link rel="me" href="${META_PROPERTIES.socialLinks.facebook}">
  <link rel="me" href="${META_PROPERTIES.socialLinks.instagram}">
  <link rel="me" href="${META_PROPERTIES.socialLinks.tiktok}">
  <link rel="me" href="${META_PROPERTIES.socialLinks.youtube1}">
  <link rel="me" href="${META_PROPERTIES.socialLinks.youtube2}">
  <link rel="author" href="${META_PROPERTIES.parentUrl}">${canonical}

  <!-- Structured Data (Schema.org) -->
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

// Auto-generated footer HTML with credit + social links
function buildBrandFooter(): string {
  const s = META_PROPERTIES.socialLinks;
  return `<footer style="margin-top:48px;padding:32px 24px;background:#0f172a;color:#cbd5e1;text-align:center;border-radius:12px;font-family:-apple-system,sans-serif;">
  <div style="max-width:800px;margin:0 auto;">
    <div style="font-size:14px;margin-bottom:14px;opacity:0.9;">
      Powered by <strong style="color:#fff;">${escapeHtml(META_PROPERTIES.builderName)}</strong> ·
      Created &amp; Owned by <a href="${META_PROPERTIES.parentUrl}" target="_blank" rel="noopener" style="color:#60a5fa;text-decoration:none;font-weight:600;">${escapeHtml(META_PROPERTIES.author)}</a>
    </div>
    <div style="font-size:12px;margin-bottom:18px;opacity:0.7;">
      <a href="${META_PROPERTIES.organizationUrl}" target="_blank" rel="noopener" style="color:#cbd5e1;text-decoration:none;">${escapeHtml(META_PROPERTIES.organization)}</a>
      ·
      <a href="${META_PROPERTIES.parentUrl}" target="_blank" rel="noopener" style="color:#cbd5e1;text-decoration:none;">${escapeHtml(META_PROPERTIES.parentCompany)}</a>
    </div>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:14px;">
      <a href="${s.facebook}" target="_blank" rel="noopener" title="Facebook" style="color:#cbd5e1;text-decoration:none;font-size:13px;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid #334155;border-radius:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
        Facebook
      </a>
      <a href="${s.instagram}" target="_blank" rel="noopener" title="Instagram" style="color:#cbd5e1;text-decoration:none;font-size:13px;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid #334155;border-radius:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.18 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.18 8.8 2.16 12 2.16zm0-2.16C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg>
        Instagram
      </a>
      <a href="${s.tiktok}" target="_blank" rel="noopener" title="TikTok" style="color:#cbd5e1;text-decoration:none;font-size:13px;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid #334155;border-radius:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.84a8.16 8.16 0 0 0 4.77 1.52V6.91a4.85 4.85 0 0 1-1.84-.22z"/></svg>
        TikTok
      </a>
      <a href="${s.youtube1}" target="_blank" rel="noopener" title="YouTube — King" style="color:#cbd5e1;text-decoration:none;font-size:13px;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid #334155;border-radius:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2c-.3-1-1.1-1.8-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5c-1 .3-1.8 1.1-2.1 2.1C0 8 0 12 0 12s0 4 .5 5.8c.3 1 1.1 1.8 2.1 2.1 1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5c1-.3 1.8-1.1 2.1-2.1.5-1.8.5-5.8.5-5.8s0-4-.5-5.8zM9.6 15.6V8.4l6.4 3.6-6.4 3.6z"/></svg>
        YouTube
      </a>
      <a href="${s.youtube2}" target="_blank" rel="noopener" title="YouTube — Muhammad Taqi" style="color:#cbd5e1;text-decoration:none;font-size:13px;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid #334155;border-radius:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2c-.3-1-1.1-1.8-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5c-1 .3-1.8 1.1-2.1 2.1C0 8 0 12 0 12s0 4 .5 5.8c.3 1 1.1 1.8 2.1 2.1 1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5c1-.3 1.8-1.1 2.1-2.1.5-1.8.5-5.8.5-5.8s0-4-.5-5.8zM9.6 15.6V8.4l6.4 3.6-6.4 3.6z"/></svg>
        YouTube 2
      </a>
    </div>
    <div style="font-size:11px;opacity:0.5;margin-top:8px;">
      © ${new Date().getFullYear()} ${escapeHtml(META_PROPERTIES.organization)} — All rights reserved.
    </div>
  </div>
</footer>`;
}

function generateHtml(data: SiteData, siteName: string = "My Website"): string {
  const norm = normalizeSite(data);
  const brandFooter = buildBrandFooter();

  // ---- Single-page output ----
  if (norm.pages.length === 1) {
    const page = norm.pages[0];
    const blocksHtml = page.blocks.map(blockToHtml).join("\n");
    const title = `${siteName}`;
    const description = extractDescription(page);
    const image = extractImage(page);
    const metaTags = buildMetaTags({ title, description, pageName: page.name, siteName, image });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
${metaTags}
</head>
<body style="${pageBgCss(page)}margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;">
<div style="max-width:1200px;margin:0 auto;padding:32px 24px;">
${blocksHtml}
${brandFooter}
</div>
</body>
</html>`;
  }

  // ---- Multi-page output: single HTML, JS-swapped sections ----
  const homePage = norm.pages[0];
  const title = `${siteName}`;
  const description = extractDescription(homePage);
  const image = extractImage(homePage);
  const metaTags = buildMetaTags({ title, description, pageName: homePage.name, siteName, image });

  const pageSections = norm.pages
    .map(
      (p, i) =>
        `<section data-page="${p.id}" style="display:${i === 0 ? "block" : "none"};${pageBgCss(p)}min-height:100vh;"><div style="max-width:1200px;margin:0 auto;padding:32px 24px;">${p.blocks.map(blockToHtml).join("\n")}${i === norm.pages.length - 1 ? brandFooter : ""}</div></section>`
    )
    .join("\n");

  const navLinks = norm.pages
    .map(
      (p, i) =>
        `<a href="#" data-target="${p.id}" class="nav-link" style="padding:10px 18px;border-radius:8px;font-weight:600;text-decoration:none;cursor:pointer;${i === 0 ? "background:#2563eb;color:#fff;" : "color:#374151;"}">${escapeHtml(p.name)}</a>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
${metaTags}
<style>
*{box-sizing:border-box;}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
.nav-link:hover{opacity:0.85;}
</style>
</head>
<body>
<nav style="position:sticky;top:0;z-index:40;background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);box-shadow:0 1px 3px rgba(0,0,0,0.05);border-bottom:1px solid #e5e7eb;">
  <div style="max-width:1200px;margin:0 auto;padding:12px 24px;display:flex;gap:8px;overflow-x:auto;">${navLinks}</div>
</nav>
${pageSections}
<script>
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = link.dataset.target;
    document.querySelectorAll('section[data-page]').forEach(s => {
      s.style.display = s.dataset.page === target ? 'block' : 'none';
    });
    document.querySelectorAll('.nav-link').forEach(l => {
      if (l.dataset.target === target) {
        l.style.background = '#2563eb'; l.style.color = '#fff';
      } else {
        l.style.background = 'transparent'; l.style.color = '#374151';
      }
    });
    window.scrollTo(0, 0);
  });
});
</script>
</body>
</html>`;
}

// ------------ Backend Project Generator ------------
function generateBackendProject(data: SiteData, siteName: string = "My Website"): Record<string, string> {
  const norm = normalizeSite(data);
  const brandFooter = buildBrandFooter();

  const buildPageHtml = (page: Page, isHome: boolean) => {
    const blocksHtml = page.blocks.map(blockToHtml).join("\n");
    const navHtml = renderNavBar(norm.pages, page.id);
    const title = isHome ? siteName : `${page.name} — ${siteName}`;
    const description = extractDescription(page);
    const image = extractImage(page);
    const metaTags = buildMetaTags({ title, description, pageName: page.name, siteName, image });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
${metaTags}
  <link rel="stylesheet" href="/styles.css" />
</head>
<body style="${pageBgCss(page)}">
  ${navHtml}
  <div class="container">
${blocksHtml}
${brandFooter}
  </div>
  <script src="/script.js"></script>
</body>
</html>`;
  };

  const stylesCss = `* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
}
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}
@media (max-width: 768px) {
  .hero-split > div { grid-template-columns: 1fr !important; }
  section[style*="grid-template-columns:repeat(3"] > div:last-child { grid-template-columns: 1fr !important; }
  h1 { font-size: 40px !important; }
  h2 { font-size: 28px !important; }
}
a { transition: opacity 0.2s, transform 0.2s; }
a:hover { opacity: 0.9; transform: translateY(-1px); }
`;

  const scriptJs = `// Frontend script
console.log("Website loaded successfully!");

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Track button clicks (sends to backend /api/track)
document.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'click', href: link.href, time: Date.now() })
    }).catch(() => {});
  });
});
`;

  const serverJs = `// Node.js + Express backend
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: track click events
app.post('/api/track', (req, res) => {
  const log = { ...req.body, ip: req.ip, ua: req.get('user-agent') };
  console.log('[TRACK]', log);
  // Append to events.log
  fs.appendFile(
    path.join(__dirname, 'events.log'),
    JSON.stringify(log) + '\\n',
    () => {}
  );
  res.json({ ok: true });
});

// API: contact form (example)
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  console.log('[CONTACT]', { name, email, message });
  res.json({ ok: true, message: 'Thanks for contacting us!' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(\`✓ Server running at http://localhost:\${PORT}\`);
});
`;

  const packageJson = `{
  "name": "my-website-backend",
  "version": "1.0.0",
  "description": "Website generated by Web Builder with Node.js backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.19.2"
  },
  "engines": {
    "node": ">=18"
  }
}
`;

  const readme = `# My Website (Full-Stack)

This project was generated by **Web Builder**. It includes a static HTML/CSS/JS frontend and a Node.js + Express backend.

## 📁 Project Structure

\`\`\`
my-website-backend/
├── public/
│   ├── index.html      # Your website
│   ├── styles.css      # Styles
│   └── script.js       # Frontend JavaScript
├── server.js           # Node.js + Express backend
├── package.json
└── README.md
\`\`\`

## 🚀 Quick Start

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Run the server:**
   \`\`\`bash
   npm start
   \`\`\`

3. **Open in browser:**
   \`\`\`
   http://localhost:3000
   \`\`\`

## 🔌 Available API Endpoints

- \`GET  /\`            → Your website (index.html)
- \`POST /api/track\`   → Tracks click events (logged to events.log)
- \`POST /api/contact\` → Contact form handler ({ name, email, message })
- \`GET  /api/health\`  → Health check

## 🌍 Deployment

This works on any Node.js host:

- **Vercel:** \`vercel\`
- **Render:** Push to GitHub, create a Web Service
- **Railway:** \`railway up\`
- **Heroku:** \`git push heroku main\`
- **VPS:** \`pm2 start server.js\`

## ✏️ Customizing

- Edit **public/index.html** to change content
- Edit **public/styles.css** for styling
- Edit **public/script.js** for frontend logic
- Edit **server.js** to add new API routes
`;

  const gitignore = `node_modules/
events.log
.env
.DS_Store
`;

  // Generate one HTML file per page
  const files: Record<string, string> = {
    "public/styles.css": stylesCss,
    "public/script.js": scriptJs,
    "server.js": serverJs,
    "package.json": packageJson,
    "README.md": readme,
    ".gitignore": gitignore,
  };
  norm.pages.forEach((page, i) => {
    const filename = i === 0 ? "index.html" : `${pageSlug(page)}.html`;
    files[`public/${filename}`] = buildPageHtml(page, i === 0);
  });

  // robots.txt
  files["public/robots.txt"] = `User-agent: *
Allow: /
Sitemap: /sitemap.xml
`;

  // sitemap.xml
  const today = new Date().toISOString().split("T")[0];
  const urls = norm.pages
    .map((p, i) => {
      const path = i === 0 ? "/" : `/${pageSlug(p)}.html`;
      return `  <url>
    <loc>${path}</loc>
    <lastmod>${today}</lastmod>
    <priority>${i === 0 ? "1.0" : "0.8"}</priority>
  </url>`;
    })
    .join("\n");
  files["public/sitemap.xml"] = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  // PWA manifest with brand colors
  files["public/manifest.webmanifest"] = JSON.stringify(
    {
      name: siteName,
      short_name: siteName,
      description: extractDescription(norm.pages[0]),
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: META_PROPERTIES.themeColor,
      icons: [],
      author: META_PROPERTIES.author,
      publisher: META_PROPERTIES.organization,
    },
    null,
    2
  );

  // humans.txt — credits file
  files["public/humans.txt"] = `/* TEAM */
  Owner & Developer: ${META_PROPERTIES.author}
  Organization: ${META_PROPERTIES.organization}
  Parent Company: ${META_PROPERTIES.parentCompany}

/* CONTACT */
  Facebook:  ${META_PROPERTIES.socialLinks.facebook}
  Instagram: ${META_PROPERTIES.socialLinks.instagram}
  TikTok:    ${META_PROPERTIES.socialLinks.tiktok}
  YouTube:   ${META_PROPERTIES.socialLinks.youtube1}
  YouTube 2: ${META_PROPERTIES.socialLinks.youtube2}

/* SITE */
  Last update: ${today}
  Built with: ${META_PROPERTIES.builderName}
  Generator URL: ${META_PROPERTIES.organizationUrl}
`;

  return files;
}

// ------------ AI Command Parser ------------
// Parses commands like:
//   title: My Site
//   text: Hello world
//   button; name; Click Me; link; https://example.com
//   background: image | https://...
//   background: color | #ff0000
//   download / preview / live url
type AIAction = "download" | "preview" | "liveurl";

function parseAICommands(input: string): {
  blocks: Block[];
  background: string | null;
  actions: AIAction[];
  log: string[];
} {
  const blocks: Block[] = [];
  let background: string | null = null;
  const actions: AIAction[] = [];
  const log: string[] = [];

  // Split into lines (also handle ; followed by another keyword on same line)
  // Strategy: split on newlines, then for each line, also check if it contains
  // another keyword starting (e.g. "title; MT king text; mt king")
  const KEYWORDS = ["title", "text", "paragraph", "hero", "image", "button", "background", "bg", "download", "preview", "live url", "liveurl", "live"];

  const rawLines = input.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const lines: string[] = [];

  for (const line of rawLines) {
    // Try to detect a second keyword later in the same line and split it
    // Match positions of " keyword" (space + keyword + : or ;)
    const lower = line.toLowerCase();
    const splits: number[] = [0];
    for (let i = 1; i < line.length; i++) {
      if (line[i - 1] === " " || line[i - 1] === ";" || line[i - 1] === ",") {
        for (const kw of KEYWORDS) {
          if (lower.startsWith(kw, i)) {
            const after = lower[i + kw.length];
            if (after === ":" || after === ";") {
              splits.push(i);
              break;
            }
          }
        }
      }
    }
    splits.push(line.length);
    for (let i = 0; i < splits.length - 1; i++) {
      const seg = line.slice(splits[i], splits[i + 1]).trim().replace(/^[,;]+/, "").trim();
      if (seg) lines.push(seg);
    }
  }

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Action keywords (no value)
    if (lower === "download" || lower === "download:" || lower === "download;") {
      actions.push("download");
      log.push("✓ Will download HTML code");
      continue;
    }
    if (lower === "preview" || lower === "preview:" || lower === "preview;") {
      actions.push("preview");
      log.push("✓ Will open preview");
      continue;
    }
    if (lower === "live url" || lower === "liveurl" || lower === "live" || lower.startsWith("live url") || lower.startsWith("liveurl")) {
      actions.push("liveurl");
      log.push("✓ Will generate live URL");
      continue;
    }

    // Match "keyword:value" or "keyword;value"
    const m = line.match(/^([a-zA-Z ]+?)\s*[:;]\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    const value = m[2].trim();

    if (key === "title" || key === "heading" || key === "hero") {
      blocks.push({
        id: uid(),
        type: "heading",
        content: value,
        align: "center",
        color: "#111827",
      });
      log.push(`✓ Added heading: "${value}"`);
    } else if (key === "text" || key === "paragraph" || key === "para") {
      blocks.push({
        id: uid(),
        type: "text",
        content: value,
        align: "left",
        color: "#374151",
      });
      log.push(`✓ Added text: "${value}"`);
    } else if (key === "button" || key === "btn" || key === "link") {
      // Format: "button; name; Hello World; link; https://..."
      // value at this point may be "name; Hello World; link; https://..."
      // OR "Hello World" (just the label)
      // OR "Hello World | https://..."
      let name = value;
      let url = "https://example.com";

      // Try "| " separator
      if (value.includes("|")) {
        const parts = value.split("|").map((p) => p.trim());
        name = parts[0];
        url = parts[1] || url;
      } else {
        // Try parsing "name; X; link; Y" sub-commands
        const parts = value.split(";").map((p) => p.trim()).filter(Boolean);
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i].toLowerCase();
          if (p === "name" && parts[i + 1]) {
            name = parts[i + 1];
            i++;
          } else if ((p === "link" || p === "url" || p === "href") && parts[i + 1]) {
            url = parts[i + 1];
            i++;
          } else if (i === 0) {
            name = parts[i];
          } else if (i === 1 && /^https?:\/\//i.test(parts[i])) {
            url = parts[i];
          }
        }
      }

      // Resolve common shortcut names to URLs
      url = resolveUrlShortcut(url);

      blocks.push({
        id: uid(),
        type: "linkbtn",
        content: name,
        url,
        align: "left",
        color: "#2563eb",
      });
      log.push(`✓ Added button: "${name}" → ${url}`);
    } else if (key === "background" || key === "bg") {
      // value examples: "image", "image | url", "color | #ff0000", "navy", "mint"
      const v = value.toLowerCase().trim();
      if (v === "image" || v.startsWith("image")) {
        // check if URL provided
        const urlMatch = value.match(/https?:\/\/\S+/);
        if (urlMatch) {
          // add to BACKGROUNDS dynamically (use bg-clock as fallback id, but inject into list)
          // simplest: replace bg-clock entry value
          BACKGROUNDS[0] = { id: "bg-clock", type: "image", value: urlMatch[0] };
          background = "bg-clock";
        } else {
          background = "bg-clock";
        }
        log.push(`✓ Set background image`);
      } else if (v.startsWith("color") || v.startsWith("#")) {
        const colorMatch = value.match(/#[0-9a-fA-F]{3,6}/);
        if (colorMatch) {
          BACKGROUNDS[1] = { id: "bg-white", type: "color", value: colorMatch[0] };
          background = "bg-white";
          log.push(`✓ Set background color: ${colorMatch[0]}`);
        }
      } else {
        // try to match a named background
        const named: Record<string, string> = {
          white: "bg-white",
          navy: "bg-navy",
          light: "bg-light",
          gray: "bg-gray",
          cream: "bg-cream",
          mint: "bg-mint",
          pink: "bg-pink",
          purple: "bg-grad1",
          sunset: "bg-grad2",
          ocean: "bg-grad3",
          green: "bg-grad4",
        };
        if (named[v]) {
          background = named[v];
          log.push(`✓ Set background: ${v}`);
        }
      }
    }
  }

  return { blocks, background, actions, log };
}

function resolveUrlShortcut(name: string): string {
  const n = name.toLowerCase().trim();
  const map: Record<string, string> = {
    deepseek: "https://www.deepseek.com",
    chatgpt: "https://chat.openai.com",
    openai: "https://openai.com",
    google: "https://www.google.com",
    youtube: "https://www.youtube.com",
    facebook: "https://www.facebook.com",
    instagram: "https://www.instagram.com",
    twitter: "https://www.twitter.com",
    github: "https://github.com",
    claude: "https://claude.ai",
    gemini: "https://gemini.google.com",
  };
  if (map[n]) return map[n];
  // If it looks like a URL or starts with http, return it
  if (/^https?:\/\//i.test(name)) return name;
  // If it has a dot, prepend https
  if (/\.\w{2,}/.test(name) && !name.includes(" ")) return `https://${name}`;
  return name;
}

// ------------ AI Block Modal ------------
function AIBlockModal({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (blocks: Block[], background: string | null, actions: AIAction[]) => void;
}) {
  const [input, setInput] = useState(
    `title: Welcome to My Site
text: I am very happy today
button; name; Hello World; link; deepseek
background: image
preview`
  );
  const [log, setLog] = useState<string[]>([]);

  const runCommand = () => {
    const result = parseAICommands(input);
    if (result.blocks.length === 0 && !result.background && result.actions.length === 0) {
      setLog(["⚠ No valid commands found. Check the Tips for syntax."]);
      return;
    }
    setLog(result.log);
    onApply(result.blocks, result.background, result.actions);
    setTimeout(() => onClose(), 800);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">AI Block Builder</h2>
            <p className="text-sm text-gray-500">Write commands to build your website</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-xs text-amber-900">
          <strong>Quick example:</strong> <code>title: My Site</code>, <code>text: Hello</code>,{" "}
          <code>button; name; Click; link; deepseek</code>, <code>background: image</code>,{" "}
          <code>download</code>, <code>preview</code>, <code>live url</code>
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full h-56 p-4 border-2 border-gray-200 rounded-xl font-mono text-sm focus:border-purple-500 focus:outline-none"
          placeholder={`title: My Website\ntext: Hello world\nbutton; name; Click Me; link; deepseek\nbackground: image\ndownload`}
        />

        {log.length > 0 && (
          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm space-y-1 max-h-32 overflow-auto">
            {log.map((l, i) => (
              <div key={i} className="text-gray-700">
                {l}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={runCommand}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-bold py-3 rounded-xl"
          >
            ✨ RUN AI COMMAND
          </button>
          <button
            onClick={onClose}
            className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------ Tips Modal ------------
function TipsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.4 1 2.3h6c0-.9.3-1.7 1-2.3A7 7 0 0 0 12 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">Tips & Command Guide</h2>
            <p className="text-sm text-gray-500">Complete reference for the AI Block</p>
          </div>
        </div>

        <div className="space-y-5 text-sm">
          <Tip title="📝 How it works">
            Type <strong>commands</strong> in the AI Block, one per line. Each command starts with a{" "}
            <strong>keyword</strong> followed by <code>:</code> or <code>;</code> and the value. The AI
            will read your commands and add the matching blocks to your website.
          </Tip>

          <Tip title="🔤 Case-insensitive & flexible separators">
            Keywords work in <strong>uppercase, lowercase, or mixed case</strong>. You can use either{" "}
            <code>:</code> or <code>;</code> as the separator.
            <CodeBlock>{`title: MT king
TITLE; MT king
text: I am very sad
TEXT; mt king`}</CodeBlock>
          </Tip>

          <Tip title="🅰️ Heading / Title">
            Adds a big bold heading. Keywords: <code>title</code>, <code>heading</code>, <code>hero</code>.
            <CodeBlock>{`title: MT king
heading: Welcome to my site
hero: I am very sad`}</CodeBlock>
          </Tip>

          <Tip title="📃 Text / Paragraph">
            Adds a paragraph of text. Keywords: <code>text</code>, <code>paragraph</code>, <code>para</code>.
            <CodeBlock>{`text: I am very sad today
paragraph: This is my story`}</CodeBlock>
          </Tip>

          <Tip title="🔘 Button (with name + link)">
            Adds a clickable button. Format:{" "}
            <code>button; name; LABEL; link; URL_OR_NAME</code>
            <br />
            Or short form: <code>button: LABEL | URL</code>
            <CodeBlock>{`button; name; Hello World; link; deepseek
button; name; Visit ChatGPT; link; chatgpt
button: Click Me | https://google.com`}</CodeBlock>
            <p className="mt-2 text-xs text-gray-600">
              <strong>Shortcut names supported:</strong> deepseek, chatgpt, openai, google, youtube,
              facebook, instagram, twitter, github, claude, gemini
            </p>
          </Tip>

          <Tip title="🎨 Background">
            Set the page background. Use <code>image</code>, a named color, or a hex color.
            <CodeBlock>{`background: image
background: image | https://example.com/photo.jpg
background: navy
background: mint
background: color | #ff5500`}</CodeBlock>
            <p className="mt-2 text-xs text-gray-600">
              <strong>Named backgrounds:</strong> white, navy, light, gray, cream, mint, pink, purple,
              sunset, ocean, green
            </p>
          </Tip>

          <Tip title="⚡ Action commands">
            These trigger an action after building:
            <CodeBlock>{`download    → Downloads the website as an HTML file
preview     → Opens the live preview popup
live url    → Generates a shareable live URL`}</CodeBlock>
          </Tip>

          <Tip title="🪄 Multiple commands on one line">
            If two commands are written on the same line, the AI is smart enough to split them when it
            detects a known keyword:
            <CodeBlock>{`title; MT king text; mt king
button; name; abc; link; chatgpt download`}</CodeBlock>
          </Tip>

          <Tip title="🚀 Full example (from your request)">
            Build a complete site, set an image background, and download — all at once:
            <CodeBlock>{`title: I am very sad
button; name; Hello World; link; deepseek
background: image
download`}</CodeBlock>
          </Tip>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-white font-bold py-3 rounded-xl"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}

function Tip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-amber-400 bg-amber-50/50 pl-4 py-2 rounded-r">
      <h4 className="font-bold text-gray-800 mb-1">{title}</h4>
      <div className="text-gray-700">{children}</div>
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-gray-900 text-green-300 text-xs p-3 rounded-lg mt-2 overflow-x-auto whitespace-pre-wrap font-mono">
      {children}
    </pre>
  );
}
