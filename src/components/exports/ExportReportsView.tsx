import React, { useState } from 'react';
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
  FileDown,
  FileText,
  Check,
} from 'lucide-react';
import { exportCategoryFixturesPdf, exportAllFixturesPdf } from '../../utils/fixturesPdfExport';

export const ExportReportsView: React.FC = () => {
  const { exportDataAsCSV, players, categories, brackets, auditLogs, event } = useTournament();
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || '');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleExportAllPdf = () => {
    setDownloadingPdf(true);
    try {
      exportAllFixturesPdf(categories, brackets, event);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleExportSingleCategoryPdf = () => {
    const targetCat = categories.find(c => c.id === selectedCatId) || categories[0];
    if (!targetCat) return;
    const targetBracket = brackets.find(b => b.categoryId === targetCat.id);
    setDownloadingPdf(true);
    try {
      exportCategoryFixturesPdf(targetCat, targetBracket, event);
    } finally {
      setDownloadingPdf(false);
    }
  };

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

      {/* Official Knockout Fixtures PDF Feature Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <FileDown className="w-3 h-3 text-amber-400" />
              <span>PDF Fixture Booklets</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Official Championship Knockout Fixtures (PDF Format)
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Export Federation-compliant single-elimination bout schedules formatted for mat judges, ring platforms, corner referees, coaches, and jury appeal. Includes official bout numbers, fighter details, ring platforms, and signature verification blocks.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Single Category Selector & PDF Button */}
            <div className="flex items-center gap-2">
              <select
                value={selectedCatId}
                onChange={e => setSelectedCatId(e.target.value)}
                className="bg-slate-950 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs rounded-xl px-3 py-2.5 max-w-[200px] truncate focus:outline-none focus:border-amber-400 font-medium cursor-pointer"
                title="Select division for single PDF sheet"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleExportSingleCategoryPdf}
                disabled={downloadingPdf || categories.length === 0}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-xl text-xs flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                title="Download single category division PDF"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span className="whitespace-nowrap">Division PDF</span>
              </button>
            </div>

            {/* Complete Championship Fixtures Booklet Button */}
            <button
              onClick={handleExportAllPdf}
              disabled={downloadingPdf || categories.length === 0}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              title="Download Complete Championship Fixtures Booklet with all categories in 1 PDF"
            >
              <FileDown className="w-4 h-4 text-slate-950" />
              <span className="whitespace-nowrap">
                {downloadingPdf ? 'Generating PDF...' : 'Download All Fixtures (PDF Booklet)'}
              </span>
            </button>
          </div>
        </div>
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

            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 font-mono-tabular">
                {opt.id === 'bouts' ? 'Formats: PDF & CSV' : 'Format: UTF-8 CSV'}
              </span>
              <div className="flex items-center gap-2">
                {opt.id === 'bouts' && (
                  <button
                    onClick={handleExportAllPdf}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs rounded-xl border border-amber-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Export all bout fixtures as PDF document"
                  >
                    <FileDown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download PDF</span>
                  </button>
                )}
                <button
                  onClick={() => exportDataAsCSV(opt.type)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
