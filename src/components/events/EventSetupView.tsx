import React, { useState, useMemo } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { AgeCategory, WeightCategory } from '../../types/tournament';
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
} from 'lucide-react';

export const EventSetupView: React.FC = () => {
  const {
    event,
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

  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Age Category Modal state
  const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
  const [editingAge, setEditingAge] = useState<AgeCategory | null>(null);
  const [ageForm, setAgeForm] = useState({
    name: '',
    minAge: 12,
    maxAge: 14,
    description: '',
    status: 'active' as 'active' | 'inactive' | 'open' | 'closed',
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

  const isSuperAdmin = role === 'super_admin';
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

  // --- Age Category Handlers (Super Admin & Admin) ---
  const handleOpenAddAge = () => {
    if (!isSuperOrAdmin) return;
    setEditingAge(null);
    setAgeForm({
      name: '',
      minAge: 12,
      maxAge: 14,
      description: 'Athletes aged 12 to 14 years on tournament reference date',
      status: 'active',
    });
    setAgeFormError(null);
    setIsAgeModalOpen(true);
  };

  const handleOpenEditAge = (a: AgeCategory) => {
    if (!isSuperOrAdmin) return;
    setEditingAge(a);
    setAgeForm({
      name: a.name,
      minAge: a.minAge,
      maxAge: a.maxAge,
      description: a.description || '',
      status: a.status || 'active',
    });
    setAgeFormError(null);
    setIsAgeModalOpen(true);
  };

  const handleSaveAge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperOrAdmin) {
      setAgeFormError('Unauthorized: Only Super Admin and Admin can add or edit age classifications.');
      return;
    }
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
      const res = updateAgeCategory(editingAge.id, {
        name: ageForm.name.trim(),
        minAge: Number(ageForm.minAge),
        maxAge: Number(ageForm.maxAge),
        description: ageForm.description.trim(),
        status: (ageForm.status as 'active' | 'inactive') || 'active',
      });
      if (res && res.error) {
        setAgeFormError(res.error);
        return;
      }
      showFeedback(`Updated age classification: ${ageForm.name}`);
    } else {
      const res = addAgeCategory({
        name: ageForm.name.trim(),
        minAge: Number(ageForm.minAge),
        maxAge: Number(ageForm.maxAge),
        description: ageForm.description.trim() || `Athletes aged ${ageForm.minAge} to ${ageForm.maxAge} years on tournament reference date`,
        status: (ageForm.status as 'active' | 'inactive') || 'active',
      });
      if (res && res.error) {
        setAgeFormError(res.error);
        return;
      }
      showFeedback(`Created new age classification: ${ageForm.name}`);
    }
    setIsAgeModalOpen(false);
  };

  const handlePromptDeleteAge = (a: AgeCategory) => {
    if (!isSuperOrAdmin) return;
    const linked = categories.filter(c => c.ageCategoryId === a.id);
    setConfirmDialog({
      isOpen: true,
      type: 'delete_age',
      id: a.id,
      title: 'Delete this age classification?',
      message: 'Deleting this classification may affect categories or brackets using it.',
      warning:
        linked.length > 0
          ? `Warning: ${linked.length} category division(s) are currently configured with this age classification.`
          : undefined,
    });
  };

  const handlePromptResetAges = () => {
    if (!isSuperOrAdmin) return;
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

  // Filtered weight categories
  const filteredWeightCategories = useMemo(() => {
    if (weightFilterGender === 'all') return weightCategories;
    return weightCategories.filter(w => w.gender === weightFilterGender);
  }, [weightCategories, weightFilterGender]);

  const maleWeightCount = useMemo(() => weightCategories.filter(w => w.gender === 'male').length, [weightCategories]);
  const femaleWeightCount = useMemo(() => weightCategories.filter(w => w.gender === 'female').length, [weightCategories]);

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-amber-400" />
          Tournament Setup & Competition Parameters
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure event details, ring allocation, and official age calculation reference date.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

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
                    <span>+ Add Age</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs">
              {ageCategories.length === 0 ? (
                <div className="p-4 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No age classifications defined. {isSuperOrAdmin ? 'Click "+ Add Age" or reset to defaults.' : 'No age classifications available.'}
                </div>
              ) : (
                ageCategories.map(a => (
                  <div
                    key={a.id}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 group transition-all"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        <span className="truncate">{a.name}</span>
                        {a.status === 'inactive' || a.status === 'closed' ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                            Closed
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-2">
                        {a.description || `Athletes aged ${a.minAge} to ${a.maxAge} years on reference date`}
                      </div>
                      <div className="text-amber-400 font-mono-tabular font-semibold text-xs pt-0.5">
                        {a.minAge} - {a.maxAge} yrs
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {isSuperOrAdmin && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditAge(a)}
                            title="Edit age classification"
                            className="px-2 py-1 text-xs font-medium text-slate-300 hover:text-amber-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-amber-400" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromptDeleteAge(a)}
                            title="Delete age classification"
                            className="px-2 py-1 text-xs font-medium text-slate-300 hover:text-rose-400 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>Delete</span>
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
                  Status (Open / Closed)
                </label>
                <select
                  value={ageForm.status || 'active'}
                  onChange={e => setAgeForm({ ...ageForm, status: e.target.value as 'active' | 'inactive' | 'open' | 'closed' })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="active">Active (Open for Athlete Registration)</option>
                  <option value="inactive">Closed (Registration Disabled / Archived)</option>
                </select>
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
                  Save Changes
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
                {confirmDialog.type.startsWith('delete') ? 'Delete' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

