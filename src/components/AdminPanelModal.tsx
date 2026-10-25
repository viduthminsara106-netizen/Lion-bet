import React, { useState, useEffect } from 'react';
import { LION_BET_LOGO_URL } from '../services/brandAssets';
import {
  User,
  UserRole,
  AdminSettings,
  RoundInfo,
  Transaction,
  BetRecord,
  CrashGameId,
  CrashGameEngineConfig,
  MinesGameEngineConfig,
  MinesRiskLevel,
} from '../types/game';
import {
  getUsers,
  saveUser,
  saveUserAndSync,
  deleteUser,
  getCurrentUser,
  getAdminSettings,
  saveAdminSettings,
  syncAdminSettingsWithServer,
  DEFAULT_MINES_CONFIG,
  getTransactions,
  saveTransactions,
  syncTransactionsWithServer,
  getBetHistory,
  fetchCashAgentsWithPresence,
  getCashAgentsSync,
  setAgentOnlineStatus,
  CashAgentWithPresence,
  creditReferrerCommission,
  syncUsersWithServer,
  normalizeSriLankaPhone,
} from '../services/storage';
import {
  ShieldCheck,
  TrendingUp,
  Users,
  Sliders,
  Activity,
  X,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Flame,
  Target,
  Wallet,
  CheckCircle2,
  XCircle,
  UserPlus,
  History,
  Copy,
  Trash2,
  PlusCircle,
  MinusCircle,
  Search,
  Briefcase,
  LogOut,
  Eye,
} from 'lucide-react';
import { playerPatternTracker } from '../services/playerPatternTracker';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  history: RoundInfo[];
  onSettingsUpdated: (newSettings: AdminSettings) => void;
  onUserUpdated?: (updated: User) => void;
  onOpenAgentPanel?: (mode: 'deposit_panel' | 'withdraw_page') => void;
  onLogout?: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  history,
  onSettingsUpdated,
  onUserUpdated,
  onOpenAgentPanel,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<
    'users' | 'agents' | 'bets' | 'transactions' | 'analytics' | 'engine' | 'mines_engine'
  >('users');

  const [usersList, setUsersList] = useState<User[]>(getUsers());
  const [transactionsList, setTransactionsList] = useState<Transaction[]>(getTransactions());
  const [betHistoryList, setBetHistoryList] = useState<BetRecord[]>(getBetHistory());
  const [settings, setSettings] = useState<AdminSettings>(getAdminSettings());

  // User Search & Filter states
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserForBets, setSelectedUserForBets] = useState<string>('ALL');
  const [selectedUserForTx, setSelectedUserForTx] = useState<string>('ALL');
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'deposit' | 'withdrawal'>('ALL');
  const [previewReceiptTx, setPreviewReceiptTx] = useState<Transaction | null>(null);

  // Balance Editor states
  const [editBalanceUserId, setEditBalanceUserId] = useState<string | null>(null);
  const [balanceAmountInput, setBalanceAmountInput] = useState<string>('');
  const [quickDeltaAmount, setQuickDeltaAmount] = useState<string>('1000');

  // Create New Cash Agent Form States
  const [agentName, setAgentName] = useState('');
  const [agentMobile, setAgentMobile] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPassword, setAgentPassword] = useState('12345678');
  const [agentRole, setAgentRole] = useState<'deposit_agent' | 'withdraw_agent' | 'cash_agent'>(
    'deposit_agent'
  );
  const [agentContact, setAgentContact] = useState('');

  const [savedNotification, setSavedNotification] = useState<string | null>(null);
  const [agentPresenceList, setAgentPresenceList] = useState<CashAgentWithPresence[]>(() =>
    getCashAgentsSync()
  );

  // Selected Crash Game & Next 30 Multipliers Editor states
  const [selectedGameId, setSelectedGameId] = useState<CrashGameId>(
    settings.selectedCrashGameId || 'balloon_crash'
  );
  const [singleQueueInput, setSingleQueueInput] = useState<string>('1.00');
  const [bulkQueueInput, setBulkQueueInput] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    const loadAll = async () => {
      setUsersList(getUsers());
      setTransactionsList(getTransactions());
      setBetHistoryList(getBetHistory());
      setSettings(getAdminSettings());
      setAgentPresenceList(getCashAgentsSync());
      const [freshAgents, , syncedSettings, syncedTx] = await Promise.all([
        fetchCashAgentsWithPresence().catch(() => getCashAgentsSync()),
        syncUsersWithServer().catch(() => getUsers()),
        syncAdminSettingsWithServer().catch(() => getAdminSettings()),
        syncTransactionsWithServer().catch(() => getTransactions()),
      ]);
      if (mounted) {
        setAgentPresenceList(freshAgents);
        setUsersList(getUsers());
        setSettings(syncedSettings);
        setTransactionsList(syncedTx);
      }
    };

    const handleStorageUpdate = () => {
      if (mounted) {
        setUsersList(getUsers());
        setAgentPresenceList(getCashAgentsSync());
        setTransactionsList(getTransactions());
      }
    };

    loadAll();
    window.addEventListener('storage', handleStorageUpdate);
    const interval = setInterval(loadAll, 3000);
    return () => {
      mounted = false;
      window.removeEventListener('storage', handleStorageUpdate);
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const notify = (msg: string) => {
    setSavedNotification(msg);
    setTimeout(() => setSavedNotification(null), 3500);
  };

  const refreshAll = () => {
    setUsersList(getUsers());
    setTransactionsList(getTransactions());
    setBetHistoryList(getBetHistory());
    setAgentPresenceList(getCashAgentsSync());
    Promise.all([
      syncUsersWithServer().catch(() => getUsers()),
      fetchCashAgentsWithPresence().catch(() => getCashAgentsSync()),
      syncTransactionsWithServer().catch(() => getTransactions()),
    ])
      .then(([, freshAgents, freshTx]) => {
        setAgentPresenceList(freshAgents);
        setUsersList(getUsers());
        setTransactionsList(freshTx);
      })
      .catch(() => {});
  };

  // Create Cash Agent Handler (Persists immediately to Cloud Firestore & Server so agent can log in from ANY device)
  const handleCreateCashAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = agentName.trim();
    const cleanMobile = normalizeSriLankaPhone(agentMobile.trim()) || agentMobile.trim().replace(/\s+/g, '');
    const cleanEmail =
      agentEmail.trim().toLowerCase() ||
      `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@lionbet.lk`;
    const cleanPass = agentPassword.trim();

    if (!cleanName || !cleanMobile || !cleanPass) {
      notify('Please enter Agent Name, Login Mobile/ID, and Password.');
      return;
    }

    await syncUsersWithServer().catch(() => {});
    const existing = getUsers().find(
      (u) =>
        (u.mobile && u.mobile === cleanMobile) ||
        u.username.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      // If user already exists, upgrade them to this Agent role & credentials and sync to Cloud Firestore & Server!
      const upgradedAgent: User = {
        ...existing,
        username: cleanName,
        mobile: cleanMobile,
        email: cleanEmail,
        password: cleanPass,
        role: agentRole,
        agentContact: agentContact.trim() || cleanMobile,
        createdByAdmin: true,
        isBanned: false,
        updatedAt: Date.now(),
      };
      await saveUserAndSync(upgradedAgent);
      setAgentOnlineStatus(upgradedAgent.id, true);
      refreshAll();
      setAgentName('');
      setAgentMobile('');
      setAgentEmail('');
      setAgentContact('');
      notify(
        `Updated & synced Cash Agent "${upgradedAgent.username}" across all devices! Login ID: ${upgradedAgent.mobile} | Password: ${upgradedAgent.password}`
      );
      return;
    }

    const newAgent: User = {
      id: 'agent_' + Date.now(),
      username: cleanName,
      mobile: cleanMobile,
      email: cleanEmail,
      password: cleanPass,
      role: agentRole,
      balance: 500000.0,
      referralCode: 'AG' + Math.floor(1000 + Math.random() * 9000),
      referralCount: 0,
      referralEarnings: 0,
      unclaimedReferralRewards: 0,
      totalWagered: 0,
      totalWon: 0,
      isBanned: false,
      avatar: agentRole === 'deposit_agent' ? '💼' : agentRole === 'withdraw_agent' ? '🏦' : '🤝',
      agentContact: agentContact.trim() || cleanMobile,
      createdByAdmin: true,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    await saveUserAndSync(newAgent);
    setAgentOnlineStatus(newAgent.id, true);
    refreshAll();
    setAgentName('');
    setAgentMobile('');
    setAgentEmail('');
    setAgentContact('');
    notify(
      `Created Cash Agent "${newAgent.username}" (Synced to all devices)! Login ID: ${newAgent.mobile} | Password: ${newAgent.password}`
    );
  };

  const handleDeleteAgent = (agentId: string, username: string) => {
    deleteUser(agentId);
    refreshAll();
    notify(`Removed account "${username}" across all devices.`);
  };

  const handleCopyCredentials = (u: User) => {
    const text = `Lion Bet Login\nUsername: ${u.username}\nLogin Mobile/ID: ${u.mobile || u.email}\nPassword: ${u.password || '12345678'}\nRole: ${u.role.replace('_', ' ').toUpperCase()}`;
    navigator.clipboard.writeText(text);
    notify(`Copied login credentials for ${u.username}!`);
  };

  const handleTransactionDecision = async (txId: string, decision: 'completed' | 'rejected') => {
    const allTx = getTransactions();
    const targetTx = allTx.find((t) => t.id === txId);
    if (!targetTx || targetTx.status !== 'pending') return;

    const updatedTxList = allTx.map((t) =>
      t.id === txId ? { ...t, status: decision, processedBy: currentUser.username } : t
    );
    saveTransactions(updatedTxList);

    const allUsers = getUsers();
    const targetUser = allUsers.find((u) => u.id === targetTx.userId) || getCurrentUser();

    if (targetTx.type === 'deposit' && decision === 'completed' && targetUser) {
      const hasPromoRegistered = Boolean(
        targetUser.referredBy && targetUser.referredBy.trim().length > 0
      );
      const isEligible1st = hasPromoRegistered && !targetUser.hasReceivedFirstDepositBonus;
      const bonusToAdd = isEligible1st ? targetTx.amount : 0;
      const updatedUser: User = {
        ...targetUser,
        balance: Number((targetUser.balance + targetTx.amount + bonusToAdd).toFixed(2)),
        bonusBalance: Number(((targetUser.bonusBalance || 0) + bonusToAdd).toFixed(2)),
        hasReceivedFirstDepositBonus: targetUser.hasReceivedFirstDepositBonus || isEligible1st,
      };
      const { referredUpdated } = creditReferrerCommission(
        updatedUser,
        targetTx.amount,
        'deposit'
      );
      await saveUserAndSync(referredUpdated);
      if (referredUpdated.id === currentUser.id) {
        onUserUpdated?.(referredUpdated);
      }
      notify(
        bonusToAdd > 0
          ? `Approved Deposit Rs. ${targetTx.amount.toLocaleString()} + Rs. ${bonusToAdd.toLocaleString()} (100% 1st Deposit Bonus) for ${updatedUser.username}!`
          : `Approved Deposit Rs. ${targetTx.amount.toLocaleString()} for ${updatedUser.username}!`
      );
    } else if (targetTx.type === 'withdrawal' && decision === 'rejected' && targetUser) {
      const updatedUser: User = {
        ...targetUser,
        balance: Number((targetUser.balance + targetTx.amount).toFixed(2)),
      };
      await saveUserAndSync(updatedUser);
      if (updatedUser.id === currentUser.id) {
        onUserUpdated?.(updatedUser);
      }
      notify(
        `Rejected withdrawal & refunded Rs. ${targetTx.amount.toLocaleString()} to ${updatedUser.username}`
      );
    } else {
      notify(`Transaction ${decision.toUpperCase()}!`);
    }
    setPreviewReceiptTx((prev) =>
      prev && prev.id === txId
        ? { ...prev, status: decision, processedBy: currentUser.username }
        : prev
    );
    refreshAll();
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    const updated = usersList.map((u) =>
      u.id === userId
        ? {
            ...u,
            role: newRole,
            password: u.password || '12345678',
            mobile: u.mobile || u.agentContact || u.username,
            updatedAt: Date.now(),
          }
        : u
    );
    setUsersList(updated);
    const target = updated.find((u) => u.id === userId);
    if (target) {
      await saveUserAndSync(target);
      if (target.id === currentUser.id) {
        onUserUpdated?.(target);
      }
      refreshAll();
    }
    notify(
      `Role updated to ${newRole.replace('_', ' ').toUpperCase()} for ${target?.username} (Login: ${
        target?.mobile || target?.username
      } | Pass: ${target?.password || '12345678'})`
    );
  };

  const handleToggleBan = async (userId: string) => {
    const updated = usersList.map((u) =>
      u.id === userId ? { ...u, isBanned: !u.isBanned, updatedAt: Date.now() } : u
    );
    setUsersList(updated);
    const target = updated.find((u) => u.id === userId);
    if (target) await saveUserAndSync(target);
    notify(`${target?.username} is now ${target?.isBanned ? 'BANNED' : 'ACTIVE'}`);
  };

  const handleSaveBalance = async (userId: string) => {
    const val = parseFloat(balanceAmountInput);
    if (isNaN(val) || val < 0) return;
    const updated = usersList.map((u) =>
      u.id === userId ? { ...u, balance: Number(val.toFixed(2)), updatedAt: Date.now() } : u
    );
    setUsersList(updated);
    const target = updated.find((u) => u.id === userId);
    if (target) {
      await saveUserAndSync(target);
      if (target.id === currentUser.id) {
        onUserUpdated?.(target);
      }
    }
    setEditBalanceUserId(null);
    setBalanceAmountInput('');
    refreshAll();
    notify(`Balance updated to Rs. ${val.toLocaleString()} LKR for ${target?.username}`);
  };

  const handleQuickAdjustBalance = async (userId: string, delta: number) => {
    const target = usersList.find((u) => u.id === userId);
    if (!target) return;
    const nextBalance = Math.max(0, Number((target.balance + delta).toFixed(2)));
    const updatedUser: User = { ...target, balance: nextBalance, updatedAt: Date.now() };
    await saveUserAndSync(updatedUser);
    if (updatedUser.id === currentUser.id) {
      onUserUpdated?.(updatedUser);
    }
    refreshAll();
    notify(
      `${delta >= 0 ? 'Added' : 'Deducted'} Rs. ${Math.abs(delta).toLocaleString()} LKR for ${
        target.username
      } (Balance: Rs. ${nextBalance.toLocaleString()} LKR)`
    );
  };

  const handleSaveSettings = (newSettings: AdminSettings) => {
    setSettings(newSettings);
    saveAdminSettings(newSettings);
    onSettingsUpdated(newSettings);
    notify('Game engine settings saved successfully!');
  };

  const getSelectedGameConfig = (): CrashGameEngineConfig => {
    const fallback: CrashGameEngineConfig = {
      gameId: selectedGameId,
      gameName:
        selectedGameId === 'balloon_crash'
          ? 'Balloon Crash LKR'
          : selectedGameId === 'space_rocket'
          ? 'Space Rocket Crash'
          : 'Lion Jet X Crash',
      houseEdge: settings.houseEdge ?? 0.2,
      earlyCrashProbability: settings.earlyCrashProbability ?? 0.45,
      instant100Probability: settings.instant100Probability ?? 0.15,
      minBet: settings.minBet ?? 50,
      maxBet: settings.maxBet ?? 100000,
      isGamePaused: settings.isGamePaused ?? false,
      nextCrashOverride: settings.nextCrashOverride ?? null,
      queuedMultipliers: Array.isArray(settings.queuedMultipliers)
        ? settings.queuedMultipliers
        : [],
    };
    return settings.crashGamesConfig?.[selectedGameId] || fallback;
  };

  const updateSelectedGameConfig = (
    partial: Partial<CrashGameEngineConfig>,
    customNotification?: string
  ) => {
    const currentCfg = getSelectedGameConfig();
    const updatedCfg: CrashGameEngineConfig = {
      ...currentCfg,
      ...partial,
      queuedMultipliers: (partial.queuedMultipliers ?? currentCfg.queuedMultipliers ?? []).slice(
        0,
        30
      ),
    };

    const nextCrashGamesConfig = {
      ...(settings.crashGamesConfig || ({} as Record<CrashGameId, CrashGameEngineConfig>)),
      [selectedGameId]: updatedCfg,
    };

    // Sync top-level settings when balloon_crash is selected or as active game config
    const nextSettings: AdminSettings = {
      ...settings,
      selectedCrashGameId: selectedGameId,
      houseEdge:
        selectedGameId === 'balloon_crash' ? updatedCfg.houseEdge : settings.houseEdge,
      earlyCrashProbability:
        selectedGameId === 'balloon_crash'
          ? updatedCfg.earlyCrashProbability
          : settings.earlyCrashProbability,
      instant100Probability:
        selectedGameId === 'balloon_crash'
          ? updatedCfg.instant100Probability
          : settings.instant100Probability,
      minBet: selectedGameId === 'balloon_crash' ? updatedCfg.minBet : settings.minBet,
      maxBet: selectedGameId === 'balloon_crash' ? updatedCfg.maxBet : settings.maxBet,
      nextCrashOverride:
        selectedGameId === 'balloon_crash'
          ? updatedCfg.nextCrashOverride
          : settings.nextCrashOverride,
      queuedMultipliers:
        selectedGameId === 'balloon_crash'
          ? updatedCfg.queuedMultipliers
          : settings.queuedMultipliers,
      crashGamesConfig: nextCrashGamesConfig,
    };

    setSettings(nextSettings);
    saveAdminSettings(nextSettings);
    onSettingsUpdated(nextSettings);
    if (customNotification) {
      notify(customNotification);
    }
  };

  const handleApplyHighLossPreset = () => {
    updateSelectedGameConfig(
      {
        houseEdge: 0.22,
        earlyCrashProbability: 0.52,
        instant100Probability: 0.2,
      },
      `High-Loss Mode enabled for ${getSelectedGameConfig().gameName}! (22% Loss Rate, 52% Early Burst, 20% 1.00x Instant Crash)`
    );
  };

  const getMinesEngineConfig = (): MinesGameEngineConfig => ({
    ...DEFAULT_MINES_CONFIG,
    ...(settings.minesConfig || {}),
    minBet: Math.max(10, settings.minesConfig?.minBet ?? 10),
  });

  const updateMinesEngineConfig = (
    partial: Partial<MinesGameEngineConfig>,
    customNotification?: string
  ) => {
    const currentMines = getMinesEngineConfig();
    const updatedMines: MinesGameEngineConfig = {
      ...currentMines,
      ...partial,
      minBet: Math.max(10, partial.minBet ?? currentMines.minBet ?? 10),
    };
    const nextSettings: AdminSettings = {
      ...settings,
      minesConfig: updatedMines,
    };
    setSettings(nextSettings);
    saveAdminSettings(nextSettings);
    onSettingsUpdated(nextSettings);
    if (customNotification) {
      notify(customNotification);
    }
  };

  // Filtered collections
  const filteredUsers = usersList.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.mobile && u.mobile.includes(userSearch)) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const cashAgentsList = usersList.filter(
    (u) =>
      u.role === 'deposit_agent' ||
      u.role === 'withdraw_agent' ||
      u.role === 'cash_agent'
  );

  const filteredBets =
    selectedUserForBets === 'ALL'
      ? betHistoryList
      : betHistoryList.filter((b) => b.userId === selectedUserForBets);

  const filteredTransactions = transactionsList.filter((tx) => {
    const matchUser = selectedUserForTx === 'ALL' || tx.userId === selectedUserForTx;
    const matchType = txTypeFilter === 'ALL' || tx.type === txTypeFilter;
    return matchUser && matchType;
  });

  // Compute Revenue Analytics in LKR
  const totalVolume = history.reduce((sum, r) => sum + r.totalBets * 500, 0) + 1850000;
  const totalPayouts = history.reduce((sum, r) => sum + r.totalPayout, 0) + 1640000;
  const grossGamingRevenue = totalVolume - totalPayouts;
  const actualHouseMargin = ((grossGamingRevenue / Math.max(1, totalVolume)) * 100).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-purple-500/30 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#050505] border border-amber-500/70 overflow-hidden shrink-0 flex items-center justify-center">
              <img
                src={LION_BET_LOGO_URL}
                alt="Lion Bet Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-lg font-black text-white truncate">
                  Lion Bet Admin Dashboard
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
                Manage users, edit balances, create Cash Agents, inspect betting &amp; transaction history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {onOpenAgentPanel && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAgentPanel('deposit_panel');
                  }}
                  className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Deposit Agent Panel</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAgentPanel('withdraw_page');
                  }}
                  className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Withdraw Agent Page</span>
                </button>
              </>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[11px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Logout</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Saved Toast Notification */}
        {savedNotification && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs py-2.5 px-4 sm:px-6 flex items-center gap-2 font-bold animate-fade-in">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{savedNotification}</span>
          </div>
        )}

        {/* Tab Switcher (Horizontally scrollable on mobile) */}
        <div className="flex items-center overflow-x-auto no-scrollbar border-b border-slate-800 bg-slate-950/40 px-3 sm:px-5 pt-2 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              refreshAll();
              setActiveTab('users');
            }}
            className={`pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'users'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>All Users &amp; Balances ({usersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              refreshAll();
              setActiveTab('agents');
            }}
            className={`pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'agents'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Cash Agents ({cashAgentsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              refreshAll();
              setActiveTab('bets');
            }}
            className={`pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'bets'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Betting History ({betHistoryList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              refreshAll();
              setActiveTab('transactions');
            }}
            className={`pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'transactions'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>
              Transaction History ({transactionsList.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('engine')}
            className={`pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'engine'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Crash Loss Rate &amp; Rig</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mines_engine')}
            className={`pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'mines_engine'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            <span>💎 Mines Risk &amp; Lose Rate</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 text-xs text-slate-300 flex-1">
          {/* =================================================================
              1. ALL USERS & BALANCE EDITOR TABLE
              ================================================================= */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-black text-white text-sm">
                    All Registered Users &amp; Balance Control Table ({filteredUsers.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    View all users in table format, edit any user&apos;s balance, or inspect their betting and transaction history.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
                    <span className="text-[11px] font-bold text-slate-400">Quick Step (LKR):</span>
                    {[500, 1000, 5000].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setQuickDeltaAmount(String(p))}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          quickDeltaAmount === String(p)
                            ? 'bg-purple-600 text-white font-black'
                            : 'bg-slate-900 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <input
                      type="number"
                      value={quickDeltaAmount}
                      onChange={(e) => setQuickDeltaAmount(e.target.value)}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-black text-purple-300"
                    />
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search username, ID, mobile..."
                      className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-700/80 rounded-xl overflow-x-auto bg-slate-950 shadow-inner">
                <table className="w-full min-w-[880px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-700 text-[11px] uppercase tracking-wider font-black text-slate-300 bg-slate-900">
                      <th className="p-2.5 border-r border-slate-800 w-10 text-center">#</th>
                      <th className="p-2.5 border-r border-slate-800">User ID</th>
                      <th className="p-2.5 border-r border-slate-800">Username</th>
                      <th className="p-2.5 border-r border-slate-800">Mobile / Login</th>
                      <th className="p-2.5 border-r border-slate-800">Role</th>
                      <th className="p-2.5 border-r border-slate-800">Balance (LKR)</th>
                      <th className="p-2.5 border-r border-slate-800">Bonus (LKR)</th>
                      <th className="p-2.5 border-r border-slate-800">Quick +/-</th>
                      <th className="p-2.5 border-r border-slate-800">History</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredUsers.map((u, index) => {
                      const deltaVal = Math.max(0, parseFloat(quickDeltaAmount) || 1000);
                      return (
                        <tr key={`${u.id}-${index}`} className="hover:bg-slate-900/50 transition">
                          <td className="p-2.5 border-r border-slate-800/80 text-center font-mono text-slate-500">
                            {index + 1}
                          </td>
                          <td className="p-2.5 border-r border-slate-800/80 font-mono text-[11px] text-slate-300">
                            {u.id}
                          </td>
                          <td className="p-2.5 border-r border-slate-800/80">
                            <div className="flex items-center gap-1.5">
                              <span className="text-base">{u.avatar}</span>
                              <span className="font-bold text-white">{u.username}</span>
                            </div>
                          </td>
                          <td className="p-2.5 border-r border-slate-800/80">
                            <span className="font-mono text-emerald-400 font-bold block text-[11px]">
                              {u.mobile || '-'}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{u.email}</span>
                            <span className="text-[10px] text-amber-300 font-mono block mt-0.5">
                              Pass: {u.password || '12345678'}
                            </span>
                          </td>
                          <td className="p-2.5 border-r border-slate-800/80">
                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                              className="bg-slate-900 border border-slate-700 text-[11px] rounded-lg px-2 py-1 text-slate-200 font-bold focus:outline-none focus:border-purple-500"
                            >
                              <option value="player">Player</option>
                              <option value="vip">VIP</option>
                              <option value="deposit_agent">Deposit Agent</option>
                              <option value="withdraw_agent">Withdraw Agent</option>
                              <option value="cash_agent">Full Cash Agent</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="p-2.5 border-r border-slate-800/80">
                            {editBalanceUserId === u.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={balanceAmountInput}
                                  onChange={(e) => setBalanceAmountInput(e.target.value)}
                                  className="w-24 px-2 py-1 bg-slate-900 border border-purple-500 rounded text-xs text-white font-black"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveBalance(u.id)}
                                  className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditBalanceUserId(null)}
                                  className="px-1.5 py-1 bg-slate-800 text-slate-400 rounded text-[10px] cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-black font-mono text-emerald-400">
                                  Rs. {u.balance.toLocaleString()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditBalanceUserId(u.id);
                                    setBalanceAmountInput(u.balance.toString());
                                  }}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 font-bold cursor-pointer"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 border-r border-slate-800/80 font-mono text-amber-400">
                            Rs. {(u.bonusBalance || 0).toLocaleString()}
                          </td>
                          <td className="p-2.5 border-r border-slate-800/80">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustBalance(u.id, deltaVal)}
                                className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-black text-[10px] flex items-center gap-0.5 cursor-pointer"
                              >
                                <PlusCircle className="w-3 h-3" /> +{deltaVal}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustBalance(u.id, -deltaVal)}
                                className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-black text-[10px] flex items-center gap-0.5 cursor-pointer"
                              >
                                <MinusCircle className="w-3 h-3" /> -{deltaVal}
                              </button>
                            </div>
                          </td>
                          <td className="p-2.5 border-r border-slate-800/80">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUserForBets(u.id);
                                  setActiveTab('bets');
                                }}
                                className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold cursor-pointer"
                              >
                                Bets
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUserForTx(u.id);
                                  setActiveTab('transactions');
                                }}
                                className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer"
                              >
                                Tx
                              </button>
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const text = `LIONBET Login\nMobile: ${u.mobile || u.email}\nUsername: ${u.username}\nPassword: ${u.password || '12345678'}`;
                                  navigator.clipboard?.writeText(text);
                                  notify(`Copied login details for ${u.username}!`);
                                }}
                                className="px-2 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[10px] font-bold cursor-pointer"
                              >
                                Copy Login
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleBan(u.id)}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                  u.isBanned
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'bg-slate-800 text-slate-300 hover:text-white'
                                }`}
                              >
                                {u.isBanned ? 'Banned' : 'Active'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================
              2. CASH AGENTS MANAGEMENT TABLE (Create & Manage Agents in Table Format)
              ================================================================= */}
          {activeTab === 'agents' && (
            <div className="space-y-5">
              {/* Create New Cash Agent Table Form */}
              <div className="bg-slate-950 border border-purple-500/40 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-purple-400" />
                    <h4 className="font-black text-white text-xs sm:text-sm">
                      Add New Cash Agent (Create Login ID &amp; Password)
                    </h4>
                  </div>
                  <span className="text-[10px] text-purple-300 font-bold">
                    Assign Deposit Agent or Withdraw Agent
                  </span>
                </div>

                <form onSubmit={handleCreateCashAgent} className="p-3 sm:p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                          <th className="p-2">Agent Username</th>
                          <th className="p-2">Login ID / Mobile</th>
                          <th className="p-2">Login Password</th>
                          <th className="p-2">Agent Panel Type</th>
                          <th className="p-2">WhatsApp Contact</th>
                          <th className="p-2 text-right">Create Account</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              value={agentName}
                              onChange={(e) => setAgentName(e.target.value)}
                              placeholder="ColomboAgent_02"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              value={agentMobile}
                              onChange={(e) => setAgentMobile(e.target.value)}
                              placeholder="0775556666"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-400 focus:outline-none focus:border-purple-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              value={agentPassword}
                              onChange={(e) => setAgentPassword(e.target.value)}
                              placeholder="Password"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-purple-500"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={agentRole}
                              onChange={(e) => setAgentRole(e.target.value as any)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-purple-500"
                            >
                              <option value="deposit_agent">Deposit Agent Panel</option>
                              <option value="withdraw_agent">Withdraw Agent Page</option>
                              <option value="cash_agent">Full Cash Agent (Both)</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={agentContact}
                              onChange={(e) => setAgentContact(e.target.value)}
                              placeholder="+94 77 555 6666"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <button
                              type="submit"
                              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow cursor-pointer whitespace-nowrap"
                            >
                              + Add Agent
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </form>
              </div>

              {/* Active Cash Agents Table */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-white text-sm">
                      Active Cash Agents Directory Table ({cashAgentsList.length})
                    </h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {
                        cashAgentsList.filter((ag) =>
                          agentPresenceList.some((p) => p.id === ag.id && p.isOnline)
                        ).length
                      }{' '}
                      Online Now
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Share Login ID &amp; Password with agents to log in (Online status updates automatically when logged in)
                  </span>
                </div>

                <div className="border border-slate-700/80 rounded-xl overflow-x-auto bg-slate-950 shadow-inner">
                  <table className="w-full min-w-[880px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 text-[11px] uppercase tracking-wider font-black text-slate-300 bg-slate-900">
                        <th className="p-3 border-r border-slate-800 w-10 text-center">#</th>
                        <th className="p-3 border-r border-slate-800">Site Status</th>
                        <th className="p-3 border-r border-slate-800">Agent ID</th>
                        <th className="p-3 border-r border-slate-800">Agent Name</th>
                        <th className="p-3 border-r border-slate-800">Assigned Panel</th>
                        <th className="p-3 border-r border-slate-800">Login ID / Mobile</th>
                        <th className="p-3 border-r border-slate-800">Login Password</th>
                        <th className="p-3 border-r border-slate-800">WhatsApp Contact</th>
                        <th className="p-3 border-r border-slate-800">Float Balance</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {cashAgentsList.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-400">
                            No Cash Agent accounts created yet. Use the &quot;+ Add Agent&quot; form above to create a real Cash Agent account.
                          </td>
                        </tr>
                      ) : (
                        cashAgentsList.map((ag, idx) => {
                          const isAgentOnline = agentPresenceList.some(
                            (p) => p.id === ag.id && p.isOnline
                          );
                          return (
                            <tr key={ag.id} className="hover:bg-slate-900/50 transition">
                              <td className="p-3 border-r border-slate-800/80 text-center font-mono text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="p-3 border-r border-slate-800/80">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextStatus = !isAgentOnline;
                                    setAgentOnlineStatus(ag.id, nextStatus);
                                    refreshAll();
                                    notify(
                                      `Cash Agent "${ag.username}" is now marked ${
                                        nextStatus ? 'ONLINE' : 'OFFLINE'
                                      }`
                                    );
                                  }}
                                  title="Click to toggle Online / Offline status"
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase cursor-pointer transition ${
                                    isAgentOnline
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                                  }`}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      isAgentOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                                    }`}
                                  />
                                  {isAgentOnline ? 'ONLINE' : 'OFFLINE'}
                                </button>
                              </td>
                              <td className="p-3 border-r border-slate-800/80 font-mono text-[11px] text-slate-400">
                                {ag.id}
                              </td>
                              <td className="p-3 border-r border-slate-800/80">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{ag.avatar}</span>
                                  <span className="font-black text-white">{ag.username}</span>
                                </div>
                              </td>
                              <td className="p-3 border-r border-slate-800/80">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    ag.role === 'deposit_agent'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : ag.role === 'withdraw_agent'
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  }`}
                                >
                                  {ag.role.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-3 border-r border-slate-800/80 font-mono font-bold text-emerald-400">
                                {ag.mobile || ag.email}
                              </td>
                              <td className="p-3 border-r border-slate-800/80 font-mono font-bold text-amber-300">
                                {ag.password || '12345678'}
                              </td>
                              <td className="p-3 border-r border-slate-800/80 text-slate-300">
                                {ag.agentContact || ag.mobile || '-'}
                              </td>
                              <td className="p-3 border-r border-slate-800/80 font-mono font-bold text-white">
                                Rs. {ag.balance.toLocaleString()}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCredentials(ag)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                    title="Copy Agent Login ID & Password"
                                  >
                                    <Copy className="w-3 h-3 text-emerald-400" />
                                    <span>Copy Login</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAgent(ag.id, ag.username)}
                                    className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 cursor-pointer"
                                    title="Delete Cash Agent"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              3. USER BETTING HISTORY TABLE (Admin View)
              ================================================================= */}
          {activeTab === 'bets' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-black text-white text-sm">
                    Player Betting History Table ({filteredBets.length} Records)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Inspect all bets placed across rounds by any user in table format.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Filter by User:</span>
                  <select
                    value={selectedUserForBets}
                    onChange={(e) => setSelectedUserForBets(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="ALL">All Users ({betHistoryList.length})</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border border-slate-700/80 rounded-xl overflow-x-auto bg-slate-950 shadow-inner">
                <table className="w-full min-w-[820px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-700 text-[11px] uppercase tracking-wider font-black text-slate-300 bg-slate-900">
                      <th className="p-3 border-r border-slate-800 w-10 text-center">#</th>
                      <th className="p-3 border-r border-slate-800">Round #</th>
                      <th className="p-3 border-r border-slate-800">User ID</th>
                      <th className="p-3 border-r border-slate-800">Player Name</th>
                      <th className="p-3 border-r border-slate-800">Bet Amount (LKR)</th>
                      <th className="p-3 border-r border-slate-800">Cashout Multiplier</th>
                      <th className="p-3 border-r border-slate-800">Crash Point</th>
                      <th className="p-3 border-r border-slate-800">Win Payout (LKR)</th>
                      <th className="p-3 border-r border-slate-800">Net Profit / Loss</th>
                      <th className="p-3 text-right">Status &amp; Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredBets.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-500">
                          No betting records found for the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredBets.map((bet, idx) => (
                        <tr key={`${bet.id}-${idx}`} className="hover:bg-slate-900/50">
                          <td className="p-3 border-r border-slate-800/80 text-center font-mono text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-3 border-r border-slate-800/80 font-mono font-bold text-slate-300">
                            #{bet.roundNumber}
                          </td>
                          <td className="p-3 border-r border-slate-800/80 font-mono text-[11px] text-slate-400">
                            {bet.userId}
                          </td>
                          <td className="p-3 border-r border-slate-800/80 font-bold text-white">
                            {bet.avatar} {bet.username}
                          </td>
                          <td className="p-3 border-r border-slate-800/80 font-mono font-black text-white">
                            Rs. {bet.amount.toLocaleString()}
                          </td>
                          <td className="p-3 border-r border-slate-800/80 font-mono">
                            {bet.status === 'won' && bet.cashoutMultiplier ? (
                              <span className="text-emerald-400 font-black">
                                {bet.cashoutMultiplier.toFixed(2)}x
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="p-3 border-r border-slate-800/80 font-mono font-bold text-rose-400">
                            {bet.crashPoint.toFixed(2)}x
                          </td>
                          <td className="p-3 border-r border-slate-800/80 font-mono font-black text-emerald-400">
                            {bet.status === 'won' ? `Rs. ${bet.winAmount.toLocaleString()}` : 'Rs. 0'}
                          </td>
                          <td className="p-3 border-r border-slate-800/80 font-mono font-bold">
                            {bet.status === 'won' ? (
                              <span className="text-emerald-300">
                                +Rs. {bet.profit.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-rose-400">
                                -Rs. {bet.amount.toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                bet.status === 'won'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {bet.status}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {new Date(bet.timestamp).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================
              4. USER TRANSACTION HISTORY & APPROVALS TABLE (Admin View)
              ================================================================= */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-black text-white text-sm">
                    User Transaction History Table ({filteredTransactions.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    View all user deposits and withdrawals in table format and approve/reject pending requests.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={txTypeFilter}
                    onChange={(e) => setTxTypeFilter(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <option value="ALL">All Types</option>
                    <option value="deposit">Deposits Only</option>
                    <option value="withdrawal">Withdrawals Only</option>
                  </select>

                  <select
                    value={selectedUserForTx}
                    onChange={(e) => setSelectedUserForTx(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <option value="ALL">All Users</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border border-slate-700/80 rounded-xl overflow-x-auto bg-slate-950 shadow-inner">
                <table className="w-full min-w-[960px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-700 text-[11px] uppercase tracking-wider font-black text-slate-300 bg-slate-900">
                      <th className="p-3 border-r border-slate-800 w-10 text-center">#</th>
                      <th className="p-3 border-r border-slate-800">User ID</th>
                      <th className="p-3 border-r border-slate-800">Username</th>
                      <th className="p-3 border-r border-slate-800">Type</th>
                      <th className="p-3 border-r border-slate-800">Method &amp; Details</th>
                      <th className="p-3 border-r border-slate-800">Receipt Slip</th>
                      <th className="p-3 border-r border-slate-800">Amount (LKR)</th>
                      <th className="p-3 border-r border-slate-800">1st Deposit Bonus</th>
                      <th className="p-3 border-r border-slate-800">Status</th>
                      <th className="p-3 text-right">Approve / Reject</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-500">
                          No deposit or withdrawal transactions found for this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx, idx) => {
                        const matchedUser = usersList.find((u) => u.id === tx.userId);
                        return (
                          <tr key={`${tx.id}-${idx}`} className="hover:bg-slate-900/50">
                            <td className="p-3 border-r border-slate-800/80 text-center font-mono text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="p-3 border-r border-slate-800/80 font-mono text-[11px] text-slate-400">
                              {tx.userId}
                            </td>
                            <td className="p-3 border-r border-slate-800/80 font-bold text-white">
                              {tx.username || matchedUser?.username || tx.userId}
                            </td>
                            <td className="p-3 border-r border-slate-800/80 font-black uppercase">
                              <span
                                className={
                                  tx.type === 'deposit' ? 'text-emerald-400' : 'text-amber-400'
                                }
                              >
                                {tx.type}
                              </span>
                            </td>
                            <td className="p-3 border-r border-slate-800/80">
                              <span className="font-bold text-white block uppercase text-[10px]">
                                {tx.method.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] text-slate-400">{tx.accountDetails}</span>
                            </td>
                            <td className="p-3 border-r border-slate-800/80">
                              {tx.receiptImage ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewReceiptTx(tx)}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] cursor-pointer transition-all"
                                >
                                  <img
                                    src={tx.receiptImage}
                                    alt="Receipt"
                                    className="w-7 h-7 rounded object-cover border border-emerald-500/40 shrink-0"
                                  />
                                  <span className="flex items-center gap-1 whitespace-nowrap">
                                    <Eye className="w-3.5 h-3.5" /> View Receipt
                                  </span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">No receipt</span>
                              )}
                            </td>
                            <td className="p-3 border-r border-slate-800/80 font-mono font-black text-white">
                              Rs. {tx.amount.toLocaleString()}
                            </td>
                            <td className="p-3 border-r border-slate-800/80 font-mono">
                              {tx.bonusAdded && tx.bonusAdded > 0 ? (
                                <span className="text-[11px] font-bold text-amber-400">
                                  +Rs. {tx.bonusAdded.toLocaleString()} (100%)
                                </span>
                              ) : (
                                <span className="text-slate-500">Rs. 0</span>
                              )}
                            </td>
                            <td className="p-3 border-r border-slate-800/80">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  tx.status === 'completed'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : tx.status === 'pending'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {tx.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {tx.status === 'pending' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleTransactionDecision(tx.id, 'completed')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3 h-3" /> Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleTransactionDecision(tx.id, 'rejected')}
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <XCircle className="w-3 h-3" /> Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-500">
                                  {tx.processedBy ? `By ${tx.processedBy}` : 'Processed'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================
              5. ANALYTICS & ROUND SUMMARY TABLES
              ================================================================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-5">
              {/* Financial Summary Table */}
              <div className="border border-slate-700/80 rounded-xl overflow-x-auto bg-slate-950">
                <table className="w-full min-w-[680px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-700 text-[11px] uppercase font-black text-slate-300 bg-slate-900">
                      <th className="p-3 border-r border-slate-800">Metric</th>
                      <th className="p-3 border-r border-slate-800">Amount / Value (LKR)</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr>
                      <td className="p-3 border-r border-slate-800 font-bold text-white">
                        Gross Gaming Revenue (GGR)
                      </td>
                      <td className="p-3 border-r border-slate-800 font-mono font-black text-emerald-400 text-sm">
                        +Rs. {grossGamingRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-slate-400">Platform net house profit in LKR</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-slate-800 font-bold text-white">
                        Total Volume Wagered
                      </td>
                      <td className="p-3 border-r border-slate-800 font-mono font-black text-white text-sm">
                        Rs. {totalVolume.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-slate-400">Cumulative bets across all players</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-slate-800 font-bold text-white">
                        Total Player Payouts
                      </td>
                      <td className="p-3 border-r border-slate-800 font-mono font-black text-amber-400 text-sm">
                        Rs. {totalPayouts.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-slate-400">Total cashouts &amp; withdrawals paid</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-slate-800 font-bold text-white">
                        Realized House Margin
                      </td>
                      <td className="p-3 border-r border-slate-800 font-mono font-black text-purple-400 text-sm">
                        {actualHouseMargin}% (Configured: {(settings.houseEdge * 100).toFixed(0)}%)
                      </td>
                      <td className="p-3 text-slate-400">Actual house retention ratio</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Recent Flight Rounds Table */}
              <div className="space-y-2">
                <h4 className="font-black text-white text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  Recent Flight Rounds Table ({history.length})
                </h4>
                <div className="border border-slate-700/80 rounded-xl overflow-x-auto bg-slate-950">
                  <table className="w-full min-w-[720px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 text-[11px] uppercase font-black text-slate-300 bg-slate-900">
                        <th className="p-3 border-r border-slate-800">Round #</th>
                        <th className="p-3 border-r border-slate-800">Crash Multiplier</th>
                        <th className="p-3 border-r border-slate-800">Total Bets</th>
                        <th className="p-3 border-r border-slate-800">Total Payout (LKR)</th>
                        <th className="p-3 border-r border-slate-800">100% Longest Flight Winner</th>
                        <th className="p-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {history.slice(0, 15).map((r) => (
                        <tr key={r.id} className="hover:bg-slate-900/50">
                          <td className="p-3 border-r border-slate-800 font-mono font-bold text-slate-300">
                            #{r.roundNumber}
                          </td>
                          <td className="p-3 border-r border-slate-800 font-mono font-black">
                            <span
                              className={
                                r.crashPoint < 1.3
                                  ? 'text-rose-400'
                                  : r.crashPoint >= 5
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }
                            >
                              {r.crashPoint.toFixed(2)}x
                            </span>
                          </td>
                          <td className="p-3 border-r border-slate-800 font-mono text-white">
                            {r.totalBets} Players
                          </td>
                          <td className="p-3 border-r border-slate-800 font-mono font-bold text-emerald-400">
                            Rs. {r.totalPayout.toLocaleString()}
                          </td>
                          <td className="p-3 border-r border-slate-800">
                            {r.topBonusWinner ? (
                              <span className="text-amber-300 font-bold">
                                {r.topBonusWinner.avatar} {r.topBonusWinner.username} (@
                                {r.topBonusWinner.multiplier.toFixed(2)}x • +Rs.
                                {r.topBonusWinner.bonusAmount.toLocaleString()})
                              </span>
                            ) : (
                              <span className="text-slate-500">No cashouts</span>
                            )}
                          </td>
                          <td className="p-3 text-right text-slate-400 font-mono text-[11px]">
                            {new Date(r.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              6. ENGINE & VOLATILITY TABLE (Game Selector + Loss Rate + 1.00x + Next 30 Multipliers)
              ================================================================= */}
          {activeTab === 'engine' && (() => {
            const activeGameCfg = getSelectedGameConfig();
            const queuedList = activeGameCfg.queuedMultipliers || [];

            const crashGameOptions: {
              id: CrashGameId;
              name: string;
              badge: string;
              desc: string;
            }[] = [
              {
                id: 'balloon_crash',
                name: 'Balloon Crash LKR',
                badge: 'LIVE MAIN GAME',
                desc: 'Main Sri Lanka LKR Crash Room',
              },
              {
                id: 'space_rocket',
                name: 'Space Rocket Crash',
                badge: 'CRASH ROOM 2',
                desc: 'High Speed Galaxy Multiplier Room',
              },
              {
                id: 'aviator_jet',
                name: 'Lion Jet X Crash',
                badge: 'CRASH ROOM 3',
                desc: 'Turbo Fighter Jet Crash Room',
              },
            ];

            const handleAddQueueMultiplier = (val: number) => {
              if (isNaN(val) || val < 1.0) return;
              if (queuedList.length >= 30) {
                notify('Queue already has 30 multipliers! Clear or edit a slot first.');
                return;
              }
              const clamped = Number(Math.max(1.0, Math.min(5000, val)).toFixed(2));
              const nextQueue = [...queuedList, clamped];
              updateSelectedGameConfig(
                { queuedMultipliers: nextQueue },
                `Added ${clamped.toFixed(2)}x to ${activeGameCfg.gameName} (#${nextQueue.length}/30)`
              );
            };

            const handleUpdateQueueSlot = (index: number, newValStr: string) => {
              const parsed = parseFloat(newValStr);
              if (isNaN(parsed) || parsed < 1.0) return;
              const nextQueue = [...queuedList];
              nextQueue[index] = Number(Math.max(1.0, Math.min(5000, parsed)).toFixed(2));
              updateSelectedGameConfig({ queuedMultipliers: nextQueue });
            };

            const handleRemoveQueueSlot = (index: number) => {
              const nextQueue = queuedList.filter((_, idx) => idx !== index);
              updateSelectedGameConfig(
                { queuedMultipliers: nextQueue },
                `Removed multiplier #${index + 1} from ${activeGameCfg.gameName} queue`
              );
            };

            const handleApplyBulkMultipliers = () => {
              const parts = bulkQueueInput
                .split(/[\s,;|]+/)
                .map((s) => parseFloat(s.trim()))
                .filter((n) => !isNaN(n) && n >= 1.0)
                .map((n) => Number(Math.min(5000, Math.max(1.0, n)).toFixed(2)));
              if (parts.length === 0) {
                notify('Enter valid multipliers separated by commas (e.g. 1.00, 1.18, 2.45, 1.00)');
                return;
              }
              const nextQueue = parts.slice(0, 30);
              updateSelectedGameConfig(
                { queuedMultipliers: nextQueue },
                `Loaded ${nextQueue.length} queued multipliers for ${activeGameCfg.gameName}!`
              );
              setBulkQueueInput('');
            };

            const generatePreset30 = (mode: 'high_loss' | 'instant_1x_trap' | 'balanced') => {
              const generated: number[] = [];
              for (let i = 0; i < 30; i++) {
                const r = Math.random();
                if (mode === 'instant_1x_trap') {
                  if (r < 0.35) generated.push(1.0);
                  else if (r < 0.75) generated.push(Number((1.02 + Math.random() * 0.25).toFixed(2)));
                  else if (r < 0.93) generated.push(Number((1.35 + Math.random() * 0.85).toFixed(2)));
                  else generated.push(Number((2.5 + Math.random() * 4.5).toFixed(2)));
                } else if (mode === 'high_loss') {
                  if (r < 0.22) generated.push(1.0);
                  else if (r < 0.65) generated.push(Number((1.03 + Math.random() * 0.32).toFixed(2)));
                  else if (r < 0.88) generated.push(Number((1.4 + Math.random() * 1.1).toFixed(2)));
                  else generated.push(Number((2.8 + Math.random() * 6.0).toFixed(2)));
                } else {
                  if (r < 0.12) generated.push(1.0);
                  else if (r < 0.42) generated.push(Number((1.08 + Math.random() * 0.45).toFixed(2)));
                  else if (r < 0.78) generated.push(Number((1.6 + Math.random() * 2.2).toFixed(2)));
                  else generated.push(Number((4.0 + Math.random() * 12.0).toFixed(2)));
                }
              }
              updateSelectedGameConfig(
                { queuedMultipliers: generated },
                `Generated 30 multipliers (${mode.replace(/_/g, ' ').toUpperCase()}) for ${activeGameCfg.gameName}!`
              );
            };

            return (
              <div className="space-y-5">
                {/* 1. Crash Game Selector Bar */}
                <div className="bg-slate-950 border border-purple-500/40 rounded-xl p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="font-black text-white text-xs sm:text-sm flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-purple-400" />
                        Select Crash Game to Configure Settings &amp; Next 30 Multipliers
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Choose a specific crash game to set its Loss Rate, 1.00x Instant Cashout/Crash Rate, Min/Max Bet, and Next 30 Multipliers
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-black text-xs">
                      Editing: {activeGameCfg.gameName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {crashGameOptions.map((g) => {
                      const isSelected = selectedGameId === g.id;
                      const gConfig = settings.crashGamesConfig?.[g.id];
                      const gQueueLen = gConfig?.queuedMultipliers?.length || 0;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            setSelectedGameId(g.id);
                            const nextSettings: AdminSettings = {
                              ...settings,
                              selectedCrashGameId: g.id,
                            };
                            setSettings(nextSettings);
                            saveAdminSettings(nextSettings);
                          }}
                          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600/25 border-purple-400 shadow-lg shadow-purple-950/50'
                              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-black text-white text-xs sm:text-sm">
                              {g.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {g.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mb-2">{g.desc}</p>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-slate-950 text-purple-300 border border-slate-800">
                              Loss: {(((gConfig?.houseEdge ?? 0.2) * 100)).toFixed(0)}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-950 text-rose-300 border border-slate-800">
                              1.00x: {(((gConfig?.instant100Probability ?? 0.15) * 100)).toFixed(0)}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 border border-slate-800">
                              Queue: {gQueueLen}/30
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Selected Game Engine Parameters Table */}
                <div className="border border-slate-700/80 rounded-xl overflow-x-auto bg-slate-950">
                  <table className="w-full min-w-[720px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 text-[11px] uppercase font-black text-slate-300 bg-slate-900">
                        <th className="p-3 border-r border-slate-800">
                          {activeGameCfg.gameName} — Parameter
                        </th>
                        <th className="p-3 border-r border-slate-800">Current Setting</th>
                        <th className="p-3">Control / Adjustment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      <tr>
                        <td className="p-3 border-r border-slate-800">
                          <span className="font-black text-rose-400 block">
                            High-Loss / House Advantage Preset ({activeGameCfg.gameName})
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Sets Loss Rate to 22%, Early Burst (&lt;1.25x) to 52%, and 1.00x Instant Crash to 20%
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-800 font-mono font-bold text-rose-300">
                          Quick Rig Preset
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handleApplyHighLossPreset}
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow cursor-pointer"
                            >
                              ACTIVATE HIGH LOSS MODE
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedGameConfig(
                                  {
                                    houseEdge: 0.12,
                                    earlyCrashProbability: 0.3,
                                    instant100Probability: 0.08,
                                  },
                                  `Balanced Mode enabled for ${activeGameCfg.gameName}`
                                )
                              }
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-black text-xs rounded-xl border border-emerald-500/30 cursor-pointer"
                            >
                              Balanced Fair Mode
                            </button>
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td className="p-3 border-r border-slate-800">
                          <span className="font-black text-white block">
                            Loss Rate / House Edge (%)
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Operator advantage &amp; overall player loss rate for {activeGameCfg.gameName}
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-800 font-mono font-black text-purple-400 text-sm">
                          {(activeGameCfg.houseEdge * 100).toFixed(1)}%
                        </td>
                        <td className="p-3">
                          <input
                            type="range"
                            min="0.05"
                            max="0.50"
                            step="0.01"
                            value={activeGameCfg.houseEdge}
                            onChange={(e) =>
                              updateSelectedGameConfig({
                                houseEdge: parseFloat(e.target.value),
                              })
                            }
                            className="w-full accent-purple-500 cursor-pointer"
                          />
                        </td>
                      </tr>

                      <tr>
                        <td className="p-3 border-r border-slate-800">
                          <span className="font-black text-white block">
                            Early Bust Frequency (&lt; 1.25x Crash Rate)
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Controls how often {activeGameCfg.gameName} crashes before 1.25x
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-800 font-mono font-black text-rose-400 text-sm">
                          {((activeGameCfg.earlyCrashProbability || 0.45) * 100).toFixed(0)}%
                        </td>
                        <td className="p-3">
                          <input
                            type="range"
                            min="0.05"
                            max="0.85"
                            step="0.01"
                            value={activeGameCfg.earlyCrashProbability || 0.45}
                            onChange={(e) =>
                              updateSelectedGameConfig({
                                earlyCrashProbability: parseFloat(e.target.value),
                              })
                            }
                            className="w-full accent-rose-500 cursor-pointer"
                          />
                        </td>
                      </tr>

                      <tr>
                        <td className="p-3 border-r border-slate-800">
                          <span className="font-black text-white block">
                            1.00x Instant Crash / Zero Cashout Rate
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Controls how often the round crashes immediately at 1.00x (no one can cash out)
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-800 font-mono font-black text-rose-500 text-sm">
                          {((activeGameCfg.instant100Probability ?? 0.15) * 100).toFixed(0)}%
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0.00"
                              max="0.60"
                              step="0.01"
                              value={activeGameCfg.instant100Probability ?? 0.15}
                              onChange={(e) =>
                                updateSelectedGameConfig({
                                  instant100Probability: parseFloat(e.target.value),
                                })
                              }
                              className="flex-1 accent-rose-500 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedGameConfig(
                                  { nextCrashOverride: 1.0 },
                                  `Forced NEXT round to 1.00x Instant Crash for ${activeGameCfg.gameName}!`
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-black text-[10px] whitespace-nowrap cursor-pointer"
                            >
                              Force Next 1.00x
                            </button>
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td className="p-3 border-r border-slate-800">
                          <span className="font-black text-white block">
                            Min Bet &amp; Max Bet Limits (LKR)
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Allowed bet range for {activeGameCfg.gameName}
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-800 font-mono font-bold text-emerald-400">
                          Rs. {activeGameCfg.minBet.toLocaleString()} – Rs.{' '}
                          {activeGameCfg.maxBet.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">
                                Min Bet (LKR)
                              </label>
                              <input
                                type="number"
                                min="10"
                                step="10"
                                value={activeGameCfg.minBet}
                                onChange={(e) =>
                                  updateSelectedGameConfig({
                                    minBet: Math.max(10, parseInt(e.target.value || '50', 10)),
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">
                                Max Bet (LKR)
                              </label>
                              <input
                                type="number"
                                min="1000"
                                step="1000"
                                value={activeGameCfg.maxBet}
                                onChange={(e) =>
                                  updateSelectedGameConfig({
                                    maxBet: Math.max(1000, parseInt(e.target.value || '100000', 10)),
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td className="p-3 border-r border-slate-800">
                          <span className="font-black text-amber-300 block">
                            Immediate Next Round Multiplier Override
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Single-round immediate override (takes priority before the 30-multiplier queue)
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-800 font-mono font-black text-amber-400">
                          {activeGameCfg.nextCrashOverride !== null
                            ? `${activeGameCfg.nextCrashOverride}x`
                            : queuedList.length > 0
                            ? `Queue #1 (${queuedList[0].toFixed(2)}x)`
                            : 'Auto (Engine)'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.05"
                              min="1.00"
                              max="1000"
                              placeholder="Enter multiplier (e.g. 1.00 or 25.0)"
                              value={activeGameCfg.nextCrashOverride ?? ''}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : null;
                                updateSelectedGameConfig({ nextCrashOverride: val });
                              }}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                            />
                            {activeGameCfg.nextCrashOverride !== null && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateSelectedGameConfig({ nextCrashOverride: null })
                                }
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3. NEXT 30 MULTIPLIERS QUEUE MANAGER FOR SELECTED CRASH GAME */}
                <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-3.5 sm:p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="font-black text-amber-300 text-xs sm:text-sm flex items-center gap-2">
                        <Target className="w-4 h-4 text-amber-400" />
                        Next 30 Multipliers Queue — {activeGameCfg.gameName} ({queuedList.length} / 30 Queued)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Set up to the next 30 exact crash multipliers in order. Round #1 in the queue plays next and automatically advances after each round.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => generatePreset30('instant_1x_trap')}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600/25 hover:bg-rose-600/35 border border-rose-500/40 text-rose-300 font-black text-[10px] cursor-pointer"
                      >
                        Fill 30x (1.00x Heavy Trap)
                      </button>
                      <button
                        type="button"
                        onClick={() => generatePreset30('high_loss')}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black text-[10px] cursor-pointer"
                      >
                        Fill 30x (High-Loss Sequence)
                      </button>
                      <button
                        type="button"
                        onClick={() => generatePreset30('balanced')}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-black text-[10px] cursor-pointer"
                      >
                        Fill 30x (Mixed Sequence)
                      </button>
                      {queuedList.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedGameConfig(
                              { queuedMultipliers: [] },
                              `Cleared all queued multipliers for ${activeGameCfg.gameName}`
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] cursor-pointer"
                        >
                          Clear Queue
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Add Single Multiplier + Quick Chip Buttons + Bulk Paste */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                      <label className="text-[11px] font-black text-slate-200 block">
                        Add Multiplier to Queue (Slot #{Math.min(30, queuedList.length + 1)} of 30)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="1.00"
                          max="5000"
                          value={singleQueueInput}
                          onChange={(e) => setSingleQueueInput(e.target.value)}
                          placeholder="1.00"
                          className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddQueueMultiplier(parseFloat(singleQueueInput))}
                          disabled={queuedList.length >= 30}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs cursor-pointer"
                        >
                          + Add to Queue
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 mr-1">Quick Add:</span>
                        {[1.0, 1.05, 1.15, 1.3, 1.5, 2.0, 3.5, 5.0, 10.0, 25.0, 50.0, 100.0].map(
                          (presetVal) => (
                            <button
                              key={presetVal}
                              type="button"
                              disabled={queuedList.length >= 30}
                              onClick={() => handleAddQueueMultiplier(presetVal)}
                              className={`px-2 py-1 rounded text-[10px] font-mono font-black cursor-pointer disabled:opacity-40 border ${
                                presetVal <= 1.2
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                                  : presetVal < 3
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                              }`}
                            >
                              +{presetVal.toFixed(2)}x
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                      <label className="text-[11px] font-black text-slate-200 block">
                        Bulk Set Up to 30 Multipliers (Comma or Space Separated)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={bulkQueueInput}
                          onChange={(e) => setBulkQueueInput(e.target.value)}
                          placeholder="e.g. 1.00, 1.12, 1.00, 2.40, 1.05, 1.18, 5.50, 1.00..."
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={handleApplyBulkMultipliers}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-black text-xs whitespace-nowrap cursor-pointer"
                        >
                          Load Queue
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        You can paste up to 30 multipliers at once, or edit any of the 30 slots directly below.
                      </p>
                    </div>
                  </div>

                  {/* 30-Slot Grid (#1 to #30) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-2">
                    {Array.from({ length: 30 }).map((_, idx) => {
                      const val = queuedList[idx];
                      const hasVal = typeof val === 'number';
                      return (
                        <div
                          key={idx}
                          className={`rounded-xl p-2 border transition ${
                            idx === 0 && hasVal
                              ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-950/50'
                              : hasVal
                              ? val <= 1.2
                                ? 'bg-rose-950/40 border-rose-500/40'
                                : val >= 5
                                ? 'bg-amber-950/40 border-amber-500/40'
                                : 'bg-emerald-950/40 border-emerald-500/40'
                              : 'bg-slate-900/50 border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-[10px] font-black uppercase ${
                                idx === 0 && hasVal ? 'text-amber-300' : 'text-slate-400'
                              }`}
                            >
                              {idx === 0 && hasVal ? 'NEXT #1' : `#${idx + 1}`}
                            </span>
                            {hasVal && (
                              <button
                                type="button"
                                onClick={() => handleRemoveQueueSlot(idx)}
                                className="text-slate-400 hover:text-rose-400 cursor-pointer"
                                title="Remove from queue"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <input
                            type="number"
                            step="0.05"
                            min="1.00"
                            max="5000"
                            placeholder="Auto"
                            value={hasVal ? val : ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (!raw) {
                                if (hasVal) handleRemoveQueueSlot(idx);
                                return;
                              }
                              const num = parseFloat(raw);
                              if (isNaN(num)) return;
                              if (idx < queuedList.length) {
                                handleUpdateQueueSlot(idx, raw);
                              } else {
                                const nextQueue = [...queuedList];
                                while (nextQueue.length < idx) {
                                  nextQueue.push(1.2);
                                }
                                nextQueue[idx] = Number(
                                  Math.max(1.0, Math.min(5000, num)).toFixed(2)
                                );
                                updateSelectedGameConfig({
                                  queuedMultipliers: nextQueue.slice(0, 30),
                                });
                              }
                            }}
                            className={`w-full bg-slate-950/90 border border-slate-800 rounded px-1.5 py-1 text-xs font-mono font-black focus:outline-none focus:border-amber-400 ${
                              !hasVal
                                ? 'text-slate-500'
                                : val <= 1.2
                                ? 'text-rose-400'
                                : val >= 5
                                ? 'text-amber-300'
                                : 'text-emerald-400'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* =================================================================
              7. LANKA MINES LKR — RISK LEVEL, LOSE RATE & BOMB TRAP ENGINE
              ================================================================= */}
          {activeTab === 'mines_engine' && (() => {
            const mCfg = getMinesEngineConfig();
            const riskOptions: {
              id: MinesRiskLevel;
              label: string;
              badge: string;
              desc: string;
              defaultLoseRate: number;
            }[] = [
              {
                id: 'low',
                label: 'Low Risk Mode',
                badge: 'PLAYER FRIENDLY',
                desc: 'Fair board distribution with gentle bomb pressure',
                defaultLoseRate: 10,
              },
              {
                id: 'medium',
                label: 'Medium Risk Mode',
                badge: 'BALANCED',
                desc: 'Standard casino house advantage & moderate bomb traps',
                defaultLoseRate: 28,
              },
              {
                id: 'high',
                label: 'High Risk Mode',
                badge: 'HIGH HOUSE PROFIT',
                desc: 'Increased bomb collision rate as player reveals gems',
                defaultLoseRate: 55,
              },
              {
                id: 'extreme',
                label: 'Extreme Trap Mode',
                badge: 'MAX LOSS RATE',
                desc: 'Aggressive dynamic bomb relocation under player clicks',
                defaultLoseRate: 82,
              },
            ];

            return (
              <div className="space-y-5">
                {/* Top Header & Quick Force Next Bomb Banner */}
                <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-black text-white text-sm flex items-center gap-2">
                      <span>💎</span>
                      <span>Lanka Mines LKR — Risk Level, Lose Rate &amp; Trap Engine</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Control Mines Risk Level, Lose Rate %, House Edge %, Min/Max Bet (LKR), and Force Next Click Bomb in real time across all devices.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateMinesEngineConfig(
                          { forceNextClickMine: !mCfg.forceNextClickMine },
                          !mCfg.forceNextClickMine
                            ? '💣 ARMED: Next tile clicked in Lanka Mines will be a guaranteed MINE!'
                            : 'Disarmed Force Next Click Mine'
                        )
                      }
                      className={`px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow ${
                        mCfg.forceNextClickMine
                          ? 'bg-rose-600 text-white animate-pulse border border-rose-300'
                          : 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <span>💣</span>
                      <span>
                        {mCfg.forceNextClickMine
                          ? 'ARMED: NEXT CLICK = BOMB!'
                          : 'Force Next Click Bomb'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateMinesEngineConfig(
                          { isGamePaused: !mCfg.isGamePaused },
                          `Lanka Mines is now ${!mCfg.isGamePaused ? 'PAUSED' : 'ACTIVE'}`
                        )
                      }
                      className={`px-3 py-2 rounded-xl font-black text-xs border transition cursor-pointer ${
                        mCfg.isGamePaused
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-900 border-slate-700 text-emerald-400'
                      }`}
                    >
                      {mCfg.isGamePaused ? 'Resume Mines' : 'Mines Active'}
                    </button>
                  </div>
                </div>

                {/* Risk Level Selector Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {riskOptions.map((opt) => {
                    const isSelected = mCfg.riskLevel === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          updateMinesEngineConfig(
                            {
                              riskLevel: opt.id,
                              loseRatePercent: opt.defaultLoseRate,
                            },
                            `Mines Risk Level set to ${opt.label.toUpperCase()} (Lose Rate: ${opt.defaultLoseRate}%)`
                          )
                        }
                        className={`text-left p-3.5 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600/20 border-emerald-400 shadow-lg shadow-emerald-950/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-black text-white text-xs">{opt.label}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              isSelected
                                ? 'bg-emerald-400 text-slate-950'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-2">{opt.desc}</p>
                        <div className="text-[10px] font-mono font-bold text-amber-300">
                          Preset Lose Rate: {opt.defaultLoseRate}%
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Detailed Mines Parameters Table */}
                <div className="border border-slate-700/80 rounded-xl overflow-x-auto bg-slate-950">
                  <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 text-[11px] uppercase font-black text-slate-300 bg-slate-900">
                        <th className="p-3 border-r border-slate-800">Lanka Mines Parameter</th>
                        <th className="p-3 border-r border-slate-800">Current Value</th>
                        <th className="p-3">Control / Adjustment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {/* Lose Rate % */}
                      <tr>
                        <td className="p-3 border-r border-slate-800">
                          <span className="font-black text-rose-400 block">
                            Lose Rate / Bomb Trap Probability (%)
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Extra probability that clicking a hidden tile triggers a bomb (0% = Pure Natural Odds, 100% = Guaranteed Bomb)
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-800 font-mono font-black text-rose-400 text-sm">
                          {mCfg.loseRatePercent}%
                        </td>
                        <td className="p-3 space-y-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={mCfg.loseRatePercent}
                            onChange={(e) =>
                              updateMinesEngineConfig({
                                loseRatePercent: parseInt(e.target.value, 10),
                              })
                            }
                            className="w-full accent-rose-500 cursor-pointer"
                          />
                          <div className="flex flex-wrap gap-1.5">
                            {[0, 15, 25, 40, 60, 80, 95].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() =>
                                  updateMinesEngineConfig(
                                    { loseRatePercent: pct },
                                    `Mines Lose Rate set to ${pct}%`
                                  )
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border cursor-pointer ${
                                  mCfg.loseRatePercent === pct
                                    ? 'bg-rose-600 text-white border-rose-400'
                                    : 'bg-slate-900 text-slate-300 border-slate-700'
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>

                      {/* House Edge % */}
                      <tr>
                        <td className="p-3 border-r border-slate-800">
                          <span className="font-black text-white block">
                            Multiplier House Edge (%)
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Adjusts the LKR payout multiplier curve for each revealed gem
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-800 font-mono font-black text-purple-400 text-sm">
                          {mCfg.houseEdgePercent}%
                        </td>
                        <td className="p-3">
                          <input
                            type="range"
                            min="1"
                            max="35"
                            step="1"
                            value={mCfg.houseEdgePercent}
                            onChange={(e) =>
                              updateMinesEngineConfig({
                                houseEdgePercent: parseInt(e.target.value, 10),
                              })
                            }
                            className="w-full accent-purple-500 cursor-pointer"
                          />
                        </td>
                      </tr>

                      {/* Min & Max Bet in LKR */}
                      <tr>
                        <td className="p-3 border-r border-slate-800">
                          <span className="font-black text-white block">
                            Min Bet &amp; Max Bet Limits (LKR)
                          </span>
                          <span className="text-[10px] text-slate-400">
                            All bets in Sri Lankan Rupees (Default Min Bet: Rs. 10 LKR)
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-800 font-mono font-black text-emerald-400">
                          Rs. {mCfg.minBet.toLocaleString()} – Rs. {mCfg.maxBet.toLocaleString()} LKR
                        </td>
                        <td className="p-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">
                                Min Bet (LKR)
                              </label>
                              <input
                                type="number"
                                min="10"
                                step="10"
                                value={mCfg.minBet}
                                onChange={(e) =>
                                  updateMinesEngineConfig({
                                    minBet: Math.max(10, parseInt(e.target.value || '10', 10)),
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">
                                Max Bet (LKR)
                              </label>
                              <input
                                type="number"
                                min="100"
                                step="500"
                                value={mCfg.maxBet}
                                onChange={(e) =>
                                  updateMinesEngineConfig({
                                    maxBet: Math.max(100, parseInt(e.target.value || '50000', 10)),
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Default Mines & First Click Safe */}
                      <tr>
                        <td className="p-3 border-r border-slate-800">
                          <span className="font-black text-white block">
                            Default Mines Count &amp; First-Click Protection
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Configure default bomb count (1–24) and whether the 1st tile click is guaranteed safe
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-800 font-mono font-bold text-amber-300">
                          {mCfg.defaultMinesCount} Mines •{' '}
                          {mCfg.firstClickSafe ? '1st Click Safe' : '1st Click Can Hit Mine'}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400">Default Mines:</span>
                              <select
                                value={mCfg.defaultMinesCount}
                                onChange={(e) =>
                                  updateMinesEngineConfig({
                                    defaultMinesCount: parseInt(e.target.value, 10),
                                  })
                                }
                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-amber-300"
                              >
                                {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                                  <option key={n} value={n}>
                                    {n} Mines
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                updateMinesEngineConfig(
                                  { firstClickSafe: !mCfg.firstClickSafe },
                                  `First-Click Safe Guarantee ${
                                    !mCfg.firstClickSafe ? 'ENABLED' : 'DISABLED'
                                  }`
                                )
                              }
                              className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase border cursor-pointer ${
                                mCfg.firstClickSafe
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                  : 'bg-slate-900 border-slate-700 text-slate-400'
                              }`}
                            >
                              {mCfg.firstClickSafe
                                ? '✓ 1st Click Safe ON'
                                : '1st Click Safe OFF'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Receipt Viewer & Approval Modal */}
        {previewReceiptTx && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
                <div>
                  <h4 className="font-black text-white text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    Deposit Receipt Verification
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    User: <span className="text-white font-bold">{previewReceiptTx.username || previewReceiptTx.userId}</span> • Amount:{' '}
                    <span className="text-emerald-400 font-mono font-black">
                      Rs. {previewReceiptTx.amount.toLocaleString()}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewReceiptTx(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account &amp; Reference:</span>
                    <span className="text-white font-mono font-bold">{previewReceiptTx.accountDetails}</span>
                  </div>
                  {previewReceiptTx.receiptFileName && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Uploaded File:</span>
                      <span className="text-slate-300 font-mono">{previewReceiptTx.receiptFileName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span
                      className={`font-black uppercase ${
                        previewReceiptTx.status === 'completed'
                          ? 'text-emerald-400'
                          : previewReceiptTx.status === 'pending'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {previewReceiptTx.status}
                    </span>
                  </div>
                </div>

                {previewReceiptTx.receiptImage ? (
                  <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center p-2">
                    <img
                      src={previewReceiptTx.receiptImage}
                      alt="Bank Transfer Receipt"
                      className="max-h-[420px] w-auto object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No receipt image attached to this transaction.
                  </div>
                )}

                {previewReceiptTx.status === 'pending' ? (
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleTransactionDecision(previewReceiptTx.id, 'completed');
                        setPreviewReceiptTx(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve Deposit (Rs.{' '}
                      {previewReceiptTx.amount.toLocaleString()})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleTransactionDecision(previewReceiptTx.id, 'rejected');
                        setPreviewReceiptTx(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" /> Reject Deposit
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-xs text-slate-400 pt-1">
                    Transaction already {previewReceiptTx.status.toUpperCase()}
                    {previewReceiptTx.processedBy ? ` by ${previewReceiptTx.processedBy}` : ''}.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
