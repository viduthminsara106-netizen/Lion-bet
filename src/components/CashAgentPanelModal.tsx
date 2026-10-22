import React, { useState, useEffect } from 'react';
import { User, Transaction, BetRecord } from '../types/game';
import {
  getUsers,
  saveUser,
  getTransactions,
  saveTransactions,
  addTransaction,
  getBetHistory,
} from '../services/storage';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  History,
  X,
  CheckCircle2,
  XCircle,
  Search,
  Wallet,
  PlusCircle,
  MinusCircle,
  LogOut,
  Briefcase,
  Building2,
  Sparkles,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface CashAgentPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  initialMode?: 'deposit_panel' | 'withdraw_page';
  onUserUpdated: (updatedUser: User) => void;
  onLogout: () => void;
}

export const CashAgentPanelModal: React.FC<CashAgentPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialMode = 'deposit_panel',
  onUserUpdated,
  onLogout,
}) => {
  // Separate Deposit Agent Panel vs Withdraw Agent Page
  const [agentPage, setAgentPage] = useState<'deposit_panel' | 'withdraw_page'>(initialMode);
  const [subView, setSubView] = useState<'operations' | 'users_balances' | 'bet_history'>('operations');

  const [usersList, setUsersList] = useState<User[]>(getUsers());
  const [transactionsList, setTransactionsList] = useState<Transaction[]>(getTransactions());
  const [betHistoryList, setBetHistoryList] = useState<BetRecord[]>(getBetHistory());

  // Search & Filter states
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserForBets, setSelectedUserForBets] = useState<string>('ALL');

  // Direct Deposit / Withdraw Form State
  const [targetUserId, setTargetUserId] = useState<string>('user_player_1');
  const [actionAmount, setActionAmount] = useState<number>(2500);
  const [applyFirstBonus, setApplyFirstBonus] = useState<boolean>(true);
  const [actionNote, setActionNote] = useState<string>('');

  // Balance Editor State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editBalanceValue, setEditBalanceValue] = useState<string>('');
  const [adjustAmountValue, setAdjustAmountValue] = useState<string>('1000');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewReceiptTx, setPreviewReceiptTx] = useState<Transaction | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUsersList(getUsers());
      setTransactionsList(getTransactions());
      setBetHistoryList(getBetHistory());
      if (currentUser.role === 'withdraw_agent') {
        setAgentPage('withdraw_page');
      } else if (currentUser.role === 'deposit_agent') {
        setAgentPage('deposit_panel');
      } else {
        setAgentPage(initialMode);
      }
    }
  }, [isOpen, initialMode, currentUser.role]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const refreshData = () => {
    setUsersList(getUsers());
    setTransactionsList(getTransactions());
    setBetHistoryList(getBetHistory());
  };

  const playerAccounts = usersList.filter(
    (u) => u.role === 'player' || u.role === 'vip' || u.role === 'admin'
  );

  const filteredUsers = usersList.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.mobile && u.mobile.includes(userSearch)) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredBets =
    selectedUserForBets === 'ALL'
      ? betHistoryList
      : betHistoryList.filter((b) => b.userId === selectedUserForBets);

  // Process Direct Deposit by Deposit Agent
  const handleDirectDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const targetUser = usersList.find((u) => u.id === targetUserId);
    if (!targetUser) {
      setErrorMsg('Please select a valid user account.');
      return;
    }
    if (actionAmount <= 0) {
      setErrorMsg('Please enter a valid deposit amount in LKR.');
      return;
    }

    const hasPromoRegistered = Boolean(targetUser.referredBy && targetUser.referredBy.trim().length > 0);
    const eligibleFirstBonus =
      hasPromoRegistered && !targetUser.hasReceivedFirstDepositBonus && applyFirstBonus;
    const bonusAdded = eligibleFirstBonus ? actionAmount : 0;

    const updatedUser: User = {
      ...targetUser,
      balance: Number((targetUser.balance + actionAmount + bonusAdded).toFixed(2)),
      bonusBalance: Number(((targetUser.bonusBalance || 0) + bonusAdded).toFixed(2)),
      hasReceivedFirstDepositBonus: targetUser.hasReceivedFirstDepositBonus || eligibleFirstBonus,
    };

    saveUser(updatedUser);
    if (updatedUser.id === currentUser.id) {
      onUserUpdated(updatedUser);
    }

    const tx: Transaction = {
      id: 'tx_ag_dep_' + Date.now(),
      userId: targetUser.id,
      username: targetUser.username,
      type: 'deposit',
      amount: actionAmount,
      bonusAdded,
      method: 'cash_agent',
      accountDetails: `Cash Agent Deposit by ${currentUser.username}${
        actionNote ? ` (${actionNote})` : ''
      }${bonusAdded > 0 ? ` [+100% 1st Bonus: Rs.${bonusAdded}]` : ''}`,
      processedBy: currentUser.username,
      status: 'completed',
      timestamp: Date.now(),
    };

    addTransaction(tx);
    refreshData();
    setActionNote('');
    showToast(
      bonusAdded > 0
        ? `Credited Rs. ${actionAmount.toLocaleString()} + Rs. ${bonusAdded.toLocaleString()} (100% 1st Deposit Bonus) to ${targetUser.username}!`
        : `Credited Rs. ${actionAmount.toLocaleString()} LKR to ${targetUser.username}!`
    );
  };

  // Process Direct Withdrawal by Withdraw Agent
  const handleDirectWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const targetUser = usersList.find((u) => u.id === targetUserId);
    if (!targetUser) {
      setErrorMsg('Please select a valid user account.');
      return;
    }
    if (actionAmount <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount in LKR.');
      return;
    }

    const lockedBonus = Number((targetUser.bonusBalance || 0).toFixed(2));
    const maxWithdrawable = Math.max(0, Number((targetUser.balance - lockedBonus).toFixed(2)));

    if (actionAmount > maxWithdrawable) {
      setErrorMsg(
        `User ${targetUser.username} only has Rs. ${maxWithdrawable.toLocaleString()} LKR withdrawable balance (Rs. ${lockedBonus.toLocaleString()} is non-withdrawable 1st deposit bonus).`
      );
      return;
    }

    const updatedUser: User = {
      ...targetUser,
      balance: Number((targetUser.balance - actionAmount).toFixed(2)),
    };

    saveUser(updatedUser);
    if (updatedUser.id === currentUser.id) {
      onUserUpdated(updatedUser);
    }

    const tx: Transaction = {
      id: 'tx_ag_wd_' + Date.now(),
      userId: targetUser.id,
      username: targetUser.username,
      type: 'withdrawal',
      amount: actionAmount,
      method: 'cash_agent',
      accountDetails: `Cash Agent Payout by ${currentUser.username}${
        actionNote ? ` (${actionNote})` : ` (${targetUser.mobile || targetUser.email})`
      }`,
      processedBy: currentUser.username,
      status: 'completed',
      timestamp: Date.now(),
    };

    addTransaction(tx);
    refreshData();
    setActionNote('');
    showToast(
      `Processed Cash Agent Withdrawal of Rs. ${actionAmount.toLocaleString()} LKR for ${targetUser.username}!`
    );
  };

  // Approve or Reject Pending Deposit / Withdrawal Requests
  const handleRequestDecision = (txId: string, decision: 'completed' | 'rejected') => {
    const allTx = getTransactions();
    const targetTx = allTx.find((t) => t.id === txId);
    if (!targetTx || targetTx.status !== 'pending') return;

    const updatedTxList = allTx.map((t) =>
      t.id === txId
        ? { ...t, status: decision, processedBy: currentUser.username }
        : t
    );
    saveTransactions(updatedTxList);

    const allUsers = getUsers();
    const targetUser = allUsers.find((u) => u.id === targetTx.userId);

    if (targetTx.type === 'deposit' && decision === 'completed' && targetUser) {
      const hasPromoRegistered = Boolean(targetUser.referredBy && targetUser.referredBy.trim().length > 0);
      const isEligible1st = hasPromoRegistered && !targetUser.hasReceivedFirstDepositBonus;
      const bonusToAdd = isEligible1st ? targetTx.amount : 0;
      const updatedUser: User = {
        ...targetUser,
        balance: Number((targetUser.balance + targetTx.amount + bonusToAdd).toFixed(2)),
        bonusBalance: Number(((targetUser.bonusBalance || 0) + bonusToAdd).toFixed(2)),
        hasReceivedFirstDepositBonus: targetUser.hasReceivedFirstDepositBonus || isEligible1st,
      };
      saveUser(updatedUser);
      if (updatedUser.id === currentUser.id) {
        onUserUpdated(updatedUser);
      }
      showToast(
        `Approved Deposit of Rs. ${targetTx.amount.toLocaleString()} LKR for ${targetUser.username}!`
      );
    } else if (targetTx.type === 'withdrawal' && decision === 'rejected' && targetUser) {
      const updatedUser: User = {
        ...targetUser,
        balance: Number((targetUser.balance + targetTx.amount).toFixed(2)),
      };
      saveUser(updatedUser);
      if (updatedUser.id === currentUser.id) {
        onUserUpdated(updatedUser);
      }
      showToast(
        `Rejected Withdrawal & Refunded Rs. ${targetTx.amount.toLocaleString()} LKR to ${targetUser.username}.`
      );
    } else {
      showToast(`Request marked as ${decision.toUpperCase()}!`);
    }

    refreshData();
  };

  // Agent Edit User Balance (Set Exact Balance or Add/Deduct)
  const handleSaveExactBalance = (userId: string) => {
    const val = parseFloat(editBalanceValue);
    if (isNaN(val) || val < 0) {
      setErrorMsg('Please enter a valid non-negative balance.');
      return;
    }
    const target = usersList.find((u) => u.id === userId);
    if (!target) return;

    const updatedUser: User = {
      ...target,
      balance: Number(val.toFixed(2)),
    };
    saveUser(updatedUser);
    if (updatedUser.id === currentUser.id) {
      onUserUpdated(updatedUser);
    }
    setEditingUserId(null);
    setEditBalanceValue('');
    refreshData();
    showToast(`Updated ${target.username}'s balance to Rs. ${val.toLocaleString()} LKR!`);
  };

  const handleQuickAdjustBalance = (userId: string, delta: number) => {
    const target = usersList.find((u) => u.id === userId);
    if (!target) return;
    const nextBalance = Math.max(0, Number((target.balance + delta).toFixed(2)));
    const updatedUser: User = {
      ...target,
      balance: nextBalance,
    };
    saveUser(updatedUser);
    if (updatedUser.id === currentUser.id) {
      onUserUpdated(updatedUser);
    }
    refreshData();
    showToast(
      `${delta >= 0 ? 'Added' : 'Deducted'} Rs. ${Math.abs(delta).toLocaleString()} LKR ${
        delta >= 0 ? 'to' : 'from'
      } ${target.username} (New Balance: Rs. ${nextBalance.toLocaleString()} LKR)`
    );
  };

  const depositTransactions = transactionsList.filter((t) => t.type === 'deposit');
  const withdrawTransactions = transactionsList.filter((t) => t.type === 'withdrawal');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-emerald-500/40 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh]">
        {/* Top Header: Separate Deposit Agent Panel & Withdraw Agent Page Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-950 border border-amber-500/60 overflow-hidden shrink-0">
              <img
                src="/assets/aistudio/file_0000000012b48211a458c023cc759725_1a4c4c4a.png"
                alt="Lion Bet Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-lg font-black text-white truncate">
                  {agentPage === 'deposit_panel'
                    ? 'Lion Bet - Deposit Agent Panel'
                    : 'Lion Bet - Withdraw Agent Page'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {currentUser.username} ({currentUser.role.replace('_', ' ').toUpperCase()})
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase bg-green-500/20 text-green-300 border border-green-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  ONLINE ON SITE
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
                {agentPage === 'deposit_panel'
                  ? 'Dedicated Deposit Agent Panel: Credit player deposits, edit user balances & inspect user betting history'
                  : 'Dedicated Withdraw Agent Page: Process player withdrawals, edit user balances & inspect user betting history'}
              </p>
            </div>
          </div>

          {/* Dedicated Page Switcher: Deposit Agent Panel vs Withdraw Agent Page */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => {
                  setAgentPage('deposit_panel');
                  setSubView('operations');
                }}
                className={`flex-1 sm:flex-initial justify-center px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-black flex items-center gap-1 transition cursor-pointer ${
                  agentPage === 'deposit_panel'
                    ? 'bg-emerald-600 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Deposit Agent Panel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAgentPage('withdraw_page');
                  setSubView('operations');
                }}
                className={`flex-1 sm:flex-initial justify-center px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-black flex items-center gap-1 transition cursor-pointer ${
                  agentPage === 'withdraw_page'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Withdraw Agent Page</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[11px] sm:text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                title="Logout from Agent Account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Bar inside Current Agent Page (Horizontally scrollable on mobile) */}
        <div className="flex items-center overflow-x-auto no-scrollbar border-b border-slate-800 bg-slate-950/50 px-3 sm:px-5 pt-2 gap-1 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setSubView('operations')}
              className={`pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                subView === 'operations'
                  ? agentPage === 'deposit_panel'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {agentPage === 'deposit_panel' ? (
                <>
                  <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Deposit Operations ({depositTransactions.filter((t) => t.status === 'pending').length} Pending)</span>
                </>
              ) : (
                <>
                  <ArrowUpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Withdrawal Operations ({withdrawTransactions.filter((t) => t.status === 'pending').length} Pending)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSubView('users_balances')}
              className={`pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                subView === 'users_balances'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Edit User Balances ({usersList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubView('bet_history')}
              className={`pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                subView === 'bet_history'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>User Betting History ({betHistoryList.length})</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {toastMsg && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs py-2.5 px-6 flex items-center gap-2 font-bold animate-fade-in">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-rose-500/20 border-b border-rose-500/40 text-rose-300 text-xs py-2.5 px-6 flex items-center gap-2 font-bold animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Content Body */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-5 text-xs text-slate-300 flex-1">
          {/* =================================================================
              1A. DEPOSIT AGENT PANEL (STRUCTURED TABLE FORMAT)
              ================================================================= */}
          {subView === 'operations' && agentPage === 'deposit_panel' && (
            <div className="space-y-5">
              {/* Instant Cash Agent Deposit Credit Table Form */}
              <div className="bg-slate-950 border border-emerald-500/40 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-black text-white text-xs sm:text-sm">
                      Credit User Deposit Table (Deposit Agent Panel)
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    +100% 1st Deposit Bonus Eligible
                  </span>
                </div>

                <form onSubmit={handleDirectDeposit} className="p-3 sm:p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[740px] text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                          <th className="p-2">Select Player Account</th>
                          <th className="p-2">Deposit Amount (LKR)</th>
                          <th className="p-2">1st Deposit 100% Bonus</th>
                          <th className="p-2">Receipt / Reference Note</th>
                          <th className="p-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2">
                            <select
                              value={targetUserId}
                              onChange={(e) => setTargetUserId(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                            >
                              {playerAccounts.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.username} ({u.id}) — Bal: Rs. {u.balance.toLocaleString()}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="100"
                              step="100"
                              value={actionAmount}
                              onChange={(e) =>
                                setActionAmount(Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="p-2">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700">
                              <input
                                type="checkbox"
                                checked={applyFirstBonus}
                                onChange={(e) => setApplyFirstBonus(e.target.checked)}
                                className="w-3.5 h-3.5 rounded accent-emerald-500"
                              />
                              <span className="text-[11px] font-bold text-amber-300">
                                +100% 1st Bonus
                              </span>
                            </label>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={actionNote}
                              onChange={(e) => setActionNote(e.target.value)}
                              placeholder="WhatsApp Receipt #9021"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <button
                              type="submit"
                              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow cursor-pointer whitespace-nowrap"
                            >
                              Credit Deposit
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </form>
              </div>

              {/* Player Deposit Requests Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white text-sm">
                    Player Deposit Requests Table ({depositTransactions.length})
                  </h3>
                  <span className="text-[11px] text-amber-400 font-bold">
                    Pending Approval: {depositTransactions.filter((t) => t.status === 'pending').length}
                  </span>
                </div>

                <div className="border border-slate-700/80 rounded-xl overflow-x-auto bg-slate-950 shadow-inner">
                  <table className="w-full min-w-[900px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 text-[11px] uppercase tracking-wider font-black text-slate-300 bg-slate-900">
                        <th className="p-3 border-r border-slate-800 w-10 text-center">#</th>
                        <th className="p-3 border-r border-slate-800">User ID</th>
                        <th className="p-3 border-r border-slate-800">Player Name</th>
                        <th className="p-3 border-r border-slate-800">Method</th>
                        <th className="p-3 border-r border-slate-800">Account / Reference Details</th>
                        <th className="p-3 border-r border-slate-800">Receipt Slip</th>
                        <th className="p-3 border-r border-slate-800">Deposit Amount</th>
                        <th className="p-3 border-r border-slate-800">1st Deposit Bonus</th>
                        <th className="p-3 border-r border-slate-800">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {depositTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-500">
                            No deposit transactions found.
                          </td>
                        </tr>
                      ) : (
                        depositTransactions.map((tx, idx) => (
                          <tr key={`${tx.id}-${idx}`} className="hover:bg-slate-900/50">
                            <td className="p-3 border-r border-slate-800/80 text-center font-mono text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="p-3 border-r border-slate-800/80 font-mono text-[11px] text-slate-400">
                              {tx.userId}
                            </td>
                            <td className="p-3 border-r border-slate-800/80 font-bold text-white">
                              {tx.username || tx.userId}
                            </td>
                            <td className="p-3 border-r border-slate-800/80">
                              <span className="font-bold text-emerald-400 uppercase text-[10px]">
                                {tx.method.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3 border-r border-slate-800/80 text-[11px] text-slate-300">
                              {tx.accountDetails}
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
                              {tx.bonusAdded ? (
                                <span className="text-[11px] text-amber-400 font-bold">
                                  +Rs. {tx.bonusAdded.toLocaleString()}
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
                                    onClick={() => handleRequestDecision(tx.id, 'completed')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3 h-3" /> Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRequestDecision(tx.id, 'rejected')}
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <XCircle className="w-3 h-3" /> Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-500">
                                  {tx.processedBy ? `By ${tx.processedBy}` : 'Done'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              1B. WITHDRAW AGENT PAGE (STRUCTURED TABLE FORMAT)
              ================================================================= */}
          {subView === 'operations' && agentPage === 'withdraw_page' && (
            <div className="space-y-5">
              {/* Direct Withdrawal Payout Table Form */}
              <div className="bg-slate-950 border border-amber-500/40 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 text-amber-400" />
                    <h3 className="font-black text-white text-xs sm:text-sm">
                      Process User Withdrawal Table (Withdraw Agent Page)
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    Only Profit / Withdrawable Balance Allowed
                  </span>
                </div>

                <form onSubmit={handleDirectWithdrawal} className="p-3 sm:p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[740px] text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                          <th className="p-2">Select Player Account (Withdrawable Balance)</th>
                          <th className="p-2">Withdrawal Amount (LKR)</th>
                          <th className="p-2">Payout Account / Mobile Reference</th>
                          <th className="p-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2">
                            <select
                              value={targetUserId}
                              onChange={(e) => setTargetUserId(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                            >
                              {playerAccounts.map((u) => {
                                const locked = u.bonusBalance || 0;
                                const withdrawable = Math.max(0, u.balance - locked);
                                return (
                                  <option key={u.id} value={u.id}>
                                    {u.username} ({u.id}) — Withdrawable: Rs.{' '}
                                    {withdrawable.toLocaleString()} (Locked Bonus: Rs.{' '}
                                    {locked.toLocaleString()})
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="100"
                              step="100"
                              value={actionAmount}
                              onChange={(e) =>
                                setActionAmount(Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-black text-amber-400 focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={actionNote}
                              onChange={(e) => setActionNote(e.target.value)}
                              placeholder="Sent Cash to 0771234567"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <button
                              type="submit"
                              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow cursor-pointer whitespace-nowrap"
                            >
                              Complete Payout
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </form>
              </div>

              {/* Player Withdrawal Requests Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white text-sm">
                    Player Withdrawal Requests Table ({withdrawTransactions.length})
                  </h3>
                  <span className="text-[11px] text-amber-400 font-bold">
                    Pending Payouts: {withdrawTransactions.filter((t) => t.status === 'pending').length}
                  </span>
                </div>

                <div className="border border-slate-700/80 rounded-xl overflow-x-auto bg-slate-950 shadow-inner">
                  <table className="w-full min-w-[820px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 text-[11px] uppercase tracking-wider font-black text-slate-300 bg-slate-900">
                        <th className="p-3 border-r border-slate-800 w-10 text-center">#</th>
                        <th className="p-3 border-r border-slate-800">User ID</th>
                        <th className="p-3 border-r border-slate-800">Player Name</th>
                        <th className="p-3 border-r border-slate-800">Method</th>
                        <th className="p-3 border-r border-slate-800">Payout Account Details</th>
                        <th className="p-3 border-r border-slate-800">Payout Amount (LKR)</th>
                        <th className="p-3 border-r border-slate-800">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {withdrawTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-500">
                            No withdrawal requests found.
                          </td>
                        </tr>
                      ) : (
                        withdrawTransactions.map((tx, idx) => (
                          <tr key={`${tx.id}-${idx}`} className="hover:bg-slate-900/50">
                            <td className="p-3 border-r border-slate-800/80 text-center font-mono text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="p-3 border-r border-slate-800/80 font-mono text-[11px] text-slate-400">
                              {tx.userId}
                            </td>
                            <td className="p-3 border-r border-slate-800/80 font-bold text-white">
                              {tx.username || tx.userId}
                            </td>
                            <td className="p-3 border-r border-slate-800/80">
                              <span className="font-bold text-amber-400 uppercase text-[10px]">
                                {tx.method.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3 border-r border-slate-800/80 text-[11px] text-slate-300">
                              {tx.accountDetails}
                            </td>
                            <td className="p-3 border-r border-slate-800/80 font-mono font-black text-white">
                              Rs. {tx.amount.toLocaleString()}
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
                                    onClick={() => handleRequestDecision(tx.id, 'completed')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3 h-3" /> Pay &amp; Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRequestDecision(tx.id, 'rejected')}
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <XCircle className="w-3 h-3" /> Reject &amp; Refund
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-500">
                                  {tx.processedBy ? `By ${tx.processedBy}` : 'Done'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              2. AGENT EDIT USER BALANCES TABLE
              ================================================================= */}
          {subView === 'users_balances' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-white text-sm">
                    All Users &amp; Agent Balance Management Table ({filteredUsers.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Agents can directly edit user balances, add/deduct LKR, or inspect any user&apos;s betting history in table format.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-bold text-slate-400">Step (LKR):</span>
                    {[500, 1000, 5000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAdjustAmountValue(String(preset))}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          adjustAmountValue === String(preset)
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'bg-slate-900 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                    <input
                      type="number"
                      value={adjustAmountValue}
                      onChange={(e) => setAdjustAmountValue(e.target.value)}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-black text-emerald-400"
                    />
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search name, ID, mobile..."
                      className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-700/80 rounded-xl overflow-x-auto bg-slate-950 shadow-inner">
                <table className="w-full min-w-[860px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-700 text-[11px] uppercase tracking-wider font-black text-slate-300 bg-slate-900">
                      <th className="p-3 border-r border-slate-800 w-10 text-center">#</th>
                      <th className="p-3 border-r border-slate-800">User ID</th>
                      <th className="p-3 border-r border-slate-800">Player Name</th>
                      <th className="p-3 border-r border-slate-800">Mobile / Email</th>
                      <th className="p-3 border-r border-slate-800">Playable Balance (LKR)</th>
                      <th className="p-3 border-r border-slate-800">Locked Bonus</th>
                      <th className="p-3 border-r border-slate-800">Withdrawable</th>
                      <th className="p-3 border-r border-slate-800">Quick Add / Deduct</th>
                      <th className="p-3 text-right">Betting History</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredUsers.map((u, idx) => {
                      const stepVal = Math.max(0, parseFloat(adjustAmountValue) || 1000);
                      const locked = u.bonusBalance || 0;
                      const withdrawable = Math.max(0, u.balance - locked);
                      return (
                        <tr key={u.id} className="hover:bg-slate-900/50">
                          <td className="p-3 border-r border-slate-800/80 text-center font-mono text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-3 border-r border-slate-800/80 font-mono text-[11px] text-slate-400">
                            {u.id}
                          </td>
                          <td className="p-3 border-r border-slate-800/80">
                            <div className="flex items-center gap-1.5">
                              <span className="text-base">{u.avatar}</span>
                              <span className="font-bold text-white">{u.username}</span>
                            </div>
                          </td>
                          <td className="p-3 border-r border-slate-800/80">
                            <span className="text-emerald-400 block font-mono text-[11px]">
                              {u.mobile || '-'}
                            </span>
                            <span className="text-[10px] text-slate-500">{u.email}</span>
                          </td>
                          <td className="p-3 border-r border-slate-800/80">
                            {editingUserId === u.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={editBalanceValue}
                                  onChange={(e) => setEditBalanceValue(e.target.value)}
                                  className="w-24 bg-slate-900 border border-emerald-500 rounded px-2 py-1 text-xs font-black text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveExactBalance(u.id)}
                                  className="px-2 py-1 bg-emerald-500 text-slate-950 font-black rounded text-[10px] cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingUserId(null)}
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
                                    setEditingUserId(u.id);
                                    setEditBalanceValue(String(u.balance));
                                  }}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold cursor-pointer"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="p-3 border-r border-slate-800/80 font-mono text-amber-400">
                            Rs. {locked.toLocaleString()}
                          </td>
                          <td className="p-3 border-r border-slate-800/80 font-mono font-bold text-white">
                            Rs. {withdrawable.toLocaleString()}
                          </td>
                          <td className="p-3 border-r border-slate-800/80">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustBalance(u.id, stepVal)}
                                className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-black text-[10px] flex items-center gap-0.5 cursor-pointer"
                              >
                                <PlusCircle className="w-3 h-3" /> +{stepVal}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustBalance(u.id, -stepVal)}
                                className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-black text-[10px] flex items-center gap-0.5 cursor-pointer"
                              >
                                <MinusCircle className="w-3 h-3" /> -{stepVal}
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserForBets(u.id);
                                setSubView('bet_history');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <History className="w-3 h-3" /> View Bets
                            </button>
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
              3. USER BETTING HISTORY TABLE (AGENT VIEW)
              ================================================================= */}
          {subView === 'bet_history' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-white text-sm">
                    Player Betting History Table ({filteredBets.length} Records)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Inspect every round wagered, cashout multiplier, crash point, and net profit/loss per user in table format.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-400">Filter by Player:</label>
                  <select
                    value={selectedUserForBets}
                    onChange={(e) => setSelectedUserForBets(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Players ({betHistoryList.length} Bets)</option>
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
                      <th className="p-3 text-right">Result &amp; Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredBets.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-500">
                          No betting history found for this user.
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
                              {new Date(bet.timestamp).toLocaleTimeString()}
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
                    Player: <span className="text-white font-bold">{previewReceiptTx.username || previewReceiptTx.userId}</span> • Amount:{' '}
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
                        handleRequestDecision(previewReceiptTx.id, 'completed');
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
                        handleRequestDecision(previewReceiptTx.id, 'rejected');
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
