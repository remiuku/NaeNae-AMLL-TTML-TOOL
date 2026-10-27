import { Card, Flex, Switch, Text } from "@radix-ui/themes";
import { flushSync } from "react-dom";
import type { AppearanceSectionState } from "./sectionState";

/**
 * Cross-fades the whole page while the design flips, so turning it off on a
 * light-mode system doesn't jump from dark to light in one frame.
 */
function switchWithCrossFade(apply: () => void) {
	const reduceMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	if (reduceMotion || !document.startViewTransition) {
		apply();
		return;
	}
	const root = document.documentElement;
	root.classList.add("sl-design-switching");
	const transition = document.startViewTransition(() => flushSync(apply));
	transition.finished.finally(() =>
		root.classList.remove("sl-design-switching"),
	);
}

export const SpicyLyricsDesignSection = ({
	spicyLyricsDesign,
	setSpicyLyricsDesign,
	t,
}: Pick<
	AppearanceSectionState,
	"spicyLyricsDesign" | "setSpicyLyricsDesign" | "t"
>) => (
	<Card>
		<Flex align="center" justify="between" gap="4">
			<Flex direction="column" gap="1">
				<Text as="label" htmlFor="spicy-lyrics-design-switch" weight="medium">
					{t("settings.appearance.design.title", "Spicy Lyrics design")}
				</Text>
				<Text size="1" color="gray">
					{t(
						"settings.appearance.design.description",
						"The dark lavender look and Geist type from the rest of Spicy Lyrics. It is always dark, so turn it off to follow your system's light or dark mode.",
					)}
				</Text>
			</Flex>
			<Switch
				id="spicy-lyrics-design-switch"
				checked={spicyLyricsDesign}
				onCheckedChange={(checked) =>
					switchWithCrossFade(() => setSpicyLyricsDesign(checked))
				}
			/>
		</Flex>
	</Card>
);
