import React, { useState, useEffect } from 'react';
import { User } from '../types/game';
import {
  getUsers,
  saveUser,
  setCurrentUser,
  fetchCashAgentsWithPresence,
  recordUserPresenceHeartbeat,
} from '../services/storage';
import { googleSignIn } from '../services/firebaseAuth';
import {
  LogIn,
  UserPlus,
  User as UserIcon,
  Phone,
  Mail,
  Lock,
  Tag,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'login' | 'register';
  initialPromoCode?: string;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

const REMEMBER_STORAGE_KEY = 'balloon_lkr_remember_credentials';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'register',
  initialPromoCode = '',
  onClose,
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);

  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [promoCode, setPromoCode] = useState(initialPromoCode);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Shared Remember Me State
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Load remembered credentials, check referral link promo code, & sync Admin-created Cash Agents
  useEffect(() => {
    if (isOpen) {
      fetchCashAgentsWithPresence().catch(() => {});
      setTab(initialTab);
    }

    // Check URL or prop for referral / promo code auto-fill
    try {
      const params = new URLSearchParams(window.location.search);
      const urlRef =
        params.get('ref') ||
        params.get('promo') ||
        params.get('referral') ||
        initialPromoCode ||
        localStorage.getItem('lionbet_pending_ref_code') ||
        '';
      if (urlRef.trim()) {
        setPromoCode(urlRef.trim().toUpperCase());
        setTab('register');
      }
    } catch {}

    try {
      const saved = localStorage.getItem(REMEMBER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.identifier) setLoginIdentifier(parsed.identifier);
        if (parsed.password) setLoginPassword(parsed.password);
        setRememberMe(true);
      }
    } catch {}
  }, [isOpen, initialTab, initialPromoCode]);

  if (!isOpen) return null;

  const normalizePhone = (val: string) => val.replace(/\s+/g, '').replace(/^\+94/, '0');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = loginIdentifier.trim();
    const cleanPhone = normalizePhone(cleanId);

    // Sync latest Admin-created Cash Agents from server before checking credentials
    await fetchCashAgentsWithPresence().catch(() => {});
    const users = getUsers();

    // Direct Admin Credentials Check: 0711452778 / 12345678
    if (cleanPhone === '0711452778') {
      if (loginPassword !== '12345678') {
        setError('Invalid admin password.');
        return;
      }
      let adminUser = users.find((u) => u.role === 'admin' || u.id === 'user_admin_1');
      if (!adminUser) {
        adminUser = {
          id: 'user_admin_1',
          username: 'BalloonAdminLK',
          mobile: '0711452778',
          email: 'admin@balloon.lk',
          password: '12345678',
          role: 'admin',
          balance: 150000.0,
          referralCode: 'ADMINLK',
          referralCount: 15,
          referralEarnings: 32000.0,
          unclaimedReferralRewards: 8500.0,
          totalWagered: 120000.0,
          totalWon: 135000.0,
          isBanned: false,
          avatar: '👑',
          createdAt: Date.now(),
        };
        saveUser(adminUser);
      }
      if (rememberMe) {
        localStorage.setItem(
          REMEMBER_STORAGE_KEY,
          JSON.stringify({ identifier: cleanId, password: loginPassword })
        );
      } else {
        localStorage.removeItem(REMEMBER_STORAGE_KEY);
      }
      setCurrentUser(adminUser);
      recordUserPresenceHeartbeat(adminUser);
      onLoginSuccess(adminUser);
      onClose();
      return;
    }

    // Match user by Mobile Number, Email, Username, or Agent ID
    const found = users.find(
      (u) =>
        (u.mobile && normalizePhone(u.mobile) === cleanPhone) ||
        u.email.toLowerCase() === cleanId.toLowerCase() ||
        u.username.toLowerCase() === cleanId.toLowerCase() ||
        u.id.toLowerCase() === cleanId.toLowerCase()
    );

    if (!found) {
      setError('Account not found. Please check your Mobile Number, Email, or Agent Login ID.');
      return;
    }

    if (found.password && found.password !== loginPassword) {
      setError('Incorrect password. Please try again.');
      return;
    }

    if (found.isBanned) {
      setError('This account has been suspended by the administrator.');
      return;
    }

    if (rememberMe) {
      localStorage.setItem(
        REMEMBER_STORAGE_KEY,
        JSON.stringify({ identifier: cleanId, password: loginPassword })
      );
    } else {
      localStorage.removeItem(REMEMBER_STORAGE_KEY);
    }

    setCurrentUser(found);
    recordUserPresenceHeartbeat(found);
    onLoginSuccess(found);
    onClose();
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedMobile = normalizePhone(mobile.trim());
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError('Please enter your Name.');
      return;
    }
    if (!trimmedMobile || trimmedMobile.length < 9) {
      setError('Please enter a valid Mobile Number (e.g. 0771234567).');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid Email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please confirm your password.');
      return;
    }

    const users = getUsers();
    if (
      trimmedMobile === '0711452778' ||
      users.some((u) => u.mobile && normalizePhone(u.mobile) === trimmedMobile)
    ) {
      setError('An account with this Mobile Number already exists.');
      return;
    }
    if (users.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      setError('An account with this Email already exists.');
      return;
    }

    const newReferralCode =
      trimmedName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 5) + Math.floor(100 + Math.random() * 900);

    // Check Promo / Referral Code:
    // Only users who register with a Promo / Referral Code qualify for the 100% 1st Deposit Bonus after depositing!
    // Initial balance is strictly Rs. 0.00 until the user deposits or an Admin/Cash Agent updates their balance.
    let referredByUser: User | undefined;
    const cleanPromo = promoCode.trim().toUpperCase();
    if (cleanPromo) {
      referredByUser = users.find((u) => u.referralCode.toUpperCase() === cleanPromo);
      if (referredByUser) {
        referredByUser.referralCount += 1;
        saveUser(referredByUser);
      }
    }

    const avatars = ['🦁', '🪂', '💎', '🧑‍🚀', '⚡️', '👑', '🚀', '🎯', '🍀'];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    const newUser: User = {
      id: 'user_' + Date.now(),
      username: trimmedName,
      mobile: trimmedMobile,
      email: trimmedEmail,
      password,
      role: 'player',
      balance: 0.0, // Initial balance is 0 until deposit or Admin/Agent balance update
      bonusBalance: 0.0,
      hasReceivedFirstDepositBonus: false,
      referralCode: newReferralCode,
      referredBy: referredByUser?.referralCode || (cleanPromo ? cleanPromo : undefined),
      referralCount: 0,
      referralEarnings: 0,
      unclaimedReferralRewards: 0,
      totalWagered: 0,
      totalWon: 0,
      isBanned: false,
      avatar: randomAvatar,
      createdAt: Date.now(),
    };

    try {
      localStorage.removeItem('lionbet_pending_ref_code');
    } catch {}

    if (rememberMe) {
      localStorage.setItem(
        REMEMBER_STORAGE_KEY,
        JSON.stringify({ identifier: trimmedMobile, password })
      );
    } else {
      localStorage.removeItem(REMEMBER_STORAGE_KEY);
    }

    saveUser(newUser);
    setCurrentUser(newUser);
    onLoginSuccess(newUser);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);
      const res = await googleSignIn();
      if (res?.user) {
        const users = getUsers();
        let existing = users.find(
          (u) => u.email.toLowerCase() === res.user.email?.toLowerCase()
        );
        if (!existing) {
          const cleanPromo = promoCode.trim().toUpperCase();
          const newCode =
            (res.user.displayName || 'USER')
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
              .substring(0, 5) + Math.floor(100 + Math.random() * 900);
          existing = {
            id: 'google_' + res.user.uid,
            username: res.user.displayName || 'GooglePlayer',
            email: res.user.email || 'google@user.com',
            role: 'player',
            balance: 0.0, // Initial balance is 0 until deposit or Admin/Agent balance update
            bonusBalance: 0.0,
            hasReceivedFirstDepositBonus: false,
            referralCode: newCode,
            referredBy: cleanPromo ? cleanPromo : undefined,
            referralCount: 0,
            referralEarnings: 0,
            unclaimedReferralRewards: 0,
            totalWagered: 0,
            totalWon: 0,
            isBanned: false,
            avatar: '🌐',
            createdAt: Date.now(),
          };
          saveUser(existing);
        }
        setCurrentUser(existing);
        onLoginSuccess(existing);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Google sign-in was cancelled or failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/75">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-amber-500/60 shadow flex items-center justify-center overflow-hidden shrink-0">
              <img
                src="/assets/aistudio/file_0000000012b48211a458c023cc759725_1a4c4c4a.png"
                alt="Lion Bet Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                {tab === 'login' ? 'Lion Bet Login' : 'Join Lion Bet'}
              </h2>
              <p className="text-xs text-amber-400/90 font-semibold">
                Lion Bet • Play • Bet • Win
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-black transition border-b-2 cursor-pointer ${
              tab === 'login'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-black transition border-b-2 cursor-pointer ${
              tab === 'register'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3.5">
              {/* Mobile Number, Email, or Agent Login ID */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Mobile Number, Email, or Agent Login ID
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="07XXXXXXXX, email, or Agent Login ID"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                <div
                  onClick={() => setRememberMe((prev) => !prev)}
                  className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                    rememberMe
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                      : 'bg-slate-950 border-slate-700'
                  }`}
                >
                  {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-xs font-semibold text-slate-300">
                  Remember me
                </span>
              </label>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-sm tracking-wide transition shadow-lg shadow-emerald-500/25 active:scale-98 cursor-pointer"
              >
                Login
              </button>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[10px] text-slate-400 leading-relaxed">
                <span className="font-bold text-amber-400">Cash Agent / Staff Login:</span> Enter the Login ID / Mobile &amp; Password created for you by the Lion Bet Administrator.
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              {/* 1. Name */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Name
                </label>
                <div className="relative flex items-center">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 2. Mobile Number */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Mobile number
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* 3. Email */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 4. Password */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((prev) => !prev)}
                    className="absolute right-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showRegPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 5. Confirm Password */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Confirm password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 6. Promocode */}
              <div>
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between mb-1">
                  <span>Promocode / Referral Code</span>
                  <span className="text-emerald-400 text-[10px] font-semibold">
                    Required for 1st Deposit 100% Bonus
                  </span>
                </label>
                <div className="relative flex items-center">
                  <Tag className="w-4 h-4 text-emerald-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter promocode for 100% 1st Deposit Bonus"
                    className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl pl-10 pr-3 py-2.5 text-xs font-mono uppercase text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {promoCode.trim() ? (
                  <p className="text-[10px] text-emerald-400 font-bold mt-1">
                    ✓ Promocode &ldquo;{promoCode.trim().toUpperCase()}&rdquo; active — You will receive a 100% Bonus on your 1st Deposit!
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-300/90 mt-1">
                    * Only accounts registered with a Promocode receive the 100% 1st Deposit Bonus upon depositing. New accounts start at Rs. 0.00 balance.
                  </p>
                )}
              </div>

              {/* 7. Tick for Remember Me */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                <div
                  onClick={() => setRememberMe((prev) => !prev)}
                  className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                    rememberMe
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                      : 'bg-slate-950 border-slate-700'
                  }`}
                >
                  {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-xs font-semibold text-slate-300">
                  Remember me
                </span>
              </label>

              {/* 8. Register Button */}
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-slate-950 font-black text-sm tracking-wide transition shadow-lg shadow-emerald-500/25 active:scale-98 cursor-pointer mt-1"
              >
                Register
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500">
              <span className="bg-slate-900 px-2">Or</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-3 active:scale-98 cursor-pointer"
          >
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="w-4 h-4"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            <span>
              {isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
