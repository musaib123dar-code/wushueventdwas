import React, { useState, useEffect, useRef } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Bout, BoutStatus, ScoreEvent } from '../../types/tournament';
import { soundEffects } from '../../utils/soundEffects';
import confetti from 'canvas-confetti';
import {
  Swords,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  AlertOctagon,
  CheckCircle2,
  Award,
  Clock,
  ShieldAlert,
  Flame,
  UserCheck,
  ChevronRight,
  Trophy,
} from 'lucide-react';

export const LiveScoringArena: React.FC = () => {
  const {
    activeBoutForScoring,
    setActiveBoutForScoring,
    brackets,
    categories,
    recordBoutScoreEvent,
    recordBoutExit,
    recordBoutWarning,
    submitBoutResult,
    reopenBoutResult,
    role,
    currentUser,
    event,
    setActiveTab,
  } = useTournament();

  // Find all available non-bye bouts for selection
  const allBouts: { bout: Bout; categoryName: string }[] = [];
  brackets.forEach(b => {
    const cat = categories.find(c => c.id === b.categoryId);
    b.rounds.forEach(r => {
      r.bouts.forEach(bout => {
        if (!bout.isBye && bout.redPlayerId && bout.bluePlayerId) {
          allBouts.push({
            bout,
            categoryName: cat?.name || 'Sanda Division',
          });
        }
      });
    });
  });

  // Current selected bout
  const [selectedBoutId, setSelectedBoutId] = useState<string>(
    activeBoutForScoring?.id || allBouts[0]?.bout.id || ''
  );

  // Sync when activeBoutForScoring changes from outside
  useEffect(() => {
    if (activeBoutForScoring) {
      setSelectedBoutId(activeBoutForScoring.id);
    }
  }, [activeBoutForScoring]);

  const currentBoutEntry = allBouts.find(b => b.bout.id === selectedBoutId);
  const bout = currentBoutEntry?.bout || activeBoutForScoring;
  const categoryName = currentBoutEntry?.categoryName || 'Sanda Championship';

  // Round management
  const [currentRoundNumber, setCurrentRoundNumber] = useState<number>(1);
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(event.roundDurationSec || 120);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [isRestPeriod, setIsRestPeriod] = useState<boolean>(false);

  // Result submission state
  const [winnerCorner, setWinnerCorner] = useState<'red' | 'blue'>('red');
  const [resultStatus, setResultStatus] = useState<BoutStatus>('winner_points');
  const [customReason, setCustomReason] = useState<string>('Winner by Points');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Admin correction modal
  const [isReopenModalOpen, setIsReopenModalOpen] = useState<boolean>(false);
  const [reopenReasonText, setReopenReasonText] = useState<string>('');

  // Timer countdown loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimeRemainingSec(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            soundEffects.playBuzzer();
            if (!isRestPeriod && currentRoundNumber < 3) {
              setIsRestPeriod(true);
              return event.restDurationSec || 60;
            } else if (isRestPeriod) {
              setIsRestPeriod(false);
              setCurrentRoundNumber(r => Math.min(3, r + 1));
              return event.roundDurationSec || 120;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, isRestPeriod, currentRoundNumber, event]);

  const toggleTimer = () => {
    if (!timerRunning) {
      soundEffects.playBell();
    }
    setTimerRunning(!timerRunning);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setIsRestPeriod(false);
    setTimeRemainingSec(event.roundDurationSec || 120);
  };

  const switchRound = (roundNum: number) => {
    setTimerRunning(false);
    setIsRestPeriod(false);
    setCurrentRoundNumber(roundNum);
    setTimeRemainingSec(event.roundDurationSec || 120);
  };

  const currentRoundData = bout?.rounds.find(r => r.roundNumber === currentRoundNumber) || {
    roundNumber: currentRoundNumber,
    redPoints: 0,
    bluePoints: 0,
    redExits: 0,
    blueExits: 0,
    redWarnings: 0,
    blueWarnings: 0,
  };

  // Official Sanda Scoring Actions
  const handleScore = (corner: 'red' | 'blue', actionType: ScoreEvent['actionType'], points: number, desc: string) => {
    if (!bout || bout.resultLocked || role === 'general_view') return;
    soundEffects.playPointTone(corner);
    recordBoutScoreEvent(bout.id, {
      roundNumber: currentRoundNumber,
      corner,
      actionType,
      points,
      description: desc,
    });
  };

  const handleExit = (corner: 'red' | 'blue') => {
    if (!bout || bout.resultLocked || role === 'general_view') return;
    soundEffects.playWarningTone();
    recordBoutExit(bout.id, currentRoundNumber, corner);
  };

  const handleWarning = (corner: 'red' | 'blue') => {
    if (!bout || bout.resultLocked || role === 'general_view') return;
    soundEffects.playWarningTone();
    recordBoutWarning(bout.id, currentRoundNumber, corner);
  };

  const handleSubmitResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bout) return;
    setSubmitError(null);

    const res = submitBoutResult(bout.id, winnerCorner, resultStatus, customReason);
    if (!res.success) {
      setSubmitError(res.error || 'Failed to submit fight result.');
      return;
    }

    // Victory confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const handleReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bout || !reopenReasonText.trim()) return;
    const res = reopenBoutResult(bout.id, reopenReasonText.trim());
    if (!res.success) {
      alert(res.error);
    }
    setIsReopenModalOpen(false);
    setReopenReasonText('');
  };

  // Format mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const canScore = role === 'super_admin' || role === 'admin' || role === 'official';
  const canReopen = role === 'super_admin' || role === 'admin';

  if (!bout) {
    return (
      <div className="p-12 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl">
        <Swords className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-white mb-1">No Active Bout Selected for Scoring</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
          Please select a scheduled fight from the brackets or upcoming queue to begin official scoring.
        </p>
        <button
          onClick={() => setActiveTab('brackets')}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl"
        >
          Go to Fixture Brackets →
        </button>
      </div>
    );
  }

  // Calculate cumulative round wins
  let redRoundsWon = 0;
  let blueRoundsWon = 0;
  bout.rounds.forEach(r => {
    if (r.redPoints > r.bluePoints || r.blueExits >= 2) redRoundsWon++;
    else if (r.bluePoints > r.redPoints || r.redExits >= 2) blueRoundsWon++;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header: Bout Selector & Leitai Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <span className="font-mono-tabular font-bold text-amber-400 text-sm">{bout.boutNumber}</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="font-semibold text-white">{categoryName}</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="text-slate-300 font-medium">{bout.roundName}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
            <span>Arena Ring: <strong className="text-slate-200">{bout.ring}</strong></span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>Chief Judge: <strong className="text-slate-200">{currentUser.name}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch Active Bout Dropdown */}
          <select
            value={selectedBoutId}
            onChange={e => {
              setSelectedBoutId(e.target.value);
              const target = allBouts.find(b => b.bout.id === e.target.value);
              if (target) setActiveBoutForScoring(target.bout);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            {allBouts.map(b => (
              <option key={b.bout.id} value={b.bout.id}>
                {b.bout.boutNumber} · {b.bout.redPlayerName} vs {b.bout.bluePlayerName} ({b.bout.status})
              </option>
            ))}
          </select>

          {/* Reopen Button if finalized */}
          {bout.resultLocked && canReopen && (
            <button
              onClick={() => setIsReopenModalOpen(true)}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5" />
              Reopen Result
            </button>
          )}
        </div>
      </div>

      {/* Lock Notice if bout is completed */}
      {bout.resultLocked && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-300">
                Official Bout Result Submitted & Locked
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-0.5">
                Winner: <strong>{bout.winnerCorner === 'red' ? bout.redPlayerName : bout.bluePlayerName}</strong> ({bout.winningReason}). Advanced to next bracket round.
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono-tabular uppercase px-2 py-0.5 bg-emerald-900/60 text-emerald-300 rounded border border-emerald-700">
            Locked
          </span>
        </div>
      )}

      {/* Arena Scoreboard & Timers */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Round Switcher & Arena Clock */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800">
          {/* Round Selectors (Round 1, 2, 3) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            {[1, 2, 3].map(rNum => {
              const rData = bout.rounds.find(r => r.roundNumber === rNum);
              const isCurrent = currentRoundNumber === rNum;
              return (
                <button
                  key={rNum}
                  onClick={() => switchRound(rNum)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Round {rNum}
                  {rData && (
                    <span className="ml-1.5 text-[10px] opacity-75 font-mono-tabular">
                      ({rData.redPoints}-{rData.bluePoints})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Running Match Rounds Won Display */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Match Rounds Won:</span>
            <div className="flex items-center gap-2 font-mono-tabular font-extrabold text-sm">
              <span className="px-2.5 py-1 bg-red-950 border border-red-800 text-red-400 rounded-lg">
                RED: {redRoundsWon}
              </span>
              <span className="text-slate-600">:</span>
              <span className="px-2.5 py-1 bg-blue-950 border border-blue-800 text-blue-400 rounded-lg">
                BLUE: {blueRoundsWon}
              </span>
            </div>
          </div>

          {/* 2-Minute Timer Controls */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                {isRestPeriod ? 'Rest Interval' : `Round ${currentRoundNumber}`}
              </div>
              <div className={`text-3xl font-extrabold font-mono-tabular tracking-wider ${
                timeRemainingSec <= 10 ? 'text-red-500 animate-pulse' : isRestPeriod ? 'text-emerald-400' : 'text-white'
              }`}>
                {formatTime(timeRemainingSec)}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTimer}
                disabled={bout.resultLocked}
                className={`p-2.5 rounded-xl font-semibold transition-all ${
                  timerRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title={timerRunning ? 'Pause Timer' : 'Start Round Timer'}
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                onClick={resetTimer}
                disabled={bout.resultLocked}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                title="Reset Round Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Big Dual Corner Scoring Boards (Hong vs Hei) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* RED CORNER (Hong) */}
          <div className="bg-gradient-to-b from-red-950/40 to-slate-950 border-2 border-red-900/60 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold tracking-widest text-red-400 uppercase bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                  RED CORNER (HONG)
                </span>
                <h2 className="text-xl font-bold text-white mt-1.5">{bout.redPlayerName || 'TBD'}</h2>
                <div className="text-xs text-slate-400">{bout.redClub || 'Martial Arts Club'}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase">Round {currentRoundNumber} Pts</div>
                <div className="text-5xl font-black text-red-400 font-mono-tabular mt-0.5">
                  {currentRoundData.redPoints}
                </div>
              </div>
            </div>

            {/* Leitai Off-Platform & Warnings status for Red */}
            <div className="flex items-center justify-between p-2.5 bg-red-950/30 rounded-xl border border-red-900/30 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span>Leitai Exits:</span>
                <span className={`font-mono-tabular font-bold ${currentRoundData.redExits >= 2 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                  {currentRoundData.redExits} / 2 {currentRoundData.redExits >= 2 ? '(Round Loss!)' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span>Warnings:</span>
                <span className="font-mono-tabular font-bold text-amber-400">
                  {currentRoundData.redWarnings}
                </span>
              </div>
            </div>

            {/* Official Scoring Action Buttons */}
            {canScore && !bout.resultLocked && (
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">
                  Sanda Strike Scoring
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleScore('red', 'punch', 1, 'Straight / Hook punch to body (+1)')}
                    className="p-2.5 bg-slate-900 hover:bg-red-900/30 border border-slate-800 hover:border-red-700/60 rounded-xl text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white flex justify-between">
                      <span>Fist / Punch</span>
                      <span className="text-red-400 font-mono-tabular">+1 pt</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Torso or head punch</div>
                  </button>

                  <button
                    onClick={() => handleScore('red', 'kick_thigh', 1, 'Low kick to thigh (+1)')}
                    className="p-2.5 bg-slate-900 hover:bg-red-900/30 border border-slate-800 hover:border-red-700/60 rounded-xl text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white flex justify-between">
                      <span>Kick to Thigh</span>
                      <span className="text-red-400 font-mono-tabular">+1 pt</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Valid low kick</div>
                  </button>

                  <button
                    onClick={() => handleScore('red', 'kick_body_head', 2, 'High kick to head/torso (+2)')}
                    className="p-2.5 bg-slate-900 hover:bg-red-900/30 border border-slate-800 hover:border-red-700/60 rounded-xl text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white flex justify-between">
                      <span>Kick to Body/Head</span>
                      <span className="text-red-400 font-mono-tabular">+2 pts</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Roundhouse or side kick</div>
                  </button>

                  <button
                    onClick={() => handleScore('red', 'sweep_takedown', 2, 'Sweep takedown standing (+2)')}
                    className="p-2.5 bg-slate-900 hover:bg-red-900/30 border border-slate-800 hover:border-red-700/60 rounded-xl text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white flex justify-between">
                      <span>Clean Takedown</span>
                      <span className="text-red-400 font-mono-tabular">+2 pts</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Fighter remains standing</div>
                  </button>
                </div>

                {/* Penalties & Exits */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleExit('red')}
                    className="p-2 bg-red-950/60 hover:bg-red-900/60 border border-red-800 rounded-xl text-xs font-medium text-red-200 transition-colors"
                  >
                    Platform Exit (+2 to Blue)
                  </button>
                  <button
                    onClick={() => handleWarning('red')}
                    className="p-2 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800 rounded-xl text-xs font-medium text-amber-200 transition-colors"
                  >
                    Warning (-1 pt deduction)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BLUE/BLACK CORNER (Hei) */}
          <div className="bg-gradient-to-b from-blue-950/40 to-slate-950 border-2 border-blue-900/60 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold tracking-widest text-blue-400 uppercase bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                  BLACK / BLUE CORNER (HEI)
                </span>
                <h2 className="text-xl font-bold text-white mt-1.5">{bout.bluePlayerName || 'TBD'}</h2>
                <div className="text-xs text-slate-400">{bout.blueClub || 'Martial Arts Club'}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase">Round {currentRoundNumber} Pts</div>
                <div className="text-5xl font-black text-blue-400 font-mono-tabular mt-0.5">
                  {currentRoundData.bluePoints}
                </div>
              </div>
            </div>

            {/* Leitai Off-Platform & Warnings status for Blue */}
            <div className="flex items-center justify-between p-2.5 bg-blue-950/30 rounded-xl border border-blue-900/30 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span>Leitai Exits:</span>
                <span className={`font-mono-tabular font-bold ${currentRoundData.blueExits >= 2 ? 'text-blue-400 animate-pulse' : 'text-slate-200'}`}>
                  {currentRoundData.blueExits} / 2 {currentRoundData.blueExits >= 2 ? '(Round Loss!)' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span>Warnings:</span>
                <span className="font-mono-tabular font-bold text-amber-400">
                  {currentRoundData.blueWarnings}
                </span>
              </div>
            </div>

            {/* Official Scoring Action Buttons */}
            {canScore && !bout.resultLocked && (
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                  Sanda Strike Scoring
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleScore('blue', 'punch', 1, 'Straight / Hook punch to body (+1)')}
                    className="p-2.5 bg-slate-900 hover:bg-blue-900/30 border border-slate-800 hover:border-blue-700/60 rounded-xl text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white flex justify-between">
                      <span>Fist / Punch</span>
                      <span className="text-blue-400 font-mono-tabular">+1 pt</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Torso or head punch</div>
                  </button>

                  <button
                    onClick={() => handleScore('blue', 'kick_thigh', 1, 'Low kick to thigh (+1)')}
                    className="p-2.5 bg-slate-900 hover:bg-blue-900/30 border border-slate-800 hover:border-blue-700/60 rounded-xl text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white flex justify-between">
                      <span>Kick to Thigh</span>
                      <span className="text-blue-400 font-mono-tabular">+1 pt</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Valid low kick</div>
                  </button>

                  <button
                    onClick={() => handleScore('blue', 'kick_body_head', 2, 'High kick to head/torso (+2)')}
                    className="p-2.5 bg-slate-900 hover:bg-blue-900/30 border border-slate-800 hover:border-blue-700/60 rounded-xl text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white flex justify-between">
                      <span>Kick to Body/Head</span>
                      <span className="text-blue-400 font-mono-tabular">+2 pts</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Roundhouse or side kick</div>
                  </button>

                  <button
                    onClick={() => handleScore('blue', 'sweep_takedown', 2, 'Sweep takedown standing (+2)')}
                    className="p-2.5 bg-slate-900 hover:bg-blue-900/30 border border-slate-800 hover:border-blue-700/60 rounded-xl text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white flex justify-between">
                      <span>Clean Takedown</span>
                      <span className="text-blue-400 font-mono-tabular">+2 pts</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Fighter remains standing</div>
                  </button>
                </div>

                {/* Penalties & Exits */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleExit('blue')}
                    className="p-2 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800 rounded-xl text-xs font-medium text-blue-200 transition-colors"
                  >
                    Platform Exit (+2 to Red)
                  </button>
                  <button
                    onClick={() => handleWarning('blue')}
                    className="p-2 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800 rounded-xl text-xs font-medium text-amber-200 transition-colors"
                  >
                    Warning (-1 pt deduction)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Event Log Stream */}
        <div className="border-t border-slate-800 pt-4">
          <div className="text-xs font-semibold text-slate-400 mb-2">Live Bout Scoring Events Log:</div>
          <div className="max-h-28 overflow-y-auto space-y-1 p-2 bg-slate-950 rounded-xl border border-slate-800/80">
            {bout.scoreEvents.length > 0 ? (
              bout.scoreEvents.slice().reverse().map(ev => (
                <div key={ev.id} className="text-[11px] flex items-center justify-between text-slate-300 py-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${ev.corner === 'red' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                    <span className="font-mono-tabular text-slate-500">R{ev.roundNumber}</span>
                    <span>{ev.description}</span>
                  </div>
                  <span className={`font-mono-tabular font-semibold ${ev.points > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {ev.points > 0 ? `+${ev.points}` : ev.points}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-slate-600 text-center py-2">
                No scoring strikes recorded yet for this bout.
              </div>
            )}
          </div>
        </div>

        {/* Finalize & Submit Result Form */}
        {canScore && !bout.resultLocked && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Declare Winner & Finalize Bout</h3>
                <p className="text-[11px] text-slate-400">
                  Submitting will lock the result and advance the winner automatically to the next bracket position.
                </p>
              </div>
              <Award className="w-5 h-5 text-amber-400" />
            </div>

            {submitError && (
              <div className="p-3 bg-red-950 border border-red-800 rounded-lg text-xs text-red-300">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitResult} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Select Winner Corner */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Bout Winner Corner *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setWinnerCorner('red');
                        setCustomReason(`Winner by Points: ${bout.redPlayerName}`);
                      }}
                      className={`p-2.5 rounded-lg border font-bold text-xs transition-all ${
                        winnerCorner === 'red'
                          ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-900/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Red Corner
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWinnerCorner('blue');
                        setCustomReason(`Winner by Points: ${bout.bluePlayerName}`);
                      }}
                      className={`p-2.5 rounded-lg border font-bold text-xs transition-all ${
                        winnerCorner === 'blue'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Blue Corner
                    </button>
                  </div>
                </div>

                {/* Decision Method */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Result Status / Decision *</label>
                  <select
                    value={resultStatus}
                    onChange={e => {
                      const val = e.target.value as BoutStatus;
                      setResultStatus(val);
                      if (val === 'winner_points') setCustomReason('Winner by Points');
                      else if (val === 'winner_rsc') setCustomReason('Referee Stops Contest (RSC)');
                      else if (val === 'winner_withdrawal') setCustomReason('Winner by Withdrawal (Injury)');
                      else if (val === 'winner_disqualification') setCustomReason('Winner by Disqualification (DQ)');
                      else if (val === 'walkover') setCustomReason('Walkover (Opponent absent)');
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="winner_points">Winner by Points</option>
                    <option value="winner_rsc">Winner by RSC (Referee Stops Contest)</option>
                    <option value="winner_withdrawal">Winner by Withdrawal (Injury)</option>
                    <option value="winner_disqualification">Winner by Disqualification</option>
                    <option value="walkover">Walkover</option>
                  </select>
                </div>

                {/* Result Description */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Official Decision Note</label>
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-colors flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Submit Official Result & Advance Winner
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Authorized Reopen Modal */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-2">Reopen Bout Result?</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              This will unlock the bout for score editing and reset the advanced winner from subsequent bracket fixtures. An audit log entry will be permanently written.
            </p>

            <form onSubmit={handleReopen} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">
                  Reason for Result Reopening / Correction *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReasonText}
                  onChange={e => setReopenReasonText(e.target.value)}
                  placeholder="e.g. Scorer table miscalculation, video review appeal approved..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
                >
                  Confirm Reopen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
