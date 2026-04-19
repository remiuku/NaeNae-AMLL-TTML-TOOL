import { 
    LyricPlayer, 
    BackgroundRender,
} from "@applemusic-like-lyrics/react";
import { type LyricLine as AMLLLyricLine } from "@applemusic-like-lyrics/core";
import { useAtomValue } from "jotai";
import { memo } from "react";
import { currentTimeAtom } from "$/modules/audio/states";
import { isDarkThemeAtom, lyricLinesAtom } from "$/states/main.ts";
import { customBackgroundImageAtom } from "$/modules/settings/modals/customBackground";
import styles from "./OriginalAMLL.module.css";
import classNames from "classnames";

/**
 * @description The original AMLL player using the LOCAL LIBRARY FORK.
 * This provides the full development-state experience from the applemusic-like-lyrics-main repo.
 */
export const OriginalAMLL = memo(() => {
	const lyrics = useAtomValue(lyricLinesAtom);
	const darkMode = useAtomValue(isDarkThemeAtom);
	const currentTime = useAtomValue(currentTimeAtom);
	const albumImg = useAtomValue(customBackgroundImageAtom);

	// Convert our internal LyricLine to AMLL library format
	const amllLines = useMemo(() => {
        const lines = (lyrics?.lyricLines as any) as AMLLLyricLine[];
        console.log("[OriginalAMLL] Processing lyrics:", { count: lines?.length, firstLine: lines?.[0] });
        return lines || [];
    }, [lyrics]);

    useEffect(() => {
        console.log("[OriginalAMLL] Component mounted. DarkMode:", darkMode, "Time:", currentTime);
    }, []);

	return (
		<div className={classNames(styles.amllContainer, darkMode && styles.isDark)}>
            {/* Fluid Background Layer from Local Repo */}
            <div className={styles.bgLayer}>
                {albumImg ? (
                    <BackgroundRender 
                        album={albumImg} 
                        playing={true}
                        fps={60}
                    />
                ) : (
                    <div className={styles.placeholderBg}>No Album Image</div>
                )}
            </div>

            {/* Lyrics Content Layer from Local Repo */}
            <div className={styles.lyricsLayer}>
                <div style={{ position: "absolute", top: 10, left: 10, color: "red", zIndex: 999 }}>AMLL MODE ACTIVE (v0.4.0 Fork)</div>
                {amllLines.length > 0 ? (
                    <LyricPlayer
                        lyricLines={amllLines}
                        currentTime={currentTime}
                        className="amll-player-instance"
                    />
                ) : (
                    <div className={styles.noLyrics}>No lyrics available in store</div>
                )}
            </div>
		</div>
	);
});

export default OriginalAMLL;
