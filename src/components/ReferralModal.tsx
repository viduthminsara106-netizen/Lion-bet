import React, { useState } from 'react';
import { User } from '../types/game';
import { soundService } from '../services/sound';
import { Gift, Copy, Check, Users, DollarSign, Share2, X, Award } from 'lucide-react';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onClaimRewards: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onClaimRewards,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const referralUrl = `${window.location.origin}?ref=${currentUser.referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentUser.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`🎈 Join Balloon Crash Sri Lanka! Parachute out before the balloon pops! Use code ${currentUser.referralCode} for Rs. 1,000 bonus: ${referralUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareTelegram = () => {
    const text = encodeURIComponent(`🎈 Balloon Crash LKR Betting Game! Cash out and parachute to safety: ${referralUrl}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Refer &amp; Earn Program</h2>
              <p className="text-xs text-slate-400">Earn lifetime 10% LKR commissions on every flight</p>
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

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          {/* Key Metric Cards in LKR */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Friends Invited</span>
              <span className="text-lg font-black text-white">{currentUser.referralCount}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <Award className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Earned</span>
              <span className="text-base font-black text-purple-400">Rs. {currentUser.referralEarnings.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <DollarSign className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Claimable</span>
              <span className="text-base font-black text-emerald-400">Rs. {currentUser.unclaimedReferralRewards.toLocaleString()}</span>
            </div>
          </div>

          {/* Claim Button */}
          {currentUser.unclaimedReferralRewards > 0 && (
            <button
              type="button"
              onClick={() => {
                soundService.playCashout(true);
                onClaimRewards();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide transition shadow-lg shadow-emerald-500/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              CLAIM Rs. {currentUser.unclaimedReferralRewards.toLocaleString()} TO WALLET
            </button>
          )}

          {/* Referral Code & Share Link */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Your Referral Code</label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-sm font-black text-amber-400 tracking-wider">
                  {currentUser.referralCode}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Your Referral Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 truncate focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Quick Social Share Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={shareWhatsApp}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                WhatsApp Share
              </button>
              <button
                type="button"
                onClick={shareTelegram}
                className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                Telegram Share
              </button>
            </div>
          </div>

          {/* Program Rules */}
          <div className="space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
            <h4 className="font-bold text-slate-200 text-xs">How It Works:</h4>
            <p>• Share your unique Lion Bet referral link or referral code with your friends.</p>
            <p>• Every friend who registers using your code receives a <strong className="text-emerald-400">Rs. 1,000 LKR Welcome Bonus</strong>.</p>
            <p>• You earn a lifetime <strong className="text-amber-400">10% commission</strong> on the house turnover from every flight they play!</p>
          </div>
        </div>
      </div>
    </div>
  );
};
