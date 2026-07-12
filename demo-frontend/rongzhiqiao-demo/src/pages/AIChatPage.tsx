import React, { useState } from "react";
import { PageContainer, DemoBadge } from "../components/Common";
import { useT } from "../i18n";
import { getToken } from "../data/store";

const API = "/api/expert";

// 封装请求（Bearer 令牌透传）
async function expertFetch(path: string, method = "GET", body?: any) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  return { status: r.status, json: await r.json().catch(() => null) };
}

interface SkillItem {
  id: string; name: string; score: number; state: string; usable: boolean;
}

interface AnalysisResult {
  painCategory: string; confidence: number; escalate: boolean;
  matchedSkills: SkillItem[];
  rootCause: string[]; suggestedRules: string[]; warnings: string[];
  activationNote: string; reply: string;
}

const AIChatPage: React.FC = () => {
  const t = useT();
  const [text, setText] = useState("订单波动大、排产靠老师傅经验、交期经常延误");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [settleResult, setSettleResult] = useState<any>(null);
  const [injectMsg, setInjectMsg] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  // 痛点分析
  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true); setError(""); setSettleResult(null);
    try {
      const r = await expertFetch("/analyze", "POST", { text: text.trim() });
      if (r.status !== 200) { setError(r.json?.error || "分析失败"); return; }
      setResult(r.json);
    } catch { setError("AI 智能体专家服务不可达"); }
    finally { setLoading(false); }
  };

  // 刷新购物车
  const refreshCart = async () => {
    try {
      const r = await expertFetch("/cart", "GET");
      if (r.status === 200) {
        setCartItems(r.json.items || []);
        setCartTotal(r.json.items?.reduce((a: number, ci: any) => a + ci.price, 0) || 0);
      }
    } catch {}
  };

  // 加入购物车
  const handleAddToCart = async (skill: SkillItem) => {
    const r = await expertFetch("/cart/add", "POST", { id: skill.id });
    if (r.status === 200 && r.json.ok) await refreshCart();
  };

  // 结算
  const handleCheckout = async () => {
    const r = await expertFetch("/cart/checkout", "POST");
    if (r.status === 200) {
      setSettleResult(r.json);
      await refreshCart();
    }
  };

  // 注入激活
  const handleInject = async (skillId: string) => {
    const r = await expertFetch("/inject", "POST", { skillId, dataSource: { type: "platform_assisted", ref: "customer-portal" } });
    if (r.status === 200) {
      setInjectMsg((prev) => ({ ...prev, [skillId]: `✅ 已激活 · bindingId: ${r.json.bindingId}` }));
      // 重新分析以刷新 usable 状态
      if (result) handleAnalyze();
    } else {
      setInjectMsg((prev) => ({ ...prev, [skillId]: `❌ ${r.json?.message || "注入失败（须先购买）"}` }));
    }
  };

  const isInCart = (id: string) => cartItems.some((ci: any) => ci.id === id);

  return (
    <PageContainer title={t("aiExpert.title", "🤖 AI 智能体专家")}>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{t("aiExpert.subtitle", "制造业 Skills · 自动痛点分析 → 技能包购物车 → 激活可用")}</p>
          <DemoBadge />
        </div>

        {/* ===== 对话区 ===== */}
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-5">
          <label className="text-sm font-medium text-gray-700 mb-2 block">{t("aiExpert.describePain", "描述企业痛点")}</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
            placeholder={t("aiExpert.phPain", "如：订单波动大、排产靠老师傅经验、交期经常延误")}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !text.trim()}
            className="mt-3 w-full bg-primary-600 text-white py-2.5 rounded-xl font-medium disabled:opacity-50 hover:bg-primary-700 transition"
          >
            {loading ? t("aiExpert.analyzing", "分析中...") : t("aiExpert.analyze", "让 AI 智能体专家分析")}
          </button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* ===== 分析结果 ===== */}
        {result && (
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-bold text-gray-800">{t("aiExpert.result", "分析结果")}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${result.confidence >= 0.5 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {t("aiExpert.confidence", "置信度")}: {(result.confidence * 100).toFixed(0)}%
              </span>
              {result.escalate && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{t("aiExpert.escalate", "建议转人工")}</span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{t("aiExpert.category", "分类")}: {result.painCategory}</p>
            {result.rootCause.length > 0 && (
              <div className="mb-2">
                <span className="text-xs text-gray-500">{t("aiExpert.rootCause", "根因推断")}:</span>
                <ul className="text-sm text-gray-700 list-disc list-inside">{result.rootCause.map((c, i) => <li key={i}>{c}</li>)}</ul>
              </div>
            )}
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mt-2">{result.activationNote}</p>
          </div>
        )}

        {/* ===== 技能包推荐区 ===== */}
        {result && result.matchedSkills.length > 0 && (
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3">{t("aiExpert.matchedSkills", "匹配技能包")}</h3>
            <div className="space-y-2">
              {result.matchedSkills.map((sk) => (
                <div key={sk.id} className={`flex items-center justify-between p-3 rounded-xl border ${sk.usable ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-800 truncate">{sk.name}</span>
                      <span className="text-xs text-gray-400">({sk.id})</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${sk.usable ? "bg-green-200 text-green-800" : "bg-amber-200 text-amber-800"}`}>
                        {sk.usable ? t("aiExpert.activated", "已激活") : t("aiExpert.demo", "演示态")}
                      </span>
                    </div>
                    {injectMsg[sk.id] && <p className="text-xs mt-1 text-gray-600">{injectMsg[sk.id]}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {!sk.usable && (
                      <button onClick={() => handleInject(sk.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition">
                        {t("aiExpert.inject", "申请注入真实数据")}
                      </button>
                    )}
                    <button onClick={() => handleAddToCart(sk)}
                      disabled={isInCart(sk.id)}
                      className={`text-xs px-3 py-1 rounded-lg transition ${isInCart(sk.id) ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-primary-100 text-primary-700 hover:bg-primary-200"}`}>
                      {isInCart(sk.id) ? t("aiExpert.inCart", "已加购") : t("aiExpert.addToCart", "加入购物车")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 购物车 & 结算区 ===== */}
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">{t("aiExpert.cart", "🛒 购物车")}</h3>
            <button onClick={refreshCart} className="text-xs text-primary-600 hover:underline">{t("aiExpert.refresh", "刷新")}</button>
          </div>
          {cartItems.length === 0 ? (
            <p className="text-sm text-gray-400">{t("aiExpert.cartEmpty", "购物车为空，请从上方技能包推荐中添加")}</p>
          ) : (
            <>
              {cartItems.map((ci: any) => (
                <div key={ci.id} className="flex justify-between text-sm py-1 border-b border-gray-50">
                  <span>{ci.name} ({ci.id})</span>
                  <span className="text-gray-600">¥{ci.price}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-gray-100">
                <span>{t("aiExpert.total", "合计")}</span>
                <span>¥{cartTotal}</span>
              </div>
              <button onClick={handleCheckout}
                className="mt-3 w-full bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700 transition">
                {t("aiExpert.checkout", "结算 · 按创建人分成")}
              </button>
            </>
          )}

          {/* 结算结果 */}
          {settleResult && (
            <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-200 text-sm">
              <p className="font-medium text-green-800">{t("aiExpert.settleOk", "结算成功")}</p>
              <p className="text-green-700 text-xs mt-1">{t("aiExpert.protocol", "协议")}: {settleResult.protocol || "透明智能分账协议"}</p>
              <p className="text-green-700 text-xs">{t("aiExpert.orderTotal", "总额")}: ¥{settleResult.total}</p>
              {settleResult.auditRef && (
                <p className="text-green-600 text-xs mt-1 font-mono">{t("aiExpert.auditRef", "审计引用")}: {settleResult.auditRef.slice(0, 16)}...</p>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          {t("aiExpert.disclaimer", "全部为演示数据；AI 身份已显著标识，不冒充真实自然人专家。技能包默认演示态，须购买后由平台协助注入真实数据方可激活使用。")}
        </p>
      </div>
    </PageContainer>
  );
};

export default AIChatPage;
