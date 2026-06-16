// ============================================================
// Vercel Serverless Function: LLM 代理（增强版，支持 provider 切换）
// 接收前端 /api/llm 请求，从环境变量读 KEY，转发到真实 LLM 端点
// API KEY 隐藏在 Vercel 后端环境变量，前端 view-source 看不到
// Provider: minimax | qwen | openai | mock（缺 KEY 时 mock 兜底）
// ============================================================

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const { system, messages, stream, jsonMode, maxTokens, temperature } = body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages required' });
  }

  // 探活：__ping__ 直接返回 ok
  if (messages.length === 1 && messages[0].content === '__ping__') {
    return res.status(200).json({ status: 'ok', provider: process.env.LLM_PROVIDER || 'mock' });
  }

  const provider = (process.env.LLM_PROVIDER || 'minimax').toLowerCase();
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'MiniMax-M3';

  // 配置 provider
  const cfg = getProviderConfig(provider, apiKey, model);
  if (!cfg) {
    // mock 兜底
    return mockResponse(req, res, { system, messages, stream, jsonMode });
  }

  const upstreamBody = {
    model: cfg.model,
    messages: [{ role: 'system', content: system || '' }, ...messages],
    stream: !!stream,
    temperature: typeof temperature === 'number' ? temperature : 0.7,
    max_tokens: maxTokens || 1000
  };
  if (jsonMode) upstreamBody.response_format = { type: 'json_object' };

  try {
    const upstream = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.apiKey
      },
      body: JSON.stringify(upstreamBody)
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('[llm] upstream error', upstream.status, errText.slice(0, 500));
      // 失败也降级到 mock，保证前端不崩
      return mockResponse(req, res, { system, messages, stream, jsonMode, error: `upstream ${upstream.status}` });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } finally {
        res.end();
      }
    } else {
      const data = await upstream.json();
      res.status(200).json(data);
    }
  } catch (e) {
    console.error('[llm] proxy error', e);
    return mockResponse(req, res, { system, messages, stream, jsonMode, error: e.message });
  }
};

function getProviderConfig(provider, apiKey, defaultModel) {
  if (!apiKey) return null;
  switch (provider) {
    case 'minimax':
      return {
        endpoint: process.env.LLM_ENDPOINT || 'https://api.MiniMax.chat/v1/chat/completions',
        apiKey,
        model: defaultModel
      };
    case 'qwen':
      return {
        endpoint: process.env.LLM_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        apiKey,
        model: process.env.LLM_MODEL || 'qwen-plus'
      };
    case 'openai':
      return {
        endpoint: process.env.LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions',
        apiKey,
        model: process.env.LLM_MODEL || 'gpt-4o-mini'
      };
    default:
      return null;
  }
}

// ===== Mock 兜底（保证前端永远不崩）=====
function mockResponse(req, res, { system, messages, stream, jsonMode, error }) {
  const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const text = mockText(system, lastUser, jsonMode, error);

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const chunkSize = 4;
    let i = 0;
    const send = () => {
      if (i >= text.length) {
        res.write('data: [DONE]\n\n');
        return res.end();
      }
      const piece = text.slice(i, i + chunkSize);
      i += chunkSize;
      const payload = JSON.stringify({
        choices: [{ delta: { content: piece } }]
      });
      res.write(`data: ${payload}\n\n`);
      setTimeout(send, 20);
    };
    send();
  } else {
    res.status(200).json({
      choices: [{ message: { content: text } }],
      usage: { total_tokens: text.length }
    });
  }
}

function mockText(system, user, isJson, error) {
  const s = (system || '').slice(0, 200);
  if (/面试官|interviewer/i.test(s)) {
    const len = (user || '').length;
    if (len < 20) return '你的回答比较短，能展开讲讲具体的背景、你的角色、你做了什么、结果是什么吗？';
    if (len < 80) return '不错，你提到了核心经历。能不能再具体量化一下，比如数据基线是多少？你最终带来了什么结果？';
    return '挺好，你讲得比较具体。我追问一下：你刚才提到的那个数字，分母是什么？对比对象是谁？如果换个场景，你会怎么做？';
  }
  if (/评分|scoring|6 维/i.test(s)) {
    return JSON.stringify({
      overall: 72,
      expression: 70,
      logic: 68,
      productSense: 75,
      dataSense: 65,
      reflection: 80,
      reverse: 70,
      strengths: ['回答有具体案例支撑', '反思深度不错'],
      weaknesses: ['缺少量化数据', '结构可以更清晰'],
      keypoints: [
        { name: '数据基线', score: 60 },
        { name: '增长逻辑', score: 70 },
        { name: '反思深度', score: 78 }
      ],
      suggestions: [
        '回答中加入具体数据基线和对比对象',
        '用 STAR 框架结构化拆解案例',
        '结尾补充反思 + 量化结果'
      ],
      honest_take: '整体表现中上，能讲清楚自己在做什么，但缺数据，缺对比。建议下次刻意练习"先报数再讲故事"。'
    });
  }
  if (/包装|经历|productize/i.test(s)) {
    return JSON.stringify({
      cards: [
        { original: '参与企业流程建模研究', suggested: '用户需求分析 · 业务流程优化 · 跨部门协作' },
        { original: '校园产品调研比赛', suggested: '用户调研 · 需求洞察 · 竞品分析' },
        { original: '数据分析课程项目', suggested: '数据驱动决策 · SQL · AB 实验设计' }
      ]
    });
  }
  if (/JD|岗位|考点/i.test(s)) {
    return JSON.stringify({
      company_profile: { company: '字节跳动', focus: '数据驱动 · 增长 · ROI', rhythm: '快', tone: '直接 · 犀利 · 连环追问' },
      keywords: ['用户增长', '数据驱动', 'AB 实验', 'ROI', '产品策略', '用户洞察', '商业化'],
      competency: ['增长黑客思维', '结构化思考', '数据敏感', '抗压能力'],
      questions: ['讲一个你做的最有数据感的项目', '如何衡量一个功能上线后的效果？', '如果次日留存下降 5% 你怎么排查？']
    });
  }
  if (isJson) {
    return JSON.stringify({ status: 'mock', note: error || 'no api key configured', received: user.slice(0, 100) });
  }
  return '（mock 兜底）请配置 LLM_API_KEY 环境变量以使用真实模型。当前演示模式。';
}
