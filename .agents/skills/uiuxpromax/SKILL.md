---
name: uiuxpromax
description: >-
  UI/UX Pro Max Engineering System: Master-level design principles for pristine typography hierarchy, generous spatial breathing room, accessible contrast ratios, and flawless user experience.
---

# UI/UX Pro Max System Specification

This skill enforces enterprise-grade, polished visual design standards, user-centric information architecture, and rigorous ergonomics across Web and Mobile applications.

## 1. Visual Hierarchy & Typography

### 1.1 Type Scale & Weights
- **Display**: Reserved for Hero headlines (`text-4xl` to `text-6xl`, font-weight 700/800, `letter-spacing: -0.03em`).
- **Title / Header**: Section titles (`text-xl` to `text-2xl`, font-weight 600/700, `letter-spacing: -0.02em`).
- **Subtitle / Body**: Clean legible reading size (`text-sm` or `text-base`, font-weight 400/500, line-height 1.6).
- **Metadata / Monospace**: Timestamps, course codes, shortcuts, and pills (`text-[11px]` to `text-xs`, font-mono or medium tracking).

### 1.2 Optical Alignment & Icon Balance
- Icons paired with text must be optically centered (`inline-flex items-center gap-2`).
- Icon strokes should match text weight (1.5px for regular text, 2px for medium/bold titles).
- Zero emoji usage in system UI; strictly use Lucide SVG icons.

---

## 2. Spatial Rhythm & Grid System

- **8pt Grid Discipline**: All paddings, margins, gaps, and heights follow multiples of 4 and 8 (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`).
- **Breathing Room**: Never crowd interactive elements. Allow minimum `8px` between touch targets and `44px x 44px` minimum tap bounds on mobile.
- **Card Padding**: Inner card padding must be generous (`p-5` to `p-6` on desktop, `p-4` on mobile).

---

## 3. Color & Contrast System

### 3.1 Light / White Theme Primary
- **Primary Canvas**: Luminous white (`#FFFFFF` or `#FAFAFC`).
- **Elevated Card Surface**: Pure white `#FFFFFF` with `1px border border-zinc-200/80` or frosted glass `rgba(255, 255, 255, 0.85)` with `backdrop-filter: blur(20px)`.
- **Primary Text**: High-contrast near-black (`#09090B` or `#18181B`).
- **Secondary Text**: Neutral slate/zinc (`#71717A` or `#52525B`).
- **Muted Text / Borders**: Subtle divider lines (`#E4E4E7` or `rgba(0, 0, 0, 0.08)`).
- **Accent Tones**: Distinct, purposeful semantic accents (e.g. Electric Blue, Emerald Green for success, Amber for warning, Coral for urgent deadlines).

### 3.2 Accessibility (WCAG AAA)
- Ensure all text-to-background contrast ratios exceed 4.5:1 for body text and 7:1 for fine metadata.
- Interactive states (hover, focus-visible, active, disabled) must have perceptible distinction.

---

## 4. State Completeness

Every view and component must explicitly provide:
1. **Loading State**: Shimmering skeleton matching the exact layout of the target data.
2. **Empty State**: Purposefully designed placeholder with an icon, descriptive explanation, and clear primary call-to-action.
3. **Error State**: Non-disruptive feedback with an easy retry action.
4. **Active / Selected State**: Unambiguous visual highlight (subtle background tint, solid border highlight, or animated indicator).
