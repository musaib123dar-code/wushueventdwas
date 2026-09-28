import React, { useState, useMemo } from 'react';
import { Bracket, Bout, Category, Player } from '../../types/tournament';
import {
  X,
  ArrowRightLeft,
  AlertTriangle,
  User,
  Shield,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface MovePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceBout: Bout;
  sourceCorner: 'red' | 'blue';
  bracket: Bracket;
  category?: Category;
  players: Player[];
  onConfirmMove: (
    destBoutId: string,
    destCorner: 'red' | 'blue',
    sourceBout: Bout,
    destBout: Bout
  ) => void;
  onConfirmSwap: (
    destBoutId: string,
    destCorner: 'red' | 'blue',
    sourceBout: Bout,
    destBout: Bout
  ) => void;
}

export const MovePlayerModal: React.FC<MovePlayerModalProps> = ({
  isOpen,
  onClose,
  sourceBout,
  sourceCorner,
  bracket,
  category,
  players,
  onConfirmMove,
  onConfirmSwap,
}) => {
  // Source player details
  const sourcePlayerId = sourceCorner === 'red' ? sourceBout.redPlayerId : sourceBout.bluePlayerId;
  const sourcePlayerName = sourceCorner === 'red' ? sourceBout.redPlayerName : sourceBout.bluePlayerName;
  const sourcePlayerClub = sourceCorner === 'red' ? sourceBout.redClub : sourceBout.blueClub;

  const matchedPlayer = useMemo(() => {
    return players.find(p => p.id === sourcePlayerId);
  }, [players, sourcePlayerId]);

  const regNumber = matchedPlayer?.registrationNumber || 'WUS-REG';

  // Candidate destination bouts (must be valid, uncompleted, unlocked, and non-live)
  const candidateBouts = useMemo(() => {
    const list: { roundName: string; bout: Bout }[] = [];
    bracket.rounds.forEach(round => {
      round.bouts.forEach(b => {
        const isLocked =
          b.resultLocked ||
          b.status.startsWith('winner_') ||
          b.status === 'completed' ||
          b.status === 'live';

        if (!isLocked) {
          list.push({ roundName: round.roundName, bout: b });
        }
      });
    });
    return list;
  }, [bracket]);

  // Selected destination bout ID & corner
  const [selectedBoutId, setSelectedBoutId] = useState<string>(() => {
    // Default to the first candidate bout that isn't the source bout if available
    const otherBout = candidateBouts.find(cb => cb.bout.id !== sourceBout.id);
    return otherBout ? otherBout.bout.id : sourceBout.id;
  });

  const [selectedCorner, setSelectedCorner] = useState<'red' | 'blue'>(() => {
    // Default to opposite corner if same bout, or 'red'
    return sourceCorner === 'red' ? 'blue' : 'red';
  });

  const selectedDestinationBout = useMemo(() => {
    for (const round of bracket.rounds) {
      const found = round.bouts.find(b => b.id === selectedBoutId);
      if (found) return found;
    }
    return null;
  }, [bracket, selectedBoutId]);

  // Destination corner state
  const destIsOccupied = useMemo(() => {
    if (!selectedDestinationBout) return false;
    if (selectedCorner === 'red') {
      return Boolean(selectedDestinationBout.redPlayerId || selectedDestinationBout.redPlayerName);
    } else {
      return Boolean(selectedDestinationBout.bluePlayerId || selectedDestinationBout.bluePlayerName);
    }
  }, [selectedDestinationBout, selectedCorner]);

  const destOccupantName = useMemo(() => {
    if (!selectedDestinationBout) return null;
    if (selectedCorner === 'red') {
      return selectedDestinationBout.redPlayerName;
    } else {
      return selectedDestinationBout.bluePlayerName;
    }
  }, [selectedDestinationBout, selectedCorner]);

  const destOccupantClub = useMemo(() => {
    if (!selectedDestinationBout) return null;
    if (selectedCorner === 'red') {
      return selectedDestinationBout.redClub;
    } else {
      return selectedDestinationBout.blueClub;
    }
  }, [selectedDestinationBout, selectedCorner]);

  const destIsBye = useMemo(() => {
    if (!selectedDestinationBout) return false;
    if (selectedCorner === 'red') {
      return selectedDestinationBout.isBye && !selectedDestinationBout.redPlayerId;
    } else {
      return selectedDestinationBout.isBye && !selectedDestinationBout.bluePlayerId;
    }
  }, [selectedDestinationBout, selectedCorner]);

  // Check if target is the identical position
  const isSamePosition = selectedBoutId === sourceBout.id && selectedCorner === sourceCorner;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDestinationBout || isSamePosition) return;

    if (destIsOccupied && destOccupantName && !destIsBye) {
      onConfirmSwap(selectedBoutId, selectedCorner, sourceBout, selectedDestinationBout);
    } else {
      onConfirmMove(selectedBoutId, selectedCorner, sourceBout, selectedDestinationBout);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-cinzel">
                MOVE PLAYER
              </h3>
              <p className="text-[11px] text-slate-400">
                Super Admin Fixture Adjustment · {category?.name || 'Tournament Bracket'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-xs">
          {/* Current Source Player Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Selected Fighter
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{sourcePlayerName || 'Fighter'}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                  <span>Reg: <strong className="text-amber-300 font-mono">{regNumber}</strong></span>
                  <span>·</span>
                  <span>Club: <strong className="text-slate-300">{sourcePlayerClub || matchedPlayer?.clubSchool || matchedPlayer?.district || 'Independent'}</strong></span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[10px] text-slate-400">Current Position</div>
                <div className="text-xs font-mono font-bold text-amber-400">
                  {sourceBout.boutNumber} ·{' '}
                  <span className={sourceCorner === 'red' ? 'text-red-400' : 'text-blue-400'}>
                    {sourceCorner.toUpperCase()}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">{sourceBout.roundName}</div>
              </div>
            </div>
          </div>

          {/* Destination Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-xs">
                Destination Bout
              </label>
              <select
                value={selectedBoutId}
                onChange={e => setSelectedBoutId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-medium"
              >
                {candidateBouts.map(({ roundName, bout: b }) => (
                  <option key={b.id} value={b.id}>
                    {b.boutNumber} ({roundName}) — {b.ring} [Red: {b.redPlayerName || (b.isBye && !b.redPlayerId ? 'BYE' : 'Empty')} vs Blue: {b.bluePlayerName || (b.isBye && !b.bluePlayerId ? 'BYE' : 'Empty')}]
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Only unplayed and unlocked bouts within this category fixture are available.
              </p>
            </div>

            {/* Destination Position: [ RED ] or [ BLUE ] */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                Destination Position
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Red Position Option */}
                <button
                  type="button"
                  onClick={() => setSelectedCorner('red')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedCorner === 'red'
                      ? 'bg-red-950/40 border-red-500 ring-1 ring-red-500/50 shadow-md shadow-red-950/50'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      <span className="font-bold text-red-400 text-xs">RED (Hong)</span>
                    </div>
                    {selectedCorner === 'red' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </div>
                  <div className="text-[11px] truncate">
                    {selectedDestinationBout?.redPlayerName ? (
                      <span className="text-white font-medium">
                        Occupied: {selectedDestinationBout.redPlayerName}
                      </span>
                    ) : selectedDestinationBout?.isBye && !selectedDestinationBout?.redPlayerId ? (
                      <span className="text-amber-400 font-semibold">BYE Slot</span>
                    ) : (
                      <span className="text-emerald-400 font-medium">Empty (Available)</span>
                    )}
                  </div>
                </button>

                {/* Blue Position Option */}
                <button
                  type="button"
                  onClick={() => setSelectedCorner('blue')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedCorner === 'blue'
                      ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50 shadow-md shadow-blue-950/50'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span className="font-bold text-blue-400 text-xs">BLUE (Hei)</span>
                    </div>
                    {selectedCorner === 'blue' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </div>
                  <div className="text-[11px] truncate">
                    {selectedDestinationBout?.bluePlayerName ? (
                      <span className="text-white font-medium">
                        Occupied: {selectedDestinationBout.bluePlayerName}
                      </span>
                    ) : selectedDestinationBout?.isBye && !selectedDestinationBout?.bluePlayerId ? (
                      <span className="text-amber-400 font-semibold">BYE Slot</span>
                    ) : (
                      <span className="text-emerald-400 font-medium">Empty (Available)</span>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Validation & Information Notices */}
          {isSamePosition && (
            <div className="p-3 bg-amber-950/50 border border-amber-500/40 rounded-xl text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Selected destination is the player&apos;s current position. Choose a different bout or corner.</span>
            </div>
          )}

          {!isSamePosition && destIsOccupied && destOccupantName && !destIsBye && (
            <div className="p-3.5 bg-blue-950/40 border border-blue-500/40 rounded-xl space-y-1 text-xs">
              <div className="flex items-center gap-2 text-blue-300 font-bold">
                <ArrowRightLeft className="w-4 h-4 text-amber-400 shrink-0" />
                <span>That position is already occupied by {destOccupantName}.</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
                Clicking <strong>Swap Players</strong> will atomically exchange positions:
                <br />
                <span className="text-amber-300">• {sourcePlayerName}</span> → {selectedDestinationBout?.boutNumber} {selectedCorner.toUpperCase()}
                <br />
                <span className="text-blue-300">• {destOccupantName}</span> → {sourceBout.boutNumber} {sourceCorner.toUpperCase()}
              </p>
            </div>
          )}

          {!isSamePosition && (!destIsOccupied || destIsBye) && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Position is open. Moving <strong className="text-white">{sourcePlayerName}</strong> will vacate {sourceBout.boutNumber} and place them into {selectedDestinationBout?.boutNumber} ({selectedCorner.toUpperCase()}).
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {destIsOccupied && destOccupantName && !destIsBye ? (
              <button
                type="submit"
                disabled={isSamePosition}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 rounded-lg shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Swap Players</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSamePosition}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <span>Move Player</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
