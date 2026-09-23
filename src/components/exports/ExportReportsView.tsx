import React from 'react';
import { useTournament } from '../../context/TournamentContext';
import {
  FileSpreadsheet,
  Download,
  Users,
  GitFork,
  Trophy,
  History,
  Layers,
  Printer,
  FileCheck,
} from 'lucide-react';

export const ExportReportsView: React.FC = () => {
  const { exportDataAsCSV, players, categories, brackets, auditLogs } = useTournament();

  const exportOptions = [
    {
      id: 'players',
      title: 'Complete Athletes Registry',
      description: 'Full database of all registered fighters including calculated ages, weights, clubs, districts, and Aadhar records.',
      count: `${players.length} Athletes`,
      icon: <Users className="w-5 h-5 text-amber-400" />,
      type: 'players' as const,
    },
    {
      id: 'bouts',
      title: 'Bout Fixtures & Scoring Records',
      description: 'All scheduled and completed bouts across knockout trees, round scores, platform exits, and decision reasons.',
      count: 'All Knockout Bouts',
      icon: <GitFork className="w-5 h-5 text-sky-400" />,
      type: 'bouts' as const,
    },
    {
      id: 'results',
      title: 'Official Podium & Medal Tally',
      description: 'Gold, Silver, and Joint Bronze medal winners per category with club and district standings.',
      count: `${categories.length} Categories`,
      icon: <Trophy className="w-5 h-5 text-amber-500" />,
      type: 'results' as const,
    },
    {
      id: 'audit',
      title: 'System Audit Logs',
      description: 'Full trail of referee actions, score submissions, bracket reshuffles, and administrative corrections.',
      count: `${auditLogs.length} Records`,
      icon: <History className="w-5 h-5 text-emerald-400" />,
      type: 'audit' as const,
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            Tournament Reports & Official Data Exports
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Download standard CSV spreadsheets for official federation records, press release, and state archives.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Printer className="w-3.5 h-3.5 text-slate-400" />
          <span>Print Tournament Summary</span>
        </button>
      </div>

      {/* Grid of Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {exportOptions.map(opt => (
          <div
            key={opt.id}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  {opt.icon}
                </div>
                <span className="text-xs font-mono-tabular text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
                  {opt.count}
                </span>
              </div>
              <h2 className="text-base font-bold text-white">{opt.title}</h2>
              <p className="text-xs text-slate-400 leading-relaxed">{opt.description}</p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono-tabular">Format: UTF-8 CSV</span>
              <button
                onClick={() => exportDataAsCSV(opt.type)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
