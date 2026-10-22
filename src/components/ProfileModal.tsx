import React, { useState, useEffect } from 'react';
import { User } from '../types/game';
import { saveUser, setCurrentUser } from '../services/storage';
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  Shield,
  Save,
  CheckCircle2,
  KeyRound,
  Tag,
  Wallet,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  Calendar,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (updated: User) => void;
  onOpenAuthModal: () => void;
  onLogout?: () => void;
}

const AVATAR_OPTIONS = [
  '🦁', '👑', '🚀', '🪂', '💎', '⚡', '🔥', '🐯', '🦅', '🐉', '🍀', '🎯', '🌟', '🦊', '🦈', '🎩',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const [username, setUsername] = useState(currentUser.username);
  const [email, setEmail] = useState(currentUser.email);
  const [mobile, setMobile] = useState(currentUser.mobile || '');
  const [password, setPassword] = useState(currentUser.password || '12345678');
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState(currentUser.avatar || '🦁');
  const [referralCode, setReferralCode] = useState(currentUser.referralCode || '');
  const [referredBy, setReferredBy] = useState(currentUser.referredBy || '');
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUsername(currentUser.username);
      setEmail(currentUser.email);
      setMobile(currentUser.mobile || '');
      setPassword(currentUser.password || '12345678');
      setAvatar(currentUser.avatar || '🦁');
      setReferralCode(currentUser.referralCode || '');
      setReferredBy(currentUser.referredBy || '');
      setSavedSuccess(null);
      setErrorMsg(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const bonusBalance = Number((currentUser.bonusBalance || 0).toFixed(2));
  const withdrawableBalance = Math.max(
    0,
    Number((currentUser.balance - bonusBalance).toFixed(2))
  );

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Name cannot be empty.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Email cannot be empty.');
      return;
    }
    if (password.trim().length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      // User ID is strictly preserved and never changed
      id: currentUser.id,
      username: username.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      password: password.trim(),
      avatar,
      referralCode: referralCode.trim().toUpperCase() || currentUser.referralCode,
      referredBy: referredBy.trim().toUpperCase() || undefined,
    };

    saveUser(updatedUser);
    setCurrentUser(updatedUser);
    onUpdateUser(updatedUser);

    setSavedSuccess('Profile details updated successfully!');
    setTimeout(() => setSavedSuccess(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-cyan-500 p-0.5 shadow-lg shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-xl sm:text-2xl">
                {avatar}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-black text-white truncate">My Profile - Lion Bet</h2>
                <span className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {currentUser.role.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                All account details except User ID can be edited
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuthModal();
              }}
              className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-[11px] sm:text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              title="Switch Account / Login / Register"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Switch</span>
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[11px] sm:text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                title="Logout from Account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs py-2.5 px-4 sm:px-6 flex items-center gap-2 font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{savedSuccess}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-500/20 border-b border-rose-500/40 text-rose-300 text-xs py-2.5 px-4 sm:px-6 flex items-center gap-2 font-bold animate-fade-in">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* Body */}
        <form onSubmit={handleSaveProfile} className="p-3.5 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4 text-xs text-slate-300 flex-1">
          {/* Account Balance & Stats Overview */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
            <div className="p-2 sm:p-3 rounded-xl bg-slate-950 border border-slate-800 min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block truncate">Total Balance</span>
              <span className="text-xs sm:text-sm font-black text-white mt-0.5 block truncate">
                Rs. {currentUser.balance.toLocaleString()}
              </span>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 uppercase block truncate">Withdrawable</span>
              <span className="text-xs sm:text-sm font-black text-emerald-400 mt-0.5 block truncate">
                Rs. {withdrawableBalance.toLocaleString()}
              </span>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 uppercase block truncate">1st Bonus</span>
              <span className="text-xs sm:text-sm font-black text-amber-400 mt-0.5 block truncate">
                Rs. {bonusBalance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 1. USER ID (READ-ONLY - CANNOT BE CHANGED) */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <label className="font-black text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>User ID (Cannot be changed)</span>
              </label>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Read-Only
              </span>
            </div>
            <input
              type="text"
              value={currentUser.id}
              disabled
              readOnly
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-400 cursor-not-allowed select-all"
            />
          </div>

          {/* 2. PROFILE ICON / AVATAR SELECTOR */}
          <div>
            <label className="font-bold text-slate-300 block mb-1.5">
              Select Profile Icon / Avatar:
            </label>
            <div className="grid grid-cols-8 gap-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              {AVATAR_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAvatar(item)}
                  className={`h-9 rounded-lg flex items-center justify-center text-base transition cursor-pointer ${
                    avatar === item
                      ? 'bg-emerald-500/25 border-2 border-emerald-400 scale-105'
                      : 'bg-slate-900 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* 3. EDITABLE PERSONAL DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Full Name / Username</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                placeholder="Your Name"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mobile Number</span>
              </label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white font-mono focus:outline-none focus:border-emerald-500"
                placeholder="07XXXXXXXX"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Password</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-9 py-2.5 text-xs font-bold text-white font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>My Referral Code</span>
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                placeholder="WINX777"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                <span>Promo / Referred By Code</span>
              </label>
              <input
                type="text"
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white font-mono focus:outline-none focus:border-purple-500"
                placeholder="Optional Promo Code"
              />
            </div>
          </div>

          {/* Extra Account Metadata */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 block">Total Wagered</span>
              <span className="font-black text-white">Rs. {currentUser.totalWagered.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Won</span>
              <span className="font-black text-emerald-400">Rs. {currentUser.totalWon.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Referrals</span>
              <span className="font-black text-amber-400">{currentUser.referralCount} Players</span>
            </div>
            <div>
              <span className="text-slate-500 block flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Joined
              </span>
              <span className="font-bold text-slate-300">
                {new Date(currentUser.createdAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm tracking-wide transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>SAVE PROFILE CHANGES</span>
          </button>
        </form>
      </div>
    </div>
  );
};
