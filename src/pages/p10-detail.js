// P10 · 单次复盘详情
import { goto } from '../lib/router.js';
import { getInterview } from '../lib/store.js';
import { renderRadar } from '../lib/radar.js';
import { COMPANIES } from '../lib/persona.js';

export function mount(el, params = {}) {
  const id = params.id;
  const interview = getInterview(id);
  if (!interview) {
    el.innerHTML = `<div class="card">未找到面试记录 <button class="btn btn-primary" onclick="window.__goto('p09')">回复盘</button></div>`;
    return;
  }
  const meta = COMPANIES.find(c => c.id === interview.company) || COMPANIES[0];
  const scores = interview.scores || { overall: 0 };
  const stages = interview.stages || [];
  const feedback = interview.feedback || {};

  el.innerHTML = `
    <div class="topbar">
      <span class="back" onclick="window.__goto('p09')">‹</span>
      <span class="topbar-title">复盘详情</span>
      <span class="right" onclick="window.__goto('p06')">再来一次</span>
    </div>

    <div class="card" style="background:linear-gradient(135deg, var(--primary-bg) 0%, white 100%);">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
        <div style="font-size:36px;">${meta.logo}</div>
        <div style="flex:1;">
          <div style="font-weight:700; font-size:15px;">${interview.company} · ${interview.position}</div>
          <div style="font-size:12px; color:var(--text-2);">${new Date(interview.finishedAt || interview.startedAt).toLocaleString('zh-CN')}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:28px; font-weight:700; color:var(--primary); line-height:1;">${scores.overall}</div>
          <div style="font-size:11px; color:var(--text-3);">综合分</div>
        </div>
      </div>
      <div style="display:flex; gap:6px;">
        <span class="tag ${interview.label === 'OC' || interview.label === '一面过' || interview.label === '二面过' ? 'tag-success' : interview.label === '一面挂' ? 'tag-error' : 'tag-gray'}">${interview.label || '已完成'}</span>
        <span class="tag tag-gray">${interview.pressure === 'bytedance' ? '🔥字节式' : interview.pressure === 'gentle' ? '🌱温和' : '⚖️标准'}</span>
        <span class="tag tag-gray">${stages.reduce((s, st) => s + (st.qa?.length || 0), 0)} 轮对话</span>
      </div>
    </div>

    ${scores.overall ? `
    <div class="card">
      <div style="font-weight:600; margin-bottom:8px;">🎯 6 维雷达</div>
      ${renderRadar({ scores, size: 260 })}
    </div>
    ` : ''}

    ${stages.length ? `
    <div class="card">
      <div style="font-weight:600; margin-bottom:12px;">💬 完整对话回放</div>
      ${stages.map((stage, si) => `
        <div style="margin-bottom:${si < stages.length - 1 ? '20px' : '0'};">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:10px;">
            <span class="tag tag-primary" style="font-size:10px;">阶段 ${si + 1}</span>
            <span style="font-weight:600; font-size:13px;">${stage.label || stage.stage}</span>
          </div>
          ${(stage.qa || []).map((qa, qi) => `
            <div style="margin-bottom:12px;">
              <div style="display:flex; gap:8px; margin-bottom:6px;">
                <div style="width:28px; height:28px; background:var(--primary); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0;">AI</div>
                <div style="flex:1; background:var(--primary-bg); padding:8px 12px; border-radius:10px; font-size:12px; line-height:1.6;">${escapeHtml(qa.q || '')}</div>
              </div>
              <div style="display:flex; gap:8px; margin-bottom:6px; flex-direction:row-reverse;">
                <div style="width:28px; height:28px; background:var(--text-3); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0;">我</div>
                <div style="flex:1; background:white; border:1px solid var(--border); padding:8px 12px; border-radius:10px; font-size:12px; line-height:1.6;">${escapeHtml(qa.a || '')}</div>
              </div>
              ${qa.feedback ? `
              <div style="margin-left:36px; padding:6px 10px; background:${qa.score >= 75 ? '#E6FAF1' : qa.score >= 60 ? '#FEF3E2' : '#FEE2E2'}; border-radius:6px; font-size:11px; color:${qa.score >= 75 ? 'var(--success)' : qa.score >= 60 ? 'var(--warning)' : 'var(--error)'};">
                <b>${qa.score || 0}分</b> · ${escapeHtml(qa.feedback)}
              </div>
              ` : ''}
              ${qa.followups && qa.followups.length ? `
              <div style="margin-left:36px; margin-top:6px;">
                ${qa.followups.map(f => `
                  <div style="display:flex; gap:6px; margin-bottom:4px;">
                    <div style="width:20px; height:20px; background:var(--primary-bg); color:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; flex-shrink:0;">?</div>
                    <div style="flex:1; font-size:11px; color:var(--text-2);">${escapeHtml(f.q)}</div>
                  </div>
                  ${f.a ? `
                  <div style="display:flex; gap:6px; margin-bottom:4px; flex-direction:row-reverse;">
                    <div style="width:20px; height:20px; background:var(--text-3); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; flex-shrink:0;">我</div>
                    <div style="flex:1; font-size:11px; color:var(--text-2);">${escapeHtml(f.a)}</div>
                  </div>
                  ` : ''}
                `).join('')}
              </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
    ` : '<div class="card" style="text-align:center;color:var(--text-3);font-size:13px;">没有对话记录</div>'}

    ${feedback.suggestions ? `
    <div class="card">
      <div style="font-weight:600; margin-bottom:8px;">🔥 关键改进建议</div>
      <ol style="padding-left:20px; font-size:12px; line-height:1.9;">
        ${(feedback.suggestions || []).map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li style="list-style:none;">（无）</li>'}
      </ol>
    </div>
    ` : ''}

    <div style="padding:8px 16px 80px;">
      <button class="btn btn-outline" onclick="window.__goto('p09')">← 返回复盘档案</button>
    </div>
  `;
}

function escapeHtml(s) {
  return (s || '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
