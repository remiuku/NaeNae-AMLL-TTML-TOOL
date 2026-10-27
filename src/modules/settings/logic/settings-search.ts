export const settingsSearchKeywords: Record<string, string> = {
	common:
		"interface language privacy display discord presence compact background vocals sync",
	editor:
		"sync timing timestamp judgment keybinding trigger offset commit smart last word upcoming highlight threshold color wrap scroll focus spectrogram hover tab position preview fps vsync fade romanization translation glow manual double click background line rendering touch panel skip separate pass inline",
	files:
		"import export cleanup normalize apostrophes cyrillic autosave interval snapshots history backup restore folder project storage preview files consecutive standalone background vocals",
	audio:
		"music volume playback speed equalizer gain preset mp3 flac conversion spectrogram palette frequency word timing cue indicator beep click sound start end countdown",
	keybinding:
		"keyboard keys shortcut controls new open save undo redo select delete mode sync playback seek volume segment audition",
	appearance:
		"theme preset custom accent color background blur glass intensity image gradient font interface scale reset layout titlebar sidebar editor chip spacing padding romanization translation scrollbar dialog shadow selection spicy lyrics design dark lavender geist classic",
	about: "version update credits license",
};

export function matchesSettingsSearch(text: string, query: string): boolean {
	const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
	const normalizedText = text.toLocaleLowerCase();
	return tokens.every((token) => normalizedText.includes(token));
}
