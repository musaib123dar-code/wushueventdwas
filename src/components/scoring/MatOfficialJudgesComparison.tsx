import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Bout } from '../../types/tournament';
import {
  ShieldCheck,
  Award,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface MatOfficialJudgesComparisonProps {
  bout: Bout;
  categoryName?: string;
  activeRoundNumber: number;
  onAdoptConsensus?: (corner: 'red' | 'blue', reason: string) => void;
}

export const MatOfficialJudgesComparison: React.FC<MatOfficialJudgesComparisonProps> = ({
  bout,
  categoryName = 'Sanda Division',
  activeRoundNumber,
  onAdoptConsensus,
}) => {
  const { getSubmittedJudgeScoresForPlatform, role, currentUser } = useTournament();

  const [selectedRound, setSelectedRound] = useState<number>(activeRoundNumber || 1);

  // Sync to activeRoundNumber when changed if user hasn't explicitly clicked away
  React.useEffect(() => {
    if (activeRoundNumber) {
      setSelectedRound(activeRoundNumber);
    }
  }, [activeRoundNumber]);

  // Query submitted scores for this platform
  const allSubmittedScores = getSubmittedJudgeScoresForPlatform(bout.id);

  // Filter to currently selected round
  const roundScores = allSubmittedScores.filter(s => s.roundNumber === selectedRound);

  // Calculate round consensus
  let redVotes = 0;
  let blueVotes = 0;
  let drawVotes = 0;

  roundScores.forEach(s => {
    const verdict = s.winner || (s.redPoints > s.bluePoints ? 'red' : s.bluePoints > s.redPoints ? 'blue' : 'draw');
    if (verdict === 'red') redVotes++;
    else if (verdict === 'blue') blueVotes++;
    else drawVotes++;
  });

  const totalJudges = roundScores.length;
  let majorityWinner: 'red' | 'blue' | 'draw' | null = null;
  let consensusDescription = 'Awaiting submissions';

  if (totalJudges > 0) {
    if (redVotes > blueVotes && redVotes > drawVotes) {
      majorityWinner = 'red';
      consensusDescription = `${redVotes} of ${totalJudges} Judges favor RED CORNER (${bout.redPlayerName})`;
    } else if (blueVotes > redVotes && blueVotes > drawVotes) {
      majorityWinner = 'blue';
      consensusDescription = `${blueVotes} of ${totalJudges} Judges favor BLUE CORNER (${bout.bluePlayerName})`;
    } else {
      majorityWinner = 'draw';
      consensusDescription = `Split Verdict (${redVotes} Red · ${blueVotes} Blue · ${drawVotes} Draw)`;
    }
  }

  // Count submissions across all 3 rounds for round tab indicators
  const round1Count = allSubmittedScores.filter(s => s.roundNumber === 1).length;
  const round2Count = allSubmittedScores.filter(s => s.roundNumber === 2).length;
  const round3Count = allSubmittedScores.filter(s => s.roundNumber === 3).length;

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
      {/* Header bar */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Platform Side Judges Live Consensus
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                {bout.ring}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Certified live scorecards submitted exclusively by sideline scorers on this platform
            </p>
          </div>
        </div>

        {/* Round Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
          {[1, 2, 3].map(rnd => {
            const count = rnd === 1 ? round1Count : rnd === 2 ? round2Count : round3Count;
            const isSelected = selectedRound === rnd;
            return (
              <button
                key={rnd}
                type="button"
                onClick={() => setSelectedRound(rnd)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>Round {rnd}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected
                      ? 'bg-slate-950 text-amber-300'
                      : count > 0
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Empty state: No submissions for this round yet */}
        {totalJudges === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 border border-dashed border-slate-800 rounded-xl space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-slate-500 mx-auto flex items-center justify-center">
              <Clock className="w-5 h-5 animate-pulse text-amber-500" />
            </div>
            <div className="text-xs font-semibold text-slate-300">
              Awaiting Side Judge Submissions for Round {selectedRound}
            </div>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
              When side judges stationed at <strong>{bout.ring}</strong> finalize and submit their cards for Round {selectedRound}, their certified scores and consensus decision will instantly appear here for your review.
            </p>
          </div>
        ) : (
          <>
            {/* Majority Consensus Banner */}
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                majorityWinner === 'red'
                  ? 'bg-red-950/40 border-red-800/70 text-red-200'
                  : majorityWinner === 'blue'
                  ? 'bg-blue-950/40 border-blue-800/70 text-blue-200'
                  : 'bg-amber-950/40 border-amber-800/70 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                    majorityWinner === 'red'
                      ? 'bg-red-600 text-white shadow-md shadow-red-900/50'
                      : majorityWinner === 'blue'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                      : 'bg-amber-500 text-slate-950 font-bold'
                  }`}
                >
                  {majorityWinner === 'red' ? 'RED' : majorityWinner === 'blue' ? 'BLUE' : 'TIE'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                      Round {selectedRound} Judges Consensus
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-black/40 border border-white/10">
                      {totalJudges} Judges Certified
                    </span>
                  </div>
                  <div className="font-bold text-sm text-white mt-0.5">
                    {consensusDescription}
                  </div>
                </div>
              </div>

              {/* Adopt Consensus quick action for Mat Official */}
              {onAdoptConsensus && majorityWinner && majorityWinner !== 'draw' && (
                <button
                  type="button"
                  onClick={() =>
                    onAdoptConsensus(
                      majorityWinner,
                      `Winner verified by Platform Judges Consensus (${majorityWinner === 'red' ? redVotes : blueVotes} of ${totalJudges} Judges)`
                    )
                  }
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md ${
                    majorityWinner === 'red'
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
                  }`}
                >
                  <span>Adopt Consensus ({majorityWinner.toUpperCase()})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Comparison Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {roundScores.map((score, idx) => {
                const verdict =
                  score.winner ||
                  (score.redPoints > score.bluePoints ? 'red' : score.bluePoints > score.redPoints ? 'blue' : 'draw');
                const isRed = verdict === 'red';
                const isBlue = verdict === 'blue';

                return (
                  <div
                    key={score.id}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3 relative hover:border-slate-700 transition-colors"
                  >
                    {/* Judge header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono text-[11px] font-bold flex items-center justify-center">
                          J{idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-xs text-white truncate max-w-[130px]" title={score.judgeName}>
                            {score.judgeName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {score.submittedAt
                              ? new Date(score.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                              : 'Submitted'}
                          </div>
                        </div>
                      </div>

                      {/* Corner decision badge */}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border flex items-center gap-1 ${
                          isRed
                            ? 'bg-red-950/80 border-red-700 text-red-300 shadow-xs'
                            : isBlue
                            ? 'bg-blue-950/80 border-blue-700 text-blue-300 shadow-xs'
                            : 'bg-amber-950/80 border-amber-700 text-amber-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{verdict.toUpperCase()}</span>
                      </span>
                    </div>

                    {/* Score comparison row */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900 text-xs">
                      {/* Red Corner */}
                      <div
                        className={`p-2 rounded-lg border text-center ${
                          isRed
                            ? 'bg-red-950/30 border-red-800/60 text-red-200'
                            : 'bg-slate-900/50 border-slate-800/60 text-slate-400'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                          Red Fighter
                        </div>
                        <div className="text-xl font-black font-mono-tabular mt-0.5 text-white">
                          {score.redPoints}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1 flex justify-center gap-2">
                          <span>Exits: <strong className="text-slate-300">{score.redExits || 0}</strong></span>
                          <span>Warn: <strong className="text-slate-300">{score.redWarnings || 0}</strong></span>
                        </div>
                      </div>

                      {/* Blue Corner */}
                      <div
                        className={`p-2 rounded-lg border text-center ${
                          isBlue
                            ? 'bg-blue-950/30 border-blue-800/60 text-blue-200'
                            : 'bg-slate-900/50 border-slate-800/60 text-slate-400'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                          Blue Fighter
                        </div>
                        <div className="text-xl font-black font-mono-tabular mt-0.5 text-white">
                          {score.bluePoints}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1 flex justify-center gap-2">
                          <span>Exits: <strong className="text-slate-300">{score.blueExits || 0}</strong></span>
                          <span>Warn: <strong className="text-slate-300">{score.blueWarnings || 0}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Security Isolation Notice */}
        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Platform Isolation Active: These cards are certified to <strong>{bout.ring}</strong> and hidden from other platforms and public view.
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            Official: {currentUser.name}
          </span>
        </div>
      </div>
    </div>
  );
};
