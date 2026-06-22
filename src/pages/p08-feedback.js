// P08 · 面试结束反馈页
import { goto, toast } from '../lib/router.js';
import { getInterview, updateInterview, listInterviews } from '../lib/store.js';
import { callLLM } from '../lib/llm.js';
import { renderRadar, RADAR_DIMS } from '../lib/radar.js';
import { COMPANIES } from '../lib/persona.js';

export async function mount(el, params = {}) {
  // 【P08 修复】三级 fallback：params.id → sessionStorage → store 最新一条
  // 解决：P08 完成反馈后清空 sessionStorage，用户刷新后找不到面试的 bug
  let id = params.id || sessionStorage.getItem('youmian:currentInterviewId');
  if (!id) {
    const list = listInterviews();
    if (list.length) {
      list.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
      id = list[0].id;
    }
  }
  const interview = getInterview(id);
  if (!interview) {
    el.innerHTML = `<div class="card" style="text-align:center; padding:40px 20px;">
      <div style="font-size:48px; margin-bottom:12px;">📭</div>
      <div style="font-weight:600; margin-bottom:8px;">还没有面试记录</div>
      <div style="font-size:12px; color:var(--text-2); margin-bottom:20px;">请先开始一次模拟面试，完成后会在这里生成复盘报告</div>
      <button class="btn btn-primary" onclick="window.__goto('p06')">🚀 开始面试</button>
    </div>`;
    return;
  }

  // 临时显示加载态
  el.innerHTML = `
    <div style="min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 24px; text-align:center;">
      <div class="p07-spinner" style="width:48px; height:48px; border-width:5px;"></div>
      <h2 style="font-size:20px; font-weight:700; margin:24px 0 8px;">AI 正在生成复盘报告…</h2>
      <p style="font-size:13px; color:var(--text-2); max-width:280px; line-height:1.7;">
        综合分析你刚才 6 个阶段的回答<br/>基于 6 维评分 + 诚实反馈生成结构化报告
      </p>
    </div>
  `;

  // 提取 Q&A 摘要
  const qa = (interview.stages || []).flatMap(s => s.qa || []).slice(0, 12).map(q => ({
    stage: q.stage,
    q: q.q?.slice(0, 100),
    a: q.a?.slice(0, 200)
  }));

  if (!qa.length) {
    // 没有任何对话（用户直接退出）
    showFallback(el, interview);
    return;
  }

  // 调 LLM 生成反馈
  const company = interview.company;
  const companyMeta = COMPANIES.find(c => c.id === company) || COMPANIES[0];
  const { SCORING_SYSTEM, HONEST_FEEDBACK_PROMPT } = await import('../data/scoring.js');
  const system = `${SCORING_SYSTEM}\n\n${HONEST_FEEDBACK_PROMPT
    .replace('{company}', company)
    .replace('{resume}', interview._resumeSnip || '（未提供）')
    .replace('{qa}', JSON.stringify(qa, null, 2))}`;

  let result = null;
  try {
    const r = await callLLM({
      system,
      messages: [{ role: 'user', content: '请输出严格 JSON 反馈：' }],
      jsonMode: true,
      temperature: 0.4,
      maxTokens: 1500
    });
    result = JSON.parse(extractJson(r.text));
    if (r.mode === 'mock') {
      toast('💡 当前为 Mock 模式（未配置 LLM_API_KEY）');
    }
  } catch (e) {
    console.warn('[p08] LLM 失败，降级到本地默认反馈:', e?.message || e);
    toast('⚠️ AI 评分失败，已生成基础反馈');
    result = buildDefaultFeedback(qa, interview);
  }

  // 写入数据（中文 key，对齐 HONEST_FEEDBACK_PROMPT schema）
  const radar = result.radar || {};
  interview.scores = {
    overall_score: result.overall_score ?? 70,
    '产品感': radar['产品感'] ?? 70,
    '逻辑': radar['逻辑'] ?? 70,
    '表达': radar['表达'] ?? 70,
    '案例': radar['案例'] ?? 70,
    '反问': radar['反问'] ?? 70,
    '抗压': radar['抗压'] ?? 70
  };
  interview.feedback = result;
  interview.finishedAt = Date.now();
  interview.label = interview.scores.overall_score >= 75 ? '一面过' : interview.scores.overall_score >= 60 ? '需复盘' : '一面挂';
  updateInterview(interview.id, interview);
  // 【P08 修复】不再清空 sessionStorage，让用户从 P09/手动刷新都能重新进入当前面试
  // sessionStorage 会在 P06 创建新面试时被覆盖，无需在此清空

  render(el, interview, result, companyMeta);
}

function render(el, interview, result, companyMeta) {
  const scores = interview.scores;
  el.innerHTML = `
    <div style="background:linear-gradient(135deg, #5B4FE9 0%, #7B68EE 100%); color:white; padding:32px 20px 60px; text-align:center;">
      <div style="font-size:12px; opacity:0.85; margin-bottom:8px;">${companyMeta.logo} ${interview.company} · ${interview.position} · ${interview.pressure === 'bytedance' ? '🔥字节式' : interview.pressure === 'gentle' ? '🌱温和' : '⚖️标准'}</div>
      <div style="font-size:64px; font-weight:700; line-height:1; margin-bottom:4px;">${scores.overall_score}<span style="font-size:20px; opacity:0.8;">分</span></div>
      <div style="font-size:14px; opacity:0.9;">综合分</div>
      <div style="margin-top:14px; display:inline-block; background:rgba(255,255,255,0.2); padding:4px 12px; border-radius:20px; font-size:12px;">${interview.label}</div>
    </div>

    <div class="card" style="margin-top:-32px;">
      <div style="font-weight:600; margin-bottom:8px;">🎯 6 维能力雷达</div>
      ${renderRadar({ scores, size: 300 })}
    </div>

    <div class="card">
      <div style="font-weight:600; margin-bottom:12px;">💡 优缺点</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div>
          <div style="font-size:12px; color:var(--success); font-weight:600; margin-bottom:6px;">✓ 优点</div>
          ${(result["优势"] || result.strengths || []).map(s => `<div style="font-size:12px; padding:4px 0; color:var(--text-1);">• ${escapeHtml(s)}</div>`).join('') || '<div style="font-size:12px; color:var(--text-3);">（无）</div>'}
        </div>
        <div>
          <div style="font-size:12px; color:var(--error); font-weight:600; margin-bottom:6px;">✗ 不足</div>
          ${(result["不足"] || result.weaknesses || []).map(s => `<div style="font-size:12px; padding:4px 0; color:var(--text-1);">• ${escapeHtml(s)}</div>`).join('') || '<div style="font-size:12px; color:var(--text-3);">（无）</div>'}
        </div>
      </div>
    </div>

    ${result["考点分析"] || result.keypoints && result.keypoints.length ? `
    <div class="card">
      <div style="font-weight:600; margin-bottom:12px;">📚 考点分析</div>
      ${result.keypoints.map(kp => `
        <div style="display:flex; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
          <div style="flex:1; font-size:13px;">${escapeHtml(kp["考点"] || kp.name)}</div>
          <div style="width:80px; height:6px; background:var(--border); border-radius:3px; overflow:hidden; margin:0 10px;">
            <div style="width:${Math.min(100, kp.score || 0)}%; height:100%; background:${(kp.score || 0) >= 80 ? 'var(--success)' : (kp.score || 0) >= 60 ? 'var(--warning)' : 'var(--error)'};"></div>
          </div>
          <div style="font-weight:700; color:var(--primary); min-width:30px; text-align:right;">${kp.score || 0}</div>
        </div>
        ${kp.comment ? `<div style="font-size:11px; color:var(--text-2); padding-bottom:6px;">${escapeHtml(kp.comment)}</div>` : ''}
      `).join('')}
    </div>
    ` : ''}

    <div class="card" style="background:linear-gradient(135deg, var(--primary-bg) 0%, white 100%);">
      <div style="font-weight:600; margin-bottom:8px;">🔥 3 条关键建议</div>
      <ol style="padding-left:20px; font-size:13px; line-height:1.9;">
        ${(result["改进建议"] || result.suggestions || []).map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li style="list-style:none;">（暂无）</li>'}
      </ol>
    </div>

    ${result.honest_take ? `
    <div class="card" style="border-left:4px solid var(--primary);">
      <div style="font-weight:600; margin-bottom:6px;">🗣️ 诚实评价</div>
      <div style="font-size:13px; line-height:1.7; color:var(--text-1);">${escapeHtml(result.honest_take)}</div>
    </div>
    ` : ''}

    <div style="padding:16px 16px 80px;">
      <button class="btn btn-primary" onclick="window.__goto('p09')" style="background:linear-gradient(135deg, #5B4FE9 0%, #7B68EE 100%);">📊 查看完整复盘</button>
      <button class="btn btn-outline" style="margin-top:8px;" onclick="window.__goto('p06')">🔄 再来一次</button>
      <button class="btn btn-ghost" style="margin-top:8px;" onclick="window.__goto('p03')">🏠 回首页</button>
    </div>
  `;
}

function showFallback(el, interview) {
  el.innerHTML = `
    <div class="card" style="text-align:center; padding:40px 20px;">
      <div style="font-size:48px; margin-bottom:12px;">🤔</div>
      <div style="font-weight:600; margin-bottom:8px;">没有可分析的内容</div>
      <div style="font-size:12px; color:var(--text-2); margin-bottom:20px;">你没有完成任何对话，无法生成反馈报告。请重新开始面试并完成所有问题。</div>
      <button class="btn btn-primary" onclick="window.__goto('p06')">重新开始面试</button>
    </div>
  `;
  updateInterview(interview.id, { finishedAt: Date.now() });
}

// 【P08 修复】当 LLM 失败时，用 qa 内容生成基础反馈（不显示 fallback）
function buildDefaultFeedback(qa, interview) {
  const totalLen = qa.reduce((s, q) => s + (q.a?.length || 0), 0);
  const avgLen = qa.length ? Math.round(totalLen / qa.length) : 0;
  const base = Math.min(85, Math.max(45, Math.round(avgLen * 0.8 + 30)));
  const radar = {
    '产品感': base,
    '逻辑': base + (Math.random() > 0.5 ? 3 : -5),
    '表达': base + (avgLen > 100 ? 5 : -3),
    '案例': base + (avgLen > 80 ? 4 : -8),
    '反问': 60,
    '抗压': base - 2
  };
  return {
    overall_score: base,
    radar,
    '优势': avgLen > 80
      ? ['回答有具体内容，表达了核心想法', '完成了全部 6 个阶段问题']
      : ['完成了部分阶段问题'],
    '不足': avgLen < 60
      ? ['回答偏短，缺少具体数据和案例支撑', '可以多用 STAR 框架展开']
      : ['可以补充更多量化数据', '结尾可以加入反思改进'],
    '考点分析': qa.slice(0, 5).map((q, i) => ({
      '考点': '第 ' + (i + 1) + ' 阶段',
      '得分': Math.max(50, base - 5 + i * 2),
      '要点': q.a ? ('回答长度 ' + q.a.length + ' 字') : '未回答'
    })),
    '改进建议': [
      { '优先级': 'P0', '类别': '回答深度', '建议': '每个回答至少 100 字，包含背景-行动-结果' },
      { '优先级': 'P1', '类别': '数据量化', '建议': '补充 1-2 个具体数字（用户数/留存率/转化率）' },
      { '优先级': 'P2', '类别': '反思', '建议': '结尾加上"如果重来我会..."的反思' }
    ],
    honest_take: '本次面试基于本地规则生成基础反馈（LLM 调用失败）。' + (avgLen < 60 ? '回答偏短，建议多用具体案例和量化数据。' : '回答有内容，建议补充更多细节和反思。') + ' 建议重新面试以获得 AI 深度反馈。'
  };
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
