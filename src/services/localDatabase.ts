/**
 * Browser IndexedDB Database Adapter for Wushu Tournament Arena
 *
 * Provides persistent local storage for all tournament models:
 * - events
 * - players
 * - categories
 * - brackets
 * - tournament_users
 * - sideline_judge_scores
 * - audit_logs
 * - age_categories
 * - weight_categories
 *
 * Fully zero-cloud, 100% private, resilient, offline-ready.
 */

import {
  EventSetup,
  Player,
  Category,
  Bracket,
  User,
  AuditLog,
  AgeCategory,
  WeightCategory,
  SidelineJudgeScore,
} from '../types/tournament';
import {
  INITIAL_EVENT,
  INITIAL_AGE_CATEGORIES,
  INITIAL_WEIGHT_CATEGORIES,
  INITIAL_USERS,
} from '../data/initialData';

const DB_NAME = 'wushu_tournament_local_db';
const DB_VERSION = 1;

export type LocalDbStatus = 'ready' | 'loading' | 'error';

export interface LocalTournamentData {
  event: EventSetup;
  events: EventSetup[];
  players: Player[];
  categories: Category[];
  brackets: Bracket[];
  users: User[];
  auditLogs: AuditLog[];
  ageCategories: AgeCategory[];
  weightCategories: WeightCategory[];
  sidelineJudgeScores: SidelineJudgeScore[];
}

const STORES = [
  'events',
  'players',
  'categories',
  'brackets',
  'tournament_users',
  'audit_logs',
  'age_categories',
  'weight_categories',
  'sideline_judge_scores',
] as const;

type StoreName = (typeof STORES)[number];

let dbInstancePromise: Promise<IDBDatabase> | null = null;

function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  if (dbInstancePromise) return dbInstancePromise;

  dbInstancePromise = new Promise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          const os = db.createObjectStore(store, { keyPath: 'id' });
          if (store === 'players' || store === 'categories' || store === 'brackets' || store === 'sideline_judge_scores') {
            os.createIndex('event_id', 'eventId', { unique: false });
          }
        }
      }
    };

    request.onsuccess = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.onversionchange = () => {
        db.close();
      };
      resolve(db);
    };

    request.onerror = event => {
      const err = (event.target as IDBOpenDBRequest).error;
      reject(err || new Error('Failed to open IndexedDB'));
    };
  });

  return dbInstancePromise;
}

/**
 * Generic helper to execute a transaction
 */
async function getTransaction(storeNames: StoreName | StoreName[], mode: IDBTransactionMode) {
  const db = await openDatabase();
  const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
  return db.transaction(stores, mode);
}

/**
 * Generic getAll from store
 */
export async function localGetAll<T>(storeName: StoreName): Promise<T[]> {
  try {
    const tx = await getTransaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return await new Promise<T[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[LocalDB] Error reading store ${storeName}:`, err);
    return [];
  }
}

/**
 * Generic upsert item
 */
export async function localUpsert<T extends { id: string }>(storeName: StoreName, item: T): Promise<void> {
  try {
    const tx = await getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await new Promise<void>((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`[LocalDB] Error saving to ${storeName}:`, err);
  }
}

/**
 * Generic bulk upsert items
 */
export async function localBulkUpsert<T extends { id: string }>(storeName: StoreName, items: T[]): Promise<void> {
  if (items.length === 0) return;
  try {
    const tx = await getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await new Promise<void>((resolve, reject) => {
      items.forEach(item => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error(`[LocalDB] Error bulk saving to ${storeName}:`, err);
  }
}

/**
 * Generic delete item by id
 */
export async function localDelete(storeName: StoreName, id: string): Promise<void> {
  try {
    const tx = await getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`[LocalDB] Error deleting from ${storeName}:`, err);
  }
}

/**
 * Generic clear store or delete records matching an eventId
 */
export async function localClearStore(storeName: StoreName, eventId?: string): Promise<void> {
  try {
    const tx = await getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    if (!eventId) {
      await new Promise<void>((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      return;
    }

    // Filter by eventId
    await new Promise<void>((resolve, reject) => {
      const req = store.openCursor();
      req.onsuccess = event => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const val = cursor.value;
          if (val && (val.eventId === eventId || val.event_id === eventId)) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`[LocalDB] Error clearing store ${storeName}:`, err);
  }
}

/**
 * Test IndexedDB readiness
 */
export async function testLocalDatabase(): Promise<{
  success: boolean;
  message: string;
  countInfo?: Record<string, number>;
}> {
  try {
    const db = await openDatabase();
    if (!db) {
      return { success: false, message: 'Browser IndexedDB is not accessible' };
    }

    const counts: Record<string, number> = {};
    for (const store of STORES) {
      const items = await localGetAll(store);
      counts[store] = items.length;
    }

    return {
      success: true,
      message: 'Local browser database active & ready (IndexedDB)',
      countInfo: counts,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'IndexedDB storage initialization failed',
    };
  }
}

/**
 * Check if the database has any initial seeds; if brand-new, seed defaults cleanly
 */
export async function initializeLocalDataIfEmpty(): Promise<LocalTournamentData> {
  await openDatabase();

  const [
    events,
    players,
    categories,
    brackets,
    users,
    auditLogs,
    ageCategories,
    weightCategories,
    sidelineJudgeScores,
  ] = await Promise.all([
    localGetAll<EventSetup>('events'),
    localGetAll<Player>('players'),
    localGetAll<Category>('categories'),
    localGetAll<Bracket>('brackets'),
    localGetAll<User>('tournament_users'),
    localGetAll<AuditLog>('audit_logs'),
    localGetAll<AgeCategory>('age_categories'),
    localGetAll<WeightCategory>('weight_categories'),
    localGetAll<SidelineJudgeScore>('sideline_judge_scores'),
  ]);

  let finalEvents = events;
  let finalAgeCats = ageCategories;
  let finalWeightCats = weightCategories;
  let finalUsers = users;

  // Initialize event default if completely empty
  if (finalEvents.length === 0) {
    await localUpsert('events', INITIAL_EVENT);
    finalEvents = [INITIAL_EVENT];
  }

  // Initialize age categories default if completely empty
  if (finalAgeCats.length === 0) {
    await localBulkUpsert('age_categories', INITIAL_AGE_CATEGORIES);
    finalAgeCats = INITIAL_AGE_CATEGORIES;
  }

  // Initialize weight categories default if completely empty
  if (finalWeightCats.length === 0) {
    await localBulkUpsert('weight_categories', INITIAL_WEIGHT_CATEGORIES);
    finalWeightCats = INITIAL_WEIGHT_CATEGORIES;
  }

  // Initialize official accounts default if completely empty
  if (finalUsers.length === 0) {
    await localBulkUpsert('tournament_users', INITIAL_USERS);
    finalUsers = INITIAL_USERS;
  }

  const activeEvent = finalEvents.find(e => e.isLive) || finalEvents[0] || INITIAL_EVENT;

  return {
    event: activeEvent,
    events: finalEvents,
    players,
    categories,
    brackets,
    users: finalUsers,
    auditLogs,
    ageCategories: finalAgeCats,
    weightCategories: finalWeightCats,
    sidelineJudgeScores,
  };
}

/**
 * Clear all local data and re-seed defaults
 */
export async function clearAllLocalDatabase(): Promise<void> {
  for (const store of STORES) {
    await localClearStore(store);
  }
  // Re-seed defaults
  await localUpsert('events', INITIAL_EVENT);
  await localBulkUpsert('age_categories', INITIAL_AGE_CATEGORIES);
  await localBulkUpsert('weight_categories', INITIAL_WEIGHT_CATEGORIES);
  await localBulkUpsert('tournament_users', INITIAL_USERS);
}
