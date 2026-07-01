import { useLanguage } from "@/contexts/LanguageContext";

const LanguageToggle = () => {
  const { lang, setLang } = useLanguage();

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-muted/50 p-0.5 text-xs">
      <button
        onClick={() => setLang("en")}
        className={`px-2 py-0.5 rounded-sm font-medium transition-colors ${
          lang === "en"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang("ar")}
        className={`px-2 py-0.5 rounded-sm font-medium transition-colors ${
          lang === "ar"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        AR
      </button>
    </div>
  );
};

export default LanguageToggle;
