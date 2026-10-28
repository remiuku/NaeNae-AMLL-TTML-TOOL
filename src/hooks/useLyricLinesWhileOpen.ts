import { atom, useAtomValue, useStore } from "jotai";
import { lyricLinesAtom } from "$/states/main.ts";
import type { TTMLLyric } from "$/types/ttml.ts";

const idleAtom = atom(null);

/**
 * The lyric document for a dialog that only needs it while open.
 *
 * Every word timing change replaces the document, so a closed dialog that
 * subscribes to it re-renders on every sync key press. While closed this reads
 * the current document without subscribing; opening subscribes again.
 */
export function useLyricLinesWhileOpen(open: boolean): TTMLLyric {
	const store = useStore();
	const live = useAtomValue(open ? lyricLinesAtom : idleAtom);
	return live ?? store.get(lyricLinesAtom);
}
