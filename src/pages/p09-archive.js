// P09 · 复盘档案首页
import { goto, toast } from '../lib/router.js';
import { listInterviews, getTrend } from '../lib/store.js';
import { renderRadar } from '../lib/radar.js';
import { renderTrend } from '../lib/trend.js';
import { FAILURE_CASES } from '../data/fallback-bank.js';
import { COMPANIES } from '../lib/persona.js';

export function mount(el) {
  const interviews = listInterviews();
  const overall = interviews.length
    ? Math.round(interviews.reduce((s, x) => s + (x.scores?.overall || 0), 0) / interviews.length)
    : 0;
  const trend = getTrend('overall');
  const latest = interviews[0];

  el.innerHTML = `
    <div style="background:linear-gradient(135deg, #5B4FE9 0%, #7B68EE 100%); color:white; padding:24px 20px 60px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:18px;">
        <div>
          <div style="font-size:12px; opacity:0.85;">能力档案</div>
          <div style="font-size:36px; font-weight:700; line-height:1.1;">${overall}<span style="font-size:16px; opacity:0.85;"> 分</span></div>
          <div style="font-size:11px; opacity:0.75; margin-top:2px;">${interviews.length ? `共 ${interviews.length} 场面试平均` : '完成一场面试自动生成'}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px; opacity:0.85;">排名</div>
          <div style="font-size:20px; font-weight:700;">${interviews.length ? computeRank(overall) : '-'}</div>
          <div style="font-size:10px; opacity:0.75;">同档位</div>
        </div>
      </div>
    </div>

    ${latest && latest.scores ? `
    <div class="card" style="margin-top:-36px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:600;">📈 能力进步曲线</span>
        <span style="font-size:11px; color:var(--text-3);">最近 ${trend.length} 场</span>
      </div>
      ${renderTrend({ points: trend, height: 200 })}
    </div>

    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:600;">🎯 最近 6 维</span>
        <span style="font-size:11px; color:var(--text-3);" onclick="window.__goto('p10',{id:'${latest.id}'})">查看详情 ›</span>
      </div>
      ${renderRadar({ scores: latest.scores, size: 240 })}
    </div>
    ` : `
    <div class="card" style="margin-top:-36px; text-align:center; padding:32px 16px;">
      <div style="font-size:36px; margin-bottom:8px; opacity:0.4;">📊</div>
      <div style="font-size:13px; color:var(--text-2); margin-bottom:16px;">还没有可分析的面试数据</div>
      <button class="btn btn-primary btn-sm" onclick="window.__goto('p06')" style="max-width:200px; margin:0 auto;">立即开始面试</button>
    </div>
    `}

    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-weight:600;">📋 历次面试</span>
        <span style="font-size:11px; color:var(--text-3);">${interviews.length} 场</span>
      </div>
      ${interviews.length ? interviews.map((it, i) => {
        const meta = COMPANIES.find(c => c.id === it.company) || COMPANIES[0];
        const isFirst = i === 0;
        return `
        <div style="display:flex; align-items:center; padding:12px 0; border-top:${i === 0 ? 'none' : '1px solid var(--border)'}; cursor:pointer; gap:10px;" onclick="window.__goto('p10',{id:'${it.id}'})">
          <div style="font-size:24px;">${meta.logo}</div>
          <div style="flex:1;">
            <div style="font-weight:600; font-size:13px;">${it.company} · ${it.position}</div>
            <div style="font-size:11px; color:var(--text-3);">${formatTime(it.finishedAt || it.startedAt)} · ${it.pressure === 'bytedance' ? '🔥字节式' : it.pressure === 'gentle' ? '🌱温和' : '⚖️标准'}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:18px; font-weight:700; color:var(--primary);">${it.scores?.overall || '-'}</div>
            <span class="tag ${it.label === 'OC' || it.label === '一面过' || it.label === '二面过' ? 'tag-success' : it.label === '一面挂' ? 'tag-error' : 'tag-gray'}" style="font-size:10px;">${it.label || '已完成'}</span>
          </div>
        </div>`;
      }).join('') : '<div style="text-align:center;color:var(--text-3);font-size:13px;padding:24px 0;">暂无面试</div>'}
    </div>

    <div class="card">
      <div style="font-weight:600; margin-bottom:12px;">⚠️ 失败案例参考</div>
      ${FAILURE_CASES.slice(0, 3).map(fc => `
        <div style="padding:10px 0; border-top:1px solid var(--border);">
          <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px;">
            <span class="tag tag-warning" style="font-size:10px;">${escapeHtml(fc.tag)}</span>
            <span style="font-size:13px; font-weight:600;">${escapeHtml(fc.title)}</span>
          </div>
          <div style="font-size:11px; color:var(--text-2); line-height:1.6;">${escapeHtml(fc.lesson)}</div>
        </div>
      `).join('')}
      <div style="text-align:center; margin-top:8px; font-size:12px; color:var(--primary); cursor:pointer;" id="__p09-more">查看更多 ›</div>
    </div>
    <div style="height:80px;"></div>
  `;
  el.querySelector('#__p09-more').onclick = () => {
    el.querySelector('#__p09-more').parentElement.innerHTML = `
      ${FAILURE_CASES.slice(3).map(fc => `
        <div style="padding:10px 0; border-top:1px solid var(--border);">
          <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px;">
            <span class="tag tag-warning" style="font-size:10px;">${escapeHtml(fc.tag)}</span>
            <span style="font-size:13px; font-weight:600;">${escapeHtml(fc.title)}</span>
          </div>
          <div style="font-size:11px; color:var(--text-2); line-height:1.6;">${escapeHtml(fc.lesson)}</div>
        </div>
      `).join('')}`;
  };
}

function formatTime(t) {
  if (!t) return '-';
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
function computeRank(score) {
  if (score >= 80) return 'Top 10%';
  if (score >= 70) return 'Top 30%';
  if (score >= 60) return 'Top 50%';
  return '待提升';
}
function escapeHtml(s) {
  return (s || '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
