import { Flex, Kbd, Text, Tooltip } from "@radix-ui/themes";
import { type Atom, atom, useAtomValue } from "jotai";
import type { FC, ReactNode } from "react";
import { formatKeyBindings, type KeyBindingsConfig } from "$/utils/keybindings";

const NO_SHORTCUT = atom<KeyBindingsConfig>([]);

/** The shortcut as shown to the user, or `undefined` when it is unbound. */
export function formatShortcut(keys: KeyBindingsConfig): string | undefined {
	return keys.length > 0 ? formatKeyBindings(keys) : undefined;
}

export interface ActionTooltipProps {
	/** The action's name. */
	label: ReactNode;
	/** One line on what the action does. */
	description?: ReactNode;
	/**
	 * The action's keybinding atom (a command's `atom`). It is read live, so a
	 * rebound shortcut shows up at once and an unbound one is left out.
	 */
	shortcut?: Atom<KeyBindingsConfig>;
	side?: "top" | "right" | "bottom" | "left";
	children: ReactNode;
}

/**
 * The tooltip for ribbon and toolbar controls: name, shortcut and one line of
 * help. The trigger is a wrapping span, because the tooltip's own data-state
 * would otherwise replace a checkbox's, switch's or toggle's.
 */
export const ActionTooltip: FC<ActionTooltipProps> = ({
	label,
	description,
	shortcut,
	side = "bottom",
	children,
}) => {
	const keys = useAtomValue(shortcut ?? NO_SHORTCUT);
	const shortcutText = formatShortcut(keys);

	return (
		<Tooltip
			side={side}
			maxWidth="280px"
			content={
				// Tooltip content renders inside a <p>, so only inline elements here.
				<Flex as="span" direction="column" gap="1">
					<Flex as="span" align="center" justify="between" gap="3">
						<Text as="span" weight="medium">
							{label}
						</Text>
						{shortcutText && (
							<Kbd size="1" data-action-tooltip-shortcut="">
								{shortcutText}
							</Kbd>
						)}
					</Flex>
					{description && (
						<Text as="span" data-action-tooltip-description="">
							{description}
						</Text>
					)}
				</Flex>
			}
		>
			<span style={{ display: "inline-flex" }}>{children}</span>
		</Tooltip>
	);
};
