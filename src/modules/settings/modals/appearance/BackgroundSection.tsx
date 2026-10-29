import { Sparkle24Regular } from "@fluentui/react-icons";
import {
	Box,
	Button,
	Card,
	Flex,
	Grid,
	Heading,
	Slider,
	Switch,
	Text,
	Tooltip,
} from "@radix-ui/themes";
import { OptionPicker } from "$/components/OptionPicker";
import { backgroundGradients } from "$/modules/settings/states/gradients";
import { generateGradient } from "$/utils/colorScale";
import { SettingsCustomBackgroundCard } from "../customBackground";
import { GradientPositionControls } from "./GradientPositionControls";
import type { AppearanceSectionState } from "./sectionState";
export const BackgroundSection = ({
	customAccentColor,
	backgroundMode,
	setBackgroundMode,
	selectedGradient,
	setSelectedGradient,
	useCustomGradient,
	setUseCustomGradient,
	customGradientColors,
	setCustomGradientColors,
	customGradientType,
	setCustomGradientType,
	customGradientOpacity,
	setCustomGradientOpacity,
	customGradientCenter,
	setCustomGradientCenter,
	customGradientAngle,
	setCustomGradientAngle,
	customGradientSize,
	setCustomGradientSize,
	setShowBackgroundSettings,
	t,
}: Pick<
	AppearanceSectionState,
	| "customAccentColor"
	| "backgroundMode"
	| "setBackgroundMode"
	| "selectedGradient"
	| "setSelectedGradient"
	| "useCustomGradient"
	| "setUseCustomGradient"
	| "customGradientColors"
	| "setCustomGradientColors"
	| "customGradientType"
	| "setCustomGradientType"
	| "customGradientOpacity"
	| "setCustomGradientOpacity"
	| "customGradientCenter"
	| "setCustomGradientCenter"
	| "customGradientAngle"
	| "setCustomGradientAngle"
	| "customGradientSize"
	| "setCustomGradientSize"
	| "setShowBackgroundSettings"
	| "t"
>) => (
	<Flex direction="column" gap="3">
		<Flex direction="column" gap="1">
			<Heading size="4">
				{t("settings.appearance.background", "Background")}
			</Heading>
			<Text size="1" color="gray">
				{t(
					"settings.appearance.backgroundDesc",
					"Show an image or a gradient behind the app.",
				)}
			</Text>
		</Flex>

		<OptionPicker<"none" | "image" | "gradient">
			variant="segmented"
			size="2"
			value={backgroundMode}
			onValueChange={setBackgroundMode}
			label={t("settings.appearance.background", "Background")}
			options={[
				{ value: "none", label: t("settings.appearance.mode.none", "None") },
				{ value: "image", label: t("settings.appearance.mode.image", "Image") },
				{
					value: "gradient",
					label: t("settings.appearance.mode.gradient", "Gradient"),
				},
			]}
		/>

		{backgroundMode === "image" && (
			<SettingsCustomBackgroundCard
				onOpen={() => setShowBackgroundSettings(true)}
			/>
		)}

		{backgroundMode === "gradient" && (
			<Card>
				<Flex direction="column" gap="4">
					<Flex gap="3" align="start">
						<Sparkle24Regular />
						<Box flexGrow="1">
							<Flex direction="column" gap="3">
								<Flex align="center" justify="between">
									<Flex direction="column" gap="1">
										<Text>
											{t(
												"settings.appearance.useCustomGradient",
												"Custom gradient color",
											)}
										</Text>
										<Text size="1" color="gray">
											{t(
												"settings.appearance.useCustomGradientDesc",
												"Generate a gradient from a single color.",
											)}
										</Text>
									</Flex>
									<Switch
										checked={useCustomGradient}
										onCheckedChange={setUseCustomGradient}
									/>
								</Flex>

								{useCustomGradient ? (
									<Flex direction="column" gap="4">
										<Flex align="center" justify="between">
											<Text>
												{t(
													"settings.appearance.syncGradientToAccent",
													"Sync first color with Accent",
												)}
											</Text>
											<Button
												variant="soft"
												onClick={() => {
													const newGradientColors = [...customGradientColors];
													newGradientColors[0] = customAccentColor;
													setCustomGradientColors(newGradientColors);
												}}
											>
												{t("common.sync", "Sync")}
											</Button>
										</Flex>
										<Flex align="center" gap="3" wrap="wrap">
											{customGradientColors.map((color, idx) => (
												// biome-ignore lint/suspicious/noArrayIndexKey: primitive array without unique IDs
												<Flex key={idx} align="center" gap="2">
													<input
														type="color"
														value={color}
														onChange={(e) => {
															const newColor = e.target.value;
															const newColors = [...customGradientColors];
															newColors[idx] = newColor;
															setCustomGradientColors(newColors);
														}}
														style={{
															width: "40px",
															height: "40px",
															padding: 0,
															border: "none",
															borderRadius: "var(--radius-3)",
															cursor: "pointer",
															backgroundColor: "transparent",
														}}
													/>
													{customGradientColors.length > 1 && (
														<Button
															variant="soft"
															color="red"
															size="1"
															onClick={() => {
																setCustomGradientColors(
																	customGradientColors.filter(
																		(_, i) => i !== idx,
																	),
																);
															}}
														>
															{t("common.remove", "Remove")}
														</Button>
													)}
												</Flex>
											))}
											{customGradientColors.length < 4 && (
												<Button
													variant="outline"
													onClick={() => {
														setCustomGradientColors([
															...customGradientColors,
															"#ffffff",
														]);
													}}
												>
													{t(
														"settings.appearance.addGradientColor",
														"Add color",
													)}
												</Button>
											)}
										</Flex>
										<Flex align="center" justify="between">
											<Text>
												{t("settings.appearance.gradientType", "Gradient type")}
											</Text>
											<OptionPicker<"linear" | "radial" | "conic">
												variant="segmented"
												size="2"
												value={customGradientType}
												onValueChange={setCustomGradientType}
												label={t(
													"settings.appearance.gradientType",
													"Gradient type",
												)}
												options={[
													{
														value: "linear",
														label: t(
															"settings.appearance.type.linear",
															"Linear",
														),
													},
													{
														value: "radial",
														label: t(
															"settings.appearance.type.radial",
															"Radial",
														),
													},
													{
														value: "conic",
														label: t("settings.appearance.type.conic", "Conic"),
													},
												]}
											/>
										</Flex>
										<Flex direction="column" gap="2">
											<Flex align="center" justify="between">
												<Text>
													{t(
														"settings.appearance.gradientOpacity",
														"Gradient opacity",
													)}
												</Text>
												<Text wrap="nowrap" color="gray" size="1">
													{Math.round(customGradientOpacity * 100)}%
												</Text>
											</Flex>
											<Slider
												min={0}
												max={1}
												step={0.01}
												value={[customGradientOpacity]}
												onValueChange={(v) => setCustomGradientOpacity(v[0])}
											/>
										</Flex>
										<Flex direction="column" gap="2">
											<Flex align="center" justify="between">
												<Text>
													{t(
														"settings.appearance.gradientSize",
														"Gradient scale",
													)}
												</Text>
												<Text wrap="nowrap" color="gray" size="1">
													{Math.round(customGradientSize * 100)}%
												</Text>
											</Flex>
											<Slider
												min={0.1}
												max={3}
												step={0.1}
												value={[customGradientSize]}
												onValueChange={(v) => setCustomGradientSize(v[0])}
											/>
										</Flex>
										<GradientPositionControls
											t={t}
											customGradientType={customGradientType}
											customGradientCenter={customGradientCenter}
											setCustomGradientCenter={setCustomGradientCenter}
											customGradientAngle={customGradientAngle}
											setCustomGradientAngle={setCustomGradientAngle}
										/>
										<Box
											style={{
												height: "40px",
												borderRadius: "var(--radius-2)",
												background: generateGradient(
													customGradientColors,
													customGradientType,
													customGradientCenter,
													customGradientAngle,
													customGradientSize,
												),
												marginTop: "var(--space-2)",
											}}
										/>
									</Flex>
								) : (
									<Grid columns="4" gap="2">
										{backgroundGradients.map((gradient) => (
											<Tooltip key={gradient.id} content={gradient.name}>
												<Box
													style={{
														height: "40px",
														borderRadius: "var(--radius-2)",
														background: gradient.css,
														cursor: "pointer",
														outline:
															selectedGradient === gradient.id
																? "2px solid var(--accent-9)"
																: "none",
														outlineOffset: "2px",
													}}
													onClick={() => setSelectedGradient(gradient.id)}
												/>
											</Tooltip>
										))}
									</Grid>
								)}
							</Flex>
						</Box>
					</Flex>
				</Flex>
			</Card>
		)}
	</Flex>
);
