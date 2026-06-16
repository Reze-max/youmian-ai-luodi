// ============================================================
// 优面AI · 6 维雷达图 SVG（轻量自实现，不依赖第三方库）
// ============================================================

export const RADAR_DIMS = [
  { key: '产品感', label: '产品感' },
  { key: '逻辑', label: '逻辑' },
  { key: '表达', label: '表达' },
  { key: '案例', label: '案例' },
  { key: '反问', label: '反问' },
  { key: '抗压', label: '抗压' }
];

export function renderRadar({ scores, size = 280 } = {}) {
  const n = RADAR_DIMS.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 36;
  const maxV = 100;
  const getPt = (i, v) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / n;
    const r = (v / maxV) * R;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };

  const gridLayers = [0.25, 0.5, 0.75, 1].map(scale => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / n;
      const r = R * scale;
      pts.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="none" stroke="#E5E7EB" stroke-width="1" />`;
  }).join('');

  const axes = RADAR_DIMS.map((d, i) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / n;
    const x2 = cx + Math.cos(angle) * R;
    const y2 = cy + Math.sin(angle) * R;
    const lx = cx + Math.cos(angle) * (R + 18);
    const ly = cy + Math.sin(angle) * (R + 18);
    return `
      <line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#E5E7EB" stroke-width="1" />
      <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
            font-size="11" fill="#6B7280" font-weight="600">${d.label}</text>
    `;
  }).join('');

  const scoreVals = RADAR_DIMS.map(d => scores?.[d.key] ?? 0);
  const dataPts = scoreVals.map((v, i) => getPt(i, v));
  const dataPath = dataPts.map(p => p.join(',')).join(' ');
  const scoreDots = dataPts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="#5B4FE9" />`).join('');
  const scoreLabels = dataPts.map(([x, y], i) => {
    const v = scoreVals[i];
    const off = 12;
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / n;
    return `<text x="${(x + Math.cos(angle) * off).toFixed(1)}" y="${(y + Math.sin(angle) * off).toFixed(1)}"
              text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#5B4FE9" font-weight="700">${v}</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${size} ${size}" width="100%" height="${size}" xmlns="http://www.w3.org/2000/svg">
      ${gridLayers}
      ${axes}
      <polygon points="${dataPath}" fill="rgba(91,79,233,0.18)" stroke="#5B4FE9" stroke-width="2" />
      ${scoreDots}
      ${scoreLabels}
    </svg>
  `;
}
