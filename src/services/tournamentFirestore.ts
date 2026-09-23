import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  EventSetup,
  Player,
  Category,
  Bracket,
  User,
  AuditLog,
  AgeCategory,
  WeightCategory,
} from '../types/tournament';

const COLLECTION_NAME = 'tournament_state';
const DOC_METADATA = 'system_meta';
const DOC_ACTIVE_EVENT = 'active_event';
const DOC_EVENTS = 'events_list';
const DOC_PLAYERS = 'players_roster';
const DOC_CATEGORIES = 'categories_list';
const DOC_BRACKETS = 'brackets_trees';
const DOC_USERS = 'officials_users';
const DOC_AUDIT = 'audit_logs';
const DOC_AGE_CATS = 'age_categories';
const DOC_WEIGHT_CATS = 'weight_categories';

export interface CloudSyncStatus {
  connected: boolean;
  lastSyncedAt: Date | null;
  error?: string | null;
}

/**
 * Initialize Firestore data if remote database is empty
 */
export const initializeCloudDataIfEmpty = async (initialData: {
  event: EventSetup;
  events: EventSetup[];
  players: Player[];
  categories: Category[];
  brackets: Bracket[];
  users: User[];
  auditLogs: AuditLog[];
  ageCategories: AgeCategory[];
  weightCategories: WeightCategory[];
}) => {
  try {
    const metaRef = doc(db, COLLECTION_NAME, DOC_METADATA);
    const metaSnap = await getDoc(metaRef);

    if (!metaSnap.exists()) {
      // First time initialization in the cloud database
      console.log('Seeding initial tournament dataset to Cloud Firestore backend...');
      await Promise.all([
        setDoc(doc(db, COLLECTION_NAME, DOC_ACTIVE_EVENT), { data: initialData.event, updatedAt: serverTimestamp() }),
        setDoc(doc(db, COLLECTION_NAME, DOC_EVENTS), { data: initialData.events, updatedAt: serverTimestamp() }),
        setDoc(doc(db, COLLECTION_NAME, DOC_PLAYERS), { data: initialData.players, updatedAt: serverTimestamp() }),
        setDoc(doc(db, COLLECTION_NAME, DOC_CATEGORIES), { data: initialData.categories, updatedAt: serverTimestamp() }),
        setDoc(doc(db, COLLECTION_NAME, DOC_BRACKETS), { data: initialData.brackets, updatedAt: serverTimestamp() }),
        setDoc(doc(db, COLLECTION_NAME, DOC_USERS), { data: initialData.users, updatedAt: serverTimestamp() }),
        setDoc(doc(db, COLLECTION_NAME, DOC_AUDIT), { data: initialData.auditLogs, updatedAt: serverTimestamp() }),
        setDoc(doc(db, COLLECTION_NAME, DOC_AGE_CATS), { data: initialData.ageCategories, updatedAt: serverTimestamp() }),
        setDoc(doc(db, COLLECTION_NAME, DOC_WEIGHT_CATS), { data: initialData.weightCategories, updatedAt: serverTimestamp() }),
        setDoc(metaRef, {
          initializedAt: serverTimestamp(),
          version: '2.0.0',
          appName: 'Wushu Tournament Sanda Arena',
        }),
      ]);
      console.log('Cloud Firestore seed completed successfully.');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Could not initialize cloud database:', err);
    return false;
  }
};

/**
 * Real-time subscribers for each data entity
 */
export const subscribeToCloudTournament = (callbacks: {
  onEventChange?: (event: EventSetup) => void;
  onEventsListChange?: (events: EventSetup[]) => void;
  onPlayersChange?: (players: Player[]) => void;
  onCategoriesChange?: (categories: Category[]) => void;
  onBracketsChange?: (brackets: Bracket[]) => void;
  onUsersChange?: (users: User[]) => void;
  onAuditLogsChange?: (audit: AuditLog[]) => void;
  onAgeCategoriesChange?: (ageCats: AgeCategory[]) => void;
  onWeightCategoriesChange?: (weightCats: WeightCategory[]) => void;
  onStatusChange?: (status: CloudSyncStatus) => void;
}): (() => void) => {
  const unsubscribers: (() => void)[] = [];

  const updateStatus = (connected: boolean, error?: string | null) => {
    if (callbacks.onStatusChange) {
      callbacks.onStatusChange({
        connected,
        lastSyncedAt: new Date(),
        error: error || null,
      });
    }
  };

  try {
    // 1. Active Event
    unsubscribers.push(
      onSnapshot(
        doc(db, COLLECTION_NAME, DOC_ACTIVE_EVENT),
        snap => {
          if (snap.exists() && snap.data()?.data) {
            callbacks.onEventChange?.(snap.data().data as EventSetup);
            updateStatus(true);
          }
        },
        err => {
          console.warn('Firestore active_event sync warning:', err.message);
          updateStatus(false, err.message);
        }
      )
    );

    // 2. Events Registry
    unsubscribers.push(
      onSnapshot(
        doc(db, COLLECTION_NAME, DOC_EVENTS),
        snap => {
          if (snap.exists() && snap.data()?.data) {
            callbacks.onEventsListChange?.(snap.data().data as EventSetup[]);
            updateStatus(true);
          }
        },
        err => console.warn('Firestore events sync warning:', err.message)
      )
    );

    // 3. Players Roster
    unsubscribers.push(
      onSnapshot(
        doc(db, COLLECTION_NAME, DOC_PLAYERS),
        snap => {
          if (snap.exists() && snap.data()?.data) {
            callbacks.onPlayersChange?.(snap.data().data as Player[]);
            updateStatus(true);
          }
        },
        err => console.warn('Firestore players sync warning:', err.message)
      )
    );

    // 4. Categories
    unsubscribers.push(
      onSnapshot(
        doc(db, COLLECTION_NAME, DOC_CATEGORIES),
        snap => {
          if (snap.exists() && snap.data()?.data) {
            callbacks.onCategoriesChange?.(snap.data().data as Category[]);
            updateStatus(true);
          }
        },
        err => console.warn('Firestore categories sync warning:', err.message)
      )
    );

    // 5. Brackets & Bouts
    unsubscribers.push(
      onSnapshot(
        doc(db, COLLECTION_NAME, DOC_BRACKETS),
        snap => {
          if (snap.exists() && snap.data()?.data) {
            callbacks.onBracketsChange?.(snap.data().data as Bracket[]);
            updateStatus(true);
          }
        },
        err => console.warn('Firestore brackets sync warning:', err.message)
      )
    );

    // 6. Users & Officials
    unsubscribers.push(
      onSnapshot(
        doc(db, COLLECTION_NAME, DOC_USERS),
        snap => {
          if (snap.exists() && snap.data()?.data) {
            callbacks.onUsersChange?.(snap.data().data as User[]);
            updateStatus(true);
          }
        },
        err => console.warn('Firestore users sync warning:', err.message)
      )
    );

    // 7. Audit Logs
    unsubscribers.push(
      onSnapshot(
        doc(db, COLLECTION_NAME, DOC_AUDIT),
        snap => {
          if (snap.exists() && snap.data()?.data) {
            callbacks.onAuditLogsChange?.(snap.data().data as AuditLog[]);
            updateStatus(true);
          }
        },
        err => console.warn('Firestore audit sync warning:', err.message)
      )
    );

    // 8. Age Categories
    unsubscribers.push(
      onSnapshot(
        doc(db, COLLECTION_NAME, DOC_AGE_CATS),
        snap => {
          if (snap.exists() && snap.data()?.data) {
            callbacks.onAgeCategoriesChange?.(snap.data().data as AgeCategory[]);
            updateStatus(true);
          }
        },
        err => console.warn('Firestore age categories sync warning:', err.message)
      )
    );

    // 9. Weight Categories
    unsubscribers.push(
      onSnapshot(
        doc(db, COLLECTION_NAME, DOC_WEIGHT_CATS),
        snap => {
          if (snap.exists() && snap.data()?.data) {
            callbacks.onWeightCategoriesChange?.(snap.data().data as WeightCategory[]);
            updateStatus(true);
          }
        },
        err => console.warn('Firestore weight categories sync warning:', err.message)
      )
    );
  } catch (err) {
    console.error('Failed to establish Firestore subscriptions:', err);
    updateStatus(false, (err as Error).message);
  }

  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
};

/**
 * Cloud persistence write operations
 */
export const persistCloudActiveEvent = async (event: EventSetup) => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, DOC_ACTIVE_EVENT), {
      data: event,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Error persisting active event to cloud:', e);
  }
};

export const persistCloudEventsList = async (events: EventSetup[]) => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, DOC_EVENTS), {
      data: events,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Error persisting events list to cloud:', e);
  }
};

export const persistCloudPlayers = async (players: Player[]) => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, DOC_PLAYERS), {
      data: players,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Error persisting players to cloud:', e);
  }
};

export const persistCloudCategories = async (categories: Category[]) => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, DOC_CATEGORIES), {
      data: categories,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Error persisting categories to cloud:', e);
  }
};

export const persistCloudBrackets = async (brackets: Bracket[]) => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, DOC_BRACKETS), {
      data: brackets,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Error persisting brackets to cloud:', e);
  }
};

export const persistCloudUsers = async (users: User[]) => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, DOC_USERS), {
      data: users,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Error persisting users to cloud:', e);
  }
};

export const persistCloudAuditLogs = async (auditLogs: AuditLog[]) => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, DOC_AUDIT), {
      data: auditLogs,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Error persisting audit logs to cloud:', e);
  }
};

export const persistCloudAgeCategories = async (ageCategories: AgeCategory[]) => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, DOC_AGE_CATS), {
      data: ageCategories,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Error persisting age categories to cloud:', e);
  }
};

export const persistCloudWeightCategories = async (weightCategories: WeightCategory[]) => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, DOC_WEIGHT_CATS), {
      data: weightCategories,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Error persisting weight categories to cloud:', e);
  }
};

/**
 * Full cloud state reset (Super Admin utility)
 */
export const resetCloudTournamentState = async (defaultData: {
  event: EventSetup;
  events: EventSetup[];
  players: Player[];
  categories: Category[];
  brackets: Bracket[];
  users: User[];
  auditLogs: AuditLog[];
  ageCategories: AgeCategory[];
  weightCategories: WeightCategory[];
}) => {
  try {
    await Promise.all([
      setDoc(doc(db, COLLECTION_NAME, DOC_ACTIVE_EVENT), { data: defaultData.event, updatedAt: serverTimestamp() }),
      setDoc(doc(db, COLLECTION_NAME, DOC_EVENTS), { data: defaultData.events, updatedAt: serverTimestamp() }),
      setDoc(doc(db, COLLECTION_NAME, DOC_PLAYERS), { data: defaultData.players, updatedAt: serverTimestamp() }),
      setDoc(doc(db, COLLECTION_NAME, DOC_CATEGORIES), { data: defaultData.categories, updatedAt: serverTimestamp() }),
      setDoc(doc(db, COLLECTION_NAME, DOC_BRACKETS), { data: defaultData.brackets, updatedAt: serverTimestamp() }),
      setDoc(doc(db, COLLECTION_NAME, DOC_USERS), { data: defaultData.users, updatedAt: serverTimestamp() }),
      setDoc(doc(db, COLLECTION_NAME, DOC_AUDIT), { data: defaultData.auditLogs, updatedAt: serverTimestamp() }),
      setDoc(doc(db, COLLECTION_NAME, DOC_AGE_CATS), { data: defaultData.ageCategories, updatedAt: serverTimestamp() }),
      setDoc(doc(db, COLLECTION_NAME, DOC_WEIGHT_CATS), { data: defaultData.weightCategories, updatedAt: serverTimestamp() }),
    ]);
    return true;
  } catch (e) {
    console.error('Failed to reset cloud state:', e);
    return false;
  }
};
