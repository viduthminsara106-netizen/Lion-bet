import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  GameStatus,
  User,
  Bet,
  BetRecord,
  Passenger,
  RoundInfo,
  RoundBonusWinner,
  ChatMessage,
  ChatReplyTarget,
  AdminSettings,
  LeaderboardEntry,
} from './types/game';
import {
  getUsers,
  saveUser,
  getCurrentUser,
  setCurrentUser,
  hasActiveAuthSession,
  clearCurrentUserSession,
  getAdminSettings,
  saveAdminSettings,
  getRoundHistory,
  addRoundToHistory,
  getBetHistory,
  addBetRecord,
  getLeaderboard,
  BOT_NAMES,
  generateRoundBots,
  INITIAL_CHAT,
  recordUserPresenceHeartbeat,
  clearUserPresenceOnLogout,
  fetchCashAgentsWithPresence,
  getTimeBasedCrashCrowd,
} from './services/storage';
import { soundService } from './services/sound';
import {
  generateRandomHex,
  sha256,
  calculateCrashPoint,
} from './services/provablyFair';
import { playerPatternTracker } from './services/playerPatternTracker';
import { BotProfile, liveChatBotService } from './services/liveChatBotService';

// Components
import { Header } from './components/Header';
import { BalloonCanvas } from './components/BalloonCanvas';
import { BettingPanel, BetDeckState } from './components/BettingPanel';
import { MultiplierHistory } from './components/MultiplierHistory';
import { LiveBetsList, BetsPanelTab } from './components/LiveBetsList';
import { LiveChat } from './components/LiveChat';
import { ProvablyFairModal } from './components/ProvablyFairModal';
import { AuthModal } from './components/AuthModal';
import { ReferralModal } from './components/ReferralModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { GoogleFormsModal } from './components/GoogleFormsModal';
import { DepositWithdrawModal } from './components/DepositWithdrawModal';
import { GamesLobby } from './components/GamesLobby';
import { ProfileModal } from './components/ProfileModal';
import { CashAgentPanelModal } from './components/CashAgentPanelModal';
import { SportsBettingView } from './components/SportsBettingView';
import {
  LionBetSiteLoader,
  BottomTabBar,
  SiteMenuModal,
} from './components/BottomNavAndMenu';
import {
  NotificationCenterModal,
  ToastNotificationStack,
  AppNotification,
  NotificationCategory,
  getInitialNotifications,
  saveNotificationsToStorage,
} from './components/NotificationCenter';

export default function App() {
  // App States
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => hasActiveAuthSession());
  const [currentUser, setCurrentUserState] = useState<User>(getCurrentUser());
  const [activePage, setActivePage] = useState<'lobby' | 'game' | 'sports'>('lobby');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('lionbet_theme_mode_v2');
    return saved === 'dark' || saved === 'light' ? saved : 'dark';
  });
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(getAdminSettings());
  const [history, setHistory] = useState<RoundInfo[]>(getRoundHistory());
  const [betHistory, setBetHistory] = useState<BetRecord[]>(getBetHistory());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('winxcash_shared_chat_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_CHAT;
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(getLeaderboard());
  const [isMuted, setIsMuted] = useState<boolean>(soundService.isMuted());

  useEffect(() => {
    localStorage.setItem('lionbet_theme_mode_v2', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('theme-light');
      root.classList.remove('theme-dark');
    } else {
      root.classList.add('theme-dark');
      root.classList.remove('theme-light');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Real-time presence heartbeat for logged-in user/agent on the site
  useEffect(() => {
    if (!currentUser?.id) return;
    recordUserPresenceHeartbeat(currentUser);
    fetchCashAgentsWithPresence().catch(() => {});

    const interval = setInterval(() => {
      recordUserPresenceHeartbeat(currentUser);
    }, 10000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Game Engine States
  const [status, setStatus] = useState<GameStatus>('WAITING');
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.00);
  const [waitingProgress, setWaitingProgress] = useState<number>(0);
  const [waitingSecondsLeft, setWaitingSecondsLeft] = useState<number>(5.0);

  // Provably Fair Round State
  const [roundNonce, setRoundNonce] = useState<number>(() => {
    const past = getRoundHistory();
    if (past.length > 0) {
      const maxNonce = Math.max(...past.map((r) => r.nonce || 0));
      return maxNonce + 1;
    }
    return 2108;
  });
  const [serverSeed, setServerSeed] = useState<string>(generateRandomHex(32));
  const [serverSeedHash, setServerSeedHash] = useState<string>('');
  const [clientSeed, setClientSeed] = useState<string>('balloon_lkr_client_seed');
  const [crashPoint, setCrashPoint] = useState<number>(2.40);

  // Flight Passengers & Bets
  const [activeBets, setActiveBets] = useState<Bet[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);

  // Last Round Longest-Distance 100% Win Bonus Winner
  const [lastRoundWinner, setLastRoundWinner] = useState<RoundBonusWinner | null>(() => {
    const past = getRoundHistory();
    const withWinner = past.find((r) => r.topBonusWinner);
    return withWinner?.topBonusWinner || {
      userId: 'bot_01',
      username: 'Nisal_SL',
      avatar: '🦁',
      multiplier: 6.45,
      winAmount: 6450,
      bonusAmount: 6450,
      roundNumber: 2106,
    };
  });

  // Live Chat LLM Typing & Private 1-on-1 Chat Target
  const [typingUser, setTypingUser] = useState<{ username: string; avatar: string } | null>(null);
  const [selectedPrivateBot, setSelectedPrivateBot] = useState<BotProfile | null>(null);

  // Dual Betting Decks for User in LKR (with in-flight queuing support & Auto-Bet)
  const [deck1, setDeck1] = useState<BetDeckState>({
    amount: 200, // Rs. 200 LKR
    autoCashoutEnabled: false,
    autoMultiplier: 2.00,
    autoBetEnabled: false,
    hasPlacedBet: false,
    isQueuedForNext: false,
    cashedOut: false,
    cashoutMultiplier: null,
    winAmount: null,
    bonusPortionUsed: 0,
  });

  const [deck2, setDeck2] = useState<BetDeckState>({
    amount: 500, // Rs. 500 LKR
    autoCashoutEnabled: false,
    autoMultiplier: 1.50,
    autoBetEnabled: false,
    hasPlacedBet: false,
    isQueuedForNext: false,
    cashedOut: false,
    cashoutMultiplier: null,
    winAmount: null,
    bonusPortionUsed: 0,
  });

  // Modal Dialogs
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(() => !hasActiveAuthSession());
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('register');
  const [authInitialPromo, setAuthInitialPromo] = useState<string>('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isProvablyFairOpen, setIsProvablyFairOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [agentPanelMode, setAgentPanelMode] = useState<'deposit_panel' | 'withdraw_page' | null>(null);
  const [isGoogleFormsOpen, setIsGoogleFormsOpen] = useState(false);
  const [isCashierOpen, setIsCashierOpen] = useState(false);
  const [cashierInitialTab, setCashierInitialTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [selectedRoundForProof, setSelectedRoundForProof] = useState<RoundInfo | null>(null);
  const [isSiteBooting, setIsSiteBooting] = useState<boolean>(true);
  const [isSiteMenuOpen, setIsSiteMenuOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getInitialNotifications(currentUser.id)
  );
  const [activeToasts, setActiveToasts] = useState<AppNotification[]>([]);

  const handleOpenRegisterWithPromo = useCallback(
    (code: string) => {
      const clean = code.trim().toUpperCase();
      if (currentUser?.id) {
        clearUserPresenceOnLogout(currentUser.id);
      }
      clearCurrentUserSession();
      const unauthUser = getCurrentUser();
      setCurrentUserState(unauthUser);
      setIsAuthenticated(false);
      setIsSiteMenuOpen(false);
      setIsReferralOpen(false);
      setIsProfileOpen(false);
      setAuthInitialPromo(clean);
      setAuthInitialTab('register');
      setIsAuthOpen(true);
      try {
        localStorage.setItem('lionbet_pending_ref_code', clean);
        const nextUrl = `${window.location.pathname}?ref=${encodeURIComponent(clean)}`;
        window.history.replaceState({ lionbetAuthGate: true }, '', nextUrl);
      } catch {}
    },
    [currentUser?.id]
  );

  // Automatically open Register screen with Promocode auto-filled when a referral link (?ref=CODE or ?promo=CODE) is opened
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref') || params.get('promo') || params.get('referral');
      if (refCode && refCode.trim()) {
        const clean = refCode.trim().toUpperCase();
        localStorage.setItem('lionbet_pending_ref_code', clean);
        clearCurrentUserSession();
        const unauthUser = getCurrentUser();
        setCurrentUserState(unauthUser);
        setIsAuthenticated(false);
        setAuthInitialPromo(clean);
        setAuthInitialTab('register');
        setIsAuthOpen(true);
      }
    } catch {}
  }, []);

  // Prevent browser Back button or Escape key from dismissing Register/Login screen or restoring a previous account
  useEffect(() => {
    if (isAuthenticated && !isAuthOpen) return;

    try {
      window.history.pushState({ lionbetAuthGate: true }, '', window.location.href);
    } catch {}

    const handleAuthPopState = () => {
      try {
        window.history.pushState({ lionbetAuthGate: true }, '', window.location.href);
      } catch {}
      setIsAuthenticated(false);
      setIsAuthOpen(true);
    };

    window.addEventListener('popstate', handleAuthPopState);
    return () => {
      window.removeEventListener('popstate', handleAuthPopState);
    };
  }, [isAuthenticated, isAuthOpen]);

  const dismissToast = useCallback((id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushNotification = useCallback(
    (payload: {
      title: string;
      message: string;
      category: NotificationCategory;
      badgeText?: string;
      actionLabel?: string;
      actionTarget?: 'deposit' | 'withdraw' | 'sports' | 'game' | 'bonuses';
      userId?: string;
    }) => {
      const item: AppNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: payload.userId,
        title: payload.title,
        message: payload.message,
        category: payload.category,
        timestamp: Date.now(),
        read: false,
        highlightText: payload.badgeText,
        actionLabel: payload.actionLabel,
        actionTarget: payload.actionTarget,
      };
      setNotifications((prev) => {
        const next = [item, ...prev].slice(0, 60);
        saveNotificationsToStorage(next);
        return next;
      });
      setActiveToasts((prev) => [item, ...prev].slice(0, 3));
      setTimeout(() => {
        setActiveToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 5500);
    },
    []
  );

  const unreadNotificationsCount = useMemo(
    () =>
      notifications.filter(
        (n) => (!n.userId || n.userId === 'ALL' || n.userId === currentUser.id) && !n.read
      ).length,
    [notifications, currentUser.id]
  );

  // Lucky Hour (15-Minute High Multiplier Boost) State
  const LUCKY_HOUR_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  const [luckyHourEndsAt, setLuckyHourEndsAt] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('lionbet_lucky_hour_ends_at_v1');
      if (saved) {
        const ts = parseInt(saved, 10);
        if (!isNaN(ts) && ts > Date.now()) return ts;
      }
    } catch {}
    return null;
  });
  const [luckyHourRemainingMs, setLuckyHourRemainingMs] = useState<number>(() =>
    luckyHourEndsAt ? Math.max(0, luckyHourEndsAt - Date.now()) : 0
  );
  const luckyHourEndsAtRef = useRef<number | null>(luckyHourEndsAt);

  const activateLuckyHour = useCallback(() => {
    const endsAt = Date.now() + LUCKY_HOUR_DURATION_MS;
    luckyHourEndsAtRef.current = endsAt;
    setLuckyHourEndsAt(endsAt);
    setLuckyHourRemainingMs(LUCKY_HOUR_DURATION_MS);
    try {
      localStorage.setItem('lionbet_lucky_hour_ends_at_v1', String(endsAt));
    } catch {}
    setChatMessages((prev) => [
      ...prev,
      {
        id: `sys_lucky_${Date.now()}`,
        userId: 'sys',
        username: 'Lion Bet Arena',
        avatar: '🍀',
        text: '🍀 LUCKY HOUR ACTIVATED FOR 15 MINUTES! Higher crash multipliers are now boosted!',
        timestamp: Date.now(),
      },
    ]);
    pushNotification({
      title: '🍀 Lucky Hour Activated (15 Mins)!',
      message:
        'High crash multipliers are boosted for the next 15 minutes across all Crash Arena flights!',
      category: 'system',
      badgeText: '15M BOOST',
      actionLabel: 'Play Crash Arena',
      actionTarget: 'game',
    });
  }, [LUCKY_HOUR_DURATION_MS, pushNotification]);

  // 1-second countdown ticker + random session activation for Lucky Hour
  useEffect(() => {
    const tick = setInterval(() => {
      const end = luckyHourEndsAtRef.current;
      if (end && end > Date.now()) {
        setLuckyHourRemainingMs(end - Date.now());
      } else if (end && end <= Date.now()) {
        luckyHourEndsAtRef.current = null;
        setLuckyHourEndsAt(null);
        setLuckyHourRemainingMs(0);
        try {
          localStorage.removeItem('lionbet_lucky_hour_ends_at_v1');
        } catch {}
      }
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Randomly activate Lucky Hour during the game session if not already active
  useEffect(() => {
    if (luckyHourEndsAt && luckyHourEndsAt > Date.now()) return;
    // Randomly trigger between 10 and 35 seconds into the session so players experience it naturally
    const randomDelayMs = 10000 + Math.floor(Math.random() * 25000);
    const timer = setTimeout(() => {
      if (!luckyHourEndsAtRef.current || luckyHourEndsAtRef.current <= Date.now()) {
        activateLuckyHour();
      }
    }, randomDelayMs);
    return () => clearTimeout(timer);
  }, [luckyHourEndsAt, activateLuckyHour]);

  const isLuckyHourActive = luckyHourRemainingMs > 0;

  // In-Game Full Screen & Double-Back to Exit Full Screen State
  const [isGameFullscreen, setIsGameFullscreen] = useState(false);
  const [backPressHint, setBackPressHint] = useState<string | null>(null);
  const lastBackPressRef = useRef<number>(0);

  const handleExitGameFullscreen = useCallback(async () => {
    setIsGameFullscreen(false);
    setBackPressHint(null);
    try {
      const doc = document as any;
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      }
    } catch {}
  }, []);

  const handleToggleGameFullscreen = useCallback(async () => {
    if (!isGameFullscreen) {
      setIsGameFullscreen(true);
      setShowMultiplayerSidebar(true);
      setBackPressHint('Full Screen Active • Double-Back or Click Exit Full Screen to leave');
      setTimeout(() => setBackPressHint(null), 3200);
      try {
        window.history.pushState({ winxFs: 1 }, '');
        window.history.pushState({ winxFs: 2 }, '');
      } catch {}
      try {
        const docEl = document.documentElement as any;
        if (!document.fullscreenElement && !docEl.webkitFullscreenElement) {
          if (docEl.requestFullscreen) {
            await docEl.requestFullscreen();
          } else if (docEl.webkitRequestFullscreen) {
            await docEl.webkitRequestFullscreen();
          }
        }
      } catch {}
    } else {
      handleExitGameFullscreen();
    }
  }, [isGameFullscreen, handleExitGameFullscreen]);

  // Listen to native fullscreenchange & Double-Back (popstate / Escape) when playing in Full Screen
  useEffect(() => {
    const onFsChange = () => {
      const doc = document as any;
      const nativeFs = Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
      if (nativeFs) {
        setIsGameFullscreen(true);
      }
    };

    const onPopState = () => {
      if (!isGameFullscreen) return;
      const now = Date.now();
      if (now - lastBackPressRef.current < 2500) {
        handleExitGameFullscreen();
      } else {
        lastBackPressRef.current = now;
        setBackPressHint('Press Back again to Exit Full Screen (Double Back)');
        try {
          window.history.pushState({ winxFs: 2 }, '');
        } catch {}
        setTimeout(() => setBackPressHint(null), 2500);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isGameFullscreen) return;
      if (e.key === 'Escape') {
        handleExitGameFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isGameFullscreen, handleExitGameFullscreen]);

  // Mobile Bottom Tabs: 'bets' | 'live' | 'chat'
  const [mobileTab, setMobileTab] = useState<'bets' | 'live' | 'chat'>('bets');

  // Desktop Compact Multiplayer Sidebar ('bets' | 'chat') & Sub-Tab ('all' | 'my' | 'history')
  const [desktopSidebarTab, setDesktopSidebarTab] = useState<'bets' | 'chat'>('bets');
  const [betsSubTab, setBetsSubTab] = useState<BetsPanelTab>('all');
  const [showMultiplayerSidebar, setShowMultiplayerSidebar] = useState<boolean>(true);

  // Timers & Animation refs
  const flightStartTimeRef = useRef<number>(0);
  const botCashoutTargetsRef = useRef<Map<string, number>>(new Map());
  const pendingBoardingQueueRef = useRef<{ bet: Bet; passenger: Passenger }[]>([]);
  const boardingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fresh State Refs to prevent stale closure bugs in round lifecycle & timeouts
  const currentUserRef = useRef<User>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const activeBetsRef = useRef<Bet[]>(activeBets);
  useEffect(() => {
    activeBetsRef.current = activeBets;
  }, [activeBets]);

  const chatMessagesRef = useRef<ChatMessage[]>(chatMessages);
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  // Real-time Multi-User Chat Synchronization (Server SSE + REST + BroadcastChannel + Storage Event)
  const chatChannelRef = useRef<BroadcastChannel | null>(null);

  const mergeIncomingChatMessages = useCallback((incoming: ChatMessage | ChatMessage[]) => {
    const list = Array.isArray(incoming) ? incoming : [incoming];
    setChatMessages((prev) => {
      const map = new Map<string, ChatMessage>();
      prev.forEach((m) => map.set(m.id, m));
      let changed = false;
      list.forEach((m) => {
        if (m && m.id && !map.has(m.id)) {
          map.set(m.id, m);
          changed = true;
        }
      });
      if (!changed) return prev;
      const merged = Array.from(map.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-90);
      chatMessagesRef.current = merged;
      try {
        localStorage.setItem('winxcash_shared_chat_v2', JSON.stringify(merged));
      } catch {}
      return merged;
    });
  }, []);

  const publishChatMessage = useCallback(
    (msg: ChatMessage) => {
      mergeIncomingChatMessages(msg);
      try {
        chatChannelRef.current?.postMessage({ type: 'chat:message', message: msg });
      } catch {}
      fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      }).catch(() => {});
    },
    [mergeIncomingChatMessages]
  );

  useEffect(() => {
    // 1. Initial fetch from server shared chat store
    fetch('/api/chat/messages')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.messages && Array.isArray(data.messages)) {
          mergeIncomingChatMessages(data.messages);
        }
      })
      .catch(() => {});

    // 2. Real-time Server-Sent Events (SSE) stream so all real users see messages immediately
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/chat/stream');
      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed?.type === 'chat:init' && Array.isArray(parsed.messages)) {
            mergeIncomingChatMessages(parsed.messages);
          } else if (parsed?.type === 'chat:message' && parsed.message) {
            mergeIncomingChatMessages(parsed.message);
          }
        } catch {}
      };
    } catch {}

    // 3. Cross-tab BroadcastChannel & localStorage listener
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('winxcash_live_chat_sync');
      chatChannelRef.current = bc;
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'chat:message' && ev.data.message) {
          mergeIncomingChatMessages(ev.data.message);
        }
      };
    } catch {}

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'winxcash_shared_chat_v2' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            mergeIncomingChatMessages(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      es?.close();
      bc?.close();
      chatChannelRef.current = null;
      window.removeEventListener('storage', onStorage);
    };
  }, [mergeIncomingChatMessages]);

  const lastRoundWinnerRef = useRef<RoundBonusWinner | null>(lastRoundWinner);
  useEffect(() => {
    lastRoundWinnerRef.current = lastRoundWinner;
  }, [lastRoundWinner]);

  const deck1Ref = useRef<BetDeckState>(deck1);
  useEffect(() => {
    deck1Ref.current = deck1;
  }, [deck1]);

  const deck2Ref = useRef<BetDeckState>(deck2);
  useEffect(() => {
    deck2Ref.current = deck2;
  }, [deck2]);

  const statusRef = useRef<GameStatus>(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const currentMultiplierRef = useRef<number>(currentMultiplier);
  useEffect(() => {
    currentMultiplierRef.current = currentMultiplier;
  }, [currentMultiplier]);

  // Compute Initial Server Hash on Mount
  useEffect(() => {
    sha256(serverSeed).then(setServerSeedHash);
  }, [serverSeed]);

  // ==========================================
  // ROUND LIFECYCLE MANAGEMENT
  // ==========================================

  // Setup Next Flight
  const prepareNextRound = useCallback(async () => {
    if (adminSettings.isGamePaused) return;

    const nextNonce = roundNonce + 1;
    setRoundNonce(nextNonce);

    // Provably fair seed generation
    const newServerSeed = generateRandomHex(32);
    setServerSeed(newServerSeed);
    const newHash = await sha256(newServerSeed);
    setServerSeedHash(newHash);

    // Calculate crash multiplier with configurable loss rate, 1.00x instant crash, & Next 30 Multipliers queue
    const latestSettings = getAdminSettings();
    const balloonCfg = latestSettings.crashGamesConfig?.balloon_crash;
    const activeOverride =
      balloonCfg?.nextCrashOverride !== undefined && balloonCfg?.nextCrashOverride !== null
        ? balloonCfg.nextCrashOverride
        : latestSettings.nextCrashOverride;
    const activeQueue = Array.isArray(balloonCfg?.queuedMultipliers)
      ? balloonCfg.queuedMultipliers
      : Array.isArray(latestSettings.queuedMultipliers)
      ? latestSettings.queuedMultipliers
      : [];

    let nextCrash: number;
    let wasForcedByAdmin = false;

    if (activeOverride !== null && activeOverride >= 1.0) {
      nextCrash = activeOverride;
      wasForcedByAdmin = true;
      const updatedBalloonCfg = balloonCfg
        ? { ...balloonCfg, nextCrashOverride: null }
        : undefined;
      const updatedSettings: AdminSettings = {
        ...latestSettings,
        nextCrashOverride: null,
        crashGamesConfig:
          updatedBalloonCfg && latestSettings.crashGamesConfig
            ? { ...latestSettings.crashGamesConfig, balloon_crash: updatedBalloonCfg }
            : latestSettings.crashGamesConfig,
      };
      setAdminSettings(updatedSettings);
      saveAdminSettings(updatedSettings);
    } else if (activeQueue.length > 0 && activeQueue[0] >= 1.0) {
      nextCrash = activeQueue[0];
      wasForcedByAdmin = true;
      const remainingQueue = activeQueue.slice(1);
      const updatedBalloonCfg = balloonCfg
        ? { ...balloonCfg, queuedMultipliers: remainingQueue }
        : undefined;
      const updatedSettings: AdminSettings = {
        ...latestSettings,
        queuedMultipliers: remainingQueue,
        crashGamesConfig:
          updatedBalloonCfg && latestSettings.crashGamesConfig
            ? { ...latestSettings.crashGamesConfig, balloon_crash: updatedBalloonCfg }
            : latestSettings.crashGamesConfig,
      };
      setAdminSettings(updatedSettings);
      saveAdminSettings(updatedSettings);
    } else {
      const isLuckyNow = Boolean(
        luckyHourEndsAtRef.current && luckyHourEndsAtRef.current > Date.now()
      );
      const calc = await calculateCrashPoint(
        newServerSeed,
        clientSeed,
        nextNonce,
        balloonCfg?.houseEdge ?? latestSettings.houseEdge ?? 0.22,
        balloonCfg?.earlyCrashProbability ?? latestSettings.earlyCrashProbability ?? 0.45,
        balloonCfg?.instant100Probability ?? latestSettings.instant100Probability ?? 0.15,
        isLuckyNow
      );
      nextCrash = calc.crashPoint;
    }
    setCrashPoint(nextCrash);

    // Promote queued bets or trigger real Auto-Bet with explicit balance deduction
    const d1 = deck1Ref.current;
    const d2 = deck2Ref.current;
    let curUser = currentUserRef.current;

    let deck1Active = false;
    let d1Deduct = 0;
    let d1BonusUsed = 0;
    if (d1.isQueuedForNext) {
      // Funds were already deducted when placed during in-flight phase
      deck1Active = true;
      d1BonusUsed = d1.bonusPortionUsed || 0;
    } else if (d1.autoBetEnabled) {
      // Auto Bet is explicitly active: deduct wager from balance every round!
      if (curUser.balance >= d1.amount && d1.amount > 0) {
        deck1Active = true;
        d1Deduct = d1.amount;
        d1BonusUsed = Math.min(d1.amount, curUser.bonusBalance || 0);
      } else {
        setDeck1((prev) => ({ ...prev, autoBetEnabled: false }));
        setChatMessages((prev) => [
          ...prev,
          {
            id: `sys_stop1_${Date.now()}`,
            userId: 'sys',
            username: 'System',
            avatar: '⚠️',
            text: `⚠️ Deck #1 Auto Bet stopped: Insufficient balance.`,
            timestamp: Date.now(),
          },
        ]);
      }
    }

    let deck2Active = false;
    let d2Deduct = 0;
    let d2BonusUsed = 0;
    if (d2.isQueuedForNext) {
      deck2Active = true;
      d2BonusUsed = d2.bonusPortionUsed || 0;
    } else if (d2.autoBetEnabled) {
      if ((curUser.balance - d1Deduct) >= d2.amount && d2.amount > 0) {
        deck2Active = true;
        d2Deduct = d2.amount;
        const remainingBonus = Math.max(0, (curUser.bonusBalance || 0) - (d1.isQueuedForNext ? 0 : d1BonusUsed));
        d2BonusUsed = Math.min(d2.amount, remainingBonus);
      } else {
        setDeck2((prev) => ({ ...prev, autoBetEnabled: false }));
        setChatMessages((prev) => [
          ...prev,
          {
            id: `sys_stop2_${Date.now()}`,
            userId: 'sys',
            username: 'System',
            avatar: '⚠️',
            text: `⚠️ Deck #2 Auto Bet stopped: Insufficient balance.`,
            timestamp: Date.now(),
          },
        ]);
      }
    }

    // Deduct auto-bet funds from user's balance immediately!
    const totalAutoDeduct = d1Deduct + d2Deduct;
    const totalAutoBonusDeduct =
      (d1.isQueuedForNext ? 0 : d1BonusUsed) + (d2.isQueuedForNext ? 0 : d2BonusUsed);
    if (totalAutoDeduct > 0) {
      curUser = {
        ...curUser,
        balance: Number((curUser.balance - totalAutoDeduct).toFixed(2)),
        bonusBalance: Math.max(
          0,
          Number(((curUser.bonusBalance || 0) - totalAutoBonusDeduct).toFixed(2))
        ),
        totalWagered: Number((curUser.totalWagered + totalAutoDeduct).toFixed(2)),
      };
      currentUserRef.current = curUser;
      setCurrentUserState(curUser);
      saveUser(curUser);
    }

    // Adaptive Player Pattern Tracker & Big Bet Detection
    const userActiveTotal = (deck1Active ? d1.amount : 0) + (deck2Active ? d2.amount : 0);
    if (userActiveTotal > 0) {
      playerPatternTracker.recordBetPlaced(userActiveTotal);
    }

    const isLuckyRound = Boolean(
      luckyHourEndsAtRef.current && luckyHourEndsAtRef.current > Date.now()
    );
    if (!wasForcedByAdmin && !isLuckyRound) {
      const patternResult = playerPatternTracker.evaluateRoundCrash(
        userActiveTotal,
        curUser.balance,
        nextCrash
      );
      nextCrash = patternResult.crashPoint;
    }
    setCrashPoint(nextCrash);

    setDeck1((prev) => ({
      ...prev,
      hasPlacedBet: deck1Active,
      isQueuedForNext: false,
      cashedOut: false,
      cashoutMultiplier: null,
      winAmount: null,
      bonusPortionUsed: deck1Active ? d1BonusUsed : 0,
    }));
    setDeck2((prev) => ({
      ...prev,
      hasPlacedBet: deck2Active,
      isQueuedForNext: false,
      cashedOut: false,
      cashoutMultiplier: null,
      winAmount: null,
      bonusPortionUsed: deck2Active ? d2BonusUsed : 0,
    }));

    // Generate dynamic bots with LKR bets & time-of-day realistic player counts
    // Morning vs Afternoon vs Evening Peak vs Late Night vary organically
    const botCount = getTimeBasedCrashCrowd().roundBotCount;
    const newBets: Bet[] = [];
    const newPassengers: Passenger[] = [];
    botCashoutTargetsRef.current.clear();

    // Pick a random round jump profile so every round feels unique
    const roundEarlyOffset = Math.random() < 0.35
      ? 0.25 + Math.random() * 0.55 // Some rounds no one jumps very early
      : Math.random() * 0.18;       // Other rounds jumpers start at unpredictable early points
    const usedMultipliers: number[] = [];

    const generateRandomJumpMultiplier = (): number => {
      const roll = Math.random();
      let raw: number;
      if (roll < 0.24) {
        // Cautious random jumper
        raw = 1.07 + roundEarlyOffset + Math.random() * 0.75;
      } else if (roll < 0.58) {
        // Mid-range random jumper
        raw = 1.45 + roundEarlyOffset + Math.random() * 1.95;
      } else if (roll < 0.82) {
        // Bold random jumper
        raw = 2.60 + Math.random() * 4.80;
      } else if (roll < 0.94) {
        // High-altitude jumper
        raw = 5.50 + Math.random() * 14.50;
      } else {
        // Daredevil / deep-space jumper
        raw = 16.00 + Math.random() * 65.00;
      }

      // Ensure no two bots in the same round share the same or nearly identical multiplier
      for (const existing of usedMultipliers) {
        if (Math.abs(raw - existing) < 0.06) {
          raw += 0.08 + Math.random() * 0.24;
        }
      }
      const finalMult = Math.max(1.06, Number(raw.toFixed(2)));
      usedMultipliers.push(finalMult);
      return finalMult;
    };

    const variedBetAmounts = [
      50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1250, 1500, 2000, 2500, 3500, 5000, 7500, 10000, 15000,
    ];
    const shuffledBots = generateRoundBots(botCount);
    const botQueue: { bet: Bet; passenger: Passenger }[] = [];

    shuffledBots.forEach((b, idx) => {
      const botAmount = variedBetAmounts[Math.floor(Math.random() * variedBetAmounts.length)];
      const targetMult = generateRandomJumpMultiplier();

      const passengerId = `pass_bot_${idx}`;
      botCashoutTargetsRef.current.set(passengerId, targetMult);

      botQueue.push({
        bet: {
          id: `bet_bot_${idx}_${Date.now()}`,
          userId: `bot_${b.name.toLowerCase()}`,
          username: b.name,
          avatar: b.avatar,
          amount: botAmount,
          cashedOut: false,
          isBot: true,
          passengerId,
          passengerColor: b.color,
        },
        passenger: {
          id: passengerId,
          name: b.name,
          avatar: b.avatar,
          color: b.color,
          isPlayer: false,
          hasJumped: false,
          hasCrashed: false,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          rotation: 0,
          swayOffset: Math.random() * 10,
          parachuteOpenProgress: 0,
          arcTime: 0,
          trail: [],
          opacity: 1,
        },
      });
    });

    // Clear any existing gradual boarding timer
    if (boardingIntervalRef.current) {
      clearInterval(boardingIntervalRef.current);
      boardingIntervalRef.current = null;
    }

    // Start with only 1-2 initial bots in the basket, and board the rest gradually during the 5s countdown!
    // ("round එකක් ඉවර වෙලාnext round එක පටන් ගන්න counting එකේදී basket එකට ගොඩවෙන users ල ගනන ටිකින් ටික තමයි වැඩි වෙන්නඕන( ,lively)")
    const initialBotSlice = botQueue.slice(0, 2);
    pendingBoardingQueueRef.current = botQueue.slice(2);

    initialBotSlice.forEach((item) => {
      newBets.push(item.bet);
      newPassengers.push(item.passenger);
    });

    // Add User passenger if active
    if (deck1Active) {
      newPassengers.push({
        id: 'pass_user_1',
        name: curUser.username,
        avatar: curUser.avatar,
        color: '#3B82F6',
        isPlayer: true,
        hasJumped: false,
        hasCrashed: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rotation: 0,
        swayOffset: 0,
        parachuteOpenProgress: 0,
        arcTime: 0,
        trail: [],
        opacity: 1,
      });
      newBets.unshift({
        id: `bet_user_1_${Date.now()}`,
        userId: curUser.id,
        username: curUser.username,
        avatar: curUser.avatar,
        amount: d1.amount,
        autoCashoutAt: d1.autoCashoutEnabled ? d1.autoMultiplier : undefined,
        cashedOut: false,
        isBot: false,
        passengerId: 'pass_user_1',
        passengerColor: '#3B82F6',
      });
    }

    if (deck2Active) {
      newPassengers.push({
        id: 'pass_user_2',
        name: `${curUser.username} #2`,
        avatar: curUser.avatar,
        color: '#8B5CF6',
        isPlayer: true,
        hasJumped: false,
        hasCrashed: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rotation: 0,
        swayOffset: 1,
        parachuteOpenProgress: 0,
        arcTime: 0,
        trail: [],
        opacity: 1,
      });
      newBets.unshift({
        id: `bet_user_2_${Date.now()}`,
        userId: curUser.id,
        username: `${curUser.username} #2`,
        avatar: curUser.avatar,
        amount: d2.amount,
        autoCashoutAt: d2.autoCashoutEnabled ? d2.autoMultiplier : undefined,
        cashedOut: false,
        isBot: false,
        passengerId: 'pass_user_2',
        passengerColor: '#8B5CF6',
      });
    }

    activeBetsRef.current = newBets;
    setActiveBets(newBets);
    setPassengers(newPassengers);
    setCurrentMultiplier(1.00);
    setStatus('WAITING');
    setWaitingSecondsLeft(5.0);
    setWaitingProgress(0);

    // Lively gradual boarding interval during the 5-second WAITING countdown
    boardingIntervalRef.current = setInterval(() => {
      if (pendingBoardingQueueRef.current.length === 0) {
        if (boardingIntervalRef.current) {
          clearInterval(boardingIntervalRef.current);
          boardingIntervalRef.current = null;
        }
        return;
      }

      // Board 1 or 2 passengers at a time so the basket & active bets grow smoothly
      const stepCount = Math.random() < 0.55 ? 1 : 2;
      const boardingBatch = pendingBoardingQueueRef.current.splice(0, stepCount);
      if (boardingBatch.length === 0) return;

      const addedBets = boardingBatch.map((item) => item.bet);
      const addedPassengers = boardingBatch.map((item) => item.passenger);

      const updatedBets = [...activeBetsRef.current, ...addedBets];
      activeBetsRef.current = updatedBets;
      setActiveBets(updatedBets);
      setPassengers((prev) => [...prev, ...addedPassengers]);
    }, 210);
  }, [adminSettings, roundNonce, clientSeed]);

  // Track activePage in a ref & stop all sounds/timers whenever not inside the game
  const activePageRef = useRef<'lobby' | 'game' | 'sports'>(activePage);
  const crashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activePageRef.current = activePage;
    if (activePage !== 'game') {
      soundService.stopBurner();
      if (crashTimeoutRef.current) {
        clearTimeout(crashTimeoutRef.current);
        crashTimeoutRef.current = null;
      }
      if (boardingIntervalRef.current) {
        clearInterval(boardingIntervalRef.current);
        boardingIntervalRef.current = null;
      }
    } else {
      // Entering the game from lobby: start a fresh WAITING round!
      prepareNextRound();
    }
  }, [activePage]);

  // Launch Flight (Includes direct 1.00x instant burst: "1.00x වලින්ම පුපුරා යෑම් add කරන්න")
  const crashPointRef = useRef<number>(crashPoint);
  useEffect(() => {
    crashPointRef.current = crashPoint;
  }, [crashPoint]);

  const startFlight = useCallback(() => {
    if (activePageRef.current !== 'game') return;

    // Flush any remaining passengers in the boarding queue at liftoff
    if (boardingIntervalRef.current) {
      clearInterval(boardingIntervalRef.current);
      boardingIntervalRef.current = null;
    }
    if (pendingBoardingQueueRef.current.length > 0) {
      const remainingBatch = pendingBoardingQueueRef.current.splice(0);
      const addedBets = remainingBatch.map((item) => item.bet);
      const addedPassengers = remainingBatch.map((item) => item.passenger);
      const updatedBets = [...activeBetsRef.current, ...addedBets];
      activeBetsRef.current = updatedBets;
      setActiveBets(updatedBets);
      setPassengers((prev) => [...prev, ...addedPassengers]);
    }

    if (crashPointRef.current <= 1.00) {
      handleCrash(1.00);
      return;
    }
    setStatus('FLYING');
    flightStartTimeRef.current = performance.now();
    soundService.startBurner();
  }, []);

  // Countdown timer in WAITING state (Runs ONLY when activePage === 'game')
  useEffect(() => {
    if (activePage !== 'game' || status !== 'WAITING') return;

    const startWait = performance.now();
    const waitDuration = 5000; // 5.0 seconds

    const interval = setInterval(() => {
      if (activePageRef.current !== 'game') {
        clearInterval(interval);
        return;
      }
      const elapsed = performance.now() - startWait;
      const remaining = Math.max(0, (waitDuration - elapsed) / 1000);
      setWaitingSecondsLeft(remaining);
      setWaitingProgress(Math.min(1, elapsed / waitDuration));

      if (Math.abs(remaining - 3.0) < 0.05) soundService.playBeep(false);
      if (Math.abs(remaining - 2.0) < 0.05) soundService.playBeep(false);
      if (Math.abs(remaining - 1.0) < 0.05) soundService.playBeep(false);

      if (remaining <= 0.02) {
        soundService.playBeep(true);
        clearInterval(interval);
        startFlight();
      }
    }, 80);

    return () => clearInterval(interval);
  }, [activePage, status, roundNonce, startFlight]);

  // Main Flight Tick (Runs ONLY when activePage === 'game')
  useEffect(() => {
    if (activePage !== 'game' || status !== 'FLYING') return;

    let animId: number;

    const updateFlight = (timestamp: number) => {
      const elapsedSeconds = (timestamp - flightStartTimeRef.current) / 1000;
      const nextMultiplier = Math.max(1.00, Number((1.00 * Math.pow(Math.E, 0.068 * elapsedSeconds)).toFixed(2)));
      const targetCrash = crashPointRef.current;

      if (nextMultiplier >= targetCrash) {
        handleCrash(targetCrash);
        return;
      }

      if (nextMultiplier !== currentMultiplierRef.current) {
        currentMultiplierRef.current = nextMultiplier;
        setCurrentMultiplier(nextMultiplier);
      }

      // Auto-Cashouts
      const d1 = deck1Ref.current;
      const d2 = deck2Ref.current;
      if (d1.hasPlacedBet && !d1.cashedOut && d1.autoCashoutEnabled && nextMultiplier >= d1.autoMultiplier) {
        handleCashout(1, nextMultiplier);
      }
      if (d2.hasPlacedBet && !d2.cashedOut && d2.autoCashoutEnabled && nextMultiplier >= d2.autoMultiplier) {
        handleCashout(2, nextMultiplier);
      }

      // Bot Cashouts & Parachutes
      botCashoutTargetsRef.current.forEach((target, passId) => {
        if (nextMultiplier >= target) {
          triggerPassengerJump(passId, nextMultiplier);
          botCashoutTargetsRef.current.delete(passId);
        }
      });

      animId = requestAnimationFrame(updateFlight);
    };

    animId = requestAnimationFrame(updateFlight);
    return () => cancelAnimationFrame(animId);
  }, [activePage, status]);

  // Parachute Jump Trigger
  const triggerPassengerJump = (passengerId: string, mult: number) => {
    if (activePageRef.current === 'game') {
      soundService.playCashout(mult >= 3.0);
    }

    setPassengers((prev) =>
      prev.map((p) => {
        if (p.id === passengerId && !p.hasJumped) {
          const dir = Math.random() > 0.5 ? 1 : -1;
          const canvasWidth = window.innerWidth > 1024 ? 600 : window.innerWidth * 0.45;
          return {
            ...p,
            hasJumped: true,
            jumpMultiplier: mult,
            x: canvasWidth + dir * (45 + Math.random() * 30),
            y: 230,
            vx: dir * (1.8 + Math.random() * 1.5),
            vy: 1.5 + Math.random() * 0.8,
            rotation: 0,
            swayOffset: 0,
            parachuteOpenProgress: 0.1,
            arcTime: 0,
            trail: [],
            opacity: 1,
          };
        }
        return p;
      })
    );

    setActiveBets((prev) => {
      const updated = prev.map((b) => {
        if (b.passengerId === passengerId && !b.cashedOut) {
          const profit = Number((b.amount * mult).toFixed(0));
          return {
            ...b,
            cashedOut: true,
            cashoutMultiplier: mult,
            profit,
          };
        }
        return b;
      });
      activeBetsRef.current = updated;
      return updated;
    });
  };

  // Cashout Handler
  const handleCashout = (deckIndex: 1 | 2, multOverride?: number) => {
    const mult = multOverride || currentMultiplier;
    const targetDeck = deckIndex === 1 ? deck1 : deck2;
    if (!targetDeck.hasPlacedBet || targetDeck.cashedOut) return;

    const winAmount = Number((targetDeck.amount * mult).toFixed(0));
    const returnedBonusPrincipal = targetDeck.bonusPortionUsed || 0;
    const passId = deckIndex === 1 ? 'pass_user_1' : 'pass_user_2';

    triggerPassengerJump(passId, mult);

    soundService.playCashout(true);
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#22C55E', '#F59E0B', '#38BDF8', '#A855F7', '#EF4444'],
    });

    if (deckIndex === 1) {
      setDeck1((prev) => ({
        ...prev,
        cashedOut: true,
        cashoutMultiplier: mult,
        winAmount,
      }));
    } else {
      setDeck2((prev) => ({
        ...prev,
        cashedOut: true,
        cashoutMultiplier: mult,
        winAmount,
      }));
    }

    // Record win in pattern tracker
    playerPatternTracker.recordRoundOutcome(true, mult);

    // Return any bonusPortionUsed back to bonusBalance so the bonus itself stays locked,
    // while the net profit (winAmount - returnedBonusPrincipal) is 100% withdrawable!
    const curUser = currentUserRef.current;
    const updatedUser: User = {
      ...curUser,
      balance: Number((curUser.balance + winAmount).toFixed(2)),
      bonusBalance: Number(((curUser.bonusBalance || 0) + returnedBonusPrincipal).toFixed(2)),
      totalWon: Number((curUser.totalWon + winAmount).toFixed(2)),
    };
    currentUserRef.current = updatedUser;
    setCurrentUserState(updatedUser);
    saveUser(updatedUser);

    // Record won bet in persistent betting history for Admin & Cash Agent inspection
    addBetRecord({
      id: `bet_rec_${deckIndex}_${Date.now()}`,
      userId: curUser.id,
      username: curUser.username,
      avatar: curUser.avatar,
      roundNumber: roundNonce,
      amount: targetDeck.amount,
      cashoutMultiplier: mult,
      crashPoint,
      winAmount,
      profit: Number((winAmount - targetDeck.amount).toFixed(2)),
      status: 'won',
      timestamp: Date.now(),
    });
    setBetHistory(getBetHistory());

    if (mult >= 2.0) {
      const winMessage: ChatMessage = {
        id: `win_${Date.now()}`,
        userId: updatedUser.id,
        username: updatedUser.username,
        avatar: updatedUser.avatar,
        text: `🎉 ${updatedUser.username} successfully cashed out Rs. ${winAmount.toLocaleString()} LKR @ ${mult.toFixed(2)}x!`,
        timestamp: Date.now(),
        isSystemWin: true,
        highlightMultiplier: mult,
      };
      setChatMessages((prev) => [...prev, winMessage]);
    }

    pushNotification({
      title: `Cashed Out @ ${mult.toFixed(2)}x!`,
      message: `Deck #${deckIndex} won Rs. ${winAmount.toLocaleString()} LKR (Profit: +Rs. ${(winAmount - targetDeck.amount).toLocaleString()}).`,
      category: 'win',
      badgeText: `+Rs. ${winAmount.toLocaleString()}`,
    });
  };

  // Crash / Burst Event (Awards 100% Extra Win Bonus to the player who went the furthest!)
  const handleCrash = (finalCrash: number) => {
    soundService.stopBurner();
    if (activePageRef.current === 'game') {
      soundService.playPop();
    }
    setStatus('BURST');
    setCurrentMultiplier(finalCrash);

    // If real player had an uncashed bet in flight, record loss in pattern tracker and persistent BetRecord history
    const userLost =
      (deck1Ref.current.hasPlacedBet && !deck1Ref.current.cashedOut) ||
      (deck2Ref.current.hasPlacedBet && !deck2Ref.current.cashedOut);
    if (userLost) {
      playerPatternTracker.recordRoundOutcome(false);
      const curUser = currentUserRef.current;
      if (deck1Ref.current.hasPlacedBet && !deck1Ref.current.cashedOut) {
        addBetRecord({
          id: `bet_loss_1_${Date.now()}`,
          userId: curUser.id,
          username: curUser.username,
          avatar: curUser.avatar,
          roundNumber: roundNonce,
          amount: deck1Ref.current.amount,
          cashoutMultiplier: null,
          crashPoint: finalCrash,
          winAmount: 0,
          profit: -deck1Ref.current.amount,
          status: 'lost',
          timestamp: Date.now(),
        });
      }
      if (deck2Ref.current.hasPlacedBet && !deck2Ref.current.cashedOut) {
        addBetRecord({
          id: `bet_loss_2_${Date.now()}`,
          userId: curUser.id,
          username: curUser.username,
          avatar: curUser.avatar,
          roundNumber: roundNonce,
          amount: deck2Ref.current.amount,
          cashoutMultiplier: null,
          crashPoint: finalCrash,
          winAmount: 0,
          profit: -deck2Ref.current.amount,
          status: 'lost',
          timestamp: Date.now(),
        });
      }
      setBetHistory(getBetHistory());
    }

    const currentBetsList = activeBetsRef.current;
    const cashedOutBets = currentBetsList.filter(
      (b) => b.cashedOut && (b.cashoutMultiplier || 0) > 1.0
    );

    // "Round එකකක්දි වැඩිම දුරක් යන කෙනාට win කරන ගානෙන් 100%ක් එනව balance එකට
    //  last round එකේ e win bonus එක ගත්තෙ කවුද කියල වැටෙනවා"
    let roundBonusWinner: RoundBonusWinner | undefined;
    if (cashedOutBets.length > 0) {
      const furthestBet = [...cashedOutBets].sort(
        (a, b) =>
          (b.cashoutMultiplier || 0) - (a.cashoutMultiplier || 0) ||
          (b.profit || 0) - (a.profit || 0)
      )[0];

      const baseWinAmount =
        furthestBet.profit ||
        Number((furthestBet.amount * (furthestBet.cashoutMultiplier || 1)).toFixed(0));
      const extra100BonusAmount = baseWinAmount; // 100% of their win amount!

      roundBonusWinner = {
        userId: furthestBet.userId,
        username: furthestBet.username,
        avatar: furthestBet.avatar,
        multiplier: furthestBet.cashoutMultiplier || 1.0,
        winAmount: baseWinAmount,
        bonusAmount: extra100BonusAmount,
        roundNumber: roundNonce,
      };

      setLastRoundWinner(roundBonusWinner);
      lastRoundWinnerRef.current = roundBonusWinner;

      // If the current player achieved the furthest distance in this round, credit +100% of their win to balance!
      if (furthestBet.userId === currentUserRef.current.id) {
        const latestUser = currentUserRef.current;
        const creditedUser: User = {
          ...latestUser,
          balance: Number((latestUser.balance + extra100BonusAmount).toFixed(2)),
          totalWon: Number((latestUser.totalWon + extra100BonusAmount).toFixed(2)),
        };
        currentUserRef.current = creditedUser;
        setCurrentUserState(creditedUser);
        saveUser(creditedUser);
        pushNotification({
          title: '🏆 Longest Flight +100% Bonus Won!',
          message: `You flew the furthest in Round #${roundNonce} (${(furthestBet.cashoutMultiplier || 1).toFixed(2)}x) and received +Rs. ${extra100BonusAmount.toLocaleString()} LKR extra bonus!`,
          category: 'bonus',
          badgeText: `+Rs. ${extra100BonusAmount.toLocaleString()}`,
        });
      }

      const bonusAnnouncement: ChatMessage = {
        id: `longest_bonus_${Date.now()}`,
        userId: furthestBet.userId,
        username: furthestBet.username,
        avatar: furthestBet.avatar,
        text: `🏆 වැඩිම දුර (Longest Flight) 100% Bonus: ${furthestBet.username} (${(
          furthestBet.cashoutMultiplier || 1
        ).toFixed(2)}x) දිනූ Rs. ${baseWinAmount.toLocaleString()} ට අමතරව +Rs. ${extra100BonusAmount.toLocaleString()} LKR (100%) බෝනස් මුදලක් දිනා ගත්තා!`,
        timestamp: Date.now(),
        isSystemWin: true,
        highlightMultiplier: furthestBet.cashoutMultiplier,
      };
      setChatMessages((prev) => [...prev.slice(-45), bonusAnnouncement]);
    }

    const totalPayout = cashedOutBets.reduce((sum, b) => sum + (b.profit || 0), 0);

    const roundRecord: RoundInfo = {
      id: `round_${roundNonce}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roundNumber: roundNonce,
      crashPoint: finalCrash,
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce: roundNonce,
      timestamp: Date.now(),
      totalBets: currentBetsList.length,
      totalPayout,
      topBonusWinner: roundBonusWinner,
    };
    addRoundToHistory(roundRecord);
    setHistory(getRoundHistory());

    // Clear in-flight bet states so non-queued / non-autobet bets never repeat
    setDeck1((prev) => ({
      ...prev,
      hasPlacedBet: false,
      cashedOut: false,
      cashoutMultiplier: null,
      winAmount: null,
      bonusPortionUsed: prev.isQueuedForNext ? prev.bonusPortionUsed : 0,
    }));
    setDeck2((prev) => ({
      ...prev,
      hasPlacedBet: false,
      cashedOut: false,
      cashoutMultiplier: null,
      winAmount: null,
      bonusPortionUsed: prev.isQueuedForNext ? prev.bonusPortionUsed : 0,
    }));

    if (crashTimeoutRef.current) {
      clearTimeout(crashTimeoutRef.current);
    }
    crashTimeoutRef.current = setTimeout(() => {
      if (activePageRef.current === 'game') {
        prepareNextRound();
      }
    }, 3500);
  };

  // Place Bet: Works in WAITING as well as in the middle of a FLYING round (Queued)!
  const handlePlaceBet = (deckIndex: 1 | 2, amount: number, autoCashoutAt?: number) => {
    const curUser = currentUserRef.current;
    if (amount > curUser.balance || amount <= 0) return;

    const bonusUsed = Math.min(amount, curUser.bonusBalance || 0);

    // Deduct wager immediately from balance (and track bonusPortionUsed)
    const updatedUser: User = {
      ...curUser,
      balance: Number((curUser.balance - amount).toFixed(2)),
      bonusBalance: Math.max(0, Number(((curUser.bonusBalance || 0) - bonusUsed).toFixed(2))),
      totalWagered: Number((curUser.totalWagered + amount).toFixed(2)),
    };
    currentUserRef.current = updatedUser;
    setCurrentUserState(updatedUser);
    saveUser(updatedUser);

    const isCurrentlyFlying = status === 'FLYING';

    if (deckIndex === 1) {
      setDeck1((prev) => ({
        ...prev,
        amount,
        autoMultiplier: autoCashoutAt || prev.autoMultiplier,
        autoCashoutEnabled: !!autoCashoutAt,
        hasPlacedBet: !isCurrentlyFlying,
        isQueuedForNext: isCurrentlyFlying,
        cashedOut: false,
        cashoutMultiplier: null,
        winAmount: null,
        bonusPortionUsed: bonusUsed,
      }));
    } else {
      setDeck2((prev) => ({
        ...prev,
        amount,
        autoMultiplier: autoCashoutAt || prev.autoMultiplier,
        autoCashoutEnabled: !!autoCashoutAt,
        hasPlacedBet: !isCurrentlyFlying,
        isQueuedForNext: isCurrentlyFlying,
        cashedOut: false,
        cashoutMultiplier: null,
        winAmount: null,
        bonusPortionUsed: bonusUsed,
      }));
    }

    // If placed in WAITING phase, register passenger in active flight immediately
    if (status === 'WAITING') {
      const otherDeck = deckIndex === 1 ? deck2 : deck1;
      const otherAmount = otherDeck.hasPlacedBet ? otherDeck.amount : 0;
      const totalUserBet = amount + otherAmount;

      playerPatternTracker.recordBetPlaced(totalUserBet);

      const evalResult = playerPatternTracker.evaluateRoundCrash(
        totalUserBet,
        updatedUser.balance,
        crashPoint
      );
      if (evalResult.crashPoint <= 1.00) {
        setCrashPoint(1.00);
      }

      const passId = deckIndex === 1 ? 'pass_user_1' : 'pass_user_2';
      setPassengers((prev) => [
        ...prev.filter((p) => p.id !== passId),
        {
          id: passId,
          name: deckIndex === 1 ? currentUser.username : `${currentUser.username} #2`,
          avatar: currentUser.avatar,
          color: deckIndex === 1 ? '#3B82F6' : '#8B5CF6',
          isPlayer: true,
          hasJumped: false,
          hasCrashed: false,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          rotation: 0,
          swayOffset: 0,
          parachuteOpenProgress: 0,
          arcTime: 0,
          trail: [],
          opacity: 1,
        },
      ]);

      setActiveBets((prev) => {
        const nextBets = [
          {
            id: `bet_user_${deckIndex}_${Date.now()}`,
            userId: currentUser.id,
            username: deckIndex === 1 ? currentUser.username : `${currentUser.username} #2`,
            avatar: currentUser.avatar,
            amount,
            autoCashoutAt,
            cashedOut: false,
            isBot: false,
            passengerId: passId,
            passengerColor: deckIndex === 1 ? '#3B82F6' : '#8B5CF6',
          },
          ...prev.filter((b) => b.passengerId !== passId),
        ];
        activeBetsRef.current = nextBets;
        return nextBets;
      });
    }
  };

  const handleToggleMute = () => {
    const muted = soundService.toggleMute();
    setIsMuted(muted);
  };

  const handleSendMessage = (text: string, replyTo?: ChatReplyTarget, recipientId?: string) => {
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar,
      role: currentUser.role,
      text,
      timestamp: Date.now(),
      replyTo,
      recipientId,
    };

    const nextHistory = [...chatMessagesRef.current.slice(-70), newMsg];
    publishChatMessage(newMsg);

    // Only trigger selective, 10s+ delayed reply for Public Live Chat messages
    if (!recipientId) {
      liveChatBotService.handleUserMessageReply(
        text,
        currentUser,
        replyTo,
        statusRef.current,
        currentMultiplierRef.current,
        nextHistory,
        lastRoundWinnerRef.current,
        (replyMsg) => {
          publishChatMessage(replyMsg);
        },
        (typingState) => {
          setTypingUser(typingState);
        }
      );
    }
  };

  // Active Live Chat Periodic Community Chatter (Slow, non-repeating messages when inside game)
  useEffect(() => {
    if (activePage !== 'game') return;
    const timer = setInterval(() => {
      liveChatBotService.checkPeriodicChat(
        statusRef.current,
        currentMultiplierRef.current,
        chatMessagesRef.current,
        lastRoundWinnerRef.current,
        (msg) => {
          publishChatMessage(msg);
        }
      );
    }, 4500);
    return () => clearInterval(timer);
  }, [activePage, publishChatMessage]);

  const handleClaimReferral = () => {
    if (currentUser.unclaimedReferralRewards <= 0) return;
    const amount = currentUser.unclaimedReferralRewards;
    const updated: User = {
      ...currentUser,
      balance: Number((currentUser.balance + amount).toFixed(2)),
      unclaimedReferralRewards: 0,
    };
    setCurrentUserState(updated);
    saveUser(updated);
    pushNotification({
      title: '🎁 Referral Commission Claimed!',
      message: `Rs. ${amount.toLocaleString()} LKR referral reward has been added to your main wallet balance.`,
      category: 'bonus',
      badgeText: `+Rs. ${amount.toLocaleString()}`,
    });
  };

  const handleOpenCashier = (tab: 'deposit' | 'withdraw' = 'deposit') => {
    setCashierInitialTab(tab);
    setIsCashierOpen(true);
  };

  const handleLogout = () => {
    if (currentUser?.id) {
      clearUserPresenceOnLogout(currentUser.id);
    }
    clearCurrentUserSession();
    const unauthUser = getCurrentUser();
    currentUserRef.current = unauthUser;
    setCurrentUserState(unauthUser);
    setIsAuthenticated(false);
    setIsSiteMenuOpen(false);
    setIsProfileOpen(false);
    setIsAdminOpen(false);
    setAgentPanelMode(null);
    setActivePage('lobby');
    setAuthInitialTab('login');
    setIsAuthOpen(true);
    try {
      window.history.replaceState({ lionbetAuthGate: true }, '', window.location.pathname);
    } catch {}
  };

  const userBetHistory = useMemo(
    () => betHistory.filter((b) => b.userId === currentUser.id),
    [betHistory, currentUser.id]
  );

  const handleSelectRoundForProof = useCallback((r: RoundInfo) => {
    setSelectedRoundForProof(r);
    setIsProvablyFairOpen(true);
  }, []);

  const handleOpenProvablyFairModal = useCallback(() => {
    setIsProvablyFairOpen(true);
  }, []);

  // Mandatory Authentication Gate: Do not render any pre-existing or guest account until user logs in or registers
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col font-sans bg-slate-950 text-slate-100">
        {isSiteBooting && <LionBetSiteLoader onFinished={() => setIsSiteBooting(false)} />}
        <AuthModal
          isOpen={true}
          initialTab={authInitialTab}
          initialPromoCode={authInitialPromo}
          onClose={() => {}}
          onLoginSuccess={(u) => {
            currentUserRef.current = u;
            setCurrentUserState(u);
            setIsAuthenticated(true);
            setIsAuthOpen(false);
            setActivePage('lobby');
            try {
              window.history.replaceState({}, '', window.location.pathname);
            } catch {}
            if (u.role === 'deposit_agent' || u.role === 'cash_agent') {
              setAgentPanelMode('deposit_panel');
            } else if (u.role === 'withdraw_agent') {
              setAgentPanelMode('withdraw_page');
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
        theme === 'light'
          ? 'theme-light bg-slate-100 text-slate-900'
          : 'theme-dark bg-slate-950 text-slate-100'
      }`}
    >
      {/* Lion Bet Initial Site Loading Screen with 3-Dots Animation */}
      {isSiteBooting && <LionBetSiteLoader onFinished={() => setIsSiteBooting(false)} />}

      {/* Top Header (Hidden when in immersive in-game Full Screen mode so game fills viewport) */}
      {!isGameFullscreen && (
        <Header
          currentUser={currentUser}
          isMuted={isMuted}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          activePage={activePage}
          onGoToLobby={() => setActivePage('lobby')}
          onOpenSportsBetting={() => setActivePage('sports')}
          onToggleMute={handleToggleMute}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenReferral={() => setIsReferralOpen(true)}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenProvablyFair={handleOpenProvablyFairModal}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenAgentPanel={(mode) => setAgentPanelMode(mode)}
          onOpenGoogleForms={() => setIsGoogleFormsOpen(true)}
          onOpenCashier={handleOpenCashier}
          onLogout={handleLogout}
          isLuckyHourActive={isLuckyHourActive}
          luckyHourRemainingMs={luckyHourRemainingMs}
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
        />
      )}

      {/* Live Toast Notifications Stack */}
      <ToastNotificationStack
        toasts={activeToasts}
        onDismissToast={dismissToast}
        onOpenCenter={() => setIsNotificationsOpen(true)}
      />

      {activePage === 'lobby' ? (
        <GamesLobby
          currentUser={currentUser}
          activePlayersCount={activeBets.length}
          onSelectBalloonCrash={(soundEnabled) => {
            if (typeof soundEnabled === 'boolean') {
              soundService.setMuted(!soundEnabled);
              setIsMuted(!soundEnabled);
              if (soundEnabled) {
                soundService.playBeep(false);
              }
            }
            setActivePage('game');
          }}
          onSelectSportsBetting={() => setActivePage('sports')}
          onOpenCashier={handleOpenCashier}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenReferral={() => setIsReferralOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      ) : activePage === 'sports' ? (
        <SportsBettingView
          currentUser={currentUser}
          onUpdateUserBalance={(newBalance, wagerDelta = 0, wonDelta = 0) => {
            const latest = currentUserRef.current;
            const updated: User = {
              ...latest,
              balance: newBalance,
              totalWagered: Number((latest.totalWagered + wagerDelta).toFixed(2)),
              totalWon: Number((latest.totalWon + wonDelta).toFixed(2)),
            };
            currentUserRef.current = updated;
            setCurrentUserState(updated);
            saveUser(updated);
            if (wonDelta > 0) {
              soundService.playCashout(true);
              pushNotification({
                title: '🏆 2x Match Bet Slip Won!',
                message: `Your match bet slip won a 2.00x payout of Rs. ${wonDelta.toLocaleString()} LKR!`,
                category: 'win',
                badgeText: `+Rs. ${wonDelta.toLocaleString()}`,
                actionLabel: 'View Bet Slips',
                actionTarget: 'sports',
              });
            } else if (wagerDelta > 0) {
              soundService.playBeep(false);
              pushNotification({
                title: '🎫 2x Match Bet Slip Placed',
                message: `Stake Rs. ${wagerDelta.toLocaleString()} LKR locked in at 2.00x (Potential Win: Rs. ${(wagerDelta * 2).toLocaleString()}).`,
                category: 'win',
                badgeText: '2.00x SLIP',
              });
            } else {
              soundService.playBeep(false);
            }
          }}
          onOpenCashier={handleOpenCashier}
          onBackToLobby={() => setActivePage('lobby')}
        />
      ) : (
        <>
          {/* Multiplier History Strip */}
          <div className="max-w-7xl w-full mx-auto px-2 sm:px-6 pt-1.5 sm:pt-3 flex items-center justify-between gap-2 sm:gap-3 overflow-hidden">
            <div className="flex-1 min-w-0 overflow-hidden">
              <MultiplierHistory
                history={history}
                onSelectRound={handleSelectRoundForProof}
                onOpenFairModal={handleOpenProvablyFairModal}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowMultiplayerSidebar((prev) => !prev)}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition shadow-sm shrink-0 cursor-pointer ${
                showMultiplayerSidebar
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              title="Toggle multiplayer sidebar to center balloon"
            >
              <span>👥</span>
              <span>{showMultiplayerSidebar ? 'Compact Sidebar' : 'Show Multiplayer'}</span>
            </button>
          </div>

          {/* Last Round 100% Longest-Distance Bonus Winner Strip */}
          {lastRoundWinner && (
            <div className="max-w-7xl w-full mx-auto px-2 sm:px-6 pt-1.5 sm:pt-2">
              <div className="bg-slate-900/95 border border-amber-500/40 rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 shadow-sm text-[10.5px] sm:text-xs">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-sm sm:text-base shrink-0">🏆</span>
                  <div className="min-w-0">
                    <span className="font-black text-amber-400">
                      Last Round (#{lastRoundWinner.roundNumber}) 100% Bonus Winner:
                    </span>{' '}
                    <span className="font-black text-white">
                      {lastRoundWinner.avatar} {lastRoundWinner.username}
                    </span>{' '}
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-black text-[10px] sm:text-[11px]">
                      @ {lastRoundWinner.multiplier.toFixed(2)}x
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px]">
                  <span className="text-slate-400">
                    Win: <strong className="text-white">Rs. {lastRoundWinner.winAmount.toLocaleString()}</strong>
                  </span>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black">
                    +100% Bonus: +Rs. {lastRoundWinner.bonusAmount.toLocaleString()} LKR
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Main Game Arena - Centered & Balanced */}
          <main
            className={`w-full min-w-0 mx-auto px-2 sm:px-6 py-1.5 sm:py-3 flex-1 flex flex-col lg:flex-row gap-2.5 sm:gap-4 items-start justify-center overflow-x-hidden ${
              isGameFullscreen ? 'max-w-full' : 'max-w-7xl'
            }`}
          >
            {/* Center Screen: Grand Balloon Canvas Arena + Dual Betting Decks */}
            <section
              className={`flex flex-col gap-2 sm:gap-4 transition-all duration-200 w-full min-w-0 ${
                showMultiplayerSidebar
                  ? 'lg:flex-1'
                  : isGameFullscreen
                  ? 'max-w-6xl mx-auto'
                  : 'max-w-4xl mx-auto'
              }`}
            >
              <BalloonCanvas
                status={status}
                currentMultiplier={currentMultiplier}
                crashPoint={crashPoint}
                passengers={passengers}
                waitingProgress={waitingProgress}
                waitingSecondsLeft={waitingSecondsLeft}
                activeBetsCount={activeBets.length}
                userBalance={currentUser.balance}
                onOpenCashier={() => handleOpenCashier('deposit')}
                onShowMultiplayer={() => {
                  setShowMultiplayerSidebar(true);
                  const el = document.getElementById('mobile-multiplayer-panel');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                isFullscreen={isGameFullscreen}
                onToggleFullscreen={handleToggleGameFullscreen}
                onExitFullscreen={handleExitGameFullscreen}
                backPressHint={backPressHint}
              />

              <BettingPanel
                status={status}
                currentMultiplier={currentMultiplier}
                userBalance={currentUser.balance}
                deck1={deck1}
                deck2={deck2}
                onPlaceBet={handlePlaceBet}
                onCashout={(deckIdx) => handleCashout(deckIdx)}
                onUpdateDeck={(deckIdx, updates) => {
                  if (deckIdx === 1) setDeck1((prev) => ({ ...prev, ...updates }));
                  else setDeck2((prev) => ({ ...prev, ...updates }));
                }}
              />
            </section>

            {/* Ultra-Compact Top-Aligned Right Sidebar */}
            {showMultiplayerSidebar && (
              <aside className="hidden lg:flex flex-col gap-1.5 w-[265px] shrink-0 self-start">
                {/* Compact Header Switcher: All Bets | My Bets | History | Chat */}
                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDesktopSidebarTab('bets');
                      setBetsSubTab('all');
                    }}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                      desktopSidebarTab === 'bets' && betsSubTab === 'all'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Bets ({activeBets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDesktopSidebarTab('bets');
                      setBetsSubTab('my');
                    }}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                      desktopSidebarTab === 'bets' && betsSubTab === 'my'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    My Bets
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDesktopSidebarTab('bets');
                      setBetsSubTab('history');
                    }}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                      desktopSidebarTab === 'bets' && betsSubTab === 'history'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    History
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesktopSidebarTab('chat')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                      desktopSidebarTab === 'chat' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Chat 💬
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMultiplayerSidebar(false)}
                    title="Hide Multiplayer Sidebar"
                    className="px-1.5 py-0.5 text-[11px] text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Compact Content Container positioned at the top */}
                <div className="h-[380px] flex flex-col">
                  {desktopSidebarTab === 'bets' ? (
                    <LiveBetsList
                      bets={activeBets}
                      currentUserId={currentUser.id}
                      myBetHistory={userBetHistory}
                      roundHistory={history}
                      activeTab={betsSubTab}
                      onTabChange={setBetsSubTab}
                      lastRoundWinner={lastRoundWinner}
                      onSelectRound={handleSelectRoundForProof}
                      onStartPrivateChat={(bet) => {
                        const bot = liveChatBotService.getBotByNameOrId(bet.username) || {
                          id: bet.userId,
                          name: bet.username,
                          avatar: bet.avatar,
                          color: bet.passengerColor || '#3B82F6',
                        };
                        setSelectedPrivateBot(bot);
                        setDesktopSidebarTab('chat');
                      }}
                    />
                  ) : (
                    <LiveChat
                      messages={chatMessages}
                      currentUser={currentUser}
                      gameStatus={status}
                      currentMultiplier={currentMultiplier}
                      lastRoundWinner={lastRoundWinner}
                      selectedPrivateBot={selectedPrivateBot}
                      onSelectPrivateBot={setSelectedPrivateBot}
                      typingUser={typingUser}
                      onSendMessage={handleSendMessage}
                    />
                  )}
                </div>
              </aside>
            )}

            {/* Mobile Tabbed View */}
            <section id="mobile-multiplayer-panel" className="block lg:hidden w-full min-w-0">
              <div className="flex border-b border-slate-800 bg-slate-900 rounded-xl p-1 mb-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMobileTab('bets');
                    setBetsSubTab('all');
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                    mobileTab === 'bets' && betsSubTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  All Bets ({activeBets.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileTab('bets');
                    setBetsSubTab('my');
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                    mobileTab === 'bets' && betsSubTab === 'my' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  My Bets
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileTab('bets');
                    setBetsSubTab('history');
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                    mobileTab === 'bets' && betsSubTab === 'history' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  History
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('chat')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                    mobileTab === 'chat' ? 'bg-purple-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Chat 💬
                </button>
              </div>

              <div className="h-[340px] sm:h-[380px] flex flex-col w-full min-w-0">
                {mobileTab === 'bets' ? (
                  <LiveBetsList
                    bets={activeBets}
                    currentUserId={currentUser.id}
                    myBetHistory={userBetHistory}
                    roundHistory={history}
                    activeTab={betsSubTab}
                    onTabChange={setBetsSubTab}
                    lastRoundWinner={lastRoundWinner}
                    onSelectRound={handleSelectRoundForProof}
                    onStartPrivateChat={(bet) => {
                      const bot = liveChatBotService.getBotByNameOrId(bet.username) || {
                        id: bet.userId,
                        name: bet.username,
                        avatar: bet.avatar,
                        color: bet.passengerColor || '#3B82F6',
                      };
                      setSelectedPrivateBot(bot);
                      setMobileTab('chat');
                    }}
                  />
                ) : (
                  <LiveChat
                    messages={chatMessages}
                    currentUser={currentUser}
                    gameStatus={status}
                    currentMultiplier={currentMultiplier}
                    lastRoundWinner={lastRoundWinner}
                    selectedPrivateBot={selectedPrivateBot}
                    onSelectPrivateBot={setSelectedPrivateBot}
                    typingUser={typingUser}
                    onSendMessage={handleSendMessage}
                  />
                )}
              </div>
            </section>
          </main>
        </>
      )}

      {/* Footer Info & Fairness Bar */}
      <footer className="w-full bg-slate-950 border-t border-slate-900 px-4 py-3 pb-20 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span>Flight #{roundNonce}</span>
          <span>•</span>
          <span className="font-mono text-[11px] text-slate-400">
            Hash: {serverSeedHash ? `${serverSeedHash.substring(0, 16)}...` : 'Generating...'}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
          <button
            type="button"
            onClick={() => setIsProvablyFairOpen(true)}
            className="hover:text-emerald-400 transition underline cursor-pointer"
          >
            Provably Fair Verification
          </button>
          <button
            type="button"
            onClick={() => handleOpenCashier('deposit')}
            className="hover:text-emerald-400 transition underline cursor-pointer"
          >
            Deposit &amp; Withdraw LKR (100% 1st Bonus)
          </button>
          <button
            type="button"
            onClick={() => setIsReferralOpen(true)}
            className="hover:text-amber-400 transition underline cursor-pointer"
          >
            Refer Friends (10% Commission)
          </button>
          <button
            type="button"
            onClick={() => setIsGoogleFormsOpen(true)}
            className="hover:text-indigo-400 transition underline cursor-pointer"
          >
            Player Feedback &amp; Surveys
          </button>
        </div>
      </footer>

      {/* Fixed Bottom Navigation Tabs: Home | Bet Slip | Deposit | Menu */}
      {!isGameFullscreen && (
        <BottomTabBar
          activePage={activePage}
          isMenuOpen={isSiteMenuOpen}
          onSelectHome={() => {
            setIsSiteMenuOpen(false);
            setActivePage('lobby');
          }}
          onSelectBetSlip={() => {
            setIsSiteMenuOpen(false);
            setActivePage('sports');
          }}
          onSelectDeposit={() => {
            setIsSiteMenuOpen(false);
            handleOpenCashier('deposit');
          }}
          onToggleMenu={() => setIsSiteMenuOpen((prev) => !prev)}
        />
      )}

      {/* Site Menu Modal (Profile, Bonuses, Become Agent, Contact Support, Transaction History, My Betting History, Deposit, Withdraw, Casino, My Team, VIP Club, About Lion Bet) */}
      <SiteMenuModal
        isOpen={isSiteMenuOpen}
        onClose={() => setIsSiteMenuOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(u) => {
          currentUserRef.current = u;
          setCurrentUserState(u);
        }}
        isLuckyHourActive={isLuckyHourActive}
        luckyHourRemainingMs={luckyHourRemainingMs}
        onActivateLuckyHour={activateLuckyHour}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenDeposit={() => handleOpenCashier('deposit')}
        onOpenWithdraw={() => handleOpenCashier('withdraw')}
        onOpenCasino={() => setActivePage('lobby')}
        onOpenBetSlip={() => setActivePage('sports')}
        onOpenReferralModal={() => setIsReferralOpen(true)}
        onOpenRegisterWithPromo={handleOpenRegisterWithPromo}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenProvablyFair={() => setIsProvablyFairOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onLogout={handleLogout}
      />

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onUpdateUser={(u) => {
          currentUserRef.current = u;
          setCurrentUserState(u);
        }}
        onOpenAuthModal={() => {
          setAuthInitialTab('register');
          setIsAuthOpen(true);
        }}
        onLogout={handleLogout}
      />

      <DepositWithdrawModal
        isOpen={isCashierOpen}
        initialTab={cashierInitialTab}
        onClose={() => setIsCashierOpen(false)}
        currentUser={currentUser}
        onBalanceUpdated={(u) => {
          const prevBal = currentUserRef.current.balance;
          currentUserRef.current = u;
          setCurrentUserState(u);
          const diff = Number((u.balance - prevBal).toFixed(2));
          if (diff > 0) {
            pushNotification({
              title: '💰 Wallet Credited!',
              message: `Rs. ${diff.toLocaleString()} LKR was credited to your Lion Bet wallet. New Balance: Rs. ${u.balance.toLocaleString()}.`,
              category: 'wallet',
              badgeText: `+Rs. ${diff.toLocaleString()}`,
            });
          } else if (diff < 0) {
            pushNotification({
              title: '🏦 Withdrawal Submitted',
              message: `Rs. ${Math.abs(diff).toLocaleString()} LKR withdrawal processed from your wallet.`,
              category: 'wallet',
              badgeText: `-Rs. ${Math.abs(diff).toLocaleString()}`,
            });
          }
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        initialTab={authInitialTab}
        initialPromoCode={authInitialPromo}
        onClose={() => {}}
        onLoginSuccess={(u) => {
          currentUserRef.current = u;
          setCurrentUserState(u);
          setIsAuthenticated(true);
          setIsAuthOpen(false);
          setActivePage('lobby');
          try {
            window.history.replaceState({}, '', window.location.pathname);
          } catch {}
          if (u.role === 'deposit_agent' || u.role === 'cash_agent') {
            setAgentPanelMode('deposit_panel');
          } else if (u.role === 'withdraw_agent') {
            setAgentPanelMode('withdraw_page');
          }
        }}
      />

      <ReferralModal
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
        currentUser={currentUser}
        onClaimRewards={handleClaimReferral}
        onOpenRegisterWithPromo={handleOpenRegisterWithPromo}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUser={currentUser}
        leaderboard={leaderboard}
      />

      <ProvablyFairModal
        isOpen={isProvablyFairOpen}
        onClose={() => setIsProvablyFairOpen(false)}
        selectedRound={selectedRoundForProof}
        currentClientSeed={clientSeed}
        onUpdateClientSeed={setClientSeed}
      />

      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        currentUser={currentUser}
        history={history}
        onSettingsUpdated={setAdminSettings}
        onUserUpdated={(u) => {
          currentUserRef.current = u;
          setCurrentUserState(u);
        }}
        onOpenAgentPanel={(mode) => {
          setIsAdminOpen(false);
          setAgentPanelMode(mode);
        }}
        onLogout={handleLogout}
      />

      <CashAgentPanelModal
        isOpen={agentPanelMode !== null}
        initialMode={agentPanelMode || 'deposit_panel'}
        onClose={() => setAgentPanelMode(null)}
        currentUser={currentUser}
        onUserUpdated={(u) => {
          currentUserRef.current = u;
          setCurrentUserState(u);
        }}
        onLogout={handleLogout}
      />

      <GoogleFormsModal
        isOpen={isGoogleFormsOpen}
        onClose={() => setIsGoogleFormsOpen(false)}
        userEmail={currentUser.email}
      />

      {/* Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        currentUser={currentUser}
        notifications={notifications}
        onMarkOneRead={(id: string) => {
          setNotifications((prev) => {
            const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
            saveNotificationsToStorage(next);
            return next;
          });
        }}
        onMarkAllRead={() => {
          setNotifications((prev) => {
            const next = prev.map((n) => ({ ...n, read: true }));
            saveNotificationsToStorage(next);
            return next;
          });
        }}
        onDeleteNotification={(id: string) => {
          setNotifications((prev) => {
            const next = prev.filter((n) => n.id !== id);
            saveNotificationsToStorage(next);
            return next;
          });
        }}
        onClearAll={() => {
          setNotifications([]);
          saveNotificationsToStorage([]);
        }}
        onNavigateTarget={(target: 'deposit' | 'withdraw' | 'sports' | 'game' | 'bonuses') => {
          if (target === 'game') setActivePage('game');
          else if (target === 'sports') setActivePage('sports');
          else if (target === 'deposit') handleOpenCashier('deposit');
          else if (target === 'withdraw') handleOpenCashier('withdraw');
          else if (target === 'bonuses') setIsSiteMenuOpen(true);
        }}
        onSendBroadcast={(title: string, message: string, category: NotificationCategory) => {
          pushNotification({
            userId: 'ALL',
            title,
            message,
            category,
            badgeText: 'OFFICIAL',
          });
        }}
      />
    </div>
  );
}
