import React from "react";
import { useLang, LANGS } from "../i18n";

/** 全局语言切换器：显示在页面头部，支持简体中文 / English */
const LanguageSwitcher: React.FC = () => {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`text-xs px-2 py-1 rounded-md transition-all ${
            lang === l.code
              ? "bg-white text-primary-700 shadow-sm font-medium"
              : "text-gray-400 hover:text-gray-600"
          }`}
          title={l.label}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
