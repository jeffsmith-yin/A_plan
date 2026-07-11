import React, { useState, useEffect, useRef } from "react";
import { useT } from "../i18n";
import { useNavigate } from "react-router-dom";
import { PageContainer, Button } from "../components/Common";
import {
  RoleCard, RoleType, SecondaryRole, generateId, saveRole, setCurrentRoleId,
  getRoles, ensureDefaultPlatform, addReferralScore, isDuplicateReferral,
  getCurrentRole, getCurrentUser, getCurrentPhone, updatePerson,
  addDesensitizeRule, ROLE_LABELS, SCORE_RULES, isCurrentUserSuperAdmin,
  getPersons,
} from "../data/store";
import { generateIntro, getApiKey } from "../services/openai";

const ROLE_DESCS: Record<RoleType, { icon: string; label: string; desc: string }> = {
  platform: { icon: "🌉", label: "平台方", desc: "协调管理者，撮合三方、管理项目、把控质量。" },
  expert: { icon: "👤", label: "行业专家", desc: "20年+行业经验，为企业诊断问题、审核AI方案。" },
  ai: { icon: "🤖", label: "AI人才", desc: "技术实现者，将专家经验转化为可部署的AI方案" },
  enterprise: { icon: "🏢", label: "企业客户", desc: "提出需求、注入数据、验收AI解决方案成果" },
};

// 普通用户可选的三种角色（平台方由系统后台指定）
const USER_SELECTABLE_ROLES: RoleType[] = ["expert", "ai", "enterprise"];

const OnboardingPage: React.FC = () => {
  const t = useT();
  const [step, setStep] = useState<"info" | "choose" | "register" | "done">("info");
  const [personForm, setPersonForm] = useState({ name: "", phoneNum: "", wechat: "", title: "", intro: "" });
  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>([]);
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [secondaryRole, setSecondaryRole] = useState<SecondaryRole>(null);
  const [referrerId, setReferrerId] = useState<string>("");
  const [roleForm, setRoleForm] = useState({ name: "", phone: "", wechat: "", title: "", intro: "", tags: "" });
  const [error, setError] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [desensitizePairs, setDesensitizePairs] = useState<Array<{ original: string; replacement: string }>>([]);
  const introFileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const currentUser = getCurrentRole();
  const user = getCurrentUser();
  const phone = getCurrentPhone();
  const allRoles = getRoles();
  const isSuperAdmin = isCurrentUserSuperAdmin();
  const isFirstUser = getPersons().filter(p => !p.deleted).length <= 1;
  const showFirstUserTip = isSuperAdmin || isFirstUser;

  useEffect(() => {
    ensureDefaultPlatform();
    // 初始化个人信息
    if (user) {
      setPersonForm({
        name: user.name || "",
        phoneNum: user.phoneNum || phone || "",
        wechat: user.wechat || "",
        title: user.title || "",
        intro: user.intro || "",
      });
    }
  }, []);

  // 第一步：填写个人信息
  const handleSavePerson = () => {
    if (!personForm.name.trim()) { setError("请填写姓名"); return; }
    setError("");
    updatePerson({
      name: personForm.name.trim(),
      phoneNum: personForm.phoneNum.trim(),
      wechat: personForm.wechat.trim(),
      title: personForm.title.trim(),
      intro: personForm.intro.trim(),
    });
    setStep("choose");
  };

  // 第二步：多选角色
  const toggleRole = (role: RoleType) => {
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    setError("");
  };

  const startRegister = () => {
    // 仅超管或首用户可以不选角色，自动成为平台方
    if (selectedRoles.length === 0 && (isSuperAdmin || getPersons().filter(p => !p.deleted).length <= 1)) {
      setSelectedRoles(["platform"]);
      setCurrentRoleIndex(0);
      initRoleForm("platform");
      setStep("register");
      return;
    }
    if (selectedRoles.length === 0) { setError("请至少选择一个角色"); return; }
    setError("");
    setCurrentRoleIndex(0);
    const firstRole = selectedRoles[0];
    initRoleForm(firstRole);
    setStep("register");
  };

  // 超管直接成为平台方（按钮调用）
  const becomePlatform = () => {
    setSelectedRoles(["platform"]);
    setCurrentRoleIndex(0);
    initRoleForm("platform");
    setStep("register");
  };

  const initRoleForm = (role: RoleType) => {
    setSecondaryRole(null);
    setReferrerId("");
    setDesensitizePairs([]);
    const userName = personForm.name.trim();
    setRoleForm({
      name: userName,
      phone: personForm.phoneNum.trim(),
      wechat: personForm.wechat.trim(),
      title: personForm.title.trim(),
      intro: personForm.intro.trim(),
      tags: "",
    });
  };

  const canHaveSecondary = (role: RoleType): boolean => role === "platform" || role === "expert";

  const getSecondaryOptions = (role: RoleType): { v: SecondaryRole; label: string }[] => {
    if (role === "platform") return [
      { v: null, label: "仅平台管理" },
      { v: "expert", label: "👤 兼任行业专家" },
      { v: "ai", label: "🤖 兼任AI人才" },
      { v: "enterprise", label: "🏢 兼企业客户" },
    ];
    if (role === "expert") return [
      { v: null, label: "仅行业专家" },
      { v: "ai", label: "🤖 兼任AI人才" },
      { v: "enterprise", label: "🏢 兼企业客户" },
    ];
    return [];
  };

  const handleAiGenerateIntro = async () => {
    if (!getApiKey()) { alert("请先配置 API Key"); return; }
    if (!roleForm.name && !roleForm.tags && !roleForm.intro) {
      alert("请至少填写姓名、技能标签或个人介绍中的一项");
      return;
    }
    setAiGenerating(true);
    try {
      const currentRoleType = selectedRoles[currentRoleIndex];
      const prompt = `角色类型：${ROLE_DESCS[currentRoleType]?.label || ""}
姓名：${roleForm.name || "未填写"}
职务：${roleForm.title || "未填写"}
技能标签：${roleForm.tags || "未填写"}
补充信息：${roleForm.intro || "无"}`;
      const result = await generateIntro(prompt, currentRoleType);
      setRoleForm(prev => ({ ...prev, intro: result }));
    } catch (err: any) {
      alert(`AI生成失败：${err.message}`);
    }
    setAiGenerating(false);
  };

  const handleIntroFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("文件不超过2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      let text = content;
      if (content.startsWith("data:text")) {
        try { text = atob(content.split(",")[1] || ""); } catch { text = content.slice(0, 2000); }
      }
      setRoleForm(prev => ({ ...prev, intro: prev.intro ? prev.intro + "\n\n" + text.slice(0, 1500) : text.slice(0, 1500) }));
      alert("文件内容已提取到个人介绍中");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSubmitRole = () => {
    setError("");
    const currentRoleType = selectedRoles[currentRoleIndex];
    if (!roleForm.name.trim() || !roleForm.intro.trim()) {
      setError("姓名和个人介绍为必填项"); return;
    }
    if (referrerId && isDuplicateReferral(referrerId, roleForm.name.trim())) {
      setError("该推荐人已推荐过同名成员"); return;
    }
    const referrer = referrerId ? allRoles.find(r => r.id === referrerId) : null;
    const role: RoleCard = {
      id: generateId(),
      role: currentRoleType,
      secondaryRole: canHaveSecondary(currentRoleType) ? secondaryRole : null,
      name: roleForm.name.trim(),
      phone: roleForm.phone.trim(),
      wechat: roleForm.wechat.trim(),
      title: roleForm.title.trim(),
      intro: roleForm.intro.trim(),
      tags: roleForm.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
      referrerId: referrer ? referrer.id : null,
      referrerName: referrer ? referrer.name : "",
      score: SCORE_RULES.NEW_MEMBER,
      createdAt: Date.now(),
      personPhone: phone || "",
    };
    saveRole(role);
    if (referrer) addReferralScore(referrer.id);

    // 保存脱敏规则（企业或专家）
    if (["enterprise", "expert"].includes(currentRoleType) && desensitizePairs.length > 0) {
      for (const pair of desensitizePairs) {
        if (pair.original.trim() && pair.replacement.trim()) {
          addDesensitizeRule({
            ownerId: role.id,
            personPhone: phone || "",
            original: pair.original.trim(),
            replacement: pair.replacement.trim(),
          });
        }
      }
    }

    // 更新 Person 的角色列表
    const existingRoles = user?.avatarRoles || [];
    if (!existingRoles.includes(currentRoleType)) {
      updatePerson({ avatarRoles: [...existingRoles, currentRoleType] });
    }

    // 下一个角色或完成
    const nextIndex = currentRoleIndex + 1;
    if (nextIndex < selectedRoles.length) {
      setCurrentRoleIndex(nextIndex);
      initRoleForm(selectedRoles[nextIndex]);
    } else {
      setCurrentRoleId(role.id);
      setStep("done");
    }
  };

  return (
    <PageContainer title={t("onboard.title", "入驻融智桥")}>
      <div className="max-w-2xl mx-auto">
        {/* 第一步：填写个人信息 */}
        {step === "info" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">👤</span>
              <div>
                <h2 className="font-bold text-lg text-gray-800">完善个人信息</h2>
                <p className="text-sm text-gray-500">请先填写您的基本信息，再选择角色</p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200 text-sm text-blue-800">
              当前手机号：<strong>{phone || ""}</strong>
              <br />新成员入驻后自动获得 <strong>+{SCORE_RULES.NEW_MEMBER}积分</strong>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                <input type="text" value={personForm.name} onChange={e => setPersonForm({ ...personForm, name: e.target.value })}
                  placeholder="您的真实姓名" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                  <input type="text" value={personForm.phoneNum} onChange={e => setPersonForm({ ...personForm, phoneNum: e.target.value })}
                    placeholder={phone || ""} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">微信号</label>
                  <input type="text" value={personForm.wechat} onChange={e => setPersonForm({ ...personForm, wechat: e.target.value })}
                    placeholder="选填" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">职务</label>
                <input type="text" value={personForm.title} onChange={e => setPersonForm({ ...personForm, title: e.target.value })}
                  placeholder="如：运营总监" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">个人介绍</label>
                <textarea value={personForm.intro} onChange={e => setPersonForm({ ...personForm, intro: e.target.value })}
                  rows={3} placeholder="简单介绍您的背景和专业领域" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={() => navigate("/nda")} variant="secondary">← 返回</Button>
                <Button onClick={handleSavePerson} size="lg" disabled={!personForm.name.trim()}>
                  下一步：选择角色 →
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 第二步：多选角色 */}
        {step === "choose" && (
          <div className="space-y-6">
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-sm text-amber-800">
              👤 <strong>{personForm.name}</strong> · 请选择您要注册的角色类型（可多选）
              {isSuperAdmin && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">超级管理员</span>
              )}
            </div>

            {/* 首个用户专属提示 */}
            {showFirstUserTip && (
              <div className="bg-red-50 rounded-xl p-5 border-2 border-red-200">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">👑</span>
                  <div>
                    <h3 className="font-bold text-red-800 mb-1">您是平台首位用户 · 超级管理员</h3>
                    <p className="text-sm text-red-600 mb-3">
                      您可以选择以下三个角色（可多选），或直接以<strong>平台方</strong>身份入驻，无需选择其他角色。
                    </p>
                    <button onClick={becomePlatform}
                      className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors shadow">
                      👑 直接成为平台方（跳过角色选择）
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

            <div className="grid grid-cols-1 gap-3">
              {USER_SELECTABLE_ROLES.map(rt => (
                <div key={rt} onClick={() => toggleRole(rt)}
                  className={`bg-white rounded-2xl p-5 border-2 cursor-pointer hover:shadow-lg transition-all flex items-center gap-4 ${
                    selectedRoles.includes(rt) ? "border-primary-500 bg-primary-50" : "border-gray-200"
                  }`}>
                  <span className="text-4xl">{ROLE_DESCS[rt].icon}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{ROLE_DESCS[rt].label}</h3>
                    <p className="text-xs text-gray-500">{ROLE_DESCS[rt].desc}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedRoles.includes(rt) ? "bg-primary-600 border-primary-600" : "border-gray-300"
                  }`}>
                    {selectedRoles.includes(rt) && <span className="text-white text-sm">✓</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setStep("info")} variant="secondary">← 返回</Button>
              <Button onClick={startRegister} size="lg" disabled={false}>
                开始注册 ({selectedRoles.length}个角色) →
              </Button>
            </div>
          </div>
        )}

        {/* 第三步：逐个填写角色名片 */}
        {step === "register" && selectedRoles.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{ROLE_DESCS[selectedRoles[currentRoleIndex]].icon}</span>
              <div className="flex-1">
                <h2 className="font-bold text-lg text-gray-800">
                  {ROLE_DESCS[selectedRoles[currentRoleIndex]].label} · 完善名片
                </h2>
                <p className="text-sm text-gray-500">角色 {currentRoleIndex + 1}/{selectedRoles.length}</p>
              </div>
            </div>
            <div className="mb-4 flex gap-1">
              {selectedRoles.map((r, i) => (
                <div key={r} className={`flex-1 h-1 rounded-full ${i <= currentRoleIndex ? "bg-primary-500" : "bg-gray-200"}`} />
              ))}
            </div>

            {/* 兼任角色 */}
            {canHaveSecondary(selectedRoles[currentRoleIndex]) && (
              <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-200">
                <h4 className="font-bold text-sm text-amber-800 mb-2">🔀 兼任角色（可选）</h4>
                <div className="flex flex-wrap gap-2">
                  {getSecondaryOptions(selectedRoles[currentRoleIndex]).map(opt => (
                    <button key={String(opt.v)} onClick={() => setSecondaryRole(opt.v)}
                      className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                        secondaryRole === opt.v ? "bg-amber-600 text-white border-amber-600" : "bg-white text-gray-600 border-gray-200"
                      }`}>{opt.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* 推荐人 */}
            {allRoles.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
                <h4 className="font-bold text-sm text-blue-800 mb-2">👥 推荐人（选填）</h4>
                <select value={referrerId} onChange={e => setReferrerId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-blue-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-200 outline-none">
                  <option value="">无推荐人</option>
                  {allRoles.map(r => (
                    <option key={r.id} value={r.id}>{ROLE_LABELS[r.role].icon} {r.name}（{ROLE_LABELS[r.role].label}）</option>
                  ))}
                </select>
                <p className="text-xs text-blue-600 mt-1">💡 推荐人得 +{SCORE_RULES.REFERRAL}分，您得 +{SCORE_RULES.NEW_MEMBER}分</p>
              </div>
            )}

            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">{error}</div>}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">姓名/昵称 *</label>
                  <input type="text" value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="您的姓名" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">职务</label>
                  <input type="text" value={roleForm.title} onChange={e => setRoleForm({ ...roleForm, title: e.target.value })}
                    placeholder="如：运营副总裁" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                  <input type="text" value={roleForm.phone} onChange={e => setRoleForm({ ...roleForm, phone: e.target.value })}
                    placeholder="选填" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">微信</label>
                  <input type="text" value={roleForm.wechat} onChange={e => setRoleForm({ ...roleForm, wechat: e.target.value })}
                    placeholder="选填" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  个人介绍 * <span className="text-red-400">（名片核心）</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <button onClick={handleAiGenerateIntro} disabled={aiGenerating}
                    className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-all disabled:opacity-50">
                    🤖 {aiGenerating ? "AI生成中..." : "AI帮我写"}
                  </button>
                  <input ref={introFileRef} type="file" onChange={handleIntroFileUpload}
                    className="hidden" accept=".txt,.pdf,.doc,.docx" />
                  <button onClick={() => introFileRef.current?.click()}
                    className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all">
                    📎 上传自我介绍文件
                  </button>
                </div>
                <textarea value={roleForm.intro} onChange={e => setRoleForm({ ...roleForm, intro: e.target.value })}
                  rows={4} placeholder="请详细介绍您的经验、专业领域、核心能力……"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">技能标签（逗号分隔）</label>
                <input type="text" value={roleForm.tags} onChange={e => setRoleForm({ ...roleForm, tags: e.target.value })}
                  placeholder="如：精益生产, 供应链优化" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
              </div>

              {/* 企业/专家：脱敏设置 */}
              {["enterprise", "expert"].includes(selectedRoles[currentRoleIndex]) && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <h4 className="font-bold text-sm text-green-800 mb-2">🔒 公司名脱敏设置（可选）</h4>
                  <p className="text-xs text-green-600 mb-3">设置后，您上传的文件中公司名将自动替换为指定名称</p>
                  {desensitizePairs.map((pair, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input type="text" value={pair.original}
                        onChange={e => {
                          const np = [...desensitizePairs];
                          np[i] = { ...np[i], original: e.target.value };
                          setDesensitizePairs(np);
                        }}
                        placeholder="原始公司名" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <span className="text-gray-400 py-2">→</span>
                      <input type="text" value={pair.replacement}
                        onChange={e => {
                          const np = [...desensitizePairs];
                          np[i] = { ...np[i], replacement: e.target.value };
                          setDesensitizePairs(np);
                        }}
                        placeholder="替换为（如：XX公司）" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <button onClick={() => setDesensitizePairs(prev => prev.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 px-2">✕</button>
                    </div>
                  ))}
                  <button onClick={() => setDesensitizePairs(prev => [...prev, { original: "", replacement: "XX公司" }])}
                    className="text-sm text-green-700 hover:text-green-800 underline mt-1">
                    + 添加脱敏规则
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button onClick={() => { setStep("choose"); setSelectedRoles([]); }} variant="secondary">← 返回重选</Button>
                <Button onClick={handleSubmitRole} size="lg" disabled={!roleForm.name.trim() || !roleForm.intro.trim()}>
                  {currentRoleIndex + 1 < selectedRoles.length ? `保存并注册下一个角色 →` : `🤝 完成入驻 →`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 完成 */}
        {step === "done" && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">入驻成功！+{SCORE_RULES.NEW_MEMBER}积分</h2>
            {selectedRoles.length > 1 && <p className="text-gray-500 mb-2">已注册 {selectedRoles.length} 个角色</p>}
            <p className="text-gray-500 mb-8">欢迎加入融智桥，开始四方协作</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate("/hub")} size="lg">进入平台大厅 →</Button>
              <Button onClick={() => navigate("/nda-sign")} variant="outline">🔒 签署保密协议</Button>
              <Button onClick={() => { setCurrentRoleId(null); setStep("choose"); setSelectedRoles([]); }} variant="outline">注册更多角色</Button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default OnboardingPage;
