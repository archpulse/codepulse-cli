import * as fs from "node:fs";
import * as path from "node:path";
import type { AnalysisResult } from "../types/analysis";

export function generateBadge(_result: AnalysisResult, score: number): string {
	const color = score > 90 ? "#10B981" : score > 70 ? "#F59E0B" : "#EF4444";
	const label = "CodePulse";
	const value = `${score}/100`;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="20">
    <linearGradient id="b" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <mask id="a">
      <rect width="130" height="20" rx="3" fill="#fff"/>
    </mask>
    <g mask="url(#a)">
      <path fill="#555" d="M0 0h70v20H0z"/>
      <path fill="${color}" d="M70 0h60v20H70z"/>
      <path fill="url(#b)" d="M0 0h130v20H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
      <text x="35" y="15" fill="#010101" fill-opacity=".3">${label}</text>
      <text x="35" y="14">${label}</text>
      <text x="100" y="15" fill="#010101" fill-opacity=".3">${value}</text>
      <text x="100" y="14">${value}</text>
    </g>
  </svg>`;
}

export function saveBadge(svg: string, dir: string): string {
	const outputPath = path.join(dir, ".codepulse-report", "badge.svg");
	fs.writeFileSync(outputPath, svg);
	return outputPath;
}
