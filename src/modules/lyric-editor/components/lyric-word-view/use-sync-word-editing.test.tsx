// @vitest-environment jsdom
import { produce } from "immer";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { newLyricLine, newLyricWord, type TTMLLyric } from "$/types/ttml";
import { useSyncWordEditing } from "./use-sync-word-editing";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const makeLyric = (): TTMLLyric => {
	const line = newLyricLine();
	const word = {
		...newLyricWord(),
		word: "漢字",
		romanWord: "kanji",
	};
	return {
		lyricLines: [{ ...line, words: [word] }],
		metadata: [],
	} as TTMLLyric;
};

const commitWith = (field: "word" | "romanWord", cancelFirst = false) => {
	let lyric = makeLyric();
	const editLyricLines = (recipe: (state: TTMLLyric) => void) => {
		lyric = produce(lyric, recipe);
	};
	let editing!: ReturnType<typeof useSyncWordEditing>;
	const Probe = () => {
		editing = useSyncWordEditing({
			editLyricLines,
			line: lyric.lyricLines[0],
			wordIndex: 0,
		});
		return null;
	};
	const root = createRoot(document.createElement("div"));
	act(() => root.render(<Probe />));
	act(() => editing.setEditingTextField(field));
	// Escape unmounts the input; the blur that follows must not commit.
	if (cancelFirst) act(() => editing.cancelTextEdit());
	act(() => editing.commitTextEdit(field, "edited"));
	act(() => root.unmount());
	return lyric.lyricLines[0].words[0];
};

describe("useSyncWordEditing text commits", () => {
	it("edits the word or its romanization", () => {
		expect(commitWith("word").word).toBe("edited");
		expect(commitWith("romanWord")).toMatchObject({
			word: "漢字",
			romanWord: "edited",
		});
	});

	it("drops the blur commit that follows an Escape cancel", () => {
		expect(commitWith("word", true).word).toBe("漢字");
	});
});
