import { type FC, useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button, Flex, Text, TextField, Card, Switch, Box, Grid } from "@radix-ui/themes";
import { 
	Dismiss16Regular as Cross2Icon, 
	Add16Regular as PlusIcon, 
	Delete16Regular as TrashIcon, 
	ArrowUpload16Regular as UploadIcon 
} from "@fluentui/react-icons";
import { getAllPlugins, savePlugin, deletePlugin, togglePlugin } from "../plugin-store";
import type { WASMPlugin } from "../types";
import { pluginManager } from "../plugin-manager";

export const PluginManagerDialog: FC = () => {
    const [plugins, setPlugins] = useState<WASMPlugin[]>([]);

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
            type: "importer", // Default to importer for now
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

    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <Button variant="soft" color="indigo">
                    <PlusIcon /> Manage Plugins
                </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay 
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        backdropFilter: "blur(4px)",
                        zIndex: 1000,
                    }} 
                />
                <Dialog.Content 
                    style={{
                        position: "fixed",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "600px",
                        maxHeight: "80vh",
                        backgroundColor: "#111111",
                        padding: "24px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                        overflowY: "auto",
                        zIndex: 1001,
                    }}
                >
                    <Flex justify="between" align="center" mb="4">
                        <Dialog.Title style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", margin: 0 }}>
                            WASM Plugin System
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <Button variant="ghost" color="gray">
                                <Cross2Icon />
                            </Button>
                        </Dialog.Close>
                    </Flex>

                    <Text size="2" mb="4" color="gray" as="p">
                        Extend the tool with custom high-performance importers and exporters written in Rust or C++.
                    </Text>

                    <Flex direction="column" gap="3">
                        {plugins.map((plugin: WASMPlugin) => (
                            <Card key={plugin.id} variant="surface">
                                <Flex justify="between" align="center">
                                    <Box>
                                        <Text weight="bold" size="3">{plugin.name}</Text>
                                        <Flex gap="2">
                                            <Text size="1" color="gray">{plugin.version}</Text>
                                            <Text size="1" color="gray">by {plugin.author}</Text>
                                        </Flex>
                                    </Box>
                                    <Flex gap="3" align="center">
                                        <Switch 
                                            size="1" 
                                            checked={plugin.isEnabled} 
                                            onCheckedChange={(v) => handleToggle(plugin.id, v)} 
                                        />
                                        <Button variant="soft" color="red" size="1" onClick={() => handleDelete(plugin.id)}>
                                            <TrashIcon />
                                        </Button>
                                    </Flex>
                                </Flex>
                            </Card>
                        ))}

                        <Box mt="4">
                            <label 
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "100%",
                                    height: "128px",
                                    border: "2px dashed rgba(255, 255, 255, 0.1)",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    transition: "background-color 0.2s",
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)"; }}
                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                            >
                                <Flex direction="column" align="center" gap="2">
                                    <UploadIcon width={24} height={24} />
                                    <Text size="2">Upload .wasm plugin</Text>
                                </Flex>
                                <input type="file" accept=".wasm" style={{ display: "none" }} onChange={handleFileUpload} />
                            </label>
                        </Box>
                    </Flex>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
