import React, { useState, useMemo } from 'react';
import { useTournament } from '../../context/TournamentContext';
import {
  History,
  Search,
  Filter,
  Download,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const { auditLogs, exportDataAsCSV } = useTournament();

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  // Filter audit records
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        log.action.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.reason && log.reason.toLowerCase().includes(q));

      const matchesAction = actionFilter === 'all' || log.action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [auditLogs, searchQuery, actionFilter]);

  // Unique actions
  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach(l => set.add(l.action));
    return Array.from(set).sort();
  }, [auditLogs]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            System Audit Trail & Event Logs
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable tracking for bracket generations, match scores, result reopenings, and manual adjustments.
          </p>
        </div>

        <button
          onClick={() => exportDataAsCSV('audit')}
          className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Export Audit Log CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by action, user name, target entity, or audit reason..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Action Types ({auditLogs.length})</option>
            {uniqueActions.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>

          {(searchQuery || actionFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setActionFilter('all');
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details & Notes</th>
                <th className="py-3 px-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => {
                  const isCorrection = log.action === 'RESULT_REOPEN' || log.action === 'BRACKET_REGENERATE';
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono-tabular text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono-tabular font-bold border ${
                            isCorrection
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                              : log.action.includes('SCORE')
                              ? 'bg-red-950/60 text-red-300 border-red-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200 whitespace-nowrap">
                        {log.userName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap uppercase text-[10px] text-slate-400">
                        {log.userRole.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium whitespace-nowrap text-[11px]">
                        {log.target}
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="py-3 px-4 text-amber-400/90 whitespace-nowrap text-[11px]">
                        {log.reason || '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
