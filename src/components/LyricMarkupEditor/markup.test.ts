import { describe, expect, it } from "vitest";
import { textToLines } from "$/modules/project/logic/text-to-lines";
import { buildDecorationSpecs } from "./decorations";
import {
	headerWithCategory,
	type LyricMarkupFormat,
	parseMarkup,
} from "./markup";

const FORMAT: LyricMarkupFormat = {
	mode: "lyric",
	lineSeparatorMode: "interleaved-line",
	lineSeparator: "|",
	swapTransAndRoman: false,
	wordSeparator: "\\",
	enableSpecialPrefix: true,
	bgLyricPrefix: "<",
	duetLyricPrefix: ">",
	makeSections: true,
};

const SAMPLE = `[Intro]
Ooh
<Yeah
[Verse 1: Singer]
Hel\\lo\\ \\beau\\ti\\ful\\ \\world
>Duet\\ \\line
  indented
[Mystery thing]`;

const rows = (text: string) => text.split("\n");

describe("lyric markup parsing", () => {
	it("tiles every line exactly, so the text round-trips", () => {
		const formats: LyricMarkupFormat[] = [
			FORMAT,
			{ ...FORMAT, makeSections: false },
			{ ...FORMAT, mode: "lyric-trans" },
			{
				...FORMAT,
				mode: "lyric-trans-roman",
				lineSeparatorMode: "same-line-separator",
			},
			{ ...FORMAT, wordSeparator: "" },
		];
		const texts = [SAMPLE, "Hi|Hallo|Hai\nBye||\n\n|x", "a\\\\b\n\\\n<\n>"];
		for (const format of formats) {
			for (const text of texts) {
				const lines = parseMarkup(text, format);
				expect(lines).toHaveLength(rows(text).length);
				lines.forEach((line, index) => {
					const row = rows(text)[index];
					let position = 0;
					for (const span of line.spans) {
						expect(span.from).toBe(position);
						expect(span.to).toBeGreaterThan(span.from);
						position = span.to;
					}
					expect(position).toBe(row.length);
					expect(
						line.spans.map((span) => row.slice(span.from, span.to)).join(""),
					).toBe(row);
				});
			}
		}
	});

	it("reads kinds and categories the way the importer does", () => {
		const lines = parseMarkup(SAMPLE, FORMAT);
		expect(
			lines.map((line) =>
				line.category ? `${line.kind}:${line.category}` : line.kind,
			),
		).toEqual([
			"section:intro",
			"lyric",
			"background",
			"section:verse",
			"lyric",
			"duet",
			"lyric",
			"section:other",
		]);
		const imported = textToLines(SAMPLE, {
			sectionHeaders: "categorize",
			wordSeparator: "\\",
			backgroundPrefix: "<",
			duetPrefix: ">",
		});
		expect(
			imported.map((line) =>
				line.isBG ? "background" : line.isDuet ? "duet" : "lyric",
			),
		).toEqual(
			lines.filter((line) => line.kind !== "section").map((line) => line.kind),
		);
		expect(
			parseMarkup(SAMPLE, { ...FORMAT, makeSections: false })[0].kind,
		).toBe("removedHeader");
	});

	it("marks syllable splits and the marks next to spaces", () => {
		const [, , , , line] = parseMarkup(SAMPLE, FORMAT);
		const row = rows(SAMPLE)[4];
		expect(
			line.spans.map((span) => `${span.type}:${row.slice(span.from, span.to)}`),
		).toEqual([
			"text:Hel",
			"split:\\",
			"text:lo",
			"spaceMark:\\",
			"text: ",
			"spaceMark:\\",
			"text:beau",
			"split:\\",
			"text:ti",
			"split:\\",
			"text:ful",
			"spaceMark:\\",
			"text: ",
			"spaceMark:\\",
			"text:world",
		]);
	});

	it("ignores prefixes when line prefixes are off", () => {
		const lines = parseMarkup("<Yeah\n>Hey", {
			...FORMAT,
			enableSpecialPrefix: false,
		});
		expect(lines.map((line) => line.kind)).toEqual(["lyric", "lyric"]);
		expect(
			parseMarkup("~~Yeah", { ...FORMAT, bgLyricPrefix: "~~" })[0].kind,
		).toBe("background");
	});

	it("shows a translation row lost to a missing line instead of shifting quietly", () => {
		const format = { ...FORMAT, mode: "lyric-trans" as const };
		const lines = parseMarkup("Hello\nHallo\n\nOrphan\nBye\n", format);
		expect(lines.map((line) => [line.kind, line.warning])).toEqual([
			["lyric", undefined],
			["translation", undefined],
			["blank", undefined],
			["translation", "dropped"],
			["lyric", undefined],
			["translation", "missingTranslation"],
		]);
	});

	it("reads same-line translations and flags missing parts", () => {
		const format: LyricMarkupFormat = {
			...FORMAT,
			mode: "lyric-trans-roman",
			lineSeparatorMode: "same-line-separator",
		};
		const [full, short] = parseMarkup("Hi|Hallo|Hai\nBye|Tschüss", format);
		expect(full.warning).toBeUndefined();
		expect(
			full.spans
				.filter((span) => span.type === "subSeparator")
				.map((span) => span.sub),
		).toEqual(["translation", "romanization"]);
		expect(short.warning).toBe("missingRomanization");
	});
});

describe("lyric markup decorations", () => {
	const decorate = (text: string, revealed: number[] = []) => {
		const lines = parseMarkup(text, FORMAT);
		const starts: number[] = [];
		let offset = 0;
		for (const row of rows(text)) {
			starts.push(offset);
			offset += row.length + 1;
		}
		return buildDecorationSpecs(
			lines,
			starts,
			new Set(revealed),
			lines.keys(),
			(from, to) => text.slice(from, to),
		);
	};

	it("draws pills, dots and hides prefixes and space marks", () => {
		const specs = decorate("[Chorus]\n<Hel\\lo\\ \\you");
		expect(specs).toEqual([
			{ type: "line", from: 0, className: "lm-section" },
			{ type: "header", from: 0, to: 8, category: "chorus", label: "Chorus" },
			{ type: "line", from: 9, className: "lm-background" },
			{ type: "hide", from: 9, to: 10 },
			{ type: "dot", from: 13, to: 14 },
			{ type: "hide", from: 16, to: 17 },
			{ type: "hide", from: 18, to: 19 },
		]);
		// Every position is in order, as the editor requires.
		const froms = specs.map((spec) => spec.from);
		expect([...froms].sort((a, b) => a - b)).toEqual(froms);
	});

	it("shows raw symbols on revealed lines but keeps their style", () => {
		expect(decorate("[Chorus]\n<Hel\\lo", [1])).toEqual([
			{ type: "line", from: 0, className: "lm-section" },
			{ type: "header", from: 0, to: 8, category: "chorus", label: "Chorus" },
			{ type: "line", from: 9, className: "lm-background" },
		]);
	});
});

describe("section header side", () => {
	const sides = (text: string) =>
		parseMarkup(text, FORMAT)
			.filter((line) => line.kind === "section")
			.map((line) => !!line.duetSide);

	it("follows the first main line under the header", () => {
		expect(
			sides(
				[
					"[Verse 1]",
					">Duet line",
					"Plain line",
					"[Chorus]",
					"Plain line",
					">Duet line",
					"[Bridge]",
					"",
					"<Background first",
					">Then duet",
					"[Outro]",
					"[Empty]",
					">Duet after an empty section",
				].join("\n"),
			),
		).toEqual([true, false, true, false, true]);
	});

	it("skips translation rows and ignores prefixes when they are off", () => {
		expect(
			parseMarkup("[Verse]\n>Hi\nHallo", {
				...FORMAT,
				mode: "lyric-trans",
			})[0].duetSide,
		).toBe(true);
		expect(
			parseMarkup("[Verse]\n>Hi", { ...FORMAT, enableSpecialPrefix: false })[0]
				.duetSide,
		).toBeUndefined();
	});

	it("puts the header line on the duet side", () => {
		const text = "[Verse]\n>Hi";
		const specs = buildDecorationSpecs(
			parseMarkup(text, FORMAT),
			[0, 8],
			new Set(),
			[0, 1],
			(from, to) => text.slice(from, to),
		);
		expect(specs[0]).toEqual({
			type: "line",
			from: 0,
			className: "lm-section lm-duet",
		});
	});
});

describe("changing a header's category", () => {
	it("keeps the number and vocalist", () => {
		expect(headerWithCategory("[Verse 2: Singer]", "pre-chorus")).toBe(
			"[Pre-Chorus 2: Singer]",
		);
		expect(headerWithCategory("[Mystery thing]", "bridge")).toBe("[Bridge]");
	});
});
