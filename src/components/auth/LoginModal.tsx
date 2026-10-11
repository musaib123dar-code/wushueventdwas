import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  LogIn,
  Tv,
} from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { loginModalOpen, setLoginModalOpen, login } = useTournament();

  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!loginModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const res = login(credential, password);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Invalid credentials. Access denied.');
    } else {
      setCredential('');
      setPassword('');
      setErrorMsg(null);
      setLoginModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Official & Staff Sign In
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Restricted access for Super Admin, Tournament Admins & Mat Officials
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setErrorMsg(null);
              setLoginModalOpen(false);
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1.5 font-semibold">
              Username or Registered Email *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                placeholder="Enter official username or email"
                value={credential}
                onChange={e => {
                  setCredential(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <UserIcon className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 font-semibold flex items-center justify-between">
              <span>Security Password *</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    <span>Show</span>
                  </>
                )}
              </button>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter your security password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In & Access Workspace'}</span>
          </button>
        </form>

        {/* Public spectator prompt */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-slate-400" />
            <span className="text-[11px]">Public spectators do not require credentials.</span>
          </div>
          <button
            type="button"
            onClick={() => setLoginModalOpen(false)}
            className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 underline cursor-pointer"
          >
            Stay on Public View
          </button>
        </div>
      </div>
    </div>
  );
};
