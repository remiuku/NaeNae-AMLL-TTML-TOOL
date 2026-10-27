import {
	Button,
	Dialog,
	Flex,
	Grid,
	Select,
	Separator,
	Switch,
	Text,
	TextArea,
	TextField,
	VisuallyHidden,
} from "@radix-ui/themes";
import { atom, useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { atomWithStorage } from "jotai/utils";
import {
	memo,
	type PropsWithChildren,
	useCallback,
	useEffect,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { applyReviewedSections } from "$/modules/lyric-editor/utils/section-system.ts";
import {
	hasReviewableSections,
	type ReviewedSection,
	SectionImportReviewDialog,
} from "$/modules/lyrics-import/modals/SectionImportReviewDialog";
import {
	prepareTextImport,
	textToLines,
} from "$/modules/project/logic/text-to-lines";
import {
	geniusCategorizationEnabledAtom,
	geniusHeaderDetectionDialogOpenAtom,
	geniusHeaderDetectionDialogShownAtom,
	geniusHeaderRestorationTextAtom,
	normalizeApostrophesOnImportAtom,
	normalizeCyrillicEsOnImportAtom,
} from "$/modules/settings/states/index.ts";
import {
	confirmDialogAtom,
	importFromTextDialogAtom,
} from "$/states/dialogs.ts";
import {
	isDirtyAtom,
	lyricLinesAtom,
	selectedLinesAtom,
	selectedWordsAtom,
} from "$/states/main.ts";
import {
	normalizeImportedLyricApostrophes,
	normalizeImportedLyricCyrillicEs,
} from "$/utils/apostrophe-normalization";
import { error as logError } from "$/utils/logging.ts";

// type IModelDeltaDecoration = monaco.editor.IModelDeltaDecoration;
// type IEditorDecorationsCollection = monaco.editor.IEditorDecorationsCollection;

const PrefText = memo((props: PropsWithChildren) => (
	<Text color="gray" size="2">
		{props.children}
	</Text>
));

enum ImportMode {
	Lyric = "lyric",
	LyricTrans = "lyric-trans",
	LyricRoman = "lyric-roman",
	LyricTransRoman = "lyric-trans-roman",
}

enum LineSeparatorMode {
	Interleaved = "interleaved-line",
	SameLineSeparator = "same-line-separator",
}

const importModeAtom = atomWithStorage(
	"importFromText.importMode",
	ImportMode.Lyric,
);
const lineSeparatorModeAtom = atomWithStorage(
	"importFromText.lineSeparatorMode",
	LineSeparatorMode.Interleaved,
);
const lineSeparatorAtom = atomWithStorage("importFromText.lineSeparator", "|");
const swapTransAndRomanAtom = atomWithStorage(
	"importFromText.swapTransAndRoman",
	false,
);
const wordSeparatorAtom = atomWithStorage("importFromText.wordSeparator", "\\");
const enableSpecialPrefixAtom = atomWithStorage(
	"importFromText.enableSpecialPrefix",
	true,
);
const bgLyricPrefixAtom = atomWithStorage("importFromText.bgLyricPrefix", "<");
const duetLyricPrefixAtom = atomWithStorage(
	"importFromText.duetLyricPrefix",
	">",
);
const textValueAtom = atom("");

const ImportFromTextEditor = memo(() => {
	const [value, setValue] = useAtom(textValueAtom);
	return (
		<TextArea
			style={{
				height: "calc(80vh - 120px)",
				flex: "1 1 auto",
			}}
			value={value}
			onChange={(evt) => setValue(evt.currentTarget.value)}
		/>
	);
});

export const ImportFromText = () => {
	const setConfirmDialog = useSetAtom(confirmDialogAtom);
	const isDirty = useAtomValue(isDirtyAtom);
	const { t } = useTranslation();

	const [importFromTextDialog, setImportFromTextDialog] = useAtom(
		importFromTextDialogAtom,
	);

	const [importMode, setImportMode] = useAtom(importModeAtom);
	const [lineSeparatorMode, setLineSeparatorMode] = useAtom(
		lineSeparatorModeAtom,
	);
	const [lineSeparator, setLineSeparator] = useAtom(lineSeparatorAtom);
	const [swapTransAndRoman, setSwapTransAndRoman] = useAtom(
		swapTransAndRomanAtom,
	);
	const [wordSeparator, setWordSeparator] = useAtom(wordSeparatorAtom);
	const [enableSpecialPrefix, setEnableSpecialPrefix] = useAtom(
		enableSpecialPrefixAtom,
	);
	const [bgLyricPrefix, setBgLyricPrefix] = useAtom(bgLyricPrefixAtom);
	const [duetLyricPrefix, setDuetLyricPrefix] = useAtom(duetLyricPrefixAtom);
	const [geniusCategorizationEnabled, setGeniusCategorizationEnabled] = useAtom(
		geniusCategorizationEnabledAtom,
	);
	const setGeniusDetectionDialogOpen = useSetAtom(
		geniusHeaderDetectionDialogOpenAtom,
	);
	const geniusDetectionDialogShown = useAtomValue(
		geniusHeaderDetectionDialogShownAtom,
	);
	const [restorationText, setRestorationText] = useAtom(
		geniusHeaderRestorationTextAtom,
	);
	const setValue = useSetAtom(textValueAtom);
	const textValue = useAtomValue(textValueAtom);
	const [sectionReviewOpen, setSectionReviewOpen] = useState(false);
	const [sectionReviewSubmitted, setSectionReviewSubmitted] = useState(false);

	// Restore headers if the user enables the feature while we have a pending restoration
	useEffect(() => {
		if (geniusCategorizationEnabled && restorationText) {
			setValue(restorationText);
			setRestorationText(null);
			toast.info(
				t(
					"experimentalFeatures.geniusCategorization.headersRestored",
					"Section headers restored.",
				),
			);
		}
	}, [
		geniusCategorizationEnabled,
		restorationText,
		setValue,
		setRestorationText,
		t,
	]);

	const store = useStore();

	const onImport = useCallback(
		(text: string, reviewed: ReviewedSection[] = []) => {
			const importMode = store.get(importModeAtom);
			const lineSeparatorMode = store.get(lineSeparatorModeAtom);
			const lineSeparator = store.get(lineSeparatorAtom);
			const swapTransAndRoman = store.get(swapTransAndRomanAtom);
			const wordSeparator = store.get(wordSeparatorAtom);
			const enableSpecialPrefix = store.get(enableSpecialPrefixAtom);
			const bgLyricPrefix = store.get(bgLyricPrefixAtom);
			const duetLyricPrefix = store.get(duetLyricPrefixAtom);
			const normalizeApostrophesOnImport = store.get(
				normalizeApostrophesOnImportAtom,
			);
			const normalizeCyrillicEsOnImport = store.get(
				normalizeCyrillicEsOnImportAtom,
			);

			const result = textToLines(text, {
				mode: importMode,
				lineSeparatorMode,
				lineSeparator,
				swapTransAndRoman,
				wordSeparator,
				sectionHeaders: geniusCategorizationEnabled ? "categorize" : "preserve",
				blankLines: "preserve",
				backgroundPrefix: enableSpecialPrefix ? bgLyricPrefix : "",
				duetPrefix: enableSpecialPrefix ? duetLyricPrefix : "",
			});

			const importedLyrics = {
				lyricLines: result,
				metadata: [],
				sections: [],
			};
			applyReviewedSections(importedLyrics, reviewed);
			store.set(
				lyricLinesAtom,
				normalizeImportedLyricCyrillicEs(
					normalizeImportedLyricApostrophes(
						importedLyrics,
						normalizeApostrophesOnImport,
					),
					normalizeCyrillicEsOnImport,
				),
			);
			if (result.length > 0) {
				store.set(selectedLinesAtom, new Set([result[0].id]));
				if (result[0].words.length > 0) {
					store.set(selectedWordsAtom, new Set([result[0].words[0].id]));
				}
			} else {
				store.set(selectedLinesAtom, new Set());
				store.set(selectedWordsAtom, new Set());
			}
			setImportFromTextDialog(false);
		},
		[store, setImportFromTextDialog, geniusCategorizationEnabled],
	);

	const handleProcessLyrics = useCallback(() => {
		const text = store.get(textValueAtom);

		const lines = text.split("\n");
		setValue(prepareTextImport(text, geniusCategorizationEnabled));

		// Set settings to match this format
		setWordSeparator("\\");
		setEnableSpecialPrefix(true);

		// Trigger Genius detection if headers were found but skipped (because disabled)
		const hasHeaders = lines.some(
			(l) => l.trim().startsWith("[") && l.trim().endsWith("]"),
		);
		if (
			hasHeaders &&
			!geniusCategorizationEnabled &&
			!geniusDetectionDialogShown
		) {
			setRestorationText(prepareTextImport(text, true));
			setGeniusDetectionDialogOpen(true);
		}

		toast.success(
			t(
				"textImportDialog.processedSuccess",
				"Lyrics prepared for syllable syncing.",
			),
		);
	}, [
		store,
		setValue,
		t,
		setWordSeparator,
		geniusCategorizationEnabled,
		geniusDetectionDialogShown,
		setGeniusDetectionDialogOpen,
		setEnableSpecialPrefix,
		setRestorationText,
	]);

	return (
		<>
			<Dialog.Root
				open={
					importFromTextDialog && !sectionReviewOpen && !sectionReviewSubmitted
				}
				onOpenChange={setImportFromTextDialog}
			>
				<Dialog.Content maxWidth="1100px" maxHeight="90vh">
					<VisuallyHidden>
						<Dialog.Description>
							{t(
								"textImportDialog.description",
								"Import lyrics from plain text or other formats.",
							)}
						</Dialog.Description>
					</VisuallyHidden>
					<Flex direction="column" style={{ minHeight: "80vh" }}>
						<Flex direction="column" gap="4">
							<Flex
								align="center"
								justify="between"
								pb="2"
								style={{ borderBottom: "1px solid var(--gray-5)" }}
							>
								<Dialog.Title style={{ marginBottom: 0 }}>
									{t("textImportDialog.title", "Import lyrics from plain text")}
								</Dialog.Title>
							</Flex>

							<Flex direction="column" gap="4">
								<Flex justify="end" gap="2">
									<Button variant="soft" onClick={handleProcessLyrics}>
										{t("textImportDialog.processLyrics", "Process lyrics")}
									</Button>
									<Button
										onClick={() => {
											try {
												const text = store.get(textValueAtom);
												if (
													geniusCategorizationEnabled &&
													hasReviewableSections(text)
												) {
													setSectionReviewOpen(true);
													return;
												}
												const importAction = () => {
													onImport(text);
													setImportFromTextDialog(false);
												};
												if (isDirty)
													setConfirmDialog({
														open: true,
														title: t(
															"confirmDialog.importFile.title",
															"Import new lyrics?",
														),
														description: t(
															"confirmDialog.importFile.description",
															"当前文件有未保存的更改。如果继续，这些更改将会丢失。确定要导入歌词吗？",
														),
														onConfirm: () => importAction(),
													});
												else importAction();
											} catch (e) {
												toast.error(
													"导入纯文本歌词失败，请检查输入的文本是否正确，或者导入设置是否正确",
												);
												logError(e);
											}
										}}
									>
										{t("textImportDialog.actionButton", "导入歌词")}
									</Button>
								</Flex>
								<Flex
									gap="4"
									direction={{
										initial: "column",
										sm: "row",
									}}
								>
									<ImportFromTextEditor />
									<Grid
										columns="2"
										gapY="2"
										gapX="4"
										style={{
											whiteSpace: "nowrap",
											flex: "0 0 auto",
											alignItems: "center",
											alignContent: "start",
											textAlign: "end",
										}}
									>
										<PrefText>
											{t("textImportDialog.contentMode.caption", "导入模式")}
										</PrefText>
										<Select.Root
											value={importMode}
											onValueChange={(v) => setImportMode(v as ImportMode)}
										>
											<Select.Trigger />
											<Select.Content>
												<Select.Item value={ImportMode.Lyric}>
													{t(
														"textImportDialog.contentMode.lyric",
														"Lyrics only",
													)}
												</Select.Item>
												<Select.Item value={ImportMode.LyricTrans}>
													{t(
														"textImportDialog.contentMode.withTranslation",
														"歌词和翻译歌词",
													)}
												</Select.Item>
												<Select.Item value={ImportMode.LyricRoman}>
													{t(
														"textImportDialog.contentMode.withRoman",
														"歌词和音译歌词",
													)}
												</Select.Item>
												<Select.Item value={ImportMode.LyricTransRoman}>
													{t(
														"textImportDialog.contentMode.withBoth",
														"Lyrics with translation and romanization",
													)}
												</Select.Item>
											</Select.Content>
										</Select.Root>

										<PrefText>
											{t(
												"textImportDialog.separationMode.caption",
												"Translation and romanization layout",
											)}
										</PrefText>
										<Select.Root
											disabled={importMode === ImportMode.Lyric}
											value={lineSeparatorMode}
											onValueChange={(v) =>
												setLineSeparatorMode(v as LineSeparatorMode)
											}
										>
											<Select.Trigger />
											<Select.Content>
												<Select.Item value={LineSeparatorMode.Interleaved}>
													{t(
														"textImportDialog.separationMode.multipleLine",
														"On separate lines",
													)}
												</Select.Item>
												<Select.Item
													value={LineSeparatorMode.SameLineSeparator}
												>
													{t(
														"textImportDialog.separationMode.sameLine",
														"On the same line",
													)}
												</Select.Item>
											</Select.Content>
										</Select.Root>

										<PrefText>
											{t("textImportDialog.separator", "Line separator")}
										</PrefText>
										<TextField.Root
											disabled={
												importMode === ImportMode.Lyric ||
												lineSeparatorMode !==
													LineSeparatorMode.SameLineSeparator
											}
											value={lineSeparator}
											onChange={(evt) =>
												setLineSeparator(evt.currentTarget.value)
											}
										/>

										<PrefText>
											{t(
												"textImportDialog.swapTransAndRoman",
												"交换翻译行和音译行",
											)}
										</PrefText>
										<Switch
											checked={swapTransAndRoman}
											onCheckedChange={setSwapTransAndRoman}
										/>

										<PrefText>
											{t("textImportDialog.wordSeparator", "Word separator")}
										</PrefText>
										<TextField.Root
											value={wordSeparator}
											onChange={(evt) =>
												setWordSeparator(evt.currentTarget.value)
											}
										/>

										<PrefText>
											{t(
												"textImportDialog.enableSpecialPrefix",
												"Use line prefixes",
											)}
										</PrefText>
										<Switch
											checked={enableSpecialPrefix}
											onCheckedChange={setEnableSpecialPrefix}
										/>

										<PrefText>
											{t(
												"textImportDialog.bgLyricPrefix",
												"Background line prefix",
											)}
										</PrefText>
										<TextField.Root
											disabled={!enableSpecialPrefix}
											value={bgLyricPrefix}
											onChange={(evt) =>
												setBgLyricPrefix(evt.currentTarget.value)
											}
										/>

										<PrefText>
											{t(
												"textImportDialog.duetLyricPrefix",
												"Duet line prefix",
											)}
										</PrefText>
										<TextField.Root
											disabled={!enableSpecialPrefix}
											value={duetLyricPrefix}
											onChange={(evt) =>
												setDuetLyricPrefix(evt.currentTarget.value)
											}
										/>

										<Separator size="4" style={{ gridColumn: "span 2" }} />
										<PrefText>
											{t(
												"experimentalFeatures.geniusCategorization.title",
												"Genius sections",
											)}
										</PrefText>
										<Switch
											checked={geniusCategorizationEnabled}
											onCheckedChange={setGeniusCategorizationEnabled}
										/>
									</Grid>
								</Flex>
							</Flex>
						</Flex>
					</Flex>
				</Dialog.Content>
			</Dialog.Root>
			<SectionImportReviewDialog
				open={sectionReviewOpen}
				sourceText={textValue}
				onSourceTextChange={setValue}
				onCancel={() => setSectionReviewOpen(false)}
				onConfirm={(sections) => {
					const importAction = () => {
						onImport(store.get(textValueAtom), sections);
						setSectionReviewOpen(false);
						setSectionReviewSubmitted(false);
						setImportFromTextDialog(false);
					};
					if (isDirty) {
						setSectionReviewSubmitted(true);
						setSectionReviewOpen(false);
						setConfirmDialog({
							open: true,
							title: t("confirmDialog.importFile.title", "Import new lyrics?"),
							description: t(
								"confirmDialog.importFile.description",
								"This project has unsaved changes. Importing will replace its lyrics. Continue?",
							),
							onConfirm: importAction,
							onCancel: () => setSectionReviewSubmitted(false),
						});
					} else {
						importAction();
					}
				}}
			/>
		</>
	);
};
