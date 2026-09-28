import React, { useState, useMemo } from 'react';
import { Bracket, Bout, Category, Player, EventSetup, AgeCategory, WeightCategory } from '../../types/tournament';
import { calculateAge } from '../../utils/tournamentHelpers';
import {
  X,
  UserCheck,
  Search,
  ArrowLeftRight,
  AlertTriangle,
  Check,
  Clock,
  Radio,
  Shield,
  Users,
  ChevronDown,
} from 'lucide-react';

interface FixtureEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  bout: Bout;
  bracket: Bracket;
  category?: Category;
  players: Player[];
  event: EventSetup;
  ageCategories: AgeCategory[];
  weightCategories: WeightCategory[];
  onApplyChanges: (
    updatedBout: Bout,
    movedConflict?: { sourceBoutId: string; sourceCorner: 'red' | 'blue' }
  ) => void;
}

export const FixtureEditModal: React.FC<FixtureEditModalProps> = ({
  isOpen,
  onClose,
  bout,
  bracket,
  category,
  players,
  event,
  ageCategories,
  weightCategories,
  onApplyChanges,
}) => {
  // Form draft state
  const [boutNumber, setBoutNumber] = useState(bout.boutNumber);
  const [ring, setRing] = useState(bout.ring || (event.rings[0] || 'Leitai 1'));
  const [scheduledTime, setScheduledTime] = useState(bout.scheduledTime || '');

  // Red and Blue corner states
  const [redPlayerId, setRedPlayerId] = useState<string | null>(bout.redPlayerId || null);
  const [redPlayerName, setRedPlayerName] = useState(bout.redPlayerName || '');
  const [redClub, setRedClub] = useState(bout.redClub || '');
  const [redIsBye, setRedIsBye] = useState(bout.isBye && !bout.redPlayerId);

  const [bluePlayerId, setBluePlayerId] = useState<string | null>(bout.bluePlayerId || null);
  const [bluePlayerName, setBluePlayerName] = useState(bout.bluePlayerName || '');
  const [blueClub, setBlueClub] = useState(bout.blueClub || '');
  const [blueIsBye, setBlueIsBye] = useState(bout.isBye && !bout.bluePlayerId);

  // Player selector sub-view state
  const [pickingCorner, setPickingCorner] = useState<'red' | 'blue' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoryOnly, setFilterCategoryOnly] = useState(true);

  // Conflict prompt state
  const [conflictPrompt, setConflictPrompt] = useState<{
    player: Player;
    targetCorner: 'red' | 'blue';
    sourceBout: Bout;
    sourceCorner: 'red' | 'blue';
  } | null>(null);

  // Pending move tracking
  const [pendingMovedConflict, setPendingMovedConflict] = useState<{
    sourceBoutId: string;
    sourceCorner: 'red' | 'blue';
  } | undefined>(undefined);

  // Summary confirmation state
  const [showSummaryConfirm, setShowSummaryConfirm] = useState(false);

  // Category mismatch prompt state
  const [categoryMismatchPrompt, setCategoryMismatchPrompt] = useState<{
    player: Player;
    corner: 'red' | 'blue';
    playerAgeCat: string;
    playerWeightCat: string;
  } | null>(null);

  // Check if bout is completed/locked
  const isCompletedOrLocked =
    bout.resultLocked || bout.status.startsWith('winner_') || bout.status === 'completed';

  // Category weight/age helper labels
  const categoryAge = useMemo(() => {
    return ageCategories.find(a => a.id === category?.ageCategoryId);
  }, [ageCategories, category]);

  const categoryWeight = useMemo(() => {
    return weightCategories.find(w => w.id === category?.weightCategoryId);
  }, [weightCategories, category]);

  const getPlayerAgeCategory = (player: Player) => {
    const age = calculateAge(player.dob, event.tournamentReferenceDate);
    const found = ageCategories.find(a => age >= a.minAge && age <= a.maxAge);
    return found ? found.name : `${age} yrs`;
  };

  const getPlayerWeightCategory = (player: Player) => {
    const found = weightCategories.find(
      w => w.gender === player.gender && player.weightKg >= w.minWeightKg && player.weightKg <= w.maxWeightKg
    );
    return found ? found.name : `${player.weightKg} kg`;
  };

  const isCategoryMatch = (player: Player) => {
    if (!category) return true;
    if (category.eligiblePlayerIds && category.eligiblePlayerIds.length > 0) {
      return category.eligiblePlayerIds.includes(player.id);
    }
    if (category.gender && category.gender !== player.gender) return false;
    return true;
  };

  // Filtered player pool for selection
  const selectablePlayers = useMemo(() => {
    let pool = players;
    if (filterCategoryOnly && category?.eligiblePlayerIds) {
      pool = players.filter(p => category.eligiblePlayerIds.includes(p.id));
    }

    if (!searchQuery.trim()) return pool;

    const q = searchQuery.toLowerCase().trim();
    return pool.filter(p => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchReg = p.registrationNumber.toLowerCase().includes(q);
      const matchClub = p.clubSchool?.toLowerCase().includes(q);
      const matchDistrict = p.district?.toLowerCase().includes(q);
      return matchName || matchReg || matchClub || matchDistrict;
    });
  }, [players, category, filterCategoryOnly, searchQuery]);

  if (!isOpen) return null;

  // Handle swapping Red and Blue corners with one click
  const handleSwapCorners = () => {
    const tempId = redPlayerId;
    const tempName = redPlayerName;
    const tempClub = redClub;
    const tempBye = redIsBye;

    setRedPlayerId(bluePlayerId);
    setRedPlayerName(bluePlayerName);
    setRedClub(blueClub);
    setRedIsBye(blueIsBye);

    setBluePlayerId(tempId);
    setBluePlayerName(tempName);
    setBlueClub(tempClub);
    setBlueIsBye(tempBye);
  };

  // Check if player is already assigned to another active bout in this bracket
  const checkPlayerConflict = (player: Player, targetCorner: 'red' | 'blue') => {
    for (const round of bracket.rounds) {
      for (const b of round.bouts) {
        if (b.id !== bout.id) {
          if (b.redPlayerId === player.id) {
            return { sourceBout: b, sourceCorner: 'red' as const };
          }
          if (b.bluePlayerId === player.id) {
            return { sourceBout: b, sourceCorner: 'blue' as const };
          }
        }
      }
    }
    return null;
  };

  // Attempting to select a player for Red or Blue
  const handleSelectPlayer = (player: Player) => {
    if (!pickingCorner) return;

    // Check category match
    if (!isCategoryMatch(player)) {
      setCategoryMismatchPrompt({
        player,
        corner: pickingCorner,
        playerAgeCat: getPlayerAgeCategory(player),
        playerWeightCat: getPlayerWeightCategory(player),
      });
      return;
    }

    proceedWithPlayerSelection(player, pickingCorner);
  };

  const proceedWithPlayerSelection = (player: Player, corner: 'red' | 'blue') => {
    // Check conflict
    const conflict = checkPlayerConflict(player, corner);
    if (conflict) {
      setConflictPrompt({
        player,
        targetCorner: corner,
        sourceBout: conflict.sourceBout,
        sourceCorner: conflict.sourceCorner,
      });
      return;
    }

    assignPlayerDirectly(player, corner);
  };

  const handleConfirmCategoryMismatch = () => {
    if (!categoryMismatchPrompt) return;
    const { player, corner } = categoryMismatchPrompt;
    setCategoryMismatchPrompt(null);
    proceedWithPlayerSelection(player, corner);
  };

  const assignPlayerDirectly = (player: Player, corner: 'red' | 'blue') => {
    if (corner === 'red') {
      setRedPlayerId(player.id);
      setRedPlayerName(player.name);
      setRedClub(player.clubSchool || player.district || '');
      setRedIsBye(false);
    } else {
      setBluePlayerId(player.id);
      setBluePlayerName(player.name);
      setBlueClub(player.clubSchool || player.district || '');
      setBlueIsBye(false);
    }
    setPickingCorner(null);
    setSearchQuery('');
  };

  // Confirming "Move Player" from conflicting bout
  const handleConfirmMovePlayer = () => {
    if (!conflictPrompt) return;
    const { player, targetCorner, sourceBout, sourceCorner } = conflictPrompt;

    setPendingMovedConflict({
      sourceBoutId: sourceBout.id,
      sourceCorner,
    });

    assignPlayerDirectly(player, targetCorner);
    setConflictPrompt(null);
  };

  // Set slot as BYE
  const handleSetBye = (corner: 'red' | 'blue') => {
    if (corner === 'red') {
      setRedPlayerId(null);
      setRedPlayerName('— BYE —');
      setRedClub('');
      setRedIsBye(true);
    } else {
      setBluePlayerId(null);
      setBluePlayerName('— BYE —');
      setBlueClub('');
      setBlueIsBye(true);
    }
  };

  // Clear slot (Awaiting Winner)
  const handleClearSlot = (corner: 'red' | 'blue') => {
    if (corner === 'red') {
      setRedPlayerId(null);
      setRedPlayerName('');
      setRedClub('');
      setRedIsBye(false);
    } else {
      setBluePlayerId(null);
      setBluePlayerName('');
      setBlueClub('');
      setBlueIsBye(false);
    }
  };

  // Prepare updated bout object
  const buildUpdatedBout = (): Bout => {
    const isNowBye = Boolean(redIsBye || blueIsBye);
    let nextStatus = bout.status;
    let winnerId = bout.winnerId;
    let winnerCorner = bout.winnerCorner;
    let winningReason = bout.winningReason;
    let resultLocked = bout.resultLocked;

    if (isNowBye) {
      if (redPlayerId && !bluePlayerId) {
        winnerId = redPlayerId;
        winnerCorner = 'red';
        winningReason = 'BYE Automatic Advancement';
        nextStatus = 'completed';
        resultLocked = true;
      } else if (bluePlayerId && !redPlayerId) {
        winnerId = bluePlayerId;
        winnerCorner = 'blue';
        winningReason = 'BYE Automatic Advancement';
        nextStatus = 'completed';
        resultLocked = true;
      }
    } else {
      // Normal 2-player bout or pending
      if (redPlayerId && bluePlayerId) {
        nextStatus = 'ready';
      } else {
        nextStatus = 'scheduled';
      }
      winnerId = null;
      winnerCorner = undefined;
      winningReason = undefined;
      resultLocked = false;
    }

    return {
      ...bout,
      boutNumber: boutNumber.trim() || bout.boutNumber,
      ring,
      scheduledTime: scheduledTime.trim() || bout.scheduledTime,
      redPlayerId,
      redPlayerName: redPlayerName.trim() || undefined,
      redClub: redClub.trim() || undefined,
      bluePlayerId,
      bluePlayerName: bluePlayerName.trim() || undefined,
      blueClub: blueClub.trim() || undefined,
      isBye: isNowBye,
      status: nextStatus,
      winnerId,
      winnerCorner,
      winningReason,
      resultLocked,
    };
  };

  // Format previous vs new names for summary
  const prevRedDesc = bout.redPlayerName || (bout.isBye && !bout.redPlayerId ? '— BYE —' : 'None / Awaiting');
  const prevBlueDesc = bout.bluePlayerName || (bout.isBye && !bout.bluePlayerId ? '— BYE —' : 'None / Awaiting');
  const newRedDesc = redPlayerName || (redIsBye ? '— BYE —' : 'None / Awaiting');
  const newBlueDesc = bluePlayerName || (blueIsBye ? '— BYE —' : 'None / Awaiting');

  const handleApply = () => {
    const updated = buildUpdatedBout();
    onApplyChanges(updated, pendingMovedConflict);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Edit Fixture · {bout.boutNumber}
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  {bout.roundName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {category?.name || 'Tournament Bracket Bout'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Completed / Locked Warning */}
        {isCompletedOrLocked && (
          <div className="p-4 bg-amber-950/40 border-b border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300">
                This bout has already been completed/locked and cannot be changed directly.
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Modifying historical results or scores of finalized fights is prevented to preserve tournament integrity and bracket records.
              </div>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
          {/* Top Parameters: Bout Number, Ring Platform, Scheduled Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
            <div>
              <label className="block text-slate-400 text-[11px] mb-1 font-medium">
                Bout Number / Code
              </label>
              <input
                type="text"
                disabled={isCompletedOrLocked}
                value={boutNumber}
                onChange={e => setBoutNumber(e.target.value)}
                placeholder="e.g. B-101"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-amber-400 font-mono-tabular font-bold focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1 font-medium">
                Arena Platform (Ring)
              </label>
              <select
                disabled={isCompletedOrLocked}
                value={ring}
                onChange={e => setRing(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 font-medium focus:outline-none focus:border-amber-500 disabled:opacity-50"
              >
                {event.rings.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1 font-medium">
                Scheduled Session Time
              </label>
              <input
                type="text"
                disabled={isCompletedOrLocked}
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                placeholder="e.g. Day 1 · 10:15"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono-tabular focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Quick Corner Swap Button */}
          {!isCompletedOrLocked && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleSwapCorners}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:text-amber-400"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                <span>Swap Red and Blue Corners</span>
              </button>
            </div>
          )}

          {/* Red and Blue Corner Assignment Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* RED CORNER CARD */}
            <div className="rounded-xl border border-red-900/60 bg-gradient-to-b from-red-950/20 to-slate-950 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-red-900/40">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 shrink-0"></span>
                  <span className="font-bold text-red-400 uppercase tracking-wider text-[11px]">
                    RED CORNER (HONG)
                  </span>
                </div>
                {redIsBye && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-amber-400 rounded font-semibold border border-slate-700">
                    BYE
                  </span>
                )}
              </div>

              <div className="min-h-[58px] flex flex-col justify-center bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5">
                {redIsBye ? (
                  <div className="text-center font-bold text-slate-400 italic">
                    — BYE —
                  </div>
                ) : redPlayerId ? (
                  <div>
                    <div className="font-bold text-slate-100 text-sm truncate">
                      {redPlayerName}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {redClub || 'Registered Club'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-500 italic text-[11px]">
                    None / Awaiting Winner
                  </div>
                )}
              </div>

              {!isCompletedOrLocked && (
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPickingCorner('red');
                      setSearchQuery('');
                    }}
                    className="flex-1 py-1.5 px-2 bg-red-950/80 hover:bg-red-900/80 text-red-200 border border-red-800/80 rounded-lg font-semibold text-center transition-colors cursor-pointer"
                  >
                    Change Player
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetBye('red')}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg font-medium transition-colors cursor-pointer"
                    title="Mark as BYE"
                  >
                    BYE
                  </button>
                  {(redPlayerId || redIsBye) && (
                    <button
                      type="button"
                      onClick={() => handleClearSlot('red')}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Clear slot"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* BLUE CORNER CARD */}
            <div className="rounded-xl border border-blue-900/60 bg-gradient-to-b from-blue-950/20 to-slate-950 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-blue-900/40">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">
                    BLUE CORNER (HEI)
                  </span>
                </div>
                {blueIsBye && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-amber-400 rounded font-semibold border border-slate-700">
                    BYE
                  </span>
                )}
              </div>

              <div className="min-h-[58px] flex flex-col justify-center bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5">
                {blueIsBye ? (
                  <div className="text-center font-bold text-slate-400 italic">
                    — BYE —
                  </div>
                ) : bluePlayerId ? (
                  <div>
                    <div className="font-bold text-slate-100 text-sm truncate">
                      {bluePlayerName}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {blueClub || 'Registered Club'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-500 italic text-[11px]">
                    None / Awaiting Winner
                  </div>
                )}
              </div>

              {!isCompletedOrLocked && (
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPickingCorner('blue');
                      setSearchQuery('');
                    }}
                    className="flex-1 py-1.5 px-2 bg-blue-950/80 hover:bg-blue-900/80 text-blue-200 border border-blue-800/80 rounded-lg font-semibold text-center transition-colors cursor-pointer"
                  >
                    Change Player
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetBye('blue')}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg font-medium transition-colors cursor-pointer"
                    title="Mark as BYE"
                  >
                    BYE
                  </button>
                  {(bluePlayerId || blueIsBye) && (
                    <button
                      type="button"
                      onClick={() => handleClearSlot('blue')}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Clear slot"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sub-Panel: Player Search & Picker */}
          {pickingCorner && (
            <div className="p-4 bg-slate-950 border border-amber-500/40 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white">
                    Select Player for {pickingCorner.toUpperCase()} Corner
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPickingCorner(null)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕ Close Selector
                </button>
              </div>

              {/* Search Bar & Scope Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by Name, Reg #, Club, District..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setFilterCategoryOnly(!filterCategoryOnly)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                    filterCategoryOnly
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  {filterCategoryOnly ? 'Category Eligible Only' : 'All Registered Fighters'}
                </button>
              </div>

              {/* Players List */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {selectablePlayers.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                    No matching players found.
                  </div>
                ) : (
                  selectablePlayers.map(p => {
                    const isAlreadySelected =
                      (pickingCorner === 'red' && bluePlayerId === p.id) ||
                      (pickingCorner === 'blue' && redPlayerId === p.id);
                    const calcAge = calculateAge(p.dob, event.tournamentReferenceDate);

                    return (
                      <div
                        key={p.id}
                        onClick={() => !isAlreadySelected && handleSelectPlayer(p)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                          isAlreadySelected
                            ? 'bg-slate-900/40 border-slate-800/50 opacity-40 cursor-not-allowed'
                            : 'bg-slate-900 hover:bg-slate-850 hover:border-amber-500/60 border-slate-800 cursor-pointer'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-100 text-xs">
                              {p.name}
                            </span>
                            <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-semibold border border-slate-700">
                              {p.registrationNumber}
                            </span>
                            <span className="text-[10px] uppercase font-semibold text-slate-400">
                              {p.gender}
                            </span>
                            {!isCategoryMatch(p) && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                                Other Category
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                              Age: <strong className="text-amber-300 font-medium">{getPlayerAgeCategory(p)}</strong> ({calcAge} yrs)
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                              Weight: <strong className="text-amber-300 font-medium">{getPlayerWeightCategory(p)}</strong> ({p.weightKg} kg)
                            </span>
                            <span className="truncate text-slate-400">
                              Club/School: <span className="text-slate-300">{p.clubSchool || p.district || 'Independent'}</span>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isAlreadySelected}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-md text-[11px] shrink-0 cursor-pointer"
                        >
                          Select
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {isCompletedOrLocked ? (
              <span className="text-amber-400">Completed bout cannot be modified</span>
            ) : (
              <span>Changes apply to knockout bracket upon confirmation</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>
            {!isCompletedOrLocked && (
              <button
                type="button"
                onClick={() => setShowSummaryConfirm(true)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all shadow-md shadow-amber-500/20 cursor-pointer text-xs"
              >
                Review & Apply
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Mismatch Prevention Modal */}
      {categoryMismatchPrompt && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Category Group Mismatch Warning
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  <strong className="text-amber-300">{categoryMismatchPrompt.player.name}</strong> ({categoryMismatchPrompt.player.registrationNumber}) belongs to:
                </p>
                <div className="mt-1 text-xs text-slate-300 space-y-0.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div>Gender: <span className="font-semibold text-white uppercase">{categoryMismatchPrompt.player.gender}</span></div>
                  <div>Age Classification: <span className="font-semibold text-white">{categoryMismatchPrompt.playerAgeCat}</span></div>
                  <div>Weight Division: <span className="font-semibold text-white">{categoryMismatchPrompt.playerWeightCat}</span></div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  This bout is in category: <strong className="text-amber-400">{category?.name || 'Current Bracket'}</strong>.
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
              Assigning a fighter from an unrelated category will place them into this fixture slot. Do you wish to proceed with Super Admin override?
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCategoryMismatchPrompt(null)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCategoryMismatch}
                className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                Assign Anyway (Override)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Prevention Modal */}
      {conflictPrompt && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Player already assigned to another active bout
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  <strong className="text-amber-300">{conflictPrompt.player.name}</strong> ({conflictPrompt.player.registrationNumber}) is currently assigned to{' '}
                  <span className="font-semibold text-white">
                    {conflictPrompt.sourceCorner.toUpperCase()} Corner
                  </span>{' '}
                  in <strong className="text-amber-400">{conflictPrompt.sourceBout.boutNumber}</strong> ({conflictPrompt.sourceBout.roundName}).
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
              Moving this player will remove them from {conflictPrompt.sourceBout.boutNumber} and place them into this bout without duplicating assignments.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConflictPrompt(null)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMovePlayer}
                className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                Move Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Confirmation Summary Modal */}
      {showSummaryConfirm && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-slate-800 pb-3">
              <div className="text-[11px] text-amber-400 font-bold uppercase tracking-widest">
                Confirmation
              </div>
              <h4 className="text-base font-bold text-white font-cinzel">
                FIXTURE CHANGES
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Bout: <span className="font-mono-tabular font-bold text-white">{boutNumber}</span> ({bout.roundName})
              </p>
            </div>

            <div className="space-y-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                  Previous:
                </span>
                <div className="space-y-0.5 text-slate-300">
                  <div>
                    <span className="text-red-400 font-bold">RED:</span> {prevRedDesc}
                  </div>
                  <div>
                    <span className="text-blue-400 font-bold">BLUE:</span> {prevBlueDesc}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-850">
                <span className="font-semibold text-amber-400 uppercase tracking-wider text-[10px] block mb-1">
                  New:
                </span>
                <div className="space-y-0.5 text-white font-medium">
                  <div>
                    <span className="text-red-400 font-bold">RED:</span> {newRedDesc}
                  </div>
                  <div>
                    <span className="text-blue-400 font-bold">BLUE:</span> {newBlueDesc}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSummaryConfirm(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSummaryConfirm(false);
                  handleApply();
                }}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
