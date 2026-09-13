# Saktus Focus Timer & Procedural Audio Synthesizer

## 1. Overview & Positioning

In Saktus, the Focus Timer is not relegated to a buried sub-tab. It is an **omnipresent floating mini-player (Dynamic Island)** that persists across all Web routes and Mobile views, ready to be expanded with 1 tap into a fullscreen distraction-free **Zen Mode**.

---

## 2. Delta-Resilient Timing Architecture

Traditional web/mobile timers built on `setInterval(..., 1000)` suffer from catastrophic drift when:
- The mobile device screen locks or goes to sleep.
- The browser tab is backgrounded, throttled, or discarded from RAM.
- The user reloads the application.

### The Solution: Timestamp Delta Tracking
Saktus implements a zero-drift delta engine:

```typescript
// On Timer Start / Resume
const targetEndTime = Date.now() + secondsRemaining * 1000;
localStorage.setItem('saktus_timer_target', targetEndTime.toString());

// On Every Tick or Resume from Sleep
const updateClock = () => {
  const diff = Math.ceil((targetEndTime - Date.now()) / 1000);
  if (diff <= 0) {
    completeSession();
  } else {
    setSecondsRemaining(diff);
  }
};
```

Even if the device sleeps for 2 hours, waking up calculates the true elapsed delta against the system clock immediately without losing a single second.

---

## 3. Web Audio Procedural Synthesizer

To eliminate network latency, storage bloat, and copyright issues with third-party MP3 audio loops, Saktus synthesizes acoustic focus soundscapes entirely **in real time via the Web Audio API**.

### 3.1 Soundscape Presets

1. **Binaural Beats (40Hz Gamma Frequency)**:
   - Uses two stereo oscillators: Left channel at $200\text{ Hz}$, Right channel at $240\text{ Hz}$.
   - Induces cortical phase synchronization associated with high-focus problem solving.
2. **Brown Noise**:
   - Generates Gaussian white noise passed through a deep $6\text{dB/octave}$ low-pass filter with gentle frequency rolloff.
   - Masks environmental distractions (coffee shops, roommates, street noise).
3. **Rain Simulator**:
   - Pink noise processed with randomized bandpass resonant filters modulated by slow LFOs, simulating falling droplets and ambient downpour.
4. **Ambient Harmonic Drone**:
   - Multi-oscillator detuned sawtooth/sine stack running through a warm low-pass filter.

---

## 4. Dual Zen Mode Architecture

When students enter fullscreen focus mode, Saktus provides a **1-tap Dual Zen toggle**:

### 1. White Paper Mode
- **Canvas**: Pure porcelain `#FAFAF9` with deep charcoal typography.
- **Purpose**: Calm, tactile, paper-like minimalism that feels like an open notebook.
- **Controls**: Restrained dark gray pill buttons.

### 2. Obsidian Dark Mode
- **Canvas**: Pure black OLED `#000000` with luminous white tabular typography.
- **Purpose**: Low-energy, darkroom-style focus to eliminate eye strain during late-night study sessions.

---

## 5. Course & Assessment Attribution

Every focus session is attributed directly to an enrolled course (e.g. `CS201`) and optionally linked to a specific upcoming assessment or task. Upon completion, the duration is committed to `study_sessions`, instantly advancing the student's weekly study progress bar in the Academic Cockpit.
