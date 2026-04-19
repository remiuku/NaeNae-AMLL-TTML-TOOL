export type PluginType = "importer" | "exporter" | "tool" | "both";

export interface PluginMetadata {
	id: string;
	name: string;
	description: string;
	author: string;
	version: string;
	type: PluginType;
	isEnabled: boolean;
	createdAt: number;
	isIntegrated?: boolean;
	techniques?: string[];
	usage?: string;
}

export interface WASMPlugin extends PluginMetadata {
	blob: Blob; // The actual .wasm file
}

export interface IntegratedPlugin extends PluginMetadata {
	isIntegrated: true;
	runImporter?: (input: string) => Promise<string>;
	runExporter?: (data: string) => Promise<string>;
	runTool?: (lines: any[]) => Promise<any[]>;
}
