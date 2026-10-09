import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { User, UserRole } from '../../types/tournament';
import {
  ShieldCheck,
  UserPlus,
  Shield,
  Award,
  Trash2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  X,
  ClipboardCheck,
} from 'lucide-react';

export const UserRoleManager: React.FC = () => {
  const {
    users,
    role,
    currentUser,
    event,
    addUser,
    deleteUser,
    updateUser,
  } = useTournament();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [newUserData, setNewUserData] = useState<{
    name: string;
    username: string;
    email: string;
    password: string;
    role: 'admin' | 'official' | 'sideline_judge';
    assignedRing: string;
  }>({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'sideline_judge',
    assignedRing: event.rings[0] || 'Leitai 1 (Platform A)',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [revealedPasswordId, setRevealedPasswordId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // If not super_admin, block UI
  if (role !== 'super_admin') {
    return (
      <div className="p-8 max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Super Admin Access Required</h2>
        <p className="text-xs text-slate-400">
          Only the Super Admin is authorized to register tournament administrators, mat officials, and sideline scorers.
        </p>
      </div>
    );
  }

  const handleAddOfficial = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!newUserData.name.trim()) {
      setFormError('Please provide the official’s full name.');
      return;
    }

    const emailOrUsername = (newUserData.email || newUserData.username).trim();
    if (!emailOrUsername) {
      setFormError('Please provide an email address or login username.');
      return;
    }

    if (!newUserData.password || newUserData.password.length < 4) {
      setFormError('Password must be at least 4 characters.');
      return;
    }

    const isRingRole = newUserData.role === 'official' || newUserData.role === 'sideline_judge';
    if (isRingRole && !newUserData.assignedRing) {
      setFormError('Please select an assigned Leitai platform arena for this official.');
      return;
    }

    const res = addUser({
      name: newUserData.name.trim(),
      email: newUserData.email.trim() || `${newUserData.username.trim().toLowerCase()}@wushu.org`,
      username: (newUserData.username || newUserData.email.split('@')[0]).trim().toLowerCase(),
      password: newUserData.password.trim(),
      role: newUserData.role, // 'admin' | 'official' | 'sideline_judge'
      ringAssignment: isRingRole ? newUserData.assignedRing : undefined,
      assignedRing: isRingRole ? newUserData.assignedRing : undefined,
    });

    if (!res.success) {
      setFormError(res.error || 'Failed to register official.');
    } else {
      const roleLabel =
        newUserData.role === 'admin'
          ? 'Tournament Admin'
          : newUserData.role === 'sideline_judge'
          ? 'Sideline Scorer'
          : 'Mat Official';
      setFormSuccess(`Successfully registered ${newUserData.name} as ${roleLabel} (${isRingRole ? newUserData.assignedRing : 'All Platforms'}).`);
      setNewUserData({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'sideline_judge',
        assignedRing: event.rings[0] || 'Leitai 1 (Platform A)',
      });
      setTimeout(() => {
        setIsAddModalOpen(false);
        setFormSuccess(null);
      }, 1200);
    }
  };

  const handleDeleteUser = (userId: string) => {
    const res = deleteUser(userId);
    if (!res.success) {
      alert(res.error || 'Failed to delete user.');
    }
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            Official Account & Role Registration
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Super Admin Portal: Register Tournament Administrators, Mat Officials, and Side Scorers with credentials.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setFormSuccess(null);
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Register New Official</span>
        </button>
      </div>

      {/* Role Isolation Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5">
          <div className="font-bold text-amber-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Super Admin Authority
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono">
              MASTER
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Exclusive authority to create championship events, toggle LIVE status, and register Tournament Admins, Officials & Scorers.
          </p>
        </div>

        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1.5">
          <div className="font-bold text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              Tournament Admin
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono">
              REGISTERABLE
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Authorized to manage player rosters, verify weights, lock categories, generate brackets, and download audit sheets.
          </p>
        </div>

        <div className="p-4 bg-sky-500/10 border border-sky-500/30 rounded-xl space-y-1.5">
          <div className="font-bold text-sky-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-sky-400" />
              Mat Official / Judge
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 font-mono">
              REGISTERABLE
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Assigned to dedicated Leitai platforms for live strike scoring, round timing, deductions, and winner confirmation.
          </p>
        </div>

        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-1.5">
          <div className="font-bold text-purple-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-purple-400" />
              Side Scorer / Judge
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono">
              REGISTERABLE
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Assigned to a specific Leitai arena for independent sideline scoring cards, corner strikes, and private judge consensus.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              System Official Directory ({users.length} Accounts)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Credentials strictly enforced</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Official Name</th>
                <th className="py-3 px-4">Username / Login ID</th>
                <th className="py-3 px-4">Role Permission</th>
                <th className="py-3 px-4">Assigned Leitai</th>
                <th className="py-3 px-4">Security Password</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map(u => {
                const isCurrent = currentUser.id === u.id;
                const isSuper = u.role === 'super_admin';
                return (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{u.name}</span>
                        {isCurrent && (
                          <span className="text-[9px] font-mono-tabular px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded font-bold">
                            CURRENT
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                      <div>{u.username || u.email.split('@')[0]}</div>
                      <div className="text-[10px] text-slate-500">{u.email}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {u.role === 'super_admin' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Super Admin
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={u.role}
                            onChange={e => {
                              const newRole = e.target.value as UserRole;
                              const isRingRole = newRole === 'official' || newRole === 'sideline_judge';
                              updateUser(u.id, {
                                role: newRole,
                                assignedRing: isRingRole ? (u.assignedRing || event.rings[0]) : undefined,
                                ringAssignment: isRingRole ? (u.assignedRing || event.rings[0]) : undefined,
                              });
                            }}
                            className={`border rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none cursor-pointer ${
                              u.role === 'admin'
                                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                                : u.role === 'sideline_judge'
                                ? 'bg-purple-950/50 border-purple-700/60 text-purple-300'
                                : u.role === 'official'
                                ? 'bg-sky-950/50 border-sky-700/60 text-sky-300'
                                : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}
                          >
                            <option value="admin">Tournament Admin</option>
                            <option value="official">Mat Official (Table)</option>
                            <option value="sideline_judge">Side Scorer (Judge)</option>
                            <option value="general_view">General View</option>
                          </select>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {u.role === 'official' || (u.role as string) === 'sideline_judge' ? (
                        <select
                          value={u.assignedRing || ''}
                          onChange={e => updateUser(u.id, { assignedRing: e.target.value || undefined, ringAssignment: e.target.value || undefined })}
                          className={`border rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500 cursor-pointer ${
                            !u.assignedRing ? 'bg-amber-950/40 border-amber-800 text-amber-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          <option value="">-- No Arena (Unassigned) --</option>
                          {event.rings.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-500 text-[11px]">All Platforms</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {u.password ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800 text-amber-300 font-mono">
                            {revealedPasswordId === u.id ? u.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedPasswordId(revealedPasswordId === u.id ? null : u.id)
                            }
                            className="text-slate-500 hover:text-amber-400 p-0.5 cursor-pointer transition-colors"
                            title={revealedPasswordId === u.id ? 'Hide Password' : 'Show Password'}
                          >
                            {revealedPasswordId === u.id ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Default</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {isSuper ? (
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          Protected Root
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {deleteConfirmId === u.id ? (
                            <div className="flex items-center gap-1.5 animate-fadeIn">
                              <span className="text-[10px] text-rose-400 font-bold">Delete?</span>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(u.id)}
                              title="Delete Official Account"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/40 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Super Admin Registration Modal: TOURNAMENT ADMIN, MAT OFFICIAL & SIDE SCORER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base tracking-tight">
                    Register Official Account
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Authorized roles: Tournament Admin, Mat Official & Side Scorer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddOfficial} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Official Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Zhang Wei or Judge John Doe"
                  value={newUserData.name}
                  onChange={e => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Username / Login ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. official3"
                    value={newUserData.username}
                    onChange={e => setNewUserData({ ...newUserData, username: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Email Address</label>
                  <input
                    type="email"
                    placeholder="official@wushu.org"
                    value={newUserData.email}
                    onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold flex items-center justify-between">
                  <span>Initial Security Password *</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-slate-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimum 4 characters"
                  value={newUserData.password}
                  onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              {/* ROLE SELECTION: Tournament Admin, Mat Official, OR Side Scorer */}
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Official Role Permission *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewUserData({ ...newUserData, role: 'admin' })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      newUserData.role === 'admin'
                        ? 'bg-emerald-950/60 border-emerald-400 text-white ring-1 ring-emerald-400/40 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Admin</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Roster, brackets & fixtures
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewUserData({ ...newUserData, role: 'official' })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      newUserData.role === 'official'
                        ? 'bg-sky-950/60 border-sky-400 text-white ring-1 ring-sky-400/40 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-sky-400">
                      <Award className="w-3.5 h-3.5" />
                      <span>Mat Official</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Table console & match referee
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewUserData({ ...newUserData, role: 'sideline_judge' })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      newUserData.role === 'sideline_judge'
                        ? 'bg-purple-950/60 border-purple-400 text-white ring-1 ring-purple-400/40 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-purple-400">
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>Side Scorer</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Independent sideline judge cards
                    </div>
                  </button>
                </div>
              </div>

              {(newUserData.role === 'official' || newUserData.role === 'sideline_judge') && (
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold flex items-center justify-between">
                    <span>Assigned Leitai Platform Arena *</span>
                    <span className="text-[10px] text-amber-400 font-normal">Arena-locked access</span>
                  </label>
                  <select
                    value={newUserData.assignedRing}
                    onChange={e => setNewUserData({ ...newUserData, assignedRing: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {event.rings.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {newUserData.role === 'sideline_judge'
                      ? 'The side scorer will exclusively see and record scoring cards for bouts on this arena.'
                      : 'The official will be designated to manage this Leitai platform.'}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  Register Official
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
