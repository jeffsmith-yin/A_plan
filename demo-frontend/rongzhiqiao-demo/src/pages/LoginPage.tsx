import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Common";
import { useT } from "../i18n";
import {
  isLoggedIn, registerPerson, getPersonByPhone, getPersonByName,
  clearAllData, ensureSuperAdmin, updatePerson, getPersons,
  SUPER_ADMIN_CRED,
} from "../data/store";

const SUPER_NAME = SUPER_ADMIN_CRED.username;
const SUPER_PASS = SUPER_ADMIN_CRED.password;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useT();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginType, setLoginType] = useState<"name" | "phone">("name"); // 用户名 or 手机号
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");

  // 已登录直接跳转
  useEffect(() => {
    if (isLoggedIn()) {
      const p = getPersonByPhone(localStorage.getItem("rzq_phone_v2") || "");
      if (p && p.avatarRoles.length > 0) navigate("/hub", { replace: true });
      else navigate("/nda", { replace: true });
    }
  }, []);

  // 验证码倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) { setError("请输入有效的手机号"); return; }
    setError("");
    setCodeSent(true);
    setCountdown(60);
  };

  // ======== 用户名密码登录 ========
  const handleNameLogin = () => {
    if (!username || !password) { setError("请填写用户名和密码"); return; }
    setError("");

    if (mode === "login") {
      // 超管快捷登录
      if (username === SUPER_NAME && password === SUPER_PASS) {
        ensureSuperAdmin();
        const sa = getPersonByPhone("00000000000");
        if (sa?.kicked) { setError("该账号已被禁用"); return; }
        registerPerson("00000000000");
        const p = getPersonByPhone("00000000000");
        if (p && p.avatarRoles.length > 0) navigate("/hub");
        else navigate("/nda");
        return;
      }

      // 普通用户名登录：找 name 匹配的 Person
      const person = getPersonByName(username);
      if (!person) { setError(`用户 "${username}" 不存在，请先注册`); return; }
      if (person.kicked) { setError("该账号已被管理员禁用"); return; }
      // DEMO: 密码固定 admin
      if (password !== "admin") { setError("密码错误（DEMO环境密码：admin）"); return; }
      registerPerson(person.phone);
      if (person.avatarRoles.length > 0) navigate("/hub");
      else navigate("/nda");
    } else {
      // 注册新用户：用户名 → 自动生成 phone
      if (getPersonByName(username)) { setError(`用户 "${username}" 已存在`); return; }
      if (password !== "admin") { setError("密码错误（DEMO环境密码：admin）"); return; }
      const fakePhone = "u_" + username.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "").slice(0, 11);
      const person = registerPerson(fakePhone);
      updatePerson({ name: username });
      if (person.kicked) { setError("该账号已被禁用"); return; }
      navigate("/nda");
    }
  };

  // ======== 手机号验证码登录 ========
  const handlePhoneLogin = () => {
    if (!phone || !code) { setError("请填写手机号和验证码"); return; }
    // 兼容旧缓存：手机号框输入 admin 时直接按超管登录
    if (phone === "admin" && code === "admin") {
      ensureSuperAdmin();
      const sa = getPersonByPhone("00000000000");
      if (sa?.kicked) { setError("该账号已被禁用"); return; }
      registerPerson("00000000000");
      const p = getPersonByPhone("00000000000");
      if (p && p.avatarRoles.length > 0) navigate("/hub");
      else navigate("/nda");
      return;
    }
    if (code !== "123456") { setError("验证码错误（DEMO: 123456）"); return; }
    setError("");

    if (mode === "register") {
      const person = registerPerson(phone);
      if (person.kicked) { setError("该账号已被管理员禁用"); return; }
      navigate("/nda");
    } else {
      const person = getPersonByPhone(phone);
      if (!person) { setMode("register"); setError(`手机号 ${phone} 未注册，已自动切换到注册模式。`); return; }
      if (person.kicked) { setError("该账号已被管理员禁用"); return; }
      registerPerson(phone);
      if (person.avatarRoles.length > 0) navigate("/hub");
      else navigate("/nda");
    }
  };

  const handleSubmit = () => {
    if (loginType === "name") handleNameLogin();
    else handlePhoneLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">🌉</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-3">{t("app.name", "融智桥")}</h1>
          <p className="text-gray-500 mt-1">{t("app.tagline", "AI驱动的四方协作平台")}</p>
          <span className="text-xs text-gray-400 border border-gray-200 rounded px-2 py-0.5 mt-2 inline-block">{t("common.demo", "DEMO")}</span>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Tab: 登录 / 注册 */}
          <div className="flex bg-gray-100 rounded-xl p-1.5 mb-4">
            <button onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "login" ? "bg-white shadow-md text-primary-700 ring-1 ring-gray-200" : "text-gray-400 hover:text-gray-600"
              }`}>{t("login.tab.login", "登录")}</button>
            <button onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "register" ? "bg-white shadow-md text-primary-700 ring-1 ring-gray-200" : "text-gray-400 hover:text-gray-600"
              }`}>{t("login.tab.register", "注册")}</button>
          </div>

          {/* 登录方式切换：用户名 or 手机号 */}
          <div className="flex items-center gap-2 mb-4 text-xs">
            <button onClick={() => { setLoginType("name"); setError(""); }}
              className={`flex-1 py-1.5 rounded-lg border transition-all ${
                loginType === "name" ? "bg-primary-50 border-primary-300 text-primary-700 font-medium" : "border-gray-200 text-gray-400"
              }`}>{t("login.byName", "👤 用户名登录")}</button>
            <button onClick={() => { setLoginType("phone"); setError(""); }}
              className={`flex-1 py-1.5 rounded-lg border transition-all ${
                loginType === "phone" ? "bg-primary-50 border-primary-300 text-primary-700 font-medium" : "border-gray-200 text-gray-400"
              }`}>{t("login.byPhone", "📱 手机号登录")}</button>
          </div>

          {/* 用户名登录表单 */}
          {loginType === "name" && (
            <>
              <div className="bg-red-50 rounded-xl p-3 mb-4 border border-red-200">
                <p className="text-sm text-red-700 font-medium mb-1">{t("login.superHint", "👑 超管快捷登录")}</p>
                <button onClick={() => { setUsername("admin"); setPassword("admin"); setError(""); }}
                  className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                  {t("login.fillAdmin", "一键填入 admin / admin")}
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("login.username", "用户名")}</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder={t("login.namePh", "请输入用户名")} autoComplete="off"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("login.password", "密码")}</label>
                <input type="text" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={t("login.passwordPlaceholder", "请输入密码（DEMO: admin）")} autoComplete="off"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
                  onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              </div>
            </>
          )}

          {/* 手机号登录表单 */}
          {loginType === "phone" && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("login.phone", "手机号")}</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder={t("login.phonePh", "请输入手机号")} maxLength={11}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("login.code", "验证码")}</label>
                <div className="flex gap-2">
                  <input type="text" value={code} onChange={e => setCode(e.target.value)}
                    placeholder={t("login.codePlaceholder", "请输入验证码")} maxLength={6}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all" />
                  <button onClick={handleSendCode} disabled={countdown > 0}
                    className={`shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      countdown > 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200"
                    }`}>
                    {countdown > 0 ? `${countdown}s` : codeSent ? t("login.resend", "重新发送") : t("login.sendCode", "发送验证码")}
                  </button>
                </div>
                {codeSent && <p className="text-xs text-gray-400 mt-1">{t("login.demoCode", "📢 DEMO验证码：123456")}</p>}
              </div>
            </>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
          )}

          <Button onClick={handleSubmit} size="lg" variant="primary">
            {mode === "login" ? t("login.submit", "🔓 登录") : t("login.submitRegister", "📝 注册并登录")}
          </Button>

          {/* 微信登录 */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="text-center text-xs text-gray-400 mb-3">{t("login.otherMethods", "或使用以下方式登录")}</div>
            <button onClick={() => { alert("【DEMO】微信扫码登录（模拟）"); navigate("/nda"); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-green-200 text-green-700 hover:bg-green-50 transition-all text-sm font-medium">
              <span className="text-lg">💚</span>
              {t("login.wechat", "微信扫码登录（DEMO模拟）")}
            </button>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-gray-400 flex items-center justify-center gap-2">
          <span>{t("login.agree", "注册即表示同意融智桥服务条款 · DEMO版本")}</span>
          <button
            onClick={() => {
              if (!window.confirm("⚠️ 确定清空所有数据？")) return;
              if (!window.confirm("再次确认：真的清空所有数据吗？此操作不可恢复！")) return;
              clearAllData();
              window.location.reload();
            }}
            className="text-red-400 hover:text-red-600 underline underline-offset-2"
          >{t("common.clearData", "清空数据")}</button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
