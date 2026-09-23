import React, { createContext, useContext, useState, useEffect } from 'react';
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
} from '../utils/tournamentHelpers';
import { exportMasterFullBackup } from '../utils/excelMasterHelper';

interface TournamentContextType {
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
  setAgeCategories: (categories: AgeCategory[]) => void;
  addAgeCategory: (cat: Omit<AgeCategory, 'id'>) => void;
  updateAgeCategory: (id: string, cat: Partial<AgeCategory>) => void;
  deleteAgeCategory: (id: string) => void;
  resetAgeCategories: () => void;
  
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
  
  auditLogs: AuditLog[];
  addAuditLog: (action: AuditLog['action'], target: string, details: string) => void;
  
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  resetToDefaults: () => void;
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

const STORAGE_KEY = 'wushu_tournament_state_live_v2';

// Clear legacy demo cache if present in localStorage
try {
  ['event', 'players', 'categories', 'brackets', 'users', 'audit'].forEach(k => {
    localStorage.removeItem(`wushu_tournament_state_v1_${k}`);
  });
} catch {
  // Ignore localStorage errors
}

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

  const [event, setEvent] = useState<EventSetup>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_event`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.isLive === undefined) parsed.isLive = true;
        return parsed;
      } catch {
        return INITIAL_EVENT;
      }
    }
    return INITIAL_EVENT;
  });

  const [events, setEvents] = useState<EventSetup[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_events`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((e: EventSetup) => ({
            ...e,
            isLive: e.isLive !== undefined ? e.isLive : true,
          }));
        }
      } catch {
        // Fallback
      }
    }
    return [{ ...INITIAL_EVENT, isLive: true }];
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_players`);
    return saved ? JSON.parse(saved) : INITIAL_PLAYERS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_categories`);
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [brackets, setBrackets] = useState<Bracket[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_brackets`);
    return saved ? JSON.parse(saved) : createInitialBrackets();
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_users`);
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        // Ensure standard initial users have their credentials and new initial users exist
        const merged = [...parsed];
        INITIAL_USERS.forEach(initU => {
          const idx = merged.findIndex(u => u.email === initU.email || u.username === initU.username);
          if (idx >= 0) {
            if (!merged[idx].password && initU.password) {
              merged[idx].password = initU.password;
            }
            if (!merged[idx].username && initU.username) {
              merged[idx].username = initU.username;
            }
          } else {
            merged.push(initU);
          }
        });
        return merged;
      } catch {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_audit`);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [activeBoutForScoring, setActiveBoutForScoring] = useState<Bout | null>(null);

  const [ageCategories, setAgeCategoriesState] = useState<AgeCategory[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_age_categories`);
    return saved ? JSON.parse(saved) : INITIAL_AGE_CATEGORIES;
  });

  const [weightCategories, setWeightCategoriesState] = useState<WeightCategory[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_weight_categories`);
    return saved ? JSON.parse(saved) : INITIAL_WEIGHT_CATEGORIES;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_event`, JSON.stringify(event));
  }, [event]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_events`, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_age_categories`, JSON.stringify(ageCategories));
  }, [ageCategories]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_weight_categories`, JSON.stringify(weightCategories));
  }, [weightCategories]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_players`, JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_brackets`, JSON.stringify(brackets));
  }, [brackets]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_audit`, JSON.stringify(auditLogs));
  }, [auditLogs]);

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
    } else if (matchedUser.role === 'official') {
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
  };

  // Event updates & Master creation
  const updateEvent = (updated: Partial<EventSetup>) => {
    if (role === 'general_view') return;
    setEvent(prev => {
      const next = { ...prev, ...updated };
      setEvents(list => list.map(e => (e.id === next.id ? next : e)));
      addAuditLog('EVENT_SETUP', next.name || 'Tournament Event', `Updated tournament parameters: ${Object.keys(updated).join(', ')}`);
      return next;
    });
  };

  const createOfficialEvent = (
    eventData: Partial<EventSetup>,
    clearExistingRoster: boolean = false,
    isLive: boolean = false
  ): EventSetup => {
    if (role !== 'super_admin' && role !== 'admin') return event;
    const newId = `event-${Date.now()}`;
    const nextEvent: EventSetup = {
      ...event,
      ...eventData,
      id: newId,
      isLive: isLive,
      createdAt: new Date().toISOString(),
    };

    setEvents(prev => {
      const exists = prev.some(e => e.id === newId);
      if (exists) return prev.map(e => (e.id === newId ? nextEvent : e));
      return [...prev, nextEvent];
    });
    setEvent(nextEvent);

    if (clearExistingRoster) {
      setPlayers([]);
      setCategories([]);
      setBrackets([]);
      addAuditLog(
        'EVENT_SETUP',
        nextEvent.name || 'New Championship',
        `Super Admin initialized fresh event ${newId} (status: ${isLive ? 'LIVE' : 'NOT ACTIVE'}, roster and fixtures reset)`
      );
    } else {
      addAuditLog(
        'EVENT_SETUP',
        nextEvent.name || 'Tournament Event',
        `Super Admin created championship event ${newId} (status: ${isLive ? 'LIVE' : 'NOT ACTIVE'})`
      );
    }
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
          return {
            ...e,
            isLive: resultingStatus,
            status: resultingStatus ? 'ongoing' : e.status === 'completed' ? 'completed' : 'upcoming',
          };
        }
        return e;
      })
    );

    setEvent(prev => {
      if (prev.id === eventId) {
        const nextLive = targetLive !== undefined ? targetLive : !prev.isLive;
        return {
          ...prev,
          isLive: nextLive,
          status: nextLive ? 'ongoing' : prev.status === 'completed' ? 'completed' : 'upcoming',
        };
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

  const switchEvent = (eventId: string) => {
    const target = events.find(e => e.id === eventId);
    if (!target) return;
    setEvent(target);
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
    } else {
      setEvents(remaining);
      if (event.id === eventId) {
        setEvent(remaining[0]);
      }
    }

    addAuditLog('EVENT_DELETE', target.name || eventId, `Super Admin deleted championship event: ${target.name} (${eventId})`);
    return { success: true };
  };

  const isEventLive = Boolean(event.isLive);
  const canWorkOnEvent = role === 'super_admin' || isEventLive;

  // Age Categories Management (Super Admin & Admin)
  const setAgeCategories = (cats: AgeCategory[]) => {
    if (role === 'general_view') return;
    setAgeCategoriesState(cats);
    addAuditLog('UPDATE', 'Age Categories', `Updated age divisions list (${cats.length} divisions)`);
  };

  const addAgeCategory = (catData: Omit<AgeCategory, 'id'>) => {
    if (role === 'general_view') return;
    const newCat: AgeCategory = {
      ...catData,
      id: `age-cat-${Date.now()}`,
    };
    setAgeCategoriesState(prev => [...prev, newCat]);
    addAuditLog('CREATE', `Age Category: ${newCat.name}`, `${newCat.minAge}-${newCat.maxAge} years on reference date`);
  };

  const updateAgeCategory = (id: string, updated: Partial<AgeCategory>) => {
    if (role === 'general_view') return;
    setAgeCategoriesState(prev => prev.map(c => (c.id === id ? { ...c, ...updated } : c)));
    addAuditLog('UPDATE', `Age Category: ${id}`, `Updated division settings`);
  };

  const deleteAgeCategory = (id: string) => {
    if (role === 'general_view') return;
    const target = ageCategories.find(c => c.id === id);
    setAgeCategoriesState(prev => prev.filter(c => c.id !== id));
    addAuditLog('DELETE', `Age Category: ${target?.name || id}`, `Removed age category`);
  };

  const resetAgeCategories = () => {
    if (role === 'general_view') return;
    setAgeCategoriesState(INITIAL_AGE_CATEGORIES);
    addAuditLog('UPDATE', 'Age Categories', 'Reset to official IWUF age classifications');
  };

  // Weight Categories Management (Super Admin & Admin)
  const setWeightCategories = (cats: WeightCategory[]) => {
    if (role === 'general_view') return;
    setWeightCategoriesState(cats);
    addAuditLog('UPDATE', 'Weight Divisions', `Updated weight divisions list (${cats.length} divisions)`);
  };

  const addWeightCategory = (catData: Omit<WeightCategory, 'id'>) => {
    if (role === 'general_view') return;
    const newCat: WeightCategory = {
      ...catData,
      id: `wt-cat-${Date.now()}`,
    };
    setWeightCategoriesState(prev => [...prev, newCat]);
    addAuditLog('CREATE', `Weight Division: ${newCat.name}`, `${newCat.gender} ${newCat.minWeightKg}-${newCat.maxWeightKg} kg`);
  };

  const updateWeightCategory = (id: string, updated: Partial<WeightCategory>) => {
    if (role === 'general_view') return;
    setWeightCategoriesState(prev => prev.map(c => (c.id === id ? { ...c, ...updated } : c)));
    addAuditLog('UPDATE', `Weight Division: ${id}`, `Updated weight limits`);
  };

  const deleteWeightCategory = (id: string) => {
    if (role === 'general_view') return;
    const target = weightCategories.find(c => c.id === id);
    setWeightCategoriesState(prev => prev.filter(c => c.id !== id));
    addAuditLog('DELETE', `Weight Division: ${target?.name || id}`, `Removed weight division`);
  };

  const resetWeightCategories = () => {
    if (role === 'general_view') return;
    setWeightCategoriesState(INITIAL_WEIGHT_CATEGORIES);
    addAuditLog('UPDATE', 'Weight Divisions', 'Reset to official IWUF Sanda weight categories');
  };

  // Player operations
  const addPlayer = (playerData: Omit<Player, 'id' | 'createdAt'>) => {
    if (role === 'general_view') {
      return { success: false, error: 'General view cannot add players.' };
    }

    // Check duplicate registration or duplicate aadhar
    const existing = players.find(
      p => p.registrationNumber.toLowerCase() === playerData.registrationNumber.toLowerCase() ||
           (p.aadharNumber && p.aadharNumber === playerData.aadharNumber)
    );
    if (existing) {
      return { success: false, error: 'Player with this Registration ID or Aadhar number already exists.' };
    }

    const newPlayer: Player = {
      ...playerData,
      id: `p-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setPlayers(prev => [newPlayer, ...prev]);
    addAuditLog('CREATE', `Player: ${newPlayer.name}`, `Reg #${newPlayer.registrationNumber}, Club: ${newPlayer.clubSchool}, Weight: ${newPlayer.weightKg}kg`);
    return { success: true, player: newPlayer };
  };

  const updatePlayer = (id: string, playerData: Partial<Player>) => {
    if (role === 'general_view') {
      return { success: false, error: 'General view cannot edit players.' };
    }
    const target = players.find(p => p.id === id);
    if (!target) return { success: false, error: 'Player not found.' };

    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, ...playerData } : p)));
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
        createdAt: new Date().toISOString(),
      });
      added++;
    });

    if (replace) {
      setPlayers(validNewPlayers);
    } else {
      setPlayers(prev => [...validNewPlayers, ...prev]);
    }

    addAuditLog(
      'CREATE',
      'Bulk Athlete Import',
      `Imported ${added} athletes (${duplicates} duplicate registrations skipped)`
    );

    return { added, duplicates };
  };

  const clearAllPlayers = () => {
    if (role !== 'super_admin') return;
    setPlayers([]);
    setCategories([]);
    setBrackets([]);
    addAuditLog('DELETE', 'All Athletes', 'Super Admin cleared player database and related fixtures');
  };

  const clearAllCategoriesAndBrackets = () => {
    if (role !== 'super_admin' && role !== 'admin') return;
    setCategories([]);
    setBrackets([]);
    addAuditLog('DELETE', 'Categories & Fixtures', 'Super Admin cleared all divisions and tournament brackets');
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
      isLocked: false,
      eligiblePlayerIds: eligible.map(e => e.id),
    };

    setCategories(prev => [...prev, newCategory]);
    addAuditLog('CREATE', `Category: ${newCategory.name}`, `Created with ${eligible.length} matched eligible fighters.`);
    return newCategory;
  };

  const lockCategory = (categoryId: string) => {
    if (role === 'general_view') return;
    setCategories(prev =>
      prev.map(c => {
        if (c.id === categoryId) {
          addAuditLog('LOCK_CATEGORY', `Category: ${c.name}`, `Locked eligible roster (${c.eligiblePlayerIds.length} fighters) for fixture generation.`);
          return {
            ...c,
            isLocked: true,
            confirmedAt: new Date().toISOString(),
            confirmedBy: currentUser.name,
          };
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
          addAuditLog('UPDATE', `Category: ${c.name}`, `Unlocked category roster by ${currentUser.name}.`);
          return {
            ...c,
            isLocked: false,
            confirmedAt: undefined,
            confirmedBy: undefined,
          };
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

    setCategories(prev => prev.filter(c => c.id !== categoryId));
    setBrackets(prev => prev.filter(b => b.categoryId !== categoryId));
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
      
      setBrackets(prev => {
        const filtered = prev.filter(b => b.categoryId !== categoryId);
        return [...filtered, bracket];
      });

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
      setBrackets(prev => {
        const filtered = prev.filter(b => b.categoryId !== categoryId);
        return [...filtered, bracket];
      });

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

  // Live scoring actions
  const recordBoutScoreEvent = (boutId: string, scoreEvent: Omit<ScoreEvent, 'id' | 'timestamp'>) => {
    if (role === 'general_view') return;

    const fullEvent: ScoreEvent = {
      ...scoreEvent,
      id: `se-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: Date.now(),
    };

    setBrackets(prev =>
      prev.map(b => ({
        ...b,
        rounds: b.rounds.map(round => ({
          ...round,
          bouts: round.bouts.map(bout => {
            if (bout.id === boutId) {
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
        })),
      }))
    );
  };

  const updateBoutRoundScore = (boutId: string, roundNumber: number, redDelta: number, blueDelta: number) => {
    if (role === 'general_view') return;

    setBrackets(prev =>
      prev.map(b => ({
        ...b,
        rounds: b.rounds.map(round => ({
          ...round,
          bouts: round.bouts.map(bout => {
            if (bout.id === boutId) {
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
        })),
      }))
    );
  };

  const recordBoutExit = (boutId: string, roundNumber: number, corner: 'red' | 'blue') => {
    if (role === 'general_view') return;

    setBrackets(prev =>
      prev.map(b => ({
        ...b,
        rounds: b.rounds.map(round => ({
          ...round,
          bouts: round.bouts.map(bout => {
            if (bout.id === boutId) {
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
        })),
      }))
    );
  };

  const recordBoutWarning = (boutId: string, roundNumber: number, corner: 'red' | 'blue') => {
    if (role === 'general_view') return;

    setBrackets(prev =>
      prev.map(b => ({
        ...b,
        rounds: b.rounds.map(round => ({
          ...round,
          bouts: round.bouts.map(bout => {
            if (bout.id === boutId) {
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
        })),
      }))
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

  // User management - Strictly restricted to Super Admin
  const updateUserRole = (userId: string, newRole: UserRole) => {
    if (role !== 'super_admin') return;
    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          addAuditLog('ROLE_CHANGE', `User: ${u.name}`, `Role changed from ${u.role} to ${newRole}`);
          return { ...u, role: newRole };
        }
        return u;
      })
    );
  };

  const addUser = (userData: Omit<User, 'id'>): { success: boolean; error?: string; user?: User } => {
    if (role !== 'super_admin') {
      return { success: false, error: 'Unauthorized: Only Super Admin has permission to register tournament officials.' };
    }

    // STRICT: Only Tournament Admin and Mat Official can be registered
    if (userData.role !== 'admin' && userData.role !== 'official') {
      return {
        success: false,
        error: 'Registration restricted: Super Admin can only register Tournament Admin and Mat Official roles.',
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
    addAuditLog(
      'CREATE',
      `Official: ${newUser.name}`,
      `Super Admin created ${newUser.role === 'admin' ? 'Tournament Admin' : 'Mat Official'} credentials for ${newUser.email}.`
    );

    return { success: true, user: newUser };
  };

  const deleteUser = (userId: string): { success: boolean; error?: string } => {
    if (role !== 'super_admin') {
      return { success: false, error: 'Unauthorized: Only Super Admin can delete users.' };
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
    addAuditLog('DELETE', `Official: ${target.name}`, `Deleted ${target.role} account (${target.email})`);
    return { success: true };
  };

  const updateUser = (userId: string, data: Partial<User>): { success: boolean; error?: string } => {
    if (role !== 'super_admin') {
      return { success: false, error: 'Unauthorized: Only Super Admin can modify official accounts.' };
    }

    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          const updated = { ...u, ...data };
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
    localStorage.removeItem(`${STORAGE_KEY}_event`);
    localStorage.removeItem(`${STORAGE_KEY}_players`);
    localStorage.removeItem(`${STORAGE_KEY}_categories`);
    localStorage.removeItem(`${STORAGE_KEY}_brackets`);
    localStorage.removeItem(`${STORAGE_KEY}_users`);
    localStorage.removeItem(`${STORAGE_KEY}_audit`);

    setEvent(INITIAL_EVENT);
    setPlayers(INITIAL_PLAYERS);
    setCategories(INITIAL_CATEGORIES);
    setBrackets(createInitialBrackets());
    setUsers(INITIAL_USERS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setActiveBoutForScoring(null);
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
        activeBoutForScoring,
        setActiveBoutForScoring,
        recordBoutScoreEvent,
        updateBoutRoundScore,
        recordBoutExit,
        recordBoutWarning,
        submitBoutResult,
        reopenBoutResult,
        auditLogs,
        addAuditLog,
        activeTab,
        setActiveTab,
        resetToDefaults,
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
