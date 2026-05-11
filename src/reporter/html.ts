import * as fs from "node:fs";
import * as path from "node:path";
import type { AnalysisResult } from "../types/index";
import { buildStats } from "./stats";
import { buildGraphSvg } from "./svg";
import { buildHtml } from "./template";

const REPORT_DIR = ".codepulse-report";

export function generateReport(
	result: AnalysisResult,
	baseDir: string,
): string {
	const reportPath = path.join(baseDir, REPORT_DIR);
	fs.mkdirSync(reportPath, { recursive: true });

	const stats = buildStats(result);
	fs.writeFileSync(
		path.join(reportPath, "stats.json"),
		JSON.stringify(stats, null, 2),
	);

	const svg = buildGraphSvg(result);
	fs.writeFileSync(path.join(reportPath, "graph.svg"), svg);

	const html = buildHtml(result, stats);
	fs.writeFileSync(path.join(reportPath, "index.html"), html);

	return reportPath;
}
