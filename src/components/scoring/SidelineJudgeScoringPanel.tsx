import React, { useState, useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Bout, BoutStatus } from '../../types/tournament';
import { soundEffects } from '../../utils/soundEffects';
import { isArenaMatch } from '../../utils/arenaMatcher';
import {
  ShieldAlert,
  ShieldCheck,
  Swords,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Undo2,
  Award,
  ChevronRight,
  Filter,
  Flame,
  UserCheck,
  Clock,
  Sparkles,
} from 'lucide-react';

interface SidelineJudgeScoringPanelProps {
  onSwitchToOfficialScoring?: () => void;
}

export const SidelineJudgeScoringPanel: React.FC<SidelineJudgeScoringPanelProps> = ({
  onSwitchToOfficialScoring,
}) => {
  const {
    brackets,
    categories,
    currentUser,
    role,
    event,
    recordSidelineScoreAction,
    recordSidelineExit,
    recordSidelineWarning,
    undoLastSidelineAction,
    submitSidelineRoundCard,
    amendSidelineRoundCard,
    resetSidelineRoundCard,
    getJudgeScoresForBout,
    validateJudgeAccessForBout,
  } = useTournament();

  // Determine authorized arena for current user
  const isSuperOrAdmin = role === 'super_admin' || role === 'admin';
  const assignedRing = currentUser.assignedRing || currentUser.ringAssignment || '';

  // Admins can toggle between arenas for inspection; officials are STRICTLY locked to their assigned arena.
  const [adminSelectedRing, setAdminSelectedRing] = useState<string>(
    assignedRing || (event.rings && event.rings[0]) || 'Leitai 1 (Platform A)'
  );

  const activeTargetRing = isSuperOrAdmin ? adminSelectedRing : assignedRing;

  // Find all non-bye bouts matching STRICTLY the judge's assigned arena
  const arenaBouts: { bout: Bout; categoryName: string }[] = [];
  brackets.forEach(b => {
    const cat = categories.find(c => c.id === b.categoryId);
    b.rounds.forEach(r => {
      r.bouts.forEach(bout => {
        if (!bout.isBye && bout.redPlayerId && bout.bluePlayerId) {
          // Strict arena filtering: Only bouts belonging to the official's authorized ring
          if (isArenaMatch(activeTargetRing, bout.ring)) {
            arenaBouts.push({
              bout,
              categoryName: cat?.name || 'Sanda Division',
            });
          }
        }
      });
    });
  });

  // Selected bout state
  const [selectedBoutId, setSelectedBoutId] = useState<string>(
    arenaBouts[0]?.bout.id || ''
  );

  // Keep selected bout synchronized when arena filter changes
  useEffect(() => {
    if (arenaBouts.length > 0 && !arenaBouts.some(b => b.bout.id === selectedBoutId)) {
      setSelectedBoutId(arenaBouts[0].bout.id);
    }
  }, [activeTargetRing, arenaBouts, selectedBoutId]);

  const currentBoutEntry = arenaBouts.find(b => b.bout.id === selectedBoutId);
  const selectedBout = currentBoutEntry?.bout || null;
  const categoryName = currentBoutEntry?.categoryName || 'Sanda Division';

  // Round management
  const [currentRoundNumber, setCurrentRoundNumber] = useState<number>(1);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Clear notice after 3 seconds
  useEffect(() => {
    if (actionNotice) {
      const timer = setTimeout(() => setActionNotice(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionNotice]);

  useEffect(() => {
    if (errorNotice) {
      const timer = setTimeout(() => setErrorNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorNotice]);

  // Guard 1: Official has NO assigned arena
  if (!isSuperOrAdmin && (!assignedRing || !assignedRing.trim())) {
    return (
      <div className="p-8 sm:p-12 max-w-2xl mx-auto bg-slate-900/90 border border-amber-500/30 rounded-2xl text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-[11px] font-bold uppercase tracking-wider">
          Arena Assignment Required
        </div>
        <h2 className="text-xl font-bold text-white">No Arena Designated for Your Official Account</h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
          Official account <strong>{currentUser.name}</strong> ({currentUser.email || currentUser.username}) is not currently assigned to any Leitai platform.
        </p>
        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400 max-w-md mx-auto text-left space-y-2">
          <div className="font-semibold text-slate-200">Required Next Step:</div>
          <p>
            Please contact the Tournament Director or Super Admin to assign your account to <strong>Leitai 1</strong>, <strong>Leitai 2</strong>, or your designated arena platform.
          </p>
        </div>
        {onSwitchToOfficialScoring && (
          <button
            onClick={onSwitchToOfficialScoring}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            ← Return to Official Scoring Table
          </button>
        )}
      </div>
    );
  }

  // Load this judge's scorecards for selected bout
  const judgeScoresForBout = selectedBout
    ? getJudgeScoresForBout(selectedBout.id, currentUser.id)
    : [];

  const currentRoundJudgeScore = judgeScoresForBout.find(
    s => s.roundNumber === currentRoundNumber
  ) || {
    id: selectedBout ? `sjs-${selectedBout.id}-${currentUser.id}-r${currentRoundNumber}` : '',
    boutId: selectedBout?.id || '',
    eventId: selectedBout?.eventId || event.id,
    arena: activeTargetRing,
    judgeId: currentUser.id,
    judgeName: currentUser.name,
    roundNumber: currentRoundNumber,
    redPoints: 0,
    bluePoints: 0,
    redExits: 0,
    blueExits: 0,
    redWarnings: 0,
    blueWarnings: 0,
    scoreEvents: [],
    isSubmitted: false,
    updatedAt: new Date().toISOString(),
  };

  const isCardLocked = currentRoundJudgeScore.isSubmitted;

  // Handle Score Strike Action
  const handleScoreStrike = (
    corner: 'red' | 'blue',
    actionType: 'punch' | 'kick_thigh' | 'kick_body_head' | 'sweep_takedown' | 'fall_with_opponent',
    points: number,
    desc: string
  ) => {
    if (!selectedBout) return;
    setErrorNotice(null);
    soundEffects.playPointTone(corner);
    const res = recordSidelineScoreAction(
      selectedBout.id,
      currentRoundNumber,
      corner,
      actionType,
      points,
      desc
    );
    if (!res.success) {
      setErrorNotice(res.error || 'Failed to record strike score.');
    } else {
      setActionNotice(`${corner.toUpperCase()}: ${desc} (+${points} pt)`);
    }
  };

  // Handle Leitai Exit
  const handleExitRecord = (corner: 'red' | 'blue') => {
    if (!selectedBout) return;
    setErrorNotice(null);
    soundEffects.playWarningTone();
    const res = recordSidelineExit(selectedBout.id, currentRoundNumber, corner);
    if (!res.success) {
      setErrorNotice(res.error || 'Failed to record exit.');
    } else {
      setActionNotice(
        `${corner.toUpperCase()} Leitai Exit (+2 pts to ${corner === 'red' ? 'BLUE' : 'RED'})`
      );
    }
  };

  // Handle Warning
  const handleWarningRecord = (corner: 'red' | 'blue') => {
    if (!selectedBout) return;
    setErrorNotice(null);
    soundEffects.playWarningTone();
    const res = recordSidelineWarning(selectedBout.id, currentRoundNumber, corner);
    if (!res.success) {
      setErrorNotice(res.error || 'Failed to record warning.');
    } else {
      setActionNotice(`${corner.toUpperCase()} Warning recorded by Judge`);
    }
  };

  // Handle Undo
  const handleUndo = () => {
    if (!selectedBout) return;
    setErrorNotice(null);
    const res = undoLastSidelineAction(selectedBout.id, currentRoundNumber);
    if (!res.success) {
      setErrorNotice(res.error || 'Cannot undo.');
    } else {
      setActionNotice('Last action undone.');
    }
  };

  // Handle Submit Scorecard
  const handleSubmitCard = (winnerPref?: 'red' | 'blue' | 'draw') => {
    if (!selectedBout) return;
    setErrorNotice(null);
    const res = submitSidelineRoundCard(selectedBout.id, currentRoundNumber, winnerPref);
    if (!res.success) {
      setErrorNotice(res.error || 'Failed to submit judge card.');
    } else {
      soundEffects.playBell();
      setActionNotice(`Round ${currentRoundNumber} Scorecard Submitted to Official Record!`);
    }
  };

  // Handle Amend Scorecard
  const handleAmendCard = () => {
    if (!selectedBout) return;
    setErrorNotice(null);
    const res = amendSidelineRoundCard(selectedBout.id, currentRoundNumber);
    if (!res.success) {
      setErrorNotice(res.error || 'Failed to reopen scorecard.');
    } else {
      setActionNotice(`Round ${currentRoundNumber} Scorecard unlocked for corrections.`);
    }
  };

  // Handle Reset Card
  const handleResetCard = () => {
    if (!selectedBout) return;
    if (!window.confirm(`Clear all strikes and reset Round ${currentRoundNumber} scorecard?`)) {
      return;
    }
    const res = resetSidelineRoundCard(selectedBout.id, currentRoundNumber);
    if (!res.success) {
      setErrorNotice(res.error || 'Failed to reset scorecard.');
    } else {
      setActionNotice(`Round ${currentRoundNumber} scorecard reset.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Security & Arena Identity Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                Sideline Judge Console
              </span>
              <span className="text-[11px] text-slate-400">
                Official: <strong className="text-slate-100">{currentUser.name}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <span className="text-[11px] text-slate-400 font-mono">
                Role: <strong className="text-amber-400">{role.toUpperCase()}</strong>
              </span>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-white mt-1 flex items-center gap-2">
              <span>Designated Arena:</span>
              <span className="text-amber-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono-tabular">
                {activeTargetRing}
              </span>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-normal">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Strict Arena Protection Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* Controls & Arena Switching (for Super Admin / Admin inspection) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isSuperOrAdmin && event.rings && event.rings.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
              <span className="text-[11px] text-slate-400">Admin Arena View:</span>
              <select
                value={adminSelectedRing}
                onChange={e => setAdminSelectedRing(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-amber-300 focus:outline-none focus:border-amber-500"
              >
                {event.rings.map(ring => (
                  <option key={ring} value={ring}>
                    {ring}
                  </option>
                ))}
              </select>
            </div>
          )}

          {onSwitchToOfficialScoring && (
            <button
              onClick={onSwitchToOfficialScoring}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Table Console</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications / Errors */}
      {actionNotice && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-700/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2.5 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{actionNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-3.5 bg-rose-950/70 border border-rose-700/80 rounded-xl text-xs text-rose-300 flex items-center gap-2.5 shadow-lg animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-medium">{errorNotice}</span>
        </div>
      )}

      {/* Guard 2: No Bouts in this Arena */}
      {arenaBouts.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl space-y-3">
          <Swords className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Scheduled Bouts for {activeTargetRing}</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            There are currently no scheduled tournament bouts assigned to {activeTargetRing}. Bouts from other arenas are hidden according to strict arena-based access control.
          </p>
        </div>
      ) : (
        <>
          {/* Bout Selection Bar strictly for THIS arena */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Arena Match Schedule ({arenaBouts.length} bouts assigned to {activeTargetRing})
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Select a bout to view competitor cards and record independent scores.
                </div>
              </div>

              {/* Bout Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedBoutId}
                  onChange={e => setSelectedBoutId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold max-w-xs"
                >
                  {arenaBouts.map(({ bout: b, categoryName: cName }) => (
                    <option key={b.id} value={b.id}>
                      {b.boutNumber} · {b.redPlayerName} vs {b.bluePlayerName} ({b.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Horizontal Bout Pills for fast switching on tablet / laptop */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
              {arenaBouts.map(({ bout: b, categoryName: cName }) => {
                const isSelected = b.id === selectedBoutId;
                const scores = getJudgeScoresForBout(b.id, currentUser.id);
                const submittedRoundsCount = scores.filter(s => s.isSubmitted).length;

                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBoutId(b.id)}
                    className={`px-3 py-2 rounded-xl text-left border shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      <span className={isSelected ? 'text-amber-400' : 'text-slate-300'}>
                        {b.boutNumber}
                      </span>
                      <span className="text-[10px] text-slate-500">·</span>
                      <span className="text-slate-300 truncate max-w-[120px]">
                        {b.redPlayerName} vs {b.bluePlayerName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <span>{b.roundName}</span>
                      {submittedRoundsCount > 0 && (
                        <span className="text-emerald-400 font-semibold">
                          ({submittedRoundsCount}/3 submitted)
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Bout Info Card */}
          {selectedBout && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-6">
              {/* Bout Match Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono-tabular font-extrabold text-amber-400 text-base">
                      {selectedBout.boutNumber}
                    </span>
                    <span aria-hidden="true" className="text-slate-700">·</span>
                    <span className="font-semibold text-white text-sm">{categoryName}</span>
                    <span aria-hidden="true" className="text-slate-700">·</span>
                    <span className="text-slate-300 text-xs">{selectedBout.roundName}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                    <span>
                      Arena: <strong className="text-amber-300">{selectedBout.ring}</strong>
                    </span>
                    <span aria-hidden="true" className="text-slate-700">·</span>
                    <span>
                      Match Status:{' '}
                      <strong className="uppercase text-slate-200">{selectedBout.status}</strong>
                    </span>
                    {selectedBout.resultLocked && (
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800 text-[10px] font-bold">
                        Official Decision Finalized
                      </span>
                    )}
                  </div>
                </div>

                {/* Round Switcher Tabs (Round 1, 2, 3) */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Scoring Round:</span>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {[1, 2, 3].map(rNum => {
                      const rScore = judgeScoresForBout.find(s => s.roundNumber === rNum);
                      const isCurrent = currentRoundNumber === rNum;
                      const isSubmitted = rScore?.isSubmitted;

                      return (
                        <button
                          key={rNum}
                          onClick={() => setCurrentRoundNumber(rNum)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isCurrent
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>Round {rNum}</span>
                          {rScore && (
                            <span className="text-[10px] opacity-80 font-mono-tabular">
                              ({rScore.redPoints}-{rScore.bluePoints})
                            </span>
                          )}
                          {isSubmitted && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Status Banner: Locked / Open for this Round */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                  isCardLocked
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isCardLocked ? (
                    <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Unlock className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">
                      {isCardLocked
                        ? `Round ${currentRoundNumber} Judge Scorecard Submitted & Verified`
                        : `Round ${currentRoundNumber} Scorecard In Progress`}
                    </span>
                    <span className="ml-2 text-[11px] opacity-80">
                      {isCardLocked
                        ? `Recorded at ${currentRoundJudgeScore.submittedAt ? new Date(currentRoundJudgeScore.submittedAt).toLocaleTimeString() : 'Official Time'}. Decision: ${currentRoundJudgeScore.winner?.toUpperCase() || 'EVALUATED'}`
                        : 'Score touches, kicks, takedowns, exits, and warnings independently.'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCardLocked ? (
                    <button
                      onClick={handleAmendCard}
                      className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Amend Card</span>
                    </button>
                  ) : (
                    <>
                      {currentRoundJudgeScore.scoreEvents.length > 0 && (
                        <button
                          onClick={handleUndo}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                          title="Undo last strike entry"
                        >
                          <Undo2 className="w-3 h-3 text-amber-400" />
                          <span>Undo Last</span>
                        </button>
                      )}
                      <button
                        onClick={handleResetCard}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        title="Clear round scorecard"
                      >
                        Reset Round
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* DUAL CORNER TACTILE SCORING PADS (HONG vs HEI) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ================= RED CORNER (HONG) ================= */}
                <div className="bg-gradient-to-b from-red-950/40 to-slate-950 border-2 border-red-900/60 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold tracking-widest text-red-400 uppercase bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                        RED CORNER (HONG)
                      </span>
                      <h3 className="text-xl font-bold text-white mt-1.5">
                        {selectedBout.redPlayerName || 'Red Athlete'}
                      </h3>
                      <div className="text-xs text-slate-400">
                        {selectedBout.redClub || 'Martial Arts Team'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase">
                        Round {currentRoundNumber} Points
                      </div>
                      <div className="text-5xl font-black text-red-400 font-mono-tabular mt-0.5">
                        {currentRoundJudgeScore.redPoints}
                      </div>
                    </div>
                  </div>

                  {/* Leitai Off-Platform & Warnings for Red */}
                  <div className="flex items-center justify-between p-2.5 bg-red-950/30 rounded-xl border border-red-900/30 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span>Leitai Exits:</span>
                      <span
                        className={`font-mono-tabular font-bold ${
                          currentRoundJudgeScore.redExits >= 2 ? 'text-red-400 animate-pulse' : 'text-slate-200'
                        }`}
                      >
                        {currentRoundJudgeScore.redExits} / 2{' '}
                        {currentRoundJudgeScore.redExits >= 2 ? '(Round Win for Blue!)' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span>Warnings:</span>
                      <span className="font-mono-tabular font-bold text-amber-400">
                        {currentRoundJudgeScore.redWarnings}
                      </span>
                    </div>
                  </div>

                  {/* Tactile Scoring Buttons for Red Corner */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">
                      Red Scoring Strikes
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Fist / Punch */}
                      <button
                        disabled={isCardLocked}
                        onClick={() =>
                          handleScoreStrike(
                            'red',
                            'punch',
                            1,
                            'Straight / Hook punch to body (+1)'
                          )
                        }
                        className="p-3 bg-slate-900 hover:bg-red-900/40 disabled:opacity-50 disabled:pointer-events-none border border-slate-800 hover:border-red-600 rounded-xl text-left transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <div className="text-xs font-bold text-white flex justify-between">
                          <span>Fist / Punch</span>
                          <span className="text-red-400 font-mono-tabular font-bold">+1 pt</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Torso or head strike</div>
                      </button>

                      {/* Low Kick to Thigh */}
                      <button
                        disabled={isCardLocked}
                        onClick={() =>
                          handleScoreStrike(
                            'red',
                            'kick_thigh',
                            1,
                            'Low kick to opponent thigh (+1)'
                          )
                        }
                        className="p-3 bg-slate-900 hover:bg-red-900/40 disabled:opacity-50 disabled:pointer-events-none border border-slate-800 hover:border-red-600 rounded-xl text-left transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <div className="text-xs font-bold text-white flex justify-between">
                          <span>Low Kick (Thigh)</span>
                          <span className="text-red-400 font-mono-tabular font-bold">+1 pt</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Direct thigh strike</div>
                      </button>

                      {/* Head or Body Kick */}
                      <button
                        disabled={isCardLocked}
                        onClick={() =>
                          handleScoreStrike(
                            'red',
                            'kick_body_head',
                            2,
                            'Middle/High kick to torso or head (+2)'
                          )
                        }
                        className="p-3 bg-slate-900 hover:bg-red-900/40 disabled:opacity-50 disabled:pointer-events-none border border-slate-800 hover:border-red-600 rounded-xl text-left transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <div className="text-xs font-bold text-white flex justify-between">
                          <span>Body / Head Kick</span>
                          <span className="text-red-400 font-mono-tabular font-bold">+2 pts</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Clear kick to torso/head</div>
                      </button>

                      {/* Clean Takedown / Throw */}
                      <button
                        disabled={isCardLocked}
                        onClick={() =>
                          handleScoreStrike(
                            'red',
                            'sweep_takedown',
                            2,
                            'Clean takedown / throw while standing (+2)'
                          )
                        }
                        className="p-3 bg-slate-900 hover:bg-red-900/40 disabled:opacity-50 disabled:pointer-events-none border border-slate-800 hover:border-red-600 rounded-xl text-left transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <div className="text-xs font-bold text-white flex justify-between">
                          <span>Clean Throw</span>
                          <span className="text-red-400 font-mono-tabular font-bold">+2 pts</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Thrower remains standing</div>
                      </button>

                      {/* Fall with Opponent */}
                      <button
                        disabled={isCardLocked}
                        onClick={() =>
                          handleScoreStrike(
                            'red',
                            'fall_with_opponent',
                            1,
                            'Throw down but falling onto opponent (+1)'
                          )
                        }
                        className="p-3 bg-slate-900 hover:bg-red-900/40 disabled:opacity-50 disabled:pointer-events-none border border-slate-800 hover:border-red-600 rounded-xl text-left transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <div className="text-xs font-bold text-white flex justify-between">
                          <span>Fall with Throw</span>
                          <span className="text-red-400 font-mono-tabular font-bold">+1 pt</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Fighter lands on top</div>
                      </button>

                      {/* Record Leitai Exit */}
                      <button
                        disabled={isCardLocked}
                        onClick={() => handleExitRecord('red')}
                        className="p-3 bg-red-950/60 hover:bg-red-900/80 disabled:opacity-50 disabled:pointer-events-none border border-red-700 rounded-xl text-left transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <div className="text-xs font-bold text-red-200 flex justify-between">
                          <span>Red Stepped Off Leitai</span>
                          <span className="text-blue-300 font-mono-tabular font-bold">+2 to Blue</span>
                        </div>
                        <div className="text-[10px] text-red-300/80 mt-0.5">Off-platform exit count +1</div>
                      </button>
                    </div>

                    {/* Warning Button for Red */}
                    <div className="pt-1">
                      <button
                        disabled={isCardLocked}
                        onClick={() => handleWarningRecord('red')}
                        className="w-full py-2 bg-slate-950 hover:bg-amber-950/40 disabled:opacity-50 disabled:pointer-events-none border border-slate-800 hover:border-amber-700/60 rounded-xl text-amber-400 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Record Warning on Red Corner</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ================= BLUE CORNER (HEI) ================= */}
                <div className="bg-gradient-to-b from-blue-950/40 to-slate-950 border-2 border-blue-900/60 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold tracking-widest text-blue-400 uppercase bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                        BLUE CORNER (HEI)
                      </span>
                      <h3 className="text-xl font-bold text-white mt-1.5">
                        {selectedBout.bluePlayerName || 'Blue Athlete'}
                      </h3>
                      <div className="text-xs text-slate-400">
                        {selectedBout.blueClub || 'Martial Arts Team'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase">
                        Round {currentRoundNumber} Points
                      </div>
                      <div className="text-5xl font-black text-blue-400 font-mono-tabular mt-0.5">
                        {currentRoundJudgeScore.bluePoints}
                      </div>
                    </div>
                  </div>

                  {/* Leitai Off-Platform & Warnings for Blue */}
                  <div className="flex items-center justify-between p-2.5 bg-blue-950/30 rounded-xl border border-blue-900/30 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span>Leitai Exits:</span>
                      <span
                        className={`font-mono-tabular font-bold ${
                          currentRoundJudgeScore.blueExits >= 2 ? 'text-blue-400 animate-pulse' : 'text-slate-200'
                        }`}
                      >
                        {currentRoundJudgeScore.blueExits} / 2{' '}
                        {currentRoundJudgeScore.blueExits >= 2 ? '(Round Win for Red!)' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span>Warnings:</span>
                      <span className="font-mono-tabular font-bold text-amber-400">
                        {currentRoundJudgeScore.blueWarnings}
                      </span>
                    </div>
                  </div>

                  {/* Tactile Scoring Buttons for Blue Corner */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                      Blue Scoring Strikes
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Fist / Punch */}
                      <button
                        disabled={isCardLocked}
                        onClick={() =>
                          handleScoreStrike(
                            'blue',
                            'punch',
                            1,
                            'Straight / Hook punch to body (+1)'
                          )
                        }
                        className="p-3 bg-slate-900 hover:bg-blue-900/40 disabled:opacity-50 disabled:pointer-events-none border border-slate-800 hover:border-blue-600 rounded-xl text-left transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <div className="text-xs font-bold text-white flex justify-between">
                          <span>Fist / Punch</span>
                          <span className="text-blue-400 font-mono-tabular font-bold">+1 pt</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Torso or head strike</div>
                      </button>

                      {/* Low Kick to Thigh */}
                      <button
                        disabled={isCardLocked}
                        onClick={() =>
                          handleScoreStrike(
                            'blue',
                            'kick_thigh',
                            1,
                            'Low kick to opponent thigh (+1)'
                          )
                        }
                        className="p-3 bg-slate-900 hover:bg-blue-900/40 disabled:opacity-50 disabled:pointer-events-none border border-slate-800 hover:border-blue-600 rounded-xl text-left transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <div className="text-xs font-bold text-white flex justify-between">
                          <span>Low Kick (Thigh)</span>
                          <span className="text-blue-400 font-mono-tabular font-bold">+1 pt</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Direct thigh strike</div>
                      </button>

                      {/* Head or Body Kick */}
                      <button
                        disabled={isCardLocked}
                        onClick={() =>
                          handleScoreStrike(
                            'blue',
                            'kick_body_head',
                            2,
                            'Middle/High kick to torso or head (+2)'
                          )
                        }
                        className="p-3 bg-slate-900 hover:bg-blue-900/40 disabled:opacity-50 disabled:pointer-events-none border border-slate-800 hover:border-blue-600 rounded-xl text-left transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <div className="text-xs font-bold text-white flex justify-between">
                          <span>Body / Head Kick</span>
                          <span className="text-blue-400 font-mono-tabular font-bold">+2 pts</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Clear kick to torso/head</div>
                      </button>

                      {/* Clean Takedown / Throw */}
                      <button
                        disabled={isCardLocked}
                        onClick={() =>
                          handleScoreStrike(
                            'blue',
                            'sweep_takedown',
                            2,
                            'Clean takedown / throw while standing (+2)'
                          )
                        }
                        className="p-3 bg-slate-900 hover:bg-blue-900/40 disabled:opacity-50 disabled:pointer-events-none border border-slate-800 hover:border-blue-600 rounded-xl text-left transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <div className="text-xs font-bold text-white flex justify-between">
                          <span>Clean Throw</span>
                          <span className="text-blue-400 font-mono-tabular font-bold">+2 pts</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Thrower remains standing</div>
                      </button>

                      {/* Fall with Opponent */}
                      <button
                        disabled={isCardLocked}
                        onClick={() =>
                          handleScoreStrike(
                            'blue',
                            'fall_with_opponent',
                            1,
                            'Throw down but falling onto opponent (+1)'
                          )
                        }
                        className="p-3 bg-slate-900 hover:bg-blue-900/40 disabled:opacity-50 disabled:pointer-events-none border border-slate-800 hover:border-blue-600 rounded-xl text-left transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <div className="text-xs font-bold text-white flex justify-between">
                          <span>Fall with Throw</span>
                          <span className="text-blue-400 font-mono-tabular font-bold">+1 pt</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Fighter lands on top</div>
                      </button>

                      {/* Record Leitai Exit */}
                      <button
                        disabled={isCardLocked}
                        onClick={() => handleExitRecord('blue')}
                        className="p-3 bg-blue-950/60 hover:bg-blue-900/80 disabled:opacity-50 disabled:pointer-events-none border border-blue-700 rounded-xl text-left transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <div className="text-xs font-bold text-blue-200 flex justify-between">
                          <span>Blue Stepped Off Leitai</span>
                          <span className="text-red-300 font-mono-tabular font-bold">+2 to Red</span>
                        </div>
                        <div className="text-[10px] text-blue-300/80 mt-0.5">Off-platform exit count +1</div>
                      </button>
                    </div>

                    {/* Warning Button for Blue */}
                    <div className="pt-1">
                      <button
                        disabled={isCardLocked}
                        onClick={() => handleWarningRecord('blue')}
                        className="w-full py-2 bg-slate-950 hover:bg-amber-950/40 disabled:opacity-50 disabled:pointer-events-none border border-slate-800 hover:border-amber-700/60 rounded-xl text-amber-400 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Record Warning on Blue Corner</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* JUDGE SCORECARD SUBMISSION & ROUND WINNER EVALUATION */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>Round {currentRoundNumber} Judge Scorecard Evaluation</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Confirm points and submit your independent judge card for Round {currentRoundNumber}.
                    </p>
                  </div>

                  {/* Calculated Round Preference */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">Card Leader:</span>
                    <span
                      className={`px-3 py-1 rounded-lg font-bold text-xs font-mono-tabular ${
                        currentRoundJudgeScore.redPoints > currentRoundJudgeScore.bluePoints
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : currentRoundJudgeScore.bluePoints > currentRoundJudgeScore.redPoints
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {currentRoundJudgeScore.redPoints > currentRoundJudgeScore.bluePoints
                        ? `RED WINNER (${currentRoundJudgeScore.redPoints} - ${currentRoundJudgeScore.bluePoints})`
                        : currentRoundJudgeScore.bluePoints > currentRoundJudgeScore.redPoints
                        ? `BLUE WINNER (${currentRoundJudgeScore.bluePoints} - ${currentRoundJudgeScore.redPoints})`
                        : `DRAW (${currentRoundJudgeScore.redPoints} - ${currentRoundJudgeScore.bluePoints})`}
                    </span>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Independent scoring: This card will be recorded in the official judge registry and will NOT automatically modify the public scoreboard.
                    </span>
                  </div>

                  {!isCardLocked ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleSubmitCard('red')}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Submit Card (RED)</span>
                      </button>

                      <button
                        onClick={() => handleSubmitCard('blue')}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Submit Card (BLUE)</span>
                      </button>

                      <button
                        onClick={() => handleSubmitCard('draw')}
                        className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
                        title="Submit as Draw / Equal Points"
                      >
                        Draw
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Card Finalized & Saved</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Strike Events Audit Trail for this Judge & Round */}
              {currentRoundJudgeScore.scoreEvents.length > 0 && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Judge Strike Log (Round {currentRoundNumber} · {currentRoundJudgeScore.scoreEvents.length} actions)
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] font-mono-tabular">
                    {currentRoundJudgeScore.scoreEvents.map((evt, idx) => (
                      <div
                        key={evt.id || idx}
                        className="flex items-center justify-between py-1 px-2 rounded bg-slate-900/60 border border-slate-800/80"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              evt.corner === 'red' ? 'bg-red-950 text-red-400' : 'bg-blue-950 text-blue-400'
                            }`}
                          >
                            {evt.corner.toUpperCase()}
                          </span>
                          <span className="text-slate-300">{evt.description}</span>
                        </div>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
