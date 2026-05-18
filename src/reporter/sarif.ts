import * as fs from "node:fs";
import * as path from "node:path";
import type { AnalysisResult } from "../types/analysis";

export function generateSarif(result: AnalysisResult, baseDir: string): string {
	const sarif = {
		$schema:
			"https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0-rtm.5.json",
		version: "2.1.0",
		runs: [
			{
				tool: {
					driver: {
						name: "CodePulse",
						version: "1.0.3",
						informationUri: "https://github.com/archpulse/codepulse-cli",
						rules: [
							{
								id: "dead-export",
								name: "DeadExport",
								shortDescription: { text: "Unused exported symbol" },
							},
							{
								id: "high-complexity",
								name: "HighComplexity",
								shortDescription: { text: "Function is too complex" },
							},
							{
								id: "god-file",
								name: "GodFile",
								shortDescription: {
									text: "File is too large or has too many imports",
								},
							},
							{
								id: "critical-node",
								name: "CriticalNode",
								shortDescription: { text: "Highly depended-upon module" },
							},
							{
								id: "vulnerability",
								name: "Vulnerability",
								shortDescription: { text: "Security vulnerability" },
							},
							{
								id: "duplication",
								name: "Duplication",
								shortDescription: { text: "Duplicate code detected" },
							},
							{
								id: "dependency-vulnerability",
								name: "DependencyVulnerability",
								shortDescription: {
									text: "Vulnerable dependency in package.json",
								},
							},
						],
					},
				},
				results: result.issues.map((issue) => ({
					ruleId: issue.type,
					level: issue.severity === "error" ? "error" : "warning",
					message: { text: issue.message },
					locations: [
						{
							physicalLocation: {
								artifactLocation: { uri: issue.file },
								region: { startLine: issue.line || 1 },
							},
						},
					],
				})),
			},
		],
	};

	const outputPath = path.join(baseDir, ".codepulse-report", "results.sarif");
	fs.writeFileSync(outputPath, JSON.stringify(sarif, null, 2));
	return outputPath;
}
