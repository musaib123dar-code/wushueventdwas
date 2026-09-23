import React from 'react';
import { useTournament } from '../../context/TournamentContext';
import {
  ShieldAlert,
  Crown,
  Calendar,
  MapPin,
  Flame,
  Swords,
  Radio,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

export const InactiveEventLockoutView: React.FC = () => {
  const { event, events, role, setLoginModalOpen, switchEvent, toggleEventLive, setActiveTab } = useTournament();

  const liveEvents = events.filter(e => e.isLive && e.id !== event.id);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-fadeIn">
      {/* Alert Header */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border border-amber-500/40 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Not Active (Draft Mode)
              </span>
              <span className="text-xs text-slate-400 font-mono-tabular">
                Event ID: {event.id}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Championship Event Under Preparation
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              This tournament event is currently set to <strong className="text-amber-300">NOT ACTIVE</strong>.
              Only <strong className="text-amber-300">Super Admins</strong> can access, edit, and configure
              fighters, categories, and leitai arenas while an event is offline. Other roles cannot work on this event until it is made LIVE.
            </p>
          </div>
        </div>
      </div>

      {/* Selected Event Details Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            Selected Tournament Overview
          </h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Current Workspace Target
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-xs text-slate-400">Tournament Name</div>
            <div className="text-base font-bold text-white">
              {event.name || 'Untitled Championship'}
            </div>
            <div className="text-xs text-slate-400">
              Organizer: {event.organizer || 'State Federation'}
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-xs text-slate-400">Location & Dates</div>
            <div className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>{event.venue || 'Stadium Arena'}, {event.city || 'State'}</span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{event.startDate} to {event.endDate}</span>
              <span className="text-slate-600">·</span>
              <span className="text-amber-400">Age Cutoff: {event.tournamentReferenceDate}</span>
            </div>
          </div>
        </div>

        {/* Leitai Rings & Rules */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs text-slate-400">Configured Leitai Rings:</span>
          {event.rings.map((ring, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/90 text-slate-200 border border-slate-700 flex items-center gap-1.5"
            >
              <Swords className="w-3 h-3 text-red-400" />
              {ring}
            </span>
          ))}
        </div>
      </div>

      {/* How to activate or proceed */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            Super Admin Controls
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            If you are the event director or super administrator, switch your role to Super Admin to open the Master Panel and mark this event LIVE.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setLoginModalOpen(true);
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Crown className="w-4 h-4" />
            <span>Login as Super Admin & Open Master Panel</span>
          </button>

          {role === 'admin' && (
            <button
              onClick={() => toggleEventLive(event.id, true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Radio className="w-4 h-4" />
              <span>Make Event LIVE Now</span>
            </button>
          )}
        </div>

        {/* Other Live Events If Available */}
        {liveEvents.length > 0 && (
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Other Currently LIVE Championship Events ({liveEvents.length})
            </div>
            <p className="text-xs text-slate-400">
              The following tournaments are currently live and ready for match officials and public access:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {liveEvents.map(le => (
                <div
                  key={le.id}
                  className="p-3.5 bg-slate-950/70 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{le.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {le.city || 'State'} · {le.rings?.length || 2} Rings
                    </div>
                  </div>
                  <button
                    onClick={() => switchEvent(le.id)}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Switch Event</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
