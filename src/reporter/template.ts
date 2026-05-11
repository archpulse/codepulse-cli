import type { AnalysisResult } from "../types/index";
import { calculateHealthScore } from "./stats";
import { getCss, getScripts } from "./template-parts";

const _REPORT_DIR = ".codepulse-report";

const TOOLTIPS = {
	"god-file": {
		title: "God File",
		body: "A file with 500+ lines or 15+ imports. Accumulates too many responsibilities — hard to maintain and refactor.",
		fix: "Split by responsibility, extract modules.",
	},
	"dead-export": {
		title: "Dead Export",
		body: "A symbol exported but never imported anywhere in the project. Likely unused or legacy code.",
		fix: "Remove the export or delete if unused.",
	},
	"critical-node": {
		title: "Critical Node",
		body: "Imported by many modules. Changes here may cause cascading failures across the codebase.",
		fix: "Avoid adding logic here. Add tests as safety net.",
	},
	"high-complexity": {
		title: "High Complexity",
		body: "Cyclomatic complexity > 10. Too many branches and decision points — hard to test and reason about.",
		fix: "Extract conditions into named functions, use early returns.",
	},
	vulnerability: {
		title: "Vulnerability",
		body: "Critical security issue such as hardcoded secrets, code injection (eval), or SQL injection patterns.",
		fix: "Use environment variables for secrets, avoid eval(), use parameterized queries.",
	},
	duplication: {
		title: "Duplication",
		body: "Identical code blocks detected in multiple files. Violates DRY principle.",
		fix: "Extract common logic into shared functions.",
	},
	"dependency-vulnerability": {
		title: "SCA Issue",
		body: "A third-party dependency has a known vulnerability.",
		fix: "Upgrade the package to a secure version.",
	},
	hotspot: {
		title: "Code Hotspot",
		body: "High complexity combined with frequent changes. These are the most likely places for bugs to occur.",
		fix: "Refactor to reduce complexity and decouple logic.",
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

function sectionIcon(type: keyof typeof TOOLTIPS, color: string): string {
	const t = TOOLTIPS[type];
	return `<span class="icon" style="background:${color}"></span>
    ${t.title}s
    <span class="section-info" tabindex="0">ℹ
      <span class="tooltip">
        <strong>${t.title}</strong><br>
        ${t.body}<br>
        <span class="tooltip-fix">✓ ${t.fix}</span>
      </span>
    </span>`;
}

function renderComplexityRows(stats: any): string {
	return stats.top10Complex
		.map((f: any) => {
			const level =
				f.complexity > 20 ? "critical" : f.complexity > 10 ? "warning" : "ok";
			const badge =
				level === "critical"
					? `<span class="badge badge-red">CRITICAL</span>${infoIcon("high-complexity")}`
					: level === "warning"
						? `<span class="badge badge-yellow">WARNING</span>${infoIcon("high-complexity")}`
						: '<span class="badge badge-green">OK</span>';
			return `<tr>
      <td class="td-path">${f.path}</td>
      <td>${f.lines}</td>
      <td>${f.complexity} ${badge}</td>
    </tr>`;
		})
		.join("\n");
}

function renderVulnerabilityRows(stats: any): string {
	return stats.vulnerabilitiesList
		.map(
			(v: any) =>
				`<tr>
      <td class="td-path">${v.file}${v.line ? `:${v.line}` : ""}</td>
      <td style="color:var(--red)">${v.message}</td>
      <td style="font-style:italic;color:var(--muted)">${v.suggestion}</td>
    </tr>`,
		)
		.join("\n");
}

function renderDeadRows(result: AnalysisResult): string {
	return result.deadExports
		.slice(0, 50)
		.map(
			(d) =>
				`<tr><td class="td-path">${d.file}</td><td><code>${d.name}</code></td></tr>`,
		)
		.join("\n");
}

function renderGodRows(stats: any): string {
	return stats.godFilesList
		.map(
			(f: any) =>
				`<tr><td class="td-path">${f.path}</td><td>${f.lines}</td><td>${f.imports}</td><td>${f.complexity}</td></tr>`,
		)
		.join("\n");
}

function renderCriticalRows(result: AnalysisResult): string {
	return result.criticalFiles
		.slice(0, 10)
		.map((n) => {
			const file = result.files.find((f) => f.path === n.id);
			return `<tr>
      <td class="td-path">${file?.relativePath ?? n.id}</td>
      <td>${n.inDegree}</td>
      <td>${n.outDegree}</td>
      <td>${n.centrality}</td>
    </tr>`;
		})
		.join("\n");
}

function renderHotspotRows(stats: any): string {
	return stats.hotspots
		.map(
			(h: any) => `
    <tr>
      <td class="td-path">${h.file}</td>
      <td>${h.complexity}</td>
      <td>${h.churn}</td>
      <td><span style="color:${h.score > 50 ? "var(--red)" : "var(--yellow)"}">${h.score}</span></td>
    </tr>`,
		)
		.join("");
}

export function buildHtml(result: AnalysisResult, stats: any): string {
	const complexityRows = renderComplexityRows(stats);
	const vulnerabilityRows = renderVulnerabilityRows(stats);
	const deadRows = renderDeadRows(result);
	const godRows = renderGodRows(stats);
	const criticalRows = renderCriticalRows(result);
	const hotspotRows = renderHotspotRows(stats);

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CodePulse Report</title>
<style>
${getCss()}
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
      <div class="value" style="color:${stats.avgComplexity > 15 ? "var(--red)" : stats.avgComplexity > 8 ? "var(--yellow)" : "var(--green)"}">${stats.avgComplexity}</div>
      <div class="sub">cyclomatic avg</div>
    </div>
    <div class="stat-card" style="border-color:${stats.vulnerabilities > 0 ? "var(--red)" : "var(--border)"}">
      <div class="label" style="color:${stats.vulnerabilities > 0 ? "var(--red)" : "var(--muted)"}">Vulnerabilities</div>
      <div class="value" style="color:${stats.vulnerabilities > 0 ? "var(--red)" : "var(--green)"}">${stats.vulnerabilities}</div>
      <div class="sub">security issues</div>
    </div>
    <div class="stat-card">
      <div class="label">Hotspots</div>
      <div class="value" style="color:${stats.hotspots.length > 5 ? "var(--red)" : stats.hotspots.length > 0 ? "var(--yellow)" : "var(--green)"}">${stats.hotspots.length}</div>
      <div class="sub">risk zones</div>
    </div>
  </div>

  <div class="grid-4" style="margin-top:-24px">
    <div class="stat-card">
      <div class="label">Dead Exports</div>
      <div class="value" style="color:${stats.deadExports > 0 ? "var(--red)" : "var(--green)"}">${stats.deadExports}</div>
      <div class="sub">unused exports</div>
    </div>
    <div class="stat-card">
      <div class="label">God Files</div>
      <div class="value" style="color:${stats.godFiles > 0 ? "var(--yellow)" : "var(--green)"}">${stats.godFiles}</div>
      <div class="sub">oversized modules</div>
    </div>
    <div class="stat-card">
      <div class="label">Critical Nodes</div>
      <div class="value" style="color:${stats.criticalFiles > 0 ? "var(--red)" : "var(--green)"}">${stats.criticalFiles}</div>
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
    <h2><span class="icon"></span>Project Treemap — Code Density & Complexity</h2>
    <div id="treemap-container" class="graph-container" style="height:500px;background:var(--surface)"></div>
    <div style="font-size:12px;color:var(--muted);margin-top:8px;text-align:right">
      Size = Lines of Code | Color = Complexity (Red is high)
    </div>
  </div>

  <div class="section">
    <h2><span class="icon"></span>Interactive Dependency Graph</h2>
    <div id="graph-container" class="graph-container" style="height:600px;background:#0F172A"></div>
    <div style="font-size:12px;color:var(--muted);margin-top:8px;text-align:right">
      Drag to move | Scroll to zoom | Red = Critical Node
    </div>
  </div>

  <div class="section">
    <h2>
      ${sectionIcon("vulnerability", "var(--red)")}
    </h2>
    ${
			stats.vulnerabilities > 0
				? `
    <table>
      <thead><tr><th>Location</th><th>Issue</th><th>Recommendation</th></tr></thead>
      <tbody>${vulnerabilityRows}</tbody>
    </table>`
				: '<div class="empty" style="padding:24px">✅ No security vulnerabilities detected</div>'
		}
  </div>

  <div class="section">
    <h2>
      ${sectionIcon("hotspot", "#EC4899")}
    </h2>
    ${
			stats.hotspots.length > 0
				? `
    <table>
      <thead><tr><th>File</th><th>Complexity</th><th>Churn (6m)</th><th>Risk Score</th></tr></thead>
      <tbody>${hotspotRows}</tbody>
    </table>`
				: '<div class="empty" style="padding:24px">✅ No hotspots detected</div>'
		}
  </div>

  <div class="section">
    <h2>
      ${sectionIcon("high-complexity", "var(--yellow)")}
    </h2>
    ${
			stats.top10Complex.length > 0
				? `
    <table>
      <thead><tr><th>File</th><th>Lines</th><th>Complexity</th></tr></thead>
      <tbody>${complexityRows}</tbody>
    </table>`
				: '<div class="empty">No files found</div>'
		}
  </div>

  <div class="section">
    <h2>
      ${sectionIcon("dead-export", "var(--red)")}
    </h2>
    ${
			result.deadExports.length > 0
				? `
    <table>
      <thead><tr><th>File</th><th>Export Name</th></tr></thead>
      <tbody>${deadRows}</tbody>
    </table>`
				: '<div class="empty" style="padding:24px">✅ No dead exports detected</div>'
		}
  </div>

  <div class="section">
    <h2>
      ${sectionIcon("god-file", "#F59E0B")}
    </h2>
    ${
			result.godFiles.length > 0
				? `
    <table>
      <thead><tr><th>File</th><th>Lines</th><th>Imports</th><th>Complexity</th></tr></thead>
      <tbody>${godRows}</tbody>
    </table>`
				: '<div class="empty" style="padding:24px">✅ No god files detected</div>'
		}
  </div>

  <div class="section">
    <h2>
      ${sectionIcon("critical-node", "var(--red)")}
    </h2>
    ${
			result.criticalFiles.length > 0
				? `
    <table>
      <thead><tr><th>File</th><th>In-Degree</th><th>Out-Degree</th><th>Centrality</th></tr></thead>
      <tbody>${criticalRows}</tbody>
    </table>`
				: '<div class="empty" style="padding:24px">✅ No critical nodes</div>'
		}
  </div>

</div>

<div class="footer">
  Generated by <strong>CodePulse CLI</strong> — <a href="https://github.com/archpulse/codepulse-cli" style="color:var(--accent)">github.com/archpulse/codepulse-cli</a>
</div>

${getScripts(stats.treemapData, stats.graphData)}
</body>
</html>`;
}
