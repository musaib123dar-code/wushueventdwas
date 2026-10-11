# Pure Online Cloud Architecture with Event-Scoped Tournament Isolation

Transition the Wushu Tournament EMS to an online-authoritative cloud system backed by Supabase PostgreSQL, completely removing persistent browser cache dependencies and strictly partitioning all athletes, divisions, brackets, and bout scorecards by tournament event ID.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural parameters were confirmed during the planning interview and serve as the binding blueprint for this implementation:

- **Confirmed Decision 1 (Data Isolation)**: Filter and partition all cloud records strictly by tournament `event_id` across PostgreSQL tables. Each tournament maintains its own independent roster of fighters, weight categories, and fixture trees without crossover.
- **Confirmed Decision 2 (Cloud Backend)**: Supabase PostgreSQL serves as the authoritative remote database, utilizing realtime replication channels for cross-device updates.
- **Confirmed Decision 3 (Zero Persistent Cache)**: Eliminate `localStorage` persistence for tournament entities (`players`, `categories`, `brackets`, `scores`). React state acts solely as a live in-memory presentation buffer fed directly from Supabase queries and realtime subscriptions.

---

### 1. Overview & Core Concept

- **What It Does**: Transforms the platform into a true online multi-tenant tournament management system. Administrators and mat officials can create multiple championship events (e.g., "State Championship 2026", "National Sanda Cup"), switch between them effortlessly, and have all athletes, category divisions, knockout brackets, and sideline scorecards isolated strictly to the active event in the cloud.
- **Target Audience / Persona**: Tournament directors, chief arbiters, and mat officials managing concurrent or sequential martial arts championships across multiple arenas and rings.
- **Key Value**: Guarantees zero stale local cache corruption, ensures seamless cross-device synchronization between officials and public screens, and prevents athlete registrations from bleeding across different tournaments.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Championship Switching**:
   - The user selects a tournament from the header or master panel dropdown.
   - The application immediately clears the in-memory event state, displays a clean loading state, and fetches the selected event's specific athletes, divisions, and brackets from Supabase (`WHERE event_id = :active_event_id`).
   - The realtime channel resubscribes to filter events for that specific tournament.
2. **Creating a New Championship Event**:
   - The administrator clicks "Initialize New Event Scope" in the Master Admin Panel.
   - Supabase inserts a new row into `events` with a unique ID.
   - The app transitions to this fresh tournament scope with an empty athlete registry and fixture board, ready for new registrations without touching prior tournament data.
3. **Pure Cloud Live State**:
   - All athlete registrations, weigh-ins, division confirmations, and point scoring commit directly to Supabase via instant upserts.
   - Any browser reload fetches directly from the cloud; no stale `localStorage` cache is retained.

#### Visual Identity & Theme
- **Aesthetic Direction**: High-contrast, utilitarian martial arts tournament dashboard with dark aesthetic (`bg-slate-950`), subtle borders (`border-slate-800`), and warm amber combat accents (`text-amber-400`, `bg-amber-500`).
- **Zero-Pill Metadata Discipline**: Informational metadata (athlete weight, category limits, timestamps, record counts) rendered as unboxed inline typography with subtle separators (`·`), avoiding generic candy pill badges.
- **Realtime Cloud Status Indicator**: A live status indicator in the top header showing connection health (e.g., `● Supabase Live · Event: State Cup 2026`) with latency telemetry.
- **Interactive Loading & Empty States**: Clean skeleton rows and clear empty state cards indicating that data is loaded directly from the online cloud database.

---

### 3. Key Product Decisions & Trade-Offs

#### Decision 1: Eliminating Persistent Local Browser Storage
- **Chosen Approach**: Completely deactivate `localStorage.setItem` for `players`, `categories`, `brackets`, `sideline_judge_scores`, and `events`. Only transient authentication session identifiers and cloud connection URLs are retained.
- **Why**: Directly addresses the user's requirement ("do not want anything to be on cache, want everything online"). Eliminates sync conflicts, browser storage quota limits, and phantom overwrites.
- **Trade-off**: Requires an active internet connection to load tournament records; clear offline/reconnecting indicators will inform users if connection drops.

#### Decision 2: Multi-Tournament Partitioning via `event_id` Foreign Keys
- **Chosen Approach**: Add `eventId` (`event_id`) to all database entities:
  - `players` (`event_id TEXT NOT NULL`)
  - `categories` (`event_id TEXT NOT NULL`)
  - `brackets` (`event_id TEXT NOT NULL`)
  - `sideline_judge_scores` (`event_id TEXT NOT NULL`)
- **Why**: Ensures complete relational integrity in PostgreSQL while enabling simple query filters (`.eq('event_id', activeEventId)`) and database-level cascades.

#### Decision 3: Event-Scoped Realtime WebSocket Channels
- **Chosen Approach**: Subscribe Supabase Realtime with row-level filters (`event_id=eq.${activeEventId}`) so devices scoring Arena 1 on Event A do not process broadcasts from Event B.
- **Why**: Minimizes client-side CPU overhead and network payload while ensuring multi-mat concurrency.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interface & Roles                          │
│  [Overview Dashboard]  [Player Registry]  [Categories]  [Knockout Brackets]  │
│  [Official Leitai Scoring]  [Sideline Judge Console]  [Public Arena View] │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Live React State (In-Memory Only)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     TournamentContext (State Controller)               │
│  • Active Event Context: { id: "event-2026-01", name: "State Cup" }    │
│  • Pure In-Memory Stores: players[], categories[], brackets[], scores[] │
│  • NO localStorage persistence for tournament data                     │
└───────────────────▲────────────────────────────────┬───────────────────┘
                    │ Realtime Updates               │ Direct Mutations
                    │ (Filtered by event_id)         │ (Tagged with event_id)
                    │                                ▼
┌───────────────────┴────────────────────────────────────────────────────┐
│                    Supabase Client & Service Layer                     │
│  • pullTournamentData(eventId) -> queries scoped by event_id           │
│  • upsertPlayer/Bracket/Category(record with event_id)                 │
│  • subscribeToTournamentRealtime(eventId, callback)                    │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ HTTPS REST + WebSockets
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Supabase Cloud PostgreSQL Database                   │
│                                                                        │
│   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐         │
│   │     events     │──<│    players     │   │   categories   │         │
│   │ id (PK)        │   │ id (PK)        │   │ id (PK)        │         │
│   │ name, venue... │   │ event_id (FK)  │   │ event_id (FK)  │         │
│   └───────┬────────┘   └────────────────┘   └───────┬────────┘         │
│           │                                         │                  │
│           │            ┌────────────────┐           │                  │
│           ├───────────<│ sideline_judge │           │                  │
│           │            │ id (PK)        │           │                  │
│           │            │ event_id (FK)  │           │                  │
│           │            └────────────────┘           │                  │
│           │                                         │                  │
│           │            ┌────────────────┐           │                  │
│           └───────────<│    brackets    │>──────────┘                  │
│                        │ id (PK)        │                              │
│                        │ event_id (FK)  │                              │
│                        │ category_id    │                              │
│                        └────────────────┘                              │
└────────────────────────────────────────────────────────────────────────┘
```

#### Detailed State & Query Mapping

1. **Entity Schema Alignment**:
   - `Player`: Add `eventId: string` to TypeScript model and `event_id TEXT` to `players` table in SQL schema.
   - `Category`: Enforce non-null `event_id` in SQL schema and mappers.
   - `Bracket`: Enforce non-null `event_id` in SQL schema and mappers.
   - `SidelineJudgeScore`: Retain `event_id` enforcement.

2. **Scoped Cloud Methods (`src/services/supabaseClient.ts`)**:
   - `pullTournamentData(eventId: string)`:
     ```ts
     const [players, categories, brackets, scores] = await Promise.all([
       client.from('players').select('*').eq('event_id', eventId),
       client.from('categories').select('*').eq('event_id', eventId),
       client.from('brackets').select('*').eq('event_id', eventId),
       client.from('sideline_judge_scores').select('*').eq('event_id', eventId),
     ]);
     ```
   - `subscribeToSupabaseTournament(eventId: string, onChange)`:
     Channel subscriptions configured with `filter: event_id=eq.${eventId}`.

3. **Tournament Lifecycle Operations**:
   - `createOfficialEvent(eventData)`: Writes new event to Supabase, switches active `eventId`, and sets in-memory arrays to `[]` online.
   - `switchEvent(eventId)`: Sets active event, triggers instant `pullTournamentData(eventId)`, and re-binds WebSocket listener.
   - `clearTournamentScope(eventId)`: Deletes only rows where `event_id = eventId` in Supabase, completely preserving all other championships.
