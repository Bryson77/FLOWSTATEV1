# AI Slop Design Tells — Scoped to Saktus

Stack context this is scoped against: Next.js 15 (web, OpenNext/Cloudflare), Expo SDK 52 (mobile), Tailwind-based styling, dark-mode-by-default, Apple HIG + Emil Kowalski-style design engineering, spring-based animations. You've already ruled out glassmorphism and generic "vibe-coded" gradient dashboards as a stated design standard — good, that kills a chunk of this list before it starts. What's below is what's still live risk given your actual choices, not a generic list.

---

## Already covered by your existing decisions (don't relitigate, just don't drift back)

- Glassmorphism — explicitly rejected already (you killed the v3.0.0 plan's "visionOS Glassmorphism" proposal)
- Generic AI-dashboard look — explicitly rejected
- Dark mode as a lazy default — for most products this is an AI tell, but for Saktus dark mode is a deliberate HIG-aligned choice, not a reflex. The risk isn't dark mode itself, it's dark mode executed *generically* (see below)

## Still live risk given your stack (check these)

**Color & background**
- Purple-to-blue/indigo gradient background or gradient-clipped headings — the single most common AI tell, and easy to reach for by accident in Tailwind (`from-purple-500 to-blue-500` is a real trap)
- Neon-on-dark (cyan/violet glow) with glowing card borders — the "v0/Cursor signature"; watch for this specifically since you're already committed to dark mode, it's the easiest slop to slide into
- Gradient blob / aurora / mesh background shapes floating behind hero sections
- Default Tailwind indigo-500 as your primary accent color without a deliberate choice

**Typography**
- Inter or Roboto left untouched as the only typeface — if you haven't deliberately picked a type pairing, this is worth 10 minutes now rather than fixing later
- No distinct type pairing (one font for everything, no hierarchy between display/body)

**Components (relevant if you're using shadcn/ui or similar)**
- Untouched shadcn "zinc" theme defaults — shadcn is explicitly built to be copy-pasted by AI agents, so if Antigravity is scaffolding UI, check it isn't shipping raw defaults
- `rounded-2xl shadow-lg` applied uniformly to every card/surface with no variation
- Icon-in-rounded-square pattern repeated identically across every feature block
- Default blue buttons instead of a deliberate accent choice
- Uniform 16px border radius on literally everything

**Layout**
- Centered hero + headline + subhead + single CTA, with nothing else going on — check your landing page isn't just this
- Exactly three feature cards in a row (Saktus has 5+ real modules — timetable, flashcards, timer, squads, streaks — so forcing "three pillars" copy would actively hide what the product does)
- Bento grid layout used because it's trendy rather than because your content (timetable + streaks + squads) actually benefits from it
- "Hero metric" block: big number + small label + gradient accent dot — check this isn't a copy-paste pattern if you show stats (streak count, study hours)
- Numbered 1-2-3 "how it works" steps used reflexively rather than because the actual flow is 3 steps

**Motion**
- Same fade-in animation applied to every single element with no variation — you're already committed to spring-based physical animations per Kowalski's style, so check Antigravity-generated motion isn't defaulting to generic CSS fade/slide transitions instead of your spring system
- Buttons that snap instead of easing (missing transition entirely)
- Hover states that visually change nothing

**Imagery**
- Stock photo of "diverse team looking at laptop in bright office" — irrelevant for Saktus anyway (student audience, not enterprise), but check nothing generic slipped into marketing pages
- Generic 3D abstract blob illustrations or "too-smooth plastic" illustrated people
- Undraw-style clipart

**Copy-adjacent visual tells**
- Green-checkmark-in-circle bullet lists for feature lists — low-effort, check if it fits your HIG-aligned aesthetic or reads as templated next to it
- "Trusted by" logo row with placeholder/generic company logos — not applicable pre-launch, but don't fabricate one to look credible
- Fake countdown timers or "Join 10,000+ students" unverifiable stats — don't inflate numbers you don't have yet

**Structure**
- Site structure that's identical regardless of product: Hero → 3 Features → Testimonials → Pricing → FAQ → CTA → Footer, copy-pasted regardless of what Saktus actually does. Your structure should be driven by what a student needs to understand (what modules exist, how SRS works, how squads work), not a generic SaaS template

---

## Audit method for when you're ready to check the real thing

1. Point me at the actual landing page / component files (or the deployed URL) and I'll check line-by-line against this list rather than in the abstract.
2. For a faster automated pass on the frontend code itself, the `avoid-ai-design` Claude Code skill (GitHub: funboy322/avoid-ai-design) does exactly this — audits generated frontend for these tells and rewrites against them. Worth running once you have real components, especially if Antigravity is doing a lot of the scaffolding.


# AI Slop Words & Phrases — Scoped to Saktus

Use this against: landing page copy, onboarding flows, empty states, push notifications, App Store listing, README/pitch decks. Saktus is a student-facing product — the bar is "sounds like a person who actually studies wrote this," not "sounds like enterprise SaaS."

Kill on sight in Saktus copy especially: anything that sounds like generic productivity-SaaS marketing rather than a specific tool built for a specific study workflow (timetable, SRS flashcards, focus timer, squads, streaks).

---

## Tier 1 — Kill on sight (never ship these in Saktus copy)

delve, tapestry, testament, underscore, showcase, meticulous, intricate, realm, landscape, journey ("your study journey"), synergy, foster/fostering, embark, endeavor, groundbreaking, game-changer/game-changing, treasure trove, beacon, indelible, hitherto, cognizant, paramount, unlock the potential, harness the power, elevate your (studying/productivity), supercharge, empower, unleash

**Saktus-specific red flag:** "journey," "unlock," and "empower" are exactly the words generic study-app marketing reaches for ("unlock your potential," "empower your learning journey"). Saktus's whole positioning is a specific, opinionated study OS, not aspirational ed-tech fluff — these words undercut that instantly.

## Tier 2 — Suspicious in clusters (fine once, bad in threes)

robust, seamless, vibrant, comprehensive, crucial, multifaceted, innovative, cutting-edge, streamline, transformative, holistic, navigate/navigating, complexities, nuance/nuanced, dynamic, ever-evolving, thriving, vital, optimize/optimise, plethora, myriad, boasts, stands as, serves as, plays a crucial role, wide range of, spectrum, ecosystem, disruptive, revolutionize/revolutionizing, state-of-the-art, unprecedented, unwavering, invaluable, indispensable, captivating, stunning, must-have, top-notch, best-in-class, world-class, tailored, curated/curate

**Saktus-specific red flag:** "seamless," "comprehensive," and "ecosystem" show up constantly in "all-in-one platform" marketing — which is literally how the FlowState Study OS blueprint describes itself internally. Fine in your own planning docs; deadly in user-facing copy, where it reads as generic instead of specific to timetable + SRS + timer + squads + streaks.

## Tier 3 — Filler connectives (light signal, but tighten anyway)

furthermore, moreover, consequently, notably, importantly, additionally, notwithstanding, whilst, albeit, thus, hence, arguably, essentially, fundamentally, ultimately, that being said, whereas

---

## Phrases & sentence patterns to avoid

- "In today's fast-paced world / digital landscape" — never open a Saktus page with this
- "In the ever-evolving world of studying" and variants
- "It's not just a study app, it's a [X]" / any "not X, it's Y" construction
- "Whether you're cramming for finals or reviewing daily, there's something for everyone" — the "whether you're X or Y" hedge
- "At the end of the day"
- "When it comes to studying"
- "It's important/worth noting that"
- "Plays a crucial role in your success"
- "Navigating the complexities of exam prep"
- "As technology continues to evolve"
- "Unlocking the potential of spaced repetition" (see: unlock, Tier 1)
- Forced rule-of-three ("track, focus, achieve") when there are really only two real points
- "No fluff, just results" / "no distractions, just focus" — negation-as-emphasis filler
- Rhetorical Q&A pairs ("Struggling to stay focused? Saktus has you covered.")
- Hedging with no commitment ("might help you study better") — Saktus should state what it does, not what it might do

## Formatting / punctuation tics to check for

- Em dash overuse — several per paragraph is the single most cited AI tell; use commas or periods instead
- Random mid-sentence **bolding** with no clear emphasis logic
- Unicode fake-bold/italic characters (𝗯𝗼𝗹𝗱, 𝘪𝘵𝘢𝘭𝘪𝘤) — never use these
- Title Case On Every Heading, even short UI labels
- Bulleted/numbered lists for things that are really just one sentence
- Emoji as bullet markers (🚀 ✅ 🎯) in onboarding or feature lists — clashes with the Apple HIG / Kowalski-style design standard you've already set for Saktus; that aesthetic reads as considered, emoji bullets read as templated
- Metronomic sentence rhythm — every sentence the same length, no variation

---

## Where this actually matters for Saktus

- **Landing page hero/subhead** — highest-risk surface. This is the first thing a student sees; generic copy here kills conversion faster than a bad screenshot.
- **App Store / Play Store listing** — same risk, plus character limits push people toward buzzword-dense copy.
- **Onboarding empty states** ("No exams yet — add your first one") — keep these plain and specific, not "Begin your journey to academic excellence."
- **Push notification copy** — students will mute anything that reads as corporate ("Unlock your streak potential today!").
- **Pitch deck / README** for AWS Student Builder Group or any showcase — less user-facing but still worth a pass, since this is what other builders/judges will read closely.

Not high-risk: internal planning docs (STUDENT_OS_BLUEPRINT.md, implementation plans) — write those however's fastest for you, this list is for anything a student or reviewer will actually read.