import React, { useState, useRef, useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { AgeCategory, WeightCategory, EventSetup } from '../../types/tournament';
import {
  downloadMasterExcelTemplate,
  parseMasterExcelFile,
  ParsedMasterData,
} from '../../utils/excelMasterHelper';
import {
  Crown,
  CalendarDays,
  Scale,
  Users2,
  FileSpreadsheet,
  UploadCloud,
  Download,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Building,
  MapPin,
  Clock,
  Flame,
  X,
  FileCheck,
  Radio,
  PowerOff,
  Check,
  ExternalLink,
  Trophy,
  Zap,
} from 'lucide-react';

export const MasterAdminPanel: React.FC = () => {
  const {
    role,
    event,
    events,
    updateEvent,
    createOfficialEvent,
    toggleEventLive,
    switchEvent,
    deleteEvent,
    ageCategories,
    addAgeCategory,
    updateAgeCategory,
    deleteAgeCategory,
    resetAgeCategories,
    weightCategories,
    addWeightCategory,
    updateWeightCategory,
    deleteWeightCategory,
    resetWeightCategories,
    players,
    clearAllPlayers,
    categories,
    brackets,
    clearAllCategoriesAndBrackets,
    exportMasterExcelBackup,
    importMasterWorkbook,
    setActiveTab,
    supabaseStatus,
    setSupabaseModalOpen,
  } = useTournament();

  const [activeSubTab, setActiveSubTab] = useState<'event' | 'weights' | 'ages' | 'excel' | 'lifecycle'>('event');

  // Event form state
  const [eventForm, setEventForm] = useState<EventSetup>({ ...event });
  const [newRingName, setNewRingName] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    setEventForm({ ...event });
  }, [event]);

  // Delete event confirmation target
  const [deleteEventTarget, setDeleteEventTarget] = useState<EventSetup | null>(null);

  // Create new championship event modal
  const [createEventModalOpen, setCreateEventModalOpen] = useState(false);
  const [newEventForm, setNewEventForm] = useState({
    name: '',
    organizer: 'State Wushu Association',
    venue: '',
    city: '',
    state: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    tournamentReferenceDate: new Date().toISOString().split('T')[0],
    isLive: false,
    rings: ['Leitai 1 (Platform A)', 'Leitai 2 (Platform B)'],
    roundDurationSec: 120,
    roundsCount: 3,
    restDurationSec: 60,
    clearExistingRoster: false,
  });

  const handleOpenCreateEventModal = () => {
    setNewEventForm({
      name: '',
      organizer: event.organizer || 'State Wushu Association',
      venue: event.venue || '',
      city: event.city || '',
      state: event.state || '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      tournamentReferenceDate: new Date().toISOString().split('T')[0],
      isLive: false,
      rings: ['Leitai 1 (Platform A)', 'Leitai 2 (Platform B)'],
      roundDurationSec: 120,
      roundsCount: 3,
      restDurationSec: 60,
      clearExistingRoster: false,
    });
    setCreateEventModalOpen(true);
  };

  const handleConfirmCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventForm.name.trim()) {
      showFeedback('error', 'Championship Event Name is required.');
      return;
    }
    const created = createOfficialEvent(
      {
        name: newEventForm.name.trim(),
        organizer: newEventForm.organizer.trim(),
        venue: newEventForm.venue.trim(),
        city: newEventForm.city.trim(),
        state: newEventForm.state.trim(),
        startDate: newEventForm.startDate,
        endDate: newEventForm.endDate,
        tournamentReferenceDate: newEventForm.tournamentReferenceDate,
        roundDurationSec: newEventForm.roundDurationSec,
        roundsCount: newEventForm.roundsCount,
        numberOfRounds: newEventForm.roundsCount,
        restDurationSec: newEventForm.restDurationSec,
        rings: newEventForm.rings,
        status: newEventForm.isLive ? 'ongoing' : 'upcoming',
        competitionType: 'Sanda',
      },
      newEventForm.clearExistingRoster,
      newEventForm.isLive
    );

    setCreateEventModalOpen(false);
    showFeedback(
      'success',
      `Championship "${created.name}" created! Status: ${
        created.isLive ? 'LIVE (Active for all users)' : 'NOT ACTIVE (Draft - Super Admin only)'
      }. It is displayed in the registry at the bottom of the master panel.`
    );
  };

  const handleConfirmDeleteEvent = () => {
    if (!deleteEventTarget) return;
    const res = deleteEvent(deleteEventTarget.id);
    if (res.success) {
      showFeedback('success', `Event "${deleteEventTarget.name}" deleted successfully.`);
    } else {
      showFeedback('error', res.error || 'Failed to delete event.');
    }
    setDeleteEventTarget(null);
  };

  // Weight category modal/form
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [editingWeight, setEditingWeight] = useState<WeightCategory | null>(null);
  const [weightFormData, setWeightFormData] = useState<Omit<WeightCategory, 'id'>>({
    name: '',
    gender: 'male',
    minWeightKg: 48,
    maxWeightKg: 52,
  });
  const [filterWeightGender, setFilterWeightGender] = useState<'all' | 'male' | 'female'>('all');

  // Age category modal/form
  const [ageModalOpen, setAgeModalOpen] = useState(false);
  const [editingAge, setEditingAge] = useState<AgeCategory | null>(null);
  const [ageFormData, setAgeFormData] = useState<Omit<AgeCategory, 'id'>>({
    name: '',
    minAge: 15,
    maxAge: 17,
    description: '',
  });

  // Excel upload & preview state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<ParsedMasterData | null>(null);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [importOptions, setImportOptions] = useState({
    applyEvent: true,
    applyAges: true,
    replaceAges: false,
    applyWeights: true,
    replaceWeights: false,
    applyPlayers: true,
    replacePlayers: false,
  });
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Confirmation dialogs
  const [confirmClearAction, setConfirmClearAction] = useState<'players' | 'fixtures' | 'newEvent' | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback(null);
    }, 6000);
  };

  // Handle Event save
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.name.trim()) {
      showFeedback('error', 'Championship Event Name is required.');
      return;
    }
    updateEvent(eventForm);
    showFeedback('success', `Master configuration for "${eventForm.name}" updated successfully.`);
  };

  // Handle Create Brand New Event
  const handleCreateNewEvent = () => {
    if (!eventForm.name.trim()) {
      showFeedback('error', 'Please provide a name for the new tournament event.');
      return;
    }
    createOfficialEvent(eventForm, true);
    setConfirmClearAction(null);
    showFeedback('success', `New official event "${eventForm.name}" initialized! Athlete database and brackets reset for fresh registration.`);
  };

  // Add / remove rings
  const handleAddRing = () => {
    if (!newRingName.trim()) return;
    if (eventForm.rings.includes(newRingName.trim())) {
      showFeedback('error', 'A ring with this name already exists.');
      return;
    }
    const updatedRings = [...eventForm.rings, newRingName.trim()];
    setEventForm(prev => ({ ...prev, rings: updatedRings }));
    updateEvent({ rings: updatedRings });
    setNewRingName('');
    showFeedback('success', `Added arena platform: ${newRingName.trim()}`);
  };

  const handleRemoveRing = (ringToRemove: string) => {
    if (eventForm.rings.length <= 1) {
      showFeedback('error', 'At least one Leitai arena platform is required for live scoring.');
      return;
    }
    const updatedRings = eventForm.rings.filter(r => r !== ringToRemove);
    setEventForm(prev => ({ ...prev, rings: updatedRings }));
    updateEvent({ rings: updatedRings });
    showFeedback('info', `Removed arena platform: ${ringToRemove}`);
  };

  // Weight Category handlers
  const openAddWeightModal = () => {
    setEditingWeight(null);
    setWeightFormData({
      name: '',
      gender: 'male',
      minWeightKg: 52,
      maxWeightKg: 56,
    });
    setWeightModalOpen(true);
  };

  const openEditWeightModal = (w: WeightCategory) => {
    setEditingWeight(w);
    setWeightFormData({
      name: w.name,
      gender: w.gender,
      minWeightKg: w.minWeightKg,
      maxWeightKg: w.maxWeightKg,
    });
    setWeightModalOpen(true);
  };

  const handleSaveWeightCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightFormData.name.trim()) {
      showFeedback('error', 'Weight division name is required (e.g. Under 56 kg).');
      return;
    }
    if (weightFormData.minWeightKg >= weightFormData.maxWeightKg) {
      showFeedback('error', 'Minimum weight must be less than maximum weight.');
      return;
    }

    if (editingWeight) {
      updateWeightCategory(editingWeight.id, weightFormData);
      showFeedback('success', `Updated weight division: ${weightFormData.name}`);
    } else {
      addWeightCategory(weightFormData);
      showFeedback('success', `Created new weight division: ${weightFormData.name}`);
    }
    setWeightModalOpen(false);
  };

  // Age Category handlers
  const openAddAgeModal = () => {
    setEditingAge(null);
    setAgeFormData({
      name: '',
      minAge: 18,
      maxAge: 35,
      description: '',
    });
    setAgeModalOpen(true);
  };

  const openEditAgeModal = (a: AgeCategory) => {
    setEditingAge(a);
    setAgeFormData({
      name: a.name,
      minAge: a.minAge,
      maxAge: a.maxAge,
      description: a.description || '',
    });
    setAgeModalOpen(true);
  };

  const handleSaveAgeCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageFormData.name.trim()) {
      showFeedback('error', 'Age category name is required (e.g. Junior, Senior).');
      return;
    }
    if (ageFormData.minAge > ageFormData.maxAge) {
      showFeedback('error', 'Minimum age cannot be greater than maximum age.');
      return;
    }

    if (editingAge) {
      updateAgeCategory(editingAge.id, ageFormData);
      showFeedback('success', `Updated age category: ${ageFormData.name}`);
    } else {
      addAgeCategory(ageFormData);
      showFeedback('success', `Created new age category: ${ageFormData.name}`);
    }
    setAgeModalOpen(false);
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setExcelFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseMasterExcelFile(buffer);
      setParsedData(parsed);

      if (parsed.errors.length > 0) {
        showFeedback('error', parsed.errors[0]);
      } else {
        showFeedback('info', `File loaded. Review the preview below and confirm import.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showFeedback('error', `Failed to read spreadsheet: ${msg}`);
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Confirm Apply Excel Data
  const handleApplyExcelData = () => {
    if (!parsedData) return;

    const dataToImport = {
      event: importOptions.applyEvent ? parsedData.event : undefined,
      ageCategories: importOptions.applyAges ? parsedData.ageCategories : undefined,
      weightCategories: importOptions.applyWeights ? parsedData.weightCategories : undefined,
      players: importOptions.applyPlayers ? parsedData.players : undefined,
      replacePlayers: importOptions.replacePlayers,
      replaceAgeCategories: importOptions.replaceAges,
      replaceWeightCategories: importOptions.replaceWeights,
    };

    const result = importMasterWorkbook(dataToImport);
    if (result.success) {
      showFeedback('success', `Master Import Applied: ${result.summary}`);
      setParsedData(null);
      setExcelFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      showFeedback('error', result.summary);
    }
  };

  const filteredWeights = weightCategories.filter(w => {
    if (filterWeightGender === 'all') return true;
    return w.gender === filterWeightGender;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Super Admin Top Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                SUPER ADMIN MASTER CONTROL PANEL
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-mono-tabular text-slate-300">
                Scope: <strong className="text-white">{event.name || 'Current Championship'}</strong> ({event.id})
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-cinzel text-white tracking-wide">
              Tournament Master Command & Configuration
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              Configure event parameters, manual weight classes, age classifications, and bulk Master Excel spreadsheets. All changes made here automatically propagate across all user roles, athlete registries, category filters, and live Leitai arenas.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="px-3 py-1.5 text-center border-r border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Athletes</div>
              <div className="text-lg font-bold text-amber-400 font-mono-tabular">{players.length}</div>
            </div>
            <div className="px-3 py-1.5 text-center border-r border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Age Divs</div>
              <div className="text-lg font-bold text-sky-400 font-mono-tabular">{ageCategories.length}</div>
            </div>
            <div className="px-3 py-1.5 text-center border-r border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Weight Divs</div>
              <div className="text-lg font-bold text-emerald-400 font-mono-tabular">{weightCategories.length}</div>
            </div>
            <div className="px-3 py-1.5 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Fixtures</div>
              <div className="text-lg font-bold text-indigo-400 font-mono-tabular">{brackets.length}</div>
            </div>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-lg border text-xs sm:text-sm flex items-center gap-2.5 transition-all animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                : feedback.type === 'error'
                ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                : 'bg-sky-950/50 border-sky-500/40 text-sky-200'
            }`}
          >
            {feedback.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            {feedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {feedback.type === 'info' && <Flame className="w-4 h-4 text-sky-400 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('event')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'event'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>1. Master Event Setup</span>
        </button>

        <button
          onClick={() => setActiveSubTab('weights')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'weights'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>2. Weight Divisions ({weightCategories.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'ages'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Users2 className="w-4 h-4" />
          <span>3. Age Classifications ({ageCategories.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('excel')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'excel'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 border border-emerald-700/40'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>4. Master Excel File Upload & Templates</span>
        </button>

        <button
          onClick={() => setActiveSubTab('lifecycle')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'lifecycle'
              ? 'bg-rose-500 text-slate-950 shadow-md font-bold'
              : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>5. Lifecycle & Data Management</span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSupabaseModalOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
              supabaseStatus === 'connected'
                ? 'bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}
            title="Configure Supabase Cloud Backend, live sync & SQL Schema"
          >
            <Zap className={`w-3.5 h-3.5 ${supabaseStatus === 'connected' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Supabase DB ({supabaseStatus === 'connected' ? 'Connected' : 'Configure'})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            title="Open Official Registration Portal"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Register Officials & Admins</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: MASTER EVENT SETUP */}
      {/* ========================================================================= */}
      {activeSubTab === 'event' && (
        <form onSubmit={handleSaveEvent} className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-amber-400" />
                  Championship Master Parameters
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Define the core event identity, venue, competition rules, Leitai rings, and age cutoff reference date.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save Event Changes
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Event Name */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-amber-400" />
                  Championship Event Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 34th State Senior & Junior Wushu Championship 2026"
                  value={eventForm.name}
                  onChange={e => setEventForm({ ...eventForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              {/* Organizer */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Governing Federation / Organizer
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wushu Association / State Sports Council"
                  value={eventForm.organizer}
                  onChange={e => setEventForm({ ...eventForm, organizer: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Venue */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  Stadium / Venue
                </label>
                <input
                  type="text"
                  placeholder="e.g. Indira Gandhi Indoor Stadium"
                  value={eventForm.venue}
                  onChange={e => setEventForm({ ...eventForm, venue: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Host City</label>
                <input
                  type="text"
                  placeholder="e.g. New Delhi"
                  value={eventForm.city}
                  onChange={e => setEventForm({ ...eventForm, city: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* State */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">State / Region</label>
                <input
                  type="text"
                  placeholder="e.g. Delhi / Maharashtra"
                  value={eventForm.state || ''}
                  onChange={e => setEventForm({ ...eventForm, state: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Start Date</label>
                <input
                  type="date"
                  value={eventForm.startDate}
                  onChange={e => setEventForm({ ...eventForm, startDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">End Date</label>
                <input
                  type="date"
                  value={eventForm.endDate}
                  onChange={e => setEventForm({ ...eventForm, endDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Tournament Reference Cutoff Date */}
              <div className="space-y-1.5 bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
                <label className="text-xs font-bold text-amber-300 flex items-center justify-between">
                  <span>Age Reference Cutoff Date *</span>
                  <span className="text-[10px] text-amber-400">Strict IWUF Rule</span>
                </label>
                <input
                  type="date"
                  required
                  value={eventForm.tournamentReferenceDate}
                  onChange={e => setEventForm({ ...eventForm, tournamentReferenceDate: e.target.value })}
                  className="w-full bg-slate-950 border border-amber-500/50 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-amber-200 font-semibold focus:outline-none focus:border-amber-400"
                />
                <p className="text-[10px] text-amber-400/80">
                  All athlete ages are strictly computed on this date (Sub-Junior, Junior, Senior).
                </p>
              </div>

              {/* Round Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Round Duration (seconds)
                </label>
                <input
                  type="number"
                  min="60"
                  max="300"
                  step="10"
                  value={eventForm.roundDurationSec}
                  onChange={e => setEventForm({ ...eventForm, roundDurationSec: parseInt(e.target.value, 10) || 120 })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-400 font-mono-tabular">
                  {Math.floor(eventForm.roundDurationSec / 60)} min {eventForm.roundDurationSec % 60}s
                </span>
              </div>

              {/* Number of Rounds */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Rounds Count</label>
                <select
                  value={eventForm.roundsCount}
                  onChange={e => {
                    const num = parseInt(e.target.value, 10);
                    setEventForm({ ...eventForm, roundsCount: num, numberOfRounds: num });
                  }}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value={3}>3 Rounds (Best 2 of 3 - Official Sanda)</option>
                  <option value={1}>1 Round (Single Period)</option>
                  <option value={5}>5 Rounds (Championship Super-Fight)</option>
                </select>
              </div>

              {/* Rest Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Rest Duration (seconds)</label>
                <input
                  type="number"
                  min="30"
                  max="180"
                  step="5"
                  value={eventForm.restDurationSec}
                  onChange={e => setEventForm({ ...eventForm, restDurationSec: parseInt(e.target.value, 10) || 60 })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-400 font-mono-tabular">
                  {eventForm.restDurationSec} seconds interval
                </span>
              </div>

              {/* Event Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Competition Phase</label>
                <select
                  value={eventForm.status}
                  onChange={e => setEventForm({ ...eventForm, status: e.target.value as EventSetup['status'] })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="upcoming">Upcoming (Pre-Registration)</option>
                  <option value="ongoing">Ongoing (Fixtures & Scoring)</option>
                  <option value="completed">Completed (Archived / Final)</option>
                </select>
              </div>

              {/* Event Live Status */}
              <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-700/80">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    Live Access Status
                  </span>
                  {eventForm.isLive ? (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      LIVE
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-bold">NOT ACTIVE</span>
                  )}
                </label>
                <select
                  value={eventForm.isLive ? 'live' : 'not_active'}
                  onChange={e => setEventForm({ ...eventForm, isLive: e.target.value === 'live' })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-amber-400"
                >
                  <option value="live">🟢 LIVE — Active & Accessible to All Roles</option>
                  <option value="not_active">🟡 NOT ACTIVE — Super Admin Prep Only</option>
                </select>
              </div>
            </div>

            {/* Leitai Arenas Configuration */}
            <div className="border-t border-slate-800 pt-5 space-y-3">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>Leitai Arena Platforms ({eventForm.rings.length})</span>
                <span className="text-[11px] text-slate-400 font-normal">Active scoring mats for referee assignment</span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                {eventForm.rings.map((ring, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-medium text-slate-200"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>{ring}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRing(ring)}
                      className="text-slate-500 hover:text-rose-400 transition-colors ml-1 p-0.5"
                      title="Remove ring"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 max-w-md pt-1">
                <input
                  type="text"
                  placeholder="e.g. Leitai 3 (Platform C)"
                  value={newRingName}
                  onChange={e => setNewRingName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handleAddRing}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Ring
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: MASTER WEIGHT DIVISIONS */}
      {/* ========================================================================= */}
      {activeSubTab === 'weights' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-400" />
                  Tournament Weight Divisions Master
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set manual weight categories for this event. These categories govern athlete registration, category formation, and match bouts.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={resetWeightCategories}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  Reset to IWUF Sanda Standard
                </button>

                <button
                  onClick={openAddWeightModal}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Weight Division
                </button>
              </div>
            </div>

            {/* Gender filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Filter Gender:</span>
              <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
                <button
                  onClick={() => setFilterWeightGender('all')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    filterWeightGender === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({weightCategories.length})
                </button>
                <button
                  onClick={() => setFilterWeightGender('male')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    filterWeightGender === 'male' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Male ({weightCategories.filter(w => w.gender === 'male').length})
                </button>
                <button
                  onClick={() => setFilterWeightGender('female')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    filterWeightGender === 'female' ? 'bg-rose-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Female ({weightCategories.filter(w => w.gender === 'female').length})
                </button>
              </div>
            </div>

            {/* Weight Categories Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Division Code</th>
                    <th className="py-3 px-4">Division Title</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4">Min Weight</th>
                    <th className="py-3 px-4">Max Weight</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono-tabular">
                  {filteredWeights.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No weight divisions configured. Click "Add Custom Weight Division" or "Reset to IWUF Sanda Standard".
                      </td>
                    </tr>
                  ) : (
                    filteredWeights.map(w => (
                      <tr key={w.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{w.id}</td>
                        <td className="py-3 px-4 font-semibold text-white font-sans">{w.name}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-sans ${
                              w.gender === 'male'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {w.gender}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-bold">{w.minWeightKg} kg</td>
                        <td className="py-3 px-4 text-slate-300 font-bold">{w.maxWeightKg} kg</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditWeightModal(w)}
                              className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                              title="Edit division"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteWeightCategory(w.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                              title="Delete division"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: MASTER AGE CLASSIFICATIONS */}
      {/* ========================================================================= */}
      {activeSubTab === 'ages' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users2 className="w-5 h-5 text-amber-400" />
                  Tournament Age Classifications Master
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure age brackets (Sub-Junior, Junior, Senior, Veteran). Athlete eligibility is dynamically validated against the Tournament Reference Cutoff Date ({event.tournamentReferenceDate}).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={resetAgeCategories}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  Reset to IWUF Standard Brackets
                </button>

                <button
                  onClick={openAddAgeModal}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Age Bracket
                </button>
              </div>
            </div>

            {/* Age Categories Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Bracket Code</th>
                    <th className="py-3 px-4">Age Classification</th>
                    <th className="py-3 px-4">Min Age</th>
                    <th className="py-3 px-4">Max Age</th>
                    <th className="py-3 px-4">Eligibility Description</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono-tabular">
                  {ageCategories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                        No age brackets defined. Click "Add Custom Age Bracket" or "Reset to IWUF Standard Brackets".
                      </td>
                    </tr>
                  ) : (
                    ageCategories.map(a => (
                      <tr key={a.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{a.id}</td>
                        <td className="py-3 px-4 font-semibold text-white font-sans">{a.name}</td>
                        <td className="py-3 px-4 text-amber-400 font-bold">{a.minAge} yrs</td>
                        <td className="py-3 px-4 text-amber-400 font-bold">{a.maxAge} yrs</td>
                        <td className="py-3 px-4 text-slate-400 font-sans">{a.description || '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditAgeModal(a)}
                              className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                              title="Edit age classification"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteAgeCategory(a.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                              title="Delete age classification"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: MASTER EXCEL UPLOAD & TEMPLATES */}
      {/* ========================================================================= */}
      {activeSubTab === 'excel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Download Master Template */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Download className="w-4 h-4" />
                  STEP 1: Download Official Master Excel Template
                </div>
                <h3 className="text-base font-bold text-white">Pre-Formatted Tournament Workbook</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Download an official Excel workbook (.xlsx) pre-populated with sheets for <strong>Event Setup</strong>, <strong>Age Divisions</strong>, <strong>Weight Divisions</strong>, and <strong>Athletes Roster</strong> with sample data and column headers. Fill it out in Excel or Google Sheets and upload it back.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => downloadMasterExcelTemplate(ageCategories, weightCategories, event)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Download Master Template (.xlsx)
                </button>

                <button
                  onClick={exportMasterExcelBackup}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Full Live Backup (.xlsx)
                </button>
              </div>
            </div>

            {/* Step 2: Upload Master Excel File */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <UploadCloud className="w-4 h-4" />
                  STEP 2: Upload Master Tournament File
                </div>
                <h3 className="text-base font-bold text-white">Import Manual Configurations & Roster</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload your completed Master Excel workbook (.xlsx, .xls, or .csv). The system parses sheets dynamically, validates date formats, and allows you to preview and select exactly which sections to apply.
                </p>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="master-excel-file-input"
                />
                <label
                  htmlFor="master-excel-file-input"
                  className={`w-full py-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                    isProcessingFile
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-700 hover:border-emerald-500/60 bg-slate-950/60 hover:bg-emerald-950/20'
                  }`}
                >
                  <UploadCloud className="w-6 h-6 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    {isProcessingFile
                      ? 'Reading spreadsheet...'
                      : excelFileName
                      ? `Selected: ${excelFileName} (Click to change)`
                      : 'Click to select or drop Master Excel File (.xlsx, .xls, .csv)'}
                  </span>
                  <span className="text-[10px] text-slate-500">Supports multi-sheet workbooks and single-sheet rosters</span>
                </label>
              </div>
            </div>
          </div>

          {/* Parsed File Preview & Confirmation Card */}
          {parsedData && (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-6 space-y-6 shadow-2xl animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <FileCheck className="w-4 h-4" />
                    Spreadsheet Parsed Successfully: {excelFileName}
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">Review & Confirm Master Import</h3>
                  <p className="text-xs text-slate-400">
                    Select the data components you want to apply to the active championship tournament.
                  </p>
                </div>

                <button
                  onClick={handleApplyExcelData}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirm & Apply To Event
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Event Setup Detected */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    parsedData.event
                      ? 'bg-slate-950 border-amber-500/40'
                      : 'bg-slate-950/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-400">1. Event Setup</span>
                    <input
                      type="checkbox"
                      disabled={!parsedData.event}
                      checked={importOptions.applyEvent && !!parsedData.event}
                      onChange={e => setImportOptions({ ...importOptions, applyEvent: e.target.checked })}
                      className="rounded accent-amber-500"
                    />
                  </div>
                  {parsedData.event ? (
                    <div className="space-y-1 text-xs text-slate-300">
                      <div className="font-semibold text-white truncate">{parsedData.event.name || 'Event Title'}</div>
                      <div className="text-[11px] text-slate-400">Cutoff: {parsedData.event.tournamentReferenceDate || 'N/A'}</div>
                      <div className="text-[11px] text-slate-400">Venue: {parsedData.event.venue || 'N/A'}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">No event config sheet detected.</div>
                  )}
                </div>

                {/* Age Divisions Detected */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    parsedData.ageCategories
                      ? 'bg-slate-950 border-sky-500/40'
                      : 'bg-slate-950/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-sky-400">2. Age Divisions</span>
                    <input
                      type="checkbox"
                      disabled={!parsedData.ageCategories}
                      checked={importOptions.applyAges && !!parsedData.ageCategories}
                      onChange={e => setImportOptions({ ...importOptions, applyAges: e.target.checked })}
                      className="rounded accent-sky-500"
                    />
                  </div>
                  {parsedData.ageCategories ? (
                    <div className="space-y-2 text-xs">
                      <div className="text-white font-bold">{parsedData.ageCategories.length} Divisions detected</div>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={importOptions.replaceAges}
                          onChange={e => setImportOptions({ ...importOptions, replaceAges: e.target.checked })}
                          className="rounded accent-sky-500"
                        />
                        <span>Replace existing divisions</span>
                      </label>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">No age divisions sheet detected.</div>
                  )}
                </div>

                {/* Weight Divisions Detected */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    parsedData.weightCategories
                      ? 'bg-slate-950 border-emerald-500/40'
                      : 'bg-slate-950/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-400">3. Weight Divisions</span>
                    <input
                      type="checkbox"
                      disabled={!parsedData.weightCategories}
                      checked={importOptions.applyWeights && !!parsedData.weightCategories}
                      onChange={e => setImportOptions({ ...importOptions, applyWeights: e.target.checked })}
                      className="rounded accent-emerald-500"
                    />
                  </div>
                  {parsedData.weightCategories ? (
                    <div className="space-y-2 text-xs">
                      <div className="text-white font-bold">{parsedData.weightCategories.length} Divisions detected</div>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={importOptions.replaceWeights}
                          onChange={e => setImportOptions({ ...importOptions, replaceWeights: e.target.checked })}
                          className="rounded accent-emerald-500"
                        />
                        <span>Replace existing divisions</span>
                      </label>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">No weight divisions sheet detected.</div>
                  )}
                </div>

                {/* Athletes Roster Detected */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    parsedData.players
                      ? 'bg-slate-950 border-purple-500/40'
                      : 'bg-slate-950/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-400">4. Athletes Roster</span>
                    <input
                      type="checkbox"
                      disabled={!parsedData.players}
                      checked={importOptions.applyPlayers && !!parsedData.players}
                      onChange={e => setImportOptions({ ...importOptions, applyPlayers: e.target.checked })}
                      className="rounded accent-purple-500"
                    />
                  </div>
                  {parsedData.players ? (
                    <div className="space-y-2 text-xs">
                      <div className="text-white font-bold">{parsedData.players.length} Athletes ready</div>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={importOptions.replacePlayers}
                          onChange={e => setImportOptions({ ...importOptions, replacePlayers: e.target.checked })}
                          className="rounded accent-purple-500"
                        />
                        <span>Replace existing roster</span>
                      </label>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">No athletes roster detected.</div>
                  )}
                </div>
              </div>

              {/* Athletes Preview Snippet */}
              {parsedData.players && parsedData.players.length > 0 && (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Roster Preview (Showing first 5 of {parsedData.players.length} athletes)
                    </span>
                    <span className="text-[11px] text-slate-500">Status will default to weighed_in</span>
                  </div>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="py-2 px-3">Reg No</th>
                        <th className="py-2 px-3">Athlete Name</th>
                        <th className="py-2 px-3">Gender</th>
                        <th className="py-2 px-3">DOB</th>
                        <th className="py-2 px-3">Weight</th>
                        <th className="py-2 px-3">Club / Academy</th>
                        <th className="py-2 px-3">District</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono-tabular">
                      {parsedData.players.slice(0, 5).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 text-slate-400 font-mono">{p.registrationNumber}</td>
                          <td className="py-2 px-3 font-semibold text-white font-sans">{p.name}</td>
                          <td className="py-2 px-3 uppercase text-[10px]">{p.gender}</td>
                          <td className="py-2 px-3 text-slate-400">{p.dob}</td>
                          <td className="py-2 px-3 text-amber-400 font-bold">{p.weightKg} kg</td>
                          <td className="py-2 px-3 text-slate-300 font-sans">{p.clubSchool}</td>
                          <td className="py-2 px-3 text-slate-400 font-sans">{p.district}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 5: LIFECYCLE & DATA MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSubTab === 'lifecycle' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-rose-400" />
                Tournament Lifecycle & Data Scoping
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every athlete registration, division grouping, and bout fixture exists strictly inside this official event. Manage tournament lifecycles or initialize brand new events below.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Option A: Initialize Brand New Event */}
              <div className="p-5 rounded-xl border border-amber-500/40 bg-slate-950 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                    <CalendarDays className="w-4 h-4" />
                    New Championship Event
                  </div>
                  <h4 className="text-sm font-bold text-white">Create Fresh Event Identity</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Generate a new tournament ID, configure fresh dates and venue, and reset all rosters and brackets to run a new championship from scratch.
                  </p>
                </div>
                <button
                  onClick={() => setConfirmClearAction('newEvent')}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Initialize New Event Scope
                </button>
              </div>

              {/* Option B: Clear Fixtures & Categories */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-950 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
                    <RotateCcw className="w-4 h-4" />
                    Fixtures Reset
                  </div>
                  <h4 className="text-sm font-bold text-white">Clear All Brackets & Categories</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Deletes current knockout trees and formed divisions while keeping the registered athletes roster intact for re-filtering.
                  </p>
                </div>
                <button
                  onClick={() => setConfirmClearAction('fixtures')}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer border border-slate-700"
                >
                  Reset Brackets ({brackets.length}) & Divisions ({categories.length})
                </button>
              </div>

              {/* Option C: Clear All Athletes */}
              <div className="p-5 rounded-xl border border-rose-500/40 bg-slate-950 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                    <Trash2 className="w-4 h-4" />
                    Athlete Database
                  </div>
                  <h4 className="text-sm font-bold text-white">Wipe Athlete Registry</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Permanently clears all {players.length} registered fighters, weight records, and brackets. Irreversible action.
                  </p>
                </div>
                <button
                  onClick={() => setConfirmClearAction('players')}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Clear All Registered Athletes ({players.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHAMPIONSHIP EVENTS REGISTRY & LIVE DEPLOYMENT (AT THE BOTTOM OF MASTER PANEL) */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Trophy className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Championship Events Registry</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono-tabular border border-slate-700">
                    {events.length} {events.length === 1 ? 'Event' : 'Events'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage live status, switch workspace, or delete championships. Only <strong className="text-emerald-400">LIVE</strong> events can be accessed by other user roles.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreateEventModal}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Championship Event</span>
            </button>
          </div>
        </div>

        {/* List of Created Championship Events */}
        {events.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-800 rounded-xl space-y-3">
            <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-300">No Championship Events Created Yet</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click the button above to create your first official championship event.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {events.map((ev) => {
              const isActiveWorkspace = ev.id === event.id;
              return (
                <div
                  key={ev.id}
                  className={`relative rounded-xl border p-5 space-y-4 transition-all ${
                    isActiveWorkspace
                      ? 'bg-slate-900/95 border-amber-500/60 shadow-lg ring-1 ring-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top info and status badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {ev.isLive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            LIVE (Accessible to All)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            NOT ACTIVE (Super Admin Only)
                          </span>
                        )}

                        {isActiveWorkspace && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950">
                            ★ Active in Workspace
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white tracking-tight truncate pt-0.5">
                        {ev.name || 'Untitled Championship'}
                      </h3>
                      <p className="text-xs text-slate-400 truncate">
                        {ev.organizer || 'State Federation / Wushu Association'}
                      </p>
                    </div>

                    {/* Delete Event Button */}
                    <button
                      onClick={() => setDeleteEventTarget(ev)}
                      title={`Delete event: ${ev.name}`}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-900/40 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Summary details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/60 space-y-0.5">
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        Location & Venue
                      </div>
                      <div className="text-slate-200 font-medium truncate">
                        {ev.venue || 'Indoor Stadium'}, {ev.city || 'State'}
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/60 space-y-0.5">
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3 text-slate-400" />
                        Dates & Age Cutoff
                      </div>
                      <div className="text-slate-200 font-medium truncate">
                        {ev.startDate} · Cutoff: {ev.tournamentReferenceDate}
                      </div>
                    </div>
                  </div>

                  {/* Ring Platforms */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-400 text-[11px]">Leitai Rings ({ev.rings?.length || 0}):</span>
                    {ev.rings?.map((r, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-800 rounded text-[11px] text-slate-300 border border-slate-700">
                        {r}
                      </span>
                    ))}
                  </div>

                  {/* Action Buttons Row */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    {/* Live / Inactive Toggle */}
                    {ev.isLive ? (
                      <button
                        onClick={() => {
                          toggleEventLive(ev.id, false);
                          showFeedback('info', `Event "${ev.name}" is now NOT ACTIVE (restricted to Super Admin).`);
                        }}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Set to Not Active so other roles cannot work on this event"
                      >
                        <PowerOff className="w-3.5 h-3.5" />
                        <span>Make Not Active (Draft)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          toggleEventLive(ev.id, true);
                          showFeedback('success', `Event "${ev.name}" is now LIVE! All user roles can now access and work on it.`);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        title="Make event LIVE for all user roles"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Make LIVE (Active for all)</span>
                      </button>
                    )}

                    {/* Switch workspace */}
                    {!isActiveWorkspace ? (
                      <button
                        onClick={() => {
                          switchEvent(ev.id);
                          showFeedback('info', `Switched active workspace to "${ev.name}".`);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Switch Workspace</span>
                      </button>
                    ) : (
                      <span className="text-xs text-amber-400 font-semibold flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 rounded-md border border-amber-500/20">
                        <Check className="w-3.5 h-3.5" />
                        <span>Currently Active</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT WEIGHT CATEGORY */}
      {/* ========================================================================= */}
      {weightModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                {editingWeight ? 'Edit Weight Division' : 'Add Custom Weight Division'}
              </h3>
              <button
                onClick={() => setWeightModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWeightCategory} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Division Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Under 56 kg, 65 kg Class"
                  value={weightFormData.name}
                  onChange={e => setWeightFormData({ ...weightFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Gender</label>
                <select
                  value={weightFormData.gender}
                  onChange={e => setWeightFormData({ ...weightFormData, gender: e.target.value as 'male' | 'female' })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="male">Male (Men / Boys)</option>
                  <option value="female">Female (Women / Girls)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Min Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="150"
                    required
                    value={weightFormData.minWeightKg}
                    onChange={e => setWeightFormData({ ...weightFormData, minWeightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono-tabular"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Max Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="150"
                    required
                    value={weightFormData.maxWeightKg}
                    onChange={e => setWeightFormData({ ...weightFormData, maxWeightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono-tabular"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setWeightModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                >
                  Save Division
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT AGE CATEGORY */}
      {/* ========================================================================= */}
      {ageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users2 className="w-4 h-4 text-amber-400" />
                {editingAge ? 'Edit Age Category' : 'Add Custom Age Classification'}
              </h3>
              <button
                onClick={() => setAgeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAgeCategory} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sub-Junior, Junior, Senior, Veteran"
                  value={ageFormData.name}
                  onChange={e => setAgeFormData({ ...ageFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Min Age (years)</label>
                  <input
                    type="number"
                    min="5"
                    max="80"
                    required
                    value={ageFormData.minAge}
                    onChange={e => setAgeFormData({ ...ageFormData, minAge: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono-tabular"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Max Age (years)</label>
                  <input
                    type="number"
                    min="5"
                    max="80"
                    required
                    value={ageFormData.maxAge}
                    onChange={e => setAgeFormData({ ...ageFormData, maxAge: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono-tabular"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Description / Guidelines</label>
                <input
                  type="text"
                  placeholder="e.g. Athletes aged 15 to 17 on tournament reference date"
                  value={ageFormData.description}
                  onChange={e => setAgeFormData({ ...ageFormData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAgeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION DIALOG FOR CLEAR ACTIONS */}
      {/* ========================================================================= */}
      {confirmClearAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">
                {confirmClearAction === 'players' && 'Confirm Wipe Athlete Registry'}
                {confirmClearAction === 'fixtures' && 'Confirm Reset Fixtures & Categories'}
                {confirmClearAction === 'newEvent' && 'Initialize Brand New Championship Scope'}
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmClearAction === 'players' &&
                `Are you sure you want to permanently delete all ${players.length} registered fighters? Any associated category registrations and brackets will also be cleared.`}
              {confirmClearAction === 'fixtures' &&
                `Are you sure you want to clear all ${brackets.length} knockout brackets and ${categories.length} category divisions? Athletes will remain registered for new category formation.`}
              {confirmClearAction === 'newEvent' &&
                `This will initialize a new official tournament event ID for "${eventForm.name || 'New Event'}" and clear previous rosters and fixtures so you can register fresh players.`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setConfirmClearAction(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmClearAction === 'players') {
                    clearAllPlayers();
                    showFeedback('success', 'All athletes and related fixtures cleared.');
                  } else if (confirmClearAction === 'fixtures') {
                    clearAllCategoriesAndBrackets();
                    showFeedback('success', 'Categories and brackets reset.');
                  } else if (confirmClearAction === 'newEvent') {
                    handleCreateNewEvent();
                  }
                  setConfirmClearAction(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-colors shadow"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM DELETE CHAMPIONSHIP EVENT */}
      {/* ========================================================================= */}
      {deleteEventTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Championship Event</h3>
                <p className="text-xs text-rose-400/80">Permanent Event Removal</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the championship tournament:{' '}
              <strong className="text-white">"{deleteEventTarget.name || 'Untitled Event'}"</strong>?
            </p>

            {deleteEventTarget.id === event.id && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Currently Active Workspace Event
                </div>
                <p className="text-[11px] text-amber-300/80">
                  Deleting this event will automatically switch your workspace to another remaining championship event.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeleteEventTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteEvent}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-colors shadow cursor-pointer"
              >
                Yes, Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW CHAMPIONSHIP EVENT */}
      {/* ========================================================================= */}
      {createEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Trophy className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Create New Championship Event</h3>
                  <p className="text-xs text-slate-400">Add a distinct tournament scope to the system</p>
                </div>
              </div>
              <button
                onClick={() => setCreateEventModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCreateEvent} className="space-y-4">
              {/* Event Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Championship Event Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 35th Senior National Wushu Championship 2026"
                  value={newEventForm.name}
                  onChange={e => setNewEventForm({ ...newEventForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              {/* Organizer & Venue */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Governing Federation / Organizer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wushu Association of India"
                    value={newEventForm.organizer}
                    onChange={e => setNewEventForm({ ...newEventForm, organizer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Stadium / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Talkatora Indoor Stadium"
                    value={newEventForm.venue}
                    onChange={e => setNewEventForm({ ...newEventForm, venue: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* City & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">City</label>
                  <input
                    type="text"
                    placeholder="e.g. New Delhi"
                    value={newEventForm.city}
                    onChange={e => setNewEventForm({ ...newEventForm, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">State / Region</label>
                  <input
                    type="text"
                    placeholder="e.g. Delhi NCR"
                    value={newEventForm.state}
                    onChange={e => setNewEventForm({ ...newEventForm, state: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Start Date</label>
                  <input
                    type="date"
                    value={newEventForm.startDate}
                    onChange={e => setNewEventForm({ ...newEventForm, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">End Date</label>
                  <input
                    type="date"
                    value={newEventForm.endDate}
                    onChange={e => setNewEventForm({ ...newEventForm, endDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1 bg-amber-500/10 p-2 rounded-lg border border-amber-500/30">
                  <label className="text-xs font-bold text-amber-300">Age Cutoff Date</label>
                  <input
                    type="date"
                    value={newEventForm.tournamentReferenceDate}
                    onChange={e => setNewEventForm({ ...newEventForm, tournamentReferenceDate: e.target.value })}
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-lg px-2 py-1 text-xs text-amber-200 focus:outline-none focus:border-amber-400 font-semibold"
                  />
                </div>
              </div>

              {/* Initial Status: LIVE vs NOT ACTIVE */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-700/80 space-y-2">
                <label className="text-xs font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    Championship Event Live Status
                  </span>
                  {newEventForm.isLive ? (
                    <span className="text-[10px] text-emerald-400 font-bold">● Publish as LIVE</span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-bold">○ NOT ACTIVE (Draft)</span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewEventForm({ ...newEventForm, isLive: false })}
                    className={`p-2.5 rounded-lg text-xs font-semibold border text-left transition-all ${
                      !newEventForm.isLive
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <PowerOff className="w-3 h-3 text-amber-400" />
                      NOT ACTIVE (Draft)
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Super Admin only. Other users locked out until made LIVE.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewEventForm({ ...newEventForm, isLive: true })}
                    className={`p-2.5 rounded-lg text-xs font-semibold border text-left transition-all ${
                      newEventForm.isLive
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                      <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                      LIVE (Active)
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Accessible immediately to Admins, Officials, & Spectators.
                    </div>
                  </button>
                </div>
              </div>

              {/* Roster option */}
              <div className="flex items-center gap-2 p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
                <input
                  type="checkbox"
                  id="clearExistingRoster"
                  checked={newEventForm.clearExistingRoster}
                  onChange={e => setNewEventForm({ ...newEventForm, clearExistingRoster: e.target.checked })}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0"
                />
                <label htmlFor="clearExistingRoster" className="text-slate-300 cursor-pointer">
                  Start fresh: Clear previous registered athletes & brackets for this new championship
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateEventModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow cursor-pointer"
                >
                  Create Championship Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
