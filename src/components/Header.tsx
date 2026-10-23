import React from 'react';
import { User } from '../types/game';
import {
  Volume2,
  VolumeX,
  Gift,
  Trophy,
  ShieldCheck,
  Shield,
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  LogOut,
  Gamepad2,
  Sun,
  Moon,
  UserCircle,
  Ticket,
  MessageCircle,
  Zap,
  Clock,
  Bell,
} from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  isMuted: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  activePage?: 'lobby' | 'game' | 'mines' | 'sports';
  onGoToLobby?: () => void;
  onOpenSportsBetting?: () => void;
  onToggleMute: () => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenReferral: () => void;
  onOpenLeaderboard: () => void;
  onOpenProvablyFair: () => void;
  onOpenAdmin: () => void;
  onOpenAgentPanel: (mode: 'deposit_panel' | 'withdraw_page') => void;
  onOpenGoogleForms: () => void;
  onOpenCashier: (initialTab?: 'deposit' | 'withdraw') => void;
  onLogout: () => void;
  isLuckyHourActive?: boolean;
  luckyHourRemainingMs?: number;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
}

function formatLuckyHourTimer(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  isMuted,
  theme = 'light',
  onToggleTheme,
  activePage = 'lobby',
  onGoToLobby,
  onOpenSportsBetting,
  onToggleMute,
  onOpenProfile,
  onOpenReferral,
  onOpenLeaderboard,
  onOpenProvablyFair,
  onOpenAdmin,
  onOpenGoogleForms,
  onOpenCashier,
  onLogout,
  isLuckyHourActive = false,
  luckyHourRemainingMs = 0,
  unreadNotificationsCount = 0,
  onOpenNotifications,
}) => {
  return (
    <header className="w-full max-w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-2 sm:px-5 py-2 sm:py-2.5 flex flex-col z-40 sticky top-0 shadow-lg">
      {/* Lucky Hour Active Header Notification Banner (15-Minute High Multiplier Boost) */}
      {isLuckyHourActive && luckyHourRemainingMs > 0 && (
        <div
          role="status"
          aria-live="polite"
          onClick={onOpenNotifications}
          className="w-full mb-2 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/20 border border-amber-400/50 flex flex-wrap items-center justify-between gap-2 text-xs cursor-pointer transition"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="font-black text-amber-300 tracking-wide uppercase">
              🍀 LUCKY HOUR ACTIVE
            </span>
            <span aria-hidden="true" className="text-amber-500/60 hidden sm:inline">
              ·
            </span>
            <span className="text-slate-200 font-semibold hidden sm:inline truncate">
              High Crash Multipliers Probability Boosted for 15 Minutes!
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono tabular-nums font-black text-amber-300 shrink-0">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Ends in {formatLuckyHourTimer(luckyHourRemainingMs)}</span>
          </div>
        </div>
      )}
      {/* Main Row */}
      <div className="w-full flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
        {/* Brand Logo: Lion Bet Official Logo & Back to Games Lobby */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
          <div
            onClick={onGoToLobby}
            className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer group"
            title="Lion Bet - Go to Games Lobby"
          >
            {/* Lion Bet Official Logo Image */}
            <div className="relative flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-950 border border-amber-500/60 shadow-md shadow-amber-500/20 select-none shrink-0 group-hover:scale-105 transition overflow-hidden">
              <img
                src="/assets/aistudio/file_0000000012b48211a458c023cc759725_1a4c4c4a.png"
                alt="Lion Bet Logo"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm sm:text-lg tracking-wider text-amber-400 truncate">
                  LION <span className="text-white">BET</span>
                </span>
                <span className="hidden lg:inline-block px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-black tracking-wider uppercase border border-amber-500/30">
                  OFFICIAL
                </span>
              </div>
              <span className="text-[10px] text-amber-300/80 font-semibold tracking-wider hidden sm:block">
                PLAY • BET • WIN
              </span>
            </div>
          </div>

          {activePage !== 'lobby' && onGoToLobby && (
            <button
              type="button"
              onClick={onGoToLobby}
              className="ml-0.5 flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-black transition active:scale-95 cursor-pointer"
              title="Return to Games Selection Page"
            >
              <Gamepad2 className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">Lobby</span>
            </button>
          )}

          {onOpenSportsBetting && (
            <button
              type="button"
              onClick={onOpenSportsBetting}
              className={`ml-0.5 flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border text-xs sm:text-sm font-black transition active:scale-95 cursor-pointer ${
                activePage === 'sports'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-emerald-500/35'
              }`}
              title="Open World Match Betting & Bet Slip"
            >
              <Ticket className="w-4 h-4 shrink-0" />
              <span>Match Bet</span>
            </button>
          )}
        </div>

        {/* Center Actions (Desktop) */}
        <div className="hidden xl:flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenReferral}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-amber-400 text-xs sm:text-sm font-bold transition border border-amber-500/25 active:scale-95 cursor-pointer"
          >
            <Gift className="w-4 h-4" />
            <span>Refer (10%)</span>
          </button>

          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs sm:text-sm font-bold transition border border-slate-700 active:scale-95 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Leaders</span>
          </button>

          <button
            type="button"
            onClick={onOpenProvablyFair}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-emerald-400 text-xs sm:text-sm font-bold transition border border-emerald-500/25 active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Fairness</span>
          </button>

          <button
            type="button"
            onClick={onOpenGoogleForms}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-indigo-400 text-xs sm:text-sm font-bold transition border border-indigo-500/25 active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Feedback</span>
          </button>

          <a
            href="https://whatsapp.com/channel/0029Vb8vhzCHFxOtG2NiJK2w"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs sm:text-sm font-bold transition border border-green-500/40 active:scale-95"
            title="Join Official Lion Bet WhatsApp Channel"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WA Channel</span>
          </a>
        </div>

        {/* Right Controls: Balance, Deposit, Withdraw, Agent, Admin, Theme, Audio, Profile, Logout */}
        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0">
          {/* LKR Balance Badge */}
          <div
            onClick={() => onOpenCashier('deposit')}
            className="flex items-center bg-slate-950 border border-emerald-500/30 rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 shadow-inner cursor-pointer hover:border-emerald-500/50 transition"
            title="Click to open Lion Bet Cashier"
          >
            <div className="text-right">
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-400 block leading-none">
                Balance
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-400 whitespace-nowrap">
                Rs. {currentUser.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Deposit Button */}
          <button
            type="button"
            onClick={() => onOpenCashier('deposit')}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm transition shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
            title="Deposit LKR (1st Deposit +100% Bonus)"
          >
            <ArrowDownCircle className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Deposit</span>
          </button>

          {/* Withdraw Button (Desktop/Tablet) */}
          <button
            type="button"
            onClick={() => onOpenCashier('withdraw')}
            className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs sm:text-sm transition active:scale-95 cursor-pointer"
            title="Withdraw LKR"
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Withdraw</span>
          </button>

          {/* Admin Dashboard Button (Desktop) */}
          {currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="hidden lg:flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-500/30"
              title="Open Admin Dashboard"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}

          {/* Light / Dark Theme Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className="flex items-center justify-center p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-90 cursor-pointer border border-slate-700/70"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>
          )}

          {/* Notification Bell Button with Unread Badge */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              title={
                unreadNotificationsCount > 0
                  ? `Notifications (${unreadNotificationsCount} unread)`
                  : 'Notification Center'
              }
              className="relative flex items-center justify-center p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition active:scale-90 cursor-pointer border border-amber-500/35"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow border border-slate-950 animate-pulse">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* Audio Toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-90 cursor-pointer border border-slate-700/70"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* Profile Button */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-xs sm:text-sm font-bold text-white transition active:scale-95 cursor-pointer"
            title="View & Edit Profile"
          >
            <UserCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm">{currentUser.avatar}</span>
            <span className="max-w-[75px] truncate hidden md:inline">{currentUser.username}</span>
          </button>

          {/* Clearly Visible Logout Button on Right Corner */}
          <button
            type="button"
            onClick={onLogout}
            title="Logout from Account"
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/50 text-xs sm:text-sm font-black shadow-md shadow-rose-600/25 transition active:scale-95 cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Action Strip */}
      <div className="flex lg:hidden items-center gap-2 overflow-x-auto no-scrollbar pt-2 mt-2 border-t border-slate-800/80 w-full">
        <button
          type="button"
          onClick={() => onOpenCashier('withdraw')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-emerald-400 border border-emerald-500/30 text-xs font-bold shrink-0 cursor-pointer"
        >
          <ArrowUpCircle className="w-3.5 h-3.5" />
          <span>Withdraw</span>
        </button>

        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-white border border-emerald-500/30 text-xs font-bold shrink-0 cursor-pointer"
        >
          <UserCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Profile</span>
        </button>

        {currentUser.role === 'admin' && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-black shrink-0 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenReferral}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 text-amber-300 border border-amber-500/20 text-xs font-bold shrink-0 cursor-pointer"
        >
          <Gift className="w-3.5 h-3.5" />
          <span>Refer (10%)</span>
        </button>

        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 text-slate-200 border border-slate-700 text-xs font-bold shrink-0 cursor-pointer"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Leaders</span>
        </button>

        <button
          type="button"
          onClick={onOpenProvablyFair}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 text-emerald-400 border border-emerald-500/20 text-xs font-bold shrink-0 cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Fairness</span>
        </button>

        <a
          href="https://whatsapp.com/channel/0029Vb8vhzCHFxOtG2NiJK2w"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 text-slate-950 text-xs font-black shrink-0"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Official WA Channel</span>
        </a>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white border border-rose-400/50 text-xs font-black shrink-0 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
