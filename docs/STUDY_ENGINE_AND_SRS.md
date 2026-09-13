# Saktus Spaced Repetition Engine (SuperMemo-2 SM-2)

## 1. Algorithmic Foundation

The Saktus study engine implements an enhanced version of the **SuperMemo-2 (SM-2)** spaced repetition algorithm. The engine lives in `@flowstate/study-engine` (`lib/study-engine/src/index.ts`) and is consumed by both Web and Mobile clients.

---

## 2. Mathematical Specification

Given a card with:
- Current Repetition count: $n \ge 0$
- Ease Factor: $EF \ge 1.3$ (initial default $2.5$)
- Current Interval: $I$ in days
- Quality Rating: $q \in \{0, 1, 2, 3, 4, 5\}$

### 2.1 Ease Factor Calculation
After each review rating $q$, the new Ease Factor $EF'$ is calculated:

$$EF' = EF + (0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02))$$

The minimum allowable Ease Factor is clamped at $1.3$:
$$EF' = \max(1.3, EF')$$

### 2.2 Interval Schedule
If the user passes the card ($q \ge 3$):
- For repetition $n = 0$: $I' = 1$ day
- For repetition $n = 1$: $I' = 6$ days
- For repetition $n \ge 2$: $I' = \text{round}(I \times EF')$
- Increment repetition: $n' = n + 1$

If the user fails the card ($q < 3$):
- Reset repetition: $n' = 0$
- Reset interval: $I' = 1$ day
- Ease factor remains unchanged or adjusted slightly.

### 2.3 Due Date Calculation
The next review timestamp is calculated:
$$\text{next\_review} = \text{now}() + (I' \times 86400 \text{ seconds})$$

---

## 3. UI Rating Mapping (4-Button Model)

To eliminate cognitive friction for university students, the engine maps 4 intuitive review buttons to the 0-5 SM-2 quality scale:

| Button Label | SM-2 Score ($q$) | Keyboard Key | Action |
|---|---|---|---|
| **Again** | `1` | `1` / `Space` | Fails card; restarts repetition cycle to 1 day. |
| **Hard** | `2` | `2` | Difficult recall; small interval increase, reduces EF. |
| **Good** | `4` | `3` | Successful recall; standard interval multiplication by EF. |
| **Easy** | `5` | `4` | Instant recall; bonus interval scaling, increases EF. |

---

## 4. Multi-Question Card Architecture

Saktus supports 3 distinct interactive card formats:

### 1. Standard (Active Recall)
- **Front**: Text prompt / formula.
- **Back**: Explanation / definition.
- **Interaction**: 3D perspective flip (`rotateY(180deg)`).

### 2. True / False
- **Front**: Statement.
- **Back**: Detailed reasoning.
- **Correct Answer**: `'true'` or `'false'`.
- **Interaction**: 1-tap validation button; highlights green on match or coral on incorrect choice, then flips to reveal the explanation.

### 3. Multiple Choice (MCQ)
- **Front**: Question stem.
- **Options**: JSON array of 3-4 options `["Option A", "Option B", "Option C", "Option D"]`.
- **Correct Answer**: String index of the correct option (`"0"`, `"1"`, etc.).
- **Interaction**: Students select an option; incorrect answers turn red, correct answer turns green with celebratory spring pop, followed by explanation.

---

## 5. Retention Health Analytics

The engine computes overall deck mastery into 3 distinct cohorts:
1. **Due Today**: Cards whose `next_review <= NOW()`.
2. **Learning**: Cards in early review stages ($n \le 2$ or $EF < 2.0$).
3. **Mastered**: Cards with consecutive successful reviews ($n \ge 3$ and $I \ge 14$ days).
