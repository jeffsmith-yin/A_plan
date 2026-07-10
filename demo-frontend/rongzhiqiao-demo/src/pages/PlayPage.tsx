import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, ProgressBar, BusinessCard, Button } from "../components/Common";
import { experts, aiTalents } from "../data/demoData";

const TOTAL_STEPS = 5;

const PlayPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const [selectedPain, setSelectedPain] = useState<string | null>(null);
  const navigate = useNavigate();

  const pains = [
    { id: "customer", icon: "📢", title: "获客太难", desc: "想用AI精准拓客，降低获客成本" },
    { id: "efficiency", icon: "⚡", title: "效率太低", desc: "想用AI自动化重复工作，提升人效" },
    { id: "cost", icon: "💰", title: "成本太高", desc: "想用AI优化流程，降低运营成本" },
  ];

  const currentExpert = experts[0]; // 张建国
  const currentAi = aiTalents[0]; // 李明

  const nextStep = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  };

  return (
    <PageContainer title="闯关体验">
      <div className="max-w-3xl mx-auto">
        <ProgressBar current={step} total={TOTAL_STEPS} />

        {/* 第1关：选择痛点 */}
        {step === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              🎯 第1关：选择企业痛点
            </h2>
            <p className="text-gray-500 mb-6">
              选择一个您企业当前最想用AI解决的问题
            </p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {pains.map((pain) => (
                <div
                  key={pain.id}
                  className={`pain-card text-center ${
                    selectedPain === pain.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedPain(pain.id)}
                >
                  <div className="text-4xl mb-3">{pain.icon}</div>
                  <h3 className="font-bold text-gray-800 mb-1">{pain.title}</h3>
                  <p className="text-xs text-gray-500">{pain.desc}</p>
                </div>
              ))}
            </div>
            <Button onClick={nextStep} disabled={!selectedPain} size="lg">
              下一步：匹配专家 →
            </Button>
          </div>
        )}

        {/* 第2关：匹配专家 */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              🔍 第2关：匹配行业专家
            </h2>
            <p className="text-gray-500 mb-6">
              根据您的痛点，AI智能匹配到以下专家
            </p>
            <BusinessCard
              avatar={currentExpert.avatar}
              name={currentExpert.name}
              title={currentExpert.title}
              tags={currentExpert.tags}
            >
              <p className="mb-2">{currentExpert.intro}</p>
              <div className="text-xs text-gray-400 mt-2">
                📞 {currentExpert.phone} · 💬 {currentExpert.wechat}
              </div>
            </BusinessCard>
            <div className="mt-6 flex gap-3">
              <Button onClick={nextStep} size="lg">
                下一步：匹配AI人才 →
              </Button>
              <Button onClick={() => navigate("/chat")} variant="outline">
                💬 与专家在线沟通
              </Button>
            </div>
          </div>
        )}

        {/* 第3关：匹配AI人才 */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              🤖 第3关：匹配AI技术人才
            </h2>
            <p className="text-gray-500 mb-6">
              您的AI技术搭档，负责将专家经验转化为可部署的AI方案
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <BusinessCard
                avatar={currentExpert.avatar}
                name={currentExpert.name}
                title={currentExpert.title}
                tags={currentExpert.tags}
              >
                <p className="text-xs text-gray-400">行业专家 · 诊断+审核</p>
              </BusinessCard>
              <BusinessCard
                avatar={currentAi.avatar}
                name={currentAi.name}
                title={currentAi.title}
                tags={currentAi.stack}
              >
                <p className="mb-2">{currentAi.intro}</p>
                <p className="text-xs text-gray-400 mt-2">
                  📞 {currentAi.phone} · 💬 {currentAi.wechat}
                </p>
              </BusinessCard>
            </div>
            <Button onClick={nextStep} size="lg">
              下一步：查看方案 →
            </Button>
          </div>
        )}

        {/* 第4关：查看方案 */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              📋 第4关：查看定制方案
            </h2>
            <p className="text-gray-500 mb-6">
              {currentExpert.name} + {currentAi.name} 为您定制
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-100">
              <h3 className="font-bold text-lg text-gray-800 mb-4">
                🏭 制造业AI降本增效方案（演示版）
              </h3>
              <div className="space-y-3">
                {[
                  { icon: "📅", title: "智能排产Agent", desc: "预计降低排产时间70%，减少换线浪费60%", color: "bg-green-50 border-green-200" },
                  { icon: "🔍", title: "质量检测AI", desc: "预计降低不良率35%，减少漏检率80%", color: "bg-blue-50 border-blue-200" },
                  { icon: "📦", title: "供应链优化模型", desc: "预计降低库存成本20%，提升交付准时率至94%", color: "bg-purple-50 border-purple-200" },
                ].map((item, i) => (
                  <div key={i} className={`${item.color} border rounded-xl p-4 flex items-start gap-3`}>
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h4 className="font-bold text-gray-800">{item.title}</h4>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={nextStep} size="lg">
                下一步：模拟交易 →
              </Button>
              <Button onClick={() => navigate("/skill-packs")} variant="outline">
                📦 查看可复用技能包
              </Button>
            </div>
          </div>
        )}

        {/* 第5关：模拟交易 */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              ⛓️ 第5关：模拟交易结算
            </h2>
            <p className="text-gray-500 mb-6">
              项目费用由W3智能合约自动分账
            </p>

            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="text-center mb-4">
                <span className="text-4xl font-bold text-primary-700">¥15,000</span>
                <p className="text-sm text-gray-500">项目总费用</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span>👤</span>
                    <span className="font-medium">{currentExpert.name}（专家）</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-green-600">¥6,000</span>
                    <span className="text-xs text-gray-400 ml-1">40%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span>🤖</span>
                    <span className="font-medium">{currentAi.name}（AI人才）</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-green-600">¥6,000</span>
                    <span className="text-xs text-gray-400 ml-1">40%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span>🌉</span>
                    <span className="font-medium">融智桥平台</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-600">¥3,000</span>
                    <span className="text-xs text-gray-400 ml-1">20%</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center text-xs text-gray-400">
                ⛓️ 由W3智能合约自动执行分账 · 规则透明 · 不可篡改
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => navigate("/dashboard")} size="lg">
                📊 查看平台数据看板 →
              </Button>
              <Button onClick={() => navigate("/leaderboard")} variant="outline">
                🏆 积分排行榜
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default PlayPage;
