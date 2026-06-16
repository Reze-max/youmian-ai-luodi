// P03 · 首页 / 工作台
import { goto, toast } from '../lib/router.js';
import { getProfile, getResume, listInterviews, _seedMock } from '../lib/store.js';
import { renderTrend } from '../lib/trend.js';
import { RADAR_DIMS_META } from '../lib/persona.js';

export function mount(el) {
  const profile = getProfile();
  const resume = getResume();
  const interviews = listInterviews();
  const lastInterviews = interviews.slice(0, 3);
  const avg = interviews.length
    ? Math.round(interviews.reduce((s, x) => s + (x.scores?.overall_score || 0), 0) / interviews.length)
    : 0;

  el.innerHTML = `
    <div style="background:linear-gradient(135deg, #5B4FE9 0%, #7B68EE 100%); color:white; padding:24px 20px 32px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
        <div>
          <div style="font-size:13px; opacity:0.85;">${profile.targetCompany ? `目标：${profile.targetCompany}` : '欢迎使用优面AI'}</div>
          <div style="font-size:22px; font-weight:700; margin-top:2px;">${profile.name || '你好'} 👋</div>
        </div>
        <button onclick="window.__goto('p14')" style="width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.2); color:white; font-size:18px;">⚙</button>
      </div>
      <div style="background:rgba(255,255,255,0.15); border-radius:14px; padding:14px 16px; display:flex; align-items:center; gap:12px;">
        <div style="font-size:24px;">📊</div>
        <div style="flex:1;">
          <div style="font-size:11px; opacity:0.85; margin-bottom:2px;">${interviews.length ? '最近平均分' : '开始第一场面试'}</div>
          <div style="font-size:20px; font-weight:700;">${interviews.length ? avg + ' 分' : '准备好'}</div>
        </div>
        <button onclick="window.__goto('p09')" style="padding:6px 12px; background:white; color:#5B4FE9; border-radius:8px; font-size:12px; font-weight:600;">查看复盘</button>
      </div>
    </div>

    <div class="card" style="display:flex; align-items:center; gap:14px;">
      <div style="font-size:32px;">📄</div>
      <div style="flex:1;">
        <div style="font-size:13px; color:var(--text-2); margin-bottom:2px;">${resume.fileName || '未上传简历'}</div>
        <div style="font-weight:600;">${resume.rawText ? '已上传' : '请先上传简历'}</div>
      </div>
      <button class="btn btn-sm" onclick="window.__goto('p05')" style="background:var(--primary-bg); color:var(--primary);">
        ${resume.rawText ? '查看' : '去上传'}
      </button>
    </div>

    <div style="padding:0 16px; margin-top:8px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin:12px 4px;">
        <span style="font-weight:600;">最近面试</span>
        <span style="font-size:12px; color:var(--primary);" onclick="window.__goto('p09')">全部 ›</span>
      </div>
      ${lastInterviews.length ? lastInterviews.map(it => `
        <div class="card" style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="window.__goto('p10',{id:'${it.id}'})">
          <div style="width:40px; height:40px; background:var(--primary-bg); color:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700;">${it.scores?.overall || '-'}</div>
          <div style="flex:1;">
            <div style="font-weight:600; font-size:13px;">${it.company} · ${it.position}</div>
            <div style="font-size:11px; color:var(--text-3);">${new Date(it.finishedAt || it.startedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}</div>
          </div>
          <span class="tag ${it.label === 'OC' || it.label === '一面过' || it.label === '二面过' ? 'tag-success' : it.label === '一面挂' ? 'tag-error' : 'tag-gray'}">${it.label || '已完成'}</span>
        </div>
      `).join('') : `
        <div class="card" style="text-align:center; color:var(--text-3); padding:32px 16px;">
          <div style="font-size:32px; margin-bottom:8px; opacity:0.4;">📋</div>
          <div style="font-size:13px;">还没有面试记录</div>
        </div>
      `}
    </div>

    <div style="padding:24px 16px 80px;">
      <button class="btn btn-primary" id="__p03-fab" style="background:linear-gradient(135deg, #5B4FE9 0%, #7B68EE 100%); box-shadow: 0 4px 20px rgba(91,79,233,0.4);">
        🚀 立即开始面试
      </button>
      ${interviews.length === 0 ? `
        <button class="btn btn-outline" id="__p03-seed" style="margin-top:8px; background:white;">
          🧪 注入演示数据（P09 曲线用）
        </button>
      ` : ''}
    </div>
  `;
  el.querySelector('#__p03-fab').onclick = () => goto('p06');
  const seedBtn = el.querySelector('#__p03-seed');
  if (seedBtn) {
    seedBtn.onclick = () => {
      _seedMock();
      toast('已注入 6 条演示面试');
      mount(el);
    };
  }
}


function computeWeakness(interviews) {
  if (interviews.length < 1) return null;
  const sums = {};
  const counts = {};
  RADAR_DIMS_META.forEach(d => { sums[d.key] = 0; counts[d.key] = 0; });
  interviews.slice(0, 5).forEach(it => {
    if (!it.scores) return;
    RADAR_DIMS_META.forEach(d => {
      if (typeof it.scores[d.key] === 'number') {
        sums[d.key] += it.scores[d.key];
        counts[d.key]++;
      }
    });
  });
  const avgs = RADAR_DIMS_META.map(d => ({ key: d.key, label: d.label, avg: counts[d.key] ? sums[d.key] / counts[d.key] : 100 })).sort((a, b) => a.avg - b.avg);
  const w = avgs[0];
  if (w.avg >= 75) return null;
  return { label: w.label, hint: '近 ' + Math.min(interviews.length, 5) + ' 次面试平均 ' + Math.round(w.avg) + ' 分' };
}

function computeMiniTrend(interviews) {
  return interviews.slice(0, 10).reverse().map(it => ({
    at: it.finishedAt || it.startedAt,
    label: it.company,
    value: it.scores && it.scores.overall_score || 0
  })).filter(p => p.value > 0);
}
