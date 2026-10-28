import type { LyricSectionCategory } from "$/types/ttml";
import type { MarkupLine } from "./markup";

/**
 * What to draw, as plain data so it can be tested without an editor.
 * Positions are document offsets, in order.
 */
export type DecorationSpec =
	| { type: "line"; from: number; className: string }
	| { type: "hide"; from: number; to: number }
	| { type: "dot"; from: number; to: number }
	| {
			type: "header";
			from: number;
			to: number;
			category?: LyricSectionCategory;
			label: string;
	  }
	| {
			type: "subLabel";
			from: number;
			to: number;
			sub: "translation" | "romanization";
	  };

export const LINE_CLASS: Record<string, string> = {
	background: "lm-background",
	duet: "lm-duet",
	translation: "lm-sub",
	romanization: "lm-sub",
	removedHeader: "lm-removed",
	section: "lm-section",
};

/**
 * Decorations for the given lines. Lines in `revealed` (the ones the cursor or
 * selection touches) show their raw symbols, so only their line style is drawn.
 */
export function buildDecorationSpecs(
	lines: MarkupLine[],
	lineStarts: number[],
	revealed: ReadonlySet<number>,
	lineNumbers: Iterable<number>,
	text: (from: number, to: number) => string,
): DecorationSpec[] {
	const specs: DecorationSpec[] = [];
	for (const number of lineNumbers) {
		const line = lines[number];
		const start = lineStarts[number];
		if (!line || start === undefined) continue;
		const classes = [
			LINE_CLASS[line.kind],
			line.duetSide && LINE_CLASS.duet,
			line.warning && "lm-warning",
		]
			.filter(Boolean)
			.join(" ");
		if (classes) specs.push({ type: "line", from: start, className: classes });
		if (revealed.has(number)) continue;
		for (const span of line.spans) {
			const from = start + span.from;
			const to = start + span.to;
			if (span.type === "prefix" || span.type === "spaceMark") {
				specs.push({ type: "hide", from, to });
			} else if (span.type === "split") {
				specs.push({ type: "dot", from, to });
			} else if (span.type === "header" && line.kind === "section") {
				specs.push({
					type: "header",
					from,
					to,
					category: line.category,
					label: text(from + 1, to - 1).trim(),
				});
			} else if (span.type === "subSeparator" && span.sub) {
				specs.push({ type: "subLabel", from, to, sub: span.sub });
			}
		}
	}
	return specs;
}
