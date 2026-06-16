// P06 · 模拟面试配置
import { goto, toast } from '../lib/router.js';
import { setProfile, getProfile, getResume, appendInterview } from '../lib/store.js';
import { COMPANIES, POSITIONS, PRESSURE_LEVELS } from '../lib/persona.js';

const state = {
  company: '',
  position: '',
  jobType: 'campus',
  pressure: 'standard',
  stage: '1面',
  resumeSnip: ''
};

export function mount(el) {
  const profile = getProfile();
  const resume = getResume();
  state.company = profile.targetCompany || '';
  state.position = profile.targetPosition || '产品经理（校招）';
  state.jobType = profile.jobType || 'campus';
  state.pressure = profile.pressureLevel || 'standard';
  state.resumeSnip = (resume.rawText || '').slice(0, 80);

  render(el);
}

function render(el) {
  el.innerHTML = `
    <div class="topbar">
      <span class="back" onclick="window.__goto('p03')">‹</span>
      <span class="topbar-title">面试配置</span>
      <span class="right" onclick="history.back()">取消</span>
    </div>

    <div class="card" style="background:linear-gradient(135deg, var(--primary-bg) 0%, white 100%);">
      <div style="font-size:13px; color:var(--text-2); margin-bottom:4px;">即将开始</div>
      <div style="font-size:20px; font-weight:700; color:var(--primary);">${state.company || '请选择公司'} · ${state.stage}</div>
      <div style="font-size:12px; color:var(--text-2); margin-top:4px;">${state.position}</div>
    </div>

    <div class="card">
      <div style="font-weight:600; margin-bottom:12px;">🏢 目标公司</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        ${COMPANIES.map(c => `
          <div data-c="${c.id}" class="cfg-company"
               style="border:2px solid ${state.company === c.id ? 'var(--primary)' : 'var(--border)'};
                      border-radius:10px; padding:10px 8px; text-align:center; cursor:pointer; background:white;">
            <div style="font-size:24px;">${c.logo}</div>
            <div style="font-size:12px; font-weight:600; margin-top:2px;">${c.short}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <div style="font-weight:600; margin-bottom:12px;">💼 岗位</div>
      <select id="__p06-position" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; background:white;">
        ${POSITIONS.map(p => `<option value="${p.id}" data-jt="${p.jobType}" ${state.position === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
      </select>
    </div>

    <div class="card">
      <div style="font-weight:600; margin-bottom:12px;">🎯 面试轮次</div>
      <div style="display:flex; gap:8px;">
        ${['1面', '2面'].map(s => `
          <div data-s="${s}" class="cfg-stage"
               style="flex:1; text-align:center; padding:10px; border:2px solid ${state.stage === s ? 'var(--primary)' : 'var(--border)'}; border-radius:10px; cursor:pointer; background:white; font-size:13px; font-weight:600;">
            ${s}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <div style="font-weight:600; margin-bottom:12px;">🔥 压力级别</div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${PRESSURE_LEVELS.map(p => `
          <div data-p="${p.id}" class="cfg-pressure"
               style="display:flex; align-items:center; gap:10px; padding:10px 12px; border:2px solid ${state.pressure === p.id ? 'var(--primary)' : 'var(--border)'}; border-radius:10px; cursor:pointer; background:white;">
            <div style="font-size:24px;">${p.emoji}</div>
            <div style="flex:1;">
              <div style="font-weight:600; font-size:13px;">${p.label}</div>
              <div style="font-size:11px; color:var(--text-2);">${p.desc}</div>
            </div>
            ${state.pressure === p.id ? '<span class="text-primary">✓</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <div style="font-weight:600; margin-bottom:8px;">📄 已关联简历</div>
      ${state.resumeSnip ? `
        <div style="font-size:12px; color:var(--text-2); line-height:1.6;">${escapeHtml(state.resumeSnip)}…</div>
        <div style="margin-top:8px;"><span class="text-primary" style="font-size:12px; cursor:pointer;" onclick="window.__goto('p05')">重新上传 →</span></div>
      ` : `
        <div style="font-size:12px; color:var(--error);">⚠️ 尚未上传简历</div>
        <button class="btn btn-sm btn-outline" style="margin-top:8px;" onclick="window.__goto('p05')">去上传简历</button>
      `}
    </div>

    <div style="padding:16px;">
      <button class="btn btn-primary" id="__p06-start" style="background:linear-gradient(135deg, #5B4FE9 0%, #7B68EE 100%);">
        🚀 开始模拟面试
      </button>
    </div>
  `;

  el.querySelectorAll('.cfg-company').forEach(c => c.onclick = () => {
    state.company = c.dataset.c;
    render(el);
  });
  el.querySelectorAll('.cfg-stage').forEach(c => c.onclick = () => {
    state.stage = c.dataset.s;
    render(el);
  });
  el.querySelectorAll('.cfg-pressure').forEach(c => c.onclick = () => {
    state.pressure = c.dataset.p;
    render(el);
  });
  el.querySelector('#__p06-position').onchange = (e) => {
    state.position = e.target.value;
    state.jobType = e.target.selectedOptions[0].dataset.jt;
  };
  el.querySelector('#__p06-start').onclick = () => {
    if (!state.company) { toast('请选择目标公司'); return; }
    if (!state.resumeSnip) { toast('请先上传简历'); return; }
    // 持久化 + 启动面试
    setProfile({ targetCompany: state.company, targetPosition: state.position, jobType: state.jobType, pressureLevel: state.pressure });
    const interview = {
      id: `iv-${Date.now()}`,
      startedAt: Date.now(),
      finishedAt: null,
      company: state.company,
      position: state.position,
      jobType: state.jobType,
      pressure: state.pressure,
      stage: state.stage,
      stages: [],
      scores: null
    };
    appendInterview(interview);
    sessionStorage.setItem('youmian:currentInterviewId', interview.id);
    goto('p07', { id: interview.id });
  };
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])).slice(0, 200);
}
