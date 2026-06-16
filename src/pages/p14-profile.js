// P14 · 个人中心
import { goto, toast, confirmModal } from '../lib/router.js';
import { getProfile, setProfile, listInterviews, getSubscription, _clearAll, _seedMock } from '../lib/store.js';

export function mount(el) {
  const profile = getProfile();
  const sub = getSubscription();
  const count = listInterviews().length;

  el.innerHTML = `
    <div class="topbar">
      <span class="back" onclick="window.__goto('p03')">‹</span>
      <span class="topbar-title">我的</span>
    </div>
    <div style="padding:24px 16px; text-align:center;">
      <div style="width:64px; height:64px; background:linear-gradient(135deg, #5B4FE9, #7B68EE); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; margin:0 auto 12px;">${(profile.name || '我').slice(0, 1)}</div>
      <div style="font-weight:600; font-size:16px;">${profile.name || '未设置昵称'}</div>
      <div style="font-size:12px; color:var(--text-2); margin-top:2px;">${profile.targetCompany || '未选目标公司'} · ${profile.targetPosition}</div>
    </div>

    <div class="card" style="display:flex; justify-content:space-around; text-align:center;">
      <div><div style="font-size:22px; font-weight:700; color:var(--primary);">${count}</div><div style="font-size:11px; color:var(--text-3);">面试次数</div></div>
      <div><div style="font-size:22px; font-weight:700; color:var(--success);">${sub.plan === 'free' ? '免费' : 'Pro'}</div><div style="font-size:11px; color:var(--text-3);">当前套餐</div></div>
      <div><div style="font-size:22px; font-weight:700;">${profile.pressureLevel === 'gentle' ? '🌱' : profile.pressureLevel === 'bytedance' ? '🔥' : '⚖️'}</div><div style="font-size:11px; color:var(--text-3);">默认压力</div></div>
    </div>

    <div class="card" style="padding:0;">
      ${[
        { icon: '👤', label: '编辑昵称', onclick: 'editName' },
        { icon: '🎯', label: '修改目标公司 / 岗位', onclick: 'window.__goto("p02")' },
        { icon: '📄', label: '简历管理', onclick: 'window.__goto("p05")' },
        { icon: '📊', label: '复盘档案', onclick: 'window.__goto("p09")' },
        { icon: '🎭', label: '人设库', onclick: 'window.__goto("p11")' },
        { icon: '✨', label: '订阅 / 会员', onclick: 'window.__goto("p12")' }
      ].map(item => `
        <div style="padding:14px 16px; display:flex; align-items:center; gap:12px; border-bottom:1px solid var(--border); cursor:pointer;" onclick='${item.onclick}'>
          <span style="font-size:18px;">${item.icon}</span>
          <span style="flex:1; font-size:14px;">${item.label}</span>
          <span style="color:var(--text-3);">›</span>
        </div>
      `).join('')}
    </div>

    <div class="card" style="padding:0;">
      <div style="padding:14px 16px; display:flex; align-items:center; gap:12px; cursor:pointer;" id="__p14-seed">
        <span style="font-size:18px;">🧪</span>
        <span style="flex:1; font-size:14px;">注入演示数据</span>
        <span style="color:var(--text-3); font-size:12px;">P09 曲线用</span>
      </div>
      <div style="padding:14px 16px; display:flex; align-items:center; gap:12px; cursor:pointer; color:var(--error);" id="__p14-clear">
        <span style="font-size:18px;">🗑️</span>
        <span style="flex:1; font-size:14px;">清空所有数据</span>
      </div>
    </div>

    <div style="padding:8px 16px; text-align:center; font-size:11px; color:var(--text-3);">
      优面AI v1.0 · W4 D7 终版
    </div>
  `;
  window.editName = async () => {
    const cur = getProfile();
    const name = prompt('请输入昵称（用于 P07 面试官称呼）', cur.name || '');
    if (name !== null) {
      setProfile({ name: name.trim() });
      toast('已保存');
      mount(el);
    }
  };
  el.querySelector('#__p14-seed').onclick = () => {
    _seedMock();
    toast('已注入 6 条演示面试');
  };
  el.querySelector('#__p14-clear').onclick = async () => {
    if (await confirmModal({ title: '清空所有数据？', desc: '将删除简历、面试记录、订阅信息。此操作不可恢复。', primaryText: '清空', danger: true })) {
      _clearAll();
      toast('已清空');
      mount(el);
    }
  };
}
