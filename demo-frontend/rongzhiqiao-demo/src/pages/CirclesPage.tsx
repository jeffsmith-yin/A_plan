import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, Button, DemoBadge } from "../components/Common";
import {
  getDemoCircles, Circle, subscribeToCircle, isSubscribedToCircle,
  searchCircles, getCirclesSortedByRanking, getCirclesSortedByMembers,
} from "../data/store";

const CirclesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortMode, setSortMode] = useState<"ranking" | "members">("ranking");
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [subMsg, setSubMsg] = useState<string | null>(null);

  const allCircles = getDemoCircles();
  const filtered = searchKeyword
    ? searchCircles(searchKeyword)
    : sortMode === "ranking" ? getCirclesSortedByRanking() : getCirclesSortedByMembers();

  const handleSubscribe = (circle: Circle) => {
    subscribeToCircle(circle.id, circle.saleFee);
    setShowSubscribe(false);
    setSubMsg(`已订阅「${circle.name}」！有效期至 ${new Date(Date.now() + 365*24*60*60*1000).toLocaleDateString("zh-CN")}`);
    setTimeout(() => setSubMsg(null), 3000);
  };

  const handleViewDetail = (circle: Circle) => {
    setSelectedCircle(circle);
    setShowSubscribe(true);
  };

  return (
    <PageContainer title="圈子">
      <div className="max-w-5xl mx-auto">
        {/* 顶部搜索 + 排序 */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <input type="text" value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                placeholder="🔍 搜索圈子、关键词..."
                className="w-full px-4 py-2.5 pl-10 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
              <button onClick={() => setSortMode("ranking")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  sortMode === "ranking" ? "bg-white shadow text-primary-700" : "text-gray-500"
                }`}>
                🏆 排名
              </button>
              <button onClick={() => setSortMode("members")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  sortMode === "members" ? "bg-white shadow text-primary-700" : "text-gray-500"
                }`}>
                👥 人数
              </button>
            </div>
          </div>

          {subMsg && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 animate-pulse text-center">
              ✅ {subMsg}
            </div>
          )}
        </div>

        {/* 圈子列表 */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-400">未找到匹配的圈子</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((circle, idx) => {
              const subscribed = isSubscribedToCircle(circle.id);
              return (
                <div key={circle.id}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* 排名徽章 */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                        circle.ranking <= 3 ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gray-300"
                      }`}>
                        {sortMode === "ranking" ? `#${circle.ranking}` : `#${idx+1}`}
                      </div>

                      {/* 圈子信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-2xl">{circle.icon}</span>
                          <h3 className="font-bold text-lg text-gray-800">{circle.name}</h3>
                          {subscribed && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">已订阅</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mb-3">{circle.description}</p>

                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                          <span>👥 {(circle.memberCount/10000).toFixed(1)}万成员</span>
                          <span>📝 {(circle.postCount/10000).toFixed(1)}万帖子</span>
                          <span>🏷️ {circle.tags.slice(0, 3).join(" · ")}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xl font-bold text-primary-700">¥{circle.saleFee}</span>
                            <span className="text-sm text-gray-400">/年</span>
                            {circle.saleFee < circle.annualFee && (
                              <span className="text-xs text-gray-400 line-through ml-2">¥{circle.annualFee}</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleViewDetail(circle)}
                              className="text-xs text-gray-500 hover:text-primary-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary-300">
                              查看详情
                            </button>
                            {subscribed ? (
                              <span className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg font-medium">
                                ✅ 已加入
                              </span>
                            ) : (
                              <button onClick={() => { setSelectedCircle(circle); setShowSubscribe(true); }}
                                className="text-xs bg-primary-600 text-white px-4 py-1.5 rounded-lg hover:bg-primary-700 font-medium">
                                加入圈子
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 订阅确认弹窗 */}
        {showSubscribe && selectedCircle && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{selectedCircle.icon}</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{selectedCircle.name}</h3>
                  <p className="text-sm text-gray-500">{selectedCircle.category} · {(selectedCircle.memberCount/10000).toFixed(1)}万成员</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h4 className="font-bold text-sm text-gray-700 mb-2">圈子介绍</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedCircle.longIntro}</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                <span>🏷️ {selectedCircle.tags.join(" · ")}</span>
                <span>📝 {(selectedCircle.postCount/10000).toFixed(1)}万帖子</span>
              </div>

              <div className="bg-primary-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">年费订阅</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary-700">¥{selectedCircle.saleFee}</span>
                    <span className="text-sm text-gray-400">/年</span>
                    {selectedCircle.saleFee < selectedCircle.annualFee && (
                      <div className="text-xs text-gray-400 line-through">原价 ¥{selectedCircle.annualFee}/年</div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-primary-600 mt-2">📅 订阅有效期至 {new Date(Date.now() + 365*24*60*60*1000).toLocaleDateString("zh-CN")}</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowSubscribe(false)}
                  className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                  取消
                </button>
                <button onClick={() => handleSubscribe(selectedCircle)}
                  className="flex-1 py-2.5 text-sm bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium">
                  💰 确认订阅（¥{selectedCircle.saleFee}/年）
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-3 text-center">⚠️ DEMO环境，订阅为模拟操作，不会真实扣款</p>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default CirclesPage;
