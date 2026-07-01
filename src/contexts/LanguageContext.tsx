import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "en" | "ar";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
  dir: "ltr",
});

export const useLanguage = () => useContext(LanguageContext);

// Lazy-load translations
import { translations } from "@/i18n/translations";

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = localStorage.getItem("edulink_lang");
    return stored === "ar" ? "ar" : "en";
  });

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem("edulink_lang", l);
  };

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [dir, lang]);

  const t = (key: string): string => {
    return translations[lang]?.[key] ?? translations.en?.[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};
