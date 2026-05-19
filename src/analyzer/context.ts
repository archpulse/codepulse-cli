import * as fs from "node:fs";
import * as path from "node:path";
import type {
	AnalysisCache,
	AnalysisContext,
	FileNode,
} from "../types/analysis";
import type { ProjectConfig } from "../types/config";

export function createEmptyCache(): AnalysisCache {
	return {
		fileNodes: new Map<string, FileNode>(),
	};
}

export function loadConfig(dir: string, options: { strict?: boolean; precision?: boolean | "auto" }): ProjectConfig {
	let config: ProjectConfig = {
		maxComplexity: options.strict ? 10 : 20,
		godFileLines: 500,
		godFileImports: 15,
		criticalNodeThreshold: 10,
		duplicationThreshold: 15,
		exclude: [],
		rootDir: dir,
		precision: options.precision ?? "auto",
	};

	const configPath = path.join(dir, ".codepulse.json");
	if (fs.existsSync(configPath)) {
		try {
			const userConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
			config = { ...config, ...userConfig };
		} catch {
			console.warn("Failed to parse .codepulse.json, using defaults.");
		}
	}
	return config;
}

export function createFastLinterContext(
	filePaths: string[],
	dir: string,
	config: ProjectConfig,
): AnalysisContext {
	return createMinimalContext(filePaths, dir, config);
}

export function createSecurityContext(
	filePaths: string[],
	dir: string,
	config: ProjectConfig,
): AnalysisContext {
	return createMinimalContext(filePaths, dir, config);
}

function createMinimalContext(
	filePaths: string[],
	dir: string,
	config: ProjectConfig,
): AnalysisContext {
	return {
		files: filePaths.map((filePath) => ({
			path: filePath,
			relativePath: path.relative(dir, filePath),
			content: "",
			imports: [],
			exports: [],
			functions: [],
			lines: 0,
			complexity: 0,
			isGodFile: false,
		})),
		graph: new Map(),
		edges: [],
		config,
		circularDependencies: [],
	};
}
