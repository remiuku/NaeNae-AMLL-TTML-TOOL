import {
	SubtractRegular,
	AddRegular,
	CheckmarkRegular,
	DismissRegular,
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
} from "@radix-ui/themes";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useSetImmerAtom } from "jotai-immer";
import type { FC } from "react";
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

export const TimeShiftToolbar: FC = () => {
	const { t } = useTranslation();
	const [previewOffset, setPreviewOffset] = useAtom(timeShiftPreviewOffsetAtom);
	const [previewActive, setPreviewActive] = useAtom(timeShiftPreviewActiveAtom);
	const previewScope = useAtomValue(timeShiftPreviewScopeAtom);
	const previewRange = useAtomValue(timeShiftPreviewCustomRangeAtom);
	const setPreviewScope = useSetAtom(timeShiftPreviewScopeAtom);
	const setDialogVisible = useSetAtom(timeShiftDialogAtom);
	
	const lyricLines = useAtomValue(lyricLinesAtom);
	const selectedLines = useAtomValue(selectedLinesAtom);
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);

	if (!previewActive) return null;

	const handleApply = () => {
		const offset = previewOffset;
		if (offset === 0) {
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

	const adjustOffset = (delta: number) => {
		setPreviewOffset((prev) => prev + delta);
	};

	return (
		<Theme appearance="dark">
			<Box className={styles.toolbarContainer}>
				<Flex align="center" gap="4">
					<Flex direction="column" gap="0">
						<Text size="1" weight="bold" style={{ color: "var(--accent-11)", lineHeight: 1 }}>
							{t("timeShiftDialog.title", "Time Shift")}
						</Text>
						<Text size="2" style={{ minWidth: "60px", fontVariantNumeric: "tabular-nums", fontWeight: "bold" }}>
							{previewOffset > 0 ? "+" : ""}{previewOffset}ms
						</Text>
					</Flex>

					<Box className={styles.divider} />
					
					<Flex align="center" gap="2" className={styles.controlGroup}>
						<IconButton size="1" variant="ghost" onClick={() => adjustOffset(-100)}>
							<SubtractRegular />
						</IconButton>
						<IconButton size="1" variant="ghost" onClick={() => adjustOffset(-10)}>
							<SubtractRegular />
						</IconButton>
						
						<Box style={{ width: 120 }}>
							<Slider
								size="1"
								min={-2000}
								max={2000}
								step={10}
								value={[previewOffset]}
								onValueChange={(v) => setPreviewOffset(v[0])}
							/>
						</Box>

						<IconButton size="1" variant="ghost" onClick={() => adjustOffset(10)}>
							<AddRegular />
						</IconButton>
						<IconButton size="1" variant="ghost" onClick={() => adjustOffset(100)}>
							<AddRegular />
						</IconButton>
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
						<IconButton size="2" color="gray" variant="soft" onClick={handleCancel} title={t("common.cancel", "Cancel")}>
							<DismissRegular />
						</IconButton>
						<Button size="1" variant="solid" onClick={handleApply}>
							<CheckmarkRegular /> {t("common.apply", "Apply")}
						</Button>
					</Flex>
				</Flex>
			</Box>
		</Theme>
	);
};
