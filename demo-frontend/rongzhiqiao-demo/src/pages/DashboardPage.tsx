import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, StatCard, DemoBadge, Button } from "../components/Common";
import {
  getRoles, getMessages, getPersons, kickPerson, unkickPerson,
  isCurrentUserAdmin, isCurrentUserSuperAdmin, getCurrentUser, maskPhone, getDesensitizeRules,
  setSubAdmin, removeSubAdmin, getAdminCount, MAX_SUB_ADMINS, restoreAccount,
} from "../data/store";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const isAdmin = isCurrentUserAdmin();
  const user = getCurrentUser();
  const [stats, setStats] = useState({ experts: 0, enterprises: 0, ai: 0, platforms: 0, total: 0, messages: 0, persons: 0, desensitizeRules: 0 });
  const [persons, setPersons] = useState<ReturnType<typeof getPersons>>([]);
  const [showUserMgmt, setShowUserMgmt] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const roles = getRoles();
      const msgs = getMessages();
      const allPersons = getPersons();
      setStats({
        experts: roles.filter(r => r.role === "expert").length,
        enterprises: roles.filter(r => r.role === "enterprise").length,
        ai: roles.filter(r => r.role === "ai").length,
        platforms: roles.filter(r => r.role === "platform").length,
        total: roles.length,
        messages: msgs.length,
        persons: allPersons.length,
        desensitizeRules: getDesensitizeRules().length,
      });
      setPersons(allPersons);
    };
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleKick = (phone: string, name: string, kicked: boolean) => {
    if (kicked) {
      if (!window.confirm(`确定恢复用户「${name}」的访问权限？`)) return;
      unkickPerson(phone);
    } else {
      if (!window.confirm(`确定踢出用户「${name}」？\n该用户将无法登录和使用平台。`)) return;
      kickPerson(phone);
    }
    setPersons(getPersons());
  };

  return (
    <PageContainer title="平台数据看板">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <DemoBadge />
          <span className="text-xs text-gray-400">实时统计（当前浏览器数据）</span>
        </div>

        {/* 四方角色统计 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="🌉 平台方" value={stats.platforms} suffix="人" />
          <StatCard label="👤 行业专家" value={stats.experts} suffix="人" />
          <StatCard label="🤖 AI人才" value={stats.ai} suffix="人" />
          <StatCard label="🏢 企业客户" value={stats.enterprises} suffix="家" />
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="成员总数" value={stats.total} suffix="人" />
          <StatCard label="注册用户" value={stats.persons} suffix="人" />
          <StatCard label="消息总数" value={stats.messages} suffix="条" />
          <StatCard label="脱敏规则" value={stats.desensitizeRules} suffix="条" />
        </div>

        {/* 模拟交易量（演示数据） */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">📈 交易量统计（演示数据）</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "今日交易", value: 12, unit: "笔" },
              { label: "本周交易", value: 68, unit: "笔" },
              { label: "本月交易", value: 245, unit: "笔" },
              { label: "年度交易", value: 2940, unit: "笔" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-2xl font-bold text-primary-700">{item.value}</div>
                <div className="text-xs text-gray-500 mt-1">{item.label}（{item.unit}）</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-3">
            <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">🟡 演示数据 · 正式版由客户注入真实数据</span>
          </div>
        </div>

        {/* 环比（演示数据） */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">📊 环比增长（演示数据）</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "专家月环比", value: "+12.5%" },
              { label: "企业月环比", value: "+18.3%" },
              { label: "AI人才月环比", value: "+8.7%" },
              { label: "交易量月环比", value: "+22.1%" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-xl font-bold text-green-600">{item.value}</div>
                <div className="text-xs text-gray-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-3">
            <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">🟡 演示数据</span>
          </div>
        </div>

        {/* 超管：子管理员管理 */}
        {isCurrentUserSuperAdmin() && (
          <div className="bg-red-50 rounded-2xl shadow-lg border border-red-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-red-800">👑 超级管理员 · 子管理员设置</h3>
              <span className="text-xs text-red-600">{getAdminCount()}/{MAX_SUB_ADMINS} 位子管理员</span>
            </div>
            <p className="text-sm text-red-600 mb-4">可设置最多 {MAX_SUB_ADMINS} 位平台角色为子管理员，协助管理平台</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-100 text-left">
                    <th className="px-4 py-2 font-medium text-red-800">手机号</th>
                    <th className="px-4 py-2 font-medium text-red-800">姓名</th>
                    <th className="px-4 py-2 font-medium text-red-800">角色</th>
                    <th className="px-4 py-2 font-medium text-red-800">状态</th>
                    <th className="px-4 py-2 font-medium text-red-800">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100">
                  {persons.filter(p => !p.isSuperAdmin && !p.deleted).map(p => (
                    <tr key={p.phone} className="hover:bg-red-50/50">
                      <td className="px-4 py-2 text-gray-700">{maskPhone(p.phone)}</td>
                      <td className="px-4 py-2 text-gray-700">{p.name || "未设置"}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1 flex-wrap">
                          {p.avatarRoles.map(r => (
                            <span key={r} className="text-xs bg-white px-2 py-0.5 rounded-full">{r}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {p.isAdmin ? (
                          <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">子管理员</span>
                        ) : (
                          <span className="text-xs text-gray-400">普通用户</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {p.isAdmin ? (
                          <button onClick={() => { if (window.confirm(`确定取消「${p.name || p.phone}」的子管理员权限？`)) removeSubAdmin(p.phone); }}
                            className="text-xs text-red-600 hover:text-red-700 bg-red-50 px-3 py-1 rounded-lg">
                            取消管理员
                          </button>
                        ) : (
                          <button onClick={() => {
                            if (getAdminCount() >= MAX_SUB_ADMINS) { alert(`最多只能设置${MAX_SUB_ADMINS}位子管理员`); return; }
                            if (window.confirm(`确定设置「${p.name || p.phone}」为子管理员？`)) setSubAdmin(p.phone);
                          }}
                            className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-lg">
                            设为管理员
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 管理员：用户管理 */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">🔧 用户管理（管理员工具）</h3>
              <button onClick={() => setShowUserMgmt(!showUserMgmt)}
                className="text-xs text-gray-500 hover:text-primary-600 px-3 py-1.5 rounded-lg border border-gray-200">
                {showUserMgmt ? "收起" : "展开"}
              </button>
            </div>
            {showUserMgmt && (
              <div>
                <p className="text-sm text-gray-500 mb-4">管理所有注册用户，可踢出/恢复/恢复注销用户</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-2 font-medium text-gray-600">手机号</th>
                        <th className="px-4 py-2 font-medium text-gray-600">姓名</th>
                        <th className="px-4 py-2 font-medium text-gray-600">角色</th>
                        <th className="px-4 py-2 font-medium text-gray-600">注册时间</th>
                        <th className="px-4 py-2 font-medium text-gray-600">状态</th>
                        <th className="px-4 py-2 font-medium text-gray-600">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {persons.filter(p => !p.isSuperAdmin).map(p => (
                        <tr key={p.phone} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-700">{maskPhone(p.phone)}</td>
                          <td className="px-4 py-2 text-gray-700">{p.name || "未设置"}</td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1 flex-wrap">
                              {p.avatarRoles.map(r => (
                                <span key={r} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{r}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-gray-500 text-xs">
                            {new Date(p.registeredAt).toLocaleDateString("zh-CN")}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1 flex-wrap">
                              {p.kicked && <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">已踢出</span>}
                              {p.deleted && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">已注销</span>}
                              {!p.kicked && !p.deleted && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">正常</span>}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              {p.deleted ? (
                                <button onClick={() => { if (window.confirm("恢复该用户？")) restoreAccount(p.phone); }}
                                  className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">恢复</button>
                              ) : (
                                <button onClick={() => handleKick(p.phone, p.name || p.phone, p.kicked)}
                                  className={`text-xs px-2 py-1 rounded-lg ${
                                    p.kicked
                                      ? "text-green-600 hover:text-green-700 bg-green-50"
                                      : "text-red-600 hover:text-red-700 bg-red-50"
                                  }`}>
                                  {p.kicked ? "恢复" : "踢出"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {persons.filter(p => !p.isSuperAdmin).length === 0 && (
                    <p className="text-center text-gray-400 py-8">暂无普通用户</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => navigate("/leaderboard")} variant="outline">🏆 积分排行榜</Button>
          <Button onClick={() => navigate("/skill-packs")} variant="outline">📦 技能包</Button>
          <Button onClick={() => navigate("/hub")} variant="outline">🏠 平台大厅</Button>
          <Button onClick={() => navigate("/onboarding")} variant="primary">➕ 注册新角色</Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default DashboardPage;
