// Web 演示服务：企业代表输入痛点 → AI 智能体专家自动分析 → 推荐技能包加入购物车 → 按创建人分成结算
import http from 'node:http'
import { analyze } from './agent.js'
import { loadKB } from './rag.js'
import { addToCart, checkout, clearCart } from './cart.js'

const PORT = process.env.PORT || 8787

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>融智桥 · AI 智能体专家 MVP（演示）</title>
<style>
:root{--brand:#0e7c86;--brand-d:#0a5a62;--brand-l:#e6f4f5;--warm:#f0883a;--ink:#1f2933;--sub:#6b7785;--line:#e7ebef;--bg:#f3f5f7;--ok:#1f9d6b;--danger:#e05656}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--ink);display:flex;justify-content:center}
.phone{width:100%;max-width:480px;min-height:100vh;background:#fff;display:flex;flex-direction:column}
.top{background:linear-gradient(135deg,var(--brand),var(--brand-d));color:#fff;padding:18px 16px}
.top .t1{font-weight:700;font-size:17px;display:flex;justify-content:space-between;align-items:center}
.badge{background:rgba(255,255,255,.22);font-size:11px;padding:2px 10px;border-radius:20px}
.top .t2{font-size:12px;opacity:.85;margin-top:6px}
.body{padding:16px;flex:1;overflow-y:auto}
.field label{font-size:13px;color:var(--sub);display:block;margin-bottom:6px}
textarea{width:100%;border:1px solid var(--line);border-radius:10px;padding:12px;font-size:14px;font-family:inherit;min-height:88px;resize:vertical}
.btn{background:var(--brand);color:#fff;border:none;border-radius:10px;padding:12px;width:100%;margin-top:10px;font-size:14px}
.card{background:var(--brand-l);border:1px solid var(--brand);border-radius:12px;padding:14px;margin-top:16px;font-size:14px;line-height:1.7;white-space:pre-wrap}
.tag{display:inline-block;font-size:11px;padding:2px 8px;border-radius:6px;background:#eef2f5;color:var(--sub);margin-left:6px}
.escalate{background:#fdeee2;color:var(--warm);border-color:var(--warm)}
.meta{font-size:12px;color:var(--sub);margin-top:10px}
.demo{font-size:11px;color:var(--warm);background:#fdeee2;padding:6px 10px;border-radius:8px;margin-top:12px}
#cart{margin-top:14px;display:none}
#settle{margin-top:14px;display:none}
</style>
</head>
<body>
<div class="phone">
  <div class="top">
    <div class="t1"><span>融智桥 · AI 智能体专家</span><span class="badge">演示</span></div>
    <div class="t2">制造业 Skills + 知识库 RAG · 自动痛点分析 → 技能包购物车 → 按创建人分成</div>
  </div>
  <div class="body">
    <div class="field"><label>企业代表描述痛点</label>
      <textarea id="pain" placeholder="如：订单波动大、排产靠老师傅经验、交期经常延误">订单波动大、排产靠老师傅经验、交期经常延误</textarea>
    </div>
    <button class="btn" id="go">让 AI 智能体专家分析</button>
    <div class="meta" id="meta"></div>
    <div class="card" id="out" style="display:none"></div>
    <div id="cart"></div>
    <div id="settle"></div>
    <div class="demo">全部为演示数据；AI 身份已显著标识，不冒充真实自然人专家。技能包可复用、可加入购物车，按创建人（自然人/智能体）拟定分成（透明智能分账协议）。</div>
  </div>
</div>
<script>
const btn=document.getElementById('go');
btn.onclick=async()=>{
  const text=document.getElementById('pain').value.trim();
  if(!text)return;
  btn.disabled=true;btn.textContent='分析中…';
  try{
    const r=await fetch('/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
    const d=await r.json();
    const meta='分类：'+d.painCategory+'　置信度：'+d.confidence+'　'+(d.escalate?'⚠️ 建议转人工':'✅ 智能体可处理');
    document.getElementById('meta').textContent=meta;
    const skills=(d.matchedSkills||[]).map(function(s){return s.name+'('+s.id+')';}).join('、')||'无';
    const rules=(d.suggestedRules||[]).map(function(x){return '· '+x;}).join('\\n');
    const out=document.getElementById('out');
    out.style.display='block';
    out.className='card'+(d.escalate?' escalate':'');
    out.textContent='匹配技能：'+skills+'\\n根因：'+(d.rootCause||[]).join('；')+'\\n'+(rules?('建议规则：\\n'+rules+'\\n'):'')+'\\n'+d.reply;
    renderCart(d.matchedSkills||[]);
  }catch(e){alert('分析失败：'+e.message);}
  finally{btn.disabled=false;btn.textContent='让 AI 智能体专家分析';}
};

function renderCart(skills){
  const box=document.getElementById('cart');
  if(!skills.length){box.style.display='none';return;}
  box.style.display='block';
  box.innerHTML='<div style="font-size:13px;color:#6b7785;margin-bottom:8px">推荐技能包（可加入购物车）：</div>';
  skills.forEach(function(s){
    const b=document.createElement('button');
    b.textContent='+ '+s.name+' ('+s.id+')';
    b.style.cssText='margin:4px;padding:6px 10px;border:1px solid #0e7c86;background:#e6f4f5;color:#0a5a62;border-radius:8px;font-size:12px;cursor:pointer';
    b.onclick=async()=>{
      await fetch('/cart/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:s.id})});
      b.disabled=true;b.textContent='✓ 已加 '+s.name;
    };
    box.appendChild(b);
  });
  const co=document.createElement('button');
  co.textContent='结算并分成';
  co.style.cssText='display:block;width:100%;margin-top:10px;padding:10px;background:#f0883a;color:#fff;border:none;border-radius:10px;font-size:14px;cursor:pointer';
  co.onclick=async()=>{
    const res=await fetch('/cart/checkout',{method:'POST'});
    const st=await res.json();
    renderSettle(st);
  };
  box.appendChild(co);
}

function renderSettle(st){
  const el=document.getElementById('settle');
  el.style.display='block';
  let html='<div class="card"><b>结算 · '+st.protocol+'</b><br>'+st.settlement+'<br>订单总额：¥'+st.total+'<br>';
  (st.lines||[]).forEach(function(l){
    html+='· '+l.name+' 创建人['+l.creator.type+':'+l.creator.name+'] ¥'+l.price+' → 创建人¥'+l.creatorPayout+' / 平台¥'+l.platformPayout+' / 链上¥'+l.chainPayout+'<br>';
  });
  html+='合计：创建人¥'+st.totals.creatorTotal+' / 平台¥'+st.totals.platformTotal+' / 链上¥'+st.totals.chainTotal+'<br><span style="font-size:11px;color:#d9822b">'+st.note+'</span></div>';
  el.innerHTML=html;
}
</script>
</body>
</html>`

// 安全解析请求体：畸形 JSON → 400（不抛 500），超体限 → 413（防 DoS）
function readJson(req, res, limit = 1_000_000) {
  return new Promise((resolve) => {
    let responded = false
    let size = 0
    let body = ''
    const fail = (code, msg) => {
      if (responded) return
      responded = true
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: msg }))
      req.destroy()
      resolve(null)
    }
    req.on('data', (c) => {
      if (responded) return
      size += c.length
      if (size > limit) {
        fail(413, 'payload too large')
        return
      }
      body += c
    })
    req.on('end', () => {
      if (responded) return
      if (body === '') {
        responded = true
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(body)
        responded = true
        resolve(parsed)
      } catch {
        fail(400, 'invalid json')
      }
    })
    req.on('error', () => {
      if (!responded) fail(400, 'bad request')
    })
  })
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(HTML)
    return
  }
  if (req.method === 'POST' && req.url === '/analyze') {
    const data = await readJson(req, res)
    if (!data) return
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(analyze(data.text || '')))
    return
  }
  if (req.method === 'POST' && req.url === '/cart/add') {
    const data = await readJson(req, res)
    if (!data) return
    const ok = addToCart(data.id)
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok, id: data.id }))
    return
  }
  if (req.method === 'POST' && req.url === '/cart/checkout') {
    try {
      const kb = loadKB()
      const settle = checkout(kb)
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(settle))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: String(e) }))
    }
    return
  }
  if (req.method === 'POST' && req.url === '/cart/clear') {
    clearCart()
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: true }))
    return
  }
  res.writeHead(404)
  res.end('Not Found')
})

server.listen(PORT, () => {
  console.log(`AI 智能体专家 Web 演示已启动：http://localhost:${PORT}`)
})
