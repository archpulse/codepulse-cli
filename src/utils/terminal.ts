import * as os from "node:os";

export function supportsUnicode(): boolean {
	if (os.platform() !== "win32") {
		return true;
	}

	// Modern Windows terminal detection
	return !!(
		process.env.WT_SESSION || // Windows Terminal
		process.env.TERMINAL_EMULATOR === "JetBrains-Jedi" || // JetBrains
		process.env.TERM_PROGRAM === "vscode" || // VS Code
		process.env.TERM === "xterm-256color" || // Modern shells
		process.env.COLORTERM // High-color support often implies Unicode
	);
}

export const SYMBOLS = supportsUnicode()
	? {
			line: "━",
			thinLine: "─",
			check: "✓",
			cross: "✗",
			warn: "⚠",
			fire: "🔥",
			radio: "☢",
			info: "ℹ",
			plus: "+",
			bullet: "•",
			hotspot: "🔴",
			dormant: "🟡",
			io: "🔵",
			error: "✘",
			gear: "⚙",
		}
	: {
			line: "=",
			thinLine: "-",
			check: "v",
			cross: "x",
			warn: "!",
			fire: "*",
			radio: "[!]",
			info: "i",
			plus: "+",
			bullet: "*",
			hotspot: "!",
			dormant: "~",
			io: ">",
			error: "x",
			gear: "*",
		};
