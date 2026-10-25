import { describe, expect, it } from "vitest";
import { newLyricLine, newLyricWord } from "$/types/ttml";
import { buildCueIndex, cueAt } from "./model";

const word = (startTime: number, endTime: number, text = "word") => ({
	...newLyricWord(),
	startTime,
	endTime,
	word: text,
});
const line = (...words: ReturnType<typeof word>[]) => ({
	...newLyricLine(),
	words: words.flatMap((item, index) =>
		index === 0 ? [item] : [{ ...newLyricWord(), word: " " }, item],
	),
});

describe("word timing cue index", () => {
	it("accepts a word at zero, skips invalid/empty/untimed and background or line timings", () => {
		const index = buildCueIndex([
			line(
				word(0, 100),
				word(0, 0),
				word(100, 50),
				word(NaN, 200),
				word(100, 200, " "),
			),
			{ ...line(word(300, 400)), isBG: true },
			{ ...line(word(400, 500)), isLineSynced: true },
			{ ...line(word(500, 600)), ignoreSync: true },
		]);
		expect(index.words).toEqual([{ start: 0, end: 100, boundaries: [] }]);
	});
	it("goes dark at the exact end and finds the next word across gaps and seeks", () => {
		const index = buildCueIndex([line(word(300, 400), word(0, 100))]);
		expect(cueAt(index, 50).progress).toBe(0.5);
		expect(cueAt(index, 100)).toMatchObject({
			active: undefined,
			progress: 0,
			next: { start: 300 },
		});
		expect(cueAt(index, 350).progress).toBe(0.5);
		expect(cueAt(index, 10).progress).toBe(0.1);
		expect(cueAt(index, 400)).toMatchObject({
			active: undefined,
			next: undefined,
		});
	});
	it("keeps a long overlapping word active after a later short word finishes", () => {
		const index = buildCueIndex([
			line(word(0, 1000), word(100, 200), word(300, 400)),
		]);
		expect(cueAt(index, 150).active?.start).toBe(100);
		expect(cueAt(index, 250).active?.start).toBe(0);
		expect(cueAt(index, 400).active?.start).toBe(0);
	});
	it("coalesces identical boundaries while preserving simultaneous end and start", () => {
		const index = buildCueIndex([
			line(word(0, 100), word(0, 100), word(100, 200)),
		]);
		expect(index.boundaries.filter((b) => b.timeMs === 100)).toEqual([
			{ timeMs: 100, kind: "end" },
			{ timeMs: 100, kind: "start" },
		]);
	});
});
