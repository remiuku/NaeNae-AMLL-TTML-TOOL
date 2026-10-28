import { describe, expect, it } from "vitest";
import { newLyricWord } from "$/types/ttml";
import type { SegmentationConfig } from "../types";
import { segmentWord } from "./segmentation";

const config: SegmentationConfig = {
	engine: "basic",
	splitCJK: true,
	splitEnglish: true,
	punctuationWeight: 0.2,
	punctuationMode: "merge",
	removeEmptySegments: true,
	ignoreList: new Set(),
	customRules: new Map(),
	learnedRules: new Map(),
};

const split = (word: string) =>
	segmentWord({ ...newLyricWord(), word }, config).map((part) => part.word);

describe("auto segment keeps quotes and closing marks on their word", () => {
	it.each([
		'sorry,"',
		'"go."',
		'"Why?"',
		"Run!'",
		"“Hello,”",
		"‘over’",
		"'cause",
		"goin'",
	])("%s", (word) => {
		const parts = split(word);
		expect(parts.join("")).toBe(word);
		// No part is only punctuation.
		expect(parts.every((part) => /[\p{L}\p{N}]/u.test(part))).toBe(true);
	});
});
