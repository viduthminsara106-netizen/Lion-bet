import React, { useState, useEffect } from 'react';
import { User, BetRecord, Transaction, SportsBetSlip } from '../types/game';
import { LION_BET_LOGO_URL } from '../services/brandAssets';
import {
  getUsers,
  getTransactions,
  getBetHistory,
  saveUser,
  setCurrentUser,
  getReferredUsersList,
  syncUsersWithServer,
} from '../services/storage';
import {
  Home,
  Ticket,
  Wallet,
  Menu,
  User as UserIcon,
  History,
  ArrowDownCircle,
  ArrowUpCircle,
  Gamepad2,
  Users,
  Info,
  X,
  ChevronRight,
  ArrowLeft,
  Trophy,
  ShieldCheck,
  LogOut,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  MessageCircle,
  Gift,
  Briefcase,
  Headphones,
  Crown,
  Zap,
  Send,
  HelpCircle,
} from 'lucide-react';

const SLIPS_STORAGE_KEY = 'lionbet_sports_bet_slips_v1';
const OFFICIAL_WHATSAPP_CHANNEL = 'https://whatsapp.com/channel/0029Vb8vhzCHFxOtG2NiJK2w';
const OFFICIAL_SUPPORT_WHATSAPP = 'https://wa.me/94723905537';

export const ThreeDotsLoader: React.FC<{ label?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  label,
  size = 'md',
}) => {
  const dotSize =
    size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';

  return (
    <div className="inline-flex flex-col items-center justify-center gap-2">
      <div className="flex items-center justify-center gap-2" aria-label="Loading">
        <span
          className={`${dotSize} rounded-full bg-amber-400 animate-bounce`}
          style={{ animationDelay: '0ms', animationDuration: '0.75s' }}
        />
        <span
          className={`${dotSize} rounded-full bg-emerald-400 animate-bounce`}
          style={{ animationDelay: '160ms', animationDuration: '0.75s' }}
        />
        <span
          className={`${dotSize} rounded-full bg-amber-400 animate-bounce`}
          style={{ animationDelay: '320ms', animationDuration: '0.75s' }}
        />
      </div>
      {label && (
        <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">
          {label}
        </span>
      )}
    </div>
  );
};

export const LionBetSiteLoader: React.FC<{ onFinished: () => void }> = ({ onFinished }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinished();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 select-none">
      <div className="relative flex flex-col items-center max-w-xs w-full text-center">
        {/* Logo Emblem */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-[#050505] border-2 border-amber-500/70 p-1 shadow-2xl mb-5 overflow-hidden flex items-center justify-center">
          <img
            src={LION_BET_LOGO_URL}
            alt="Lion Bet"
            className="w-full h-full object-contain rounded-xl"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1">
          LION <span className="text-amber-400">BET</span>
        </h1>
        <p className="text-xs text-slate-400 font-semibold mb-6">
          Sri Lanka&apos;s #1 Live Crash &amp; Sports Betting Arena
        </p>

        {/* 3 Dots Animation */}
        <div className="flex items-center justify-center gap-3 py-2">
          <span
            className="w-3.5 h-3.5 rounded-full bg-amber-400 animate-bounce shadow-lg shadow-amber-500/50"
            style={{ animationDelay: '0ms', animationDuration: '0.7s' }}
          />
          <span
            className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-bounce shadow-lg shadow-emerald-500/50"
            style={{ animationDelay: '150ms', animationDuration: '0.7s' }}
          />
          <span
            className="w-3.5 h-3.5 rounded-full bg-amber-400 animate-bounce shadow-lg shadow-amber-500/50"
            style={{ animationDelay: '300ms', animationDuration: '0.7s' }}
          />
        </div>

        <span className="text-[11px] font-mono text-slate-400 mt-2">
          Loading Lion Bet Arena...
        </span>
      </div>
    </div>
  );
};

interface BottomTabBarProps {
  activePage: 'lobby' | 'game' | 'mines' | 'sports';
  isMenuOpen: boolean;
  activeSlipsCount?: number;
  onSelectHome: () => void;
  onSelectBetSlip: () => void;
  onSelectDeposit: () => void;
  onToggleMenu: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activePage,
  isMenuOpen,
  activeSlipsCount = 0,
  onSelectHome,
  onSelectBetSlip,
  onSelectDeposit,
  onToggleMenu,
}) => {
  return (
    <nav
      aria-label="Primary bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 px-2 py-1.5 shadow-xl"
    >
      <div className="max-w-3xl mx-auto grid grid-cols-4 gap-1.5">
        {/* 1. Home Tab */}
        <button
          type="button"
          onClick={onSelectHome}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition cursor-pointer border ${
            activePage === 'lobby' && !isMenuOpen
              ? 'bg-slate-950 text-amber-400 border-amber-500/40 font-bold'
              : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800'
          }`}
        >
          <Home className="w-4 h-4 mb-0.5" />
          <span className="text-[11px] tracking-tight">Lobby</span>
        </button>

        {/* 2. Bet Slip Tab */}
        <button
          type="button"
          onClick={onSelectBetSlip}
          className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition cursor-pointer border ${
            activePage === 'sports' && !isMenuOpen
              ? 'bg-slate-950 text-amber-400 border-amber-500/40 font-bold'
              : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800'
          }`}
        >
          <div className="relative">
            <Ticket className="w-4 h-4 mb-0.5" />
            {activeSlipsCount > 0 && (
              <span className="absolute -top-1.5 -right-3 px-1.5 py-0.2 rounded bg-emerald-600 text-white font-mono text-[9px] font-bold">
                {activeSlipsCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-tight">Bet Slip</span>
        </button>

        {/* 3. Deposit Tab */}
        <button
          type="button"
          onClick={onSelectDeposit}
          className="flex flex-col items-center justify-center py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer"
        >
          <Wallet className="w-4 h-4 mb-0.5 text-white" />
          <span className="text-[11px] tracking-tight">Deposit</span>
        </button>

        {/* 4. Menu Tab */}
        <button
          type="button"
          onClick={onToggleMenu}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition cursor-pointer border ${
            isMenuOpen
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800'
          }`}
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span className="text-[11px] tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
};

type MenuSubView =
  | 'main'
  | 'bonuses'
  | 'become_agent'
  | 'support'
  | 'vip_club'
  | 'transactions'
  | 'bet_history'
  | 'my_team'
  | 'about';

interface SiteMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserUpdated?: (user: User) => void;
  isLuckyHourActive?: boolean;
  luckyHourRemainingMs?: number;
  onActivateLuckyHour?: () => void;
  onOpenProfile: () => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenCasino: () => void;
  onOpenBetSlip: () => void;
  onOpenReferralModal: () => void;
  onOpenRegisterWithPromo?: (promoCode: string) => void;
  onOpenLeaderboard: () => void;
  onOpenProvablyFair: () => void;
  onOpenAdmin?: () => void;
  onLogout: () => void;
}

function formatCountdownMinSec(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const SiteMenuModal: React.FC<SiteMenuModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  isLuckyHourActive = false,
  luckyHourRemainingMs = 0,
  onActivateLuckyHour,
  onOpenProfile,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenCasino,
  onOpenReferralModal,
  onOpenRegisterWithPromo,
  onOpenLeaderboard,
  onOpenProvablyFair,
  onOpenAdmin,
  onLogout,
}) => {
  const [subView, setSubView] = useState<MenuSubView>('main');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [crashBets, setCrashBets] = useState<BetRecord[]>([]);
  const [sportsSlips, setSportsSlips] = useState<SportsBetSlip[]>([]);

  // Bonuses & Promo Code States
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoFeedback, setPromoFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Become Agent Form States
  const [applicantName, setApplicantName] = useState(currentUser.username || '');
  const [applicantPhone, setApplicantPhone] = useState(currentUser.mobile || '');
  const [applicantCity, setApplicantCity] = useState('Colombo');
  const [applicantRoleType, setApplicantRoleType] = useState<
    'Full Cash Agent (Deposit & Withdraw)' | 'Deposit Agent' | 'Withdraw Agent'
  >('Full Cash Agent (Deposit & Withdraw)');
  const [applicantFloat, setApplicantFloat] = useState('100,000 LKR');
  const [agentAppSubmitted, setAgentAppSubmitted] = useState(false);

  // Contact Support Form States
  const [supportCategory, setSupportCategory] = useState('Deposit / Withdrawal Inquiry');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSent, setSupportSent] = useState(false);

  const [referredMembers, setReferredMembers] = useState<User[]>(() =>
    getReferredUsersList(currentUser.referralCode)
  );

  useEffect(() => {
    if (!isOpen) {
      setSubView('main');
      setPromoFeedback(null);
      setAgentAppSubmitted(false);
      setSupportSent(false);
      return;
    }

    const refreshMenuData = async () => {
      await syncUsersWithServer().catch(() => {});
      const latestMe = getUsers().find((u) => u.id === currentUser.id);
      if (latestMe) {
        onUserUpdated?.(latestMe);
      }
      setReferredMembers(getReferredUsersList((latestMe || currentUser).referralCode));
    };
    refreshMenuData();

    const allTx = getTransactions().filter((t) => t.userId === currentUser.id);
    setTransactions(allTx);

    const allBets = getBetHistory().filter((b) => b.userId === currentUser.id);
    setCrashBets(allBets);

    try {
      const rawSlips = localStorage.getItem(SLIPS_STORAGE_KEY);
      if (rawSlips) {
        const parsed = JSON.parse(rawSlips);
        if (Array.isArray(parsed)) {
          setSportsSlips(parsed.filter((s: SportsBetSlip) => s.userId === currentUser.id));
        }
      }
    } catch {
      setSportsSlips([]);
    }
  }, [isOpen, currentUser.id, currentUser.referralCode]);

  if (!isOpen) return null;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(currentUser.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleRedeemPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = promoCodeInput.trim().toUpperCase();
    if (!clean) return;

    const redeemedKey = `lionbet_redeemed_${currentUser.id}_${clean}`;
    if (localStorage.getItem(redeemedKey)) {
      setPromoFeedback({
        type: 'error',
        text: `Promo code "${clean}" has already been applied on your account.`,
      });
      return;
    }

    if (clean === 'LUCKY777' || clean === 'LUCKYHOUR') {
      onActivateLuckyHour?.();
      localStorage.setItem(redeemedKey, '1');
      setPromoCodeInput('');
      setPromoFeedback({
        type: 'success',
        text: 'Lucky Hour Activated for 15 Minutes! Higher crash multipliers are now boosted!',
      });
      return;
    }

    if (!currentUser.hasReceivedFirstDepositBonus) {
      const users = getUsers();
      const matchedReferrer = users.find(
        (u) =>
          u.id !== currentUser.id &&
          (u.referralCode.trim().toUpperCase() === clean ||
            u.username.trim().toUpperCase() === clean)
      );
      const canonicalCode = matchedReferrer
        ? matchedReferrer.referralCode.trim().toUpperCase()
        : clean;

      const updatedUser: User = {
        ...currentUser,
        referredBy: canonicalCode,
      };
      saveUser(updatedUser);
      if (matchedReferrer) {
        const actualCount = getUsers().filter(
          (m) =>
            m.id !== matchedReferrer.id &&
            m.referredBy &&
            m.referredBy.trim().toUpperCase() === canonicalCode
        ).length;
        saveUser({
          ...matchedReferrer,
          referralCount: Math.max((matchedReferrer.referralCount || 0) + 1, actualCount),
        });
      }
      setCurrentUser(updatedUser);
      onUserUpdated?.(updatedUser);
      localStorage.setItem(redeemedKey, '1');
      setPromoCodeInput('');
      setPromoFeedback({
        type: 'success',
        text: `Promocode "${canonicalCode}" linked! Make your 1st Deposit now to receive your 100% First Deposit Bonus!`,
      });
      return;
    }

    setPromoFeedback({
      type: 'error',
      text: '1st Deposit 100% Bonus has already been claimed on this account.',
    });
  };

  const getBecomeAgentWhatsAppUrl = () => {
    const msg = encodeURIComponent(
      `Hello Lion Bet Official Management,\n\nI want to apply to become an Official Lion Bet Cash Agent.\n• Name: ${
        applicantName || currentUser.username
      }\n• User ID: ${currentUser.id}\n• WhatsApp / Mobile: ${
        applicantPhone || 'N/A'
      }\n• City / District: ${applicantCity}\n• Agent Type: ${applicantRoleType}\n• Daily LKR Float Capacity: ${applicantFloat}\n\nPlease review my Cash Agent application.`
    );
    return `${OFFICIAL_SUPPORT_WHATSAPP}?text=${msg}`;
  };

  const getSupportWhatsAppUrl = () => {
    const msg = encodeURIComponent(
      `Hello Lion Bet 24/7 Support,\n• User: ${currentUser.username} (ID: ${currentUser.id})\n• Topic: ${supportCategory}\n• Message: ${
        supportMessage || 'I need assistance with my Lion Bet account.'
      }`
    );
    return `${OFFICIAL_SUPPORT_WHATSAPP}?text=${msg}`;
  };

  // VIP Progress Calculation
  const wagered = currentUser.totalWagered || 0;
  const vipTier =
    wagered >= 500000
      ? { name: 'Royal Lion King VIP', next: 1000000, cashback: '10%', badge: '👑' }
      : wagered >= 150000
      ? { name: 'Gold Lion VIP', next: 500000, cashback: '7%', badge: '🦁' }
      : wagered >= 35000
      ? { name: 'Silver Lion VIP', next: 150000, cashback: '5%', badge: '⚡' }
      : { name: 'Bronze Lion Member', next: 35000, cashback: '3%', badge: '🛡️' };
  const vipProgressPct = Math.min(100, Math.round((wagered / vipTier.next) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-slate-900 border-t sm:border border-slate-800 w-full max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88dvh] mb-14 sm:mb-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3 min-w-0">
            {subView !== 'main' ? (
              <button
                type="button"
                onClick={() => setSubView('main')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-[#050505] border border-amber-500/70 overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={LION_BET_LOGO_URL}
                  alt="Lion Bet"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white truncate">
                {subView === 'main' && 'Lion Bet Menu'}
                {subView === 'bonuses' && 'Bonuses & Lucky Hour'}
                {subView === 'become_agent' && 'Become a Cash Agent'}
                {subView === 'support' && '24/7 Customer Support'}
                {subView === 'vip_club' && 'VIP Club & Loyalty Rewards'}
                {subView === 'transactions' && 'Transaction History'}
                {subView === 'bet_history' && 'My Betting History'}
                {subView === 'my_team' && 'My Team & Referrals'}
                {subView === 'about' && 'About Lion Bet'}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {currentUser.avatar} {currentUser.username} · Balance: Rs.{' '}
                {currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {subView === 'main' && (
            <>
              {/* User Quick Wallet Summary */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block">Available LKR Balance</span>
                  <span className="text-lg sm:text-xl font-black font-mono tabular-nums text-emerald-400">
                    Rs. {currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDeposit();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    + Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWithdraw();
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-black text-xs cursor-pointer"
                  >
                    Withdraw
                  </button>
                </div>
              </div>

              {/* Lucky Hour Quick Status Banner inside Menu */}
              <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-amber-300">
                      {isLuckyHourActive && luckyHourRemainingMs > 0
                        ? `🍀 Lucky Hour Active (${formatCountdownMinSec(luckyHourRemainingMs)})`
                        : '🍀 Lucky Hour (15-Min Multiplier Boost)'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {isLuckyHourActive && luckyHourRemainingMs > 0
                        ? 'Higher crash multipliers are currently boosted!'
                        : 'Randomly activates during your session for 15 minutes'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubView('bonuses')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 cursor-pointer"
                >
                  View
                </button>
              </div>

              {/* Primary Menu Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Profile */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenProfile();
                  }}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white">Profile</div>
                      <div className="text-[11px] text-slate-400">Account details &amp; avatar</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {/* 2. Bonuses & Promotions */}
                <button
                  type="button"
                  onClick={() => setSubView('bonuses')}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white">Bonuses</div>
                      <div className="text-[11px] text-slate-400">
                        100% 1st Bonus, Lucky Hour &amp; Promo Codes
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {/* 3. Become an Agent */}
                <button
                  type="button"
                  onClick={() => setSubView('become_agent')}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white">
                        Become an Agent
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Earn up to 8% LKR Cashier Commission
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {/* 4. Contact Support */}
                <button
                  type="button"
                  onClick={() => setSubView('support')}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                      <Headphones className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white">
                        Contact Support
                      </div>
                      <div className="text-[11px] text-slate-400">
                        24/7 Live WhatsApp &amp; Help Desk
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {/* 5. Transaction History */}
                <button
                  type="button"
                  onClick={() => setSubView('transactions')}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white">
                        Transaction History
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Deposits &amp; withdrawals ({transactions.length})
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {/* 6. My Betting History */}
                <button
                  type="button"
                  onClick={() => setSubView('bet_history')}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white">
                        My Betting History
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Crash bets &amp; 2x Bet Slips ({crashBets.length + sportsSlips.length})
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {/* 7. Deposit */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDeposit();
                  }}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                      <ArrowDownCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white">Deposit</div>
                      <div className="text-[11px] text-slate-400">
                        Online Cash Agent, Bank &amp; 100% Bonus
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {/* 8. Withdraw */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenWithdraw();
                  }}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                      <ArrowUpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white">Withdraw</div>
                      <div className="text-[11px] text-slate-400">
                        Instant LKR Cash Agent &amp; Bank
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {/* 9. Casino */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCasino();
                  }}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                      <Gamepad2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white">Casino</div>
                      <div className="text-[11px] text-slate-400">
                        Balloon Crash LKR &amp; Live Games
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {/* 10. My Team */}
                <button
                  type="button"
                  onClick={() => setSubView('my_team')}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white">My Team</div>
                      <div className="text-[11px] text-slate-400">
                        {currentUser.referralCount} Members · 10% Commission
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {/* 11. VIP Club & Loyalty */}
                <button
                  type="button"
                  onClick={() => setSubView('vip_club')}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white">
                        VIP Club &amp; Rewards
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {vipTier.badge} {vipTier.name}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {/* 12. About Lion Bet */}
                <button
                  type="button"
                  onClick={() => setSubView('about')}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white">
                        About Lion Bet
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Rules, 2x Bet Slips &amp; Official Info
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Extra Quick Links Row */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLeaderboard();
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Leaderboard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenProvablyFair();
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Provably Fair</span>
                  </button>
                  {currentUser.role === 'admin' && onOpenAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAdmin();
                      }}
                      className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-xs font-black text-purple-300 cursor-pointer"
                    >
                      Admin Panel
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-xs font-black text-rose-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}

          {/* SUBVIEW: BONUSES & LUCKY HOUR */}
          {subView === 'bonuses' && (
            <div className="space-y-4">
              {/* 1. Lucky Hour Feature Card */}
              <div className="bg-slate-950 border border-amber-500/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                      <Zap className="w-4 h-4" />
                      <span>🍀 Lucky Hour (15-Minute High Multiplier Boost)</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Randomly activates during your session for 15 minutes, reducing early crashes
                      and increasing the probability of higher crash multipliers!
                    </p>
                  </div>
                  <span className="font-mono text-xs font-black text-emerald-400 shrink-0">
                    {isLuckyHourActive && luckyHourRemainingMs > 0
                      ? `ACTIVE (${formatCountdownMinSec(luckyHourRemainingMs)})`
                      : 'READY'}
                  </span>
                </div>

                {!isLuckyHourActive && onActivateLuckyHour && (
                  <button
                    type="button"
                    onClick={onActivateLuckyHour}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    Activate 15-Minute Lucky Hour Now
                  </button>
                )}
              </div>

              {/* 2. 100% First Deposit Bonus (Promo Code Registrations Only) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">
                    🎁 100% First Deposit Welcome Bonus
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {currentUser.hasReceivedFirstDepositBonus
                      ? 'Claimed'
                      : currentUser.referredBy
                      ? `Eligible (Promo: ${currentUser.referredBy})`
                      : 'Requires Promocode'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Exclusively for players who register using a Promocode / Referral Link! Double your first LKR deposit with a 100% matched bonus after you deposit. Current Bonus Balance: Rs. {(currentUser.bonusBalance || 0).toLocaleString()} LKR.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDeposit();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                >
                  Deposit to Claim 100% Bonus
                </button>
              </div>

              {/* 3. 100% Longest Flight Winner Bonus */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <div className="text-sm font-black text-white">
                  🏆 100% Longest Flight Round Bonus
                </div>
                <p className="text-xs text-slate-400">
                  In every Balloon Crash LKR round, the player who cashes out at the highest
                  multiplier automatically receives an extra 100% bonus on top of their winnings!
                </p>
              </div>

              {/* 4. Promo Code Redeemer */}
              <form
                onSubmit={handleRedeemPromo}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3"
              >
                <div className="text-xs font-black text-white">
                  Redeem Promo / Bonus Code (Try: LION100, LUCKY777, VIP2026)
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter Promo Code (e.g. LION100)"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    Redeem
                  </button>
                </div>
                {promoFeedback && (
                  <p
                    className={`text-xs font-bold ${
                      promoFeedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {promoFeedback.text}
                  </p>
                )}
              </form>
            </div>
          )}

          {/* SUBVIEW: BECOME A CASH AGENT */}
          {subView === 'become_agent' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 space-y-2">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <span>Official Lion Bet Cash Agent Partner Program</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Join Sri Lanka&apos;s fastest-growing LKR gaming network as an authorized Online
                  Cash Agent. Process player deposits and withdrawals via WhatsApp &amp; local bank
                  transfers and earn daily commission!
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-sm font-black text-emerald-400 block">Up to 8%</span>
                    <span className="text-[10px] text-slate-400">Deposit Commission</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-sm font-black text-amber-400 block">Up to 5%</span>
                    <span className="text-[10px] text-slate-400">Withdraw Commission</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-sm font-black text-sky-400 block">24/7 Panel</span>
                    <span className="text-[10px] text-slate-400">Dedicated Agent Login</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black text-white uppercase">
                  Apply for a Cash Agent Account
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Full Name / Agent Name</label>
                    <input
                      type="text"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                      placeholder="Your Name"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">WhatsApp Mobile Number</label>
                    <input
                      type="text"
                      value={applicantPhone}
                      onChange={(e) => setApplicantPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold"
                      placeholder="07XXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">City / District</label>
                    <input
                      type="text"
                      value={applicantCity}
                      onChange={(e) => setApplicantCity(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                      placeholder="Colombo / Kandy / Galle"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Daily Float Capacity (LKR)</label>
                    <select
                      value={applicantFloat}
                      onChange={(e) => setApplicantFloat(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                    >
                      <option value="50,000 LKR">Rs. 50,000 LKR</option>
                      <option value="100,000 LKR">Rs. 100,000 LKR</option>
                      <option value="250,000 LKR">Rs. 250,000 LKR</option>
                      <option value="500,000+ LKR">Rs. 500,000+ LKR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Preferred Agent Role</label>
                  <select
                    value={applicantRoleType}
                    onChange={(e) => setApplicantRoleType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  >
                    <option value="Full Cash Agent (Deposit & Withdraw)">
                      Full Cash Agent (Deposit &amp; Withdraw)
                    </option>
                    <option value="Deposit Agent">Deposit Agent Only</option>
                    <option value="Withdraw Agent">Withdraw Agent Only</option>
                  </select>
                </div>

                {agentAppSubmitted && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 font-bold">
                    Application prepared! Connect with Lion Bet Management on WhatsApp below to
                    receive your Agent Login ID &amp; Password.
                  </div>
                )}

                <a
                  href={getBecomeAgentWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setAgentAppSubmitted(true)}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Submit Agent Application via WhatsApp</span>
                </a>
              </div>
            </div>
          )}

          {/* SUBVIEW: CONTACT SUPPORT (24/7 HELP CENTER) */}
          {subView === 'support' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-sky-500/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Headphones className="w-5 h-5 text-sky-400" />
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Lion Bet 24/7 Live Customer Support
                    </h3>
                    <p className="text-xs text-slate-400">
                      Instant help for Deposits, Withdrawals, 2x Match Bet Slips, and Accounts
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href={OFFICIAL_SUPPORT_WHATSAPP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat with 24/7 Support (WA)</span>
                  </a>
                  <a
                    href={OFFICIAL_WHATSAPP_CHANNEL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 font-black text-xs flex items-center justify-center gap-2 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Official WhatsApp Channel</span>
                  </a>
                </div>
              </div>

              {/* Send Direct Support Message */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                <h4 className="font-black text-white flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-amber-400" />
                  <span>Send Support Ticket / Direct WhatsApp Inquiry</span>
                </h4>

                <div>
                  <label className="text-slate-400 block mb-1">Issue Category</label>
                  <select
                    value={supportCategory}
                    onChange={(e) => setSupportCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="Deposit / Withdrawal Inquiry">
                      Deposit / Withdrawal Inquiry
                    </option>
                    <option value="2x Match Bet Slip Settlement">
                      2x Match Bet Slip Settlement
                    </option>
                    <option value="Balloon Crash Round Verification">
                      Balloon Crash Round Verification
                    </option>
                    <option value="Account / Password Help">Account / Password Help</option>
                    <option value="Cash Agent Partnership">Cash Agent Partnership</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Your Message</label>
                  <textarea
                    rows={3}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Describe your question or transaction ID..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {supportSent && (
                  <p className="text-emerald-400 font-bold">
                    Support ticket logged! Opening WhatsApp Support desk for instant reply.
                  </p>
                )}

                <a
                  href={getSupportWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setSupportSent(true)}
                  className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to 24/7 Support Desk</span>
                </a>
              </div>

              {/* Quick FAQ */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="font-black text-white flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>Frequently Asked Questions</span>
                </div>
                <div className="space-y-2 text-slate-300">
                  <div>
                    <strong className="text-amber-300 block">
                      • How do Cash Agent deposits &amp; withdrawals work?
                    </strong>
                    Open Deposit or Withdraw, choose Cash Agent, and click any currently ONLINE
                    Cash Agent to open their WhatsApp directly.
                  </div>
                  <div>
                    <strong className="text-amber-300 block">
                      • How much do I win on a Match Bet Slip?
                    </strong>
                    Every winning Match Bet Slip pays out 2.00x (double your staked LKR amount).
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUBVIEW: VIP CLUB & REWARDS */}
          {subView === 'vip_club' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Your Current VIP Tier</span>
                    <h3 className="text-base font-black text-amber-400">
                      {vipTier.badge} {vipTier.name}
                    </h3>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[11px] text-slate-400 block">Cashback Rate</span>
                    <span className="text-sm font-black text-emerald-400">{vipTier.cashback}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1 font-mono">
                    <span className="text-slate-400">
                      Total Wagered: Rs. {wagered.toLocaleString()}
                    </span>
                    <span className="text-amber-300">{vipProgressPct}% to Next Tier</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${vipProgressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {[
                  {
                    tier: '🛡️ Bronze Lion',
                    req: 'Rs. 0+',
                    perks: '3% Weekly Cashback · 2x Sports Bet Slips',
                  },
                  {
                    tier: '⚡ Silver Lion',
                    req: 'Rs. 35,000+',
                    perks: '5% Weekly Cashback · Priority Withdrawals',
                  },
                  {
                    tier: '🦁 Gold Lion VIP',
                    req: 'Rs. 150,000+',
                    perks: '7% Weekly Cashback · Dedicated VIP Cash Agent',
                  },
                  {
                    tier: '👑 Royal Lion King',
                    req: 'Rs. 500,000+',
                    perks: '10% Weekly Cashback · Instant High-Limit Payouts',
                  },
                ].map((item) => (
                  <div
                    key={item.tier}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between font-black text-white">
                      <span>{item.tier}</span>
                      <span className="font-mono text-amber-400 text-[11px]">{item.req}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{item.perks}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUBVIEW: TRANSACTION HISTORY */}
          {subView === 'transactions' && (
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <History className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-sm font-black text-white">No Transactions Yet</div>
                  <p className="text-xs text-slate-400">
                    Your LKR deposits and withdrawals will appear here.
                  </p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black uppercase ${
                            tx.type === 'deposit' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {tx.type}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-300 font-semibold">{tx.method}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{tx.accountDetails}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {new Date(tx.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black font-mono tabular-nums text-white">
                        {tx.type === 'deposit' ? '+' : '-'}Rs. {tx.amount.toLocaleString()}
                      </div>
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase mt-0.5">
                        {tx.status === 'completed' ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        ) : tx.status === 'rejected' ? (
                          <span className="text-rose-400 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SUBVIEW: MY BETTING HISTORY */}
          {subView === 'bet_history' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase text-amber-400 mb-2">
                  Sports 2x Bet Slips ({sportsSlips.length})
                </h3>
                {sportsSlips.length === 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 text-center">
                    No Sports Bet Slips placed yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sportsSlips.slice(0, 20).map((slip) => (
                      <div
                        key={slip.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-black text-white">
                            {slip.selections.map((s) => s.matchTitle).join(' + ')}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Pick: {slip.selections.map((s) => s.selectionLabel).join(', ')} · 2x Win Rule
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {new Date(slip.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <div className="text-white font-bold">
                            Bet: Rs. {slip.stake.toLocaleString()}
                          </div>
                          <div
                            className={`font-black ${
                              slip.status === 'won'
                                ? 'text-emerald-400'
                                : slip.status === 'lost'
                                ? 'text-rose-400'
                                : 'text-amber-300'
                            }`}
                          >
                            {slip.status === 'won'
                              ? `WON +Rs. ${slip.payout.toLocaleString()} (2x)`
                              : slip.status === 'lost'
                              ? 'LOST'
                              : `2x Win: Rs. ${(slip.stake * 2).toLocaleString()}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-black uppercase text-emerald-400 mb-2">
                  Crash Game Bets ({crashBets.length})
                </h3>
                {crashBets.length === 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 text-center">
                    No Crash Game bets recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {crashBets.slice(0, 25).map((b) => (
                      <div
                        key={b.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-black text-white">
                            Round #{b.roundNumber} · Balloon Crash
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {new Date(b.timestamp).toLocaleString()} · Crash @{' '}
                            {b.crashPoint.toFixed(2)}x
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <div className="text-slate-300">Rs. {b.amount.toLocaleString()}</div>
                          {b.status === 'won' && b.winAmount ? (
                            <div className="font-black text-emerald-400">
                              +Rs. {b.winAmount.toLocaleString()} (@
                              {b.cashoutMultiplier?.toFixed(2)}x)
                            </div>
                          ) : (
                            <div className="font-bold text-rose-400">Crashed</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBVIEW: MY TEAM */}
          {subView === 'my_team' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="text-xs text-slate-400">Your Team Referral / Promo Code</div>
                <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5">
                  <span className="font-mono font-black text-base text-amber-400">
                    {currentUser.referralCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyReferral}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="text-xs text-slate-400 pt-1">
                  Your Referral Link (Click to Open Register with Auto-Filled Promocode)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.setItem('lionbet_pending_ref_code', currentUser.referralCode);
                        const nextUrl = `${window.location.pathname}?ref=${encodeURIComponent(
                          currentUser.referralCode
                        )}`;
                        window.history.replaceState({}, '', nextUrl);
                      } catch {}
                      onClose();
                      onOpenRegisterWithPromo?.(currentUser.referralCode);
                    }}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 rounded-xl px-3 py-2 text-left font-mono text-[11px] text-emerald-400 truncate underline cursor-pointer"
                  >
                    {`${window.location.origin}${window.location.pathname}?ref=${currentUser.referralCode}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}${window.location.pathname}?ref=${currentUser.referralCode}`;
                      navigator.clipboard.writeText(url);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer shrink-0"
                  >
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Team Members</span>
                    <span className="text-sm font-black text-white">
                      {Math.max(currentUser.referralCount || 0, referredMembers.length)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Total Earned</span>
                    <span className="text-sm font-black text-emerald-400">
                      Rs. {(currentUser.referralEarnings || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Unclaimed</span>
                    <span className="text-sm font-black text-amber-400">
                      Rs. {(currentUser.unclaimedReferralRewards || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Referred Team Members Live Tracking List */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">
                    Referred Team Members ({referredMembers.length})
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400">
                    10% Deposit + 2% Bet Commission
                  </span>
                </div>
                {referredMembers.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center text-[11px] text-slate-400">
                    No players have registered with your code ({currentUser.referralCode}) yet. Share your link above to build your team!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {referredMembers.map((member) => {
                      const hasDeposited =
                        Boolean(member.hasReceivedFirstDepositBonus) ||
                        (member.totalDeposited || 0) > 0 ||
                        member.balance > 0;
                      const estComm =
                        member.commissionGeneratedForReferrer ??
                        Number(
                          (
                            (member.totalDeposited || 0) * 0.1 +
                            (member.totalWagered || 0) * 0.02
                          ).toFixed(2)
                        );
                      return (
                        <div
                          key={member.id}
                          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{member.avatar || '🦁'}</span>
                            <div className="min-w-0">
                              <div className="font-black text-white truncate">
                                {member.username}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {hasDeposited ? '✓ Deposited' : 'Registered (Rs. 0)'} · Wagered: Rs.{' '}
                                {(member.totalWagered || 0).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right font-mono shrink-0">
                            <div className="text-[10px] text-slate-400">Commission</div>
                            <div className="text-xs font-black text-emerald-400">
                              +Rs. {estComm.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReferralModal();
                }}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs cursor-pointer"
              >
                Open Full My Team &amp; Referral Dashboard
              </button>
            </div>
          )}

          {/* SUBVIEW: ABOUT LION BET */}
          {subView === 'about' && (
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <h3 className="text-sm font-black text-white">
                  Lion Bet — Sri Lanka&apos;s Premier LKR Gaming &amp; Sports Platform
                </h3>
                <p className="text-slate-400">
                  Lion Bet provides real-time multiplayer Crash Games (Balloon Crash LKR) and Live
                  World Sports Bet Slips with instant LKR deposits and withdrawals through verified
                  online site Cash Agents and local banks.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <h4 className="font-black text-amber-400">Key Platform Features</h4>
                <ul className="space-y-1.5 text-slate-300">
                  <li>
                    • <strong>🍀 15-Minute Lucky Hour:</strong> Randomly activates during game
                    sessions to boost the probability of higher crash multipliers.
                  </li>
                  <li>
                    • <strong>2x Match Bet Slips:</strong> Place a Bet Slip directly next to any
                    live or upcoming match — every winning Bet Slip pays out <strong>2x</strong>{' '}
                    your staked amount!
                  </li>
                  <li>
                    • <strong>100% First Deposit Bonus:</strong> New players receive a 100% matched
                    bonus on their first LKR deposit.
                  </li>
                  <li>
                    • <strong>Verified Online Cash Agents:</strong> Select any currently online Cash
                    Agent inside Deposit / Withdraw to connect directly via WhatsApp.
                  </li>
                </ul>
              </div>

              <a
                href={OFFICIAL_WHATSAPP_CHANNEL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Join Official Lion Bet WhatsApp Channel</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
