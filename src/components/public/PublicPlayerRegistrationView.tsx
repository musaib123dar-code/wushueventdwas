import React, { useState, useMemo, useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Player, EventSetup } from '../../types/tournament';
import { calculateAge } from '../../utils/tournamentHelpers';
import { downloadPlayerIdCardPdf } from '../../utils/idCardPdfExport';
import { QRCodeSVG } from 'qrcode.react';
import {
  UserPlus,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  RotateCcw,
  ShieldCheck,
  Flame,
  Award,
  ArrowRight,
  Copy,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';

const JK_DISTRICTS = [
  'Srinagar',
  'Baramulla',
  'Budgam',
  'Anantnag',
  'Pulwama',
  'Ganderbal',
  'Kulgam',
  'Kupwara',
  'Bandipora',
  'Shopian',
  'Jammu',
  'Samba',
  'Kathua',
  'Udhampur',
  'Reasi',
  'Rajouri',
  'Poonch',
  'Doda',
  'Ramban',
  'Kishtwar',
  'Other District / State',
];

export const PublicPlayerRegistrationView: React.FC = () => {
  const { events, event: currentContextEvent, registerPublicPlayer } = useTournament();

  // Active / open events (filter out completed events)
  const openEvents = useMemo(() => {
    return events.filter(e => e.status !== 'completed');
  }, [events]);

  // Selected event ID
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    // Check if URL has ?event=... or hash
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlEvent = urlParams.get('event');
      if (urlEvent && openEvents.some(e => e.id === urlEvent)) {
        return urlEvent;
      }
    }
    return openEvents.find(e => e.id === currentContextEvent.id)?.id || openEvents[0]?.id || '';
  });

  // Keep selected event synced if openEvents changes and selected is invalid
  useEffect(() => {
    if (openEvents.length > 0 && !openEvents.some(e => e.id === selectedEventId)) {
      setSelectedEventId(openEvents[0].id);
    }
  }, [openEvents, selectedEventId]);

  const selectedEvent: EventSetup | undefined = useMemo(() => {
    return openEvents.find(e => e.id === selectedEventId) || openEvents[0];
  }, [openEvents, selectedEventId]);

  // Form input state
  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    dob: '2006-05-15',
    gender: 'male' as 'male' | 'female',
    weightKg: '',
    clubSchool: '',
    district: 'Srinagar',
    customDistrict: '',
    aadharNumber: '',
  });

  // Calculate age dynamically against selected event reference date
  const calculatedAge = useMemo(() => {
    if (!formData.dob) return 0;
    const refDate = selectedEvent?.tournamentReferenceDate || new Date().toISOString().split('T')[0];
    return calculateAge(formData.dob, refDate);
  }, [formData.dob, selectedEvent?.tournamentReferenceDate]);

  // Submission & Confirmation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [registeredPlayer, setRegisteredPlayer] = useState<Player | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Validate form fields
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedEvent) {
      errors.event = 'Please select an official event to register.';
    }

    if (!formData.name.trim()) {
      errors.name = 'Player Full Name is mandatory.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Full Name must be at least 2 characters.';
    }

    if (!formData.fatherName.trim()) {
      errors.fatherName = 'Parentage (Father Name) is mandatory.';
    }

    if (!formData.dob) {
      errors.dob = 'Date of birth is mandatory.';
    } else {
      const birthYear = new Date(formData.dob).getFullYear();
      const currentYear = new Date().getFullYear();
      if (birthYear > currentYear || birthYear < 1960) {
        errors.dob = 'Please enter a valid realistic date of birth.';
      }
    }

    const weightNum = parseFloat(formData.weightKg);
    if (!formData.weightKg || isNaN(weightNum) || weightNum <= 0) {
      errors.weightKg = 'Weight must be a positive number in kg.';
    } else if (weightNum < 15 || weightNum > 150) {
      errors.weightKg = 'Please enter a realistic tournament weight (15kg - 150kg).';
    }

    if (!formData.clubSchool.trim()) {
      errors.clubSchool = 'Academy or Club Name is mandatory (or enter Independent).';
    }

    const activeDistrict = formData.district === 'Other District / State' ? formData.customDistrict : formData.district;
    if (!activeDistrict || !activeDistrict.trim()) {
      errors.district = 'District is mandatory.';
    }

    if (formData.aadharNumber.trim()) {
      const cleanAadhar = formData.aadharNumber.replace(/\s+/g, '');
      if (!/^\d{12}$/.test(cleanAadhar)) {
        errors.aadharNumber = 'Aadhaar ID must be a 12-digit number (e.g. 1234 5678 9012).';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      setFormError('Please correct the highlighted errors before submitting.');
      return;
    }

    if (!selectedEvent) {
      setFormError('No active event selected.');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalDistrict =
        formData.district === 'Other District / State'
          ? formData.customDistrict.trim() || 'Other'
          : formData.district;

      const res = await registerPublicPlayer({
        eventId: selectedEvent.id,
        name: formData.name.trim(),
        fatherName: formData.fatherName.trim(),
        dob: formData.dob,
        gender: formData.gender,
        weightKg: parseFloat(formData.weightKg),
        clubSchool: formData.clubSchool.trim(),
        district: finalDistrict,
        aadharNumber: formData.aadharNumber.trim() ? formData.aadharNumber.replace(/\s+/g, '') : undefined,
      });

      if (!res.success || !res.player) {
        setFormError(res.error || 'Registration failed. Please check your details and try again.');
        setIsSubmitting(false);
        return;
      }

      // Success! Set confirmed player for Event ID card display
      setRegisteredPlayer(res.player);
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred during registration.');
      setIsSubmitting(false);
    }
  };

  // Reset to register another player
  const handleRegisterAnother = () => {
    setRegisteredPlayer(null);
    setFormData({
      name: '',
      fatherName: '',
      dob: '2006-05-15',
      gender: 'male',
      weightKg: '',
      clubSchool: '',
      district: 'Srinagar',
      customDistrict: '',
      aadharNumber: '',
    });
    setFormError(null);
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!registeredPlayer || !selectedEvent) return;
    setIsDownloadingPdf(true);
    try {
      await downloadPlayerIdCardPdf(registeredPlayer, selectedEvent, calculatedAge);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Print ID Card
  const handlePrintCard = () => {
    document.body.classList.add('printing-id-card');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-id-card');
    }, 1000);
  };

  // Copy registration link
  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const directUrl = `${window.location.origin}${window.location.pathname}#register`;
    navigator.clipboard.writeText(directUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>DISTRICT WUSHU ASSOCIATION SRINAGAR</span>
        </div>
        <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
          PLAYER REGISTRATION
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Register for an available District Wushu Association Srinagar event.
        </p>

        {/* Share direct registration link */}
        <div className="pt-1 flex items-center justify-center">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-xs text-slate-300 transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Registration URL Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Share Public Registration Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* SUCCESS CONFIRMATION & EVENT ID CARD DISPLAY                */}
      {/* ----------------------------------------------------------- */}
      {registeredPlayer && selectedEvent ? (
        <div className="space-y-6 animate-in zoom-in-95 duration-300">
          {/* Success Banner */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/50 shadow-xl space-y-3">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <span>REGISTRATION CONFIRMED & RECORDED</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-[10px] text-emerald-300">
                    Official
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Welcome, {registeredPlayer.name}!
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your registration has been saved to the official District Wushu Association Srinagar tournament registry. Your unique registration number and official Event ID Card have been generated below.
                </p>
              </div>
            </div>

            {/* Permanent Registration Number Highlight */}
            <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Permanent Registration Number
                </div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-amber-400 tracking-wider">
                  {registeredPlayer.registrationNumber}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Event
                </div>
                <div className="text-sm font-semibold text-slate-200">
                  {selectedEvent.name}
                </div>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">
              Save or print your official tournament credential card:
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download ID Card (PDF)'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCard}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-700 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                <span>Print ID Card</span>
              </button>

              <button
                type="button"
                onClick={handleRegisterAnother}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white font-medium rounded-xl text-xs flex items-center gap-1.5 border border-slate-800 cursor-pointer transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Register Another Player</span>
              </button>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* OFFICIAL EVENT PLAYER ID CARD (Print & On-Screen Layout)    */}
          {/* ----------------------------------------------------------- */}
          <div className="flex justify-center">
            <div
              id="printable-event-id-card"
              className="w-full max-w-xl rounded-2xl overflow-hidden bg-slate-900 border-2 border-amber-600/80 shadow-2xl relative select-none print:shadow-none print:border-2 print:border-black"
              style={{ minHeight: '340px' }}
            >
              {/* Card Gold Trim Accent */}
              <div className="h-2 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

              {/* Card Header Section */}
              <div className="bg-slate-950/90 px-5 pt-4 pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-amber-600 to-amber-500 p-0.5 shrink-0 shadow-md">
                      <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-amber-400 font-bold">
                        <Flame className="w-5 h-5 text-amber-400" />
                      </div>
                    </div>
                    <div>
                      <div className="font-cinzel text-xs sm:text-sm font-bold text-amber-400 tracking-wider">
                        DISTRICT WUSHU ASSOCIATION SRINAGAR
                      </div>
                      <div className="text-[11px] font-semibold text-white tracking-wide uppercase line-clamp-1">
                        {selectedEvent.name}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>
                          {selectedEvent.venue ? `${selectedEvent.venue}, ` : ''}
                          {selectedEvent.city || 'Srinagar, J&K'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code for Event Verification */}
                  <div className="p-1 bg-white rounded-lg shrink-0 shadow-sm">
                    <QRCodeSVG
                      value={`DWAS:${registeredPlayer.registrationNumber}:${registeredPlayer.name}:${selectedEvent.id}`}
                      size={52}
                      level="M"
                    />
                  </div>
                </div>

                {/* Registration Number Pill */}
                <div className="mt-3 py-1.5 px-3 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                    REGISTRATION NUMBER
                  </span>
                  <span className="font-mono text-sm sm:text-base font-extrabold text-amber-400 tracking-wider">
                    {registeredPlayer.registrationNumber}
                  </span>
                </div>
              </div>

              {/* Card Body - 2-Column Clean Key-Value Grid */}
              <div className="p-5 space-y-4 bg-slate-900/60">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  {/* Athlete Name */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Athlete Name
                    </span>
                    <div className="font-bold text-sm text-white uppercase truncate">
                      {registeredPlayer.name}
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Gender
                    </span>
                    <div className="font-bold text-sm text-slate-200 uppercase">
                      {registeredPlayer.gender}
                    </div>
                  </div>

                  {/* Parentage */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Parentage (Father)
                    </span>
                    <div className="font-medium text-slate-200 uppercase truncate">
                      {registeredPlayer.fatherName}
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Registered Weight
                    </span>
                    <div className="font-bold text-sm text-amber-400 font-mono">
                      {Number(registeredPlayer.weightKg).toFixed(1)} KG
                    </div>
                  </div>

                  {/* DOB */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Date of Birth
                    </span>
                    <div className="font-mono text-slate-200">
                      {registeredPlayer.dob}
                    </div>
                  </div>

                  {/* Calculated Age */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Verified Age
                    </span>
                    <div className="font-bold text-slate-200">
                      {calculatedAge} Years
                    </div>
                  </div>

                  {/* Club / Academy */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Club / Academy
                    </span>
                    <div className="font-medium text-slate-200 truncate">
                      {registeredPlayer.clubSchool}
                    </div>
                  </div>

                  {/* District */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      District
                    </span>
                    <div className="font-medium text-slate-200 truncate">
                      {registeredPlayer.district}
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>STATUS: VERIFIED & REGISTERED</span>
                  </div>

                  <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-semibold">
                    DISCIPLINE: SANDA LEITAI (IWUF)
                  </div>
                </div>
              </div>

              {/* Card Footer Bar */}
              <div className="bg-slate-950 px-5 py-2.5 border-t border-amber-600/40 text-center space-y-0.5">
                <div className="text-[11px] font-cinzel font-bold text-amber-400 tracking-wider uppercase">
                  OFFICIAL EVENT REGISTRATION CARD
                </div>
                <div className="text-[9px] text-slate-400">
                  Must be presented along with original proof of age at official weigh-in and Leitai medical check.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ----------------------------------------------------------- */
        /* REGISTRATION FORM                                           */
        /* ----------------------------------------------------------- */
        <div className="space-y-6">
          {/* STEP 1: EVENT SELECTION */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                1
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                  Select Championship Event <span className="text-amber-400">*</span>
                </h2>
                <div className="text-[11px] text-slate-400">
                  Choose the tournament in which you wish to participate.
                </div>
              </div>
            </div>

            {openEvents.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <div className="text-sm font-semibold text-slate-200">
                  No Active Tournaments Available
                </div>
                <p className="text-xs text-slate-400">
                  Registration is currently closed for all championships. Please check back soon or contact the District Wushu Association Srinagar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Available Championships:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {openEvents.map(ev => {
                    const isSelected = selectedEventId === ev.id;
                    return (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEventId(ev.id)}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/5'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-sm text-white leading-snug">
                            {ev.name}
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected
                                ? 'border-amber-400 bg-amber-500 text-slate-950'
                                : 'border-slate-700'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>

                        <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">{ev.venue ? `${ev.venue}, ` : ''}{ev.city || 'Srinagar'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>{ev.startDate} to {ev.endDate}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-amber-400/90 font-mono-tabular">
                            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Age Cutoff Reference: {ev.tournamentReferenceDate}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {fieldErrors.event && (
                  <p className="text-xs text-rose-400 font-semibold">{fieldErrors.event}</p>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: ATHLETE DETAILS FORM */}
          {selectedEvent && (
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                    Athlete Information
                  </h2>
                  <div className="text-[11px] text-slate-400">
                    Fields marked with an asterisk (<span className="text-amber-400">*</span>) are mandatory.
                  </div>
                </div>
              </div>

              {/* Form Global Error Notice */}
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>{formError}</div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Player Full Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Faizan Ahmad Wani"
                    value={formData.name}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, name: e.target.value }));
                      if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                    }}
                    className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors ${
                      fieldErrors.name ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-[11px] text-rose-400">{fieldErrors.name}</p>
                  )}
                </div>

                {/* 2. Parentage */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Parentage (Father's Full Name) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mohammad Shafi Wani"
                    value={formData.fatherName}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, fatherName: e.target.value }));
                      if (fieldErrors.fatherName) setFieldErrors(prev => ({ ...prev, fatherName: '' }));
                    }}
                    className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors ${
                      fieldErrors.fatherName ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  />
                  {fieldErrors.fatherName && (
                    <p className="text-[11px] text-rose-400">{fieldErrors.fatherName}</p>
                  )}
                </div>

                {/* 3. Date of Birth & Calculated Age */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-200">
                      Date of Birth <span className="text-amber-400">*</span>
                    </label>
                    <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      Age: {calculatedAge} Years
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, dob: e.target.value }));
                      if (fieldErrors.dob) setFieldErrors(prev => ({ ...prev, dob: '' }));
                    }}
                    className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors ${
                      fieldErrors.dob ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  />
                  <div className="text-[10px] text-slate-400">
                    Calculated automatically against cutoff date: {selectedEvent.tournamentReferenceDate}
                  </div>
                  {fieldErrors.dob && (
                    <p className="text-[11px] text-rose-400">{fieldErrors.dob}</p>
                  )}
                </div>

                {/* 4. Gender */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Gender <span className="text-amber-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        formData.gender === 'male'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                      }`}
                    >
                      Male (Boys / Men)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        formData.gender === 'female'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                      }`}
                    >
                      Female (Girls / Women)
                    </button>
                  </div>
                </div>

                {/* 5. Weight in Kilograms */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Weight in Kilograms (KG) <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="15"
                      max="150"
                      required
                      placeholder="e.g. 56.0"
                      value={formData.weightKg}
                      onChange={e => {
                        setFormData(prev => ({ ...prev, weightKg: e.target.value }));
                        if (fieldErrors.weightKg) setFieldErrors(prev => ({ ...prev, weightKg: '' }));
                      }}
                      className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono transition-colors ${
                        fieldErrors.weightKg ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-500 font-mono font-bold">
                      KG
                    </span>
                  </div>
                  {fieldErrors.weightKg && (
                    <p className="text-[11px] text-rose-400">{fieldErrors.weightKg}</p>
                  )}
                </div>

                {/* 6. Academy / Club */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Academy / Club / School Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Srinagar Wushu Club / Youth Sports"
                    value={formData.clubSchool}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, clubSchool: e.target.value }));
                      if (fieldErrors.clubSchool) setFieldErrors(prev => ({ ...prev, clubSchool: '' }));
                    }}
                    className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors ${
                      fieldErrors.clubSchool ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  />
                  {fieldErrors.clubSchool && (
                    <p className="text-[11px] text-rose-400">{fieldErrors.clubSchool}</p>
                  )}
                </div>

                {/* 7. District */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    District <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={formData.district}
                    onChange={e => setFormData(prev => ({ ...prev, district: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer transition-colors"
                  >
                    {JK_DISTRICTS.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  {formData.district === 'Other District / State' && (
                    <input
                      type="text"
                      placeholder="Specify your District / State"
                      value={formData.customDistrict}
                      onChange={e => setFormData(prev => ({ ...prev, customDistrict: e.target.value }))}
                      className="w-full mt-2 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  )}
                  {fieldErrors.district && (
                    <p className="text-[11px] text-rose-400">{fieldErrors.district}</p>
                  )}
                </div>

                {/* 8. Aadhaar ID Number */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-200">
                      Aadhaar ID Number (Optional)
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Private & Encrypted
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="1234 5678 9012"
                    value={formData.aadharNumber}
                    onChange={e => {
                      // Allow digits and auto format with spaces
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
                      const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
                      setFormData(prev => ({ ...prev, aadharNumber: formatted }));
                      if (fieldErrors.aadharNumber) setFieldErrors(prev => ({ ...prev, aadharNumber: '' }));
                    }}
                    className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono transition-colors ${
                      fieldErrors.aadharNumber ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  />
                  <div className="text-[10px] text-slate-400">
                    Aadhaar is used solely to prevent duplicate athlete registrations. It is never printed on the ID Card or shown publicly.
                  </div>
                  {fieldErrors.aadharNumber && (
                    <p className="text-[11px] text-rose-400">{fieldErrors.aadharNumber}</p>
                  )}
                </div>
              </div>

              {/* Submit Button & Anti-double-submit Guard */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Immediate verification & official ID card generation upon submit</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Validating & Storing Registration...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Complete Registration & Generate Event ID Card</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
