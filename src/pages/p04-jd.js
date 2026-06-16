// P04 · JD 解析
import { goto, toast } from '../lib/router.js';
import { setProfile, getProfile } from '../lib/store.js';
import { COMPANIES } from '../lib/persona.js';
import { callLLM } from '../lib/llm.js';

export function mount(el) {
  el.innerHTML = `
    <div class="topbar">
      <span class="back" onclick="window.__goto('p03')">‹</span>
      <span class="topbar-title">JD 解析</span>
      <span class="right" id="__p04-clear" style="cursor:pointer;">清空</span>
    </div>
    <div style="padding:16px;">
      <p style="font-size:13px; color:var(--text-2); margin-bottom:12px;">粘贴目标岗位描述（JD）文本，AI 自动提取公司画像和考点词云</p>
      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <button class="btn-sm" id="__p04-tab-text" style="background:var(--primary-bg); color:var(--primary); border-radius:8px; padding:8px 14px; font-size:13px; flex:1;">📋 粘贴文本</button>
        <button class="btn-sm" id="__p04-tab-link" style="background:white; color:var(--text-2); border:1px solid var(--border); border-radius:8px; padding:8px 14px; font-size:13px; flex:1;">🔗 招聘链接</button>
      </div>
      <div id="__p04-text-panel">
        <textarea id="__p04-jd" rows="8" placeholder="点击下方「填充示例 JD」可一键试用"
          style="width:100%; padding:14px; border:1px solid var(--border); border-radius:12px; font-size:13px; line-height:1.7; background:white; resize:vertical;">字节跳动 · 产品经理（校招）
1. 负责抖音/今日头条 C 端产品规划
2. 深入理解用户需求，推动产品迭代
3. 与研发、设计协作，推进项目落地
4. 关注行业动态，输出竞品分析</textarea>
        <div style="text-align:center; margin:8px 0;">
          <span class="text-primary" id="__p04-fill" style="font-size:12px; cursor:pointer;">✨ 填充示例 JD</span>
        </div>
      </div>
      <div id="__p04-link-panel" style="display:none;">
        <input type="text" placeholder="粘贴 BOSS / 拉勾 / 实习僧 链接..." style="width:100%; padding:14px; border:1px solid var(--border); border-radius:12px; font-size:13px; background:white;" disabled />
        <p style="font-size:11px; color:var(--text-3); margin-top:6px; text-align:center;">v1.0 演示版：仅支持粘贴文本，链接解析将在 v1.1 上线</p>
      </div>
      <button class="btn btn-primary" id="__p04-parse" style="margin-top:14px;">
        🔍 解析 JD
      </button>
    </div>
    <div id="__p04-result" style="display:none;"></div>
  `;
  el.querySelector('#__p04-clear').onclick = () => {
    el.querySelector('#__p04-jd').value = '';
    el.querySelector('#__p04-result').style.display = 'none';
  };
  el.querySelector('#__p04-parse').onclick = () => parse(el);
  const tabText = el.querySelector('#__p04-tab-text');
  const tabLink = el.querySelector('#__p04-tab-link');
  const panelText = el.querySelector('#__p04-text-panel');
  const panelLink = el.querySelector('#__p04-link-panel');
  tabText.onclick = () => {
    tabText.style.background = 'var(--primary-bg)'; tabText.style.color = 'var(--primary)'; tabText.style.border = 'none';
    tabLink.style.background = 'white'; tabLink.style.color = 'var(--text-2)'; tabLink.style.border = '1px solid var(--border)';
    panelText.style.display = ''; panelLink.style.display = 'none';
  };
  tabLink.onclick = () => {
    tabLink.style.background = 'var(--primary-bg)'; tabLink.style.color = 'var(--primary)'; tabLink.style.border = 'none';
    tabText.style.background = 'white'; tabText.style.color = 'var(--text-2)'; tabText.style.border = '1px solid var(--border)';
    panelLink.style.display = ''; panelText.style.display = 'none';
  };
  el.querySelector('#__p04-fill').onclick = () => {
    el.querySelector('#__p04-jd').value = '字节跳动 · 产品经理（校招）\n1. 负责抖音/今日头条 C 端产品规划\n2. 深入理解用户需求，推动产品迭代\n3. 与研发、设计协作，推进项目落地\n4. 关注行业动态，输出竞品分析';
  };
}

async function parse(el) {
  const jd = el.querySelector('#__p04-jd').value.trim();
  if (jd.length < 20) { toast('请粘贴更完整的 JD 文本（≥20 字）'); return; }
  if (!/岗位|职位|负责|要求|职责|Responsibilities|Requirements|Responsibility|Requirement|工作内容|任职/i.test(jd)) {
    toast('看起来不是岗位描述，请检查');
    return;
  }
  const btn = el.querySelector('#__p04-parse');
  btn.disabled = true; btn.textContent = '🧠 AI 解析中…';

  const profile = getProfile();
  const company = profile.targetCompany || '字节跳动';
  const system = `你是产品求职辅导专家。请从给定 JD 文本中提取公司画像与考点词云，输出严格 JSON。
JSON 格式：
{
  "company_profile": {"company":"公司名","focus":"关注点","rhythm":"节奏","tone":"风格"},
  "keywords": ["关键词1", "关键词2", ...8个],
  "competency": ["能力1", "能力2", ...5个],
  "questions": ["可能问1", "可能问2", "可能问3"]
}`;

  try {
    const r = await callLLM({
      system,
      messages: [{ role: 'user', content: `【JD 文本】\n${jd}\n\n请输出 JSON：` }],
      jsonMode: true,
      temperature: 0.3,
      maxTokens: 800
    });
    const data = JSON.parse(extractJson(r.text));
    renderResult(el, data, company);
  } catch (e) {
    console.error('[p04] parse fail', e);
    toast('解析失败：' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = '🔍 解析 JD';
  }
}

function extractJson(s) {
  if (!s) return '{}';
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) return s.slice(start, end + 1);
  return s;
}

function renderResult(el, data, fallbackCompany) {
  const result = el.querySelector('#__p04-result');
  const cp = data.company_profile || {};
  const kws = data.keywords || [];
  const cps = data.competency || [];
  const qs = data.questions || [];

  // 推断 logo
  const companyName = cp.company || fallbackCompany;
  const meta = COMPANIES.find(c => c.id === companyName) || COMPANIES[0];

  result.innerHTML = `
    <div class="card" style="background:linear-gradient(135deg, var(--primary-bg) 0%, white 100%);">
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="font-size:36px;">${meta.logo}</div>
        <div style="flex:1;">
          <div style="font-weight:700; font-size:16px;">${cp.company || companyName}</div>
          <div style="font-size:12px; color:var(--text-2);">${cp.focus || ''}</div>
        </div>
      </div>
      <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:6px;">
        ${cp.rhythm ? `<span class="tag tag-primary">节奏：${cp.rhythm}</span>` : ''}
        ${cp.tone ? `<span class="tag tag-warning">风格：${cp.tone}</span>` : ''}
      </div>
    </div>

    <div class="card">
      <div style="font-weight:600; margin-bottom:12px;">🔥 考点词云</div>
      <div style="display:flex; flex-wrap:wrap; gap:6px;">
        ${kws.map((k, i) => {
          const sz = [13, 15, 17, 14, 12][i % 5];
          return `<span class="tag" style="background:var(--primary-bg); color:var(--primary); font-size:${sz}px; padding:6px 10px;">${escapeHtml(k)}</span>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <div style="font-weight:600; margin-bottom:12px;">🎯 核心能力</div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${cps.map(c => `<div style="font-size:13px; padding:6px 0; border-bottom:1px solid var(--border);">✓ ${escapeHtml(c)}</div>`).join('')}
      </div>
    </div>

    ${qs.length ? `
    <div class="card">
      <div style="font-weight:600; margin-bottom:12px;">❓ 可能问到的题</div>
      ${qs.map(q => `<div style="font-size:13px; padding:8px 12px; background:var(--bg); border-radius:8px; margin-bottom:6px;">${escapeHtml(q)}</div>`).join('')}
    </div>
    ` : ''}

    <div style="padding:8px 16px 16px;">
      <button class="btn btn-primary" id="__p04-use" style="background:linear-gradient(135deg, #5B4FE9 0%, #7B68EE 100%);">
        🚀 用此 JD 开始模拟面试
      </button>
    </div>
  `;
  result.style.display = 'block';
  result.querySelector('#__p04-use').onclick = () => {
    setProfile({ targetCompany: companyName });
    goto('p06');
  };
}

function escapeHtml(s) {
  return (s || '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
