import * as fs from 'fs';
import * as path from 'path';
import { AnalysisResult, FileNode, GraphNode } from '../types';

const REPORT_DIR = '.codepulse-report';

export function generateReport(result: AnalysisResult, baseDir: string): string {
  const reportPath = path.join(baseDir, REPORT_DIR);
  fs.mkdirSync(reportPath, { recursive: true });

  const stats = buildStats(result);
  fs.writeFileSync(
    path.join(reportPath, 'stats.json'),
    JSON.stringify(stats, null, 2)
  );

  const svg = buildGraphSvg(result);
  fs.writeFileSync(path.join(reportPath, 'graph.svg'), svg);

  const html = buildHtml(result, stats);
  fs.writeFileSync(path.join(reportPath, 'index.html'), html);

  return reportPath;
}

function buildStats(result: AnalysisResult) {
  const top10Complex = [...result.files]
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 10)
    .map(f => ({ path: f.relativePath, complexity: f.complexity, lines: f.lines }));

  return {
    totalFiles: result.totalFiles,
    totalLines: result.totalLines,
    avgComplexity: Math.round(result.avgComplexity * 10) / 10,
    deadExports: result.deadExports.length,
    godFiles: result.godFiles.length,
    criticalFiles: result.criticalFiles.length,
    top10Complex,
    deadExportsList: result.deadExports,
    godFilesList: result.godFiles.map(f => ({
      path: f.relativePath,
      lines: f.lines,
      imports: f.imports.length,
      complexity: f.complexity,
    })),
  };
}

function buildGraphSvg(result: AnalysisResult): string {
  const nodes = result.files.slice(0, 80);
  const width = 1200;
  const height = 800;

  const n = nodes.length;
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(cx, cy) - 80;

  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((file, i) => {
    const angle = (2 * Math.PI * i) / n;
    positions.set(file.path, {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  });

  let lines = '';
  for (const edge of result.edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (from && to) {
      lines += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#4F46E5" stroke-width="0.8" stroke-opacity="0.3" marker-end="url(#arrow)"/>`;
    }
  }

  let circles = '';
  for (const file of nodes) {
    const pos = positions.get(file.path);
    if (!pos) continue;
    const gNode = result.graph.get(file.path);
    const isCritical = gNode?.isCritical ?? false;
    const isGod = file.isGodFile;
    const color = isCritical ? '#EF4444' : isGod ? '#F59E0B' : '#6366F1';
    const radius = Math.min(4 + (gNode?.inDegree ?? 0) * 1.5, 18);
    const label = path.basename(file.relativePath);

    circles += `
      <circle cx="${pos.x}" cy="${pos.y}" r="${radius}" fill="${color}" fill-opacity="0.85" stroke="white" stroke-width="1.5">
        <title>${file.relativePath} (complexity: ${file.complexity})</title>
      </circle>
      ${radius > 6 ? `<text x="${pos.x}" y="${pos.y - radius - 3}" text-anchor="middle" font-size="8" fill="#94A3B8">${label.length > 16 ? label.slice(0, 14) + '..' : label}</text>` : ''}
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background:#0F172A">
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#4F46E5" opacity="0.6"/>
    </marker>
  </defs>
  ${lines}
  ${circles}
  <text x="20" y="30" font-size="14" fill="#64748B" font-family="monospace">CodePulse Dependency Graph — ${nodes.length} files</text>
  <text x="20" y="50" font-size="11" fill="#475569" font-family="monospace">
    <tspan fill="#EF4444">●</tspan> Critical  
    <tspan fill="#F59E0B" dx="8">●</tspan> God File  
    <tspan fill="#6366F1" dx="8">●</tspan> Normal
  </text>
</svg>`;
}

// ─── Tooltip definitions ──────────────────────────────────────

const TOOLTIPS = {
  'god-file': {
    title: 'God File',
    body: 'A file with 500+ lines or 15+ imports. Accumulates too many responsibilities — hard to maintain and refactor.',
    fix: 'Split by responsibility, extract modules.',
  },
  'dead-export': {
    title: 'Dead Export',
    body: 'A symbol exported but never imported anywhere in the project. Likely unused or legacy code.',
    fix: 'Remove the export or delete if unused.',
  },
  'critical-node': {
    title: 'Critical Node',
    body: 'Imported by many modules. Changes here may cause cascading failures across the codebase.',
    fix: 'Avoid adding logic here. Add tests as safety net.',
  },
  'high-complexity': {
    title: 'High Complexity',
    body: 'Cyclomatic complexity > 10. Too many branches and decision points — hard to test and reason about.',
    fix: 'Extract conditions into named functions, use early returns.',
  },
};

function infoIcon(type: keyof typeof TOOLTIPS): string {
  const t = TOOLTIPS[type];
  return `<span class="info-icon" tabindex="0">
    ℹ
    <span class="tooltip">
      <strong>${t.title}</strong><br>
      ${t.body}<br>
      <span class="tooltip-fix">✓ ${t.fix}</span>
    </span>
  </span>`;
}

function buildHtml(result: AnalysisResult, stats: ReturnType<typeof buildStats>): string {
  const complexityRows = stats.top10Complex.map(f => {
    const level = f.complexity > 20 ? 'critical' : f.complexity > 10 ? 'warning' : 'ok';
    const badge = level === 'critical'
      ? `<span class="badge badge-red">CRITICAL</span>${infoIcon('high-complexity')}`
      : level === 'warning'
      ? `<span class="badge badge-yellow">WARNING</span>${infoIcon('high-complexity')}`
      : '<span class="badge badge-green">OK</span>';
    return `<tr>
      <td class="td-path">${f.path}</td>
      <td>${f.lines}</td>
      <td>${f.complexity} ${badge}</td>
    </tr>`;
  }).join('\n');

  const deadRows = result.deadExports.slice(0, 50).map(d =>
    `<tr><td class="td-path">${d.file}</td><td><code>${d.name}</code></td></tr>`
  ).join('\n');

  const godRows = stats.godFilesList.map(f =>
    `<tr><td class="td-path">${f.path}</td><td>${f.lines}</td><td>${f.imports}</td><td>${f.complexity}</td></tr>`
  ).join('\n');

  const criticalRows = result.criticalFiles.slice(0, 10).map(n => {
    const file = result.files.find(f => f.path === n.id);
    return `<tr>
      <td class="td-path">${file?.relativePath ?? n.id}</td>
      <td>${n.inDegree}</td>
      <td>${n.outDegree}</td>
      <td>${n.centrality}</td>
    </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CodePulse Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0F172A; --surface: #1E293B; --border: #334155;
    --text: #E2E8F0; --muted: #94A3B8; --accent: #6366F1;
    --green: #10B981; --yellow: #F59E0B; --red: #EF4444;
  }
  body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; }
  header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 24px 40px; display: flex; align-items: center; gap: 16px; }
  header h1 { font-size: 26px; font-weight: 700; color: white; }
  header h1 span { color: var(--accent); }
  .tag { background: #312E81; color: #A5B4FC; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-family: monospace; }
  .container { max-width: 1300px; margin: 0 auto; padding: 32px 40px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  .stat-card .label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .stat-card .value { font-size: 36px; font-weight: 700; color: white; }
  .stat-card .sub { font-size: 12px; color: var(--muted); margin-top: 4px; }
  .section { margin-bottom: 40px; }
  .section h2 { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: white; display: flex; align-items: center; gap: 10px; }
  .section h2 .icon { width: 8px; height: 22px; background: var(--accent); border-radius: 4px; display: inline-block; }
  table { width: 100%; border-collapse: collapse; background: var(--surface); border-radius: 12px; overflow: hidden; }
  th { background: #162032; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); }
  td { padding: 10px 16px; border-bottom: 1px solid #1E293B; font-size: 14px; color: var(--text); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #162032; }
  .td-path { font-family: monospace; font-size: 13px; color: #93C5FD; }
  code { background: #1E293B; color: #F472B6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  .badge { padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-left: 6px; }
  .badge-red { background: #450A0A; color: var(--red); }
  .badge-yellow { background: #451A03; color: var(--yellow); }
  .badge-green { background: #052E16; color: var(--green); }
  .graph-container { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .graph-container svg { width: 100%; height: auto; max-height: 500px; }
  .empty { color: var(--muted); font-size: 14px; padding: 24px 16px; }
  .footer { text-align: center; padding: 32px; color: var(--muted); font-size: 13px; border-top: 1px solid var(--border); margin-top: 40px; }
  .pulse { display: inline-block; width: 10px; height: 10px; background: var(--green); border-radius: 50%; margin-right: 8px; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }

  /* ─── Info tooltip ─────────────────────────────── */
  .info-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: help;
    color: var(--muted);
    font-size: 11px;
    font-style: normal;
    font-weight: 700;
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 16px;
    height: 16px;
    margin-left: 6px;
    position: relative;
    vertical-align: middle;
    flex-shrink: 0;
    transition: color 0.15s, border-color 0.15s;
    user-select: none;
  }
  .info-icon:hover,
  .info-icon:focus {
    color: #A5B4FC;
    border-color: #A5B4FC;
    outline: none;
  }
  .tooltip {
    display: none;
    position: absolute;
    left: 22px;
    top: 50%;
    transform: translateY(-50%);
    background: #1E293B;
    border: 1px solid var(--border);
    color: var(--text);
    padding: 10px 14px;
    border-radius: 8px;
    width: 280px;
    font-size: 12px;
    line-height: 1.6;
    z-index: 100;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    pointer-events: none;
    font-weight: 400;
    font-style: normal;
    white-space: normal;
  }
  .tooltip strong {
    display: block;
    color: white;
    font-size: 13px;
    margin-bottom: 4px;
  }
  .tooltip-fix {
    display: block;
    margin-top: 6px;
    color: var(--green);
    font-size: 11px;
  }
  .info-icon:hover .tooltip,
  .info-icon:focus .tooltip {
    display: block;
  }

  /* Section header tooltip */
  .section-info {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: help;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 18px;
    height: 18px;
    position: relative;
    margin-left: 4px;
    flex-shrink: 0;
    transition: color 0.15s, border-color 0.15s;
  }
  .section-info:hover { color: #A5B4FC; border-color: #A5B4FC; }
  .section-info .tooltip {
    top: 0;
    transform: none;
    left: 24px;
    width: 300px;
  }
  .section-info:hover .tooltip { display: block; }
</style>
</head>
<body>
<header>
  <div>
    <h1>Code<span>Pulse</span> CLI</h1>
    <div style="font-size:13px;color:var(--muted);margin-top:4px;"><span class="pulse"></span>Analysis complete — ${new Date().toLocaleString()}</div>
  </div>
  <div style="margin-left:auto;display:flex;gap:8px">
    <span class="tag">codepulse scan</span>
  </div>
</header>

<div class="container">

  <div class="grid-4">
    <div class="stat-card">
      <div class="label">Total Files</div>
      <div class="value">${stats.totalFiles}</div>
      <div class="sub">JS / TS analyzed</div>
    </div>
    <div class="stat-card">
      <div class="label">Total Lines</div>
      <div class="value">${stats.totalLines.toLocaleString()}</div>
      <div class="sub">lines of code</div>
    </div>
    <div class="stat-card">
      <div class="label">Avg Complexity</div>
      <div class="value" style="color:${stats.avgComplexity > 15 ? 'var(--red)' : stats.avgComplexity > 8 ? 'var(--yellow)' : 'var(--green)'}">${stats.avgComplexity}</div>
      <div class="sub">cyclomatic avg</div>
    </div>
    <div class="stat-card">
      <div class="label">Dead Exports</div>
      <div class="value" style="color:${stats.deadExports > 0 ? 'var(--red)' : 'var(--green)'}">${stats.deadExports}</div>
      <div class="sub">unused exports</div>
    </div>
  </div>

  <div class="grid-4" style="margin-top:-24px">
    <div class="stat-card">
      <div class="label">God Files</div>
      <div class="value" style="color:${stats.godFiles > 0 ? 'var(--yellow)' : 'var(--green)'}">${stats.godFiles}</div>
      <div class="sub">oversized modules</div>
    </div>
    <div class="stat-card">
      <div class="label">Critical Nodes</div>
      <div class="value" style="color:${stats.criticalFiles > 0 ? 'var(--red)' : 'var(--green)'}">${stats.criticalFiles}</div>
      <div class="sub">high dependency</div>
    </div>
    <div class="stat-card">
      <div class="label">Total Edges</div>
      <div class="value">${result.edges.length}</div>
      <div class="sub">import links</div>
    </div>
    <div class="stat-card">
      <div class="label">Health Score</div>
      <div class="value" style="color:var(--green)">${calculateHealthScore(stats, result)}<span style="font-size:20px;color:var(--muted)">/100</span></div>
      <div class="sub">overall quality</div>
    </div>
  </div>

  <div class="section">
    <h2><span class="icon"></span>Dependency Graph</h2>
    <div class="graph-container">
      <img src="graph.svg" alt="Dependency Graph" style="width:100%;border-radius:12px"/>
    </div>
  </div>

  <div class="section">
    <h2>
      <span class="icon" style="background:var(--yellow)"></span>
      Top 10 Most Complex Files
      <span class="section-info" tabindex="0">ℹ
        <span class="tooltip">
          <strong>High Complexity</strong>
          Cyclomatic complexity counts branches in code (if, for, while, etc.). High values mean the code is hard to test and reason about.<br>
          <span class="tooltip-fix">✓ Extract conditions into named functions, use early returns.</span>
        </span>
      </span>
    </h2>
    ${stats.top10Complex.length > 0 ? `
    <table>
      <thead><tr><th>File</th><th>Lines</th><th>Complexity</th></tr></thead>
      <tbody>${complexityRows}</tbody>
    </table>` : '<div class="empty">No files found</div>'}
  </div>

  <div class="section">
    <h2>
      <span class="icon" style="background:var(--red)"></span>
      Dead Code — Unused Exports
      <span class="section-info" tabindex="0">ℹ
        <span class="tooltip">
          <strong>Dead Export</strong>
          A symbol exported from a file but never imported anywhere in the project. Likely unused or legacy code.<br>
          <span class="tooltip-fix">✓ Remove the export keyword or delete the code if unused.</span>
        </span>
      </span>
    </h2>
    ${result.deadExports.length > 0 ? `
    <table>
      <thead><tr><th>File</th><th>Export Name</th></tr></thead>
      <tbody>${deadRows}</tbody>
    </table>` : '<div class="empty" style="padding:24px">✅ No dead exports detected</div>'}
  </div>

  <div class="section">
    <h2>
      <span class="icon" style="background:#F59E0B"></span>
      God Files — Oversized Modules
      <span class="section-info" tabindex="0">ℹ
        <span class="tooltip">
          <strong>God File</strong>
          A file with 500+ lines or 15+ imports. It accumulates too many responsibilities — hard to maintain and refactor.<br>
          <span class="tooltip-fix">✓ Split by responsibility. One module = one concern.</span>
        </span>
      </span>
    </h2>
    ${result.godFiles.length > 0 ? `
    <table>
      <thead><tr><th>File</th><th>Lines</th><th>Imports</th><th>Complexity</th></tr></thead>
      <tbody>${godRows}</tbody>
    </table>` : '<div class="empty" style="padding:24px">✅ No god files detected</div>'}
  </div>

  <div class="section">
    <h2>
      <span class="icon" style="background:var(--red)"></span>
      Critical Nodes — High Centrality
      <span class="section-info" tabindex="0">ℹ
        <span class="tooltip">
          <strong>Critical Node</strong>
          A module imported by many other files. Changes here may cause cascading failures across the codebase.<br>
          <span class="tooltip-fix">✓ Avoid adding new logic here. Add thorough unit tests.</span>
        </span>
      </span>
    </h2>
    ${result.criticalFiles.length > 0 ? `
    <table>
      <thead><tr><th>File</th><th>In-Degree</th><th>Out-Degree</th><th>Centrality</th></tr></thead>
      <tbody>${criticalRows}</tbody>
    </table>` : '<div class="empty" style="padding:24px">✅ No critical nodes</div>'}
  </div>

</div>

<div class="footer">
  Generated by <strong>CodePulse CLI</strong> — <a href="https://github.com/codepulse-cli" style="color:var(--accent)">github.com/codepulse-cli</a>
</div>

</body>
</html>`;
}

function calculateHealthScore(
  stats: ReturnType<typeof buildStats>,
  result: AnalysisResult
): number {
  let score = 100;
  score -= Math.min(30, stats.deadExports * 2);
  score -= Math.min(20, stats.godFiles * 5);
  score -= Math.min(20, stats.criticalFiles * 3);
  score -= Math.min(30, Math.max(0, stats.avgComplexity - 5) * 2);
  return Math.max(0, Math.round(score));
}
