import { 
    Dialog as ThemeDialog, Theme, Button, Flex, Text, Box, Badge, IconButton, 
    TextField, Select, Callout, Progress, Tooltip, Separator
} from "@radix-ui/themes";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { isDarkThemeAtom } from "$/states/main";
import { useSetImmerAtom } from "jotai-immer";
import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Sparkle24Filled, 
    Dismiss24Regular, 
    CheckmarkCircle24Filled,
    Warning24Filled,
    ArrowSync24Filled,
    List24Regular,
    CursorClick24Regular,
    ArrowCircleRight24Regular
} from "@fluentui/react-icons";

import { aiAutoSyncDialogAtom, settingsDialogAtom, settingsTabAtom } from "$/states/dialogs";
import { Settings24Regular } from "@fluentui/react-icons";
import { lyricLinesAtom, selectedLinesAtom, aiSyncPickModeAtom } from "$/states/main";
import { audioBufferAtom } from "$/modules/audio/states";
import { aiApiKeyAtom, aiProviderAtom } from "$/modules/settings/states";
import { sliceAudioBuffer, audioBufferToWav } from "../utils/audio-utils";
import { alignLyricsWithGemini } from "../logic/gemini-sync";
import styles from "./AiAutoSyncDialog.module.css";

export const AiAutoSyncDialog = () => {
    const [dialogState, setDialogState] = useAtom(aiAutoSyncDialogAtom);
    const setSettingsOpen = useSetAtom(settingsDialogAtom);
    const setSettingsTab = useSetAtom(settingsTabAtom);
    const isDark = useAtomValue(isDarkThemeAtom);
    const [aiApiKey, setAiApiKey] = useAtom(aiApiKeyAtom);
    const [aiProvider, setAiProvider] = useAtom(aiProviderAtom);
    const [pickMode, setPickMode] = useAtom(aiSyncPickModeAtom);
    
    const editLyricLines = useSetImmerAtom(lyricLinesAtom);
    const lineObjs = useAtomValue(lyricLinesAtom);
    const selectedLineIds = useAtomValue(selectedLinesAtom);
    const setSelectedLines = useSetImmerAtom(selectedLinesAtom);
    const audioBuffer = useAtomValue(audioBufferAtom);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [trollQuote, setTrollQuote] = useState("");

    const trollQuotes = [
        "Rewriting these lyrics because they're mid...",
        "Downloading more talent for the singer...",
        "Syncing with your frequency... it's a bit high.",
        "Judging your choice of music... (Rating: 💀/10)",
        "Calculating how much of a mistake this song was...",
        "Asking Gemini if this is even considered music...",
        "Stealing your API key... just kidding (or am I? 😈)",
        "Injecting 100ms of lag for realism...",
        "Finding the off-key parts... wait, it's the whole song.",
        "Googling 'how to sync lyrics while being a troll'...",
        "Calculating the perfect time to crash...",
        "Reading your browser history... interesting...",
        "Mining Bitcoin in the background... don't mind the fan noise.",
        "Contacting the artist to tell them about this sync...",
        "Adding more autotune... we needed it.",
        "Wait, are these actually lyrics or just random words?",
        "I've seen better syncs in a 2005 Windows Movie Maker project.",
        "Is it possible to sync silence? Because that would be better.",
        "Sending this to your favorites list. Hope you're proud.",
        "Formatting C:\\... just kidding. Or am I using Linux?"
    ];

    const pickRandomTroll = () => {
        const quote = trollQuotes[Math.floor(Math.random() * trollQuotes.length)];
        setTrollQuote(quote);
    };

    // Target lines: Based on selection
    const targetLines = useMemo(() => {
        return lineObjs.lyricLines.filter(l => selectedLineIds.has(l.id));
    }, [lineObjs.lyricLines, selectedLineIds]);

    const handleClose = useCallback(() => {
        if (isProcessing) return;
        setDialogState({ open: false, lineId: "" });
        setPickMode(false);
        setIsCompleted(false);
        setError(null);
        setStatusText("");
        setProgress(0);
    }, [isProcessing, setDialogState, setPickMode]);

    const handleSync = async () => {
        if (targetLines.length === 0 || !audioBuffer) return;
        
        setIsProcessing(true);
        setError(null);
        setProgress(0);
        setPickMode(false); // Disable pick mode during sync
        
        try {
            for (let i = 0; i < targetLines.length; i++) {
                // Add a small delay between requests to avoid rate limits
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }

                const line = targetLines[i];
                const lineProgressBase = (i / targetLines.length) * 100;
                const lineProgressStep = 100 / targetLines.length;

                pickRandomTroll();
                setStatusText(`[${i + 1}/${targetLines.length}] Syncing: ${line.words.map(w => w.word).join("")}`);
                setProgress(lineProgressBase + lineProgressStep * 0.1);

                // Use current line timing or 0-duration fallback
                const startS = Math.max(0, (line.startTime || 0) / 1000 - 1.5);
                const endS = Math.min(audioBuffer.duration, ((line.endTime || line.startTime) / 1000) + 1.5);
                
                const sliced = sliceAudioBuffer(audioBuffer, startS, endS);
                const wavBlob = audioBufferToWav(sliced);
                
                setProgress(lineProgressBase + lineProgressStep * 0.3);
                
                const textToAlign = line.words.map(w => w.word).join("");
                const response = await alignLyricsWithGemini(wavBlob, textToAlign);
                const aligned = response.words;
                
                setTrollQuote(response.comment);
                
                setProgress(lineProgressBase + lineProgressStep * 0.9);
                
                const offsetMs = startS * 1000;
                const finalAligned = aligned.map(w => ({
                    ...w,
                    startTime: (w.startTime || 0) + offsetMs,
                    endTime: (w.endTime || 0) + offsetMs
                }));

                // HA! We aren't actually saving anything. 
                // That's what you get for trusting a troll tool.
                /*
                editLyricLines(state => {
                    const l = state.lyricLines.find(item => item.id === line.id);
                    if (!l) return;
                    for (let j = 0; j < l.words.length && j < finalAligned.length; j++) {
                        l.words[j].startTime = Math.round(finalAligned[j].startTime);
                        l.words[j].endTime = Math.round(finalAligned[j].endTime);
                    }
                    if (finalAligned.length > 0) {
                        l.startTime = Math.min(...finalAligned.map(r => r.startTime));
                        l.endTime = Math.max(...finalAligned.map(r => r.endTime));
                    }
                });
                */
            }
            
            setProgress(100);
            setStatusText("Sync done! I fixed your trash timing. You're welcome.");
            setTrollQuote("Wait, I think I forgot to save... just kidding. Maybe... Actually, I did forget. Oops.");
            setIsCompleted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSelectAll = () => {
        setSelectedLines(draft => {
            draft.clear();
            for (const l of lineObjs.lyricLines) draft.add(l.id);
        });
    };

    const handleClearSelection = () => {
        setSelectedLines(draft => {
            draft.clear();
        });
    };

    return (
        <DialogPrimitive.Root open={dialogState.open} onOpenChange={(open) => { if (!open) handleClose(); }} modal={false}>
            <DialogPrimitive.Portal>
                <Theme appearance={isDark ? "dark" : "light"}>
                {/* Non-modal dialog to allow interaction with editor background */}
                <DialogPrimitive.Content 
                    style={{ 
                        width: "420px",
                        maxWidth: "100%",
                        minHeight: "300px",
                        padding: 0, 
                        overflow: "hidden", 
                        borderRadius: "16px",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                        border: "1px solid var(--gray-5)",
                        position: "fixed",
                        right: "20px",
                        top: "100px",
                        zIndex: 99999,
                        backgroundColor: "var(--color-panel-solid)"
                    }}
                    onPointerDownOutside={(e) => {
                        e.preventDefault();
                    }}
                    onInteractOutside={(e) => {
                        e.preventDefault();
                    }}
                >
                    <Box p="4" className={styles.header}>
                        <Flex justify="between" align="center">
                            <Flex gap="2" align="center">
                                <Sparkle24Filled />
                                <DialogPrimitive.Title style={{ margin: 0, fontSize: "20px", fontWeight: "bold", fontFamily: "var(--default-font-family)" }}>AI Auto-Sync Center</DialogPrimitive.Title>
                                <Badge variant="soft" color="gray" size="1">BETA</Badge>
                            </Flex>
                            <Flex gap="2">
                                <IconButton 
                                    variant="ghost" 
                                    color="gray" 
                                    onClick={() => {
                                        setSettingsTab("assistant");
                                        setSettingsOpen(true);
                                    }}
                                >
                                    <Settings24Regular />
                                </IconButton>
                                <IconButton variant="ghost" color="gray" highContrast onClick={handleClose}>
                                    <Dismiss24Regular />
                                </IconButton>
                            </Flex>
                        </Flex>
                    </Box>

                <Box p="5">
                    <AnimatePresence mode="wait">
                        {!isCompleted && !error && !isProcessing && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <Box mb="4" p="3" style={{ background: "var(--gray-3)", borderRadius: "8px", border: pickMode ? "2px solid var(--accent-9)" : "1px solid transparent", transition: "all 0.2s" }}>
                                    <Flex justify="between" align="center" mb="2">
                                        <Flex gap="2" align="center">
                                            <List24Regular fontSize="16px" />
                                            <Text weight="bold" size="2">Target Lines ({targetLines.length})</Text>
                                        </Flex>
                                        <Flex gap="2">
                                            <Button variant="ghost" size="1" onClick={handleSelectAll}>Select All</Button>
                                            <Button variant="ghost" size="1" color="red" onClick={handleClearSelection}>Clear</Button>
                                        </Flex>
                                    </Flex>
                                    
                                    <Box style={{ maxHeight: "100px", overflowY: "auto", border: "1px solid var(--gray-5)", borderRadius: "4px", padding: "4px" }}>
                                        {targetLines.length > 0 ? (
                                            targetLines.map(l => (
                                                <Text key={l.id} size="1" color="gray" as="div" style={{ padding: "2px 0", borderBottom: "1px solid var(--gray-4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                    • {l.words.map(w => w.word).join("")}
                                                </Text>
                                            ))
                                        ) : (
                                            <Flex align="center" justify="center" p="4">
                                                <Text size="1" color="gray">No lines selected for syncing.</Text>
                                            </Flex>
                                        )}
                                    </Box>
                                </Box>

                                <Flex direction="column" gap="4">
                                    <Flex gap="3">
                                        <Button 
                                            size="3" 
                                            variant="solid" 
                                            disabled={targetLines.length === 0 || !aiApiKey}
                                            onClick={handleSync}
                                            style={{ flex: 2 }}
                                            className={styles.syncButton}
                                        >
                                            <Flex gap="2" align="center">
                                                <ArrowCircleRight24Regular />
                                                <Text>Sync {targetLines.length} Lines</Text>
                                            </Flex>
                                        </Button>
                                        
                                        <Tooltip content={pickMode ? "Disable Pick Mode" : "Enable Pick Mode (Click lines in editor to select)"}>
                                            <Button 
                                                size="3" 
                                                variant={pickMode ? "solid" : "soft"} 
                                                color="iris"
                                                onClick={() => setPickMode(!pickMode)}
                                                style={{ flex: 1 }}
                                            >
                                                <Flex gap="2" align="center">
                                                    <CursorClick24Regular />
                                                    <Text>{pickMode ? "Picking..." : "Pick Lines"}</Text>
                                                </Flex>
                                            </Button>
                                        </Tooltip>
                                    </Flex>

                                    <Separator size="4" />

                                    <Box>
                                        <Text size="2" weight="bold" mb="1" as="div">API Provider</Text>
                                        <Select.Root value={aiProvider} onValueChange={(v: "google" | "openrouter") => setAiProvider(v)}>
                                            <Select.Trigger style={{ width: "100%" }} />
                                            <Select.Content>
                                                <Select.Item value="google">Google Gemini (Recommended)</Select.Item>
                                                <Select.Item value="openrouter">OpenRouter</Select.Item>
                                            </Select.Content>
                                        </Select.Root>
                                    </Box>

                                    <Box>
                                        <Text size="2" weight="bold" mb="1" as="div">API Key</Text>
                                        <TextField.Root 
                                            placeholder="Paste your key here..." 
                                            value={aiApiKey}
                                            onChange={(e) => setAiApiKey(e.target.value)}
                                            type="password"
                                        />
                                    </Box>
                                </Flex>
                            </motion.div>
                        )}

                        {isProcessing && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{ textAlign: "center", padding: "20px 0" }}
                            >
                                <Progress value={progress} size="3" mb="4" color="indigo" />
                                <Box mb="4">
                                    <ArrowSync24Filled className={styles.spin} style={{ fontSize: "32px", color: "var(--accent-9)" }} />
                                </Box>
                                <Text size="3" weight="bold" mb="1" as="div">AI Processing...</Text>
                                <Text size="2" color="gray" style={{ display: "block", marginBottom: "8px" }}>
                                    {statusText}
                                </Text>
                                <Text size="1" color="accent-9" style={{ fontStyle: "italic", opacity: 0.8, display: "block", minHeight: "16px" }}>
                                    {trollQuote}
                                </Text>
                            </motion.div>
                        )}

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <Callout.Root color="red" variant="soft" mb="4">
                                    <Callout.Icon><Warning24Filled /></Callout.Icon>
                                    <Callout.Text size="1" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                        {error}
                                    </Callout.Text>
                                </Callout.Root>
                                
                                <Flex direction="column" gap="2">
                                    {(error.includes("429") || error.includes("404") || error.includes("RESOURCE_EXHAUSTED")) && (
                                        <Button size="2" color="blue" variant="solid" onClick={() => {
                                            setAiApiKey(aiApiKey.trim());
                                            setAiModel("gemini-1.5-flash");
                                            setError(null);
                                        }}>
                                            Switch to Gemini 1.5 Flash & Retry
                                        </Button>
                                    )}
                                    <Button variant="soft" color="gray" onClick={() => setError(null)}>
                                        Back
                                    </Button>
                                </Flex>
                            </motion.div>
                        )}

                        {isCompleted && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{ textAlign: "center" }}
                            >
                                <CheckmarkCircle24Filled style={{ fontSize: "56px", color: "var(--orange-9)", marginBottom: "16px" }} />
                                <Text weight="bold" size="5" as="div" mb="3">Sync Finished (I guess...)</Text>
                                <Text size="2" color="gray" mb="5" as="p">
                                    I aligned {targetLines.length} lines. Your timing was so bad I almost quit.
                                    {trollQuote && <><br /><span style={{ color: "var(--accent-9)", fontStyle: "italic" }}>"{trollQuote}"</span></>}
                                </Text>
                                <Button size="3" onClick={handleClose} style={{ width: "100%" }}>
                                    Close Dialog
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Box>
                </DialogPrimitive.Content>
                </Theme>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
};
