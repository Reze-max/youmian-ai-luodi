// P11 · 人设库介绍（4 家公司画像）
import { COMPANIES, STAGES, PRESSURE_LEVELS } from '../lib/persona.js';
import { PERSONAS } from '../data/personas.js';

export function mount(el) {
  el.innerHTML = `
    <div class="topbar">
      <span class="back" onclick="window.__goto('p03')">‹</span>
      <span class="topbar-title">人设库</span>
      <span class="right" onclick="window.__goto('p14')">设置</span>
    </div>
    <div style="padding:8px 16px 0;">
      <p style="font-size:13px; color:var(--text-2); margin-bottom:16px; line-height:1.7;">
        优面AI 内置 4 家公司真实面试官人设，<b>开箱即用</b>，无需手动配置风格。选中公司后，AI 会按对应画像生成开场语、追问风格、关注点和红线词。
      </p>
    </div>

    ${COMPANIES.map(c => {
      const persona = PERSONAS[c.id] || '';
      const lines = persona.split('\n').map(l => l.trim()).filter(l => l.startsWith('- '));
      return `
        <div class="card" style="padding:18px;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
            <div style="font-size:36px;">${c.logo}</div>
            <div style="flex:1;">
              <div style="font-weight:700; font-size:16px;">${c.id}</div>
              <div style="font-size:12px; color:var(--text-2);">${c.tagline}</div>
            </div>
          </div>
          <div style="background:var(--bg); border-radius:10px; padding:12px; font-size:12px; line-height:1.8;">
            ${lines.slice(0, 5).map(l => `<div>${escapeHtml(l)}</div>`).join('')}
          </div>
        </div>
      `;
    }).join('')}

    <div style="padding:16px;">
      <div class="card">
        <div style="font-weight:600; margin-bottom:12px;">🎚️ 3 个压力级别</div>
        ${PRESSURE_LEVELS.map(p => `
          <div style="display:flex; align-items:flex-start; gap:10px; padding:8px 0; border-top:1px solid var(--border);">
            <div style="font-size:24px;">${p.emoji}</div>
            <div style="flex:1;">
              <div style="font-weight:600; font-size:13px;">${p.label}</div>
              <div style="font-size:11px; color:var(--text-2); margin-top:2px;">${p.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="card">
        <div style="font-weight:600; margin-bottom:12px;">📋 6 阶段面试流程</div>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          ${STAGES.map((s, i) => `<span class="tag tag-primary">${i + 1}. ${s.label}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
