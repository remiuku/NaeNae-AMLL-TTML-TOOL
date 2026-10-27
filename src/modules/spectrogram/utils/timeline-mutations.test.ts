import { produce } from "immer";
import { beforeEach, describe, expect, it } from "vitest";
import { processSingleLine } from "$/modules/segmentation/utils/segment-processing";
import { lyricLinesAtom } from "$/states/main";
import { globalStore } from "$/states/store";
import { newLyricLine, newLyricWord } from "$/types/ttml";
import {
	commitUpdatedLine,
	getDividerEdge,
	getUpdatedLineForDivider,
	hasOverlappedStart,
	tryFixPartialInitialization,
	tryInitializeZeroTimestampLine,
} from "./timeline-mutations";

const line = {
	...newLyricLine(),
	id: "line",
	startTime: 100,
	endTime: 900,
	words: [
		{ ...newLyricWord(), id: "left", word: "a", startTime: 100, endTime: 500 },
		{ ...newLyricWord(), id: "right", word: "b", startTime: 500, endTime: 900 },
	],
};

beforeEach(() => {
	globalStore.set(lyricLinesAtom, { lyricLines: [line], metadata: [] });
});

describe("Alt-drag gaps", () => {
	it.each([
		["right", 650, 500, 650],
		["left", 350, 350, 500],
	] as const)("previews and commits a gap to the %s", (direction, time, start, end) => {
		const original = processSingleLine(line);
		const preview = getUpdatedLineForDivider(
			original,
			0,
			time,
			true,
			100,
			direction,
		);
		expect(preview.segments.map((segment) => segment.type)).toEqual([
			"word",
			"gap",
			"word",
		]);
		expect(preview.segments[1]).toMatchObject({
			startTime: start,
			endTime: end,
		});
		commitUpdatedLine(preview);
		const committed = processSingleLine(
			globalStore.get(lyricLinesAtom).lyricLines[0],
		);
		expect(
			committed.segments.map(({ type, startTime, endTime }) => ({
				type,
				startTime,
				endTime,
			})),
		).toEqual(
			preview.segments.map(({ type, startTime, endTime }) => ({
				type,
				startTime,
				endTime,
			})),
		);
		expect(original.segments[0].endTime).toBe(500);
		expect(original.segments[1].startTime).toBe(500);
	});

	it.each([
		["right", 350],
		["left", 650],
	] as const)("does not flip the locked %s side when crossing the initial boundary", (direction, time) => {
		const original = processSingleLine(line);
		expect(
			getUpdatedLineForDivider(original, 0, time, true, 100, direction),
		).toEqual(original);
	});

	it("clamps gap creation to the minimum word duration", () => {
		const preview = getUpdatedLineForDivider(
			processSingleLine(line),
			0,
			9999,
			true,
			100,
			"right",
		);
		expect(preview.segments[1]).toMatchObject({ type: "gap", endTime: 890 });
		expect(preview.segments[2]).toMatchObject({ startTime: 890, endTime: 900 });
	});

	it("resizes an existing virtual gap instead of creating a duplicate", () => {
		const withGap = produce(line, (draft) => {
			draft.words[1].startTime = 600;
		});
		const preview = getUpdatedLineForDivider(
			processSingleLine(withGap),
			0,
			400,
			true,
		);
		expect(
			preview.segments.filter((segment) => segment.type === "gap"),
		).toHaveLength(1);
		expect(preview.segments[1]).toMatchObject({ startTime: 400, endTime: 600 });
	});

	it("keeps normal divider and line boundary drags working", () => {
		const original = processSingleLine(line);
		const divider = getUpdatedLineForDivider(original, 0, 600, false);
		expect(divider.segments[0].endTime).toBe(600);
		expect(divider.segments[1].startTime).toBe(600);
		expect(divider.segments).toHaveLength(2);
		expect(getUpdatedLineForDivider(original, -1, 200, true).startTime).toBe(
			200,
		);
		expect(getUpdatedLineForDivider(original, 1, 800, true).endTime).toBe(800);
	});
});

describe("overlapping words", () => {
	const overlapping = {
		...newLyricLine(),
		id: "bg",
		isBG: true,
		startTime: 1000,
		endTime: 2500,
		words: [
			{
				...newLyricWord(),
				id: "a",
				word: "ooh",
				startTime: 1000,
				endTime: 2000,
			},
			{
				...newLyricWord(),
				id: "b",
				word: "ah",
				startTime: 1500,
				endTime: 2500,
			},
		],
	};
	const words = (l: ReturnType<typeof processSingleLine>) =>
		l.segments
			.filter((s) => s.type === "word")
			.map((s) => [s.id, s.startTime, s.endTime]);

	it("gives the overlap its own end and start handles", () => {
		const { segments } = processSingleLine(overlapping);
		expect(getDividerEdge(segments, 0, overlapping.endTime)).toBe("end");
		expect(hasOverlappedStart(segments, 1)).toBe(true);
		expect(getDividerEdge(segments, 1, overlapping.endTime)).toBe("shared");
	});

	it("stretches one word's end without moving the overlapped word", () => {
		const original = processSingleLine(overlapping);
		const preview = getUpdatedLineForDivider(
			original,
			0,
			2200,
			false,
			100,
			null,
			"end",
		);
		expect(words(preview)).toEqual([
			["a", 1000, 2200],
			["b", 1500, 2500],
		]);
		expect(preview.endTime).toBe(2500);
	});

	it("moves an overlapped word's start on its own", () => {
		const original = processSingleLine(overlapping);
		const preview = getUpdatedLineForDivider(
			original,
			0,
			1300,
			false,
			100,
			null,
			"start",
		);
		expect(words(preview)).toEqual([
			["a", 1000, 2000],
			["b", 1300, 2500],
		]);
		expect(preview.startTime).toBe(1000);
	});

	it("extends the line when the word that ends it is stretched", () => {
		const nested = {
			...overlapping,
			endTime: 3000,
			words: [
				{ ...overlapping.words[0], endTime: 3000 },
				{ ...overlapping.words[1], endTime: 2000 },
			],
		};
		const original = processSingleLine(nested);
		// The nested word must not open a phantom gap over the longer one.
		expect(original.segments.map((s) => s.type)).toEqual(["word", "word"]);
		expect(getDividerEdge(original.segments, 1, nested.endTime)).toBe("end");
		const preview = getUpdatedLineForDivider(
			original,
			0,
			3400,
			false,
			100,
			null,
			"end",
		);
		expect(preview.endTime).toBe(3400);
		const shrunk = getUpdatedLineForDivider(
			original,
			0,
			1800,
			false,
			100,
			null,
			"end",
		);
		expect(shrunk.endTime).toBe(2000);
	});
});

describe("draft line timing", () => {
	it("initializes words evenly in integer ms", () => {
		const original = {
			...newLyricLine(),
			words: [
				{
					...newLyricWord(),
					word: "a",
				},
				{ ...newLyricWord(), word: " " },
				{
					...newLyricWord(),
					word: "long",
				},
			],
		};
		const result = produce(original, (draft) => {
			expect(tryInitializeZeroTimestampLine(draft, 100, 105)).toBe(true);
		});
		expect(result.words.map((word) => [word.startTime, word.endTime])).toEqual([
			[100, 103],
			[103, 103],
			[103, 105],
		]);
		expect(original.words[0].startTime).toBe(0);
	});
	it("repairs an anchor and following zero-time words without fractional ms", () => {
		const original = {
			...newLyricLine(),
			words: [
				{ ...newLyricWord(), word: "a", startTime: 100, endTime: 105 },
				{ ...newLyricWord(), word: " " },
				{ ...newLyricWord(), word: "b" },
				{ ...newLyricWord(), word: "c" },
			],
		};
		const result = produce(original, (draft) => {
			expect(tryFixPartialInitialization(draft)).toBe(true);
		});
		expect(result.words.map((word) => [word.startTime, word.endTime])).toEqual([
			[100, 102],
			[102, 102],
			[102, 103],
			[103, 105],
		]);
	});
});
