import { History24Regular } from "@fluentui/react-icons";
import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import {
	type AdvancedOverrideSetters,
	resetAdvancedOverrides,
} from "./resetAppearance";
import type { AppearanceSectionState } from "./sectionState";

type ResetThemeProps = AdvancedOverrideSetters &
	Pick<
		AppearanceSectionState,
		| "setAccentColor"
		| "setUseCustomAccent"
		| "setCustomAccentColor"
		| "setBackgroundMode"
		| "setSelectedGradient"
		| "setUseCustomGradient"
		| "setCustomGradientColors"
		| "setCustomGradientType"
		| "setCustomGradientOpacity"
		| "setCustomGradientCenter"
		| "setCustomGradientAngle"
		| "setCustomGradientSize"
		| "setSpicyLyricsDesign"
		| "t"
	>;

export const ResetThemeSection = (props: ResetThemeProps) => {
	const { t } = props;
	return (
		<Flex direction="column" gap="3">
			<Heading size="4">
				{t("settings.appearance.resetTitle", "Reset theme")}
			</Heading>
			<Card>
				<Flex direction="column" gap="2">
					<Flex align="center" gap="2" style={{ color: "var(--gray-11)" }}>
						<History24Regular />
						<Text size="2">
							{t(
								"settings.appearance.resetDesc",
								"Reset all colors, backgrounds, gradients, and custom overrides back to the default theme.",
							)}
						</Text>
					</Flex>
					<Button
						variant="soft"
						color="red"
						onClick={() => {
							props.setAccentColor("red");
							props.setUseCustomAccent(false);
							props.setCustomAccentColor("#e5484d");
							props.setBackgroundMode("none");
							props.setSelectedGradient("sunset");
							props.setUseCustomGradient(false);
							props.setCustomGradientColors(["#7028e4"]);
							props.setCustomGradientType("linear");
							props.setCustomGradientOpacity(1);
							props.setCustomGradientCenter([50, 50]);
							props.setCustomGradientAngle(45);
							props.setCustomGradientSize(1);
							props.setSpicyLyricsDesign(true);
							resetAdvancedOverrides(props);
						}}
					>
						<History24Regular />
						{t("settings.appearance.resetTheme", "Reset theme to default")}
					</Button>
				</Flex>
			</Card>
		</Flex>
	);
};
