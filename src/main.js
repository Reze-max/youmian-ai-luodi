// ============================================================
// 优面AI · 应用启动 + 路由注册
// ============================================================

import { register, goto, renderTabbar } from './lib/router.js';
import * as p01 from './pages/p01-splash.js';
import * as p02 from './pages/p02-onboarding.js';
import * as p03 from './pages/p03-home.js';
import * as p04 from './pages/p04-jd.js';
import * as p05 from './pages/p05-resume.js';
import * as p06 from './pages/p06-config.js';
import * as p07 from './pages/p07-interview.js';
import * as p08 from './pages/p08-feedback.js';
import * as p09 from './pages/p09-archive.js';
import * as p10 from './pages/p10-detail.js';
import * as p11 from './pages/p11-personas.js';
import * as p12 from './pages/p12-subscribe.js';
import * as p13 from './pages/p13-pay.js';
import * as p14 from './pages/p14-profile.js';
import * as p15 from './pages/p15-help.js';

const PAGES = [
  ['p01', p01], ['p02', p02], ['p03', p03], ['p04', p04], ['p05', p05],
  ['p06', p06], ['p07', p07], ['p08', p08], ['p09', p09], ['p10', p10],
  ['p11', p11], ['p12', p12], ['p13', p13], ['p14', p14], ['p15', p15]
];
PAGES.forEach(([id, mod]) => register(id, mod));

// 全局跳转
window.__goto = (id, params) => goto(id, params);

// 全局 PDF.js（用于 P02/P05 解析 PDF）
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve();
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

// 启动
async function boot() {
  // 渲染 TabBar
  renderTabbar();

  // 异步加载 PDF.js（不阻塞启动）
  loadPdfJs().catch(() => {});

  // 解析 hash
  const hash = location.hash.replace('#', '') || 'p01';
  const validIds = PAGES.map(p => p[0]);
  const start = validIds.includes(hash) ? hash : 'p01';

  await goto(start);
}

boot();
