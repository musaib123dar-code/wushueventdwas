import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Category, Bracket, EventSetup, Bout } from '../types/tournament';

// Helper to sanitize text for PDF
const safeText = (text?: string | null): string => {
  if (!text) return '-';
  return text.trim();
};

// Format bout winner summary
const getBoutResultText = (bout: Bout): string => {
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
};

/**
 * Generate PDF fixtures for a single category division
 */
export function exportCategoryFixturesPdf(
  category: Category,
  bracket: Bracket | undefined,
  event: EventSetup
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top Accent Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(0, 27, pageWidth, 1.5, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(event.name.toUpperCase(), pageWidth / 2, 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  const subHeader = `${safeText(event.organizer)} · ${safeText(event.venue)}, ${safeText(event.city)} · ${safeText(event.startDate)}`;
  doc.text(subHeader, pageWidth / 2, 16, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text('OFFICIAL WUSHU SANDA BOUT FIXTURES SHEET', pageWidth / 2, 22, { align: 'center' });

  // Category Division Summary Box
  let startY = 35;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, startY, pageWidth - 28, 20, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`DIVISION: ${category.name}`, 18, startY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const totalBouts = bracket ? bracket.rounds.reduce((acc, r) => acc + r.bouts.length, 0) : 0;
  const eligibleFighters = category.eligiblePlayerIds?.length || 0;
  const infoLine = `Gender: ${category.gender.toUpperCase()}   |   Total Registered Fighters: ${eligibleFighters}   |   Total Bouts: ${totalBouts}   |   Rules: IWUF Standard (Best of 3)`;
  doc.text(infoLine, 18, startY + 14);

  startY += 26;

  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text('No fixtures have been generated for this category division yet.', 18, startY + 10);
    doc.save(`fixtures_${category.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`);
    return;
  }

  // Iterate over rounds and print tables
  bracket.rounds.forEach((round, roundIdx) => {
    // Check if we need a new page
    if (startY > pageHeight - 50) {
      doc.addPage();
      startY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`STAGE: ${round.roundName.toUpperCase()}`, 14, startY);
    startY += 3;

    const tableRows = round.bouts.map(bout => {
      const redDetails = bout.redPlayerName
        ? `${bout.redPlayerName}${bout.redClub ? `\n[${bout.redClub}]` : ''}`
        : 'BYE / TBD';

      const blueDetails = bout.bluePlayerName
        ? `${bout.bluePlayerName}${bout.blueClub ? `\n[${bout.blueClub}]` : ''}`
        : 'BYE / TBD';

      return [
        bout.boutNumber || `B-${roundIdx + 1}`,
        redDetails,
        'VS',
        blueDetails,
        bout.ring || 'Leitai 1',
        getBoutResultText(bout),
      ];
    });

    autoTable(doc, {
      startY,
      head: [['Bout #', 'Red Corner (Fighter / Club)', 'vs', 'Blue Corner (Fighter / Club)', 'Ring Platform', 'Result / Status']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 46, halign: 'left', textColor: [185, 28, 28] }, // red corner dark red
        2: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] },
        3: { cellWidth: 46, halign: 'left', textColor: [29, 78, 216] }, // blue corner dark blue
        4: { cellWidth: 26, halign: 'center' },
        5: { cellWidth: 'auto', halign: 'left' },
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-expect-error - lastAutoTable is injected by jspdf-autotable
    startY = doc.lastAutoTable.finalY + 8;
  });

  // Federation Signatures block at the bottom
  if (startY > pageHeight - 35) {
    doc.addPage();
    startY = 25;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);

  const sigY = pageHeight - 22;
  const colW = (pageWidth - 28) / 3;

  doc.line(14, sigY, 14 + colW - 8, sigY);
  doc.text('Chief Referee / Head Mat Official', 14, sigY + 4);

  doc.line(14 + colW, sigY, 14 + colW * 2 - 8, sigY);
  doc.text('President of Jury of Appeal', 14 + colW, sigY + 4);

  doc.line(14 + colW * 2, sigY, pageWidth - 14, sigY);
  doc.text('Tournament Technical Director', 14 + colW * 2, sigY + 4);

  // Page Numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated on ${new Date().toLocaleString()} · Official Tournament Fixtures · Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const filename = `fixtures_${category.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}

/**
 * Generate Complete Championship Fixtures Booklet (All Categories in one unified PDF)
 */
export function exportAllFixturesPdf(
  categories: Category[],
  brackets: Bracket[],
  event: EventSetup
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // COVER PAGE
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative Golden Border
  doc.setDrawColor(217, 119, 6); // amber-600
  doc.setLineWidth(1.2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Inner Subtle Border
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.setLineWidth(0.4);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

  // Cover Content
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(251, 191, 36); // amber-400
  doc.setFontSize(11);
  doc.text('WUSHU SANDA ARENA CHAMPIONSHIP', pageWidth / 2, 50, { align: 'center' });

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  // Split title if long
  const titleLines = doc.splitTextToSize(event.name.toUpperCase(), pageWidth - 40);
  doc.text(titleLines, pageWidth / 2, 75, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('OFFICIAL KNOCKOUT FIXTURES BOOKLET', pageWidth / 2, 105, { align: 'center' });

  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 35, 112, pageWidth / 2 + 35, 112);

  // Event Details on Cover
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(226, 232, 240);
  doc.text(`Sanctioned by: ${safeText(event.organizer)}`, pageWidth / 2, 130, { align: 'center' });
  doc.text(`Venue: ${safeText(event.venue)}, ${safeText(event.city)}${event.state ? `, ${event.state}` : ''}`, pageWidth / 2, 138, { align: 'center' });
  doc.text(`Dates: ${safeText(event.startDate)} to ${safeText(event.endDate)}`, pageWidth / 2, 146, { align: 'center' });
  doc.text(`Age Reference Date: ${safeText(event.tournamentReferenceDate)}`, pageWidth / 2, 154, { align: 'center' });
  doc.text(`Competition Standard: IWUF Sanda Standard (Best of 3 Rounds)`, pageWidth / 2, 162, { align: 'center' });

  // Summary counts
  const totalBoutsAcrossAll = brackets.reduce(
    (acc, b) => acc + b.rounds.reduce((rAcc, r) => rAcc + r.bouts.length, 0),
    0
  );

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(30, 180, pageWidth - 60, 36, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(251, 191, 36);
  doc.text('CHAMPIONSHIP FIXTURES SUMMARY', pageWidth / 2, 192, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(241, 245, 249);
  doc.text(`Total Weight/Age Divisions: ${categories.length}`, pageWidth / 2, 200, { align: 'center' });
  doc.text(`Total Fixture Bouts Scheduled: ${totalBoutsAcrossAll}`, pageWidth / 2, 207, { align: 'center' });

  // Cover Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Published: ${new Date().toLocaleDateString()} · Certified Official Records`, pageWidth / 2, pageHeight - 25, {
    align: 'center',
  });

  // TABLE OF CONTENTS & CATEGORY PAGES
  categories.forEach(category => {
    const bracket = brackets.find(b => b.categoryId === category.id);
    doc.addPage();

    // Top Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 24, 'F');
    doc.setFillColor(217, 119, 6);
    doc.rect(0, 23, pageWidth, 1.2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(event.name.toUpperCase(), pageWidth / 2, 9, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(`Official Fixtures · ${safeText(event.venue)} · IWUF Standard Rules`, pageWidth / 2, 15, { align: 'center' });

    // Category banner
    let startY = 30;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, startY, pageWidth - 28, 16, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(`DIVISION: ${category.name}`, 18, startY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const catBoutsCount = bracket ? bracket.rounds.reduce((acc, r) => acc + r.bouts.length, 0) : 0;
    doc.text(
      `Gender: ${category.gender.toUpperCase()}  |  Athletes: ${category.eligiblePlayerIds?.length || 0}  |  Bouts: ${catBoutsCount}`,
      18,
      startY + 12
    );

    startY += 22;

    if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.text('No bracket generated for this division yet.', 18, startY + 6);
      return;
    }

    bracket.rounds.forEach((round, roundIdx) => {
      if (startY > pageHeight - 45) {
        doc.addPage();
        startY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`ROUND: ${round.roundName.toUpperCase()}`, 14, startY);
      startY += 3;

      const tableRows = round.bouts.map(bout => {
        const redDetails = bout.redPlayerName
          ? `${bout.redPlayerName}${bout.redClub ? `\n[${bout.redClub}]` : ''}`
          : 'BYE / TBD';

        const blueDetails = bout.bluePlayerName
          ? `${bout.bluePlayerName}${bout.blueClub ? `\n[${bout.blueClub}]` : ''}`
          : 'BYE / TBD';

        return [
          bout.boutNumber || `B-${roundIdx + 1}`,
          redDetails,
          'VS',
          blueDetails,
          bout.ring || 'Leitai 1',
          getBoutResultText(bout),
        ];
      });

      autoTable(doc, {
        startY,
        head: [['Bout #', 'Red Corner (Fighter / Club)', 'vs', 'Blue Corner (Fighter / Club)', 'Ring', 'Result / Status']],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 46, halign: 'left', textColor: [185, 28, 28] },
          2: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] },
          3: { cellWidth: 46, halign: 'left', textColor: [29, 78, 216] },
          4: { cellWidth: 24, halign: 'center' },
          5: { cellWidth: 'auto', halign: 'left' },
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          valign: 'middle',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14 },
      });

      // @ts-expect-error - lastAutoTable is injected by jspdf-autotable
      startY = doc.lastAutoTable.finalY + 6;
    });
  });

  // Add Page Numbers to all pages except cover
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${event.name} · Official Fixtures Booklet · Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const safeEventName = event.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  doc.save(`${safeEventName}_official_fixtures.pdf`);
}
