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
} from '../types/tournament';

const STORAGE_URL_KEY = 'supabase_project_url';
const STORAGE_ANON_KEY = 'supabase_anon_public_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

let cachedClient: SupabaseClient | null = null;
let currentClientUrl = '';
let currentClientKey = '';

/**
 * Retrieve active Supabase URL & Anon Key from environment or local storage
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl =
    (import.meta.env.VITE_SUPABASE_URL as string) || 'https://qdofwbqlpcxhojrclbzp.supabase.co';
  const envKey =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkb2Z3YnFscGN4aG9qcmNsYnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNjc0NTMsImV4cCI6MjEwNTc0MzQ1M30.H96U1bmqKY3iYeVZSZNU-htQ15jAQ8w14IS8o4M3d0o';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_ANON_KEY) || '' : '';

  const url = (storedUrl || envUrl).trim();
  const anonKey = (storedKey || envKey).trim();

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.startsWith('http')),
  };
}

/**
 * Persist custom Supabase credentials to localStorage
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim());
  }
  // Reset cached client to force re-instantiation
  cachedClient = null;
  currentClientUrl = '';
  currentClientKey = '';
}

/**
 * Clear stored Supabase credentials
 */
export function clearSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_ANON_KEY);
  }
  cachedClient = null;
  currentClientUrl = '';
  currentClientKey = '';
}

/**
 * Returns a singleton instance of SupabaseClient or null if not configured
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (cachedClient && currentClientUrl === url && currentClientKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentClientUrl = url;
    currentClientKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Test connectivity with Supabase project
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  latencyMs?: number;
  message: string;
  tablesFound?: string[];
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase project URL and Anon Key are missing or incomplete.',
    };
  }

  const start = performance.now();
  try {
    // Attempt querying the events table
    const { data: _data, error } = await client.from('events').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return {
          success: true,
          latencyMs,
          message:
            'Connected to Supabase project! The tables need to be created using the provided SQL schema script.',
        };
      }
      return {
        success: false,
        latencyMs,
        message: error.message || 'Supabase returned an error during connection test.',
      };
    }

    return {
      success: true,
      latencyMs,
      message: `Successfully connected to Supabase (${latencyMs}ms)!`,
      tablesFound: ['events'],
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
// DATA MAPPERS (TypeScript Models <--> Supabase Database Rows)
// ---------------------------------------------------------------------------

export function mapEventToRow(e: EventSetup) {
  return {
    id: e.id,
    name: e.name,
    organizer: e.organizer,
    venue: e.venue,
    city: e.city,
    state: e.state || null,
    start_date: e.startDate,
    end_date: e.endDate,
    tournament_reference_date: e.tournamentReferenceDate,
    status: e.status,
    is_live: e.isLive !== false,
    competition_type: e.competitionType,
    round_duration_sec: e.roundDurationSec,
    rounds_count: e.roundsCount,
    rest_duration_sec: e.restDurationSec,
    rings: e.rings,
    description: e.description || null,
  };
}

export function mapRowToEvent(r: any): EventSetup {
  return {
    id: r.id,
    name: r.name,
    organizer: r.organizer || 'State Wushu Association',
    venue: r.venue || '',
    city: r.city || '',
    state: r.state || '',
    startDate: r.start_date,
    endDate: r.end_date,
    tournamentReferenceDate: r.tournament_reference_date || r.start_date,
    status: r.status || 'upcoming',
    isLive: r.is_live !== false,
    competitionType: r.competition_type || 'Sanda',
    roundDurationSec: Number(r.round_duration_sec) || 120,
    roundsCount: Number(r.rounds_count) || 3,
    restDurationSec: Number(r.rest_duration_sec) || 60,
    rings: r.rings || ['Leitai 1 (Platform A)', 'Leitai 2 (Platform B)'],
    description: r.description || '',
  };
}

export function mapPlayerToRow(p: Player) {
  return {
    id: p.id,
    registration_number: p.registrationNumber,
    name: p.name,
    father_name: p.fatherName,
    dob: p.dob,
    gender: p.gender,
    weight_kg: p.weightKg,
    club_school: p.clubSchool,
    district: p.district,
    state_region: p.stateRegion,
    contact_number: p.contactNumber,
    aadhar_number: p.aadharNumber,
    status: p.status,
    created_at: p.createdAt,
  };
}

export function mapRowToPlayer(r: any): Player {
  return {
    id: r.id,
    registrationNumber: r.registration_number || r.id,
    name: r.name,
    fatherName: r.father_name || '',
    dob: r.dob || '',
    gender: r.gender,
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

export function mapCategoryToRow(c: Category) {
  return {
    id: c.id,
    event_id: c.eventId,
    name: c.name,
    gender: c.gender,
    age_category_id: c.ageCategoryId,
    weight_category_id: c.weightCategoryId,
    district_filter: c.districtFilter || null,
    club_filter: c.clubFilter || null,
    is_locked: c.isLocked,
    confirmed_at: c.confirmedAt || null,
    confirmed_by: c.confirmedBy || null,
    eligible_player_ids: c.eligiblePlayerIds,
  };
}

export function mapRowToCategory(r: any): Category {
  return {
    id: r.id,
    eventId: r.event_id,
    name: r.name,
    gender: r.gender,
    ageCategoryId: r.age_category_id,
    weightCategoryId: r.weight_category_id,
    districtFilter: r.district_filter || undefined,
    clubFilter: r.club_filter || undefined,
    isLocked: Boolean(r.is_locked),
    confirmedAt: r.confirmed_at || undefined,
    confirmedBy: r.confirmed_by || undefined,
    eligiblePlayerIds: r.eligible_player_ids || [],
  };
}

export function mapBracketToRow(b: Bracket) {
  return {
    id: b.id,
    category_id: b.categoryId,
    event_id: b.eventId,
    rounds: b.rounds,
    generated_at: b.generatedAt,
    is_locked: b.isLocked,
  };
}

export function mapRowToBracket(r: any): Bracket {
  return {
    id: r.id,
    categoryId: r.category_id,
    eventId: r.event_id,
    rounds: r.rounds || [],
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
    password: r.password,
    lastActive: r.last_active,
  };
}

export function mapAgeCategoryToRow(a: AgeCategory) {
  return {
    id: a.id,
    name: a.name,
    min_age: a.minAge,
    max_age: a.maxAge,
    description: a.description || null,
  };
}

export function mapRowToAgeCategory(r: any): AgeCategory {
  return {
    id: r.id,
    name: r.name,
    minAge: Number(r.min_age),
    maxAge: Number(r.max_age),
    description: r.description,
  };
}

export function mapWeightCategoryToRow(w: WeightCategory) {
  return {
    id: w.id,
    name: w.name,
    min_weight_kg: w.minWeightKg,
    max_weight_kg: w.maxWeightKg,
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
    userName: r.user_name,
    action: r.action,
    target: r.target,
    details: r.details,
    entityType: r.entity_type || undefined,
  };
}

// ---------------------------------------------------------------------------
// ATOMIC REAL-TIME SUPABASE CRUD OPERATIONS
// ---------------------------------------------------------------------------

// --- PLAYERS ---
export async function supabaseUpsertPlayer(player: Player): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const row = mapPlayerToRow(player);
    await client.from('players').upsert([row]);
  } catch (err) {
    console.error('Failed to upsert player in Supabase:', err);
  }
}

export async function supabaseDeletePlayer(playerId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('players').delete().eq('id', playerId);
  } catch (err) {
    console.error('Failed to delete player in Supabase:', err);
  }
}

export async function supabaseBulkUpsertPlayers(players: Player[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || players.length === 0) return;
  try {
    const rows = players.map(mapPlayerToRow);
    await client.from('players').upsert(rows);
  } catch (err) {
    console.error('Failed to bulk upsert players in Supabase:', err);
  }
}

export async function supabaseClearPlayers(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('players').delete().neq('id', '___non_existent___');
  } catch (err) {
    console.error('Failed to clear players in Supabase:', err);
  }
}

// --- CATEGORIES ---
export async function supabaseUpsertCategory(category: Category): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const row = mapCategoryToRow(category);
    await client.from('categories').upsert([row]);
  } catch (err) {
    console.error('Failed to upsert category in Supabase:', err);
  }
}

export async function supabaseDeleteCategory(categoryId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('categories').delete().eq('id', categoryId);
  } catch (err) {
    console.error('Failed to delete category in Supabase:', err);
  }
}

export async function supabaseClearCategories(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('categories').delete().neq('id', '___non_existent___');
  } catch (err) {
    console.error('Failed to clear categories in Supabase:', err);
  }
}

// --- BRACKETS ---
export async function supabaseUpsertBracket(bracket: Bracket): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const row = mapBracketToRow(bracket);
    await client.from('brackets').upsert([row]);
  } catch (err) {
    console.error('Failed to upsert bracket in Supabase:', err);
  }
}

export async function supabaseDeleteBracket(bracketId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('brackets').delete().eq('id', bracketId);
  } catch (err) {
    console.error('Failed to delete bracket in Supabase:', err);
  }
}

export async function supabaseClearBrackets(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('brackets').delete().neq('id', '___non_existent___');
  } catch (err) {
    console.error('Failed to clear brackets in Supabase:', err);
  }
}

// --- EVENTS ---
export async function supabaseUpsertEvent(event: EventSetup): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const row = mapEventToRow(event);
    await client.from('events').upsert([row]);
  } catch (err) {
    console.error('Failed to upsert event in Supabase:', err);
  }
}

export async function supabaseDeleteEvent(eventId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('events').delete().eq('id', eventId);
  } catch (err) {
    console.error('Failed to delete event in Supabase:', err);
  }
}

// --- AGE CATEGORIES ---
export async function supabaseUpsertAgeCategory(cat: AgeCategory): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const row = mapAgeCategoryToRow(cat);
    await client.from('age_categories').upsert([row]);
  } catch (err) {
    console.error('Failed to upsert age category in Supabase:', err);
  }
}

export async function supabaseDeleteAgeCategory(catId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('age_categories').delete().eq('id', catId);
  } catch (err) {
    console.error('Failed to delete age category in Supabase:', err);
  }
}

export async function supabaseBulkUpsertAgeCategories(cats: AgeCategory[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || cats.length === 0) return;
  try {
    const rows = cats.map(mapAgeCategoryToRow);
    await client.from('age_categories').upsert(rows);
  } catch (err) {
    console.error('Failed to bulk upsert age categories in Supabase:', err);
  }
}

// --- WEIGHT CATEGORIES ---
export async function supabaseUpsertWeightCategory(cat: WeightCategory): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const row = mapWeightCategoryToRow(cat);
    await client.from('weight_categories').upsert([row]);
  } catch (err) {
    console.error('Failed to upsert weight category in Supabase:', err);
  }
}

export async function supabaseDeleteWeightCategory(catId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('weight_categories').delete().eq('id', catId);
  } catch (err) {
    console.error('Failed to delete weight category in Supabase:', err);
  }
}

export async function supabaseBulkUpsertWeightCategories(cats: WeightCategory[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || cats.length === 0) return;
  try {
    const rows = cats.map(mapWeightCategoryToRow);
    await client.from('weight_categories').upsert(rows);
  } catch (err) {
    console.error('Failed to bulk upsert weight categories in Supabase:', err);
  }
}

// --- TOURNAMENT USERS ---
export async function supabaseUpsertUser(user: User): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const row = mapUserToRow(user);
    await client.from('tournament_users').upsert([row]);
  } catch (err) {
    console.error('Failed to upsert user in Supabase:', err);
  }
}

export async function supabaseDeleteUser(userId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('tournament_users').delete().eq('id', userId);
  } catch (err) {
    console.error('Failed to delete user in Supabase:', err);
  }
}

// --- AUDIT LOGS ---
export async function supabaseInsertAuditLog(log: AuditLog): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const row = mapAuditLogToRow(log);
    await client.from('audit_logs').upsert([row]);
  } catch (err) {
    console.error('Failed to insert audit log in Supabase:', err);
  }
}

// ---------------------------------------------------------------------------
// FULL BATCH OPERATIONS
// ---------------------------------------------------------------------------

/**
 * Push all local tournament data to Supabase tables (upsert)
 */
export async function pushAllDataToSupabase(payload: {
  events: EventSetup[];
  players: Player[];
  categories: Category[];
  brackets: Bracket[];
  users: User[];
  auditLogs: AuditLog[];
  ageCategories: AgeCategory[];
  weightCategories: WeightCategory[];
}): Promise<{ success: boolean; message: string; details?: any }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase is not configured.' };
  }

  try {
    // 1. Events
    if (payload.events && payload.events.length > 0) {
      const eventRows = payload.events.map(mapEventToRow);
      const { error: eventErr } = await client.from('events').upsert(eventRows);
      if (eventErr) throw new Error(`Events sync error: ${eventErr.message}`);
    }

    // 2. Age categories
    if (payload.ageCategories && payload.ageCategories.length > 0) {
      const ageRows = payload.ageCategories.map(mapAgeCategoryToRow);
      const { error: ageErr } = await client.from('age_categories').upsert(ageRows);
      if (ageErr) throw new Error(`Age divisions sync error: ${ageErr.message}`);
    }

    // 3. Weight categories
    if (payload.weightCategories && payload.weightCategories.length > 0) {
      const weightRows = payload.weightCategories.map(mapWeightCategoryToRow);
      const { error: weightErr } = await client.from('weight_categories').upsert(weightRows);
      if (weightErr) throw new Error(`Weight categories sync error: ${weightErr.message}`);
    }

    // 4. Players
    if (payload.players && payload.players.length > 0) {
      const playerRows = payload.players.map(mapPlayerToRow);
      const { error: pErr } = await client.from('players').upsert(playerRows);
      if (pErr) throw new Error(`Players sync error: ${pErr.message}`);
    }

    // 5. Categories
    if (payload.categories && payload.categories.length > 0) {
      const catRows = payload.categories.map(mapCategoryToRow);
      const { error: catErr } = await client.from('categories').upsert(catRows);
      if (catErr) throw new Error(`Categories sync error: ${catErr.message}`);
    }

    // 6. Brackets
    if (payload.brackets && payload.brackets.length > 0) {
      const bracketRows = payload.brackets.map(mapBracketToRow);
      const { error: bErr } = await client.from('brackets').upsert(bracketRows);
      if (bErr) throw new Error(`Brackets sync error: ${bErr.message}`);
    }

    // 7. Tournament Users
    if (payload.users && payload.users.length > 0) {
      const userRows = payload.users.map(mapUserToRow);
      const { error: uErr } = await client.from('tournament_users').upsert(userRows);
      if (uErr) throw new Error(`Users sync error: ${uErr.message}`);
    }

    // 8. Audit Logs
    if (payload.auditLogs && payload.auditLogs.length > 0) {
      const auditRows = payload.auditLogs.map(mapAuditLogToRow);
      const { error: aErr } = await client.from('audit_logs').upsert(auditRows);
      if (aErr) throw new Error(`Audit logs sync error: ${aErr.message}`);
    }

    return {
      success: true,
      message: 'All tournament records synchronized to Supabase PostgreSQL database!',
    };
  } catch (err: any) {
    console.error('Supabase upload error:', err);
    return {
      success: false,
      message: err.message || 'Failed to upload tournament data to Supabase.',
    };
  }
}

/**
 * Fetch all tournament records from Supabase
 */
export async function pullAllDataFromSupabase(): Promise<{
  success: boolean;
  message: string;
  data?: {
    events?: EventSetup[];
    players?: Player[];
    categories?: Category[];
    brackets?: Bracket[];
    users?: User[];
    auditLogs?: AuditLog[];
    ageCategories?: AgeCategory[];
    weightCategories?: WeightCategory[];
  };
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase is not configured.' };
  }

  try {
    const [
      eventsRes,
      playersRes,
      categoriesRes,
      bracketsRes,
      usersRes,
      auditRes,
      ageRes,
      weightRes,
    ] = await Promise.all([
      client.from('events').select('*'),
      client.from('players').select('*'),
      client.from('categories').select('*'),
      client.from('brackets').select('*'),
      client.from('tournament_users').select('*'),
      client.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200),
      client.from('age_categories').select('*'),
      client.from('weight_categories').select('*'),
    ]);

    const resData: any = {};

    if (eventsRes.data && eventsRes.data.length > 0) {
      resData.events = eventsRes.data.map(mapRowToEvent);
    }

    if (playersRes.data && playersRes.data.length > 0) {
      resData.players = playersRes.data.map(mapRowToPlayer);
    }

    if (categoriesRes.data && categoriesRes.data.length > 0) {
      resData.categories = categoriesRes.data.map(mapRowToCategory);
    }

    if (bracketsRes.data && bracketsRes.data.length > 0) {
      resData.brackets = bracketsRes.data.map(mapRowToBracket);
    }

    if (usersRes.data && usersRes.data.length > 0) {
      resData.users = usersRes.data.map(mapRowToUser);
    }

    if (auditRes.data && auditRes.data.length > 0) {
      resData.auditLogs = auditRes.data.map(mapRowToAuditLog);
    }

    if (ageRes.data && ageRes.data.length > 0) {
      resData.ageCategories = ageRes.data.map(mapRowToAgeCategory);
    }

    if (weightRes.data && weightRes.data.length > 0) {
      resData.weightCategories = weightRes.data.map(mapRowToWeightCategory);
    }

    return {
      success: true,
      message: 'Successfully pulled latest records from Supabase!',
      data: resData,
    };
  } catch (err: any) {
    console.error('Supabase pull error:', err);
    return {
      success: false,
      message: err.message || 'Failed to pull tournament records from Supabase.',
    };
  }
}

/**
 * Setup Realtime channel subscription for instant scoring and tournament sync
 */
export function subscribeToSupabaseTournament(
  onTableChange: (table: string, eventType: string, newRecord: any, oldRecord?: any) => void
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channel: RealtimeChannel = client
      .channel('tournament-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'brackets' },
        payload => onTableChange('brackets', payload.eventType, payload.new, payload.old)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        payload => onTableChange('events', payload.eventType, payload.new, payload.old)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        payload => onTableChange('players', payload.eventType, payload.new, payload.old)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        payload => onTableChange('categories', payload.eventType, payload.new, payload.old)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_users' },
        payload => onTableChange('tournament_users', payload.eventType, payload.new, payload.old)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weight_categories' },
        payload => onTableChange('weight_categories', payload.eventType, payload.new, payload.old)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'age_categories' },
        payload => onTableChange('age_categories', payload.eventType, payload.new, payload.old)
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.error('Failed to subscribe to Supabase Realtime channel:', err);
    return null;
  }
}
