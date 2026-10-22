import React, { useState } from 'react';
import { GameStatus } from '../types/game';
import { soundService } from '../services/sound';
import { Zap, ShieldAlert, Lock, Clock, CheckCircle2, Minus, Plus } from 'lucide-react';

export interface BetDeckState {
  amount: number;
  autoCashoutEnabled: boolean;
  autoMultiplier: number;
  autoBetEnabled: boolean;
  hasPlacedBet: boolean;
  isQueuedForNext: boolean;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
  winAmount: number | null;
  bonusPortionUsed?: number;
}

interface BettingPanelProps {
  status: GameStatus;
  currentMultiplier: number;
  userBalance: number;
  deck1: BetDeckState;
  deck2: BetDeckState;
  onPlaceBet: (deckIndex: 1 | 2, amount: number, autoCashoutAt?: number) => void;
  onCashout: (deckIndex: 1 | 2) => void;
  onUpdateDeck: (deckIndex: 1 | 2, updates: Partial<BetDeckState>) => void;
}

export const BettingPanel: React.FC<BettingPanelProps> = ({
  status,
  currentMultiplier,
  userBalance,
  deck1,
  deck2,
  onPlaceBet,
  onCashout,
  onUpdateDeck,
}) => {
  const [rawInput1, setRawInput1] = useState<string | null>(null);
  const [rawInput2, setRawInput2] = useState<string | null>(null);

  const renderDeck = (deck: BetDeckState, deckIndex: 1 | 2) => {
    const isFlying = status === 'FLYING';
    const isWaiting = status === 'WAITING';
    const isBurst = status === 'BURST';

    const rawInput = deckIndex === 1 ? rawInput1 : rawInput2;
    const setRawInput = deckIndex === 1 ? setRawInput1 : setRawInput2;

    const livePotentialWin = (deck.amount * currentMultiplier).toFixed(0);
    const maxAllowed = Math.max(50, Math.floor(userBalance));

    const updateAmount = (nextVal: number) => {
      const clamped = Math.max(50, Math.min(maxAllowed, Math.round(nextVal)));
      setRawInput(null);
      onUpdateDeck(deckIndex, { amount: clamped });
    };

    const handleStepDecrease = () => {
      const step = deck.amount > 2000 ? 500 : deck.amount > 500 ? 100 : 50;
      updateAmount(deck.amount - step);
    };

    const handleStepIncrease = () => {
      const step = deck.amount >= 2000 ? 500 : deck.amount >= 500 ? 100 : 50;
      updateAmount(deck.amount + step);
    };

    const handleQuickAmount = (delta: number) => {
      updateAmount(deck.amount + delta);
    };

    const handleMultiply = (factor: number) => {
      updateAmount(deck.amount * factor);
    };

    const handleMin = () => {
      updateAmount(50);
    };

    const handleMax = () => {
      updateAmount(maxAllowed);
    };

    const isLocked = (deck.hasPlacedBet && (isFlying || isWaiting)) || deck.isQueuedForNext;

    return (
      <div className="flex-1 bg-slate-900/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-4 border border-slate-700/70 shadow-lg flex flex-col justify-between min-w-0">
        {/* Deck Header & Auto-Bet / Auto-Cashout Controls */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pb-2 sm:pb-3 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <h4 className="text-[11px] sm:text-xs uppercase tracking-wider font-bold text-slate-300">
              Bet Panel #{deckIndex} (LKR)
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Auto Bet Switch */}
            <label
              className={`text-[10.5px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer px-2 py-0.5 rounded-lg border transition ${
                deck.autoBetEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={deck.autoBetEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onUpdateDeck(deckIndex, { autoBetEnabled: checked });
                  if (checked && isWaiting && !deck.hasPlacedBet && deck.amount <= userBalance) {
                    onPlaceBet(
                      deckIndex,
                      deck.amount,
                      deck.autoCashoutEnabled ? deck.autoMultiplier : undefined
                    );
                  }
                }}
                className="w-3.5 h-3.5 rounded text-amber-500 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                Auto Bet
                {deck.autoBetEnabled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                )}
              </span>
            </label>

            {/* Auto Cashout Controls */}
            <div className="flex items-center gap-1.5">
              <label className="text-[10.5px] sm:text-xs text-slate-400 font-medium flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deck.autoCashoutEnabled}
                  disabled={deck.hasPlacedBet && isFlying}
                  onChange={(e) =>
                    onUpdateDeck(deckIndex, { autoCashoutEnabled: e.target.checked })
                  }
                  className="w-3.5 h-3.5 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
                />
                Auto Cashout
              </label>
              {deck.autoCashoutEnabled && (
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="1.05"
                    max="500"
                    disabled={deck.hasPlacedBet && isFlying}
                    value={deck.autoMultiplier}
                    onChange={(e) =>
                      onUpdateDeck(deckIndex, {
                        autoMultiplier: Math.max(1.05, parseFloat(e.target.value) || 1.05),
                      })
                    }
                    className="w-14 sm:w-16 px-1.5 py-0.5 text-[11px] sm:text-xs font-bold text-center bg-slate-800 border border-slate-700 rounded-lg text-emerald-400 focus:outline-none focus:border-blue-500"
                  />
                  <span className="absolute right-1 top-0.5 text-[10px] sm:text-xs text-slate-400">
                    x
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Amount Input with Decrease (-) / Increase (+) Stepper & Quick Presets */}
        <div className="my-2 sm:my-3 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400">
            <span className="font-bold text-slate-300">Bet Amount (LKR)</span>
            <span className="text-emerald-400 font-bold">
              Bal: Rs. {userBalance.toLocaleString()} LKR
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 rounded-xl border border-slate-700/90 p-1 sm:p-1.5 focus-within:border-blue-500 transition">
            {/* Decrease (-) Button */}
            <button
              type="button"
              disabled={isLocked || deck.amount <= 50}
              onClick={handleStepDecrease}
              title="Decrease Bet Amount (-)"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-300 flex items-center justify-center font-black transition active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
            >
              <Minus className="w-4 h-4 stroke-[3]" />
            </button>

            <div className="flex-1 flex items-center justify-center px-1 min-w-0">
              <span className="text-xs font-bold text-slate-400 mr-1 shrink-0">Rs.</span>
              <input
                type="number"
                step="50"
                min="50"
                max={maxAllowed}
                disabled={isLocked}
                value={rawInput !== null ? rawInput : deck.amount}
                onChange={(e) => {
                  const valStr = e.target.value;
                  setRawInput(valStr);
                  const parsed = parseFloat(valStr);
                  if (!isNaN(parsed) && parsed >= 50) {
                    onUpdateDeck(deckIndex, {
                      amount: Math.min(maxAllowed, Math.round(parsed)),
                    });
                  }
                }}
                onBlur={() => {
                  if (rawInput !== null) {
                    const parsed = parseFloat(rawInput);
                    updateAmount(isNaN(parsed) ? 50 : parsed);
                  }
                }}
                className="w-full bg-transparent text-center text-base sm:text-lg font-black text-white focus:outline-none disabled:opacity-50"
              />
              <span className="text-[11px] font-bold text-slate-400 ml-1 shrink-0">LKR</span>
            </div>

            {/* Increase (+) Button */}
            <button
              type="button"
              disabled={isLocked || deck.amount >= maxAllowed}
              onClick={handleStepIncrease}
              title="Increase Bet Amount (+)"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-black transition active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* Quick Decrease & Increase LKR Preset Buttons */}
          <div className="grid grid-cols-9 gap-1 pt-0.5">
            <button
              type="button"
              disabled={isLocked}
              onClick={handleMin}
              className="py-1 px-0.5 text-[9.5px] sm:text-[10.5px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition active:scale-95 cursor-pointer"
            >
              MIN
            </button>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => handleQuickAmount(-500)}
              className="py-1 px-0.5 text-[9.5px] sm:text-[10.5px] font-bold rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 disabled:opacity-40 transition active:scale-95 cursor-pointer"
            >
              -500
            </button>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => handleQuickAmount(-100)}
              className="py-1 px-0.5 text-[9.5px] sm:text-[10.5px] font-bold rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 disabled:opacity-40 transition active:scale-95 cursor-pointer"
            >
              -100
            </button>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => handleMultiply(0.5)}
              className="py-1 px-0.5 text-[9.5px] sm:text-[10.5px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 disabled:opacity-40 transition active:scale-95 cursor-pointer"
            >
              ½
            </button>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => handleQuickAmount(100)}
              className="py-1 px-0.5 text-[9.5px] sm:text-[10.5px] font-bold rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 disabled:opacity-40 transition active:scale-95 cursor-pointer"
            >
              +100
            </button>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => handleQuickAmount(500)}
              className="py-1 px-0.5 text-[9.5px] sm:text-[10.5px] font-bold rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 disabled:opacity-40 transition active:scale-95 cursor-pointer"
            >
              +500
            </button>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => handleQuickAmount(1000)}
              className="py-1 px-0.5 text-[9.5px] sm:text-[10.5px] font-bold rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 disabled:opacity-40 transition active:scale-95 cursor-pointer truncate"
            >
              +1K
            </button>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => handleMultiply(2)}
              className="py-1 px-0.5 text-[9.5px] sm:text-[10.5px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 disabled:opacity-40 transition active:scale-95 cursor-pointer"
            >
              2X
            </button>
            <button
              type="button"
              disabled={isLocked}
              onClick={handleMax}
              className="py-1 px-0.5 text-[9.5px] sm:text-[10.5px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 disabled:opacity-40 transition active:scale-95 cursor-pointer"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Dynamic Action Button (NO CANCEL - BET IS LOCKED ONCE PLACED) */}
        <div className="pt-1 sm:pt-2">
          {/* 1. In Flight & Active Bet -> CASH OUT */}
          {isFlying && deck.hasPlacedBet && !deck.cashedOut && (
            <button
              type="button"
              onClick={() => onCashout(deckIndex)}
              className="w-full py-2.5 sm:py-4 rounded-xl font-black text-base sm:text-xl tracking-wide bg-gradient-to-r from-amber-500 via-emerald-500 to-green-500 hover:from-amber-400 hover:to-green-400 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-98 transition flex flex-col items-center justify-center animate-pulse cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                CASH OUT
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1">
                Rs. {Number(livePotentialWin).toLocaleString()} LKR
                <span className="text-red-700 font-black px-1.5 py-0.5 rounded bg-white/40">
                  {currentMultiplier.toFixed(2)}x
                </span>
              </span>
            </button>
          )}

          {/* 2. In Flight & Cashed Out */}
          {deck.hasPlacedBet && deck.cashedOut && (
            <div className="w-full py-2.5 sm:py-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-center flex flex-col items-center justify-center font-bold">
              <span className="text-[11px] sm:text-xs uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Safely Parachuted!
              </span>
              <span className="text-sm sm:text-lg font-black">
                Won: Rs. {deck.winAmount?.toLocaleString()} LKR @ {deck.cashoutMultiplier?.toFixed(2)}x
              </span>
            </div>
          )}

          {/* 3. Burst State with active bet that wasn't cashed out */}
          {isBurst && deck.hasPlacedBet && !deck.cashedOut && (
            <div className="w-full py-2.5 sm:py-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-center flex items-center justify-center gap-2 font-bold text-xs sm:text-sm">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Balloon Crashed! Lost Rs. {deck.amount.toLocaleString()} LKR</span>
            </div>
          )}

          {/* 4. Flight in progress, bet is QUEUED & LOCKED (CANNOT CANCEL) */}
          {(isFlying || isBurst) && deck.isQueuedForNext && (
            <div className="w-full py-2.5 sm:py-3.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-center flex flex-col items-center justify-center font-bold">
              <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                BET LOCKED FOR NEXT FLIGHT
              </span>
              <span className="text-sm sm:text-base font-black">
                Rs. {deck.amount.toLocaleString()} LKR
              </span>
            </div>
          )}

          {/* 5. Flight in progress, place bet for upcoming flight */}
          {isFlying && !deck.hasPlacedBet && !deck.isQueuedForNext && (
            <button
              type="button"
              disabled={deck.amount > userBalance || deck.amount <= 0}
              onClick={() => {
                soundService.playBeep(false);
                onPlaceBet(
                  deckIndex,
                  deck.amount,
                  deck.autoCashoutEnabled ? deck.autoMultiplier : undefined
                );
              }}
              className="w-full py-2.5 sm:py-4 rounded-xl font-black text-xs sm:text-base tracking-wider bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-orange-500/25 active:scale-98 transition flex flex-col items-center justify-center cursor-pointer disabled:opacity-40"
            >
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                BET FOR NEXT FLIGHT (LOCKED)
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-amber-200">
                Rs. {deck.amount.toLocaleString()} LKR
              </span>
            </button>
          )}

          {/* 6. Waiting State - Bet already placed & locked (CANNOT CANCEL) */}
          {isWaiting && deck.hasPlacedBet && (
            <div className="w-full py-2.5 sm:py-4 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-center flex flex-col items-center justify-center font-bold">
              <span className="flex items-center gap-1.5 text-[11px] sm:text-xs text-blue-300">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                BET LOCKED (WAITING FOR TAKEOFF)
              </span>
              <span className="text-sm sm:text-lg font-black text-white">
                Rs. {deck.amount.toLocaleString()} LKR
              </span>
            </div>
          )}

          {/* 7. Ready to place bet */}
          {(isWaiting || (isBurst && !deck.isQueuedForNext)) && !deck.hasPlacedBet && (
            <button
              type="button"
              disabled={deck.amount > userBalance || deck.amount <= 0}
              onClick={() => {
                soundService.playBeep(false);
                onPlaceBet(
                  deckIndex,
                  deck.amount,
                  deck.autoCashoutEnabled ? deck.autoMultiplier : undefined
                );
              }}
              className="w-full py-2.5 sm:py-4 rounded-xl font-black text-sm sm:text-lg tracking-wider bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 active:scale-98 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isWaiting
                ? `PLACE BET Rs. ${deck.amount.toLocaleString()} LKR`
                : `BET NEXT FLIGHT Rs. ${deck.amount.toLocaleString()} LKR`}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-3">
      {renderDeck(deck1, 1)}
      {renderDeck(deck2, 2)}
    </div>
  );
};
