import React from 'react';
import { TournamentProvider, useTournament } from './context/TournamentContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { PlayerRegistry } from './components/players/PlayerRegistry';
import { CategoryManager } from './components/categories/CategoryManager';
import { BracketViewer } from './components/brackets/BracketViewer';
import { LiveScoringArena } from './components/scoring/LiveScoringArena';
import { PublicTournamentView } from './components/public/PublicTournamentView';
import { ResultsMedalsView } from './components/results/ResultsMedalsView';
import { EventSetupView } from './components/events/EventSetupView';
import { AuditLogViewer } from './components/audit/AuditLogViewer';
import { UserRoleManager } from './components/users/UserRoleManager';
import { ExportReportsView } from './components/exports/ExportReportsView';
import { MasterAdminPanel } from './components/master/MasterAdminPanel';
import { InactiveEventLockoutView } from './components/common/InactiveEventLockoutView';
import { LoginModal } from './components/auth/LoginModal';
import { SupabaseSettingsModal } from './components/supabase/SupabaseSettingsModal';
import {
  LayoutDashboard,
  Users,
  GitFork,
  Swords,
  Tv,
  Lock,
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    role,
    isLoggedIn,
    setLoginModalOpen,
    canWorkOnEvent,
    supabaseModalOpen,
    setSupabaseModalOpen,
  } = useTournament();

  const renderContent = () => {
    // If user is not super_admin and current event is not live, block work on that event
    if (!canWorkOnEvent) {
      return <InactiveEventLockoutView />;
    }

    switch (activeTab) {
      case 'master-panel':
        return role === 'super_admin' ? <MasterAdminPanel /> : <PublicTournamentView />;
      case 'dashboard':
        return <OverviewDashboard />;
      case 'players':
        return <PlayerRegistry />;
      case 'categories':
        return <CategoryManager />;
      case 'brackets':
        return <BracketViewer />;
      case 'live-scoring':
        if (!isLoggedIn) {
          return (
            <div className="p-8 max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Official Scoring Access Required</h2>
              <p className="text-xs text-slate-400">
                Live Leitai scoring requires an authenticated Mat Official, Tournament Admin, or Super Admin account.
              </p>
              <button
                onClick={() => setLoginModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <Lock className="w-4 h-4" />
                <span>Sign In with Official Credentials</span>
              </button>
            </div>
          );
        }
        return <LiveScoringArena />;
      case 'public':
        return <PublicTournamentView />;
      case 'results':
        return <ResultsMedalsView />;
      case 'events':
        return <EventSetupView />;
      case 'audit':
        return <AuditLogViewer />;
      case 'users':
        return <UserRoleManager />;
      case 'exports':
        return <ExportReportsView />;
      default:
        return <PublicTournamentView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <Header />

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {renderContent()}
        </main>
      </div>

      {/* Login Modal */}
      <LoginModal />

      {/* Supabase Cloud Backend Manager Modal */}
      <SupabaseSettingsModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
      />

      {/* Mobile Bottom Navigation Bar (hidden on md and larger) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around text-[10px]">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 p-1 ${
            activeTab === 'dashboard' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('players')}
          className={`flex flex-col items-center gap-1 p-1 ${
            activeTab === 'players' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Players</span>
        </button>

        <button
          onClick={() => setActiveTab('live-scoring')}
          className={`flex flex-col items-center gap-1 p-1 ${
            activeTab === 'live-scoring' ? 'text-red-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <Swords className="w-4 h-4 text-red-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping absolute -top-0.5 -right-0.5"></span>
          </div>
          <span>Leitai</span>
        </button>

        <button
          onClick={() => setActiveTab('brackets')}
          className={`flex flex-col items-center gap-1 p-1 ${
            activeTab === 'brackets' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <GitFork className="w-4 h-4" />
          <span>Brackets</span>
        </button>

        <button
          onClick={() => setActiveTab('public')}
          className={`flex flex-col items-center gap-1 p-1 ${
            activeTab === 'public' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>Public</span>
        </button>
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <TournamentProvider>
      <MainAppContent />
    </TournamentProvider>
  );
}
