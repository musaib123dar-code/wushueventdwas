import React, { useState, useMemo } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { calculateAge } from '../../utils/tournamentHelpers';
import {
  Filter,
  Lock,
  Unlock,
  CheckCircle2,
  GitFork,
  Trash2,
  AlertCircle,
  Users,
  Plus,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Edit2,
  Layers,
  X,
  Check,
} from 'lucide-react';
import { Category } from '../../types/tournament';

export const CategoryManager: React.FC = () => {
  const {
    event,
    categories,
    players,
    ageCategories,
    weightCategories,
    createCategory,
    lockCategory,
    unlockCategory,
    deleteCategory,
    generateBracketForCategory,
    brackets,
    role,
    setActiveTab,
  } = useTournament();

  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male');
  const [selectedAgeCatId, setSelectedAgeCatId] = useState<string>(ageCategories[0]?.id || '');
  const [selectedWeightCatId, setSelectedWeightCatId] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedClub, setSelectedClub] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal for delete confirmation (avoids browser window.confirm issues in iframes)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  // Modal for Custom Category Creation
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customCategoryForm, setCustomCategoryForm] = useState({
    name: '',
    gender: 'male' as 'male' | 'female',
    ageCategoryId: ageCategories[0]?.id || '',
    weightCategoryId: '',
  });

  // Available weight categories filtered by gender
  const genderWeightCategories = useMemo(() => {
    return weightCategories.filter(w => w.gender === selectedGender);
  }, [weightCategories, selectedGender]);

  // Set default weight cat when gender changes
  React.useEffect(() => {
    if (genderWeightCategories.length > 0 && !genderWeightCategories.some(w => w.id === selectedWeightCatId)) {
      setSelectedWeightCatId(genderWeightCategories[0].id);
    }
  }, [genderWeightCategories, selectedWeightCatId]);

  // Selected age and weight metadata
  const currentAgeCat = ageCategories.find(a => a.id === selectedAgeCatId);
  const currentWeightCat = weightCategories.find(w => w.id === selectedWeightCatId);

  // Live filter query: matching eligible players
  const eligiblePlayers = useMemo(() => {
    if (!currentAgeCat || !currentWeightCat) return [];

    return players.filter(p => {
      // 1. Gender check
      if (p.gender !== selectedGender) return false;

      // 2. Age eligibility against tournament reference date
      const age = calculateAge(p.dob, event.tournamentReferenceDate);
      if (age < currentAgeCat.minAge || age > currentAgeCat.maxAge) return false;

      // 3. Weight limits check
      if (p.weightKg < currentWeightCat.minWeightKg || p.weightKg > currentWeightCat.maxWeightKg) {
        return false;
      }

      // 4. Optional District
      if (selectedDistrict && p.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }

      // 5. Optional Club
      if (selectedClub && p.clubSchool.toLowerCase() !== selectedClub.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [players, selectedGender, currentAgeCat, currentWeightCat, selectedDistrict, selectedClub, event.tournamentReferenceDate]);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAgeCat || !currentWeightCat) {
      setFeedbackMsg({ type: 'error', text: 'Please select both Age and Weight classifications.' });
      return;
    }

    const defaultName = `${currentAgeCat.name} ${selectedGender === 'male' ? 'Men/Boys' : 'Women/Girls'} · ${currentWeightCat.name} Sanda`;
    const catName = customName.trim() || defaultName;

    // Check if category name already exists
    const existing = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    if (existing) {
      setFeedbackMsg({ type: 'error', text: `Category "${catName}" already exists in the event.` });
      return;
    }

    const created = createCategory({
      eventId: event.id,
      name: catName,
      gender: selectedGender,
      ageCategoryId: selectedAgeCatId,
      weightCategoryId: selectedWeightCatId,
      districtFilter: selectedDistrict || undefined,
      clubFilter: selectedClub || undefined,
    });

    setFeedbackMsg({
      type: 'success',
      text: `Category "${created.name}" created successfully with ${eligiblePlayers.length} registered fighters!`,
    });
    setCustomName('');
  };

  // Quick Batch Auto-Generation of All Official Standard Divisions
  const handleAutoGenerateAllStandardCategories = () => {
    if (role !== 'super_admin' && role !== 'admin') {
      setFeedbackMsg({ type: 'error', text: 'Unauthorized: Only Super Admin can auto-generate categories.' });
      return;
    }

    let createdCount = 0;
    const genders: ('male' | 'female')[] = ['male', 'female'];

    ageCategories.forEach(age => {
      genders.forEach(gen => {
        const weights = weightCategories.filter(w => w.gender === gen);
        weights.forEach(wt => {
          const autoName = `${age.name} ${gen === 'male' ? 'Men/Boys' : 'Women/Girls'} · ${wt.name} Sanda`;
          const exists = categories.some(c => c.name.toLowerCase() === autoName.toLowerCase());
          if (!exists) {
            createCategory({
              eventId: event.id,
              name: autoName,
              gender: gen,
              ageCategoryId: age.id,
              weightCategoryId: wt.id,
            });
            createdCount++;
          }
        });
      });
    });

    if (createdCount > 0) {
      setFeedbackMsg({
        type: 'success',
        text: `Successfully generated ${createdCount} official standard Sanda tournament divisions!`,
      });
    } else {
      setFeedbackMsg({
        type: 'error',
        text: 'All standard divisions already exist in the tournament.',
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!categoryToDelete) return;
    const res = deleteCategory(categoryToDelete.id);
    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: `Category "${categoryToDelete.name}" deleted successfully along with any attached brackets.`,
      });
    } else {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'Failed to delete category.',
      });
    }
    setCategoryToDelete(null);
  };

  const handleGenerateBracket = (catId: string) => {
    const res = generateBracketForCategory(catId);
    if (!res.success) {
      setFeedbackMsg({ type: 'error', text: res.error || 'Failed to generate fixture bracket.' });
    } else {
      setFeedbackMsg({ type: 'success', text: 'Single-elimination knockout fixture generated successfully!' });
      setActiveTab('brackets');
    }
  };

  const canEdit = role === 'super_admin' || role === 'admin' || role === 'official';
  const canDelete = role === 'super_admin' || role === 'admin';

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header & Quick Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span>Category Divisions & Eligibility Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, filter, lock, and manage official tournament categories. Super Admin can create custom divisions or auto-generate all official Sanda brackets.
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAutoGenerateAllStandardCategories}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              title="Automatically generate all standard age & weight categories for this championship"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Generate All Official Divisions</span>
            </button>
          </div>
        )}
      </div>

      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/70 border-red-500/40 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="leading-relaxed">{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Two Column Section: Category Builder Filter (Left) & Existing Categories (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Interactive Filter & Category Generator Form */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-400" />
              <span>Create / Form Category</span>
            </h2>
            <span className="text-[11px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              Super Admin / Admin
            </span>
          </div>

          <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
            {/* Event (Selected) */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">1. Tournament Championship</label>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-medium truncate">
                {event.name || 'Official Championship'}
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">2. Gender Division *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGender('male')}
                  className={`py-2 px-3 rounded-xl border font-semibold transition-all cursor-pointer ${
                    selectedGender === 'male'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Male (Men / Boys)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGender('female')}
                  className={`py-2 px-3 rounded-xl border font-semibold transition-all cursor-pointer ${
                    selectedGender === 'female'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Female (Women / Girls)
                </button>
              </div>
            </div>

            {/* Age Category */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center justify-between">
                <span>3. Age Category *</span>
                <span className="text-[10px] text-amber-400 font-mono-tabular">Ref: {event.tournamentReferenceDate}</span>
              </label>
              <select
                value={selectedAgeCatId}
                onChange={e => setSelectedAgeCatId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {ageCategories.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.minAge} - {a.maxAge} years)
                  </option>
                ))}
              </select>
            </div>

            {/* Weight Category */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                4. Weight Category (Sanda Limits) *
              </label>
              <select
                value={selectedWeightCatId}
                onChange={e => setSelectedWeightCatId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {genderWeightCategories.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.minWeightKg}kg - {w.maxWeightKg}kg)
                  </option>
                ))}
              </select>
            </div>

            {/* Optional District & Club Filter */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">District (Optional)</label>
                <input
                  type="text"
                  placeholder="All Districts"
                  value={selectedDistrict}
                  onChange={e => setSelectedDistrict(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Club (Optional)</label>
                <input
                  type="text"
                  placeholder="All Clubs"
                  value={selectedClub}
                  onChange={e => setSelectedClub(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Matched Count Live Counter */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">Currently Matching Registered Fighters:</span>
              <span className={`font-mono-tabular font-bold text-sm ${eligiblePlayers.length > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {eligiblePlayers.length} athletes
              </span>
            </div>

            {/* Live Eligible List Preview */}
            <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 bg-slate-950/60 border border-slate-800/80 rounded-xl">
              {eligiblePlayers.length > 0 ? (
                eligiblePlayers.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-[11px] text-slate-300 py-1 px-2 hover:bg-slate-900 rounded-lg">
                    <span className="font-medium truncate max-w-[150px]">{p.name}</span>
                    <span className="text-slate-500 font-mono-tabular">
                      {calculateAge(p.dob, event.tournamentReferenceDate)}y · {p.weightKg.toFixed(1)}kg
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-slate-500 text-center py-2">
                  No registered fighters match yet. Category can still be created in advance for upcoming weigh-ins!
                </p>
              )}
            </div>

            {/* Optional Custom Category Name */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                Custom Division Title (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave blank for auto-generated title"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {canEdit && (
              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create & Save Category ({eligiblePlayers.length} Matched)</span>
              </button>
            )}
          </form>
        </div>

        {/* Right 7 Cols: Confirmed & Active Categories List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Configured Tournament Categories</span>
                <span className="px-2 py-0.5 text-xs font-mono-tabular rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                  {categories.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Confirm & lock categories to enable knockout bracket fixture generation. Super Admin can delete or unlock at any time.
              </p>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-3">
              <Layers className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-300">No Categories Created Yet</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Use the Category Filter Builder on the left or click "Auto-Generate All Official Divisions" above to populate official Sanda categories.
              </p>
              {canEdit && (
                <button
                  onClick={handleAutoGenerateAllStandardCategories}
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Generate Official Divisions</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map(cat => {
                const catPlayers = players.filter(p => cat.eligiblePlayerIds.includes(p.id));
                const bracket = brackets.find(b => b.categoryId === cat.id);

                return (
                  <div
                    key={cat.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      cat.isLocked
                        ? 'bg-slate-900/90 border-slate-800 shadow-md'
                        : 'bg-slate-900/60 border-amber-500/30 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white tracking-tight">{cat.name}</span>
                          {cat.isLocked ? (
                            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                              <Unlock className="w-3 h-3" /> Pending Lock
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                          <span className="capitalize">{cat.gender}</span>
                          <span aria-hidden="true" className="text-slate-700">·</span>
                          <span className="text-slate-300 font-mono-tabular font-medium">
                            {catPlayers.length} Eligible Competitors
                          </span>
                          {cat.confirmedBy && (
                            <>
                              <span aria-hidden="true" className="text-slate-700">·</span>
                              <span className="text-emerald-400/80">Confirmed by {cat.confirmedBy}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Lock / Unlock toggle */}
                        {canEdit && (
                          cat.isLocked ? (
                            <button
                              onClick={() => unlockCategory(cat.id)}
                              className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Unlock category to modify roster or regenerate fixtures"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Unlock</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => lockCategory(cat.id)}
                              className="px-3 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Confirm & Lock</span>
                            </button>
                          )
                        )}

                        {/* Delete category Button (Direct in-app confirmation modal) */}
                        {canDelete && (
                          <button
                            onClick={() => setCategoryToDelete(cat)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-900/50 transition-colors cursor-pointer"
                            title={`Delete Category "${cat.name}"`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Competitor Chips */}
                    {catPlayers.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {catPlayers.map(cp => (
                          <span
                            key={cp.id}
                            className="text-[11px] bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-md font-medium"
                          >
                            {cp.name} ({cp.weightKg.toFixed(1)}kg)
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-slate-500 italic">
                        0 fighters currently registered in this weight/age bracket.
                      </div>
                    )}

                    {/* Fixture Bracket Status */}
                    <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                      {bracket ? (
                        <div className="flex items-center gap-2 text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Fixture Generated ({bracket.rounds.length} Rounds)</span>
                        </div>
                      ) : (
                        <div className="text-slate-400 text-[11px]">
                          {cat.isLocked
                            ? catPlayers.length >= 2
                              ? 'Ready for knockout fixture generation'
                              : 'Locked (Requires at least 2 fighters for fixture bracket)'
                            : 'Lock category to enable fixture bracket generation'}
                        </div>
                      )}

                      {canEdit && (
                        bracket ? (
                          <button
                            onClick={() => setActiveTab('brackets')}
                            className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 text-xs cursor-pointer"
                          >
                            <span>View Knockout Bracket</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            disabled={!cat.isLocked || catPlayers.length < 2}
                            onClick={() => handleGenerateBracket(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                              cat.isLocked && catPlayers.length >= 2
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm cursor-pointer'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <GitFork className="w-3.5 h-3.5" />
                            <span>Generate Knockout Fixture</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* IN-APP MODAL: CONFIRM DELETE CATEGORY (Super Admin) */}
      {/* ========================================================================= */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Tournament Category</h3>
                <p className="text-xs text-rose-400/80">Super Admin / Admin Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete category:{' '}
              <strong className="text-white">"{categoryToDelete.name}"</strong>?
            </p>

            {brackets.some(b => b.categoryId === categoryToDelete.id) && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  Active Bracket Attached
                </div>
                <p className="text-[11px] text-amber-300/80">
                  Deleting this category will also automatically remove its generated knockout fixture bracket and bouts.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Yes, Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
