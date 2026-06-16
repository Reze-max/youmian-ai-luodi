// ============================================================
// 优面AI · LLM 客户端（M3/Qwen/Mock 三级降级）
// 用法：await window.YOUMIAN_LLM.callLLM({ system, messages, stream, jsonMode, maxTokens })
//   - stream: false 时返回 { text, usage, mode }
//   - stream: true 时返回 { stream: AsyncIterable, mode, abort() }
// ============================================================

const DEFAULT_TIMEOUT = 30000;
const DEBUG = (import.meta?.env?.VITE_DEBUG ?? 'true') === 'true';
const MODE_HINT = (import.meta?.env?.VITE_LLM_MODE ?? 'auto'); // auto | real | mock

async function detectMode() {
  if (MODE_HINT === 'mock') return 'mock';
  if (MODE_HINT === 'real') return 'real';
  // auto: 试 ping 一次 /api/llm 看后端是否就绪
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const r = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '__ping__' }] }),
      signal: ctrl.signal
    });
    clearTimeout(t);
    if (r.status === 400 || r.status === 200 || r.status === 500) return 'real';
    return 'mock';
  } catch (e) {
    return 'mock';
  }
}

let _mode = null;
export async function getMode() {
  if (_mode) return _mode;
  _mode = await detectMode();
  if (DEBUG) console.log('[llm] mode =', _mode);
  return _mode;
}
export function _setMode(m) { _mode = m; }

// ===== 主入口 =====
export async function callLLM({ system, messages, stream = false, jsonMode = false, maxTokens = 1000, temperature = 0.7, timeoutMs = DEFAULT_TIMEOUT, signal }) {
  const mode = await getMode();
  if (mode === 'mock') {
    return mockResponse({ system, messages, stream, jsonMode });
  }
  if (stream) {
    return streamReal({ system, messages, jsonMode, maxTokens, temperature, timeoutMs, signal });
  }
  return await jsonReal({ system, messages, jsonMode, maxTokens, temperature, timeoutMs, signal });
}

async function jsonReal(opts) {
  const { system, messages, jsonMode, maxTokens, temperature, timeoutMs, signal } = opts;
  const ctrl = signal ? null : new AbortController();
  const timer = signal ? null : setTimeout(() => ctrl.abort(), timeoutMs);
  const start = Date.now();
  try {
    const r = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system, messages,
        stream: false,
        jsonMode,
        maxTokens,
        temperature
      }),
      signal: signal || ctrl.signal
    });
    if (!r.ok) {
      const err = await r.text().catch(() => '');
      throw new Error(`LLM ${r.status}: ${err.slice(0, 200)}`);
    }
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const usage = data?.usage || {};
    if (DEBUG) console.log(`[llm] real ${Date.now() - start}ms · tokens=${usage.total_tokens ?? '-'}`);
    return { text, usage, mode: 'real' };
  } catch (e) {
    console.warn('[llm] real fail → fallback to mock:', e.message);
    return mockResponse({ system, messages, stream: false, jsonMode });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function streamReal(opts) {
  const { system, messages, jsonMode, maxTokens, temperature, timeoutMs, signal } = opts;
  const ctrl = signal ? null : new AbortController();
  const timer = signal ? null : setTimeout(() => ctrl.abort(), timeoutMs);
  const start = Date.now();
  const r = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, stream: true, jsonMode, maxTokens, temperature }),
    signal: signal || ctrl.signal
  });
  if (!r.ok || !r.body) {
    if (timer) clearTimeout(timer);
    console.warn('[llm] stream fail → fallback mock');
    return mockResponse({ stream: true });
  }
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  const queue = [];
  let closed = false;
  let resolveNext = null;
  const pump = (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { closed = true; if (resolveNext) resolveNext({ done: true }); break; }
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          const t = line.trim();
          if (!t || !t.startsWith('data:')) continue;
          const data = t.slice(5).trim();
          if (data === '[DONE]') { closed = true; if (resolveNext) resolveNext({ done: true }); return; }
          try {
            const obj = JSON.parse(data);
            const delta = obj?.choices?.[0]?.delta?.content || '';
            if (delta) {
              queue.push(delta);
              if (resolveNext) { resolveNext({ value: delta, done: false }); resolveNext = null; }
            }
          } catch (e) { /* skip */ }
        }
      }
    } catch (e) {
      closed = true;
      if (resolveNext) resolveNext({ done: true });
    }
  })();
  const iter = {
    [Symbol.asyncIterator]() { return this; },
    next() {
      if (queue.length) return Promise.resolve({ value: queue.shift(), done: false });
      if (closed) return Promise.resolve({ done: true });
      return new Promise(res => { resolveNext = res; });
    },
    return() { closed = true; try { reader.cancel(); } catch (e) {} return Promise.resolve({ done: true }); }
  };
  if (DEBUG) console.log('[llm] stream opened');
  return {
    stream: iter,
    mode: 'real',
    pump,
    async text() {
      let buf = '';
      for await (const t of iter) buf += t;
      return buf;
    },
    abort() { closed = true; try { reader.cancel(); } catch (e) {} if (timer) clearTimeout(timer); }
  };
}

// ===== Mock 兜底 =====
function mockResponse({ system, messages, stream, jsonMode }) {
  const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const isJson = !!jsonMode;
  if (stream) {
    // 返回 mock 流式
    const full = mockText(system, lastUser, isJson);
    const iter = (async function* () {
      for (const ch of full) {
        await new Promise(r => setTimeout(r, 18));
        yield ch;
      }
    })();
    return {
      stream: iter,
      mode: 'mock',
      async text() { return full; },
      abort() {}
    };
  }
  const text = mockText(system, lastUser, isJson);
  return Promise.resolve({ text, usage: { total_tokens: text.length }, mode: 'mock' });
}

function mockText(system, user, isJson) {
  // 简易意图识别，返回合理 mock
  const s = (system || '').slice(0, 200);
  if (/面试官|interviewer/i.test(s)) {
    return mockInterviewer(user);
  }
  if (/评分|scoring/i.test(s) || /6 维|六维/i.test(s)) {
    return JSON.stringify({
      overall_score: 72,
      radar: {
        '产品感': 75, '逻辑': 70, '表达': 80, '案例': 65, '反问': 60, '抗压': 70
      },
      优势: ['回答有具体案例支撑', '反思深度不错'],
      不足: ['缺少量化数据', '结构可以更清晰'],
      考点分析: [
        { 考点: '数据基线', 得分: 60, 要点: '案例中缺少对比对象' },
        { 考点: '增长逻辑', 得分: 70, 要点: '有 AARRR 框架但未分流量来源' },
        { 考点: '反思深度', 得分: 78, 要点: '提到了改进方向' }
      ],
      改进建议: [
        { 优先级: 'P0', 类别: '题目类型', 建议: '做 5 道陌生人场景的"如何验证需求"题' },
        { 优先级: 'P1', 类别: '思维框架', 建议: '用 STAR 框架结构化拆解案例' },
        { 优先级: 'P2', 类别: '反思', 建议: '结尾补充"下次我会做 X"的具体动作' }
      ],
      honest_take: '整体表现中上，能讲清楚自己在做什么，但缺数据、缺对比。建议下次刻意练习"先报数再讲故事"。'
    });
  }
  if (/包装|经历|productize|包装建议/i.test(s)) {
    return JSON.stringify({
      cards: [
        { original: '参与企业流程建模研究', suggested: '用户需求分析 · 业务流程优化 · 跨部门协作' },
        { original: '校园产品调研比赛', suggested: '用户调研 · 需求洞察 · 竞品分析' },
        { original: '数据分析课程项目', suggested: '数据驱动决策 · SQL · AB 实验设计' }
      ]
    });
  }
  if (/JD|岗位描述|job description|考点/i.test(s)) {
    return JSON.stringify({
      company_profile: {
        company: '字节跳动',
        focus: '数据驱动 · 增长 · ROI',
        rhythm: '快',
        tone: '直接 · 犀利 · 连环追问'
      },
      keywords: ['用户增长', '数据驱动', 'AB 实验', 'ROI', '产品策略', '用户洞察', '商业化'],
      competency: ['增长黑客思维', '结构化思考', '数据敏感', '抗压能力'],
      questions: ['讲一个你做的最有数据感的项目', '如何衡量一个功能上线后的效果？', '如果次日留存下降 5% 你怎么排查？']
    });
  }
  if (isJson) {
    return JSON.stringify({ status: 'mock', note: 'no api key configured', received: user.slice(0, 100) });
  }
  return mockInterviewer(user);
}

function mockInterviewer(user) {
  // 根据用户回答长度给不同反馈
  const len = (user || '').length;
  if (len < 20) return '你这个回答有点短，能展开讲讲具体的背景、你的角色、你做了什么、结果是什么吗？';
  if (len < 80) return '不错，你提到了核心经历。能不能再具体量化一下，比如数据基线是多少？你最终带来了什么结果？';
  return '挺好，你讲得比较具体。我追问一下：你刚才提到的那个数字，分母是什么？对比对象是谁？如果换个场景，你会怎么做？';
}

export const YOUMIAN_LLM = { callLLM, getMode, _setMode };
if (typeof window !== 'undefined') window.YOUMIAN_LLM = YOUMIAN_LLM;
