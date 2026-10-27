// @vitest-environment jsdom
import { Theme } from "@radix-ui/themes";
import { createStore, Provider } from "jotai";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$/hooks/useLoadAudio", () => ({
	useLoadAudio: () => ({ loadAudio: loadAudio }),
}));
const { loadAudio } = vi.hoisted(() => ({ loadAudio: vi.fn() }));
vi.mock("$/modules/audio/audio-engine", () => ({
	audioEngine: {
		musicLoaded: false,
		musicPlaying: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	},
}));
vi.mock("$/utils/keybindings.ts", async (importOriginal) => ({
	...(await importOriginal<typeof import("$/utils/keybindings.ts")>()),
	useKeyBindingAtom: vi.fn(),
}));
vi.mock("$/modules/keyboard/components/AuditionKeyBinding", () => ({
	AuditionKeyBinding: () => null,
}));
vi.mock("$/modules/spectrogram/components/AudioSpectrogram", () => ({
	AudioSpectrogram: () => null,
}));
vi.mock("$/modules/audio/components/AudioSlider", () => ({
	AudioSlider: () => null,
}));
vi.mock("$/modules/audio/word-cues/WordTimingCue", () => ({
	WordTimingCue: () => null,
}));
vi.mock("$/modules/audio/word-cues/settings", () => ({
	WordCueOptions: () => null,
}));
vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

import { playbackRateAtom } from "$/modules/audio/states";
import { AudioControls } from ".";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("playback settings popover", () => {
	let root: Root;
	let container: HTMLDivElement;
	let store: ReturnType<typeof createStore>;

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe() {}
				unobserve() {}
				disconnect() {}
			},
		);
		container = document.createElement("div");
		document.body.append(container);
		root = createRoot(container);
		store = createStore();
		await act(async () => {
			root.render(
				<Provider store={store}>
					<Theme>
						<AudioControls />
					</Theme>
				</Provider>,
			);
		});
	});

	afterEach(async () => {
		await act(async () => root.unmount());
		container.remove();
		vi.unstubAllGlobals();
	});

	it("stays open after changing speed and leaving the controls; Escape closes it", async () => {
		const trigger = container.querySelector<HTMLButtonElement>(
			'button[aria-label="Playback speed"]',
		);
		if (!trigger) throw new Error("Playback speed button missing");
		await act(async () => trigger.click());
		expect(loadAudio).not.toHaveBeenCalled();
		// The label must sit on the focusable thumb, which screen readers announce.
		const slider = document.querySelector<HTMLElement>(
			'[role="slider"][aria-label="Playback speed"]',
		);
		if (!slider) throw new Error("Playback speed slider missing");
		expect(
			document.querySelector('[role="slider"][aria-label="Music volume"]'),
		).not.toBeNull();
		await act(async () => {
			slider.focus();
			slider.dispatchEvent(
				new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
			);
		});
		expect(store.get(playbackRateAtom)).toBeCloseTo(0.95);
		expect(slider.getAttribute("aria-label")).toBe("Playback speed");
		await act(async () => {
			slider.dispatchEvent(new MouseEvent("pointerout", { bubbles: true }));
			await new Promise((resolve) => setTimeout(resolve, 350));
		});
		expect(document.querySelector('[role="dialog"]')).not.toBeNull();
		await act(async () => {
			slider.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
			);
		});
		expect(document.querySelector('[role="dialog"]')).toBeNull();
	});

	it("keeps loading audio on the music button", async () => {
		const trigger = container.querySelector<HTMLButtonElement>(
			'button[aria-label="Load audio file"]',
		);
		if (!trigger) throw new Error("Load audio button missing");
		await act(async () => trigger.click());
		expect(loadAudio).toHaveBeenCalledOnce();
		expect(document.querySelector('[role="dialog"]')).toBeNull();
	});
});
