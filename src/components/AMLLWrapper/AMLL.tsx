import { 
    LyricPlayer, 
    BackgroundRender,
    MeshGradientRenderer,
} from "@applemusic-like-lyrics/react";
import { useAtomValue } from "jotai";
import { memo, useMemo } from "react";
import { currentTimeAtom } from "$/modules/audio/states";
import { isDarkThemeAtom, lyricLinesAtom } from "$/states/main.ts";
import { customBackgroundImageAtom } from "$/modules/settings/modals/customBackground";
import styles from "./AMLL.module.css";
import classNames from "classnames";

/**
 * @description The high-performance AMLL player utilizing the local rendering engine.
 * Features: Mesh Warp background, Optimized CSS culling, and Fluid typography.
 */
export const AMLL = memo(() => {
	const lyrics = useAtomValue(lyricLinesAtom);
	const darkMode = useAtomValue(isDarkThemeAtom);
	const currentTime = useAtomValue(currentTimeAtom);
	const albumImg = useAtomValue(customBackgroundImageAtom);

	const amllLines = useMemo(() => {
        return (lyrics?.lyricLines as any) || [];
    }, [lyrics]);

	return (
		<div className={classNames(styles.amllContainer, darkMode && styles.isDark)}>
            {/* Fluid Background Layer */}
            <div className={styles.bgLayer}>
                <BackgroundRender 
                    album={albumImg || undefined} // Use undefined for better library compatibility
                    playing={true}
                    fps={60}
                    renderScale={0.7} // Balanced high quality
                    renderer={MeshGradientRenderer}
                />
            </div>

            {/* Lyrics Content Layer */}
            <div className={styles.lyricsLayer}>
                {amllLines.length > 0 ? (
                    <LyricPlayer
                        lyricLines={amllLines}
                        currentTime={currentTime}
                        className="amll-player-instance"
                        enableSpring={false}
                        enableBlur={false}
                        enableScale={true}
                        playing={true}
                    />
                ) : (
                    <div className={styles.noLyrics}>No lyrics available in store</div>
                )}
            </div>
		</div>
	);
});

export default AMLL;
