import React, { useState, useMemo } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { calculateAge } from '../../utils/tournamentHelpers';
import {
  Tv,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  Trophy,
  Search,
  Filter,
  Swords,
  GitFork,
  Users,
  Flame,
  ChevronRight,
  Lock,
} from 'lucide-react';

export const PublicTournamentView: React.FC = () => {
  const { event, brackets, categories, players, ageCategories, isLoggedIn, setLoginModalOpen } = useTournament();

  const [activeSection, setActiveSection] = useState<'live_queue' | 'brackets' | 'medals' | 'players'>('live_queue');
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || '');

  // Extract all bouts
  const allBouts = useMemo(() => {
    const list: any[] = [];
    brackets.forEach(b => {
      const cat = categories.find(c => c.id === b.categoryId);
      b.rounds.forEach(r => {
        r.bouts.forEach(bout => {
          list.push({
            ...bout,
            categoryName: cat?.name || 'Category',
            bracketId: b.id,
          });
        });
      });
    });
    return list;
  }, [brackets, categories]);

  const liveBouts = allBouts.filter(b => b.status === 'live');
  const upcomingBouts = allBouts.filter(b => b.status === 'ready' || b.status === 'scheduled');
  const completedBouts = allBouts.filter(b => b.status.startsWith('winner_') || b.status === 'completed');

  // Filter players for public directory
  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const q = playerSearch.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.registrationNumber.toLowerCase().includes(q) ||
        p.clubSchool.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q);
      const matchesGender = selectedGender === 'all' || p.gender === selectedGender;
      return matchesSearch && matchesGender;
    });
  }, [players, playerSearch, selectedGender]);

  // Selected bracket for public viewing
  const currentPublicBracket = brackets.find(b => b.categoryId === selectedCatId);
  const currentPublicCategory = categories.find(c => c.id === selectedCatId);

  return (
    <div className="space-y-6 pb-16">
      {/* Public Hub Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-red-950/50 border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Official Public Spectator & Coach Arena</span>
            </div>
            <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white tracking-wide">
              {event.name || 'Wushu Championship'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {event.venue ? `${event.venue}${event.city ? `, ${event.city}` : ''}` : 'Official Arena Venue'}
              </span>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {event.startDate && event.endDate ? `${event.startDate} to ${event.endDate}` : 'Dates TBD'}
              </span>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <span className="text-amber-400/90 font-mono-tabular">
                Age Cutoff: {event.tournamentReferenceDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-medium">
              Public Spectator View
            </div>
            {!isLoggedIn && (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Staff / Official Sign In"
              >
                <Lock className="w-3 h-3" />
                <span>Staff Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Public Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveSection('live_queue')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeSection === 'live_queue'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            Live Arena & Bout Queue
          </button>
          <button
            onClick={() => setActiveSection('brackets')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeSection === 'brackets'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            Category Knockout Brackets
          </button>
          <button
            onClick={() => setActiveSection('medals')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeSection === 'medals'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Podium & Completed Results
          </button>
          <button
            onClick={() => setActiveSection('players')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeSection === 'players'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Athletes Directory
          </button>
        </div>
      </div>

      {/* SECTION 1: LIVE ARENA & UPCOMING BOUT QUEUE */}
      {activeSection === 'live_queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Live Platform Spotlight (Left 7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Current Live Bout on Leitai 1
                  </h2>
                </div>
                <span className="text-xs text-amber-400 font-medium">Platform A</span>
              </div>

              {liveBouts.length > 0 ? (
                liveBouts.map(b => {
                  const currentR = b.rounds[b.currentRound - 1] || b.rounds[0];
                  return (
                    <div key={b.id} className="space-y-4">
                      <div className="text-xs text-slate-400 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-amber-400 font-mono-tabular">{b.boutNumber}</span>
                          <span aria-hidden="true" className="mx-2 text-slate-700">·</span>
                          <span>{b.categoryName}</span>
                          <span aria-hidden="true" className="mx-2 text-slate-700">·</span>
                          <span className="text-slate-300 font-semibold">{b.roundName}</span>
                        </div>
                        <span className="text-red-400 font-mono-tabular font-bold">
                          Round {b.currentRound} of 3
                        </span>
                      </div>

                      {/* Corner Score Cards */}
                      <div className="grid grid-cols-11 items-center gap-2">
                        <div className="col-span-5 bg-red-950/40 border border-red-900/60 rounded-xl p-4 text-left">
                          <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                            Red (Hong)
                          </span>
                          <div className="text-lg font-bold text-white mt-1 truncate">{b.redPlayerName}</div>
                          <div className="text-xs text-slate-400 truncate">{b.redClub}</div>
                          <div className="text-4xl font-extrabold text-red-400 font-mono-tabular mt-3">
                            {currentR?.redPoints || 0}
                          </div>
                        </div>

                        <div className="col-span-1 text-center font-cinzel text-xs font-bold text-slate-600">
                          VS
                        </div>

                        <div className="col-span-5 bg-blue-950/40 border border-blue-900/60 rounded-xl p-4 text-right">
                          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                            Blue (Hei)
                          </span>
                          <div className="text-lg font-bold text-white mt-1 truncate">{b.bluePlayerName}</div>
                          <div className="text-xs text-slate-400 truncate">{b.blueClub}</div>
                          <div className="text-4xl font-extrabold text-blue-400 font-mono-tabular mt-3">
                            {currentR?.bluePoints || 0}
                          </div>
                        </div>
                      </div>

                      {/* Leitai Exit Counter */}
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <span>Platform Exits:</span>
                          <span className="text-red-400 font-mono-tabular font-semibold">Red: {currentR?.redExits || 0}</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-blue-400 font-mono-tabular font-semibold">Blue: {currentR?.blueExits || 0}</span>
                        </div>
                        <span className="text-slate-500 font-mono-tabular text-[11px]">{b.ring}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
                  <Swords className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Next match is being called to Leitai platform.</p>
                </div>
              )}
            </div>

            {/* Completed Recent Fights */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Completed Match Results
              </h2>
              <div className="space-y-2.5">
                {completedBouts.slice(0, 5).map(b => (
                  <div key={b.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400 font-mono-tabular">{b.boutNumber}</span>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <span className="text-slate-300 font-medium">{b.categoryName}</span>
                      </div>
                      <div className="text-slate-200 mt-1">
                        Winner: <span className="font-bold text-emerald-400">{b.winnerCorner === 'red' ? b.redPlayerName : b.bluePlayerName}</span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      <div className="text-slate-300 font-medium">{b.winningReason || 'Decision'}</div>
                      <div className="text-slate-500">{b.roundName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Fight Queue (Right 5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Upcoming Match Queue
                </h2>
                <span className="text-xs text-slate-400 font-mono-tabular">{upcomingBouts.length} bouts</span>
              </div>

              <div className="space-y-3">
                {upcomingBouts.slice(0, 8).map((bout, idx) => (
                  <div
                    key={bout.id}
                    className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono-tabular font-bold">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-amber-400 font-mono-tabular">{bout.boutNumber}</span>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <span className="text-slate-300">{bout.categoryName}</span>
                      </div>
                      <span className="text-slate-500 font-mono-tabular">{bout.scheduledTime}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="font-semibold text-red-400 truncate max-w-[130px]">
                        {bout.redPlayerName || 'TBD'}
                      </div>
                      <span className="text-slate-600 text-[10px] font-bold">VS</span>
                      <div className="font-semibold text-blue-400 truncate max-w-[130px] text-right">
                        {bout.bluePlayerName || 'TBD'}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-900">
                      <span>{bout.roundName}</span>
                      <span>{bout.ring}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: CATEGORY KNOCKOUT BRACKETS */}
      {activeSection === 'brackets' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  cat.id === selectedCatId
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {currentPublicBracket ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
              <div className="text-xs text-amber-400 font-cinzel font-bold mb-4">
                {currentPublicCategory?.name} · Knockout Bracket
              </div>

              <div className="flex items-stretch gap-8 min-w-[850px]">
                {currentPublicBracket.rounds.map(round => (
                  <div key={round.roundName} className="flex-1 flex flex-col">
                    <div className="text-center font-bold text-slate-300 text-xs pb-3 mb-3 border-b border-slate-800">
                      {round.roundName}
                    </div>
                    <div className="flex-1 flex flex-col justify-around gap-4">
                      {round.bouts.map(b => (
                        <div key={b.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono-tabular">
                            <span>{b.boutNumber}</span>
                            <span>{b.status}</span>
                          </div>
                          <div className={`flex items-center justify-between font-medium ${b.winnerCorner === 'red' ? 'text-amber-400 font-bold' : 'text-slate-200'}`}>
                            <span className="truncate">{b.redPlayerName || 'TBD'}</span>
                            {b.winnerCorner === 'red' && <Trophy className="w-3 h-3 text-amber-400 shrink-0" />}
                          </div>
                          <div className={`flex items-center justify-between font-medium ${b.winnerCorner === 'blue' ? 'text-amber-400 font-bold' : 'text-slate-200'}`}>
                            <span className="truncate">{b.bluePlayerName || 'TBD'}</span>
                            {b.winnerCorner === 'blue' && <Trophy className="w-3 h-3 text-amber-400 shrink-0" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No bracket generated yet for this category.
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: PODIUM & MEDAL TALLY */}
      {activeSection === 'medals' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Championship Podium Results
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Official medalists across completed divisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brackets.map(b => {
              const cat = categories.find(c => c.id === b.categoryId);
              const finalRound = b.rounds[b.rounds.length - 1];
              const finalBout = finalRound?.bouts[0];
              const isFinished = finalBout && finalBout.winnerId;

              const goldName = isFinished
                ? finalBout.winnerCorner === 'red'
                  ? finalBout.redPlayerName
                  : finalBout.bluePlayerName
                : null;
              const goldClub = isFinished
                ? finalBout.winnerCorner === 'red'
                  ? finalBout.redClub
                  : finalBout.blueClub
                : null;

              const silverName = isFinished
                ? finalBout.winnerCorner === 'red'
                  ? finalBout.bluePlayerName
                  : finalBout.redPlayerName
                : null;

              return (
                <div key={b.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">
                    {cat?.name}
                  </div>

                  {isFinished ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <span className="text-base">🥇</span>
                        <div>
                          <div className="font-bold text-amber-400">{goldName}</div>
                          <div className="text-[10px] text-slate-400">{goldClub}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-lg">
                        <span className="text-base">🥈</span>
                        <div>
                          <div className="font-bold text-slate-300">{silverName}</div>
                          <div className="text-[10px] text-slate-400">Silver Finalist</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      Tournament category matches in progress.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: ATHLETES DIRECTORY LOOKUP */}
      {activeSection === 'players' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Official Athletes Directory
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Search registered fighters and view verified eligibility.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search fighter or club..."
                  value={playerSearch}
                  onChange={e => setPlayerSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={selectedGender}
                onChange={e => setSelectedGender(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPlayers.map(p => (
              <div key={p.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{p.name}</span>
                  <span className="font-mono-tabular text-amber-400 text-[11px]">{p.registrationNumber}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">{p.clubSchool}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-900">
                  <span className="capitalize">{p.gender}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{calculateAge(p.dob, event.tournamentReferenceDate)} yrs</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{p.weightKg.toFixed(1)} kg</span>
                  <span aria-hidden="true">·</span>
                  <span>{p.district}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
