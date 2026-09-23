import React, { useState, useMemo } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Player } from '../../types/tournament';
import { calculateAge, formatDate } from '../../utils/tournamentHelpers';
import {
  UserPlus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Eye,
  CheckCircle,
  AlertCircle,
  X,
  FileSpreadsheet,
  ShieldAlert,
} from 'lucide-react';

export const PlayerRegistry: React.FC = () => {
  const {
    players,
    addPlayer,
    updatePlayer,
    deletePlayer,
    event,
    role,
    ageCategories,
    weightCategories,
    exportDataAsCSV,
  } = useTournament();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    registrationNumber: '',
    name: '',
    fatherName: '',
    dob: '2004-05-15',
    gender: 'male' as 'male' | 'female',
    weightKg: 58.5,
    clubSchool: '',
    district: '',
    stateRegion: '',
    contactNumber: '',
    aadharNumber: '',
    status: 'weighed_in' as Player['status'],
  });

  // Calculate age dynamically against tournament reference date
  const dynamicAge = useMemo(() => {
    return calculateAge(formData.dob, event.tournamentReferenceDate);
  }, [formData.dob, event.tournamentReferenceDate]);

  // Unique districts for filter dropdown
  const uniqueDistricts = useMemo(() => {
    const set = new Set<string>();
    players.forEach(p => {
      if (p.district) set.add(p.district);
    });
    return Array.from(set).sort();
  }, [players]);

  // Filtered players list
  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.registrationNumber.toLowerCase().includes(q) ||
        p.clubSchool.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.stateRegion.toLowerCase().includes(q);

      const matchesGender = selectedGender === 'all' || p.gender === selectedGender;
      const matchesDistrict = selectedDistrict === 'all' || p.district === selectedDistrict;

      return matchesSearch && matchesGender && matchesDistrict;
    });
  }, [players, searchQuery, selectedGender, selectedDistrict]);

  const openAddModal = () => {
    const nextRegNo = `WUS-${new Date().getFullYear()}-${String(players.length + 101).padStart(4, '0')}`;
    setFormData({
      registrationNumber: nextRegNo,
      name: '',
      fatherName: '',
      dob: '2004-06-20',
      gender: 'male',
      weightKg: 59.0,
      clubSchool: 'Delhi Tigers Martial Arts Academy',
      district: 'Central Delhi',
      stateRegion: 'Delhi',
      contactNumber: '+91 98000 12345',
      aadharNumber: '4567 8901 2345',
      status: 'weighed_in',
    });
    setEditingPlayer(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (player: Player) => {
    setFormData({
      registrationNumber: player.registrationNumber,
      name: player.name,
      fatherName: player.fatherName,
      dob: player.dob,
      gender: player.gender,
      weightKg: player.weightKg,
      clubSchool: player.clubSchool,
      district: player.district,
      stateRegion: player.stateRegion,
      contactNumber: player.contactNumber,
      aadharNumber: player.aadharNumber,
      status: player.status,
    });
    setEditingPlayer(player);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Player full name is required.');
      return;
    }
    if (!formData.registrationNumber.trim()) {
      setFormError('Registration / Player ID is required.');
      return;
    }
    if (formData.weightKg <= 0) {
      setFormError('Valid weight is required.');
      return;
    }

    if (editingPlayer) {
      const res = updatePlayer(editingPlayer.id, formData);
      if (!res.success) {
        setFormError(res.error || 'Failed to update player');
        return;
      }
    } else {
      const res = addPlayer(formData);
      if (!res.success) {
        setFormError(res.error || 'Failed to add player');
        return;
      }
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const res = deletePlayer(id);
    if (!res.success) {
      alert(res.error);
    }
    setDeleteConfirmId(null);
  };

  const canEdit = role === 'super_admin' || role === 'admin' || role === 'official';
  const canDelete = role === 'super_admin';

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Player Registration Database
          </h1>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span>{players.length} Total Registered Athletes</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="text-amber-400 font-mono-tabular">
              Reference Date for Age: {event.tournamentReferenceDate}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportDataAsCSV('players')}
            className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          {canEdit && (
            <button
              onClick={openAddModal}
              className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/10"
            >
              <UserPlus className="w-4 h-4" />
              <span>Manual Registration</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by player name, registration #, club, district..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Gender Filter */}
          <select
            value={selectedGender}
            onChange={e => setSelectedGender(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Genders</option>
            <option value="male">Male (Men / Boys)</option>
            <option value="female">Female (Women / Girls)</option>
          </select>

          {/* District Filter */}
          <select
            value={selectedDistrict}
            onChange={e => setSelectedDistrict(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Districts</option>
            {uniqueDistricts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {(searchQuery || selectedGender !== 'all' || selectedDistrict !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGender('all');
                setSelectedDistrict('all');
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Reg No</th>
                <th className="py-3 px-4">Fighter Name</th>
                <th className="py-3 px-4">Father / Parent</th>
                <th className="py-3 px-4">DOB</th>
                <th className="py-3 px-4">Age on Event Date</th>
                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">Weight</th>
                <th className="py-3 px-4">Club / School</th>
                <th className="py-3 px-4">District / State</th>
                <th className="py-3 px-4">Aadhar ID</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map(p => {
                  const age = calculateAge(p.dob, event.tournamentReferenceDate);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono-tabular text-amber-400 font-semibold whitespace-nowrap">
                        {p.registrationNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-100 whitespace-nowrap">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {p.fatherName || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-400 whitespace-nowrap">
                        {p.dob}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-200 font-semibold whitespace-nowrap">
                        {age} yrs
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap capitalize text-slate-300">
                        {p.gender}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-200 font-semibold whitespace-nowrap">
                        {p.weightKg.toFixed(1)} kg
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-[160px] truncate" title={p.clubSchool}>
                        {p.clubSchool}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {p.district}, {p.stateRegion}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-500 whitespace-nowrap">
                        {p.aadharNumber ? `•••• ${p.aadharNumber.slice(-4)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                              title="Edit Fighter"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteConfirmId(p.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                              title="Delete (Super Admin only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!canEdit && (
                            <span className="text-[11px] text-slate-600">Read only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    No matching players found for the current search/filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-bold text-white text-sm">Delete Player Record?</h3>
            </div>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              This action is permitted solely for Super Admin. The player will be removed permanently from the registry.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium text-xs rounded-lg transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Registration / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingPlayer ? 'Edit Player Information' : 'Manual Player Registration Form'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Age will be computed against tournament reference date ({event.tournamentReferenceDate}).
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Reg Number */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Player ID / Reg Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.registrationNumber}
                    onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono-tabular"
                  />
                </div>

                {/* Player Name */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Player Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Father / Parent Name */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Father's / Parent's Name
                  </label>
                  <input
                    type="text"
                    value={formData.fatherName}
                    onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* DOB & Dynamic Age Calculation */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Date of Birth (DOB) *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      required
                      value={formData.dob}
                      onChange={e => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono-tabular"
                    />
                    <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg whitespace-nowrap text-amber-400 font-mono-tabular font-bold">
                      {dynamicAge} yrs
                    </div>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="male">Male (Men / Boys)</option>
                    <option value="female">Female (Women / Girls)</option>
                  </select>
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Official Weighed Weight (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.weightKg}
                    onChange={e => setFormData({ ...formData, weightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono-tabular"
                  />
                </div>

                {/* Club / School */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Club / School *</label>
                  <input
                    type="text"
                    required
                    value={formData.clubSchool}
                    onChange={e => setFormData({ ...formData, clubSchool: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* District */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">District *</label>
                  <input
                    type="text"
                    required
                    value={formData.district}
                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* State / Region */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">State / Region *</label>
                  <input
                    type="text"
                    required
                    value={formData.stateRegion}
                    onChange={e => setFormData({ ...formData, stateRegion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Contact Number</label>
                  <input
                    type="text"
                    value={formData.contactNumber}
                    onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Aadhar Number */}
                <div className="md:col-span-2">
                  <label className="block text-slate-400 mb-1 font-medium">
                    Aadhar Number (12 Digits) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.aadharNumber}
                    onChange={e => setFormData({ ...formData, aadharNumber: e.target.value })}
                    placeholder="XXXX XXXX XXXX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono-tabular"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors shadow-md shadow-amber-500/20"
                >
                  {editingPlayer ? 'Update Fighter' : 'Save & Register Fighter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
