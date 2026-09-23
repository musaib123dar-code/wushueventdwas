import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Bracket, Bout, Category } from '../../types/tournament';
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
} from 'lucide-react';

export const BracketViewer: React.FC = () => {
  const {
    brackets,
    categories,
    regenerateBracketForCategory,
    reopenBoutResult,
    setActiveBoutForScoring,
    setActiveTab,
    role,
  } = useTournament();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || ''
  );
  const [reopenBoutModal, setReopenBoutModal] = useState<Bout | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [regenReason, setRegenReason] = useState('');

  const currentBracket = brackets.find(b => b.categoryId === selectedCategoryId);
  const currentCategory = categories.find(c => c.id === selectedCategoryId);

  const canEdit = role === 'super_admin' || role === 'admin';
  const canScore = role === 'super_admin' || role === 'admin' || role === 'official';

  const handleLaunchScoring = (bout: Bout) => {
    setActiveBoutForScoring(bout);
    setActiveTab('live-scoring');
  };

  const handleConfirmReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenBoutModal || !reopenReason.trim()) return;
    const res = reopenBoutResult(reopenBoutModal.id, reopenReason.trim());
    if (!res.success) {
      alert(res.error);
    }
    setReopenBoutModal(null);
    setReopenReason('');
  };

  const handleConfirmRegen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId || !regenReason.trim()) return;
    const res = regenerateBracketForCategory(selectedCategoryId, regenReason.trim());
    if (!res.success) {
      alert(res.error);
    }
    setRegenModalOpen(false);
    setRegenReason('');
  };

  return (
    <div className="space-y-6 pb-16">
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
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {cat.name.split('·')[0]} {cat.name.split('·')[1]?.slice(0, 12)}
                  {!hasBracket && <span className="ml-1 opacity-50">(Unset)</span>}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          {canEdit && currentBracket && (
            <button
              onClick={() => setRegenModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5"
              title="Regenerate bracket with randomized seeds (Requires Audit Trail Reason)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Regenerate Tree</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print Tree</span>
          </button>
        </div>
      </div>

      {/* Main Bracket Canvas */}
      {currentBracket ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto print-card">
          {/* Tournament Tree Top Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-800/80 gap-3">
            <div>
              <div className="text-xs text-amber-400 font-bold uppercase tracking-wider font-cinzel">
                {currentCategory?.name}
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
                      const isCompleted = bout.status.startsWith('winner_') || bout.status === 'completed';
                      const isLive = bout.status === 'live';
                      const isReady = bout.status === 'ready';

                      const redWon = isCompleted && bout.winnerCorner === 'red';
                      const blueWon = isCompleted && bout.winnerCorner === 'blue';

                      return (
                        <div
                          key={bout.id}
                          className={`relative rounded-xl border transition-all text-xs ${
                            isLive
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
                            <div className="flex items-center gap-2 truncate pr-2">
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
                            {redWon && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
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
                            <div className="flex items-center gap-2 truncate pr-2">
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
                            {blueWon && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
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
                              {/* Open live scoring */}
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
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl transition-colors inline-flex items-center gap-2"
          >
            Go to Category Filtering →
          </button>
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
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg transition-colors"
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
