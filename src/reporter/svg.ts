import * as path from "node:path";
import type { AnalysisResult } from "../types/index";

export function buildGraphSvg(result: AnalysisResult): string {
	const nodes = Array.from(result.graph.values()).sort(
		(a, b) => b.inDegree - a.inDegree,
	);
	const width = 1600;
	const height = 900;
	const cx = 800;
	const cy = 450;

	const positions = calculateNodePositions(nodes, cx, cy);
	const lines = renderEdges(result.edges, positions);
	const circles = renderNodes(nodes, result, positions);

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#0F172A">
  <rect x="40" y="40" width="180" height="90" rx="8" fill="#1E293B" fill-opacity="0.6" stroke="#334155" stroke-width="1" />
  <circle cx="55" cy="65" r="4" fill="#EF4444" /><text x="65" y="69" font-size="10" fill="#E2E8F0" font-family="sans-serif">Critical Hub</text>
  <circle cx="55" cy="85" r="4" fill="#F59E0B" /><text x="65" y="89" font-size="10" fill="#E2E8F0" font-family="sans-serif">God File</text>
  <circle cx="55" cy="105" r="4" fill="#6366F1" /><text x="65" y="109" font-size="10" fill="#E2E8F0" font-family="sans-serif">Normal File</text>
  <text x="${width - 40}" y="60" text-anchor="end" font-size="18" font-weight="bold" fill="#475569" font-family="monospace">CodePulse Map</text>
  ${lines}
  ${circles}
</svg>`;
}

function calculateNodePositions(nodes: any[], cx: number, cy: number) {
	const positions = new Map<string, { x: number; y: number }>();

	const layer0 = nodes.slice(0, 3);
	const layer1 = nodes.slice(3, 11);
	const layer2 = nodes.slice(11);

	applyCircularLayout(layer0, positions, cx, cy, 80, -Math.PI / 2);
	applyCircularLayout(layer1, positions, cx, cy, 240, 0);
	applyCircularLayout(layer2, positions, cx, cy, 410, 0.2);

	return positions;
}

function applyCircularLayout(
	layer: any[],
	positions: Map<string, any>,
	cx: number,
	cy: number,
	radius: number,
	offset: number,
) {
	layer.forEach((n, i) => {
		const angle = (2 * Math.PI * i) / (layer.length || 1) + offset;
		positions.set(n.id, {
			x: cx + radius * Math.cos(angle),
			y: cy + radius * Math.sin(angle),
		});
	});
}

function renderEdges(edges: any[], positions: Map<string, any>) {
	let lines = "";
	for (const edge of edges) {
		const from = positions.get(edge.from);
		const to = positions.get(edge.to);
		if (from && to) {
			lines += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#4F46E5" stroke-width="1" stroke-opacity="0.1" />`;
		}
	}
	return lines;
}

function renderNodes(
	nodes: any[],
	result: AnalysisResult,
	positions: Map<string, any>,
) {
	const allBasenames = result.files.map((f) => path.basename(f.relativePath));
	let circles = "";
	for (const n of nodes) {
		const pos = positions.get(n.id);
		if (!pos) continue;
		const file = result.files.find((f) => f.path === n.id);
		const radius = Math.min(8 + n.inDegree * 2.5, 30);
		const color = n.isCritical
			? "#EF4444"
			: file?.isGodFile
				? "#F59E0B"
				: "#6366F1";
		const label = getLabel(file, n.id, allBasenames);

		circles += `
      <g>
        <circle cx="${pos.x}" cy="${pos.y}" r="${radius}" fill="${color}" stroke="#fff" stroke-width="2" />
        <text x="${pos.x}" y="${pos.y + radius + 18}" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff" font-family="sans-serif" style="paint-order: stroke; stroke: #0F172A; stroke-width: 3px;">${label}</text>
      </g>
    `;
	}
	return circles;
}

function getLabel(file: any, id: string, allBasenames: string[]): string {
	let label = path.basename(file?.relativePath || id);
	const isDuplicate = allBasenames.filter((b) => b === label).length > 1;
	if (isDuplicate && file) {
		const parts = file.relativePath.split("/");
		if (parts.length > 1) {
			label = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
		}
	}
	return label;
}
