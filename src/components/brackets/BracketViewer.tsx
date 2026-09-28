import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Bracket, Bout, Category, Player, AuditLog } from '../../types/tournament';
import { FixtureEditModal } from './FixtureEditModal';
import { MovePlayerModal } from './MovePlayerModal';
import {
  applyMovePlayerInBracket,
  applySwapPlayersInBracket,
  validateBracketNoDuplicates,
} from '../../utils/tournamentHelpers';
import {
  GitFork,
  RefreshCw,
  Printer,
  Play,
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw,
  Trophy,
  Swords,
  ChevronRight,
  Info,
  Sliders,
  Edit3,
  Save,
  X,
  Check,
  ArrowRightLeft,
} from 'lucide-react';

export const BracketViewer: React.FC = () => {
  const {
    brackets,
    categories,
    players,
    event,
    ageCategories,
    weightCategories,
    regenerateBracketForCategory,
    reopenBoutResult,
    updateBracketFixture,
    movePlayerInFixture,
    swapPlayersInFixture,
    setActiveBoutForScoring,
    setActiveTab,
    role,
    currentUser,
  } = useTournament();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || ''
  );
  const [reopenBoutModal, setReopenBoutModal] = useState<Bout | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [regenReason, setRegenReason] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lockedBoutNotice, setLockedBoutNotice] = useState<string | null>(null);

  // --- SUPER ADMIN FIXTURE EDIT STATE ---
  const isSuperAdmin = role === 'super_admin';
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftBracket, setDraftBracket] = useState<Bracket | null>(null);
  const [editingBout, setEditingBout] = useState<Bout | null>(null);

  // Move Player Modal state
  const [moveModalState, setMoveModalState] = useState<{
    isOpen: boolean;
    sourceBout: Bout;
    sourceCorner: 'red' | 'blue';
  } | null>(null);

  // Track pending moves/swaps for the audit log
  const [pendingLogs, setPendingLogs] = useState<
    { target: string; details: string; action: 'FIXTURE_PLAYER_MOVE' | 'FIXTURE_PLAYER_SWAP' | 'FIXTURE_EDIT' }[]
  >([]);

  // Summary confirmation modal state
  const [summaryConfirmModal, setSummaryConfirmModal] = useState<{
    changes: {
      boutNumber: string;
      prevRed: string;
      prevBlue: string;
      newRed: string;
      newBlue: string;
    }[];
  } | null>(null);

  const currentOriginalBracket = brackets.find(b => b.categoryId === selectedCategoryId);
  const currentBracket = isEditMode && draftBracket && draftBracket.categoryId === selectedCategoryId
    ? draftBracket
    : currentOriginalBracket;
  const currentCategory = categories.find(c => c.id === selectedCategoryId);

  const canEdit = role === 'super_admin' || role === 'admin';
  const canScore = role === 'super_admin' || role === 'admin' || role === 'official';

  const showSuccessFeedback = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleLaunchScoring = (bout: Bout) => {
    setActiveBoutForScoring(bout);
    setActiveTab('live-scoring');
  };

  const handleConfirmReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenBoutModal || !reopenReason.trim()) return;
    const res = reopenBoutResult(reopenBoutModal.id, reopenReason.trim());
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to reopen bout.');
    }
    setReopenBoutModal(null);
    setReopenReason('');
  };

  const handleConfirmRegen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId || !regenReason.trim()) return;
    const res = regenerateBracketForCategory(selectedCategoryId, regenReason.trim());
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to regenerate bracket.');
    }
    setRegenModalOpen(false);
    setRegenReason('');
  };

  // --- Fixture Edit Mode Handlers ---
  const handleEnterEditMode = () => {
    if (!currentOriginalBracket) return;
    setDraftBracket(JSON.parse(JSON.stringify(currentOriginalBracket)));
    setPendingLogs([]);
    setIsEditMode(true);
    setErrorMessage(null);
  };

  const handleCancelEditMode = () => {
    setIsEditMode(false);
    setDraftBracket(null);
    setEditingBout(null);
    setMoveModalState(null);
    setPendingLogs([]);
    setSummaryConfirmModal(null);
  };

  // Open Move Player modal
  const handleOpenMoveModal = (bout: Bout, corner: 'red' | 'blue') => {
    const isLocked =
      bout.resultLocked ||
      bout.status.startsWith('winner_') ||
      bout.status === 'completed' ||
      bout.status === 'live';
    if (isLocked) {
      setLockedBoutNotice('This bout is locked because a result has already been submitted.');
      return;
    }
    setMoveModalState({
      isOpen: true,
      sourceBout: bout,
      sourceCorner: corner,
    });
  };

  // Confirm Move Player to empty/BYE slot
  const handleConfirmMovePlayer = (
    destBoutId: string,
    destCorner: 'red' | 'blue',
    sourceBout: Bout,
    destBout: Bout
  ) => {
    if (!draftBracket) return;
    const sourceCorner = moveModalState?.sourceCorner || 'red';
    const playerName =
      sourceCorner === 'red' ? sourceBout.redPlayerName : sourceBout.bluePlayerName;

    const nextBracket = applyMovePlayerInBracket(
      draftBracket,
      sourceBout.id,
      sourceCorner,
      destBoutId,
      destCorner
    );

    const dupCheck = validateBracketNoDuplicates(nextBracket);
    if (!dupCheck.isValid) {
      setErrorMessage(`Player ${dupCheck.duplicatePlayerName} is already assigned to another active bout.`);
      return;
    }

    setDraftBracket(nextBracket);
    setPendingLogs(prev => [
      ...prev,
      {
        action: 'FIXTURE_PLAYER_MOVE',
        target: `Bout ${sourceBout.boutNumber} → ${destBout.boutNumber}`,
        details: `Player: ${playerName}; From: ${sourceBout.boutNumber} ${sourceCorner.toUpperCase()}; To: ${destBout.boutNumber} ${destCorner.toUpperCase()}; User: ${currentUser.name}; Role: super_admin`,
      },
    ]);
    showSuccessFeedback(
      `Moved ${playerName} from ${sourceBout.boutNumber} to ${destBout.boutNumber} (${destCorner.toUpperCase()}). Click [Save Changes] to persist and broadcast live.`
    );
    setMoveModalState(null);
  };

  // Confirm Swap Players between two slots
  const handleConfirmSwapPlayers = (
    destBoutId: string,
    destCorner: 'red' | 'blue',
    sourceBout: Bout,
    destBout: Bout
  ) => {
    if (!draftBracket) return;
    const sourceCorner = moveModalState?.sourceCorner || 'red';
    const playerA =
      sourceCorner === 'red' ? sourceBout.redPlayerName : sourceBout.bluePlayerName;
    const playerB =
      destCorner === 'red' ? destBout.redPlayerName : destBout.bluePlayerName;

    const nextBracket = applySwapPlayersInBracket(
      draftBracket,
      sourceBout.id,
      sourceCorner,
      destBoutId,
      destCorner
    );

    const dupCheck = validateBracketNoDuplicates(nextBracket);
    if (!dupCheck.isValid) {
      setErrorMessage(`Player ${dupCheck.duplicatePlayerName} is already assigned to another active bout.`);
      return;
    }

    setDraftBracket(nextBracket);
    setPendingLogs(prev => [
      ...prev,
      {
        action: 'FIXTURE_PLAYER_SWAP',
        target: `Bout ${sourceBout.boutNumber} ⇄ ${destBout.boutNumber}`,
        details: `${playerA}: ${sourceBout.boutNumber} ${sourceCorner.toUpperCase()} → ${destBout.boutNumber} ${destCorner.toUpperCase()}; ${playerB}: ${destBout.boutNumber} ${destCorner.toUpperCase()} → ${sourceBout.boutNumber} ${sourceCorner.toUpperCase()}; User: ${currentUser.name}; Role: super_admin`,
      },
    ]);
    showSuccessFeedback(
      `Swapped ${playerA} and ${playerB} between ${sourceBout.boutNumber} and ${destBout.boutNumber}. Click [Save Changes] to persist and broadcast live.`
    );
    setMoveModalState(null);
  };

  // Apply single bout modification to draft bracket
  const handleApplyBoutEdit = (
    updatedBout: Bout,
    movedConflict?: { sourceBoutId: string; sourceCorner: 'red' | 'blue' }
  ) => {
    if (!draftBracket) return;

    const nextRounds = draftBracket.rounds.map(round => ({
      ...round,
      bouts: round.bouts.map(b => {
        // If this was the conflicting source bout, remove the moved player
        if (movedConflict && b.id === movedConflict.sourceBoutId) {
          if (movedConflict.sourceCorner === 'red') {
            return {
              ...b,
              redPlayerId: null,
              redPlayerName: undefined,
              redClub: undefined,
              status: b.bluePlayerId ? 'scheduled' : b.status,
            };
          } else {
            return {
              ...b,
              bluePlayerId: null,
              bluePlayerName: undefined,
              blueClub: undefined,
              status: b.redPlayerId ? 'scheduled' : b.status,
            };
          }
        }

        // If this is the edited bout
        if (b.id === updatedBout.id) {
          return updatedBout;
        }

        return b;
      }),
    }));

    // If updated bout is a BYE and has a next bout, update next bout slot
    if (updatedBout.isBye && updatedBout.nextBoutId && updatedBout.nextBoutSlot && updatedBout.winnerId) {
      const winningPlayer = players.find(p => p.id === updatedBout.winnerId);
      if (winningPlayer) {
        for (const round of nextRounds) {
          for (let i = 0; i < round.bouts.length; i++) {
            if (round.bouts[i].id === updatedBout.nextBoutId) {
              const nb = { ...round.bouts[i] };
              if (updatedBout.nextBoutSlot === 'red') {
                nb.redPlayerId = winningPlayer.id;
                nb.redPlayerName = winningPlayer.name;
                nb.redClub = winningPlayer.clubSchool;
              } else {
                nb.bluePlayerId = winningPlayer.id;
                nb.bluePlayerName = winningPlayer.name;
                nb.blueClub = winningPlayer.clubSchool;
              }
              if (nb.redPlayerId && nb.bluePlayerId) {
                nb.status = 'ready';
              }
              round.bouts[i] = nb;
            }
          }
        }
      }
    } else if (!updatedBout.isBye && updatedBout.nextBoutId && updatedBout.nextBoutSlot) {
      // If previously a BYE was cleared, reset next bout slot to awaiting winner
      for (const round of nextRounds) {
        for (let i = 0; i < round.bouts.length; i++) {
          if (round.bouts[i].id === updatedBout.nextBoutId) {
            const nb = { ...round.bouts[i] };
            if (updatedBout.nextBoutSlot === 'red' && nb.redPlayerId === updatedBout.winnerId) {
              nb.redPlayerId = null;
              nb.redPlayerName = undefined;
              nb.redClub = undefined;
              nb.status = 'scheduled';
            } else if (updatedBout.nextBoutSlot === 'blue' && nb.bluePlayerId === updatedBout.winnerId) {
              nb.bluePlayerId = null;
              nb.bluePlayerName = undefined;
              nb.blueClub = undefined;
              nb.status = 'scheduled';
            }
            round.bouts[i] = nb;
          }
        }
      }
    }

    const updatedBracketState: Bracket = {
      ...draftBracket,
      rounds: nextRounds,
    };

    setDraftBracket(updatedBracketState);
    setEditingBout(null);
  };

  // Inspect changes and open confirmation summary
  const handleInitiateSaveFixture = () => {
    if (!currentOriginalBracket || !draftBracket) return;

    // Validate duplicate protection
    const dupCheck = validateBracketNoDuplicates(draftBracket);
    if (!dupCheck.isValid) {
      setErrorMessage(`Player ${dupCheck.duplicatePlayerName} is already assigned to another active bout.`);
      return;
    }

    const changes: {
      boutNumber: string;
      prevRed: string;
      prevBlue: string;
      newRed: string;
      newBlue: string;
    }[] = [];

    // Compare original bouts with draft bouts
    draftBracket.rounds.forEach(r => {
      r.bouts.forEach(b => {
        let origBout: Bout | null = null;
        for (const origR of currentOriginalBracket.rounds) {
          const found = origR.bouts.find(ob => ob.id === b.id);
          if (found) {
            origBout = found;
            break;
          }
        }

        if (origBout) {
          const redChanged = origBout.redPlayerId !== b.redPlayerId || origBout.redPlayerName !== b.redPlayerName;
          const blueChanged = origBout.bluePlayerId !== b.bluePlayerId || origBout.bluePlayerName !== b.bluePlayerName;
          const byeChanged = origBout.isBye !== b.isBye;
          const ringChanged = origBout.ring !== b.ring;
          const timeChanged = origBout.scheduledTime !== b.scheduledTime;
          const numChanged = origBout.boutNumber !== b.boutNumber;

          if (redChanged || blueChanged || byeChanged || ringChanged || timeChanged || numChanged) {
            changes.push({
              boutNumber: b.boutNumber,
              prevRed: origBout.redPlayerName || (origBout.isBye && !origBout.redPlayerId ? '— BYE —' : 'None / Awaiting'),
              prevBlue: origBout.bluePlayerName || (origBout.isBye && !origBout.bluePlayerId ? '— BYE —' : 'None / Awaiting'),
              newRed: b.redPlayerName || (b.isBye && !b.redPlayerId ? '— BYE —' : 'None / Awaiting'),
              newBlue: b.bluePlayerName || (b.isBye && !b.bluePlayerId ? '— BYE —' : 'None / Awaiting'),
            });
          }
        }
      });
    });

    if (changes.length === 0 && pendingLogs.length === 0) {
      showSuccessFeedback('No changes were made to the fixture.');
      setIsEditMode(false);
      setDraftBracket(null);
      setPendingLogs([]);
      return;
    }

    setSummaryConfirmModal({ changes });
  };

  // Final confirmation: execute save to Supabase, update state, and create audit log
  const handleExecuteSaveFixture = () => {
    if (!currentOriginalBracket || !draftBracket || !summaryConfirmModal) return;

    const dupCheck = validateBracketNoDuplicates(draftBracket);
    if (!dupCheck.isValid) {
      setErrorMessage(`Player ${dupCheck.duplicatePlayerName} is already assigned to another active bout.`);
      return;
    }

    const details = summaryConfirmModal.changes
      .map(
        c =>
          `Bout ${c.boutNumber}: RED "${c.prevRed}" -> "${c.newRed}", BLUE "${c.prevBlue}" -> "${c.newBlue}"`
      )
      .join('; ');

    const target = `Category: ${currentCategory?.name || currentOriginalBracket.categoryId}`;

    // Combine any recorded player move/swap logs with general fixture changes
    const allLogs: { target: string; details: string; action?: AuditLog['action'] }[] = [];

    pendingLogs.forEach(pl => {
      allLogs.push({
        target: pl.target,
        details: pl.details,
        action: pl.action,
      });
    });

    summaryConfirmModal.changes.forEach(c => {
      const alreadyCovered = allLogs.some(l => l.target.includes(c.boutNumber));
      if (!alreadyCovered) {
        const parts: string[] = [];
        if (c.prevRed !== c.newRed) {
          parts.push(`RED changed from "${c.prevRed}" to "${c.newRed}"`);
        }
        if (c.prevBlue !== c.newBlue) {
          parts.push(`BLUE changed from "${c.prevBlue}" to "${c.newBlue}"`);
        }
        allLogs.push({
          target: `Bout ${c.boutNumber}`,
          details: parts.join('; ') || `Fixture details updated for Bout ${c.boutNumber}`,
          action: 'FIXTURE_EDIT',
        });
      }
    });

    const res = updateBracketFixture(
      currentOriginalBracket.id,
      draftBracket,
      target,
      `Super Admin modified fixture assignments: ${details || 'Move/swap completed'}`,
      allLogs
    );

    if (res.success) {
      showSuccessFeedback('Fixture changes saved and synchronized to arena!');
      setIsEditMode(false);
      setDraftBracket(null);
      setPendingLogs([]);
      setSummaryConfirmModal(null);
    } else {
      setErrorMessage(res.error || 'Failed to save fixture changes.');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Success Notification */}
      {successMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Category Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <GitFork className="w-5 h-5 text-amber-400" />
            Single-Elimination Knockout Fixtures
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Interactive tree with automatic BYE advancement, live official scoring, and winner progression.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {categories.map(cat => {
              const hasBracket = brackets.some(b => b.categoryId === cat.id);
              const isSelected = cat.id === selectedCategoryId;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (isEditMode) {
                      setLockedBoutNotice('Please save or cancel fixture edit mode before switching categories.');
                      return;
                    }
                    setSelectedCategoryId(cat.id);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {cat.name.split('·')[0]} {cat.name.split('·')[1]?.slice(0, 12)}
                  {!hasBracket && <span className="ml-1 opacity-50">(Unset)</span>}
                </button>
              );
            })}
          </div>

          {/* Super Admin ONLY: Edit Fixture Button */}
          {isSuperAdmin && currentOriginalBracket && !isEditMode && (
            <button
              onClick={handleEnterEditMode}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 rounded-lg shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Super Admin: Manually adjust bout participants, seeds, or BYEs before match"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Edit Fixture</span>
            </button>
          )}

          {/* Regenerate Tree (Super Admin & Admin) */}
          {canEdit && currentOriginalBracket && !isEditMode && (
            <button
              onClick={() => setRegenModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Regenerate bracket with randomized seeds (Requires Audit Trail Reason)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Regenerate Tree</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print Tree</span>
          </button>
        </div>
      </div>

      {/* SUPER ADMIN FIXTURE EDIT MODE BANNER */}
      {isEditMode && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border-2 border-amber-500/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-lg shadow-amber-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="font-cinzel font-bold text-sm sm:text-base text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <span>FIXTURE EDIT MODE</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-sans font-bold">
                  SUPER ADMIN ONLY
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Click [Move] on any player slot to move or swap fighters between bouts, or click a bout card to edit fixture parameters.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleCancelEditMode}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInitiateSaveFixture}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Bracket Canvas */}
      {currentBracket ? (
        <div className={`bg-slate-900/90 border rounded-2xl p-6 shadow-xl overflow-x-auto print-card transition-all ${
          isEditMode ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-slate-800'
        }`}>
          {/* Tournament Tree Top Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-800/80 gap-3">
            <div>
              <div className="text-xs text-amber-400 font-bold uppercase tracking-wider font-cinzel flex items-center gap-2">
                <span>{currentCategory?.name}</span>
                {isEditMode && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-sans font-semibold">
                    Draft Active
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                <span>{currentBracket.rounds.length} Knockout Rounds</span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span className="text-slate-300 font-mono-tabular">
                  Generated: {new Date(currentBracket.generatedAt).toLocaleDateString()}
                </span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span className="text-emerald-400 font-medium">Automatic BYE Seeding</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-3 h-3 rounded-full bg-red-500/30 border border-red-500 inline-block"></span>
              <span>Red Corner (Hong)</span>
              <span className="w-3 h-3 rounded-full bg-blue-500/30 border border-blue-500 inline-block ml-3"></span>
              <span>Blue Corner (Hei)</span>
            </div>
          </div>

          {/* Bracket Tree Columns */}
          <div className="flex items-stretch gap-10 min-w-[960px] pb-6">
            {currentBracket.rounds.map((round, rIndex) => {
              const isFinalRound = rIndex === currentBracket.rounds.length - 1;
              const matchesCount = round.bouts.length;

              return (
                <div key={round.roundName} className="flex-1 flex flex-col">
                  {/* Round Column Title */}
                  <div className="text-center pb-4 mb-4 border-b border-slate-800/60">
                    <div className="text-xs font-bold text-slate-200 uppercase tracking-wider font-cinzel">
                      {round.roundName}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {matchesCount} {matchesCount === 1 ? 'Bout' : 'Bouts'}
                    </div>
                  </div>

                  {/* Column Bouts with vertical spacing that centers nodes for tree connection */}
                  <div className="flex-1 flex flex-col justify-around gap-6">
                    {round.bouts.map((bout, mIndex) => {
                      const isCompleted = bout.status.startsWith('winner_') || bout.status === 'completed' || bout.resultLocked;
                      const isLive = bout.status === 'live';
                      const isReady = bout.status === 'ready';

                      const redWon = isCompleted && bout.winnerCorner === 'red';
                      const blueWon = isCompleted && bout.winnerCorner === 'blue';

                      return (
                        <div
                          key={bout.id}
                          onClick={() => {
                            if (!isEditMode) return;
                            if (isCompleted) {
                              setLockedBoutNotice(
                                'This bout is locked because a result has already been submitted.'
                              );
                            } else {
                              setEditingBout(bout);
                            }
                          }}
                          className={`relative rounded-xl border transition-all text-xs ${
                            isEditMode
                              ? isCompleted
                                ? 'bg-slate-950 border-slate-800/90 cursor-not-allowed opacity-80'
                                : 'bg-slate-950 border-amber-500/60 ring-1 ring-amber-500/30 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer'
                              : isLive
                              ? 'bg-red-950/25 border-red-500 ring-1 ring-red-500/50 shadow-lg shadow-red-950/40'
                              : isCompleted
                              ? 'bg-slate-950 border-slate-800/90'
                              : 'bg-slate-950/70 border-slate-800/60'
                          }`}
                        >
                          {/* Bout Card Header */}
                          <div className="px-3 py-1.5 bg-slate-900/90 rounded-t-xl border-b border-slate-800/80 flex items-center justify-between text-[11px]">
                            <span className="font-mono-tabular font-bold text-amber-400">
                              {bout.boutNumber}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {bout.isBye && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-medium">
                                  BYE
                                </span>
                              )}
                              {isLive && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-red-600 text-white rounded font-bold animate-pulse">
                                  LIVE
                                </span>
                              )}
                              <span className="text-slate-400 font-mono-tabular text-[10px]">
                                {bout.ring.split(' ')[0]}
                              </span>
                            </div>
                          </div>

                          {/* Competitors Slot 1: Red */}
                          <div
                            className={`p-2.5 flex items-center justify-between border-b border-slate-900 transition-colors ${
                              redWon
                                ? 'bg-amber-500/10 font-bold text-amber-300'
                                : blueWon
                                ? 'opacity-50 text-slate-400'
                                : 'text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-2 flex-1">
                              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                              <div className="truncate">
                                <div className="truncate font-medium text-xs">
                                  {bout.redPlayerName || (bout.isBye && !bout.redPlayerId ? '— BYE —' : 'Awaiting Winner')}
                                </div>
                                {bout.redClub && (
                                  <div className="text-[10px] text-slate-400 truncate">{bout.redClub}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isEditMode && isSuperAdmin && bout.redPlayerName && !bout.isBye && !isCompleted && (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleOpenMoveModal(bout, 'red');
                                  }}
                                  className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] shrink-0 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                                  title={`Move ${bout.redPlayerName} to another bout`}
                                >
                                  <ArrowRightLeft className="w-2.5 h-2.5" />
                                  <span>Move</span>
                                </button>
                              )}
                              {redWon && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            </div>
                          </div>

                          {/* Competitors Slot 2: Blue */}
                          <div
                            className={`p-2.5 flex items-center justify-between transition-colors ${
                              blueWon
                                ? 'bg-amber-500/10 font-bold text-amber-300'
                                : redWon
                                ? 'opacity-50 text-slate-400'
                                : 'text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-2 flex-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                              <div className="truncate">
                                <div className="truncate font-medium text-xs">
                                  {bout.bluePlayerName || (bout.isBye && !bout.bluePlayerId ? '— BYE —' : 'Awaiting Winner')}
                                </div>
                                {bout.blueClub && (
                                  <div className="text-[10px] text-slate-400 truncate">{bout.blueClub}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isEditMode && isSuperAdmin && bout.bluePlayerName && !bout.isBye && !isCompleted && (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleOpenMoveModal(bout, 'blue');
                                  }}
                                  className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] shrink-0 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                                  title={`Move ${bout.bluePlayerName} to another bout`}
                                >
                                  <ArrowRightLeft className="w-2.5 h-2.5" />
                                  <span>Move</span>
                                </button>
                              )}
                              {blueWon && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            </div>
                          </div>

                          {/* Card Footer: Bout Actions */}
                          <div className="px-3 py-1.5 bg-slate-900/60 rounded-b-xl border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                            <div className="text-slate-400 truncate max-w-[140px]">
                              {bout.winningReason ? (
                                <span className="text-emerald-400 font-medium truncate">{bout.winningReason}</span>
                              ) : (
                                <span>{bout.scheduledTime}</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* If in edit mode: show Edit indicator */}
                              {isEditMode ? (
                                isCompleted ? (
                                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                    <Lock className="w-3 h-3 text-amber-400" />
                                    <span>Locked</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setEditingBout(bout);
                                    }}
                                    className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] cursor-pointer transition-colors flex items-center gap-1"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                )
                              ) : (
                                <>
                                  {/* Normal live scoring button */}
                                  {canScore && !bout.isBye && (
                                    <button
                                      onClick={() => handleLaunchScoring(bout)}
                                      className={`px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${
                                        isLive
                                          ? 'bg-red-600 hover:bg-red-500 text-white'
                                          : isCompleted
                                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                          : isReady
                                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold'
                                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                      }`}
                                      disabled={!bout.redPlayerId || !bout.bluePlayerId}
                                    >
                                      {isCompleted ? 'View Score' : isLive ? 'Score Live' : 'Start'}
                                    </button>
                                  )}

                                  {/* Admin Reopen result modal */}
                                  {canEdit && isCompleted && !bout.isBye && (
                                    <button
                                      onClick={() => setReopenBoutModal(bout)}
                                      className="p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded"
                                      title="Authorized Result Reopen / Edit"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Podium Champion Card (Rightmost end) */}
            {currentBracket.rounds.length > 0 && (
              <div className="w-64 flex flex-col justify-center">
                <div className="text-center pb-4 mb-4 border-b border-slate-800/60">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider font-cinzel">
                    Gold Champion
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">National Sanda Podium</div>
                </div>

                {(() => {
                  const finalRound = currentBracket.rounds[currentBracket.rounds.length - 1];
                  const finalBout = finalRound?.bouts[0];
                  const hasWinner = finalBout && finalBout.winnerId;
                  const winnerName = finalBout?.winnerCorner === 'red' ? finalBout.redPlayerName : finalBout?.bluePlayerName;
                  const winnerClub = finalBout?.winnerCorner === 'red' ? finalBout.redClub : finalBout?.blueClub;

                  return (
                    <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border border-amber-500/40 text-center shadow-2xl">
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center mx-auto mb-3 text-amber-400 shadow-md shadow-amber-500/20">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                        Gold Medalist
                      </div>
                      <div className="text-sm font-bold text-white mt-1">
                        {hasWinner ? winnerName : 'Tournament In Progress'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {hasWinner ? winnerClub : 'Awaiting Final Bout Outcome'}
                      </div>

                      {hasWinner && (
                        <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-emerald-400 font-medium">
                          ✓ Advanced through tree to victory!
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl">
          <GitFork className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">
            No Knockout Fixture Tree Generated Yet
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Select a category above, verify its eligible roster in Category Filtering, and generate the single-elimination tournament tree with automatic BYE allocation.
          </p>
          <button
            onClick={() => setActiveTab('categories')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            Go to Category Filtering →
          </button>
        </div>
      )}

      {/* Super Admin Move Player Modal */}
      {isEditMode && isSuperAdmin && moveModalState && draftBracket && (
        <MovePlayerModal
          isOpen={moveModalState.isOpen}
          onClose={() => setMoveModalState(null)}
          sourceBout={moveModalState.sourceBout}
          sourceCorner={moveModalState.sourceCorner}
          bracket={draftBracket}
          category={currentCategory}
          players={players}
          onConfirmMove={handleConfirmMovePlayer}
          onConfirmSwap={handleConfirmSwapPlayers}
        />
      )}

      {/* Super Admin Fixture Edit Modal */}
      {isEditMode && editingBout && draftBracket && (
        <FixtureEditModal
          isOpen={true}
          onClose={() => setEditingBout(null)}
          bout={editingBout}
          bracket={draftBracket}
          category={currentCategory}
          players={players}
          event={event}
          ageCategories={ageCategories}
          weightCategories={weightCategories}
          onApplyChanges={handleApplyBoutEdit}
        />
      )}

      {/* Locked Bout Notice Modal */}
      {lockedBoutNotice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Bout Cannot Be Modified Directly
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {lockedBoutNotice}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
              To change a completed bout, use the authorized &ldquo;Result Reopen&rdquo; feature with an official audit explanation.
            </p>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setLockedBoutNotice(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Summary Confirmation Modal */}
      {summaryConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-slate-800 pb-3">
              <div className="text-[11px] text-amber-400 font-bold uppercase tracking-widest">
                Review Super Admin Adjustments
              </div>
              <h4 className="text-lg font-bold text-white font-cinzel">
                FIXTURE CHANGES
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Category: <strong className="text-white">{currentCategory?.name}</strong>
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {summaryConfirmModal.changes.map(ch => (
                <div
                  key={ch.boutNumber}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs"
                >
                  <div className="font-mono-tabular font-bold text-amber-400 text-sm flex items-center justify-between">
                    <span>Bout: {ch.boutNumber}</span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-0.5">
                      Previous:
                    </span>
                    <div className="text-slate-300 space-y-0.5 pl-2 border-l border-red-500/40">
                      <div>
                        <span className="text-red-400 font-bold">RED:</span> {ch.prevRed}
                      </div>
                      <div>
                        <span className="text-blue-400 font-bold">BLUE:</span> {ch.prevBlue}
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-850">
                    <span className="font-semibold text-amber-400 uppercase tracking-wider text-[10px] block mb-0.5">
                      New:
                    </span>
                    <div className="text-white font-medium space-y-0.5 pl-2 border-l border-amber-500">
                      <div>
                        <span className="text-red-400 font-bold">RED:</span> {ch.newRed}
                      </div>
                      <div>
                        <span className="text-blue-400 font-bold">BLUE:</span> {ch.newBlue}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSummaryConfirmModal(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSaveFixture}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-all shadow-md shadow-amber-500/25 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Bout Result Modal */}
      {reopenBoutModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <RotateCcw className="w-5 h-5" />
              <h3 className="font-bold text-white text-base">
                Authorized Reopen of Bout {reopenBoutModal.boutNumber}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              In accordance with tournament regulations, reopening a finalized fight clears the winner from the subsequent bracket node and records an immutable audit entry.
            </p>

            <form onSubmit={handleConfirmReopen} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">
                  Official Reason for Correction *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  placeholder="e.g. Scorer typo, successful appeal on Round 2 exit ruling..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setReopenBoutModal(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
                >
                  Reopen Bout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bracket Regeneration Modal */}
      {regenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-white text-base">
                Regenerate Knockout Fixture Tree?
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              This will reshuffle the tournament tree and re-allocate BYE slots. As per PRD requirements, an elevated permission audit record is required.
            </p>

            <form onSubmit={handleConfirmRegen} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">
                  Audit Reason for Bracket Reshuffle *
                </label>
                <input
                  type="text"
                  required
                  value={regenReason}
                  onChange={e => setRegenReason(e.target.value)}
                  placeholder="e.g. Late weigh-in adjustment, re-seeding top seeds..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRegenModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Confirm & Regenerate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

