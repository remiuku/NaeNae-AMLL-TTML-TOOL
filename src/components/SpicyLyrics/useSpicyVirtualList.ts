/*
 * Adapted from the Spicy Lyrics renderer (AGPL-3.0-or-later).
 * Original project: https://github.com/Spikerko/Spicy-Lyrics
 */
import {
	elementScroll,
	observeElementOffset,
	observeElementRect,
	Virtualizer,
	type VirtualizerOptions,
} from "@tanstack/virtual-core";
import {
	type RefObject,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { previewScrollTop } from "$/modules/playback-clock/preview-scroll";
import type { SpicyLine } from "./model";

const OVERSCAN = 5;
// Gaps in cqw, baked into each row's padding so rows can differ.
const GAP_NORMAL = 1;
// A background vocal sits closer to its lead.
const GAP_LINE_TO_BG = 0.2;
const ESTIMATE_LINE = 66;
const ESTIMATE_BACKGROUND = 50;
// Times, and for how long, a scroll may re-aim while rows it revealed replace
// estimated sizes with measured ones. After that the line is where it is.
const MAX_CORRECTIONS = 10;
const AIM_WINDOW_MS = 500;

/** Trailing gap of a row in cqw. Interlude rows carry their own gap in CSS. */
export function rowGap(lines: SpicyLine[], index: number) {
	if (index >= lines.length - 1 || lines[index].isDotLine) return 0;
	const next = lines[index + 1];
	return next.isBackground && !next.isDotLine ? GAP_LINE_TO_BG : GAP_NORMAL;
}

export interface SpicyVirtualRow {
	index: number;
	/** Offset from the top of the row container. */
	start: number;
}

interface VirtualWindow {
	rows: SpicyVirtualRow[];
	totalSize: number;
}

type LineVirtualizer = Virtualizer<HTMLDivElement, HTMLDivElement>;

/** Mounts only the rows near the viewport, plus overscan. */
export function useSpicyVirtualList(
	lines: SpicyLine[],
	viewportRef: RefObject<HTMLDivElement | null>,
	onRowsMounted: () => void,
) {
	const linesRef = useRef(lines);
	linesRef.current = lines;
	const onRowsMountedRef = useRef(onRowsMounted);
	onRowsMountedRef.current = onRowsMounted;
	const virtualizerRef = useRef<LineVirtualizer | null>(null);
	const optionsRef = useRef<VirtualizerOptions<
		HTMLDivElement,
		HTMLDivElement
	> | null>(null);
	const signatureRef = useRef("");
	const geometry = useRef({ padTop: 0, padBottom: 0, width: 0, height: 0 });
	// The last scroll aimed at a line, kept to re-aim it once measured.
	const aimRef = useRef<{
		index: number;
		anchor: number;
		offset: number;
		top: number;
		corrections: number;
		until: number;
	} | null>(null);
	const [mounted, setMounted] = useState<VirtualWindow>({
		rows: [],
		totalSize: 0,
	});

	const publish = useCallback((v: LineVirtualizer) => {
		const margin = v.options.scrollMargin;
		const rows = v.getVirtualItems().map((item) => ({
			index: item.index,
			start: Math.round(item.start - margin),
		}));
		const totalSize = v.getTotalSize();
		// Scrolling inside the window changes nothing here, so React only
		// renders when rows mount, unmount or move.
		const signature = `${rows.map((row) => `${row.index}:${row.start}`).join(",")}|${totalSize}`;
		if (signature === signatureRef.current) return;
		signatureRef.current = signature;
		setMounted({ rows, totalSize });
	}, []);

	/** Scroll position that puts line `index` at `anchor` of the viewport. */
	const topFor = useCallback(
		(index: number, anchor: number, offset: number) => {
			const v = virtualizerRef.current;
			const item = v?.measurementsCache[index];
			if (!v || !item) return undefined;
			const { padTop, padBottom, width, height } = geometry.current;
			const gap = (rowGap(linesRef.current, index) * width) / 100;
			const maxTop = Math.max(
				0,
				padTop + v.getTotalSize() + padBottom - height,
			);
			return previewScrollTop(
				0,
				item.start,
				item.size - gap,
				height,
				maxTop,
				anchor,
				offset,
			);
		},
		[],
	);

	useLayoutEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		const readGeometry = () => {
			const style = getComputedStyle(viewport);
			const next = {
				padTop: Number.parseFloat(style.paddingTop) || 0,
				padBottom: Number.parseFloat(style.paddingBottom) || 0,
				width: viewport.clientWidth,
				height: viewport.clientHeight,
			};
			const marginChanged = next.padTop !== geometry.current.padTop;
			geometry.current = next;
			return marginChanged;
		};
		readGeometry();
		// A scroll aimed with estimated sizes above its line lands off once the
		// rows it revealed measure in. Re-aim it then, unless something else
		// (the user, a native smooth scroll still under way) has the list.
		const aiming = () => {
			const aim = aimRef.current;
			if (aim && performance.now() > aim.until) aimRef.current = null;
			return (
				aimRef.current !== null &&
				Math.abs(viewport.scrollTop - aimRef.current.top) <= 2
			);
		};
		const reaim = () => {
			const aim = aimRef.current;
			if (!aim || !aiming()) return;
			const top = topFor(aim.index, aim.anchor, aim.offset);
			if (top === undefined || Math.abs(top - aim.top) <= 1) return;
			aim.top = top;
			if (++aim.corrections >= MAX_CORRECTIONS) aimRef.current = null;
			viewport.scrollTo({ top, behavior: "instant" });
		};
		const options: VirtualizerOptions<HTMLDivElement, HTMLDivElement> = {
			count: linesRef.current.length,
			getScrollElement: () => viewportRef.current,
			estimateSize: (index) => {
				const line = linesRef.current[index];
				const gap =
					(rowGap(linesRef.current, index) * geometry.current.width) / 100;
				if (!line || line.isDotLine) return gap;
				return (line.isBackground ? ESTIMATE_BACKGROUND : ESTIMATE_LINE) + gap;
			},
			// Its corrections snap; the viewport's CSS smooth scrolling would
			// ease each one into a visible drift.
			scrollToFn: (offset, scrollOptions, instance) =>
				elementScroll(
					offset,
					{ ...scrollOptions, behavior: "instant" },
					instance,
				),
			observeElementRect: (instance, cb) =>
				observeElementRect(instance, (rect) => {
					// The list starts below the viewport's top padding, which
					// is relative to the preview's size.
					if (readGeometry() && optionsRef.current) {
						optionsRef.current.scrollMargin = geometry.current.padTop;
						instance.setOptions(optionsRef.current);
					}
					cb(rect);
				}),
			observeElementOffset,
			overscan: OVERSCAN,
			scrollMargin: geometry.current.padTop,
			getItemKey: (index) => linesRef.current[index]?.id ?? index,
			onChange: (instance) => {
				publish(instance);
				reaim();
			},
		};
		optionsRef.current = options;
		const v = new Virtualizer(options);
		// Rows resizing above the viewport keep what's on screen in place,
		// except while a scroll aimed at a line is settling: re-aiming at that
		// line is the correction then, and shifting under it would hide it.
		v.shouldAdjustScrollPositionOnItemSizeChange = (item, _delta, instance) =>
			!aiming() && item.start < (instance.scrollOffset ?? 0);
		virtualizerRef.current = v;
		const cleanup = v._didMount();
		v._willUpdate();
		publish(v);
		return () => {
			cleanup();
			virtualizerRef.current = null;
			optionsRef.current = null;
			signatureRef.current = "";
			aimRef.current = null;
		};
	}, [viewportRef, publish, topFor]);

	useLayoutEffect(() => {
		const v = virtualizerRef.current;
		const options = optionsRef.current;
		if (!v || !options) return;
		options.count = lines.length;
		v.setOptions(options);
		v._willUpdate();
		publish(v);
	}, [lines, publish]);

	// Rows that just mounted have no animation state on them yet.
	useLayoutEffect(() => {
		if (mounted.rows.length > 0) onRowsMountedRef.current();
	}, [mounted]);

	const measureRow = useCallback((node: HTMLDivElement | null) => {
		virtualizerRef.current?.measureElement(node);
	}, []);

	/** `topFor`, remembered so the scroll can be re-aimed once rows measure. */
	const getTop = useCallback(
		(index: number, anchor: number, offset: number) => {
			const top = topFor(index, anchor, offset);
			aimRef.current =
				top === undefined
					? null
					: {
							index,
							anchor,
							offset,
							top,
							corrections: 0,
							until: performance.now() + AIM_WINDOW_MS,
						};
			return top;
		},
		[topFor],
	);

	return {
		rows: mounted.rows,
		totalSize: mounted.totalSize,
		measureRow,
		getTop,
	};
}
