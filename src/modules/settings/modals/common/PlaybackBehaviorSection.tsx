import {
	ArrowSortDownLines24Regular,
	ArrowSync24Regular,
	Highlight24Regular,
	Target24Regular,
	TextWrap24Regular,
} from "@fluentui/react-icons";
import { Box, Card, Flex, Heading, Switch, Text } from "@radix-ui/themes";
import { OptionPicker } from "$/components/OptionPicker";
import {
	editActiveLineHighlightAtom,
	editAutoScrollAtom,
	syncActiveLineHighlightAtom,
	syncAutoScrollAtom,
} from "$/modules/settings/states/sync";
import { ToolMode } from "$/states/main";
import { SettingToggle } from "../../components/WorkflowControls";
import type { CommonSettings } from "./useCommonSettings";
export const PlaybackBehaviorSection = ({
	syncWordWrap,
	setSyncWordWrap,
	syncFocusMainLine,
	setSyncFocusMainLine,
	playbackSettingsMode,
	setPlaybackSettingsMode,
	syncAutoScroll,
	syncTabPosition,
	setSyncTabPosition,
	t,
}: Pick<
	CommonSettings,
	| "syncWordWrap"
	| "setSyncWordWrap"
	| "syncFocusMainLine"
	| "setSyncFocusMainLine"
	| "playbackSettingsMode"
	| "setPlaybackSettingsMode"
	| "syncAutoScroll"
	| "syncTabPosition"
	| "setSyncTabPosition"
	| "t"
>) => (
	<Flex direction="column" gap="3">
		<Heading size="4">{t("settings.group.syncWordWrap", "Time mode")}</Heading>
		<Card>
			<Text as="label">
				<Flex gap="3" align="center">
					<TextWrap24Regular />
					<Box flexGrow="1">
						<Flex gap="2" align="center" justify="between">
							<Flex direction="column" gap="1">
								<Text>
									{t("settings.common.syncWordWrap", "Wrap words in Time mode")}
								</Text>
								<Text size="1" color="gray">
									{t(
										"settings.common.syncWordWrapDesc",
										"Wrap word cards onto the next line in Time mode instead of scrolling sideways.",
									)}
								</Text>
							</Flex>
							<Switch
								checked={syncWordWrap}
								onCheckedChange={setSyncWordWrap}
							/>
						</Flex>
					</Box>
				</Flex>
			</Text>
		</Card>
		<Flex direction="column" gap="1">
			<Text weight="bold">
				{t("settings.common.playbackSettingsMode", "Playback behavior for")}
			</Text>
			<Text size="1" color="gray">
				{t(
					"settings.common.playbackSettingsModeDesc",
					"Auto-scroll and tab position are set separately for Edit and Time. Pick which one to change.",
				)}
			</Text>
		</Flex>
		<OptionPicker
			variant="segmented"
			size="2"
			value={
				playbackSettingsMode === ToolMode.Edit ? ToolMode.Edit : ToolMode.Sync
			}
			onValueChange={setPlaybackSettingsMode}
			label={t("settings.common.playbackSettingsMode", "Playback behavior for")}
			options={[
				{ value: ToolMode.Edit, label: t("settings.common.editMode", "Edit") },
				{ value: ToolMode.Sync, label: t("settings.common.timeMode", "Time") },
			]}
		/>

		<Card>
			<Text as="label">
				<Flex gap="3" align="center">
					<ArrowSortDownLines24Regular />
					<Box flexGrow="1">
						<Flex gap="2" align="center" justify="between">
							<Flex direction="column" gap="1">
								<Text>
									{t(
										"settings.common.syncAutoScroll",
										"Auto-scroll to active line during playback",
									)}
								</Text>
								<Text size="1" color="gray">
									{t(
										"settings.common.syncAutoScrollDesc",
										"Scrolls the editor to follow the line that is playing.",
									)}
								</Text>
							</Flex>
							<SettingToggle
								setting={
									playbackSettingsMode === ToolMode.Edit
										? editAutoScrollAtom
										: syncAutoScrollAtom
								}
							/>
						</Flex>
					</Box>
				</Flex>
			</Text>
		</Card>
		<Card
			style={{
				opacity: syncAutoScroll ? 1 : 0.4,
				transition: "opacity 0.2s ease",
				pointerEvents: syncAutoScroll ? "auto" : "none",
			}}
		>
			<Text as="label">
				<Flex gap="3" align="center">
					<Target24Regular style={{ opacity: syncAutoScroll ? 1 : 0.5 }} />
					<Box flexGrow="1">
						<Flex gap="2" align="center" justify="between">
							<Flex direction="column" gap="1">
								<Text
									style={{
										color: syncAutoScroll ? undefined : "var(--gray-9)",
									}}
								>
									{t(
										"settings.common.syncFocusMainLine",
										"Focus main line during playback",
									)}
								</Text>
								<Text size="1" color="gray">
									{t(
										"settings.common.syncFocusMainLineDesc",
										"During playback, follow the main line and ignore background lines unless no main line is playing.",
									)}
								</Text>
							</Flex>
							<Switch
								disabled={!syncAutoScroll}
								checked={syncFocusMainLine}
								onCheckedChange={setSyncFocusMainLine}
							/>
						</Flex>
					</Box>
				</Flex>
			</Text>
		</Card>
		<Card>
			<Text as="label">
				<Flex gap="3" align="center">
					<Highlight24Regular />
					<Box flexGrow="1">
						<Flex gap="2" align="center" justify="between">
							<Flex direction="column" gap="1">
								<Text>
									{t(
										"settings.common.highlightActiveLine",
										"Highlight active line during playback",
									)}
								</Text>
								<Text size="1" color="gray">
									{t(
										"settings.common.highlightActiveLineDesc",
										"Highlights the line that is playing in the selected mode.",
									)}
								</Text>
							</Flex>
							<SettingToggle
								setting={
									playbackSettingsMode === ToolMode.Edit
										? editActiveLineHighlightAtom
										: syncActiveLineHighlightAtom
								}
							/>
						</Flex>
					</Box>
				</Flex>
			</Text>
		</Card>
		<Card>
			<Text as="label">
				<Flex gap="3" align="center">
					<ArrowSync24Regular />
					<Box flexGrow="1">
						<Flex gap="2" align="center" justify="between">
							<Flex direction="column" gap="1">
								<Text>
									{t(
										"settings.common.syncTabPosition",
										"Sync position across tabs",
									)}
								</Text>
								<Text size="1" color="gray">
									{t(
										"settings.common.syncTabPositionDesc",
										"Keeps playback going and the active line centered when you switch between Edit, Time and Preview.",
									)}
								</Text>
							</Flex>
							<Switch
								checked={syncTabPosition}
								onCheckedChange={setSyncTabPosition}
							/>
						</Flex>
					</Box>
				</Flex>
			</Text>
		</Card>
	</Flex>
);
