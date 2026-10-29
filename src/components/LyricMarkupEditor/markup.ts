import {
	getSectionHeader,
	normalizeSectionHeader,
} from "$/modules/lyric-editor/utils/section-system";
import type { LyricSectionCategory } from "$/types/ttml";

/** How the plain-text lyric markup is read. */
export interface LyricMarkupFormat {
	mode: "lyric" | "lyric-trans" | "lyric-roman" | "lyric-trans-roman";
	lineSeparatorMode: "interleaved-line" | "same-line-separator";
	lineSeparator: string;
	swapTransAndRoman: boolean;
	wordSeparator: string;
	enableSpecialPrefix: boolean;
	bgLyricPrefix: string;
	duetLyricPrefix: string;
	/** `[Header]` rows become sections; otherwise they are dropped. */
	makeSections: boolean;
}

export type MarkupLineKind =
	| "lyric"
	| "background"
	| "duet"
	| "translation"
	| "romanization"
	| "section"
	| "removedHeader"
	| "blank";

export type MarkupWarning =
	/** A translation or romanization row paired with an empty lyric row: it won't import. */
	"dropped" | "missingTranslation" | "missingRomanization";

export type MarkupSpanType =
	/** Ordinary characters. */
	| "text"
	/** A background or duet prefix. */
	| "prefix"
	/** A `[Header]`. */
	| "header"
	/** A word separator between two syllables of one word. */
	| "split"
	/** A word separator next to a space; the space already ends the word. */
	| "spaceMark"
	/** The same-line separator before a translation or romanization. */
	| "subSeparator"
	/** A translation or romanization written on the lyric's own row. */
	| "subText";

export interface MarkupSpan {
	/** Offsets within the line. Spans tile the line with no gaps. */
	from: number;
	to: number;
	type: MarkupSpanType;
	/** For a subSeparator: what follows it. */
	sub?: "translation" | "romanization";
}

export interface MarkupLine {
	kind: MarkupLineKind;
	category?: LyricSectionCategory;
	warning?: MarkupWarning;
	/** A section whose first main line is a duet line sits on the duet side. */
	duetSide?: boolean;
	spans: MarkupSpan[];
}

type SubKind = "translation" | "romanization";

const subKindsOf = (format: LyricMarkupFormat): SubKind[] => {
	const kinds: SubKind[] =
		format.mode === "lyric-trans-roman"
			? ["translation", "romanization"]
			: format.mode === "lyric-trans"
				? ["translation"]
				: format.mode === "lyric-roman"
					? ["romanization"]
					: [];
	return format.swapTransAndRoman ? kinds.reverse() : kinds;
};

const missingWarning = (sub: SubKind): MarkupWarning =>
	sub === "translation" ? "missingTranslation" : "missingRomanization";

/** Spans for a run of lyric text: splits and space marks, the rest as text. */
function bodySpans(
	line: string,
	from: number,
	to: number,
	separator: string,
): MarkupSpan[] {
	const spans: MarkupSpan[] = [];
	const pushText = (start: number, end: number) => {
		if (end <= start) return;
		const last = spans[spans.length - 1];
		if (last?.type === "text" && last.to === start) last.to = end;
		else spans.push({ from: start, to: end, type: "text" });
	};
	if (!separator) {
		pushText(from, to);
		return spans;
	}
	let index = from;
	let textStart = from;
	while (index < to) {
		if (line.startsWith(separator, index) && index + separator.length <= to) {
			pushText(textStart, index);
			const end = index + separator.length;
			const before = line[index - 1];
			const after = line[end];
			const nearSpace =
				(before !== undefined && /\s/.test(before)) ||
				(after !== undefined && /\s/.test(after)) ||
				index === from ||
				end === to;
			spans.push({
				from: index,
				to: end,
				type: nearSpace ? "spaceMark" : "split",
			});
			index = end;
			textStart = end;
		} else index++;
	}
	pushText(textStart, to);
	return spans;
}

/** Spans for a lyric row: leading space, prefixes, body, and same-line parts. */
function lyricSpans(
	line: string,
	format: LyricMarkupFormat,
	subs: SubKind[],
): { spans: MarkupSpan[]; kind: MarkupLineKind; missing?: SubKind } {
	const spans: MarkupSpan[] = [];
	const lead = line.match(/^\s*/)?.[0].length ?? 0;
	if (lead) spans.push({ from: 0, to: lead, type: "text" });
	let index = lead;
	let kind: MarkupLineKind = "lyric";
	const prefixes = format.enableSpecialPrefix
		? ([
				[format.bgLyricPrefix, "background"],
				[format.duetLyricPrefix, "duet"],
			] as const)
		: [];
	for (let found = true; found; ) {
		found = false;
		for (const [prefix, prefixKind] of prefixes) {
			if (prefix && line.startsWith(prefix, index)) {
				spans.push({ from: index, to: index + prefix.length, type: "prefix" });
				index += prefix.length;
				if (kind === "lyric") kind = prefixKind;
				found = true;
			}
		}
	}

	const sameLine =
		subs.length > 0 &&
		format.lineSeparatorMode === "same-line-separator" &&
		!!format.lineSeparator;
	if (!sameLine) {
		spans.push(...bodySpans(line, index, line.length, format.wordSeparator));
		return { spans, kind };
	}
	const separator = format.lineSeparator;
	const cut = line.indexOf(separator, index);
	const mainEnd = cut === -1 ? line.length : cut;
	spans.push(...bodySpans(line, index, mainEnd, format.wordSeparator));
	let position = mainEnd;
	let missing: SubKind | undefined;
	for (const sub of subs) {
		if (position >= line.length || !line.startsWith(separator, position)) {
			missing ??= sub;
			continue;
		}
		spans.push({
			from: position,
			to: position + separator.length,
			type: "subSeparator",
			sub,
		});
		position += separator.length;
		const next = line.indexOf(separator, position);
		const end =
			next === -1 || sub === subs[subs.length - 1] ? line.length : next;
		if (end > position)
			spans.push({ from: position, to: end, type: "subText" });
		if (!line.slice(position, end).trim()) missing ??= sub;
		position = end;
	}
	if (position < line.length)
		spans.push({ from: position, to: line.length, type: "subText" });
	return { spans, kind, missing };
}

const wholeLine = (
	line: string,
	type: MarkupSpanType = "text",
): MarkupSpan[] => (line ? [{ from: 0, to: line.length, type }] : []);

/**
 * Read lyric markup into one entry per line, the same way the importer pairs
 * rows. The text itself is never changed; this only describes it.
 */
export function parseMarkup(
	text: string,
	format: LyricMarkupFormat,
): MarkupLine[] {
	const rows = text.split(/\r\n|\r|\n/);
	const subs = subKindsOf(format);
	const interleaved = format.lineSeparatorMode !== "same-line-separator";
	const result: MarkupLine[] = [];

	for (let index = 0; index < rows.length; ) {
		const row = rows[index++];
		const trimmed = row.trim();
		const header = format.makeSections
			? getSectionHeader(trimmed)
			: /^\[.*\]$/.test(trimmed)
				? trimmed
				: undefined;
		if (header) {
			const start = row.indexOf("[");
			const end = start + trimmed.length;
			const spans: MarkupSpan[] = [];
			if (start > 0) spans.push({ from: 0, to: start, type: "text" });
			spans.push({ from: start, to: end, type: "header" });
			if (end < row.length)
				spans.push({ from: end, to: row.length, type: "text" });
			result.push(
				format.makeSections
					? {
							kind: "section",
							category: normalizeSectionHeader(header)?.category,
							spans,
						}
					: { kind: "removedHeader", spans },
			);
			continue;
		}

		const subRows = interleaved ? subs.slice(0, rows.length - index) : [];
		if (!trimmed) {
			result.push({ kind: "blank", spans: wholeLine(row) });
			for (const sub of subRows) {
				const subRow = rows[index++];
				result.push(
					subRow.trim()
						? { kind: sub, warning: "dropped", spans: wholeLine(subRow) }
						: { kind: "blank", spans: wholeLine(subRow) },
				);
			}
			continue;
		}

		const { spans, kind, missing } = lyricSpans(row, format, subs);
		result.push({
			kind,
			spans,
			...(missing ? { warning: missingWarning(missing) } : {}),
		});
		for (const sub of subRows) {
			const subRow = rows[index++];
			result.push({
				kind: sub,
				spans: wholeLine(subRow),
				...(subRow.trim() ? {} : { warning: missingWarning(sub) }),
			});
		}
		// The text ended before this lyric's sub rows did.
		for (const sub of subs.slice(subRows.length)) {
			if (!interleaved) break;
			const last = result[result.length - 1];
			last.warning ??= missingWarning(sub);
		}
	}
	markDuetSections(result);
	return result;
}

/**
 * A section header takes the side of the first main line under it: background,
 * translation and blank lines are skipped, and the next header ends the search.
 */
function markDuetSections(lines: MarkupLine[]) {
	let section: MarkupLine | undefined;
	for (const line of lines) {
		if (line.kind === "section") {
			section = line;
		} else if (section && (line.kind === "lyric" || line.kind === "duet")) {
			if (line.kind === "duet") section.duetSide = true;
			section = undefined;
		}
	}
}

export const normalizeHeaderCategory = (header: string): LyricSectionCategory =>
	normalizeSectionHeader(header)?.category ?? "other";

/** Text of a header with its category changed, keeping number and vocalist. */
export function headerWithCategory(
	header: string,
	category: LyricSectionCategory,
): string {
	const normalized = normalizeSectionHeader(header);
	const name = category
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("-");
	const ordinal = normalized?.ordinal ? ` ${normalized.ordinal}` : "";
	const vocalist = normalized?.vocalist ? `: ${normalized.vocalist}` : "";
	return `[${name}${ordinal}${vocalist}]`;
}
