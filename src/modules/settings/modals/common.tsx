import resources from "virtual:i18next-loader";
import {
	ContentView24Regular,
	History24Regular,
	Keyboard12324Regular,
	LocalLanguage24Regular,
	PaddingLeft24Regular,
	PaddingRight24Regular,
	Save24Regular,
	Speaker224Regular,
	Stack24Regular,
	Timer24Regular,
	TopSpeed24Regular,
} from "@fluentui/react-icons";
import {
	Box,
	Card,
	Flex,
	Heading,
	Select,
	Slider,
	Switch,
	Text,
	TextField,
} from "@radix-ui/themes";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { playbackRateAtom, volumeAtom } from "$/modules/audio/states";
import { jumpToWordDelayAtom } from "$/modules/settings/states/preview";
import {
	autosaveEnabledAtom,
	autosaveIntervalAtom,
	autosaveLimitAtom,
	LayoutMode,
	layoutModeAtom,
	SyncJudgeMode,
	smartFirstWordAtom,
	smartLastWordAtom,
	syncJudgeModeAtom,
} from "$/modules/settings/states";
import {
	enableUpcomingWordHighlightAtom,
	upcomingWordHighlightColorAtom,
	upcomingWordHighlightThresholdAtom,
} from "$/modules/settings/states/sync";
import {
	KeyBindingTriggerMode,
	keyBindingTriggerModeAtom,
} from "$/utils/keybindings";

const languageOptions: readonly string[] = Object.keys(resources);

export const SettingsCommonTab = () => {
	const [layoutMode, setLayoutMode] = useAtom(layoutModeAtom);
	const [syncJudgeMode, setSyncJudgeMode] = useAtom(syncJudgeModeAtom);
	const [keyBindingTriggerMode, setKeyBindingTriggerMode] = useAtom(
		keyBindingTriggerModeAtom,
	);
	const [smartFirstWord, setSmartFirstWord] = useAtom(smartFirstWordAtom);
	const [smartLastWord, setSmartLastWord] = useAtom(smartLastWordAtom);
	const [volume, setVolume] = useAtom(volumeAtom);
	const [playbackRate, setPlaybackRate] = useAtom(playbackRateAtom);
	const [autosaveEnabled, setAutosaveEnabled] = useAtom(autosaveEnabledAtom);
	const [autosaveInterval, setAutosaveInterval] = useAtom(autosaveIntervalAtom);
	const [autosaveLimit, setAutosaveLimit] = useAtom(autosaveLimitAtom);
	const [enableUpcomingWordHighlight, setEnableUpcomingWordHighlight] = useAtom(
		enableUpcomingWordHighlightAtom,
	);
	const [upcomingWordHighlightThreshold, setUpcomingWordHighlightThreshold] =
		useAtom(upcomingWordHighlightThresholdAtom);
	const [upcomingWordHighlightColor, setUpcomingWordHighlightColor] = useAtom(
		upcomingWordHighlightColorAtom,
	);
	const [jumpToWordDelay, setJumpToWordDelay] = useAtom(jumpToWordDelayAtom);

	const { t, i18n } = useTranslation();
	const currentLanguage = i18n.resolvedLanguage || i18n.language;

	const getLanguageName = (code: string, locale: string) => {
		try {
			// Define a minimal interface to avoid using any
			interface DisplayNamesLike {
				new (
					locales: string | string[],
					options: { type: string },
				): {
					of: (code: string) => string | undefined;
				};
			}
			const DN: DisplayNamesLike | undefined = (
				Intl as unknown as {
					DisplayNames?: DisplayNamesLike;
				}
			).DisplayNames;
			if (DN) {
				const dn = new DN([locale], { type: "language" });
				const nativeDn = new DN([code], { type: "language" });
				const name = dn.of(code);
				const nativeName = nativeDn.of(code) || code;
				if (name && code !== locale) return `${nativeName} (${name})`;
				return nativeName;
			}
		} catch {
			// ignore errors and fallback
		}
		return code;
	};

	return (
		<Flex direction="column" gap="4">
			<Flex direction="column" gap="2">
				<Heading size="4">{t("settings.group.display", "Display")}</Heading>

				<Card>
					<Flex gap="3" align="center">
						<LocalLanguage24Regular />
						<Box flexGrow="1">
							<Flex align="center" justify="between" gap="4">
								<Flex direction="column" gap="1">
									<Text>
										{t("settings.common.language", "Interface Language")}
									</Text>
									<Text size="1" color="gray">
										{t(
											"settings.common.languageDesc",
											"Select the language for the interface",
										)}
									</Text>
								</Flex>

								<Select.Root
									value={currentLanguage}
									onValueChange={(lng) => {
										i18n.changeLanguage(lng).then(() => {
											localStorage.setItem("language", lng);
										});
									}}
								>
									<Select.Trigger />
									<Select.Content>
										{languageOptions.map((code) => (
											<Select.Item key={code} value={code}>
												{getLanguageName(code, currentLanguage)}
											</Select.Item>
										))}
									</Select.Content>
								</Select.Root>
							</Flex>
						</Box>
					</Flex>
				</Card>

				<Card>
					<Flex gap="3" align="center">
						<ContentView24Regular />
						<Box flexGrow="1">
							<Flex align="center" justify="between" gap="4">
								<Flex direction="column" gap="1">
									<Text>
										{t("settings.common.layoutMode", "Editor Layout Mode")}
									</Text>
									<Text size="1" color="gray">
										{t(
											"settings.common.layoutModeDesc.line1",
											"Simple layout meets the basic needs of most users",
										)}
										<br />
										{t(
											"settings.common.layoutModeDesc.line2",
											"If you require higher syncing efficiency, consider switching to advanced mode",
										)}
									</Text>
								</Flex>

								<Select.Root
									value={layoutMode}
									onValueChange={(v) => setLayoutMode(v as LayoutMode)}
								>
									<Select.Trigger />
									<Select.Content>
										<Select.Item value={LayoutMode.Simple}>
											{t(
												"settings.common.layoutModeOptions.simple",
												"Simple Mode",
											)}
										</Select.Item>
										<Select.Item value={LayoutMode.Advance}>
											{t(
												"settings.common.layoutModeOptions.advance",
												"Advanced Mode",
											)}
										</Select.Item>
									</Select.Content>
								</Select.Root>
							</Flex>
						</Box>
					</Flex>
				</Card>
			</Flex>

			<Flex direction="column" gap="3">
				<Heading size="4">
					{t("settings.group.lyricJump", "Lyric Navigation")}
				</Heading>
				<Card>
					<Flex gap="3" align="center">
						<Timer24Regular />
						<Box flexGrow="1">
							<Flex direction="column" gap="2" align="start">
								<Text>
									{t(
										"settings.common.jumpToWordDelay",
										"Jump to Word Delay (ms)",
									)}
								</Text>
								<Text size="1" color="gray">
									{t(
										"settings.common.jumpToWordDelayDesc",
										"Delay before jumping to a word when double-clicking or using keybinds",
									)}
								</Text>
								<TextField.Root
									type="number"
									value={jumpToWordDelay}
									onChange={(e) =>
										setJumpToWordDelay(
											Math.max(0, Number.parseInt(e.target.value, 10) || 0),
										)
									}
								/>
							</Flex>
						</Box>
					</Flex>
				</Card>
			</Flex>

			<Flex direction="column" gap="2">
				<Heading size="4">{t("settings.group.playback", "Playback")}</Heading>

				<Card>
					<Flex gap="3" align="center">
						<Speaker224Regular />
						<Box flexGrow="1">
							<Flex direction="column" gap="2" align="start">
								<Flex
									align="center"
									justify="between"
									style={{ alignSelf: "stretch" }}
								>
									<Text>{t("settings.common.volume", "Music Volume")}</Text>
									<Text wrap="nowrap" color="gray" size="1">
										{(volume * 100).toFixed()}%
									</Text>
								</Flex>
								<Slider
									min={0}
									max={1}
									defaultValue={[volume]}
									step={0.01}
									onValueChange={(v) => setVolume(v[0])}
								/>
							</Flex>
						</Box>
					</Flex>
				</Card>

				<Card>
					<Flex gap="3" align="center">
						<TopSpeed24Regular />
						<Box flexGrow="1">
							<Flex direction="column" gap="2" align="start">
								<Flex
									align="center"
									justify="between"
									style={{ alignSelf: "stretch" }}
								>
									<Text>
										{t("settings.common.playbackRate", "Playback Speed")}
									</Text>
									<Text wrap="nowrap" color="gray" size="1">
										{playbackRate.toFixed(2)}x
									</Text>
								</Flex>
								<Slider
									min={0.1}
									max={2}
									defaultValue={[playbackRate]}
									step={0.05}
									onValueChange={(v) => setPlaybackRate(v[0])}
								/>
							</Flex>
						</Box>
					</Flex>
				</Card>
			</Flex>

			<Flex direction="column" gap="2">
				<Heading size="4">{t("settings.group.autosave", "Auto Save")}</Heading>

				<Card>
					<Text as="label">
						<Flex gap="3" align="center">
							<Save24Regular />
							<Box flexGrow="1">
								<Flex gap="2" align="center" justify="between">
									<Text>
										{t("settings.common.autosave.enable", "Enable Auto Save")}
									</Text>
									<Switch
										checked={autosaveEnabled}
										onCheckedChange={setAutosaveEnabled}
									/>
								</Flex>
							</Box>
						</Flex>
					</Text>
				</Card>

				<Card>
					<Text as="label">
						<Flex gap="3" align="center">
							<History24Regular />
							<Box flexGrow="1">
								<Flex direction="column" gap="2" align="start">
									<Text>
										{t(
											"settings.common.autosave.interval",
											"Save Interval (minutes)",
										)}
									</Text>
									<TextField.Root
										type="number"
										disabled={!autosaveEnabled}
										value={autosaveInterval}
										onChange={(e) =>
											setAutosaveInterval(
												Math.max(1, Number.parseInt(e.target.value, 10) || 1),
											)
										}
									/>
								</Flex>
							</Box>
						</Flex>
					</Text>
				</Card>

				<Card>
					<Flex gap="3" align="center">
						<Stack24Regular />
						<Box flexGrow="1">
							<Flex direction="column" gap="2" align="start">
								<Flex
									align="center"
									justify="between"
									style={{ alignSelf: "stretch" }}
								>
									<Text>
										{t("settings.common.autosave.limit", "Snapshots to keep")}
									</Text>
									<Text wrap="nowrap" color="gray" size="1">
										{autosaveLimit}
									</Text>
								</Flex>
								<Slider
									min={1}
									max={50}
									disabled={!autosaveEnabled}
									value={[autosaveLimit]}
									step={1}
									onValueChange={(v) => setAutosaveLimit(v[0])}
								/>
							</Flex>
						</Box>
					</Flex>
				</Card>
			</Flex>
		</Flex>
	);
};
