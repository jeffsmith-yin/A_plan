import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Common";
import { useT } from "../i18n";
import {
  isLoggedIn, logout, getCurrentUser, getRoles, getUserRoles,
  setCurrentRoleId, ROLE_LABELS,
} from "../data/store";

const NDAPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useT();
  const loggedIn = isLoggedIn();
  const user = getCurrentUser();
  const userRoles = loggedIn ? getUserRoles() : [];
  const allRoles = getRoles();

  const handleSelectRole = (roleId: string) => {
    setCurrentRoleId(roleId);
    navigate("/hub");
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  // 未登录状态：引导登录
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <span className="text-7xl">🌉</span>
          <h1 className="text-3xl font-bold text-gray-800 mt-6 mb-3">{t("app.name", "融智桥")}</h1>
          <p className="text-lg text-gray-500 mb-2">{t("app.tagline", "AI驱动的四方协作平台")}</p>
          <p className="text-sm text-gray-400 mb-8">{t("app.fourRoles", "行业专家 × AI人才 × 企业客户 × 平台方")}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate("/login")} size="lg">{t("nda.loginBtn", "📱 手机号登录/注册")}</Button>
          </div>
          <p className="text-xs text-gray-400 mt-6">{t("common.demoNote", "DEMO版本 · 数据仅本地存储")}</p>
        </div>
      </div>
    );
  }

  // 已登录：显示角色列表
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="text-5xl">🌉</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-3">{t("app.name", "融智桥")}</h1>
          <p className="text-gray-500 mt-1">
            {t("nda.welcome", "欢迎，")}{user?.name || user?.phone}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 text-center">
            {userRoles.length > 0 ? t("nda.chooseRole", "选择角色进入平台") : t("nda.noRole", "您还未注册角色")}
          </h3>

          {userRoles.length > 0 && (
            <div className="space-y-2 mb-6">
              {userRoles.map(r => {
                const meta = ROLE_LABELS[r.role];
                return (
                  <div key={r.id} onClick={() => handleSelectRole(r.id)}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-200 cursor-pointer hover:border-primary-300 hover:shadow transition-all">
                    <span className="text-2xl">{meta.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-800">{r.name}</div>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                        {r.title && <span className="text-xs text-gray-400">{r.title}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{r.score}分</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate("/onboarding")} variant="primary">
              {userRoles.length > 0 ? t("nda.registerNewRole", "📝 注册新角色") : t("nda.startOnboard", "🚀 开始入驻")}
            </Button>

            {userRoles.length > 0 && (
              <Button onClick={() => navigate("/hub")} variant="secondary">
                {t("nda.enterHub", "🏠 进入平台大厅")}
              </Button>
            )}

            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button onClick={handleLogout}
                className="flex-1 text-sm text-gray-500 hover:text-red-600 px-3 py-2 rounded-lg border border-gray-200 hover:border-red-300 transition-all">
                {t("common.logout", "🚪 退出登录")}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-gray-400">
          {t("nda.phoneNote", "DEMO版本 · 手机号 {phone} · 数据仅本地存储", { phone: user?.phone || "" })}
        </p>
      </div>
    </div>
  );
};

export default NDAPage;
