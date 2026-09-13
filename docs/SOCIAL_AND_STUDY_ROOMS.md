# Saktus Social Layer & Synchronized Study Rooms

## 1. Overview & Positioning

Saktus avoids generic social media feed bloat. The social architecture is strictly geared toward **accountability and synchronized co-working**. It answers two questions:
1. *Who is studying right now?*
2. *Can we jump into a synchronized focus block together?*

---

## 2. Follow Graph & Derived Mutual Friends

Unlike legacy two-way "friend requests" that add database overhead and awkward pending states, Saktus implements an asynchronous **one-way follow model**:

- **Table**: `follows (follower_id, followee_id, created_at)`
- **Mutual Friend Definition**:
  $$\text{Mutual}(A, B) \iff (A \to B \in \text{follows}) \land (B \to A \in \text{follows})$$
- Only mutual friends or shared squad members have access to view private study rooms and receive study pings.

---

## 3. Synchronized Study Rooms Architecture

A study room allows 2 to 20 students to work simultaneously with synchronized focus blocks, break intervals, and live presence.

### 3.1 Realtime Protocol: Broadcast & Presence (Not Database Polling)

```
Host Client                     Supabase Realtime                    Member Client
    │                                  │                                   │
    ├───── Broadcast: 'start' ────────►│────── Broadcast: 'start' ────────►│
    │      payload: { resumed_at }     │       payload: { resumed_at }     │ (Both sync clocks)
    │                                  │                                   │
    ├───── Broadcast: 'pause' ────────►│────── Broadcast: 'pause' ────────►│
    │      payload: { elapsed }        │       payload: { elapsed }        │ (Both freeze clocks)
    │                                  │                                   │
    ├───── Presence: Track User ──────►│────── Presence: Avatar State ────►│
    │                                  │                                   │
```

- **Supabase Realtime Broadcast**: Used for instantaneous playback events (`start`, `pause`, `resume`, `break`, `complete`). Latency is sub-50ms worldwide, ensuring countdown clocks remain in sync down to the second.
- **Supabase Realtime Presence**: Used for the live participant avatar stack and active course status.
- **Why not `postgres_changes`?** Database change streams incur round-trip database write overhead and disk I/O, resulting in 300-800ms latency, which feels sluggish for a shared countdown timer.

---

## 4. Pause & Delta Synchronization

Study rooms do not store a static `ends_at` timestamp because pauses invalidate static end times. Instead, rooms track:
- `duration_seconds` (e.g. 1500 for 25 mins)
- `elapsed_seconds_at_pause` (cumulative elapsed seconds prior to current run)
- `last_resumed_at` (timestamp when current run started)
- `status` (`active` | `paused` | `completed`)

### Calculation of Remaining Seconds:
- If `status == 'active'`:
  $$\text{remaining} = \text{duration\_seconds} - \text{elapsed\_seconds\_at\_pause} - (\text{now}() - \text{last\_resumed\_at})$$
- If `status == 'paused'`:
  $$\text{remaining} = \text{duration\_seconds} - \text{elapsed\_seconds\_at\_pause}$$

---

## 5. Haptic Cheers & Accountability

During active study sessions, members can send lightweight, zero-chat **Cheers**:
- Pure SVG Lucide icons: `Zap`, `Flame`, `Coffee`, `ThumbsUp`.
- Broadcast via the room's Realtime channel to float an animated reaction badge across everyone's screen with a subtle tactile haptic vibration.
- Zero textual chat reduces distraction, preserving the deep work environment.
