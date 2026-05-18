import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export type Locale = "en" | "ua" | "cs" | "ko" | "ru" | "de" | "fr";

const SETTINGS_DIR = path.join(os.homedir(), ".gemini", "tmp", "codepulse-cli");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");

let currentLocale: Locale = loadSavedLocale();
let translations: Record<string, string> = {};

function loadSavedLocale(): Locale {
	if (fs.existsSync(SETTINGS_FILE)) {
		try {
			const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
			if (settings.locale) return settings.locale as Locale;
		} catch {
			// Ignore
		}
	}
	return "en";
}

export function setLocale(locale: Locale): void {
	currentLocale = locale;
	loadTranslations();
	
	// Persist
	try {
		if (!fs.existsSync(SETTINGS_DIR)) {
			fs.mkdirSync(SETTINGS_DIR, { recursive: true });
		}
		const settings = fs.existsSync(SETTINGS_FILE) 
			? JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")) 
			: {};
		settings.locale = locale;
		fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
	} catch {
		// Ignore persistence errors
	}
}

export function getLocale(): Locale {
	return currentLocale;
}

function loadTranslations(): void {
	// Use absolute path from project root or relative to __dirname
	const localePath = path.resolve(
		__dirname,
		"..",
		"locales",
		`${currentLocale}.json`,
	);

	if (fs.existsSync(localePath)) {
		try {
			translations = JSON.parse(fs.readFileSync(localePath, "utf-8"));
		} catch {
			translations = {};
		}
	}
}

export function t(
	key: string,
	variables?: Record<string, string | number>,
): string {
	let text = translations[key] || key;
	if (variables) {
		Object.entries(variables).forEach(([name, value]) => {
			text = text.replace(`{${name}}`, String(value));
		});
	}
	return text;
}

// Initial load
loadTranslations();
