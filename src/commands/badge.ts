import * as fs from "node:fs";
import * as path from "node:path";
import type { AnalysisResult } from "../types/analysis";
import { calculateConfidenceScore } from "../reporter/stats";

export function generateBadge(result: AnalysisResult, score: number): string {
	const confidence = calculateConfidenceScore(result);
	
	const scoreColor = score > 90 ? "#10B981" : score > 70 ? "#F59E0B" : "#EF4444";
	const confColor = confidence > 85 ? "#3B82F6" : confidence > 60 ? "#F59E0B" : "#EF4444";
	
	const label = "CodePulse";
	const scoreText = `Health: ${score}%`;
	const confText = `Conf: ${confidence}%`;

	// Widths: Label (70), Health (80), Confidence (70) = 220
	return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="20">
    <linearGradient id="b" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <mask id="a">
      <rect width="220" height="20" rx="3" fill="#fff"/>
    </mask>
    <g mask="url(#a)">
      <path fill="#555" d="M0 0h70v20H0z"/>
      <path fill="${scoreColor}" d="M70 0h80v20H70z"/>
      <path fill="${confColor}" d="M150 0h70v20H150z"/>
      <path fill="url(#b)" d="M0 0h220v20H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
      <text x="35" y="15" fill="#010101" fill-opacity=".3">${label}</text>
      <text x="35" y="14">${label}</text>
      
      <text x="110" y="15" fill="#010101" fill-opacity=".3">${scoreText}</text>
      <text x="110" y="14">${scoreText}</text>
      
      <text x="185" y="15" fill="#010101" fill-opacity=".3">${confText}</text>
      <text x="185" y="14">${confText}</text>
    </g>
  </svg>`;
}

export function saveBadge(svg: string, dir: string): string {
	const outputPath = path.join(dir, ".codepulse-report", "badge.svg");
	fs.writeFileSync(outputPath, svg);
	return outputPath;
}
