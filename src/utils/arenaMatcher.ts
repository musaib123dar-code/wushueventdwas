/**
 * Arena Matching & Security Normalization Utility
 * Strictly verifies whether an official's designated arena assignment
 * matches the bout's assigned Leitai platform / ring.
 */

export function normalizeArenaName(name?: string | null): string {
  if (!name) return '';
  return name.trim().toLowerCase();
}

/**
 * Extracts arena key/number or identifier if applicable:
 * e.g. "Leitai 1 (Platform A)" -> ring number "1", platform "A"
 * e.g. "Arena 2" -> ring number "2"
 */
export function getArenaIdentifier(name?: string | null): {
  raw: string;
  number?: string;
  letter?: string;
} {
  if (!name) return { raw: '' };
  const raw = name.trim();
  const numMatch =
    raw.match(/(?:leitai|arena|ring|mat|platform)\s*#?\s*(\d+)/i) ||
    raw.match(/\b(\d+)\b/);
  const letterMatch =
    raw.match(/platform\s*([a-z])/i) ||
    raw.match(/\(([a-z])\)/i);

  return {
    raw,
    number: numMatch ? numMatch[1] : undefined,
    letter: letterMatch ? letterMatch[1].toUpperCase() : undefined,
  };
}

/**
 * Checks whether user's assigned arena matches the bout arena strictly and securely.
 * Rejects any cross-arena mismatch.
 */
export function isArenaMatch(
  userArena?: string | null,
  boutArena?: string | null
): boolean {
  if (!userArena || !boutArena) return false;

  const uNorm = normalizeArenaName(userArena);
  const bNorm = normalizeArenaName(boutArena);

  // Exact match
  if (uNorm === bNorm) return true;

  // Substring match only if they share the exact ring identity
  const uInfo = getArenaIdentifier(userArena);
  const bInfo = getArenaIdentifier(boutArena);

  if (uInfo.number && bInfo.number) {
    if (uInfo.number !== bInfo.number) {
      // Different arena numbers (e.g. Ring 1 vs Ring 2) => definitely not a match!
      return false;
    }

    // Same arena number. If both have platform letters, they must match.
    if (uInfo.letter && bInfo.letter) {
      return uInfo.letter === bInfo.letter;
    }

    return true;
  }

  // Fallback to normalized substring containment if no digits
  return uNorm.includes(bNorm) || bNorm.includes(uNorm);
}
