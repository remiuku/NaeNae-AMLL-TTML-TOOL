import { describe, expect, it } from "vitest";
import { newLyricLine, newLyricWord } from "$/types/ttml";
import { clearWordTiming } from "./clear-word-timing";

const timed = (word: string) => ({
	...newLyricWord(),
	word,
	startTime: 1000,
	endTime: 2000,
});

describe("clearWordTiming", () => {
	it("clears only the given words", () => {
		const words = [timed("a"), timed("b")];
		const other = { ...newLyricLine(), words: [timed("c")] };
		const document = {
			metadata: [],
			lyricLines: [{ ...newLyricLine(), words }, other],
		};
		const result = clearWordTiming(document, new Set([words[0].id]));
		expect(
			result.lyricLines[0].words.map((w) => [w.startTime, w.endTime]),
		).toEqual([
			[0, 0],
			[1000, 2000],
		]);
		expect(result.lyricLines[1]).toBe(other);
	});

	it("returns the same document when nothing was timed", () => {
		const document = {
			metadata: [],
			lyricLines: [{ ...newLyricLine(), words: [newLyricWord()] }],
		};
		const id = document.lyricLines[0].words[0].id;
		expect(clearWordTiming(document, new Set([id]))).toBe(document);
	});
});
