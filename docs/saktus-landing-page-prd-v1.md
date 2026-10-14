# Saktus Landing Page — Product Requirements Document

**Document status:** Ready for implementation  
**Version:** 1.0  
**Product:** Saktus (formerly FlowState Productivity)  
**Document scope:** Public marketing website and landing-page experience only  
**Primary platform:** Web  
**Pricing:** Free  
**Mobile app:** Coming soon  
**Design reference:** [Stripe.dev](https://stripe.dev/) for clear navigation, content hierarchy, and product-led presentation. This is inspiration for structure and clarity, not a visual clone.

---

## 1. Executive summary

Saktus is a free, student-built study platform that combines individual study tools with a social layer. Students can plan their study day, work through flashcards, use a Pomodoro-style focus timer, study with friends, share flashcard decks, and compare study time.

The landing page must communicate both halves of the product:

1. **The study system:** schedule, flashcards, and focused sessions in one workspace.
2. **The social study layer:** study alongside friends, share what you are learning, and compare study activity in a supportive way.

The social layer is a central differentiator. Do not bury it beneath three generic productivity feature cards. The page should make the value immediately understandable: studying can be more organised and less isolating when students can learn alongside one another.

The page should feel product-led and credible, with a fully black canvas, sharp typography, restrained surfaces, and clear demonstrations of the product. The marketing site can have more editorial personality than the application. The app itself should use the same visual foundations but be more serious, quieter, and more task-oriented.

The entire core experience is free. The page must not introduce paid plans, pricing tiers, trial language, fake scarcity, or a premium upsell.

---

## 2. Product definition and positioning

### 2.1 One-line description

**Saktus is a free social study platform for planning your day, learning with flashcards, focusing with a timer, and studying alongside friends.**

### 2.2 Primary brand promise

**Study better, together.**

Supporting message: Plan your day, practise with flashcards, focus on one session, and see your friends putting in the work too.

### 2.3 Positioning statement

For students who want more structure and more motivation in their study routine, Saktus brings planning, active recall, focused work, and social accountability into one free study space. Unlike a collection of disconnected productivity tools, Saktus is designed around the way students actually prepare: organising their time, testing what they know, and learning alongside their peers.

### 2.4 Core audiences

**Primary audience — individual students**
- Students in school, college, university, or independent study.
- Students juggling several subjects, tests, assignments, and deadlines.
- Students who want structure but do not want to assemble several separate tools.

**Secondary audience — friends and informal study groups**
- Friends who share decks, study similar subjects, or want to keep one another accountable.
- Students who benefit from seeing that peers are also dedicating time to their work.

### 2.5 Problems Saktus addresses

- It can be difficult to turn an intention to study into a clear plan.
- Rereading material does not always reveal whether a student can recall it.
- Focus sessions can be hard to start and structure.
- Study resources are often scattered between separate tools and messages.
- Studying can feel isolating; students may want to work alongside friends without needing another noisy social feed.

### 2.6 Message hierarchy

1. **Social study:** studying with friends, sharing flashcards, and comparing study time.
2. **One connected study workspace:** daily schedule, flashcards, and Pomodoro timer.
3. **Free:** core product use does not require payment.
4. **Student-built:** made by a student with an understanding of student life.
5. **Web-first:** use the web experience now; mobile app coming soon.

### 2.7 Brand voice

- Clear, direct, and confident.
- Student-aware without sounding childish or trying too hard to use slang.
- Encouraging without guilt, pressure, or exaggerated motivational language.
- Specific about what the product does.
- Social without copying the tone or visual language of mainstream social media.
- Calm and credible. Avoid noisy gamification, fake urgency, and inflated learning claims.

### 2.8 Do not say or imply

- That Saktus guarantees better grades, perfect recall, or automatic productivity.
- That all activity is public or that friends can see private study data without permission.
- That a friend leaderboard, live presence, shared decks, or activity feed is already available unless each feature has been implemented and verified.
- That AI creates cards, imports notes, syncs with learning management systems, or generates study plans unless shipped.
- That the mobile app is available in an app store.
- That Saktus has users, schools, testimonials, engagement figures, or outcomes that have not been verified.
- Any paid tier, premium feature wall, “free trial,” or crossed-out price.

---

## 3. Goals and non-goals

### 3.1 Goals

- Explain the Saktus proposition within the first viewport.
- Make the social-study value obvious, not an afterthought.
- Convert visitors into account creation or the existing first-run flow with as little friction as possible.
- Show what the product looks like using believable, coherent product UI previews.
- Communicate the free model clearly.
- Explain the three personal study tools and the social layer as one connected product.
- Build trust through useful copy, clear privacy language, and an authentic student-built story.
- Work cleanly across desktop, tablet, and mobile screens.
- Maintain a consistent visual system that can be reused by the web app.

### 3.2 Non-goals

- Building the study app itself as part of the landing page task.
- Creating a full marketing CMS or blog platform.
- Inventing user statistics, testimonials, logos, reviews, or social proof.
- Building a waitlist unless the product team explicitly chooses and implements one.
- Publishing separate feature-detail pages unless requested or already present in the project.
- Creating a pricing page, plan comparison, or billing flow.
- Designing a playful game-like marketing site or a conventional social-media clone.

---

## 4. Scope and feature truth

The landing page may describe the product direction, but the implementation must distinguish shipped functionality from planned functionality. Before publishing, compare the following checklist against the actual Saktus web app and adjust the copy and CTA destinations to match reality.

| Capability | Product positioning | Publishing rule |
|---|---|---|
| Daily schedule | Core study tool | Describe as available only if usable in the current web app. |
| Flashcards | Core study tool | Describe deck creation and review only to the extent implemented. |
| Pomodoro-style focus timer | Core study tool | Confirm start, pause/reset, and break behavior before describing details. |
| Study with friends | Core social capability | Show as available only if friend connection or an equivalent real workflow exists. Otherwise identify as upcoming, not available. |
| Share flashcard decks | Core social capability | Confirm permissions, link behavior, and recipient experience before claiming it is live. |
| Compare study time | Core social capability | Confirm what is tracked, the time period shown, and who can view it. Do not imply private activity is public. |
| Social activity or study feed | Supporting possible UI | Only advertise if it exists; it is not required for the first landing-page release. |
| Mobile app | Future platform | Always say “Coming soon” until an actual release is available. |

**Important release rule:** The PRD defines the intended product narrative. It does not authorise the site to falsely imply an unshipped feature is usable today. If social capabilities are still in development, the page may explain the direction but must label those capabilities clearly (for example, “Built around studying with friends” or “Social study features are in development”). Do not add an unrequested waitlist.

---

## 5. Conversion strategy

### 5.1 Primary conversion

Get a visitor from the landing page into the existing Saktus sign-up or first-use flow.

**Primary CTA label:** `Start studying for free`

Use one canonical CTA destination throughout the page. Inspect the existing project and use the actual sign-up / app route; do not invent a URL or create duplicate sign-up experiences. If visitors can enter the product without creating an account, use the lowest-friction real route.

### 5.2 Secondary conversion

Help visitors understand the product before starting.

**Secondary CTA label:** `See how it works`

Scrolls to the “How Saktus works” section. It must not link to an empty route.

### 5.3 Navigation actions

- Wordmark: return to the top of the landing page.
- Product: jump to the study tools section.
- Study with friends: jump to the social-study section.
- How it works: jump to the sequence section.
- About: jump to the student-built story.
- Sign in: use the existing sign-in route, if one exists.
- Start for free: use the existing sign-up/onboarding route.

Do not show a Sign in link unless a working sign-in route is available. Remove any navigation item that points nowhere.

---

## 6. Information architecture and page order

Use one coherent page. The order below is deliberate: first tell people what Saktus is, then show the most distinctive social value, then explain the study tools, then establish trust and answer objections.

1. Header / navigation
2. Hero: “Study better, together.”
3. Product preview: study workspace + friends’ study activity
4. Social-study feature section
5. Study tools section: flashcards, Pomodoro timer, daily schedule
6. “How it works” sequence
7. Flashcards and shared-deck spotlight
8. Study-time comparison / friendly accountability spotlight
9. Free promise
10. Built by a student section
11. Mobile app coming soon section
12. FAQ
13. Final CTA
14. Footer

Avoid repeating three near-identical feature card sections. Use variation in composition: open editorial sections, a product UI demonstration, and a restrained grid for the three study tools. Keep the main content aligned to a consistent grid.

---

## 7. Complete landing-page copy

The copy below is the recommended default. If a feature-truth check in Section 4 fails, revise the availability wording before release.

### 7.1 Header

**Wordmark:** Saktus

**Navigation:** Product · Study with friends · How it works · About

**Right-side actions:** Sign in · **Start for free**

On smaller screens, keep the wordmark and a single primary CTA visible. Put navigation links in a simple menu with an accessible open/close control.

### 7.2 Hero

**Eyebrow**  
A study platform made by a student, for students

# Study better, together.

Plan your day, practise with flashcards, and focus with a timer. Study alongside friends, share what you’re learning, and see the time you’re all putting in — all in one free study space.

**Primary CTA:** Start studying for free  
**Secondary CTA:** See how it works

**Microcopy:** Free to use. Available on the web. Mobile app coming soon.

**Hero visual:** A product-led UI preview, not a stock photo. The composition should pair an individual study workspace with a friend/study-group panel. The visual could show a schedule, one running focus session, a flashcard front, and a study-time comparison for a selected group. Use real data only when available. For designed examples, clearly treat the screen as a product mockup and never imply its names, totals, or rankings are actual users or measured usage.

**Layout rule:** Headline and CTA should remain the dominant reading path. Do not add a floating pile of badges, multiple CTA buttons, fake activity notifications, or decorative emoji.

### 7.3 Supporting statement

## Your study tools, with your people.

Saktus brings the practical parts of studying into one place — planning what to do, testing what you know, focusing on a session, and keeping up with friends who are working towards their own goals.

### 7.4 Social-study feature section

**Eyebrow:** Studying doesn't have to be solo

## Bring your friends into the routine.

Make studying a shared effort. Connect with friends, exchange useful flashcard decks, and compare study time to see how everyone is showing up. Keep the focus on the work — and help one another stay consistent.

#### Study alongside friends

Know who you’re studying with and make individual study sessions feel less isolated. Saktus should support a sense of shared momentum without turning every session into a public performance.

#### Share flashcards

Pass useful decks between friends instead of rebuilding the same revision material from scratch. Shared cards should make it easier to learn from one another’s preparation.

#### See the time you put in

Compare study time over a clearly defined period, such as a day or week, with friends who have chosen to share their activity. Use the comparison as encouragement, not as a judgement of who is the better student.

**CTA:** Start studying with Saktus

**Privacy note for product design, not necessarily marketing copy:** Sharing visibility needs clear controls. Do not imply all study activity, schedules, decks, or personal details are automatically public.

### 7.5 Tools section

**Eyebrow:** The essentials, in one workspace

## Plan it. Practise it. Focus on it.

A study system only helps when you can actually use it. Saktus keeps the core tools close together so you can move from planning a session to doing the work.

#### Flashcards

**Recall the answer. Don’t just recognise the page.**

Use flashcards to test what you remember, spot gaps in your understanding, and organise revision around the topics you need to learn.

#### Focus timer

**Give one task a clear start and finish.**

Use Pomodoro-style sessions to work in manageable blocks, with breaks between them. Keep your attention on the task in front of you.

#### Daily schedule

**Make your study day easier to follow.**

Organise study blocks around the day ahead, keep your priorities visible, and know what you intend to work on next.

**Implementation note:** Do not add AI generation, automatic imports, calendar integrations, reminders, or specific spaced-repetition algorithm claims unless those capabilities are present and verified.

### 7.6 How it works

**Eyebrow:** A simple routine

## From “I should study” to getting started.

**01 — Make a plan**  
Add study blocks to your day and decide what deserves your attention.

**02 — Learn actively**  
Use flashcards to test yourself and share useful decks with friends when you want to study together.

**03 — Focus on one session**  
Start a timer and give the task in front of you a dedicated block of time.

**04 — Keep each other going**  
See the study time friends have chosen to share and use it as a nudge to return to your own plan.

**Closing line:** Your own routine. Your friends beside you. One place to study.

### 7.7 Flashcards spotlight

**Eyebrow:** Built for active recall

## Make revision something you do, not just something you read.

Flashcards put your memory to work. Test what you know, notice what needs another look, and build decks around the subjects and topics you’re studying. When deck sharing is available, learn from the material your friends have prepared too.

**CTA:** Explore flashcards

Use the CTA only if it leads to a real route or scroll target. If deck sharing is not shipped, remove or rephrase the sharing sentence until it is available.

### 7.8 Study-time comparison spotlight

**Eyebrow:** Shared effort, not pressure

## See the time. Keep your own pace.

Your study time tells one part of the story. See your own focus time alongside friends who choose to share theirs, and use that visibility to encourage one another to keep showing up.

No shame for a quiet day. No claim that the longest timer means the best learning. The point is to make effort visible and studying feel a little less solitary.

**UI guidance:** Display the period represented (for example, “This week”), units clearly (minutes/hours), and the scope of visibility (for example, “Friends”). Avoid ambiguous all-time rankings, streak-loss pressure, red failure states, or presenting time spent as proof of academic performance.

### 7.9 Free promise

**Eyebrow:** No subscription standing between you and your next session

## Everything you need to get started. Free.

Saktus is free to use. The study tools and social features described here are part of one student-focused experience — not a maze of plans or a trial that expires.

**CTA:** Start studying for free

**Release rule:** This wording is only approved if the capabilities advertised in the final first sentence are actually included for free. If some social features are not released, say: “Saktus is free to use. Start with the study tools available today, with more ways to study together on the way.”

### 7.10 Student-built story

**Eyebrow:** Built from the student side of the desk

## Made by a student. For students.

Saktus began as FlowState Productivity with a straightforward idea: make it easier to plan study time and follow through. It is being built around real student routines — preparing for assessments, keeping track of subjects, practising what you know, and finding a little momentum alongside friends.

The name has changed to Saktus. The reason for building it has not.

Do not add unapproved founder biographies, university affiliations, user counts, or claims about results.

### 7.11 Mobile app section

**Eyebrow:** Coming soon

## Your study routine, on mobile.

The Saktus mobile app is in development. For now, you can start with the web experience.

**CTA:** Start on the web

Do not display App Store or Google Play buttons until the app is published and the URLs are real. Do not create a waitlist or collect email addresses for release updates unless that flow has been explicitly approved and implemented.

### 7.12 FAQ

**What is Saktus?**  
Saktus is a free study platform that brings together flashcards, a daily schedule, a focus timer, and ways to study with friends.

**Is Saktus free?**  
Yes. Saktus is free to use. There is no paid plan required to access the core experience.

**Can I study with my friends?**  
Saktus is designed to make studying more social. Depending on the current release, this may include connecting with friends, sharing flashcard decks, and comparing study time. The published answer must match features that are actually available.

**Can I share flashcards?**  
Saktus is designed to support sharing useful revision decks. Only promise deck sharing as available once the sharing workflow is live.

**Can friends see how long I studied?**  
Study-time visibility should be limited to the sharing settings and people you choose. The product must make those settings clear. Do not publish this answer until the actual visibility controls are implemented and verified.

**How does the focus timer work?**  
The focus timer supports Pomodoro-style study sessions: work for a set block of time, then take a break. Describe specific durations or automatic transitions only if implemented.

**Can I use Saktus on my phone?**  
You can use the current web experience. A dedicated mobile app is coming soon.

**Who is Saktus for?**  
Saktus is for students who want a clearer way to plan their study day, practise course material, focus on a task, and study alongside friends.

**Why did the name change from FlowState Productivity?**  
Saktus is the new name for the project formerly known as FlowState Productivity. The focus remains on helping students organise their study routine and learn alongside others.

### 7.13 Final CTA

## Your next study session doesn't have to be solo.

Make a plan, choose a topic, start a focus session, or invite a friend into your study routine. Saktus is free to use.

**CTA:** Start studying for free

### 7.14 Footer

**Brand line:** Saktus — a study platform made by a student, for students.

**Link groups:**
- Product: Study tools · Study with friends · How it works
- Account: Sign in · Start for free
- Information: Privacy · Terms · Contact

Only display destinations that exist. Legal links must lead to actual policy pages before the site launches. Do not leave dead links or `#` placeholders in production.

---

## 8. Design direction

### 8.1 Design principle

**Pure-black canvas. Clear hierarchy. Product first. Social by design.**

Take structural inspiration from Stripe.dev: a clear navigation system, a strong opening statement, useful content groupings, and content previews that help visitors understand what the product offers. Do not copy Stripe’s logo, assets, typography, colors, or exact layout. Saktus should have its own study-centred visual language.

### 8.2 Page background

- The site canvas must be pure black: `#000000` on every section and at every breakpoint.
- Do not create white, grey, gradient, tinted, or image-based full-width section backgrounds.
- Dark surface tones are permitted for contained UI previews, input controls, and small feature panels, but they must not read as alternate page-background bands.
- Use thin grey borders and contrast to separate modules; do not depend on shadows or glow.
- No gradients, glassmorphism, blur layers, neon glow, decorative blobs, or stock-photo hero.

### 8.3 Color tokens

| Token | Value | Use |
|---|---|---|
| `color.canvas` | `#000000` | Entire public page background |
| `color.surface` | `#080808` | Restrained inner UI panels / preview surfaces |
| `color.surface-raised` | `#101010` | Focused UI panel or dropdown, not section bands |
| `color.text-primary` | `#FFFFFF` | Headings, important UI text |
| `color.text-secondary` | `#B3B3B3` | Body copy and secondary labels |
| `color.text-muted` | `#808080` | Supporting metadata; check contrast before use |
| `color.border` | `#292929` | Dividers, card borders, controls |
| `color.border-strong` | `#454545` | Hover/focus or active borders |
| `color.action` | `#FFFFFF` | Primary button fill / key action where appropriate |
| `color.action-text` | `#000000` | Text on white action button |
| `color.link` | `#FFFFFF` | Inline links with underline or visible interaction cue |
| `color.focus` | `#FFFFFF` | Visible keyboard focus ring |

No accent color is required for the first release. Do not add color just to make the page feel more lively. If a semantic success/error color is necessary inside real product UI, keep it restrained and do not use color as the only signal.

### 8.4 Typography

**Recommended family:** Geist Sans for all headings, body text, navigation, controls, and standard UI.  
**Monospaced family:** Geist Mono for timer digits, study-time values, compact technical labels, and tabular numbers where it improves legibility.  
**Fallbacks:** `Arial, Helvetica, sans-serif` for sans-serif; `ui-monospace, SFMono-Regular, Menlo, monospace` for monospace.

Use locally bundled or properly loaded font files where available. Avoid blocking first render on an external font request. If Geist is already part of the repo’s design system, reuse it rather than adding another font dependency.

| Token | Desktop | Mobile | Weight / line height | Usage |
|---|---:|---:|---|---|
| `type.hero` | 64–76 px | 42–48 px | 600; 0.98–1.08 | Hero headline, with controlled line length |
| `type.h1` | 48–56 px | 36–42 px | 600; 1.05–1.12 | Major section headings |
| `type.h2` | 32–40 px | 28–34 px | 600; 1.1–1.2 | Feature / section titles |
| `type.h3` | 20–24 px | 20–22 px | 550–600; 1.25 | Feature titles |
| `type.body-lg` | 18–20 px | 17–18 px | 400; 1.55–1.7 | Hero and section lead |
| `type.body` | 16–17 px | 16 px | 400; 1.55–1.7 | Standard body copy |
| `type.small` | 13–14 px | 13–14 px | 400–500; 1.45–1.55 | Metadata, eyebrows, helper copy |
| `type.button` | 14–16 px | 14–16 px | 550–600; 1.0 | Actions |
| `type.mono` | 13–16 px | 13–15 px | 450–500; 1.35 | Timer / time statistics |

Do not use display type everywhere. The marketing headlines can be larger and editorial; preview labels and interface labels must remain compact and readable. Keep paragraph measures around 55–70 characters where practical.

### 8.5 Spacing and layout tokens

Use a consistent spacing scale based on 4 px:

`4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 120 px`

Recommended page rules:
- Main content max width: `1160–1240 px`.
- Main horizontal gutter: `32–40 px` desktop, `20–24 px` tablet, `16–20 px` mobile.
- Major section spacing: `104–144 px` desktop, `72–96 px` mobile.
- Hero top spacing: enough for clear separation from header; avoid an enormous empty fold.
- Copy column max width: `620–680 px` for text sections.
- Feature panel radius: `12–16 px`; buttons and fields: `8–10 px`.
- Borders: typically `1 px solid #292929`.
- Avoid enclosing every section inside a card. Use cards only where they represent a real product object or useful grouping.

### 8.6 Buttons and links

**Primary button**
- White fill (`#FFFFFF`), black text (`#000000`).
- Clear verb-led label such as “Start studying for free”.
- Minimum target height: `44 px`; recommended desktop height `48 px`.
- Visible hover, active, focus, and disabled states.

**Secondary button**
- Transparent black background, subtle border, white text.
- Use for one secondary action only; never give all links button styling.

**Text links**
- White text with underline or a clear underline-on-hover affordance.
- Do not use low-contrast grey for critical navigation or action links.

Avoid pill overload, glowing CTA buttons, gradient outlines, multiple primary CTAs in the same view, and bounce animations.

### 8.7 Icons and illustration

- Use one consistent line-icon family if icons are needed.
- Use icons to aid recognition, not as decoration for every heading.
- No emoji used as product icons.
- Avoid generic student stock photos, generic AI illustrations, random 3D objects, or abstract blobs.
- Prefer real interface previews, deliberate product UI compositions, and subtle rules/grid lines.

### 8.8 Motion

- Keep motion subtle and functional: hover/focus transitions, menu open/close, and restrained entrance motion only if it does not delay understanding.
- Do not animate a timer in a way that distracts from content or consumes resources while off-screen.
- Respect `prefers-reduced-motion` and provide a fully usable static experience.
- No scroll-jacking, parallax-heavy scenes, auto-rotating carousels, or movement required to read the page.

---

## 9. Landing page versus application design

The site and app should share tokens and identity, but they serve different purposes.

| Area | Marketing landing page | Study application |
|---|---|---|
| Primary job | Explain the value and drive sign-up | Help students complete actual study tasks |
| Typography | Larger editorial headline hierarchy | Smaller, information-dense, consistent UI scale |
| Layout | Wide content sections and product demonstrations | Task-focused workspace, predictable navigation, compact content |
| Social design | Explain studying with friends and sharing | Make friend connections, sharing settings, and activity understandable |
| Surfaces | Limited framed UI previews | Clear surfaces for decks, sessions, schedules, and social controls |
| Motion | Minimal, may add restrained page polish | Functional feedback only; avoid distraction during study |
| Tone | Persuasive but direct | Neutral, useful, calm |
| Gamification | Explain friendly comparison without overdoing it | No guilt, punitive streaks, noisy badges, or shame-based ranking |

The app must not feel like a playful consumer social network. Treat shared study time as contextual data, flashcard sharing as a clear study workflow, and friend activity as a quiet support mechanism. Never make leaderboards the main destination of the app.

---

## 10. Responsive behavior

### 10.1 Breakpoints

Use existing project breakpoints if the repo already defines them. Otherwise use a consistent baseline near:
- Mobile: under `640 px`.
- Tablet: `640–1023 px`.
- Desktop: `1024 px` and above.

### 10.2 Desktop

- Use a full-width black canvas with a centred content grid.
- Hero can use two columns: copy on one side and product UI preview on the other.
- Social features should have enough width for product details without turning into a dense dashboard screenshot.
- Keep the CTA visible without forcing the visitor to scroll.

### 10.3 Tablet

- Reduce hero headline size and content gutters.
- Allow product preview to sit under or beside the hero copy based on actual width.
- Collapse three-tool layouts from three columns to two and then one where necessary.
- Prevent statistic/feature panels from shrinking below comfortable reading width.

### 10.4 Mobile

- Single-column order: heading, supporting copy, primary CTA, secondary CTA, then visual preview.
- The primary action should be obvious without horizontal scrolling.
- Move nav links into a keyboard-accessible menu; preserve a clearly labelled primary CTA.
- Stack the social story and tool previews vertically.
- Use at least `16 px` body copy and controls with approximately `44 × 44 px` minimum touch targets.
- Product preview must scale or simplify rather than overflow or become illegible. It is acceptable to show a deliberate cropped/stacked composition, but not a desktop image shrunk to unreadable size.
- Prevent horizontal page overflow at common viewport widths.

---

## 11. Product UI previews

The previews are a core explanation device, not decoration. They must look like a coherent, functional product rather than generic dashboard cards.

### 11.1 Main hero preview

Recommended composition:
- A compact daily schedule panel.
- An active focus-session panel with a large legible timer.
- A flashcard preview with a question and a clear “Reveal answer” affordance if that action is shown as interactive.
- A friend activity panel showing study time over a defined period.

Use either real screenshots or design mockups built with the actual design tokens. Do not use fabricated platform usage figures, user counts, or testimonials. For invented example profiles or numbers in a design-only mockup, ensure they are clearly illustrative and not presented as actual Saktus activity.

### 11.2 Social feature preview

Demonstrate the simple mental model:
1. A friend or group context is clearly named.
2. Shared flashcards show who shared the deck and what subject it covers.
3. Study-time comparison identifies the period and visibility scope.
4. There is a clear cue that visibility depends on sharing settings.

Avoid “live now” indicators or real-time presence claims unless the system actually supports them.

### 11.3 Product correctness

- Use the same type scale, borders, buttons, and surface tones as the real product.
- Label non-interactive previews as previews; do not create dead controls that appear usable.
- If mockup controls are not functional, do not style them as an interactive demo.
- Do not put fake grades, fake streak warnings, fabricated follower counts, or false friend totals in the preview.

---

## 12. Interaction requirements

- Primary CTAs link to the real account creation / onboarding flow.
- “See how it works” scrolls to the correct section and does not change routes unnecessarily.
- Navigation anchors move to the correct section and account for a sticky header if used.
- Mobile menu opens and closes reliably and closes after navigation.
- FAQ items use accessible disclosure controls. They must work by keyboard and communicate expanded/collapsed state.
- Hover effects must have equivalent focus states.
- Links use valid destinations. No empty links, `href="#"` placeholders, or unimplemented buttons in production.
- If a CTA requires sign-in and then returns users to their intended route, preserve that behavior only if the existing application supports it.
- The page must remain useful if JavaScript-enhanced animation or decorative preview behavior fails.

---

## 13. Accessibility requirements

Target WCAG 2.2 AA practices where applicable.

- Maintain at least 4.5:1 contrast for standard text, and 3:1 for large text and meaningful UI components where WCAG allows.
- Pure black and white provide strong contrast, but all muted text and border-only controls still require contrast review.
- Use one clear H1 and a logical heading hierarchy.
- Use semantic header, nav, main, section, and footer elements.
- Provide meaningful alt text for informative product screenshots; mark purely decorative visuals as decorative.
- Ensure keyboard access to navigation, menus, FAQ, and all interactive elements.
- Provide visible focus outlines that are not obscured by sticky elements.
- Do not convey social visibility, selected state, or error solely through color.
- Support browser zoom and reflow without loss of content or functionality.
- Honour `prefers-reduced-motion`.
- Provide sufficient target size and spacing for touch input.

---

## 14. SEO, metadata, and link previews

**Suggested page title:** `Saktus — Study Better, Together`  
**Suggested meta description:** `Plan your study day, practise with flashcards, focus with a timer, and study alongside friends. Saktus is a free study platform made by a student, for students.`

Requirements:
- Set a unique page title and meta description.
- Add canonical URL only once the production domain is confirmed.
- Add Open Graph and social sharing metadata with a Saktus-branded preview using the black visual identity.
- Ensure the share image has readable contrast and does not depend on small text.
- Add an appropriate favicon using the approved Saktus icon assets.
- Use descriptive link text and semantic HTML.
- Do not add structured data claiming reviews, aggregate ratings, schools, or user counts that are not real.
- Ensure the former name FlowState Productivity is referenced only where it helps explain the rename; Saktus is the primary brand.

---

## 15. Analytics and measurement

Use the existing analytics system if one is already configured. Do not introduce a large tracking dependency solely for the landing page. Follow the product’s consent and privacy requirements.

Recommended events:

| Event | Trigger | Purpose |
|---|---|---|
| `landing_view` | Landing page viewed | Baseline traffic |
| `landing_primary_cta_click` | Any primary CTA clicked | Measure signup intent |
| `landing_secondary_cta_click` | “See how it works” clicked | Measure content exploration |
| `landing_nav_click` | Navigation anchor clicked | Understand page navigation |
| `landing_social_section_view` | Social-study section enters viewport, using a lightweight existing mechanism | Measure visibility of the differentiator |
| `landing_faq_open` | FAQ disclosure opened | Identify unanswered questions |
| `landing_signup_complete` | Confirmed by the actual sign-up flow, not inferred from CTA click | Measure conversion |

Do not capture the contents of personal flashcards, friend names, study schedules, private study activity, or other sensitive user data in marketing analytics events.

### Success measures

Primary:
- Landing visitor to completed account creation rate.

Secondary:
- Primary CTA click-through rate.
- Sign-up completion after CTA click.
- Percentage of visitors who reach the social-study section.
- Mobile layout and CTA engagement compared with desktop.

Do not invent initial targets. Establish a baseline after launch and set targets based on observed traffic and conversion.

---

## 16. Performance and implementation requirements

- Inspect and reuse the current Saktus repository, routes, brand assets, fonts, and shared components before creating new ones.
- Keep this scope focused on the public marketing page; do not rebuild the authenticated app or introduce a second sign-up system.
- Do not change application architecture or framework just to reproduce the design reference.
- Avoid unnecessarily large animation or image libraries.
- Use responsive image assets and avoid shipping multiple full-size screenshots when one carefully composed preview is sufficient.
- Reserve layout space for product previews to prevent avoidable layout shift.
- Lazy-load below-the-fold media where appropriate, without lazy-loading the primary content needed for the first impression.
- Use the existing routing, form, auth, analytics, and deployment patterns if they are present.
- Keep components reusable where it reduces duplication, but do not abstract every text block into a configurable page builder.
- Respect the black canvas and design tokens in both light and dark operating-system preferences. The marketing page has no light-mode variant.
- Confirm the final production links and favicon assets instead of shipping placeholders.

### Reference-site principle

Stripe.dev currently uses clear global navigation and a browsable, categorised presentation of developer content. For Saktus, take the principle of clear information architecture and well-organised product information, not Stripe’s business-oriented content, brand, colors, or visuals. Reference: [Stripe.dev](https://stripe.dev/).

---

## 17. Content governance and privacy claims

The social-study story introduces trust obligations that do not exist on a basic timer website.

- State who can see study time only after the application visibility model is implemented and tested.
- If sharing is private by default, say so only after verifying the actual default.
- Do not suggest friends can view one another’s full schedules unless that is explicitly supported and intended.
- Clearly distinguish a shared flashcard deck from a user’s private deck.
- Do not imply a study-time ranking represents intelligence, effort quality, or likely grades.
- Keep public copy consistent with actual deletion, access, and sharing behavior.
- Privacy and Terms links must resolve to approved documents before launch.

---

## 18. Acceptance criteria

The landing page is complete only when all applicable criteria below are met.

### Content and positioning
- [ ] The first viewport explains Saktus as a social study platform, not only a personal productivity tool.
- [ ] The headline “Study better, together.” or an approved equivalent is the primary H1.
- [ ] The hero mentions planning, flashcards, focused sessions, and studying alongside friends.
- [ ] Shared flashcards and study-time comparison are each explained in the page body.
- [ ] The free model is clear, with no pricing tiers, paid-plan tease, or trial language.
- [ ] “Made by a student, for students” is present but does not dominate the product story.
- [ ] Mobile app is described as coming soon and has no fake store badges.
- [ ] No unsupported testimonials, adoption figures, outcome promises, or unshipped capabilities are stated as live.

### Design
- [ ] Every full-width section retains a pure black (`#000000`) canvas.
- [ ] No gradients, glassmorphism, glowing decoration, stock-photo hero, or unrelated 3D illustrations.
- [ ] Typography and spacing use documented tokens.
- [ ] The landing page feels editorial; the app UI preview remains restrained and credible.
- [ ] Social UI is friendly and serious rather than game-like or shame-driven.
- [ ] Product previews are consistent with the real or intended Saktus UI.

### Functionality
- [ ] Primary CTA points to the actual sign-up/onboarding route.
- [ ] Sign in is shown only if there is a working destination.
- [ ] Secondary CTA and navigation anchors work.
- [ ] Mobile navigation is usable with keyboard and touch.
- [ ] FAQ disclosures work and expose their state accessibly.
- [ ] There are no dead buttons or placeholder links.
- [ ] All page sections reflow without horizontal overflow at mobile widths.

### Quality
- [ ] Standard text contrast meets WCAG AA where applicable.
- [ ] Focus states are visible and motion respects reduced-motion preferences.
- [ ] Metadata, favicon, and social share preview are configured.
- [ ] The actual product capabilities and social privacy claims have been verified against the running app.
- [ ] Analytics uses the existing privacy-conscious implementation, where available.
- [ ] Page has been checked on current desktop and mobile browser sizes.

---

## 19. Recommended implementation sequence

1. **Audit the existing Saktus project.** Identify routes, auth/onboarding, sign-in, existing design tokens, fonts, logo/favicon, app feature status, and analytics before changing anything.
2. **Confirm feature truth.** Specifically verify whether friend connections, deck sharing, and study-time comparison already work. Use the publishing rules in Section 4 to adjust copy accurately.
3. **Build the page skeleton.** Header, hero, social section, tool section, how-it-works, free promise, about, mobile, FAQ, and footer.
4. **Build coherent UI previews.** Prioritise the hero workspace and friend study-time/share experience. Reuse real application components or tokens where feasible.
5. **Apply responsive and accessibility rules.** Check keyboard navigation, focus, contrast, mobile menu, FAQ, reflow, and reduced motion.
6. **Wire existing destinations and analytics.** Do not create parallel auth flows or new tracking infrastructure without need.
7. **Run acceptance checks.** Validate copy against actual features, test every link, and review the mobile design before release.

---

## 20. Final direction

Saktus should not present itself as three productivity widgets placed beside one another. Its stronger identity is a **social study system**: organise the work, practise the material, focus on a session, share resources, and see friends putting in time too.

The landing page’s visual character should come from typography, pacing, strong black-and-white contrast, and carefully composed product UI — not gradients or decorative effects. The app should carry that same identity into a more restrained workspace where the student’s task, not the interface, remains the focus.

**Final primary message:** Study better, together.  
**Final primary CTA:** Start studying for free.
