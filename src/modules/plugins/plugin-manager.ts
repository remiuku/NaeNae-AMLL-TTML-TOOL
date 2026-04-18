import { getAllPlugins } from "./plugin-store";
import type { WASMPlugin } from "./types";

class PluginInstance {
	constructor(
		public metadata: WASMPlugin,
		private instance: WebAssembly.Instance
	) {}

	private get exports() {
		return this.instance.exports as {
			allocate: (size: number) => number;
			deallocate?: (ptr: number, size: number) => void;
			run_importer: (ptr: number, len: number) => number;
			run_exporter: (ptr: number, len: number) => number;
			memory: WebAssembly.Memory;
		};
	}

	/**
	 * Helper to pass strings into WASM memory
	 */
	private copyStringToWasm(str: string): { ptr: number; len: number } {
		const encoder = new TextEncoder();
		const bytes = encoder.encode(str);
		const len = bytes.length;
		const ptr = this.exports.allocate(len);
		
		const memory = new Uint8Array(this.exports.memory.buffer);
		memory.set(bytes, ptr);
		
		return { ptr, len };
	}

	/**
	 * Helper to read strings from WASM memory
	 */
	private readStringFromWasm(ptr: number): string {
		const memory = new Uint8Array(this.exports.memory.buffer);
		let end = ptr;
		while (memory[end] !== 0) end++; // Null-terminated assuming common C-style strings
		
		const decoder = new TextDecoder();
		return decoder.decode(memory.slice(ptr, end));
	}

	async runImporter(input: string): Promise<string> {
		if (this.metadata.type === "exporter") throw new Error("Plugin is not an importer");
		
		const { ptr, len } = this.copyStringToWasm(input);
		const resPtr = this.exports.run_importer(ptr, len);
		const result = this.readStringFromWasm(resPtr);
		
		// Clean up
		if (this.exports.deallocate) {
			this.exports.deallocate(ptr, len);
			// We should also deallocate the result ptr if the WASM module provided a way
		}
		
		return result;
	}

	async runExporter(data: string): Promise<string> {
		if (this.metadata.type === "importer") throw new Error("Plugin is not an exporter");
		
		const { ptr, len } = this.copyStringToWasm(data);
		const resPtr = this.exports.run_exporter(ptr, len);
		const result = this.readStringFromWasm(resPtr);
		
		if (this.exports.deallocate) {
            this.exports.deallocate(ptr, len);
        }
		
		return result;
	}
}

class PluginManager {
	private instances: Map<string, PluginInstance> = new Map();

	async loadEnabledPlugins() {
		const plugins = await getAllPlugins();
		for (const plugin of plugins) {
			if (plugin.isEnabled) {
				await this.initializePlugin(plugin);
			}
		}
	}

	private async initializePlugin(plugin: WASMPlugin) {
		try {
			const arrayBuffer = await plugin.blob.arrayBuffer();
			const { instance } = await WebAssembly.instantiate(arrayBuffer, {
				env: {
					log: (ptr: number) => {
						// Simple logging bridge for plugins
						const memory = new Uint8Array(instance.exports.memory.buffer);
						let end = ptr;
						while (memory[end] !== 0) end++;
						console.log(`[Plugin: ${plugin.name}]`, new TextDecoder().decode(memory.slice(ptr, end)));
					}
				}
			});

			this.instances.set(plugin.id, new PluginInstance(plugin, instance));
		} catch (error) {
			console.error(`Failed to initialize plugin ${plugin.name}:`, error);
		}
	}

	getImporters() {
		return Array.from(this.instances.values()).filter(i => i.metadata.type !== "exporter");
	}

	getExporters() {
		return Array.from(this.instances.values()).filter(i => i.metadata.type !== "importer");
	}

	async runImporter(pluginId: string, input: string) {
		const instance = this.instances.get(pluginId);
		if (!instance) throw new Error("Plugin not found or not initialized");
		return instance.runImporter(input);
	}
}

export const pluginManager = new PluginManager();
