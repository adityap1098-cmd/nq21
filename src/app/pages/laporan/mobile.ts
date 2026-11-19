import type { CSSProperties } from 'react'

// Phone-only (< 768px) layout overrides shared by the four Laporan pages.
// Desktop styles stay inline in each page; these are spread on top only when useIsMobile() is true.

/** Horizontal scroll wrapper so a wide table scrolls inside its card instead of widening the page. */
export const TABLE_SCROLL: CSSProperties = { overflowX: 'auto', WebkitOverflowScrolling: 'touch' }

/** PERIODE bar: label, 2x2 period pills, custom range and the date range each on their own line. */
export const MOBILE_PERIOD_BAR: CSSProperties = { flexDirection: 'column', alignItems: 'stretch', gap: 10 }

/** Date range label inside the PERIODE bar (desktop pushes it right with marginLeft: auto). */
export const MOBILE_RANGE_LABEL: CSSProperties = { marginLeft: 0 }

/** Single-column stack for grids that sit side by side on desktop. */
export const MOBILE_STACK: CSSProperties = { gridTemplateColumns: 'minmax(0, 1fr)' }

/** Two equal columns that may shrink below their content width. */
export const MOBILE_TWO_COL: CSSProperties = { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }
