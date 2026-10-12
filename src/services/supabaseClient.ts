import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
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
  localUpsert,
  localBulkUpsert,
  localDelete,
  localClearStore,
  localGetAll,
} from './localDatabase';

const STORAGE_URL_KEY = 'supabase_project_url';
const STORAGE_ANON_KEY = 'supabase_anon_public_key';
const STORAGE_DISABLED_KEY = 'supabase_connection_disabled';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

let cachedClient: SupabaseClient | null = null;
let currentClientUrl = '';
let currentClientKey = '';

export const DEFAULT_SUPABASE_URL = 'https://qbxlyaynqshlgzaqyriv.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieGx5YXlucXNobGd6YXF5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MTE0NTEsImV4cCI6MjEwNzM4NzQ1MX0.rAbr9pX3SoIcLjvwXs3_XpjUMxjRQ4H1UoJPLfbspGE';

/**
 * Retrieve active Supabase URL & Anon Key
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL;
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_ANON_KEY;

  let storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) || '' : '';
  let storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_ANON_KEY) || '' : '';

  // Purge any references to old/deleted projects or accidental disable flags
  if (typeof window !== 'undefined') {
    if (storedUrl.includes('qdofwbqlpcxhojrclbzp') || !storedUrl) {
      storedUrl = '';
      storedKey = '';
      localStorage.removeItem(STORAGE_URL_KEY);
      localStorage.removeItem(STORAGE_ANON_KEY);
      localStorage.removeItem(STORAGE_DISABLED_KEY);
    }
  }

  const url = (storedUrl || envUrl || DEFAULT_SUPABASE_URL).trim();
  const anonKey = (storedKey || envKey || DEFAULT_SUPABASE_ANON_KEY).trim();

  // Populate active project credentials into localStorage
  if (typeof window !== 'undefined' && url && anonKey) {
    try {
      localStorage.setItem(STORAGE_URL_KEY, url);
      localStorage.setItem(STORAGE_ANON_KEY, anonKey);
      localStorage.removeItem(STORAGE_DISABLED_KEY);
    } catch (_) {}
  }

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.startsWith('http')),
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_DISABLED_KEY);
    localStorage.setItem(STORAGE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim());
  }
  cachedClient = null;
  currentClientUrl = '';
  currentClientKey = '';
}

export function clearSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_DISABLED_KEY, 'true');
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_ANON_KEY);
  }
  cachedClient = null;
  currentClientUrl = '';
  currentClientKey = '';
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (cachedClient && currentClientUrl === url && currentClientKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 20 } },
    });
    currentClientUrl = url;
    currentClientKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(): Promise<{
  success: boolean;
  latencyMs?: number;
  message: string;
  hasRlsIssue?: boolean;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase credentials not configured' };
  }

  const start = performance.now();
  try {
    const { error: readError } = await client.from('events').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);

    if (readError) {
      if (readError.message.includes('row-level security') || readError.message.includes('RLS')) {
        return {
          success: false,
          latencyMs,
          hasRlsIssue: true,
          message: 'Connected, but Row-Level Security (RLS) is blocking read access.',
        };
      }
      return {
        success: false,
        latencyMs,
        message: readError.message || 'Supabase returned an error during connection test.',
      };
    }

    return {
      success: true,
      latencyMs,
      message: `Connected to Supabase PostgreSQL Database in real time (${latencyMs}ms)!`,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: false,
      latencyMs,
      message: err.message || 'Network error connecting to Supabase host.',
    };
  }
}

// ---------------------------------------------------------------------------
// DATA MAPPERS (Models <-> Supabase DB rows)
// ---------------------------------------------------------------------------

function safeJsonParse<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function mapEventToRow(e: EventSetup) {
  return {
    id: e.id,
    name: e.name,
    organizer: e.organizer || '',
    venue: e.venue || '',
    city: e.city || '',
    state: e.state || null,
    start_date: e.startDate || '',
    end_date: e.endDate || '',
    tournament_reference_date: e.tournamentReferenceDate || e.startDate || '',
    status: e.status || 'upcoming',
    is_live: e.isLive !== false,
    competition_type: e.competitionType || 'Sanda',
    round_duration_sec: Number(e.roundDurationSec) || 120,
    rounds_count: Number(e.roundsCount) || 3,
    rest_duration_sec: Number(e.restDurationSec) || 60,
    rings: Array.isArray(e.rings) ? e.rings : ['Leitai 1 (Platform A)', 'Leitai 2 (Platform B)'],
    description: e.description || null,
  };
}

export function mapRowToEvent(r: any): EventSetup {
  return {
    id: r.id,
    name: r.name || 'Tournament Event',
    organizer: r.organizer || 'State Wushu Association',
    venue: r.venue || '',
    city: r.city || '',
    state: r.state || '',
    startDate: r.start_date || '',
    endDate: r.end_date || '',
    tournamentReferenceDate: r.tournament_reference_date || r.start_date || '',
    status: r.status || 'upcoming',
    isLive: r.is_live !== false,
    competitionType: r.competition_type || 'Sanda',
    roundDurationSec: Number(r.round_duration_sec) || 120,
    roundsCount: Number(r.rounds_count) || 3,
    restDurationSec: Number(r.rest_duration_sec) || 60,
    rings: safeJsonParse<string[]>(r.rings, ['Leitai 1 (Platform A)', 'Leitai 2 (Platform B)']),
    description: r.description || '',
    createdAt: r.created_at || new Date().toISOString(),
  };
}

export function mapPlayerToRow(p: Player, eventId?: string) {
  return {
    id: p.id,
    event_id: p.eventId || eventId || null,
    registration_number: p.registrationNumber || p.id,
    name: p.name,
    father_name: p.fatherName || null,
    dob: p.dob || null,
    gender: p.gender,
    weight_kg: Number(p.weightKg) || 0,
    club_school: p.clubSchool || null,
    district: p.district || null,
    state_region: p.stateRegion || null,
    contact_number: p.contactNumber || null,
    aadhar_number: p.aadharNumber || null,
    status: p.status || 'weighed_in',
    created_at: p.createdAt || new Date().toISOString(),
  };
}

export function mapRowToPlayer(r: any): Player {
  return {
    id: r.id,
    eventId: r.event_id || '',
    registrationNumber: r.registration_number || r.id,
    name: r.name || 'Athlete',
    fatherName: r.father_name || '',
    dob: r.dob || '',
    gender: r.gender || 'male',
    weightKg: Number(r.weight_kg) || 0,
    clubSchool: r.club_school || '',
    district: r.district || '',
    stateRegion: r.state_region || '',
    contactNumber: r.contact_number || '',
    aadharNumber: r.aadhar_number || '',
    status: r.status || 'weighed_in',
    createdAt: r.created_at || new Date().toISOString(),
  };
}

export function mapCategoryToRow(c: Category, eventId?: string) {
  return {
    id: c.id,
    event_id: c.eventId || eventId || null,
    name: c.name,
    gender: c.gender,
    age_category_id: c.ageCategoryId,
    weight_category_id: c.weightCategoryId,
    district_filter: c.districtFilter || null,
    club_filter: c.clubFilter || null,
    is_locked: Boolean(c.isLocked),
    confirmed_at: c.confirmedAt || null,
    confirmed_by: c.confirmedBy || null,
    eligible_player_ids: Array.isArray(c.eligiblePlayerIds) ? c.eligiblePlayerIds : [],
  };
}

export function mapRowToCategory(r: any): Category {
  return {
    id: r.id,
    eventId: r.event_id || undefined,
    name: r.name,
    gender: r.gender,
    ageCategoryId: r.age_category_id,
    weightCategoryId: r.weight_category_id,
    districtFilter: r.district_filter || undefined,
    clubFilter: r.club_filter || undefined,
    isLocked: Boolean(r.is_locked),
    confirmedAt: r.confirmed_at || undefined,
    confirmedBy: r.confirmed_by || undefined,
    eligiblePlayerIds: safeJsonParse<string[]>(r.eligible_player_ids, []),
  };
}

export function mapBracketToRow(b: Bracket, eventId?: string) {
  return {
    id: b.id,
    category_id: b.categoryId,
    event_id: b.eventId || eventId || null,
    rounds: Array.isArray(b.rounds) ? b.rounds : [],
    generated_at: b.generatedAt || new Date().toISOString(),
    is_locked: Boolean(b.isLocked),
  };
}

export function mapRowToBracket(r: any): Bracket {
  return {
    id: r.id,
    categoryId: r.category_id,
    eventId: r.event_id || undefined,
    rounds: safeJsonParse<any[]>(r.rounds, []),
    generatedAt: r.generated_at || new Date().toISOString(),
    isLocked: Boolean(r.is_locked),
  };
}

export function mapUserToRow(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role,
    ring_assignment: u.ringAssignment || null,
    assigned_ring: u.assignedRing || null,
    password: u.password || null,
    last_active: u.lastActive || null,
  };
}

export function mapRowToUser(r: any): User {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    username: r.username,
    role: r.role,
    ringAssignment: r.ring_assignment || undefined,
    assignedRing: r.assigned_ring || undefined,
    password: r.password || undefined,
    lastActive: r.last_active || undefined,
  };
}

export function mapAgeCategoryToRow(a: AgeCategory) {
  return {
    id: a.id,
    name: a.name,
    min_age: Number(a.minAge),
    max_age: Number(a.maxAge),
    description: a.description || null,
  };
}

export function mapRowToAgeCategory(r: any): AgeCategory {
  return {
    id: r.id,
    name: r.name,
    minAge: Number(r.min_age),
    maxAge: Number(r.max_age),
    description: r.description || '',
    status: 'active',
  };
}

export function mapWeightCategoryToRow(w: WeightCategory) {
  return {
    id: w.id,
    name: w.name,
    min_weight_kg: Number(w.minWeightKg),
    max_weight_kg: Number(w.maxWeightKg),
    gender: w.gender,
  };
}

export function mapRowToWeightCategory(r: any): WeightCategory {
  return {
    id: r.id,
    name: r.name,
    minWeightKg: Number(r.min_weight_kg),
    maxWeightKg: Number(r.max_weight_kg),
    gender: r.gender,
  };
}

export function mapAuditLogToRow(a: AuditLog) {
  return {
    id: a.id,
    timestamp: a.timestamp,
    user_role: a.userRole,
    user_name: a.userName,
    action: a.action,
    target: a.target,
    details: a.details,
    entity_type: a.entityType || null,
  };
}

export function mapRowToAuditLog(r: any): AuditLog {
  return {
    id: r.id,
    timestamp: r.timestamp,
    userRole: r.user_role || 'official',
    userName: r.user_name || 'System',
    action: r.action,
    target: r.target,
    details: r.details,
    entityType: r.entity_type || undefined,
  };
}

export function mapSidelineJudgeScoreToRow(s: SidelineJudgeScore) {
  return {
    id: s.id,
    bout_id: s.boutId,
    event_id: s.eventId,
    arena: s.arena,
    judge_id: s.judgeId,
    judge_name: s.judgeName,
    round_number: Number(s.roundNumber),
    red_points: Number(s.redPoints) || 0,
    blue_points: Number(s.bluePoints) || 0,
    red_exits: Number(s.redExits) || 0,
    blue_exits: Number(s.blueExits) || 0,
    red_warnings: Number(s.redWarnings) || 0,
    blue_warnings: Number(s.blueWarnings) || 0,
    winner: s.winner || null,
    score_events: Array.isArray(s.scoreEvents) ? s.scoreEvents : [],
    is_submitted: Boolean(s.isSubmitted),
    submitted_at: s.submittedAt || null,
  };
}

export function mapRowToSidelineJudgeScore(r: any): SidelineJudgeScore {
  return {
    id: r.id,
    boutId: r.bout_id,
    eventId: r.event_id,
    arena: r.arena,
    judgeId: r.judge_id,
    judgeName: r.judge_name || 'Judge',
    roundNumber: Number(r.round_number) || 1,
    redPoints: Number(r.red_points) || 0,
    bluePoints: Number(r.blue_points) || 0,
    redExits: Number(r.red_exits) || 0,
    blueExits: Number(r.blue_exits) || 0,
    redWarnings: Number(r.red_warnings) || 0,
    blueWarnings: Number(r.blue_warnings) || 0,
    winner: r.winner || undefined,
    scoreEvents: safeJsonParse<any[]>(r.score_events, []),
    isSubmitted: Boolean(r.is_submitted),
    submittedAt: r.submitted_at || undefined,
    updatedAt: r.updated_at || new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// HYBRID REAL-TIME CRUD: Writes to Supabase & local IndexedDB
// ---------------------------------------------------------------------------

async function upsertToSupabaseTable(table: string, rows: Record<string, any>[]): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client || rows.length === 0) return { success: true };
  try {
    const { error } = await client.from(table).upsert(rows);
    if (error) {
      console.warn(`[Supabase Upload Notice on ${table}]:`, error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn(`[Supabase Upload Exception on ${table}]:`, err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}

// --- SIDELINE JUDGE SCORES ---
export async function supabaseUpsertSidelineJudgeScore(score: SidelineJudgeScore): Promise<{ success: boolean; error?: string }> {
  await localUpsert('sideline_judge_scores', score);
  const row = mapSidelineJudgeScoreToRow(score);
  return upsertToSupabaseTable('sideline_judge_scores', [row]);
}

export async function supabaseBulkUpsertSidelineJudgeScores(scores: SidelineJudgeScore[]): Promise<{ success: boolean; error?: string }> {
  await localBulkUpsert('sideline_judge_scores', scores);
  const rows = scores.map(mapSidelineJudgeScoreToRow);
  return upsertToSupabaseTable('sideline_judge_scores', rows);
}

export async function supabaseDeleteSidelineJudgeScore(scoreId: string): Promise<{ success: boolean; error?: string }> {
  await localDelete('sideline_judge_scores', scoreId);
  const client = getSupabaseClient();
  if (!client) return { success: true };
  try {
    await client.from('sideline_judge_scores').delete().eq('id', scoreId);
  } catch (_) {}
  return { success: true };
}

// --- PLAYERS ---
export async function supabaseUpsertPlayer(player: Player, eventId?: string): Promise<{ success: boolean; error?: string }> {
  await localUpsert('players', player);
  const row = mapPlayerToRow(player, eventId);
  return upsertToSupabaseTable('players', [row]);
}

export async function supabaseDeletePlayer(playerId: string): Promise<{ success: boolean; error?: string }> {
  await localDelete('players', playerId);
  const client = getSupabaseClient();
  if (!client) return { success: true };
  try {
    await client.from('players').delete().eq('id', playerId);
  } catch (_) {}
  return { success: true };
}

export async function supabaseBulkUpsertPlayers(players: Player[], eventId?: string): Promise<{ success: boolean; error?: string }> {
  await localBulkUpsert('players', players);
  const rows = players.map(p => mapPlayerToRow(p, eventId));
  return upsertToSupabaseTable('players', rows);
}

export async function supabaseClearPlayers(eventId?: string): Promise<void> {
  await localClearStore('players', eventId);
  const client = getSupabaseClient();
  if (!client) return;
  try {
    if (eventId) {
      await client.from('players').delete().eq('event_id', eventId);
    }
  } catch (_) {}
}

// --- CATEGORIES ---
export async function supabaseUpsertCategory(category: Category, eventId?: string): Promise<{ success: boolean; error?: string }> {
  await localUpsert('categories', category);
  const row = mapCategoryToRow(category, eventId);
  return upsertToSupabaseTable('categories', [row]);
}

export async function supabaseBulkUpsertCategories(categories: Category[], eventId?: string): Promise<{ success: boolean; error?: string }> {
  await localBulkUpsert('categories', categories);
  const rows = categories.map(c => mapCategoryToRow(c, eventId));
  return upsertToSupabaseTable('categories', rows);
}

export async function supabaseDeleteCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
  await localDelete('categories', categoryId);
  const client = getSupabaseClient();
  if (!client) return { success: true };
  try {
    await client.from('categories').delete().eq('id', categoryId);
  } catch (_) {}
  return { success: true };
}

export async function supabaseClearCategories(eventId?: string): Promise<void> {
  await localClearStore('categories', eventId);
  const client = getSupabaseClient();
  if (!client) return;
  try {
    if (eventId) {
      await client.from('categories').delete().eq('event_id', eventId);
    }
  } catch (_) {}
}

// --- BRACKETS ---
export async function supabaseUpsertBracket(bracket: Bracket, eventId?: string): Promise<{ success: boolean; error?: string }> {
  await localUpsert('brackets', bracket);
  const row = mapBracketToRow(bracket, eventId);
  return upsertToSupabaseTable('brackets', [row]);
}

export async function supabaseBulkUpsertBrackets(brackets: Bracket[], eventId?: string): Promise<{ success: boolean; error?: string }> {
  await localBulkUpsert('brackets', brackets);
  const rows = brackets.map(b => mapBracketToRow(b, eventId));
  return upsertToSupabaseTable('brackets', rows);
}

export async function supabaseDeleteBracket(bracketId: string): Promise<{ success: boolean; error?: string }> {
  await localDelete('brackets', bracketId);
  const client = getSupabaseClient();
  if (!client) return { success: true };
  try {
    await client.from('brackets').delete().eq('id', bracketId);
  } catch (_) {}
  return { success: true };
}

export async function supabaseClearBrackets(eventId?: string): Promise<void> {
  await localClearStore('brackets', eventId);
  const client = getSupabaseClient();
  if (!client) return;
  try {
    if (eventId) {
      await client.from('brackets').delete().eq('event_id', eventId);
    }
  } catch (_) {}
}

// --- EVENTS ---
export async function supabaseUpsertEvent(event: EventSetup): Promise<{ success: boolean; error?: string }> {
  await localUpsert('events', event);
  const row = mapEventToRow(event);
  return upsertToSupabaseTable('events', [row]);
}

export async function supabaseDeleteEvent(eventId: string): Promise<void> {
  await localDelete('events', eventId);
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('events').delete().eq('id', eventId);
  } catch (_) {}
}

// --- AGE CATEGORIES ---
export async function supabaseUpsertAgeCategory(cat: AgeCategory): Promise<void> {
  await localUpsert('age_categories', cat);
  const row = mapAgeCategoryToRow(cat);
  await upsertToSupabaseTable('age_categories', [row]);
}

export async function supabaseDeleteAgeCategory(catId: string): Promise<void> {
  await localDelete('age_categories', catId);
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('age_categories').delete().eq('id', catId);
  } catch (_) {}
}

export async function supabaseBulkUpsertAgeCategories(cats: AgeCategory[]): Promise<void> {
  await localBulkUpsert('age_categories', cats);
  const rows = cats.map(mapAgeCategoryToRow);
  await upsertToSupabaseTable('age_categories', rows);
}

// --- WEIGHT CATEGORIES ---
export async function supabaseUpsertWeightCategory(cat: WeightCategory): Promise<void> {
  await localUpsert('weight_categories', cat);
  const row = mapWeightCategoryToRow(cat);
  await upsertToSupabaseTable('weight_categories', [row]);
}

export async function supabaseDeleteWeightCategory(catId: string): Promise<void> {
  await localDelete('weight_categories', catId);
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('weight_categories').delete().eq('id', catId);
  } catch (_) {}
}

export async function supabaseBulkUpsertWeightCategories(cats: WeightCategory[]): Promise<void> {
  await localBulkUpsert('weight_categories', cats);
  const rows = cats.map(mapWeightCategoryToRow);
  await upsertToSupabaseTable('weight_categories', rows);
}

// --- TOURNAMENT USERS ---
export async function supabaseUpsertUser(user: User): Promise<void> {
  await localUpsert('tournament_users', user);
  const row = mapUserToRow(user);
  await upsertToSupabaseTable('tournament_users', [row]);
}

export async function supabaseDeleteUser(userId: string): Promise<void> {
  await localDelete('tournament_users', userId);
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('tournament_users').delete().eq('id', userId);
  } catch (_) {}
}

// --- AUDIT LOGS ---
export async function supabaseInsertAuditLog(log: AuditLog): Promise<void> {
  await localUpsert('audit_logs', log);
  const row = mapAuditLogToRow(log);
  await upsertToSupabaseTable('audit_logs', [row]);
}

// ---------------------------------------------------------------------------
// FULL BATCH OPERATIONS
// ---------------------------------------------------------------------------

export async function pushAllDataToSupabase(payload: {
  events: EventSetup[];
  players: Player[];
  categories: Category[];
  brackets: Bracket[];
  users: User[];
  auditLogs: AuditLog[];
  ageCategories: AgeCategory[];
  weightCategories: WeightCategory[];
  sidelineJudgeScores?: SidelineJudgeScore[];
}): Promise<{ success: boolean; message: string; details?: any; isRlsError?: boolean }> {
  // 1. Keep local IndexedDB updated
  try {
    if (payload.events) await localBulkUpsert('events', payload.events);
    if (payload.players) await localBulkUpsert('players', payload.players);
    if (payload.categories) await localBulkUpsert('categories', payload.categories);
    if (payload.brackets) await localBulkUpsert('brackets', payload.brackets);
    if (payload.users) await localBulkUpsert('tournament_users', payload.users);
    if (payload.auditLogs) await localBulkUpsert('audit_logs', payload.auditLogs);
    if (payload.ageCategories) await localBulkUpsert('age_categories', payload.ageCategories);
    if (payload.weightCategories) await localBulkUpsert('weight_categories', payload.weightCategories);
    if (payload.sidelineJudgeScores) await localBulkUpsert('sideline_judge_scores', payload.sidelineJudgeScores);
  } catch (_) {}

  // 2. Upload to Supabase PostgreSQL database
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client is not configured.' };
  }

  try {
    if (payload.events && payload.events.length > 0) {
      await client.from('events').upsert(payload.events.map(mapEventToRow));
    }
    if (payload.ageCategories && payload.ageCategories.length > 0) {
      await client.from('age_categories').upsert(payload.ageCategories.map(mapAgeCategoryToRow));
    }
    if (payload.weightCategories && payload.weightCategories.length > 0) {
      await client.from('weight_categories').upsert(payload.weightCategories.map(mapWeightCategoryToRow));
    }
    if (payload.players && payload.players.length > 0) {
      await client.from('players').upsert(payload.players.map(p => mapPlayerToRow(p)));
    }
    if (payload.categories && payload.categories.length > 0) {
      await client.from('categories').upsert(payload.categories.map(c => mapCategoryToRow(c)));
    }
    if (payload.brackets && payload.brackets.length > 0) {
      await client.from('brackets').upsert(payload.brackets.map(b => mapBracketToRow(b)));
    }
    if (payload.users && payload.users.length > 0) {
      await client.from('tournament_users').upsert(payload.users.map(mapUserToRow));
    }
    if (payload.auditLogs && payload.auditLogs.length > 0) {
      await client.from('audit_logs').upsert(payload.auditLogs.map(mapAuditLogToRow));
    }
    if (payload.sidelineJudgeScores && payload.sidelineJudgeScores.length > 0) {
      await client.from('sideline_judge_scores').upsert(payload.sidelineJudgeScores.map(mapSidelineJudgeScoreToRow));
    }

    return {
      success: true,
      message: 'All tournament records synchronized to Supabase PostgreSQL database in real time!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Supabase upload note: ${err?.message || err}`,
    };
  }
}

export async function pullAllDataFromSupabase(targetEventId?: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client is not configured' };
  }

  try {
    let playerQuery = client.from('players').select('*');
    let categoryQuery = client.from('categories').select('*');
    let bracketQuery = client.from('brackets').select('*');
    let sidelineQuery = client.from('sideline_judge_scores').select('*');

    if (targetEventId) {
      if (targetEventId === 'event-official-01') {
        playerQuery = playerQuery.or(`event_id.eq.${targetEventId},event_id.is.null`);
        categoryQuery = categoryQuery.or(`event_id.eq.${targetEventId},event_id.is.null`);
        bracketQuery = bracketQuery.or(`event_id.eq.${targetEventId},event_id.is.null`);
        sidelineQuery = sidelineQuery.or(`event_id.eq.${targetEventId},event_id.is.null`);
      } else {
        playerQuery = playerQuery.eq('event_id', targetEventId);
        categoryQuery = categoryQuery.eq('event_id', targetEventId);
        bracketQuery = bracketQuery.eq('event_id', targetEventId);
        sidelineQuery = sidelineQuery.eq('event_id', targetEventId);
      }
    }

    const [
      eventsRes,
      playersRes,
      categoriesRes,
      bracketsRes,
      usersRes,
      auditRes,
      ageRes,
      weightRes,
      sidelineRes,
    ] = await Promise.all([
      client.from('events').select('*'),
      playerQuery,
      categoryQuery,
      bracketQuery,
      client.from('tournament_users').select('*'),
      client.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200),
      client.from('age_categories').select('*'),
      client.from('weight_categories').select('*'),
      sidelineQuery,
    ]);

    const resData: any = {};

    if (!eventsRes.error && eventsRes.data && eventsRes.data.length > 0) {
      resData.events = eventsRes.data.map(mapRowToEvent);
    }
    if (!playersRes.error && playersRes.data) {
      resData.players = playersRes.data.map(mapRowToPlayer);
    }
    if (!categoriesRes.error && categoriesRes.data) {
      resData.categories = categoriesRes.data.map(mapRowToCategory);
    }
    if (!bracketsRes.error && bracketsRes.data) {
      resData.brackets = bracketsRes.data.map(mapRowToBracket);
    }
    if (!usersRes.error && usersRes.data && usersRes.data.length > 0) {
      resData.users = usersRes.data.map(mapRowToUser);
    }
    if (!auditRes.error && auditRes.data) {
      resData.auditLogs = auditRes.data.map(mapRowToAuditLog);
    }
    if (!ageRes.error && ageRes.data && ageRes.data.length > 0) {
      resData.ageCategories = ageRes.data.map(mapRowToAgeCategory);
    }
    if (!weightRes.error && weightRes.data && weightRes.data.length > 0) {
      resData.weightCategories = weightRes.data.map(mapRowToWeightCategory);
    }
    if (!sidelineRes.error && sidelineRes.data) {
      resData.sidelineJudgeScores = sidelineRes.data.map(mapRowToSidelineJudgeScore);
    }

    // Mirror to local IndexedDB as resilient backup
    if (resData.players) localBulkUpsert('players', resData.players);
    if (resData.categories) localBulkUpsert('categories', resData.categories);
    if (resData.brackets) localBulkUpsert('brackets', resData.brackets);
    if (resData.events) localBulkUpsert('events', resData.events);

    return {
      success: true,
      message: 'Pulled cloud tournament data successfully',
      data: resData,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to pull cloud tournament data',
    };
  }
}

/**
 * Setup Realtime channel subscription for instant scoring and tournament sync scoped to eventId
 */
export function subscribeToSupabaseTournament(
  onTableChange: (table: string, eventType: string, newRecord: any, oldRecord?: any) => void,
  targetEventId?: string
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channelName = `wushu-tournament-realtime-${targetEventId || 'all'}-${Date.now()}`;
    const isMatchingEvent = (rec: any) => {
      if (!targetEventId) return true;
      if (!rec) return true;
      const evId = rec.event_id;
      if (evId === targetEventId) return true;
      if (!evId && targetEventId === 'event-official-01') return true;
      return false;
    };

    const channel: RealtimeChannel = client
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brackets' }, payload => {
        const rec = payload.new || payload.old;
        if (!isMatchingEvent(rec)) return;
        onTableChange('brackets', payload.eventType, payload.new, payload.old);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, payload =>
        onTableChange('events', payload.eventType, payload.new, payload.old)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, payload => {
        const rec = payload.new || payload.old;
        if (!isMatchingEvent(rec)) return;
        onTableChange('players', payload.eventType, payload.new, payload.old);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, payload => {
        const rec = payload.new || payload.old;
        if (!isMatchingEvent(rec)) return;
        onTableChange('categories', payload.eventType, payload.new, payload.old);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_users' }, payload =>
        onTableChange('tournament_users', payload.eventType, payload.new, payload.old)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weight_categories' }, payload =>
        onTableChange('weight_categories', payload.eventType, payload.new, payload.old)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'age_categories' }, payload =>
        onTableChange('age_categories', payload.eventType, payload.new, payload.old)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sideline_judge_scores' }, payload => {
        const rec = payload.new || payload.old;
        if (!isMatchingEvent(rec)) return;
        onTableChange('sideline_judge_scores', payload.eventType, payload.new, payload.old);
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Connected to live tournament broadcast channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Supabase Realtime] Channel subscription error:', err);
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.error('Failed to subscribe to Supabase Realtime channel:', err);
    return null;
  }
}
