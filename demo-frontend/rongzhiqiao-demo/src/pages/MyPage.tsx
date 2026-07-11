import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, Button } from "../components/Common";
import {
  getCurrentUser, updatePerson, getCurrentPhone, getUserRoles, getRoles, getWallet, requestWithdrawal,
  logout, deleteAccount, maskPhone, ROLE_LABELS, isCurrentUserSuperAdmin,
} from "../data/store";

// ─── 头像编辑弹窗 ─────────────────────────────────────────
const AvatarEditor: React.FC<{
  currentAvatar: string;
  userName: string;
  onSave: (base64: string) => void;
  onDelete: () => void;
  onClose: () => void;
}> = ({ currentAvatar, userName, onSave, onDelete, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [preview, setPreview] = useState(currentAvatar);
  const [mode, setMode] = useState<"view" | "camera" | "crop">("view");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 清理摄像头
  useEffect(() => {
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, [stream]);

  // 处理图片大小
  const compressAndSave = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxW = 300, maxH = 300;
      let w = img.width, h = img.height;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL("image/jpeg", 0.85);
      onSave(compressed);
      onClose();
    };
    img.src = dataUrl;
  };

  // 从文件选择
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("图片不超过2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      setMode("crop");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // 打开摄像头
  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: "user" } });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
      setMode("camera");
    } catch {
      alert("无法访问摄像头，请检查权限设置");
    }
  };

  // 拍照
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPreview(dataUrl);
    // 停止摄像头
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setMode("crop");
  };

  // 裁剪区域拖拽
  const handleCropMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropX, y: e.clientY - cropY });
  };
  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCropX(e.clientX - dragStart.x);
    setCropY(e.clientY - dragStart.y);
  };
  const handleCropMouseUp = () => setIsDragging(false);

  const handleDeleteAvatar = () => {
    if (!window.confirm("确定删除头像吗？将恢复为默认头像。")) return;
    onDelete();
    onClose();
  };

  const handleConfirmCrop = () => {
    if (preview) compressAndSave(preview);
  };

  // 当前预览
  const displayAvatar = preview || currentAvatar;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* 顶部标题 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">
            {mode === "camera" ? "📸 拍照" : mode === "crop" ? "✂️ 调整头像" : "头像设置"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* 摄像头模式 */}
        {mode === "camera" && (
          <div className="p-4 flex flex-col items-center">
            <div className="relative bg-black rounded-xl overflow-hidden w-64 h-64">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white border-4 border-primary-500 hover:scale-105 transition-transform flex items-center justify-center shadow-lg">
                <div className="w-12 h-12 rounded-full bg-primary-500"></div>
              </button>
            </div>
            <button onClick={() => { stream?.getTracks().forEach(t => t.stop()); setStream(null); setMode("view"); }}
              className="mt-3 text-sm text-gray-400 hover:text-gray-600">取消</button>
          </div>
        )}

        {/* 裁剪模式 */}
        {mode === "crop" && displayAvatar && (
          <div className="p-4 flex flex-col items-center">
            <p className="text-xs text-gray-400 mb-3">拖动图片调整位置，滚轮缩放</p>
            <div className="w-56 h-56 rounded-full overflow-hidden border-2 border-dashed border-primary-400 relative select-none"
              onMouseDown={handleCropMouseDown}
              onMouseMove={handleCropMouseMove}
              onMouseUp={handleCropMouseUp}
              onMouseLeave={handleCropMouseUp}
              onWheel={e => {
                e.preventDefault();
                setCropScale(s => Math.max(0.5, Math.min(3, s + (e.deltaY > 0 ? -0.1 : 0.1))));
              }}>
              <img src={displayAvatar} alt="预览"
                className="absolute max-w-none cursor-move"
                style={{
                  transform: `translate(${cropX}px, ${cropY}px) scale(${cropScale})`,
                  transformOrigin: "center center",
                  left: "50%", top: "50%",
                  marginLeft: `-${128 * cropScale}px`,
                  marginTop: `-${128 * cropScale}px`,
                  width: `${256 * cropScale}px`,
                  height: `${256 * cropScale}px`,
                }}
                draggable={false}
              />
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
              <button onClick={() => setCropScale(s => Math.max(0.5, s - 0.1))} className="px-2 py-1 bg-gray-100 rounded">🔍-</button>
              <span>缩放</span>
              <button onClick={() => setCropScale(s => Math.min(3, s + 0.1))} className="px-2 py-1 bg-gray-100 rounded">🔍+</button>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setCropScale(1); setCropX(0); setCropY(0); setMode("view"); }}
                className="px-5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">重选</button>
              <button onClick={handleConfirmCrop}
                className="px-5 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 shadow">✅ 确认使用</button>
            </div>
          </div>
        )}

        {/* 默认模式：选择来源 */}
        {mode === "view" && (
          <div className="p-5">
            {/* 当前头像预览 */}
            <div className="flex justify-center mb-5">
              {displayAvatar ? (
                <img src={displayAvatar} alt="头像" className="w-24 h-24 rounded-full object-cover border-4 border-primary-100 shadow" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold shadow">
                  {userName?.charAt(0) || "👤"}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-xl bg-primary-50 text-primary-700 font-medium text-sm hover:bg-primary-100 transition-colors flex items-center justify-center gap-2">
                🖼️ 从相册选择
              </button>
              <button onClick={startCamera}
                className="w-full py-3 rounded-xl bg-blue-50 text-blue-700 font-medium text-sm hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                📸 拍照
              </button>
              {currentAvatar && (
                <button onClick={handleDeleteAvatar}
                  className="w-full py-3 rounded-xl bg-red-50 text-red-500 font-medium text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                  🗑️ 删除头像
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFilePick} className="hidden" />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 我的页面 ─────────────────────────────────────────────
const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const phone = getCurrentPhone();
  const userRoles = getUserRoles();
  const isSuperAdmin = isCurrentUserSuperAdmin();
  const [wallet, setWallet] = useState<ReturnType<typeof getWallet>>(() =>
    phone ? getWallet(phone) : { phone: "", balance: 0, entries: [], withdrawals: [] }
  );
  const refreshWallet = () =>
    setWallet(phone ? getWallet(phone) : { phone: "", balance: 0, entries: [], withdrawals: [] });

  // 钱包提现（DEMO）
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("微信");
  const [withdrawMsg, setWithdrawMsg] = useState("");

  const handleWithdraw = () => {
    if (!phone) { setWithdrawMsg("请先登录"); return; }
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) { setWithdrawMsg("请输入有效的提现金额"); return; }
    try {
      requestWithdrawal(phone, amt, withdrawMethod);
      setWithdrawAmount("");
      setShowWithdraw(false);
      setWithdrawMsg("");
      refreshWallet();
      alert("✅ 提现申请已提交，状态：处理中（DEMO）");
    } catch (err: any) {
      setWithdrawMsg(err?.message || "提现失败");
    }
  };

  // 钱包明细导出（CSV / JSON）
  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportWalletCSV = () => {
    const rows = ["类型,角色/方式,金额(元),订单号或状态,区块号,时间"];
    [...wallet.entries].sort((a, b) => b.timestamp - a.timestamp).forEach(e =>
      rows.push(`结算,${e.roleName},${e.amount},${e.orderId},${e.blockNumber},${new Date(e.timestamp).toLocaleString("zh-CN")}`));
    [...wallet.withdrawals].sort((a, b) => b.requestedAt - a.requestedAt).forEach(w =>
      rows.push(`提现,${w.method},-${w.amount},${w.status},,${new Date(w.requestedAt).toLocaleString("zh-CN")}`));
    downloadFile("﻿" + rows.join("\n"), `钱包明细_${maskPhone(phone || "user")}_${Date.now()}.csv`, "text/csv;charset=utf-8");
  };

  const exportWalletJSON = () => {
    const data = {
      phone: maskPhone(phone || ""),
      exportedAt: new Date().toISOString(),
      balance: wallet.balance,
      entries: wallet.entries,
      withdrawals: wallet.withdrawals,
    };
    downloadFile(JSON.stringify(data, null, 2), `钱包明细_${maskPhone(phone || "user")}_${Date.now()}.json`, "application/json");
  };

  // 我推荐的人数（推荐人是我任一角色的成员数）
  const myRoleIds = userRoles.map(r => r.id);
  const referralCount = getRoles().filter(r => r.referrerId && myRoleIds.includes(r.referrerId)).length;

  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);

  const handleAvatarSave = (base64: string) => {
    setAvatar(base64);
    updatePerson({ avatar: base64 });
  };

  const handleAvatarDelete = () => {
    setAvatar("");
    updatePerson({ avatar: "" });
  };

  const handleLogout = () => {
    if (!window.confirm("确定退出登录？")) return;
    logout();
    navigate("/nda");
  };

  const handleDeleteAccount = () => {
    if (!window.confirm("⚠️ 确定注销账号？\n\n注销后您将无法登录，但您的历史数据（角色、文件、收益记录等）将保留。")) return;
    if (!window.confirm("再次确认：真的要注销吗？")) return;
    deleteAccount();
    navigate("/");
  };

  if (!user) {
    return (
      <PageContainer title="我的">
        <div className="text-center py-16 text-gray-500">请先登录</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="我的">
      <div className="max-w-md mx-auto space-y-4">
        {/* 头像 + 基本信息 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative cursor-pointer" onClick={() => setShowAvatarEditor(true)}>
              {avatar ? (
                <img src={avatar} alt="头像" className="w-16 h-16 rounded-full object-cover border-2 border-primary-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                  {user.name?.charAt(0) || "👤"}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-primary-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                ✎
              </div>
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-800">{user.name || "未设置姓名"}</h2>
              <p className="text-sm text-gray-400">{maskPhone(phone || "")}</p>
              {isSuperAdmin && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full mt-1 inline-block">超级管理员</span>}
            </div>
          </div>
          <p className="text-xs text-gray-400">点击头像可拍照、从相册选择或删除</p>
        </div>

        {/* 头像编辑弹窗 */}
        {showAvatarEditor && (
          <AvatarEditor
            currentAvatar={avatar}
            userName={user.name}
            onSave={handleAvatarSave}
            onDelete={handleAvatarDelete}
            onClose={() => setShowAvatarEditor(false)}
          />
        )}

        {/* 积分余额 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3">💰 积分余额</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-amber-600">{user.score}</div>
              <div className="text-xs text-gray-400 mt-1">可用积分</div>
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>新成员 +10分</p>
              <p>推荐一人 +2分</p>
            </div>
          </div>
          {userRoles.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">各角色积分</p>
              {userRoles.map(r => {
                const meta = ROLE_LABELS[r.role];
                return (
                  <div key={r.id} className="flex items-center justify-between text-sm py-1">
                    <span>{meta.icon} {r.name} <span className={`text-xs ${meta.color} px-1.5 py-0.5 rounded-full`}>{meta.label}</span></span>
                    <span className="font-medium text-gray-700">{r.score}分</span>
                  </div>
                );
              })}
              <p className="text-xs text-gray-400 mt-2">我推荐了 <strong className="text-amber-600">{referralCount}</strong> 位成员（每位 +2 分）</p>
            </div>
          )}
        </div>

        {/* 我的钱包 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">💰 我的钱包</h3>
            <span className="text-xs text-gray-400">合约结算自动到账</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-green-600">¥{wallet.balance.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">可用余额（来自 W3 合约自动结算）</div>
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>{wallet.entries.length} 笔结算</p>
              {wallet.withdrawals.length > 0 && <p>{wallet.withdrawals.length} 笔提现</p>}
            </div>
          </div>

          {/* 操作按钮：提现 / 导出 */}
          <div className="flex gap-2 mt-4">
            <button onClick={() => { setShowWithdraw(v => !v); setWithdrawMsg(""); }}
              className="flex-1 bg-green-600 text-white text-sm font-medium py-2 rounded-xl hover:bg-green-700 transition-colors">
              💸 提现
            </button>
            <button onClick={exportWalletCSV}
              className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 rounded-xl hover:bg-gray-200 transition-colors">
              ⬇️ CSV
            </button>
            <button onClick={exportWalletJSON}
              className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 rounded-xl hover:bg-gray-200 transition-colors">
              ⬇️ JSON
            </button>
          </div>

          {/* 提现表单 */}
          {showWithdraw && (
            <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-10">金额</span>
                <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder={`最多 ¥${wallet.balance.toLocaleString()}`}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-green-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-10">方式</span>
                <select value={withdrawMethod} onChange={e => setWithdrawMethod(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-green-400 bg-white">
                  <option value="微信">微信</option>
                  <option value="支付宝">支付宝</option>
                  <option value="银行卡">银行卡</option>
                </select>
              </div>
              {withdrawMsg && <p className="text-xs text-red-500">{withdrawMsg}</p>}
              <div className="flex gap-2">
                <button onClick={handleWithdraw}
                  className="flex-1 bg-green-600 text-white text-sm py-1.5 rounded-lg hover:bg-green-700 transition-colors">确认提现</button>
                <button onClick={() => { setShowWithdraw(false); setWithdrawMsg(""); }}
                  className="flex-1 bg-white text-gray-500 text-sm py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">取消</button>
              </div>
            </div>
          )}

          {/* 结算明细（最近 6 笔） */}
          {wallet.entries.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 max-h-44 overflow-y-auto">
              <p className="text-xs text-gray-400 mb-1">结算到账（最近 6 笔）</p>
              {[...wallet.entries].sort((a, b) => b.timestamp - a.timestamp).slice(0, 6).map(e => (
                <div key={e.id} className="flex items-center justify-between text-sm py-0.5">
                  <span>{ROLE_LABELS[e.role]?.icon} {e.roleName}<span className="text-[10px] text-gray-300 ml-1">#{e.blockNumber}</span></span>
                  <span className="font-medium text-gray-700">+¥{e.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* 提现记录 */}
          {wallet.withdrawals.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 max-h-32 overflow-y-auto">
              <p className="text-xs text-gray-400 mb-1">提现记录</p>
              {[...wallet.withdrawals].sort((a, b) => b.requestedAt - a.requestedAt).map(w => (
                <div key={w.id} className="flex items-center justify-between text-sm py-0.5">
                  <span>💸 {w.method}{" "}
                    <span className={`text-[10px] px-1 rounded-full ${w.status === "done" ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>
                      {w.status === "done" ? "已到账" : "处理中"}
                    </span>
                  </span>
                  <span className="font-medium text-gray-700">-¥{w.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-gray-400 mt-2">💡 去产品市场下单并完成支付，分账将自动进入你的钱包；提现为 DEMO 演示。</p>
        </div>

        {/* 功能菜单 */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden divide-y divide-gray-50">
          <button onClick={() => navigate("/nda-sign")}
            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors text-left">
            <span className="text-xl">🔒</span>
            <div className="flex-1">
              <span className="font-medium text-gray-800 text-sm">保密协议 (NDA)</span>
              <p className="text-xs text-gray-400">签署 / 续签 DEMO 保密协议</p>
            </div>
            <span className="text-gray-300">→</span>
          </button>

          <button onClick={() => navigate("/leaderboard")}
            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors text-left">
            <span className="text-xl">🏆</span>
            <div className="flex-1">
              <span className="font-medium text-gray-800 text-sm">积分排行榜</span>
              <p className="text-xs text-gray-400">查看成员积分与推荐</p>
            </div>
            <span className="text-gray-300">→</span>
          </button>

          <button onClick={() => navigate("/profile")}
            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors text-left">
            <span className="text-xl">⚙️</span>
            <div className="flex-1">
              <span className="font-medium text-gray-800 text-sm">设置</span>
              <p className="text-xs text-gray-400">修改个人信息、角色和脱敏规则</p>
            </div>
            <span className="text-gray-300">→</span>
          </button>

          <button onClick={() => alert("【DEMO】帮助与反馈\n\n常见问题：\n1. 如何注册？→ 手机号验证码登录\n2. 如何选择角色？→ 入驻时可多选\n3. 文件上传限制？→ 单文件5MB\n4. API Key在哪设置？→ 文件管理页\n\n更多帮助请联系：support@rongzhiqiao.com")}
            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors text-left">
            <span className="text-xl">💬</span>
            <div className="flex-1">
              <span className="font-medium text-gray-800 text-sm">帮助与反馈</span>
              <p className="text-xs text-gray-400">常见问题、意见反馈</p>
            </div>
            <span className="text-gray-300">→</span>
          </button>

          <button onClick={() => alert("【DEMO】检查更新\n\n当前版本：v0.7.1\n发布日期：2026-07-09\n\n更新内容：\n✅ 软注销功能\n✅ 超级管理员系统\n✅ 子管理员设置\n✅ 我的菜单\n✅ 头像设置\n✅ 积分明细\n\n已是最新版本")}
            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors text-left">
            <span className="text-xl">🔄</span>
            <div className="flex-1">
              <span className="font-medium text-gray-800 text-sm">检查更新</span>
              <p className="text-xs text-gray-400">v0.7.1 · 已是最新版本</p>
            </div>
            <span className="text-gray-300">→</span>
          </button>
        </div>

        {/* 退出 + 注销 */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden divide-y divide-gray-50">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors text-left">
            <span className="text-xl">🚪</span>
            <span className="font-medium text-gray-700 text-sm">退出登录</span>
          </button>
          <button onClick={handleDeleteAccount}
            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-red-50 transition-colors text-left">
            <span className="text-xl">⚠️</span>
            <span className="font-medium text-red-500 text-sm">注销账号</span>
            <span className="text-xs text-red-300 ml-auto">数据保留</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 py-4">
          融智桥 DEMO v0.7.1 · 数据仅本地存储
        </p>
      </div>
    </PageContainer>
  );
};

export default MyPage;
