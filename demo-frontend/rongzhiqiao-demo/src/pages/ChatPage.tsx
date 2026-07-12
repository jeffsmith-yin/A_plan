import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer, DemoBadge } from "../components/Common";
import {
  getCurrentRole, getRoles, getMessages, getChatWith, getPlatformChannelMessages,
  sendMessage, ChatMessage, RoleCard, ROLE_LABELS, SECONDARY_LABELS,
  getPlatformDisplayName,
} from "../data/store";
import { useT } from "../i18n";

const ChatPage: React.FC = () => {
  const t = useT();
  const { targetId } = useParams<{ targetId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [currentRole, setCurrent] = useState<RoleCard | null>(null);
  const [allRoles, setAllRoles] = useState<RoleCard[]>([]);
  const [showMention, setShowMention] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isGroupChat = targetId === "all";
  const isPlatformChannel = targetId === "platforms";
  const targetRole = (!isGroupChat && !isPlatformChannel) ? allRoles.find(r => r.id === targetId) : null;

  const refresh = useCallback(() => {
    const cr = getCurrentRole();
    setCurrent(cr);
    setAllRoles(getRoles());
    if (!cr) return;
    if (isPlatformChannel) setMessages(getPlatformChannelMessages());
    else if (isGroupChat) setMessages(getMessages().sort((a, b) => a.timestamp - b.timestamp));
    else if (targetId) setMessages(getChatWith(cr.id, targetId));
  }, [targetId, isGroupChat, isPlatformChannel]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // 可@的成员列表
  const mentionableRoles = allRoles.filter(r => r.id !== currentRole?.id);

  // 检测 @ 输入
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    const pos = e.target.selectionStart;
    setCursorPos(pos);

    // 查找光标前最近的 @
    const beforeCursor = val.slice(0, pos);
    const atMatch = beforeCursor.match(/@([^\s@]*)$/);
    if (atMatch) {
      setShowMention(true);
      setMentionFilter(atMatch[1]);
    } else {
      setShowMention(false);
    }
  };

  // 选择 @ 对象
  const handleMentionSelect = (role: RoleCard) => {
    const beforeCursor = text.slice(0, cursorPos);
    const afterCursor = text.slice(cursorPos);
    const atMatch = beforeCursor.match(/@([^\s@]*)$/);
    if (!atMatch) return;

    const newBefore = beforeCursor.slice(0, atMatch.index!) + `@${role.name} `;
    const newText = newBefore + afterCursor;
    setText(newText);
    setShowMention(false);
    inputRef.current?.focus();
  };

  // 解析消息中的 @提及 为高亮
  const renderMessageText = (msg: ChatMessage) => {
    // 将 @name 替换为高亮span
    const parts = msg.text.split(/(@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const name = part.slice(1);
        const mentioned = allRoles.find(r => r.name === name);
        if (mentioned) {
          const meta = ROLE_LABELS[mentioned.role];
          return (
            <span key={i} className="inline-flex items-center gap-0.5 bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-medium text-xs">
              {meta.icon} {part}
            </span>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleSend = () => {
    if (!text.trim() || !currentRole) return;
    // 提取mentions
    const mentionNames = Array.from(text.matchAll(/@(\S+)/g), m => m[1]);
    const mentions = allRoles.filter(r => mentionNames.includes(r.name)).map(r => r.id);

    const to = isPlatformChannel ? "platforms" : (isGroupChat ? "all" : (targetId || "all"));
    sendMessage({
      from: currentRole.id,
      fromName: currentRole.name,
      fromRole: currentRole.role,
      fromSecondary: currentRole.secondaryRole || undefined,
      to,
      text: text.trim(),
      mentions,
    });
    setText("");
    setShowMention(false);
    refresh();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMention) return; // @菜单打开时不发送
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const getTitle = () => {
    if (isPlatformChannel) return t("chat.titlePlatform", "🌉 平台内部频道");
    if (isGroupChat) return t("chat.titleGroup", "💬 群聊大厅");
    if (targetRole) return t("chat.titlePrivate", "💬 与 {name} 私聊", { name: getPlatformDisplayName(targetRole) });
    return t("chat.title", "聊天");
  };

  if (!currentRole) {
    return (
      <PageContainer title={t("chat.title", "聊天")}>
        <div className="text-center py-16 text-gray-500">
          {t("chat.noRole", "请先在平台大厅添加角色")}
          <button onClick={() => navigate("/hub")} className="text-primary-600 ml-2 underline">{t("chat.goHub", "前往大厅")}</button>
        </div>
      </PageContainer>
    );
  }

  if (isPlatformChannel && currentRole.role !== "platform") {
    return (
      <PageContainer title={t("chat.titlePlatform", "🌉 平台内部频道")}>
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🔒</div>
          <p>{t("chat.platformOnly", "平台内部频道仅限平台方角色访问")}</p>
          <button onClick={() => navigate("/hub")} className="text-primary-600 mt-2 underline">{t("chat.backHub", "返回大厅")}</button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={getTitle()}>
      <div className="max-w-3xl mx-auto">
        <div className={`bg-white rounded-2xl shadow-lg border overflow-hidden ${
          isPlatformChannel ? "border-amber-300" : "border-gray-100"
        }`}>
          {/* 头部 */}
          <div className={`px-5 py-3 border-b flex items-center justify-between ${
            isPlatformChannel ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100"
          }`}>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/hub")} className="text-gray-400 hover:text-gray-600">{t("chat.back", "← 返回")}</button>
              {isPlatformChannel ? (
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌉</span>
                  <span className="font-bold text-amber-800">{t("chat.titlePlatform", "🌉 平台内部频道")}</span>
                  <span className="text-xs text-amber-600">{t("chat.platformOnlyTag", "平台方专用")}</span>
                </div>
              ) : isGroupChat ? (
                <div className="flex items-center gap-2">
                  <span className="text-xl">💬</span>
                  <span className="font-bold text-gray-800">{t("chat.groupLabel", "群聊大厅")}</span>
                  <span className="text-xs text-gray-400">{t("chat.mentionHint", "输入 @ 可提及他人")}</span>
                </div>
              ) : targetRole && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">{ROLE_LABELS[targetRole.role].icon}</span>
                  <span className="font-bold text-gray-800">{getPlatformDisplayName(targetRole)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_LABELS[targetRole.role].color}`}>
                    {ROLE_LABELS[targetRole.role].label}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <DemoBadge />
              <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_LABELS[currentRole.role].color}`}>
                {ROLE_LABELS[currentRole.role].icon} {getPlatformDisplayName(currentRole)}
              </span>
            </div>
          </div>

          {/* 消息区 */}
          <div className="h-96 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
            {messages.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">💬</div>
                <p>{isPlatformChannel ? t("chat.platformEmpty", "平台方内部频道") : isGroupChat ? t("chat.groupEmpty", "群聊大厅，输入 @ 可提及特定成员") : t("chat.empty", "还没有消息")}</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMine = msg.from === currentRole.id;
              const senderRole = allRoles.find(r => r.id === msg.from);
              const senderMeta = senderRole ? ROLE_LABELS[senderRole.role] : null;
              const senderDisplay = senderRole ? getPlatformDisplayName(senderRole) : msg.fromName;
              // 检查当前用户是否被 @
              const isMentioned = msg.mentions.includes(currentRole.id);

              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] ${isMine ? "order-1" : ""}`}>
                    {(isGroupChat || isPlatformChannel) && !isMine && (
                      <div className="flex items-center gap-1 mb-1 ml-1 flex-wrap">
                        <span className="text-xs">{senderMeta?.icon}</span>
                        <span className="text-xs font-medium text-gray-600">{senderDisplay}</span>
                        {senderMeta && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${senderMeta.color}`}>{senderMeta.label}</span>
                        )}
                        {msg.fromSecondary && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            {SECONDARY_LABELS[msg.fromSecondary].icon}
                          </span>
                        )}
                      </div>
                    )}
                    <div className={`chat-bubble ${isMine ? "user" : isPlatformChannel ? "border border-amber-200 bg-amber-50" : "expert"} ${
                      isMentioned && !isMine ? "ring-2 ring-primary-300 bg-primary-50" : ""
                    }`}>
                      {renderMessageText(msg)}
                    </div>
                    <div className={`text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 ${isMine ? "justify-end mr-1" : "ml-1"}`}>
                      {isMentioned && !isMine && <span className="text-primary-500 font-medium">{t("chat.mentionedYou", "@了你")}</span>}
                      <span>{new Date(msg.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* 输入区 + @菜单 */}
          <div className={`p-4 border-t bg-white relative ${isPlatformChannel ? "border-amber-200" : "border-gray-100"}`}>
            {/* @ 选择菜单 */}
            {showMention && mentionableRoles.length > 0 && (
              <div className="absolute bottom-full left-4 mb-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 min-w-[220px]">
                {mentionableRoles
                  .filter(r => !mentionFilter || r.name.includes(mentionFilter))
                  .map(r => (
                    <button key={r.id} onClick={() => handleMentionSelect(r)}
                      className="w-full text-left px-4 py-2.5 hover:bg-primary-50 flex items-center gap-2 text-sm border-b border-gray-50 last:border-0 transition-colors">
                      <span>{ROLE_LABELS[r.role].icon}</span>
                      <span className="font-medium text-gray-800">{r.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_LABELS[r.role].color}`}>
                        {ROLE_LABELS[r.role].label}
                      </span>
                    </button>
                  ))}
                {mentionableRoles.filter(r => !mentionFilter || r.name.includes(mentionFilter)).length === 0 && (
                  <div className="px-4 py-3 text-xs text-gray-400">{t("chat.noMatch", "无匹配成员")}</div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <textarea ref={inputRef} value={text} onChange={handleTextChange}
                onKeyDown={handleKeyDown} rows={2}
                placeholder={
                  isGroupChat ? t("chat.phGroup", "输入消息，输入 @ 可提及特定成员...") :
                  isPlatformChannel ? t("chat.phPlatform", "发送到平台内部频道...") :
                  t("chat.phPrivate", "发送给 {name}...", { name: targetRole ? getPlatformDisplayName(targetRole) : "..." })
                }
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none resize-none text-sm"
              />
              <button onClick={handleSend} disabled={!text.trim()}
                className={`self-end px-6 py-2.5 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                  isPlatformChannel ? "bg-amber-600 hover:bg-amber-700" : "bg-primary-600 hover:bg-primary-700"
                }`}>
                {t("chat.send", "发送")}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">{t("chat.hint", "Enter 发送 · Shift+Enter 换行 · 输入 @ 提及成员")}</p>
              {isGroupChat && (
                <span className="text-xs text-primary-500">{t("chat.tipMention", "💡 试试 @某人 点名沟通")}</span>
              )}
            </div>
          </div>
        </div>

        {/* 快捷跳转 */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button onClick={() => navigate("/chat/all")}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              isGroupChat ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"
            }`}>{t("chat.quickGroup", "💬 群聊")}</button>
          {currentRole.role === "platform" && (
            <button onClick={() => navigate("/chat/platforms")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                isPlatformChannel ? "bg-amber-600 text-white border-amber-600" : "bg-white text-amber-600 border-amber-200 hover:border-amber-400"
              }`}>{t("chat.quickPlatform", "🌉 平台内部")}</button>
          )}
          {allRoles.filter(r => r.id !== currentRole.id).map(r => (
            <button key={r.id} onClick={() => navigate(`/chat/${r.id}`)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                targetId === r.id ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"
              }`}>
              {ROLE_LABELS[r.role].icon} {getPlatformDisplayName(r)}
            </button>
          ))}
          <button onClick={() => navigate("/ai-expert")}
            className="text-xs px-3 py-1.5 rounded-full border transition-all bg-white text-primary-600 border-primary-200 hover:border-primary-400">
            🤖 {t("chat.quickAI", "AI 智能体")}
          </button>
        </div>
      </div>
    </PageContainer>
  );
};

export default ChatPage;
