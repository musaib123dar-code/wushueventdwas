import jsPDF from 'jspdf';
import { Player, EventSetup } from '../types/tournament';

/**
 * Generates and downloads a compact, high-quality, professional Event ID Card PDF
 * for District Wushu Association Srinagar.
 *
 * Compact landscape card layout: standard CR80 badge / ID format (85.6mm x 54mm or 105mm x 74mm A7 landscape)
 * Scaled to 120mm x 80mm landscape for high-definition print quality.
 */
export async function downloadPlayerIdCardPdf(
  player: Player,
  event: EventSetup,
  calculatedAge: number
): Promise<void> {
  // Dimensions in mm: 120 width x 80 height (landscape ID card)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [120, 80],
  });

  const cardWidth = 120;
  const cardHeight = 80;

  // Background deep slate
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, cardWidth, cardHeight, 'F');

  // Outer gold/amber border
  doc.setDrawColor(217, 119, 6); // amber-600
  doc.setLineWidth(0.8);
  doc.rect(2, 2, cardWidth - 4, cardHeight - 4);

  // Inner subtle accent border
  doc.setDrawColor(51, 65, 85); // slate-700
  doc.setLineWidth(0.3);
  doc.rect(3.5, 3.5, cardWidth - 7, cardHeight - 7);

  // Header banner background
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(3.5, 3.5, cardWidth - 7, 14, 'F');

  // Top header text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(245, 158, 11); // amber-500
  doc.text('DISTRICT WUSHU ASSOCIATION SRINAGAR', cardWidth / 2, 7.5, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(226, 232, 240); // slate-200
  doc.text(
    (event.name || 'Official Wushu Championship').toUpperCase(),
    cardWidth / 2,
    11.2,
    { align: 'center' }
  );

  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  const venueText = [event.venue, event.city].filter(Boolean).join(', ') || 'Srinagar, J&K';
  const dateText = event.startDate ? `Dates: ${event.startDate}${event.endDate ? ` to ${event.endDate}` : ''}` : '';
  const headerSub = [venueText, dateText].filter(Boolean).join(' | ');
  doc.text(headerSub, cardWidth / 2, 14.5, { align: 'center' });

  // Registration ID Highlight Pill (Prominent and clear)
  doc.setFillColor(245, 158, 11); // amber-500
  doc.roundedRect(6, 19, cardWidth - 12, 7.5, 1.2, 1.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('REGISTRATION NUMBER:', 10, 24);

  doc.setFontSize(9);
  doc.setFont('courier', 'bold');
  doc.text(player.registrationNumber, cardWidth - 10, 24.3, { align: 'right' });

  // Player Details Grid (Clean 2-column key-value layout)
  const startY = 30;
  const col1X = 7;
  const col1ValX = 36;
  const col2X = 64;
  const col2ValX = 86;
  const rowSpacing = 5.2;

  const rows: { l1: string; v1: string; l2: string; v2: string }[] = [
    {
      l1: "ATHLETE NAME:",
      v1: (player.name || '').toUpperCase(),
      l2: 'GENDER:',
      v2: (player.gender || 'male').toUpperCase(),
    },
    {
      l1: "PARENTAGE:",
      v1: player.fatherName || 'N/A',
      l2: 'WEIGHT:',
      v2: `${Number(player.weightKg || 0).toFixed(1)} KG`,
    },
    {
      l1: 'DATE OF BIRTH:',
      v1: player.dob || 'N/A',
      l2: 'REGISTERED AGE:',
      v2: `${calculatedAge} YEARS`,
    },
    {
      l1: 'CLUB / ACADEMY:',
      v1: player.clubSchool || 'Independent',
      l2: 'DISTRICT:',
      v2: player.district || 'Srinagar',
    },
  ];

  rows.forEach((r, idx) => {
    const y = startY + idx * rowSpacing;

    // Col 1 label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(r.l1, col1X, y);

    // Col 1 value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    const v1Clean = r.v1.length > 20 ? r.v1.substring(0, 20) + '...' : r.v1;
    doc.text(v1Clean, col1ValX, y);

    // Col 2 label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(r.l2, col2X, y);

    // Col 2 value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    const v2Clean = r.v2.length > 18 ? r.v2.substring(0, 18) + '...' : r.v2;
    doc.text(v2Clean, col2ValX, y);
  });

  // Divider line before footer
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.3);
  doc.line(6, 53, cardWidth - 6, 53);

  // Verification & Status Badges
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.roundedRect(6, 55, 34, 4.5, 0.8, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(255, 255, 255);
  doc.text('STATUS: VERIFIED & REGISTERED', 23, 58.2, { align: 'center' });

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(42, 55, 40, 4.5, 0.8, 0.8, 'F');
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(4.8);
  doc.text('DISCIPLINE: SANDA LEITAI', 62, 58.2, { align: 'center' });

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(84, 55, 30, 4.5, 0.8, 0.8, 'F');
  doc.setTextColor(245, 158, 11);
  doc.text('IWUF TECHNICAL RULES', 99, 58.2, { align: 'center' });

  // Security barcode / verification note
  const evRef = (event?.id || 'EVT').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  const plRef = (player?.id || 'PLY').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  doc.setFont('courier', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`CARD REF: DWAS-${evRef}-${plRef}`, cardWidth / 2, 63.5, { align: 'center' });

  // Footer bar
  doc.setFillColor(15, 23, 42);
  doc.rect(3.5, 66, cardWidth - 7, 10.5, 'F');
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.4);
  doc.line(3.5, 66, cardWidth - 3.5, 66);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(245, 158, 11); // amber-500
  doc.text('OFFICIAL EVENT REGISTRATION CARD', cardWidth / 2, 70, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Must be presented along with original proof of age at official weigh-in and Leitai medical check.',
    cardWidth / 2,
    73.5,
    { align: 'center' }
  );

  // File download save
  const safePlayerName = (player.name || 'athlete').replace(/\s+/g, '_');
  const safeRegNum = (player.registrationNumber || 'card').replace(/\s+/g, '_');
  doc.save(`Event_ID_Card_${safeRegNum}_${safePlayerName}.pdf`);
}
