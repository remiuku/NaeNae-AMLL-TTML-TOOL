import {
	SubtractRegular,
	AddRegular,
	CheckmarkRegular,
	DismissRegular,
	CopyRegular,
	ArrowRightRegular,
} from "@fluentui/react-icons";
import {
	Button,
	Flex,
	IconButton,
	Slider,
	Text,
	Box,
	Theme,
	Select,
	TextField,
	SegmentedControl,
} from "@radix-ui/themes";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useSetImmerAtom } from "jotai-immer";
import { type FC, useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
	timeShiftPreviewOffsetAtom,
	timeShiftPreviewActiveAtom,
	timeShiftPreviewScopeAtom,
	timeShiftPreviewCustomRangeAtom,
	timeShiftDialogAtom,
} from "$/states/dialogs.ts";
import { lyricLinesAtom, selectedLinesAtom } from "$/states/main.ts";
import styles from "./TimeShiftToolbar.module.css";
import { uid } from "uid";

export const TimeShiftToolbar: FC = () => {
	const { t } = useTranslation();
	const [previewOffset, setPreviewOffset] = useAtom(timeShiftPreviewOffsetAtom);
	const [previewActive, setPreviewActive] = useAtom(timeShiftPreviewActiveAtom);
	const [previewScope, setPreviewScope] = useAtom(timeShiftPreviewScopeAtom);
	const previewRange = useAtomValue(timeShiftPreviewCustomRangeAtom);
	const setDialogVisible = useSetAtom(timeShiftDialogAtom);
	
	const lyricLines = useAtomValue(lyricLinesAtom);
	const selectedLines = useAtomValue(selectedLinesAtom);
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);

	const [isCopyMode, setIsCopyMode] = useState(false);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	const adjustOffset = useCallback((delta: number) => {
		setPreviewOffset((prev) => prev + delta);
	}, [setPreviewOffset]);

	// Default scope to "selected" if lines are selected
	useEffect(() => {
		if (previewActive && selectedLines.size > 0 && previewScope === "all") {
			setPreviewScope("selected");
		}
	}, [previewActive]);

	if (!previewActive) return null;

	const handleApply = () => {
		const offset = previewOffset;
		if (offset === 0 && !isCopyMode) {
			setPreviewActive(false);
			setDialogVisible(false);
			return;
		}

		editLyricLines((draft) => {
			const lines = draft.lyricLines;
			let targetLineIndices: number[] = [];

			if (previewScope === "all") {
				targetLineIndices = lines.map((_, i) => i);
			} else if (previewScope === "selected") {
				targetLineIndices = lines
					.map((l, i) => (selectedLines.has(l.id) ? i : -1))
					.filter((i) => i !== -1);
			} else if (previewScope === "selected-following") {
				let firstSelectedIndex = -1;
				lines.forEach((l, index) => {
					if (selectedLines.has(l.id)) {
						if (firstSelectedIndex === -1 || index < firstSelectedIndex) {
							firstSelectedIndex = index;
						}
					}
				});
				if (firstSelectedIndex !== -1) {
					for (let i = firstSelectedIndex; i < lines.length; i++) {
						targetLineIndices.push(i);
					}
				}
			} else if (previewScope === "custom") {
				const start = previewRange[0] - 1;
				const end = previewRange[1];
				for (let i = start; i < end; i++) {
					if (i >= 0 && i < lines.length) {
						targetLineIndices.push(i);
					}
				}
			}

			if (isCopyMode) {
				const newLines = targetLineIndices.map(index => {
					const line = lines[index];
					const newLine = JSON.parse(JSON.stringify(line));
					newLine.id = uid();
					newLine.startTime += offset;
					newLine.endTime += offset;
					for (const word of newLine.words) {
						word.id = uid();
						word.startTime += offset;
						word.endTime += offset;
						if (word.ruby) {
							for (const ruby of word.ruby) {
								ruby.startTime += offset;
								ruby.endTime += offset;
							}
						}
					}
					return newLine;
				});
				draft.lyricLines.push(...newLines);
				draft.lyricLines.sort((a, b) => a.startTime - b.startTime);
			} else {
				for (const index of targetLineIndices) {
					const line = lines[index];
					line.startTime += offset;
					line.endTime += offset;
					for (const word of line.words) {
						word.startTime += offset;
						word.endTime += offset;
						if (word.ruby) {
							for (const ruby of word.ruby) {
								ruby.startTime += offset;
								ruby.endTime += offset;
							}
						}
					}
				}
			}
		});

		setPreviewActive(false);
		setDialogVisible(false);
		setPreviewOffset(0);
	};

	const handleCancel = () => {
		setPreviewActive(false);
		setDialogVisible(false);
		setPreviewOffset(0);
	};

	const startAdjusting = (delta: number) => {
		adjustOffset(delta);
		intervalRef.current = setInterval(() => {
			adjustOffset(delta);
		}, 100);
	};

	const stopAdjusting = () => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	};

	const handleWheel = (e: React.WheelEvent) => {
		const delta = e.deltaY > 0 ? -10 : 10;
		adjustOffset(delta);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number.parseInt(e.target.value.replace(/[^-0-9]/g, ""), 10);
		if (!Number.isNaN(val)) {
			setPreviewOffset(val);
		} else if (e.target.value === "" || e.target.value === "-") {
			setPreviewOffset(0);
		}
	};

	return (
		<Theme appearance="dark">
			<Box className={styles.toolbarContainer} onWheel={handleWheel}>
				<Flex align="center" gap="4">
					<Flex direction="column" gap="0">
						<Text size="1" weight="bold" style={{ color: "var(--accent-11)", lineHeight: 1 }}>
							{t("timeShiftDialog.title", "Time Shift")}
						</Text>
						<SegmentedControl.Root 
							size="1" 
							value={isCopyMode ? "copy" : "move"} 
							onValueChange={(v) => setIsCopyMode(v === "copy")}
							style={{ marginTop: 4 }}
						>
							<SegmentedControl.Item value="move">
								<Flex align="center" gap="1"><ArrowRightRegular fontSize={12}/>{t("common.move", "Move")}</Flex>
							</SegmentedControl.Item>
							<SegmentedControl.Item value="copy">
								<Flex align="center" gap="1"><CopyRegular fontSize={12}/>{t("common.copy", "Copy")}</Flex>
							</SegmentedControl.Item>
						</SegmentedControl.Root>
					</Flex>

					<Box className={styles.divider} />
					
					<Flex align="center" gap="2" className={styles.controlGroup}>
						<IconButton 
							size="1" 
							variant="ghost" 
							onMouseDown={() => startAdjusting(-100)}
							onMouseUp={stopAdjusting}
							onMouseLeave={stopAdjusting}
							onClick={() => adjustOffset(-100)}
						>
							<SubtractRegular />
						</IconButton>
						<IconButton 
							size="1" 
							variant="ghost" 
							onMouseDown={() => startAdjusting(-10)}
							onMouseUp={stopAdjusting}
							onMouseLeave={stopAdjusting}
							onClick={() => adjustOffset(-10)}
						>
							<SubtractRegular />
						</IconButton>
						
						<Box style={{ width: 120 }}>
							<Slider
								size="1"
								min={-10000}
								max={10000}
								step={10}
								value={[previewOffset]}
								onValueChange={(v) => setPreviewOffset(v[0])}
							/>
						</Box>

						<IconButton 
							size="1" 
							variant="ghost" 
							onMouseDown={() => startAdjusting(10)}
							onMouseUp={stopAdjusting}
							onMouseLeave={stopAdjusting}
							onClick={() => adjustOffset(10)}
						>
							<AddRegular />
						</IconButton>
						<IconButton 
							size="1" 
							variant="ghost" 
							onMouseDown={() => startAdjusting(100)}
							onMouseUp={stopAdjusting}
							onMouseLeave={stopAdjusting}
							onClick={() => adjustOffset(100)}
						>
							<AddRegular />
						</IconButton>
					</Flex>

					<Box className={styles.divider} />

					<Flex align="center" gap="1">
						<TextField.Root
							size="1"
							value={previewOffset === 0 ? "" : (previewOffset > 0 ? `+${previewOffset}` : String(previewOffset))}
							onChange={handleInputChange}
							placeholder="0"
							style={{ width: 80, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
						>
							<TextField.Slot side="right">ms</TextField.Slot>
						</TextField.Root>
					</Flex>

					<Box className={styles.divider} />

					<Flex align="center" gap="2">
						<Text size="1" color="gray">{t("timeShiftDialog.scopeLabel", "Scope")}</Text>
						<Select.Root
							size="1"
							value={previewScope}
							onValueChange={(v: any) => setPreviewScope(v)}
						>
							<Select.Trigger variant="soft" style={{ minWidth: 100 }} />
							<Select.Content>
								<Select.Item value="all">{t("timeShiftDialog.scope.all", "All")}</Select.Item>
								<Select.Item value="selected">{t("timeShiftDialog.scope.selected", "Selected")}</Select.Item>
								<Select.Item value="selected-following">{t("timeShiftDialog.scope.selectedFollowing", "Following")}</Select.Item>
								<Select.Item value="custom">{t("timeShiftDialog.scope.custom", "Custom")}</Select.Item>
							</Select.Content>
						</Select.Root>
					</Flex>

					<Box className={styles.divider} />

					<Flex gap="2">
						<Button size="2" variant="solid" onClick={handleApply}>
							<CheckmarkRegular /> {isCopyMode ? t("common.copy", "Copy") : t("common.apply", "Apply")}
						</Button>
						<IconButton size="2" color="gray" variant="soft" onClick={handleCancel} title={t("common.cancel", "Cancel")}>
							<DismissRegular />
						</IconButton>
					</Flex>
				</Flex>
			</Box>
		</Theme>
	);
};
