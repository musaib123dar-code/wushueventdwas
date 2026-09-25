import * as XLSX from 'xlsx';
import { EventSetup, AgeCategory, WeightCategory, Player } from '../types/tournament';

export interface ParsedMasterData {
  event?: Partial<EventSetup>;
  ageCategories?: AgeCategory[];
  weightCategories?: WeightCategory[];
  players?: Omit<Player, 'id' | 'createdAt'>[];
  warnings: string[];
  errors: string[];
}

/**
 * Downloads a structured Master Excel (.xlsx) Template pre-populated with
 * default IWUF age classifications, weight divisions, and sample templates.
 */
export function downloadMasterExcelTemplate(
  defaultAgeCategories: AgeCategory[],
  defaultWeightCategories: WeightCategory[],
  currentEvent: EventSetup
) {
  const wb = XLSX.utils.book_new();

  // 1. Event Setup Sheet
  const eventRows = [
    ['Parameter', 'Value', 'Instructions / Explanation'],
    ['Event_Name', currentEvent.name || 'Official State Wushu Sanda Championship 2026', 'Official name of the championship'],
    ['Organizer_Federation', currentEvent.organizer || 'Wushu Association', 'Organizing committee or state federation'],
    ['Venue_Stadium', currentEvent.venue || 'Indoor Sports Complex', 'Stadium or arena name'],
    ['City', currentEvent.city || 'State Capital', 'Host city'],
    ['State', currentEvent.state || 'National', 'State or province'],
    ['Start_Date', currentEvent.startDate || new Date().toISOString().split('T')[0], 'Format: YYYY-MM-DD'],
    ['End_Date', currentEvent.endDate || new Date().toISOString().split('T')[0], 'Format: YYYY-MM-DD'],
    ['Age_Reference_Date', currentEvent.tournamentReferenceDate || new Date().toISOString().split('T')[0], 'CRUCIAL: Reference date for dynamic age calculation (YYYY-MM-DD)'],
    ['Competition_Type', 'Sanda', 'Sanda or Taolu'],
    ['Round_Duration_Seconds', currentEvent.roundDurationSec || 120, 'Duration per round (default 120 = 2 mins)'],
    ['Number_Of_Rounds', currentEvent.roundsCount || 3, 'Rounds count (default 3 = best 2 of 3)'],
    ['Rest_Duration_Seconds', currentEvent.restDurationSec || 60, 'Rest period between rounds in seconds (default 60 = 1 min)'],
    ['Leitai_Rings', currentEvent.rings.join(', ') || 'Leitai 1 (Platform A), Leitai 2 (Platform B)', 'Comma separated arena ring names'],
  ];
  const wsEvent = XLSX.utils.aoa_to_sheet(eventRows);
  XLSX.utils.book_append_sheet(wb, wsEvent, 'Event_Setup');

  // 2. Age Divisions Sheet
  const ageRows = [
    ['Category_Code', 'Category_Name', 'Min_Age', 'Max_Age', 'Description'],
    ...defaultAgeCategories.map(a => [a.id, a.name, a.minAge, a.maxAge, a.description || '']),
  ];
  const wsAge = XLSX.utils.aoa_to_sheet(ageRows);
  XLSX.utils.book_append_sheet(wb, wsAge, 'Age_Divisions');

  // 3. Weight Divisions Sheet
  const weightRows = [
    ['Division_Code', 'Division_Name', 'Gender', 'Min_Weight_Kg', 'Max_Weight_Kg'],
    ...defaultWeightCategories.map(w => [w.id, w.name, w.gender, w.minWeightKg, w.maxWeightKg]),
  ];
  const wsWeight = XLSX.utils.aoa_to_sheet(weightRows);
  XLSX.utils.book_append_sheet(wb, wsWeight, 'Weight_Divisions');

  // 4. Athletes Roster Sheet (with sample row and column headers)
  const athleteRows = [
    [
      'Registration_Number',
      'Full_Name',
      'Father_Name',
      'Date_Of_Birth',
      'Gender',
      'Weight_Kg',
      'Club_Or_School',
      'District',
      'State_Region',
      'Contact_Number',
      'Aadhar_Number',
    ],
    [
      'WUS-2026-001',
      'Sample Athlete Name',
      'Father Name Example',
      '2004-05-15',
      'male',
      58.5,
      'Capital Martial Arts Club',
      'Central District',
      'State Region',
      '9876543210',
      '1234-5678-9012',
    ],
  ];
  const wsAthletes = XLSX.utils.aoa_to_sheet(athleteRows);
  XLSX.utils.book_append_sheet(wb, wsAthletes, 'Athletes_Roster');

  // Trigger download
  XLSX.writeFile(wb, 'Wushu_Master_Tournament_Template.xlsx');
}

/**
 * Exports complete current state as a comprehensive Master Excel Backup
 */
export function exportMasterFullBackup(
  event: EventSetup,
  ageCategories: AgeCategory[],
  weightCategories: WeightCategory[],
  players: Player[]
) {
  const wb = XLSX.utils.book_new();

  // 1. Event Setup
  const eventRows = [
    ['Parameter', 'Value'],
    ['Event_ID', event.id],
    ['Event_Name', event.name],
    ['Organizer_Federation', event.organizer],
    ['Venue_Stadium', event.venue],
    ['City', event.city],
    ['State', event.state || ''],
    ['Start_Date', event.startDate],
    ['End_Date', event.endDate],
    ['Age_Reference_Date', event.tournamentReferenceDate],
    ['Competition_Type', event.competitionType],
    ['Round_Duration_Seconds', event.roundDurationSec],
    ['Number_Of_Rounds', event.roundsCount],
    ['Rest_Duration_Seconds', event.restDurationSec],
    ['Leitai_Rings', event.rings.join(', ')],
    ['Event_Status', event.status],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eventRows), 'Event_Setup');

  // 2. Age Divisions
  const ageRows = [
    ['Category_Code', 'Category_Name', 'Min_Age', 'Max_Age', 'Description'],
    ...ageCategories.map(a => [a.id, a.name, a.minAge, a.maxAge, a.description || '']),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ageRows), 'Age_Divisions');

  // 3. Weight Divisions
  const weightRows = [
    ['Division_Code', 'Division_Name', 'Gender', 'Min_Weight_Kg', 'Max_Weight_Kg'],
    ...weightCategories.map(w => [w.id, w.name, w.gender, w.minWeightKg, w.maxWeightKg]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(weightRows), 'Weight_Divisions');

  // 4. Athletes Roster
  const athleteRows = [
    [
      'Registration_Number',
      'Full_Name',
      'Father_Name',
      'Date_Of_Birth',
      'Gender',
      'Weight_Kg',
      'Club_Or_School',
      'District',
      'State_Region',
      'Contact_Number',
      'Aadhar_Number',
      'Status',
    ],
    ...players.map(p => [
      p.registrationNumber,
      p.name,
      p.fatherName,
      p.dob,
      p.gender,
      p.weightKg,
      p.clubSchool,
      p.district,
      p.stateRegion,
      p.contactNumber,
      p.aadharNumber,
      p.status,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(athleteRows), 'Athletes_Roster');

  const safeEventName = (event.name || 'Wushu_Championship').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `${safeEventName}_Master_Backup.xlsx`);
}

/**
 * Parses an uploaded Excel or CSV file buffer into structured data.
 * Supports multi-sheet Master Workbooks as well as single-sheet athlete lists.
 */
export function parseMasterExcelFile(buffer: ArrayBuffer): ParsedMasterData {
  const result: ParsedMasterData = {
    warnings: [],
    errors: [],
  };

  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetNames = workbook.SheetNames;

    // Helper to find sheet by keywords
    const findSheet = (keywords: string[]) => {
      return sheetNames.find(name => {
        const lower = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return keywords.some(k => lower.includes(k));
      });
    };

    // 1. Parse Event Setup Sheet
    const eventSheetName = findSheet(['eventsetup', 'event', 'masterconfig', 'championship']);
    if (eventSheetName) {
      const sheet = workbook.Sheets[eventSheetName];
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
      const eventConfig: Partial<EventSetup> = {};

      data.forEach(row => {
        if (!row || row.length < 2) return;
        const key = String(row[0] || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const val = String(row[1] ?? '').trim();
        if (!val) return;

        if (key.includes('eventname') || key === 'name' || key.includes('tournamentname')) {
          eventConfig.name = val;
        } else if (key.includes('organizer') || key.includes('federation')) {
          eventConfig.organizer = val;
        } else if (key.includes('venue') || key.includes('stadium')) {
          eventConfig.venue = val;
        } else if (key === 'city' || key.includes('hostcity')) {
          eventConfig.city = val;
        } else if (key === 'state' || key.includes('province')) {
          eventConfig.state = val;
        } else if (key.includes('startdate') || key === 'start') {
          eventConfig.startDate = normalizeDate(val);
        } else if (key.includes('enddate') || key === 'end') {
          eventConfig.endDate = normalizeDate(val);
        } else if (key.includes('agereference') || key.includes('referencedate') || key.includes('cutoffdate')) {
          eventConfig.tournamentReferenceDate = normalizeDate(val);
        } else if (key.includes('roundduration') || key.includes('roundsec')) {
          const num = parseInt(val, 10);
          if (!isNaN(num) && num > 0) eventConfig.roundDurationSec = num;
        } else if (key.includes('restduration') || key.includes('restsec')) {
          const num = parseInt(val, 10);
          if (!isNaN(num) && num > 0) eventConfig.restDurationSec = num;
        } else if (key.includes('numberofrounds') || key.includes('roundscount') || key.includes('rounds')) {
          const num = parseInt(val, 10);
          if (!isNaN(num) && num > 0) {
            eventConfig.roundsCount = num;
            eventConfig.numberOfRounds = num;
          }
        } else if (key.includes('leitai') || key.includes('ring') || key.includes('arena')) {
          const rings = val.split(/[,;|]/).map(r => r.trim()).filter(Boolean);
          if (rings.length > 0) eventConfig.rings = rings;
        }
      });

      if (Object.keys(eventConfig).length > 0) {
        result.event = eventConfig;
      }
    }

    // 2. Parse Age Divisions Sheet
    const ageSheetName = findSheet(['agedivision', 'agecategories', 'ages', 'agegroup']);
    if (ageSheetName) {
      const sheet = workbook.Sheets[ageSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const parsedAgeCategories: AgeCategory[] = [];

      rows.forEach((row, idx) => {
        const getVal = (patterns: string[]) => {
          for (const key of Object.keys(row)) {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (patterns.some(p => cleanKey.includes(p))) {
              return row[key];
            }
          }
          return undefined;
        };

        const name = String(getVal(['name', 'title', 'categoryname']) || '').trim();
        const minAge = parseInt(String(getVal(['minage', 'minimumage', 'fromage', 'min']) || '0'), 10);
        const maxAge = parseInt(String(getVal(['maxage', 'maximumage', 'toage', 'max']) || '99'), 10);
        const code = String(getVal(['code', 'id', 'categorycode']) || `age-custom-${idx + 1}`).trim();
        const desc = String(getVal(['desc', 'description', 'notes']) || '').trim();

        if (name && !isNaN(minAge) && !isNaN(maxAge)) {
          parsedAgeCategories.push({
            id: code || `age-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            name,
            minAge,
            maxAge,
            description: desc || `Athletes aged ${minAge} to ${maxAge} years on tournament reference date`,
          });
        }
      });

      if (parsedAgeCategories.length > 0) {
        result.ageCategories = parsedAgeCategories;
      }
    }

    // 3. Parse Weight Divisions Sheet
    const weightSheetName = findSheet(['weightdivision', 'weightcategories', 'weights', 'weightgroup', 'weightclass']);
    if (weightSheetName) {
      const sheet = workbook.Sheets[weightSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const parsedWeightCategories: WeightCategory[] = [];

      rows.forEach((row, idx) => {
        const getVal = (patterns: string[]) => {
          for (const key of Object.keys(row)) {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (patterns.some(p => cleanKey.includes(p))) {
              return row[key];
            }
          }
          return undefined;
        };

        const name = String(getVal(['name', 'title', 'divisionname']) || '').trim();
        const genderRaw = String(getVal(['gender', 'sex']) || 'male').toLowerCase().trim();
        const gender: 'male' | 'female' = genderRaw.startsWith('f') || genderRaw.includes('girl') || genderRaw.includes('women') ? 'female' : 'male';
        const minKg = parseFloat(String(getVal(['minweight', 'minkg', 'fromweight', 'min']) || '0'));
        const maxKg = parseFloat(String(getVal(['maxweight', 'maxkg', 'toweight', 'max']) || '0'));
        const code = String(getVal(['code', 'id', 'divisioncode']) || `wt-custom-${idx + 1}`).trim();

        if (name && !isNaN(minKg) && !isNaN(maxKg) && maxKg > 0) {
          parsedWeightCategories.push({
            id: code || `wt-${gender[0]}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            name,
            gender,
            minWeightKg: minKg,
            maxWeightKg: maxKg,
          });
        }
      });

      if (parsedWeightCategories.length > 0) {
        result.weightCategories = parsedWeightCategories;
      }
    }

    // 4. Parse Athletes Roster Sheet
    // If there's an athletes sheet, use it; otherwise, if there is only 1 sheet in workbook, use that sheet!
    let athleteSheetName = findSheet(['athlete', 'player', 'roster', 'participants', 'entry', 'entries']);
    if (!athleteSheetName && sheetNames.length === 1 && !eventSheetName && !ageSheetName && !weightSheetName) {
      athleteSheetName = sheetNames[0];
    }

    if (athleteSheetName) {
      const sheet = workbook.Sheets[athleteSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const parsedPlayers: Omit<Player, 'id' | 'createdAt'>[] = [];

      rows.forEach((row, idx) => {
        const getVal = (patterns: string[]) => {
          for (const key of Object.keys(row)) {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (patterns.some(p => cleanKey.includes(p))) {
              return row[key];
            }
          }
          return undefined;
        };

        const name = String(getVal(['name', 'fullname', 'athlete', 'playername']) || '').trim();
        if (!name || name.toLowerCase().includes('sample athlete')) return;

        const regNo = String(getVal(['registration', 'regno', 'regnumber', 'bib', 'id']) || `WUS-${Date.now()}-${idx + 1}`).trim();
        const fatherName = String(getVal(['father', 'fathername', 'parent']) || '').trim();
        const dobRaw = String(getVal(['dob', 'birth', 'dateofbirth', 'birthdate']) || '2005-01-01');
        const dob = normalizeDate(dobRaw);

        const genderRaw = String(getVal(['gender', 'sex']) || 'male').toLowerCase().trim();
        const gender: 'male' | 'female' = genderRaw.startsWith('f') || genderRaw.includes('girl') || genderRaw.includes('women') ? 'female' : 'male';

        const weightKg = parseFloat(String(getVal(['weight', 'weightkg', 'weighedkg', 'wt']) || '0')) || 55.0;
        const clubSchool = String(getVal(['club', 'school', 'academy', 'institution', 'team']) || 'Unaffiliated').trim();
        const district = String(getVal(['district', 'city', 'zone']) || 'General').trim();
        const stateRegion = String(getVal(['state', 'region', 'province']) || '').trim();
        const contactNumber = String(getVal(['contact', 'phone', 'mobile', 'tel']) || '').trim();
        const aadharNumber = String(getVal(['aadhar', 'aadhaar', 'uid', 'nationalid']) || '').trim();

        parsedPlayers.push({
          registrationNumber: regNo,
          name,
          fatherName,
          dob,
          gender,
          weightKg,
          clubSchool,
          district,
          stateRegion,
          contactNumber,
          aadharNumber,
          status: 'weighed_in',
        });
      });

      if (parsedPlayers.length > 0) {
        result.players = parsedPlayers;
      }
    }

    if (!result.event && !result.ageCategories && !result.weightCategories && !result.players) {
      result.errors.push('No recognized tournament sheets or valid records found in the uploaded file.');
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Failed to parse file: ${errorMsg}`);
  }

  return result;
}

/**
 * Normalizes varied Excel date formats (Date object, timestamp serial, strings) to YYYY-MM-DD
 */
function normalizeDate(val: unknown): string {
  if (!val) return new Date().toISOString().split('T')[0];

  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
  }

  const str = String(val).trim();

  // Excel serial number (e.g. 38500)
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    const date = new Date((serial - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const d = ddmmyyyy[1].padStart(2, '0');
    const m = ddmmyyyy[2].padStart(2, '0');
    const y = ddmmyyyy[3];
    return `${y}-${m}-${d}`;
  }

  // MM/DD/YYYY
  const mmddyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mmddyyyy) {
    const m = mmddyyyy[1].padStart(2, '0');
    const d = mmddyyyy[2].padStart(2, '0');
    const y = mmddyyyy[3];
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

export interface ParsedPlayerRow {
  rowNumber: number;
  player?: Omit<Player, 'id' | 'createdAt'>;
  isValid: boolean;
  error?: string;
  warnings: string[];
}

export interface ParsedPlayersResult {
  validPlayers: Omit<Player, 'id' | 'createdAt'>[];
  rowDetails: ParsedPlayerRow[];
  totalRows: number;
  errors: string[];
  warnings: string[];
}

/**
 * Downloads a dedicated, beautifully formatted Player Registration Excel (.xlsx) Template
 * with sample athlete entries and formatting instructions.
 */
export function downloadPlayerExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // 1. Athletes Registration Sheet
  const sampleHeaders = [
    'Registration_Number',
    'Full_Name',
    'Father_Name',
    'Date_Of_Birth',
    'Gender',
    'Weight_Kg',
    'Club_School',
    'District',
    'State_Region',
    'Contact_Number',
    'Aadhar_Number',
  ];

  const sampleRows = [
    sampleHeaders,
    [
      'WUS-2026-101',
      'Aarav Sharma',
      'Rajesh Sharma',
      '2004-05-15',
      'male',
      56.5,
      'Delhi Tigers Martial Arts Academy',
      'Central Delhi',
      'Delhi',
      '+91 98123 45678',
      '4567 8901 2345',
    ],
    [
      'WUS-2026-102',
      'Priya Verma',
      'Sanjay Verma',
      '2005-08-20',
      'female',
      52.0,
      'Red Dragon Wushu Club',
      'North Delhi',
      'Delhi',
      '+91 98234 56789',
      '5678 9012 3456',
    ],
    [
      'WUS-2026-103',
      'Rahul Kumar',
      'Sunil Kumar',
      '2003-11-10',
      'male',
      65.0,
      'Haryana Warriors Academy',
      'Gurugram',
      'Haryana',
      '+91 98345 67890',
      '6789 0123 4567',
    ],
    [
      'WUS-2026-104',
      'Ananya Patel',
      'Mahesh Patel',
      '2006-03-25',
      'female',
      60.0,
      'Shaolin Kungfu Sports Club',
      'South Delhi',
      'Delhi',
      '+91 98456 78901',
      '7890 1234 5678',
    ],
    [
      'WUS-2026-105',
      'Vikram Singh',
      'Dharmendra Singh',
      '2002-09-12',
      'male',
      70.0,
      'Punjab Wushu Training Center',
      'Amritsar',
      'Punjab',
      '+91 98567 89012',
      '8901 2345 6789',
    ],
  ];

  const wsAthletes = XLSX.utils.aoa_to_sheet(sampleRows);
  // Column widths for easy reading
  wsAthletes['!cols'] = [
    { wch: 22 }, // Registration_Number
    { wch: 24 }, // Full_Name
    { wch: 22 }, // Father_Name
    { wch: 15 }, // Date_Of_Birth
    { wch: 12 }, // Gender
    { wch: 14 }, // Weight_Kg
    { wch: 32 }, // Club_School
    { wch: 18 }, // District
    { wch: 16 }, // State_Region
    { wch: 18 }, // Contact_Number
    { wch: 20 }, // Aadhar_Number
  ];
  XLSX.utils.book_append_sheet(wb, wsAthletes, 'Player_Registration');

  // 2. Instructions Sheet
  const instructionRows = [
    ['Field Name', 'Required / Optional', 'Format & Rules', 'Example'],
    ['Registration_Number', 'Optional', 'Unique ID. If left blank, system generates auto-ID.', 'WUS-2026-101'],
    ['Full_Name', 'REQUIRED', 'Full legal name of the athlete.', 'Aarav Sharma'],
    ['Father_Name', 'Optional', 'Father or guardian name.', 'Rajesh Sharma'],
    ['Date_Of_Birth', 'REQUIRED', 'YYYY-MM-DD or DD/MM/YYYY. Used to calculate official age.', '2004-05-15'],
    ['Gender', 'REQUIRED', '"male" or "female" (or M / F).', 'male'],
    ['Weight_Kg', 'REQUIRED', 'Official weighed weight in kilograms (numeric, e.g. 56.5).', '56.5'],
    ['Club_School', 'Optional', 'Club, academy, school, or affiliated institution name.', 'Delhi Tigers Academy'],
    ['District', 'Optional', 'District or municipal area.', 'Central Delhi'],
    ['State_Region', 'Optional', 'State or province.', 'Delhi'],
    ['Contact_Number', 'Optional', 'Mobile or phone number with country code.', '+91 98123 45678'],
    ['Aadhar_Number', 'Optional', 'National identity or Aadhar number (12 digits).', '4567 8901 2345'],
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionRows);
  wsInstructions['!cols'] = [{ wch: 24 }, { wch: 20 }, { wch: 55 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Field_Instructions');

  XLSX.writeFile(wb, 'Wushu_Player_Registration_Template.xlsx');
}

/**
 * Parses any uploaded Excel (.xlsx, .xls) or CSV buffer specifically for player registration.
 * Supports flexible column header names, handles Excel serial dates, and validates data.
 */
export function parsePlayerExcelFile(buffer: ArrayBuffer): ParsedPlayersResult {
  const result: ParsedPlayersResult = {
    validPlayers: [],
    rowDetails: [],
    totalRows: 0,
    errors: [],
    warnings: [],
  };

  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      result.errors.push('The uploaded Excel file does not contain any readable sheets.');
      return result;
    }

    // Find the most relevant sheet:
    // Look for sheets containing 'player', 'athlete', 'roster', 'registration', 'entry'
    // otherwise fallback to the first sheet.
    let selectedSheetName = workbook.SheetNames[0];
    const preferredKeywords = ['player', 'athlete', 'roster', 'register', 'registration', 'entry', 'participant'];
    for (const name of workbook.SheetNames) {
      const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (preferredKeywords.some(k => clean.includes(k))) {
        selectedSheetName = name;
        break;
      }
    }

    const sheet = workbook.Sheets[selectedSheetName];
    // Convert to 2D array of rows to locate header row intelligently
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    if (!rawRows || rawRows.length < 2) {
      result.errors.push(`Sheet "${selectedSheetName}" does not contain enough data rows.`);
      return result;
    }

    // Find header row: look for row that contains 'name' or 'athlete'
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      const row = rawRows[i];
      if (Array.isArray(row)) {
        const textJoin = row.map(c => String(c || '').toLowerCase().replace(/[^a-z0-9]/g, '')).join(' ');
        if (textJoin.includes('name') || textJoin.includes('athlete') || textJoin.includes('player')) {
          headerRowIdx = i;
          break;
        }
      }
    }

    // Parse with determined header
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      range: headerRowIdx,
      defval: '',
    });

    result.totalRows = rows.length;

    const usedRegs = new Set<string>();

    rows.forEach((row, idx) => {
      const rowNum = headerRowIdx + idx + 2; // Human 1-indexed row number in Excel
      const rowWarnings: string[] = [];

      const getVal = (patterns: string[]): unknown => {
        for (const key of Object.keys(row)) {
          const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (patterns.some(p => cleanKey.includes(p))) {
            const val = row[key];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return val;
            }
          }
        }
        return undefined;
      };

      const nameRaw = String(getVal(['fullname', 'name', 'athlete', 'playername', 'competitor', 'fighter']) || '').trim();

      // Skip blank rows or template placeholder rows
      if (!nameRaw || nameRaw.toLowerCase().includes('sample athlete') || nameRaw.toLowerCase().includes('example')) {
        return;
      }

      // 1. Full Name
      const name = nameRaw;

      // 2. Father Name
      const fatherName = String(getVal(['father', 'fathername', 'parent', 'guardian']) || '').trim();

      // 3. DOB
      const dobRaw = getVal(['dob', 'birth', 'dateofbirth', 'birthdate', 'born']);
      let dob = '2005-01-01';
      if (dobRaw) {
        dob = normalizeDate(dobRaw);
      } else {
        rowWarnings.push('Date of birth missing; defaulted to 2005-01-01');
      }

      // 4. Gender
      const genderRaw = String(getVal(['gender', 'sex', 'categorygender']) || 'male').toLowerCase().trim();
      const gender: 'male' | 'female' =
        genderRaw.startsWith('f') || genderRaw.includes('girl') || genderRaw.includes('women') || genderRaw === 'w'
          ? 'female'
          : 'male';

      // 5. Weight Kg
      const weightVal = getVal(['weight', 'weightkg', 'weighedkg', 'wt', 'kg', 'bodyweight']);
      let weightKg = 55.0;
      if (weightVal !== undefined && weightVal !== null) {
        const cleanWeight = String(weightVal).replace(/[^0-9.]/g, '');
        const parsedWeight = parseFloat(cleanWeight);
        if (!isNaN(parsedWeight) && parsedWeight > 0) {
          weightKg = parsedWeight;
        } else {
          rowWarnings.push('Invalid weight specified; defaulted to 55.0 kg');
        }
      } else {
        rowWarnings.push('Weight missing; defaulted to 55.0 kg');
      }

      // 6. Club / School
      const clubSchool = String(
        getVal(['club', 'school', 'academy', 'institution', 'team', 'association', 'dojo', 'akhada']) || 'Unaffiliated'
      ).trim();

      // 7. District
      const district = String(getVal(['district', 'dist', 'city', 'zone', 'town']) || 'General').trim();

      // 8. State / Region
      const stateRegion = String(getVal(['state', 'region', 'province', 'stateregion']) || '').trim();

      // 9. Contact Number
      const contactNumber = String(getVal(['contact', 'phone', 'mobile', 'tel', 'cell']) || '').trim();

      // 10. Aadhar / National ID
      const aadharNumber = String(getVal(['aadhar', 'aadhaar', 'uid', 'nationalid', 'idnumber']) || '').trim();

      // 11. Registration Number (Auto-generate unique if missing)
      let regNo = String(getVal(['registration', 'regno', 'regnumber', 'bib', 'id', 'playerid']) || '').trim();
      if (!regNo) {
        regNo = `WUS-${new Date().getFullYear()}-${String(1000 + idx + 1).padStart(4, '0')}`;
        rowWarnings.push(`Generated Registration #${regNo}`);
      }

      // Avoid duplicate registration within the same import file
      let finalRegNo = regNo;
      let counter = 1;
      while (usedRegs.has(finalRegNo.toLowerCase())) {
        finalRegNo = `${regNo}-${counter++}`;
      }
      usedRegs.add(finalRegNo.toLowerCase());

      const playerRecord: Omit<Player, 'id' | 'createdAt'> = {
        registrationNumber: finalRegNo,
        name,
        fatherName,
        dob,
        gender,
        weightKg,
        clubSchool,
        district,
        stateRegion,
        contactNumber,
        aadharNumber,
        status: 'weighed_in',
      };

      result.validPlayers.push(playerRecord);
      result.rowDetails.push({
        rowNumber: rowNum,
        player: playerRecord,
        isValid: true,
        warnings: rowWarnings,
      });
    });

    if (result.validPlayers.length === 0) {
      result.errors.push('No valid player records found. Please ensure the Excel spreadsheet has valid column headers and athlete rows.');
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Error reading Excel file: ${errorMsg}`);
  }

  return result;
}

