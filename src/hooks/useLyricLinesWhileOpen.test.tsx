// @vitest-environment jsdom
import { atom, createStore, Provider, useAtomValue } from "jotai";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lyricLinesAtom } from "$/states/main.ts";
import { newLyricLine, newLyricWord, type TTMLLyric } from "$/types/ttml.ts";
import { useLyricLinesWhileOpen } from "./useLyricLinesWhileOpen";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const longSong = (): TTMLLyric => ({
	metadata: [],
	lyricLines: Array.from({ length: 180 }, () => ({
		...newLyricLine(),
		words: Array.from({ length: 14 }, () => ({
			...newLyricWord(),
			word: "word ",
		})),
	})),
});

/** What a sync key press does: replace one word, one line and the document. */
const retimeWord = (lyric: TTMLLyric, lineIndex: number, time: number) => {
	const lyricLines = lyric.lyricLines.slice();
	const line = lyricLines[lineIndex];
	const words = line.words.slice();
	words[0] = { ...words[0], startTime: time };
	lyricLines[lineIndex] = { ...line, words };
	return { ...lyric, lyricLines };
};

describe("useLyricLinesWhileOpen", () => {
	const openAtom = atom(false);
	let root: Root;
	let store: ReturnType<typeof createStore>;
	let renders: number;
	let seen: TTMLLyric | undefined;

	beforeEach(async () => {
		store = createStore();
		store.set(lyricLinesAtom, longSong());
		renders = 0;
		root = createRoot(document.createElement("div"));
		function ClosedDialog() {
			const open = useAtomValue(openAtom);
			seen = useLyricLinesWhileOpen(open);
			renders++;
			return null;
		}
		await act(async () => {
			root.render(
				<Provider store={store}>
					<ClosedDialog />
				</Provider>,
			);
		});
	});

	afterEach(async () => {
		await act(async () => root.unmount());
	});

	it("does not re-render a closed dialog on sync key presses", async () => {
		const before = renders;
		for (let press = 1; press <= 50; press++) {
			await act(async () => {
				store.set(
					lyricLinesAtom,
					retimeWord(store.get(lyricLinesAtom), 90, press),
				);
			});
		}
		expect(renders).toBe(before);
	});

	it("reads the current document when it opens and follows edits while open", async () => {
		await act(async () => {
			store.set(lyricLinesAtom, retimeWord(store.get(lyricLinesAtom), 3, 1234));
		});
		await act(async () => store.set(openAtom, true));
		expect(seen?.lyricLines[3].words[0].startTime).toBe(1234);

		const before = renders;
		await act(async () => {
			store.set(lyricLinesAtom, retimeWord(store.get(lyricLinesAtom), 3, 5678));
		});
		expect(renders).toBe(before + 1);
		expect(seen).toBe(store.get(lyricLinesAtom));
	});
});
