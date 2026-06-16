// ============================================================
// 优面AI · 简易路由（hash + showPage）
// ============================================================

let currentPage = null;
let currentDestroy = null;
const registry = new Map(); // id -> { mount, destroy }

export function register(id, mod) {
  registry.set(id, mod);
}

export async function goto(id, params = {}) {
  // 销毁当前页
  if (currentDestroy) {
    try { currentDestroy(); } catch (e) { console.warn('[router] destroy:', e); }
  }
  const mod = registry.get(id);
  if (!mod) {
    console.warn('[router] no page:', id);
    return;
  }
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.className = 'page';
    el.id = id;
    document.getElementById('app').appendChild(el);
  }
  el.classList.add('active');
  el.scrollTop = 0;
  currentPage = id;
  currentDestroy = mod.destroy || null;
  if (mod.mount) {
    await mod.mount(el, params);
  }
  // 同步 hash
  if (location.hash !== '#' + id) {
    history.replaceState(null, '', '#' + id);
  }
  // 切换 TabBar 高亮
  updateTabbar(id);
}

function updateTabbar(id) {
  const map = {
    'p03': 'home',
    'p09': 'archive',
    'p11': 'persona',
    'p14': 'me'
  };
  const active = map[id];
  document.querySelectorAll('#tabbar-root .tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === active);
  });
  // 显示/隐藏 TabBar
  const tabbar = document.getElementById('tabbar');
  const showOn = ['p03','p09','p11','p14'];
  if (tabbar) tabbar.style.display = showOn.includes(id) ? '' : 'none';
}

export function getCurrent() { return currentPage; }

// ===== TabBar 渲染 =====
export function renderTabbar() {
  const root = document.getElementById('tabbar-root');
  if (!root) return;
  root.innerHTML = `
    <div id="tabbar" class="tabbar">
      <div class="tab" data-tab="home" onclick="window.__goto('p03')">
        <span class="icon">🏠</span>首页
      </div>
      <div class="tab" data-tab="archive" onclick="window.__goto('p09')">
        <span class="icon">📊</span>复盘
      </div>
      <div class="tab" data-tab="persona" onclick="window.__goto('p11')">
        <span class="icon">🎭</span>人设
      </div>
      <div class="tab" data-tab="me" onclick="window.__goto('p14')">
        <span class="icon">👤</span>我的
      </div>
    </div>
  `;
}

// ===== Toast =====
export function toast(msg, ms = 1800) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el.__t);
  el.__t = setTimeout(() => el.classList.remove('show'), ms);
}

// ===== Modal 确认 =====
export function confirmModal({ title, desc, primaryText = '确定', cancelText = '取消', danger = false }) {
  return new Promise(resolve => {
    const root = document.getElementById('modal-root');
    if (!root) { resolve(window.confirm(desc || title || '')); return; }
    root.innerHTML = `
      <div class="modal-mask show">
        <div class="modal">
          <div class="modal-title">${title || ''}</div>
          ${desc ? `<div class="modal-desc">${desc}</div>` : ''}
          <div class="modal-actions">
            <button class="btn btn-outline" id="__m-cancel">${cancelText}</button>
            <button class="btn ${danger ? 'btn-primary' : 'btn-primary'}" id="__m-ok" style="${danger ? 'background:var(--error)' : ''}">${primaryText}</button>
          </div>
        </div>
      </div>
    `;
    const close = (v) => {
      root.innerHTML = '';
      resolve(v);
    };
    root.querySelector('#__m-cancel').onclick = () => close(false);
    root.querySelector('#__m-ok').onclick = () => close(true);
    root.querySelector('.modal-mask').onclick = (e) => {
      if (e.target.classList.contains('modal-mask')) close(false);
    };
  });
}
