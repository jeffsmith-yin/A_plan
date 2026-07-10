// 融智桥 DEMO v0.7
// 四方角色 + 权限控制 + 推荐人 + @提及 + 积分 + 文件管理 + 购物车 + 两级注册 + 脱敏

export type RoleType = "expert" | "ai" | "enterprise" | "platform";
export type SecondaryRole = "expert" | "ai" | "enterprise" | null;

// ============ 个人用户（两级注册第一级）============
export interface Person {
  phone: string;                // 唯一标识（手机号或微信ID）
  wechatId?: string;            // 微信 OpenID（模拟）
  name: string;                 // 真实姓名
  phoneNum?: string;            // 联系电话
  wechat?: string;              // 微信号
  title?: string;               // 职务
  intro?: string;               // 个人介绍
  avatarRoles: RoleType[];      // 已注册的角色类型（多选）
  isAdmin: boolean;             // 是否子管理员
  isSuperAdmin: boolean;        // 是否超级管理员（系统首个用户）
  registeredAt: number;
  lastLoginAt: number;
  score: number;
  kicked: boolean;              // 是否被管理员踢出
  deleted: boolean;             // 软注销标记（不清除数据）
  avatar?: string;              // 头像 base64
}

export interface RoleCard {
  id: string;
  role: RoleType;
  secondaryRole: SecondaryRole;
  name: string;
  phone: string;
  wechat: string;
  title: string;
  intro: string;
  tags: string[];
  referrerId: string | null;
  referrerName: string;
  score: number;
  createdAt: number;
  personPhone: string;          // 关联到 Person
}

export interface ChatMessage {
  id: string;
  from: string;
  fromName: string;
  fromRole: string;
  fromSecondary?: string;
  to: string;
  text: string;
  mentions: string[];
  timestamp: number;
}

// ============ 文件管理 v0.7 ============
export type FileCategory = "expert" | "ai" | "enterprise" | "platform";
export type FileType = "pdf" | "doc" | "xls" | "image" | "video" | "audio" | "other";
export type FileStatus = "uploaded" | "summarized" | "reviewed";

export interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  fileType: FileType;
  category: FileCategory;
  ownerId: string;
  ownerName: string;
  size: number;
  content: string;            // base64 data URL
  status: FileStatus;
  aiSummary: string | null;
  aiSummaryStatus: "none" | "processing" | "done" | "error";
  humanEditedSummary: string | null;
  summaryFileId: string | null;
  reviewedFileId: string | null;
  linkedFrom: string | null;
  linkedFiles: string[];
  createdAt: number;
}

// ============ 脱敏规则 ============
export interface DesensitizeRule {
  id: string;
  ownerId: string;            // 角色ID
  personPhone: string;        // 所属用户
  original: string;           // 原始公司名/敏感词
  replacement: string;        // 替换后的名称
}

// ============ 购物车 & 商品 ============
export type ProductRegion = "demo" | "product" | "skill" | "course";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  salePrice: number;
  region: ProductRegion;
  icon: string;
  tags: string[];
  provider: string;
  providerRole: RoleType;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  region: ProductRegion;
  icon: string;
}

export type PaymentMethod = "wechat" | "alipay" | "bank";

// ============ 圈子 ============
export interface Circle {
  id: string;
  name: string;
  icon: string;
  description: string;
  longIntro: string;
  annualFee: number;
  saleFee: number;
  memberCount: number;
  postCount: number;
  tags: string[];
  category: string;
  ranking: number;
}

export interface CircleSubscription {
  id: string;
  circleId: string;
  circleName: string;
  subscribedAt: number;
  expiresAt: number;
  fee: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: "pending" | "paid" | "cancelled";
  ndaSigned: boolean;         // DEMO购买前签署NDA
  ndaSigner: string;          // 签署人姓名
  createdAt: number;
  paidAt: number | null;
}

// ============ localStorage keys ============
const STORAGE_KEYS = {
  roles: "rzq_roles_v4",
  messages: "rzq_messages_v3",
  currentRoleId: "rzq_current_role_v4",
  files: "rzq_files_v3",
  ndaSkipped: "rzq_nda_v2",
  cart: "rzq_cart_v1",
  orders: "rzq_orders_v2",
  persons: "rzq_persons_v1",
  currentPhone: "rzq_phone_v2",
  desensitizeRules: "rzq_desensitize_v1",
};

// ============ 积分规则 ============
export const SCORE_RULES = { NEW_MEMBER: 10, REFERRAL: 2 };

// ============ 预设超级管理员 ============
const SUPER_ADMIN_PHONE = "00000000000";
export const SUPER_ADMIN_CRED = { username: "admin", password: "admin" };

export function ensureSuperAdmin(): Person {
  const persons = getPersons();
  const existing = persons.find(p => p.phone === SUPER_ADMIN_PHONE);
  if (existing) return existing;
  const sa: Person = {
    phone: SUPER_ADMIN_PHONE,
    name: "超级管理员",
    avatarRoles: ["platform"],
    isAdmin: true,
    isSuperAdmin: true,
    registeredAt: Date.now(),
    lastLoginAt: Date.now(),
    score: SCORE_RULES.NEW_MEMBER,
    kicked: false,
    deleted: false,
  };
  persons.push(sa);
  savePersons(persons);
  return sa;
}

// ============ 清空所有数据 ============
export function clearAllData(): void {
  const keys = Object.values(STORAGE_KEYS);
  keys.forEach(k => localStorage.removeItem(k));
  // 也清理圈子订阅
  localStorage.removeItem("rzq_circle_subs_v1");
  // 清理聊天缓存
  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("rzq_")) allKeys.push(k);
  }
  allKeys.forEach(k => localStorage.removeItem(k));
}

// ============ Person CRUD ============
export function getPersons(): Person[] {
  try { const raw = localStorage.getItem(STORAGE_KEYS.persons); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

function savePersons(persons: Person[]): void {
  localStorage.setItem(STORAGE_KEYS.persons, JSON.stringify(persons));
}

export function getCurrentUser(): Person | null {
  const phone = getCurrentPhone();
  if (!phone) return null;
  return getPersons().find(p => p.phone === phone) || null;
}

export function getPersonByPhone(phone: string): Person | null {
  return getPersons().find(p => p.phone === phone) || null;
}

export function getPersonByName(name: string): Person | null {
  return getPersons().find(p => p.name === name && !p.deleted) || null;
}

export function registerPerson(phone: string, wechatId?: string): Person {
  let persons = getPersons();
  let person = persons.find(p => p.phone === phone);
  if (person) {
    // 已有用户：更新登录时间
    person.lastLoginAt = Date.now();
    if (wechatId) person.wechatId = wechatId;
    savePersons(persons);
    setCurrentPhone(phone);
    return person;
  }
  // 首个用户为超级管理员
  const isFirst = persons.length === 0;
  person = {
    phone,
    wechatId,
    name: "",
    avatarRoles: [],
    isAdmin: isFirst,
    isSuperAdmin: isFirst,
    registeredAt: Date.now(),
    lastLoginAt: Date.now(),
    score: SCORE_RULES.NEW_MEMBER,
    kicked: false,
    deleted: false,
  };
  persons.push(person);
  savePersons(persons);
  setCurrentPhone(phone);
  return person;
}

export function updatePerson(updates: Partial<Person>): void {
  const phone = getCurrentPhone();
  if (!phone) return;
  const persons = getPersons();
  const idx = persons.findIndex(p => p.phone === phone);
  if (idx >= 0) {
    persons[idx] = { ...persons[idx], ...updates };
    savePersons(persons);
  }
}

export function setPersonAsAdmin(phone: string): void {
  const persons = getPersons();
  const person = persons.find(p => p.phone === phone);
  if (person) {
    person.isAdmin = true;
    savePersons(persons);
  }
}

export function kickPerson(phone: string): void {
  const persons = getPersons();
  const person = persons.find(p => p.phone === phone);
  if (person) {
    person.kicked = true;
    savePersons(persons);
  }
}

export function unkickPerson(phone: string): void {
  const persons = getPersons();
  const person = persons.find(p => p.phone === phone);
  if (person) {
    person.kicked = false;
    savePersons(persons);
  }
}

export function isCurrentUserAdmin(): boolean {
  const user = getCurrentUser();
  return user?.isAdmin === true || user?.isSuperAdmin === true;
}

export function getNonAdminPersons(): Person[] {
  // 管理员看到所有人，非管理员只能看到自己
  return getPersons();
}

// ============ 用户登录/退出/注销 ============
export function getCurrentPhone(): string | null {
  return localStorage.getItem(STORAGE_KEYS.currentPhone);
}

export function setCurrentPhone(phone: string | null): void {
  if (phone) localStorage.setItem(STORAGE_KEYS.currentPhone, phone);
  else localStorage.removeItem(STORAGE_KEYS.currentPhone);
}

export function isLoggedIn(): boolean {
  const phone = getCurrentPhone();
  if (!phone) return false;
  const person = getPersonByPhone(phone);
  return !!person && !person.kicked && !person.deleted;
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.currentPhone);
  setCurrentRoleId(null);
}

export function deleteAccount(): void {
  // 软注销：标记为删除但保留所有数据
  const phone = getCurrentPhone();
  if (!phone) return;
  const persons = getPersons();
  const person = persons.find(p => p.phone === phone);
  if (person) {
    person.deleted = true;
    savePersons(persons);
  }
  localStorage.removeItem(STORAGE_KEYS.currentPhone);
  localStorage.removeItem(STORAGE_KEYS.currentRoleId);
}

export function restoreAccount(phone: string): void {
  const persons = getPersons();
  const person = persons.find(p => p.phone === phone);
  if (person) {
    person.deleted = false;
    savePersons(persons);
  }
}

// ============ 超级管理员 / 子管理员 ============
export function isCurrentUserSuperAdmin(): boolean {
  const user = getCurrentUser();
  return user?.isSuperAdmin === true;
}

export function getAdminCount(): number {
  return getPersons().filter(p => p.isAdmin && !p.isSuperAdmin && !p.deleted).length;
}

export const MAX_SUB_ADMINS = 6;

export function setSubAdmin(phone: string): boolean {
  if (getAdminCount() >= MAX_SUB_ADMINS) return false;
  const persons = getPersons();
  const person = persons.find(p => p.phone === phone);
  // 必须拥有 platform 角色才能被设为子管理员
  if (person && !person.isSuperAdmin && person.avatarRoles.includes("platform")) {
    person.isAdmin = true;
    savePersons(persons);
    return true;
  }
  return false;
}

export function removeSubAdmin(phone: string): void {
  const persons = getPersons();
  const person = persons.find(p => p.phone === phone);
  if (person && !person.isSuperAdmin) {
    person.isAdmin = false;
    savePersons(persons);
  }
}

// ============ 角色权限 ============
export const PLATFORM_AVAILABLE_ROLES: RoleType[] = ["platform", "expert", "ai", "enterprise"];
export const EXPERT_AVAILABLE_ROLES: RoleType[] = ["expert", "ai", "enterprise"];
export const AI_AVAILABLE_ROLES: RoleType[] = ["ai"];
export const ENTERPRISE_AVAILABLE_ROLES: RoleType[] = ["enterprise"];

export function getAvailableRoles(currentRole: RoleCard | null): RoleType[] {
  if (!currentRole) return ["platform", "expert", "ai", "enterprise"];
  switch (currentRole.role) {
    case "platform": return PLATFORM_AVAILABLE_ROLES;
    case "expert": return EXPERT_AVAILABLE_ROLES;
    case "ai": return AI_AVAILABLE_ROLES;
    case "enterprise": return ENTERPRISE_AVAILABLE_ROLES;
  }
}

// ============ 默认平台方 ============
export function ensureDefaultPlatform(): RoleCard | null {
  const roles = getRoles();
  if (!roles.some(r => r.role === "platform")) {
    const platform: RoleCard = {
      id: "platform_default", role: "platform", secondaryRole: null,
      name: "融智桥平台", phone: "", wechat: "", title: "平台协调管理者",
      intro: "融智桥平台默认协调者。负责撮合专家、AI人才和企业客户，协调项目进展，管理平台规则。",
      tags: ["平台协调", "项目管理", "质量把控", "合约执行"],
      referrerId: null, referrerName: "", score: SCORE_RULES.NEW_MEMBER, createdAt: Date.now(),
      personPhone: "platform_system",
    };
    saveRole(platform);
    return platform;
  }
  return roles.find(r => r.role === "platform") || null;
}

// ============ 角色 CRUD ============
export function getRoles(): RoleCard[] {
  try { const raw = localStorage.getItem(STORAGE_KEYS.roles); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

export function saveRole(role: RoleCard): void {
  const roles = getRoles().filter(r => r.id !== role.id);
  roles.push(role);
  localStorage.setItem(STORAGE_KEYS.roles, JSON.stringify(roles));
}

export function deleteRole(id: string): void {
  if (id === "platform_default") return;
  localStorage.setItem(STORAGE_KEYS.roles, JSON.stringify(getRoles().filter(r => r.id !== id)));
  localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(getMessages().filter(m => m.from !== id)));
}

// ============ NDA（参与方保密协议） ============
// 注：MarketPage 的"购买 DEMO 产品前签 NDA"仍使用下方全局 hasSignedNDA/markNDASigned。
// 本段为"参与 DEMO 的各方（专家/AI/企业/平台）签署保密协议"的完整记录。

export const NDA_VERSION = "v1.0";
export const NDA_VALID_DAYS = 30; // DEMO 默认有效期（天），到期可续签

export const NDA_TEXT = `融智桥 DEMO 保密协议（NDA）

本协议由参与融智桥平台 DEMO 体验的各方（行业专家、AI人才、企业客户、平台方）共同签署。

一、保密信息范围
参与 DEMO 期间，各方交换的需求、方案、数据、商业计划、客户资料、技术细节等，均属保密信息。

二、保密义务
1. 各方应对保密信息严格保密，未经披露方书面同意，不得向任何第三方披露。
2. 仅可将保密信息用于本 DEMO 合作之目的，不得用于其他商业用途。

三、数据说明
本 DEMO 全部数据为演示数据，非真实交易或真实个人信息。正式合作以另行签署的商务协议为准。

四、协议期限
本协议自签署之日起生效，有效期 ${NDA_VALID_DAYS} 天。到期前可申请续签；DEMO 终止时本协议自动失效。

五、违约责任
违反保密义务的一方，应承担相应法律责任，并赔偿守约方损失。

签署即表示您已阅读、理解并同意上述全部条款。
（本 DEMO 版本，仅供体验）`;

export interface NDARecord {
  id: string;
  roleId: string;
  signerName: string;
  role: RoleType;
  version: string;
  signedAt: number;
  expiresAt: number;
  renewedAt: number | null;
}

const NDA_RECORDS_KEY = "rzq_nda_records_v1";

export function getNDARecords(): NDARecord[] {
  try { const raw = localStorage.getItem(NDA_RECORDS_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

function saveNDARecords(records: NDARecord[]): void {
  localStorage.setItem(NDA_RECORDS_KEY, JSON.stringify(records));
}

// 返回当前角色有效（未过期）的 NDA 记录；过期视为未签
export function getNDAByRole(roleId: string): NDARecord | null {
  const rec = getNDARecords().find(r => r.roleId === roleId);
  if (!rec) return null;
  if (rec.expiresAt < Date.now()) return null;
  return rec;
}

export function signNDA(roleId: string, signerName: string, role: RoleType): NDARecord {
  const records = getNDARecords().filter(r => r.roleId !== roleId);
  const now = Date.now();
  const rec: NDARecord = {
    id: "nda_" + roleId,
    roleId,
    signerName,
    role,
    version: NDA_VERSION,
    signedAt: now,
    expiresAt: now + NDA_VALID_DAYS * 24 * 60 * 60 * 1000,
    renewedAt: null,
  };
  records.push(rec);
  saveNDARecords(records);
  return rec;
}

export function renewNDA(roleId: string): NDARecord | null {
  const rec = getNDARecords().find(r => r.roleId === roleId);
  if (!rec) return null;
  rec.expiresAt = Date.now() + NDA_VALID_DAYS * 24 * 60 * 60 * 1000;
  rec.renewedAt = Date.now();
  saveNDARecords(getNDARecords().map(r => (r.roleId === roleId ? rec : r)));
  return rec;
}

// 当前已签署且未过期的参与方数量
export function getNDASignedCount(): number {
  const now = Date.now();
  return getNDARecords().filter(r => r.expiresAt > now).length;
}

// 兼容：购买 DEMO 产品前的全局 NDA 标记（MarketPage 使用）
export function hasSignedNDA(): boolean {
  return localStorage.getItem(STORAGE_KEYS.ndaSkipped) === "true";
}
export function markNDASigned(): void {
  localStorage.setItem(STORAGE_KEYS.ndaSkipped, "true");
}

// ============ 推荐与积分 ============
export function addReferralScore(referrerId: string): void {
  const roles = getRoles();
  const referrer = roles.find(r => r.id === referrerId);
  if (referrer) {
    referrer.score += SCORE_RULES.REFERRAL;
    saveRole(referrer);
    // 同步增加推荐人所属用户（Person）的积分，使"我的"页面也能看到推荐得分
    if (referrer.personPhone && referrer.personPhone !== "platform_system") {
      const persons = getPersons();
      const p = persons.find(p => p.phone === referrer.personPhone);
      if (p) { p.score += SCORE_RULES.REFERRAL; savePersons(persons); }
    }
  }
}

export function isDuplicateReferral(referrerId: string, newName: string): boolean {
  return getRoles().some(r => r.referrerId === referrerId && r.name === newName);
}

export function getScoreLeaderboard(): RoleCard[] {
  return getRoles().sort((a, b) => b.score - a.score);
}

// ============ 当前角色 ============
export function getCurrentRoleId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.currentRoleId);
}

export function setCurrentRoleId(id: string | null): void {
  if (id) {
    // 验证角色属于当前用户
    const phone = getCurrentPhone();
    const role = getRoles().find(r => r.id === id);
    if (role && phone && role.personPhone !== phone && role.personPhone !== "platform_system") {
      // 角色不属于当前用户，拒绝切换
      return;
    }
    localStorage.setItem(STORAGE_KEYS.currentRoleId, id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.currentRoleId);
  }
}

export function getCurrentRole(): RoleCard | null {
  const id = getCurrentRoleId();
  if (!id) return null;
  return getRoles().find(r => r.id === id) || null;
}

// ============ 消息 ============
export function getMessages(): ChatMessage[] {
  try { const raw = localStorage.getItem(STORAGE_KEYS.messages); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

export function sendMessage(msg: Omit<ChatMessage, "id" | "timestamp">): ChatMessage {
  const full: ChatMessage = { ...msg, id: "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), timestamp: Date.now() };
  const msgs = getMessages(); msgs.push(full);
  localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(msgs));
  return full;
}

export function getChatWith(roleId: string, otherId: string): ChatMessage[] {
  return getMessages().filter(m => (m.from === roleId && m.to === otherId) || (m.from === otherId && m.to === roleId)).sort((a, b) => a.timestamp - b.timestamp);
}

export function getPlatformChannelMessages(): ChatMessage[] {
  return getMessages().filter(m => m.to === "platforms").sort((a, b) => a.timestamp - b.timestamp);
}

// ============ 脱敏规则 ============
export function getDesensitizeRules(): DesensitizeRule[] {
  try { const raw = localStorage.getItem(STORAGE_KEYS.desensitizeRules); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

export function addDesensitizeRule(rule: Omit<DesensitizeRule, "id">): DesensitizeRule {
  const full: DesensitizeRule = { ...rule, id: "ds_" + Date.now() };
  const rules = getDesensitizeRules();
  rules.push(full);
  localStorage.setItem(STORAGE_KEYS.desensitizeRules, JSON.stringify(rules));
  return full;
}

export function deleteDesensitizeRule(id: string): void {
  localStorage.setItem(STORAGE_KEYS.desensitizeRules, JSON.stringify(getDesensitizeRules().filter(r => r.id !== id)));
}

export function getDesensitizeRulesByOwner(ownerId: string): DesensitizeRule[] {
  return getDesensitizeRules().filter(r => r.ownerId === ownerId);
}

export function desensitizeText(text: string, ownerId?: string): string {
  let result = text;
  const rules = getDesensitizeRules();
  const applicable = ownerId
    ? rules.filter(r => r.ownerId === ownerId)
    : rules;
  for (const rule of applicable) {
    result = result.split(rule.original).join(rule.replacement);
  }
  return result;
}

// ============ 文件管理 v0.7 ============
export function getFiles(): UploadedFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.files);
    if (!raw) return [];
    const files: UploadedFile[] = JSON.parse(raw);
    let needsSave = false;
    const migrated = files.map(f => {
      if (f.status) return f;
      needsSave = true;
      const inferred: FileStatus = f.humanEditedSummary ? "reviewed" : f.aiSummary ? "summarized" : "uploaded";
      return {
        ...f,
        status: inferred,
        aiSummaryStatus: f.aiSummary ? "done" : "none" as "none" | "processing" | "done" | "error",
      };
    });
    if (needsSave) localStorage.setItem(STORAGE_KEYS.files, JSON.stringify(migrated));
    return migrated;
  }
  catch { return []; }
}

export function saveFile(file: UploadedFile): void {
  const files = getFiles().filter(f => f.id !== file.id);
  files.push(file);
  localStorage.setItem(STORAGE_KEYS.files, JSON.stringify(files));
}

export function deleteFile(id: string): void {
  localStorage.setItem(STORAGE_KEYS.files, JSON.stringify(getFiles().filter(f => f.id !== id)));
}

export function getFilesByCategory(category: FileCategory): UploadedFile[] {
  return getFiles().filter(f => f.category === category);
}

export function getFilesByOwner(ownerId: string): UploadedFile[] {
  return getFiles().filter(f => f.ownerId === ownerId);
}

export function canDeleteFile(file: UploadedFile, currentRole: RoleCard | null): boolean {
  if (!currentRole) return false;
  if (currentRole.role === "platform") return true;
  if (file.ownerId !== currentRole.id) return false;
  return file.status === "uploaded";
}

export function getFileType(name: string): FileType {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv"].includes(ext)) return "xls";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)) return "image";
  if (["mp4", "avi", "rmvb", "mov", "mkv", "wmv"].includes(ext)) return "video";
  if (["mp3", "wav", "flac", "aac", "ogg"].includes(ext)) return "audio";
  return "other";
}

export const FILE_TYPE_LABELS: Record<FileType, { icon: string; label: string }> = {
  pdf: { icon: "📄", label: "PDF文档" },
  doc: { icon: "📝", label: "Word文档" },
  xls: { icon: "📊", label: "Excel表格" },
  image: { icon: "🖼️", label: "图片" },
  video: { icon: "🎬", label: "视频" },
  audio: { icon: "🎵", label: "音频" },
  other: { icon: "📁", label: "其他" },
};

export const FILE_STATUS_LABELS: Record<FileStatus, { icon: string; label: string; color: string }> = {
  uploaded: { icon: "📤", label: "已上传", color: "text-blue-600" },
  summarized: { icon: "🤖", label: "已总结", color: "text-purple-600" },
  reviewed: { icon: "✅", label: "已审核", color: "text-green-600" },
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ============ 购物车 ============
export function getCart(): CartItem[] {
  try { const raw = localStorage.getItem(STORAGE_KEYS.cart); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

export function saveCart(cart: CartItem[]): void {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
}

export function addToCart(product: Product): void {
  const cart = getCart();
  const existing = cart.find(item => item.productId === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: generateId(),
      productId: product.id,
      name: product.name,
      price: product.salePrice,
      quantity: 1,
      region: product.region,
      icon: product.icon,
    });
  }
  saveCart(cart);
}

export function removeFromCart(cartItemId: string): void {
  saveCart(getCart().filter(item => item.id !== cartItemId));
}

export function updateCartItemQuantity(cartItemId: string, quantity: number): void {
  const cart = getCart();
  const item = cart.find(i => i.id === cartItemId);
  if (item) {
    if (quantity <= 0) { saveCart(cart.filter(i => i.id !== cartItemId)); return; }
    item.quantity = quantity;
    saveCart(cart);
  }
}

export function clearCart(): void {
  localStorage.removeItem(STORAGE_KEYS.cart);
}

export function getCartTotal(): number {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getCartCount(): number {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

// ============ 订单 ============
export function getOrders(): Order[] {
  try { const raw = localStorage.getItem(STORAGE_KEYS.orders); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

export function createOrder(paymentMethod: PaymentMethod, ndaSigned: boolean = false, ndaSigner: string = ""): Order {
  const cart = getCart();
  if (cart.length === 0) throw new Error("购物车为空");
  const order: Order = {
    id: "ord_" + Date.now(),
    items: [...cart],
    totalAmount: getCartTotal(),
    paymentMethod,
    status: "pending",
    ndaSigned,
    ndaSigner,
    createdAt: Date.now(),
    paidAt: null,
  };
  const orders = getOrders();
  orders.push(order);
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
  return order;
}

export function payOrder(orderId: string): void {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = "paid";
    order.paidAt = Date.now();
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
    clearCart();
  }
}

// ============ 演示商品数据 ============
export function getDemoProducts(): Product[] {
  return [
    { id: "prod_demo_1", name: "AI智能客服DEMO", description: "体验AI驱动的智能客服系统，支持多轮对话、意图识别", price: 0, salePrice: 0, region: "demo", icon: "🤖", tags: ["AI客服", "DEMO"], provider: "融智桥平台", providerRole: "platform" },
    { id: "prod_demo_2", name: "数据看板DEMO", description: "交互式数据可视化看板，实时展示业务指标", price: 0, salePrice: 0, region: "demo", icon: "📊", tags: ["数据看板", "DEMO"], provider: "融智桥平台", providerRole: "platform" },
    { id: "prod_demo_3", name: "智能排产DEMO", description: "AI驱动的生产排程优化演示，减少换线时间30%", price: 0, salePrice: 0, region: "demo", icon: "🏭", tags: ["排产优化", "DEMO"], provider: "融智桥平台", providerRole: "platform" },
    { id: "prod_1", name: "制造业智能排产系统", description: "AI+专家经验，优化生产排程，降低换线成本，提高设备利用率", price: 98000, salePrice: 58800, region: "product", icon: "🏭", tags: ["制造业", "排产优化", "AI"], provider: "张建国", providerRole: "expert" },
    { id: "prod_2", name: "零售智能客服系统", description: "多渠道AI客服，7×24小时在线，自动识别客户意图并精准回复", price: 68000, salePrice: 39800, region: "product", icon: "💬", tags: ["零售", "客服", "AI"], provider: "李芳", providerRole: "expert" },
    { id: "prod_3", name: "餐饮供应链优化方案", description: "从采购到配送全链路AI优化，降低食材损耗15%-25%", price: 128000, salePrice: 79800, region: "product", icon: "🍽️", tags: ["餐饮", "供应链", "AI"], provider: "王德明", providerRole: "expert" },
    { id: "prod_4", name: "企业AI知识库搭建", description: "为企业搭建专属AI知识库，整合内部文档、流程、经验", price: 88000, salePrice: 52800, region: "product", icon: "📚", tags: ["知识库", "企业", "AI"], provider: "陈秀兰", providerRole: "expert" },
    { id: "skill_1", name: "制造业排产优化技能包", description: "生产排程优化全套方案：需求预测→产能规划→排产算法→实时调度", price: 50000, salePrice: 29800, region: "skill", icon: "🔧", tags: ["制造业", "排产"], provider: "张建国", providerRole: "expert" },
    { id: "skill_2", name: "零售客户画像技能包", description: "客户分群、RFM分析、推荐策略、流失预警全套方案", price: 45000, salePrice: 26800, region: "skill", icon: "🎯", tags: ["零售", "客户画像"], provider: "李芳", providerRole: "expert" },
    { id: "skill_3", name: "供应链优化技能包", description: "库存优化、路径规划、供应商评估、需求预测四大模块", price: 55000, salePrice: 32800, region: "skill", icon: "🚚", tags: ["供应链", "优化"], provider: "王德明", providerRole: "expert" },
    { id: "course_1", name: "中小企业AI转型实战课", description: "10节课带你从0到1落地AI，含制造业/零售/餐饮真实案例", price: 2999, salePrice: 999, region: "course", icon: "🎓", tags: ["AI转型", "实战"], provider: "融智桥平台", providerRole: "platform" },
    { id: "course_2", name: "行业专家AI赋能训练营", description: "专为行业专家设计，学会用AI工具放大专业价值", price: 1999, salePrice: 699, region: "course", icon: "🏕️", tags: ["AI赋能", "专家"], provider: "融智桥平台", providerRole: "platform" },
    { id: "course_3", name: "企业AI落地方法论", description: "从需求分析到项目交付，完整AI落地流程", price: 3999, salePrice: 1499, region: "course", icon: "📖", tags: ["方法论", "落地"], provider: "融智桥平台", providerRole: "platform" },
  ];
}

export const REGION_LABELS: Record<ProductRegion, { icon: string; label: string; color: string }> = {
  demo: { icon: "🧪", label: "DEMO区", color: "bg-blue-100 text-blue-700" },
  product: { icon: "📦", label: "产品区", color: "bg-green-100 text-green-700" },
  skill: { icon: "🔧", label: "技能区", color: "bg-purple-100 text-purple-700" },
  course: { icon: "📚", label: "课件区", color: "bg-orange-100 text-orange-700" },
};

export const PAYMENT_LABELS: Record<PaymentMethod, { icon: string; label: string }> = {
  wechat: { icon: "💚", label: "微信支付" },
  alipay: { icon: "💙", label: "支付宝" },
  bank: { icon: "🏦", label: "银行卡" },
};

// ============ 工具 ============
export function generateId(): string {
  return "rzq_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

export const ROLE_LABELS: Record<RoleType, { icon: string; label: string; color: string }> = {
  expert: { icon: "👤", label: "行业专家", color: "bg-blue-100 text-blue-700" },
  ai: { icon: "🤖", label: "AI人才", color: "bg-purple-100 text-purple-700" },
  enterprise: { icon: "🏢", label: "企业客户", color: "bg-green-100 text-green-700" },
  platform: { icon: "🌉", label: "平台方", color: "bg-amber-100 text-amber-700" },
};

export const SECONDARY_LABELS: Record<string, { icon: string; label: string }> = {
  expert: { icon: "👤", label: "兼任专家" },
  ai: { icon: "🤖", label: "兼任AI" },
  enterprise: { icon: "🏢", label: "兼企业客户" },
};

export function getPlatformDisplayName(role: RoleCard): string {
  if (role.role !== "platform") return role.name;
  if (role.secondaryRole) return `${role.name}（${SECONDARY_LABELS[role.secondaryRole]?.icon || ""} ${SECONDARY_LABELS[role.secondaryRole]?.label || ""}）`;
  return role.name;
}

// ============ 手机号脱敏显示 ============
export function maskPhone(phone: string): string {
  if (phone.length === 11) return phone.slice(0, 3) + "****" + phone.slice(7);
  return phone.slice(0, 3) + "***" + phone.slice(-2);
}

// ============ 获取当前用户注册的角色类型 ============
export function getUserRoleTypes(): RoleType[] {
  const user = getCurrentUser();
  return user?.avatarRoles || [];
}

export function getUserRoles(): RoleCard[] {
  const phone = getCurrentPhone();
  if (!phone) return [];
  return getRoles().filter(r => r.personPhone === phone);
}

// ============ 圈子数据 ============
export function getDemoCircles(): Circle[] {
  return [
    { id: "circle_tech", name: "科技圈", icon: "💻", description: "AI、云计算、芯片、量子计算等前沿科技动态", longIntro: "科技圈聚焦人工智能、云计算、芯片设计、量子计算、自动驾驶等前沿科技领域。圈内汇集科技创业者、投资人、研发工程师，分享最新技术趋势、融资动态和产业洞察。", annualFee: 599, saleFee: 299, memberCount: 12800, postCount: 36500, tags: ["AI", "芯片", "云计算", "自动驾驶"], category: "科技", ranking: 1 },
    { id: "circle_ai", name: "AI圈", icon: "🤖", description: "大模型、AIGC、智能体、AI应用落地实战", longIntro: "AI圈是融智桥核心圈子，专注大语言模型、AIGC生成式AI、AI Agent智能体、机器学习等方向。汇聚AI人才、算法工程师和AI创业者，提供最新论文解读、工具推荐和实战案例。", annualFee: 699, saleFee: 399, memberCount: 25600, postCount: 89200, tags: ["大模型", "AIGC", "智能体", "深度学习"], category: "AI", ranking: 2 },
    { id: "circle_mfg", name: "制造圈", icon: "🏭", description: "智能制造、工业4.0、精益生产与供应链优化", longIntro: "制造圈面向制造业从业者，涵盖智能制造、工业4.0、精益生产、供应链管理、质量管控等主题。聚集工厂管理者、工艺工程师和制造业专家，分享产线优化和数字化转型经验。", annualFee: 499, saleFee: 249, memberCount: 8900, postCount: 21800, tags: ["智能制造", "精益生产", "供应链", "工业4.0"], category: "制造", ranking: 3 },
    { id: "circle_overseas", name: "出海圈", icon: "🌏", description: "中国企业出海战略、跨境运营与本地化实战", longIntro: "出海圈专注中国企业全球化拓展，覆盖东南亚、中东、拉美、非洲等热门出海目的地。汇集出海创业者、跨境电商运营、海外法务专家，提供市场准入、本地化策略和跨境合规指导。", annualFee: 599, saleFee: 349, memberCount: 7200, postCount: 19500, tags: ["出海", "跨境电商", "本地化", "全球化"], category: "出海", ranking: 4 },
    { id: "circle_finance", name: "财务圈", icon: "💰", description: "企业财税管理、投融资与资本运作", longIntro: "财务圈面向企业财务管理者、CFO和投资人，涵盖财务分析、税务筹划、融资策略、IPO上市、内部控制等核心主题。分享财税政策解读、行业最佳实践和投资机会。", annualFee: 499, saleFee: 249, memberCount: 6500, postCount: 16300, tags: ["财税", "投融资", "IPO", "内控"], category: "财务", ranking: 5 },
    { id: "circle_sports", name: "体育圈", icon: "⚽", description: "体育产业、赛事运营与运动科技", longIntro: "体育圈关注体育产业商业化，涵盖赛事运营、体育营销、运动科技、电竞、健身健康等方向。连接体育创业者、品牌方和运动爱好者，探讨体育商业新模式。", annualFee: 299, saleFee: 149, memberCount: 5200, postCount: 12800, tags: ["体育产业", "赛事", "电竞", "运动科技"], category: "体育", ranking: 6 },
    { id: "circle_meeting", name: "会议圈", icon: "📋", description: "行业会议、峰会论坛、线下活动信息与交流", longIntro: "会议圈发布全国各类行业峰会、技术论坛、创业路演、培训沙龙等活动信息。圈友可发布活动、报名参与、会后交流心得，是企业BD和商务拓展的重要渠道。", annualFee: 199, saleFee: 99, memberCount: 4100, postCount: 9800, tags: ["行业峰会", "论坛", "路演", "沙龙"], category: "会议", ranking: 7 },
    { id: "circle_edu", name: "教育圈", icon: "📚", description: "AI教育、职业教育与企业培训前沿阵地", longIntro: "教育圈关注AI时代的教育变革，涵盖AI教育工具、在线教育、职业教育、企业培训、知识付费等方向。聚集教育创业者、培训师和内容创作者，探讨教育科技新范式。", annualFee: 399, saleFee: 199, memberCount: 5800, postCount: 14200, tags: ["AI教育", "职业培训", "在线教育", "知识付费"], category: "教育", ranking: 8 },
  ];
}

export function getCircleById(id: string): Circle | undefined {
  return getDemoCircles().find(c => c.id === id);
}

// ============ 圈子订阅 ============
const SUBSCRIPTIONS_KEY = "rzq_circle_subs_v1";

export function getCircleSubscriptions(): CircleSubscription[] {
  try { const raw = localStorage.getItem(SUBSCRIPTIONS_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

export function isSubscribedToCircle(circleId: string): boolean {
  return getCircleSubscriptions().some(s => s.circleId === circleId && s.expiresAt > Date.now());
}

export function subscribeToCircle(circleId: string, fee: number): void {
  const circle = getCircleById(circleId);
  if (!circle) return;
  const sub: CircleSubscription = {
    id: "sub_" + Date.now(),
    circleId,
    circleName: circle.name,
    subscribedAt: Date.now(),
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 一年
    fee,
  };
  const subs = getCircleSubscriptions();
  // 已有订阅则续期
  const existing = subs.find(s => s.circleId === circleId);
  if (existing) {
    existing.expiresAt = Math.max(existing.expiresAt, Date.now()) + 365 * 24 * 60 * 60 * 1000;
    existing.fee = fee;
  } else {
    subs.push(sub);
  }
  localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subs));
}

export function searchCircles(keyword: string): Circle[] {
  const kw = keyword.toLowerCase();
  return getDemoCircles().filter(c =>
    c.name.includes(kw) || c.description.includes(kw) || c.tags.some(t => t.toLowerCase().includes(kw)) || c.category.includes(kw)
  );
}

export function getCirclesSortedByRanking(): Circle[] {
  return [...getDemoCircles()].sort((a, b) => a.ranking - b.ranking);
}

export function getCirclesSortedByMembers(): Circle[] {
  return [...getDemoCircles()].sort((a, b) => b.memberCount - a.memberCount);
}

// ============ 产品搜索排序 ============
export function searchProducts(keyword: string): Product[] {
  const kw = keyword.toLowerCase();
  return getDemoProducts().filter(p =>
    p.name.toLowerCase().includes(kw) || p.description.toLowerCase().includes(kw) || p.tags.some(t => t.toLowerCase().includes(kw))
  );
}

export function getProductsSortedByPrice(): Product[] {
  return [...getDemoProducts()].sort((a, b) => a.salePrice - b.salePrice);
}

export function getProductsSortedByPopularity(): Product[] {
  // DEMO: 模拟热度排序（ID顺序）
  return [...getDemoProducts()].sort((a, b) => a.id.localeCompare(b.id));
}
