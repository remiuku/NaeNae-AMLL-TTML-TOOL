import type { TTMLLyric } from "$/types/ttml";

/** Clears the start and end time of the given words; returns the same document when nothing changes. */
export function clearWordTiming(
	document: TTMLLyric,
	wordIds: ReadonlySet<string>,
): TTMLLyric {
	let changed = false;
	const lyricLines = document.lyricLines.map((line) => {
		let lineChanged = false;
		const words = line.words.map((word) => {
			if (!wordIds.has(word.id) || (word.startTime === 0 && word.endTime === 0))
				return word;
			lineChanged = true;
			return { ...word, startTime: 0, endTime: 0 };
		});
		if (!lineChanged) return line;
		changed = true;
		return { ...line, words };
	});
	return changed ? { ...document, lyricLines } : document;
}
