import React from 'react';
import { useTournament } from '../../context/TournamentContext';
import {
  Users,
  GitFork,
  Swords,
  Trophy,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  Shield,
  Activity,
  Layers,
  ChevronRight,
  Flame,
  AlertTriangle,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { calculateAge, findBoutInRounds } from '../../utils/tournamentHelpers';

export const OverviewDashboard: React.FC = () => {
  const {
    event,
    players,
    categories,
    brackets,
    role,
    setActiveTab,
    setActiveBoutForScoring,
    auditLogs,
  } = useTournament();

  // Compute tournament statistics
  let totalBouts = 0;
  let liveBoutsCount = 0;
  let completedBoutsCount = 0;
  let scheduledBoutsCount = 0;
  const allBoutsList: any[] = [];

  brackets.forEach(bracket => {
    const category = categories.find(c => c.id === bracket.categoryId);
    bracket.rounds.forEach(r => {
      r.bouts.forEach(b => {
        totalBouts++;
        if (b.status === 'live') liveBoutsCount++;
        else if (b.status.startsWith('winner_') || b.status === 'completed' || b.status === 'walkover') completedBoutsCount++;
        else scheduledBoutsCount++;
        
        allBoutsList.push({
          ...b,
          categoryName: category?.name || 'Sanda Division',
          bracketId: bracket.id,
        });
      });
    });
  });

  const activeLiveBouts = allBoutsList.filter(b => b.status === 'live');
  const nextScheduledBouts = allBoutsList.filter(b => b.status === 'ready' || b.status === 'scheduled').slice(0, 5);
  const recentCompletedBouts = allBoutsList.filter(b => b.status.startsWith('winner_') || b.status === 'completed').slice(0, 4);

  const startScoring = (bout: any) => {
    setActiveBoutForScoring(bout);
    setActiveTab('live-scoring');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Event Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-red-950/40 border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Tournament In Progress · {event.competitionType} Rules</span>
            </div>
            <h1 className="font-cinzel text-2xl lg:text-3xl font-bold text-white tracking-wide">
              {event.name || 'Wushu Championship'}
            </h1>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {event.venue ? `${event.venue}${event.city ? `, ${event.city}` : ''}` : 'Venue to be configured'}
              </span>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {event.startDate && event.endDate ? `${event.startDate} to ${event.endDate}` : 'Dates to be set'}
              </span>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <span className="text-amber-300/90 font-mono-tabular">
                Age Ref Date: {event.tournamentReferenceDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {role !== 'general_view' && (
              <button
                onClick={() => setActiveTab('players')}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Register Fighter
              </button>
            )}
            <button
              onClick={() => setActiveTab('public')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2"
            >
              Public Arena View
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4">
          <div className="text-[11px] font-medium text-slate-400">Registered Players</div>
          <div className="text-2xl font-bold text-white font-mono-tabular mt-1">{players.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Manual entries verified</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4">
          <div className="text-[11px] font-medium text-slate-400">Active Categories</div>
          <div className="text-2xl font-bold text-amber-400 font-mono-tabular mt-1">{categories.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">{categories.filter(c => c.isLocked).length} locked for bouts</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4">
          <div className="text-[11px] font-medium text-slate-400">Knockout Brackets</div>
          <div className="text-2xl font-bold text-white font-mono-tabular mt-1">{brackets.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Single elimination trees</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4">
          <div className="text-[11px] font-medium text-red-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Live On Leitai
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono-tabular mt-1">{liveBoutsCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Active platform matches</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4">
          <div className="text-[11px] font-medium text-slate-400">Scheduled / Queue</div>
          <div className="text-2xl font-bold text-white font-mono-tabular mt-1">{scheduledBoutsCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Awaiting ring call</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4">
          <div className="text-[11px] font-medium text-emerald-400">Finalized Bouts</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono-tabular mt-1">{completedBoutsCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Winners advanced</div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Bout Spotlight & Upcoming Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Leitai Platform Spotlight */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Leitai Match
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-400">Ring 1 (Platform A)</span>
            </div>

            {activeLiveBouts.length > 0 ? (
              activeLiveBouts.map(bout => {
                const round = bout.rounds[bout.currentRound - 1] || bout.rounds[0];
                return (
                  <div key={bout.id} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
                    <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800 mb-4">
                      <div>
                        <span className="font-bold text-amber-400 font-mono-tabular">{bout.boutNumber}</span>
                        <span aria-hidden="true" className="mx-2 text-slate-700">·</span>
                        <span>{bout.categoryName}</span>
                        <span aria-hidden="true" className="mx-2 text-slate-700">·</span>
                        <span className="text-slate-300 font-semibold">{bout.roundName}</span>
                      </div>
                      <span className="font-mono-tabular text-red-400 font-semibold">
                        Round {bout.currentRound} of 3
                      </span>
                    </div>

                    <div className="grid grid-cols-11 items-center gap-2 py-2">
                      {/* Red Corner */}
                      <div className="col-span-5 bg-red-950/30 border border-red-900/40 rounded-xl p-3 text-left">
                        <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Red Corner (Hong)</div>
                        <div className="text-base font-bold text-white mt-0.5 truncate">{bout.redPlayerName || 'TBD'}</div>
                        <div className="text-xs text-slate-400 truncate">{bout.redClub || 'Club'}</div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-red-400 font-mono-tabular">
                            {round?.redPoints || 0}
                          </span>
                          <span className="text-[11px] text-slate-400">pts this round</span>
                        </div>
                      </div>

                      {/* VS Center */}
                      <div className="col-span-1 text-center font-cinzel text-xs font-bold text-slate-500">
                        VS
                      </div>

                      {/* Blue Corner */}
                      <div className="col-span-5 bg-blue-950/30 border border-blue-900/40 rounded-xl p-3 text-right">
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Black/Blue Corner (Hei)</div>
                        <div className="text-base font-bold text-white mt-0.5 truncate">{bout.bluePlayerName || 'TBD'}</div>
                        <div className="text-xs text-slate-400 truncate">{bout.blueClub || 'Club'}</div>
                        <div className="mt-3 flex items-baseline justify-end gap-2">
                          <span className="text-[11px] text-slate-400">pts this round</span>
                          <span className="text-3xl font-extrabold text-blue-400 font-mono-tabular">
                            {round?.bluePoints || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>Platform Exits:</span>
                        <span className="text-red-400 font-mono-tabular">R: {round?.redExits || 0}</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-blue-400 font-mono-tabular">B: {round?.blueExits || 0}</span>
                      </div>
                      {role !== 'general_view' && (
                        <button
                          onClick={() => startScoring(bout)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-red-950"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Open Scoring Console
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
                <Swords className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No bout is currently marked LIVE on Leitai 1.</p>
                {nextScheduledBouts.length > 0 && role !== 'general_view' && (
                  <button
                    onClick={() => startScoring(nextScheduledBouts[0])}
                    className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    Start Next Bout ({nextScheduledBouts[0].boutNumber})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Upcoming Fights Queue */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Upcoming Fight Queue
              </h2>
              <button
                onClick={() => setActiveTab('brackets')}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium"
              >
                View Full Bracket Trees →
              </button>
            </div>

            <div className="space-y-2.5">
              {nextScheduledBouts.map((bout, idx) => (
                <div
                  key={bout.id}
                  className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-mono-tabular text-xs font-bold text-slate-300">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-400 font-mono-tabular">{bout.boutNumber}</span>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <span className="text-xs text-slate-200">{bout.categoryName}</span>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <span className="text-xs text-slate-400">{bout.roundName}</span>
                      </div>
                      <div className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                        <span className="font-semibold text-red-400 truncate max-w-[140px]">{bout.redPlayerName || 'TBD'}</span>
                        <span className="text-slate-600 text-[10px]">vs</span>
                        <span className="font-semibold text-blue-400 truncate max-w-[140px]">{bout.bluePlayerName || 'TBD'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-slate-400 font-mono-tabular hidden sm:inline">
                      {bout.ring}
                    </span>
                    {role !== 'general_view' && (
                      <button
                        onClick={() => startScoring(bout)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                      >
                        Launch
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Recent Results & Quick Tournament Actions */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
              Tournament Controls
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('players')}
                className="w-full text-left p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                    Fighter Database & Registration
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Manual form, age verification, Aadhar ID
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
              </button>

              <button
                onClick={() => setActiveTab('categories')}
                className="w-full text-left p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                    Category Builder & Filter
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Group by age, weight, gender, & club
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
              </button>

              <button
                onClick={() => setActiveTab('brackets')}
                className="w-full text-left p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                    Knockout Fixture Generator
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Single-elimination tree with auto BYE
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
              </button>

              <button
                onClick={() => setActiveTab('results')}
                className="w-full text-left p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                    Podium & Medal Table
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Gold, Silver, Joint Bronze & Club ranks
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
              </button>
            </div>
          </div>

          {/* Recent Completed Bouts */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Completed Results
              </h2>
            </div>

            <div className="space-y-2.5">
              {recentCompletedBouts.length > 0 ? (
                recentCompletedBouts.map(b => (
                  <div key={b.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-bold text-amber-400 font-mono-tabular">{b.boutNumber}</span>
                      <span>{b.roundName}</span>
                    </div>
                    <div className="text-slate-200 font-semibold">
                      Winner: <span className="text-emerald-400 font-bold">{b.winnerCorner === 'red' ? b.redPlayerName : b.bluePlayerName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Decision: {b.winningReason || 'Winner by Points'}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No bouts completed yet.</p>
              )}
            </div>
          </div>

          {/* Recent Audit Feed */}
          {role !== 'general_view' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Audit Activity Log
                </h2>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2 text-[11px]">
                {auditLogs.slice(0, 3).map(log => (
                  <div key={log.id} className="pb-2 border-b border-slate-800/80 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-slate-300 font-medium">
                      <span className="text-amber-400 font-semibold">{log.action}</span>
                      <span className="text-slate-400 text-[10px] font-mono-tabular">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-400 truncate mt-0.5">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
