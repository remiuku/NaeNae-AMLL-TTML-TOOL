import { 
	Card, Flex, Heading, Switch, Text, Box, TextField, Select, Separator 
} from "@radix-ui/themes";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import {
	enableManualTimestampEditAtom,
	quickFixesAtom,
	highlightErrorsAtom,
	aiProviderAtom,
	aiModelAtom,
	aiApiKeyAtom,
	aiEndpointAtom,
} from "$/modules/settings/states";
import { visualizeTimestampUpdateAtom } from "$/modules/settings/states/sync";
import { 
	Sparkle24Regular, 
	TimeAndWeather24Regular, 
	ErrorCircle24Regular, 
	TextT24Regular,
	Key24Regular,
	Bot24Regular
} from "@fluentui/react-icons";

export const SettingsAssistantTab = () => {
	const [quickFixes, setQuickFixes] = useAtom(quickFixesAtom);
	const [enableManualTimestampEdit, setEnableManualTimestampEdit] = useAtom(
		enableManualTimestampEditAtom,
	);
	const [visualizeTimestampUpdate, setVisualizeTimestampUpdate] = useAtom(
		visualizeTimestampUpdateAtom,
	);
	const [highlightErrors, setHighlightErrors] = useAtom(highlightErrorsAtom);

	const [aiProvider, setAiProvider] = useAtom(aiProviderAtom);
	const [aiModel, setAiModel] = useAtom(aiModelAtom);
	const [aiApiKey, setAiApiKey] = useAtom(aiApiKeyAtom);
	const [aiEndpoint, setAiEndpoint] = useAtom(aiEndpointAtom);

	const { t } = useTranslation();

	return (
		<Flex direction="column" gap="4">
			<Heading size="4">{t("settings.group.assistant", "Assistant")}</Heading>

			<Card>
				<Text as="label">
					<Flex gap="3" align="center">
						<Sparkle24Regular />
						<Box flexGrow="1">
							<Flex gap="2" align="center" justify="between">
								<Flex direction="column" gap="1">
									<Text>{t("settings.assistant.quickFixes", "Quick Fixes (Grammar)")}</Text>
									<Text size="1" color="gray">
										{t("settings.assistant.quickFixesDesc", "Enable suggestions for repeated words and common transcription errors.")}
									</Text>
								</Flex>
								<Switch checked={quickFixes} onCheckedChange={setQuickFixes} />
							</Flex>
						</Box>
					</Flex>
				</Text>
			</Card>

			<Card>
				<Text as="label">
					<Flex gap="3" align="center">
						<TextT24Regular />
						<Box flexGrow="1">
							<Flex gap="2" align="center" justify="between">
								<Flex direction="column" gap="1">
									<Text>{t("settings.assistant.manualTimestampEdit", "Manual Timestamp Editing")}</Text>
									<Text size="1" color="gray">
										{t("settings.assistant.manualTimestampEditDesc", "Allow clicking on timestamps in Sync mode to manually type values.")}
									</Text>
								</Flex>
								<Switch
									checked={enableManualTimestampEdit}
									onCheckedChange={setEnableManualTimestampEdit}
								/>
							</Flex>
						</Box>
					</Flex>
				</Text>
			</Card>

			<Card>
				<Text as="label">
					<Flex gap="3" align="center">
						<TimeAndWeather24Regular />
						<Box flexGrow="1">
							<Flex gap="2" align="center" justify="between">
								<Flex direction="column" gap="1">
									<Text>{t("settings.assistant.visualizeTimestampUpdate", "Visualize Timestamp Updates")}</Text>
									<Text size="1" color="gray">
										{t("settings.assistant.visualizeTimestampUpdateDesc", "Show a brief flash on timestamps when they are updated via shortcuts.")}
									</Text>
								</Flex>
								<Switch
									checked={visualizeTimestampUpdate}
									onCheckedChange={setVisualizeTimestampUpdate}
								/>
							</Flex>
						</Box>
					</Flex>
				</Text>
			</Card>

			<Card>
				<Text as="label">
					<Flex gap="3" align="center">
						<ErrorCircle24Regular />
						<Box flexGrow="1">
							<Flex gap="2" align="center" justify="between">
								<Flex direction="column" gap="1">
									<Text>{t("settings.assistant.highlightErrors", "Highlight Timing Errors")}</Text>
									<Text size="1" color="gray">
										{t("settings.assistant.highlightErrorsDesc", "Visually mark words where start time is greater than end time.")}
									</Text>
								</Flex>
								<Switch checked={highlightErrors} onCheckedChange={setHighlightErrors} />
							</Flex>
						</Box>
					</Flex>
				</Text>
			</Card>

			<Separator size="4" />

			<Heading size="4">AI Auto-Sync Configuration</Heading>
			
			<Card>
				<Flex direction="column" gap="3">
					<Flex gap="3" align="center">
						<Bot24Regular />
						<Box flexGrow="1">
							<Text size="2" weight="bold" as="div">AI Provider</Text>
							<Select.Root value={aiProvider} onValueChange={(v: "google" | "openrouter") => setAiProvider(v)}>
								<Select.Trigger style={{ width: "100%" }} />
								<Select.Content>
									<Select.Item value="google">Google Gemini (GenAI)</Select.Item>
									<Select.Item value="openrouter">OpenRouter</Select.Item>
								</Select.Content>
							</Select.Root>
						</Box>
					</Flex>

					<Flex gap="3" align="center">
						<Sparkle24Regular />
						<Box flexGrow="1">
							<Text size="2" weight="bold" as="div">Model</Text>
							<TextField.Root 
								placeholder="e.g. gemini-1.5-flash" 
								value={aiModel}
								onChange={(e) => setAiModel(e.target.value.trim())}
							/>
						</Box>
					</Flex>

					<Flex gap="3" align="center">
						<Key24Regular />
						<Box flexGrow="1">
							<Text size="2" weight="bold" as="div">API Key</Text>
							<TextField.Root 
								placeholder="Enter your API Key..." 
								type="password"
								value={aiApiKey}
								onChange={(e) => setAiApiKey(e.target.value.trim())}
							/>
						</Box>
					</Flex>

					{aiProvider === "openrouter" && (
						<Flex gap="3" align="center">
							<Box flexGrow="1" style={{ paddingLeft: "36px" }}>
								<Text size="2" weight="bold" as="div">Custom Endpoint (Optional)</Text>
								<TextField.Root 
									placeholder="https://openrouter.ai/api/v1/chat/completions" 
									value={aiEndpoint}
									onChange={(e) => setAiEndpoint(e.target.value)}
								/>
							</Box>
						</Flex>
					)}
				</Flex>
			</Card>
		</Flex>
	);
};
