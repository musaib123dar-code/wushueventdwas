import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Search,
  UserCheck,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';
import {
  downloadPlayerExcelTemplate,
  parsePlayerExcelFile,
  ParsedPlayersResult,
} from '../../utils/excelMasterHelper';
import { calculateAge } from '../../utils/tournamentHelpers';
import { Player } from '../../types/tournament';

interface BulkPlayerUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BulkPlayerUploadModal: React.FC<BulkPlayerUploadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { players, bulkAddPlayers, event } = useTournament();

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedPlayersResult | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [previewSearch, setPreviewSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process selected file
  const handleFileProcess = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const res = parsePlayerExcelFile(buffer);
      setParseResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setParseResult({
        validPlayers: [],
        rowDetails: [],
        totalRows: 0,
        errors: [`Failed to parse file: ${msg}`],
        warnings: [],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileProcess(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileProcess(file);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Compare against existing players
  const existingRegMap = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach(p => {
      map.set(p.registrationNumber.trim().toLowerCase(), p);
    });
    return map;
  }, [players]);

  const existingAadharMap = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach(p => {
      if (p.aadharNumber) {
        map.set(p.aadharNumber.trim().toLowerCase(), p);
      }
    });
    return map;
  }, [players]);

  // Breakdown of players in current file
  const fileStats = useMemo(() => {
    if (!parseResult) return { newCount: 0, duplicateCount: 0, totalValid: 0 };
    let newCount = 0;
    let duplicateCount = 0;

    parseResult.validPlayers.forEach(p => {
      const regKey = p.registrationNumber.trim().toLowerCase();
      const aadharKey = (p.aadharNumber || '').trim().toLowerCase();
      const isDup =
        importMode === 'append' &&
        (existingRegMap.has(regKey) || (aadharKey && existingAadharMap.has(aadharKey)));

      if (isDup) {
        duplicateCount++;
      } else {
        newCount++;
      }
    });

    return {
      newCount,
      duplicateCount,
      totalValid: parseResult.validPlayers.length,
    };
  }, [parseResult, importMode, existingRegMap, existingAadharMap]);

  // Filtered rows for live preview
  const filteredPreviewRows = useMemo(() => {
    if (!parseResult) return [];
    if (!previewSearch.trim()) return parseResult.validPlayers;

    const q = previewSearch.toLowerCase();
    return parseResult.validPlayers.filter(p => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.registrationNumber.toLowerCase().includes(q) ||
        p.clubSchool.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.gender.toLowerCase().includes(q)
      );
    });
  }, [parseResult, previewSearch]);

  const handleConfirmImport = () => {
    if (!parseResult || parseResult.validPlayers.length === 0) return;

    const isReplace = importMode === 'replace';
    const res = bulkAddPlayers(parseResult.validPlayers, isReplace);

    setSuccessMessage(
      isReplace
        ? `Successfully replaced player registry with ${res.added} athletes!`
        : `Successfully registered ${res.added} athletes! ${
            res.duplicates > 0 ? `(${res.duplicates} existing duplicates skipped)` : ''
          }`
    );

    setTimeout(() => {
      onClose();
      handleReset();
    }, 1800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Bulk Player Registration
                <span className="text-[10px] px-2 py-0.5 font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  Excel & CSV
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Upload your athlete roster spreadsheet to register competitors automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadPlayerExcelTemplate}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
              title="Download pre-formatted Excel template with sample rows"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download Template</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="font-semibold">{successMessage}</div>
            </div>
          )}

          {/* Quick instructions / Template download banner for mobile */}
          <div className="sm:hidden flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <span className="text-slate-400">Need the official format?</span>
            <button
              onClick={downloadPlayerExcelTemplate}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
            >
              <Download className="w-3 h-3" />
              <span>Get Template</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center group ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700/80 hover:border-emerald-500/60 bg-slate-950/40 hover:bg-slate-950/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all">
                <Upload className="w-7 h-7" />
              </div>

              <h3 className="text-sm font-semibold text-white mb-1">
                Drop your Excel spreadsheet here, or <span className="text-emerald-400 underline underline-offset-2">browse</span>
              </h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
                Supports <span className="text-slate-300 font-mono text-[11px]">.xlsx</span>,{' '}
                <span className="text-slate-300 font-mono text-[11px]">.xls</span>, and{' '}
                <span className="text-slate-300 font-mono text-[11px]">.csv</span> files.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400 bg-slate-900/90 py-1.5 px-3.5 rounded-full border border-slate-800">
                <span>Columns: Name, DOB, Gender, Weight, Club, District, Reg ID</span>
              </div>
            </div>
          ) : (
            /* File Loaded & Parsed Status Bar */
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB ·{' '}
                    {parseResult ? `${parseResult.validPlayers.length} athletes detected` : 'Processing...'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Choose Another File</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Parsing State */}
          {isProcessing && (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing spreadsheet columns and computing athlete age divisions...</span>
            </div>
          )}

          {/* Results Summary & Configuration */}
          {parseResult && !isProcessing && (
            <div className="space-y-4">
              {/* Errors Display */}
              {parseResult.errors.length > 0 && (
                <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-red-200">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span>Upload Error</span>
                  </div>
                  {parseResult.errors.map((err, i) => (
                    <div key={i} className="text-red-300/90 pl-6">
                      {err}
                    </div>
                  ))}
                </div>
              )}

              {/* Stats Cards */}
              {parseResult.validPlayers.length > 0 && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                      <div className="text-[11px] text-slate-400">Total In Sheet</div>
                      <div className="text-lg font-bold text-white mt-0.5 font-mono-tabular">
                        {parseResult.totalRows}
                      </div>
                    </div>

                    <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3">
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready to Import</span>
                      </div>
                      <div className="text-lg font-bold text-emerald-300 mt-0.5 font-mono-tabular">
                        {fileStats.newCount}
                      </div>
                    </div>

                    <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3">
                      <div className="text-[11px] text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Existing / Duplicate</span>
                      </div>
                      <div className="text-lg font-bold text-amber-300 mt-0.5 font-mono-tabular">
                        {fileStats.duplicateCount}
                      </div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                      <div className="text-[11px] text-slate-400">Reference Age Date</div>
                      <div className="text-xs font-semibold text-amber-400 mt-1 font-mono-tabular truncate">
                        {event.tournamentReferenceDate}
                      </div>
                    </div>
                  </div>

                  {/* Import Mode Selector */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-white">Import Mode:</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setImportMode('append')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          importMode === 'append'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        Append New Athletes (Safe)
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          importMode === 'replace'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        Replace Entire Roster
                      </button>
                    </div>
                  </div>

                  {importMode === 'replace' && (
                    <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>
                        Caution: "Replace" will remove all existing {players.length} players currently in the system and load only the athletes from this file.
                      </span>
                    </div>
                  )}

                  {/* Preview Table Header */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>Athlete Preview</span>
                        <span className="text-slate-400 text-[11px] font-normal">
                          ({filteredPreviewRows.length} athletes shown)
                        </span>
                      </div>

                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Filter preview by name, club..."
                          value={previewSearch}
                          onChange={e => setPreviewSearch(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Preview Table */}
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold text-[10px] uppercase sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Reg ID</th>
                            <th className="py-2.5 px-3">Fighter Name</th>
                            <th className="py-2.5 px-3">Parent / Father</th>
                            <th className="py-2.5 px-3">DOB & Age</th>
                            <th className="py-2.5 px-3">Gender</th>
                            <th className="py-2.5 px-3">Weight</th>
                            <th className="py-2.5 px-3">Club / School</th>
                            <th className="py-2.5 px-3">District</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredPreviewRows.length > 0 ? (
                            filteredPreviewRows.map((p, idx) => {
                              const age = calculateAge(p.dob, event.tournamentReferenceDate);
                              const regKey = p.registrationNumber.trim().toLowerCase();
                              const aadharKey = (p.aadharNumber || '').trim().toLowerCase();
                              const isDuplicate =
                                importMode === 'append' &&
                                (existingRegMap.has(regKey) ||
                                  (aadharKey && existingAadharMap.has(aadharKey)));

                              return (
                                <tr
                                  key={idx}
                                  className={`hover:bg-slate-800/40 transition-colors ${
                                    isDuplicate ? 'opacity-60 bg-amber-500/5' : ''
                                  }`}
                                >
                                  <td className="py-2 px-3 whitespace-nowrap">
                                    {isDuplicate ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        Duplicate (Skip)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        Ready
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono-tabular text-amber-400 font-semibold whitespace-nowrap">
                                    {p.registrationNumber}
                                  </td>
                                  <td className="py-2 px-3 font-medium text-slate-100 whitespace-nowrap">
                                    {p.name}
                                  </td>
                                  <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                                    {p.fatherName || '—'}
                                  </td>
                                  <td className="py-2 px-3 font-mono-tabular text-slate-300 whitespace-nowrap">
                                    {p.dob}{' '}
                                    <span className="text-amber-400 font-semibold">({age}y)</span>
                                  </td>
                                  <td className="py-2 px-3 capitalize text-slate-300 whitespace-nowrap">
                                    {p.gender}
                                  </td>
                                  <td className="py-2 px-3 font-mono-tabular text-slate-200 font-semibold whitespace-nowrap">
                                    {p.weightKg.toFixed(1)} kg
                                  </td>
                                  <td className="py-2 px-3 text-slate-300 max-w-[140px] truncate" title={p.clubSchool}>
                                    {p.clubSchool}
                                  </td>
                                  <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                                    {p.district || '—'}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={9} className="py-6 text-center text-slate-500 text-xs">
                                No athlete records match the search filter.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {selectedFile && (
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Reset
              </button>
            )}

            <button
              type="button"
              disabled={!parseResult || fileStats.newCount === 0 || !!successMessage}
              onClick={handleConfirmImport}
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors shadow-md shadow-emerald-500/20 flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {importMode === 'replace'
                  ? `Replace & Import ${fileStats.totalValid} Athletes`
                  : `Confirm & Register ${fileStats.newCount} Athletes`}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
