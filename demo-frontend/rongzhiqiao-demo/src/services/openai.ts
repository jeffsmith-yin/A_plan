// 腾讯混元大模型 API 调用服务（TokenHub 代理版本）
// 腾讯混元已迁移至 TokenHub：tokenhub.tencentmaas.com，模型使用 hy3
// PDF/DOCX 文本提取由 proxy.js 服务端处理

const DEFAULT_MODEL = "hy3";

let apiKey: string | null = null;

export function setApiKey(key: string): void {
  apiKey = key;
}

export function getApiKey(): string | null {
  return apiKey;
}

export function getApiProvider(): string {
  return "腾讯混元";
}

/** 通用 fetch 包装，便于统一处理错误 */
async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } })) as any;

  if (!response.ok) {
    throw new Error(data.error?.message || data.error || `请求失败 (${response.status})`);
  }
  if (data.error) {
    throw new Error(data.error?.message || data.error);
  }
  return data as T;
}

/** 验证 API Key 是否有效 */
export async function verifyApiKey(key: string): Promise<{ valid: boolean; model?: string; provider?: string; error?: string }> {
  return postJson("/api/verify-key", { apiKey: key });
}

/** 调用腾讯混元进行文件总结（原始 base64 内容传给服务端，由服务端提取文本） */
export async function summarizeFile(fileName: string, content: string): Promise<string> {
  if (!apiKey) throw new Error("未配置 API Key，请在设置中输入腾讯混元 API Key");
  const data = await postJson<{ success: boolean; content?: string; error?: string }>("/api/summarize", {
    apiKey,
    fileName,
    content,  // 直接传原始 base64，服务端负责提取文本
  });
  if (!data.success || !data.content) throw new Error(data.error || "总结生成失败");
  return data.content;
}

/** 调用腾讯混元生成自我介绍 */
export async function generateIntro(fileContent: string, roleType: string): Promise<string> {
  if (!apiKey) throw new Error("未配置 API Key，请在设置中输入腾讯混元 API Key");
  const data = await postJson<{ success: boolean; content?: string; error?: string }>("/api/generate-intro", {
    apiKey,
    fileContent,
    roleType,
  });
  if (!data.success || !data.content) throw new Error(data.error || "生成失败");
  return data.content;
}
