// P12 · 订阅/会员
import { goto, toast } from '../lib/router.js';
import { getSubscription, setSubscription } from '../lib/store.js';

const PLANS = [
  { id: 'free', name: '免费版', price: 0, period: '永久', features: ['每月 3 次模拟面试', '基础反馈（综合分）', '不支持雷达图', '不支持进步曲线'] },
  { id: 'monthly', name: 'Pro 月卡', price: 29, period: '月', features: ['无限次模拟面试', '完整 6 维雷达反馈', '能力进步曲线', '经历包装建议', '失败案例参考'] },
  { id: 'yearly', name: 'Pro 年卡', price: 199, period: '年', tag: '8 折', features: ['月卡全部权益', '¥16.6/月 平均', '优先体验新功能', '内测资格'] }
];

export function mount(el) {
  const sub = getSubscription();
  el.innerHTML = `
    <div class="topbar">
      <span class="back" onclick="window.__goto('p03')">‹</span>
      <span class="topbar-title">订阅 Pro</span>
    </div>
    <div style="padding:24px 16px; text-align:center;">
      <div style="font-size:48px; margin-bottom:12px;">✨</div>
      <h2 style="font-size:22px; font-weight:700; margin-bottom:6px;">解锁完整能力</h2>
      <p style="font-size:13px; color:var(--text-2);">基于访谈校准：用户愿意为 30-120 元/月的真实反馈付费</p>
      <div style="margin-top:16px; display:inline-block; background:var(--primary-bg); color:var(--primary); padding:6px 14px; border-radius:20px; font-size:12px; font-weight:600;">
        当前：${sub.plan === 'free' ? '免费版' : (sub.plan === 'monthly' ? 'Pro 月卡' : 'Pro 年卡')}
      </div>
    </div>
    <div style="padding:0 16px 80px;">
      ${PLANS.map(p => `
        <div class="card" style="position:relative; ${p.id === 'monthly' ? 'border:2px solid var(--primary);' : ''}">
          ${p.tag ? `<div style="position:absolute; top:-8px; right:14px; background:var(--primary); color:white; font-size:11px; padding:2px 8px; border-radius:8px;">${p.tag}</div>` : ''}
          <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:10px;">
            <div style="font-weight:700; font-size:15px;">${p.name}</div>
            <div><span style="font-size:24px; font-weight:700; color:var(--primary);">${p.price}</span><span style="font-size:12px; color:var(--text-3);"> 元/${p.period}</span></div>
          </div>
          <div style="border-top:1px solid var(--border); padding-top:10px;">
            ${p.features.map(f => `<div style="font-size:12px; padding:3px 0; color:var(--text-2);"><span style="color:var(--success); margin-right:4px;">✓</span>${f}</div>`).join('')}
          </div>
          <button class="btn ${p.id === sub.plan ? 'btn-outline' : 'btn-primary'} btn-sm" style="margin-top:14px;" data-plan="${p.id}">
            ${p.id === sub.plan ? '✓ 当前套餐' : (p.id === 'free' ? '切换到免费版' : '立即订阅')}
          </button>
        </div>
      `).join('')}
    </div>
  `;
  el.querySelectorAll('[data-plan]').forEach(btn => {
    btn.onclick = () => {
      const plan = btn.dataset.plan;
      if (plan === 'free') {
        setSubscription({ plan: 'free', expiresAt: null });
        toast('已切换到免费版');
      } else {
        // v1.0 暂不接真实支付
        goto('p13', { plan });
      }
    };
  });
}
