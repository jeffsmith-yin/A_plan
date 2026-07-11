import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, Button } from "../components/Common";
import {
  getCurrentUser, updatePerson, getCurrentPhone, getUserRoles,
  getDesensitizeRulesByOwner, addDesensitizeRule, deleteDesensitizeRule,
  ROLE_LABELS,
} from "../data/store";
import { useT } from "../i18n";

const ProfilePage: React.FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const phone = getCurrentPhone();
  const userRoles = getUserRoles();
  const [form, setForm] = useState({
    name: user?.name || "",
    phoneNum: user?.phoneNum || phone || "",
    wechat: user?.wechat || "",
    title: user?.title || "",
    intro: user?.intro || "",
  });
  const [saved, setSaved] = useState(false);

  // 汇总所有角色的脱敏规则
  const allDesensitizeRules = userRoles.flatMap(r => {
    const rules = getDesensitizeRulesByOwner(r.id);
    return rules.map(rule => ({ ...rule, roleName: r.name, roleType: r.role }));
  });

  const handleSave = () => {
    if (!form.name.trim()) { alert(t("profile.nameRequired", "姓名不能为空")); return; }
    updatePerson({
      name: form.name.trim(),
      phoneNum: form.phoneNum.trim(),
      wechat: form.wechat.trim(),
      title: form.title.trim(),
      intro: form.intro.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddDesensitize = (roleId: string) => {
    const original = prompt(t("profile.promptOriginal", "请输入原始公司名/敏感词："));
    if (!original) return;
    const replacement = prompt(t("profile.promptReplacement", "请输入替换后的名称（如：XX公司）："), "XX公司");
    if (!replacement) return;
    addDesensitizeRule({
      ownerId: roleId,
      personPhone: phone || "",
      original: original.trim(),
      replacement: replacement.trim(),
    });
    // 强制刷新
    window.location.reload();
  };

  const handleDeleteDesensitize = (id: string) => {
    if (!window.confirm(t("profile.confirmDeleteRule", "确定删除此脱敏规则？"))) return;
    deleteDesensitizeRule(id);
    window.location.reload();
  };

  if (!user) {
    return (
      <PageContainer title={t("profile.title", "个人设置")}>
        <div className="text-center py-16 text-gray-500">{t("profile.pleaseLogin", "请先登录")}</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={t("profile.title", "个人设置")}>
      <div className="max-w-2xl mx-auto">
        {/* 基本信息 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">👤</span>
            <div>
              <h2 className="font-bold text-lg text-gray-800">{t("profile.editInfo", "修改个人信息")}</h2>
              <p className="text-sm text-gray-500">{t("profile.phoneLabel", "手机号：{phone}", { phone })}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.name", "姓名 *")}</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.phoneNum", "联系电话")}</label>
                <input type="text" value={form.phoneNum} onChange={e => setForm({ ...form, phoneNum: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.wechat", "微信号")}</label>
                <input type="text" value={form.wechat} onChange={e => setForm({ ...form, wechat: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.titleField", "职务")}</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.intro", "个人介绍")}</label>
              <textarea value={form.intro} onChange={e => setForm({ ...form, intro: e.target.value })}
                rows={4} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => navigate(-1)} variant="secondary">{t("profile.back", "← 返回")}</Button>
              <Button onClick={handleSave} size="lg" disabled={!form.name.trim()}>
                {saved ? t("profile.saved", "✅ 已保存") : t("profile.save", "💾 保存修改")}
              </Button>
            </div>
          </div>
        </div>

        {/* 我的角色 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">{t("profile.myRoles", "📋 我的角色 ({n})", { n: userRoles.length })}</h3>
          {userRoles.length === 0 ? (
            <p className="text-sm text-gray-400">{t("profile.noRoles", "暂无角色，")}<button onClick={() => navigate("/onboarding")} className="text-primary-600 underline">{t("profile.registerLink", "去注册")}</button></p>
          ) : (
            <div className="space-y-2">
              {userRoles.map(r => {
                const meta = ROLE_LABELS[r.role];
                return (
                  <div key={r.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <span className="text-xl">{meta.icon}</span>
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">{r.name}</span>
                      <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                    </div>
                    <span className="text-xs text-gray-400">{r.score}{t("profile.scoreUnit", "分")}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 脱敏规则管理 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">{t("profile.desensitizeTitle", "🔒 文件脱敏规则")}</h3>
          <p className="text-sm text-gray-500 mb-4">{t("profile.desensitizeHint", "设置公司名/敏感词的自动替换规则，上传文件时自动生效")}</p>

          {allDesensitizeRules.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="mb-3">{t("profile.noRules", "暂无脱敏规则")}</p>
              <p className="text-xs">{t("profile.ruleHint", "企业客户和行业专家可在注册时设置，或联系平台方添加")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allDesensitizeRules.map(rule => (
                <div key={rule.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <div className="flex-1 text-sm">
                    <span className="text-gray-800">{rule.original}</span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="text-primary-600 font-medium">{rule.replacement}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{rule.roleName}</span>
                    <button onClick={() => handleDeleteDesensitize(rule.id)}
                      className="text-xs text-red-400 hover:text-red-600">{t("profile.delete", "删除")}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 为每个角色添加脱敏规则 */}
          <div className="mt-4 space-y-2">
            {userRoles.filter(r => ["enterprise", "expert"].includes(r.role)).map(r => (
              <button key={r.id} onClick={() => handleAddDesensitize(r.id)}
                className="text-sm text-green-700 hover:text-green-800 underline">
                {t("profile.addRule", "+ 为「{name}」添加脱敏规则", { name: r.name })}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => navigate("/hub")} variant="secondary">{t("profile.backHub", "← 返回大厅")}</Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default ProfilePage;
