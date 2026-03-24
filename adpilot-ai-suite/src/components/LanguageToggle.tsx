import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();

  return (
    <button
      onClick={() => setLang(lang === "en" ? "tr" : "en")}
      className="relative flex items-center h-7 w-[52px] rounded-full bg-surface-2 border border-border transition-colors hover:border-foreground/20 shrink-0"
      aria-label="Toggle language"
    >
      <span
        className={`absolute top-0.5 h-[22px] w-[24px] rounded-full bg-foreground transition-all duration-300 ${
          lang === "tr" ? "left-[26px]" : "left-0.5"
        }`}
      />
      <span
        className={`relative z-10 flex-1 text-center text-[10px] font-semibold tracking-wide transition-colors duration-300 ${
          lang === "en" ? "text-background" : "text-text-muted"
        }`}
      >
        EN
      </span>
      <span
        className={`relative z-10 flex-1 text-center text-[10px] font-semibold tracking-wide transition-colors duration-300 ${
          lang === "tr" ? "text-background" : "text-text-muted"
        }`}
      >
        TR
      </span>
    </button>
  );
}
