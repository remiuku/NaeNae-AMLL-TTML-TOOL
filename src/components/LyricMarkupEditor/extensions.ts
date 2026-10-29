import {
	defaultKeymap,
	history,
	historyKeymap,
	insertNewline,
	redo,
} from "@codemirror/commands";
import {
	type EditorState,
	Facet,
	RangeSetBuilder,
	StateField,
} from "@codemirror/state";
import {
	type Command,
	Decoration,
	type DecorationSet,
	EditorView,
	GutterMarker,
	gutter,
	keymap,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { buildDecorationSpecs } from "./decorations";
import { type LyricMarkupFormat, type MarkupLine, parseMarkup } from "./markup";

/** Resolved, translated strings the editor draws. */
export interface LyricMarkupLabels {
	section: (label: string) => string;
	joinSyllables: string;
	background: string;
	duet: string;
	translation: string;
	romanization: string;
	removed: string;
	dropped: string;
	missingTranslation: string;
	missingRomanization: string;
}

export interface LyricMarkupCallbacks {
	/** A section pill (or Alt+C) asked for the category menu of a line. */
	openHeaderMenu: (lineIndex: number, rect: DOMRect) => void;
}

export const formatFacet = Facet.define<LyricMarkupFormat, LyricMarkupFormat>({
	combine: (values) => values[0],
});
export const labelsFacet = Facet.define<LyricMarkupLabels, LyricMarkupLabels>({
	combine: (values) => values[0],
});
export const callbacksFacet = Facet.define<
	LyricMarkupCallbacks,
	LyricMarkupCallbacks
>({ combine: (values) => values[0] });

const parse = (state: EditorState) =>
	parseMarkup(state.doc.toString(), state.facet(formatFacet));

/** The parsed markup of the whole document, kept in step with edits. */
export const markupField = StateField.define<MarkupLine[]>({
	create: parse,
	update: (lines, transaction) =>
		transaction.docChanged ||
		transaction.startState.facet(formatFacet) !==
			transaction.state.facet(formatFacet)
			? parse(transaction.state)
			: lines,
});

class HeaderWidget extends WidgetType {
	constructor(
		readonly label: string,
		readonly category: string | undefined,
		readonly ariaLabel: string,
	) {
		super();
	}
	override eq(other: HeaderWidget) {
		return (
			other.label === this.label &&
			other.category === this.category &&
			other.ariaLabel === this.ariaLabel
		);
	}
	override toDOM(view: EditorView) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "lm-pill";
		button.dataset.category = this.category ?? "other";
		button.setAttribute("aria-label", this.ariaLabel);
		button.setAttribute("aria-haspopup", "dialog");
		button.textContent = this.label;
		button.addEventListener("mousedown", (event) => event.preventDefault());
		button.addEventListener("click", (event) => {
			event.preventDefault();
			const line = view.state.doc.lineAt(view.posAtDOM(button));
			view.state
				.facet(callbacksFacet)
				.openHeaderMenu(line.number - 1, button.getBoundingClientRect());
		});
		return button;
	}
	override ignoreEvent() {
		return true;
	}
}

class DotWidget extends WidgetType {
	constructor(readonly ariaLabel: string) {
		super();
	}
	override eq(other: DotWidget) {
		return other.ariaLabel === this.ariaLabel;
	}
	override toDOM(view: EditorView) {
		const button = document.createElement("button");
		button.type = "button";
		button.tabIndex = -1;
		button.className = "lm-dot";
		button.setAttribute("aria-label", this.ariaLabel);
		button.title = this.ariaLabel;
		button.textContent = "·";
		button.addEventListener("mousedown", (event) => {
			event.preventDefault();
			const from = view.posAtDOM(button);
			const separator = view.state.facet(formatFacet).wordSeparator;
			if (view.state.sliceDoc(from, from + separator.length) !== separator)
				return;
			view.dispatch({
				changes: { from, to: from + separator.length },
				userEvent: "delete.join",
			});
		});
		return button;
	}
	override ignoreEvent() {
		return true;
	}
}

class SubLabelWidget extends WidgetType {
	constructor(readonly label: string) {
		super();
	}
	override eq(other: SubLabelWidget) {
		return other.label === this.label;
	}
	override toDOM() {
		const span = document.createElement("span");
		span.className = "lm-subLabel";
		span.textContent = this.label;
		return span;
	}
}

const hidden = Decoration.replace({});

/** Lines the selection touches show their raw symbols while the editor has focus. */
function revealedLines(view: EditorView): Set<number> {
	const revealed = new Set<number>();
	if (!view.hasFocus) return revealed;
	for (const range of view.state.selection.ranges) {
		const first = view.state.doc.lineAt(range.from).number;
		const last = view.state.doc.lineAt(range.to).number;
		for (let number = first; number <= last; number++) revealed.add(number - 1);
	}
	return revealed;
}

function buildDecorations(view: EditorView): DecorationSet {
	const { state } = view;
	const lines = state.field(markupField);
	const labels = state.facet(labelsFacet);
	const starts: number[] = [];
	const visible: number[] = [];
	for (const range of view.visibleRanges) {
		const first = state.doc.lineAt(range.from).number;
		const last = state.doc.lineAt(range.to).number;
		for (let number = first; number <= last; number++) {
			if (starts[number - 1] !== undefined) continue;
			starts[number - 1] = state.doc.line(number).from;
			visible.push(number - 1);
		}
	}
	visible.sort((a, b) => a - b);
	const specs = buildDecorationSpecs(
		lines,
		starts,
		revealedLines(view),
		visible,
		(from, to) => state.sliceDoc(from, to),
	);
	const builder = new RangeSetBuilder<Decoration>();
	for (const spec of specs) {
		if (spec.type === "line") {
			builder.add(
				spec.from,
				spec.from,
				Decoration.line({ class: spec.className }),
			);
		} else if (spec.type === "hide") {
			builder.add(spec.from, spec.to, hidden);
		} else if (spec.type === "dot") {
			builder.add(
				spec.from,
				spec.to,
				Decoration.replace({ widget: new DotWidget(labels.joinSyllables) }),
			);
		} else if (spec.type === "header") {
			builder.add(
				spec.from,
				spec.to,
				Decoration.replace({
					widget: new HeaderWidget(
						spec.label,
						spec.category,
						labels.section(spec.label),
					),
				}),
			);
		} else {
			builder.add(
				spec.from,
				spec.to,
				Decoration.replace({
					widget: new SubLabelWidget(labels[spec.sub]),
				}),
			);
		}
	}
	return builder.finish();
}

const markupPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = buildDecorations(view);
		}
		update(update: ViewUpdate) {
			if (
				update.docChanged ||
				update.selectionSet ||
				update.viewportChanged ||
				update.focusChanged ||
				update.startState.field(markupField) !==
					update.state.field(markupField) ||
				update.startState.facet(labelsFacet) !== update.state.facet(labelsFacet)
			)
				this.decorations = buildDecorations(update.view);
		}
	},
	{ decorations: (plugin) => plugin.decorations },
);

class LabelMarker extends GutterMarker {
	constructor(
		readonly text: string,
		readonly kind: string,
	) {
		super();
	}
	override eq(other: LabelMarker) {
		return other.text === this.text && other.kind === this.kind;
	}
	override toDOM() {
		const span = document.createElement("span");
		span.className = "lm-mark";
		span.dataset.kind = this.kind;
		span.textContent = this.text;
		span.title = this.text;
		return span;
	}
}

function markerFor(
	line: MarkupLine | undefined,
	labels: LyricMarkupLabels,
): LabelMarker | null {
	if (!line) return null;
	if (line.warning) return new LabelMarker(labels[line.warning], "warning");
	switch (line.kind) {
		case "section":
			return new LabelMarker(line.category ?? "other", "section");
		case "background":
		case "duet":
		case "translation":
		case "romanization":
			return new LabelMarker(labels[line.kind], line.kind);
		case "removedHeader":
			return new LabelMarker(labels.removed, line.kind);
		default:
			return null;
	}
}

const labelGutter = gutter({
	class: "lm-gutter",
	lineMarker: (view, block) => {
		const index = view.state.doc.lineAt(block.from).number - 1;
		return markerFor(
			view.state.field(markupField)[index],
			view.state.facet(labelsFacet),
		);
	},
	lineMarkerChange: (update) =>
		update.startState.field(markupField) !== update.state.field(markupField) ||
		update.startState.facet(labelsFacet) !== update.state.facet(labelsFacet),
});

/** Line numbers (0-based) the selection touches. */
const selectedLines = (state: EditorState) => {
	const numbers = new Set<number>();
	for (const range of state.selection.ranges) {
		const first = state.doc.lineAt(range.from).number;
		const last = state.doc.lineAt(range.to).number;
		for (let number = first; number <= last; number++) numbers.add(number - 1);
	}
	return [...numbers].sort((a, b) => a - b);
};

/** Add or remove the background or duet prefix on every selected lyric line. */
export const toggleLinePrefix =
	(kind: "background" | "duet"): Command =>
	(view) => {
		const format = view.state.facet(formatFacet);
		const prefix =
			kind === "background" ? format.bgLyricPrefix : format.duetLyricPrefix;
		if (!format.enableSpecialPrefix || !prefix) return false;
		const lines = view.state.field(markupField);
		const changes: { from: number; to?: number; insert?: string }[] = [];
		for (const index of selectedLines(view.state)) {
			const parsed = lines[index];
			if (!parsed || !["lyric", "background", "duet"].includes(parsed.kind))
				continue;
			const line = view.state.doc.line(index + 1);
			const existing = parsed.spans.find(
				(span) =>
					span.type === "prefix" &&
					line.text.slice(span.from, span.to) === prefix,
			);
			if (existing) {
				changes.push({
					from: line.from + existing.from,
					to: line.from + existing.to,
				});
			} else {
				const lead = line.text.match(/^\s*/)?.[0].length ?? 0;
				changes.push({ from: line.from + lead, insert: prefix });
			}
		}
		if (!changes.length) return false;
		view.dispatch({ changes, userEvent: "input.prefix" });
		return true;
	};

const isWordChar = (char: string, separator: string) =>
	!!char && /\S/.test(char) && char !== separator;

/** Split the word at `pos`, or join the syllables if a split mark touches it. */
export function splitOrJoinAt(view: EditorView, pos: number): boolean {
	const separator = view.state.facet(formatFacet).wordSeparator;
	if (!separator) return false;
	const { state } = view;
	const length = separator.length;
	if (state.sliceDoc(pos - length, pos) === separator) {
		view.dispatch({
			changes: { from: pos - length, to: pos },
			userEvent: "delete.join",
		});
		return true;
	}
	if (state.sliceDoc(pos, pos + length) === separator) {
		view.dispatch({
			changes: { from: pos, to: pos + length },
			userEvent: "delete.join",
		});
		return true;
	}
	if (
		isWordChar(state.sliceDoc(pos - 1, pos), separator) &&
		isWordChar(state.sliceDoc(pos, pos + 1), separator)
	) {
		view.dispatch({
			changes: { from: pos, insert: separator },
			userEvent: "input.split",
		});
		return true;
	}
	return false;
}

export const splitOrJoin: Command = (view) =>
	splitOrJoinAt(view, view.state.selection.main.head);

/** Open the category menu for the section header the cursor is on. */
export const openHeaderMenu: Command = (view) => {
	const line = view.state.doc.lineAt(view.state.selection.main.head);
	if (view.state.field(markupField)[line.number - 1]?.kind !== "section")
		return false;
	const coords = view.coordsAtPos(line.from);
	if (!coords) return false;
	view.state
		.facet(callbacksFacet)
		.openHeaderMenu(
			line.number - 1,
			new DOMRect(coords.left, coords.top, 1, coords.bottom - coords.top),
		);
	return true;
};

/** Everything the editor needs apart from its format, labels and callbacks. */
export const lyricMarkupExtensions = [
	history(),
	keymap.of([
		{ key: "Alt-b", run: toggleLinePrefix("background") },
		{ key: "Alt-d", run: toggleLinePrefix("duet") },
		{ key: "Alt-s", run: splitOrJoin },
		{ key: "Alt-c", run: openHeaderMenu },
		// Windows doesn't bind this one by default.
		{ key: "Mod-Shift-z", run: redo, preventDefault: true },
		// Plain new lines; lyrics don't carry indentation over.
		{ key: "Enter", run: insertNewline },
		...historyKeymap,
		...defaultKeymap,
	]),
	EditorView.lineWrapping,
	markupField,
	markupPlugin,
	labelGutter,
	EditorView.domEventHandlers({
		mousedown(event, view) {
			if (!event.altKey || event.button !== 0) return false;
			const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
			if (pos === null) return false;
			event.preventDefault();
			splitOrJoinAt(view, pos);
			return true;
		},
	}),
];
