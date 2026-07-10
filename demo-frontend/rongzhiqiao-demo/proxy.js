// 融智桥 DEMO 代理服务器（零依赖版本 — 仅用 Node.js 内置模块）
// 静态文件服务 + 腾讯混元 API 代理 + PDF 文本提取

const http = require("http");
const https = require("https");
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const { execSync } = require("child_process");
const url = require("url");

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
const BUILD_PATH = path.join(__dirname, "build");

const HUNYUAN_API_BASE = "https://tokenhub.tencentmaas.com/v1";
const DEFAULT_MODEL = "hy3";

// ========== MIME 类型 ==========
const MIME = {
  ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".ico": "image/x-icon", ".svg": "image/svg+xml", ".txt": "text/plain",
  ".gz": "application/gzip", ".zip": "application/zip", ".woff2": "font/woff2",
};

// ========== 纯 Node.js PDF 文本提取 ==========
function extractPdfText(binary) {
  const raw = binary.toString("latin1");
  const texts = [];

  const streamRegex = /\/Filter\s*\/FlateDecode[\s\S]*?stream\s*\r?\n([\s\S]*?)endstream/g;
  let m;
  while ((m = streamRegex.exec(raw)) !== null) {
    try {
      let data = m[1];
      if (data.endsWith("\r\n")) data = data.slice(0, -2);
      else if (data.endsWith("\n")) data = data.slice(0, -1);
      const buf = Buffer.from(data, "latin1");
      const dec = zlib.inflateSync(buf).toString("latin1");

      const tjRe = /\(([^)]*)\)\s*Tj/g; let tm;
      while ((tm = tjRe.exec(dec)) !== null) { if (tm[1].trim().length > 1) texts.push(tm[1].trim()); }

      const tjArrRe = /\[([^\]]*)\]\s*TJ/g;
      while ((tm = tjArrRe.exec(dec)) !== null) {
        const sr = /\(([^)]*)\)/g; let sm;
        while ((sm = sr.exec(tm[1])) !== null) { if (sm[1].trim().length > 1) texts.push(sm[1].trim()); }
      }

      try {
        const u8 = zlib.inflateSync(buf).toString("utf-8");
        const ur = /\(([^)]{2,})\)\s*Tj/g; let um;
        while ((um = ur.exec(u8)) !== null) { if (/[\u4e00-\u9fff]/.test(um[1])) texts.push(um[1].trim()); }
      } catch (e) { /* ignore */ }
    } catch (e) { /* skip */ }
  }

  const plainRe = /\/Length\s+\d+[\s\S]*?stream\s*\r?\n([\s\S]*?)endstream/g;
  while ((m = plainRe.exec(raw)) !== null) {
    try {
      let data = m[1];
      if (data.endsWith("\r\n")) data = data.slice(0, -2);
      else if (data.endsWith("\n")) data = data.slice(0, -1);
      const c = Buffer.from(data, "latin1").toString("utf-8");
      const tr = /\(([^)]{2,})\)\s*Tj/g; let tm;
      while ((tm = tr.exec(c)) !== null) { if (tm[1].trim().length > 1) texts.push(tm[1].trim()); }
    } catch (e) { /* skip */ }
  }

  const seen = new Set();
  return texts.filter(t => {
    if (seen.has(t) || t.length < 2) return false;
    seen.add(t);
    return !/^[\x00-\x1f\s\-+.0-9]+$/.test(t);
  }).join("\n");
}

function extractText(content, fileName) {
  if (!content || !content.startsWith("data:")) return (content || "").slice(0, 8000);
  const mm = content.match(/^data:([^;]+);base64,(.+)$/);
  if (!mm) return content.slice(0, 2000);
  const binary = Buffer.from(mm[2], "base64");
  const ext = (fileName || "").toLowerCase();

  if (mm[1].includes("pdf") || ext.endsWith(".pdf")) {
    try {
      const tmp = path.join(__dirname, `_pdf_${Date.now()}.pdf`);
      fs.writeFileSync(tmp, binary);
      const txt = execSync(`pdftotext "${tmp}" - -l 30`, { encoding: "utf-8", timeout: 10000, maxBuffer: 2*1024*1024 });
      fs.unlink(tmp, () => {});
      const c = txt.replace(/\f/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      if (c.length > 100) { console.log(`[PDF] pdftotext: ${c.length} chars`); return c.slice(0, 15000); }
    } catch (e) { /* fallthrough */ }

    const raw = extractPdfText(binary);
    if (raw.length > 100) { console.log(`[PDF] Node.js: ${raw.length} chars`); return raw.slice(0, 15000); }

    const fb = binary.toString("utf-8").replace(/[^\x20-\x7e\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\n]/g, "");
    console.log(`[PDF] Fallback: ${fb.length} chars`);
    return fb.slice(0, 8000) || "(PDF 解析失败)";
  }

  if (mm[1].includes("text") || [".txt",".csv",".json",".md"].includes(ext)) return binary.toString("utf-8").slice(0, 8000);

  // Excel 文件：用 Python openpyxl/xlrd 提取文本
  if ([".xlsx",".xls"].includes(ext) || mm[1].includes("spreadsheet") || mm[1].includes("excel")) {
    try {
      const tmp = path.join(__dirname, `_xl_${Date.now()}${ext}`);
      fs.writeFileSync(tmp, binary);
      const pyCode = `
import sys
try:
    import openpyxl
    wb = openpyxl.load_workbook("${tmp.replace(/\\/g,"\\\\")}", data_only=True)
    for sn in wb.sheetnames:
        ws = wb[sn]
        print(f"=== Sheet: {sn} ===")
        for row in ws.iter_rows(values_only=True):
            vals = [str(c) for c in row if c is not None]
            if vals:
                print(" | ".join(vals))
except Exception as e1:
    try:
        import xlrd
        wb = xlrd.open_workbook("${tmp.replace(/\\/g,"\\\\")}")
        for sn in wb.sheet_names():
            ws = wb.sheet_by_name(sn)
            print(f"=== Sheet: {sn} ===")
            for r in range(ws.nrows):
                vals = [str(ws.cell_value(r,c)) for c in range(ws.ncols) if ws.cell_value(r,c) != ""]
                if vals:
                    print(" | ".join(vals))
    except Exception as e2:
        print(f"ERROR: {e1} // {e2}")
`;
      const txt = execSync(`python3 -c "${pyCode.replace(/"/g,'\\"')}"`, { encoding: "utf-8", timeout: 15000, maxBuffer: 5*1024*1024 });
      fs.unlink(tmp, () => {});
      const c = txt.trim();
      if (c.length > 100) { console.log(`[Excel] Python: ${c.length} chars`); return c.slice(0, 15000); }
    } catch (e) { console.log(`[Excel] Python error: ${e.message}`); }
  }

  return binary.toString("utf-8").slice(0, 3000);
}

// ========== HTTP 工具 ==========
function readJson(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

function sendJson(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function hunyuanRequest(apiKey, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(`${HUNYUAN_API_BASE}/chat/completions`);
    const opts = {
      hostname: u.hostname, port: 443, path: u.pathname, method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "Content-Length": Buffer.byteLength(data) },
    };
    const req = https.request(opts, (resp) => {
      let r = "";
      resp.on("data", d => r += d);
      resp.on("end", () => {
        try { resolve(JSON.parse(r)); } catch { reject(new Error(`HTTP ${resp.statusCode}`)); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ========== HTTP Server ==========
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" });
    return res.end();
  }

  // API routes
  if (pathname.startsWith("/api/")) {
    if (req.method === "POST" && pathname === "/api/summarize") {
      try {
        const { fileName, content, apiKey } = await readJson(req);
        if (!apiKey) return sendJson(res, 400, { error: "未提供 API Key" });
        const text = extractText(content, fileName);
        console.log(`[Summarize] ${text.length} chars from "${fileName}"`);
        if (text.length < 20) return sendJson(res, 200, { success: true, content: "内容过短，无法总结" });
        const d = await hunyuanRequest(apiKey, {
          model: DEFAULT_MODEL, max_tokens: 800, temperature: 0.5,
          messages: [{ role: "system", content: "你是文件分析助手。用中文总结，3-5要点+表格，400字内，结尾加【腾讯混元 AI自动总结 · DEMO】" }, { role: "user", content: `文件名：${fileName}\n内容：\n${text}` }],
        });
        console.log(`[Hunyuan] tokens: ${d.usage?.total_tokens || "N/A"}`);
        return sendJson(res, 200, { success: true, content: d.choices?.[0]?.message?.content || "失败" });
      } catch (e) { return sendJson(res, 500, { error: e.message }); }
    }

    if (req.method === "POST" && pathname === "/api/generate-intro") {
      try {
        const { fileContent, roleType, apiKey } = await readJson(req);
        if (!apiKey) return sendJson(res, 400, { error: "未提供 API Key" });
        const label = roleType === "expert" ? "行业专家" : roleType === "ai" ? "AI人才" : "专业人士";
        const d = await hunyuanRequest(apiKey, {
          model: DEFAULT_MODEL, max_tokens: 500, temperature: 0.7,
          messages: [{ role: "system", content: `生成第一人称个人介绍，${label}，150-300字` }, { role: "user", content: fileContent }],
        });
        return sendJson(res, 200, { success: true, content: d.choices?.[0]?.message?.content || "失败" });
      } catch (e) { return sendJson(res, 500, { error: e.message }); }
    }

    if (req.method === "POST" && pathname === "/api/verify-key") {
      try {
        const { apiKey } = await readJson(req);
        const d = await hunyuanRequest(apiKey, { model: DEFAULT_MODEL, messages: [{ role: "user", content: "hi" }], max_tokens: 5 });
        return sendJson(res, 200, { valid: true, model: d.model, provider: "腾讯混元" });
      } catch (e) { return sendJson(res, 200, { valid: false, error: e.message }); }
    }

    if (req.method === "GET" && pathname === "/api/health") {
      return sendJson(res, 200, { status: "ok", provider: "腾讯混元", pdfSupport: "builtin" });
    }

    return sendJson(res, 404, { error: "Not found" });
  }

  // Static files + SPA
  let filePath = path.join(BUILD_PATH, pathname === "/" ? "index.html" : pathname);
  const ext = path.extname(filePath);
  const mime = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (!err) {
      res.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-cache" });
      return res.end(data);
    }
    // SPA fallback
    fs.readFile(path.join(BUILD_PATH, "index.html"), (e2, d2) => {
      if (e2) { res.writeHead(404); return res.end("Not Found"); }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(d2);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`🌉 融智桥 DEMO 服务器已启动`);
  console.log(`   本地访问: http://localhost:${PORT}`);
  console.log(`   AI 代理: 腾讯混元 (${DEFAULT_MODEL})`);
  console.log(`   PDF 解析: 内置纯 Node.js（零外部依赖）`);
  console.log(`   依赖: 零！仅用 Node.js 内置模块`);
});
