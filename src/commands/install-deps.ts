import { execSync } from "node:child_process";
import * as os from "node:os";
import chalk from "chalk";
import ora from "ora";

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

function getToolInstallers(pm: PackageManager | null) {
	return [
		{
			name: "Biome (JS/TS)",
			checkCmd: "biome",
			install: () =>
				installTool("Biome (JS/TS)", "npm install -g @biomejs/biome", "biome"),
		},
		{
			name: "Ruff (Python)",
			checkCmd: "ruff",
			install: () => {
				const ruffPkg = getPkgName("ruff", pm);
				if (pm && ruffPkg && (pm !== "apt-get" || isCommandAvailable("ruff"))) {
					installTool("Ruff (Python)", INSTALL_COMMANDS[pm](ruffPkg), "ruff");
				} else if (isCommandAvailable("pip")) {
					installTool("Ruff (Python)", "pip install ruff", "ruff");
				}
			},
		},
		{
			name: "Cppcheck (C/C++)",
			checkCmd: "cppcheck",
			install: () => {
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
			name: "ShellCheck (Shell)",
			checkCmd: "shellcheck",
			install: () => {
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
			name: "GolangCI-Lint (Go)",
			checkCmd: "golangci-lint",
			install: () => {
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
			name: "Luacheck (Lua)",
			checkCmd: "luacheck",
			install: () => {
				const luaPkg = getPkgName("luacheck", pm);
				if (isCommandAvailable("luarocks")) {
					installTool(
						"Luacheck (Lua)",
						"luarocks install luacheck",
						"luacheck",
					);
				} else if (pm && luaPkg) {
					installTool(
						"Luacheck (Lua)",
						INSTALL_COMMANDS[pm](luaPkg),
						"luacheck",
					);
				}
			},
		},
	];
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

export async function runInstallDeps(isFirstRun = false) {
	const platform = os.platform();
	const isWin = platform === "win32";
	const isMac = platform === "darwin";
	const isLinux = platform === "linux";

	const pm = isWin
		? isCommandAvailable("choco")
			? "choco"
			: null
		: isMac
			? isCommandAvailable("brew")
				? "brew"
				: null
			: getLinuxPackageManager();

	// Check if anything needs to be installed
	const tools = [
		{ name: "Biome (JS/TS)", cmd: "biome" },
		{ name: "Ruff (Python)", cmd: "ruff" },
		{ name: "Cppcheck (C/C++)", cmd: "cppcheck" },
		{ name: "ShellCheck (Shell)", cmd: "shellcheck" },
		{ name: "GolangCI-Lint (Go)", cmd: "golangci-lint" },
		{ name: "Luacheck (Lua)", cmd: "luacheck" },
	];

	const missingTools = tools.filter((t) => !isCommandAvailable(t.cmd));
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

	// On Linux/Mac, pre-authenticate sudo to avoid multiple prompts inside spinners
	if ((isLinux || isMac) && pm && pm !== "brew") {
		preAuthenticateSudo();
	}

	const toolInstallers = getToolInstallers(pm);

	for (const t of toolInstallers) {
		t.install();
	}

	console.log(chalk.green.bold("\n  ✓ Dependency installation complete!\n"));

	if (isWin) {
		console.log(
			chalk.cyan(
				"  Note: On Windows, you may need to restart your terminal to use newly installed Chocolatey packages.\n",
			),
		);
	}
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
