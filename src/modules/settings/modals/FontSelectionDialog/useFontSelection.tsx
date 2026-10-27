import { useAtom, useSetAtom } from "jotai";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { fontSelectionDialogAtom } from "$/states/dialogs";
import {
	appFontAtom,
	appFontStyleAtom,
	appFontWeightAtom,
	customFontDataAtom,
	customFontNameAtom,
	DEFAULT_APP_FONT,
} from "../../states/index.ts";
import { GOOGLE_FONTS, SYSTEM_FONTS } from "./catalog";
import { filterFonts, getImportedFontName } from "./fontHelpers";
export function useFontSelection() {
	const { t } = useTranslation();
	const [isOpen, setIsOpen] = useAtom(fontSelectionDialogAtom);
	const [appFont, setAppFont] = useAtom(appFontAtom);
	const [appFontWeight, setAppFontWeight] = useAtom(appFontWeightAtom);
	const [appFontStyle, setAppFontStyle] = useAtom(appFontStyleAtom);
	const setCustomFontData = useSetAtom(customFontDataAtom);
	const [customFontName, setCustomFontName] = useAtom(customFontNameAtom);
	const [searchQuery, setSearchQuery] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);
	const filteredGoogleFonts = useMemo(() => {
		return filterFonts(GOOGLE_FONTS, searchQuery);
	}, [searchQuery]);
	const filteredSystemFonts = useMemo(() => {
		return filterFonts(SYSTEM_FONTS, searchQuery);
	}, [searchQuery]);
	const handleSelectFont = (fontFamily: string, isGoogleFont = true) => {
		if (isGoogleFont) {
			setAppFont(`"${fontFamily}", sans-serif`);
			// Ensure it's loaded - simple way is to touch a hidden element or just rely on CSS injection
		} else {
			setAppFont(fontFamily);
		}
		// setIsOpen(false); // Keep it open for user to "preview" maybe?
	};
	const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const dataUrl = event.target?.result as string;
			const fontName = getImportedFontName(file.name);
			setCustomFontData(dataUrl);
			setCustomFontName(fontName);
			setAppFont(`"${fontName}", sans-serif`);
			toast.success(
				t("settings.appearance.fontImportSuccess", "Font imported"),
			);
		};
		reader.readAsDataURL(file);
	};
	const clearCustomFont = () => {
		setCustomFontData(null);
		setCustomFontName(null);
		setAppFont(DEFAULT_APP_FONT);
	};
	return {
		t,
		isOpen,
		setIsOpen,
		appFont,
		setAppFont,
		appFontWeight,
		setAppFontWeight,
		appFontStyle,
		setAppFontStyle,
		setCustomFontData,
		customFontName,
		setCustomFontName,
		searchQuery,
		setSearchQuery,
		fileInputRef,
		filteredGoogleFonts,
		filteredSystemFonts,
		handleSelectFont,
		handleFileImport,
		clearCustomFont,
	};
}
export type FontSelection = ReturnType<typeof useFontSelection>;
