export type { PluginRegistryEntry } from "./types";

// Replace this with your actual registry URL
export const REMOTE_REGISTRY_URL = "https://raw.githubusercontent.com/NaeNaeTart/verycool-plugins/main/registry.json";

export const OFFICIAL_PLUGIN_REGISTRY: PluginRegistryEntry[] = [
	{
		id: "boykisserification",
		name: "Boykisserification (TTML)",
		description: "Transforms your high-fidelity TTML project into a silly centerpiece. Mrow! :3",
		author: "NaeNae",
		version: "1.0.0",
		type: "both",
		downloadUrl: "",
		isIntegrated: true,
		sha256: "integrated",
		techniques: ["XML Attribute Mutation", "State Mutation", "Kaomoji Injection"],
		usage: "HOW IT WORKS: Injects boykisser-themed metadata and text replacements directly into your editor state or exports. \nHOW TO USE: Tools > Boykisserification (for editor) or Export (for files)."
	}
];

export async function fetchRemoteRegistry(): Promise<PluginRegistryEntry[]> {
	try {
		const res = await fetch(REMOTE_REGISTRY_URL);
		if (!res.ok) throw new Error("Failed to fetch registry");
		return await res.json();
	} catch (e) {
		console.error("Registry fetch failed, falling back to offline list:", e);
		return OFFICIAL_PLUGIN_REGISTRY;
	}
}

export const getRegistryEntry = (id: string) => OFFICIAL_PLUGIN_REGISTRY.find(e => e.id === id);
