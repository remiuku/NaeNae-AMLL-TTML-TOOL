import { useStore } from "jotai";
import { useCallback } from "react";
import { audioEngine } from "$/modules/audio/audio-engine";
import {
	cmdAuditionSelection,
	cmdAuditionSelectionAfter,
	cmdAuditionSelectionBefore,
} from "$/modules/keyboard/commands";
import { useCommand } from "$/modules/keyboard/hooks";
import { processedLyricLinesAtom } from "$/modules/segmentation/utils/segment-processing";
import { selectedWordIdAtom } from "$/modules/spectrogram/states/dnd";

/**
 * 试听片段前后的时长 (毫秒)
 */
const AUDITION_PADDING_MS = 500;

export const AuditionKeyBinding = () => {
	const store = useStore();

	// Looked up when a key fires. Subscribing would rebuild every line's
	// segments on each sync key press, which adds up on long songs.
	const getSelectedSegment = useCallback(() => {
		const selectedWordId = store.get(selectedWordIdAtom);
		if (!selectedWordId) return null;

		for (const line of store.get(processedLyricLinesAtom)) {
			const segment = line.segments.find(
				(s) => s.type === "word" && s.id === selectedWordId,
			);
			if (segment) return segment;
		}
		return null;
	}, [store]);

	// 播放选中片段前 500ms
	useCommand(cmdAuditionSelectionBefore, () => {
		const selectedSegment = getSelectedSegment();
		if (selectedSegment?.startTime == null) return;
		audioEngine.auditionRange(
			(selectedSegment.startTime - AUDITION_PADDING_MS) / 1000,
			selectedSegment.startTime / 1000,
		);
	}, [getSelectedSegment]);

	// 播放选中的片段
	useCommand(cmdAuditionSelection, () => {
		const selectedSegment = getSelectedSegment();
		if (selectedSegment?.startTime == null || selectedSegment.endTime == null)
			return;
		audioEngine.auditionRange(
			selectedSegment.startTime / 1000,
			selectedSegment.endTime / 1000,
		);
	}, [getSelectedSegment]);

	// 播放选中片段后 500ms
	useCommand(cmdAuditionSelectionAfter, () => {
		const selectedSegment = getSelectedSegment();
		if (selectedSegment?.endTime == null) return;
		audioEngine.auditionRange(
			selectedSegment.endTime / 1000,
			(selectedSegment.endTime + AUDITION_PADDING_MS) / 1000,
		);
	}, [getSelectedSegment]);

	return null;
};
