import { Flex, Text } from "@radix-ui/themes";
import { OptionPicker } from "$/components/OptionPicker";
import { AppearanceEditorMode } from "$/modules/settings/states/index.ts";
import type { AppearanceSectionState } from "./sectionState";
export const AppearanceEditorModeSection = ({
	editorMode,
	setEditorMode,
	t,
}: Pick<AppearanceSectionState, "editorMode" | "setEditorMode" | "t">) => (
	<Flex direction="column" gap="2">
		<OptionPicker
			variant="segmented"
			size="2"
			value={editorMode}
			onValueChange={setEditorMode}
			label={t("settings.appearance.mode.label", "Appearance editor")}
			options={[
				{
					value: AppearanceEditorMode.Basic,
					label: t("settings.appearance.mode.basic", "Simple layout"),
				},
				{
					value: AppearanceEditorMode.Advanced,
					label: t("settings.appearance.mode.advanced", "Advanced layout"),
				},
			]}
		/>
		<Text size="1" color="gray">
			{t(
				"settings.appearance.mode.labelDesc",
				"Simple covers theme, background, scale and font. Advanced sets individual colors, spacing and the panel order.",
			)}
		</Text>
	</Flex>
);
