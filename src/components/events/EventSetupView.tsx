import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import {
  CalendarDays,
  MapPin,
  Clock,
  Shield,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const EventSetupView: React.FC = () => {
  const { event, updateEvent, ageCategories, weightCategories, role } = useTournament();

  const [formData, setFormData] = useState({
    name: event.name,
    organizer: event.organizer,
    venue: event.venue,
    city: event.city,
    state: event.state || '',
    startDate: event.startDate,
    endDate: event.endDate,
    tournamentReferenceDate: event.tournamentReferenceDate,
    roundDurationSec: event.roundDurationSec,
    numberOfRounds: event.roundsCount || 3,
    restDurationSec: event.restDurationSec,
    rings: [...event.rings],
    isLive: event.isLive,
  });

  const [savedMsg, setSavedMsg] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateEvent({
      name: formData.name,
      organizer: formData.organizer,
      venue: formData.venue,
      city: formData.city,
      state: formData.state,
      startDate: formData.startDate,
      endDate: formData.endDate,
      tournamentReferenceDate: formData.tournamentReferenceDate,
      roundDurationSec: formData.roundDurationSec,
      roundsCount: formData.numberOfRounds,
      restDurationSec: formData.restDurationSec,
      rings: formData.rings,
      isLive: formData.isLive,
    });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const isSuperOrAdmin = role === 'super_admin' || role === 'admin';

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-amber-400" />
          Tournament Setup & Competition Parameters
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure event details, ring allocation, and official age calculation reference date.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Tournament configuration successfully updated!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Form Setup */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800">
              General Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1 font-medium">Tournament Event Name *</label>
                <input
                  type="text"
                  required
                  disabled={!isSuperOrAdmin}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Organizer / Federation *</label>
                <input
                  type="text"
                  required
                  disabled={!isSuperOrAdmin}
                  value={formData.organizer}
                  onChange={e => setFormData({ ...formData, organizer: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Venue Stadium *</label>
                <input
                  type="text"
                  required
                  disabled={!isSuperOrAdmin}
                  value={formData.venue}
                  onChange={e => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Host City</label>
                <input
                  type="text"
                  disabled={!isSuperOrAdmin}
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">State / Province</label>
                <input
                  type="text"
                  disabled={!isSuperOrAdmin}
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Crucial Age Calculation Cutoff Date */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>Tournament Reference Date for Age Calculation (PRD Core Requirement)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                All athlete ages in registration and category filtering are computed dynamically against this exact reference date. Changing this date automatically updates calculated ages across all registered fighters.
              </p>
              <div className="pt-1">
                <input
                  type="date"
                  required
                  disabled={!isSuperOrAdmin}
                  value={formData.tournamentReferenceDate}
                  onChange={e => setFormData({ ...formData, tournamentReferenceDate: e.target.value })}
                  className="bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2 text-amber-300 font-mono-tabular font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Championship Live Access Status */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-200">
                  Championship Live Access Status
                </span>
                {formData.isLive ? (
                  <span className="text-[10px] text-emerald-400 font-bold">● LIVE</span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-bold">○ NOT ACTIVE</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                When set to <strong className="text-emerald-400">LIVE</strong>, tournament administrators, match officials, and spectators can work on this event. When set to <strong className="text-amber-400">NOT ACTIVE</strong>, access is restricted to Super Admin.
              </p>
              <select
                disabled={!isSuperOrAdmin}
                value={formData.isLive ? 'live' : 'not_active'}
                onChange={e => setFormData({ ...formData, isLive: e.target.value === 'live' })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="live">🟢 LIVE — Active & Accessible to All Roles</option>
                <option value="not_active">🟡 NOT ACTIVE — Restricted to Super Admin</option>
              </select>
            </div>

            <h2 className="text-sm font-bold text-white uppercase tracking-wider pt-2 pb-2 border-b border-slate-800">
              Sanda Bout Rules & Arenas
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Round Duration (Seconds)</label>
                <input
                  type="number"
                  disabled={!isSuperOrAdmin}
                  value={formData.roundDurationSec}
                  onChange={e => setFormData({ ...formData, roundDurationSec: parseInt(e.target.value) || 120 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono-tabular focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Default: 120s (2 min)</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Rest Period (Seconds)</label>
                <input
                  type="number"
                  disabled={!isSuperOrAdmin}
                  value={formData.restDurationSec}
                  onChange={e => setFormData({ ...formData, restDurationSec: parseInt(e.target.value) || 60 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono-tabular focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Default: 60s (1 min)</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Max Rounds per Bout</label>
                <input
                  type="number"
                  disabled={!isSuperOrAdmin}
                  value={formData.numberOfRounds}
                  onChange={e => setFormData({ ...formData, numberOfRounds: parseInt(e.target.value) || 3 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono-tabular focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Best of 3</span>
              </div>
            </div>

            {isSuperOrAdmin && (
              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Tournament Settings
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right 4 Cols: Age Categories and Weight Classes Standard List */}
        <div className="lg:col-span-4 space-y-6">
          {/* Age Categories Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              IWUF Age Classifications
            </h2>
            <div className="space-y-2 text-xs">
              {ageCategories.map(a => (
                <div key={a.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-200">{a.name}</div>
                    <div className="text-[10px] text-slate-400">{a.description}</div>
                  </div>
                  <span className="text-amber-400 font-mono-tabular font-semibold">
                    {a.minAge} - {a.maxAge} yrs
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sanda Weight Classes Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Sanda Weight Divisions ({weightCategories.length})
            </h2>
            <div className="max-h-72 overflow-y-auto space-y-1.5 p-1">
              {weightCategories.map(w => (
                <div key={w.id} className="p-2 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${w.gender === 'male' ? 'bg-amber-400' : 'bg-sky-400'}`}></span>
                    <span className="font-medium text-slate-200">{w.name}</span>
                    <span className="text-[10px] text-slate-500 capitalize">({w.gender})</span>
                  </div>
                  <span className="font-mono-tabular text-slate-400 text-[11px]">
                    {w.minWeightKg} - {w.maxWeightKg} kg
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
