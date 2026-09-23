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
} from 'lucide-react';

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

  // Available weight categories filtered by gender
  const genderWeightCategories = useMemo(() => {
    return weightCategories.filter(w => w.gender === selectedGender);
  }, [weightCategories, selectedGender]);

  // Set default weight cat when gender changes
  React.useEffect(() => {
    if (genderWeightCategories.length > 0) {
      setSelectedWeightCatId(genderWeightCategories[0].id);
    }
  }, [genderWeightCategories]);

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
    if (!currentAgeCat || !currentWeightCat) return;

    const defaultName = `${currentAgeCat.name} ${selectedGender === 'male' ? 'Men/Boys' : 'Women/Girls'} · ${currentWeightCat.name} Sanda`;
    const catName = customName.trim() || defaultName;

    // Check if category name already exists
    const existing = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    if (existing) {
      setFeedbackMsg({ type: 'error', text: 'A category with this title already exists in the event.' });
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
      text: `Category "${created.name}" created with ${eligiblePlayers.length} matching eligible fighters. You can now confirm and lock it.`,
    });
    setCustomName('');
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
  const canDelete = role === 'super_admin';

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Category Generation & Eligibility Filter
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Select tournament parameters to filter eligible registered players, review matched fighters, and lock categories for knockout fixture generation.
        </p>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-red-950/60 border-red-800 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Two Column Section: Category Builder Filter (Left) & Existing Categories (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Interactive Filter & Category Generator Form */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-400" />
              Category Filter Builder
            </h2>
            <span className="text-[11px] text-amber-400 font-mono-tabular">Step 1 of 3</span>
          </div>

          <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
            {/* Event (Selected) */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">1. Tournament Event</label>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-medium">
                {event.name}
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">2. Gender Division *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGender('male')}
                  className={`py-2 px-3 rounded-lg border font-semibold transition-all ${
                    selectedGender === 'male'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Male (Men / Boys)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGender('female')}
                  className={`py-2 px-3 rounded-lg border font-semibold transition-all ${
                    selectedGender === 'female'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Female (Women / Girls)
                </button>
              </div>
            </div>

            {/* Age Category */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                3. Age Category (Ref Date: {event.tournamentReferenceDate}) *
              </label>
              <select
                value={selectedAgeCatId}
                onChange={e => setSelectedAgeCatId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {ageCategories.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.minAge} - {a.maxAge} yrs)
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
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
                  placeholder="e.g. Srinagar, Pune"
                  value={selectedDistrict}
                  onChange={e => setSelectedDistrict(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Club (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Sanda Academy"
                  value={selectedClub}
                  onChange={e => setSelectedClub(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Matched Count Live Counter */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">Eligible Registered Fighters:</span>
              <span className="font-mono-tabular font-bold text-amber-400 text-sm">
                {eligiblePlayers.length} athletes
              </span>
            </div>

            {/* Live Eligible List Preview */}
            <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-950/60 border border-slate-800/80 rounded-lg">
              {eligiblePlayers.length > 0 ? (
                eligiblePlayers.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-[11px] text-slate-300 py-1 px-1.5 hover:bg-slate-900 rounded">
                    <span className="font-medium truncate max-w-[140px]">{p.name}</span>
                    <span className="text-slate-500 font-mono-tabular">
                      {calculateAge(p.dob, event.tournamentReferenceDate)}y · {p.weightKg.toFixed(1)}kg
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-slate-500 text-center py-2">
                  No registered fighters match this exact age & weight combination.
                </p>
              )}
            </div>

            {/* Optional Custom Category Name */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                Custom Category Title (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave blank for auto-generated title"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {canEdit && (
              <button
                type="submit"
                disabled={eligiblePlayers.length === 0}
                className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                  eligiblePlayers.length > 0
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Form & Save Category ({eligiblePlayers.length} Fighters)</span>
              </button>
            )}
          </form>
        </div>

        {/* Right 7 Cols: Confirmed & Active Categories List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Configured Tournament Categories ({categories.length})
              </h2>
              <p className="text-[11px] text-slate-400">
                Confirm & lock categories to enable knockout bracket fixture generation.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {categories.map(cat => {
              const catPlayers = players.filter(p => cat.eligiblePlayerIds.includes(p.id));
              const bracket = brackets.find(b => b.categoryId === cat.id);

              return (
                <div
                  key={cat.id}
                  className={`p-4 rounded-xl border transition-all ${
                    cat.isLocked
                      ? 'bg-slate-900/90 border-slate-800 shadow-md'
                      : 'bg-slate-900/50 border-amber-500/30 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{cat.name}</span>
                        {cat.isLocked ? (
                          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                            <Unlock className="w-3 h-3" /> Pending Lock
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                        <span className="capitalize">{cat.gender}</span>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <span className="text-slate-300 font-mono-tabular font-medium">
                          {catPlayers.length} Eligible Competitors
                        </span>
                        {cat.confirmedBy && (
                          <>
                            <span aria-hidden="true" className="text-slate-700">·</span>
                            <span>Confirmed by {cat.confirmedBy}</span>
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
                            className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Unlock</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => lockCategory(cat.id)}
                            className="px-3 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Confirm & Lock</span>
                          </button>
                        )
                      )}

                      {/* Delete category (Super admin only) */}
                      {canDelete && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete category "${cat.name}"?`)) {
                              deleteCategory(cat.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Competitor Chips */}
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

                  {/* Fixture Bracket Status */}
                  <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    {bracket ? (
                      <div className="flex items-center gap-2 text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Fixture Generated ({bracket.rounds.length} Rounds)</span>
                      </div>
                    ) : (
                      <div className="text-slate-500">
                        {cat.isLocked ? 'Ready for bracket tree generation' : 'Lock category to generate fixture'}
                      </div>
                    )}

                    {canEdit && (
                      bracket ? (
                        <button
                          onClick={() => setActiveTab('brackets')}
                          className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 text-[11px]"
                        >
                          View Knockout Bracket →
                        </button>
                      ) : (
                        <button
                          disabled={!cat.isLocked || catPlayers.length < 2}
                          onClick={() => handleGenerateBracket(cat.id)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                            cat.isLocked && catPlayers.length >= 2
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <GitFork className="w-3.5 h-3.5" />
                          Generate Knockout Fixture
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
