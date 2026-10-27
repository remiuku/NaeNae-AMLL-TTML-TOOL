import {
	LineThickness24Regular,
	Sparkle24Regular,
	Stack24Regular,
	VideoBackgroundEffect24Regular,
} from "@fluentui/react-icons";
import { Card, Flex, Grid, Heading, Switch, Text } from "@radix-ui/themes";
import { AdvancedColorItem, AdvancedSliderItem } from "./AdvancedControls";
import type { AppearanceSectionState } from "./sectionState";
export const GlobalDesignSection = ({
	legacyDarkTheme,
	setLegacyDarkTheme,
	spicyLyricsDesign,
	vScrollbar,
	setVScrollbar,
	vDialogBg,
	setVDialogBg,
	vDialogBorder,
	setVDialogBorder,
	vGlobalRadius,
	setVGlobalRadius,
	vGlobalBorderWidth,
	setVGlobalBorderWidth,
	vShadow,
	setVShadow,
	t,
}: Pick<
	AppearanceSectionState,
	| "legacyDarkTheme"
	| "setLegacyDarkTheme"
	| "spicyLyricsDesign"
	| "vScrollbar"
	| "setVScrollbar"
	| "vDialogBg"
	| "setVDialogBg"
	| "vDialogBorder"
	| "setVDialogBorder"
	| "vGlobalRadius"
	| "setVGlobalRadius"
	| "vGlobalBorderWidth"
	| "setVGlobalBorderWidth"
	| "vShadow"
	| "setVShadow"
	| "t"
>) => (
	<Flex direction="column" gap="3">
		<Heading size="4">
			<Sparkle24Regular />{" "}
			{t("settings.appearance.advanced.global", "Global design system")}
		</Heading>
		<Card>
			<Flex direction="column" gap="4">
				<Flex align="center" justify="between" gap="3">
					<Flex direction="column" gap="1">
						<Text>
							{t(
								"settings.appearance.advanced.legacyDarkTheme",
								"Classic dark theme",
							)}
						</Text>
						<Text size="1" color="gray">
							{spicyLyricsDesign
								? t(
										"settings.appearance.design.legacyDarkThemeNote",
										"Has no effect while the Spicy Lyrics design is on.",
									)
								: t(
										"settings.appearance.advanced.legacyDarkThemeDesc",
										"Use the lighter dark palette from before the Intonated Black redesign.",
									)}
						</Text>
					</Flex>
					<Switch
						checked={legacyDarkTheme}
						onCheckedChange={setLegacyDarkTheme}
						disabled={spicyLyricsDesign}
					/>
				</Flex>
				<Grid columns="2" gap="3">
					<AdvancedColorItem
						label={t(
							"settings.appearance.advanced.scrollbarThumb",
							"Scrollbar thumb",
						)}
						value={vScrollbar}
						onChange={setVScrollbar}
					/>
					<AdvancedColorItem
						label={t(
							"settings.appearance.advanced.dialogBackground",
							"Dialog background",
						)}
						value={vDialogBg}
						onChange={setVDialogBg}
					/>
					<AdvancedColorItem
						label={t(
							"settings.appearance.advanced.dialogBorder",
							"Dialog border",
						)}
						value={vDialogBorder}
						onChange={setVDialogBorder}
					/>
				</Grid>
				<AdvancedSliderItem
					label={t(
						"settings.appearance.advanced.globalBorderRadius",
						"Global border radius",
					)}
					icon={<Stack24Regular />}
					value={vGlobalRadius}
					min={0}
					max={40}
					onChange={setVGlobalRadius}
					unit="px"
				/>
				<AdvancedSliderItem
					label={t(
						"settings.appearance.advanced.globalBorderWidth",
						"Global border width",
					)}
					icon={<LineThickness24Regular />}
					value={vGlobalBorderWidth}
					min={0}
					max={8}
					onChange={setVGlobalBorderWidth}
					unit="px"
				/>
				<AdvancedSliderItem
					label={t(
						"settings.appearance.advanced.shadowIntensity",
						"Shadow intensity",
					)}
					icon={<VideoBackgroundEffect24Regular />}
					value={vShadow}
					min={0}
					max={10}
					step={0.1}
					onChange={setVShadow}
					unit=""
				/>
			</Flex>
		</Card>
	</Flex>
);
