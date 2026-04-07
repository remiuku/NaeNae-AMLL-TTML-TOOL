import { useStore } from "jotai";
import { type FC, useCallback } from "react";
import { audioEngine } from "$/modules/audio/audio-engine";
import {
	findNextWord,
	getCurrentLineLocation,
	getCurrentLocation,
	getFirstSynchronizableUnit,
	getLastSynchronizableUnit,
	getSynchronizableUnits,
	isSynchronizableLine,
} from "$/modules/lyric-editor/utils/lyric-states";
import {
	SyncJudgeMode,
	smartFirstWordAtom,
	smartLastWordAtom,
	syncJudgeModeAtom,
} from "$/modules/settings/states";
import {
	currentEmptyBeatAtom,
	smartFirstWordActiveIdAtom,
	syncTimeOffsetAtom,
} from "$/modules/settings/states/sync";
import {
	keyMoveFirstWordAndPlayAtom,
	keyMoveLastWordAndPlayAtom,
	keyMoveNextLineAtom,
	keyMoveNextWordAndPlayAtom,
	keyMoveNextWordAtom,
	keyMovePrevLineAtom,
	keyMovePrevWordAndPlayAtom,
	keyMovePrevWordAtom,
	keySyncEndAtom,
	keySyncNextAtom,
	keySyncStartAtom,
} from "$/states/keybindings.ts";
import {
	lyricLinesAtom,
	selectedLinesAtom,
	selectedWordsAtom,
} from "$/states/main.ts";
import type { LyricLine, LyricWord, LyricWordBase, TTMLLyric } from "$/types/ttml";
import {
	type KeyBindingEvent,
	useKeyBindingAtom,
} from "$/utils/keybindings.ts";

const getUnitStartTime = (unit: {
	word: LyricWord;
	rubyWord?: LyricWordBase;
}) => unit.rubyWord?.startTime ?? unit.word.startTime;

const updateRubyParentTime = (word: LyricWord) => {
	const ruby = word.ruby;
	if (!ruby || ruby.length === 0) return;
	let minStart = Number.POSITIVE_INFINITY;
	let maxEnd = Number.NEGATIVE_INFINITY;
	for (const r of ruby) {
		if (r.startTime < minStart) minStart = r.startTime;
		if (r.endTime > maxEnd) maxEnd = r.endTime;
	}
	if (Number.isFinite(minStart)) word.startTime = minStart;
	if (Number.isFinite(maxEnd)) word.endTime = maxEnd;
};

type LyricsState = TTMLLyric;

function cloneLineWithWords(line: LyricLine): LyricLine {
	return { ...line, words: line.words.slice() };
}

function cloneWordWithRuby(word: LyricWord): LyricWord {
	return {
		...word,
		ruby: word.ruby ? word.ruby.slice() : undefined,
	};
}

function setUnitStartTimeCloned(
	line: LyricLine,
	wordIndex: number,
	rubyIndex: number | undefined,
	time: number,
) {
	const prevWord = line.words[wordIndex];
	if (!prevWord) return;
	const nextWord = cloneWordWithRuby(prevWord);

	if (rubyIndex !== undefined && nextWord.ruby?.[rubyIndex]) {
		const prevRuby = nextWord.ruby[rubyIndex];
		nextWord.ruby[rubyIndex] = { ...prevRuby, startTime: time };
		updateRubyParentTime(nextWord);
	} else {
		nextWord.startTime = time;
	}

	line.words[wordIndex] = nextWord;
}

function setUnitEndTimeCloned(
	line: LyricLine,
	wordIndex: number,
	rubyIndex: number | undefined,
	time: number,
) {
	const prevWord = line.words[wordIndex];
	if (!prevWord) return;
	const nextWord = cloneWordWithRuby(prevWord);

	if (rubyIndex !== undefined && nextWord.ruby?.[rubyIndex]) {
		const prevRuby = nextWord.ruby[rubyIndex];
		nextWord.ruby[rubyIndex] = { ...prevRuby, endTime: time };
		updateRubyParentTime(nextWord);
	} else {
		nextWord.endTime = time;
	}

	line.words[wordIndex] = nextWord;
}

export const SyncKeyBinding: FC = () => {
	const store = useStore();

	const calcJudgeTime = useCallback(
		(evt: KeyBindingEvent) => {
			const syncTimeOffset = store.get(syncTimeOffsetAtom);
			const currentTime = Math.max(
				0,
				audioEngine.musicCurrentTime * 1000 + syncTimeOffset,
			);
			const syncJudgeMode = store.get(syncJudgeModeAtom);
			if (syncJudgeMode === SyncJudgeMode.FirstKeyDownTimeLegacy) {
				return (
					Math.max(
						0,
						audioEngine.musicCurrentTime * 1000 -
							evt.downTimeOffset +
							syncTimeOffset,
					) | 0
				);
			}
			let timeAdjustment = 0;
			if (audioEngine.musicPlaying) {
				switch (syncJudgeMode) {
					case SyncJudgeMode.FirstKeyDownTime:
						timeAdjustment -= evt.downTimeOffset;
						break;
					case SyncJudgeMode.LastKeyUpTime:
						break;
					case SyncJudgeMode.MiddleKeyTime:
						timeAdjustment -= evt.downTimeOffset / 2;
						break;
				}
				timeAdjustment *= audioEngine.musicPlayBackRate;
			}
			return Math.max(0, currentTime + timeAdjustment) | 0;
		},
		[store],
	);

	const moveToNextWordBase = useCallback(
		(play: boolean): boolean => {
			const location = getCurrentLocation(store);
			if (!location) return false;
			const nextWord = findNextWord(
				location.lines,
				location.lineIndex,
				location.syncIndex,
			);
			if (!nextWord) return false;
			store.set(selectedWordsAtom, new Set([nextWord.unit.id]));
			store.set(selectedLinesAtom, new Set([nextWord.line.id]));
			store.set(currentEmptyBeatAtom, 0);
			if (play) audioEngine.seekMusic(getUnitStartTime(nextWord.unit) / 1000);
			return true;
		},
		[store],
	);

	const moveToNextWord = useCallback(
		() => moveToNextWordBase(false),
		[moveToNextWordBase],
	);
	const moveToNextWordAndPlay = useCallback(
		() => moveToNextWordBase(true),
		[moveToNextWordBase],
	);

	const moveToPrevWordBase = useCallback(
		(play: boolean): boolean => {
			const location = getCurrentLocation(store);
			if (!location) return false;
			if (location.syncIndex === 0) {
				if (location.lineIndex === 0) return false;
				const lastLineIndex = Math.max(0, location.lineIndex);
				const lastLine = location.lines
					.slice(0, lastLineIndex)
					.reverse()
					.find(
						(line) =>
							isSynchronizableLine(line) &&
							getSynchronizableUnits(line).length > 0,
					);
				if (!lastLine) return false;
				store.set(selectedLinesAtom, new Set([lastLine.id]));
				const lastUnit = getLastSynchronizableUnit(lastLine);
				if (!lastUnit) {
					store.set(selectedWordsAtom, new Set());
				} else {
					store.set(selectedWordsAtom, new Set([lastUnit.id]));
					if (play) audioEngine.seekMusic(getUnitStartTime(lastUnit) / 1000);
				}
			} else {
				const lineUnits = getSynchronizableUnits(location.line);
				const prevUnit = lineUnits[location.syncIndex - 1];
				if (!prevUnit) return false;
				store.set(selectedWordsAtom, new Set([prevUnit.id]));
				if (play) audioEngine.seekMusic(getUnitStartTime(prevUnit) / 1000);
			}
			return true;
		},
		[store],
	);
	const moveToPrevWord = useCallback(
		() => moveToPrevWordBase(false),
		[moveToPrevWordBase],
	);
	const moveToPrevWordAndPlay = useCallback(
		() => moveToPrevWordBase(true),
		[moveToPrevWordBase],
	);

	// 移动打轴光标

	useKeyBindingAtom(keyMoveNextLineAtom, () => {
		const location = getCurrentLineLocation(store);
		if (!location) return;
		const lastLineIndex = Math.min(
			location.lines.length,
			location.lineIndex + 1,
		);
		const lastLine = location.lines[lastLineIndex];
		if (!lastLine) return;
		store.set(selectedLinesAtom, new Set([lastLine.id]));
		const firstUnit = getFirstSynchronizableUnit(lastLine);
		if (!firstUnit) {
			store.set(selectedWordsAtom, new Set());
		} else {
			store.set(selectedWordsAtom, new Set([firstUnit.id]));
		}
	}, [store]);

	useKeyBindingAtom(keyMovePrevLineAtom, () => {
		const location = getCurrentLineLocation(store);
		if (!location) return;
		const lastLineIndex = Math.max(0, location.lineIndex - 1);
		const lastLine = location.lines[lastLineIndex];
		if (!lastLine) return;
		store.set(selectedLinesAtom, new Set([lastLine.id]));
		const firstUnit = getFirstSynchronizableUnit(lastLine);
		if (!firstUnit) {
			store.set(selectedWordsAtom, new Set());
		} else {
			store.set(selectedWordsAtom, new Set([firstUnit.id]));
		}
	}, [store]);

	useKeyBindingAtom(keyMoveNextWordAtom, moveToNextWord, [store]);
	useKeyBindingAtom(keyMoveNextWordAndPlayAtom, moveToNextWordAndPlay, [store]);
	useKeyBindingAtom(keyMovePrevWordAtom, moveToPrevWord, [store]);
	useKeyBindingAtom(keyMovePrevWordAndPlayAtom, moveToPrevWordAndPlay, [store]);

	useKeyBindingAtom(keyMoveLastWordAndPlayAtom, () => {
		const location = getCurrentLineLocation(store);
		if (!location) return;
		const lastUnit = getLastSynchronizableUnit(location.line);
		if (!lastUnit) return;
		store.set(selectedWordsAtom, new Set([lastUnit.id]));
		store.set(selectedLinesAtom, new Set([location.line.id]));
		audioEngine.seekMusic(getUnitStartTime(lastUnit) / 1000);
	}, [store]);

	useKeyBindingAtom(keyMoveFirstWordAndPlayAtom, () => {
		const location = getCurrentLineLocation(store);
		if (!location) return;
		const firstUnit = getFirstSynchronizableUnit(location.line);
		if (!firstUnit) return;
		store.set(selectedWordsAtom, new Set([firstUnit.id]));
		store.set(selectedLinesAtom, new Set([location.line.id]));
		audioEngine.seekMusic(getUnitStartTime(firstUnit) / 1000);
	}, [store]);

	// 记录时间戳（主要打轴按键）

	useKeyBindingAtom(
		keySyncStartAtom,
		(evt) => {
			const location = getCurrentLocation(store);
			if (!location) return;
			const currentTime = calcJudgeTime(evt);

			const smartFirstWord = store.get(smartFirstWordAtom);
			if (smartFirstWord && location.isFirstWord) {
				store.set(smartFirstWordActiveIdAtom, location.word.id);
			}

			store.set(lyricLinesAtom, (prev) => {
				const state: LyricsState = prev;
				const prevLine = state.lyricLines[location.lineIndex];
				if (!prevLine) return prev;

				const nextLines = state.lyricLines.slice();
				const nextLine = cloneLineWithWords(prevLine);
				if (location.isFirstWord) nextLine.startTime = currentTime;
				setUnitStartTimeCloned(
					nextLine,
					location.wordIndex,
					location.rubyIndex,
					currentTime,
				);
				nextLines[location.lineIndex] = nextLine;

				return { ...state, lyricLines: nextLines };
			});
		},
		[store],
	);
	useKeyBindingAtom(
		keySyncNextAtom,
		(evt) => {
			const location = getCurrentLocation(store);
			if (!location) return;
			const currentTime = calcJudgeTime(evt);

			// 智能首字
			const smartFirstWord = store.get(smartFirstWordAtom);
			if (smartFirstWord && location.isFirstWord) {
				const activeId = store.get(smartFirstWordActiveIdAtom);
				if (activeId !== location.word.id) {
					store.set(lyricLinesAtom, (prev) => {
						const state: LyricsState = prev;
						const prevLine = state.lyricLines[location.lineIndex];
						if (!prevLine) return prev;

						const nextLines = state.lyricLines.slice();
						const nextLine = cloneLineWithWords(prevLine);
						nextLine.startTime = currentTime;
						setUnitStartTimeCloned(
							nextLine,
							location.wordIndex,
							location.rubyIndex,
							currentTime,
						);
						nextLines[location.lineIndex] = nextLine;

						return { ...state, lyricLines: nextLines };
					});
					store.set(smartFirstWordActiveIdAtom, location.word.id);
					return;
				}
			}
			store.set(smartFirstWordActiveIdAtom, null);

			const hasRuby = location.word.ruby?.length;
			if (!hasRuby) {
				const emptyBeat = store.get(currentEmptyBeatAtom);
				if (emptyBeat < location.word.emptyBeat) {
					store.set(currentEmptyBeatAtom, emptyBeat + 1);
					return;
				}
			}

			// 智能尾字
			const smartLastWord = store.get(smartLastWordAtom);
			if (smartLastWord && location.isLastWord) {
				store.set(lyricLinesAtom, (prev) => {
					const state: LyricsState = prev;
					const prevLine = state.lyricLines[location.lineIndex];
					if (!prevLine) return prev;

					const nextLines = state.lyricLines.slice();
					const nextLine = cloneLineWithWords(prevLine);
					setUnitEndTimeCloned(
						nextLine,
						location.wordIndex,
						location.rubyIndex,
						currentTime,
					);
					nextLine.endTime = currentTime;
					nextLines[location.lineIndex] = nextLine;

					return { ...state, lyricLines: nextLines };
				});
				moveToNextWord();
				return;
			}

			store.set(lyricLinesAtom, (prev) => {
				const state: LyricsState = prev;
				const prevCurLine = state.lyricLines[location.lineIndex];
				if (!prevCurLine) return prev;

				const nextWord = findNextWord(
					state.lyricLines,
					location.lineIndex,
					location.syncIndex,
				);

				const nextLines = state.lyricLines.slice();
				const curLine = cloneLineWithWords(prevCurLine);
				setUnitEndTimeCloned(
					curLine,
					location.wordIndex,
					location.rubyIndex,
					currentTime,
				);

				if (nextWord) {
					const nextLineIndex = state.lyricLines.findIndex(
						(l) => l.id === nextWord.line.id,
					);
					if (nextLineIndex >= 0) {
						const prevNextLine = state.lyricLines[nextLineIndex];
						const nextLine =
							nextLineIndex === location.lineIndex
								? curLine
								: cloneLineWithWords(prevNextLine);

						if (nextLineIndex !== location.lineIndex) {
							curLine.endTime = currentTime;
							nextLine.startTime = currentTime;
						}

						setUnitStartTimeCloned(
							nextLine,
							nextWord.unit.wordIndex,
							nextWord.unit.rubyIndex,
							currentTime,
						);

						nextLines[nextLineIndex] = nextLine;
					}
				}

				nextLines[location.lineIndex] = curLine;
				return { ...state, lyricLines: nextLines };
			});
			moveToNextWord();

			// 开了智能首字后，连轴打到下一行时跳过智能首字
			if (smartFirstWord) {
				const newLocation = getCurrentLocation(store);
				if (newLocation?.isFirstWord) {
					store.set(smartFirstWordActiveIdAtom, newLocation.word.id);
				}
			}
		},
		[store, moveToNextWord],
	);
	useKeyBindingAtom(
		keySyncEndAtom,
		(evt) => {
			const location = getCurrentLocation(store);
			if (!location) return;
			const currentTime = calcJudgeTime(evt);
			store.set(lyricLinesAtom, (prev) => {
				const state: LyricsState = prev;
				const prevLine = state.lyricLines[location.lineIndex];
				if (!prevLine) return prev;

				const nextLines = state.lyricLines.slice();
				const nextLine = cloneLineWithWords(prevLine);
				setUnitEndTimeCloned(
					nextLine,
					location.wordIndex,
					location.rubyIndex,
					currentTime,
				);
				if (location.isLastWord) nextLine.endTime = currentTime;
				nextLines[location.lineIndex] = nextLine;

				return { ...state, lyricLines: nextLines };
			});
			moveToNextWord();
		},
		[store, moveToNextWord],
	);

	return null;
};
