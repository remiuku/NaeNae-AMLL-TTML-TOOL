import { Switch } from "@radix-ui/themes";
import { useAtom } from "jotai";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { ActionTooltip } from "$/components/ActionTooltip";
import { advancedRibbonControlsAtom } from "$/modules/onboarding/states";
import { RibbonSection } from "./common";

/** The Advanced switch shared by the Edit, Time and Preview ribbons. */
export const AdvancedSection: FC = () => {
	const { t } = useTranslation();
	const [showAdvanced, setShowAdvanced] = useAtom(advancedRibbonControlsAtom);
	const label = t("ribbonBar.advanced", "Advanced");

	return (
		<RibbonSection label={label}>
			<ActionTooltip
				label={label}
				description={t(
					"ribbonBar.advancedTooltip",
					"Applies to the Edit, Time and Preview ribbons.",
				)}
			>
				<Switch
					checked={showAdvanced}
					onCheckedChange={setShowAdvanced}
					aria-label={label}
				/>
			</ActionTooltip>
		</RibbonSection>
	);
};
