import React, { useState } from 'react';
import { RoundInfo } from '../types/game';
import { ShieldCheck, History, ChevronDown, ChevronUp, X, Trophy } from 'lucide-react';

interface MultiplierHistoryProps {
  history: RoundInfo[];
  onSelectRound: (round: RoundInfo) => void;
  onOpenFairModal: () => void;
}

export const MultiplierHistory: React.FC<MultiplierHistoryProps> = React.memo(({
  history,
  onSelectRound,
  onOpenFairModal,
}) => {
  const [isAllHistoryOpen, setIsAllHistoryOpen] = useState(false);

  const getBadgeStyle = (crashPoint: number) => {
    if (crashPoint >= 10.0) {
      return 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-black shadow-sm shadow-amber-500/20 hover:bg-amber-500/30';
    }
    if (crashPoint >= 5.0) {
      return 'bg-purple-500/15 border-purple-500/40 text-purple-400 hover:bg-purple-500/25';
    }
    if (crashPoint >= 2.0) {
      return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25';
    }
    return 'bg-blue-500/15 border-blue-500/40 text-blue-400 hover:bg-blue-500/25';
  };

  return (
    <div className="w-full relative">
      <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-3 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-md min-w-0">
        <button
          type="button"
          onClick={() => setIsAllHistoryOpen((prev) => !prev)}
          className="flex items-center gap-1 text-xs text-slate-300 hover:text-amber-400 font-bold shrink-0 cursor-pointer transition"
          title="View All Round History"
        >
          <History className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">History</span>
        </button>

        {/* Scrollable list of recent multipliers */}
        <div className="flex-1 min-w-0 flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {history.slice(0, 20).map((r, index) => (
            <button
              key={`${r.id}-${r.nonce}-${r.timestamp || 0}-${index}`}
              type="button"
              onClick={() => onSelectRound(r)}
              className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-extrabold rounded-lg border transition shrink-0 cursor-pointer ${getBadgeStyle(
                r.crashPoint
              )}`}
              title={`Round #${r.nonce} - Click to verify Provably Fair`}
            >
              {r.crashPoint.toFixed(2)}x
            </button>
          ))}
        </div>

        {/* All History Button */}
        <button
          type="button"
          onClick={() => setIsAllHistoryOpen((prev) => !prev)}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold rounded-lg border transition shrink-0 cursor-pointer ${
            isAllHistoryOpen
              ? 'bg-amber-500 text-slate-950 border-amber-400'
              : 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
          }`}
          title="View All Previous Crash Multipliers"
        >
          <span>All History ({history.length})</span>
          {isAllHistoryOpen ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Provably Fair Quick Button */}
        <button
          type="button"
          onClick={onOpenFairModal}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition shrink-0 cursor-pointer"
          title="Provably Fair Verification"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Fairness</span>
        </button>
      </div>

      {/* Expandable All History Panel */}
      {isAllHistoryOpen && (
        <div className="mt-2 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-3 sm:p-4 shadow-2xl z-30">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-black text-white">
                All Crash History ({history.length} Rounds)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAllHistoryOpen(false)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Multiplier Badges Grid */}
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 mb-3">
            {history.map((r, index) => (
              <button
                key={`all-grid-${r.id}-${r.nonce}-${index}`}
                type="button"
                onClick={() => onSelectRound(r)}
                className={`px-2.5 py-1 text-xs font-extrabold rounded-lg border transition cursor-pointer flex items-center gap-1 ${getBadgeStyle(
                  r.crashPoint
                )}`}
                title={`Round #${r.nonce} • Click to verify fairness`}
              >
                <span className="text-[9px] opacity-70 font-mono">#{r.nonce}</span>
                <span>{r.crashPoint.toFixed(2)}x</span>
              </button>
            ))}
          </div>

          {/* Detailed Round History Table */}
          <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80 sticky top-0">
                  <th className="py-1.5 px-2.5 font-bold">Round</th>
                  <th className="py-1.5 px-2.5 font-bold">Multiplier</th>
                  <th className="py-1.5 px-2.5 font-bold">Riders</th>
                  <th className="py-1.5 px-2.5 font-bold">Total Payout</th>
                  <th className="py-1.5 px-2.5 font-bold hidden sm:table-cell">100% Bonus Winner</th>
                  <th className="py-1.5 px-2.5 font-bold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((r, idx) => (
                  <tr
                    key={`all-row-${r.id}-${idx}`}
                    onClick={() => onSelectRound(r)}
                    className="hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    <td className="py-1.5 px-2.5 font-mono text-slate-300 font-bold">
                      #{r.nonce}
                    </td>
                    <td className="py-1.5 px-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-[10px] font-black ${getBadgeStyle(
                          r.crashPoint
                        )}`}
                      >
                        {r.crashPoint.toFixed(2)}x
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-300 font-semibold">
                      {r.totalBets || 0}
                    </td>
                    <td className="py-1.5 px-2.5 text-emerald-400 font-bold">
                      Rs. {(r.totalPayout || 0).toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2.5 hidden sm:table-cell">
                      {r.topBonusWinner ? (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-bold text-[10px]">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          {r.topBonusWinner.avatar} {r.topBonusWinner.username} ({r.topBonusWinner.multiplier.toFixed(2)}x)
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-slate-500 font-mono text-[10px]">
                      {new Date(r.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});
