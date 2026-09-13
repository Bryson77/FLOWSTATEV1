---
trigger: always_on
description: Anti-AI Slop design and copy enforcement for Saktus codebase
---

# Anti-AI Slop Design & Copy Rules (Scoped to Saktus)

Strict guidelines derived from `AI SLOP PREVENTION GUIDELINE.MD`. Every agent working on Saktus must follow these rules without exception.

## 1. Visual Design & Styling

- **No Glassmorphism**: Glassmorphism has been explicitly rejected. Do not use generic frosted blurry surfaces (`backdrop-blur`) as a crutch. Use crisp, solid surfaces (`#FFFFFF` in light, `#09090B` in dark) with subtle 1px hairline borders (`border-zinc-200` / `border-zinc-800`).
- **No Purple-to-Blue / Neon Gradients**: Never use `from-purple-500 to-blue-500`, gradient-clipped headings (`bg-clip-text text-transparent`), or neon card borders.
- **No Background Blobs or Auroras**: Keep canvases pure white `#FFFFFF` or pure black `#000000`. No floating colorful blurred circles behind heroes.
- **Pure White Default / Pure Black OLED**: Support pure white as default theme and pure black OLED in dark mode with a tactile 1-tap toggle.
- **Motion Physics (Emil Kowalski)**: Buttons and interactive elements must have snappy spring presses (`.btn-press:active { transform: scale(0.97); }` with `cubic-bezier(0.16, 1, 0.3, 1)`). Tabular stability (`tnum`) for all timers, metrics, and countdowns.
- **Icons**: Lucide icons only. Zero unicode emojis anywhere in source code, copy, badges, or buttons.

## 2. Copywriting & Tone (Kill on Sight)

Saktus is built for university students studying real coursework, not generic enterprise SaaS.

### Tier 1 Words (Never ship in Saktus copy):
`delve`, `tapestry`, `testament`, `underscore`, `showcase`, `meticulous`, `intricate`, `realm`, `landscape`, `journey`, `synergy`, `foster`, `embark`, `endeavor`, `groundbreaking`, `game-changer`, `treasure trove`, `beacon`, `indelible`, `hitherto`, `cognizant`, `paramount`, `unlock`, `harness`, `elevate`, `supercharge`, `empower`, `unleash`.

### Tier 2 Words (Avoid in marketing and UI):
`robust`, `seamless`, `vibrant`, `comprehensive`, `crucial`, `multifaceted`, `innovative`, `cutting-edge`, `streamline`, `transformative`, `holistic`, `navigate`, `complexities`, `nuance`, `dynamic`, `ever-evolving`, `thriving`, `vital`, `optimize`, `plethora`, `myriad`, `boasts`, `stands as`, `serves as`, `ecosystem`, `disruptive`, `revolutionize`, `state-of-the-art`, `unwavering`, `invaluable`, `indispensable`, `captivating`, `stunning`, `must-have`, `top-notch`, `best-in-class`, `world-class`, `tailored`, `curated`.

### Sentence Structures to Avoid:
- "In today's fast-paced world..."
- "Whether you're X or Y..."
- "Not just a study app, it's..."
- "No fluff, just results"
- Fake social proof ("Trusted by 10,000+ students")
- Em dash overuse (use standard commas and periods)
