export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🌐' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', flag: '🕉️' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇦🇪' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳' },
];

// Memory cache for instant translations
const translationCache = new Map<string, string>();

/**
 * Dynamic Google Translate API Converter
 * Translates ANY text (custom temple titles, causes, devotee forms, announcements) into target language
 */
export async function translateDynamicText(text: string, targetLang: string): Promise<string> {
  if (!text || !text.trim() || targetLang === 'en') return text;

  const cacheKey = `${targetLang}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Translation API network failure");
    
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0].map((item: any) => item[0]).join('');
      if (translated) {
        translationCache.set(cacheKey, translated);
        return translated;
      }
    }
    return text;
  } catch (err) {
    console.warn("[GoogleTranslate] Translation fallback:", err);
    return text;
  }
}

/**
 * Recursively translates an entire Layout Zone structure dynamically using Google Translate
 */
export async function translateZoneContent(zone: any, targetLang: string): Promise<any> {
  if (!zone) return zone;

  const clone = JSON.parse(JSON.stringify(zone));

  const translateWidget = async (w: any) => {
    if (!w) return;
    if (w.type === 'donation' || w.type === 'donation_button') {
      if (w.donationTitle) w.donationTitle = await translateDynamicText(w.donationTitle, targetLang);
      if (w.donationPurpose) w.donationPurpose = await translateDynamicText(w.donationPurpose, targetLang);
      if (w.donationButtonText) w.donationButtonText = await translateDynamicText(w.donationButtonText, targetLang);
      if (w.customAmountLabel) w.customAmountLabel = await translateDynamicText(w.customAmountLabel, targetLang);

      if (Array.isArray(w.donationButtons)) {
        for (const btn of w.donationButtons) {
          if (btn.label) btn.label = await translateDynamicText(btn.label, targetLang);
          if (btn.description) btn.description = await translateDynamicText(btn.description, targetLang);
        }
      }
    }

    if (w.type === 'text') {
      if (w.text) w.text = await translateDynamicText(w.text, targetLang);
    }
  };

  const traverse = async (z: any) => {
    if (z.content) {
      await translateWidget(z.content);
    }
    if (z.children && Array.isArray(z.children)) {
      for (const child of z.children) {
        await traverse(child);
      }
    }
  };

  await traverse(clone);
  return clone;
}
