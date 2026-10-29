// @vitest-environment jsdom
import { Theme } from "@radix-ui/themes";
import { atom, createStore, Provider } from "jotai";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { KeyBindingsConfig } from "$/utils/keybindings";
import { ActionTooltip, formatShortcut } from ".";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
};

const cleanups: (() => void)[] = [];
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
});

function openTooltip(keys: KeyBindingsConfig) {
	const store = createStore();
	const shortcut = atom(keys);
	const container = document.createElement("div");
	document.body.appendChild(container);
	const root = createRoot(container);
	act(() =>
		root.render(
			<Provider store={store}>
				<Theme>
					<ActionTooltip
						label="Highlight active word"
						description="Highlight the word that is playing right now."
						shortcut={shortcut}
					>
						<button type="button">Toggle</button>
					</ActionTooltip>
				</Theme>
			</Provider>,
		),
	);
	act(() => container.querySelector("button")?.focus());
	cleanups.push(() => {
		act(() => root.unmount());
		container.remove();
	});
	const shortcutText = () =>
		document.body.querySelector("[data-action-tooltip-shortcut]")
			?.textContent ?? null;
	return { store, shortcut, shortcutText };
}

describe("formatShortcut", () => {
	it("leaves out an unbound shortcut", () => {
		expect(formatShortcut([])).toBeUndefined();
	});

	it("formats a bound shortcut", () => {
		expect(formatShortcut(["KeyK"])).toBe("K");
	});
});

describe("ActionTooltip", () => {
	it("shows the name, description and current shortcut", () => {
		const { shortcutText } = openTooltip(["KeyK"]);
		expect(
			document.body.querySelector("[data-action-tooltip-description]")
				?.textContent,
		).toBe("Highlight the word that is playing right now.");
		expect(shortcutText()).toBe("K");
	});

	it("follows a rebound shortcut", () => {
		const { store, shortcut, shortcutText } = openTooltip(["KeyK"]);
		act(() => store.set(shortcut, ["Shift", "KeyJ"]));
		expect(shortcutText()).toBe("Shift+J");
	});

	it("drops the shortcut when it is unbound", () => {
		const { store, shortcut, shortcutText } = openTooltip(["KeyK"]);
		act(() => store.set(shortcut, []));
		expect(shortcutText()).toBeNull();
	});
});
