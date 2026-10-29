import { Grid } from "@radix-ui/themes";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
/*
 * Copyright 2023-2025 Steve Xiao (stevexmh@qq.com) and contributors.
 *
 * 本源代码文件是属于 AMLL TTML Tool 项目的一部分。
 * This source code file is a part of AMLL TTML Tool project.
 * 本项目的源代码的使用受到 GNU GENERAL PUBLIC LICENSE version 3 许可证的约束，具体可以参阅以下链接。
 * Use of this source code is governed by the GNU GPLv3 license that can be found through the following link.
 *
 * https://github.com/spicylyrics/ttml-tool/blob/main/LICENSE
 */

import {
	showLineRomanizationAtom,
	showLineTranslationAtom,
	showWordRomanizationInputAtom,
} from "$/modules/settings/states/index.ts";
import { RibbonToggle } from "../RibbonToggle";

export const AuxiliaryDisplayField: FC = () => {
	const { t } = useTranslation();

	return (
		<Grid columns="1fr auto" gapX="4" gapY="1" flexGrow="1" align="center">
			<RibbonToggle
				label={t("ribbonBar.editMode.showTranslation", "Show translation line")}
				description={t(
					"settings.workflow.showTranslationDesc",
					"Show a translation field under each lyric line.",
				)}
				setting={showLineTranslationAtom}
			/>
			<RibbonToggle
				label={t(
					"ribbonBar.editMode.showRomanization",
					"Show romanization line",
				)}
				description={t(
					"settings.workflow.showRomanizationDesc",
					"Show a romanization field under each lyric line.",
				)}
				setting={showLineRomanizationAtom}
			/>
			<RibbonToggle
				label={t(
					"ribbonBar.editMode.showWordRomanizationInput",
					"Show per-word romanization",
				)}
				description={t(
					"settings.workflow.showWordRomanizationInputDesc",
					"Show a romanization field on each word.",
				)}
				setting={showWordRomanizationInputAtom}
			/>
		</Grid>
	);
};
