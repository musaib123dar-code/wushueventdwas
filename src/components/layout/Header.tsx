import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { UserRole } from '../../types/tournament';
import { soundEffects } from '../../utils/soundEffects';
import {
  ShieldAlert,
  UserCheck,
  Award,
  Eye,
  Volume2,
  VolumeX,
  Printer,
  Calendar,
  MapPin,
  Flame,
  Crown,
  Radio,
  Lock,
  LogOut,
  RotateCcw,
  Zap,
  Database,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const {
    role,
    isLoggedIn,
    logout,
    setLoginModalOpen,
    event,
    currentUser,
    setActiveTab,
    activeTab,
    resetToDefaults,
    toggleEventLive,
    supabaseStatus,
    setSupabaseModalOpen,
  } = useTournament();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEffects.enabled = next;
    if (next) soundEffects.playBell();
  };

  const handlePrint = () => {
    window.print();
  };

  const rolesConfig: { role: UserRole; label: string; icon: React.ReactNode; color: string }[] = [
    { role: 'super_admin', label: 'Super Admin', icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />, color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' },
    { role: 'admin', label: 'Tournament Admin', icon: <UserCheck className="w-3.5 h-3.5 text-emerald-400" />, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' },
    { role: 'official', label: currentUser.assignedRing ? `Judge (${currentUser.assignedRing.split(' ')[0]})` : 'Mat Official', icon: <Award className="w-3.5 h-3.5 text-sky-400" />, color: 'text-sky-400 bg-sky-950/60 border-sky-800/60' },
    { role: 'general_view', label: 'Public Spectator', icon: <Eye className="w-3.5 h-3.5 text-slate-400" />, color: 'text-slate-300 bg-slate-900 border-slate-700' },
  ];

  const currentRoleConfig = rolesConfig.find(r => r.role === role) || rolesConfig[3];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('public')}
            className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 via-amber-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-red-950/50 ring-1 ring-amber-400/30">
              <Flame className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <span className="font-cinzel text-base sm:text-lg font-bold tracking-wider text-slate-100 group-hover:text-amber-400 transition-colors uppercase">
                WUSHU SANDA ARENA
              </span>
              <div className="text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-2">
                <span className="truncate max-w-[200px]">{event.name || 'Wushu Championship'}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                {event.isLive ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    LIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    NOT ACTIVE
                  </span>
                )}
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-amber-400 font-mono-tabular">Age Ref: {event.tournamentReferenceDate}</span>
              </div>
            </div>
          </button>
        </div>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('public')}
            className={`hover:text-slate-100 transition-colors cursor-pointer ${activeTab === 'public' ? 'text-amber-400 font-semibold' : ''}`}
          >
            Public Arena
          </button>
          <button
            onClick={() => setActiveTab('brackets')}
            className={`hover:text-slate-100 transition-colors cursor-pointer ${activeTab === 'brackets' ? 'text-amber-400 font-semibold' : ''}`}
          >
            Brackets
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`hover:text-slate-100 transition-colors cursor-pointer ${activeTab === 'results' ? 'text-amber-400 font-semibold' : ''}`}
          >
            Podium & Medals
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`hover:text-slate-100 transition-colors cursor-pointer ${activeTab === 'dashboard' ? 'text-amber-400 font-semibold' : ''}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`hover:text-slate-100 transition-colors cursor-pointer ${activeTab === 'players' ? 'text-amber-400 font-semibold' : ''}`}
          >
            Athletes
          </button>

          {/* Scoring button: only accessible to authenticated officials/admins or opens login */}
          <button
            onClick={() => {
              if (isLoggedIn) {
                setActiveTab('live-scoring');
              } else {
                setLoginModalOpen(true);
              }
            }}
            className={`hover:text-slate-100 transition-colors cursor-pointer ${
              activeTab === 'live-scoring' ? 'text-red-400 font-semibold flex items-center gap-1.5' : 'flex items-center gap-1.5'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            Leitai Scoring
          </button>
        </nav>

        {/* Zone 3: Actions + Authentication Controls */}
        <div className="flex items-center gap-2.5">
          {/* Super Admin Master Panel shortcut */}
          {role === 'super_admin' && (
            <>
              {!event.isLive && (
                <button
                  onClick={() => toggleEventLive(event.id, true)}
                  title="Activate event for all roles (turn LIVE)"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer transition-all"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Make LIVE</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('master-panel')}
                title="Open Super Admin Master Setup Panel"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                  activeTab === 'master-panel'
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Master Panel</span>
              </button>
            </>
          )}

          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute tournament arena sound' : 'Enable tournament bell audio'}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-lg transition-colors border border-slate-800 cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Print bracket action */}
          <button
            onClick={handlePrint}
            title="Print Official Scorecard / Bracket Sheet"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span className="whitespace-nowrap">Print</span>
          </button>


          {/* Authentication State Button */}
          {!isLoggedIn ? (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer shrink-0"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Official Login</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <div
                className={`flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-xl border ${currentRoleConfig.color}`}
              >
                {currentRoleConfig.icon}
                <div className="flex flex-col text-left">
                  <span className="font-bold text-[11px] leading-tight text-white truncate max-w-[120px] sm:max-w-[160px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider opacity-80 leading-tight">
                    {currentRoleConfig.label}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                title="Log Out and return to Public View"
                className="p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors border border-slate-800 hover:border-rose-800/40 flex items-center gap-1 text-xs cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          )}

          {/* Mobile navigation menu toggle button */}
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              title="Open menu"
              className="md:hidden p-2 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
            >
              <Menu className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* Confirmation modal for reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Reset Tournament State?</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              This will restore all original seed events, players, weight categories, brackets, and audit records.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetToDefaults();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
