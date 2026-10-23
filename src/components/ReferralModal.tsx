import React, { useState, useEffect } from 'react';
import { User } from '../types/game';
import {
  getUsers,
  getReferredUsersList,
  syncUsersWithServer,
} from '../services/storage';
import { soundService } from '../services/sound';
import {
  Gift,
  Copy,
  Check,
  Users,
  DollarSign,
  Share2,
  X,
  Award,
  UserPlus,
  ExternalLink,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onClaimRewards: () => void;
  onOpenRegisterWithPromo?: (promoCode: string) => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onClaimRewards,
  onOpenRegisterWithPromo,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [liveUser, setLiveUser] = useState<User>(currentUser);
  const [referredMembers, setReferredMembers] = useState<User[]>(() =>
    getReferredUsersList(currentUser.referralCode)
  );

  useEffect(() => {
    setLiveUser(currentUser);
    setReferredMembers(getReferredUsersList(currentUser.referralCode));
  }, [currentUser]);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    const refreshReferrals = async () => {
      await syncUsersWithServer().catch(() => {});
      if (!mounted) return;
      const latest = getUsers().find((u) => u.id === currentUser.id) || currentUser;
      const list = getReferredUsersList(latest.referralCode);
      setLiveUser(latest);
      setReferredMembers(list);
    };

    refreshReferrals();
    const interval = setInterval(refreshReferrals, 3000);
    const onStorage = () => {
      if (!mounted) return;
      const latest = getUsers().find((u) => u.id === currentUser.id) || currentUser;
      setLiveUser(latest);
      setReferredMembers(getReferredUsersList(latest.referralCode));
    };
    window.addEventListener('storage', onStorage);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const referralUrl = `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(
    liveUser.referralCode
  )}`;

  const totalInvitedCount = Math.max(liveUser.referralCount || 0, referredMembers.length);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(liveUser.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleClickReferralLink = () => {
    try {
      localStorage.setItem('lionbet_pending_ref_code', liveUser.referralCode);
      const nextUrl = `${window.location.pathname}?ref=${encodeURIComponent(
        liveUser.referralCode
      )}`;
      window.history.replaceState({}, '', nextUrl);
    } catch {}
    onClose();
    onOpenRegisterWithPromo?.(liveUser.referralCode);
  };

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `🦁 Join Lion Bet Sri Lanka! Register with my Promo Code ${liveUser.referralCode} to unlock a 100% 1st Deposit Bonus: ${referralUrl}`
  )}`;

  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(
    referralUrl
  )}&text=${encodeURIComponent(
    `🦁 Join Lion Bet! Register using Promo Code ${liveUser.referralCode} to get a 100% 1st Deposit Bonus!`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                Refer &amp; Earn • Live Referral Tracking
              </h2>
              <p className="text-xs text-slate-400">
                100% 1st Deposit Bonus for Promo Code Registrations • 10% Deposit &amp; 2% Bet Commission
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs text-slate-300 overflow-y-auto">
          {/* Key Metric Cards in LKR */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <span className="text-[10px] text-slate-400 font-bold block uppercase">
                Friends Invited
              </span>
              <span className="text-lg font-black text-white">{totalInvitedCount}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <Award className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <span className="text-[10px] text-slate-400 font-bold block uppercase">
                Total Earned
              </span>
              <span className="text-base font-black text-purple-400">
                Rs. {(liveUser.referralEarnings || 0).toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <DollarSign className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <span className="text-[10px] text-slate-400 font-bold block uppercase">
                Claimable
              </span>
              <span className="text-base font-black text-emerald-400">
                Rs. {(liveUser.unclaimedReferralRewards || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Claim Button */}
          {(liveUser.unclaimedReferralRewards || 0) > 0 && (
            <button
              type="button"
              onClick={() => {
                soundService.playCashout(true);
                onClaimRewards();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide transition shadow-lg shadow-emerald-500/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              CLAIM Rs. {(liveUser.unclaimedReferralRewards || 0).toLocaleString()} TO WALLET
            </button>
          )}

          {/* Referral Code & Share Link */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Your Referral / Promo Code
              </label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-sm font-black text-amber-400 tracking-wider">
                  {liveUser.referralCode}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  {copiedCode ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Your Referral Link (Click to Open Register with Auto-Filled Promocode)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClickReferralLink}
                  title="Click referral link to open Register page with Promocode auto-filled"
                  className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 rounded-xl font-mono text-[11px] text-emerald-400 truncate text-left flex items-center justify-between gap-2 cursor-pointer transition"
                >
                  <span className="truncate underline">{referralUrl}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Direct Action Button to Open Register Form with Promo Code Auto-Filled */}
            <button
              type="button"
              onClick={handleClickReferralLink}
              className="w-full py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Open Referral Registration (Promocode: {liveUser.referralCode})</span>
            </button>

            {/* Quick Social Share Buttons */}
            <div className="flex gap-2 pt-1">
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                WhatsApp Share
              </a>
              <a
                href={telegramShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                Telegram Share
              </a>
            </div>
          </div>

          {/* LIVE REFERRAL TRACKING TABLE (My Referred Team Members) */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="font-black text-white text-xs sm:text-sm">
                  Live Referral Tracking ({referredMembers.length} Registered with {liveUser.referralCode})
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                10% Deposit + 2% Bet Commission
              </span>
            </div>

            {referredMembers.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
                <p className="text-xs font-bold text-slate-300">
                  No friends have registered with your code ({liveUser.referralCode}) yet.
                </p>
                <p className="text-[11px] text-slate-500">
                  Share your referral link above! As soon as a player registers using your code, they will appear here with real-time tracking of their deposits, bets, and your commission.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {referredMembers.map((member) => {
                  const hasDeposited =
                    Boolean(member.hasReceivedFirstDepositBonus) ||
                    (member.totalDeposited || 0) > 0 ||
                    member.balance > 0;
                  const estCommission =
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
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center text-sm shrink-0">
                          {member.avatar || '🦁'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-white text-xs truncate">
                              {member.username}
                            </span>
                            {hasDeposited ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Deposited
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase">
                                <Clock className="w-2.5 h-2.5" /> Registered (Rs. 0)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Joined: {new Date(member.createdAt || Date.now()).toLocaleDateString()} • Wagered: Rs. {(member.totalWagered || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="text-left sm:text-right font-mono shrink-0">
                        <div className="text-[10px] text-slate-400">Your Commission</div>
                        <div className="text-xs font-black text-emerald-400">
                          +Rs. {estCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Program Rules */}
          <div className="space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
            <h4 className="font-bold text-slate-200 text-xs">How It Works:</h4>
            <p>
              • Clicking a referral link opens the <strong className="text-white">Register</strong> page with your <strong className="text-amber-400">Promocode ({liveUser.referralCode})</strong> automatically filled in.
            </p>
            <p>
              • <strong className="text-emerald-400">Exclusive 100% 1st Deposit Bonus:</strong> Only players who register using a Promocode receive a <strong>100% Bonus</strong> on their first deposit!
            </p>
            <p>
              • <strong className="text-purple-400">Automatic Referral Commission:</strong> You earn <strong>10% Commission</strong> on your referred friends&apos; deposits plus <strong>2% Commission</strong> on their bets!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
