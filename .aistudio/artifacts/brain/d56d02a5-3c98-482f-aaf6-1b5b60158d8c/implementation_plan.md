# New Supabase Database Setup & Linking Plan

A complete step-by-step guide and operational workflow to provision a brand-new database on Supabase, execute the tournament schema, configure credentials via the in-app modal, and verify real-time sync.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed based on your preferences:

- **Database Architecture**: Fresh Supabase Cloud PostgreSQL project with public anonymous access policies enabled for real-time referee, scoreboard, and admin scoring.
- **Guidance Level**: Step-by-step instructions starting from creating a new project in the Supabase Dashboard.
- **Credential Storage**: Direct configuration through the in-app **Supabase Settings Modal** (`Connect & Sync` tab) with automated connection testing and health checks.

---

### 1. Overview & Core Concept

When your previous Supabase project was deleted, the app lost its remote PostgreSQL instance and real-time WebSocket channel. The application includes a self-healing in-app management center with complete pre-formatted SQL scripts and fallback resilience.

This guide provides the exact steps to:
1. Spin up a new project in your Supabase account.
2. Retrieve the **Project URL** and **anon public API Key**.
3. Execute the unified database schema in Supabase's SQL Editor (including all tables, indexes, RLS policies, and real-time publication).
4. Connect the tournament app and push your local tournament data to the cloud.

---

### 2. User Experience & Walkthrough Flow

```
┌────────────────────────────────┐       ┌────────────────────────────────┐
│   Step 1: Supabase Dashboard   │       │     Step 2: SQL Editor Run     │
│  - Create New Project          │ ────> │  - Copy unified schema SQL     │
│  - Get URL & anon public key   │       │  - Run script in Supabase      │
└────────────────────────────────┘       └────────────────────────────────┘
                                                          │
                                                          ▼
┌────────────────────────────────┐       ┌────────────────────────────────┐
│      Step 4: Push Data         │       │   Step 3: In-App Connection    │
│  - Click 'Push Data to Cloud'  │ <──── │  - Open Database / Supabase UI │
│  - Verify sync & live scoring  │       │  - Paste URL & anon Key        │
└────────────────────────────────┘       └────────────────────────────────┘
```

#### Step 1: Create the Project on Supabase
1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. Click **"New project"** (select your organization).
3. Fill in the project details:
   - **Name**: e.g., `wushu-tournament-db`
   - **Database Password**: Enter a secure password and save it somewhere safe.
   - **Region**: Choose the region closest to your venue (e.g., `ap-south-1` Mumbai or `ap-southeast-1` Singapore).
   - **Pricing Plan**: Free plan.
4. Click **"Create new project"** and wait ~1-2 minutes for Supabase to provision the database.

#### Step 2: Retrieve API Credentials
1. In your new Supabase project sidebar, go to **Project Settings** (gear icon at the bottom left) -> **API** (under Configuration).
   *(Alternatively, on newer dashboards: Settings -> API Keys / Data API)*.
2. Copy the two values:
   - **Project URL**: Format `https://<your-project-id>.supabase.co`
   - **anon / public key**: The long JWT string labeled `anon` `public`.

#### Step 3: Run the Tournament Database Schema
1. In your Supabase left sidebar, click the **SQL Editor** tab (icon `>_`).
2. Click **"New query"**.
3. Copy the complete schema SQL script:
   - *Option A (In-App)*: In this app, click the **Database / Cloud** icon in the top header, switch to the **"Full SQL Schema"** tab, and click **"Copy Full Schema SQL"**.
   - *Option B (Local File)*: Open the `supabase-schema.sql` file provided in the repository root.
4. Paste the SQL into the Supabase SQL Editor and click **"Run"** (or press `Cmd/Ctrl + Enter`).
5. Confirm the response shows **"Success. No rows returned"**.

> [!NOTE]
> The schema script automatically creates all required tables (`events`, `players`, `categories`, `brackets`, `tournament_users`, `sideline_judge_scores`, `audit_logs`, `age_categories`, `weight_categories`), enables Row Level Security (RLS) with permissive anon policies, configures Realtime publication, and sets full replica identity.

#### Step 4: Connect & Synchronize in the App
1. In the app header, click the **Supabase / Database Settings** button.
2. In the **Connect** tab:
   - Paste your **Project URL**.
   - Paste your **Anon Public Key**.
   - Click **"Test & Save Connection"**.
3. When the green checkmark indicates a healthy connection, switch to the **"Sync Data"** tab.
4. Click **"Push All Data to Supabase"** to upload all local players, categories, brackets, and event settings into your new database.

---

### 3. Key Product Decisions & Trade-Offs

- **Client-Side Direct Supabase Connection**:
  - *Chosen Approach*: Credentials are saved in browser storage (`localStorage`) and can also be baked into environment variables.
  - *Why*: Allows instant recovery, multi-venue portability, and zero-downtime database swapping without restarting servers or rebuilding packages.
- **Permissive RLS with Public Anon Key**:
  - *Chosen Approach*: Unrestricted public policies for tournament operation.
  - *Why*: Allows sideline judges, mat coordinators, scorekeepers, and public displays to read and broadcast scores concurrently without requiring complex per-device auth logins during fast-paced matches.
- **Dynamic Schema Cache Resilience**:
  - *Chosen Approach*: The client automatically detects schema differences, strips unsupported columns on fallback, and reloads PostgREST schema cache on demand.
  - *Why*: Eliminates fatal errors like `Could not find the 'event_id' column of 'players' in the schema cache` even if migrations are partially applied.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Tournament Web App                   │
│                                                        │
│   ┌─────────────────────┐    ┌─────────────────────┐   │
│   │  TournamentContext  │    │  SupabaseSettings   │   │
│   │   (State & Cache)   │    │       (Modal)       │   │
│   └──────────┬──────────┘    └──────────┬──────────┘   │
└──────────────┼──────────────────────────┼──────────────┘
               │                          │
               ▼                          ▼
┌────────────────────────────────────────────────────────┐
│              src/services/supabaseClient.ts             │
│   - executeResilientUpsert()                           │
│   - missingColumnsByTable detection & strip fallback    │
│   - testSupabaseConnection() & latency metrics         │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS REST & Realtime WebSocket
                           ▼
┌────────────────────────────────────────────────────────┐
│             New Supabase PostgreSQL Cloud              │
│  ├── public.events                                     │
│  ├── public.players (with event_id & status)           │
│  ├── public.categories & public.brackets               │
│  ├── public.tournament_users & sideline_judge_scores   │
│  └── supabase_realtime publication (FULL REPLICA)      │
└────────────────────────────────────────────────────────┘
```

#### Database Schema Components Included
1. **Tables**:
   - `events`: Tournament configurations, active ring counts, and reference dates.
   - `players`: Roster records including registration numbers, clubs, weighing status, and event scopes.
   - `categories`: Divisions (gender, age group, weight group).
   - `brackets`: Single/double elimination trees, match nodes, scores, and round winners.
   - `tournament_users`: Referees, judges, mat coordinators, and admins.
   - `sideline_judge_scores`: Real-time round scoring from ring corners.
   - `audit_logs`: Activity and score amendment tracking.
   - `age_categories` & `weight_categories`: Master rules and standards.
2. **Security & Policies**:
   - Explicit `CREATE POLICY ... FOR ALL USING (true) WITH CHECK (true)` on all tables.
3. **Realtime**:
   - Added to `supabase_realtime` publication for instant sub-second score synchronizations.

---

### 5. Implementation Status: Connected & Verified Live

- [x] Schema script verified with all table columns (`event_id` on `players`, `brackets`, `categories`, and `sideline_judge_scores`) and permissive RLS policies.
- [x] Purged legacy default URL pointing to the deleted Supabase project.
- [x] Applied new Supabase project credentials (`https://qbxlyaynqshlgzaqyriv.supabase.co` & Anon Public Key) directly to `.env` and `supabaseClient.ts`.
- [x] Tested live database connectivity: PostgREST status 200, all 9 tables verified, player write & delete roundtrip confirmed.
- [x] Dev server restarted with active configuration loaded. The app is live and connected to your new Supabase database!
