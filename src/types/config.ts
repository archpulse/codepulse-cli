export interface ArchitectureLayer {
	name: string;
	pattern: string; // Regex or Glob pattern
	allowDependenciesFrom?: string[]; // List of layer names
}

export interface ProjectConfig {
	maxComplexity?: number;
	godFileLines?: number;
	godFileImports?: number;
	criticalNodeThreshold?: number;
	duplicationThreshold?: number;
	exclude?: string[];
	rootDir?: string;
	architecture?: {
		layers: ArchitectureLayer[];
		strict?: boolean;
	};
}

export interface ScanOptions {
	dir: string;
	exclude: string[];
	extensions: string[];
	maxFiles?: number;
}
