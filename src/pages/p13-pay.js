// P13 · 支付页（v1.0 静态展示）
import { goto, toast } from '../lib/router.js';
import { setSubscription } from '../lib/store.js';

export function mount(el, params = {}) {
  const plan = params.plan || 'monthly';
  const planName = plan === 'yearly' ? 'Pro 年卡 ¥199' : 'Pro 月卡 ¥29';
  el.innerHTML = `
    <div class="topbar">
      <span class="back" onclick="window.__goto('p12')">‹</span>
      <span class="topbar-title">确认支付</span>
    </div>
    <div style="padding:24px 16px;">
      <div class="card" style="text-align:center; padding:20px;">
        <div style="font-size:32px; margin-bottom:6px;">✨</div>
        <div style="font-weight:600; font-size:16px;">${planName}</div>
        <div style="font-size:12px; color:var(--text-2); margin-top:4px;">v1.0 演示模式 · 暂未接入真实支付</div>
      </div>

      <div class="card" style="padding:0;">
        <div style="padding:14px 16px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between;"><span>订单金额</span><span style="font-weight:600; color:var(--primary);">${plan === 'yearly' ? '¥199.00' : '¥29.00'}</span></div>
        <div style="padding:14px 16px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between;"><span>支付方式</span><span style="color:var(--text-2);">微信 / 支付宝</span></div>
        <div style="padding:14px 16px; display:flex; justify-content:space-between;"><span>订单号</span><span style="color:var(--text-2); font-size:12px; font-family:monospace;">YM${Date.now()}</span></div>
      </div>

      <div class="card" style="background:linear-gradient(135deg, #FEF3E2 0%, #FFFFFF 100%);">
        <div style="font-size:13px; color:var(--warning); font-weight:600; margin-bottom:6px;">⚠️ v1.0 演示版</div>
        <div style="font-size:12px; color:var(--text-2); line-height:1.7;">
          真实支付集成将在 v1.1 上线（需要 ICP 备案 + 商户号）。当前点击"模拟支付成功"会开通 Pro 权限用于演示。
        </div>
      </div>

      <button class="btn btn-primary" id="__p13-mock" style="margin-top:16px;">
        模拟支付成功（演示）
      </button>
      <button class="btn btn-outline" style="margin-top:8px;" onclick="window.__goto('p12')">
        返回订阅页
      </button>
    </div>
  `;
  el.querySelector('#__p13-mock').onclick = () => {
    const expiresAt = plan === 'yearly' ? Date.now() + 365 * 86400000 : Date.now() + 30 * 86400000;
    setSubscription({ plan, expiresAt });
    toast('🎉 Pro 已开通');
    goto('p03');
  };
}
