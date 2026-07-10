import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, Button, DemoBadge } from "../components/Common";
import {
  getCurrentRole, getCurrentUser, getNDAByRole, signNDA, renewNDA,
  NDA_TEXT, NDA_VERSION, NDA_VALID_DAYS, getNDASignedCount, getRoles, ROLE_LABELS,
} from "../data/store";

const fmtDate = (ts: number) => new Date(ts).toLocaleDateString("zh-CN");

const NDASignPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const role = getCurrentRole();
  const [record, setRecord] = useState<ReturnType<typeof getNDAByRole>>(role ? getNDAByRole(role.id) : null);
  const [name, setName] = useState(role?.name || user?.name || "");
  const [agreed, setAgreed] = useState(false);

  const signed = !!record;

  const handleSign = () => {
    if (!role) { alert("请先选择一个角色"); return; }
    if (!agreed || !name.trim()) { alert("请勾选同意并输入签署姓名"); return; }
    const rec = signNDA(role.id, name.trim(), role.role);
    setRecord(rec);
    setAgreed(false);
  };

  const handleRenew = () => {
    if (!role) return;
    const rec = renewNDA(role.id);
    setRecord(rec);
  };

  return (
    <PageContainer title="保密协议 (NDA)">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200">
          <DemoBadge />
          <span>参与 DEMO 的各方需签署保密协议 · 版本 {NDA_VERSION} · 有效期 {NDA_VALID_DAYS} 天 · 到期可续签</span>
        </div>

        {!role ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
            <span className="text-5xl">🔒</span>
            <p className="text-gray-500 mt-4 mb-4">请先选择一个角色后再签署保密协议</p>
            <Button onClick={() => navigate("/nda")}>选择角色</Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            {/* 签署状态 */}
            <div className={`rounded-xl p-4 mb-4 ${signed ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{signed ? "✅" : "⏳"}</span>
                <div>
                  <div className="font-bold text-gray-800">
                    {signed ? "已签署保密协议" : "尚未签署保密协议"}
                  </div>
                  {signed && record && (
                    <div className="text-xs text-gray-500 mt-1">
                      签署人：{record.signerName}（{ROLE_LABELS[record.role]?.label}） · 签署于 {fmtDate(record.signedAt)} · 有效期至 {fmtDate(record.expiresAt)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 协议文本 */}
            <div className="nda-scroll bg-gray-50 rounded-xl p-4 border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {NDA_TEXT}
            </div>

            {/* 签署 / 续签 */}
            {!signed ? (
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm text-gray-600">我已阅读并同意上述保密协议全部条款</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">签署姓名 *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="请输入您的姓名" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 outline-none" />
                </div>
                <Button onClick={handleSign} size="lg" disabled={!agreed || !name.trim()}>
                  🖋️ 签署保密协议
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={handleRenew} variant="secondary">🔄 续签 {NDA_VALID_DAYS} 天</Button>
                <Button onClick={() => navigate("/hub")}>进入平台 →</Button>
              </div>
            )}
          </div>
        )}

        {/* 平台签署统计 */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-sm text-gray-600">
          已签署保密协议的参与方：<strong className="text-blue-700">{getNDASignedCount()}</strong> / {getRoles().length} 个角色
        </div>
      </div>
    </PageContainer>
  );
};

export default NDASignPage;
