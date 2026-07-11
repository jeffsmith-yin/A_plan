import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { en } from "./en";
import { zhCN } from "./zhCN";

export type Lang = "zh-CN" | "en";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "zh-CN", label: "简体中文", flag: "🇨🇳" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

const STORAGE_KEY = "__rzq_lang__";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
}

const LanguageContext = createContext<LangCtx>({
  lang: "zh-CN",
  setLang: () => {},
  toggleLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "en" ? "en" : "zh-CN";
    } catch {
      return "zh-CN";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const toggleLang = () => setLangState((s) => (s === "en" ? "zh-CN" : "en"));

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LangCtx {
  return useContext(LanguageContext);
}

/**
 * 翻译函数。
 * - 英文模式：优先返回 en[key]，缺省时回退到内联 fallback（中文），再回退到 key。
 * - 中文模式：直接使用内联 fallback（即当前中文 UI 文案）。
 * 支持 {var} 占位符插值。
 */
export function useT() {
  const { lang } = useLang();
  return (
    key: string,
    fallback = "",
    vars?: Record<string, string | number>
  ): string => {
    let s: string;
    if (lang === "en") {
      s = en[key] ?? fallback ?? key;
    } else {
      s = fallback || zhCN[key] || key;
    }
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return s;
  };
}
