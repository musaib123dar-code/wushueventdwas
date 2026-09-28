import { Player, Category, EventSetup, Bout, Bracket, BoutStatus, BoutRound } from '../types/tournament';

/**
 * Calculates a player's age against the configured tournament reference date
 */
export function calculateAge(dob: string, referenceDate: string): number {
  if (!dob || !referenceDate) return 0;
  const birth = new Date(dob);
  const ref = new Date(referenceDate);
  if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return 0;
  
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Formats date into readable string
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Determine round names for a bracket based on total rounds
 */
export function getRoundName(roundIndex: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - 1 - roundIndex;
  if (roundsFromEnd === 0) return 'Final';
  if (roundsFromEnd === 1) return 'Semifinal';
  if (roundsFromEnd === 2) return 'Quarterfinal';
  if (roundsFromEnd === 3) return 'Round of 16';
  if (roundsFromEnd === 4) return 'Round of 32';
  if (roundsFromEnd === 5) return 'Round of 64';
  if (roundsFromEnd === 6) return 'Round of 128';
  if (roundsFromEnd === 7) return 'Round of 256';
  if (roundsFromEnd === 8) return 'Round of 512';
  const participantsInRound = Math.pow(2, roundsFromEnd + 1);
  return `Round of ${participantsInRound}`;
}

/**
 * Generates single-elimination knockout bracket with automatic BYE allocation
 */
export function generateKnockoutBracket(
  players: Player[],
  category: Category,
  event: EventSetup,
  randomize: boolean = false
): Bracket {
  const shuffledPlayers = [...players];
  if (randomize) {
    shuffledPlayers.sort(() => Math.random() - 0.5);
  }

  const count = shuffledPlayers.length;
  if (count < 2) {
    throw new Error('At least 2 players are required to generate a knockout bracket.');
  }

  // Bracket size is always the smallest power of 2 that is greater than or equal to the number of players:
  // 1–2 -> 2
  // 3–4 -> 4
  // 5–8 -> 8
  // 9–16 -> 16
  // 17–32 -> 32
  // 33–64 -> 64
  // 65–128 -> 128
  // 129–256 -> 256
  // 257–512 -> 512
  let bracketSize = 2;
  while (bracketSize < count) {
    bracketSize *= 2;
  }

  const totalRounds = Math.log2(bracketSize);
  const byesCount = bracketSize - count;

  // Bracket slot distribution: seed players and byes
  // In tournament brackets, byes are seeded at alternating opposite ends (top and bottom)
  const initialSlots: (Player | 'BYE')[] = new Array(bracketSize).fill('BYE');
  
  // Standard tournament seeding positions for dynamic powers of 2
  const seedOrder = getSeedPositions(bracketSize);
  
  for (let i = 0; i < count; i++) {
    const targetSlot = seedOrder[i];
    if (targetSlot !== undefined && targetSlot < bracketSize) {
      initialSlots[targetSlot] = shuffledPlayers[i];
    }
  }

  // Create rounds structure
  const bracketRounds: Bracket['rounds'] = [];
  let boutCounter = 101; // B-101, B-102...

  // We build from Round 0 (e.g. Round of 128 or Round of 64) up to Final
  for (let r = 0; r < totalRounds; r++) {
    const roundName = getRoundName(r, totalRounds);
    const matchesInRound = bracketSize / Math.pow(2, r + 1);
    const bouts: Bout[] = [];

    for (let m = 0; m < matchesInRound; m++) {
      const boutId = `bout-${category.id}-r${r}-m${m}`;
      const boutNumber = `B-${boutCounter++}`;
      
      const initialRounds: BoutRound[] = [
        { roundNumber: 1, redPoints: 0, bluePoints: 0, redExits: 0, blueExits: 0, redWarnings: 0, blueWarnings: 0 },
        { roundNumber: 2, redPoints: 0, bluePoints: 0, redExits: 0, blueExits: 0, redWarnings: 0, blueWarnings: 0 },
        { roundNumber: 3, redPoints: 0, bluePoints: 0, redExits: 0, blueExits: 0, redWarnings: 0, blueWarnings: 0 },
      ];

      // Next bout pointer
      let nextBoutId: string | undefined = undefined;
      let nextBoutSlot: 'red' | 'blue' | undefined = undefined;
      if (r < totalRounds - 1) {
        const nextMatchIndex = Math.floor(m / 2);
        nextBoutId = `bout-${category.id}-r${r + 1}-m${nextMatchIndex}`;
        nextBoutSlot = m % 2 === 0 ? 'red' : 'blue';
      }

      const matchHour = 9 + Math.floor((m * 15) / 60);
      const matchMin = (m * 15) % 60;
      const scheduledTime = `Day ${r + 1} · ${String(matchHour).padStart(2, '0')}:${String(matchMin).padStart(2, '0')}`;

      bouts.push({
        id: boutId,
        eventId: event.id,
        categoryId: category.id,
        boutNumber,
        roundName,
        roundIndex: r,
        matchIndexInRound: m,
        nextBoutId,
        nextBoutSlot,
        redPlayerId: null,
        bluePlayerId: null,
        isBye: false,
        status: 'scheduled',
        ring: event.rings[m % event.rings.length] || 'Leitai 1',
        scheduledTime,
        rounds: initialRounds,
        currentRound: 1,
        scoreEvents: [],
        resultLocked: false,
      });
    }

    bracketRounds.push({
      roundName,
      roundIndex: r,
      bouts,
    });
  }

  // Populate Round 0 matches with initialSlots
  const round0Bouts = bracketRounds[0].bouts;
  for (let m = 0; m < round0Bouts.length; m++) {
    const slot1 = initialSlots[m * 2];
    const slot2 = initialSlots[m * 2 + 1];
    const bout = round0Bouts[m];

    if (slot1 !== 'BYE' && slot1 !== undefined) {
      bout.redPlayerId = slot1.id;
      bout.redPlayerName = slot1.name;
      bout.redClub = slot1.clubSchool;
    }
    if (slot2 !== 'BYE' && slot2 !== undefined) {
      bout.bluePlayerId = slot2.id;
      bout.bluePlayerName = slot2.name;
      bout.blueClub = slot2.clubSchool;
    }

    // Handle BYE logic: if one slot has a player and other is BYE
    if (slot1 !== 'BYE' && slot1 !== undefined && slot2 === 'BYE') {
      bout.isBye = true;
      bout.status = 'completed';
      bout.winnerId = slot1.id;
      bout.winnerCorner = 'red';
      bout.winningReason = 'BYE Automatic Advancement';
      bout.resultLocked = true;
    } else if (slot2 !== 'BYE' && slot2 !== undefined && slot1 === 'BYE') {
      bout.isBye = true;
      bout.status = 'completed';
      bout.winnerId = slot2.id;
      bout.winnerCorner = 'blue';
      bout.winningReason = 'BYE Automatic Advancement';
      bout.resultLocked = true;
    } else if (slot1 !== 'BYE' && slot2 !== 'BYE') {
      bout.status = 'ready';
    }
  }

  // Advance BYE winners to next round
  for (const bout of round0Bouts) {
    if (bout.isBye && bout.winnerId && bout.nextBoutId && bout.nextBoutSlot) {
      const nextBout = findBoutInRounds(bracketRounds, bout.nextBoutId);
      if (nextBout) {
        const winningPlayer = players.find(p => p.id === bout.winnerId);
        if (winningPlayer) {
          if (bout.nextBoutSlot === 'red') {
            nextBout.redPlayerId = winningPlayer.id;
            nextBout.redPlayerName = winningPlayer.name;
            nextBout.redClub = winningPlayer.clubSchool;
          } else {
            nextBout.bluePlayerId = winningPlayer.id;
            nextBout.bluePlayerName = winningPlayer.name;
            nextBout.blueClub = winningPlayer.clubSchool;
          }
          if (nextBout.redPlayerId && nextBout.bluePlayerId) {
            nextBout.status = 'ready';
          }
        }
      }
    }
  }

  return {
    id: `bracket-${category.id}`,
    categoryId: category.id,
    eventId: event.id,
    rounds: bracketRounds,
    generatedAt: new Date().toISOString(),
    isLocked: false,
  };
}

/**
 * Standard tournament seeding positions for bracket allocation across any power of 2
 * Recursively pairs each seed with (nextSize - 1 - seed) so top seeds are on opposite halves
 * and BYEs (unassigned trailing seeds) are balanced symmetrically.
 */
export function getSeedPositions(size: number): number[] {
  if (size <= 1) return [0];
  let current: number[] = [0, 1];
  let currentSize = 2;

  while (currentSize < size) {
    const nextSize = currentSize * 2;
    const next: number[] = [];
    for (let i = 0; i < current.length; i++) {
      const val = current[i];
      next.push(val);
      next.push(nextSize - 1 - val);
    }
    current = next;
    currentSize = nextSize;
  }

  return current;
}

/**
 * Helper to locate a bout across round structures
 */
export function findBoutInRounds(rounds: Bracket['rounds'], boutId: string): Bout | null {
  for (const round of rounds) {
    for (const b of round.bouts) {
      if (b.id === boutId) return b;
    }
  }
  return null;
}

/**
 * Automatically advances a bout winner through the single-elimination bracket tree
 */
export function advanceWinnerInBracket(
  bracket: Bracket,
  boutId: string,
  winnerId: string,
  winnerCorner: 'red' | 'blue',
  status: BoutStatus,
  winningReason: string,
  players: Player[]
): Bracket {
  const updatedRounds = bracket.rounds.map(round => ({
    ...round,
    bouts: round.bouts.map(b => {
      if (b.id === boutId) {
        return {
          ...b,
          status,
          winnerId,
          winnerCorner,
          winningReason,
          resultLocked: true,
          submittedAt: new Date().toISOString(),
        };
      }
      return b;
    })
  }));

  const currentBout = findBoutInRounds(updatedRounds, boutId);
  if (!currentBout || !currentBout.nextBoutId || !currentBout.nextBoutSlot) {
    return {
      ...bracket,
      rounds: updatedRounds,
    };
  }

  const winningPlayer = players.find(p => p.id === winnerId);
  if (!winningPlayer) {
    return {
      ...bracket,
      rounds: updatedRounds,
    };
  }

  // Update the target next bout
  for (const round of updatedRounds) {
    for (let i = 0; i < round.bouts.length; i++) {
      if (round.bouts[i].id === currentBout.nextBoutId) {
        const nextBout = { ...round.bouts[i] };
        if (currentBout.nextBoutSlot === 'red') {
          nextBout.redPlayerId = winningPlayer.id;
          nextBout.redPlayerName = winningPlayer.name;
          nextBout.redClub = winningPlayer.clubSchool;
        } else {
          nextBout.bluePlayerId = winningPlayer.id;
          nextBout.bluePlayerName = winningPlayer.name;
          nextBout.blueClub = winningPlayer.clubSchool;
        }

        // If both competitors are in place, set ready
        if (nextBout.redPlayerId && nextBout.bluePlayerId && nextBout.status === 'scheduled') {
          nextBout.status = 'ready';
        }
        round.bouts[i] = nextBout;
      }
    }
  }

  return {
    ...bracket,
    rounds: updatedRounds,
  };
}

/**
 * Reopens a completed bout for admin correction (with audit trail)
 */
export function reopenBoutInBracket(
  bracket: Bracket,
  boutId: string,
  reason: string
): Bracket {
  const boutToReopen = findBoutInRounds(bracket.rounds, boutId);
  if (!boutToReopen) return bracket;

  const previousWinnerId = boutToReopen.winnerId;
  const nextBoutId = boutToReopen.nextBoutId;
  const nextBoutSlot = boutToReopen.nextBoutSlot;

  const updatedRounds = bracket.rounds.map(round => ({
    ...round,
    bouts: round.bouts.map(b => {
      if (b.id === boutId) {
        return {
          ...b,
          status: 'ready' as BoutStatus,
          winnerId: null,
          winnerCorner: undefined,
          winningReason: undefined,
          resultLocked: false,
          reviewNotes: `Reopened: ${reason}`,
        };
      }
      // If this next bout was populated with the previous winner, clear that slot
      if (nextBoutId && b.id === nextBoutId && nextBoutSlot) {
        const updatedNext = { ...b };
        if (nextBoutSlot === 'red' && updatedNext.redPlayerId === previousWinnerId) {
          updatedNext.redPlayerId = null;
          updatedNext.redPlayerName = undefined;
          updatedNext.redClub = undefined;
          if (updatedNext.status === 'ready') updatedNext.status = 'scheduled';
        } else if (nextBoutSlot === 'blue' && updatedNext.bluePlayerId === previousWinnerId) {
          updatedNext.bluePlayerId = null;
          updatedNext.bluePlayerName = undefined;
          updatedNext.blueClub = undefined;
          if (updatedNext.status === 'ready') updatedNext.status = 'scheduled';
        }
        return updatedNext;
      }
      return b;
    })
  }));

  return {
    ...bracket,
    rounds: updatedRounds,
  };
}

/**
 * Atomically moves a player from one bout/corner to another bout/corner in a bracket.
 * Preserves bracket rounds, bout IDs, bout numbers, rings, and round progression.
 */
export function applyMovePlayerInBracket(
  bracket: Bracket,
  sourceBoutId: string,
  sourceCorner: 'red' | 'blue',
  destBoutId: string,
  destCorner: 'red' | 'blue'
): Bracket {
  let movingPlayerId: string | null = null;
  let movingPlayerName: string | undefined = undefined;
  let movingPlayerClub: string | undefined = undefined;

  // 1. Locate source bout and extract player
  for (const r of bracket.rounds) {
    for (const b of r.bouts) {
      if (b.id === sourceBoutId) {
        if (sourceCorner === 'red') {
          movingPlayerId = b.redPlayerId || null;
          movingPlayerName = b.redPlayerName;
          movingPlayerClub = b.redClub;
        } else {
          movingPlayerId = b.bluePlayerId || null;
          movingPlayerName = b.bluePlayerName;
          movingPlayerClub = b.blueClub;
        }
      }
    }
  }

  // 2. Map rounds with atomic update
  const updatedRounds = bracket.rounds.map(round => ({
    ...round,
    bouts: round.bouts.map(b => {
      const mod = { ...b };

      // Source bout: vacate player
      if (b.id === sourceBoutId) {
        if (sourceCorner === 'red') {
          mod.redPlayerId = null;
          mod.redPlayerName = undefined;
          mod.redClub = undefined;
        } else {
          mod.bluePlayerId = null;
          mod.bluePlayerName = undefined;
          mod.blueClub = undefined;
        }
        if (!mod.isBye) {
          mod.status = 'scheduled';
        }
      }

      // Destination bout: assign player
      if (b.id === destBoutId) {
        if (destCorner === 'red') {
          mod.redPlayerId = movingPlayerId;
          mod.redPlayerName = movingPlayerName;
          mod.redClub = movingPlayerClub;
        } else {
          mod.bluePlayerId = movingPlayerId;
          mod.bluePlayerName = movingPlayerName;
          mod.blueClub = movingPlayerClub;
        }

        // If replacing a BYE, clear BYE flags and ensure proper readiness
        if (mod.isBye) {
          const hasRed = Boolean(mod.redPlayerId || (mod.redPlayerName && mod.redPlayerName !== '— BYE —'));
          const hasBlue = Boolean(mod.bluePlayerId || (mod.bluePlayerName && mod.bluePlayerName !== '— BYE —'));
          if (hasRed && hasBlue) {
            mod.isBye = false;
            mod.status = 'ready';
            mod.winnerId = null;
            mod.winnerCorner = undefined;
            mod.winningReason = undefined;
            mod.resultLocked = false;
          }
        } else if (mod.redPlayerId && mod.bluePlayerId) {
          mod.status = 'ready';
        }
      }

      return mod;
    }),
  }));

  return {
    ...bracket,
    rounds: updatedRounds,
  };
}

/**
 * Atomically swaps two players between two bout positions.
 */
export function applySwapPlayersInBracket(
  bracket: Bracket,
  boutIdA: string,
  cornerA: 'red' | 'blue',
  boutIdB: string,
  cornerB: 'red' | 'blue'
): Bracket {
  let playerAId: string | null = null;
  let playerAName: string | undefined = undefined;
  let playerAClub: string | undefined = undefined;

  let playerBId: string | null = null;
  let playerBName: string | undefined = undefined;
  let playerBClub: string | undefined = undefined;

  for (const r of bracket.rounds) {
    for (const b of r.bouts) {
      if (b.id === boutIdA) {
        if (cornerA === 'red') {
          playerAId = b.redPlayerId || null;
          playerAName = b.redPlayerName;
          playerAClub = b.redClub;
        } else {
          playerAId = b.bluePlayerId || null;
          playerAName = b.bluePlayerName;
          playerAClub = b.blueClub;
        }
      }
      if (b.id === boutIdB) {
        if (cornerB === 'red') {
          playerBId = b.redPlayerId || null;
          playerBName = b.redPlayerName;
          playerBClub = b.redClub;
        } else {
          playerBId = b.bluePlayerId || null;
          playerBName = b.bluePlayerName;
          playerBClub = b.blueClub;
        }
      }
    }
  }

  const updatedRounds = bracket.rounds.map(round => ({
    ...round,
    bouts: round.bouts.map(b => {
      const mod = { ...b };
      if (b.id === boutIdA) {
        if (cornerA === 'red') {
          mod.redPlayerId = playerBId;
          mod.redPlayerName = playerBName;
          mod.redClub = playerBClub;
        } else {
          mod.bluePlayerId = playerBId;
          mod.bluePlayerName = playerBName;
          mod.blueClub = playerBClub;
        }
      }
      if (b.id === boutIdB) {
        if (cornerB === 'red') {
          mod.redPlayerId = playerAId;
          mod.redPlayerName = playerAName;
          mod.redClub = playerAClub;
        } else {
          mod.bluePlayerId = playerAId;
          mod.bluePlayerName = playerAName;
          mod.blueClub = playerAClub;
        }
      }
      return mod;
    }),
  }));

  return {
    ...bracket,
    rounds: updatedRounds,
  };
}

/**
 * Validates that no active player is assigned to two different active bouts in the bracket.
 */
export function validateBracketNoDuplicates(bracket: Bracket): {
  isValid: boolean;
  duplicatePlayerName?: string;
  boutNumbers?: string[];
} {
  const seenPlayers: Map<string, { name: string; boutNumbers: string[] }> = new Map();

  for (const round of bracket.rounds) {
    for (const b of round.bouts) {
      if (b.redPlayerId && b.redPlayerName && b.redPlayerName !== '— BYE —') {
        const existing = seenPlayers.get(b.redPlayerId);
        if (existing) {
          if (!existing.boutNumbers.includes(b.boutNumber)) {
            existing.boutNumbers.push(b.boutNumber);
            return {
              isValid: false,
              duplicatePlayerName: b.redPlayerName,
              boutNumbers: existing.boutNumbers,
            };
          }
        } else {
          seenPlayers.set(b.redPlayerId, { name: b.redPlayerName, boutNumbers: [b.boutNumber] });
        }
      }

      if (b.bluePlayerId && b.bluePlayerName && b.bluePlayerName !== '— BYE —') {
        const existing = seenPlayers.get(b.bluePlayerId);
        if (existing) {
          if (!existing.boutNumbers.includes(b.boutNumber)) {
            existing.boutNumbers.push(b.boutNumber);
            return {
              isValid: false,
              duplicatePlayerName: b.bluePlayerName,
              boutNumbers: existing.boutNumbers,
            };
          }
        } else {
          seenPlayers.set(b.bluePlayerId, { name: b.bluePlayerName, boutNumbers: [b.boutNumber] });
        }
      }
    }
  }

  return { isValid: true };
}
