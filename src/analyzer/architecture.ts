import type { ProjectConfig } from "../types/index";

/**
 * Maps a file path to its architectural layer based on the project configuration.
 */
export function getFileLayer(
	relativePath: string,
	config: ProjectConfig,
): string | undefined {
	if (!config.architecture?.layers) {
		return undefined;
	}

	for (const layer of config.architecture.layers) {
		const regex = new RegExp(layer.pattern);
		if (regex.test(relativePath)) {
			return layer.name;
		}
	}

	return undefined;
}

/**
 * Checks if a dependency from one layer to another is allowed.
 */
export function isDependencyAllowed(
	fromLayer: string,
	toLayer: string,
	config: ProjectConfig,
): boolean {
	if (!config.architecture?.layers) {
		return true;
	}

	const layer = config.architecture.layers.find((l) => l.name === fromLayer);
	if (!layer) return true;

	// If allowedDependenciesFrom is not defined, we assume all are allowed unless strict mode is on
	if (!layer.allowDependenciesFrom) {
		return !config.architecture.strict;
	}

	return layer.allowDependenciesFrom.includes(toLayer);
}
