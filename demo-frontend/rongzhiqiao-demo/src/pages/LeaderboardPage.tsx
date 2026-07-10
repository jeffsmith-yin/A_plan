import React, { useState, useEffect } from "react";
import { PageContainer, DemoBadge } from "../components/Common";
import { getScoreLeaderboard, getRoles, ROLE_LABELS, SCORE_RULES } from "../data/store";

const LeaderboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState(getScoreLeaderboard());

  useEffect(() => {
    setLeaderboard(getScoreLeaderboard());
    const timer = setInterval(() => setLeaderboard(getScoreLeaderboard()), 3000);
    return () => clearInterval(timer);
  }, []);

  const getReferralCount = (roleId: string) => {
    return getRoles().filter(r => r.referrerId === roleId).length;
  };

  return (
    <PageContainer title="积分排行榜">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <div>
              <h3 className="font-bold text-gray-800">积分排行榜</h3>
              <p className="text-xs text-gray-500">
                新成员+{SCORE_RULES.NEW_MEMBER}分 · 推荐一人+{SCORE_RULES.REFERRAL}分 · 不可重复推荐
              </p>
            </div>
            <div className="ml-auto"><DemoBadge /></div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-16 text-gray-400">暂无成员</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {leaderboard.map((entry, i) => {
                const meta = ROLE_LABELS[entry.role];
                const referrals = getReferralCount(entry.id);
                return (
                  <div key={entry.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="w-10 text-center">
                      {i < 3 ? (
                        <span className="text-2xl">{["🥇", "🥈", "🥉"][i]}</span>
                      ) : (
                        <span className="text-lg font-bold text-gray-400">{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{entry.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                      </div>
                      {entry.referrerName && (
                        <div className="text-xs text-gray-400">推荐人：{entry.referrerName}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary-700">{entry.score}分</div>
                      <div className="text-xs text-gray-400">推荐{referrals}人</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
          <h4 className="font-bold text-gray-800 mb-2">📋 积分规则说明</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>🆕 新成员注册：<strong>+{SCORE_RULES.NEW_MEMBER}分</strong></li>
            <li>👥 成功推荐一位新成员：<strong>+{SCORE_RULES.REFERRAL}分</strong></li>
            <li>🚫 重复推荐（同推荐人+同姓名）不计入积分</li>
            <li>🎁 积分可兑换平台服务费优惠、优先匹配等权益</li>
          </ul>
        </div>
      </div>
    </PageContainer>
  );
};

export default LeaderboardPage;
