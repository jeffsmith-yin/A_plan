import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, Button, DemoBadge } from "../components/Common";
import { useT } from "../i18n";
import {
  getRoles, getCurrentRole, setCurrentRoleId, deleteRole, ensureDefaultPlatform,
  RoleCard, ROLE_LABELS, SECONDARY_LABELS, getPlatformDisplayName, getCartCount,
  getCurrentUser, getUserRoles, logout, deleteAccount, isCurrentUserAdmin,
  isCurrentUserSuperAdmin, maskPhone,
} from "../data/store";

// ========== 成员列表行组件 ==========
const MemberRow: React.FC<{
  role: RoleCard;
  isMe: boolean;
  onChat: () => void;
  onDelete?: () => void;
}> = ({ role, isMe, onChat, onDelete }) => {
  const t = useT();
  const meta = ROLE_LABELS[role.role];
  const displayName = getPlatformDisplayName(role);

  return (
    <div
      onClick={isMe ? undefined : onChat}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        isMe
          ? "bg-primary-50 border-primary-300"
          : "border-gray-100 hover:border-primary-300 hover:bg-gray-50 cursor-pointer"
      }`}
    >
      <span className="text-2xl">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-800 text-sm">{displayName}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
          {role.secondaryRole && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {SECONDARY_LABELS[role.secondaryRole].icon} {SECONDARY_LABELS[role.secondaryRole].label}
            </span>
          )}
          {isMe && <span className="text-xs text-primary-500 font-medium">{t("common.current", "当前")}</span>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{role.intro}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!isMe && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">{t("hub.privateChat", "💬 私聊")}</span>}
        {isMe && <span className="text-xs text-primary-500 bg-primary-100 px-2 py-1 rounded-lg">{t("hub.loggedInBadge", "已登录")}</span>}
        {onDelete && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-xs text-red-400 hover:text-red-600 px-1">{t("hub.delete", "删")}</button>
        )}
      </div>
    </div>
  );
};

// ========== 角色分组区块 ==========
const RoleGroup: React.FC<{
  title: string; icon: string; roles: RoleCard[];
  currentRoleId: string; color: string; borderColor: string;
  onChat: (id: string) => void; onDelete: (id: string) => void;
}> = ({ title, icon, roles, currentRoleId, color, borderColor, onChat, onDelete }) => {
  if (roles.length === 0) return null;
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-5 border ${borderColor}`}>
      <h4 className={`font-bold ${color} mb-3 flex items-center gap-2`}>
        <span>{icon}</span> {title}
        <span className="text-xs font-normal opacity-70">({roles.length}人)</span>
      </h4>
      <div className="space-y-2">
        {roles.map((r) => (
          <MemberRow key={r.id} role={r} isMe={r.id === currentRoleId}
            onChat={() => onChat(r.id)}
            onDelete={r.id === "platform_default" ? undefined : () => onDelete(r.id)} />
        ))}
      </div>
    </div>
  );
};

// ========== 主页面 ==========
const HubPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleCard[]>([]);
  const [currentRole, setCurrent] = useState<RoleCard | null>(null);
  const navigate = useNavigate();
  const t = useT();

  const user = getCurrentUser();
  const userRoles = getUserRoles();
  const isAdmin = isCurrentUserAdmin();

  const refresh = () => {
    ensureDefaultPlatform();
    setRoles(getRoles());
    setCurrent(getCurrentRole());
  };

  useEffect(() => { refresh(); }, []);

  const handleChat = (targetId: string) => {
    if (!currentRole) return;
    navigate(`/chat/${targetId}`);
  };

  const handleDeleteRole = (id: string) => {
    if (id === "platform_default") return;
    if (!window.confirm("确定删除该角色？相关聊天记录也会被清除。")) return;
    deleteRole(id);
    if (currentRole?.id === id) setCurrentRoleId(null);
    refresh();
  };

  const handleAddRole = () => {
    navigate("/onboarding");
  };

  const handleLogout = () => {
    if (!window.confirm("确定退出登录？")) return;
    logout();
    navigate("/nda");
  };

  const handleDeleteAccount = () => {
    if (!window.confirm("⚠️ 确定注销账号？\n\n注销后您将无法登录，但您的历史数据（角色、文件、收益记录等）将保留。\n如需恢复，请联系管理员。")) return;
    if (!window.confirm("再次确认：真的要注销吗？")) return;
    deleteAccount();
    navigate("/");
  };

  // 当前角色为空 → 引导添加
  if (!currentRole) {
    return (
      <PageContainer title={t("hub.titleFull", "融智桥 · 平台大厅")}>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="text-6xl mb-6">🌉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{t("hub.welcome", "欢迎来到融智桥")}</h2>
          <p className="text-gray-500 mb-2">
            {user?.name || user?.phone || "用户"}
          </p>
          <p className="text-gray-400 text-sm mb-8">
            {t("hub.desc", "四方协作平台：", )}
            <strong>{t("hub.platform", "平台方")}</strong>{t("hub.coord", "协调")} · <strong>{t("hub.expert", "行业专家")}</strong>{t("hub.diagnose", "诊断")} · <strong>{t("hub.ai", "AI人才")}</strong>{t("hub.build", "实现")} · <strong>{t("hub.enterprise", "企业客户")}</strong>{t("hub.accept", "验收")}
          </p>
          <Button onClick={() => navigate("/onboarding")} size="lg">{t("hub.registerRole", "注册新角色 →")}</Button>
        </div>
      </PageContainer>
    );
  }

  // 平台方显示所有角色；非平台方只显示自己
  const isPlatform = currentRole.role === "platform";
  const allRoles = getRoles();
  const visibleRoles = isPlatform ? allRoles : allRoles.filter(r => r.personPhone === currentRole.personPhone);

  const platformRoles = visibleRoles.filter((r) => r.role === "platform");
  const expertRoles = visibleRoles.filter((r) => r.role === "expert");
  const aiRoles = visibleRoles.filter((r) => r.role === "ai");
  const enterpriseRoles = visibleRoles.filter((r) => r.role === "enterprise");

  const currentMeta = ROLE_LABELS[currentRole.role];

  return (
    <PageContainer title="平台大厅">
      <div className="max-w-4xl mx-auto">
        {/* ========== 用户信息 + 操作栏 ========== */}
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100 mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">👤</span>
            <span className="font-medium text-gray-700 text-sm">{user?.name || user?.phone}</span>
            {isCurrentUserSuperAdmin() && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{t("hub.super", "超管")}</span>}
            {isAdmin && !isCurrentUserSuperAdmin() && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{t("hub.adminBadge", "管理员")}</span>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate("/profile")}
              className="text-xs text-gray-500 hover:text-primary-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary-300 transition-all">
              {t("hub.settings", "⚙️ 个人设置")}
            </button>
            <button onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-300 transition-all">
              {t("common.logout", "🚪 退出登录")}
            </button>
            <button onClick={handleDeleteAccount}
              className="text-xs text-red-400 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 transition-all">
              {t("hub.deleteAccount", "⚠️ 注销账号")}
            </button>
          </div>
        </div>

        {/* ========== 当前登录角色卡片 ========== */}
        <div className={`bg-white rounded-2xl shadow-lg p-6 border mb-6 ${isPlatform ? "border-amber-300" : "border-gray-100"}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">{t("hub.currentRole", "👋 当前登录角色")}</h3>
            <DemoBadge />
          </div>
          <div className={`flex items-start gap-4 p-4 rounded-xl ${
            isPlatform ? "bg-gradient-to-r from-amber-50 to-yellow-50" : "bg-gradient-to-r from-blue-50 to-indigo-50"
          }`}>
            <span className="text-4xl">{currentMeta.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-bold text-lg text-gray-800">{getPlatformDisplayName(currentRole)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${currentMeta.color}`}>{currentMeta.label}</span>
                {currentRole.secondaryRole && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {SECONDARY_LABELS[currentRole.secondaryRole].icon} {SECONDARY_LABELS[currentRole.secondaryRole].label}
                  </span>
                )}
              </div>
              {currentRole.title && <p className="text-sm text-primary-600 font-medium">{currentRole.title}</p>}
              <p className="text-sm text-gray-600 mt-2">{currentRole.intro}</p>
              {currentRole.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {currentRole.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========== 快捷操作 ========== */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button onClick={() => navigate("/chat/all")}
            className="bg-white rounded-xl p-3 border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all text-center">
            <div className="text-xl mb-1">💬</div>
            <div className="font-medium text-gray-800 text-xs">{t("hub.groupChat", "群聊大厅")}</div>
            <div className="text-[10px] text-gray-400">{t("hub.groupChatDesc", "四方公开交流")}</div>
          </button>
          {isPlatform && (
            <button onClick={() => navigate("/chat/platforms")}
              className="bg-amber-50 rounded-xl p-3 border border-amber-300 hover:border-amber-500 hover:shadow-md transition-all text-center">
              <div className="text-xl mb-1">🌉</div>
              <div className="font-medium text-gray-800 text-xs">{t("hub.platformChannel", "平台内部频道")}</div>
              <div className="text-[10px] text-amber-600">{t("hub.platformChannelDesc", "平台方专用")}</div>
            </button>
          )}
          <button onClick={() => navigate("/market")}
            className="bg-white rounded-xl p-3 border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all text-center">
            <div className="text-xl mb-1">🛍️</div>
            <div className="font-medium text-gray-800 text-xs">{t("hub.market", "产品市场")}</div>
            <div className="text-[10px] text-gray-400">{t("hub.marketDesc", "DEMO·产品·技能·课件")}</div>
          </button>
          <button onClick={() => navigate("/circles")}
            className="bg-white rounded-xl p-3 border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all text-center">
            <div className="text-xl mb-1">💬</div>
            <div className="font-medium text-gray-800 text-xs">{t("hub.circles", "圈子")}</div>
            <div className="text-[10px] text-gray-400">{t("hub.circlesDesc", "订阅·交流·学习")}</div>
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-6">
          <button onClick={() => navigate("/dashboard")}
            className="bg-white rounded-xl p-3 border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all text-center">
            <div className="text-xl mb-1">📊</div>
            <div className="font-medium text-gray-800 text-xs">{t("hub.dashboard", "数据看板")}</div>
            <div className="text-[10px] text-gray-400">{t("hub.dashboardDesc", "平台统计")}</div>
          </button>
          <button onClick={() => navigate("/settlement")}
            className="bg-white rounded-xl p-3 border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all text-center">
            <div className="text-xl mb-1">⛓</div>
            <div className="font-medium text-gray-800 text-xs">{t("hub.settlement", "区块链结算")}</div>
            <div className="text-[10px] text-gray-400">{t("hub.settlementDesc", "W3合约分账")}</div>
          </button>
          <button onClick={() => navigate("/files")}
            className="bg-white rounded-xl p-3 border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all text-center">
            <div className="text-xl mb-1">📁</div>
            <div className="font-medium text-gray-800 text-xs">{t("hub.files", "文件管理")}</div>
            <div className="text-[10px] text-gray-400">{t("hub.filesDesc", "上传与AI总结")}</div>
          </button>
          <button onClick={() => navigate("/cart")}
            className="bg-white rounded-xl p-3 border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all text-center relative">
            <div className="text-xl mb-1">🛒</div>
            <div className="font-medium text-gray-800 text-xs">{t("hub.cart", "购物车")}</div>
            <div className="text-[10px] text-gray-400">{t("hub.cartDesc", "统一结算")}</div>
            {getCartCount() > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                {getCartCount()}
              </span>
            )}
          </button>
          <button onClick={() => navigate("/ai-expert")}
            className="bg-white rounded-xl p-3 border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all text-center">
            <div className="text-xl mb-1">🤖</div>
            <div className="font-medium text-gray-800 text-xs">{t("hub.aiExpert", "AI 智能体专家")}</div>
            <div className="text-[10px] text-gray-400">{t("hub.aiExpertDesc", "痛点分析·技能包·激活")}</div>
          </button>
          <button onClick={handleAddRole}
            className="bg-white rounded-xl p-3 border-2 border-dashed border-gray-300 hover:border-primary-400 hover:shadow-md transition-all text-center">
            <div className="text-xl mb-1">➕</div>
            <div className="font-medium text-gray-800 text-xs">{t("hub.addRole", "注册新角色")}</div>
            <div className="text-[10px] text-gray-400">{t("hub.addRoleDesc", "添加角色类型")}</div>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => navigate("/my")}
            className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl p-3 border border-primary-200 hover:border-primary-400 hover:shadow-md transition-all text-center">
            <div className="text-xl mb-1">👤</div>
            <div className="font-medium text-gray-800 text-xs">{t("hub.my", "我的")}</div>
            <div className="text-[10px] text-gray-400">{t("hub.myDesc", "头像·积分·设置")}</div>
          </button>
        </div>

        {/* ========== 四方角色分组 ========== */}
        {isPlatform && (
          <div className="space-y-4 mb-6">
            <RoleGroup title={t("hub.platform", "平台方")} icon="🌉" roles={platformRoles} currentRoleId={currentRole.id}
              color="text-amber-800" borderColor="border-amber-200" onChat={handleChat} onDelete={handleDeleteRole} />
            <RoleGroup title={t("hub.expert", "行业专家")} icon="👤" roles={expertRoles} currentRoleId={currentRole.id}
              color="text-blue-800" borderColor="border-blue-100" onChat={handleChat} onDelete={handleDeleteRole} />
            <RoleGroup title={t("hub.ai", "AI人才")} icon="🤖" roles={aiRoles} currentRoleId={currentRole.id}
              color="text-purple-800" borderColor="border-purple-100" onChat={handleChat} onDelete={handleDeleteRole} />
            <RoleGroup title={t("hub.enterprise", "企业客户")} icon="🏢" roles={enterpriseRoles} currentRoleId={currentRole.id}
              color="text-green-800" borderColor="border-green-100" onChat={handleChat} onDelete={handleDeleteRole} />
          </div>
        )}

        {!isPlatform && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-sm text-blue-700 mb-6">
            {t("hub.nonPlatformHint", "💡 非平台方角色仅显示您自己的角色。其他用户信息需平台方权限查看。")}
          </div>
        )}

        {/* ========== 底部切换角色栏 ========== */}
        {userRoles.length > 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3">{t("hub.switchRole", "🔄 切换平台方角色")}</h3>
            <div className="flex flex-wrap gap-2">
              {userRoles.map((r) => {
                const meta = ROLE_LABELS[r.role];
                return (
                  <button key={r.id} onClick={() => { setCurrentRoleId(r.id); refresh(); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all ${
                      r.id === currentRole.id
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-primary-300"
                    }`}>
                    <span>{meta.icon}</span>
                    {r.name}
                    {r.secondaryRole && <span className="text-[10px] opacity-75">{SECONDARY_LABELS[r.secondaryRole].icon}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default HubPage;
