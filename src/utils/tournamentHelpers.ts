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
function getRoundName(roundIndex: number, totalRounds: number): 'Round of 32' | 'Round of 16' | 'Quarterfinal' | 'Semifinal' | 'Final' {
  const roundsFromEnd = totalRounds - 1 - roundIndex;
  if (roundsFromEnd === 0) return 'Final';
  if (roundsFromEnd === 1) return 'Semifinal';
  if (roundsFromEnd === 2) return 'Quarterfinal';
  if (roundsFromEnd === 3) return 'Round of 16';
  return 'Round of 32';
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

  // Find next power of 2 (2, 4, 8, 16, 32)
  let bracketSize = 2;
  while (bracketSize < count) {
    bracketSize *= 2;
  }
  if (bracketSize > 32) {
    bracketSize = 32; // cap for standard tournament divisions
  }

  const totalRounds = Math.log2(bracketSize);
  const byesCount = bracketSize - count;

  // Bracket slot distribution: seed players and byes
  // In tournament brackets, byes are seeded at alternating opposite ends (top and bottom)
  const initialSlots: (Player | 'BYE')[] = new Array(bracketSize).fill('BYE');
  
  // Standard tournament seeding positions for 4, 8, 16, 32
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

  // We build from Round 0 (e.g. Round of 16 or Quarterfinal) up to Final
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
        scheduledTime: `Day ${r + 1} · 10:${String((m * 15) % 60).padStart(2, '0')}`,
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
 * Standard seeding positions for bracket allocation
 */
function getSeedPositions(size: number): number[] {
  if (size === 2) return [0, 1];
  if (size === 4) return [0, 3, 1, 2];
  if (size === 8) return [0, 7, 3, 4, 1, 6, 2, 5];
  if (size === 16) return [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];
  if (size === 32) {
    return [
      0, 31, 15, 16, 7, 24, 8, 23, 3, 28, 12, 19, 4, 27, 11, 20,
      1, 30, 14, 17, 6, 25, 9, 22, 2, 29, 13, 18, 5, 26, 10, 21
    ];
  }
  return Array.from({ length: size }, (_, i) => i);
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
