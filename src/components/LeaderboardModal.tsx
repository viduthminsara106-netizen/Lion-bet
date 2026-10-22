import React, { useState } from 'react';
import { User, LeaderboardEntry } from '../types/game';
import { Trophy, X } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  leaderboard: LeaderboardEntry[];
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  leaderboard,
}) => {
  const [timeframe, setTimeframe] = useState<'today' | 'weekly' | 'allTime'>('today');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Sky Champions Leaderboard</h2>
              <p className="text-xs text-slate-400">Top multiplier flights &amp; highest LKR payouts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeframe selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2">
          {(['today', 'weekly', 'allTime'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTimeframe(t)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                timeframe === t
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'today' ? 'Today' : t === 'weekly' ? 'This Week' : 'All-Time'}
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {leaderboard.map((entry, index) => {
            let rankBadge = (
              <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 font-black text-xs flex items-center justify-center">
                #{entry.rank}
              </span>
            );
            if (entry.rank === 1) {
              rankBadge = (
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center border border-amber-500/40">
                  🥇
                </span>
              );
            } else if (entry.rank === 2) {
              rankBadge = (
                <span className="w-6 h-6 rounded-full bg-slate-400/20 text-slate-300 font-black text-xs flex items-center justify-center border border-slate-400/40">
                  🥈
                </span>
              );
            } else if (entry.rank === 3) {
              rankBadge = (
                <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 font-black text-xs flex items-center justify-center border border-amber-700/40">
                  🥉
                </span>
              );
            }

            return (
              <div
                key={`${entry.username}-${entry.rank}-${index}`}
                className={`flex items-center justify-between p-3 rounded-xl border text-xs transition ${
                  entry.username === currentUser.username
                    ? 'bg-blue-600/15 border-blue-500/50'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  {rankBadge}
                  <span className="text-xl">{entry.avatar}</span>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <span>{entry.username}</span>
                      {entry.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 font-bold">
                          {entry.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Multiplier: <span className="text-emerald-400 font-bold">{entry.multiplier}x</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-emerald-400 block">
                    Rs. {entry.value.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </span>
                  <span className="text-[10px] text-slate-500">Won (LKR)</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current User Rank Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentUser.avatar}</span>
            <div>
              <span className="font-bold text-white block">You: {currentUser.username}</span>
              <span className="text-[10px] text-slate-400">Total Won: Rs. {currentUser.totalWon.toLocaleString()} LKR</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 font-black text-xs">
            Rank #5
          </span>
        </div>
      </div>
    </div>
  );
};
