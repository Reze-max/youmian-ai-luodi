// ============================================================
// 优面AI · 本地数据存储（localStorage 统一封装）
// Schema:
//   profile: { name, targetCompany, targetPosition, jobType, pressureLevel }
//   resume: { rawText, fileName, updatedAt, packaged: [{original, suggested, status}] }
//   interviews: [{ id, startedAt, finishedAt, company, position, jobType, pressure,
//                  stages: [{stage, qa: [{q, a, feedback, score, followups:[]}]}],
//                  scores: { overall_score, 产品感, 逻辑, 表达, 案例, 反问, 抗压 } }]
//   subscription: { plan, expiresAt }
//   failureCases: [...] （内置）
// ============================================================

const NS = 'youmian:v1';
const MAX_INTERVIEWS = 50;

function k(name) { return `${NS}:${name}`; }

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(k(key));
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[store] read fail:', key, e);
    return fallback;
  }
}
function safeWrite(key, value) {
  try {
    localStorage.setItem(k(key), JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[store] write fail:', key, e);
    return false;
  }
}

// ===== Profile =====
export function getProfile() {
  return safeRead('profile', {
    name: '',
    targetCompany: '',
    targetPosition: '产品经理（校招）',
    jobType: 'campus',
    pressureLevel: 'standard',
    onboarded: false
  });
}
export function setProfile(patch) {
  const cur = getProfile();
  const next = { ...cur, ...patch };
  safeWrite('profile', next);
  return next;
}

// ===== Resume =====
export function getResume() {
  return safeRead('resume', { rawText: '', fileName: '', updatedAt: null, packaged: [] });
}
export function setResume(patch) {
  const cur = getResume();
  const next = { ...cur, ...patch, updatedAt: Date.now() };
  safeWrite('resume', next);
  return next;
}

// ===== Interviews =====
export function listInterviews() {
  return safeRead('interviews', []);
}
export function getInterview(id) {
  return listInterviews().find(x => x.id === id);
}
export function appendInterview(rec) {
  const list = listInterviews();
  list.unshift(rec);
  if (list.length > MAX_INTERVIEWS) {
    const archived = safeRead('interviews_archive', []);
    archived.unshift(...list.splice(MAX_INTERVIEWS));
    safeWrite('interviews_archive', archived.slice(0, MAX_INTERVIEWS));
  }
  safeWrite('interviews', list);
  return rec;
}
export function updateInterview(id, patch) {
  const list = listInterviews();
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch };
    safeWrite('interviews', list);
    return list[idx];
  }
  return null;
}

// ===== Subscription =====
export function getSubscription() {
  return safeRead('subscription', { plan: 'free', expiresAt: null });
}
export function setSubscription(patch) {
  const cur = getSubscription();
  const next = { ...cur, ...patch };
  safeWrite('subscription', next);
  return next;
}

// ===== 趋势数据（按维度返回时间序列） =====
export function getTrend(dim = 'overall_score') {
  const list = listInterviews().slice().reverse();
  return list.map(it => ({
    at: it.finishedAt || it.startedAt,
    label: it.company,
    value: (it.scores && (it.scores[dim] ?? it.scores.overall_score)) || 0
  })).filter(p => p.value > 0);
}

// ===== 调试 =====
export function _clearAll() {
  Object.keys(localStorage).filter(k => k.startsWith(NS)).forEach(k => localStorage.removeItem(k));
}
export function _seedMock() {
  // 用于演示：注入 6 条历史面试让 P09 曲线好看
  const now = Date.now();
  const seed = [];
  const samples = [
    { company: '字节跳动', position: '产品经理（校招）', jobType: 'campus', pressure: 'standard',
      scores: { overall_score: 62, 产品感: 65, 逻辑: 58, 表达: 60, 案例: 55, 反问: 60, 抗压: 68 }, label: '一面挂' },
    { company: '小红书', position: '产品经理（校招）', jobType: 'campus', pressure: 'gentle',
      scores: { overall_score: 70, 产品感: 70, 逻辑: 68, 表达: 72, 案例: 65, 反问: 70, 抗压: 72 }, label: '一面过' },
    { company: '腾讯', position: '产品经理（实习）', jobType: 'intern', pressure: 'standard',
      scores: { overall_score: 68, 产品感: 72, 逻辑: 65, 表达: 70, 案例: 60, 反问: 65, 抗压: 70 }, label: '二面过' },
    { company: '美团', position: '产品经理（校招）', jobType: 'campus', pressure: 'bytedance',
      scores: { overall_score: 58, 产品感: 62, 逻辑: 60, 表达: 55, 案例: 50, 反问: 55, 抗压: 60 }, label: '一面挂' },
    { company: '字节跳动', position: '产品经理（实习）', jobType: 'intern', pressure: 'standard',
      scores: { overall_score: 75, 产品感: 76, 逻辑: 72, 表达: 78, 案例: 70, 反问: 78, 抗压: 75 }, label: '一面过' },
    { company: '小红书', position: '产品经理（校招）', jobType: 'campus', pressure: 'standard',
      scores: { overall_score: 78, 产品感: 78, 逻辑: 75, 表达: 80, 案例: 72, 反问: 78, 抗压: 80 }, label: 'OC' }
  ];
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const t = now - (samples.length - i) * 7 * 86400000;
    seed.push({
      id: `mock-${t}`,
      startedAt: t,
      finishedAt: t + 1500000,
      company: s.company,
      position: s.position,
      jobType: s.jobType,
      pressure: s.pressure,
      label: s.label,
      stages: [],
      scores: s.scores
    });
  }
  safeWrite('interviews', seed);
  return seed;
}

export const __STORAGE_NS = NS;
