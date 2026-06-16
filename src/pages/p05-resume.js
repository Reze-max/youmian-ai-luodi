// P05 · 简历定制 + 经历包装
import { goto, toast, confirmModal } from '../lib/router.js';
import { getResume, setResume, getProfile } from '../lib/store.js';
import { callLLM } from '../lib/llm.js';
import { PACKAGE_EXPERIENCE_PROMPT } from '../data/package.js';

export function mount(el) {
  render(el);
}

function render(el) {
  const resume = getResume();
  const profile = getProfile();
  el.innerHTML = `
    <div class="topbar">
      <span class="back" onclick="window.__goto('p03')">‹</span>
      <span class="topbar-title">简历定制</span>
      ${resume.rawText ? '<span class="right" id="__p05-clear" style="cursor:pointer;">清空</span>' : ''}
    </div>

    <div class="card">
      <div style="font-weight:600; margin-bottom:8px;">📄 上传简历</div>
      <p style="font-size:12px; color:var(--text-2); margin-bottom:12px;">v1.0 暂支持 PDF（解析需联网加载 pdfjs）。也可直接在线填写。</p>
      <div id="__p05-upload" style="border:2px dashed var(--border); border-radius:12px; padding:24px 16px; text-align:center; cursor:pointer; background:#FAFBFC;">
        <div style="font-size:32px; margin-bottom:6px;">📁</div>
        <div style="font-weight:600; margin-bottom:2px;">${resume.fileName ? '✅ ' + resume.fileName : '点击上传 PDF 简历'}</div>
        <div style="font-size:11px; color:var(--text-3);">${resume.rawText ? '点击重新上传' : '≤10MB · 纯文本 PDF 解析效果更好'}</div>
      </div>
      <input type="file" id="__p05-file" accept="application/pdf" style="display:none;" />
    </div>

    <div class="card">
      <div style="font-weight:600; margin-bottom:8px;">📝 在线填写（推荐 · 解析更准）</div>
      <textarea id="__p05-text" rows="8" placeholder="把你的简历核心内容贴在这里：教育背景、项目经历、实习经历、核心技能等"
        style="width:100%; padding:12px; border:1px solid var(--border); border-radius:10px; font-size:13px; line-height:1.6; background:white; resize:vertical;">${escapeHtml(resume.rawText || '')}</textarea>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="btn btn-outline btn-sm" id="__p05-save-text" style="flex:1;">保存文本</button>
        <button class="btn btn-primary btn-sm" id="__p05-package" style="flex:1;">🤖 AI 经历包装</button>
      </div>
    </div>

    <div id="__p05-cards" style="display:none;"></div>
  `;

  el.querySelector('#__p05-upload').onclick = () => el.querySelector('#__p05-file').click();
  el.querySelector('#__p05-file').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    toast('解析 PDF 中…');
    try {
      const text = await parsePdf(f);
      setResume({ rawText: text, fileName: f.name });
      toast('✅ 简历已保存');
      render(el);
    } catch (err) {
      toast('解析失败：' + err.message);
    }
  };
  el.querySelector('#__p05-save-text').onclick = () => {
    const text = el.querySelector('#__p05-text').value.trim();
    if (!text) { toast('请先填写内容'); return; }
    setResume({ rawText: text, fileName: '在线填写' });
    toast('✅ 简历已保存');
    render(el);
  };
  el.querySelector('#__p05-package').onclick = () => packageExperience(el);

  const clearBtn = el.querySelector('#__p05-clear');
  if (clearBtn) {
    clearBtn.onclick = async () => {
      if (await confirmModal({ title: '清空简历？', desc: '将删除已上传的简历和包装建议。', primaryText: '清空', danger: true })) {
        setResume({ rawText: '', fileName: '', packaged: [] });
        render(el);
      }
    };
  }

  if (resume.packaged && resume.packaged.length) {
    renderCards(el, resume.packaged);
  }
}

async function packageExperience(el) {
  const text = el.querySelector('#__p05-text').value.trim();
  if (text.length < 30) { toast('请填写更丰富的简历内容（≥30 字）'); return; }
  setResume({ rawText: text, fileName: '在线填写' });
  const profile = getProfile();

  // 提取经历段落（按换行/项目符号切分）
  const experiences = text.split(/[\n\r]+/)
    .map(l => l.replace(/^[\s•●\-*]+/, '').trim())
    .filter(l => l.length > 6 && l.length < 200)
    .slice(0, 8);

  if (!experiences.length) { toast('未识别到有效经历，请换行分隔不同经历'); return; }

  const btn = el.querySelector('#__p05-package');
  btn.disabled = true; btn.textContent = '🧠 AI 包装中…';
  try {
    const r = await callLLM({
      system: PACKAGE_EXPERIENCE_PROMPT,
      messages: [{ role: 'user', content: `【经历列表】\n${experiences.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\n请输出 JSON：\n` }],
      jsonMode: true,
      temperature: 0.4,
      maxTokens: 1200
    });
    const data = JSON.parse(extractJson(r.text));
    const cards = (data.cards || []).map(c => ({ ...c, status: 'pending' }));
    if (!cards.length) { toast('AI 未识别到可包装的经历'); return; }
    setResume({ packaged: cards });
    renderCards(el, cards);
    toast(`✅ 已生成 ${cards.length} 条包装建议`);
  } catch (e) {
    console.error('[p05] package fail', e);
    toast('包装失败：' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = '🤖 AI 经历包装';
  }
}

function renderCards(el, cards) {
  const wrap = el.querySelector('#__p05-cards');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="card" style="background:linear-gradient(135deg, var(--primary-bg) 0%, white 100%);">
      <div style="font-weight:600; margin-bottom:6px;">💡 AI 包装建议</div>
      <div style="font-size:11px; color:var(--text-2);">逐条"采纳 / 拒绝 / 修改"后保存，所有建议会同步到模拟面试</div>
    </div>
    ${cards.map((c, i) => `
      <div class="card" data-i="${i}" style="border-left:4px solid ${c.status === 'accepted' ? 'var(--success)' : c.status === 'rejected' ? 'var(--error)' : 'var(--primary)'};">
        <div style="font-size:12px; color:var(--text-3); margin-bottom:4px;">原经历</div>
        <div style="font-size:13px; color:var(--text-1); margin-bottom:10px;">${escapeHtml(c.original)}</div>
        <div style="font-size:12px; color:var(--text-3); margin-bottom:4px;">AI 建议 · 产品岗视角</div>
        <div style="font-size:14px; font-weight:600; color:var(--primary); margin-bottom:6px;">${escapeHtml(c.suggested)}</div>
        <div style="font-size:11px; color:var(--text-2); margin-bottom:12px;">${escapeHtml(c.reason || '')}</div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-sm ${c.status === 'accepted' ? '' : 'btn-outline'}" data-act="accepted" style="flex:1; color:var(--success); border-color:var(--success); ${c.status === 'accepted' ? 'background:var(--success);color:white;' : ''}">✓ 采纳</button>
          <button class="btn btn-sm ${c.status === 'rejected' ? '' : 'btn-outline'}" data-act="rejected" style="flex:1; color:var(--error); border-color:var(--error); ${c.status === 'rejected' ? 'background:var(--error);color:white;' : ''}">✗ 拒绝</button>
          <button class="btn btn-sm ${c.status === 'pending' ? 'btn-primary' : 'btn-outline'}" data-act="pending" style="flex:1; ${c.status === 'pending' ? '' : 'color:var(--text-3);border-color:var(--border);'}">⋯ 待定</button>
        </div>
      </div>
    `).join('')}
    <div style="padding:8px 16px 16px;">
      <button class="btn btn-primary" id="__p05-use" style="background:linear-gradient(135deg, #5B4FE9 0%, #7B68EE 100%);">
        🚀 用此简历开始模拟面试
      </button>
    </div>
  `;
  wrap.style.display = 'block';
  wrap.querySelectorAll('[data-act]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.closest('[data-i]').dataset.i, 10);
      const resume = getResume();
      resume.packaged[idx].status = btn.dataset.act;
      setResume({ packaged: resume.packaged });
      renderCards(el, resume.packaged);
    };
  });
  wrap.querySelector('#__p05-use').onclick = () => goto('p06');
}

function extractJson(s) {
  if (!s) return '{}';
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) return m[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) return s.slice(start, end + 1);
  return s;
}

function escapeHtml(s) {
  return (s || '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function parsePdf(file) {
  if (window.pdfjsLib) {
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    let text = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(it => it.str).join(' ') + '\n';
    }
    return text.trim();
  }
  throw new Error('未检测到 pdfjs，请用在线填写或刷新页面重试');
}
