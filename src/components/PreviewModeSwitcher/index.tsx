import { useAtomValue } from "jotai";
import { lazy, Suspense } from "react";
import { PreviewModeType, previewModeTypeAtom } from "$/modules/settings/states/preview";
import SuspensePlaceHolder from "$/components/SuspensePlaceHolder";

const AMLLWrapper = lazy(() => import("$/components/AMLLWrapper"));
const OriginalAMLL = lazy(() => import("$/components/AMLLWrapper/OriginalAMLL"));
const TimingOverview = lazy(() => import("$/components/TimingOverview"));

export const PreviewModeSwitcher = () => {
	const previewModeType = useAtomValue(previewModeTypeAtom);

	return (
		<Suspense fallback={<SuspensePlaceHolder />}>
			{previewModeType === PreviewModeType.Standard && <AMLLWrapper />}
			{previewModeType === PreviewModeType.AMLL && <OriginalAMLL />}
			{previewModeType === PreviewModeType.Timing && <TimingOverview />}
		</Suspense>
	);
};

export default PreviewModeSwitcher;
