import React from 'react';
import { useTournament } from '../../context/TournamentContext';
import {
  LayoutDashboard,
  Users,
  GitFork,
  Swords,
  Filter,
  History,
  ShieldCheck,
  FileSpreadsheet,
  Tv,
  Trophy,
  CalendarDays,
  Crown,
  Radio,
  Lock,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { role, isLoggedIn, setLoginModalOpen, activeTab, setActiveTab, brackets, categories, players, event } = useTournament();

  const liveBoutCount = brackets.reduce((acc, b) => {
    return acc + b.rounds.reduce((rAcc, r) => rAcc + r.bouts.filter(bout => bout.status === 'live').length, 0);
  }, 0);

  const navItems = [
    { id: 'public', label: 'Public Arena View', icon: <Tv className="w-4 h-4" />, badge: 'Live Display', allowedRoles: ['super_admin', 'admin', 'official', 'general_view'] },
    { id: 'brackets', label: 'Knockout Brackets', icon: <GitFork className="w-4 h-4" />, badge: `${brackets.length} Trees`, allowedRoles: ['super_admin', 'admin', 'official', 'general_view'] },
    { id: 'results', label: 'Medal Tally & Podium', icon: <Trophy className="w-4 h-4" />, allowedRoles: ['super_admin', 'admin', 'official', 'general_view'] },
    { id: 'dashboard', label: 'Dashboard Overview', icon: <LayoutDashboard className="w-4 h-4" />, allowedRoles: ['super_admin', 'admin', 'official', 'general_view'] },
    { id: 'players', label: 'Player Registry', icon: <Users className="w-4 h-4" />, badge: `${players.length}`, allowedRoles: ['super_admin', 'admin', 'official', 'general_view'] },
    { id: 'master-panel', label: 'Master Admin Panel', icon: <Crown className="w-4 h-4 text-amber-400" />, badge: 'Master', badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40', allowedRoles: ['super_admin'] },
    { id: 'live-scoring', label: 'Official Leitai Scoring', icon: <Swords className="w-4 h-4" />, badge: liveBoutCount > 0 ? `${liveBoutCount} Live` : undefined, badgeColor: 'bg-red-500/20 text-red-400 border border-red-800/60', allowedRoles: ['super_admin', 'admin', 'official'] },
    { id: 'categories', label: 'Category Divisions', icon: <Filter className="w-4 h-4" />, badge: `${categories.length}`, allowedRoles: ['super_admin', 'admin', 'official'] },
    { id: 'events', label: 'Tournament Setup', icon: <CalendarDays className="w-4 h-4" />, allowedRoles: ['super_admin', 'admin'] },
    { id: 'audit', label: 'System Audit Logs', icon: <History className="w-4 h-4" />, allowedRoles: ['super_admin', 'admin'] },
    { id: 'users', label: 'Register Staff & Officials', icon: <ShieldCheck className="w-4 h-4" />, allowedRoles: ['super_admin'] },
    { id: 'exports', label: 'Reports & Export', icon: <FileSpreadsheet className="w-4 h-4" />, allowedRoles: ['super_admin', 'admin', 'official'] },
  ];

  const visibleItems = navItems.filter(item => item.allowedRoles.includes(role));

  return (
    <aside className="w-64 shrink-0 bg-slate-950 border-r border-slate-800/80 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-61px)]">
      <div className="space-y-5">
        <div>
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Navigation Menu
          </div>
          <nav className="space-y-1">
            {visibleItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono-tabular font-medium ${
                        item.badgeColor || 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Guest Login Card if not logged in */}
        {!isLoggedIn && (
          <div className="p-3 bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-slate-900 border border-amber-500/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Official & Staff Sign In</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Sign in with credentials to access Super Admin, Tournament Admin, or Mat Official roles.
            </p>
            <button
              onClick={() => setLoginModalOpen(true)}
              className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In with ID</span>
            </button>
          </div>
        )}

        {/* Tournament reference note */}
        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="font-semibold text-slate-300">Wushu Sanda Rules</span>
            <span className="text-amber-400 font-mono">IWUF Std</span>
          </div>
          <div className="text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Rounds:</span>
              <span className="text-slate-200 font-mono-tabular">Best of 3 (2 min)</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Exit:</span>
              <span className="text-slate-200 font-mono-tabular">2 exits = loss</span>
            </div>
            <div className="flex justify-between">
              <span>Gap Rule:</span>
              <span className="text-slate-200 font-mono-tabular">12 pts superiority</span>
            </div>
          </div>
        </div>

        {/* Championship Event Live Status */}
        <div
          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
            event.isLive
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold text-[11px]">
            <Radio className={`w-3.5 h-3.5 ${event.isLive ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
            <span>Event Status:</span>
          </div>
          <span className="font-bold text-[10px] tracking-wider uppercase">
            {event.isLive ? '● LIVE' : '○ NOT ACTIVE'}
          </span>
        </div>
      </div>

      {/* Role permission status box */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
          <span>Active Role</span>
          <span className="font-semibold uppercase text-slate-200 text-[10px]">{role.replace('_', ' ')}</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          {role === 'super_admin' && 'Full privileges: create, edit, delete records, register officials.'}
          {role === 'admin' && 'Tournament management: setup, players, categories, brackets, reports.'}
          {role === 'official' && 'Official Leitai ring scoring & platform bout control.'}
          {role === 'general_view' && 'Public spectator display: live bouts, queue, brackets & medals.'}
        </p>
      </div>
    </aside>
  );
};
