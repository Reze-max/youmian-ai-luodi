// P15 · 关于/帮助
import { goto } from '../lib/router.js';

const FAQ = [
  { q: '什么是"敢说真话"？', a: '指反馈直接、给具体改进、不回避不足。我们刻意避免"鼓励式反馈"的陷阱。' },
  { q: 'M3 是什么？', a: 'MiniMax-M3 大语言模型。本项目默认使用 M3 作为主模型，可在 Vercel 环境变量切换到 Qwen / OpenAI。' },
  { q: '为什么选 Vercel？', a: 'Serverless Function 可以把 API KEY 隐藏在云端，前端不暴露任何敏感信息。' },
  { q: '数据安全？', a: '简历和面试记录仅存于你的浏览器 localStorage，不上传服务器。清空浏览器数据即丢失。' },
  { q: '没看到 API 调用生效？', a: '检查 .env 中的 LLM_API_KEY 是否正确配置，或访问 /api/llm 探活。Mock 模式会自动启用。' },
  { q: 'v1.0 暂不支持什么？', a: 'Word 简历解析（v1.1）、真实支付（v1.1）、B 端校招 SaaS（v2.0）、多用户登录（v1.2）。' }
];

export function mount(el) {
  el.innerHTML = `
    <div class="topbar">
      <span class="back" onclick="window.__goto('p03')">‹</span>
      <span class="topbar-title">关于 / 帮助</span>
    </div>

    <div class="card" style="text-align:center; padding:24px 16px;">
      <div style="font-size:48px; margin-bottom:8px;">🤖</div>
      <div style="font-weight:700; font-size:18px;">优面AI</div>
      <div style="font-size:12px; color:var(--text-2); margin-top:4px;">v1.0 · 基于真实面试官人设的 AI 求职陪练</div>
    </div>

    <div class="card">
      <div style="font-weight:600; margin-bottom:12px;">❓ 常见问题</div>
      ${FAQ.map((item, i) => `
        <details style="border-top:${i === 0 ? 'none' : '1px solid var(--border)'}; padding:12px 0;">
          <summary style="font-size:13px; font-weight:600; cursor:pointer; list-style:none; display:flex; justify-content:space-between;">
            <span>${item.q}</span>
            <span style="color:var(--text-3);">+</span>
          </summary>
          <p style="font-size:12px; color:var(--text-2); margin-top:8px; line-height:1.7; padding-left:4px;">${item.a}</p>
        </details>
      `).join('')}
    </div>

    <div class="card" style="text-align:center; font-size:12px; color:var(--text-2);">
      <div>项目基于开源精神 · 数据仅本地存储</div>
      <div style="margin-top:6px; color:var(--text-3);">联系：youmian-ai@example.com</div>
    </div>

    <div style="padding:16px; text-align:center;">
      <button class="btn btn-outline btn-sm" onclick="window.__goto('p14')">← 返回个人中心</button>
    </div>
  `;
}
