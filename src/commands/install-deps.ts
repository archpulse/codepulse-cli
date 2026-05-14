import { execSync } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { scanFiles } from "../analyzer/scanner";

type PackageManager =
	| "apt-get"
	| "pacman"
	| "dnf"
	| "zypper"
	| "apk"
	| "brew"
	| "choco";

function getLinuxPackageManager(): PackageManager | null {
	if (isCommandAvailable("apt-get")) return "apt-get";
	if (isCommandAvailable("pacman")) return "pacman";
	if (isCommandAvailable("dnf")) return "dnf";
	if (isCommandAvailable("zypper")) return "zypper";
	if (isCommandAvailable("apk")) return "apk";
	return null;
}

const INSTALL_COMMANDS: Record<PackageManager, (pkg: string) => string> = {
	"apt-get": (pkg) => `sudo apt-get install ${pkg} -y`,
	pacman: (pkg) => `sudo pacman -S ${pkg} --noconfirm`,
	dnf: (pkg) => `sudo dnf install ${pkg} -y`,
	zypper: (pkg) => `sudo zypper install -y ${pkg}`,
	apk: (pkg) => `sudo apk add ${pkg}`,
	brew: (pkg) => `brew install ${pkg}`,
	choco: (pkg) => `choco install ${pkg} -y`,
};

// Map generic tool names to distro-specific package names if they differ
const PACKAGE_MAP: Record<string, Partial<Record<PackageManager, string>>> = {
	ruff: { apk: "ruff" },
	cppcheck: { apk: "cppcheck" },
	shellcheck: { apk: "shellcheck" },
	"golangci-lint": {
		pacman: "golangci-lint",
		brew: "golangci-lint",
		choco: "golangci-lint",
	},
	luacheck: { "apt-get": "lua-check", pacman: "luacheck" },
};

interface ToolDef {
	key: string;
	name: string;
	checkCmd: string;
	extensions: string[];
	install: (pm: PackageManager | null) => void;
}

const TOOLS: ToolDef[] = [
	{
		key: "oxlint",
		name: "Oxlint (JS/TS)",
		checkCmd: "oxlint",
		extensions: [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"],
		install: () =>
			installTool("Oxlint (JS/TS)", "npm install -g oxlint", "oxlint"),
	},
	{
		key: "ruff",
		name: "Ruff (Python)",
		checkCmd: "ruff",
		extensions: [".py"],
		install: (pm) => {
			const ruffPkg = getPkgName("ruff", pm);
			if (pm && ruffPkg && (pm !== "apt-get" || isCommandAvailable("ruff"))) {
				installTool("Ruff (Python)", INSTALL_COMMANDS[pm](ruffPkg), "ruff");
			} else if (isCommandAvailable("pip")) {
				installTool("Ruff (Python)", "pip install ruff", "ruff");
			}
		},
	},
	{
		key: "cppcheck",
		name: "Cppcheck (C/C++)",
		checkCmd: "cppcheck",
		extensions: [".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx"],
		install: (pm) => {
			const cppPkg = getPkgName("cppcheck", pm);
			if (pm && cppPkg)
				installTool(
					"Cppcheck (C/C++)",
					INSTALL_COMMANDS[pm](cppPkg),
					"cppcheck",
				);
		},
	},
	{
		key: "shellcheck",
		name: "ShellCheck (Shell)",
		checkCmd: "shellcheck",
		extensions: [".sh", ".bash", ".zsh", ".ksh"],
		install: (pm) => {
			const shPkg = getPkgName("shellcheck", pm);
			if (pm && shPkg)
				installTool(
					"ShellCheck (Shell)",
					INSTALL_COMMANDS[pm](shPkg),
					"shellcheck",
				);
		},
	},
	{
		key: "golangci-lint",
		name: "GolangCI-Lint (Go)",
		checkCmd: "golangci-lint",
		extensions: [".go"],
		install: (pm) => {
			const goPkg = getPkgName("golangci-lint", pm);
			if (pm && goPkg && pm !== "apt-get") {
				installTool(
					"GolangCI-Lint (Go)",
					INSTALL_COMMANDS[pm](goPkg),
					"golangci-lint",
				);
			} else if (isCommandAvailable("go")) {
				installTool(
					"GolangCI-Lint (Go)",
					"go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest",
					"golangci-lint",
				);
			}
		},
	},
	{
		key: "luacheck",
		name: "Luacheck (Lua)",
		checkCmd: "luacheck",
		extensions: [".lua"],
		install: (pm) => {
			const luaPkg = getPkgName("luacheck", pm);
			if (isCommandAvailable("luarocks")) {
				installTool("Luacheck (Lua)", "luarocks install luacheck", "luacheck");
			} else if (pm && luaPkg) {
				installTool("Luacheck (Lua)", INSTALL_COMMANDS[pm](luaPkg), "luacheck");
			}
		},
	},
];

const ALL_TOOL_EXTENSIONS = Array.from(
	new Set(TOOLS.flatMap((tool) => tool.extensions)),
);

function getToolInstallers(pm: PackageManager | null) {
	return TOOLS.map((t) => ({
		...t,
		install: () => t.install(pm),
	}));
}

function getToolInstallersForTools(pm: PackageManager | null, tools: ToolDef[]) {
	return tools.map((t) => ({
		...t,
		install: () => t.install(pm),
	}));
}

function preAuthenticateSudo() {
	console.log(
		chalk.yellow("  ! This may require administrator privileges (sudo)."),
	);
	try {
		execSync("sudo -v", { stdio: "inherit" });
	} catch (_e) {
		console.log(
			chalk.red("  ✗ Sudo authentication failed. Skipping system packages."),
		);
	}
}

function getPackageManager(): PackageManager | null {
	const platform = os.platform();
	if (platform === "win32") {
		return isCommandAvailable("choco") ? "choco" : null;
	}
	if (platform === "darwin") {
		return isCommandAvailable("brew") ? "brew" : null;
	}
	return getLinuxPackageManager();
}

export async function runInstallDeps(isFirstRun = false) {
	const pm = getPackageManager();
	const missingTools = TOOLS.filter((t) => !isCommandAvailable(t.checkCmd));

	if (missingTools.length === 0) {
		if (!isFirstRun)
			console.log(
				chalk.green("\n  ✓ All linter dependencies are already installed.\n"),
			);
		return;
	}

	console.log(
		chalk.bold.cyan(
			`\n  ${isFirstRun ? "First-run:" : ""} Installing Linter Dependencies`,
		),
	);
	console.log(
		chalk.gray(
			`  CodePulse will now install: ${missingTools.map((t) => t.name).join(", ")}\n`,
		),
	);

	const platform = os.platform();
	if ((platform === "linux" || platform === "darwin") && pm && pm !== "brew") {
		preAuthenticateSudo();
	}

	for (const t of getToolInstallers(pm)) {
		t.install();
	}

	console.log(chalk.green.bold("\n  ✓ Dependency installation complete!\n"));

	if (platform === "win32") {
		console.log(
			chalk.cyan(
				"  Note: On Windows, you may need to restart your terminal to use newly installed Chocolatey packages.\n",
			),
		);
	}
}

export async function runInstallDepsForProject(
	dir: string,
	isFirstRun = false,
) {
	const pm = getPackageManager();
	const projectTools = detectProjectTools(dir);
	const missingTools = projectTools.filter(
		(t) => !isCommandAvailable(t.checkCmd),
	);

	if (missingTools.length === 0) {
		if (!isFirstRun) {
			console.log(
				chalk.green(
					"\n  ✓ No missing project-specific linter dependencies found.\n",
				),
			);
		}
		return;
	}

	console.log(
		chalk.bold.cyan(
			`\n  ${isFirstRun ? "First-run:" : ""} Installing Project Linter Dependencies`,
		),
	);
	console.log(
		chalk.gray(
			`  CodePulse will now install: ${missingTools.map((t) => t.name).join(", ")}\n`,
		),
	);

	const platform = os.platform();
	if ((platform === "linux" || platform === "darwin") && pm && pm !== "brew") {
		preAuthenticateSudo();
	}

	for (const t of getToolInstallersForTools(pm, missingTools)) {
		t.install();
	}

	console.log(chalk.green.bold("\n  ✓ Project dependency installation complete!\n"));
}

export function detectProjectTools(dir: string): ToolDef[] {
	const supportedFiles = scanFiles({
		dir,
		extensions: ALL_TOOL_EXTENSIONS,
		exclude: [],
	});
	if (supportedFiles.length === 0) return [];

	const required = new Set<string>();
	for (const filePath of supportedFiles) {
		const ext = path.extname(filePath).toLowerCase();
		for (const tool of TOOLS) {
			if (tool.extensions.includes(ext)) {
				required.add(tool.key);
			}
		}
	}

	return TOOLS.filter((tool) => required.has(tool.key));
}

function getPkgName(tool: string, pm: PackageManager | null): string | null {
	if (!pm) return null;
	return PACKAGE_MAP[tool]?.[pm] || tool;
}

function isCommandAvailable(cmd: string): boolean {
	try {
		const checkCmd = os.platform() === "win32" ? "where" : "which";
		execSync(`${checkCmd} ${cmd}`, { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

function installTool(name: string, command: string, checkCmd: string) {
	if (isCommandAvailable(checkCmd)) {
		return;
	}

	const spinner = ora(`Installing ${name}...`).start();
	try {
		// For sudo commands, we need to allow interaction if sudo -v hasn't cached it
		// But since we ran sudo -v, this should be silent
		execSync(command, { stdio: "ignore" });
		spinner.succeed(chalk.green(`Installed ${name}`));
	} catch (_err: any) {
		spinner.fail(
			chalk.red(
				`Failed to install ${name}. Try manually: ${chalk.white(command)}`,
			),
		);
	}
}
