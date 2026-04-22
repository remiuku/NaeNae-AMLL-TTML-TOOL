import { useAtomValue } from "jotai";
import { Suspense } from "react";
import { lazy } from "$/utils/lazy.ts";
import { PreviewModeType, previewModeTypeAtom } from "$/modules/settings/states/preview";
import SuspensePlaceHolder from "$/components/SuspensePlaceHolder";

const AMLLWrapper = lazy(() => import("$/components/AMLLWrapper"));
const AMLL = lazy(() => import("$/components/AMLLWrapper/AMLL"));
const TimingOverview = lazy(() => import("$/components/TimingOverview"));

export const PreviewModeSwitcher = () => {
	const previewModeType = useAtomValue(previewModeTypeAtom);

	return (
		<Suspense fallback={<SuspensePlaceHolder />}>
			{previewModeType === PreviewModeType.Standard && <AMLLWrapper variant="standard" />}
			{previewModeType === PreviewModeType.AMLL && <AMLL />}
			{previewModeType === PreviewModeType.Toxi && <AMLLWrapper variant="toxi" />}
			{previewModeType === PreviewModeType.Timing && <TimingOverview />}
		</Suspense>
	);
};

export default PreviewModeSwitcher;
