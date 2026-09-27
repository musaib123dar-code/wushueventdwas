import React, { useState, useMemo, useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { AgeCategory, WeightCategory, EventSetup } from '../../types/tournament';
import {
  CalendarDays,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  X,
  AlertTriangle,
  Scale,
  Users,
  Trophy,
  Radio,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';

export const EventSetupView: React.FC = () => {
  const {
    event,
    events,
    switchEvent,
    createOfficialEvent,
    deleteEvent,
    toggleEventLive,
    updateEvent,
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
    categories,
    players,
    allPlayers,
    role,
  } = useTournament();

  const [formData, setFormData] = useState({
    name: event.name,
    organizer: event.organizer,
    venue: event.venue,
    city: event.city,
    state: event.state || '',
    startDate: event.startDate,
    endDate: event.endDate,
    tournamentReferenceDate: event.tournamentReferenceDate,
    roundDurationSec: event.roundDurationSec,
    numberOfRounds: event.roundsCount || 3,
    restDurationSec: event.restDurationSec,
    rings: [...event.rings],
    isLive: event.isLive,
  });

  // Keep form data synchronized when the active championship event is switched
  useEffect(() => {
    setFormData({
      name: event.name,
      organizer: event.organizer,
      venue: event.venue,
      city: event.city,
      state: event.state || '',
      startDate: event.startDate,
      endDate: event.endDate,
      tournamentReferenceDate: event.tournamentReferenceDate,
      roundDurationSec: event.roundDurationSec,
      numberOfRounds: event.roundsCount || 3,
      restDurationSec: event.restDurationSec,
      rings: [...event.rings],
      isLive: event.isLive,
    });
  }, [event]);

  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // New Event creation modal
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [newEventForm, setNewEventForm] = useState({
    name: '',
    organizer: 'Wushu Association / Organizing Committee',
    venue: '',
    city: '',
    state: '',
    tournamentReferenceDate: new Date().toISOString().split('T')[0],
    isLive: true,
  });

  // Delete event confirmation modal
  const [deleteEventTarget, setDeleteEventTarget] = useState<EventSetup | null>(null);

  // Age Category Modal state
  const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
  const [editingAge, setEditingAge] = useState<AgeCategory | null>(null);
  const [ageForm, setAgeForm] = useState({
    name: '',
    minAge: 12,
    maxAge: 14,
    description: '',
  });
  const [ageFormError, setAgeFormError] = useState<string | null>(null);

  // Weight Category Modal state
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [editingWeight, setEditingWeight] = useState<WeightCategory | null>(null);
  const [weightForm, setWeightForm] = useState({
    name: '',
    minWeightKg: 48,
    maxWeightKg: 52,
    gender: 'male' as 'male' | 'female',
  });
  const [weightFormError, setWeightFormError] = useState<string | null>(null);

  // Filter state for weight divisions
  const [weightFilterGender, setWeightFilterGender] = useState<'all' | 'male' | 'female'>('all');

  // Confirmation Modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete_age' | 'delete_weight' | 'reset_ages' | 'reset_weights';
    id?: string;
    title: string;
    message: string;
    warning?: string;
  }>({
    isOpen: false,
    type: 'delete_age',
    title: '',
    message: '',
  });

  const isSuperOrAdmin = role === 'super_admin' || role === 'admin';

  const showFeedback = (text: string) => {
    setSavedMsg(text);
    setTimeout(() => setSavedMsg(null), 3500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateEvent({
      name: formData.name,
      organizer: formData.organizer,
      venue: formData.venue,
      city: formData.city,
      state: formData.state,
      startDate: formData.startDate,
      endDate: formData.endDate,
      tournamentReferenceDate: formData.tournamentReferenceDate,
      roundDurationSec: formData.roundDurationSec,
      roundsCount: formData.numberOfRounds,
      restDurationSec: formData.restDurationSec,
      rings: formData.rings,
      isLive: formData.isLive,
    });
    showFeedback('Tournament configuration successfully updated!');
  };

  // --- Age Category Handlers ---
  const handleOpenAddAge = () => {
    setEditingAge(null);
    setAgeForm({
      name: '',
      minAge: 12,
      maxAge: 14,
      description: 'Athletes aged 12 to 14 years on tournament reference date',
    });
    setAgeFormError(null);
    setIsAgeModalOpen(true);
  };

  const handleOpenEditAge = (a: AgeCategory) => {
    setEditingAge(a);
    setAgeForm({
      name: a.name,
      minAge: a.minAge,
      maxAge: a.maxAge,
      description: a.description || '',
    });
    setAgeFormError(null);
    setIsAgeModalOpen(true);
  };

  const handleSaveAge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageForm.name.trim()) {
      setAgeFormError('Age classification name is required (e.g. Junior, Senior).');
      return;
    }
    if (ageForm.minAge < 0) {
      setAgeFormError('Minimum age cannot be negative.');
      return;
    }
    if (ageForm.minAge > ageForm.maxAge) {
      setAgeFormError('Minimum age cannot be greater than maximum age.');
      return;
    }

    if (editingAge) {
      updateAgeCategory(editingAge.id, {
        name: ageForm.name.trim(),
        minAge: Number(ageForm.minAge),
        maxAge: Number(ageForm.maxAge),
        description: ageForm.description.trim(),
      });
      showFeedback(`Updated age classification: ${ageForm.name}`);
    } else {
      addAgeCategory({
        name: ageForm.name.trim(),
        minAge: Number(ageForm.minAge),
        maxAge: Number(ageForm.maxAge),
        description: ageForm.description.trim() || `Athletes aged ${ageForm.minAge} to ${ageForm.maxAge} years on tournament reference date`,
      });
      showFeedback(`Created new age classification: ${ageForm.name}`);
    }
    setIsAgeModalOpen(false);
  };

  const handlePromptDeleteAge = (a: AgeCategory) => {
    const linked = categories.filter(c => c.ageCategoryId === a.id);
    setConfirmDialog({
      isOpen: true,
      type: 'delete_age',
      id: a.id,
      title: `Delete Age Classification "${a.name}"?`,
      message: `Are you sure you want to remove ${a.name} (${a.minAge}-${a.maxAge} yrs)?`,
      warning:
        linked.length > 0
          ? `Warning: ${linked.length} category division(s) are currently configured with this age classification.`
          : undefined,
    });
  };

  const handlePromptResetAges = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'reset_ages',
      title: 'Reset Age Classifications to IWUF Standards?',
      message:
        'This will reset your age classifications to official IWUF standards (Sub-Junior 12-14, Junior 15-17, Youth 18-20, Senior 18-40).',
    });
  };

  // --- Weight Category Handlers ---
  const handleOpenAddWeight = () => {
    setEditingWeight(null);
    setWeightForm({
      name: '',
      minWeightKg: 48,
      maxWeightKg: 52,
      gender: weightFilterGender === 'female' ? 'female' : 'male',
    });
    setWeightFormError(null);
    setIsWeightModalOpen(true);
  };

  const handleOpenEditWeight = (w: WeightCategory) => {
    setEditingWeight(w);
    setWeightForm({
      name: w.name,
      minWeightKg: w.minWeightKg,
      maxWeightKg: w.maxWeightKg,
      gender: w.gender,
    });
    setWeightFormError(null);
    setIsWeightModalOpen(true);
  };

  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightForm.name.trim()) {
      setWeightFormError('Weight division name is required (e.g. Under 52 kg).');
      return;
    }
    if (weightForm.minWeightKg < 0) {
      setWeightFormError('Minimum weight cannot be negative.');
      return;
    }
    if (weightForm.minWeightKg > weightForm.maxWeightKg) {
      setWeightFormError('Minimum weight cannot exceed maximum weight.');
      return;
    }

    if (editingWeight) {
      updateWeightCategory(editingWeight.id, {
        name: weightForm.name.trim(),
        minWeightKg: Number(weightForm.minWeightKg),
        maxWeightKg: Number(weightForm.maxWeightKg),
        gender: weightForm.gender,
      });
      showFeedback(`Updated weight division: ${weightForm.name} (${weightForm.gender})`);
    } else {
      addWeightCategory({
        name: weightForm.name.trim(),
        minWeightKg: Number(weightForm.minWeightKg),
        maxWeightKg: Number(weightForm.maxWeightKg),
        gender: weightForm.gender,
      });
      showFeedback(`Created new weight division: ${weightForm.name} (${weightForm.gender})`);
    }
    setIsWeightModalOpen(false);
  };

  const handlePromptDeleteWeight = (w: WeightCategory) => {
    const linked = categories.filter(c => c.weightCategoryId === w.id);
    setConfirmDialog({
      isOpen: true,
      type: 'delete_weight',
      id: w.id,
      title: `Delete Weight Division "${w.name}"?`,
      message: `Are you sure you want to remove ${w.name} (${w.gender}, ${w.minWeightKg}-${w.maxWeightKg} kg)?`,
      warning:
        linked.length > 0
          ? `Warning: ${linked.length} category division(s) are currently configured with this weight class.`
          : undefined,
    });
  };

  const handlePromptResetWeights = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'reset_weights',
      title: 'Reset Weight Divisions to Official IWUF Sanda Standards?',
      message:
        'This will reset your weight divisions to the official 13 Men & 8 Women IWUF Sanda weight categories.',
    });
  };

  const handleExecuteConfirm = () => {
    if (confirmDialog.type === 'delete_age' && confirmDialog.id) {
      deleteAgeCategory(confirmDialog.id);
      showFeedback('Age classification removed.');
    } else if (confirmDialog.type === 'delete_weight' && confirmDialog.id) {
      deleteWeightCategory(confirmDialog.id);
      showFeedback('Weight division removed.');
    } else if (confirmDialog.type === 'reset_ages') {
      resetAgeCategories();
      showFeedback('Age classifications reset to official IWUF standards.');
    } else if (confirmDialog.type === 'reset_weights') {
      resetWeightCategories();
      showFeedback('Weight divisions reset to official IWUF Sanda standards.');
    }
    setConfirmDialog({ isOpen: false, type: 'delete_age', title: '', message: '' });
  };

  const handleCreateNewEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventForm.name.trim()) return;

    createOfficialEvent(
      {
        name: newEventForm.name.trim(),
        organizer: newEventForm.organizer.trim(),
        venue: newEventForm.venue.trim() || 'Indoor Sports Stadium',
        city: newEventForm.city.trim() || 'City Arena',
        state: newEventForm.state.trim() || 'State',
        tournamentReferenceDate: newEventForm.tournamentReferenceDate,
      },
      true, // clearExistingRoster = true to start completely clean with 0 athletes for this event!
      newEventForm.isLive
    );

    setIsNewEventModalOpen(false);
    showFeedback(`Created fresh championship "${newEventForm.name}". Athlete roster is isolated for this tournament.`);
    setNewEventForm({
      name: '',
      organizer: 'Wushu Association / Organizing Committee',
      venue: '',
      city: '',
      state: '',
      tournamentReferenceDate: new Date().toISOString().split('T')[0],
      isLive: true,
    });
  };

  const handleConfirmDeleteEvent = () => {
    if (!deleteEventTarget) return;
    const res = deleteEvent(deleteEventTarget.id);
    if (res.success) {
      showFeedback(
        `Championship "${deleteEventTarget.name}" deleted. Purged ${res.deletedPlayersCount ?? 0} registered athletes, ${res.deletedCategoriesCount ?? 0} categories, and ${res.deletedBracketsCount ?? 0} brackets.`
      );
    } else {
      showFeedback(res.error || 'Failed to delete event.');
    }
    setDeleteEventTarget(null);
  };

  // Filtered weight categories
  const filteredWeightCategories = useMemo(() => {
    if (weightFilterGender === 'all') return weightCategories;
    return weightCategories.filter(w => w.gender === weightFilterGender);
  }, [weightCategories, weightFilterGender]);

  const maleWeightCount = useMemo(() => weightCategories.filter(w => w.gender === 'male').length, [weightCategories]);
  const femaleWeightCount = useMemo(() => weightCategories.filter(w => w.gender === 'female').length, [weightCategories]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Championship Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-amber-400" />
            Tournament Setup & Competition Parameters
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure event details, ring allocation, and official age calculation reference date.
          </p>
        </div>

        {isSuperOrAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewEventModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ New Tournament / League</span>
            </button>
          </div>
        )}
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Active Tournament Championship Workspace Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Active Championship Workspace
              </span>
              {event.isLive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  NOT ACTIVE (Draft)
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{event.name || 'Untitled Championship'}</span>
            </h2>
            <p className="text-xs text-slate-400">
              {event.organizer || 'State Wushu Federation'} · {event.venue}, {event.city} · Age Ref Date: <span className="text-amber-400 font-mono-tabular">{event.tournamentReferenceDate}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Registered Athletes for this event badge */}
            <div className="px-3 py-2 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
              <div className="text-xs font-mono font-bold text-white">{players.length}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Athletes in Event</div>
            </div>

            {/* Categories for this event badge */}
            <div className="px-3 py-2 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
              <div className="text-xs font-mono font-bold text-amber-400">{categories.length}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Categories</div>
            </div>

            {/* Switch Active Tournament Dropdown (if multiple exist) */}
            {events.length > 1 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={event.id}
                  onChange={e => switchEvent(e.target.value)}
                  className="bg-slate-950 border border-slate-700 hover:border-amber-400 text-slate-100 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer transition-colors max-w-[200px] truncate"
                  title="Switch Active Championship Workspace"
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} {ev.isLive ? '(Live)' : '(Draft)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Super Admin Event Deletion Button */}
            {role === 'super_admin' && (
              <button
                onClick={() => setDeleteEventTarget(event)}
                className="px-3 py-2 text-xs font-medium text-rose-400 hover:text-white bg-rose-950/30 hover:bg-rose-900/50 rounded-xl border border-rose-900/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Delete this championship event and all associated athlete registrations, categories, and fixtures"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Delete Championship</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7/8 Cols: Form Setup */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800">
              General Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1 font-medium">Tournament Event Name *</label>
                <input
                  type="text"
                  required
                  disabled={!isSuperOrAdmin}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Organizer / Federation *</label>
                <input
                  type="text"
                  required
                  disabled={!isSuperOrAdmin}
                  value={formData.organizer}
                  onChange={e => setFormData({ ...formData, organizer: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Venue Stadium *</label>
                <input
                  type="text"
                  required
                  disabled={!isSuperOrAdmin}
                  value={formData.venue}
                  onChange={e => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Host City</label>
                <input
                  type="text"
                  disabled={!isSuperOrAdmin}
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">State / Province</label>
                <input
                  type="text"
                  disabled={!isSuperOrAdmin}
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Crucial Age Calculation Cutoff Date */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>Tournament Reference Date for Age Calculation (PRD Core Requirement)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                All athlete ages in registration and category filtering are computed dynamically against this exact reference date. Changing this date automatically updates calculated ages across all registered fighters.
              </p>
              <div className="pt-1">
                <input
                  type="date"
                  required
                  disabled={!isSuperOrAdmin}
                  value={formData.tournamentReferenceDate}
                  onChange={e => setFormData({ ...formData, tournamentReferenceDate: e.target.value })}
                  className="bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2 text-amber-300 font-mono-tabular font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Championship Live Access Status */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-200">
                  Championship Live Access Status
                </span>
                {formData.isLive ? (
                  <span className="text-[10px] text-emerald-400 font-bold">● LIVE</span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-bold">○ NOT ACTIVE</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                When set to <strong className="text-emerald-400">LIVE</strong>, tournament administrators, match officials, and spectators can work on this event. When set to <strong className="text-amber-400">NOT ACTIVE</strong>, access is restricted to Super Admin.
              </p>
              <select
                disabled={!isSuperOrAdmin}
                value={formData.isLive ? 'live' : 'not_active'}
                onChange={e => setFormData({ ...formData, isLive: e.target.value === 'live' })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="live">🟢 LIVE — Active & Accessible to All Roles</option>
                <option value="not_active">🟡 NOT ACTIVE — Restricted to Super Admin</option>
              </select>
            </div>

            <h2 className="text-sm font-bold text-white uppercase tracking-wider pt-2 pb-2 border-b border-slate-800">
              Sanda Bout Rules & Arenas
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Round Duration (Seconds)</label>
                <input
                  type="number"
                  disabled={!isSuperOrAdmin}
                  value={formData.roundDurationSec}
                  onChange={e => setFormData({ ...formData, roundDurationSec: parseInt(e.target.value) || 120 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono-tabular focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Default: 120s (2 min)</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Rest Period (Seconds)</label>
                <input
                  type="number"
                  disabled={!isSuperOrAdmin}
                  value={formData.restDurationSec}
                  onChange={e => setFormData({ ...formData, restDurationSec: parseInt(e.target.value) || 60 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono-tabular focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Default: 60s (1 min)</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Max Rounds per Bout</label>
                <input
                  type="number"
                  disabled={!isSuperOrAdmin}
                  value={formData.numberOfRounds}
                  onChange={e => setFormData({ ...formData, numberOfRounds: parseInt(e.target.value) || 3 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono-tabular focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Best of 3</span>
              </div>
            </div>

            {isSuperOrAdmin && (
              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save Tournament Settings
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right 5/8 Cols: Age Categories and Weight Classes Interactive Setup */}
        <div className="lg:col-span-5 space-y-6">
          {/* Age Categories Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  IWUF Age Classifications
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-amber-400 font-semibold font-mono-tabular border border-slate-700">
                  {ageCategories.length}
                </span>
              </div>

              {isSuperOrAdmin && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePromptResetAges}
                    title="Reset to official IWUF age classifications"
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddAge}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Age</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs">
              {ageCategories.length === 0 ? (
                <div className="p-4 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No age classifications defined. Click &ldquo;Add Age&rdquo; or reset to defaults.
                </div>
              ) : (
                ageCategories.map(a => (
                  <div
                    key={a.id}
                    className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-xl flex items-center justify-between gap-3 group transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        <span className="truncate">{a.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {a.description || `Athletes aged ${a.minAge} to ${a.maxAge} years on reference date`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-amber-400 font-mono-tabular font-semibold text-xs whitespace-nowrap bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {a.minAge} - {a.maxAge} yrs
                      </span>

                      {isSuperOrAdmin && (
                        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleOpenEditAge(a)}
                            title="Edit age classification"
                            className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromptDeleteAge(a)}
                            title="Delete age classification"
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sanda Weight Classes Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Sanda Weight Divisions
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-amber-400 font-semibold font-mono-tabular border border-slate-700">
                  {filteredWeightCategories.length}
                </span>
              </div>

              {isSuperOrAdmin && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePromptResetWeights}
                    title="Reset to official IWUF weight categories"
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddWeight}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Weight</span>
                  </button>
                </div>
              )}
            </div>

            {/* Gender Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setWeightFilterGender('all')}
                className={`flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center cursor-pointer ${
                  weightFilterGender === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({weightCategories.length})
              </button>
              <button
                type="button"
                onClick={() => setWeightFilterGender('male')}
                className={`flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                  weightFilterGender === 'male'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                <span>Male ({maleWeightCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setWeightFilterGender('female')}
                className={`flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                  weightFilterGender === 'female'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block"></span>
                <span>Female ({femaleWeightCount})</span>
              </button>
            </div>

            {/* Scrollable Weight Classes List */}
            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {filteredWeightCategories.length === 0 ? (
                <div className="p-4 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No weight divisions match the current filter.
                </div>
              ) : (
                filteredWeightCategories.map(w => (
                  <div
                    key={w.id}
                    className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-lg flex items-center justify-between text-xs group transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          w.gender === 'male' ? 'bg-amber-400' : 'bg-sky-400'
                        }`}
                      ></span>
                      <span className="font-medium text-slate-200 truncate">{w.name}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-medium shrink-0 uppercase tracking-wider ${
                          w.gender === 'male'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}
                      >
                        {w.gender}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono-tabular text-slate-300 text-[11px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {w.minWeightKg} - {w.maxWeightKg} kg
                      </span>

                      {isSuperOrAdmin && (
                        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleOpenEditWeight(w)}
                            title="Edit weight division"
                            className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromptDeleteWeight(w)}
                            title="Delete weight division"
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Create / Edit Age Classification */}
      {isAgeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingAge ? 'Edit Age Classification' : 'Add Age Classification'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Define age boundaries for official tournament competition.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAgeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAge} className="p-6 space-y-4 text-xs">
              {ageFormError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{ageFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Classification Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sub-Junior, Junior, Youth, Senior, Cadet"
                  value={ageForm.name}
                  onChange={e => setAgeForm({ ...ageForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Minimum Age (Years) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={120}
                    value={ageForm.minAge}
                    onChange={e => setAgeForm({ ...ageForm, minAge: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono-tabular focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Maximum Age (Years) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={120}
                    value={ageForm.maxAge}
                    onChange={e => setAgeForm({ ...ageForm, maxAge: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono-tabular focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Description / Qualification Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Athletes aged 12 to 14 years on tournament reference date"
                  value={ageForm.description}
                  onChange={e => setAgeForm({ ...ageForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Ages are calculated automatically against the Tournament Reference Date ({formData.tournamentReferenceDate}).
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAgeModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {editingAge ? 'Save Changes' : 'Create Age Classification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Weight Division */}
      {isWeightModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingWeight ? 'Edit Sanda Weight Division' : 'Add Sanda Weight Division'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Set division limits and target combat gender.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWeightModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWeight} className="p-6 space-y-4 text-xs">
              {weightFormError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{weightFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Division Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Under 48 kg, Under 52 kg, Over 90 kg"
                  value={weightForm.name}
                  onChange={e => setWeightForm({ ...weightForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Gender *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWeightForm({ ...weightForm, gender: 'male' })}
                    className={`py-2 px-3 rounded-lg border text-center font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      weightForm.gender === 'male'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Male Fighter</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeightForm({ ...weightForm, gender: 'female' })}
                    className={`py-2 px-3 rounded-lg border text-center font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      weightForm.gender === 'female'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    <span>Female Fighter</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Min Weight (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    min={0}
                    value={weightForm.minWeightKg}
                    onChange={e => setWeightForm({ ...weightForm, minWeightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono-tabular focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Max Weight (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    min={0}
                    value={weightForm.maxWeightKg}
                    onChange={e => setWeightForm({ ...weightForm, maxWeightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono-tabular focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsWeightModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {editingWeight ? 'Save Changes' : 'Create Weight Division'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog (Delete & Reset) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            {confirmDialog.warning && (
              <div className="p-3 bg-amber-950/50 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] leading-relaxed">
                {confirmDialog.warning}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: false, type: 'delete_age', title: '', message: '' })}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirm}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Create New Championship Modal */}
      {/* ========================================================================= */}
      {isNewEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create New Championship Event</h3>
                  <p className="text-xs text-slate-400">Fresh tournament with isolated athlete roster and fixtures</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewEventModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300/90 leading-relaxed">
              <strong>Event Isolation:</strong> Athletes registered for this new championship will only be visible in this event. Fixture brackets and divisions are completely isolated.
            </div>

            <form onSubmit={handleCreateNewEvent} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Championship Event Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Women's Wushu League 2026"
                  value={newEventForm.name}
                  onChange={e => setNewEventForm({ ...newEventForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Organizing Committee / Federation
                </label>
                <input
                  type="text"
                  value={newEventForm.organizer}
                  onChange={e => setNewEventForm({ ...newEventForm, organizer: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Venue / Stadium</label>
                  <input
                    type="text"
                    placeholder="Indoor Stadium"
                    value={newEventForm.venue}
                    onChange={e => setNewEventForm({ ...newEventForm, venue: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">City / State</label>
                  <input
                    type="text"
                    placeholder="New Delhi, Delhi"
                    value={newEventForm.city}
                    onChange={e => setNewEventForm({ ...newEventForm, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Age Calculation Cutoff Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventForm.tournamentReferenceDate}
                    onChange={e => setNewEventForm({ ...newEventForm, tournamentReferenceDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Initial Status</label>
                  <select
                    value={newEventForm.isLive ? 'live' : 'draft'}
                    onChange={e => setNewEventForm({ ...newEventForm, isLive: e.target.value === 'live' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="live">● LIVE (Available immediately)</option>
                    <option value="draft">○ Draft (Restricted to Admins)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewEventModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  Create Championship
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Delete Championship Event Modal */}
      {/* ========================================================================= */}
      {deleteEventTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Championship Event</h3>
                <p className="text-xs text-rose-400/90 font-medium">Permanent Cascading Deletion</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white">"{deleteEventTarget.name || 'Untitled Event'}"</strong>?
            </p>

            <div className="p-3.5 bg-rose-950/40 border border-rose-900/50 rounded-xl space-y-2 text-xs text-rose-200">
              <div className="font-bold flex items-center gap-1.5 text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                All associated data will be permanently wiped:
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-300 text-[11px]">
                <li>
                  <strong className="text-rose-300">
                    {allPlayers.filter(p => p.eventId === deleteEventTarget.id || (!p.eventId && events.length <= 1)).length} Registered Athletes
                  </strong>{' '}
                  registered for this championship will be deleted from the database.
                </li>
                <li>
                  <strong className="text-rose-300">
                    {categories.length} Category Divisions
                  </strong>{' '}
                  and all associated bout draw records will be deleted.
                </li>
                <li>All knockout fixture trees and live scoring bouts will be deleted.</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteEventTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEvent}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Yes, Permanently Delete All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

