import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Copy,
  Check,
  ExternalLink,
  X,
  Zap,
  Server,
  Key,
  Globe,
  Radio,
  Trash2,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
} from '../../services/supabaseClient';
import { SUPABASE_SQL_SCHEMA } from '../../services/supabaseSchema';
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
    events,
    players,
    categories,
    brackets,
    users,
    auditLogs,
  } = useTournament();

  const [activeTab, setActiveTab] = useState<'connect' | 'sync' | 'sql'>('connect');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
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

    // Save
    saveSupabaseConfig(url.trim(), anonKey.trim());
    setTesting(true);
    setStatusMessage(null);

    const res = await testSupabaseConnection();
    setTesting(false);

    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: res.message,
        latency: res.latencyMs,
      });
    } else {
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
      text: 'Supabase configuration cleared. The app is now using local persistent storage.',
    });
  };

  const handlePushData = async () => {
    setSyncing(true);
    setStatusMessage(null);
    const res = await syncToSupabase();
    setSyncing(false);

    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: res.message,
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: res.message,
      });
    }
  };

  const handlePullData = async () => {
    setSyncing(true);
    setStatusMessage(null);
    const res = await fetchFromSupabase();
    setSyncing(false);

    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: res.message,
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: res.message,
      });
    }
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-950/40">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Supabase Backend Integration
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  PostgreSQL
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Connect your real Supabase.com database for cloud persistence & live sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('connect')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'connect'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Connection & Keys</span>
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'sync'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Data Sync & Tables</span>
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'sql'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>SQL Schema Script</span>
          </button>
        </div>

        {/* Status alert message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Radio className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            {statusMessage.latency !== undefined && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 shrink-0">
                {statusMessage.latency} ms
              </span>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* TAB 1: Connect & Keys */}
          {activeTab === 'connect' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Supabase Backend Status:</span>
                  <div className="flex items-center gap-1.5">
                    {supabaseStatus === 'connected' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Connected & Active
                      </span>
                    ) : supabaseStatus === 'connecting' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Connecting...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Local Storage Fallback
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Enter your Supabase project details from{' '}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-0.5"
                  >
                    supabase.com/dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                  . Project Settings &gt; API &gt; Project URL and anon public key.
                </p>
              </div>

              <form onSubmit={handleTestAndSave} className="space-y-3.5">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Supabase Project URL</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://xyzabcdefghijklmnop.supabase.co"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Found in Supabase Project Settings &rarr; API &rarr; Project URL
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    <span>Anon / Public API Key</span>
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={e => setAnonKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Safe to use in frontend. Found under Project Settings &rarr; API &rarr; Project API keys &rarr; anon / public.
                  </span>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2.5 justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={testing}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      <span>{testing ? 'Testing Connection...' : 'Save & Connect to Supabase'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTestAndSave()}
                      disabled={testing}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                      <span>Test Connection</span>
                    </button>
                  </div>

                  {(url || anonKey) && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-3 py-2 text-rose-400 hover:bg-rose-950/40 rounded-xl text-xs flex items-center gap-1.5 border border-transparent hover:border-rose-900/50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Data Sync & Migration */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Current Tournament Local Records:</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-base font-bold text-emerald-400 font-mono-tabular">{events.length}</span>
                    <span className="text-[10px] text-slate-400 block">Events</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-base font-bold text-amber-400 font-mono-tabular">{players.length}</span>
                    <span className="text-[10px] text-slate-400 block">Athletes</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-base font-bold text-sky-400 font-mono-tabular">{categories.length}</span>
                    <span className="text-[10px] text-slate-400 block">Divisions</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-base font-bold text-purple-400 font-mono-tabular">{brackets.length}</span>
                    <span className="text-[10px] text-slate-400 block">Brackets</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-emerald-400" />
                      <span>Push Local Data to Supabase</span>
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Upload and seed all your local events, athletes, categories, brackets, and users to Supabase tables.
                    </p>
                  </div>
                  <button
                    onClick={handlePushData}
                    disabled={syncing || supabaseStatus !== 'connected'}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-md shadow-emerald-600/20"
                  >
                    {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    <span>Push to Supabase</span>
                  </button>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <DownloadCloud className="w-4 h-4 text-sky-400" />
                      <span>Pull Remote Data from Supabase</span>
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Download the latest tournament records stored in your Supabase database into this client.
                    </p>
                  </div>
                  <button
                    onClick={handlePullData}
                    disabled={syncing || supabaseStatus !== 'connected'}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-md shadow-sky-600/20"
                  >
                    {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
                    <span>Pull from Supabase</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SQL Schema */}
          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-200">Supabase SQL Schema (PostgreSQL)</h4>
                  <p className="text-[11px] text-slate-400">
                    Paste this into Supabase SQL Editor &rarr; New Query &rarr; Run
                  </p>
                </div>
                <button
                  onClick={copySqlToClipboard}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-mono text-emerald-300 max-h-[300px] overflow-y-auto leading-relaxed">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Supabase Cloud Native</span>
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
