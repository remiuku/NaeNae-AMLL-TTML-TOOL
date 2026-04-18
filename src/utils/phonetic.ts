import { pinyin as getPinyin } from "pinyin-pro";
import { Romanize } from "hangul-romanize";
import * as wanakana from "wanakana";

export type PhoneticLanguage = "ja" | "zh" | "ko" | "auto";

export async function getPhonetic(text: string, lang: PhoneticLanguage = "auto"): Promise<string> {
	if (!text.trim()) return "";

	let detectedLang = lang;
	if (lang === "auto") {
		detectedLang = detectLanguage(text);
	}

	try {
		switch (detectedLang) {
			case "ja":
			case "zh":
			case "ko": {
				try {
					// 1. Try Google Transliteration API (Dedicated transliteration endpoint)
					const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${detectedLang}&tl=en&dt=rm&q=${encodeURIComponent(text)}`;
					const response = await fetch(url);
					const data = await response.json();
					
					// Transliteration is at data[0][x][3]
					if (data?.[0]) {
						return data[0].map((s: any) => s?.[3] || "").join("");
					}
				} catch (e) {
					console.warn(`${detectedLang} API failed, falling back to local libs`, e);
				}
				
				// 2. Local Fallback
				if (detectedLang === "ja") return wanakana.toRomaji(text);
				if (detectedLang === "zh") return getPinyin(text, { toneType: "none" });
				if (detectedLang === "ko") return Romanize.from(text);
				return "";
			}
			default:
				return "";
		}
	} catch (e) {
		console.error("Phonetic conversion failed", e);
		return "";
	}
}

export async function getPhoneticSyllables(textOrArray: string | string[], lang: PhoneticLanguage = "auto"): Promise<string[]> {
	const originalCapsules = typeof textOrArray === "string" ? textOrArray.split("").filter(c => !/^\s*$/.test(c)) : textOrArray;
	if (originalCapsules.length === 0) return [];
	
	const fullLineText = originalCapsules.join("").replace(/\s+/g, "");
	let detectedLang = lang;
	if (lang === "auto") {
		detectedLang = detectLanguage(fullLineText);
	}

	// 1. Get the ROOT transliteration for the FULL line (captures compound readings like 'Jujutsu')
	const rawLinePhonetic = await getPhonetic(fullLineText, detectedLang);
	const normalizedLinePhonetic = rawLinePhonetic.toLowerCase().replace(/\s+/g, "")
		.replace(/ā/g, "aa").replace(/ī/g, "ii").replace(/ū/g, "uu")
		.replace(/ē/g, "ee").replace(/ō/g, "ou")
		.replace(/[^a-z]/g, "");
	
	// 2. Split it into all possible mora (syllables)
	const masterSyllables = normalizedLinePhonetic
		.replace(/([aeiouy])([aeiouy])/gi, "$1 $2")
		.match(/([^aeiouy ]*[aeiouy]{1}([nm](?![aeiouy]))?|[^aeiouy ]+)/gi) || [normalizedLinePhonetic];

	// 3. Calculate weights based on standalone readings to determine relative length
	const charWeights: number[] = [];
	for (const cap of originalCapsules) {
		const capText = cap.trim().replace(/\s+/g, "");
		if (capText.length === 0) {
			charWeights.push(0);
			continue;
		}
		const rawCapPhonetic = await getPhonetic(capText, detectedLang);
		const capPhonetic = rawCapPhonetic.toLowerCase().replace(/\s+/g, "")
			.replace(/ā/g, "aa").replace(/ī/g, "ii").replace(/ū/g, "uu")
			.replace(/ē/g, "ee").replace(/ō/g, "ou")
			.replace(/[^a-z]/g, "");
			
		const capSyllables = capPhonetic
			.replace(/([aeiouy])([aeiouy])/gi, "$1 $2")
			.match(/([^aeiouy ]*[aeiouy]{1}([nm](?![aeiouy]))?|[^aeiouy ]+)/gi) || ["a"];
		charWeights.push(capSyllables.length);
	}

	const totalWeight = charWeights.reduce((a, b) => a + b, 0);
	const results: string[] = [];
	let syllableIndex = 0;

	for (let i = 0; i < originalCapsules.length; i++) {
		if (charWeights[i] === 0) {
			results.push(originalCapsules[i]);
			continue;
		}

		// Distribute master syllables based on weight ratio
		let charSyllableCount = Math.round((charWeights[i] / totalWeight) * masterSyllables.length);
		if (i === originalCapsules.length - 1 || totalWeight === 0) {
			charSyllableCount = masterSyllables.length - syllableIndex;
		}
		
		charSyllableCount = Math.max(1, charSyllableCount);
		// Keep room for rest
		if (i < originalCapsules.length - 1) {
			const remainingWeight = charWeights.slice(i + 1).reduce((a, b) => a + b, 0);
			if (remainingWeight > 0) {
				charSyllableCount = Math.min(charSyllableCount, masterSyllables.length - syllableIndex - 1);
			}
		}

		const charSyllables = masterSyllables.slice(syllableIndex, syllableIndex + charSyllableCount);
		syllableIndex += charSyllableCount;
		results.push(charSyllables.join("").trim());
	}

	return results;
}

function detectLanguage(text: string): PhoneticLanguage {
	// Japanese: Contains Hiragana or Katakana
	if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return "ja";
	
	// Korean: Contains Hangul
	if (/[\uAC00-\uD7AF]/.test(text)) return "ko";
	
	// Chinese: Contains Hanzi (and we assume it's Chinese if no Japanese indicators found)
	if (/[\u4E00-\u9FA5]/.test(text)) return "zh";
	
	return "auto";
}
