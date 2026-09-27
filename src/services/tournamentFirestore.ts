// Firebase Firestore is disabled in favor of Supabase PostgreSQL database
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

export const isFirestoreQuotaExceeded = () => false;
export const getFirestoreQuotaMessage = () => '';
export const onQuotaStatusChange = (_listener: (exceeded: boolean, message: string) => void) => {
  return () => {};
};
export const checkAndHandleQuotaError = (_err: unknown): boolean => false;

export interface CloudSyncStatus {
  connected: boolean;
  lastSyncedAt: Date | null;
  error?: string | null;
}

export const initializeCloudDataIfEmpty = async (_initialData: {
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
  return false;
};

export const subscribeToCloudTournament = (_callbacks: {
  onEventUpdate?: (event: EventSetup) => void;
  onEventsListUpdate?: (events: EventSetup[]) => void;
  onPlayersUpdate?: (players: Player[]) => void;
  onCategoriesUpdate?: (categories: Category[]) => void;
  onBracketsUpdate?: (brackets: Bracket[]) => void;
  onUsersUpdate?: (users: User[]) => void;
  onAuditLogsUpdate?: (logs: AuditLog[]) => void;
  onAgeCategoriesUpdate?: (ageCategories: AgeCategory[]) => void;
  onWeightCategoriesUpdate?: (weightCategories: WeightCategory[]) => void;
  onError?: (err: Error) => void;
}) => {
  return () => {};
};

export const persistCloudActiveEvent = async (_event: EventSetup) => {};
export const persistCloudEventsList = async (_events: EventSetup[]) => {};
export const persistCloudPlayers = async (_players: Player[]) => {};
export const persistCloudCategories = async (_categories: Category[]) => {};
export const persistCloudBrackets = async (_brackets: Bracket[]) => {};
export const persistCloudUsers = async (_users: User[]) => {};
export const persistCloudAudit = async (_auditLogs: AuditLog[]) => {};
export const persistCloudAgeCategories = async (_ageCategories: AgeCategory[]) => {};
export const persistCloudWeightCategories = async (_weightCategories: WeightCategory[]) => {};
export const seedInitialTournamentToCloud = async (_initialData: any) => false;
