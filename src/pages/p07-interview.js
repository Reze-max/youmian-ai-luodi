// P07 · 模拟面试进行页（6 阶段状态机 · M3 流式）
import { goto, toast, confirmModal } from '../lib/router.js';
import { getInterview, updateInterview, getResume, getProfile } from '../lib/store.js';
import { callLLM } from '../lib/llm.js';
import { PERSONAS } from '../data/personas.js';
import { PRESSURE_LEVELS } from '../data/pressures.js';
import { COMPANIES } from '../lib/persona.js';

// ===== 状态 =====
let state = null; // 单例
let bankCache = null;

// ===== 入口 =====
export async function mount(el, params = {}) {
  const id = params.id || sessionStorage.getItem('youmian:currentInterviewId');
  const interview = getInterview(id);
  if (!interview) {
    el.innerHTML = `<div class="card">未找到面试 <button class="btn btn-primary" onclick="window.__goto('p03')">回首页</button></div>`;
    return;
  }

  // 初始化 state
  if (!state || state.id !== interview.id) {
    const resume = getResume();
    state = {
      id: interview.id,
      interview,
      resume: resume.rawText || '',
      resumeSnip: (resume.rawText || '').slice(0, 600),
      company: interview.company,
      position: interview.position,
      jobType: interview.jobType,
      pressure: interview.pressure,
      stageIdx: 0, // 当前阶段 0-5
      stageMap: ['opening', 'resume', 'professional', 'open', 'logistics', 'reverse'],
      current: null,  // 当前 Q&A: {q, a, feedback, score, followups: []}
      stages: interview.stages || [],
      followupCount: 0,
      maxFollowup: 1,  // 每题最多追问 1 次
      aiStreaming: false,
      abort: null,
      cardRef: null
    };
    // 加载题库
    if (!bankCache) {
      try {
        const r = await fetch('/data/p07-question-bank.json', { cache: 'no-store' });
        bankCache = await r.json();
      } catch (e) {
        console.warn('[p07] load bank fail', e);
        bankCache = { questions: [] };
      }
    }
  }

  renderShell(el);
  await askNextQuestion();
}

function destroy() {
  if (state?.abort) {
    try { state.abort(); } catch (e) {}
    state.abort = null;
  }
  state = null;
  bankCache = null;
}

// ===== Shell 渲染（顶栏 + 阶段指示 + 状态机切换）=====
function renderShell(el) {
  const meta = COMPANIES.find(c => c.id === state.company) || COMPANIES[0];
  const stageLabels = ['开场', '简历深挖', '专业问题', '开放问题', '实习/薪资', '反问'];

  el.innerHTML = `
    <div style="position:sticky; top:0; z-index:50; background:linear-gradient(135deg, #5B4FE9 0%, #7B68EE 100%); color:white; padding:14px 20px; display:flex; align-items:center; justify-content:space-between;">
      <span style="font-size:18px; cursor:pointer;" onclick="window.__p07Exit()">‹</span>
      <span style="font-size:14px; font-weight:600;">${meta.short} · ${state.interview.stage} · ${state.pressure === 'bytedance' ? '🔥字节式' : state.pressure === 'gentle' ? '🌱温和' : '⚖️标准'}</span>
      <span style="font-size:11px; background:rgba(255,255,255,0.2); padding:3px 8px; border-radius:8px;" id="__p07-progress">1/6</span>
    </div>

    <div style="display:flex; gap:6px; padding:12px 16px; align-items:center; background:white; border-bottom:1px solid var(--border);">
    <div style="display:flex; align-items:center; gap:12px; background:white; border-radius:12px; padding:12px 14px; margin:12px 16px 0; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <div style="width:48px; height:48px; background:linear-gradient(135deg, #5B4FE9, #7B68EE); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:22px;">🧑‍💼</div>
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-weight:600; font-size:14px;" id="__p07-interviewer-name">${meta.short}面试官·${state._interviewerName || "AI"}</span>
          <span class="tag tag-primary" style="font-size:9px; padding:2px 6px;" id="__p07-stage-badge">${stageLabels[state.stageIdx]}</span>
        </div>
        <div style="font-size:11px; color:#6B7280; margin-top:2px;" id="__p07-stage-hint">👋 面试官在等待你的自我介绍...</div>
      </div>
      <button id="__p07-voice-btn" style="width:36px; height:36px; background:#F0EEFF; border-radius:50%; font-size:16px; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="语音播报">🔊</button>
    </div>
      ${stageLabels.map((label, i) => `
        <div style="flex:1; text-align:center;">
          <div style="height:4px; background:${i <= state.stageIdx ? 'var(--primary)' : 'var(--border)'}; border-radius:2px; margin-bottom:4px;"></div>
          <div style="font-size:10px; color:${i === state.stageIdx ? 'var(--primary)' : 'var(--text-3)'}; font-weight:${i === state.stageIdx ? '600' : '400'};">${label}</div>
        </div>
      `).join('')}
    </div>

    <div id="__p07-conversation" style="padding:14px 16px; min-height:60vh; background:var(--bg);"></div>

    <div id="__p07-state-input" style="background:white; border-top:1px solid var(--border); padding:12px 0; margin:0;">
      <div id="__p07-hint-bar" style="display:none; margin:0 14px 8px; padding:8px 12px; background:linear-gradient(135deg, #FEF3E2, white); border-radius:10px; border:1px solid #F59E0B;">
        <div style="font-size:11px; color:#92400E; font-weight:600; margin-bottom:4px;">💡 思路提示（仅 1 次）</div>
        <div style="font-size:12px; color:#1A1A2E; line-height:1.5;" id="__p07-hint-text">卡壳超过 30 秒，点击下方按钮获取思考框架（不是答案）。</div>
        <button id="__p07-hint-btn" style="margin-top:6px; padding:6px 12px; background:#F59E0B; color:white; border-radius:8px; font-size:12px; font-weight:600;">💡 需要思路提示</button>
      </div>
      <div style="display:flex; align-items:flex-end; gap:8px; padding:0 14px;">
        <button id="__p07-voice-input-btn" style="width:36px; height:36px; background:#F3F4F6; border-radius:50%; font-size:18px; flex-shrink:0; cursor:pointer;" title="语音输入">🎤</button>
        <textarea id="__p07-input" rows="1" placeholder="输入你的回答..." style="flex:1; padding:10px 14px; border:1px solid var(--border); border-radius:18px; font-size:14px; background:#F8F9FB; resize:none; max-height:120px; outline:none; line-height:1.5;"></textarea>
        <button id="__p07-submit" style="width:40px; height:40px; background:var(--primary); color:white; border-radius:50%; font-size:18px; flex-shrink:0; cursor:pointer;">↑</button>
      </div>
      <div style="font-size:10px; color:var(--text-3); margin-top:6px; text-align:center;" id="__p07-input-hint">💡 卡壳 30 秒会自动出现思路提示（仅 1 次）</div>
    </div>
      <div style="font-size:10px; color:var(--text-3); margin-top:6px; text-align:center;">↵ 换行发送 · 按 ⌃+Enter 提交</div>
    </div>

    <div id="__p07-state-analyzing" style="display:none; background:white; border-top:1px solid var(--border); padding:18px 16px; text-align:center;">
      <div style="display:inline-flex; align-items:center; gap:10px;">
        <div class="p07-spinner"></div>
        <span style="font-size:13px; color:var(--primary); font-weight:500;" id="__p07-analyzing-text">🧠 AI 正在分析你的回答…</span>
      </div>
      <div style="font-size:11px; color:var(--text-3); margin-top:4px;">正在评估：信息密度 · 数据支撑 · 反思深度</div>
    </div>

    <div id="__p07-state-feedback" style="display:none; background:white; border-top:1px solid var(--border); padding:14px 16px;">
      <div style="display:flex; align-items:center; gap:10px; padding:12px 14px; background:var(--primary-bg); border-radius:12px; margin-bottom:10px;">
        <div style="font-size:24px;" id="__p07-feedback-icon">✓</div>
        <div style="flex:1;">
          <div style="font-weight:600; font-size:13px; color:var(--primary);" id="__p07-feedback-label">回答不错</div>
          <div style="font-size:12px; color:var(--text-2); margin-top:2px;" id="__p07-feedback-text">回答得不错，有数据有逻辑</div>
        </div>
      </div>
      <button id="__p07-next" style="width:100%; padding:12px; background:var(--primary); color:white; border-radius:10px; font-weight:600; font-size:14px;">→ 下一题</button>
    </div>
  `;

  // 顶栏进度
  el.querySelector('#__p07-progress').textContent = `${state.stageIdx + 1}/6`;

  // 提交事件
  const input = el.querySelector('#__p07-input');
  const submit = el.querySelector('#__p07-submit');
  submit.onclick = () => submitAnswer();
  input.onkeydown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitAnswer();
    }
  };
  // 自动撑高
  input.oninput = () => {
    input.style.height = 'auto';
    input.style.height = Math.min(120, input.scrollHeight) + 'px';
  };

  el.querySelector('#__p07-next').onclick = () => proceedNext();

  // 退出全局回调
  window.__p07Exit = () => handleExit();

  state.cardRef = el;

  // 语音按钮（演示版：仅切换图标）
  const voiceBtn = el.querySelector("#__p07-voice-btn");
  if (voiceBtn) {
    let on = true;
    voiceBtn.onclick = () => { on = !on; voiceBtn.textContent = on ? "🔊" : "🔇"; };
  }
  // 语音输入（Web Speech API）
  const voiceInputBtn = el.querySelector("#__p07-voice-input-btn");
  if (voiceInputBtn) {
    voiceInputBtn.onclick = () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { toast("当前浏览器不支持语音输入"); return; }
      try {
        const r = new SR();
        r.lang = "zh-CN";
        r.continuous = false;
        r.interimResults = false;
        r.onresult = (ev) => {
          const t = ev.results[0][0].transcript;
          const inp = el.querySelector("#__p07-input");
          inp.value = (inp.value + " " + t).trim();
        };
        r.onerror = () => toast("语音输入失败");
        r.start();
        toast("🎤 正在听…");
      } catch (e) { toast("语音启动失败"); }
    };
  }
  // 思路提示按钮
  const hintBtn = el.querySelector("#__p07-hint-btn");
  if (hintBtn) hintBtn.onclick = () => showHint();
  // 30 秒卡壳计时
  startStallTimer();
}

// ===== 提交流程 =====
async function submitAnswer() {
  const input = state.cardRef.querySelector('#__p07-input');
  const text = input.value.trim();
  if (!text || state.aiStreaming) return;
  if (!state.current) return;

  state.current.a = text;
  // 用户气泡
  appendUserBubble(text);
  input.value = '';
  input.style.height = 'auto';

  // 切换到 analyzing
  showState('analyzing');

  // 调 LLM 评估
  const sys = buildEvalSystem();
  try {
    const r = await callLLM({
      system: sys,
      messages: [
        { role: 'user', content: `【题目】${state.current.q}\n【候选人回答】${text}` },
        { role: 'user', content: '请输出严格 JSON：{"score": 0-100, "label": "偏短/尚可/不错/优秀", "feedback": "一句话评价"}' }
      ],
      jsonMode: true,
      maxTokens: 400,
      temperature: 0.3
    });
    const data = JSON.parse(extractJson(r.text));
    state.current.score = data.score ?? 70;
    state.current.feedback = data.feedback || '回答已记录';
    showFeedback(data);
  } catch (e) {
    console.error('[p07] eval fail', e);
    state.current.score = 70;
    state.current.feedback = '已完成记录';
    showFeedback({ score: 70, label: '尚可', feedback: '记录成功，继续下一题' });
  }

  // 评估后决定：追问 or 下一题
  const shouldFollowup = shouldFollowup(text, state.current.score);
  state.cardRef.querySelector('#__p07-next').textContent = shouldFollowup
    ? `🔄 继续追问（${state.followupCount + 1}/${state.maxFollowup}）`
    : '→ 下一题';
  state.cardRef.querySelector('#__p07-next').onclick = shouldFollowup ? () => askFollowup() : () => proceedNext();
}

function shouldFollowup(text, score) {
  if (state.followupCount >= state.maxFollowup) return false;
  if (text.length < 30) return true;
  if (score < 65) return true;
  return false;
}

async function askFollowup() {
  state.followupCount++;
  // 隐藏 feedback
  showState('input');
  // 构造追问 prompt
  const sys = `${buildPersonaSystem()}\n\n【追问】请基于候选人上一轮回答，问一个具体的追问。每题最多 1 次追问。`;
  showAnalyzing('追问生成中…');
  const aiText = await callAIStream(sys, [{ role: 'user', content: `【原题】${state.current.q}\n【候选人回答】${state.current.a}\n\n请输出追问（1-2 句话，直接犀利）：` }], 'followup');
  showState('input');
  state.current.lastFollowupQ = aiText;
  appendAiBubble(aiText);
  // 隐藏 feedback
  state.cardRef.querySelector('#__p07-state-feedback').style.display = 'none';
  state.cardRef.querySelector('#__p07-state-input').style.display = '';
  // 把追问作为新问题区域
  const followup = { q: aiText, a: null, feedback: null, score: null };
  state.current.followups = state.current.followups || [];
  state.current.followups.push(followup);
}

// ===== 推进下一题 =====
function proceedNext() {
  // 把当前 qa 推入 stages
  const stageKey = state.stageMap[state.stageIdx];
  const stageLabelMap = { opening: '开场', resume: '简历深挖', professional: '专业问题', open: '开放问题', logistics: '实习/薪资', reverse: '反问' };
  let stage = state.stages.find(s => s.key === stageKey);
  if (!stage) {
    stage = { key: stageKey, label: stageLabelMap[stageKey], qa: [] };
    state.stages.push(stage);
  }
  if (state.current) {
    stage.qa.push(state.current);
    updateInterview(state.id, { stages: state.stages });
  }
  state.current = null;
  state.followupCount = 0;
  state.stageIdx++;
  if (state.stageIdx >= 6) {
    // 全部完成 → P08
    updateInterview(state.id, { stages: state.stages, _resumeSnip: state.resumeSnip });
    goto('p08', { id: state.id });
    return;
  }
  // 阶段切换
  state.cardRef.querySelector('#__p07-progress').textContent = `${state.stageIdx + 1}/6`;
  state.cardRef.querySelector('#__p07-state-feedback').style.display = 'none';
  state.cardRef.querySelector('#__p07-state-input').style.display = '';
  // 阶段滑动动画
  const conv = state.cardRef.querySelector('#__p07-conversation');
  conv.innerHTML = '';
  askNextQuestion();
}

// ===== 出下一题 =====
async function askNextQuestion() {
  const stageKey = state.stageMap[state.stageIdx];
  let q = '';
  if (stageKey === 'opening') {
    q = `你好，欢迎参加 ${state.company} ${state.position} 的面试。请先用 2-3 分钟做一个自我介绍，包括你的学校、专业、和这个岗位相关的核心经历。`;
  } else if (stageKey === 'resume') {
    q = await generateResumeQuestion();
  } else if (stageKey === 'professional') {
    q = pickFromBank('业务考察', state.company);
  } else if (stageKey === 'open') {
    q = await generateOpenQuestion();
  } else if (stageKey === 'logistics') {
    q = state.jobType === 'intern'
      ? '你最快什么时候能开始实习？一周能到岗几天？预计能持续多长时间？'
      : '你对薪资有什么样的预期？期望工作地点是哪里？';
  } else if (stageKey === 'reverse') {
    q = '我们这场面试接近尾声，你有什么想问我的吗？';
  }

  state.current = { q, a: null, score: null, feedback: null, stage: stageKey };
  appendAiBubble(q);
  showState('input');
  state.cardRef.querySelector('#__p07-input').focus();
}

async function generateResumeQuestion() {
  const sys = `${buildPersonaSystem()}\n\n【任务】基于候选人简历，问一个"简历深挖"问题（200字内）。针对简历中的某段经历/项目，问具体方法、量化结果、反思。`;
  return await callAIStream(sys, [{ role: 'user', content: `【简历】\n${state.resumeSnip || '（未提供）'}\n\n请输出追问问题：` }], 'q');
}

async function generateOpenQuestion() {
  const sys = `${buildPersonaSystem()}\n\n【任务】基于 ${state.company} 风格，问一个行为面试题（200字内），如团队冲突、失败经历、抗压等。`;
  return await callAIStream(sys, [{ role: 'user', content: '请输出开放性问题：' }], 'q');
}

function pickFromBank(stageLabel, company) {
  const qs = (bankCache.questions || []).filter(q => q.stage === stageLabel);
  const pool = qs.length ? qs : (bankCache.questions || []);
  if (!pool.length) return `请分享一个你最有成就感的项目。`;
  // 优先匹配公司 tag
  const matched = pool.filter(q => (q.company_tags || []).includes(company));
  const finalPool = matched.length ? matched : pool;
  const q = finalPool[Math.floor(Math.random() * finalPool.length)];
  return (q.text || '').replace(/\$\{(\w+)\}/g, (_, k) => ({ company: state.company }[k] || state.company));
}

// ===== 通用：构造 system prompt =====
function buildPersonaSystem() {
  const persona = PERSONAS[state.company] || '';
  const pressure = PRESSURE_LEVELS[state.pressure] || '';
  return `${persona}\n\n${pressure}\n\n【当前阶段】${state.stageMap[state.stageIdx]}\n【题目】${state.current?.q || ''}`;
}
function buildEvalSystem() {
  return `${buildPersonaSystem()}\n\n【评估】请对候选人的回答做简洁评估。`;
}

// ===== 通用：流式调用 =====
async function callAIStream(system, messages, _tag) {
  showAnalyzing('AI 思考中…');
  let full = '';
  const bubble = appendAiBubble('');
  try {
    const r = await callLLM({ system, messages, stream: true, maxTokens: 600, temperature: 0.7 });
    state.aiStreaming = true;
    state.abort = r.abort;
    for await (const chunk of r.stream) {
      full += chunk;
      bubble.textContent = full;
      scrollConv();
    }
    if (r.mode === 'mock') toast('💡 Mock 模式（未配置 KEY）');
  } catch (e) {
    console.error('[p07] stream fail', e);
    full = full || '（AI 调用失败，请检查 /api/llm 配置）';
    bubble.textContent = full;
  } finally {
    state.aiStreaming = false;
    state.abort = null;
  }
  return full;
}

// ===== UI helpers =====
function appendAiBubble(text) {
  const conv = state.cardRef.querySelector('#__p07-conversation');
  const wrap = document.createElement('div');
  wrap.className = 'p07-slide-in';
  wrap.style.cssText = 'display:flex; gap:8px; margin-bottom:12px; align-items:flex-start;';
  wrap.innerHTML = `
    <div style="width:36px; height:36px; background:linear-gradient(135deg, #5B4FE9, #7B68EE); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">🤖</div>
    <div class="p07-ai-bubble" style="flex:1; background:white; padding:10px 14px; border-radius:14px 14px 14px 4px; font-size:14px; line-height:1.6; box-shadow:0 1px 4px rgba(0,0,0,0.04);"></div>
  `;
  const body = wrap.querySelector('.p07-ai-bubble');
  body.textContent = text;
  conv.appendChild(wrap);
  scrollConv();
  return body;
}

function appendUserBubble(text) {
  const conv = state.cardRef.querySelector('#__p07-conversation');
  const wrap = document.createElement('div');
  wrap.className = 'p07-slide-in';
  wrap.style.cssText = 'display:flex; gap:8px; margin-bottom:12px; align-items:flex-start; flex-direction:row-reverse;';
  wrap.innerHTML = `
    <div style="width:36px; height:36px; background:var(--text-3); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0;">我</div>
    <div class="p07-user-bubble" style="flex:1; background:var(--primary); color:white; padding:10px 14px; border-radius:14px 14px 4px 14px; font-size:14px; line-height:1.6;"></div>
  `;
  wrap.querySelector('.p07-user-bubble').textContent = text;
  conv.appendChild(wrap);
  scrollConv();
}

function scrollConv() {
  const conv = state.cardRef.querySelector('#__p07-conversation');
  setTimeout(() => { conv.scrollTop = conv.scrollHeight; }, 30);
}

function showState(which) {
  const root = state.cardRef;
  root.querySelector('#__p07-state-input').style.display = which === 'input' ? '' : 'none';
  root.querySelector('#__p07-state-analyzing').style.display = which === 'analyzing' ? '' : 'none';
  root.querySelector('#__p07-state-feedback').style.display = which === 'feedback' ? '' : 'none';
}

function showAnalyzing(text) {
  const root = state.cardRef;
  root.querySelector('#__p07-state-analyzing').style.display = '';
  root.querySelector('#__p07-state-input').style.display = 'none';
  root.querySelector('#__p07-state-feedback').style.display = 'none';
  const t = root.querySelector('#__p07-analyzing-text');
  if (t) t.textContent = text || '🧠 AI 思考中…';
}

function showFeedback(data) {
  const root = state.cardRef;
  const score = data.score ?? 70;
  let icon = '✓', label = '回答不错';
  if (score < 50) { icon = '⚠'; label = '回答偏短'; }
  else if (score < 70) { icon = '👍'; label = '尚可'; }
  else if (score < 85) { icon = '✓'; label = '不错'; }
  else { icon = '🌟'; label = '优秀'; }
  root.querySelector('#__p07-feedback-icon').textContent = icon;
  root.querySelector('#__p07-feedback-label').textContent = `${label} · ${score} 分`;
  root.querySelector('#__p07-feedback-text').textContent = data.feedback || '';
  root.querySelector('#__p07-state-feedback').style.display = '';
  root.querySelector('#__p07-state-analyzing').style.display = 'none';
  root.querySelector('#__p07-state-input').style.display = 'none';
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

// ===== 退出 =====
async function handleExit() {
  if (state.abort) {
    try { state.abort(); } catch (e) {}
    state.abort = null;
  }
  // 保存当前进度
  if (state.current?.a) {
    const stageKey = state.stageMap[state.stageIdx];
    let stage = state.stages.find(s => s.key === stageKey);
    if (!stage) {
      stage = { key: stageKey, label: stageKey, qa: [] };
      state.stages.push(stage);
    }
    stage.qa.push(state.current);
  }
  updateInterview(state.id, { stages: state.stages, _resumeSnip: state.resumeSnip });
  const ok = await confirmModal({
    title: '本次面试到此结束',
    desc: `已完成 ${state.stageIdx + 1}/6 阶段 · ${state.stages.reduce((s, st) => s + (st.qa?.length || 0), 0)} 轮对话。是否保存并查看反馈？`,
    primaryText: '查看反馈',
    cancelText: '继续面试'
  });
  if (ok) {
    goto('p08', { id: state.id });
  }
}

export { destroy };



// ===== 思路提示（PRD §4.3.3：卡壳 30 秒触发，整场最多 1 次）=====
function showHint() {
  if (state._hintUsed) return;
  state._hintUsed = true;
  const stageKey = state.stageMap[state.stageIdx];
  const opening = '自我介绍 = 教育背景（1 句）+ 核心经历（2 段，量化数据）+ 岗位匹配点（1 句）+ 收尾感谢。控制在 2 分钟内。';
  const resume = '用 STAR 框架（情境-任务-行动-结果）拆解简历中某段经历。数据基线（30%/2000+/8 万/月）+ 你的角色 + 最终量化结果。';
  const professional = '先说判断框架（如 AARRR / 4P / 用户分层），再具体到这道题的场景。结尾说反方观点展示思考深度。';
  const open = '行为面试题 = 真实案例 + 你的具体角色 + 你的思考 + 你的行动 + 反思改进。避免"我通常是"这类空话。';
  const logisticsIntern = '实习问题 = 最早到岗时间 + 每周可实习天数 + 可持续时长（建议 ≥ 3 个月）+ 实习目的。';
  const logisticsCampus = '薪资问题可参考行业区间（产品校招 25-35K/月 · 月薪结构）+ 反问培养体系 / 业务健康度。';
  const reverse = '反问要展示产品思考。推荐问：① 业务当前的核心挑战 ② 团队 PMF 健康度指标 ③ 这个岗位 3 个月最关键的产出。';
  const hints = { opening: opening, resume: resume, professional: professional, open: open, logistics: state.jobType === 'intern' ? logisticsIntern : logisticsCampus, reverse: reverse };
  const hintEl = state.cardRef.querySelector('#__p07-hint-bar');
  if (hintEl) {
    hintEl.style.display = '';
    hintEl.innerHTML = '<div style="font-size:11px; color:#92400E; font-weight:600; margin-bottom:4px;">💡 思路提示（已用完）</div><div style="font-size:12px; color:#1A1A2E; line-height:1.5;">' + (hints[stageKey] || '可以先列 3 个关键词，再展开。') + '</div>';
  }
}

let stallTimer = null;
function startStallTimer() {
  if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
  state._hintUsed = false;
  const hintEl = state.cardRef.querySelector('#__p07-hint-bar');
  if (hintEl) hintEl.style.display = 'none';
  stallTimer = setTimeout(() => {
    if (state._hintUsed) return;
    const h = state.cardRef.querySelector('#__p07-hint-bar');
    if (h) h.style.display = '';
  }, 30000);
}
