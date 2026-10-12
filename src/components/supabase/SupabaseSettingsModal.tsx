import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  X,
  Zap,
  Server,
  Key,
  Globe,
  Radio,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
} from '../../services/supabaseClient';
import { useTournament } from '../../context/TournamentContext';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    syncToSupabase,
    fetchFromSupabase,
    supabaseStatus,
    setSupabaseStatus,
    events,
    players,
    categories,
    brackets,
  } = useTournament();

  const [activeTab, setActiveTab] = useState<'status' | 'credentials' | 'sync'>('status');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    latency?: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter both your Supabase Project URL and Anon Public Key.',
      });
      return;
    }

    saveSupabaseConfig(url.trim(), anonKey.trim());
    setTesting(true);
    setStatusMessage(null);

    const res = await testSupabaseConnection();
    setTesting(false);

    if (res.success) {
      setSupabaseStatus('connected');
      setStatusMessage({
        type: 'success',
        text: res.message,
        latency: res.latencyMs,
      });
    } else {
      setSupabaseStatus('error');
      setStatusMessage({
        type: 'error',
        text: res.message,
      });
    }
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setStatusMessage({
      type: 'info',
      text: 'Supabase configuration cleared. The app will use local storage.',
    });
  };

  const handlePushData = async () => {
    setSyncing(true);
    setStatusMessage(null);
    const res = await syncToSupabase();
    setSyncing(false);

    setStatusMessage({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handlePullData = async () => {
    setSyncing(true);
    setStatusMessage(null);
    const res = await fetchFromSupabase();
    setSyncing(false);

    setStatusMessage({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Supabase Cloud PostgreSQL Database</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    supabaseStatus === 'connected'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {supabaseStatus === 'connected' ? 'LIVE SYNC ACTIVE' : 'CONNECTING...'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Real-time cloud database for multi-mat live scoring & spectator boards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'status'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Connection Status</span>
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sync'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Cloud Sync</span>
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'credentials'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Credentials</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: Live Status */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  supabaseStatus === 'connected'
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                }`}
              >
                {supabaseStatus === 'connected' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold text-sm">
                    {supabaseStatus === 'connected'
                      ? 'Supabase PostgreSQL Cloud: Connected & Broadcasting Live'
                      : 'Connecting to Supabase Database...'}
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    {supabaseStatus === 'connected'
                      ? 'All athlete weigh-ins, category divisions, knockout brackets, and Leitai scoring cards are synchronized in real time to your cloud database.'
                      : 'Testing credentials and initializing connection to the PostgreSQL database.'}
                  </p>
                </div>
              </div>

              {/* Endpoint cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Project URL</span>
                  </div>
                  <div className="font-mono text-xs text-slate-200 truncate font-semibold" title={url}>
                    {url || 'Not configured'}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                    <Server className="w-3.5 h-3.5 text-amber-400" />
                    <span>Realtime WebSocket</span>
                  </div>
                  <div className="text-xs text-slate-200 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>PostgreSQL Realtime Broadcast Active</span>
                  </div>
                </div>
              </div>

              {/* Live counts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block font-semibold">Athletes</span>
                  <span className="text-lg font-bold text-white font-mono-tabular">{players.length}</span>
                </div>
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block font-semibold">Categories</span>
                  <span className="text-lg font-bold text-white font-mono-tabular">{categories.length}</span>
                </div>
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block font-semibold">Brackets</span>
                  <span className="text-lg font-bold text-white font-mono-tabular">{brackets.length}</span>
                </div>
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block font-semibold">Events</span>
                  <span className="text-lg font-bold text-white font-mono-tabular">{events.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Sync */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Manually push or pull entire championship records between your browser and the Supabase PostgreSQL database.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handlePushData}
                  disabled={syncing}
                  className="p-4 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer flex items-center gap-3.5"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Push All to Supabase</div>
                    <div className="text-[11px] text-slate-400">Upload all athletes, categories & brackets</div>
                  </div>
                </button>

                <button
                  onClick={handlePullData}
                  disabled={syncing}
                  className="p-4 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition-all cursor-pointer flex items-center gap-3.5"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <DownloadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Pull From Supabase</div>
                    <div className="text-[11px] text-slate-400">Download latest cloud records</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Credentials */}
          {activeTab === 'credentials' && (
            <form onSubmit={handleTestAndSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Supabase Project URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Supabase Anon Public API Key</label>
                <textarea
                  value={anonKey}
                  onChange={e => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono resize-none"
                  required
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={testing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Verifying...' : 'Save & Test Connection'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUrl('https://qbxlyaynqshlgzaqyriv.supabase.co');
                    setAnonKey(
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieGx5YXlucXNobGd6YXF5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MTE0NTEsImV4cCI6MjEwNzM4NzQ1MX0.rAbr9pX3SoIcLjvwXs3_XpjUMxjRQ4H1UoJPLfbspGE'
                    );
                    saveSupabaseConfig(
                      'https://qbxlyaynqshlgzaqyriv.supabase.co',
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieGx5YXlucXNobGd6YXF5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MTE0NTEsImV4cCI6MjEwNzM4NzQ1MX0.rAbr9pX3SoIcLjvwXs3_XpjUMxjRQ4H1UoJPLfbspGE'
                    );
                    testSupabaseConnection().then(res => {
                      if (res.success) {
                        setSupabaseStatus('connected');
                      }
                      setStatusMessage({
                        type: res.success ? 'success' : 'error',
                        text: res.message,
                        latency: res.latencyMs,
                      });
                    });
                  }}
                  className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer font-semibold"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reset to Active Project (qbxlyayn...)</span>
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-2 bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </form>
          )}

          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Radio className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div>{statusMessage.text}</div>
                {statusMessage.latency && (
                  <div className="font-mono text-[10px] opacity-75">Response time: {statusMessage.latency}ms</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                supabaseStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            ></span>
            <span>{supabaseStatus === 'connected' ? 'Supabase Live Sync Connected' : 'Supabase Sync Pending'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
