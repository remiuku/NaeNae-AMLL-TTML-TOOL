import type { PluginRegistryEntry } from "./types";

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
		techniques: ["XML Attribute Mutation", "State Mutation", "Kaomoji Injection"],
		usage: "HOW IT WORKS: Injects boykisser-themed metadata and text replacements directly into your editor state or exports. \nHOW TO USE: Tools > Boykisserification (for editor) or Export (for files)."
	}
];

export const getRegistryEntry = (id: string) => OFFICIAL_PLUGIN_REGISTRY.find(e => e.id === id);
