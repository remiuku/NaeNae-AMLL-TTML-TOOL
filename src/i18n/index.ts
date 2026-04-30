import resources from "virtual:i18next-loader";
import i18n from "i18next";
import ICU from "i18next-icu";
import { initReactI18next } from "react-i18next";

type TranslationResource = typeof resources;

const LOLCAT_LOCALE = "lolcat";
const ENGLISH_LOCALE = "en-US";

const uwuifyText = (text: string): string =>
	text.replace(/\{[^}]+\}|[^{}]+/g, (segment: string) => {
		if (segment.startsWith("{")) return segment;

		return segment
			.replace(/[rRlL]/g, (char) => (char === char.toUpperCase() ? "W" : "w"))
			.replace(/n([aeiou])/gi, (_match, vowel: string) => `ny${vowel}`)
			.replace(/ove/gi, (match: string) => (match === match.toUpperCase() ? "UVE" : "uve"));
	});

const buildLolcatLocale = (value: unknown): unknown => {
	if (typeof value === "string") return uwuifyText(value);
	if (Array.isArray(value)) return value.map((item) => buildLolcatLocale(item));
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, nested]) => [key, buildLolcatLocale(nested)]),
		);
	}
	return value;
};

if (!(LOLCAT_LOCALE in resources)) {
	(resources as Record<string, { translation: unknown }>)[LOLCAT_LOCALE] = {
		translation: buildLolcatLocale(
			(resources as Record<string, { translation: unknown }>)[ENGLISH_LOCALE]?.translation ??
				(resources as Record<string, { translation: unknown }>)["en"]?.translation,
		),
	};
}

console.log("Locale Resources", resources);

declare module "i18next" {
	// Extend CustomTypeOptions
	interface CustomTypeOptions {
		// Extend the resources type to include all our translation keys
		resources: {
			translation: TranslationResource;
		};
		// Add defaultNS type
		defaultNS: "translation";
		// Add returnNull type
		returnNull: false;
		// Define allowed keys for translations
		allowedKeys: keyof TranslationResource;
	}
}

i18n
	.use(initReactI18next) // passes i18n down to react-i18next
	.use(ICU)
	.init({
		resources,
		debug: import.meta.env.DEV,
		fallbackLng: "en-US",
		interpolation: {
			escapeValue: false, // react already safes from xss
		},
		returnNull: false,
	})
	.then(() =>
		i18n.changeLanguage(localStorage.getItem("language") || navigator.language),
	);

export default i18n;
