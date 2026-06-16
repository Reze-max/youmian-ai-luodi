# 优面AI · 从原型到真实应用 V1.0

> 基于大厂真实面试官人设 + 敢说真话的结构化反馈的 AI 求职陪练
> v1.0 模块化重构版：Vite + ES Modules + Vercel Serverless

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

> ⚠️ Windows PowerShell 默认 Restricted 策略可能阻止 `npm.ps1`，两种解决：
> - 用 cmd：`cmd /c "npm install"`
> - 临时改策略：`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

### 2. 本地开发

```bash
npm run dev
```

浏览器打开 http://localhost:5173 即可。

### 3. LLM 接入（可选）

**默认是 Mock 模式**，所有页面都能完整演示，无需任何 KEY。

要让 M3 真实接入，**有两种方式**：

#### 方式 A：直接走前端（开发调试用，KEY 暴露风险）

1. 复制 `.env.example` 为 `.env.local`
2. 填入：
   ```
   VITE_LLM_MODE=auto
   ```
3. 同时在本目录放置一个能用的 M3 端点（推荐用 Vercel 部署后的 `/api/llm`）

#### 方式 B：走 Vercel Serverless（推荐 · 生产安全）

1. 把项目部署到 Vercel（见下方"部署"）
2. 在 Vercel Dashboard → Settings → Environment Variables 配置：
   - `LLM_API_KEY` = 你的 M3 / Qwen / OpenAI KEY
   - `LLM_PROVIDER` = `minimax`（默认）/ `qwen` / `openai`
   - `LLM_MODEL` = `MiniMax-M3`（默认）
3. 前端通过 `https://你的域名/api/llm` 调用，KEY 永远不进前端代码

---

## 📦 部署到 Vercel

```bash
npm install -g vercel   # 第一次需要
vercel                  # 部署到预览环境
vercel --prod           # 部署到生产
```

或在 Vercel Dashboard：
1. New Project → 导入此目录
2. Build Command: `vite build`
3. Output Directory: `dist`
4. 配置上面"方式 B"的环境变量
5. Deploy

---

## 📂 项目结构

```
优面AI开发/
├── index.html              # Vite 入口（壳）
├── package.json
├── vite.config.js          # dev/build 配置
├── vercel.json             # Vercel 路由：/api/* → api/llm.js
├── .env.example            # 环境变量模板
├── api/
│   └── llm.js              # Vercel Function（4 个 provider 切换）
├── public/
│   └── data/
│       └── p07-question-bank.json   # 30 道题库
├── src/
│   ├── main.js             # 启动 + 路由注册
│   ├── styles/             # CSS（tokens/base/components）
│   ├── lib/                # llm / store / router / radar / trend / persona
│   ├── data/               # 4 套 prompt + 失败案例
│   └── pages/              # 15 个页面（p01-p15）
└── README.md
```

---

## 🎬 演示路径（5 分钟讲完 · PM 面试用）

| 步骤 | 路径 | 时长 | 演示内容 |
| --- | --- | --- | --- |
| 1 | P01 → P02 | 30s | 启动 + 引导选公司 / 上传简历 |
| 2 | P05 | 1min | 简历定制 + **AI 经历包装**（M3 真实调用） |
| 3 | P06 → P07 | 2min | 选压力级别 + **跑 3-5 轮面试**（流式输出 + 追问） |
| 4 | P08 | 1min | **6 维雷达 + 诚实反馈**（敢说真话差异化） |
| 5 | P09 → P12 | 30s | 能力曲线 + 订阅页 |

> 没配置 KEY 时全程走 Mock，演示体验一致（控制台会有"Mock 模式"提示）。

---

## 🧪 验收 Checklist

- [ ] `npm run dev` 启动无报错
- [ ] 走通 P01→P02→P05→P06→P07（3 轮对话）→P08→P09→P12，控制台无报错
- [ ] 配置 `LLM_API_KEY` 后 P04 / P05 / P07 / P08 真实调用 M3
- [ ] Mock 降级验证：清空 `LLM_API_KEY` 后 P07 仍能跑完
- [ ] 持久化验证：刷新页面后 P09 仍能看到刚才的面试记录
- [ ] 演示数据：P03 / P14 注入 seed 后 P09 曲线有 6 个数据点
- [ ] `npm run build` 产出 dist 目录
- [ ] `vercel --prod` 部署后线上地址重复冒烟测试

---

## 🛠️ 4 大核心模块的真实化

| 模块 | 页面 | 真实化点 |
| --- | --- | --- |
| JD 解析 | P04 | 粘贴 JD → M3 提取公司画像 + 考点词云 + 可能问的题 |
| 简历定制 | P05 | PDF 上传 / 在线填写 + M3 经历包装（3-8 条 AI 建议） |
| 模拟面试 | P06 → P07 → P08 | 6 阶段状态机 + M3 流式对话 + 追问判定 + 6 维评分 |
| 复盘档案 | P09 → P10 | 历史数据驱动 + 能力进步曲线 + 完整对话回放 |

非核心页（P01/P02/P03/P11–P15）保留视觉与跳转，简化交互。

---

## 🔁 与原型的关系

- 视觉风格 100% 一致（CSS Tokens 复用）
- 原型（`work/index.html`）保留为参考，**本目录独立演进**
- 4 套 prompt 从原型内嵌迁出到 `src/data/*.js`，与 07-Prompt 工程手册一致
- 题库 JSON 直接复用，未修改

---

## 📜 License & 注意事项

- 本项目为 PM 面试演示项目，非生产级商业产品
- LLM API KEY 走 Vercel 环境变量，**不要把 KEY 硬编码到前端代码**
- 真实支付 / 多用户登录 / B 端 SaaS 等能力在 v2.0 路线图中
- 模拟数据（`_seedMock`）仅用于本地演示，请勿用于生产
