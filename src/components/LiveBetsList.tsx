import React, { useState, useEffect } from 'react';
import { Bet, BetRecord, RoundBonusWinner, RoundInfo } from '../types/game';
import { Users, User as UserIcon, Trophy, MessageSquare, History, ShieldCheck } from 'lucide-react';

export type BetsPanelTab = 'all' | 'my' | 'history';

interface LiveBetsListProps {
  bets: Bet[];
  currentUserId: string;
  myBetHistory?: BetRecord[];
  roundHistory?: RoundInfo[];
  activeTab?: BetsPanelTab;
  onTabChange?: (tab: BetsPanelTab) => void;
  lastRoundWinner?: RoundBonusWinner | null;
  onStartPrivateChat?: (bet: Bet) => void;
  onSelectRound?: (round: RoundInfo) => void;
}

export const LiveBetsList: React.FC<LiveBetsListProps> = React.memo(({
  bets,
  currentUserId,
  myBetHistory = [],
  roundHistory = [],
  activeTab,
  onTabChange,
  lastRoundWinner,
  onStartPrivateChat,
  onSelectRound,
}) => {
  const [internalTab, setInternalTab] = useState<BetsPanelTab>(activeTab || 'all');

  useEffect(() => {
    if (activeTab) {
      setInternalTab(activeTab);
    }
  }, [activeTab]);

  const currentTab = activeTab || internalTab;
  const handleSelectTab = (tab: BetsPanelTab) => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const myActiveBets = bets.filter((b) => b.userId === currentUserId);
  const totalAmount = bets.reduce((acc, b) => acc + b.amount, 0);
  const totalCashedOutCount = bets.filter((b) => b.cashedOut).length;

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-2.5 flex flex-col h-full min-h-[280px] shadow-lg text-[11px]">
      {/* Last Round 100% Longest-Flight Bonus Winner Card */}
      {lastRoundWinner && (
        <div className="mb-2 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-emerald-500/15 border border-amber-500/40 flex items-center justify-between gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block leading-none">
                Last Round 100% Bonus Winner
              </span>
              <span className="font-black text-white truncate block text-[10.5px] mt-0.5">
                {lastRoundWinner.avatar} {lastRoundWinner.username} ({lastRoundWinner.multiplier.toFixed(2)}x)
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black text-[9.5px] block">
              +Rs.{lastRoundWinner.bonusAmount.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Header & 3-Way Switcher: All Bets | My Bets | History */}
      <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-extrabold text-slate-200 truncate">
            {bets.length} Riders
          </span>
          <span className="text-[10px] text-emerald-400 font-bold shrink-0">
            ({totalCashedOutCount} 🪂)
          </span>
        </div>

        <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => handleSelectTab('all')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
              currentTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Bets
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('my')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
              currentTab === 'my' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            My Bets
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('history')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
              currentTab === 'history' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto space-y-1 py-1.5 pr-0.5">
        {currentTab === 'all' && (
          <>
            {bets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-[11px] py-4">
                <UserIcon className="w-6 h-6 text-slate-700 mb-1" />
                <p>Boarding riders for next flight...</p>
              </div>
            ) : (
              bets.map((bet, index) => {
                const isMe = bet.userId === currentUserId;
                return (
                  <div
                    key={`${bet.id}-${index}`}
                    className={`flex items-center justify-between px-2 py-1 rounded-lg transition ${
                      isMe
                        ? 'bg-blue-500/15 border border-blue-500/40'
                        : 'bg-slate-950/60 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <span className="text-xs shrink-0">{bet.avatar}</span>
                      <span
                        className={`font-bold truncate max-w-[70px] ${
                          isMe ? 'text-blue-400' : 'text-slate-300'
                        }`}
                      >
                        {bet.username}
                      </span>
                      {!isMe && onStartPrivateChat && (
                        <button
                          type="button"
                          onClick={() => onStartPrivateChat(bet)}
                          title={`Private Chat with ${bet.username}`}
                          className="p-0.5 text-slate-400 hover:text-purple-400 transition cursor-pointer shrink-0"
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    <div className="font-semibold text-slate-400 text-[10px] shrink-0 mx-1">
                      Rs.{bet.amount.toLocaleString()}
                    </div>

                    <div className="shrink-0 text-right min-w-[46px]">
                      {bet.cashedOut ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black text-[10px]">
                          {bet.cashoutMultiplier?.toFixed(2)}x
                        </span>
                      ) : (
                        <span className="text-amber-400/80 text-[10px] font-medium">In Basket</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {currentTab === 'my' && (
          <>
            {/* Active Current Round Bets by User */}
            {myActiveBets.length > 0 && (
              <div className="mb-2 space-y-1">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-blue-400 px-1">
                  Active This Round
                </div>
                {myActiveBets.map((bet, idx) => (
                  <div
                    key={`my-active-${bet.id}-${idx}`}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/40"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{bet.avatar}</span>
                      <span className="font-bold text-white">{bet.username}</span>
                    </div>
                    <span className="font-bold text-slate-200">
                      Rs.{bet.amount.toLocaleString()}
                    </span>
                    <span className="font-black text-emerald-400">
                      {bet.cashedOut ? `${bet.cashoutMultiplier?.toFixed(2)}x` : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Past Bet History for User */}
            <div className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 px-1">
              My Past Bets ({myBetHistory.length})
            </div>
            {myBetHistory.length === 0 && myActiveBets.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center text-slate-500 text-[11px] py-4">
                <UserIcon className="w-6 h-6 text-slate-700 mb-1" />
                <p>No bets placed yet</p>
                <span className="text-[10px] text-slate-600 mt-0.5">
                  Place a bet on Deck 1 or Deck 2 to see your history here
                </span>
              </div>
            ) : (
              myBetHistory.map((rec, idx) => {
                const won = rec.status === 'won';
                return (
                  <div
                    key={`my-hist-${rec.id}-${idx}`}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg border ${
                      won
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-rose-500/10 border-rose-500/25'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          #{rec.roundNumber}
                        </span>
                        <span className="font-bold text-white">
                          Rs.{rec.amount.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 block">
                        {new Date(rec.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="text-center">
                      {won && rec.cashoutMultiplier ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black text-[10px]">
                          {rec.cashoutMultiplier.toFixed(2)}x
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                          Crashed @ {rec.crashPoint.toFixed(2)}x
                        </span>
                      )}
                    </div>

                    <div className="text-right font-black text-[10.5px]">
                      {won ? (
                        <span className="text-emerald-400">
                          +Rs.{rec.winAmount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-rose-400">
                          -Rs.{rec.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {currentTab === 'history' && (
          <>
            <div className="text-[9.5px] font-black uppercase tracking-wider text-amber-400 px-1 flex items-center justify-between">
              <span>All Crash Multipliers ({roundHistory.length})</span>
              <span>Click to Verify</span>
            </div>
            {roundHistory.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center text-slate-500 text-[11px] py-4">
                <History className="w-6 h-6 text-slate-700 mb-1" />
                <p>No completed rounds yet</p>
              </div>
            ) : (
              roundHistory.map((r, idx) => {
                let badgeClass = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
                if (r.crashPoint >= 10) {
                  badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                } else if (r.crashPoint >= 5) {
                  badgeClass = 'bg-purple-500/15 text-purple-300 border-purple-500/35';
                } else if (r.crashPoint >= 2) {
                  badgeClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35';
                }

                return (
                  <div
                    key={`round-hist-${r.id}-${idx}`}
                    onClick={() => onSelectRound && onSelectRound(r)}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800/80 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-400 text-[10px]">
                        #{r.nonce}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded border font-black text-[10.5px] ${badgeClass}`}
                      >
                        {r.crashPoint.toFixed(2)}x
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-semibold">
                      {r.totalBets || 0} Bets
                    </div>

                    <div className="flex items-center gap-1 text-right">
                      <span className="text-emerald-400 font-bold text-[10px]">
                        Rs.{(r.totalPayout || 0).toLocaleString()}
                      </span>
                      <ShieldCheck className="w-3 h-3 text-emerald-400/80" />
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Compact Footer */}
      <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-bold shrink-0">
        <span>Round Pool</span>
        <span className="text-white font-black">Rs. {totalAmount.toLocaleString()}</span>
      </div>
    </div>
  );
});
