// src/utils/responsive.ts
//
// Single source of truth for every size in the app.
// Import rf/rs/rp/rh and the token objects instead of writing raw numbers.
//
// Design base: 390 × 844 dp  (iPhone 14 / mid-range Android).

import { Dimensions, PixelRatio } from 'react-native';

const BASE_W = 390;
const BASE_H = 844;

const { width: W, height: H } = Dimensions.get('window');
const wScale = W / BASE_W;
const hScale = H / BASE_H;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Responsive font — soft scale clamped to ±20 % of design value. */
export function rf(size: number): number {
    const scaled  = size * (wScale * 0.55 + 0.45);
    const clamped = Math.min(Math.max(scaled, size * 0.80), size * 1.20);
    return Math.round(PixelRatio.roundToNearestPixel(clamped));
}

/** Responsive dimension — widths, heights, icon sizes, border radii. */
export function rs(size: number): number {
    return Math.round(PixelRatio.roundToNearestPixel(size * wScale));
}

/** Responsive padding / horizontal gap. */
export function rp(size: number): number {
    return Math.round(PixelRatio.roundToNearestPixel(size * wScale));
}

/** Responsive vertical dimension — heights, vertical padding. */
export function rh(size: number): number {
    return Math.round(PixelRatio.roundToNearestPixel(size * hScale));
}

// ── Screen info ───────────────────────────────────────────────────────────────
export const screen = {
    w:       W,
    h:       H,
    isSmall: W < 360,
    isMed:   W >= 360 && W < 768,
    isLarge: W >= 768,
} as const;

// ── Design tokens — use these everywhere ─────────────────────────────────────

export const typography = {
    xs:      rf(11),   // tiny labels, footnotes
    sm:      rf(12),   // captions
    body2:   rf(13),   // secondary body, subtitles, chip text
    body:    rf(15),   // primary body copy
    md:      rf(16),   // button labels, medium emphasis
    lg:      rf(18),   // card titles
    xl:      rf(20),   // section headings
    xxl:     rf(24),   // page sub-headings
    h2:      rf(28),   // hero numbers
    h1:      rf(32),   // screen titles
    display: rf(35),   // large display headings
} as const;

export const spacing = {
    xxs: rp(4),
    xs:  rp(6),
    sm:  rp(10),
    md:  rp(16),
    lg:  rp(24),
    xl:  rp(32),
    xxl: rp(48),
} as const;

export const radius = {
    xs:   rs(6),
    sm:   rs(10),
    md:   rs(14),
    lg:   rs(20),
    xl:   rs(24),
    full: rs(999),
} as const;

export const iconSize = {
    xs:   rs(14),
    sm:   rs(18),
    md:   rs(22),
    lg:   rs(26),
    xl:   rs(32),
    xxl:  rs(44),
    hero: rs(52),
} as const;