import * as fs from "node:fs";
import * as path from "node:path";

export type Locale = "en" | "ua" | "cs" | "ko" | "ru" | "de" | "fr";

let currentLocale: Locale = "en";
let translations: Record<string, string> = {};

export function setLocale(locale: Locale): void {
	currentLocale = locale;
	loadTranslations();
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
		} catch (_err) {
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
