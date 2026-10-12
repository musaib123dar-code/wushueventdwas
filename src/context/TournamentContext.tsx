import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  UserRole,
  User,
  EventSetup,
  Player,
  Category,
  Bracket,
  Bout,
  AuditLog,
  AgeCategory,
  WeightCategory,
  BoutStatus,
  ScoreEvent,
  SidelineJudgeScore,
  SidelineScoreEvent,
  TournamentSafetySnapshot,
} from '../types/tournament';
import {
  INITIAL_EVENT,
  INITIAL_AGE_CATEGORIES,
  INITIAL_WEIGHT_CATEGORIES,
  INITIAL_PLAYERS,
  INITIAL_CATEGORIES,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  createInitialBrackets,
} from '../data/initialData';
import {
  calculateAge,
  generateKnockoutBracket,
  advanceWinnerInBracket,
  reopenBoutInBracket,
  findBoutInRounds,
  applyMovePlayerInBracket,
  applySwapPlayersInBracket,
  validateBracketNoDuplicates,
} from '../utils/tournamentHelpers';
import { isArenaMatch } from '../utils/arenaMatcher';
import { exportMasterFullBackup } from '../utils/excelMasterHelper';
import { testLocalDatabase } from '../services/localDatabase';
import {
  getSupabaseConfig,
  testSupabaseConnection,
  pushAllDataToSupabase,
  pullAllDataFromSupabase,
  subscribeToSupabaseTournament,
  mapRowToPlayer,
  mapRowToCategory,
  mapRowToBracket,
  mapRowToEvent,
  mapRowToUser,
  mapRowToAgeCategory,
  mapRowToWeightCategory,
  mapRowToSidelineJudgeScore,
  supabaseUpsertSidelineJudgeScore,
  supabaseDeleteSidelineJudgeScore,
  supabaseUpsertPlayer,
  supabaseDeletePlayer,
  supabaseBulkUpsertPlayers,
  supabaseClearPlayers,
  supabaseUpsertCategory,
  supabaseDeleteCategory,
  supabaseClearCategories,
  supabaseUpsertBracket,
  supabaseDeleteBracket,
  supabaseClearBrackets,
  supabaseUpsertEvent,
  supabaseDeleteEvent,
  supabaseUpsertWeightCategory,
  supabaseDeleteWeightCategory,
  supabaseBulkUpsertWeightCategories,
  supabaseUpsertAgeCategory,
  supabaseDeleteAgeCategory,
  supabaseBulkUpsertAgeCategories,
  supabaseUpsertUser,
  supabaseDeleteUser,
  supabaseInsertAuditLog,
} from '../services/supabaseClient';

interface TournamentContextType {
  supabaseStatus: 'connected' | 'disconnected' | 'connecting' | 'not_configured' | 'error';
  setSupabaseStatus: (status: 'connected' | 'disconnected' | 'connecting' | 'not_configured' | 'error') => void;
  supabaseModalOpen: boolean;
  setSupabaseModalOpen: (open: boolean) => void;
  syncToSupabase: () => Promise<{ success: boolean; message: string }>;
  fetchFromSupabase: () => Promise<{ success: boolean; message: string }>;
  isLoadingData: boolean;
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentUser: User;
  users: User[];
  isLoggedIn: boolean;
  login: (credential: string, password: string) => { success: boolean; error?: string; user?: User };
  logout: () => void;
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  addUser: (user: Omit<User, 'id'>) => { success: boolean; error?: string; user?: User };
  updateUser: (userId: string, data: Partial<User>) => { success: boolean; error?: string };
  deleteUser: (userId: string) => { success: boolean; error?: string };
  
  event: EventSetup;
  events: EventSetup[];
  updateEvent: (updated: Partial<EventSetup>) => void;
  createOfficialEvent: (eventData: Partial<EventSetup>, clearExistingRoster?: boolean, isLive?: boolean) => EventSetup;
  toggleEventLive: (eventId: string, isLive?: boolean) => void;
  switchEvent: (eventId: string) => void;
  deleteEvent: (eventId: string) => { success: boolean; error?: string };
  isEventLive: boolean;
  canWorkOnEvent: boolean;
  
  ageCategories: AgeCategory[];
  setAgeCategories: (categories: AgeCategory[]) => { success: boolean; error?: string };
  addAgeCategory: (cat: Omit<AgeCategory, 'id'>) => { success: boolean; error?: string; ageCategory?: AgeCategory };
  updateAgeCategory: (id: string, cat: Partial<AgeCategory>) => { success: boolean; error?: string };
  deleteAgeCategory: (id: string) => { success: boolean; error?: string };
  resetAgeCategories: () => { success: boolean; error?: string };
  
  weightCategories: WeightCategory[];
  setWeightCategories: (categories: WeightCategory[]) => void;
  addWeightCategory: (cat: Omit<WeightCategory, 'id'>) => void;
  updateWeightCategory: (id: string, cat: Partial<WeightCategory>) => void;
  deleteWeightCategory: (id: string) => void;
  resetWeightCategories: () => void;
  
  players: Player[];
  addPlayer: (playerData: Omit<Player, 'id' | 'createdAt'>) => { success: boolean; error?: string; player?: Player };
  bulkAddPlayers: (playersData: Omit<Player, 'id' | 'createdAt'>[], replace?: boolean) => { added: number; duplicates: number };
  updatePlayer: (id: string, playerData: Partial<Player>) => { success: boolean; error?: string };
  deletePlayer: (id: string) => { success: boolean; error?: string };
  clearAllPlayers: () => void;
  
  categories: Category[];
  createCategory: (cat: Omit<Category, 'id' | 'isLocked' | 'eligiblePlayerIds'>) => Category;
  lockCategory: (categoryId: string) => void;
  unlockCategory: (categoryId: string) => void;
  deleteCategory: (categoryId: string) => { success: boolean; error?: string };
  clearAllCategoriesAndBrackets: () => void;
  
  brackets: Bracket[];
  generateBracketForCategory: (categoryId: string, randomize?: boolean) => { success: boolean; error?: string; bracket?: Bracket };
  regenerateBracketForCategory: (categoryId: string, reason: string) => { success: boolean; error?: string };
  updateBracketFixture: (
    bracketId: string,
    updatedBracket: Bracket,
    auditTarget: string,
    auditDetails: string,
    individualLogs?: { target: string; details: string; action?: AuditLog['action'] }[]
  ) => { success: boolean; error?: string };
  movePlayerInFixture: (
    bracketId: string,
    sourceBoutId: string,
    sourceCorner: 'red' | 'blue',
    destBoutId: string,
    destCorner: 'red' | 'blue'
  ) => { success: boolean; error?: string; updatedBracket?: Bracket };
  swapPlayersInFixture: (
    bracketId: string,
    boutIdA: string,
    cornerA: 'red' | 'blue',
    boutIdB: string,
    cornerB: 'red' | 'blue'
  ) => { success: boolean; error?: string; updatedBracket?: Bracket };
  assignCategoryToPlatform: (categoryId: string, platformName: string) => { success: boolean; error?: string };
  assignBoutToPlatform: (bracketId: string, boutId: string, platformName: string) => { success: boolean; error?: string };

  activeBoutForScoring: Bout | null;
  setActiveBoutForScoring: (bout: Bout | null) => void;
  recordBoutScoreEvent: (boutId: string, event: Omit<ScoreEvent, 'id' | 'timestamp'>) => void;
  updateBoutRoundScore: (boutId: string, roundNumber: number, redDelta: number, blueDelta: number) => void;
  recordBoutExit: (boutId: string, roundNumber: number, corner: 'red' | 'blue') => void;
  recordBoutWarning: (boutId: string, roundNumber: number, corner: 'red' | 'blue') => void;
  submitBoutResult: (
    boutId: string,
    winnerCorner: 'red' | 'blue',
    status: BoutStatus,
    winningReason: string
  ) => { success: boolean; error?: string };
  reopenBoutResult: (boutId: string, reason: string) => { success: boolean; error?: string };
  
  // Judge-Only Sideline Scoring for Official Leitai Scoring
  sidelineJudgeScores: SidelineJudgeScore[];
  recordSidelineScoreAction: (
    boutId: string,
    roundNumber: number,
    corner: 'red' | 'blue',
    actionType: SidelineScoreEvent['actionType'],
    points: number,
    desc: string
  ) => { success: boolean; error?: string };
  recordSidelineExit: (boutId: string, roundNumber: number, corner: 'red' | 'blue') => { success: boolean; error?: string };
  recordSidelineWarning: (boutId: string, roundNumber: number, corner: 'red' | 'blue') => { success: boolean; error?: string };
  undoLastSidelineAction: (boutId: string, roundNumber: number) => { success: boolean; error?: string };
  submitSidelineRoundCard: (
    boutId: string,
    roundNumber: number,
    preferredWinner?: 'red' | 'blue' | 'draw'
  ) => { success: boolean; error?: string };
  amendSidelineRoundCard: (boutId: string, roundNumber: number) => { success: boolean; error?: string };
  resetSidelineRoundCard: (boutId: string, roundNumber: number) => { success: boolean; error?: string };
  getJudgeScoresForBout: (boutId: string, judgeId?: string) => SidelineJudgeScore[];
  getAllJudgeScoresForAdmin: (boutId: string) => SidelineJudgeScore[];
  getSubmittedJudgeScoresForPlatform: (boutId: string) => SidelineJudgeScore[];
  validateJudgeAccessForBout: (bout: Bout) => { allowed: boolean; reason?: string };
  
  auditLogs: AuditLog[];
  addAuditLog: (action: AuditLog['action'], target: string, details: string) => void;
  
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  resetToDefaults: () => void;
  clearAllCacheAndReset: () => void;
  saveSafetySnapshot: (label?: string) => void;
  restoreFromSafetySnapshot: () => { success: boolean; message: string };
  getSafetySnapshotInfo: () => {
    available: boolean;
    timestamp?: string;
    playersCount?: number;
    categoriesCount?: number;
    bracketsCount?: number;
    eventName?: string;
  };
  exportTournamentBackupJson: () => void;
  importTournamentBackupJson: (jsonString: string) => { success: boolean; message: string };
  exportDataAsCSV: (type: 'players' | 'bouts' | 'results' | 'audit') => void;
  exportMasterExcelBackup: () => void;
  importMasterWorkbook: (data: {
    event?: Partial<EventSetup>;
    ageCategories?: AgeCategory[];
    weightCategories?: WeightCategory[];
    players?: Omit<Player, 'id' | 'createdAt'>[];
    replacePlayers?: boolean;
    replaceAgeCategories?: boolean;
    replaceWeightCategories?: boolean;
  }) => { success: boolean; summary: string };
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

const GUEST_USER: User = {
  id: 'guest',
  name: 'Public Spectator',
  email: 'spectator@wushutournament.org',
  username: 'spectator',
  role: 'general_view',
  lastActive: 'Online',
};

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always start with public view and guest spectator role
  const [role, setRoleState] = useState<UserRole>('general_view');
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [activeTab, setActiveTab] = useState<string>('public');
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [supabaseModalOpen, setSupabaseModalOpen] = useState<boolean>(false);
  const [supabaseStatus, setSupabaseStatus] = useState<
    'connected' | 'disconnected' | 'connecting' | 'not_configured' | 'error'
  >('not_configured');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Pure in-memory presentation state - ZERO persistent browser cache
  const [event, setEvent] = useState<EventSetup>(INITIAL_EVENT);
  const [events, setEvents] = useState<EventSetup[]>([INITIAL_EVENT]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [activeBoutForScoring, setActiveBoutForScoring] = useState<Bout | null>(null);
  const [ageCategories, setAgeCategoriesState] = useState<AgeCategory[]>(INITIAL_AGE_CATEGORIES);
  const [weightCategories, setWeightCategoriesState] = useState<WeightCategory[]>(INITIAL_WEIGHT_CATEGORIES);
  const [sidelineJudgeScores, setSidelineJudgeScores] = useState<SidelineJudgeScore[]>([]);

  // In-memory safety snapshot holder (non-persistent, transient during session)
  const transientSnapshotRef = useRef<TournamentSafetySnapshot | null>(null);

  const saveSafetySnapshot = (label?: string) => {
    if (players.length > 0 || categories.length > 0 || brackets.length > 0) {
      transientSnapshotRef.current = {
        timestamp: new Date().toISOString(),
        eventName: event.name || 'Wushu Sanda Championship',
        playersCount: players.length,
        categoriesCount: categories.length,
        bracketsCount: brackets.length,
        data: {
          event,
          events,
          players,
          categories,
          brackets,
          users,
          ageCategories,
          weightCategories,
          sidelineJudgeScores,
        },
      };
      if (label) {
        console.log(`[Safety Snapshot] Captured in-memory snapshot '${label}'`);
      }
    }
  };

  // ----------------------------------------------------
  // SUPABASE CLOUD INITIALIZATION & REALTIME PULL
  // ----------------------------------------------------
  useEffect(() => {
    setSupabaseStatus('connecting');
    testSupabaseConnection()
      .then(async (res: { success: boolean; message: string }) => {
        if (res.success) {
          try {
            const pullRes = await pullAllDataFromSupabase(event.id);
            if (pullRes.success && pullRes.data) {
              if (pullRes.data.events && pullRes.data.events.length > 0) {
                setEvents(pullRes.data.events);
                const activeEv = pullRes.data.events.find((e: EventSetup) => e.isLive) || pullRes.data.events[0];
                setEvent(activeEv);
              }
              if (pullRes.data.ageCategories && pullRes.data.ageCategories.length > 0) {
                setAgeCategoriesState(pullRes.data.ageCategories);
              }
              if (pullRes.data.weightCategories && pullRes.data.weightCategories.length > 0) {
                setWeightCategoriesState(pullRes.data.weightCategories);
              }
              if (pullRes.data.users && pullRes.data.users.length > 0) {
                setUsers(pullRes.data.users);
              }

              // Load all records
              setPlayers(pullRes.data.players || []);
              setCategories(pullRes.data.categories || []);
              setBrackets(pullRes.data.brackets || []);
              setSidelineJudgeScores(pullRes.data.sidelineJudgeScores || []);
              if (pullRes.data.auditLogs && pullRes.data.auditLogs.length > 0) {
                setAuditLogs(pullRes.data.auditLogs);
              }
            }
            setSupabaseStatus('connected');
          } catch (err: unknown) {
            console.error('Error loading Supabase tournament database:', err);
            setSupabaseStatus('error');
          } finally {
            setIsLoadingData(false);
          }
        } else {
          setSupabaseStatus('error');
          setIsLoadingData(false);
        }
      })
      .catch((err: unknown) => {
        console.error('Supabase connection error:', err);
        setSupabaseStatus('error');
        setIsLoadingData(false);
      });
  }, []);

  // Supabase Realtime channel subscription scoped strictly to active event.id
  useEffect(() => {
    if (supabaseStatus !== 'connected' || !event?.id) return;

    const unsubscribe = subscribeToSupabaseTournament((table, eventType, newRecord, oldRecord) => {
      const targetId = (oldRecord && oldRecord.id) || (newRecord && newRecord.id);

      if (eventType === 'DELETE') {
        if (!targetId) return;
        if (table === 'players') {
          setPlayers(prev => prev.filter(p => p.id !== targetId));
        } else if (table === 'categories') {
          setCategories(prev => prev.filter(c => c.id !== targetId));
          setBrackets(prev => prev.filter(b => b.categoryId !== targetId));
        } else if (table === 'brackets') {
          setBrackets(prev => prev.filter(b => b.id !== targetId));
        } else if (table === 'events') {
          setEvents(prev => prev.filter(e => e.id !== targetId));
        } else if (table === 'tournament_users') {
          setUsers(prev => prev.filter(u => u.id !== targetId));
        } else if (table === 'age_categories') {
          setAgeCategoriesState(prev => prev.filter(a => a.id !== targetId));
        } else if (table === 'weight_categories') {
          setWeightCategoriesState(prev => prev.filter(w => w.id !== targetId));
        } else if (table === 'sideline_judge_scores') {
          setSidelineJudgeScores(prev => prev.filter(s => s.id !== targetId));
        }
        return;
      }

      if (!newRecord) return;

      if (table === 'brackets') {
        const b = mapRowToBracket(newRecord);
        if (b.eventId && b.eventId !== event.id) return;
        setBrackets(prev => {
          const idx = prev.findIndex(item => item.id === b.id);
          if (idx >= 0) return prev.map(item => (item.id === b.id ? b : item));
          return [...prev, b];
        });
        setActiveBoutForScoring(curr => {
          if (!curr) return null;
          const matched = findBoutInRounds(b.rounds, curr.id);
          return matched || curr;
        });
      } else if (table === 'events') {
        const e = mapRowToEvent(newRecord);
        setEvents(prev => {
          const idx = prev.findIndex(item => item.id === e.id);
          if (idx >= 0) return prev.map(item => (item.id === e.id ? e : item));
          return [...prev, e];
        });
        setEvent(prev => (prev.id === e.id ? e : prev));
      } else if (table === 'players') {
        const p = mapRowToPlayer(newRecord);
        if (p.eventId && p.eventId !== event.id) return;
        setPlayers(prev => {
          const idx = prev.findIndex(item => item.id === p.id);
          if (idx >= 0) return prev.map(item => (item.id === p.id ? p : item));
          return [p, ...prev];
        });
      } else if (table === 'categories') {
        const c = mapRowToCategory(newRecord);
        if (c.eventId && c.eventId !== event.id) return;
        setCategories(prev => {
          const idx = prev.findIndex(item => item.id === c.id);
          if (idx >= 0) return prev.map(item => (item.id === c.id ? c : item));
          return [...prev, c];
        });
      } else if (table === 'tournament_users') {
        const u = mapRowToUser(newRecord);
        setUsers(prev => {
          const idx = prev.findIndex(item => item.id === u.id);
          if (idx >= 0) return prev.map(item => (item.id === u.id ? u : item));
          return [...prev, u];
        });
      } else if (table === 'age_categories') {
        const a = mapRowToAgeCategory(newRecord);
        setAgeCategoriesState(prev => {
          const idx = prev.findIndex(item => item.id === a.id);
          if (idx >= 0) return prev.map(item => (item.id === a.id ? a : item));
          return [...prev, a];
        });
      } else if (table === 'weight_categories') {
        const w = mapRowToWeightCategory(newRecord);
        setWeightCategoriesState(prev => {
          const idx = prev.findIndex(item => item.id === w.id);
          if (idx >= 0) return prev.map(item => (item.id === w.id ? w : item));
          return [...prev, w];
        });
      } else if (table === 'sideline_judge_scores') {
        const s = mapRowToSidelineJudgeScore(newRecord);
        if (s.eventId && s.eventId !== event.id) return;
        setSidelineJudgeScores(prev => {
          const idx = prev.findIndex(item => item.id === s.id);
          if (idx >= 0) return prev.map(item => (item.id === s.id ? s : item));
          return [...prev, s];
        });
      }
    }, event.id);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [supabaseStatus, event?.id]);

  // Periodic sync heartbeat every 20 seconds
  useEffect(() => {
    if (supabaseStatus !== 'connected' || !event?.id) return;
    const interval = setInterval(() => {
      pullAllDataFromSupabase(event.id).then(pullRes => {
        if (pullRes.success && pullRes.data) {
          if (pullRes.data.events && pullRes.data.events.length > 0) {
            setEvents(pullRes.data.events);
          }
          if (pullRes.data.brackets && pullRes.data.brackets.length > 0) {
            setBrackets(pullRes.data.brackets);
          }
          if (pullRes.data.players) {
            setPlayers(pullRes.data.players);
          }
          if (pullRes.data.categories) {
            setCategories(pullRes.data.categories);
          }
        }
      }).catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, [supabaseStatus, event?.id]);

  // Sync current state to Supabase
  const syncToSupabase = async (): Promise<{ success: boolean; message: string }> => {
    const res = await pushAllDataToSupabase({
      events,
      players,
      categories,
      brackets,
      users,
      auditLogs,
      ageCategories,
      weightCategories,
      sidelineJudgeScores,
    });
    if (res.success) {
      setSupabaseStatus('connected');
    }
    return res;
  };

  // Pull all data from Supabase into local state scoped to active championship
  const fetchFromSupabase = async (): Promise<{ success: boolean; message: string }> => {
    setIsLoadingData(true);
    try {
      const res = await pullAllDataFromSupabase(event.id);
      if (res.success && res.data) {
        if (res.data.events && res.data.events.length > 0) {
          const currentId = event.id;
          const matched = res.data.events.find((e: EventSetup) => e.id === currentId) || res.data.events[0];
          setEvents(res.data.events);
          setEvent(matched);
        }
        if (res.data.players) setPlayers(res.data.players);
        if (res.data.categories) setCategories(res.data.categories);
        if (res.data.brackets) setBrackets(res.data.brackets);
        if (res.data.users) setUsers(res.data.users);
        if (res.data.auditLogs) setAuditLogs(res.data.auditLogs);
        if (res.data.ageCategories) setAgeCategoriesState(res.data.ageCategories);
        if (res.data.weightCategories) setWeightCategoriesState(res.data.weightCategories);
        if (res.data.sidelineJudgeScores) setSidelineJudgeScores(res.data.sidelineJudgeScores);
        setSupabaseStatus('connected');
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message || 'Failed to pull from Supabase' };
    } finally {
      setIsLoadingData(false);
    }
  };

  // Authentication status
  const isLoggedIn = role !== 'general_view' && currentUser.id !== 'guest';

  const login = (credential: string, password: string): { success: boolean; error?: string; user?: User } => {
    const credClean = credential.trim().toLowerCase();
    const passClean = password.trim();

    if (!credClean || !passClean) {
      return { success: false, error: 'Please enter both username/email and password.' };
    }

    // Match strictly by username or email
    const matchedUser = users.find(u => {
      const emailMatches = u.email && u.email.trim().toLowerCase() === credClean;
      const userMatches = u.username && u.username.trim().toLowerCase() === credClean;
      return emailMatches || userMatches;
    });

    if (!matchedUser) {
      return { success: false, error: 'No official account found with the provided credentials. Access denied.' };
    }

    if (!matchedUser.password || matchedUser.password !== passClean) {
      return { success: false, error: 'Incorrect password for this official account. Access denied.' };
    }

    // Credentials verified! Establish isolated session for this user
    setCurrentUser(matchedUser);
    setRoleState(matchedUser.role);

    // Direct to designated workspace
    if (matchedUser.role === 'super_admin') {
      setActiveTab('master-panel');
    } else if (matchedUser.role === 'admin') {
      setActiveTab('dashboard');
    } else if (matchedUser.role === 'official' || matchedUser.role === 'sideline_judge') {
      setActiveTab('live-scoring');
    } else {
      setActiveTab('public');
    }

    addAuditLog('ROLE_CHANGE', `User: ${matchedUser.name}`, `Authenticated as ${matchedUser.role} via secure credentials.`);

    return { success: true, user: matchedUser };
  };

  const logout = () => {
    const prevName = currentUser.name;
    setCurrentUser(GUEST_USER);
    setRoleState('general_view');
    setActiveTab('public');
    addAuditLog('ROLE_CHANGE', `User: ${prevName}`, 'Session ended. Returned to Public Arena View.');
  };

  const setRole = (newRole: UserRole) => {
    // Role change is only permitted for logged-in super_admin or returning to general_view
    if (role !== 'super_admin' && newRole !== 'general_view') {
      return;
    }
    setRoleState(newRole);
    if (newRole === 'general_view') {
      setCurrentUser(GUEST_USER);
      setActiveTab('public');
    } else {
      const found = users.find(u => u.role === newRole);
      if (found) setCurrentUser(found);
    }
  };

  const addAuditLog = (action: AuditLog['action'], target: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userRole: role,
      userName: currentUser.name,
      action,
      target,
      details,
    };
    setAuditLogs(prev => [newLog, ...prev]);
    supabaseInsertAuditLog(newLog);
  };

  // Event updates & Master creation
  const updateEvent = (updated: Partial<EventSetup>) => {
    if (role === 'general_view') return;
    setEvent(prev => {
      const next = { ...prev, ...updated };
      setEvents(list => list.map(e => (e.id === next.id ? next : e)));
      supabaseUpsertEvent(next);
      addAuditLog('EVENT_SETUP', next.name || 'Tournament Event', `Updated tournament parameters: ${Object.keys(updated).join(', ')}`);
      return next;
    });
  };

  const createOfficialEvent = (
    eventData: Partial<EventSetup>,
    _clearExistingRoster: boolean = false,
    isLive: boolean = false
  ): EventSetup => {
    if (role !== 'super_admin' && role !== 'admin') return event;
    const newId = `event-${Date.now()}`;
    const nextEvent: EventSetup = {
      ...INITIAL_EVENT,
      ...eventData,
      id: newId,
      isLive: isLive,
      createdAt: new Date().toISOString(),
    };

    setEvents(prev => [...prev.filter(e => e.id !== newId), nextEvent]);
    setEvent(nextEvent);
    supabaseUpsertEvent(nextEvent);

    // Fresh championship event scope begins completely clean and isolated
    setPlayers([]);
    setCategories([]);
    setBrackets([]);
    setSidelineJudgeScores([]);

    addAuditLog(
      'EVENT_SETUP',
      nextEvent.name || 'New Championship',
      `Super Admin created fresh isolated championship event ${newId} (status: ${isLive ? 'LIVE' : 'NOT ACTIVE'}). Prior championships preserved.`
    );
    return nextEvent;
  };

  const toggleEventLive = (eventId: string, targetLive?: boolean) => {
    if (role !== 'super_admin' && role !== 'admin') return;
    let resultingStatus = false;
    let targetName = '';

    setEvents(prev =>
      prev.map(e => {
        if (e.id === eventId) {
          resultingStatus = targetLive !== undefined ? targetLive : !e.isLive;
          targetName = e.name;
          const newStatus: 'upcoming' | 'ongoing' | 'completed' = resultingStatus
            ? 'ongoing'
            : e.status === 'completed'
            ? 'completed'
            : 'upcoming';
          const updatedEvent: EventSetup = {
            ...e,
            isLive: resultingStatus,
            status: newStatus,
          };
          supabaseUpsertEvent(updatedEvent);
          return updatedEvent;
        }
        return e;
      })
    );

    setEvent(prev => {
      if (prev.id === eventId) {
        const nextLive = targetLive !== undefined ? targetLive : !prev.isLive;
        const newStatus: 'upcoming' | 'ongoing' | 'completed' = nextLive
          ? 'ongoing'
          : prev.status === 'completed'
          ? 'completed'
          : 'upcoming';
        const updatedEvent: EventSetup = {
          ...prev,
          isLive: nextLive,
          status: newStatus,
        };
        supabaseUpsertEvent(updatedEvent);
        return updatedEvent;
      }
      return prev;
    });

    addAuditLog(
      'EVENT_STATUS_CHANGE',
      targetName || eventId,
      `Super Admin changed event status to ${
        resultingStatus ? 'LIVE (Active for all user roles)' : 'NOT ACTIVE (Restricted to Super Admin)'
      }`
    );
  };

  const switchEvent = async (eventId: string) => {
    const target = events.find(e => e.id === eventId);
    if (!target) return;
    setIsLoadingData(true);
    setEvent(target);
    // Immediately clear in-memory presentation buffer to prevent data crossover
    setPlayers([]);
    setCategories([]);
    setBrackets([]);
    setSidelineJudgeScores([]);

    try {
      const pullRes = await pullAllDataFromSupabase(eventId);
      if (pullRes.success && pullRes.data) {
        setPlayers(pullRes.data.players || []);
        setCategories(pullRes.data.categories || []);
        setBrackets(pullRes.data.brackets || []);
        setSidelineJudgeScores(pullRes.data.sidelineJudgeScores || []);
      }
    } catch (err) {
      console.error(`Error loading data for championship event ${eventId}:`, err);
    } finally {
      setIsLoadingData(false);
    }

    addAuditLog('EVENT_SETUP', target.name || eventId, `Active championship switched to: ${target.name} (${target.id})`);
  };

  const deleteEvent = (eventId: string) => {
    if (role !== 'super_admin') {
      return { success: false, error: 'Only Super Admin can delete championship events.' };
    }
    const target = events.find(e => e.id === eventId);
    if (!target) {
      return { success: false, error: 'Championship event not found.' };
    }

    const remaining = events.filter(e => e.id !== eventId);
    if (remaining.length === 0) {
      const fallbackEvent: EventSetup = {
        ...INITIAL_EVENT,
        id: `event-${Date.now()}`,
        name: 'New Championship Tournament',
        isLive: false,
        createdAt: new Date().toISOString(),
      };
      setEvents([fallbackEvent]);
      setEvent(fallbackEvent);
      supabaseUpsertEvent(fallbackEvent);
      setPlayers([]);
      setCategories([]);
      setBrackets([]);
    } else {
      setEvents(remaining);
      if (event.id === eventId) {
        setEvent(remaining[0]);
        switchEvent(remaining[0].id);
      }
    }

    supabaseDeleteEvent(eventId);
    supabaseClearPlayers(eventId);
    supabaseClearCategories(eventId);
    supabaseClearBrackets(eventId);

    addAuditLog('EVENT_DELETE', target.name || eventId, `Super Admin deleted championship event: ${target.name} (${eventId})`);
    return { success: true };
  };

  const isEventLive = Boolean(event.isLive);
  const canWorkOnEvent = role === 'super_admin' || isEventLive;

  // Age Categories Management (Super Admin & Admin)
  const setAgeCategories = (cats: AgeCategory[]) => {
    if (role !== 'super_admin' && role !== 'admin') {
      return { success: false, error: 'Permission denied: Only Super Admin and Admin can modify age classifications.' };
    }
    setAgeCategoriesState(cats);
    supabaseBulkUpsertAgeCategories(cats);
    addAuditLog('UPDATE', 'Age Categories', `Updated age classifications list (${cats.length} classifications)`);
    return { success: true };
  };

  const addAgeCategory = (catData: Omit<AgeCategory, 'id'>) => {
    if (role !== 'super_admin' && role !== 'admin') {
      return { success: false, error: 'Permission denied: Only Super Admin and Admin can create age classifications.' };
    }
    const newCat: AgeCategory = {
      ...catData,
      id: `age-cat-${Date.now()}`,
    };
    setAgeCategoriesState(prev => [...prev, newCat]);
    supabaseUpsertAgeCategory(newCat);
    addAuditLog('CREATE', `Age Category: ${newCat.name}`, `${newCat.minAge}-${newCat.maxAge} years (${newCat.status || 'active'})`);
    return { success: true, ageCategory: newCat };
  };

  const updateAgeCategory = (id: string, updated: Partial<AgeCategory>) => {
    if (role !== 'super_admin' && role !== 'admin') {
      return { success: false, error: 'Permission denied: Only Super Admin and Admin can edit age classifications.' };
    }
    const target = ageCategories.find(c => c.id === id);
    if (!target) return { success: false, error: 'Age classification not found.' };

    const mod = { ...target, ...updated };
    setAgeCategoriesState(prev => prev.map(c => (c.id === id ? mod : c)));
    supabaseUpsertAgeCategory(mod);
    addAuditLog('UPDATE', `Age Category: ${mod.name}`, `Updated age classification (${mod.minAge}-${mod.maxAge} yrs)`);
    return { success: true };
  };

  const deleteAgeCategory = (id: string) => {
    if (role !== 'super_admin' && role !== 'admin') {
      return { success: false, error: 'Permission denied: Only Super Admin and Admin can delete age classifications.' };
    }
    const target = ageCategories.find(c => c.id === id);
    if (!target) return { success: false, error: 'Age classification not found.' };

    setAgeCategoriesState(prev => prev.filter(c => c.id !== id));
    supabaseDeleteAgeCategory(id);
    addAuditLog('DELETE', `Age Category: ${target.name}`, `Removed age classification ${target.name} (${target.minAge}-${target.maxAge} yrs)`);
    return { success: true };
  };

  const resetAgeCategories = () => {
    if (role !== 'super_admin' && role !== 'admin') {
      return { success: false, error: 'Permission denied: Only Super Admin and Admin can reset age classifications.' };
    }
    setAgeCategoriesState(INITIAL_AGE_CATEGORIES);
    supabaseBulkUpsertAgeCategories(INITIAL_AGE_CATEGORIES);
    addAuditLog('UPDATE', 'Age Categories', 'Reset to official IWUF age classifications');
    return { success: true };
  };

  // Weight Categories Management (Super Admin & Admin)
  const setWeightCategories = (cats: WeightCategory[]) => {
    if (role === 'general_view') return;
    setWeightCategoriesState(cats);
    supabaseBulkUpsertWeightCategories(cats);
    addAuditLog('UPDATE', 'Weight Divisions', `Updated weight divisions list (${cats.length} divisions)`);
  };

  const addWeightCategory = (catData: Omit<WeightCategory, 'id'>) => {
    if (role === 'general_view') return;
    const newCat: WeightCategory = {
      ...catData,
      id: `wt-cat-${Date.now()}`,
    };
    setWeightCategoriesState(prev => [...prev, newCat]);
    supabaseUpsertWeightCategory(newCat);
    addAuditLog('CREATE', `Weight Division: ${newCat.name}`, `${newCat.gender} ${newCat.minWeightKg}-${newCat.maxWeightKg} kg`);
  };

  const updateWeightCategory = (id: string, updated: Partial<WeightCategory>) => {
    if (role === 'general_view') return;
    setWeightCategoriesState(prev =>
      prev.map(c => {
        if (c.id === id) {
          const mod = { ...c, ...updated };
          supabaseUpsertWeightCategory(mod);
          return mod;
        }
        return c;
      })
    );
    addAuditLog('UPDATE', `Weight Division: ${id}`, `Updated weight limits`);
  };

  const deleteWeightCategory = (id: string) => {
    if (role === 'general_view') return;
    const target = weightCategories.find(c => c.id === id);
    setWeightCategoriesState(prev => prev.filter(c => c.id !== id));
    supabaseDeleteWeightCategory(id);
    addAuditLog('DELETE', `Weight Division: ${target?.name || id}`, `Removed weight division`);
  };

  const resetWeightCategories = () => {
    if (role === 'general_view') return;
    setWeightCategoriesState(INITIAL_WEIGHT_CATEGORIES);
    supabaseBulkUpsertWeightCategories(INITIAL_WEIGHT_CATEGORIES);
    addAuditLog('UPDATE', 'Weight Divisions', 'Reset to official IWUF Sanda weight categories');
  };

  // Player operations
  const addPlayer = (playerData: Omit<Player, 'id' | 'createdAt'>) => {
    if (role === 'general_view') {
      return { success: false, error: 'General view cannot add players.' };
    }

    // Check duplicate registration or duplicate aadhar within this tournament
    const existing = players.find(
      p => p.registrationNumber.toLowerCase() === playerData.registrationNumber.toLowerCase() ||
           (p.aadharNumber && p.aadharNumber === playerData.aadharNumber)
    );
    if (existing) {
      return { success: false, error: 'Player with this Registration ID or Aadhar number already exists in this tournament.' };
    }

    const newPlayer: Player = {
      ...playerData,
      id: `p-${Date.now()}`,
      eventId: event.id,
      createdAt: new Date().toISOString(),
    };

    setPlayers(prev => [newPlayer, ...prev]);
    supabaseUpsertPlayer(newPlayer, event.id);
    addAuditLog('CREATE', `Player: ${newPlayer.name}`, `Reg #${newPlayer.registrationNumber}, Club: ${newPlayer.clubSchool}, Weight: ${newPlayer.weightKg}kg for ${event.name}`);
    return { success: true, player: newPlayer };
  };

  const updatePlayer = (id: string, playerData: Partial<Player>) => {
    if (role === 'general_view') {
      return { success: false, error: 'General view cannot edit players.' };
    }
    const target = players.find(p => p.id === id);
    if (!target) return { success: false, error: 'Player not found.' };

    const updatedPlayer: Player = { ...target, ...playerData, eventId: event.id };
    setPlayers(prev => prev.map(p => (p.id === id ? updatedPlayer : p)));
    supabaseUpsertPlayer(updatedPlayer, event.id);
    addAuditLog('UPDATE', `Player: ${target.name}`, `Updated details: ${Object.keys(playerData).join(', ')}`);
    return { success: true };
  };

  const deletePlayer = (id: string) => {
    // Only Super Admin can delete records according to PRD!
    if (role !== 'super_admin') {
      return { success: false, error: 'Permission denied: Only Super Admin is permitted to delete player records.' };
    }
    const target = players.find(p => p.id === id);
    if (!target) return { success: false, error: 'Player not found.' };

    setPlayers(prev => prev.filter(p => p.id !== id));
    supabaseDeletePlayer(id);
    addAuditLog('DELETE', `Player: ${target.name}`, `Reg #${target.registrationNumber} deleted permanently by Super Admin.`);
    return { success: true };
  };

  const bulkAddPlayers = (playersData: Omit<Player, 'id' | 'createdAt'>[], replace: boolean = false) => {
    if (role === 'general_view') return { added: 0, duplicates: 0 };
    let added = 0;
    let duplicates = 0;

    const existingRegs = new Set(
      replace ? [] : players.map(p => p.registrationNumber.trim().toLowerCase())
    );
    const existingAadhars = new Set(
      replace ? [] : players.filter(p => p.aadharNumber).map(p => p.aadharNumber.trim().toLowerCase())
    );

    const validNewPlayers: Player[] = [];

    playersData.forEach((p, idx) => {
      const reg = (p.registrationNumber || `WUS-${Date.now()}-${idx + 1}`).trim().toLowerCase();
      const aadhar = (p.aadharNumber || '').trim().toLowerCase();

      if (existingRegs.has(reg) || (aadhar && existingAadhars.has(aadhar))) {
        duplicates++;
        return;
      }

      existingRegs.add(reg);
      if (aadhar) existingAadhars.add(aadhar);

      validNewPlayers.push({
        ...p,
        id: `p-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        eventId: event.id,
        createdAt: new Date().toISOString(),
      });
      added++;
    });

    if (replace) {
      setPlayers(validNewPlayers);
      supabaseClearPlayers(event.id).then(() => supabaseBulkUpsertPlayers(validNewPlayers, event.id));
    } else {
      setPlayers(prev => [...validNewPlayers, ...prev]);
      supabaseBulkUpsertPlayers(validNewPlayers, event.id);
    }

    addAuditLog(
      'CREATE',
      'Bulk Athlete Import',
      `Imported ${added} athletes (${duplicates} duplicate registrations skipped) into ${event.name}`
    );

    return { added, duplicates };
  };

  const clearAllPlayers = () => {
    if (role !== 'super_admin') return;
    saveSafetySnapshot('pre_clear_players');
    setPlayers([]);
    setCategories([]);
    setBrackets([]);
    supabaseClearPlayers(event.id);
    supabaseClearCategories(event.id);
    supabaseClearBrackets(event.id);
    addAuditLog('DELETE', 'All Athletes', `Super Admin cleared player database and fixtures for event ${event.name} (${event.id})`);
  };

  const clearAllCategoriesAndBrackets = () => {
    if (role !== 'super_admin' && role !== 'admin') return;
    saveSafetySnapshot('pre_clear_fixtures');
    setCategories([]);
    setBrackets([]);
    supabaseClearCategories(event.id);
    supabaseClearBrackets(event.id);
    addAuditLog('DELETE', 'Categories & Fixtures', `Super Admin cleared all divisions and tournament brackets for ${event.name} (${event.id})`);
  };

  // Category operations
  const createCategory = (catData: Omit<Category, 'id' | 'isLocked' | 'eligiblePlayerIds'>): Category => {
    // Automatically query eligible players
    const ageCat = ageCategories.find(a => a.id === catData.ageCategoryId);
    const weightCat = weightCategories.find(w => w.id === catData.weightCategoryId);

    const eligible = players.filter(p => {
      if (p.gender !== catData.gender) return false;
      if (catData.districtFilter && p.district !== catData.districtFilter) return false;
      if (catData.clubFilter && p.clubSchool !== catData.clubFilter) return false;
      
      // Check weight
      if (weightCat && (p.weightKg < weightCat.minWeightKg || p.weightKg > weightCat.maxWeightKg)) {
        return false;
      }
      // Check age on reference date
      if (ageCat) {
        const age = calculateAge(p.dob, event.tournamentReferenceDate);
        if (age < ageCat.minAge || age > ageCat.maxAge) return false;
      }
      return true;
    });

    const newCategory: Category = {
      ...catData,
      id: `cat-${Date.now()}`,
      eventId: event.id,
      isLocked: false,
      eligiblePlayerIds: eligible.map(e => e.id),
    };

    setCategories(prev => [...prev, newCategory]);
    supabaseUpsertCategory(newCategory, event.id);
    addAuditLog('CREATE', `Category: ${newCategory.name}`, `Created division in ${event.name} with ${eligible.length} matched fighters.`);
    return newCategory;
  };

  const lockCategory = (categoryId: string) => {
    if (role === 'general_view') return;
    setCategories(prev =>
      prev.map(c => {
        if (c.id === categoryId) {
          const mod: Category = {
            ...c,
            eventId: event.id,
            isLocked: true,
            confirmedAt: new Date().toISOString(),
            confirmedBy: currentUser.name,
          };
          supabaseUpsertCategory(mod, event.id);
          addAuditLog('LOCK_CATEGORY', `Category: ${c.name}`, `Locked eligible roster (${c.eligiblePlayerIds.length} fighters) for fixture generation.`);
          return mod;
        }
        return c;
      })
    );
  };

  const unlockCategory = (categoryId: string) => {
    if (role !== 'super_admin' && role !== 'admin') return;
    setCategories(prev =>
      prev.map(c => {
        if (c.id === categoryId) {
          const mod: Category = {
            ...c,
            eventId: event.id,
            isLocked: false,
            confirmedAt: undefined,
            confirmedBy: undefined,
          };
          supabaseUpsertCategory(mod, event.id);
          addAuditLog('UPDATE', `Category: ${c.name}`, `Unlocked category roster by ${currentUser.name}.`);
          return mod;
        }
        return c;
      })
    );
  };

  const deleteCategory = (categoryId: string) => {
    if (role !== 'super_admin') {
      return { success: false, error: 'Permission denied: Only Super Admin can delete categories.' };
    }
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return { success: false, error: 'Category not found.' };

    const assocBrackets = brackets.filter(b => b.categoryId === categoryId);
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    setBrackets(prev => prev.filter(b => b.categoryId !== categoryId));
    
    supabaseDeleteCategory(categoryId);
    assocBrackets.forEach(b => supabaseDeleteBracket(b.id));

    addAuditLog('DELETE', `Category: ${cat.name}`, `Deleted category and associated brackets.`);
    return { success: true };
  };

  // Bracket generation
  const generateBracketForCategory = (categoryId: string, randomize: boolean = false) => {
    if (role === 'general_view') {
      return { success: false, error: 'Permission denied.' };
    }

    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return { success: false, error: 'Category not found.' };

    const catPlayers = players.filter(p => cat.eligiblePlayerIds.includes(p.id));
    if (catPlayers.length < 2) {
      return { success: false, error: 'At least 2 eligible players are required to build a single-elimination fixture bracket.' };
    }

    try {
      const bracket = generateKnockoutBracket(catPlayers, cat, event, randomize);
      bracket.eventId = event.id;
      
      setBrackets(prev => {
        const filtered = prev.filter(b => b.categoryId !== categoryId);
        return [...filtered, bracket];
      });
      supabaseUpsertBracket(bracket, event.id);

      addAuditLog(
        'BRACKET_GENERATE',
        `Category: ${cat.name}`,
        `Generated ${bracket.rounds.length}-round single-elimination tree (${catPlayers.length} competitors) with automatic BYE routing.`
      );

      return { success: true, bracket };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate bracket.';
      return { success: false, error: msg };
    }
  };

  const regenerateBracketForCategory = (categoryId: string, reason: string) => {
    if (role !== 'super_admin' && role !== 'admin') {
      return { success: false, error: 'Regenerating an existing tournament bracket requires Admin or Super Admin privileges.' };
    }

    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return { success: false, error: 'Category not found.' };

    const catPlayers = players.filter(p => cat.eligiblePlayerIds.includes(p.id));
    try {
      const bracket = generateKnockoutBracket(catPlayers, cat, event, true);
      bracket.eventId = event.id;
      setBrackets(prev => {
        const filtered = prev.filter(b => b.categoryId !== categoryId);
        return [...filtered, bracket];
      });
      supabaseUpsertBracket(bracket, event.id);

      addAuditLog(
        'BRACKET_REGENERATE',
        `Category: ${cat.name}`,
        `Regenerated bracket fixture tree. Reason: "${reason}". Authorized by ${currentUser.name}.`
      );

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to regenerate bracket.';
      return { success: false, error: msg };
    }
  };

  // Super Admin Fixture Edit
  const updateBracketFixture = (
    bracketId: string,
    updatedBracket: Bracket,
    auditTarget: string,
    auditDetails: string,
    individualLogs?: { target: string; details: string; action?: AuditLog['action'] }[]
  ): { success: boolean; error?: string } => {
    if (role !== 'super_admin') {
      return {
        success: false,
        error: 'Permission denied: Only Super Admin can edit generated tournament fixtures.',
      };
    }

    const existingBracket = brackets.find(b => b.id === bracketId);
    if (!existingBracket) {
      return { success: false, error: 'Bracket not found.' };
    }

    const bracketWithEvent = { ...updatedBracket, eventId: event.id };

    // Update in-memory state immediately
    setBrackets(prev => prev.map(b => (b.id === bracketId ? bracketWithEvent : b)));

    // Sync to Supabase PostgreSQL database
    supabaseUpsertBracket(bracketWithEvent, event.id);

    // Record audit log entry: individual per modified bout if provided, plus overall summary
    if (individualLogs && individualLogs.length > 0) {
      individualLogs.forEach(entry => {
        addAuditLog(entry.action || 'FIXTURE_EDIT', entry.target, entry.details);
      });
    } else {
      addAuditLog('FIXTURE_EDIT', auditTarget, auditDetails);
    }

    return { success: true };
  };

  // Super Admin: Move Player Between Generated Bouts
  const movePlayerInFixture = (
    bracketId: string,
    sourceBoutId: string,
    sourceCorner: 'red' | 'blue',
    destBoutId: string,
    destCorner: 'red' | 'blue'
  ): { success: boolean; error?: string; updatedBracket?: Bracket } => {
    if (role !== 'super_admin') {
      return {
        success: false,
        error: 'Permission denied: Only Super Admin can move fixture players.',
      };
    }

    const currentBracket = brackets.find(b => b.id === bracketId);
    if (!currentBracket) {
      return { success: false, error: 'Bracket not found.' };
    }

    let sourceBout: Bout | null = null;
    let destBout: Bout | null = null;

    for (const r of currentBracket.rounds) {
      for (const b of r.bouts) {
        if (b.id === sourceBoutId) sourceBout = b;
        if (b.id === destBoutId) destBout = b;
      }
    }

    if (!sourceBout || !destBout) {
      return { success: false, error: 'Source or destination bout not found.' };
    }

    const isSourceLocked =
      sourceBout.resultLocked ||
      sourceBout.status.startsWith('winner_') ||
      sourceBout.status === 'completed' ||
      sourceBout.status === 'live';
    const isDestLocked =
      destBout.resultLocked ||
      destBout.status.startsWith('winner_') ||
      destBout.status === 'completed' ||
      destBout.status === 'live';

    if (isSourceLocked || isDestLocked) {
      return {
        success: false,
        error: 'This bout is locked because a result has already been submitted.',
      };
    }

    const movingPlayerName =
      sourceCorner === 'red' ? sourceBout.redPlayerName : sourceBout.bluePlayerName;

    if (!movingPlayerName) {
      return { success: false, error: 'No player found at source position.' };
    }

    const updatedBracket = applyMovePlayerInBracket(
      currentBracket,
      sourceBoutId,
      sourceCorner,
      destBoutId,
      destCorner
    );

    // Validate duplicate protection
    const dupCheck = validateBracketNoDuplicates(updatedBracket);
    if (!dupCheck.isValid) {
      return {
        success: false,
        error: `Player ${dupCheck.duplicatePlayerName} is already assigned to another active bout.`,
      };
    }

    // Persist immediately to memory & Supabase
    setBrackets(prev => prev.map(b => (b.id === bracketId ? updatedBracket : b)));
    supabaseUpsertBracket(updatedBracket);

    addAuditLog(
      'FIXTURE_PLAYER_MOVE',
      `Bout ${sourceBout.boutNumber} → ${destBout.boutNumber}`,
      `Player: ${movingPlayerName}; From: ${sourceBout.boutNumber} ${sourceCorner.toUpperCase()}; To: ${destBout.boutNumber} ${destCorner.toUpperCase()}; User: ${currentUser.name}; Role: super_admin`
    );

    return { success: true, updatedBracket };
  };

  // Super Admin: Swap Two Players Between Bouts
  const swapPlayersInFixture = (
    bracketId: string,
    boutIdA: string,
    cornerA: 'red' | 'blue',
    boutIdB: string,
    cornerB: 'red' | 'blue'
  ): { success: boolean; error?: string; updatedBracket?: Bracket } => {
    if (role !== 'super_admin') {
      return {
        success: false,
        error: 'Permission denied: Only Super Admin can swap fixture players.',
      };
    }

    const currentBracket = brackets.find(b => b.id === bracketId);
    if (!currentBracket) {
      return { success: false, error: 'Bracket not found.' };
    }

    let boutA: Bout | null = null;
    let boutB: Bout | null = null;

    for (const r of currentBracket.rounds) {
      for (const b of r.bouts) {
        if (b.id === boutIdA) boutA = b;
        if (b.id === boutIdB) boutB = b;
      }
    }

    if (!boutA || !boutB) {
      return { success: false, error: 'Target bouts not found.' };
    }

    const isALocked =
      boutA.resultLocked ||
      boutA.status.startsWith('winner_') ||
      boutA.status === 'completed' ||
      boutA.status === 'live';
    const isBLocked =
      boutB.resultLocked ||
      boutB.status.startsWith('winner_') ||
      boutB.status === 'completed' ||
      boutB.status === 'live';

    if (isALocked || isBLocked) {
      return {
        success: false,
        error: 'This bout is locked because a result has already been submitted.',
      };
    }

    const playerAName = cornerA === 'red' ? boutA.redPlayerName : boutA.bluePlayerName;
    const playerBName = cornerB === 'red' ? boutB.redPlayerName : boutB.bluePlayerName;

    const updatedBracket = applySwapPlayersInBracket(
      currentBracket,
      boutIdA,
      cornerA,
      boutIdB,
      cornerB
    );

    // Validate duplicate protection
    const dupCheck = validateBracketNoDuplicates(updatedBracket);
    if (!dupCheck.isValid) {
      return {
        success: false,
        error: `Player ${dupCheck.duplicatePlayerName} is already assigned to another active bout.`,
      };
    }

    setBrackets(prev => prev.map(b => (b.id === bracketId ? updatedBracket : b)));
    supabaseUpsertBracket(updatedBracket);

    addAuditLog(
      'FIXTURE_PLAYER_SWAP',
      `Bout ${boutA.boutNumber} ⇄ ${boutB.boutNumber}`,
      `${playerAName}: ${boutA.boutNumber} ${cornerA.toUpperCase()} → ${boutB.boutNumber} ${cornerB.toUpperCase()}; ${playerBName}: ${boutB.boutNumber} ${cornerB.toUpperCase()} → ${boutA.boutNumber} ${cornerA.toUpperCase()}; User: ${currentUser.name}; Role: super_admin`
    );

    return { success: true, updatedBracket };
  };

  // Tournament Admin: Assign Entire Category to a Competition Platform
  const assignCategoryToPlatform = (
    categoryId: string,
    platformName: string
  ): { success: boolean; error?: string } => {
    if (role !== 'super_admin' && role !== 'admin') {
      return {
        success: false,
        error: 'Permission denied: Only Tournament Administrators can assign categories to platforms.',
      };
    }

    const bracket = brackets.find(b => b.categoryId === categoryId);
    if (!bracket) {
      return { success: false, error: 'Bracket for this category not found. Please generate the bracket first.' };
    }

    const cat = categories.find(c => c.id === categoryId);
    const categoryName = cat?.name || 'Category';

    // Update all bouts in all rounds to the chosen platform
    const updatedRounds = bracket.rounds.map(r => ({
      ...r,
      bouts: r.bouts.map(bout => ({
        ...bout,
        ring: platformName,
      })),
    }));

    const updatedBracket: Bracket = {
      ...bracket,
      rounds: updatedRounds,
      eventId: bracket.eventId || event.id,
    };

    setBrackets(prev => prev.map(b => (b.id === bracket.id ? updatedBracket : b)));
    supabaseUpsertBracket(updatedBracket, event.id);

    addAuditLog(
      'FIXTURE_EDIT',
      `Category: ${categoryName}`,
      `Tournament Admin assigned all bouts in ${categoryName} to ${platformName}. Official: ${currentUser.name}`
    );

    return { success: true };
  };

  // Tournament Admin: Assign Individual Bout to a Competition Platform
  const assignBoutToPlatform = (
    bracketId: string,
    boutId: string,
    platformName: string
  ): { success: boolean; error?: string } => {
    if (role !== 'super_admin' && role !== 'admin') {
      return {
        success: false,
        error: 'Permission denied: Only Tournament Administrators can assign bouts to platforms.',
      };
    }

    const bracket = brackets.find(b => b.id === bracketId);
    if (!bracket) {
      return { success: false, error: 'Bracket not found.' };
    }

    let targetBoutNumber = '';
    const updatedRounds = bracket.rounds.map(r => ({
      ...r,
      bouts: r.bouts.map(bout => {
        if (bout.id === boutId) {
          targetBoutNumber = bout.boutNumber;
          return {
            ...bout,
            ring: platformName,
          };
        }
        return bout;
      }),
    }));

    const updatedBracket: Bracket = {
      ...bracket,
      rounds: updatedRounds,
      eventId: bracket.eventId || event.id,
    };

    setBrackets(prev => prev.map(b => (b.id === bracketId ? updatedBracket : b)));
    supabaseUpsertBracket(updatedBracket, event.id);

    addAuditLog(
      'FIXTURE_EDIT',
      `Bout ${targetBoutNumber || boutId}`,
      `Tournament Admin routed Bout ${targetBoutNumber || boutId} to ${platformName}. Official: ${currentUser.name}`
    );

    return { success: true };
  };

  // Live scoring actions
  const recordBoutScoreEvent = (boutId: string, scoreEvent: Omit<ScoreEvent, 'id' | 'timestamp'>) => {
    if (role === 'general_view') return;

    const fullEvent: ScoreEvent = {
      ...scoreEvent,
      id: `se-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: Date.now(),
    };

    setBrackets(prev =>
      prev.map(b => {
        let bracketChanged = false;
        const nextRounds = b.rounds.map(round => ({
          ...round,
          bouts: round.bouts.map(bout => {
            if (bout.id === boutId) {
              bracketChanged = true;
              const updatedScoreEvents = [...bout.scoreEvents, fullEvent];
              // Update round points
              const updatedRounds = bout.rounds.map(r => {
                if (r.roundNumber === scoreEvent.roundNumber) {
                  return {
                    ...r,
                    redPoints: scoreEvent.corner === 'red' ? Math.max(0, r.redPoints + scoreEvent.points) : r.redPoints,
                    bluePoints: scoreEvent.corner === 'blue' ? Math.max(0, r.bluePoints + scoreEvent.points) : r.bluePoints,
                  };
                }
                return r;
              });

              const updatedBout: Bout = {
                ...bout,
                status: 'live',
                scoreEvents: updatedScoreEvents,
                rounds: updatedRounds,
              };

              if (activeBoutForScoring?.id === boutId) {
                setActiveBoutForScoring(updatedBout);
              }
              return updatedBout;
            }
            return bout;
          }),
        }));

        if (bracketChanged) {
          const modBracket = { ...b, rounds: nextRounds };
          supabaseUpsertBracket(modBracket);
          return modBracket;
        }
        return b;
      })
    );
  };

  const updateBoutRoundScore = (boutId: string, roundNumber: number, redDelta: number, blueDelta: number) => {
    if (role === 'general_view') return;

    setBrackets(prev =>
      prev.map(b => {
        let bracketChanged = false;
        const nextRounds = b.rounds.map(round => ({
          ...round,
          bouts: round.bouts.map(bout => {
            if (bout.id === boutId) {
              bracketChanged = true;
              const updatedRounds = bout.rounds.map(r => {
                if (r.roundNumber === roundNumber) {
                  return {
                    ...r,
                    redPoints: Math.max(0, r.redPoints + redDelta),
                    bluePoints: Math.max(0, r.bluePoints + blueDelta),
                  };
                }
                return r;
              });
              const updatedBout: Bout = { ...bout, status: 'live', rounds: updatedRounds };
              if (activeBoutForScoring?.id === boutId) {
                setActiveBoutForScoring(updatedBout);
              }
              return updatedBout;
            }
            return bout;
          }),
        }));

        if (bracketChanged) {
          const modBracket = { ...b, rounds: nextRounds };
          supabaseUpsertBracket(modBracket);
          return modBracket;
        }
        return b;
      })
    );
  };

  const recordBoutExit = (boutId: string, roundNumber: number, corner: 'red' | 'blue') => {
    if (role === 'general_view') return;

    setBrackets(prev =>
      prev.map(b => {
        let bracketChanged = false;
        const nextRounds = b.rounds.map(round => ({
          ...round,
          bouts: round.bouts.map(bout => {
            if (bout.id === boutId) {
              bracketChanged = true;
              const updatedRounds = bout.rounds.map(r => {
                if (r.roundNumber === roundNumber) {
                  // In Sanda, forcing opponent off the Leitai earns 2 points to the other corner!
                  return {
                    ...r,
                    redExits: corner === 'red' ? r.redExits + 1 : r.redExits,
                    blueExits: corner === 'blue' ? r.blueExits + 1 : r.blueExits,
                    // Opponent gets 2 points
                    redPoints: corner === 'blue' ? r.redPoints + 2 : r.redPoints,
                    bluePoints: corner === 'red' ? r.bluePoints + 2 : r.bluePoints,
                  };
                }
                return r;
              });

              const exitEvent: ScoreEvent = {
                id: `se-${Date.now()}`,
                roundNumber,
                corner,
                actionType: 'leitai_exit',
                points: 0,
                timestamp: Date.now(),
                description: `${corner === 'red' ? 'Red' : 'Blue'} fighter stepped off Leitai platform (+2 pts to opponent)`,
              };

              const updatedBout: Bout = {
                ...bout,
                status: 'live',
                rounds: updatedRounds,
                scoreEvents: [...bout.scoreEvents, exitEvent],
              };
              if (activeBoutForScoring?.id === boutId) {
                setActiveBoutForScoring(updatedBout);
              }
              return updatedBout;
            }
            return bout;
          }),
        }));

        if (bracketChanged) {
          const modBracket = { ...b, rounds: nextRounds };
          supabaseUpsertBracket(modBracket);
          return modBracket;
        }
        return b;
      })
    );
  };

  const recordBoutWarning = (boutId: string, roundNumber: number, corner: 'red' | 'blue') => {
    if (role === 'general_view') return;

    setBrackets(prev =>
      prev.map(b => {
        let bracketChanged = false;
        const nextRounds = b.rounds.map(round => ({
          ...round,
          bouts: round.bouts.map(bout => {
            if (bout.id === boutId) {
              bracketChanged = true;
              const updatedRounds = bout.rounds.map(r => {
                if (r.roundNumber === roundNumber) {
                  return {
                    ...r,
                    redWarnings: corner === 'red' ? r.redWarnings + 1 : r.redWarnings,
                    blueWarnings: corner === 'blue' ? r.blueWarnings + 1 : r.blueWarnings,
                    // Warning penalizes 1 point
                    redPoints: corner === 'red' ? Math.max(0, r.redPoints - 1) : r.redPoints,
                    bluePoints: corner === 'blue' ? Math.max(0, r.bluePoints - 1) : r.bluePoints,
                  };
                }
                return r;
              });

              const warnEvent: ScoreEvent = {
                id: `se-${Date.now()}`,
                roundNumber,
                corner,
                actionType: 'warning',
                points: -1,
                timestamp: Date.now(),
                description: `Official Warning to ${corner === 'red' ? 'Red' : 'Blue'} corner (-1 pt deduction)`,
              };

              const updatedBout: Bout = {
                ...bout,
                rounds: updatedRounds,
                scoreEvents: [...bout.scoreEvents, warnEvent],
              };
              if (activeBoutForScoring?.id === boutId) {
                setActiveBoutForScoring(updatedBout);
              }
              return updatedBout;
            }
            return bout;
          }),
        }));

        if (bracketChanged) {
          const modBracket = { ...b, rounds: nextRounds };
          supabaseUpsertBracket(modBracket);
          return modBracket;
        }
        return b;
      })
    );
  };

  const submitBoutResult = (
    boutId: string,
    winnerCorner: 'red' | 'blue',
    status: BoutStatus,
    winningReason: string
  ) => {
    if (role === 'general_view') {
      return { success: false, error: 'General view cannot submit fight scores.' };
    }

    let targetBracket: Bracket | null = null;
    let targetBout: Bout | null = null;

    for (const b of brackets) {
      const found = findBoutInRounds(b.rounds, boutId);
      if (found) {
        targetBracket = b;
        targetBout = found;
        break;
      }
    }

    if (!targetBracket || !targetBout) {
      return { success: false, error: 'Bout not found in active brackets.' };
    }

    const winnerId = winnerCorner === 'red' ? targetBout.redPlayerId : targetBout.bluePlayerId;
    if (!winnerId) {
      return { success: false, error: 'Winner player slot is empty.' };
    }

    const winnerName = winnerCorner === 'red' ? targetBout.redPlayerName : targetBout.bluePlayerName;

    const advancedBracket = advanceWinnerInBracket(
      targetBracket,
      boutId,
      winnerId,
      winnerCorner,
      status,
      winningReason,
      players
    );

    setBrackets(prev => prev.map(b => (b.id === advancedBracket.id ? advancedBracket : b)));
    supabaseUpsertBracket(advancedBracket);

    // Clear active scoring bout or update it
    const updatedTargetBout = findBoutInRounds(advancedBracket.rounds, boutId);
    if (activeBoutForScoring?.id === boutId) {
      setActiveBoutForScoring(updatedTargetBout);
    }

    addAuditLog(
      'SCORE_SUBMIT',
      `Bout ${targetBout.boutNumber} (${targetBout.roundName})`,
      `${winnerName} declared winner (${winningReason}). Result finalized & advanced to next bracket round by ${currentUser.name}.`
    );

    return { success: true };
  };

  const reopenBoutResult = (boutId: string, reason: string) => {
    if (role !== 'super_admin' && role !== 'admin') {
      return { success: false, error: 'Reopening a finalized bout requires Admin or Super Admin authorization.' };
    }

    let targetBracket: Bracket | null = null;
    let targetBout: Bout | null = null;

    for (const b of brackets) {
      const found = findBoutInRounds(b.rounds, boutId);
      if (found) {
        targetBracket = b;
        targetBout = found;
        break;
      }
    }

    if (!targetBracket || !targetBout) {
      return { success: false, error: 'Bout not found.' };
    }

    const reopenedBracket = reopenBoutInBracket(targetBracket, boutId, reason);
    setBrackets(prev => prev.map(b => (b.id === reopenedBracket.id ? reopenedBracket : b)));
    supabaseUpsertBracket(reopenedBracket);

    const reopenedBout = findBoutInRounds(reopenedBracket.rounds, boutId);
    if (activeBoutForScoring?.id === boutId) {
      setActiveBoutForScoring(reopenedBout);
    }

    addAuditLog(
      'RESULT_REOPEN',
      `Bout ${targetBout.boutNumber}`,
      `Reopened for correction. Reason: "${reason}". Authorized by ${currentUser.name} (${role}).`
    );

    return { success: true };
  };

  // ----------------------------------------------------
  // JUDGE-ONLY SIDELINE SCORING FOR OFFICIAL LEITAI SCORING
  // ----------------------------------------------------
  const validateJudgeAccessForBout = (bout: Bout): { allowed: boolean; reason?: string } => {
    if (!isLoggedIn) {
      return {
        allowed: false,
        reason: 'Authentication required. Spectators and unauthenticated users cannot access sideline judge scoring.',
      };
    }
    // Super admins and admins have tournament-wide jurisdiction
    if (role === 'super_admin' || role === 'admin') {
      return { allowed: true };
    }

    // Officials and Sideline Judges: strict arena verification
    const judgeRing = currentUser.assignedRing || currentUser.ringAssignment;
    if (!judgeRing || !judgeRing.trim()) {
      return {
        allowed: false,
        reason: 'No arena has been assigned to your account. Scoring actions are blocked until an arena is designated.',
      };
    }

    if (!isArenaMatch(judgeRing, bout.ring)) {
      return {
        allowed: false,
        reason: `Access Denied: Bout ${bout.boutNumber} is assigned to ${bout.ring}. Your official credentials are only authorized for ${judgeRing}. Cross-arena scoring is strictly prohibited.`,
      };
    }

    return { allowed: true };
  };

  const recordSidelineScoreAction = (
    boutId: string,
    roundNumber: number,
    corner: 'red' | 'blue',
    actionType: SidelineScoreEvent['actionType'],
    points: number,
    desc: string
  ): { success: boolean; error?: string } => {
    let targetBout: Bout | null = null;
    for (const b of brackets) {
      const found = findBoutInRounds(b.rounds, boutId);
      if (found) {
        targetBout = found;
        break;
      }
    }
    if (!targetBout) {
      return { success: false, error: 'Bout not found in active tournament brackets.' };
    }

    const access = validateJudgeAccessForBout(targetBout);
    if (!access.allowed) {
      return { success: false, error: access.reason };
    }

    const scoreId = `sjs-${boutId}-${currentUser.id}-r${roundNumber}`;
    const existing = sidelineJudgeScores.find(s => s.id === scoreId);

    if (existing && existing.isSubmitted) {
      return {
        success: false,
        error: 'This round scorecard has already been submitted and locked. Click "Amend Scorecard" to make corrections.',
      };
    }

    const eventId = targetBout.eventId || event.id;
    const arena = currentUser.assignedRing || currentUser.ringAssignment || targetBout.ring;

    const newScoreEvent: SidelineScoreEvent = {
      id: `sse-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      roundNumber,
      corner,
      actionType,
      points,
      timestamp: Date.now(),
      description: desc,
    };

    const currentRedPoints = existing ? existing.redPoints : 0;
    const currentBluePoints = existing ? existing.bluePoints : 0;

    const updatedScore: SidelineJudgeScore = {
      id: scoreId,
      boutId,
      eventId,
      arena,
      judgeId: currentUser.id,
      judgeName: currentUser.name,
      roundNumber,
      redPoints: corner === 'red' ? Math.max(0, currentRedPoints + points) : currentRedPoints,
      bluePoints: corner === 'blue' ? Math.max(0, currentBluePoints + points) : currentBluePoints,
      redExits: existing ? existing.redExits : 0,
      blueExits: existing ? existing.blueExits : 0,
      redWarnings: existing ? existing.redWarnings : 0,
      blueWarnings: existing ? existing.blueWarnings : 0,
      scoreEvents: existing ? [...existing.scoreEvents, newScoreEvent] : [newScoreEvent],
      isSubmitted: false,
      updatedAt: new Date().toISOString(),
    };

    setSidelineJudgeScores(prev => {
      const idx = prev.findIndex(s => s.id === scoreId);
      if (idx >= 0) return prev.map(s => (s.id === scoreId ? updatedScore : s));
      return [...prev, updatedScore];
    });

    supabaseUpsertSidelineJudgeScore(updatedScore);
    return { success: true };
  };

  const recordSidelineExit = (
    boutId: string,
    roundNumber: number,
    corner: 'red' | 'blue'
  ): { success: boolean; error?: string } => {
    let targetBout: Bout | null = null;
    for (const b of brackets) {
      const found = findBoutInRounds(b.rounds, boutId);
      if (found) {
        targetBout = found;
        break;
      }
    }
    if (!targetBout) return { success: false, error: 'Bout not found.' };

    const access = validateJudgeAccessForBout(targetBout);
    if (!access.allowed) return { success: false, error: access.reason };

    const scoreId = `sjs-${boutId}-${currentUser.id}-r${roundNumber}`;
    const existing = sidelineJudgeScores.find(s => s.id === scoreId);
    if (existing && existing.isSubmitted) {
      return { success: false, error: 'Scorecard is submitted and locked. Amend first to modify.' };
    }

    const eventId = targetBout.eventId || event.id;
    const arena = currentUser.assignedRing || currentUser.ringAssignment || targetBout.ring;

    const exitEvent: SidelineScoreEvent = {
      id: `sse-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      roundNumber,
      corner,
      actionType: 'leitai_exit',
      points: 0,
      timestamp: Date.now(),
      description: `${corner === 'red' ? 'Red' : 'Blue'} fighter Leitai exit recorded by Judge (+2 pts to opponent)`,
    };

    const currentRedPoints = existing ? existing.redPoints : 0;
    const currentBluePoints = existing ? existing.bluePoints : 0;
    const currentRedExits = existing ? existing.redExits : 0;
    const currentBlueExits = existing ? existing.blueExits : 0;

    const updatedScore: SidelineJudgeScore = {
      id: scoreId,
      boutId,
      eventId,
      arena,
      judgeId: currentUser.id,
      judgeName: currentUser.name,
      roundNumber,
      redPoints: corner === 'blue' ? currentRedPoints + 2 : currentRedPoints,
      bluePoints: corner === 'red' ? currentBluePoints + 2 : currentBluePoints,
      redExits: corner === 'red' ? currentRedExits + 1 : currentRedExits,
      blueExits: corner === 'blue' ? currentBlueExits + 1 : currentBlueExits,
      redWarnings: existing ? existing.redWarnings : 0,
      blueWarnings: existing ? existing.blueWarnings : 0,
      scoreEvents: existing ? [...existing.scoreEvents, exitEvent] : [exitEvent],
      isSubmitted: false,
      updatedAt: new Date().toISOString(),
    };

    setSidelineJudgeScores(prev => {
      const idx = prev.findIndex(s => s.id === scoreId);
      if (idx >= 0) return prev.map(s => (s.id === scoreId ? updatedScore : s));
      return [...prev, updatedScore];
    });

    supabaseUpsertSidelineJudgeScore(updatedScore);
    return { success: true };
  };

  const recordSidelineWarning = (
    boutId: string,
    roundNumber: number,
    corner: 'red' | 'blue'
  ): { success: boolean; error?: string } => {
    let targetBout: Bout | null = null;
    for (const b of brackets) {
      const found = findBoutInRounds(b.rounds, boutId);
      if (found) {
        targetBout = found;
        break;
      }
    }
    if (!targetBout) return { success: false, error: 'Bout not found.' };

    const access = validateJudgeAccessForBout(targetBout);
    if (!access.allowed) return { success: false, error: access.reason };

    const scoreId = `sjs-${boutId}-${currentUser.id}-r${roundNumber}`;
    const existing = sidelineJudgeScores.find(s => s.id === scoreId);
    if (existing && existing.isSubmitted) {
      return { success: false, error: 'Scorecard is submitted and locked. Amend first to modify.' };
    }

    const eventId = targetBout.eventId || event.id;
    const arena = currentUser.assignedRing || currentUser.ringAssignment || targetBout.ring;

    const warnEvent: SidelineScoreEvent = {
      id: `sse-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      roundNumber,
      corner,
      actionType: 'warning',
      points: 0,
      timestamp: Date.now(),
      description: `${corner === 'red' ? 'Red' : 'Blue'} warning recorded by Judge`,
    };

    const currentRedWarnings = existing ? existing.redWarnings : 0;
    const currentBlueWarnings = existing ? existing.blueWarnings : 0;

    const updatedScore: SidelineJudgeScore = {
      id: scoreId,
      boutId,
      eventId,
      arena,
      judgeId: currentUser.id,
      judgeName: currentUser.name,
      roundNumber,
      redPoints: existing ? existing.redPoints : 0,
      bluePoints: existing ? existing.bluePoints : 0,
      redExits: existing ? existing.redExits : 0,
      blueExits: existing ? existing.blueExits : 0,
      redWarnings: corner === 'red' ? currentRedWarnings + 1 : currentRedWarnings,
      blueWarnings: corner === 'blue' ? currentBlueWarnings + 1 : currentBlueWarnings,
      scoreEvents: existing ? [...existing.scoreEvents, warnEvent] : [warnEvent],
      isSubmitted: false,
      updatedAt: new Date().toISOString(),
    };

    setSidelineJudgeScores(prev => {
      const idx = prev.findIndex(s => s.id === scoreId);
      if (idx >= 0) return prev.map(s => (s.id === scoreId ? updatedScore : s));
      return [...prev, updatedScore];
    });

    supabaseUpsertSidelineJudgeScore(updatedScore);
    return { success: true };
  };

  const undoLastSidelineAction = (
    boutId: string,
    roundNumber: number
  ): { success: boolean; error?: string } => {
    const scoreId = `sjs-${boutId}-${currentUser.id}-r${roundNumber}`;
    const existing = sidelineJudgeScores.find(s => s.id === scoreId);
    if (!existing || existing.scoreEvents.length === 0) {
      return { success: false, error: 'No score events to undo in this round.' };
    }
    if (existing.isSubmitted) {
      return { success: false, error: 'Scorecard is already submitted and locked.' };
    }

    const lastEvent = existing.scoreEvents[existing.scoreEvents.length - 1];
    const remainingEvents = existing.scoreEvents.slice(0, -1);

    let redPoints = existing.redPoints;
    let bluePoints = existing.bluePoints;
    let redExits = existing.redExits;
    let blueExits = existing.blueExits;
    let redWarnings = existing.redWarnings;
    let blueWarnings = existing.blueWarnings;

    if (lastEvent.actionType === 'leitai_exit') {
      if (lastEvent.corner === 'red') {
        redExits = Math.max(0, redExits - 1);
        bluePoints = Math.max(0, bluePoints - 2);
      } else {
        blueExits = Math.max(0, blueExits - 1);
        redPoints = Math.max(0, redPoints - 2);
      }
    } else if (lastEvent.actionType === 'warning') {
      if (lastEvent.corner === 'red') redWarnings = Math.max(0, redWarnings - 1);
      else blueWarnings = Math.max(0, blueWarnings - 1);
    } else {
      if (lastEvent.corner === 'red') redPoints = Math.max(0, redPoints - lastEvent.points);
      else bluePoints = Math.max(0, bluePoints - lastEvent.points);
    }

    const updatedScore: SidelineJudgeScore = {
      ...existing,
      redPoints,
      bluePoints,
      redExits,
      blueExits,
      redWarnings,
      blueWarnings,
      scoreEvents: remainingEvents,
      updatedAt: new Date().toISOString(),
    };

    setSidelineJudgeScores(prev => prev.map(s => (s.id === scoreId ? updatedScore : s)));
    supabaseUpsertSidelineJudgeScore(updatedScore);
    return { success: true };
  };

  const submitSidelineRoundCard = (
    boutId: string,
    roundNumber: number,
    preferredWinner?: 'red' | 'blue' | 'draw'
  ): { success: boolean; error?: string } => {
    let targetBout: Bout | null = null;
    for (const b of brackets) {
      const found = findBoutInRounds(b.rounds, boutId);
      if (found) {
        targetBout = found;
        break;
      }
    }
    if (!targetBout) return { success: false, error: 'Bout not found.' };

    const access = validateJudgeAccessForBout(targetBout);
    if (!access.allowed) return { success: false, error: access.reason };

    const scoreId = `sjs-${boutId}-${currentUser.id}-r${roundNumber}`;
    const existing = sidelineJudgeScores.find(s => s.id === scoreId);

    const redPoints = existing ? existing.redPoints : 0;
    const bluePoints = existing ? existing.bluePoints : 0;
    const redExits = existing ? existing.redExits : 0;
    const blueExits = existing ? existing.blueExits : 0;

    let computedWinner: 'red' | 'blue' | 'draw' = 'draw';
    if (preferredWinner) {
      computedWinner = preferredWinner;
    } else if (blueExits >= 2) {
      computedWinner = 'red';
    } else if (redExits >= 2) {
      computedWinner = 'blue';
    } else if (redPoints > bluePoints) {
      computedWinner = 'red';
    } else if (bluePoints > redPoints) {
      computedWinner = 'blue';
    }

    const updatedScore: SidelineJudgeScore = {
      id: scoreId,
      boutId,
      eventId: targetBout.eventId || event.id,
      arena: currentUser.assignedRing || currentUser.ringAssignment || targetBout.ring,
      judgeId: currentUser.id,
      judgeName: currentUser.name,
      roundNumber,
      redPoints,
      bluePoints,
      redExits,
      blueExits,
      redWarnings: existing ? existing.redWarnings : 0,
      blueWarnings: existing ? existing.blueWarnings : 0,
      winner: computedWinner,
      scoreEvents: existing ? existing.scoreEvents : [],
      isSubmitted: true,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSidelineJudgeScores(prev => {
      const idx = prev.findIndex(s => s.id === scoreId);
      if (idx >= 0) return prev.map(s => (s.id === scoreId ? updatedScore : s));
      return [...prev, updatedScore];
    });

    supabaseUpsertSidelineJudgeScore(updatedScore);

    addAuditLog(
      'SIDELINE_SCORE_SUBMIT',
      `Bout ${targetBout.boutNumber} · Round ${roundNumber}`,
      `Judge ${currentUser.name} submitted official sideline scorecard for ${targetBout.ring} (Red: ${redPoints}, Blue: ${bluePoints}, Decision: ${computedWinner.toUpperCase()}).`
    );

    return { success: true };
  };

  const amendSidelineRoundCard = (
    boutId: string,
    roundNumber: number
  ): { success: boolean; error?: string } => {
    const scoreId = `sjs-${boutId}-${currentUser.id}-r${roundNumber}`;
    const existing = sidelineJudgeScores.find(s => s.id === scoreId);
    if (!existing) return { success: false, error: 'No scorecard found to amend.' };

    const updatedScore: SidelineJudgeScore = {
      ...existing,
      isSubmitted: false,
      updatedAt: new Date().toISOString(),
    };

    setSidelineJudgeScores(prev => prev.map(s => (s.id === scoreId ? updatedScore : s)));
    supabaseUpsertSidelineJudgeScore(updatedScore);

    addAuditLog(
      'SIDELINE_SCORE_AMEND',
      `Bout ${boutId} · Round ${roundNumber}`,
      `Judge ${currentUser.name} reopened sideline scorecard for corrections.`
    );

    return { success: true };
  };

  const resetSidelineRoundCard = (
    boutId: string,
    roundNumber: number
  ): { success: boolean; error?: string } => {
    const scoreId = `sjs-${boutId}-${currentUser.id}-r${roundNumber}`;
    setSidelineJudgeScores(prev => prev.filter(s => s.id !== scoreId));
    supabaseDeleteSidelineJudgeScore(scoreId);

    addAuditLog(
      'SIDELINE_SCORE_RESET',
      `Bout ${boutId} · Round ${roundNumber}`,
      `Judge ${currentUser.name} cleared round ${roundNumber} scorecard.`
    );

    return { success: true };
  };

  const getJudgeScoresForBout = (boutId: string, judgeId?: string): SidelineJudgeScore[] => {
    if (!isLoggedIn) return [];

    // If sideline judge: strictly only their own scorecard
    if (role === 'sideline_judge') {
      return sidelineJudgeScores.filter(
        s => s.boutId === boutId && s.judgeId === currentUser.id
      );
    }

    // If mat official: strictly only submitted scores for bouts assigned to their active platform
    if (role === 'official') {
      const officialRing = currentUser.assignedRing || currentUser.ringAssignment;
      if (!officialRing) return [];

      let targetBout: Bout | null = null;
      for (const b of brackets) {
        const found = findBoutInRounds(b.rounds, boutId);
        if (found) {
          targetBout = found;
          break;
        }
      }
      if (!targetBout || !isArenaMatch(officialRing, targetBout.ring)) {
        return [];
      }

      return sidelineJudgeScores.filter(
        s => s.boutId === boutId && s.isSubmitted && isArenaMatch(officialRing, s.arena || targetBout?.ring)
      );
    }

    // If admin or super_admin: can filter by specific judge or return all
    if (judgeId) {
      return sidelineJudgeScores.filter(s => s.boutId === boutId && s.judgeId === judgeId);
    }
    return sidelineJudgeScores.filter(s => s.boutId === boutId);
  };

  const getAllJudgeScoresForAdmin = (boutId: string): SidelineJudgeScore[] => {
    if (role === 'super_admin' || role === 'admin') {
      return sidelineJudgeScores.filter(s => s.boutId === boutId);
    }
    // Platform Mat Official: sees submitted scores exclusively for their platform
    if (role === 'official') {
      const officialRing = currentUser.assignedRing || currentUser.ringAssignment;
      if (!officialRing) return [];
      let targetBout: Bout | null = null;
      for (const b of brackets) {
        const found = findBoutInRounds(b.rounds, boutId);
        if (found) {
          targetBout = found;
          break;
        }
      }
      if (!targetBout || !isArenaMatch(officialRing, targetBout.ring)) {
        return [];
      }
      return sidelineJudgeScores.filter(
        s => s.boutId === boutId && s.isSubmitted && isArenaMatch(officialRing, s.arena || targetBout?.ring)
      );
    }
    return [];
  };

  const getSubmittedJudgeScoresForPlatform = (boutId: string): SidelineJudgeScore[] => {
    return getAllJudgeScoresForAdmin(boutId).filter(s => s.isSubmitted);
  };

  // User management - Tournament Admins and Super Admins can assign platforms and register officials
  const updateUserRole = (userId: string, newRole: UserRole) => {
    if (role !== 'super_admin' && role !== 'admin') return;
    const target = users.find(u => u.id === userId);
    if (target?.role === 'super_admin' && role !== 'super_admin') return;
    if (newRole === 'super_admin' && role !== 'super_admin') return;

    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          const updated = { ...u, role: newRole };
          supabaseUpsertUser(updated);
          addAuditLog('ROLE_CHANGE', `User: ${u.name}`, `Role changed from ${u.role} to ${newRole}`);
          return updated;
        }
        return u;
      })
    );
  };

  const addUser = (userData: Omit<User, 'id'>): { success: boolean; error?: string; user?: User } => {
    if (role !== 'super_admin' && role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Tournament Admins and Super Admins have permission to register tournament officials.' };
    }

    // STRICT: Only Tournament Admin, Mat Official, and Sideline Scorer can be registered
    if (userData.role !== 'admin' && userData.role !== 'official' && userData.role !== 'sideline_judge') {
      return {
        success: false,
        error: 'Registration restricted: Only Tournament Admin, Mat Official, or Sideline Scorer roles can be registered.',
      };
    }

    const emailClean = userData.email?.trim().toLowerCase();
    const usernameClean = (userData.username || userData.email.split('@')[0])?.trim().toLowerCase();

    if (!emailClean) {
      return { success: false, error: 'Email / Username is required.' };
    }

    if (!userData.password || userData.password.trim().length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }

    const existing = users.find(
      u =>
        (u.email && u.email.trim().toLowerCase() === emailClean) ||
        (u.username && u.username.trim().toLowerCase() === usernameClean)
    );

    if (existing) {
      return { success: false, error: `An official account with username/email "${emailClean}" already exists.` };
    }

    const newUser: User = {
      ...userData,
      id: `u-${Date.now()}`,
      email: emailClean,
      username: usernameClean,
      password: userData.password.trim(),
      lastActive: 'Offline',
      createdAt: new Date().toISOString(),
    };

    setUsers(prev => [...prev, newUser]);
    supabaseUpsertUser(newUser);
    addAuditLog(
      'CREATE',
      `Official: ${newUser.name}`,
      `Created ${newUser.role === 'admin' ? 'Tournament Admin' : newUser.role === 'sideline_judge' ? 'Sideline Scorer' : 'Mat Official'} credentials for ${newUser.email} (${newUser.assignedRing || 'No Platform'}).`
    );

    return { success: true, user: newUser };
  };

  const deleteUser = (userId: string): { success: boolean; error?: string } => {
    if (role !== 'super_admin' && role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Tournament Admins and Super Admins can delete users.' };
    }

    const target = users.find(u => u.id === userId);
    if (!target) {
      return { success: false, error: 'User account not found.' };
    }

    if (target.role === 'super_admin') {
      return { success: false, error: 'Cannot delete the Super Admin master account.' };
    }

    if (currentUser.id === userId) {
      return { success: false, error: 'Cannot delete the account currently in use.' };
    }

    setUsers(prev => prev.filter(u => u.id !== userId));
    supabaseDeleteUser(userId);
    addAuditLog('DELETE', `Official: ${target.name}`, `Deleted ${target.role} account (${target.email})`);
    return { success: true };
  };

  const updateUser = (userId: string, data: Partial<User>): { success: boolean; error?: string } => {
    if (role !== 'super_admin' && role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Tournament Admins and Super Admins can modify official accounts.' };
    }

    const target = users.find(u => u.id === userId);
    if (target?.role === 'super_admin' && role !== 'super_admin') {
      return { success: false, error: 'Cannot modify Super Admin accounts.' };
    }

    if (data.role === 'super_admin' && role !== 'super_admin') {
      return { success: false, error: 'Unauthorized to grant Super Admin privileges.' };
    }

    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          const updated = { ...u, ...data };
          supabaseUpsertUser(updated);
          addAuditLog('ROLE_CHANGE', `Official: ${u.name}`, `Updated details: ${Object.keys(data).join(', ')}`);
          return updated;
        }
        return u;
      })
    );
    return { success: true };
  };

  const resetToDefaults = () => {
    if (role !== 'super_admin') return;
    saveSafetySnapshot('pre_reset');

    setPlayers([]);
    setCategories([]);
    setBrackets([]);
    setSidelineJudgeScores([]);
    setActiveBoutForScoring(null);

    // Clear scoped records for this event in Supabase
    supabaseClearPlayers(event.id);
    supabaseClearCategories(event.id);
    supabaseClearBrackets(event.id);
    addAuditLog('SYSTEM_RESET', `Event: ${event.name}`, `Reset active championship roster and fixtures for ${event.name} (${event.id})`);
  };

  const clearAllCacheAndReset = () => {
    if (role !== 'super_admin') return;
    saveSafetySnapshot('pre_reset');

    setPlayers([]);
    setCategories([]);
    setBrackets([]);
    setSidelineJudgeScores([]);
    setActiveBoutForScoring(null);

    supabaseClearPlayers(event.id);
    supabaseClearCategories(event.id);
    supabaseClearBrackets(event.id);
  };

  const restoreFromSafetySnapshot = (): { success: boolean; message: string } => {
    try {
      const snapshot = transientSnapshotRef.current;
      if (!snapshot || !snapshot.data) {
        return { success: false, message: 'No in-memory safety backup snapshot found from this session.' };
      }

      if (snapshot.data.event) setEvent(snapshot.data.event);
      if (snapshot.data.events && snapshot.data.events.length > 0) setEvents(snapshot.data.events);
      if (snapshot.data.players && snapshot.data.players.length > 0) setPlayers(snapshot.data.players);
      if (snapshot.data.categories && snapshot.data.categories.length > 0) setCategories(snapshot.data.categories);
      if (snapshot.data.brackets && snapshot.data.brackets.length > 0) setBrackets(snapshot.data.brackets);
      if (snapshot.data.users && snapshot.data.users.length > 0) setUsers(snapshot.data.users);
      if (snapshot.data.ageCategories && snapshot.data.ageCategories.length > 0) setAgeCategoriesState(snapshot.data.ageCategories);
      if (snapshot.data.weightCategories && snapshot.data.weightCategories.length > 0) setWeightCategoriesState(snapshot.data.weightCategories);
      if (snapshot.data.sidelineJudgeScores && snapshot.data.sidelineJudgeScores.length > 0) setSidelineJudgeScores(snapshot.data.sidelineJudgeScores);

      // Push to Supabase to persist cloud copy
      pushAllDataToSupabase({
        events: snapshot.data.events || events,
        players: snapshot.data.players || [],
        categories: snapshot.data.categories || [],
        brackets: snapshot.data.brackets || [],
        users: snapshot.data.users || users,
        auditLogs,
        ageCategories: snapshot.data.ageCategories || ageCategories,
        weightCategories: snapshot.data.weightCategories || weightCategories,
        sidelineJudgeScores: snapshot.data.sidelineJudgeScores || sidelineJudgeScores,
      }).catch(() => {});

      addAuditLog(
        'SAFETY_BACKUP_RESTORE',
        'Tournament Database',
        `Restored ${snapshot.playersCount} athletes and ${snapshot.bracketsCount} brackets from session safety backup.`
      );

      return {
        success: true,
        message: `Successfully restored ${snapshot.playersCount} athletes and ${snapshot.bracketsCount} fixtures from session backup.`,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to restore safety snapshot.' };
    }
  };

  const getSafetySnapshotInfo = () => {
    const snap = transientSnapshotRef.current;
    if (!snap) return { available: false };
    return {
      available: Boolean(snap && snap.data && (snap.playersCount > 0 || snap.bracketsCount > 0)),
      timestamp: snap.timestamp,
      playersCount: snap.playersCount || 0,
      categoriesCount: snap.categoriesCount || 0,
      bracketsCount: snap.bracketsCount || 0,
      eventName: snap.eventName,
    };
  };

  const exportTournamentBackupJson = () => {
    try {
      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        event,
        events,
        players,
        categories,
        brackets,
        users,
        ageCategories,
        weightCategories,
        sidelineJudgeScores,
        auditLogs,
      };
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wushu_tournament_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export backup JSON', err);
    }
  };

  const importTournamentBackupJson = (jsonString: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, message: 'Invalid backup file format.' };
      }
      if (parsed.event) setEvent(parsed.event);
      if (parsed.events && Array.isArray(parsed.events)) setEvents(parsed.events);
      if (parsed.players && Array.isArray(parsed.players)) setPlayers(parsed.players);
      if (parsed.categories && Array.isArray(parsed.categories)) setCategories(parsed.categories);
      if (parsed.brackets && Array.isArray(parsed.brackets)) setBrackets(parsed.brackets);
      if (parsed.users && Array.isArray(parsed.users)) setUsers(parsed.users);
      if (parsed.ageCategories && Array.isArray(parsed.ageCategories)) setAgeCategoriesState(parsed.ageCategories);
      if (parsed.weightCategories && Array.isArray(parsed.weightCategories)) setWeightCategoriesState(parsed.weightCategories);
      if (parsed.sidelineJudgeScores && Array.isArray(parsed.sidelineJudgeScores)) setSidelineJudgeScores(parsed.sidelineJudgeScores);

      pushAllDataToSupabase({
        events: parsed.events || events,
        players: parsed.players || [],
        categories: parsed.categories || [],
        brackets: parsed.brackets || [],
        users: parsed.users || users,
        auditLogs,
        ageCategories: parsed.ageCategories || ageCategories,
        weightCategories: parsed.weightCategories || weightCategories,
        sidelineJudgeScores: parsed.sidelineJudgeScores || sidelineJudgeScores,
      }).catch(() => {});

      addAuditLog('IMPORT_DATA', 'Full Tournament JSON', `Imported backup file with ${parsed.players?.length || 0} athletes.`);

      return {
        success: true,
        message: `Successfully restored ${parsed.players?.length || 0} athletes, ${parsed.categories?.length || 0} categories, and ${parsed.brackets?.length || 0} brackets from backup file.`,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to parse JSON backup file.' };
    }
  };

  const exportDataAsCSV = (type: 'players' | 'bouts' | 'results' | 'audit') => {
    let csvContent = '';
    let filename = '';

    if (type === 'players') {
      filename = `wushu_players_${event.name.replace(/\s+/g, '_')}.csv`;
      const headers = ['ID', 'Reg No', 'Name', 'Father Name', 'DOB', 'Calculated Age', 'Gender', 'Weight (kg)', 'Club/School', 'District', 'State', 'Contact', 'Aadhar', 'Status'];
      const rows = players.map(p => [
        p.id,
        p.registrationNumber,
        `"${p.name}"`,
        `"${p.fatherName}"`,
        p.dob,
        calculateAge(p.dob, event.tournamentReferenceDate),
        p.gender,
        p.weightKg,
        `"${p.clubSchool}"`,
        `"${p.district}"`,
        `"${p.stateRegion}"`,
        p.contactNumber,
        p.aadharNumber,
        p.status,
      ]);
      csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else if (type === 'bouts') {
      filename = `wushu_bouts_${event.name.replace(/\s+/g, '_')}.csv`;
      const headers = ['Bout No', 'Category', 'Round', 'Red Corner', 'Red Club', 'Blue Corner', 'Blue Club', 'Ring', 'Status', 'Winner', 'Decision'];
      const rows: string[][] = [];
      brackets.forEach(b => {
        const cat = categories.find(c => c.id === b.categoryId);
        b.rounds.forEach(r => {
          r.bouts.forEach(bout => {
            rows.push([
              bout.boutNumber,
              `"${cat?.name || 'Category'}"`,
              bout.roundName,
              `"${bout.redPlayerName || 'TBD'}"`,
              `"${bout.redClub || '-'}"`,
              `"${bout.bluePlayerName || 'TBD'}"`,
              `"${bout.blueClub || '-'}"`,
              `"${bout.ring}"`,
              bout.status,
              `"${bout.winnerCorner ? (bout.winnerCorner === 'red' ? bout.redPlayerName : bout.bluePlayerName) : '-'}"`,
              `"${bout.winningReason || '-'}"`,
            ]);
          });
        });
      });
      csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else if (type === 'results') {
      filename = `wushu_results_podium_${event.name.replace(/\s+/g, '_')}.csv`;
      const headers = ['Category', 'Gender', 'Gold Medal', 'Gold Club', 'Silver Medal', 'Silver Club', 'Joint Bronze 1', 'Joint Bronze 2'];
      const rows: string[][] = [];
      brackets.forEach(b => {
        const cat = categories.find(c => c.id === b.categoryId);
        const finalRound = b.rounds[b.rounds.length - 1];
        const finalBout = finalRound?.bouts[0];
        const semiRound = b.rounds.length > 1 ? b.rounds[b.rounds.length - 2] : null;

        let gold = '-';
        let goldClub = '-';
        let silver = '-';
        let silverClub = '-';
        let bronze1 = '-';
        let bronze2 = '-';

        if (finalBout && finalBout.winnerId) {
          if (finalBout.winnerCorner === 'red') {
            gold = finalBout.redPlayerName || '-';
            goldClub = finalBout.redClub || '-';
            silver = finalBout.bluePlayerName || '-';
            silverClub = finalBout.blueClub || '-';
          } else {
            gold = finalBout.bluePlayerName || '-';
            goldClub = finalBout.blueClub || '-';
            silver = finalBout.redPlayerName || '-';
            silverClub = finalBout.redClub || '-';
          }
        }

        if (semiRound) {
          const semi1 = semiRound.bouts[0];
          const semi2 = semiRound.bouts[1];
          if (semi1 && semi1.winnerId) {
            bronze1 = semi1.winnerCorner === 'red' ? (semi1.bluePlayerName || '-') : (semi1.redPlayerName || '-');
          }
          if (semi2 && semi2.winnerId) {
            bronze2 = semi2.winnerCorner === 'red' ? (semi2.bluePlayerName || '-') : (semi2.redPlayerName || '-');
          }
        }

        rows.push([
          `"${cat?.name || 'Category'}"`,
          cat?.gender || '-',
          `"${gold}"`,
          `"${goldClub}"`,
          `"${silver}"`,
          `"${silverClub}"`,
          `"${bronze1}"`,
          `"${bronze2}"`,
        ]);
      });
      csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else if (type === 'audit') {
      filename = `wushu_audit_logs_${event.name.replace(/\s+/g, '_')}.csv`;
      const headers = ['ID', 'Timestamp', 'User Name', 'User Role', 'Action', 'Target', 'Details', 'Reason'];
      const rows = auditLogs.map(l => [
        l.id,
        `"${new Date(l.timestamp).toISOString()}"`,
        `"${l.userName}"`,
        l.userRole,
        l.action,
        `"${l.target.replace(/"/g, '""')}"`,
        `"${l.details.replace(/"/g, '""')}"`,
        `"${(l.reason || '').replace(/"/g, '""')}"`,
      ]);
      csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMasterExcelBackup = () => {
    exportMasterFullBackup(event, ageCategories, weightCategories, players);
    addAuditLog('EXPORT_REPORT', 'Master Backup', 'Downloaded complete Master Excel backup');
  };

  const importMasterWorkbook = (data: {
    event?: Partial<EventSetup>;
    ageCategories?: AgeCategory[];
    weightCategories?: WeightCategory[];
    players?: Omit<Player, 'id' | 'createdAt'>[];
    replacePlayers?: boolean;
    replaceAgeCategories?: boolean;
    replaceWeightCategories?: boolean;
  }) => {
    if (role !== 'super_admin' && role !== 'admin') {
      return { success: false, summary: 'Unauthorized: Only Super Admin can apply master workbook data.' };
    }

    const appliedParts: string[] = [];

    // 1. Update event parameters
    if (data.event && Object.keys(data.event).length > 0) {
      setEvent(prev => ({ ...prev, ...data.event }));
      appliedParts.push(`Event "${data.event.name || event.name}" parameters`);
    }

    // 2. Age categories
    if (data.ageCategories && data.ageCategories.length > 0) {
      if (data.replaceAgeCategories) {
        setAgeCategoriesState(data.ageCategories);
        appliedParts.push(`${data.ageCategories.length} Age Divisions (Replaced)`);
      } else {
        setAgeCategoriesState(prev => {
          const map = new Map(prev.map(a => [a.id, a]));
          data.ageCategories!.forEach(a => map.set(a.id, a));
          return Array.from(map.values());
        });
        appliedParts.push(`${data.ageCategories.length} Age Divisions (Merged)`);
      }
    }

    // 3. Weight categories
    if (data.weightCategories && data.weightCategories.length > 0) {
      if (data.replaceWeightCategories) {
        setWeightCategoriesState(data.weightCategories);
        appliedParts.push(`${data.weightCategories.length} Weight Divisions (Replaced)`);
      } else {
        setWeightCategoriesState(prev => {
          const map = new Map(prev.map(w => [w.id, w]));
          data.weightCategories!.forEach(w => map.set(w.id, w));
          return Array.from(map.values());
        });
        appliedParts.push(`${data.weightCategories.length} Weight Divisions (Merged)`);
      }
    }

    // 4. Players
    let playerReport = '';
    if (data.players && data.players.length > 0) {
      const res = bulkAddPlayers(data.players, !!data.replacePlayers);
      playerReport = `${res.added} athletes imported (${res.duplicates} duplicates skipped)`;
      appliedParts.push(playerReport);
    }

    const summary = appliedParts.join(' · ') || 'Configuration verified';
    addAuditLog('IMPORT_DATA', 'Master Excel Import', summary);
    return { success: true, summary };
  };

  return (
    <TournamentContext.Provider
      value={{
        supabaseStatus,
        setSupabaseStatus,
        supabaseModalOpen,
        setSupabaseModalOpen,
        syncToSupabase,
        fetchFromSupabase,
        isLoadingData,
        role,
        setRole,
        currentUser,
        users,
        isLoggedIn,
        login,
        logout,
        loginModalOpen,
        setLoginModalOpen,
        updateUserRole,
        addUser,
        updateUser,
        deleteUser,
        event,
        events,
        updateEvent,
        createOfficialEvent,
        toggleEventLive,
        switchEvent,
        deleteEvent,
        isEventLive,
        canWorkOnEvent,
        ageCategories,
        setAgeCategories,
        addAgeCategory,
        updateAgeCategory,
        deleteAgeCategory,
        resetAgeCategories,
        weightCategories,
        setWeightCategories,
        addWeightCategory,
        updateWeightCategory,
        deleteWeightCategory,
        resetWeightCategories,
        players,
        addPlayer,
        bulkAddPlayers,
        updatePlayer,
        deletePlayer,
        clearAllPlayers,
        categories,
        createCategory,
        lockCategory,
        unlockCategory,
        deleteCategory,
        clearAllCategoriesAndBrackets,
        brackets,
        generateBracketForCategory,
        regenerateBracketForCategory,
        updateBracketFixture,
        movePlayerInFixture,
        swapPlayersInFixture,
        assignCategoryToPlatform,
        assignBoutToPlatform,
        activeBoutForScoring,
        setActiveBoutForScoring,
        recordBoutScoreEvent,
        updateBoutRoundScore,
        recordBoutExit,
        recordBoutWarning,
        submitBoutResult,
        reopenBoutResult,
        sidelineJudgeScores,
        recordSidelineScoreAction,
        recordSidelineExit,
        recordSidelineWarning,
        undoLastSidelineAction,
        submitSidelineRoundCard,
        amendSidelineRoundCard,
        resetSidelineRoundCard,
        getJudgeScoresForBout,
        getAllJudgeScoresForAdmin,
        getSubmittedJudgeScoresForPlatform,
        validateJudgeAccessForBout,
        auditLogs,
        addAuditLog,
        activeTab,
        setActiveTab,
        resetToDefaults,
        clearAllCacheAndReset,
        saveSafetySnapshot,
        restoreFromSafetySnapshot,
        getSafetySnapshotInfo,
        exportTournamentBackupJson,
        importTournamentBackupJson,
        exportDataAsCSV,
        exportMasterExcelBackup,
        importMasterWorkbook,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};
