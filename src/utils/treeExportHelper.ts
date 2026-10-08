import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Category, EventSetup, Bracket, Player, Bout } from '../types/tournament';

// Helper to sanitize filenames
function sanitizeFileName(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
}

// Format bout winner summary for official report
function getBoutResultText(bout: Bout): string {
  if (bout.isBye) {
    const winnerName = bout.winnerCorner === 'red' ? bout.redPlayerName : bout.bluePlayerName;
    return `BYE (Advanced: ${winnerName || 'Fighter'})`;
  }

  if (bout.status === 'completed' || bout.status.startsWith('winner_')) {
    const winnerName = bout.winnerCorner === 'red' ? bout.redPlayerName : bout.bluePlayerName;
    const cornerLabel = bout.winnerCorner ? bout.winnerCorner.toUpperCase() : 'WIN';
    const reason = bout.winningReason ? ` (${bout.winningReason})` : '';
    return `${cornerLabel}: ${winnerName || 'Winner'}${reason}`;
  }

  if (bout.status === 'live') {
    return 'LIVE IN PROGRESS';
  }

  if (bout.status === 'ready') {
    return 'ON DECK / READY';
  }

  if (bout.status === 'walkover') {
    return 'WALKOVER';
  }

  return 'Scheduled';
}

/**
 * Downloads the complete, official tournament fixtures and bracket report (multi-page PDF)
 * combining:
 * 1. Page 1: Landscape Knockout Bracket Tree Progression diagram with championship masthead
 * 2. Page 2+: Full tabular match schedule, bout-by-bout pairings, division athletes roster,
 *    championship podium standings, and official referee sign-off block.
 */
export async function downloadFullFixtureReportPdf(
  element: HTMLElement | null,
  category: Category | undefined,
  bracket: Bracket | undefined,
  event: EventSetup | undefined,
  players: Player[]
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ==========================================
  // PAGE 1: OFFICIAL KNOCKOUT BRACKET TREE
  // ==========================================
  doc.setFillColor(2, 6, 23); // Slate-950 rich arena background
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top Accent Gold Line
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 0, pageWidth, 2.5, 'F');

  // Masthead Title
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text((event?.name || 'WUSHU SANDA NATIONAL CHAMPIONSHIP').toUpperCase(), pageWidth / 2, 8, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const subHeader = `${event?.organizer || 'Official Wushu Sanda Federation'} · ${
    event?.venue || 'Main Leitai Arena'
  }, ${event?.city || 'State Stadium'} · ${event?.startDate || ''}`;
  doc.text(subHeader, pageWidth / 2, 12.5, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.setFont('helvetica', 'bold');
  doc.text(
    `OFFICIAL KNOCKOUT FIXTURE TREE · DIVISION: ${category?.name || 'CHAMPIONSHIP DIVISION'}`,
    pageWidth / 2,
    17,
    { align: 'center' }
  );

  // Capture and embed the visual tree image into Page 1
  if (element) {
    const originalOverflow = element.style.overflow;
    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;

    try {
      element.style.overflow = 'visible';
      element.style.maxWidth = 'none';

      const scrollWidth = Math.max(element.scrollWidth, element.offsetWidth, 1200);
      const scrollHeight = Math.max(element.scrollHeight, element.offsetHeight, 600);

      const dataUrl = await toPng(element, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#020617',
        width: scrollWidth,
        height: scrollHeight,
        skipFonts: true,
        cacheBust: true,
        filter: (node: Node) => {
          if (node instanceof HTMLElement) {
            if (
              node.classList?.contains('no-export') ||
              node.classList?.contains('no-print') ||
              node.getAttribute('role') === 'dialog'
            ) {
              return false;
            }
          }
          return true;
        },
        style: {
          overflow: 'visible',
          maxWidth: 'none',
          transform: 'none',
        },
      });

      const topMargin = 20;
      const bottomMargin = 8;
      const leftMargin = 6;
      const maxTreeWidth = pageWidth - leftMargin * 2;
      const maxTreeHeight = pageHeight - topMargin - bottomMargin;

      const imgRatio = scrollWidth / scrollHeight;
      let finalW = maxTreeWidth;
      let finalH = finalW / imgRatio;

      if (finalH > maxTreeHeight) {
        finalH = maxTreeHeight;
        finalW = finalH * imgRatio;
      }

      const imgX = leftMargin + (maxTreeWidth - finalW) / 2;
      const imgY = topMargin + (maxTreeHeight - finalH) / 2;

      doc.addImage(dataUrl, 'PNG', imgX, imgY, finalW, finalH, undefined, 'FAST');
    } catch (err) {
      console.warn('Could not snapshot visual tree, proceeding with full report tables:', err);
    } finally {
      element.style.overflow = originalOverflow;
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;
    }
  }

  // ==========================================
  // PAGE 2+: OFFICIAL BOUT SCHEDULE & DETAILED FIXTURES REPORT
  // ==========================================
  doc.addPage('a4', 'portrait');
  const portWidth = doc.internal.pageSize.getWidth();
  const portHeight = doc.internal.pageSize.getHeight();

  // Top Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, portWidth, 26, 'F');

  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(0, 25, portWidth, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text((event?.name || 'WUSHU SANDA NATIONAL CHAMPIONSHIP').toUpperCase(), portWidth / 2, 9, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `${event?.organizer || 'Official Wushu Sanda Federation'} · ${event?.venue || 'Leitai Arena'}, ${
      event?.city || ''
    }`,
    portWidth / 2,
    14.5,
    { align: 'center' }
  );

  doc.setFontSize(8.5);
  doc.setTextColor(251, 191, 36);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL CHAMPIONSHIP FIXTURES & BOUT SCHEDULE REPORT', portWidth / 2, 20.5, {
    align: 'center',
  });

  // Division Summary Box
  let startY = 32;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, startY, portWidth - 24, 18, 1.5, 1.5, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`DIVISION: ${category?.name || 'Category'}`, 16, startY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const totalBouts = bracket ? bracket.rounds.reduce((acc, r) => acc + r.bouts.length, 0) : 0;
  const eligibleFighters = category?.eligiblePlayerIds?.length || 0;
  const infoText = `Gender: ${(category?.gender || 'All').toUpperCase()}   |   Fighters: ${eligibleFighters}   |   Total Bouts: ${totalBouts}   |   Rules: IWUF Standard Sanda (Best 2 of 3)`;
  doc.text(infoText, 16, startY + 12);

  startY += 24;

  // Render Table of all bouts across rounds
  if (bracket && bracket.rounds && bracket.rounds.length > 0) {
    bracket.rounds.forEach((round, rIdx) => {
      if (startY > portHeight - 45) {
        doc.addPage('a4', 'portrait');
        startY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`STAGE: ${round.roundName.toUpperCase()}`, 12, startY);
      startY += 3;

      const boutRows = round.bouts.map(b => {
        const redDetails = b.redPlayerName
          ? `${b.redPlayerName}${b.redClub ? `\n[${b.redClub}]` : ''}`
          : b.isBye && !b.redPlayerId
          ? '— BYE —'
          : 'Awaiting Winner';

        const blueDetails = b.bluePlayerName
          ? `${b.bluePlayerName}${b.blueClub ? `\n[${b.blueClub}]` : ''}`
          : b.isBye && !b.bluePlayerId
          ? '— BYE —'
          : 'Awaiting Winner';

        return [
          b.boutNumber || `B-${rIdx + 1}`,
          redDetails,
          'VS',
          blueDetails,
          b.ring || 'Leitai 1',
          b.scheduledTime || 'TBD',
          getBoutResultText(b),
        ];
      });

      autoTable(doc, {
        startY,
        head: [['Bout #', 'Red Corner (Hong)', 'vs', 'Blue Corner (Hei)', 'Ring', 'Time', 'Result / Status']],
        body: boutRows,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 42, halign: 'left', textColor: [185, 28, 28] }, // Red
          2: { cellWidth: 8, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] },
          3: { cellWidth: 42, halign: 'left', textColor: [29, 78, 216] }, // Blue
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 16, halign: 'center' },
          6: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
        },
        styles: {
          fontSize: 7,
          cellPadding: 1.8,
          valign: 'middle',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 12, right: 12 },
      });

      // @ts-expect-error - lastAutoTable is injected by jspdf-autotable
      startY = doc.lastAutoTable.finalY + 6;
    });
  }

  // TABLE 2: ATHLETES ROSTER FOR THIS DIVISION
  const categoryFighters = players.filter(p => category?.eligiblePlayerIds?.includes(p.id));
  if (categoryFighters.length > 0) {
    if (startY > portHeight - 50) {
      doc.addPage('a4', 'portrait');
      startY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('OFFICIAL DIVISION ATHLETES ROSTER', 12, startY);
    startY += 3;

    const rosterRows = categoryFighters.map((p, idx) => [
      `#${idx + 1}`,
      p.name,
      p.registrationNumber || '-',
      p.clubSchool || p.district || '-',
      p.gender.toUpperCase(),
      `${p.weightKg} kg`,
      p.status.toUpperCase(),
    ]);

    autoTable(doc, {
      startY,
      head: [['Seed / #', 'Athlete Name', 'Reg. Number', 'Club / District', 'Gender', 'Weight', 'Status']],
      body: rosterRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 42, fontStyle: 'bold' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 22, halign: 'center' },
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.8,
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 12, right: 12 },
    });

    // @ts-expect-error - lastAutoTable is injected by jspdf-autotable
    startY = doc.lastAutoTable.finalY + 6;
  }

  // CHAMPIONSHIP PODIUM MEDAL SUMMARY (If Final is completed)
  const finalRound = bracket?.rounds[bracket.rounds.length - 1];
  const finalBout = finalRound?.bouts[0];
  if (finalBout && finalBout.winnerId) {
    if (startY > portHeight - 40) {
      doc.addPage('a4', 'portrait');
      startY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('OFFICIAL CHAMPIONSHIP PODIUM & MEDAL STANDINGS', 12, startY);
    startY += 3;

    const goldName = finalBout.winnerCorner === 'red' ? finalBout.redPlayerName : finalBout.bluePlayerName;
    const goldClub = finalBout.winnerCorner === 'red' ? finalBout.redClub : finalBout.blueClub;

    const silverName = finalBout.winnerCorner === 'red' ? finalBout.bluePlayerName : finalBout.redPlayerName;
    const silverClub = finalBout.winnerCorner === 'red' ? finalBout.blueClub : finalBout.redClub;

    const podiumRows = [
      ['GOLD MEDALIST (CHAMPION)', goldName || 'Champion', goldClub || '-', '1st Place (Gold)'],
      ['SILVER MEDALIST (RUNNER-UP)', silverName || 'Runner-Up', silverClub || '-', '2nd Place (Silver)'],
    ];

    autoTable(doc, {
      startY,
      head: [['Medal Placement', 'Athlete Name', 'Club / District', 'Result']],
      body: podiumRows,
      theme: 'grid',
      headStyles: {
        fillColor: [180, 83, 9],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        valign: 'middle',
      },
      margin: { left: 12, right: 12 },
    });

    // @ts-expect-error - lastAutoTable is injected by jspdf-autotable
    startY = doc.lastAutoTable.finalY + 6;
  }

  // FEDERATION OFFICIAL SIGN-OFF BLOCK
  if (startY > portHeight - 35) {
    doc.addPage('a4', 'portrait');
    startY = 25;
  }

  const sigY = portHeight - 20;
  const colW = (portWidth - 24) / 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);

  doc.line(12, sigY, 12 + colW - 6, sigY);
  doc.text('Chief Referee / Head Mat Official', 12, sigY + 3.5);

  doc.line(12 + colW, sigY, 12 + colW * 2 - 6, sigY);
  doc.text('President of Jury of Appeal', 12 + colW, sigY + 3.5);

  doc.line(12 + colW * 2, sigY, portWidth - 12, sigY);
  doc.text('Tournament Technical Director', 12 + colW * 2, sigY + 3.5);

  // Add Page Numbers and Official Stamp Footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pW = doc.internal.pageSize.getWidth();
    const pH = doc.internal.pageSize.getHeight();
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Official Wushu Sanda Championship Fixture Report · Generated: ${new Date().toLocaleString()} · Page ${i} of ${totalPages}`,
      pW / 2,
      pH - 4,
      { align: 'center' }
    );
  }

  const safeCat = sanitizeFileName(category?.name || 'Fixture_Report');
  doc.save(`Wushu_Sanda_Full_Report_${safeCat}.pdf`);
}

/**
 * Downloads the knockout bracket tree DOM element as a high-resolution PNG image.
 */
export async function downloadTreeAsPng(
  element: HTMLElement,
  categoryName: string,
  eventName?: string
): Promise<void> {
  const originalOverflow = element.style.overflow;
  const originalWidth = element.style.width;
  const originalMaxWidth = element.style.maxWidth;

  try {
    element.style.overflow = 'visible';
    element.style.maxWidth = 'none';

    const scrollWidth = Math.max(element.scrollWidth, element.offsetWidth, 1200);
    const scrollHeight = Math.max(element.scrollHeight, element.offsetHeight, 600);

    const dataUrl = await toPng(element, {
      quality: 0.98,
      pixelRatio: 2,
      backgroundColor: '#020617',
      width: scrollWidth,
      height: scrollHeight,
      skipFonts: true,
      cacheBust: true,
      filter: (node: Node) => {
        if (node instanceof HTMLElement) {
          if (
            node.classList?.contains('no-export') ||
            node.classList?.contains('no-print') ||
            node.getAttribute('role') === 'dialog'
          ) {
            return false;
          }
        }
        return true;
      },
      style: {
        overflow: 'visible',
        maxWidth: 'none',
        transform: 'none',
      },
    });

    const link = document.createElement('a');
    const safeCat = sanitizeFileName(categoryName || 'Knockout_Tree');
    link.download = `Wushu_Sanda_Fixture_Tree_${safeCat}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    element.style.overflow = originalOverflow;
    element.style.width = originalWidth;
    element.style.maxWidth = originalMaxWidth;
  }
}

/**
 * Downloads the knockout bracket tree as an official landscape PDF document.
 */
export async function downloadTreeAsPdf(
  element: HTMLElement,
  category?: Category,
  event?: EventSetup
): Promise<void> {
  const originalOverflow = element.style.overflow;
  const originalWidth = element.style.width;
  const originalMaxWidth = element.style.maxWidth;

  try {
    element.style.overflow = 'visible';
    element.style.maxWidth = 'none';

    const scrollWidth = Math.max(element.scrollWidth, element.offsetWidth, 1200);
    const scrollHeight = Math.max(element.scrollHeight, element.offsetHeight, 600);

    const dataUrl = await toPng(element, {
      quality: 0.98,
      pixelRatio: 2,
      backgroundColor: '#020617',
      width: scrollWidth,
      height: scrollHeight,
      skipFonts: true,
      cacheBust: true,
      filter: (node: Node) => {
        if (node instanceof HTMLElement) {
          if (
            node.classList?.contains('no-export') ||
            node.classList?.contains('no-print') ||
            node.getAttribute('role') === 'dialog'
          ) {
            return false;
          }
        }
        return true;
      },
      style: {
        overflow: 'visible',
        maxWidth: 'none',
        transform: 'none',
      },
    });

    const imgRatio = scrollWidth / scrollHeight;
    const isPortrait = imgRatio < 0.9;
    const orientation = isPortrait ? 'portrait' : 'landscape';
    const format = scrollWidth > 1700 ? 'a3' : 'a4';

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.setFillColor(2, 6, 23);
    pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

    const margin = 8;
    const maxContentWidth = pdfWidth - margin * 2;
    const maxContentHeight = pdfHeight - margin * 2;

    let finalWidth = maxContentWidth;
    let finalHeight = finalWidth / imgRatio;

    if (finalHeight > maxContentHeight) {
      finalHeight = maxContentHeight;
      finalWidth = finalHeight * imgRatio;
    }

    const posX = margin + (maxContentWidth - finalWidth) / 2;
    const posY = margin + (maxContentHeight - finalHeight) / 2;

    pdf.addImage(dataUrl, 'PNG', posX, posY, finalWidth, finalHeight, undefined, 'FAST');

    const safeCat = sanitizeFileName(category?.name || 'Knockout_Tree');
    pdf.save(`Wushu_Sanda_Fixture_Tree_${safeCat}.pdf`);
  } finally {
    element.style.overflow = originalOverflow;
    element.style.width = originalWidth;
    element.style.maxWidth = originalMaxWidth;
  }
}

/**
 * Triggers official browser print window optimized for the tournament bracket tree.
 */
export function printTreeFixture(): void {
  window.print();
}

export {
  generatePlainTextFixture,
  downloadPlainTextFixture,
  downloadTraditionalTreePdf,
} from './plainTextFixtureGenerator';
