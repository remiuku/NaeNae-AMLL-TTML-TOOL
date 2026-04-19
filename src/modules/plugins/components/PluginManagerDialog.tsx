import React, { useCallback, useEffect, useState } from "react";
import type { FC } from "react";
import { Button, Flex, Text, Card, Switch, Box, Grid, Tabs, Badge, Spinner, Popover, Dialog } from "@radix-ui/themes";
import { 
	Dismiss16Regular as Cross2Icon, 
	Add16Regular as PlusIcon, 
	Delete16Regular as TrashIcon, 
	ArrowUpload16Regular as UploadIcon,
	ShoppingBag16Regular as StoreIcon,
	CheckmarkCircle16Regular as InstalledIcon,
	CloudArrowDown16Regular as DownloadIcon,
	Info16Regular as InfoIcon
} from "@fluentui/react-icons";
import { getAllPlugins, savePlugin, deletePlugin, togglePlugin } from "../plugin-store";
import type { WASMPlugin } from "../types";
import { pluginManager } from "../plugin-manager";
import { OFFICIAL_PLUGIN_REGISTRY } from "../registry";
import type { PluginRegistryEntry } from "../registry";
import styles from "./PluginManager.module.css";

export const PluginManagerDialog: FC = () => {
    const [plugins, setPlugins] = useState<WASMPlugin[]>([]);
	const [activeTab, setActiveTab] = useState("installed");
	const [installingId, setInstallingId] = useState<string | null>(null);

    const loadPlugins = useCallback(async () => {
        const p = await getAllPlugins();
        setPlugins(p);
    }, []);

    useEffect(() => {
        loadPlugins();
    }, [loadPlugins]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const plugin: WASMPlugin = {
            id: crypto.randomUUID(),
            name: file.name.replace(".wasm", ""),
            description: "Community provided plugin",
            author: "Unknown",
            version: "1.0.0",
            type: "importer",
            blob: file,
            isEnabled: true,
            createdAt: Date.now(),
        };

        await savePlugin(plugin);
        await loadPlugins();
        await pluginManager.loadEnabledPlugins();
    };

    const handleDelete = async (id: string) => {
        await deletePlugin(id);
        await loadPlugins();
    };

    const handleToggle = async (id: string, enabled: boolean) => {
        await togglePlugin(id, enabled);
        await loadPlugins();
        await pluginManager.loadEnabledPlugins();
    };

	const handleInstall = async (entry: PluginRegistryEntry) => {
		setInstallingId(entry.id);
		try {
			let blob: Blob;
			if (entry.isIntegrated) {
				blob = new Blob([new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])], { type: "application/wasm" });
			} else {
				try {
					const res = await fetch(entry.downloadUrl);
					if (!res.ok) throw new Error();
					blob = await res.blob();
				} catch {
					blob = new Blob([new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])], { type: "application/wasm" });
				}
			}
			const plugin: WASMPlugin = {
				...entry,
				blob,
				isEnabled: true,
				createdAt: Date.now(),
			};
			await savePlugin(plugin);
			await loadPlugins();
			await pluginManager.loadEnabledPlugins();
		} catch (e) {
			console.error("Installation failed", e);
		} finally {
			setInstallingId(null);
		}
	};

	const isInstalled = (id: string) => plugins.some(p => p.id === id);

    return (
        <Dialog.Root>
            <Dialog.Trigger>
                <Button variant="soft" color="indigo" size="2">
                    <StoreIcon /> Plugins
                </Button>
            </Dialog.Trigger>
            <Dialog.Content className={styles.pluginDialogContent} maxWidth="750px" style={{ minHeight: "650px", display: "flex", flexDirection: "column" }}>
                <Flex justify="between" align="center" mb="6">
                    <Box>
                        <Dialog.Title style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: "white" }}>
                            Plugin Management
                        </Dialog.Title>
                        <Text size="3" style={{ color: "#B0B0B0", marginTop: "8px", display: "block" }}>Extend your lyric editing capabilities</Text>
                    </Box>
                    <Dialog.Close>
                        <Button variant="ghost" color="gray" size="3">
                            <Cross2Icon width={24} height={24} style={{ color: "white" }} />
                        </Button>
                    </Dialog.Close>
                </Flex>

                <Tabs.Root value={activeTab} onValueChange={setActiveTab} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <Tabs.List color="indigo" mb="6" style={{ gap: "40px" }}>
                        <Tabs.Trigger value="installed">Installed</Tabs.Trigger>
                        <Tabs.Trigger value="store">Plugin Store</Tabs.Trigger>
                    </Tabs.List>

                    <Box style={{ flex: 1, overflowY: "auto", margin: "0 -8px", padding: "0 8px" }}>
                        <Tabs.Content value="installed">
                            <Flex direction="column" gap="5">
                                {plugins.length === 0 && (
                                    <Flex direction="column" align="center" justify="center" py="9" gap="5" style={{ border: "2px dashed rgba(255, 255, 255, 0.1)", borderRadius: "20px" }}>
                                        <PlusIcon width={56} height={56} style={{ color: "rgba(255,255,255,0.4)" }} />
                                        <Text size="3" style={{ color: "#808080" }}>No plugins installed</Text>
                                        <Button variant="soft" size="2" onClick={() => setActiveTab("store")}>Browse Store</Button>
                                    </Flex>
                                )}
                                {plugins.map(plugin => (
                                    <Card key={plugin.id} className={styles.pluginStoreCard}>
                                        <Flex justify="between" align="center" p="1">
                                            <Box>
                                                <Flex align="center" gap="3" mb="1">
                                                    <Text weight="bold" size="4" style={{ color: "white" }}>{plugin.name}</Text>
                                                    <Badge color="indigo" variant="soft">v{plugin.version}</Badge>
                                                </Flex>
                                                <Text size="2" style={{ color: "#B0B0B0" }}>by {plugin.author}</Text>
                                            </Box>
                                            <Flex gap="3" align="center">
                                                <Popover.Root>
                                                    <Popover.Trigger>
                                                        <Button variant="ghost" color="gray" size="1">
                                                            <InfoIcon width={18} height={18} />
                                                        </Button>
                                                    </Popover.Trigger>
                                                    <Popover.Content className={styles.customPopover}>
                                                        <Flex direction="column" gap="4">
                                                            <Box>
                                                                <Text size="3" weight="bold" style={{ color: "white", display: "block" }}>{plugin.name}</Text>
                                                                <Text size="2" style={{ color: "#B0B0B0", marginTop: "4px" }}>{plugin.description}</Text>
                                                            </Box>
                                                            {plugin.techniques && (
                                                                <Box>
                                                                    <Text size="2" weight="bold" color="indigo">Techniques</Text>
                                                                    <Flex gap="1" wrap="wrap" mt="1">
                                                                        {plugin.techniques.map(t => <Badge key={t} size="1" color="gray">{t}</Badge>)}
                                                                    </Flex>
                                                                </Box>
                                                            )}
                                                            {plugin.usage && (
                                                                <Box>
                                                                    <Text size="2" weight="bold" color="indigo">Usage</Text>
                                                                    <Text size="2" style={{ color: "#E0E0E0", whiteSpace: "pre-line" }}>{plugin.usage}</Text>
                                                                </Box>
                                                            )}
                                                        </Flex>
                                                    </Popover.Content>
                                                </Popover.Root>
                                                <Switch checked={plugin.isEnabled} onCheckedChange={v => handleToggle(plugin.id, v)} />
                                                <Button variant="soft" color="red" size="1" onClick={() => handleDelete(plugin.id)}><TrashIcon /></Button>
                                            </Flex>
                                        </Flex>
                                    </Card>
                                ))}
                                <label className={styles.sideloadZone} style={{ display: "flex", flexDirection: "column", height: "100px", borderRadius: "20px", cursor: "pointer", alignItems: "center", justifyContent: "center" }}>
                                    <Flex align="center" gap="2">
                                        <UploadIcon /> <Text size="3">Sideload .wasm plugin</Text>
                                    </Flex>
                                    <input type="file" accept=".wasm" style={{ display: "none" }} onChange={handleFileUpload} />
                                </label>
                            </Flex>
                        </Tabs.Content>
                        <Tabs.Content value="store">
                            <Grid columns="2" gap="4">
                                {OFFICIAL_PLUGIN_REGISTRY.map(entry => (
                                    <Card key={entry.id} className={styles.pluginStoreCard} style={{ opacity: isInstalled(entry.id) ? 0.6 : 1 }}>
                                        <Flex direction="column" justify="between" style={{ height: "100%" }} p="1">
                                            <Flex justify="between" align="start" mb="2">
                                                <Text weight="bold" size="3" style={{ color: "white" }}>{entry.name}</Text>
                                                <Popover.Root>
                                                    <Popover.Trigger>
                                                        <Button variant="ghost" color="gray" size="1"><InfoIcon /></Button>
                                                    </Popover.Trigger>
                                                    <Popover.Content className={styles.customPopover}>
                                                        <Flex direction="column" gap="3">
                                                            <Text weight="bold" color="white">{entry.name} Details</Text>
                                                            <Text size="2" style={{ color: "#B0B0B0" }}>{entry.description}</Text>
                                                            {entry.usage && <Text size="2" style={{ whiteSpace: "pre-line" }}>{entry.usage}</Text>}
                                                        </Flex>
                                                    </Popover.Content>
                                                </Popover.Root>
                                            </Flex>
                                            <Text size="2" mb="3" style={{ color: "#B0B0B0", height: "3em", overflow: "hidden" }}>{entry.description}</Text>
                                            <Flex justify="between" align="center">
                                                <Text size="1" color="gray">by {entry.author}</Text>
                                                {!isInstalled(entry.id) && (
                                                    <Button size="2" variant="soft" color="indigo" onClick={() => handleInstall(entry)} disabled={installingId === entry.id}>
                                                        {installingId === entry.id ? <Spinner /> : <><DownloadIcon /> Install</>}
                                                    </Button>
                                                )}
                                            </Flex>
                                        </Flex>
                                    </Card>
                                ))}
                            </Grid>
                        </Tabs.Content>
                    </Box>
                </Tabs.Root>
            </Dialog.Content>
        </Dialog.Root>
    );
};
