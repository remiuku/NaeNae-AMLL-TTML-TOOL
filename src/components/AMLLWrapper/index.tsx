import { Flex } from "@radix-ui/themes";
import classNames from "classnames";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { memo, useEffect, useMemo, useRef } from "react";
import { audioEngine } from "$/modules/audio/audio-engine";
import {
	activeLineIdsAtom,
	currentTimeAtom,
} from "$/modules/audio/states";
import {
	showRomanLinesAtom,
	showTranslationLinesAtom,
} from "$/modules/settings/states/preview";
import {
	isDarkThemeAtom,
	lyricLinesAtom,
	projectIdentityAtom,
	selectedLinesAtom,
} from "$/states/main.ts";
import styles from "./index.module.css";

const zeroAtom = atom(0);

// A single word span - static version (no time subscription)
const StaticWord = memo(({ word }: { word: any }) => (
	<span className={styles.wordStatic}>{word.word}</span>
));

// A single word span - active version (subscribes to time)
const ActiveWord = memo(({ word, onWordClick }: { word: any; onWordClick: (t: number) => void }) => {
	const currentTime = useAtomValue(currentTimeAtom);
	const isWordActive = currentTime >= word.startTime && currentTime <= word.endTime;
	const isWordPast = currentTime > word.endTime;
	return (
		<span
			className={classNames(styles.word, isWordActive && styles.wordActive, isWordPast && styles.wordPast)}
			onClick={(e) => { e.stopPropagation(); onWordClick(word.startTime); }}
		>
			{word.word}
		</span>
	);
});

/**
 * A "line group" = one main line + any co-timed BG lines beneath it.
 */
interface LineGroup {
	main: any;
	bg: any[];
}

const StaticLineGroup = memo(({ group, isPast }: { group: LineGroup; isPast: boolean }) => (
	<div className={classNames(styles.lineGroup, isPast && styles.lineGroupPast)}>
		{/* Main / duet line */}
		<div className={classNames(styles.line, group.main.isDuet && styles.lineDuetR)}>
			<div className={styles.wordsContainer}>
				{group.main.words.map((w: any, i: number) => <StaticWord key={i} word={w} />)}
			</div>
		</div>
		{/* BG lines */}
		{group.bg.map((bgLine, i) => (
			<div key={i} className={classNames(styles.line, styles.lineBG, bgLine.isDuet && styles.lineDuetR)}>
				<div className={styles.wordsContainer}>
					{bgLine.words.map((w: any, wi: number) => <StaticWord key={wi} word={w} />)}
				</div>
			</div>
		))}
	</div>
));

const ActiveLineGroup = memo(({ group, onWordClick }: { group: LineGroup; onWordClick: (t: number) => void }) => {
	const showTranslation = useAtomValue(showTranslationLinesAtom);
	const showRoman = useAtomValue(showRomanLinesAtom);
	return (
		<div className={classNames(styles.lineGroup, styles.lineGroupActive)}>
			{/* Main / duet line */}
			<div className={classNames(styles.line, styles.lineActive, group.main.isDuet && styles.lineDuetR)}>
				<div className={styles.wordsContainer}>
					{group.main.words.map((w: any, i: number) => (
						<ActiveWord key={w.id || i} word={w} onWordClick={onWordClick} />
					))}
				</div>
				{showTranslation && group.main.translatedLyric && <span className={styles.extraLine}>{group.main.translatedLyric}</span>}
				{showRoman && group.main.romanLyric && <span className={styles.extraLine}>{group.main.romanLyric}</span>}
			</div>
			{/* BG lines - also highlight when group is active */}
			{group.bg.map((bgLine, i) => (
				<div key={i} className={classNames(styles.line, styles.lineBG, styles.lineBGActive, bgLine.isDuet && styles.lineDuetR)}>
					<div className={styles.wordsContainer}>
						{bgLine.words.map((w: any, wi: number) => (
							<ActiveWord key={w.id || wi} word={w} onWordClick={onWordClick} />
						))}
					</div>
				</div>
			))}
		</div>
	);
});

export const AMLLWrapper = memo(() => {
	const lyrics = useAtomValue(lyricLinesAtom);
	const activeLineIds = useAtomValue(activeLineIdsAtom); 
	const darkMode = useAtomValue(isDarkThemeAtom);
	const projectIdentity = useAtomValue(projectIdentityAtom);
	const setCurrentTime = useSetAtom(currentTimeAtom);
	const setSelectedLines = useSetAtom(selectedLinesAtom);

	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const lastScrolledId = useRef<string | null>(null);

	// Group lines: in the AMLL data format, a BG vocal line (isBG: true) is
	// ALWAYS placed immediately after its parent main line in the sorted array.
	// This is guaranteed by the TTML→AMLL converter (amll-converter.ts line 149-156).
	// So we just scan in order and attach BG lines to the preceding main line.
	const lineGroups = useMemo((): LineGroup[] => {
		const sorted = [...lyrics.lyricLines].sort((a, b) => a.startTime - b.startTime);
		const groups: LineGroup[] = [];

		for (let i = 0; i < sorted.length; i++) {
			const line = sorted[i];
			if (line.isBG) {
				// Attach to the last group if one exists
				if (groups.length > 0) {
					groups[groups.length - 1].bg.push(line);
				} else {
					groups.push({ main: line, bg: [] });
				}
			} else {
				groups.push({ main: line, bg: [] });
			}
		}

		return groups;
	}, [lyrics.lyricLines]);

	const activeLineIdsSet = useMemo(() => new Set(activeLineIds), [activeLineIds]);

	// Scroll to the active group
	useEffect(() => {
		const activeGroupIndex = lineGroups.findIndex(
			g => activeLineIdsSet.has(g.main.id) || g.bg.some(b => activeLineIdsSet.has(b.id))
		);
		if (activeGroupIndex === -1) { lastScrolledId.current = null; return; }

		const groupId = lineGroups[activeGroupIndex].main.id;
		if (groupId === lastScrolledId.current) return;
		lastScrolledId.current = groupId;

		const container = scrollContainerRef.current;
		if (container) {
			const wrapperEl = container.children[activeGroupIndex + 1] as HTMLElement;
			if (wrapperEl) {
				// The wrapper has display:contents so it has no layout box (offsetTop = 0).
				// Use its firstElementChild (the actual lineGroup div) for the real position.
				const lineEl = (wrapperEl.firstElementChild as HTMLElement) ?? wrapperEl;
				const targetScroll = lineEl.offsetTop - (container.clientHeight * 0.40) + (lineEl.clientHeight / 2);
				container.scrollTo({ top: targetScroll, behavior: "smooth" });
			}
		}
	}, [activeLineIdsSet, lineGroups]);

	const handleLineClick = (line: any) => {
		setCurrentTime(line.startTime);
		setSelectedLines(new Set([line.id]));
		audioEngine.seekMusic(line.startTime / 1000);
	};

	const handleWordClick = (time: number) => {
		setCurrentTime(time);
		audioEngine.seekMusic(time / 1000);
	};

	return (
		<div className={classNames(styles.amllWrapper, darkMode && styles.isDark)}>
			<div className={styles.contentOverlay}>
				<div className={styles.header}>
					<h3>{projectIdentity.name || "Untitled"}</h3>
					<span>{projectIdentity.artist || "Unknown Artist"}</span>
				</div>

				<div className={styles.lyricsViewport} ref={scrollContainerRef}>
					<div className={styles.padding} />
					{lineGroups.map((group) => {
						const isActive = activeLineIdsSet.has(group.main.id) || group.bg.some(b => activeLineIdsSet.has(b.id));
						const isPast = group.main.endTime < /* currentTime */ 0; // static; controlled by group state

						if (isActive) {
							return (
								<div key={group.main.id} onClick={() => handleLineClick(group.main)} style={{ display: 'contents' }}>
									<ActiveLineGroup group={group} onWordClick={handleWordClick} />
								</div>
							);
						}
						return (
							<div key={group.main.id} onClick={() => handleLineClick(group.main)} style={{ display: 'contents' }}>
								<StaticLineGroup group={group} isPast={false} />
							</div>
						);
					})}
					<div className={styles.padding} />
				</div>
			</div>
		</div>
	);
});

export default AMLLWrapper;

