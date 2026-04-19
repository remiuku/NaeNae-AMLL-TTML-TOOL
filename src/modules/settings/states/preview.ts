import { atomWithStorage } from "jotai/utils";

export enum PreviewModeType {
	Standard = "standard",
	AMLL = "amll",
	Timing = "timing",
}

export const previewModeTypeAtom = atomWithStorage<PreviewModeType>(
	"previewModeType",
	PreviewModeType.AMLL,
);

export const showTranslationLinesAtom = atomWithStorage(
	"showTranslationLines",
	false,
);
export const showRomanLinesAtom = atomWithStorage("showRomanLines", false);
export const hideObsceneWordsAtom = atomWithStorage("hideObsceneWords", false);
export const lyricWordFadeWidthAtom = atomWithStorage(
	"lyricWordFadeWidth",
	0.5,
);
