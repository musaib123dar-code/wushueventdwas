import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Bout, SidelineJudgeScore } from '../../types/tournament';
import {
  ShieldCheck,
  X,
  Users,
  Award,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface AdminJudgeConsensusModalProps {
  bout: Bout;
  categoryName?: string;
  onClose: () => void;
}

export const AdminJudgeConsensusModal: React.FC<AdminJudgeConsensusModalProps> = ({
  bout,
  categoryName = 'Sanda Division',
  onClose,
}) => {
  const { getAllJudgeScoresForAdmin, users, role } = useTournament();

  const [selectedRound, setSelectedRound] = useState<number>(1);

  // Check role authorization
  if (role !== 'super_admin' && role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-rose-800 rounded-2xl max-w-md w-full p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">Access Restricted</h3>
          <p className="text-xs text-slate-400">
            Judge scoring consensus records are restricted to Chief Referees, Jury of Appeal, and Tournament Administrators.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Retrieve all sideline judge scores for this bout
  const allBoutScores = getAllJudgeScoresForAdmin(bout.id);

  // Filter to the selected round
  const roundScores = allBoutScores.filter(s => s.roundNumber === selectedRound);

  // Calculate Consensus for selected round
  let redVotes = 0;
  let blueVotes = 0;
  let drawVotes = 0;

  roundScores.forEach(s => {
    if (s.winner === 'red' || (!s.winner && s.redPoints > s.bluePoints)) {
      redVotes++;
    } else if (s.winner === 'blue' || (!s.winner && s.bluePoints > s.redPoints)) {
      blueVotes++;
    } else {
      drawVotes++;
    }
  });

  const totalJudges = roundScores.length;
  let consensusText = 'No Judge Cards Submitted';
  let consensusColor = 'text-slate-400 bg-slate-900';

  if (totalJudges > 0) {
    if (redVotes > blueVotes && redVotes > drawVotes) {
      consensusText = `RED Decision (${redVotes} of ${totalJudges} Judges)`;
      consensusColor = 'text-red-400 bg-red-950/80 border-red-800';
    } else if (blueVotes > redVotes && blueVotes > drawVotes) {
      consensusText = `BLUE Decision (${blueVotes} of ${totalJudges} Judges)`;
      consensusColor = 'text-blue-400 bg-blue-950/80 border-blue-800';
    } else {
      consensusText = `Split / Equal (${redVotes} Red - ${blueVotes} Blue - ${drawVotes} Draw)`;
      consensusColor = 'text-amber-400 bg-amber-950/80 border-amber-800';
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/90 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-tabular font-bold text-amber-400 text-sm">
                  {bout.boutNumber}
                </span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span className="font-bold text-white text-sm">{categoryName}</span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span className="text-slate-300 text-xs font-medium">{bout.roundName}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Official Sideline Judge Scorecards & Consensus Review · Assigned Platform: <strong>{bout.ring}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Competitor Match Banner */}
        <div className="px-5 py-3 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono-tabular">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="font-bold text-white">{bout.redPlayerName || 'Red Athlete'}</span>
            <span className="text-slate-500">({bout.redClub || 'Club'})</span>
          </div>
          <span className="text-slate-500 font-bold">VS</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">({bout.blueClub || 'Club'})</span>
            <span className="font-bold text-white">{bout.bluePlayerName || 'Blue Athlete'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Round Selector & Consensus Highlight */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
            {/* Round Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Select Round:</span>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {[1, 2, 3].map(rNum => {
                  const rCount = allBoutScores.filter(s => s.roundNumber === rNum).length;
                  const isCurrent = selectedRound === rNum;
                  return (
                    <button
                      key={rNum}
                      onClick={() => setSelectedRound(rNum)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Round {rNum} ({rCount})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Consensus Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Round Consensus:</span>
              <span
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono-tabular ${consensusColor}`}
              >
                {consensusText}
              </span>
            </div>
          </div>

          {/* Judges Side-by-Side Comparison Cards */}
          {roundScores.length === 0 ? (
            <div className="p-10 text-center bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-white">No Judge Cards for Round {selectedRound}</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Authorized sideline judges assigned to {bout.ring} have not yet recorded their scorecards for this round.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roundScores.map((score, idx) => {
                const winnerCorner = score.winner || (score.redPoints > score.bluePoints ? 'red' : score.bluePoints > score.redPoints ? 'blue' : 'draw');
                const isRed = winnerCorner === 'red';
                const isBlue = winnerCorner === 'blue';

                return (
                  <div
                    key={score.id || idx}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg"
                  >
                    {/* Judge Header */}
                    <div className="flex items-start justify-between border-b border-slate-800/80 pb-2.5">
                      <div>
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                          Judge #{idx + 1}
                        </div>
                        <div className="text-sm font-bold text-white">{score.judgeName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Arena: {score.arena}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          score.isSubmitted
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            : 'bg-amber-950/80 text-amber-300 border-amber-800'
                        }`}
                      >
                        {score.isSubmitted ? 'SUBMITTED' : 'DRAFT'}
                      </span>
                    </div>

                    {/* Scores Comparison */}
                    <div className="grid grid-cols-2 gap-2 text-center py-1">
                      <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-900/40">
                        <div className="text-[10px] font-bold text-red-400 uppercase">RED (HONG)</div>
                        <div className="text-3xl font-black text-red-400 font-mono-tabular mt-0.5">
                          {score.redPoints}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Exits: {score.redExits} · Warn: {score.redWarnings}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-900/40">
                        <div className="text-[10px] font-bold text-blue-400 uppercase">BLUE (HEI)</div>
                        <div className="text-3xl font-black text-blue-400 font-mono-tabular mt-0.5">
                          {score.bluePoints}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Exits: {score.blueExits} · Warn: {score.blueWarnings}
                        </div>
                      </div>
                    </div>

                    {/* Judge Decision */}
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs">
                      <span className="text-slate-400">Awarded Round Decision: </span>
                      <strong
                        className={`font-mono-tabular uppercase ${
                          isRed ? 'text-red-400' : isBlue ? 'text-blue-400' : 'text-slate-200'
                        }`}
                      >
                        {winnerCorner.toUpperCase()}
                      </strong>
                    </div>

                    {/* Timestamp */}
                    <div className="text-[10px] text-slate-500 text-right">
                      {score.submittedAt
                        ? `Submitted ${new Date(score.submittedAt).toLocaleTimeString()}`
                        : `Updated ${new Date(score.updatedAt).toLocaleTimeString()}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Bout 3-Round Matrix Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Full Bout 3-Round Summary Matrix</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-mono">
                    <th className="py-2 px-3">Judge Name</th>
                    <th className="py-2 px-3">Arena</th>
                    <th className="py-2 px-3 text-center">Round 1 (R-B)</th>
                    <th className="py-2 px-3 text-center">Round 2 (R-B)</th>
                    <th className="py-2 px-3 text-center">Round 3 (R-B)</th>
                    <th className="py-2 px-3 text-center">Match Preference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono-tabular">
                  {/* Collect unique judges for this bout */}
                  {Array.from(new Set(allBoutScores.map(s => s.judgeId))).map(jId => {
                    const jScores = allBoutScores.filter(s => s.judgeId === jId);
                    const jName = jScores[0]?.judgeName || 'Judge';
                    const jArena = jScores[0]?.arena || bout.ring;

                    const r1 = jScores.find(s => s.roundNumber === 1);
                    const r2 = jScores.find(s => s.roundNumber === 2);
                    const r3 = jScores.find(s => s.roundNumber === 3);

                    let redRounds = 0;
                    let blueRounds = 0;
                    jScores.forEach(s => {
                      if (s.winner === 'red' || (!s.winner && s.redPoints > s.bluePoints)) redRounds++;
                      else if (s.winner === 'blue' || (!s.winner && s.bluePoints > s.redPoints)) blueRounds++;
                    });

                    return (
                      <tr key={jId} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 font-sans font-semibold text-white">{jName}</td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">{jArena}</td>
                        <td className="py-2.5 px-3 text-center">
                          {r1 ? (
                            <span className={r1.redPoints > r1.bluePoints ? 'text-red-400 font-bold' : r1.bluePoints > r1.redPoints ? 'text-blue-400 font-bold' : 'text-slate-300'}>
                              {r1.redPoints} - {r1.bluePoints}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {r2 ? (
                            <span className={r2.redPoints > r2.bluePoints ? 'text-red-400 font-bold' : r2.bluePoints > r2.redPoints ? 'text-blue-400 font-bold' : 'text-slate-300'}>
                              {r2.redPoints} - {r2.bluePoints}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {r3 ? (
                            <span className={r3.redPoints > r3.bluePoints ? 'text-red-400 font-bold' : r3.bluePoints > r3.redPoints ? 'text-blue-400 font-bold' : 'text-slate-300'}>
                              {r3.redPoints} - {r3.bluePoints}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          {redRounds > blueRounds ? (
                            <span className="text-red-400">RED ({redRounds}R)</span>
                          ) : blueRounds > redRounds ? (
                            <span className="text-blue-400">BLUE ({blueRounds}R)</span>
                          ) : (
                            <span className="text-slate-400">TIE ({redRounds}-{blueRounds})</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Protected Official Document · Chief Referee & Jury of Appeal
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
