import React from 'react';
import { useTournament } from '../../context/TournamentContext';
import {
  X,
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
  Volume2,
  VolumeX,
  Printer,
  Lock,
  LogOut,
  Flame,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  toggleSound,
}) => {
  const {
    role,
    isLoggedIn,
    logout,
    setLoginModalOpen,
    activeTab,
    setActiveTab,
    brackets,
    categories,
    players,
    event,
    currentUser,
    toggleEventLive,
  } = useTournament();

  if (!isOpen) return null;

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

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xs bg-slate-950 border-l border-slate-800/80 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 via-amber-600 to-amber-500 flex items-center justify-center text-white shadow-sm ring-1 ring-amber-400/30">
              <Flame className="w-4 h-4 text-amber-100" />
            </div>
            <div>
              <div className="font-cinzel font-bold text-sm text-slate-100 uppercase tracking-wider">
                Wushu Arena
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                {event.isLive ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    LIVE EVENT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    INACTIVE
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            All Tournament Sections
          </div>

          {visibleItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-xl transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/40 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono-tabular font-medium ${
                      item.badgeColor || 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Super Admin Special Action */}
          {role === 'super_admin' && !event.isLive && (
            <div className="pt-2">
              <button
                onClick={() => {
                  toggleEventLive(event.id, true);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                <Radio className="w-4 h-4" />
                <span>Publish Tournament (Make LIVE)</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom User & Utility Controls */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/90 space-y-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {/* Quick Settings row: Sound & Print */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={toggleSound}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-900"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span>Arena Sound: ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-500" />
                  <span>Arena Sound: OFF</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                onClose();
                window.print();
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-900"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Print Sheet</span>
            </button>
          </div>

          {/* User state / Sign in */}
          {!isLoggedIn ? (
            <button
              onClick={() => {
                onClose();
                setLoginModalOpen(true);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Official Login (Admin / Mat Judge)</span>
            </button>
          ) : (
            <div className="flex items-center justify-between p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="min-w-0 pr-2">
                <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                <div className="text-[10px] text-amber-400 uppercase tracking-wider">{role.replace('_', ' ')}</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg border border-rose-900/40 transition-colors flex items-center gap-1 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
