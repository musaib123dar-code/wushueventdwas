# Wushu Sanda Tournament Arena & Championship Management

An official, full-featured championship management software application designed for Wushu Sanda state and national tournaments. Supports athlete registration with duplicate Aadhar/ID prevention, age/weight category division generation, single-elimination knockout bracket trees with automatic BYE assignment, multi-platform Leitai live scoring, sideline judge cards, and medal standings.

---

## Data Storage Architecture: 100% Local Browser Database (IndexedDB)

This application uses **Browser IndexedDB** (`wushu_tournament_local_db`) for zero-cloud, 100% local and private tournament data persistence:

- **No Remote Database Dependency**: No external database accounts, API keys, or cloud services (e.g. Supabase, Firebase) are required or used for tournament data operations.
- **Persistence Across Reloads**: All athlete registrations, tournament divisions, generated brackets, live match scores, sideline judge cards, and audit logs remain available and persistent across page reloads, browser restarts, or working fully offline.
- **Data Safety & Backup**:
  - In addition to real-time IndexedDB persistence, the app includes one-click **Full Tournament JSON Export** and **JSON Disaster Recovery** under the Master Admin Panel.
  - Export capabilities include Master Excel spreadsheets (`.xlsx`), individual CSVs, and printable bout sheets.

---

## Entities Stored Locally in IndexedDB

1. **`events`**: Championship metadata, arena platforms/rings, round durations, rest timers, and tournament reference dates.
2. **`players`**: Athlete registry with names, registration numbers, Aadhar IDs, weights, DOBs, clubs, districts, and weight-in statuses.
3. **`categories`**: Age and weight divisions, roster locking status, and confirmed participant IDs.
4. **`brackets`**: Single-elimination knockout tournament trees, bout rounds, point scores, warnings, platform ring assignments, and winners.
5. **`tournament_users`**: Official tournament staff accounts (Super Admin, Tournament Admin, Mat Officials, Sideline Judges).
6. **`sideline_judge_scores`**: Official Leitai sideline judge round cards, action punches/kicks/exits, and round submissions.
7. **`audit_logs`**: Tamper-evident administrative action audit trails.
8. **`age_categories`**: Sub-Junior, Junior, Youth, and Senior age range definitions.
9. **`weight_categories`**: Male and female official IWUF Sanda weight categories (48kg to +90kg).

---

## Local Setup & Development

### Prerequisites
- Node.js (version 18 or later)
- npm or yarn

### Installation & Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

4. The status badge will display **`Local Database: READY`** indicating IndexedDB is active and healthy.

---

## Building for Production

To create an optimized production build:
```bash
npm run build
```

To preview the build:
```bash
npm run preview
```
