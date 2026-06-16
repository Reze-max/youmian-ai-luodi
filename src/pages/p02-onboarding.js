// P02 · 引导页（3 步：选公司/岗位 → 上传简历 → 选轮次）
import { goto, toast } from '../lib/router.js';
import { setProfile, getResume } from '../lib/store.js';
import { COMPANIES, POSITIONS, PRESSURE_LEVELS } from '../lib/persona.js';

let step = 1;
const state = {
  company: '',
  position: '产品经理（校招）',
  jobType: 'campus',
  pressure: 'standard',
  hasResume: false
};

export function mount(el) {
  step = 1;
  const resume = getResume();
  state.hasResume = !!resume.rawText;
  render(el);
}

function render(el) {
  if (step === 1) return renderStep1(el);
  if (step === 2) return renderStep2(el);
  if (step === 3) return renderStep3(el);
}

function renderStep1(el) {
  el.innerHTML = `
    <div class="topbar">
      <span class="back" onclick="window.__goto('p01')">‹</span>
      <span class="topbar-title">选目标公司 / 岗位</span>
      <span class="right">1/3</span>
    </div>
    <div style="padding:20px 16px 8px;">
      <p style="font-size:15px; font-weight:600; color:var(--text-1); margin-bottom:14px;">你想面试哪家公司？</p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:24px;">
        ${COMPANIES.map(c => `
          <div class="company-card" data-c="${c.id}" style="background:white; border:2px solid ${state.company === c.id ? 'var(--primary)' : 'var(--border)'}; border-radius:12px; padding:18px 12px; text-align:center; cursor:pointer; transition:all 0.2s;">
            <div style="font-size:32px; margin-bottom:6px;">${c.logo}</div>
            <div style="font-weight:600; font-size:14px; margin-bottom:4px;">${c.short}</div>
            <div style="font-size:11px; color:var(--text-3);">${c.tagline}</div>
          </div>
        `).join('')}
      </div>
      <p style="font-size:15px; font-weight:600; color:var(--text-1); margin-bottom:14px;">目标岗位</p>
      <select id="__p02-position" class="card" style="width:calc(100% - 32px); margin:0 16px 12px; padding:12px; border:1px solid var(--border); border-radius:8px; background:white;">
        ${POSITIONS.map(p => `<option value="${p.id}" data-jt="${p.jobType}" ${state.position === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
      </select>
    </div>
    <div style="padding:24px 16px;">
      <button class="btn btn-primary" id="__p02-next" ${state.company ? '' : 'disabled style="opacity:0.5;"'}>
        下一步 →
      </button>
    </div>
  `;
  el.querySelectorAll('.company-card').forEach(c => {
    c.onclick = () => {
      state.company = c.dataset.c;
      el.querySelectorAll('.company-card').forEach(x => x.style.borderColor = 'var(--border)');
      c.style.borderColor = 'var(--primary)';
      const next = el.querySelector('#__p02-next');
      next.disabled = false;
      next.style.opacity = '1';
    };
  });
  el.querySelector('#__p02-position').onchange = (e) => {
    state.position = e.target.value;
    state.jobType = e.target.selectedOptions[0].dataset.jt;
  };
  el.querySelector('#__p02-next').onclick = () => {
    if (!state.company) { toast('请选择目标公司'); return; }
    setProfile({ targetCompany: state.company, targetPosition: state.position, jobType: state.jobType });
    step = 2;
    render(el);
  };
}

function renderStep2(el) {
  el.innerHTML = `
    <div class="topbar">
      <span class="back" onclick="window.__goto('p01')">‹</span>
      <span class="topbar-title">上传简历</span>
      <span class="right">2/3</span>
    </div>
    <div style="padding:24px 16px;">
      <p style="font-size:15px; font-weight:600; margin-bottom:8px;">上传你的简历</p>
      <p style="font-size:13px; color:var(--text-2); margin-bottom:20px;">支持 PDF · 解析后用于简历深挖和经历包装</p>
      <div class="card" style="text-align:center; padding:32px 16px; cursor:pointer; border:2px dashed var(--border); background:#FAFBFC;" id="__p02-upload">
        <div style="font-size:48px; margin-bottom:8px;">📄</div>
        <p style="font-weight:600; margin-bottom:4px;">${state.hasResume ? '✅ 已上传：' + getResume().fileName : '点击上传 PDF 简历'}</p>
        <p style="font-size:12px; color:var(--text-3);">${state.hasResume ? '点击重新上传' : 'v1.0 暂仅支持 PDF'}</p>
      </div>
      <div style="margin-top:16px; text-align:center;">
        <button class="btn btn-outline btn-sm" onclick="window.__goto('p05')">📝 改用在线填写</button>
      </div>
      <input type="file" id="__p02-file" accept="application/pdf" style="display:none;" />
    </div>
    <div style="padding:24px 16px;">
      <button class="btn btn-primary" id="__p02-next" ${state.hasResume ? '' : 'disabled style="opacity:0.5;"'}>
        ${state.hasResume ? '下一步 →' : '先上传简历 ↑'}
      </button>
    </div>
  `;
  el.querySelector('#__p02-upload').onclick = () => el.querySelector('#__p02-file').click();
  el.querySelector('#__p02-file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast('v1.0 暂仅支持 PDF，可去 P05 在线填写');
      return;
    }
    toast('解析 PDF 中…');
    try {
      const text = await parsePdf(file);
      const { setResume } = await import('../lib/store.js');
      setResume({ rawText: text, fileName: file.name });
      state.hasResume = true;
      toast('简历解析成功');
      render(el);
    } catch (err) {
      console.error(err);
      toast('PDF 解析失败，请去 P05 在线填写');
    }
  };
  el.querySelector('#__p02-next').onclick = () => {
    if (!state.hasResume) { toast('请先上传简历'); return; }
    step = 3;
    render(el);
  };
}

function renderStep3(el) {
  el.innerHTML = `
    <div class="topbar">
      <span class="back" onclick="window.__goto('p01')">‹</span>
      <span class="topbar-title">选压力级别</span>
      <span class="right">3/3</span>
    </div>
    <div style="padding:24px 16px;">
      <p style="font-size:15px; font-weight:600; margin-bottom:8px;">选一个压力级别</p>
      <p style="font-size:13px; color:var(--text-2); margin-bottom:20px;">不同压力级别对应不同的追问强度和节奏</p>
      <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">
        ${PRESSURE_LEVELS.map(p => `
          <div class="pressure-card" data-p="${p.id}" style="background:white; border:2px solid ${state.pressure === p.id ? 'var(--primary)' : 'var(--border)'}; border-radius:12px; padding:16px; cursor:pointer; display:flex; align-items:center; gap:12px;">
            <div style="font-size:32px;">${p.emoji}</div>
            <div style="flex:1;">
              <div style="font-weight:600; margin-bottom:2px;">${p.label}</div>
              <div style="font-size:12px; color:var(--text-2);">${p.desc}</div>
            </div>
            ${state.pressure === p.id ? '<span class="text-primary">✓</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
    <div style="padding:24px 16px;">
      <button class="btn btn-primary" id="__p02-start">
        开始模拟面试 →
      </button>
    </div>
  `;
  el.querySelectorAll('.pressure-card').forEach(c => {
    c.onclick = () => {
      state.pressure = c.dataset.p;
      setProfile({ pressureLevel: state.pressure });
      el.querySelectorAll('.pressure-card').forEach(x => x.style.borderColor = 'var(--border)');
      c.style.borderColor = 'var(--primary)';
      el.querySelectorAll('.pressure-card .text-primary').forEach(t => t.remove());
      c.insertAdjacentHTML('beforeend', '<span class="text-primary">✓</span>');
    };
  });
  el.querySelector('#__p02-start').onclick = () => goto('p06');
}

// 简易 PDF 文本提取（无第三方库兜底版）
async function parsePdf(file) {
  // 优先尝试使用 pdfjs（如已加载），否则降级为读取文件名 + 简单提示
  if (window.pdfjsLib) {
    try {
      const buf = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      let text = '';
      for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(it => it.str).join(' ') + '\n';
      }
      return text.trim();
    } catch (e) {
      console.warn('[pdfjs] parse fail, fallback to file info', e);
    }
  }
  // 兜底：返回文件名（用户后续可在 P05 重新填写）
  return `[文件名] ${file.name}\n[说明] PDF 解析需要联网加载 pdfjs 库，未能提取正文。请在 P05 页面手动填写或重新上传纯文本 PDF。`;
}
