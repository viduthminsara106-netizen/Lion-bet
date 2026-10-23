import React, { useState, useEffect } from 'react';
import { User } from '../types/game';
import {
  getUsers,
  saveUser,
  setCurrentUser,
  fetchCashAgentsWithPresence,
  recordUserPresenceHeartbeat,
  syncUsersWithServer,
  getUrlReferralCode,
} from '../services/storage';
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
  const [promoCode, setPromoCode] = useState(() => {
    try {
      return (
        getUrlReferralCode() ||
        initialPromoCode ||
        localStorage.getItem('lionbet_pending_ref_code') ||
        ''
      )
        .trim()
        .toUpperCase();
    } catch {
      return initialPromoCode;
    }
  });
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Shared Remember Me State
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Load remembered credentials, check referral link promo code, & sync Admin-created Cash Agents + Users
  useEffect(() => {
    if (isOpen) {
      fetchCashAgentsWithPresence().catch(() => {});
      syncUsersWithServer().catch(() => {});
      setTab(initialTab);
    }

    // Check URL or prop for referral / promo code auto-fill
    try {
      const urlRef =
        getUrlReferralCode() ||
        initialPromoCode ||
        localStorage.getItem('lionbet_pending_ref_code') ||
        '';
      if (urlRef.trim()) {
        const cleanRef = urlRef.trim().toUpperCase();
        localStorage.setItem('lionbet_pending_ref_code', cleanRef);
        setPromoCode(cleanRef);
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

  const normalizePhone = (val: string) => {
    const d = val.replace(/[\s\-()]/g, '');
    if (d.startsWith('+94') && d.length >= 11) return '0' + d.slice(3);
    if (d.startsWith('94') && d.length === 11) return '0' + d.slice(2);
    if (/^7\d{8}$/.test(d)) return '0' + d;
    return d;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = loginIdentifier.trim();
    const cleanPhone = normalizePhone(cleanId);
    const cleanIdLower = cleanId.toLowerCase();
    const cleanIdCompact = cleanIdLower.replace(/[\s_]+/g, '');

    // Sync latest Admin-created Cash Agents & Users/Referrals from server before checking credentials
    await Promise.all([
      fetchCashAgentsWithPresence().catch(() => {}),
      syncUsersWithServer().catch(() => {}),
    ]);
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

    // 1. Try server-authoritative login first so accounts/agents created on another device are always found
    let serverFoundUser: User | null = null;
    let serverAuthError: string | null = null;
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password: loginPassword }),
      });
      const data = await resp.json();
      if (resp.ok && data?.ok && data?.user) {
        serverFoundUser = data.user as User;
      } else if (resp.status === 401 || resp.status === 403) {
        serverAuthError = data?.error || null;
      }
    } catch {}

    // 2. Match user locally by Mobile Number, Agent Contact, Email, Username, or Agent ID
    const localFound = users.find((u) => {
      const uPhone = u.mobile ? normalizePhone(u.mobile) : '';
      const uContact = u.agentContact ? normalizePhone(u.agentContact) : '';
      const uNameLower = u.username.trim().toLowerCase();
      const uNameCompact = uNameLower.replace(/[\s_]+/g, '');
      return (
        (cleanPhone && (uPhone === cleanPhone || uContact === cleanPhone)) ||
        (u.mobile && u.mobile.trim().toLowerCase() === cleanIdLower) ||
        (u.agentContact && u.agentContact.trim().toLowerCase() === cleanIdLower) ||
        u.email.trim().toLowerCase() === cleanIdLower ||
        uNameLower === cleanIdLower ||
        uNameCompact === cleanIdCompact ||
        u.id.toLowerCase() === cleanIdLower
      );
    });

    const found = serverFoundUser || localFound;

    if (!found) {
      setError(
        serverAuthError ||
          'Account not found. Please check your Mobile Number, Username, Email, or Agent Login ID.'
      );
      return;
    }

    if (
      !serverFoundUser &&
      found.password &&
      found.password.trim() !== loginPassword.trim() &&
      found.password !== loginPassword
    ) {
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

    saveUser(found);
    setCurrentUser(found);
    recordUserPresenceHeartbeat(found);
    onLoginSuccess(found);
    onClose();
  };

  const handleRegister = async (e: React.FormEvent) => {
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

    await syncUsersWithServer().catch(() => {});
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
    const cleanPromo = promoCode.trim().toUpperCase();
    const referredByUser = cleanPromo
      ? users.find(
          (u) =>
            u.referralCode.trim().toUpperCase() === cleanPromo ||
            u.username.trim().toUpperCase() === cleanPromo
        )
      : undefined;

    const avatars = ['🦁', '🪂', '💎', '🧑‍🚀', '⚡️', '👑', '🚀', '🎯', '🍀'];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    const canonicalReferredBy = referredByUser
      ? referredByUser.referralCode.trim().toUpperCase()
      : cleanPromo
      ? cleanPromo
      : undefined;

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
      referredBy: canonicalReferredBy,
      referralCount: 0,
      referralEarnings: 0,
      unclaimedReferralRewards: 0,
      totalWagered: 0,
      totalWon: 0,
      totalDeposited: 0,
      commissionGeneratedForReferrer: 0,
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

    // Save the newly registered user first
    saveUser(newUser);

    // Update the referrer's referral count & sync to server
    if (referredByUser) {
      const latestUsers = getUsers();
      const actualReferredCount = latestUsers.filter(
        (m) =>
          m.id !== referredByUser.id &&
          m.referredBy &&
          m.referredBy.trim().toUpperCase() === referredByUser.referralCode.trim().toUpperCase()
      ).length;
      const updatedReferrer: User = {
        ...referredByUser,
        referralCount: Math.max((referredByUser.referralCount || 0) + 1, actualReferredCount),
      };
      saveUser(updatedReferrer);
    }

    setCurrentUser(newUser);
    onLoginSuccess(newUser);
    onClose();
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
        </div>
      </div>
    </div>
  );
};
