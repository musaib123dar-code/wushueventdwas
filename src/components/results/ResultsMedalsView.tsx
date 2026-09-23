import React, { useMemo } from 'react';
import { useTournament } from '../../context/TournamentContext';
import {
  Trophy,
  Award,
  Medal,
  Printer,
  Download,
  Building,
  MapPin,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export const ResultsMedalsView: React.FC = () => {
  const { event, brackets, categories, players, exportDataAsCSV } = useTournament();

  // Compute category results: Gold, Silver, Bronze
  const categoryResults = useMemo(() => {
    return brackets.map(b => {
      const cat = categories.find(c => c.id === b.categoryId);
      const rounds = b.rounds;
      const finalRound = rounds[rounds.length - 1];
      const semiRound = rounds.length >= 2 ? rounds[rounds.length - 2] : null;

      const finalBout = finalRound?.bouts[0];
      const isCompleted = finalBout && finalBout.winnerId;

      let gold = null;
      let silver = null;
      const bronzes: { name: string; club: string }[] = [];

      if (isCompleted && finalBout) {
        gold = {
          name: finalBout.winnerCorner === 'red' ? finalBout.redPlayerName : finalBout.bluePlayerName,
          club: finalBout.winnerCorner === 'red' ? finalBout.redClub : finalBout.blueClub,
          decision: finalBout.winningReason,
        };
        silver = {
          name: finalBout.winnerCorner === 'red' ? finalBout.bluePlayerName : finalBout.redPlayerName,
          club: finalBout.winnerCorner === 'red' ? finalBout.blueClub : finalBout.redClub,
        };
      }

      // Semifinal losers earn joint bronze in Wushu Sanda regulations
      if (semiRound) {
        semiRound.bouts.forEach(sb => {
          if (sb.winnerId) {
            const loserName = sb.winnerCorner === 'red' ? sb.bluePlayerName : sb.redPlayerName;
            const loserClub = sb.winnerCorner === 'red' ? sb.blueClub : sb.redClub;
            if (loserName && !bronzes.some(b => b.name === loserName)) {
              bronzes.push({ name: loserName, club: loserClub || '' });
            }
          }
        });
      }

      return {
        categoryId: b.categoryId,
        categoryName: cat?.name || 'Category',
        gender: cat?.gender || 'male',
        isCompleted: Boolean(isCompleted),
        gold,
        silver,
        bronzes,
      };
    });
  }, [brackets, categories]);

  // Club / Team Medal Standings Aggregator
  const teamStandings = useMemo(() => {
    const map = new Map<string, { club: string; gold: number; silver: number; bronze: number; total: number }>();

    categoryResults.forEach(cr => {
      if (cr.gold?.club) {
        const entry = map.get(cr.gold.club) || { club: cr.gold.club, gold: 0, silver: 0, bronze: 0, total: 0 };
        entry.gold++;
        entry.total++;
        map.set(cr.gold.club, entry);
      }
      if (cr.silver?.club) {
        const entry = map.get(cr.silver.club) || { club: cr.silver.club, gold: 0, silver: 0, bronze: 0, total: 0 };
        entry.silver++;
        entry.total++;
        map.set(cr.silver.club, entry);
      }
      cr.bronzes.forEach(br => {
        if (br.club) {
          const entry = map.get(br.club) || { club: br.club, gold: 0, silver: 0, bronze: 0, total: 0 };
          entry.bronze++;
          entry.total++;
          map.set(br.club, entry);
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      return b.bronze - a.bronze;
    });
  }, [categoryResults]);

  return (
    <div className="space-y-8 pb-16">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Official Medal Tally & Championship Podiums
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Podium standings according to standard IWUF Sanda single-elimination joint-bronze rules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportDataAsCSV('results')}
            className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Medals CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print Official Tally</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Team Leaderboard (Left) & Category Podiums (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Club & Team Medal Rankings */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-400" />
                Club / District Rankings
              </h2>
              <span className="text-[11px] text-slate-400 font-mono-tabular font-semibold">
                {teamStandings.length} Teams
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Club / District</th>
                    <th className="py-2.5 px-2 text-center text-amber-400">🥇</th>
                    <th className="py-2.5 px-2 text-center text-slate-300">🥈</th>
                    <th className="py-2.5 px-2 text-center text-amber-600">🥉</th>
                    <th className="py-2.5 px-2 text-center font-bold text-white">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono-tabular">
                  {teamStandings.length > 0 ? (
                    teamStandings.map((team, idx) => (
                      <tr key={team.club} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-slate-400 text-center w-8">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-200 truncate max-w-[160px]">
                          {team.club}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-amber-400">
                          {team.gold}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-300">
                          {team.silver}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-amber-600">
                          {team.bronze}
                        </td>
                        <td className="py-2.5 px-2 text-center font-black text-white bg-slate-950/40">
                          {team.total}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 font-sans text-xs">
                        No category bouts completed yet to generate medal tallies.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Category Podium Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Category Podium Honors ({categoryResults.length})
            </h2>
          </div>

          <div className="space-y-4">
            {categoryResults.map(res => (
              <div
                key={res.categoryId}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div>
                    <h3 className="text-xs font-bold text-white">{res.categoryName}</h3>
                    <div className="text-[11px] text-slate-400 mt-0.5 capitalize">{res.gender} Division</div>
                  </div>
                  {res.isCompleted ? (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Finalized
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-full">
                      Bouts Ongoing
                    </span>
                  )}
                </div>

                {res.isCompleted && res.gold ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                    {/* Gold Medalist */}
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                        <span>🥇</span> Gold Champion
                      </div>
                      <div className="font-bold text-white text-sm truncate">{res.gold.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{res.gold.club}</div>
                      <div className="text-[10px] text-emerald-400 font-mono-tabular pt-1 border-t border-amber-500/20">
                        {res.gold.decision}
                      </div>
                    </div>

                    {/* Silver Medalist */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] uppercase tracking-wider">
                        <span>🥈</span> Silver Finalist
                      </div>
                      <div className="font-bold text-white text-sm truncate">{res.silver?.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{res.silver?.club}</div>
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                        Runner-up
                      </div>
                    </div>

                    {/* Bronze Medalist(s) */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[11px] uppercase tracking-wider">
                        <span>🥉</span> Joint Bronze
                      </div>
                      {res.bronzes.length > 0 ? (
                        res.bronzes.map((br, bIdx) => (
                          <div key={bIdx} className="truncate">
                            <div className="font-medium text-slate-200 text-xs truncate">{br.name}</div>
                            <div className="text-[10px] text-slate-500 truncate">{br.club}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-slate-500">Semifinalists</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    Category tournament tree is in progress. Gold, silver, and joint bronze podium will finalize upon final bout completion.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
