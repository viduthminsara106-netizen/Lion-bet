import React, { useState, useEffect } from 'react';
import { User, Transaction, PaymentMethod } from '../types/game';
import {
  addTransaction,
  getTransactions,
  saveUser,
  CashAgentWithPresence,
  getCashAgentsSync,
  fetchCashAgentsWithPresence,
  creditReferrerCommission,
} from '../services/storage';
import { soundService } from '../services/sound';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Upload,
  MessageCircle,
  Clock,
  Gift,
  Lock,
  UserCheck,
  Users,
} from 'lucide-react';

interface DepositWithdrawModalProps {
  isOpen: boolean;
  initialTab?: 'deposit' | 'withdraw';
  onClose: () => void;
  currentUser: User;
  onBalanceUpdated: (updatedUser: User) => void;
}

export const DepositWithdrawModal: React.FC<DepositWithdrawModalProps> = ({
  isOpen,
  initialTab = 'deposit',
  onClose,
  currentUser,
  onBalanceUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>(initialTab);
  const [method, setMethod] = useState<PaymentMethod>('cash_agent');
  const [amount, setAmount] = useState<number>(2500);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('Commercial Bank');
  const [agentReference, setAgentReference] = useState('');

  // Real Admin-created Cash Agents & live Online/Offline presence on the site
  const [siteAgents, setSiteAgents] = useState<CashAgentWithPresence[]>(() => getCashAgentsSync());
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // Bank transfer slip upload state
  const [slipFile, setSlipFile] = useState<string | null>(null);
  const [slipFileName, setSlipFileName] = useState<string>('');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(getTransactions());

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    let mounted = true;

    const loadAgents = async () => {
      setSiteAgents(getCashAgentsSync());
      const fresh = await fetchCashAgentsWithPresence();
      if (mounted) {
        setSiteAgents(fresh);
      }
    };

    loadAgents();
    const interval = setInterval(loadAgents, 3000);
    const onStorage = () => {
      if (mounted) setSiteAgents(getCashAgentsSync());
    };
    window.addEventListener('storage', onStorage);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const depositPresets = [500, 1000, 2500, 5000, 10000, 25000];

  const bonusBalance = Number((currentUser.bonusBalance || 0).toFixed(2));
  const withdrawableBalance = Math.max(
    0,
    Number((currentUser.balance - bonusBalance).toFixed(2))
  );
  const hasUsedPromoCode = Boolean(currentUser.referredBy && currentUser.referredBy.trim().length > 0);
  const isFirstDepositEligible = hasUsedPromoCode && !currentUser.hasReceivedFirstDepositBonus;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSlipFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (amount < 200) {
      setErrorMessage('Minimum deposit amount is Rs. 200 LKR');
      return;
    }

    if (method === 'bank_transfer' && !slipFile) {
      setErrorMessage('You must upload your bank transfer receipt/slip before submitting.');
      return;
    }

    const isPendingApproval = method === 'bank_transfer';
    const firstDepositBonusAmount = isFirstDepositEligible ? amount : 0;

    const chosenAgent = siteAgents.find((a) => a.id === selectedAgentId);
    const methodDetails =
      method === 'bank_transfer'
        ? `${bankName} (Acc: 8020510080 • Branch: Deiyandara • Receipt: ${slipFileName || 'Attached'})`
        : `Lion Bet Agent (${
            chosenAgent
              ? `${chosenAgent.username} [${chosenAgent.isOnline ? 'ONLINE' : 'OFFLINE'}]`
              : agentReference.trim() || 'WhatsApp Verified - 0723905537'
          })`;

    const tx: Transaction = {
      id: 'tx_dep_' + Date.now(),
      userId: currentUser.id,
      username: currentUser.username,
      type: 'deposit',
      amount,
      bonusAdded: firstDepositBonusAmount,
      method,
      accountDetails: `${methodDetails}${
        firstDepositBonusAmount > 0 ? ` [+100% 1st Deposit Bonus: Rs.${firstDepositBonusAmount}]` : ''
      }`,
      receiptImage: method === 'bank_transfer' && slipFile ? slipFile : undefined,
      receiptFileName: method === 'bank_transfer' && slipFileName ? slipFileName : undefined,
      status: isPendingApproval ? 'pending' : 'completed',
      timestamp: Date.now(),
    };

    addTransaction(tx);
    setTransactions(getTransactions());
    if (method === 'bank_transfer') {
      setSlipFile(null);
      setSlipFileName('');
    }

    if (!isPendingApproval) {
      const updatedUser: User = {
        ...currentUser,
        balance: Number((currentUser.balance + amount + firstDepositBonusAmount).toFixed(2)),
        bonusBalance: Number(((currentUser.bonusBalance || 0) + firstDepositBonusAmount).toFixed(2)),
        hasReceivedFirstDepositBonus: true,
      };
      const { referredUpdated } = creditReferrerCommission(updatedUser, amount, 'deposit');
      saveUser(referredUpdated);
      onBalanceUpdated(referredUpdated);
      soundService.playCashout(true);

      if (firstDepositBonusAmount > 0) {
        setSuccessMessage(
          `🎉 1st Deposit 100% Bonus! Rs. ${amount.toLocaleString()} + Rs. ${firstDepositBonusAmount.toLocaleString()} Bonus = Rs. ${(amount + firstDepositBonusAmount).toLocaleString()} LKR added via ${method === 'cash_agent' ? 'Cash Agent' : 'Gateway'}! (Bonus is for betting; profit won is withdrawable)`
        );
      } else {
        setSuccessMessage(
          `Rs. ${amount.toLocaleString()} LKR successfully deposited via ${
            method === 'cash_agent' ? 'Cash Agent' : 'Gateway'
          }!`
        );
      }
    } else {
      setSuccessMessage(
        isFirstDepositEligible
          ? `Bank transfer slip submitted! Once Admin approves, you will receive Rs. ${amount.toLocaleString()} + Rs. ${amount.toLocaleString()} (100% 1st Deposit Bonus)!`
          : `Bank transfer slip submitted! Awaiting Admin approval.`
      );
    }

    setTimeout(() => setSuccessMessage(null), 5500);
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (amount > withdrawableBalance) {
      setErrorMessage(
        `You can only withdraw up to Rs. ${withdrawableBalance.toLocaleString()} LKR! The 1st Deposit Bonus (Rs. ${bonusBalance.toLocaleString()} LKR) cannot be withdrawn directly — only the profit won by betting with it can be withdrawn.`
      );
      return;
    }
    if (amount < 500) {
      setErrorMessage('Minimum withdrawal amount is Rs. 500 LKR');
      return;
    }
    if (!accountNumber.trim()) {
      setErrorMessage(
        method === 'cash_agent'
          ? 'Please enter your WhatsApp / Mobile number for the Cash Agent.'
          : 'Please enter your account / wallet details.'
      );
      return;
    }

    const tx: Transaction = {
      id: 'tx_wd_' + Date.now(),
      userId: currentUser.id,
      type: 'withdrawal',
      amount,
      method,
      accountDetails:
        method === 'bank_transfer'
          ? `${bankName} - ${accountNumber}`
          : `Cash Agent Payout - ${accountNumber} (${accountName || currentUser.username})`,
      status: 'pending',
      timestamp: Date.now(),
    };

    addTransaction(tx);
    setTransactions(getTransactions());

    const updatedUser: User = {
      ...currentUser,
      balance: Number((currentUser.balance - amount).toFixed(2)),
    };
    saveUser(updatedUser);
    onBalanceUpdated(updatedUser);

    soundService.playCashout(false);
    setSuccessMessage(
      `Rs. ${amount.toLocaleString()} LKR withdrawal request via ${
        method === 'cash_agent' ? 'Cash Agent' : method.replace('_', ' ')
      } submitted!`
    );
    setAccountNumber('');
    setTimeout(() => setSuccessMessage(null), 4500);
  };

  const getWhatsAppAgentUrl = (
    actionType: 'deposit' | 'withdraw' = 'deposit',
    customPhone?: string,
    agentName?: string
  ) => {
    const rawDigits = (customPhone || '0723905537').replace(/[^0-9]/g, '');
    const waPhone = rawDigits.startsWith('94')
      ? rawDigits
      : rawDigits.startsWith('0')
      ? '94' + rawDigits.slice(1)
      : '94723905537';
    const targetLabel = agentName
      ? `${agentName} (${customPhone || '0723905537'})`
      : 'Official Cash Agent (0723905537)';
    const msg =
      actionType === 'deposit'
        ? `Hello Lion Bet ${targetLabel}, I want to DEPOSIT Rs. ${amount} LKR to my Lion Bet account (User ID: ${currentUser.id}, Name: ${currentUser.username}).`
        : `Hello Lion Bet ${targetLabel}, I want to WITHDRAW Rs. ${amount} LKR from my Lion Bet account (User ID: ${currentUser.id}, Name: ${currentUser.username}, Contact: ${accountNumber || currentUser.mobile || ''}).`;
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  };

  const onlineAgents = siteAgents.filter((a) => a.isOnline);
  const offlineAgents = siteAgents.filter((a) => !a.isOnline);
  const onlineAgentsCount = onlineAgents.length;
  const offlineAgentsCount = offlineAgents.length;

  const renderSiteCashAgentsDirectory = (actionType: 'deposit' | 'withdraw') => (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-emerald-400" />
          <span className="font-black text-white text-xs">
            Online Cash Agents on Site ({onlineAgentsCount} Online)
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-black">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {onlineAgentsCount} Online
          </span>
          {offlineAgentsCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              {offlineAgentsCount} Offline
            </span>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-300">
        Select any <strong className="text-emerald-400">Online Cash Agent</strong> below to open their WhatsApp directly for instant {actionType === 'deposit' ? 'deposit' : 'withdrawal'}:
      </p>

      {siteAgents.length === 0 ? (
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-1">
          <p className="text-xs font-bold text-slate-300">
            No Cash Agent accounts have been added by the Admin yet.
          </p>
          <p className="text-[10px] text-slate-500">
            When the Admin creates a Cash Agent account in the Admin Panel, it will immediately appear here with its live Online / Offline status.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {siteAgents.map((ag) => {
            const isSelected = selectedAgentId === ag.id;
            const roleLabel =
              ag.role === 'deposit_agent'
                ? 'Deposit Agent'
                : ag.role === 'withdraw_agent'
                ? 'Withdraw Agent'
                : 'Cash Agent';
            const contactPhone = ag.agentContact || ag.mobile || '0723905537';
            const waUrl = getWhatsAppAgentUrl(actionType, contactPhone, ag.username);

            return (
              <a
                key={ag.id}
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setSelectedAgentId(ag.id);
                  setAgentReference(ag.username);
                }}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 block ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500/80 shadow-md shadow-emerald-500/10'
                    : ag.isOnline
                    ? 'bg-slate-900/95 border-emerald-500/40 hover:border-emerald-400 hover:bg-slate-900'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-75'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center text-base">
                      {ag.avatar || '💼'}
                    </div>
                    <span
                      className={`w-2.5 h-2.5 rounded-full border-2 border-slate-950 absolute -bottom-0.5 -right-0.5 ${
                        ag.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-black text-white text-xs truncate">
                        {ag.username}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          ag.isOnline
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {ag.isOnline ? '● ONLINE' : '○ OFFLINE'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold uppercase">
                        {roleLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                      WhatsApp: <strong className="text-emerald-400">{contactPhone}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-400 text-slate-950 shadow'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{isSelected ? '✓ Selected • Open WhatsApp' : 'Select & WhatsApp'}</span>
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/75">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-amber-500/60 overflow-hidden shrink-0">
              <img
                src="/assets/aistudio/file_0000000012b48211a458c023cc759725_1a4c4c4a.png"
                alt="Lion Bet Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">Lion Bet Cashier - Deposit &amp; Withdraw</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  LKR 🇱🇰
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Playable:{' '}
                <strong className="text-emerald-400">
                  Rs. {currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong>{' '}
                • Withdrawable:{' '}
                <strong className="text-amber-400">
                  Rs. {withdrawableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong>
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

        {/* Balance Breakdown Strip */}
        <div className="grid grid-cols-3 gap-2 px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 text-center">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">
              Total Playable
            </span>
            <span className="text-xs sm:text-sm font-black text-white">
              Rs. {currentUser.balance.toLocaleString()}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-[9px] uppercase font-bold text-emerald-400 block">
              Withdrawable (Profit)
            </span>
            <span className="text-xs sm:text-sm font-black text-emerald-400">
              Rs. {withdrawableBalance.toLocaleString()}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <span className="text-[9px] uppercase font-bold text-amber-400 flex items-center justify-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Locked Bonus
            </span>
            <span className="text-xs sm:text-sm font-black text-amber-400">
              Rs. {bonusBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('deposit');
              setErrorMessage(null);
            }}
            className={`pb-3 px-4 text-xs font-black transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'deposit'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            Deposit Funds
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('withdraw');
              setErrorMessage(null);
            }}
            className={`pb-3 px-4 text-xs font-black transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'withdraw'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            Withdraw Funds
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 text-xs font-black transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Transactions ({transactions.length})
          </button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs py-2.5 px-6 flex items-center gap-2 font-bold animate-fade-in">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-500/20 border-b border-rose-500/40 text-rose-300 text-xs py-2.5 px-6 flex items-center gap-2 font-bold animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 flex-1">
          {activeTab === 'deposit' && (
            <form onSubmit={handleDeposit} className="space-y-4">
              {/* 1st Deposit 100% Bonus Banner (Only for users registered with a Promocode) */}
              {isFirstDepositEligible ? (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/15 to-amber-500/20 border border-amber-500/50 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/25 text-amber-300 shrink-0 mt-0.5">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-black text-amber-300 text-xs uppercase tracking-wide block">
                      🎁 1st Deposit 100% Bonus Active (Promocode: {currentUser.referredBy})!
                    </span>
                    <p className="text-[11px] text-slate-200 leading-relaxed">
                      Because you registered with a Promocode, your <strong>First Deposit</strong> receives an instant{' '}
                      <strong>100% Bonus</strong>! (Deposit{' '}
                      <strong>Rs. {amount.toLocaleString()}</strong> → Total Credited:{' '}
                      <strong className="text-emerald-400">
                        Rs. {(amount * 2).toLocaleString()} LKR
                      </strong>
                      )
                    </p>
                    <p className="text-[10px] text-amber-300/90 font-semibold">
                      * Bonus funds cannot be withdrawn directly — only the profits won by betting with the bonus can be withdrawn.
                    </p>
                  </div>
                </div>
              ) : currentUser.hasReceivedFirstDepositBonus ? (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>✅ 1st Deposit 100% Bonus already claimed on this account.</span>
                  <span className="font-bold text-emerald-400">Standard Deposit (0% Bonus)</span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>ℹ️ 1st Deposit 100% Bonus is exclusively for accounts registered with a Promocode.</span>
                  <span className="font-bold text-slate-300">Standard Deposit (0% Bonus)</span>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-300 block mb-2">
                  Select Deposit Method:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'cash_agent',
                      label: 'Cash Agent',
                      sub: isFirstDepositEligible ? 'Official Agent (+100% 1st Bonus)' : 'Online Cash Agent (WhatsApp)',
                      icon: '🤝',
                    },
                    {
                      id: 'bank_transfer',
                      label: 'Bank Transfer',
                      sub: 'Upload Slip (Admin Review)',
                      icon: '🏦',
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id as PaymentMethod)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        method === m.id
                          ? 'bg-emerald-500/15 border-emerald-500/60 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-950 border-slate-800 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{m.icon}</span>
                        {method === m.id && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="mt-2">
                        <span className="font-black text-white block text-xs">{m.label}</span>
                        <span className="text-[10px] text-emerald-400 font-semibold">{m.sub}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-2">Select Amount (LKR):</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {depositPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`py-2 px-1 rounded-xl text-xs font-black transition cursor-pointer ${
                        amount === preset
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      Rs. {preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Enter Deposit Amount (LKR)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-bold">Rs.</span>
                  <input
                    type="number"
                    min="200"
                    step="100"
                    value={amount}
                    onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-base font-black text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 text-xs text-slate-400 font-bold">LKR</span>
                </div>
              </div>

              {/* Cash Agent Specific Option */}
              {method === 'cash_agent' && (
                <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/40 space-y-3.5">
                  {renderSiteCashAgentsDirectory('deposit')}

                  <div className="pt-2.5 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-emerald-400 text-xs flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4" /> Official Hotline Cash Agent: 0723905537
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                        0723905537 • WhatsApp
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={agentReference}
                        onChange={(e) => setAgentReference(e.target.value)}
                        placeholder="Selected Agent / Reference Code (Optional)"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      <a
                        href={getWhatsAppAgentUrl('deposit')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <MessageCircle className="w-4 h-4" /> WhatsApp: 0723905537
                      </a>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Join our Official WhatsApp Channel for updates &amp; bonuses:
                    </span>
                    <a
                      href="https://whatsapp.com/channel/0029Vb8vhzCHFxOtG2NiJK2w"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-black text-green-400 hover:underline flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Official Channel
                    </a>
                  </div>
                </div>
              )}

              {/* Bank Transfer specific: Bank details & Mandatory Receipt Upload */}
              {method === 'bank_transfer' && (
                <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-400 text-xs">🏦 Bank Transfer Details</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                      Receipt Required • Admin Approval
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 space-y-1.5 bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <p>• Bank: <strong className="text-white">Commercial Bank of Ceylon</strong></p>
                    <p>• Account Number: <strong className="text-emerald-400 font-mono text-sm">8020510080</strong></p>
                    <p>• Branch: <strong className="text-amber-300">Deiyandara</strong></p>
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 flex items-center justify-between mb-1">
                      <span>Upload Bank Transfer Receipt / Slip: <span className="text-rose-400">*</span></span>
                      <span className="text-[10px] text-amber-400 font-bold">Required before submit</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <label
                        className={`flex-1 flex items-center justify-center gap-2 p-3 bg-slate-900 border border-dashed rounded-xl cursor-pointer transition text-xs ${
                          slipFile
                            ? 'border-emerald-500 text-emerald-300 bg-emerald-500/5'
                            : 'border-rose-500/50 hover:border-emerald-500 text-slate-300'
                        }`}
                      >
                        <Upload className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold">
                          {slipFileName ? slipFileName : 'Select Receipt Image (PNG, JPG) — Mandatory'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          required={method === 'bank_transfer'}
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      {slipFile && (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px] shrink-0">
                          <CheckCircle2 className="w-4 h-4" /> Attached
                        </span>
                      )}
                    </div>

                    {slipFile ? (
                      <div className="mt-2.5 p-2 bg-slate-900 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={slipFile}
                            alt="Uploaded Deposit Receipt"
                            className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-[11px] font-black text-emerald-400 block truncate">
                              ✓ Receipt Ready for Admin Verification
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {slipFileName}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSlipFile(null);
                            setSlipFileName('');
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold cursor-pointer shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-rose-400 font-semibold mt-1">
                        * Please attach a photo or screenshot of your transfer receipt to Account 8020510080 (Deiyandara) before submitting.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={method === 'bank_transfer' && !slipFile}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-slate-950 font-black text-sm tracking-wide transition shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowDownCircle className="w-4 h-4" />
                {method === 'bank_transfer'
                  ? !slipFile
                    ? 'UPLOAD RECEIPT TO SUBMIT DEPOSIT'
                    : 'SUBMIT RECEIPT FOR ADMIN APPROVAL'
                  : isFirstDepositEligible
                  ? `DEPOSIT Rs. ${amount.toLocaleString()} + GET Rs. ${amount.toLocaleString()} FREE BONUS`
                  : `CONFIRM DEPOSIT (Rs. ${amount.toLocaleString()} LKR)`}
              </button>
            </form>
          )}

          {activeTab === 'withdraw' && (
            <form onSubmit={handleWithdraw} className="space-y-4">
              {/* Bonus Withdrawal Restriction Notice */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-400 text-xs flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Withdrawal Eligibility Rule
                  </span>
                  <span className="text-xs font-black text-emerald-400">
                    Max Withdrawable: Rs. {withdrawableBalance.toLocaleString()} LKR
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  1st Deposit Bonus funds (<strong className="text-amber-300">Rs. {bonusBalance.toLocaleString()} LKR</strong>) cannot be withdrawn directly. Only the <strong>betting profits</strong> won using the bonus can be withdrawn!
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-2">
                  Select Payout Method:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'cash_agent', label: 'Cash Agent', icon: '🤝' },
                    { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id as PaymentMethod)}
                      className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                        method === m.id
                          ? 'bg-emerald-500/15 border-emerald-500/60 shadow-md'
                          : 'bg-slate-950 border-slate-800 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{m.icon}</span>
                        <span className="font-black text-white text-xs">{m.label}</span>
                      </div>
                      {method === m.id && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {method === 'bank_transfer' && (
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Select Bank</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Commercial Bank">Commercial Bank of Ceylon (CBC)</option>
                    <option value="Bank of Ceylon (BOC)">Bank of Ceylon (BOC)</option>
                    <option value="Sampath Bank">Sampath Bank PLC</option>
                    <option value="Hatton National Bank (HNB)">Hatton National Bank (HNB)</option>
                    <option value="People's Bank">People&apos;s Bank</option>
                    <option value="Seylan Bank">Seylan Bank PLC</option>
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  {method === 'bank_transfer'
                    ? 'Bank Account Number'
                    : 'Your WhatsApp / Mobile Number (For Cash Agent)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    method === 'bank_transfer'
                      ? 'e.g. 8009234120'
                      : 'e.g. 077 123 4567'
                  }
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  {method === 'cash_agent' ? 'Recipient Name / Agent Note' : 'Account Holder Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. K. M. Kasun Perera"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-300">Withdraw Amount (LKR)</label>
                  <button
                    type="button"
                    onClick={() => setAmount(Math.floor(withdrawableBalance))}
                    className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
                  >
                    Max Withdrawable (Rs. {withdrawableBalance.toFixed(2)})
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-bold">Rs.</span>
                  <input
                    type="number"
                    min="500"
                    max={withdrawableBalance}
                    step="100"
                    value={amount}
                    onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-base font-black text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 text-xs text-slate-400 font-bold">LKR</span>
                </div>
              </div>

              {/* Direct Cash Agent Directory & WhatsApp Button for Payouts */}
              {method === 'cash_agent' && (
                <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-3">
                  {renderSiteCashAgentsDirectory('withdraw')}

                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="font-black text-emerald-400 block text-xs">
                        🤝 Official Cash Agent Payout Hotline: 0723905537
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Connect with an online site Cash Agent above or our official WhatsApp (0723905537).
                      </p>
                    </div>
                    <a
                      href={getWhatsAppAgentUrl('withdraw')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" /> 0723905537
                    </a>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={amount <= 0 || amount > withdrawableBalance}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-sm tracking-wide transition shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowUpCircle className="w-4 h-4" />
                REQUEST WITHDRAWAL (Rs. {amount.toLocaleString()} LKR)
              </button>
            </form>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-white text-sm">Transaction History</h4>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Bank slips require admin verification
                </span>
              </div>
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 bg-slate-900/60">
                      <th className="p-3">Type</th>
                      <th className="p-3">Method &amp; Details</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500">
                          No transactions yet. Make your 1st deposit via Cash Agent or Bank Transfer to claim a 100% Bonus!
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx, index) => (
                        <tr key={`${tx.id}-${index}`} className="hover:bg-slate-900/30">
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 font-black ${
                                tx.type === 'deposit' ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {tx.type === 'deposit' ? (
                                <ArrowDownCircle className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpCircle className="w-3.5 h-3.5" />
                              )}
                              {tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-white block capitalize">
                              {tx.method.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-slate-500">{tx.accountDetails}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-black text-white block">
                              Rs. {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            {tx.bonusAdded && tx.bonusAdded > 0 ? (
                              <span className="text-[10px] font-bold text-amber-400 block">
                                +Rs. {tx.bonusAdded.toLocaleString()} (100% Bonus)
                              </span>
                            ) : null}
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                tx.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : tx.status === 'pending'
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {tx.status}
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
      </div>
    </div>
  );
};
