# Saktus Development Rules & Guidelines

All agents and contributors working in this repository must strictly observe:

1. **Anti-AI Slop Standards** (`AI SLOP PREVENTION GUIDELINE.MD` & `.agents/rules/anti-ai-slop.md`):
   - **No Glassmorphism**: Blurry frosted glass (`backdrop-blur`) has been explicitly rejected. Use solid, tactile cards (`#FFFFFF` in light, `#09090B` in dark) with clean 1px hairline borders (`border-zinc-200` / `border-zinc-800`).
   - **No Purple/Blue Gradients or Neon Glows**: Keep surfaces clean, crisp, and high-contrast.
   - **Pure White Default / Pure Black OLED**: Light mode is pure white `#FFFFFF`; dark mode is pure black `#000000`. Dual-mode support with tactile toggle.
   - **Zero Unicode Emojis**: Lucide icons only (`lucide-react` / `lucide-react-native`).
   - **Emil Kowalski Tactile Physics**: Snappy button scaling (`.btn-press:active { transform: scale(0.97); }`), spring easing curves, and tabular numbers (`tnum`) for timers and data.
   - **Copy Standards**: Plain, grounded language written for university students. Kill Tier 1 buzzwords (`delve`, `tapestry`, `unlock`, `supercharge`, `empower`, `elevate`) on sight.

2. **Zero Heavy Local Builds**:
   - Do not execute heavy local builds on the developer's PC. CI/CD runs via GitHub Actions for Cloudflare Workers and Expo EAS.
