import React from "react";
import { useNavigate } from "react-router-dom";
import { useT } from "../i18n";
import LanguageSwitcher from "./LanguageSwitcher";

interface Props {
  children: React.ReactNode;
}

/** DEMO数据标注徽章 */
export const DemoBadge: React.FC = () => {
  const t = useT();
  return <span className="demo-badge">{t("common.demoData", "演示数据")}</span>;
};

/** 页面容器 */
export const PageContainer: React.FC<Props & { title?: string }> = ({
  children,
  title,
}) => {
  const navigate = useNavigate();
  const t = useT();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌉</span>
            <span className="font-bold text-lg text-gray-800">
              {t("app.name", "融智桥")}
            </span>
            <span className="text-xs text-gray-400 border border-gray-200 rounded px-2 py-0.5">
              {t("common.demo", "DEMO")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <DemoBadge />
            <span className="text-xs text-gray-400">
              {t("common.validUntil", "有效期至")} 2026-08-08
            </span>
          </div>
        </div>
      </header>
      {title && (
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-2 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-all"
            title={t("common.back", "返回")}
          >
            ← {t("common.back", "返回")}
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => navigate("/hub")}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-all"
            title={t("common.home", "首页")}
          >
            🏠 {t("common.home", "首页")}
          </button>
          <h1 className="text-2xl font-bold text-gray-800 ml-2">{title}</h1>
        </div>
      )}
      <main className="max-w-6xl mx-auto px-4 py-4">{children}</main>
    </div>
  );
};

/** 闯关进度条 */
export const ProgressBar: React.FC<{ current: number; total: number }> = ({
  current,
  total,
}) => (
  <div className="flex items-center gap-2 mb-8">
    {Array.from({ length: total }, (_, i) => (
      <React.Fragment key={i}>
        <div
          className={`progress-step ${
            i < current ? "done" : i === current ? "active" : "pending"
          }`}
        >
          {i < current ? "✓" : i + 1}
        </div>
        {i < total - 1 && (
          <div
            className={`flex-1 h-1 rounded ${
              i < current ? "bg-green-400" : "bg-gray-200"
            }`}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

/** 名片卡片 */
export const BusinessCard: React.FC<{
  avatar: string;
  name: string;
  title: string;
  tags?: string[];
  children?: React.ReactNode;
}> = ({ avatar, name, title: role, tags, children }) => (
  <div className="business-card">
    <div className="flex items-start gap-4">
      <div className="text-5xl">{avatar}</div>
      <div className="flex-1">
        <h3 className="text-xl font-bold text-gray-800">{name}</h3>
        <p className="text-primary-600 font-medium">{role}</p>
        {tags && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((t) => (
              <span
                key={t}
                className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        {children && <div className="mt-3 text-sm text-gray-600">{children}</div>}
      </div>
    </div>
  </div>
);

/** 统计卡片 */
export const StatCard: React.FC<{
  label: string;
  value: number | string;
  suffix?: string;
}> = ({ label, value, suffix }) => (
  <div className="stat-card text-center">
    <div className="stat-value">
      {value}
      {suffix && <span className="text-sm font-normal text-gray-400 ml-1">{suffix}</span>}
    </div>
    <div className="stat-label">{label}</div>
  </div>
);

/** 按钮 */
export const Button: React.FC<{
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ onClick, variant = "primary", size = "md", disabled, children }) => {
  const base =
    "rounded-xl font-medium transition-all inline-flex items-center gap-2";
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-200",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    outline: "border-2 border-primary-300 text-primary-700 hover:bg-primary-50",
  };
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {children}
    </button>
  );
};
