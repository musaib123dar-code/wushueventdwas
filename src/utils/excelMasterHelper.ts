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
