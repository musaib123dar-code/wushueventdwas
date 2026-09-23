export type UserRole = 'super_admin' | 'admin' | 'official' | 'general_view';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: UserRole;
  ringAssignment?: string;
  assignedRing?: string;
  lastActive?: string;
  createdAt?: string;
}

export interface AgeCategory {
  id: string;
  name: string;
  minAge: number;
  maxAge: number;
  description?: string;
}

export interface WeightCategory {
  id: string;
  name: string;
  minWeightKg: number;
  maxWeightKg: number;
  gender: 'male' | 'female';
}

export interface EventSetup {
  id: string;
  name: string;
  organizer: string;
  venue: string;
  city: string;
  state?: string;
  startDate: string;
  endDate: string;
  tournamentReferenceDate: string; // The crucial date against which player age is calculated
  status: 'upcoming' | 'ongoing' | 'completed';
  isLive?: boolean; // When true: event is active for all roles (admins, officials, public). When false: only Super Admin can access and configure.
  createdAt?: string;
  competitionType: 'Sanda' | 'Taolu';
  roundDurationSec: number; // e.g. 120 (2 mins)
  roundsCount: number; // 3 rounds (best 2 of 3)
  numberOfRounds?: number;
  restDurationSec: number; // 60s
  rings: string[]; // ['Leitai 1 (Platform A)', 'Leitai 2 (Platform B)']
  description?: string;
}

export interface Player {
  id: string;
  registrationNumber: string;
  name: string;
  fatherName: string;
  dob: string; // YYYY-MM-DD
  gender: 'male' | 'female';
  weightKg: number;
  clubSchool: string;
  district: string;
  stateRegion: string;
  contactNumber: string;
  aadharNumber: string;
  status: 'active' | 'withdrawn' | 'disqualified' | 'weighed_in';
  createdAt: string;
}

export interface Category {
  id: string;
  eventId: string;
  name: string;
  gender: 'male' | 'female';
  ageCategoryId: string;
  weightCategoryId: string;
  districtFilter?: string;
  clubFilter?: string;
  isLocked: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
  eligiblePlayerIds: string[];
}

export type BoutStatus =
  | 'scheduled'
  | 'ready'
  | 'live'
  | 'completed'
  | 'winner_points'
  | 'winner_rsc'
  | 'winner_withdrawal'
  | 'winner_disqualification'
  | 'walkover'
  | 'no_contest'
  | 'cancelled'
  | 'pending_review';

export interface ScoreEvent {
  id: string;
  roundNumber: number;
  corner: 'red' | 'blue';
  actionType:
    | 'punch'
    | 'kick_thigh'
    | 'kick_body_head'
    | 'sweep_takedown'
    | 'fall_with_opponent'
    | 'leitai_exit'
    | 'warning'
    | 'foul_penalty';
  points: number; // e.g. +1, +2, or -1 for warning
  timestamp: number;
  description: string;
}

export interface BoutRound {
  roundNumber: number;
  redPoints: number;
  bluePoints: number;
  redExits: number; // Leitai off-platform exits (2 exits in 1 round = round win for opponent)
  blueExits: number;
  redWarnings: number;
  blueWarnings: number;
  winner?: 'red' | 'blue' | 'draw';
}

export interface Bout {
  id: string;
  eventId: string;
  categoryId: string;
  boutNumber: string; // e.g. "B-101"
  roundName: 'Round of 32' | 'Round of 16' | 'Quarterfinal' | 'Semifinal' | 'Final';
  roundIndex: number;
  matchIndexInRound: number;
  nextBoutId?: string;
  nextBoutSlot?: 'red' | 'blue';
  
  redPlayerId?: string | null;
  bluePlayerId?: string | null;
  redPlayerName?: string;
  bluePlayerName?: string;
  redClub?: string;
  blueClub?: string;
  
  isBye: boolean;
  status: BoutStatus;
  ring: string;
  scheduledTime: string;
  rounds: BoutRound[];
  currentRound: number;
  winnerId?: string | null;
  winnerCorner?: 'red' | 'blue';
  winningReason?: string;
  scoreEvents: ScoreEvent[];
  officialAssigned?: string;
  resultLocked: boolean;
  submittedAt?: string;
  submittedBy?: string;
  reviewNotes?: string;
}

export interface Bracket {
  id: string;
  categoryId: string;
  eventId: string;
  rounds: {
    roundName: string;
    roundIndex: number;
    bouts: Bout[];
  }[];
  generatedAt: string;
  isLocked: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userRole: UserRole;
  userName: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'BRACKET_GENERATE'
    | 'BRACKET_REGENERATE'
    | 'SCORE_SUBMIT'
    | 'RESULT_REOPEN'
    | 'RESULT_CORRECT'
    | 'ROLE_CHANGE'
    | 'LOCK_CATEGORY'
    | 'EVENT_SETUP'
    | 'EXPORT_REPORT'
    | 'IMPORT_DATA'
    | 'EVENT_STATUS_CHANGE'
    | 'EVENT_DELETE';
  target: string;
  details: string;
  entityType?: string;
  entityId?: string;
  reason?: string;
}

export interface MedalTallyItem {
  districtOrClub: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}
