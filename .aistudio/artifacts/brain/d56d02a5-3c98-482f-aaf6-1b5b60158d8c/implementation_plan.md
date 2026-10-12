# Platform-Scoped Bout Assignment & Mat Official Score Isolation

A complete workflow empowering Tournament Admins to assign individual bouts or entire categories to competition platforms (e.g., Platform A, Platform B), strictly scoping Mat Officials and Side Scorers to their assigned platform, and securely displaying submitted side judges' scores exclusively to that platform's Mat Official on their live scoring console.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architecture incorporates your confirmed requirements from the planning interview:
> - **Platform Bout Assignment**: Tournament Admins can assign individual bouts or batch-assign entire division categories to specific platforms directly from the fixture brackets.
> - **Mat Official Score Visibility**: Submitted side scores appear in a real-time judge comparison card directly on the platform Mat Official's live scoring console.
> - **Official Platform Assignment**: Strictly one active platform per official at a time, enforced across both Mat Officials and Sideline Scorers.
> - **Strict Privacy & Isolation**: Officials and side scorers on Platform A cannot see or score bouts from Platform B, and submitted side scorecards are hidden from public view and cross-platform officials.

---

## 1. Overview & Core Concept

In martial arts tournaments (such as IWUF Wushu Sanda championships), matches run concurrently across elevated Leitai platforms (e.g., Platform A and Platform B). Each platform is governed by:
- A dedicated **Mat Official / Table Jury** who controls the clock, records fouls, and finalizes round decisions.
- Multiple **Sideline Judges (Side Scorers)** positioned around the platform perimeter who independently record punches, kicks, takedowns, and platform exits.

This feature introduces strict platform boundaries:
1. **Admin Assignment**: Admins allocate bouts or entire division trees to platforms.
2. **Mat Official Scoping**: Mat Officials log into their station and see *only* the fights assigned to their platform.
3. **Side Scorer Scoping**: Side scorers see *only* their platform's active fight and input their individual round scores.
4. **Isolated Consensus**: Once side scorers submit their cards, the platform Mat Official receives a live, aggregated scorecard comparison on their console to verify consensus before certifying the bout outcome.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. TOURNAMENT ADMIN                             │
│   • Views Bracket Tree or Division Fixture List                        │
│   • Uses "Assign Platform" dropdown to set entire category to Plat A   │
│   • Or clicks specific Bout to route to Plat B                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Persists to Supabase
                                    ▼
       ┌────────────────────────────┴───────────────────────────┐
       │                                                        │
       ▼                                                        ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  2. PLATFORM A MAT OFFICIAL  │        │  3. PLATFORM A SIDE SCORERS  │
│  • Role: Mat Official        │        │  • Role: Sideline Judge      │
│  • Assigned: Platform A      │        │  • Assigned: Platform A      │
│  • Bouts Queue: Plat A ONLY  │        │  • Bouts Queue: Plat A ONLY  │
│  • Locked out of Plat B      │        │  • Locked out of Plat B      │
└──────────────┬───────────────┘        └──────────────┬───────────────┘
               │                                       │
               │    4. LIVE SCORE CARD SUBMISSION      │ Scores saved to DB
               │◄──────────────────────────────────────┴────────────────
               │
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│               5. MAT CONSOLE JUDGE COMPARISON DISPLAY                  │
│   • Live comparison table embedded in Mat Official console             │
│   • Displays Judge 1, Judge 2, Judge 3 scores for Round 1, 2, 3       │
│   • Shows Red/Blue consensus flags                                     │
│   • Hidden from spectators, public arena, and Platform B officials     │
└────────────────────────────────────────────────────────────────────────┘
```

### Visual Interface & Layout Discipline
- **Mat Official Queue**: High-contrast, clean banner indicating the active platform (`Platform A (Leitai 1)`). Fights for other platforms are completely filtered out.
- **Side Scorecard Comparison Grid**:
  - Rendered directly underneath the Mat Official's round timer and point scoreboard.
  - Tabular layout with columns for `Judge Name`, `Corner Preference`, `Red Pts`, `Blue Pts`, `Exits`, and `Submission Status`.
  - Color-coded corner indicators (`#DC2626` for Red, `#2563EB` for Blue) paired with clear textual labels.
  - Monospace tabular numerals (`font-mono tabular-nums`) for jitter-free score updates.
- **Unassigned Guard Screen**: If an official logs in without an assigned platform, a clean notice explains that an admin platform assignment is required before scoring begins.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Batch Category Assignment vs. Individual Bout Routing
- **Chosen Approach**: Provide both. An admin can assign an entire bracket to Platform A with one click, while retaining the ability to adjust individual bouts via the fixture editor.
- **Why**: Divisions usually stay on one platform for tournament flow, but semifinal/final bouts occasionally need to be moved to a featured platform.
- **Trade-Off**: Bracket data structures must synchronize `bout.ring` cleanly across both category-level and bout-level updates.

### Decision 2: Real-Time Mat Official Consensus vs. Post-Match Report
- **Chosen Approach**: Direct live scorecard comparison embedded inside `LiveScoringArena.tsx` on the Mat Official console, updated automatically via Supabase Realtime when side scorers submit their cards.
- **Why**: In Sanda, the mat official must verify side judges' verdicts immediately at the end of each 2-minute round to confirm the round winner.
- **Trade-Off**: Requires subscription listening to `sideline_judge_scores` updates scoped to the active bout.

### Decision 3: Zero Local Cache Enforcement
- **Chosen Approach**: All platform assignments, bout rings, and sideline scorecards reside authoritatively in Supabase PostgreSQL and ephemeral React state.
- **Why**: Prevents stale platform assignments or score leaks across browser sessions or reloads.

---

## 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                               Supabase Cloud                                  │
│   • brackets (rounds -> bouts with bout.ring = "Platform A")                 │
│   • tournament_users (user.assignedRing = "Platform A")                      │
│   • sideline_judge_scores (event_id, bout_id, arena, judge_id, is_submitted)  │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ Realtime & Scoped Fetch
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          TournamentContext State                             │
│   • activeEvent.rings: ['Platform A', 'Platform B']                          │
│   • currentUser: { role: 'official', assignedRing: 'Platform A' }            │
│   • brackets: Bracket[]                                                      │
│   • sidelineJudgeScores: SidelineJudgeScore[]                                │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴───────────────────────────┐
            ▼                                                      ▼
┌─────────────────────────────────────────┐    ┌────────────────────────────────────────┐
│          BracketViewer.tsx              │    │          LiveScoringArena.tsx          │
│ • Category Platform Batch Assign        │    │ • Filters allBouts by assignedRing     │
│ • Individual Bout Platform Selector     │    │ • Restricts scoring to Plat A          │
│ • Platform Filter for Tournament Admin  │    │ • Embeds "Side Judges Live Comparison" │
└─────────────────────────────────────────┘    └────────────────────────────────────────┘
                                                                   │
                                                                   ▼
                                               ┌────────────────────────────────────────┐
                                               │      SideScorersComparisonCard         │
                                               │ • Renders J1, J2, J3 submitted cards   │
                                               │ • Shows round-by-round consensus       │
                                               │ • Visible ONLY to assigned Mat Official│
                                               └────────────────────────────────────────┘
```

### Component & Data Enhancements

1. **`TournamentContext.tsx`**:
   - Add helper `assignCategoryToPlatform(categoryId: string, platformName: string)` to update all bouts in that bracket in state and Supabase.
   - Add helper `assignBoutToPlatform(bracketId: string, boutId: string, platformName: string)` for granular routing.
   - Ensure `getJudgeScoresForBout(boutId)` filters securely and returns submitted scorecards.

2. **`BracketViewer.tsx`**:
   - Add a quick "Assign Category Platform" control in the category toolbar for Admins / Super Admins.
   - Display each bout's assigned platform clearly with quick-change options in edit mode.

3. **`LiveScoringArena.tsx`**:
   - Filter `allBouts` strictly by `currentUser.assignedRing` (using `isArenaMatch`) when `role === 'official'`.
   - Prevent mat officials from viewing or controlling bouts from unassigned platforms.
   - Add an integrated **Live Judges Consensus & Scorecards** section right inside the mat official view for the active bout.

4. **`SidelineJudgeScoringPanel.tsx`**:
   - Maintain strict isolation so side scorers only see and score bouts matching their `currentUser.assignedRing`.
   - Ensure score card submission persists with `isSubmitted = true`, `arena = assignedRing`, and broadcasts in real time.
