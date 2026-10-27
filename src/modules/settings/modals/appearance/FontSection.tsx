import { TextT24Regular } from "@fluentui/react-icons";
import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import {
	DEFAULT_APP_FONT,
	SPICY_LYRICS_FONT_STACK,
} from "$/modules/settings/states/index.ts";
import type { AppearanceSectionState } from "./sectionState";
export const FontSection = ({
	appFont,
	spicyLyricsDesign,
	setIsFontSelectionOpen,
	t,
}: Pick<
	AppearanceSectionState,
	"appFont" | "spicyLyricsDesign" | "setIsFontSelectionOpen" | "t"
>) => {
	// The design swaps in Geist only while the font is still the default.
	const fromDesign = spicyLyricsDesign && appFont === DEFAULT_APP_FONT;
	return (
		<Flex direction="column" gap="3">
			<Heading size="4">
				{t("settings.appearance.font", "Application font")}
			</Heading>
			<Card>
				<Flex direction="column" gap="3">
					<Flex direction="column" gap="1">
						<Text size="2" weight="bold">
							{t("settings.appearance.currentFont", "Current font")}
						</Text>
						<Text
							size="1"
							color="gray"
							style={{
								fontFamily: fromDesign ? SPICY_LYRICS_FONT_STACK : appFont,
							}}
						>
							{fromDesign
								? t(
										"settings.appearance.design.fontNote",
										"Geist, from the Spicy Lyrics design",
									)
								: appFont.split(",")[0].replace(/"/g, "")}
						</Text>
					</Flex>
					<Button
						variant="soft"
						style={{ cursor: "pointer" }}
						onClick={() => setIsFontSelectionOpen(true)}
					>
						<TextT24Regular />
						{t("settings.appearance.changeFont", "Change font…")}
					</Button>
				</Flex>
			</Card>
		</Flex>
	);
};
