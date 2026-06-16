// ============================================================
// 优面AI · 4 家公司人设 + 3 压力级别常量
// 来源：work/index.html 原型 PERSONAS / PRESSURE_LEVELS
// ============================================================

export const COMPANIES = [
  { id: '字节跳动', short: '字节', logo: '🔥', tagline: '数据驱动 · 增长黑客' },
  { id: '腾讯', short: '腾讯', logo: '🐧', tagline: '系统思考 · 用户为本' },
  { id: '美团', short: '美团', logo: '🟡', tagline: '业务落地 · 商业化' },
  { id: '小红书', short: '小红书', logo: '📕', tagline: '内容生态 · 用户洞察' }
];

export const PRESSURE_LEVELS = [
  { id: 'gentle', label: '温和', emoji: '🌱', desc: '节奏慢 · 少追问 · 适合焦虑用户' },
  { id: 'standard', label: '标准', emoji: '⚖️', desc: '常规面试节奏 · 默认推荐' },
  { id: 'bytedance', label: '字节式', emoji: '🔥', desc: '节奏快 · 连环追问 · 高强度' }
];

export const POSITIONS = [
  { id: '产品经理（校招）', jobType: 'campus', label: '产品经理（校招）' },
  { id: '产品经理（实习）', jobType: 'intern', label: '产品经理（实习）' }
];

export const STAGES = [
  { key: 'opening', label: '开场' },
  { key: 'resume', label: '简历深挖' },
  { key: 'professional', label: '专业问题' },
  { key: 'open', label: '开放问题' },
  { key: 'logistics', label: '实习/薪资' },
  { key: 'reverse', label: '反问' }
];

export const RADAR_DIMS_META = [
  { key: '产品感', label: '产品感', short: '产品' },
  { key: '逻辑', label: '逻辑', short: '逻辑' },
  { key: '表达', label: '表达', short: '表达' },
  { key: '案例', label: '案例', short: '案例' },
  { key: '反问', label: '反问', short: '反问' },
  { key: '抗压', label: '抗压', short: '抗压' }
];
