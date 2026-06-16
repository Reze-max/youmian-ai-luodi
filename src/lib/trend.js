// ============================================================
// 优面AI · 能力进步曲线 SVG（多维折线图）
// ============================================================

export const TREND_DIMS = [
  { key: 'overall_score', label: '综合分', color: '#5B4FE9' }
];

export function renderTrend({ points, height = 220 } = {}) {
  // points: [{ at, label, value }]
  if (!points || points.length === 0) {
    return `<div style="text-align:center;color:var(--text-3);padding:60px 0;font-size:13px;">
      暂无数据，完成一场模拟面试后会自动生成能力曲线
    </div>`;
  }

  const padding = { top: 30, right: 20, bottom: 40, left: 36 };
  const width = 360;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const yMin = 40;
  const yMax = 100;
  const yScale = v => padding.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const xCount = points.length;
  const xScale = i => padding.left + (xCount === 1 ? innerW / 2 : (innerW * i) / (xCount - 1));

  // Y 轴网格
  const yTicks = [40, 60, 80, 100];
  const grid = yTicks.map(t => {
    const y = yScale(t);
    return `
      <line x1="${padding.left}" y1="${y}" x2="${padding.left + innerW}" y2="${y}"
            stroke="#F3F4F6" stroke-width="1" stroke-dasharray="2,3" />
      <text x="${padding.left - 6}" y="${y + 3}" text-anchor="end" font-size="10" fill="#9CA3AF">${t}</text>
    `;
  }).join('');

  // X 轴标签
  const xLabels = points.map((p, i) => {
    const d = new Date(p.at);
    const text = `${d.getMonth() + 1}/${d.getDate()}`;
    return `<text x="${xScale(i)}" y="${padding.top + innerH + 16}" text-anchor="middle" font-size="10" fill="#9CA3AF">${text}</text>`;
  }).join('');

  // 折线 + 数据点
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(p.value)}`).join(' ');
  const areaD = pathD + ` L${xScale(points.length - 1)},${padding.top + innerH} L${xScale(0)},${padding.top + innerH} Z`;
  const dots = points.map((p, i) => {
    const x = xScale(i), y = yScale(p.value);
    const isLast = i === points.length - 1;
    const color = isLast ? '#5B4FE9' : '#fff';
    const stroke = isLast ? '#5B4FE9' : '#5B4FE9';
    return `<circle cx="${x}" cy="${y}" r="4" fill="${color}" stroke="${stroke}" stroke-width="2" />`;
  }).join('');

  // 关键节点标注（最近一个）
  const last = points[points.length - 1];
  const lastLabel = last.label ? `<text x="${xScale(points.length - 1)}" y="${yScale(last.value) - 12}"
    text-anchor="middle" font-size="11" fill="#5B4FE9" font-weight="700">${last.value} · ${last.label}</text>` : '';

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${grid}
      ${xLabels}
      <path d="${areaD}" fill="rgba(91,79,233,0.10)" />
      <path d="${pathD}" fill="none" stroke="#5B4FE9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${dots}
      ${lastLabel}
    </svg>
  `;
}

export function renderLegend() {
  return TREND_DIMS.map(d =>
    `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--text-2);margin-right:10px;">
       <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${d.color};"></span>${d.label}
     </span>`
  ).join('');
}
