export interface WASMPlugin {
	id: string;
	name: string;
	description: string;
	author: string;
	version: string;
	type: "importer" | "exporter" | "both";
	blob: Blob; // The actual .wasm file
	isEnabled: boolean;
	createdAt: number;
}
