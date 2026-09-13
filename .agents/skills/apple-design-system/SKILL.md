---
name: apple-design-system
description: >-
  Apple Human Interface Guidelines & Precision Design: Tactile solid surfaces, SF Pro typography, pure white / pure black contrast, precision segmented controls, and fluid spring harmony. No glassmorphism slop.
---

# Apple Human Interface Guidelines & Precision System

This skill codifies Apple's Human Interface Guidelines (HIG) adapted for web and mobile interfaces, specifically aligned with Saktus principles: solid tactile surfaces, deliberate typography, and zero blurry glassmorphism slop.

## 1. Materials & Solid Tactility (No Glassmorphism)

- **Solid Surfaces**:
  - Light Mode: Pure white `#FFFFFF` or pristine porcelain `#FAFAF9` canvas with solid `#FFFFFF` cards.
  - Dark Mode: Pure black `#000000` canvas with solid `#09090B` cards.
  - **No Blurry Glass Crutches**: Do not rely on `backdrop-blur` as a personality substitute. Surfaces must be solid, crisp, and high-contrast.
- **Hairline Borders**:
  - Light Mode: `border: 1px solid rgba(0, 0, 0, 0.08)`
  - Dark Mode: `border: 1px solid rgba(255, 255, 255, 0.08)`
- **Shadows**:
  - Restrained, diffuse, minimal: `box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04)`.

---

## 2. Typography & Font Stack

- **Font Family**:
  ```css
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  ```
- **Tracking / Letter Spacing**:
  - Headers (`text-xl` to `text-4xl`): `letter-spacing: -0.025em` (tight, authoritative).
  - Body (`text-sm` to `text-base`): `letter-spacing: -0.01em` (clean, legible).
  - Badges & Micro-copy (`text-[10px]` to `text-xs`): `letter-spacing: 0.05em` to `0.1em` uppercase.

---

## 3. Component Architecture & Patterns

### 3.1 Segmented Controls & Pills
- Solid track container (`bg-zinc-100 dark:bg-zinc-900`).
- Elevated active pill with subtle elevation (`shadow-xs bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold`).
- Inactive items in soft zinc (`text-zinc-500 dark:text-zinc-400`).

### 3.2 Dynamic Island & Floating HUDs
- Floating capsule (`rounded-full`), positioned centrally.
- High-contrast, tactile indicator with live tabular numerals (`tnum`).
- Expands cleanly into focused modes.

### 3.3 Tactile Squircles
- Apple continuous squircle border radiuses:
  - Small elements / badges: `rounded-lg` (8px)
  - Inputs & action buttons: `rounded-xl` (12px)
  - Content cards: `rounded-2xl` (16px) or `rounded-3xl` (24px)
  - Floating pills: `rounded-full` (9999px)

---

## 4. Pure Contrast Standard

- No purple/blue gradients or neon glowing borders.
- Pure white `#FFFFFF` default, pure black `#000000` dark mode.
- High contrast, razor-sharp legibility on all text and controls.
