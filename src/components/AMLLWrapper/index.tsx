import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import classNames from "classnames";
import { useAtomValue, useSetAtom } from "jotai";
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

// Staticly rendered words for non-active lines
const StaticLineWords = memo(({ words, isPast, onWordClick }: { 
	words: any[], 
	isPast: boolean,
	onWordClick: (time: number) => void 
}) => {
	return (
		<div className={styles.wordsContainer}>
			{words.map((word, wIdx) => (
				<span 
					key={word.id || wIdx} 
					className={classNames(styles.word, isPast && styles.wordPast)}
					onClick={(e) => { e.stopPropagation(); onWordClick(word.startTime); }}
				>
					{word.word}
				</span>
			))}
		</div>
	);
});

// Real-time synchronization for ACTIVE lines
const ActiveLineWords = memo(({ words, onWordClick }: { 
	words: any[],
	onWordClick: (time: number) => void 
}) => {
	const currentTime = useAtomValue(currentTimeAtom);
	return (
		<div className={styles.wordsContainer}>
			{words.map((word, wIdx) => {
				const isWordActive = currentTime >= word.startTime && currentTime <= word.endTime;
				const isWordPast = currentTime > word.endTime;
				return (
					<span 
						key={word.id || wIdx} 
						className={classNames(
							styles.word, 
							isWordActive && styles.wordActive, 
							isWordPast && styles.wordPast
						)}
						onClick={(e) => { e.stopPropagation(); onWordClick(word.startTime); }}
					>
						{word.word}
					</span>
				);
			})}
		</div>
	);
});

// Highly optimized Line component
const LyricLine = memo(({ line, isActive, isPast, onLineClick, onWordClick }: { 
	line: any, 
	isActive: boolean, 
	isPast: boolean,
	onLineClick: (line: any) => void,
	onWordClick: (time: number) => void
}) => {
	const showTranslation = useAtomValue(showTranslationLinesAtom);
	const showRoman = useAtomValue(showRomanLinesAtom);

	// Determine part-specific classes
	const isDuetR = line.isDuet; 

	return (
		<div
			className={classNames(
				styles.line, 
				isActive && styles.lineActive,
				isPast && styles.linePast,
				line.isBG && styles.lineBG,
				isDuetR && styles.lineDuetR
			)}
			onClick={() => onLineClick(line)}
		>
			<Flex direction="column" className={styles.lineContent}>
				{isActive ? (
					<ActiveLineWords words={line.words} onWordClick={onWordClick} />
				) : (
					<StaticLineWords words={line.words} isPast={isPast} onWordClick={onWordClick} />
				)}
				
				{showTranslation && line.translatedLyric && (
					<Text className={styles.extraLine}>{line.translatedLyric}</Text>
				)}
				{showRoman && line.romanLyric && (
					<Text className={styles.extraLine}>{line.romanLyric}</Text>
				)}
			</Flex>
		</div>
	);
});

export const AMLLWrapper = memo(() => {
	const lyrics = useAtomValue(lyricLinesAtom);
	const activeLineIds = useAtomValue(activeLineIdsAtom); 
	const darkMode = useAtomValue(isDarkThemeAtom);
	const projectIdentity = useAtomValue(projectIdentityAtom);
	const currentTime = useAtomValue(currentTimeAtom);
	const setCurrentTime = useSetAtom(currentTimeAtom);
	const setSelectedLines = useSetAtom(selectedLinesAtom);

	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const lastScrolledId = useRef<string | null>(null);

	const sortedLines = useMemo(() => {
		return [...lyrics.lyricLines].sort((a, b) => a.startTime - b.startTime);
	}, [lyrics.lyricLines]);

	const activeLineIdsSet = useMemo(() => new Set(activeLineIds), [activeLineIds]);

	// Auto-scroll logic: centered on the first active line that isn't a BG, or just the first active one
	useEffect(() => {
		const activeLines = sortedLines.filter(l => activeLineIdsSet.has(l.id));
		const primaryLine = activeLines.find(l => !l.isBG) ?? activeLines[0];
		
		if (primaryLine && primaryLine.id !== lastScrolledId.current) {
			lastScrolledId.current = primaryLine.id;
			const container = scrollContainerRef.current;
			if (container) {
				const primaryIndex = sortedLines.findIndex(l => l.id === primaryLine.id);
				const activeEl = container.children[primaryIndex + 1] as HTMLElement;
				if (activeEl) {
					container.scrollTo({ 
						top: activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2, 
						behavior: "smooth" 
					});
				}
			}
		}
	}, [activeLineIdsSet, sortedLines]);

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
					<Heading size="3" trim="both">{projectIdentity.name || "Untitled"}</Heading>
					<Text size="1" color="gray">{projectIdentity.artist || "Unknown"}</Text>
				</div>

				<div className={styles.lyricsViewport} ref={scrollContainerRef}>
					<div className={styles.padding} />
					{sortedLines.map((line, idx) => (
						<LyricLine 
							key={line.id}
							line={line}
							isActive={activeLineIdsSet.has(line.id)}
							isPast={currentTime > line.endTime}
							onLineClick={handleLineClick}
							onWordClick={handleWordClick}
						/>
					))}
					<div className={styles.padding} />
				</div>
			</div>
		</div>
	);
});

export default AMLLWrapper;
