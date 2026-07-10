import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, Button, DemoBadge } from "../components/Common";
import {
  getCurrentRole, getFiles, getFilesByOwner,
  saveFile, deleteFile, generateId, getFileType, canDeleteFile,
  UploadedFile, FileCategory, FileStatus,
  ROLE_LABELS, FILE_TYPE_LABELS, FILE_STATUS_LABELS, formatFileSize,
  desensitizeText, getDesensitizeRulesByOwner,
} from "../data/store";
import { summarizeFile, verifyApiKey, getApiKey, setApiKey } from "../services/openai";

// 文件夹类型 - 与 FileStatus 对应
type FolderTab = FileStatus;

const FOLDER_TABS: Array<{ key: FolderTab; label: string; icon: string; desc: string }> = [
  { key: "uploaded", label: "待处理", icon: "📤", desc: "已上传，等待AI总结" },
  { key: "summarized", label: "已总结", icon: "🤖", desc: "AI已完成总结" },
  { key: "reviewed", label: "已审核", icon: "✅", desc: "人工审核完成" },
];

const FilesPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentRole, setCurrentRole] = useState(getCurrentRole());
  const isPlatform = currentRole?.role === "platform";
  const [allFiles, setAllFiles] = useState<UploadedFile[]>([]);
  const [activeFolder, setActiveFolder] = useState<FolderTab>("uploaded");
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey() || "");
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [apiReady, setApiReady] = useState<boolean | null>(null);
  const [showDesensitize, setShowDesensitize] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ file: File; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    const role = getCurrentRole();
    setCurrentRole(role);
    const files = getFiles();
    if (role?.role === "platform") {
      setAllFiles(files);
    } else if (role) {
      setAllFiles(getFilesByOwner(role.id));
    } else {
      setAllFiles([]);
    }
  };

  useEffect(() => {
    refresh();
    // 检测本地 AI 代理是否可用（非关键，仅提示用）
    fetch("/api/health")
      .then(() => setApiReady(true))
      .catch(() => setApiReady(false));
  }, []);

  // 按文件夹过滤，原始文件排在归档副本前面
  const folderFiles = allFiles
    .filter(f => f.status === activeFolder)
    .sort((a, b) => {
      // 原始文件（linkedFrom为null）排在前面
      if (a.linkedFrom && !b.linkedFrom) return 1;
      if (!a.linkedFrom && b.linkedFrom) return -1;
      return b.createdAt - a.createdAt;
    });

  // 按分类过滤（仅平台方需要）
  const [categoryFilter, setCategoryFilter] = useState<"all" | FileCategory>("all");
  const displayedFiles = categoryFilter === "all"
    ? folderFiles
    : folderFiles.filter(f => f.category === categoryFilter);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentRole) return;

    if (file.size > 5 * 1024 * 1024) { alert("DEMO限制：文件不超过5MB"); return; }

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;

      // 平台方上传：检查脱敏规则并弹窗
      if (isPlatform) {
        const rules = getDesensitizeRulesByOwner(currentRole.id);
        if (rules.length > 0) {
          setPendingUpload({ file, content });
          setShowDesensitize(true);
          e.target.value = "";
          return;
        }
      }

      // 非平台方上传：自动应用脱敏
      let finalName = file.name;
      let finalContent = content;
      if (currentRole) {
        finalName = desensitizeText(file.name, currentRole.id);
        finalContent = desensitizeText(content, currentRole.id);
      }

      doUpload(finalName, file, finalContent);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const doUpload = (fileName: string, file: File, content: string) => {
    if (!currentRole) return;
    const uploaded: UploadedFile = {
      id: generateId(),
      name: fileName,
      originalName: file.name,
      fileType: getFileType(file.name),
      category: currentRole.role as FileCategory,
      ownerId: currentRole.id,
      ownerName: currentRole.name,
      size: file.size,
      content: content,
      status: "uploaded",
      aiSummary: null,
      aiSummaryStatus: "none",
      humanEditedSummary: null,
      summaryFileId: null,
      reviewedFileId: null,
      linkedFrom: null,
      linkedFiles: [],
      createdAt: Date.now(),
    };
    saveFile(uploaded);
    refresh();
  };

  const handleAISummary = async (file: UploadedFile) => {
    if (!getApiKey()) {
      setShowApiSettings(true);
      alert("请先配置 OpenAI API Key");
      return;
    }

    setProcessingIds(prev => new Set(prev).add(file.id));
    const updated = { ...file, aiSummaryStatus: "processing" as const };
    saveFile(updated);
    refresh();

    try {
      const summary = await summarizeFile(file.name, file.content);
      // 更新原文件状态
      const done: UploadedFile = {
        ...updated,
        status: "summarized",
        aiSummary: summary,
        aiSummaryStatus: "done" as const,
      };
      saveFile(done);

      // 生成归档文件：{原文件名}（总结）.txt
      const summaryFile: UploadedFile = {
        id: generateId(),
        name: `${file.originalName.replace(/\.[^.]+$/, "")}（总结）.txt`,
        originalName: `${file.originalName}（总结）`,
        fileType: "other",
        category: file.category,
        ownerId: file.ownerId,
        ownerName: file.ownerName,
        size: new Blob([summary]).size,
        content: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(summary)))}`,
        status: "summarized",
        aiSummary: null,
        aiSummaryStatus: "done",
        humanEditedSummary: null,
        summaryFileId: null,
        reviewedFileId: null,
        linkedFrom: file.id,
        linkedFiles: [],
        createdAt: Date.now(),
      };
      saveFile(summaryFile);
      // 关联原文件
      done.summaryFileId = summaryFile.id;
      saveFile(done);
    } catch (err: any) {
      alert(`AI总结失败：${err.message}\n\n请检查 API Key 是否正确，或稍后点击「失败」旁的重试按钮再次尝试。`);
      const failed: UploadedFile = { ...updated, status: "uploaded", aiSummaryStatus: "error" };
      saveFile(failed);
    }

    setProcessingIds(prev => { const n = new Set(prev); n.delete(file.id); return n; });
    refresh();
  };

  const handleStartReview = (file: UploadedFile) => {
    setEditingId(file.id);
    setEditText(file.humanEditedSummary || file.aiSummary || "");
  };

  const handleSaveReview = (file: UploadedFile) => {
    const updated: UploadedFile = {
      ...file,
      status: "reviewed",
      humanEditedSummary: editText,
    };
    saveFile(updated);

    // 生成归档文件：{原文件名}（已审核）.txt
    const reviewFile: UploadedFile = {
      id: generateId(),
      name: `${file.originalName.replace(/\.[^.]+$/, "")}（已审核）.txt`,
      originalName: `${file.originalName}（已审核）`,
      fileType: "other",
      category: file.category,
      ownerId: file.ownerId,
      ownerName: file.ownerName,
      size: new Blob([editText]).size,
      content: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(editText)))}`,
      status: "reviewed",
      aiSummary: null,
      aiSummaryStatus: "done",
      humanEditedSummary: null,
      summaryFileId: null,
      reviewedFileId: null,
      linkedFrom: file.id,
      linkedFiles: [],
      createdAt: Date.now(),
    };
    saveFile(reviewFile);
    updated.reviewedFileId = reviewFile.id;
    saveFile(updated);

    setEditingId(null);
    refresh();
  };

  const handleDelete = (file: UploadedFile) => {
    if (!canDeleteFile(file, currentRole)) {
      alert("该文件已进入总结流程，无法删除");
      return;
    }
    if (!window.confirm(`确定删除文件「${file.name}」？`)) return;
    deleteFile(file.id);
    refresh();
  };

  const handleSaveApiKey = () => {
    setApiKey(apiKeyInput.trim());
    setShowApiSettings(false);
    if (apiKeyInput.trim()) {
      alert("API Key 已保存");
    }
  };

  if (!currentRole) {
    return (
      <PageContainer title="文件管理">
        <div className="text-center py-16 text-gray-500">
          请先入驻角色
          <button onClick={() => navigate("/onboarding")} className="text-primary-600 ml-2 underline">前往入驻</button>
        </div>
      </PageContainer>
    );
  }

  const CATEGORY_TABS: Array<{ key: "all" | FileCategory; label: string; icon: string }> = [
    { key: "all", label: "全部", icon: "📁" },
    { key: "platform", label: "平台方", icon: "🌉" },
    { key: "expert", label: "行业专家", icon: "👤" },
    { key: "ai", label: "AI人才", icon: "🤖" },
    { key: "enterprise", label: "企业客户", icon: "🏢" },
  ];

  const roleMeta = ROLE_LABELS[currentRole?.role || "expert"];

  return (
    <PageContainer title="文件管理">
      <div className="max-w-5xl mx-auto">
        {/* 当前角色标识 */}
        <div className="bg-white rounded-2xl shadow-sm p-3 border border-gray-100 mb-4 flex items-center gap-2">
          <span className="text-lg">{roleMeta.icon}</span>
          <span className="font-medium text-gray-700 text-sm">{roleMeta.label}</span>
          <span className="text-gray-400 text-xs">·</span>
          <span className="text-gray-500 text-xs">{currentRole?.name}</span>
          <span className="text-gray-300 text-xs">|</span>
          <span className="text-gray-400 text-xs">权限：{isPlatform ? "查看+总结+审核" : "查看自己的文件"}</span>
        </div>

        {/* 脱敏预览弹窗 */}
        {showDesensitize && pendingUpload && (() => {
          const rules = getDesensitizeRulesByOwner(currentRole?.id || "");
          const previewName = desensitizeText(pendingUpload.file.name, currentRole?.id);
          return (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
                <h3 className="font-bold text-gray-800 mb-3">🔒 文件名脱敏预览</h3>
                <p className="text-sm text-gray-500 mb-4">上传前请确认文件名脱敏结果：</p>
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">原始：</span>
                    <span className="text-gray-700">{pendingUpload.file.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-2">
                    <span className="text-gray-400">脱敏后：</span>
                    <span className="text-primary-700 font-medium">{previewName}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mb-4">
                  当前脱敏规则：{rules.map(r => `${r.original}→${r.replacement}`).join("、") || "无"}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowDesensitize(false); setPendingUpload(null); }}
                    className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                    取消
                  </button>
                  <button onClick={() => {
                    const p = pendingUpload;
                    setShowDesensitize(false);
                    setPendingUpload(null);
                    doUpload(previewName, p.file, p.content);
                  }}
                    className="flex-1 py-2 text-sm bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium">
                    确认上传（已脱敏）
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100 mb-6">

          {/* 环境检测提示 */}
          {apiReady === false && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700">💡 AI 功能将通过本地代理调用腾讯混元 API。请确保已配置有效的 API Key。</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              📂 文件库
              <span className="text-xs font-normal text-gray-400">
                （{allFiles.length}个文件）
              </span>
              <DemoBadge />
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setShowApiSettings(!showApiSettings)}
                className="text-xs text-gray-500 hover:text-primary-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary-300 transition-all">
                ⚙️ API设置
              </button>
              <input ref={fileInputRef} type="file" onChange={handleUpload}
                className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.gif,.mp3,.mp4,.avi,.wav" />
              <Button onClick={() => fileInputRef.current?.click()} size="sm">📤 上传文件</Button>
            </div>
          </div>

          {/* API Key 设置 */}
          {showApiSettings && (
            <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-700 mb-2">🔑 配置腾讯混元 API Key（<a href="https://console.cloud.tencent.com/hunyuan/start" target="_blank" rel="noopener noreferrer" className="underline">获取 Key</a>，仅本地存储）</p>
              <div className="flex gap-2">
                <input type="password" value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="输入腾讯混元 API Key..." className="flex-1 text-sm border border-blue-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" />
                <Button onClick={handleSaveApiKey} size="sm">💾 保存</Button>
                <Button onClick={async () => {
                  if (!apiKeyInput.trim()) { alert("请先输入 API Key"); return; }
                  const key = apiKeyInput.trim();
                  setApiKey(key);
                  try {
                    const data = await verifyApiKey(key);
                    if (data.valid) {
                      alert(`✅ Key 验证成功！\n模型：${data.model || "hunyuan-turbos-latest"}\n提供商：腾讯混元`);
                    } else {
                      alert(`❌ Key 验证失败：${data.error || "未知错误"}`);
                    }
                  } catch (e: any) {
                    alert("❌ 验证请求失败：" + e.message);
                  }
                }} variant="outline" size="sm">🔍 验证</Button>
              </div>
            </div>
          )}

          {/* 文件夹Tab */}
          <div className="flex gap-2 mb-3">
            {FOLDER_TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveFolder(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm transition-all ${
                  activeFolder === tab.key
                    ? "bg-primary-600 text-white border-primary-600 shadow-md"
                    : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"
                }`}>
                <span>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeFolder === tab.key ? "bg-white/20" : "bg-gray-100"
                }`}>
                  {allFiles.filter(f => f.status === tab.key).length}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{FOLDER_TABS.find(t => t.key === activeFolder)?.desc}</p>

          {/* 分类标签（仅平台方） */}
          {isPlatform && (
            <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t border-gray-100">
              {CATEGORY_TABS.map(tab => (
                <button key={tab.key} onClick={() => setCategoryFilter(tab.key)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    categoryFilter === tab.key ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"
                  }`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 非平台角色 - 无文件提示 */}
        {!isPlatform && allFiles.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500 mb-2 font-medium">您还未上传过文件</p>
            <p className="text-gray-400 text-sm mb-4">上传文件后可在此查看和管理</p>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">📤 上传第一个文件</Button>
          </div>
        )}

        {/* 非平台角色 - 已上传文件列表（简化版） */}
        {!isPlatform && allFiles.length > 0 && (
          <>
            {/* 非平台角色的 AI 总结入口 */}
            {activeFolder === "uploaded" && displayedFiles.filter(f => f.aiSummaryStatus !== "processing").length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-200 mb-4">
                <h3 className="font-bold text-purple-800 mb-2">🤖 AI 文件总结</h3>
                <p className="text-sm text-purple-600 mb-3">选择待处理文件，调用 AI 进行内容总结</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {displayedFiles.filter(f => f.aiSummaryStatus !== "processing").map(f => (
                    <div key={f.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-purple-100">
                      <div className="flex items-center gap-2 text-sm min-w-0">
                        <span>{FILE_TYPE_LABELS[f.fileType]?.icon || "📁"}</span>
                        <span className="font-medium text-gray-700 truncate">{f.name}</span>
                        <span className="text-xs text-gray-400 shrink-0">{formatFileSize(f.size)}</span>
                      </div>
                      <Button onClick={() => handleAISummary(f)} size="sm" variant="outline"
                        disabled={processingIds.has(f.id)}>
                        {processingIds.has(f.id) ? "⏳ 处理中" : "🤖 AI总结"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {displayedFiles.filter(f => f.aiSummaryStatus === "processing").length > 0 && (
              <div className="text-sm text-purple-600 mb-4 animate-pulse">⏳ AI正在总结中...</div>
            )}

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                📋 我的文件（共{allFiles.length}个）
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {displayedFiles.map(f => {
                const typeMeta = FILE_TYPE_LABELS[f.fileType];
                const statusMeta = FILE_STATUS_LABELS[f.status];
                return (
                  <div key={f.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl">{typeMeta?.icon || "📁"}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-800 text-sm truncate">{f.name}</span>
                            <span className={`text-xs ${statusMeta.color}`}>{statusMeta.icon} {statusMeta.label}</span>
                            {f.aiSummaryStatus === "processing" && <span className="text-xs text-purple-500 animate-pulse">⏳ 总结中</span>}
                            {f.aiSummaryStatus === "error" && <span className="text-xs text-red-500">❌ AI总结失败</span>}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {formatFileSize(f.size)} · {new Date(f.createdAt).toLocaleDateString("zh-CN")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* 失败重试 */}
                        {f.aiSummaryStatus === "error" && (
                          <button onClick={() => handleAISummary(f)}
                            className="text-xs text-red-600 hover:text-red-700 px-2 py-1">
                            🔄 重试
                          </button>
                        )}
                        {/* 展开查看总结 */}
                        {(f.aiSummary || f.humanEditedSummary || (f.linkedFrom && allFiles.find(of => of.id === f.linkedFrom)?.aiSummary)) && (
                          <button onClick={() => setEditingId(editingId === f.id ? null : f.id)}
                            className="text-xs text-gray-500 hover:text-primary-600 px-2 py-1">
                            {editingId === f.id ? "收起" : "查看"}
                          </button>
                        )}
                        {/* 非平台角色：只能删除未总结的文件 */}
                        {canDeleteFile(f, currentRole) && (
                          <button onClick={() => handleDelete(f)}
                            className="text-xs text-red-400 hover:text-red-600 px-2 py-1">
                            🗑️ 删除
                          </button>
                        )}
                        {!canDeleteFile(f, currentRole) && (
                          <span className="text-xs text-gray-300">已锁定</span>
                        )}
                      </div>
                    </div>
                    {/* 处理进展条 */}
                    <div className="mt-2 flex items-center gap-1 ml-8">
                      {(["uploaded", "summarized", "reviewed"] as FileStatus[]).map((s, i) => {
                        const sm = FILE_STATUS_LABELS[s];
                        const done = f.status === s || (s === "uploaded" && (f.status === "summarized" || f.status === "reviewed")) || (s === "summarized" && f.status === "reviewed");
                        return (
                          <React.Fragment key={s}>
                            <div className={`flex items-center gap-1 text-xs ${done ? sm.color : "text-gray-300"}`}>
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${done ? (s === "reviewed" && f.status === "reviewed" ? "bg-green-100" : s === "summarized" && (f.status === "summarized" || f.status === "reviewed") ? "bg-purple-100" : "bg-blue-100") : "bg-gray-100"}`}>
                                {done ? "●" : "○"}
                              </span>
                              <span>{sm.label}</span>
                            </div>
                            {i < 2 && <span className="text-gray-300 text-[10px]">→</span>}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* 展开详情 */}
                    {editingId === f.id && (() => {
                      const linkedFile = f.linkedFrom ? allFiles.find(of => of.id === f.linkedFrom) : null;
                      const showAiSummary = f.aiSummary || linkedFile?.aiSummary;
                      const showReviewed = f.humanEditedSummary || linkedFile?.humanEditedSummary;
                      return (
                      <div className="mt-3 ml-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        {showAiSummary && (
                          <div>
                            <h4 className="text-xs font-bold text-purple-700 mb-1">🤖 AI总结</h4>
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-purple-50 p-3 rounded-lg max-h-40 overflow-y-auto">{showAiSummary}</pre>
                          </div>
                        )}
                        {!showAiSummary && !showReviewed && (
                          <p className="text-xs text-gray-400">暂无总结内容</p>
                        )}
                        {showReviewed && (
                          <div className="mt-2">
                            <h4 className="text-xs font-bold text-green-700 mb-1">✅ 已审核版本</h4>
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-green-50 p-3 rounded-lg max-h-40 overflow-y-auto">{showReviewed}</pre>
                          </div>
                        )}
                      </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
          </>
        )}

        {/* 平台方 - 完整管理视图 */}
        {isPlatform && displayedFiles.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-400">暂无{FOLDER_TABS.find(t => t.key === activeFolder)?.label}文件</p>
          </div>
        )}

        {isPlatform && displayedFiles.length > 0 && (
          <>
            {/* 平台方AI总结区域 */}
            {activeFolder === "uploaded" && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-200 mb-6">
                <h3 className="font-bold text-purple-800 mb-2">🤖 平台方 · AI文件总结</h3>
                <p className="text-sm text-purple-600 mb-3">选择待处理文件，调用AI进行内容总结</p>
                {displayedFiles.filter(f => f.aiSummaryStatus !== "processing").length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {displayedFiles.filter(f => f.aiSummaryStatus !== "processing").map(f => (
                      <div key={f.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-purple-100">
                        <div className="flex items-center gap-2 text-sm min-w-0">
                          <span>{FILE_TYPE_LABELS[f.fileType]?.icon || "📁"}</span>
                          <span className="font-medium text-gray-700 truncate">{f.name}</span>
                          <span className="text-xs text-gray-400 shrink-0">{formatFileSize(f.size)}</span>
                          <span className="text-xs text-gray-400 shrink-0">· {f.ownerName}</span>
                        </div>
                        <Button onClick={() => handleAISummary(f)} size="sm" variant="outline"
                          disabled={processingIds.has(f.id)}>
                          {processingIds.has(f.id) ? "⏳ 处理中" : "🤖 AI总结"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {displayedFiles.filter(f => f.aiSummaryStatus === "processing").length > 0 && (
                  <div className="text-sm text-purple-600 mt-2 animate-pulse">⏳ AI正在总结中...</div>
                )}
              </div>
            )}

            {/* 已总结文件夹 - 审核入口 */}
            {activeFolder === "summarized" && (
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-5 border border-blue-200 mb-6">
                <h3 className="font-bold text-blue-800 mb-2">✏️ 人工审核</h3>
                <p className="text-sm text-blue-600">对AI总结结果进行人工审核和修改</p>
              </div>
            )}

            {/* 文件列表 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {displayedFiles.map(f => {
                  const typeMeta = FILE_TYPE_LABELS[f.fileType];
                  const catMeta = ROLE_LABELS[f.category];
                  const statusMeta = FILE_STATUS_LABELS[f.status];
                  return (
                    <div key={f.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-2xl mt-1">{typeMeta?.icon || "📁"}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-800 text-sm truncate">{f.name}</span>
                              <span className={`text-xs ${statusMeta.color}`}>{statusMeta.icon} {statusMeta.label}</span>
                              {f.aiSummaryStatus === "processing" && <span className="text-xs text-purple-500 animate-pulse">⏳ 总结中</span>}
                              {f.aiSummaryStatus === "error" && <span className="text-xs text-red-500">❌ AI总结失败</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                              <span>{formatFileSize(f.size)}</span>
                              <span>·</span>
                              <span className={`px-1.5 py-0.5 rounded-full ${catMeta.color}`}>{catMeta.icon} {catMeta.label}</span>
                              <span>·</span>
                              <span>{f.ownerName}</span>
                              <span>·</span>
                              <span>{new Date(f.createdAt).toLocaleDateString("zh-CN")}</span>
                              {f.linkedFrom && <span className="text-amber-500">· 📋 归档副本</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-3 shrink-0">
                          {/* 展开AI总结 */}
                          {(f.aiSummary || f.humanEditedSummary || (f.linkedFrom && allFiles.find(of => of.id === f.linkedFrom)?.aiSummary)) && (
                            <button onClick={() => setEditingId(editingId === f.id ? null : f.id)}
                              className="text-xs text-gray-500 hover:text-primary-600 px-2 py-1">
                              {editingId === f.id ? "收起" : "查看"}
                            </button>
                          )}
                          {/* 失败重试 */}
                          {f.aiSummaryStatus === "error" && (
                            <button onClick={() => handleAISummary(f)}
                              className="text-xs text-red-600 hover:text-red-700 px-2 py-1">
                              🔄 重试
                            </button>
                          )}
                          {/* 已总结→审核按钮 */}
                          {f.status === "summarized" && f.aiSummary && editingId !== f.id && (
                            <button onClick={() => handleStartReview(f)}
                              className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1">
                              ✏️ 审核
                            </button>
                          )}
                          {canDeleteFile(f, currentRole) && (
                            <button onClick={() => handleDelete(f)}
                              className="text-xs text-red-400 hover:text-red-600 px-2 py-1">删除</button>
                          )}
                        </div>
                      </div>

                      {/* 处理进展条 */}
                      <div className="mt-2 flex items-center gap-1 ml-9">
                        {(["uploaded", "summarized", "reviewed"] as FileStatus[]).map((s, i) => {
                          const sm = FILE_STATUS_LABELS[s];
                          const done = f.status === s || (s === "uploaded" && (f.status === "summarized" || f.status === "reviewed")) || (s === "summarized" && f.status === "reviewed");
                          return (
                            <React.Fragment key={s}>
                              <div className={`flex items-center gap-1 text-xs ${done ? sm.color : "text-gray-300"}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${done ? (s === "reviewed" && f.status === "reviewed" ? "bg-green-100" : s === "summarized" && (f.status === "summarized" || f.status === "reviewed") ? "bg-purple-100" : "bg-blue-100") : "bg-gray-100"}`}>
                                  {done ? "●" : "○"}
                                </span>
                                <span>{sm.label}</span>
                              </div>
                              {i < 2 && <span className="text-gray-300 text-[10px]">→</span>}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {/* 展开详情/审核编辑 */}
                      {editingId === f.id && (() => {
                        const linkedFile = f.linkedFrom ? allFiles.find(of => of.id === f.linkedFrom) : null;
                        const showAiSummary = f.aiSummary || linkedFile?.aiSummary;
                        const showReviewed = f.humanEditedSummary || (f.status === "reviewed" && linkedFile?.humanEditedSummary);
                        return (
                        <div className="mt-3 ml-9 p-4 bg-gray-50 rounded-xl border border-gray-200">
                          {showAiSummary && (
                            <div className="mb-3">
                              <h4 className="text-xs font-bold text-purple-700 mb-1">🤖 AI总结</h4>
                              <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-purple-50 p-3 rounded-lg max-h-40 overflow-y-auto">{showAiSummary}</pre>
                            </div>
                          )}
                          {!showAiSummary && !showReviewed && (
                            <p className="text-xs text-gray-400">暂无总结内容</p>
                          )}
                          {f.status === "summarized" && !f.linkedFrom && (
                            <div>
                              <h4 className="text-xs font-bold text-blue-700 mb-1">✏️ 人工审核</h4>
                              <textarea value={editText} onChange={e => setEditText(e.target.value)}
                                rows={5} className="w-full text-xs border border-gray-300 rounded-lg p-3 mb-2 focus:ring-2 focus:ring-primary-200 outline-none resize-none" />
                              <div className="flex gap-2">
                                <Button onClick={() => handleSaveReview(f)} size="sm">💾 保存审核</Button>
                                <Button onClick={() => setEditingId(null)} variant="secondary" size="sm">取消</Button>
                              </div>
                            </div>
                          )}
                          {showReviewed && (
                            <div>
                              <h4 className="text-xs font-bold text-green-700 mb-1">✅ 已审核版本</h4>
                              <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-green-50 p-3 rounded-lg max-h-40 overflow-y-auto">{showReviewed}</pre>
                            </div>
                          )}
                        </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <p className="text-xs text-gray-400 mt-4 text-center">
          📂 文件按处理进展归档 · 平台方可AI总结+人工审核 · 总结后生成归档副本 · DEMO限制单文件5MB
        </p>
      </div>
    </PageContainer>
  );
};

export default FilesPage;
