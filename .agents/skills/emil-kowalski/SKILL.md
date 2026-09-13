---
name: emil-kowalski
description: >-
  Emil Kowalski Craft & Micro-Interactions: Spring physics, fluid gesture transitions, sensory feedback, layout animations, and obsessive attention to tactile UI delight.
---

# Emil Kowalski Interaction Craft & Motion Guide

This skill guides the design, implementation, and refinement of tactile, fluid user interfaces inspired by Emil Kowalski's interaction design principles, components (Vaul, Sonner), and motion guidelines.

## 1. Core Philosophy

- **Physics Over Keyframes**: Natural motion decelerates smoothly with mass and momentum. Avoid robotic linear or harsh ease-in-out curves.
- **Immediate Tactile Feedback**: Every interactive surface must respond instantly to touch or click before any asynchronous network operation completes.
- **Spatial Continuity**: Elements don't disappear into thin air; they expand from their triggers, morph into their active states, and return with graceful decay.
- **Tabular Stability**: Numbers, clocks, percentages, and counters must NEVER cause layout wobble or jitter.

---

## 2. Spring Physics & Easing Tokens

Use standardized cubic-bezier curves for CSS and spring configurations for Framer Motion / React Native Reanimated:

```css
:root {
  /* Snappy interactive spring (active clicks, button scales) */
  --ease-spring: cubic-bezier(0.2, 0, 0, 1);

  /* Apple-inspired fluid exit and deceleration */
  --ease-apple-out: cubic-bezier(0.16, 1, 0.3, 1);

  /* Drawer, modal, and bottom-sheet physics (Vaul style) */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}
```

### Framer Motion Springs

```typescript
export const springPresets = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
  bouncy: { type: 'spring', stiffness: 300, damping: 20 },
  gentle: { type: 'spring', stiffness: 180, damping: 24 },
  modal: { type: 'spring', damping: 25, stiffness: 200 },
};
```

---

## 3. Micro-Interaction Rules

### 3.1 Button & Card Press States
- On `:active`, apply a subtle scale: `transform: scale(0.97)` to `scale(0.98)` with `transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1)`.
- Never disable hover or focus-visible rings.
- Use `btn-press` utility class across all buttons and interactive cards.

```css
.btn-press {
  transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease, border-color 150ms ease;
  will-change: transform;
}
.btn-press:active {
  transform: scale(0.97);
}
```

### 3.2 Sliding Pill Tabs (Morphing Indicator)
- Use Framer Motion `layoutId="active-pill"` to smoothly glide the indicator between tabs.
- Never use abrupt color jumps when switching tabs or views.

### 3.3 Numeric Stability
- Always apply `font-variant-numeric: tabular-nums` (`font-feature-settings: "tnum"`) to any component showing:
  - Stopwatches & timers
  - Flashcard counts & SRS metrics
  - Percentages and progress stats
  - Timetable hours and countdowns

---

## 4. Component Standards

### 4.1 Toasts (Sonner Pattern)
- Stack up to 3 visible cards with decreasing scale (`scale(0.95)`, `scale(0.90)`) and subtle translate offsets.
- Smooth swipe-to-dismiss gesture with spring return if not crossed threshold.
- Action buttons directly embedded in the toast.

### 4.2 Drawers & Modals (Vaul Pattern)
- Bottom sheet on mobile with drag indicator pill.
- Velocity-based flick-to-close gesture.
- Scaled backdrop background (parent page scales down to `scale(0.96)` and dims during drawer opening).

### 4.3 Skeleton Shimmers
- Avoid static gray boxes. Use an ultra-subtle animated gradient shimmer with `animation: shimmer 1.8s infinite`.
