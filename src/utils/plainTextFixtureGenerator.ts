import jsPDF from 'jspdf';
import { Bracket, Category, EventSetup } from '../types/tournament';

// Helper to sanitize filenames
function sanitizeFileName(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
}

// Format short label for round (e.g. "Quarterfinals" -> "QF", "Semifinals" -> "SF")
function getShortRoundCode(roundName: string, roundIndex: number, totalRounds: number): string {
  const normalized = roundName.toLowerCase();
  if (normalized.includes('final') && !normalized.includes('semi') && !normalized.includes('quarter')) {
    return 'Final';
  }
  if (normalized.includes('semi')) return 'SF';
  if (normalized.includes('quarter')) return 'QF';
  if (normalized.includes('16')) return 'R16';
  if (normalized.includes('32')) return 'R32';
  if (normalized.includes('64')) return 'R64';
  return `R${roundIndex + 1}`;
}

/**
 * Generates an exact Plain Text tournament bracket tree diagram with box-drawing lines,
 * matching official single-elimination tournament bracket standards.
 */
export function generatePlainTextFixture(
  bracket: Bracket,
  category?: Category,
  event?: EventSetup
): string {
  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
    return 'No fixtures generated yet for this category.';
  }

  const rounds = bracket.rounds;
  const numRounds = rounds.length;
  const firstRoundBouts = rounds[0].bouts;
  const numFirstRoundBouts = firstRoundBouts.length;

  if (numFirstRoundBouts === 0) {
    return 'No bouts available in fixture.';
  }

  // 1. Calculate row positions for all nodes
  // Each bout in round 0 has:
  // - Top participant at: 4 * boutIndex
  // - Mid output stem at: 4 * boutIndex + 1
  // - Bottom participant at: 4 * boutIndex + 2
  // - Gap at: 4 * boutIndex + 3
  const totalGridRows = Math.max(numFirstRoundBouts * 4, 8);

  // We'll calculate the row of each bout's output stem:
  // boutMidRows[roundIndex][boutIndex]
  const boutMidRows: number[][] = [];
  const boutTopRows: number[][] = [];
  const boutBotRows: number[][] = [];

  // Round 0
  boutMidRows[0] = [];
  boutTopRows[0] = [];
  boutBotRows[0] = [];
  for (let b = 0; b < numFirstRoundBouts; b++) {
    boutTopRows[0][b] = b * 4;
    boutMidRows[0][b] = b * 4 + 1;
    boutBotRows[0][b] = b * 4 + 2;
  }

  // Higher rounds: each bout connects two previous outputs
  for (let r = 1; r < numRounds; r++) {
    boutMidRows[r] = [];
    boutTopRows[r] = [];
    boutBotRows[r] = [];
    const boutsInRound = rounds[r].bouts.length;

    for (let b = 0; b < boutsInRound; b++) {
      const topParentMid = boutMidRows[r - 1][b * 2] ?? (b * 4);
      const botParentMid = boutMidRows[r - 1][b * 2 + 1] ?? (b * 4 + 2);

      boutTopRows[r][b] = topParentMid;
      boutBotRows[r][b] = botParentMid;
      boutMidRows[r][b] = Math.round((topParentMid + botParentMid) / 2);
    }
  }

  // Final champion row is at the midRow of the final bout
  const finalRoundIndex = numRounds - 1;
  const finalBout = rounds[finalRoundIndex]?.bouts[0];
  const championRow = boutMidRows[finalRoundIndex]?.[0] ?? Math.floor(totalGridRows / 2);

  let championName = '🏆 CHAMPION';
  if (finalBout?.winnerId) {
    const goldName = finalBout.winnerCorner === 'red' ? finalBout.redPlayerName : finalBout.bluePlayerName;
    championName = `🏆 CHAMPION: ${goldName || 'Gold Medalist'}`;
  }

  // 2. Measure column text widths
  // We need column positions C_0, C_1, C_2...
  // C_r is the column where round r's bracket line turns down or ends
  // First, find the maximum participant name length in Round 0
  let maxR0NameLen = 8;
  for (let b = 0; b < numFirstRoundBouts; b++) {
    const bout = firstRoundBouts[b];
    const topN = bout.redPlayerName || (bout.isBye && !bout.redPlayerId ? 'BYE' : `Player ${b * 2 + 1}`);
    const botN = bout.bluePlayerName || (bout.isBye && !bout.bluePlayerId ? 'BYE' : `Player ${b * 2 + 2}`);
    if (topN.length > maxR0NameLen) maxR0NameLen = topN.length;
    if (botN.length > maxR0NameLen) maxR0NameLen = botN.length;
  }
  maxR0NameLen = Math.max(maxR0NameLen, 10);

  // Column start positions and branch lengths
  // Col 0 is where Player names start.
  // Col Branch0 is where `──┐` and `──┘` end: (maxR0NameLen + 1)
  const branchCol: number[] = [];
  const textCol: number[] = [];

  // Round 0
  textCol[0] = 0;
  branchCol[0] = maxR0NameLen + 3; // "Player X ──┐"

  // For subsequent rounds:
  // Each stem has `├── Winner X ──┐`
  for (let r = 1; r < numRounds; r++) {
    // Determine max winner label in round r-1
    let maxWinnerLabel = 10;
    const prevBouts = rounds[r - 1].bouts;
    for (let b = 0; b < prevBouts.length; b++) {
      const bout = prevBouts[b];
      let label = '';
      if (bout.winnerId) {
        label = (bout.winnerCorner === 'red' ? bout.redPlayerName : bout.bluePlayerName) || 'Winner';
      } else {
        const shortCode = getShortRoundCode(rounds[r - 1].roundName, r - 1, numRounds);
        label = `Winner ${shortCode}${b + 1}`;
      }
      if (label.length > maxWinnerLabel) maxWinnerLabel = label.length;
    }

    // `├── ` is 4 chars, label is maxWinnerLabel chars, ` ──` is 3 chars, total addition
    textCol[r] = branchCol[r - 1]; // connects right at the vertical line
    branchCol[r] = textCol[r] + 4 + maxWinnerLabel + 4;
  }

  // Champion column starts at branchCol[numRounds - 1]
  const championCol = branchCol[numRounds - 1];
  const totalGridCols = championCol + championName.length + 10;

  // 3. Initialize 2D character matrix filled with spaces
  const canvas: string[][] = Array.from({ length: totalGridRows }, () =>
    Array(totalGridCols).fill(' ')
  );

  // Helper to safely write a string into canvas
  function writeString(r: number, c: number, str: string) {
    if (r < 0 || r >= totalGridRows) return;
    for (let i = 0; i < str.length; i++) {
      if (c + i < totalGridCols) {
        canvas[r][c + i] = str[i];
      }
    }
  }

  // 4. Draw Round 0: Player names and initial branch arms `──┐` and `──┘`
  for (let b = 0; b < numFirstRoundBouts; b++) {
    const bout = firstRoundBouts[b];
    const topRow = boutTopRows[0][b];
    const botRow = boutBotRows[0][b];
    const stemRow = boutMidRows[0][b];
    const bCol = branchCol[0];

    const topName = bout.redPlayerName || (bout.isBye && !bout.redPlayerId ? 'BYE' : `Player ${b * 2 + 1}`);
    const botName = bout.bluePlayerName || (bout.isBye && !bout.bluePlayerId ? 'BYE' : `Player ${b * 2 + 2}`);

    // Top participant line: "Name ──┐"
    writeString(topRow, 0, topName);
    // Draw horizontal line from end of name + 1 to bCol - 1
    for (let col = topName.length + 1; col < bCol; col++) {
      canvas[topRow][col] = '─';
    }
    canvas[topRow][bCol] = '┐';

    // Bottom participant line: "Name ──┘"
    writeString(botRow, 0, botName);
    for (let col = botName.length + 1; col < bCol; col++) {
      canvas[botRow][col] = '─';
    }
    canvas[botRow][bCol] = '┘';

    // Vertical line between top and bottom at bCol
    for (let row = topRow + 1; row < botRow; row++) {
      canvas[row][bCol] = '│';
    }
  }

  // 5. Draw subsequent rounds: winner stems and branches
  for (let r = 0; r < numRounds; r++) {
    const bouts = rounds[r].bouts;
    const curBranchCol = branchCol[r];
    const isFinalRound = r === numRounds - 1;

    for (let b = 0; b < bouts.length; b++) {
      const bout = bouts[b];
      const stemRow = boutMidRows[r][b];

      // Format winner label
      let winnerLabel = '';
      if (bout.winnerId) {
        winnerLabel = (bout.winnerCorner === 'red' ? bout.redPlayerName : bout.bluePlayerName) || 'Winner';
      } else {
        const shortCode = getShortRoundCode(rounds[r].roundName, r, numRounds);
        winnerLabel = `Winner ${shortCode}${b + 1}`;
      }

      // Junction at curBranchCol: replace '│' with '├'
      canvas[stemRow][curBranchCol] = '├';
      canvas[stemRow][curBranchCol + 1] = '─';
      canvas[stemRow][curBranchCol + 2] = '─';
      canvas[stemRow][curBranchCol + 3] = ' ';

      const labelStartCol = curBranchCol + 4;
      writeString(stemRow, labelStartCol, winnerLabel);

      if (!isFinalRound) {
        // Next round's branch arm
        const nextBCol = branchCol[r + 1];
        const lineStartCol = labelStartCol + winnerLabel.length + 1;

        for (let col = lineStartCol; col < nextBCol; col++) {
          canvas[stemRow][col] = '─';
        }

        // Even index turns down '┐', odd index turns up '┘'
        canvas[stemRow][nextBCol] = b % 2 === 0 ? '┐' : '┘';
      } else {
        // Final bout: line extends directly into Champion
        const lineStartCol = labelStartCol + winnerLabel.length + 1;
        for (let col = lineStartCol; col < championCol; col++) {
          canvas[stemRow][col] = '─';
        }
      }
    }

    // Connect vertical line '│' between pairs of bouts into round r + 1
    if (!isFinalRound) {
      const nextBCol = branchCol[r + 1];
      for (let k = 0; k < bouts.length; k += 2) {
        const topRow = boutMidRows[r][k];
        const botRow = boutMidRows[r][k + 1];

        if (topRow !== undefined && botRow !== undefined) {
          for (let row = topRow + 1; row < botRow; row++) {
            canvas[row][nextBCol] = '│';
          }
        }
      }
    } else {
      // Connect final to Champion node
      canvas[championRow][championCol] = '├';
      canvas[championRow][championCol + 1] = '─';
      canvas[championRow][championCol + 2] = ' ';
      writeString(championRow, championCol + 3, championName);
    }
  }

  // 6. Assemble round column headers
  // E.g. "Quarterfinals            Semifinals           FINAL"
  let headersLine = Array(totalGridCols).fill(' ');
  for (let r = 0; r < numRounds; r++) {
    const colPos = r === 0 ? 0 : textCol[r] + 4;
    const rName = rounds[r].roundName;
    for (let i = 0; i < rName.length; i++) {
      if (colPos + i < totalGridCols) {
        headersLine[colPos + i] = rName[i];
      }
    }
  }

  const champHeaderPos = championCol + 3;
  const champHeader = 'FINAL / CHAMPION';
  for (let i = 0; i < champHeader.length; i++) {
    if (champHeaderPos + i < totalGridCols) {
      headersLine[champHeaderPos + i] = champHeader[i];
    }
  }

  // 7. Format output string
  const outputLines: string[] = [];

  // Plain Text Header Badge (matching user's screenshot)
  outputLines.push('</> Plain text');
  outputLines.push('');
  outputLines.push('               ' + (event?.name || 'SANDA WUSHU FIXTURE').toUpperCase());
  if (category?.name) {
    outputLines.push('               DIVISION: ' + category.name.toUpperCase());
  }
  outputLines.push('');

  // Column header row
  outputLines.push(headersLine.join('').trimEnd());
  outputLines.push('');

  // Body canvas rows
  for (let r = 0; r < totalGridRows; r++) {
    const line = canvas[r].join('').trimEnd();
    if (line.length > 0) {
      outputLines.push(line);
    }
  }

  return outputLines.join('\n');
}

/**
 * Directly downloads the Plain Text tournament bracket fixture as a `.txt` file.
 */
export function downloadPlainTextFixture(
  bracket: Bracket,
  category?: Category,
  event?: EventSetup
): void {
  const textContent = generatePlainTextFixture(bracket, category, event);
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeCat = sanitizeFileName(category?.name || 'Knockout_Tree');
  link.download = `Sanda_Wushu_Fixture_${safeCat}.txt`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a clean Traditional Line-Tree Bracket as a vector-sharp landscape PDF document.
 */
export function downloadTraditionalTreePdf(
  bracket: Bracket,
  category?: Category,
  event?: EventSetup
): void {
  const textContent = generatePlainTextFixture(bracket, category, event);
  const safeCat = sanitizeFileName(category?.name || 'Knockout_Tree');

  const lines = textContent.split('\n');
  const maxLineLength = Math.max(...lines.map(l => l.length), 80);

  // Choose format based on horizontal width
  const format = maxLineLength > 120 ? 'a3' : 'a4';

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format,
  });

  const pWidth = doc.internal.pageSize.getWidth();
  const pHeight = doc.internal.pageSize.getHeight();

  // Clean white paper background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pWidth, pHeight, 'F');

  // Top Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pWidth, 20, 'F');

  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 20, pWidth, 1.2, 'F');

  doc.setFont('courier', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text((event?.name || 'WUSHU SANDA NATIONAL CHAMPIONSHIP').toUpperCase(), pWidth / 2, 8, {
    align: 'center',
  });

  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  const orgText = `${event?.organizer || 'Official Wushu Sanda Federation'} · ${event?.venue || 'Leitai Arena'} · ${event?.startDate || ''}`;
  doc.text(orgText, pWidth / 2, 13, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(251, 191, 36);
  doc.text(
    `OFFICIAL KNOCKOUT TREE FIXTURE · DIVISION: ${(category?.name || 'DIVISION').toUpperCase()}`,
    pWidth / 2,
    18,
    { align: 'center' }
  );

  // Body Text in Monospace / Courier Font for exact line alignment
  doc.setFont('courier', 'normal');
  doc.setTextColor(15, 23, 42);

  // Calculate appropriate font size and line spacing to fit landscape page with footer room
  const availableHeight = pHeight - 48; // leaving 20 for header and 25 for signature
  const lineSpacing = Math.min(availableHeight / (lines.length + 1), 4.5);
  const fontSize = Math.min(lineSpacing * 1.8, 8.5);

  doc.setFontSize(fontSize);

  let startY = 27;
  for (const line of lines) {
    if (startY > pHeight - 24) break;
    doc.text(line, 8, startY);
    startY += lineSpacing;
  }

  // Official Signature Verification Line Block at Bottom
  const sigY = pHeight - 14;
  const colW = (pWidth - 24) / 3;

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);

  // 1. Chief Referee
  doc.setDrawColor(148, 163, 184);
  doc.line(12, sigY, 12 + colW - 8, sigY);
  doc.text('Chief Referee / Head Mat Official', 12, sigY + 3.5);

  // 2. Jury of Appeal
  doc.line(12 + colW, sigY, 12 + colW * 2 - 8, sigY);
  doc.text('President of Jury of Appeal', 12 + colW, sigY + 3.5);

  // 3. Technical Director
  doc.line(12 + colW * 2, sigY, pWidth - 12, sigY);
  doc.text('Tournament Technical Director', 12 + colW * 2, sigY + 3.5);

  // Footer stamp
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Championship Fixture Sheet · Generated: ${new Date().toLocaleString()} · IWUF Sanda Technical Rules`,
    pWidth / 2,
    pHeight - 4,
    { align: 'center' }
  );

  doc.save(`Wushu_Sanda_Tree_Fixture_${safeCat}.pdf`);
}

