// P01 · 启动页
import { goto } from '../lib/router.js';

export function mount(el) {
  el.innerHTML = `
    <div style="min-height:100vh; background:linear-gradient(135deg, #5B4FE9 0%, #7B68EE 50%, #9F95FF 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; padding:40px 24px; text-align:center;">
      <div style="font-size:64px; margin-bottom:24px; animation: p07-pulse 2s ease-in-out infinite;">🤖</div>
      <h1 style="font-size:36px; font-weight:700; margin-bottom:12px; letter-spacing:1px;">优面AI</h1>
      <p style="font-size:18px; opacity:0.95; margin-bottom:6px; font-weight:500;">敢说真话，让你真的进步</p>
      <p style="font-size:13px; opacity:0.75; margin-bottom:48px; max-width:280px; line-height:1.7;">
        基于大厂真实面试官人设<br/>给出结构化、有数据、敢说不的反馈
      </p>
      <div style="display:flex; gap:8px; margin-bottom:24px;">
        <span class="tag" style="background:rgba(255,255,255,0.2); color:white;">字节跳动</span>
        <span class="tag" style="background:rgba(255,255,255,0.2); color:white;">腾讯</span>
        <span class="tag" style="background:rgba(255,255,255,0.2); color:white;">美团</span>
        <span class="tag" style="background:rgba(255,255,255,0.2); color:white;">小红书</span>
      </div>
      <button class="btn" id="__p01-start" style="background:white; color:#5B4FE9; max-width:280px; font-weight:700;">
        立即开始 →
      </button>
      <p style="font-size:11px; opacity:0.6; margin-top:32px;">v1.0 · W4 D7 终版</p>
    </div>
  `;
  el.querySelector('#__p01-start').onclick = () => goto('p02');
}
