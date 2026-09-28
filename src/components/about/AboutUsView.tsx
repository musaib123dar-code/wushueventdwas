import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Flame,
  Award,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  GitFork,
  Swords,
  Users,
  Trophy,
  CheckCircle2,
} from 'lucide-react';

export const AboutUsView: React.FC = () => {
  const instagramUrl = 'https://www.instagram.com/i_m_artiso/';
  const instagramHandle = '@i_m_artiso';

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>WUSHU SANDA ARENA</span>
        </div>
        <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-white tracking-wide">
          About Us
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Official Tournament Management & Live Leitai Arena Operations
        </p>
      </div>

      {/* Developer Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/30 border border-amber-500/30 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 shrink-0">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex flex-col items-center justify-center text-amber-400">
              <Award className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
          </div>

          <div className="space-y-2 flex-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-amber-400/90">
              Developed by
            </div>
            <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-white tracking-wider">
              MR. MUSAIB HAMID
            </h2>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium text-xs sm:text-sm">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>National Level Wushu Judge</span>
            </div>
            <p className="text-xs text-slate-400 pt-1 leading-relaxed">
              Committed to elevating professional Wushu Sanda sports administration with precision scoring, international IWUF compliance, and cutting-edge tournament technology.
            </p>
          </div>
        </div>
      </div>

      {/* About the Platform Card */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              About the Platform
            </h2>
            <div className="text-[11px] text-slate-400">
              Next-generation martial arts championship software
            </div>
          </div>
        </div>

        <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
          &ldquo;Wushu Sanda Arena is a tournament management platform designed to simplify player registration, bout management, scoring, knockout brackets, live results, and tournament operations.&rdquo;
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <Users className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white">Player Registration</div>
              <div className="text-[11px] text-slate-400">Rosters, weigh-ins, age verification & district tracking</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <Swords className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white">Bout Management</div>
              <div className="text-[11px] text-slate-400">Ring allocations, queues, walkovers & official schedules</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white">Live Leitai Scoring</div>
              <div className="text-[11px] text-slate-400">Real-time judge scoring, warnings, rounds & 12-pt gap rule</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <GitFork className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white">Knockout Brackets</div>
              <div className="text-[11px] text-slate-400">Automated seeds, bye rounds & seamless winner progression</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white">Live Results</div>
              <div className="text-[11px] text-slate-400">Real-time podium standings, medal counts & public TV display</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white">Tournament Operations</div>
              <div className="text-[11px] text-slate-400">Master admin control, PDF/Excel reports & audit trails</div>
            </div>
          </div>
        </div>
      </div>

      {/* Connect With Me (Instagram) Card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-pink-950/20 border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="text-center space-y-1.5">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Connect With Me
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Connect with me on Instagram
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Scan the QR code or click below to follow on Instagram
          </p>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center space-y-4 pt-2">
          <div className="p-4 sm:p-5 bg-white rounded-2xl shadow-2xl border-4 border-amber-500/30 transition-transform hover:scale-102 flex flex-col items-center">
            {/* High Resolution Vector SVG QR Code */}
            <div className="w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] flex items-center justify-center">
              <QRCodeSVG
                value={instagramUrl}
                size={200}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
                className="w-full h-full block"
              />
            </div>

            {/* Label below QR code */}
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-900">
              <svg
                className="w-4 h-4 text-pink-600 fill-current"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span className="text-xs font-bold text-slate-800 tracking-tight">Instagram</span>
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="font-mono text-sm sm:text-base font-bold text-amber-400">
              {instagramHandle}
            </div>
            <div className="text-xs text-slate-400">
              Official Instagram Profile
            </div>
          </div>

          {/* Action button */}
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Visit Instagram</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Page Footer */}
      <div className="text-center pt-6 border-t border-slate-800/80 space-y-1 text-xs text-slate-400">
        <div className="font-medium text-slate-300">
          &copy; 2026 Wushu Sanda Arena
        </div>
        <div className="text-[11px] text-amber-400/90">
          Developed by Mr. Musaib Hamid
        </div>
      </div>
    </div>
  );
};
