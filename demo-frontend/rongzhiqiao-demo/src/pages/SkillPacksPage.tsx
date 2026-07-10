import React from "react";
import { PageContainer, Button } from "../components/Common";
import { skillPacks } from "../data/demoData";

const SkillPacksPage: React.FC = () => (
  <PageContainer title="可复用技能包">
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-8 border border-purple-100">
        <h2 className="font-bold text-lg text-gray-800 mb-2">💡 什么是技能包？</h2>
        <p className="text-sm text-gray-600">
          每个技能包来自一个真实交付项目——专家经验+AI实现，脱敏封装后可被同类企业快速复用。
          购买技能包可抵扣完整交付服务费。正式数据由客户自行注入。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {skillPacks.map((pack) => (
          <div
            key={pack.id}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow"
          >
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-3">
              <span className="text-xs text-primary-100 font-mono">{pack.version}</span>
              <h3 className="font-bold text-white mt-1">{pack.name}</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4">{pack.description}</p>
              <div className="space-y-2 mb-4">
                {pack.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500">✓</span>
                    {h}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                <span>👤 {pack.expert}</span>
                <span>🤖 {pack.aiTalent}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary-700">
                  ¥{pack.price.toLocaleString()}
                </span>
                <Button size="sm" variant="outline">
                  查看详情
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-3">🔄 技能包生命周期</h3>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="bg-white rounded-lg px-3 py-2 border">项目交付</span>
          <span>→</span>
          <span className="bg-white rounded-lg px-3 py-2 border">脱敏抽象</span>
          <span>→</span>
          <span className="bg-white rounded-lg px-3 py-2 border">封装上架</span>
          <span>→</span>
          <span className="bg-white rounded-lg px-3 py-2 border">新客户复用</span>
          <span>→</span>
          <span className="bg-white rounded-lg px-3 py-2 border">升级迭代</span>
        </div>
      </div>
    </div>
  </PageContainer>
);

export default SkillPacksPage;
