import { createStore } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("preview renderer persistence", () => {
	beforeEach(() => {
		// Vite's Jotai refresh plugin caches atoms across vi.resetModules().
		vi.stubGlobal("jotaiAtomCache", undefined);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	it.each([
		"amll",
		"unknown",
	])("falls back to Spicy for the saved renderer %s before mounting", async (saved) => {
		const values = new Map([["previewModeType", JSON.stringify(saved)]]);
		vi.stubGlobal("window", {
			localStorage: {
				getItem: (key: string) => values.get(key) ?? null,
				setItem: (key: string, value: string) => values.set(key, value),
				removeItem: (key: string) => values.delete(key),
			},
		});
		const { previewModeTypeAtom, PreviewModeType } = await import("./preview");
		const store = createStore();
		expect(store.get(previewModeTypeAtom)).toBe(PreviewModeType.Spicy);

		const unsubscribe = store.sub(previewModeTypeAtom, () => {});
		expect(store.get(previewModeTypeAtom)).toBe(PreviewModeType.Spicy);
		store.set(previewModeTypeAtom, PreviewModeType.Toxi);
		expect(store.get(previewModeTypeAtom)).toBe(PreviewModeType.Toxi);
		expect(values.get("previewModeType")).toBe(JSON.stringify("toxi"));
		unsubscribe();
	});

	it("keeps each renderer and defaults to Spicy when none was picked", async () => {
		const setItem = vi.fn();
		vi.stubGlobal("window", {
			localStorage: {
				getItem: () => null,
				setItem,
				removeItem: vi.fn(),
			},
		});
		const { previewModeTypeAtom, PreviewModeType, normalizePreviewMode } =
			await import("./preview");
		for (const renderer of Object.values(PreviewModeType)) {
			expect(normalizePreviewMode(renderer)).toBe(renderer);
		}
		const store = createStore();
		expect(store.get(previewModeTypeAtom)).toBe(PreviewModeType.Spicy);
		// Reading the default doesn't save it, so a later default can still apply.
		const unsubscribe = store.sub(previewModeTypeAtom, () => {});
		expect(setItem).not.toHaveBeenCalled();
		unsubscribe();
	});

	it.each([
		"standard",
		"toxi",
		"timing",
		"spicy",
	])("keeps a renderer the user saved before (%s)", async (saved) => {
		const values = new Map([["previewModeType", JSON.stringify(saved)]]);
		vi.stubGlobal("window", {
			localStorage: {
				getItem: (key: string) => values.get(key) ?? null,
				setItem: (key: string, value: string) => values.set(key, value),
				removeItem: (key: string) => values.delete(key),
			},
		});
		const { previewModeTypeAtom } = await import("./preview");
		expect(createStore().get(previewModeTypeAtom)).toBe(saved);
	});
});
