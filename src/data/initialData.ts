import {
  EventSetup,
  AgeCategory,
  WeightCategory,
  Player,
  Category,
  User,
  AuditLog,
  Bracket,
} from '../types/tournament';

const today = new Date().toISOString().split('T')[0];

export const INITIAL_EVENT: EventSetup = {
  id: 'event-live-01',
  name: '34th State Senior & Junior Wushu Championship 2026',
  organizer: 'Wushu Association of India',
  venue: 'Indira Gandhi Indoor Stadium, Platform Arena',
  city: 'New Delhi',
  state: 'Delhi',
  startDate: today,
  endDate: today,
  tournamentReferenceDate: today, // Age eligibility strictly computed against this date
  status: 'ongoing',
  isLive: true,
  createdAt: new Date().toISOString(),
  competitionType: 'Sanda',
  roundDurationSec: 120, // 2 minutes per round
  roundsCount: 3, // best 2 of 3
  numberOfRounds: 3,
  restDurationSec: 60, // 1 minute rest
  rings: ['Leitai 1 (Platform A)', 'Leitai 2 (Platform B)'],
  description: 'Official State Sanda Championship',
};

export const INITIAL_AGE_CATEGORIES: AgeCategory[] = [
  { id: 'age-sub-jr', name: 'Sub-Junior', minAge: 12, maxAge: 14, description: 'Athletes aged 12 to 14 years on tournament reference date' },
  { id: 'age-junior', name: 'Junior', minAge: 15, maxAge: 17, description: 'Athletes aged 15 to 17 years on tournament reference date' },
  { id: 'age-youth', name: 'Youth', minAge: 18, maxAge: 20, description: 'Athletes aged 18 to 20 years on tournament reference date' },
  { id: 'age-senior', name: 'Senior', minAge: 18, maxAge: 40, description: 'Athletes aged 18 to 40 years on tournament reference date' },
];

export const INITIAL_WEIGHT_CATEGORIES: WeightCategory[] = [
  // Male Sanda divisions (IWUF official rules)
  { id: 'wt-m-48', name: 'Under 48 kg', minWeightKg: 44, maxWeightKg: 48, gender: 'male' },
  { id: 'wt-m-52', name: 'Under 52 kg', minWeightKg: 48.1, maxWeightKg: 52, gender: 'male' },
  { id: 'wt-m-56', name: 'Under 56 kg', minWeightKg: 52.1, maxWeightKg: 56, gender: 'male' },
  { id: 'wt-m-60', name: 'Under 60 kg', minWeightKg: 56.1, maxWeightKg: 60, gender: 'male' },
  { id: 'wt-m-65', name: 'Under 65 kg', minWeightKg: 60.1, maxWeightKg: 65, gender: 'male' },
  { id: 'wt-m-70', name: 'Under 70 kg', minWeightKg: 65.1, maxWeightKg: 70, gender: 'male' },
  { id: 'wt-m-75', name: 'Under 75 kg', minWeightKg: 70.1, maxWeightKg: 75, gender: 'male' },
  { id: 'wt-m-80', name: 'Under 80 kg', minWeightKg: 75.1, maxWeightKg: 80, gender: 'male' },
  // Female Sanda divisions (IWUF official rules)
  { id: 'wt-f-48', name: 'Under 48 kg', minWeightKg: 44, maxWeightKg: 48, gender: 'female' },
  { id: 'wt-f-52', name: 'Under 52 kg', minWeightKg: 48.1, maxWeightKg: 52, gender: 'female' },
  { id: 'wt-f-56', name: 'Under 56 kg', minWeightKg: 52.1, maxWeightKg: 56, gender: 'female' },
  { id: 'wt-f-60', name: 'Under 60 kg', minWeightKg: 56.1, maxWeightKg: 60, gender: 'female' },
  { id: 'wt-f-65', name: 'Under 65 kg', minWeightKg: 60.1, maxWeightKg: 65, gender: 'female' },
];

export const INITIAL_PLAYERS: Player[] = [];

export const INITIAL_CATEGORIES: Category[] = [];

export const INITIAL_USERS: User[] = [
  {
    id: 'u-1',
    name: 'Tournament Director',
    email: 'superadmin@wushu.org',
    username: 'superadmin',
    password: 'superadmin123',
    role: 'super_admin',
    lastActive: 'Online',
  },
  {
    id: 'u-2',
    name: 'Tournament Admin',
    email: 'admin@wushu.org',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    lastActive: 'Online',
  },
  {
    id: 'u-3',
    name: 'Chief Referee / Mat Official',
    email: 'official1@wushu.org',
    username: 'official1',
    password: 'official123',
    role: 'official',
    ringAssignment: 'Leitai 1 (Platform A)',
    assignedRing: 'Leitai 1 (Platform A)',
    lastActive: 'Online',
  },
  {
    id: 'u-4',
    name: 'Platform Judge / Mat Official',
    email: 'official2@wushu.org',
    username: 'official2',
    password: 'official123',
    role: 'official',
    ringAssignment: 'Leitai 2 (Platform B)',
    assignedRing: 'Leitai 2 (Platform B)',
    lastActive: 'Online',
  },
  {
    id: 'u-5',
    name: 'Public Spectator',
    email: 'spectator@wushutournament.org',
    username: 'spectator',
    role: 'general_view',
    lastActive: 'Online',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

// Empty initial brackets for live start
export function createInitialBrackets(): Bracket[] {
  return [];
}
