import type { LyricLine } from "$/types/ttml";

export interface CueWord {
	start: number;
	end: number;
	/** Exact starts of timed syllable spans nested inside this word. */
	boundaries: number[];
}
export interface CueSyllable {
	word: CueWord;
	start: number;
	end: number;
}
export interface CueBoundary {
	timeMs: number;
	kind: "start" | "end" | "syllable";
	voice?: "duet" | "background";
}
export interface CueIndex {
	words: CueWord[];
	maxEnds: number[];
	boundaries: CueBoundary[];
	syllableBoundaries: CueBoundary[];
	backgroundBoundaries: CueBoundary[];
	backgroundSyllableBoundaries: CueBoundary[];
	duetBoundaries: CueBoundary[];
	duetSyllableBoundaries: CueBoundary[];
	syllables: CueSyllable[];
}

export function buildCueIndex(lines: LyricLine[]): CueIndex {
	// Directly timed lines don't contain genuine word boundaries.
	const words: CueWord[] = [];
	const syllables: CueSyllable[] = [];
	const backgroundWords: CueWord[] = [];
	const duetWords: CueWord[] = [];
	for (const line of lines) {
		if (line.isLineSynced || line.ignoreSync) continue;
		const target = line.isDuet
			? duetWords
			: line.isBG
				? backgroundWords
				: words;
		let spans: typeof line.words = [];
		const flush = () => {
			if (spans.length === 0) return;
			const first = spans[0];
			const last = spans[spans.length - 1];
			const boundaries = spans.slice(1).flatMap((span, index) => {
				const previous = spans[index];
				return /[\p{L}\p{N}]/u.test(previous.word) &&
					/[\p{L}\p{N}]/u.test(span.word)
					? [span.startTime]
					: [];
			});
			const cueWord = {
				start: first.startTime,
				end: last.endTime,
				boundaries,
			};
			target.push(cueWord);
			if (target === words)
				syllables.push(
					...spans.map((span) => ({
						word: cueWord,
						start: span.startTime,
						end: span.endTime,
					})),
				);
			spans = [];
		};
		for (const span of line.words) {
			if (!span.word) continue;
			if (/^\s+$/u.test(span.word)) {
				flush();
				continue;
			}
			if (
				!Number.isFinite(span.startTime) ||
				!Number.isFinite(span.endTime) ||
				span.startTime < 0 ||
				span.endTime <= span.startTime
			) {
				flush();
				continue;
			}
			spans.push(span);
		}
		flush();
	}
	words.sort((a, b) => a.start - b.start || a.end - b.end);
	syllables.sort((a, b) => a.start - b.start || a.end - b.end);
	backgroundWords.sort((a, b) => a.start - b.start || a.end - b.end);
	duetWords.sort((a, b) => a.start - b.start || a.end - b.end);
	const maxEnds: number[] = [];
	for (const word of words)
		maxEnds.push(Math.max(maxEnds[maxEnds.length - 1] ?? 0, word.end));
	const boundaries = words
		.flatMap((word): CueBoundary[] => [
			{ timeMs: word.start, kind: "start" },
			{ timeMs: word.end, kind: "end" },
		])
		.sort((a, b) => a.timeMs - b.timeMs || a.kind.localeCompare(b.kind));
	const syllableBoundaries = words
		.flatMap((word): CueBoundary[] => [
			{ timeMs: word.start, kind: "syllable" },
			...word.boundaries.map((timeMs) => ({
				timeMs,
				kind: "syllable" as const,
			})),
		])
		.sort((a, b) => a.timeMs - b.timeMs);
	const backgroundBoundaries = backgroundWords
		.flatMap((word): CueBoundary[] => [
			{ timeMs: word.start, kind: "start", voice: "background" },
			{ timeMs: word.end, kind: "end", voice: "background" },
		])
		.sort((a, b) => a.timeMs - b.timeMs || a.kind.localeCompare(b.kind));
	const backgroundSyllableBoundaries = backgroundWords
		.flatMap((word): CueBoundary[] => [
			{ timeMs: word.start, kind: "syllable", voice: "background" },
			...word.boundaries.map((timeMs) => ({
				timeMs,
				kind: "syllable" as const,
				voice: "background" as const,
			})),
		])
		.sort((a, b) => a.timeMs - b.timeMs);
	const duetBoundaries = duetWords
		.flatMap((word): CueBoundary[] => [
			{ timeMs: word.start, kind: "start", voice: "duet" },
			{ timeMs: word.end, kind: "end", voice: "duet" },
		])
		.sort((a, b) => a.timeMs - b.timeMs || a.kind.localeCompare(b.kind));
	const duetSyllableBoundaries = duetWords
		.flatMap((word): CueBoundary[] => [
			{ timeMs: word.start, kind: "syllable", voice: "duet" },
			...word.boundaries.map((timeMs) => ({
				timeMs,
				kind: "syllable" as const,
				voice: "duet" as const,
			})),
		])
		.sort((a, b) => a.timeMs - b.timeMs);
	return {
		words,
		maxEnds,
		boundaries: boundaries.filter(
			(boundary, i) =>
				i === 0 ||
				boundary.timeMs !== boundaries[i - 1].timeMs ||
				boundary.kind !== boundaries[i - 1].kind,
		),
		syllableBoundaries: syllableBoundaries.filter(
			(boundary, i) =>
				i === 0 || boundary.timeMs !== syllableBoundaries[i - 1].timeMs,
		),
		backgroundBoundaries: backgroundBoundaries.filter(
			(boundary, i) =>
				i === 0 ||
				boundary.timeMs !== backgroundBoundaries[i - 1].timeMs ||
				boundary.kind !== backgroundBoundaries[i - 1].kind,
		),
		backgroundSyllableBoundaries: backgroundSyllableBoundaries.filter(
			(boundary, i) =>
				i === 0 ||
				boundary.timeMs !== backgroundSyllableBoundaries[i - 1].timeMs,
		),
		duetBoundaries: duetBoundaries.filter(
			(boundary, i) =>
				i === 0 ||
				boundary.timeMs !== duetBoundaries[i - 1].timeMs ||
				boundary.kind !== duetBoundaries[i - 1].kind,
		),
		duetSyllableBoundaries: duetSyllableBoundaries.filter(
			(boundary, i) =>
				i === 0 || boundary.timeMs !== duetSyllableBoundaries[i - 1].timeMs,
		),
		syllables,
	};
}

export function cueAt(
	index: CueIndex,
	timeMs: number,
	mode: "word" | "syllable" = "word",
) {
	let low = 0;
	let high = index.words.length;
	while (low < high) {
		const mid = (low + high) >>> 1;
		if (index.words[mid].start <= timeMs) low = mid + 1;
		else high = mid;
	}
	const next = index.words[low];
	let syllableLow = 0;
	let syllableHigh = index.syllables.length;
	while (syllableLow < syllableHigh) {
		const mid = (syllableLow + syllableHigh) >>> 1;
		if (index.syllables[mid].start <= timeMs) syllableLow = mid + 1;
		else syllableHigh = mid;
	}
	const nextSyllable = index.syllables[syllableLow];
	const nextCueTime = mode === "syllable" ? nextSyllable?.start : next?.start;
	// Prefer the most recently started active word when lead lines overlap.
	for (let i = low - 1; i >= 0 && index.maxEnds[i] > timeMs; i--) {
		const word = index.words[i];
		if (word.end > timeMs) {
			if (mode === "syllable") {
				const syllable = index.syllables.find(
					(part) =>
						part.word === word && part.start <= timeMs && part.end > timeMs,
				);
				return {
					active: word,
					activeSyllable: syllable,
					next,
					nextCueTime,
					progress: syllable
						? (timeMs - syllable.start) / (syllable.end - syllable.start)
						: 0,
				};
			}
			return {
				active: word,
				activeSyllable: undefined,
				next,
				nextCueTime,
				progress: (timeMs - word.start) / (word.end - word.start),
			};
		}
	}
	return {
		active: undefined,
		activeSyllable: undefined,
		next,
		nextCueTime,
		progress: 0,
	};
}
