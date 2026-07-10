import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, Button, DemoBadge } from "../components/Common";
import {
  getSettlements, simulateSettlement, getSettlementStats,
  DEFAULT_SETTLEMENT_RULE, ROLE_LABELS,
} from "../data/store";

const shortHash = (h: string) => (h.length > 14 ? h.slice(0, 10) + "…" + h.slice(-4) : h);

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

// DEMO 初始示例账本（仅首次为空时填充，便于演示）
const DEMO_SEED = [
  { total: 58800, payer: "某制造企业" },
  { total: 39800, payer: "某零售连锁" },
  { total: 79800, payer: "某餐饮集团" },
];

const SettlementPage: React.FC = () => {
  const navigate = useNavigate();
  const [list, setList] = useState(getSettlements());
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [lastTx, setLastTx] = useState<ReturnType<typeof getSettlements>[number] | null>(null);

  const refresh = () => setList(getSettlements());

  useEffect(() => {
    // 首次进入且为空时，填充示例账本
    if (getSettlements().length === 0) {
      DEMO_SEED.forEach(d => simulateSettlement(d.total, d.payer));
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = getSettlementStats();

  const handleSimulate = () => {
    const total = Number(amount);
    if (!total || total <= 0) { alert("请输入有效金额"); return; }
    const tx = simulateSettlement(total, payer.trim());
    if (tx) { setLastTx(tx); setAmount(""); setPayer(""); refresh(); }
  };

  const sorted = [...list].sort((a, b) => b.blockNumber - a.blockNumber);

  return (
    <PageContainer title="区块链自动结算">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200">
          <DemoBadge />
          <span>W3 合约自动结算 DEMO 原型 · 基于合约规则自动分账并写入"链上账本"（演示，非真实链）</span>
        </div>

        {/* 合约分账规则 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3">📜 合约分账规则</h3>
          <p className="text-xs text-gray-500 mb-3">企业付款成功后，合约自动按以下比例向各方分账：</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-200">
              <div className="text-lg font-bold text-amber-700">{Math.round(DEFAULT_SETTLEMENT_RULE.platformFeeRate * 100)}%</div>
              <div className="text-xs text-gray-500 mt-1">{ROLE_LABELS.platform.label}（服务费）</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
              <div className="text-lg font-bold text-blue-700">{Math.round(DEFAULT_SETTLEMENT_RULE.expertRate * 100)}%</div>
              <div className="text-xs text-gray-500 mt-1">{ROLE_LABELS.expert.label}（方案）</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-200">
              <div className="text-lg font-bold text-purple-700">{Math.round(DEFAULT_SETTLEMENT_RULE.aiRate * 100)}%</div>
              <div className="text-xs text-gray-500 mt-1">{ROLE_LABELS.ai.label}（实现）</div>
            </div>
          </div>
        </div>

        {/* 模拟结算 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3">⛓ 模拟一笔结算</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">交易金额（¥）</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="如 58800" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">付款方（企业）</label>
              <input type="text" value={payer} onChange={e => setPayer(e.target.value)}
                placeholder="如 某制造企业" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 outline-none" />
            </div>
          </div>
          <Button onClick={handleSimulate} size="lg">⛓ 触发合约自动结算</Button>

          {lastTx && (
            <div className="mt-4 bg-green-50 rounded-xl p-4 border border-green-200 text-sm">
              <div className="font-bold text-green-700 mb-2">✅ 结算已上链</div>
              <div className="text-gray-600">区块高度：<span className="font-mono">#{lastTx.blockNumber}</span></div>
              <div className="text-gray-600">合约交易：<span className="font-mono break-all">{shortHash(lastTx.txHash)}</span></div>
              <div className="mt-2 space-y-1">
                {lastTx.splits.map(s => (
                  <div key={s.role} className="flex justify-between">
                    <span>{s.roleName}</span>
                    <span className="font-medium text-gray-800">¥{s.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 链上账本 */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="text-xl">📒</span>
            <div>
              <h3 className="font-bold text-gray-800">链上账本</h3>
              <p className="text-xs text-gray-500">已结算 {stats.count} 笔 · 累计 ¥{stats.totalAmount.toLocaleString()}</p>
            </div>
          </div>
          {sorted.length === 0 ? (
            <div className="text-center py-12 text-gray-400">暂无结算记录</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sorted.map(tx => (
                <div key={tx.id} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">#{tx.blockNumber}</span>
                      <span className="text-sm font-medium text-gray-800">{tx.payer}</span>
                    </div>
                    <span className="text-sm font-bold text-primary-700">¥{tx.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono break-all">tx: {shortHash(tx.txHash)} · block: {shortHash(tx.blockHash)}</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tx.splits.map(s => (
                      <span key={s.role} className="text-[11px] bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-gray-600">
                        {s.roleName} ¥{s.amount.toLocaleString()}
                      </span>
                    ))}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">{fmtTime(tx.timestamp)} · 状态：已结算</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button onClick={() => navigate("/dashboard")} variant="outline">📊 平台数据看板</Button>
          <Button onClick={() => navigate("/market")} variant="outline">🛍️ 去下单体验自动结算</Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default SettlementPage;
