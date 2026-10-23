import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  User,
  BetRecord,
  AdminSettings,
  MinesGameEngineConfig,
  MinesRiskLevel,
} from '../types/game';
import {
  getAdminSettings,
  saveAdminSettings,
  syncAdminSettingsWithServer,
  DEFAULT_MINES_CONFIG,
  getTimeBasedCrashCrowd,
} from '../services/storage';
import { soundService } from '../services/sound';
import { generateRandomHex, sha256 } from '../services/provablyFair';
import {
  ArrowLeft,
  Sparkles,
  Volume2,
  VolumeX,
  ShieldCheck,
  Zap,
  Wallet,
  RotateCcw,
  Shuffle,
  Flame,
  Trophy,
  History,
  Users,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface MinesGameViewProps {
  currentUser: User;
  adminSettings: AdminSettings;
  onUpdateAdminSettings?: (next: AdminSettings) => void;
  onPlaceBetDeduction: (betAmount: number) => boolean;
  onCreditWin: (winAmount: number, betAmount: number, multiplier: number) => void;
  onRecordBetHistory: (record: BetRecord) => void;
  onOpenCashier: (tab?: 'deposit' | 'withdraw') => void;
  onBackToLobby: () => void;
}

type TileState = 'hidden' | 'gem' | 'mine' | 'exploded';

interface MinesTile {
  index: number;
  hasMine: boolean;
  state: TileState;
}

const TOTAL_TILES = 25;

/**
 * Computes multiplier for k revealed gems with m mines on a 25-tile board,
 * adjusted by Admin houseEdgePercent and riskLevel.
 */
function calculateMinesMultiplier(
  minesCount: number,
  gemsRevealed: number,
  config: MinesGameEngineConfig
): number {
  if (gemsRevealed <= 0) return 1.0;
  const safeTotal = TOTAL_TILES - minesCount;
  if (gemsRevealed > safeTotal) return 1.0;

  // True combinatorial probability of picking gemsRevealed safe tiles in a row
  let probability = 1.0;
  for (let i = 0; i < gemsRevealed; i++) {
    probability *= (safeTotal - i) / (TOTAL_TILES - i);
  }

  const houseEdge = Math.min(0.45, Math.max(0.01, (config.houseEdgePercent ?? 4) / 100));
  const riskBonusFactor =
    config.riskLevel === 'low'
      ? 0.96
      : config.riskLevel === 'medium'
      ? 1.0
      : config.riskLevel === 'high'
      ? 1.05
      : 1.12;

  const rawMult = ((1 - houseEdge) / probability) * riskBonusFactor;
  const capped = Math.min(config.maxMultiplierCap || 500, Math.max(1.01, rawMult));
  return Number(capped.toFixed(2));
}

export const MinesGameView: React.FC<MinesGameViewProps> = ({
  currentUser,
  adminSettings,
  onUpdateAdminSettings,
  onPlaceBetDeduction,
  onCreditWin,
  onRecordBetHistory,
  onOpenCashier,
  onBackToLobby,
}) => {
  // Creative Slow Loading Screen State (~4.2 seconds multi-stage vault calibration)
  const [isSlowLoading, setIsSlowLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [scannerRow, setScannerRow] = useState<number>(0);

  // Synced Mines Engine Config
  const [liveSettings, setLiveSettings] = useState<AdminSettings>(() => getAdminSettings());
  const minesConfig: MinesGameEngineConfig = useMemo(
    () => ({
      ...DEFAULT_MINES_CONFIG,
      ...(adminSettings.minesConfig || {}),
      ...(liveSettings.minesConfig || {}),
      minBet: Math.max(
        10,
        liveSettings.minesConfig?.minBet ?? adminSettings.minesConfig?.minBet ?? 10
      ),
    }),
    [adminSettings.minesConfig, liveSettings.minesConfig]
  );

  // Game Controls State (LKR, Min Bet 10 LKR)
  const [betAmount, setBetAmount] = useState<number>(10);
  const [betInputText, setBetInputText] = useState<string>('10');
  const [minesCount, setMinesCount] = useState<number>(() => minesConfig.defaultMinesCount || 3);

  // Active Round State
  const [roundActive, setRoundActive] = useState<boolean>(false);
  const [roundResult, setRoundResult] = useState<'none' | 'won' | 'lost'>('none');
  const [lockedBetAmount, setLockedBetAmount] = useState<number>(10);
  const [lockedMinesCount, setLockedMinesCount] = useState<number>(3);
  const [tiles, setTiles] = useState<MinesTile[]>(() =>
    Array.from({ length: TOTAL_TILES }, (_, i) => ({
      index: i,
      hasMine: false,
      state: 'hidden',
    }))
  );
  const [gemsRevealed, setGemsRevealed] = useState<number>(0);
  const [winPayout, setWinPayout] = useState<number>(0);
  const [cashoutMultiplier, setCashoutMultiplier] = useState<number>(1.0);
  const [roundNonce, setRoundNonce] = useState<number>(() => Math.floor(4000 + Math.random() * 900));
  const [serverSeed, setServerSeed] = useState<string>(() => generateRandomHex(16));
  const [serverSeedHash, setServerSeedHash] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundService.isMuted());
  const [recentMinesBets, setRecentMinesBets] = useState<
    {
      id: string;
      mines: number;
      gems: number;
      bet: number;
      multiplier: number;
      win: number;
      status: 'won' | 'lost';
      timestamp: number;
    }[]
  >([]);

  const onlinePlayersCount = useMemo(
    () => Math.max(24, getTimeBasedCrashCrowd().onlineInGame - 9),
    []
  );

  // Hash server seed for Provably Fair display
  useEffect(() => {
    sha256(serverSeed)
      .then((h) => setServerSeedHash(h))
      .catch(() => {});
  }, [serverSeed]);

  // Periodically sync AdminSettings from server so Admin changes to riskLevel / loseRatePercent apply live
  useEffect(() => {
    let active = true;
    const syncSettings = async () => {
      const latest = await syncAdminSettingsWithServer();
      if (active) {
        setLiveSettings(latest);
      }
    };
    syncSettings();
    const interval = setInterval(syncSettings, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Slow Creative Loading Screen Animation (~4.1 seconds smooth progress + vault scanner)
  useEffect(() => {
    if (!isSlowLoading) return;
    setLoadingProgress(0);
    const durationMs = 4100; // Deliberate slow creative loading screen as requested
    const startTime = performance.now();
    let rafId: number;

    const scanTimer = setInterval(() => {
      setScannerRow((prev) => (prev + 1) % 5);
    }, 280);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      // Non-linear dramatic slow curve
      const rawRatio = Math.min(1, elapsed / durationMs);
      const eased =
        rawRatio < 0.65
          ? (rawRatio / 0.65) * 0.72
          : 0.72 + ((rawRatio - 0.65) / 0.35) * 0.28;
      const pct = Math.min(100, Math.floor(eased * 100));
      setLoadingProgress(pct);

      if (rawRatio < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          setIsSlowLoading(false);
        }, 350);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(scanTimer);
    };
  }, [isSlowLoading]);

  const activeMinesCount = roundActive ? lockedMinesCount : minesCount;
  const maxSafeGems = TOTAL_TILES - activeMinesCount;

  // Precompute multiplier ladder for the current mines count
  const multiplierLadder = useMemo(() => {
    const steps: { gems: number; multiplier: number; payout: number }[] = [];
    const baseStake = roundActive ? lockedBetAmount : betAmount;
    for (let g = 1; g <= maxSafeGems; g++) {
      const mult = calculateMinesMultiplier(activeMinesCount, g, minesConfig);
      steps.push({
        gems: g,
        multiplier: mult,
        payout: Number((baseStake * mult).toFixed(2)),
      });
    }
    return steps;
  }, [activeMinesCount, maxSafeGems, minesConfig, roundActive, lockedBetAmount, betAmount]);

  const currentMultiplier = useMemo(() => {
    if (!roundActive || gemsRevealed === 0) return 1.0;
    return calculateMinesMultiplier(lockedMinesCount, gemsRevealed, minesConfig);
  }, [roundActive, gemsRevealed, lockedMinesCount, minesConfig]);

  const nextStepMultiplier = useMemo(() => {
    const nextGemCount = roundActive ? gemsRevealed + 1 : 1;
    if (nextGemCount > maxSafeGems) return currentMultiplier;
    return calculateMinesMultiplier(activeMinesCount, nextGemCount, minesConfig);
  }, [roundActive, gemsRevealed, maxSafeGems, activeMinesCount, minesConfig, currentMultiplier]);

  const currentCashoutAmount = useMemo(() => {
    if (!roundActive || gemsRevealed === 0) return 0;
    return Number((lockedBetAmount * currentMultiplier).toFixed(2));
  }, [roundActive, gemsRevealed, lockedBetAmount, currentMultiplier]);

  const handleBetInputChange = (valStr: string) => {
    setBetInputText(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      setBetAmount(parsed);
    }
  };

  const clampBetAmount = (val: number) => {
    const min = Math.max(10, minesConfig.minBet || 10);
    const max = Math.max(min, minesConfig.maxBet || 50000);
    const clamped = Math.min(max, Math.max(min, Math.round(val)));
    setBetAmount(clamped);
    setBetInputText(String(clamped));
  };

  // Start a new Mines round
  const handleStartGame = async () => {
    setErrorMsg(null);
    const latest = await syncAdminSettingsWithServer();
    setLiveSettings(latest);
    const activeCfg = {
      ...DEFAULT_MINES_CONFIG,
      ...(latest.minesConfig || {}),
      minBet: Math.max(10, latest.minesConfig?.minBet ?? 10),
    };

    if (activeCfg.isGamePaused) {
      setErrorMsg('Mines game is temporarily paused by Administrator.');
      return;
    }

    const minAllowed = Math.max(10, activeCfg.minBet || 10);
    const maxAllowed = Math.max(minAllowed, activeCfg.maxBet || 50000);
    const cleanBet = Number(betAmount.toFixed(2));

    if (isNaN(cleanBet) || cleanBet < minAllowed) {
      setErrorMsg(`Minimum bet is Rs. ${minAllowed.toLocaleString()} LKR.`);
      clampBetAmount(minAllowed);
      return;
    }
    if (cleanBet > maxAllowed) {
      setErrorMsg(`Maximum bet is Rs. ${maxAllowed.toLocaleString()} LKR.`);
      clampBetAmount(maxAllowed);
      return;
    }
    if (cleanBet > currentUser.balance) {
      setErrorMsg('Insufficient LKR balance. Please deposit to play.');
      return;
    }

    const deducted = onPlaceBetDeduction(cleanBet);
    if (!deducted) {
      setErrorMsg('Unable to place bet. Check your LKR wallet balance.');
      return;
    }

    // Generate initial random mine positions (25 tiles, minesCount mines)
    const mineIndices = new Set<number>();
    while (mineIndices.size < minesCount) {
      mineIndices.add(Math.floor(Math.random() * TOTAL_TILES));
    }

    const freshTiles: MinesTile[] = Array.from({ length: TOTAL_TILES }, (_, idx) => ({
      index: idx,
      hasMine: mineIndices.has(idx),
      state: 'hidden',
    }));

    soundService.playBeep(false);
    setLockedBetAmount(cleanBet);
    setLockedMinesCount(minesCount);
    setTiles(freshTiles);
    setGemsRevealed(0);
    setWinPayout(0);
    setCashoutMultiplier(1.0);
    setRoundResult('none');
    setRoundActive(true);
  };

  // Finish round on Cashout
  const executeCashout = useCallback(
    (finalGemsCount: number, boardSnapshot: MinesTile[]) => {
      const mult = calculateMinesMultiplier(lockedMinesCount, finalGemsCount, minesConfig);
      const payout = Number((lockedBetAmount * mult).toFixed(2));
      const profit = Number((payout - lockedBetAmount).toFixed(2));

      soundService.playCashout(true);
      if (mult >= 2.0) {
        try {
          confetti({
            particleCount: 55,
            spread: 65,
            origin: { y: 0.65 },
          });
        } catch {}
      }

      // Reveal remaining board
      const revealedBoard = boardSnapshot.map((t) => {
        if (t.state !== 'hidden') return t;
        return {
          ...t,
          state: (t.hasMine ? 'mine' : 'gem') as TileState,
        };
      });

      setTiles(revealedBoard);
      setRoundActive(false);
      setRoundResult('won');
      setWinPayout(payout);
      setCashoutMultiplier(mult);

      onCreditWin(payout, lockedBetAmount, mult);

      const rec: BetRecord = {
        id: 'mines_bet_' + Date.now(),
        userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar || '💎',
        roundNumber: roundNonce,
        amount: lockedBetAmount,
        cashoutMultiplier: mult,
        crashPoint: mult,
        winAmount: payout,
        profit,
        status: 'won',
        gameName: `Lanka Mines (${lockedMinesCount} 💣)`,
        timestamp: Date.now(),
      };
      onRecordBetHistory(rec);

      setRecentMinesBets((prev) => [
        {
          id: rec.id,
          mines: lockedMinesCount,
          gems: finalGemsCount,
          bet: lockedBetAmount,
          multiplier: mult,
          win: payout,
          status: 'won',
          timestamp: Date.now(),
        },
        ...prev.slice(0, 14),
      ]);
      setRoundNonce((n) => n + 1);
      setServerSeed(generateRandomHex(16));
    },
    [
      lockedMinesCount,
      minesConfig,
      lockedBetAmount,
      onCreditWin,
      currentUser.id,
      currentUser.username,
      currentUser.avatar,
      roundNonce,
      onRecordBetHistory,
    ]
  );

  // Handle clicking a tile on the 5x5 grid
  const handleTileClick = (index: number) => {
    if (!roundActive) return;
    const clickedTile = tiles[index];
    if (!clickedTile || clickedTile.state !== 'hidden') return;

    const latestLocalSettings = getAdminSettings();
    const activeCfg: MinesGameEngineConfig = {
      ...DEFAULT_MINES_CONFIG,
      ...(minesConfig || {}),
      ...(latestLocalSettings.minesConfig || {}),
    };

    const nextTiles = tiles.map((t) => ({ ...t }));
    const hiddenIndices = nextTiles.filter((t) => t.state === 'hidden').map((t) => t.index);
    const hiddenMineIndices = nextTiles
      .filter((t) => t.state === 'hidden' && t.hasMine)
      .map((t) => t.index);
    const hiddenSafeIndices = nextTiles
      .filter((t) => t.state === 'hidden' && !t.hasMine)
      .map((t) => t.index);

    let isHitMine = nextTiles[index].hasMine;

    // 1. Check Admin Force Next Click Mine Override
    if (activeCfg.forceNextClickMine) {
      isHitMine = true;
      // Clear one-shot forceNextClickMine flag
      const updatedSettings: AdminSettings = {
        ...latestLocalSettings,
        minesConfig: {
          ...activeCfg,
          forceNextClickMine: false,
        },
      };
      saveAdminSettings(updatedSettings);
      setLiveSettings(updatedSettings);
      onUpdateAdminSettings?.(updatedSettings);
    } else if (activeCfg.firstClickSafe && gemsRevealed === 0 && hiddenSafeIndices.length > 0) {
      // First click safe guarantee if enabled by Admin
      isHitMine = false;
    } else {
      // 2. Apply Admin Risk Level & Lose Rate % Engine
      const riskModifier =
        activeCfg.riskLevel === 'low'
          ? 0
          : activeCfg.riskLevel === 'medium'
          ? 0.08
          : activeCfg.riskLevel === 'high'
          ? 0.22
          : 0.42; // extreme

      const loseRateRatio = Math.min(1, Math.max(0, (activeCfg.loseRatePercent ?? 25) / 100));
      // Progressive pressure as player reveals more gems
      const streakPressure = gemsRevealed >= 3 ? Math.min(0.35, (gemsRevealed - 2) * 0.08) : 0;
      const trapChance = Math.min(0.96, loseRateRatio * 0.75 + riskModifier + streakPressure);

      if (!isHitMine && hiddenMineIndices.length > 0 && Math.random() < trapChance) {
        isHitMine = true;
      } else if (
        isHitMine &&
        activeCfg.loseRatePercent === 0 &&
        activeCfg.riskLevel === 'low' &&
        hiddenSafeIndices.length > 0 &&
        Math.random() < 0.35
      ) {
        isHitMine = false;
      }
    }

    // Reconcile board mine placement so total mines on board always equals lockedMinesCount
    if (isHitMine && !nextTiles[index].hasMine) {
      // Move a mine from another hidden mine tile to this clicked tile
      const donorMineIdx = hiddenMineIndices.find((i) => i !== index);
      if (donorMineIdx !== undefined) {
        nextTiles[donorMineIdx].hasMine = false;
      }
      nextTiles[index].hasMine = true;
    } else if (!isHitMine && nextTiles[index].hasMine && hiddenSafeIndices.length > 0) {
      // Move the mine from this clicked tile to another hidden safe tile
      const recipientSafeIdx = hiddenSafeIndices.find((i) => i !== index);
      if (recipientSafeIdx !== undefined) {
        nextTiles[recipientSafeIdx].hasMine = true;
        nextTiles[index].hasMine = false;
      } else {
        isHitMine = true;
      }
    }

    if (isHitMine) {
      // Player hit a MINE (Bomb) -> Round Lost
      soundService.playCrash();
      const explodedBoard = nextTiles.map((t) => {
        if (t.index === index) {
          return { ...t, hasMine: true, state: 'exploded' as TileState };
        }
        if (t.state !== 'hidden') return t;
        return {
          ...t,
          state: (t.hasMine ? 'mine' : 'gem') as TileState,
        };
      });

      setTiles(explodedBoard);
      setRoundActive(false);
      setRoundResult('lost');
      setWinPayout(0);

      const rec: BetRecord = {
        id: 'mines_bet_' + Date.now(),
        userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar || '💎',
        roundNumber: roundNonce,
        amount: lockedBetAmount,
        cashoutMultiplier: null,
        crashPoint: calculateMinesMultiplier(lockedMinesCount, gemsRevealed, activeCfg),
        winAmount: 0,
        profit: -lockedBetAmount,
        status: 'lost',
        gameName: `Lanka Mines (${lockedMinesCount} 💣)`,
        timestamp: Date.now(),
      };
      onRecordBetHistory(rec);

      setRecentMinesBets((prev) => [
        {
          id: rec.id,
          mines: lockedMinesCount,
          gems: gemsRevealed,
          bet: lockedBetAmount,
          multiplier: 0,
          win: 0,
          status: 'lost',
          timestamp: Date.now(),
        },
        ...prev.slice(0, 14),
      ]);
      setRoundNonce((n) => n + 1);
      setServerSeed(generateRandomHex(16));
      return;
    }

    // Player revealed a GEM!
    soundService.playBeep(true);
    nextTiles[index].state = 'gem';
    const nextGemsCount = gemsRevealed + 1;
    setTiles(nextTiles);
    setGemsRevealed(nextGemsCount);

    // If all safe gems have been revealed, auto-cashout maximum win!
    if (nextGemsCount >= TOTAL_TILES - lockedMinesCount) {
      executeCashout(nextGemsCount, nextTiles);
    }
  };

  // Pick a random unrevealed tile
  const handlePickRandomTile = () => {
    if (!roundActive) return;
    const available = tiles.filter((t) => t.state === 'hidden');
    if (available.length === 0) return;
    const randomTile = available[Math.floor(Math.random() * available.length)];
    handleTileClick(randomTile.index);
  };

  const handleToggleSound = () => {
    const nextMute = soundService.toggleMute();
    setIsMuted(nextMute);
  };

  const loadingStageInfo =
    loadingProgress < 24
      ? {
          stage: 'STAGE 01 / 04',
          title: 'Unlocking Underground LKR Diamond Vault...',
          detail: 'Initializing high-security 5x5 obsidian chamber',
        }
      : loadingProgress < 52
      ? {
          stage: 'STAGE 02 / 04',
          title: 'Arming Laser Naval Minefield & Sensors...',
          detail: 'Deploying hidden depth charges & emerald caches',
        }
      : loadingProgress < 82
      ? {
          stage: 'STAGE 03 / 04',
          title: 'Calibrating LKR Multiplier Payout Matrix...',
          detail: 'Min Bet Rs. 10 LKR • Instant Vault Cashout Ready',
        }
      : loadingProgress < 100
      ? {
          stage: 'STAGE 04 / 04',
          title: 'Verifying SHA-256 Provably Fair Grid Hash...',
          detail: 'Sealing cryptographic vault locks',
        }
      : {
          stage: 'VAULT READY',
          title: 'Lanka Mines Vault Unlocked!',
          detail: 'Entering 5x5 Emerald Arena...',
        };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-2.5 sm:px-6 py-3 sm:py-5 pb-24 relative select-none">
      {/* =====================================================================
          CREATIVE SLOW-LOADING SCREEN FOR LANKA MINES (4.1s VAULT CALIBRATION)
          ===================================================================== */}
      {isSlowLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030711] overflow-hidden animate-fade-in">
          {/* Layered Atmospheric Vault Background */}
          <div
            className="absolute inset-0 opacity-35 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 25%, rgba(16, 185, 129, 0.32), transparent 55%), radial-gradient(circle at 80% 80%, rgba(245, 158, 11, 0.22), transparent 50%), radial-gradient(circle at 20% 75%, rgba(225, 29, 72, 0.2), transparent 45%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(16,185,129,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.2) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />

          {/* Main Creative Slow-Loading Vault Card */}
          <div className="relative z-10 w-full max-w-[370px] rounded-3xl bg-slate-900/95 border-2 border-emerald-500/60 shadow-[0_0_70px_rgba(16,185,129,0.35)] p-5 sm:p-6 flex flex-col items-center text-center overflow-hidden">
            {/* Top Live & Min Bet Badges */}
            <div className="w-full flex items-center justify-between gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/60 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {onlinePlayersCount} In Vault
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                Min Bet Rs. 10 LKR
              </span>
            </div>

            {/* Animated 5x5 Laser Minefield Preview Artwork */}
            <div className="relative w-52 h-52 rounded-2xl bg-[#050b16] border-2 border-emerald-500/50 p-2.5 shadow-inner mb-4 overflow-hidden">
              {/* Sweeping Horizontal Laser Line */}
              <div
                className="absolute left-0 right-0 h-6 bg-gradient-to-b from-transparent via-emerald-400/35 to-transparent pointer-events-none transition-all duration-300 z-20"
                style={{ top: `${scannerRow * 20}%` }}
              />

              <div className="grid grid-cols-5 gap-1.5 w-full h-full relative z-10">
                {Array.from({ length: 25 }).map((_, idx) => {
                  const row = Math.floor(idx / 5);
                  const isScanned = row === scannerRow;
                  const isBombPreview = idx === 6 || idx === 13 || idx === 18 || idx === 21;
                  const isGemPreview =
                    idx === 2 || idx === 7 || idx === 11 || idx === 12 || idx === 16 || idx === 23;
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border flex items-center justify-center transition-all duration-300 ${
                        isScanned
                          ? isBombPreview
                            ? 'bg-rose-950/90 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] scale-105'
                            : 'bg-emerald-950/90 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-105'
                          : 'bg-slate-900/90 border-slate-800'
                      }`}
                    >
                      {isScanned && isBombPreview ? (
                        <span className="text-sm animate-pulse">💣</span>
                      ) : isScanned || isGemPreview ? (
                        <span
                          className={`text-xs transition-opacity duration-300 ${
                            isScanned ? 'opacity-100 scale-110' : 'opacity-45'
                          }`}
                        >
                          💎
                        </span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Game Title */}
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {loadingStageInfo.stage}
            </div>
            <h2 className="text-xl font-black text-white tracking-wider uppercase">
              LANKA <span className="text-emerald-400">MINES</span>{' '}
              <span className="text-amber-400">LKR</span>
            </h2>
            <p className="text-xs font-bold text-emerald-200 mt-1">{loadingStageInfo.title}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-4">{loadingStageInfo.detail}</p>

            {/* Slow-Loading Progress Bar */}
            <div className="w-full bg-slate-950 border border-emerald-500/40 h-3.5 rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-150 shadow-[0_0_14px_rgba(16,185,129,0.85)]"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>

            <div className="w-full flex items-center justify-between text-[11px] font-mono font-black text-slate-300 mt-2">
              <span className="text-emerald-400">CALIBRATING 5x5 VAULT</span>
              <span className="text-amber-300">{loadingProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TOP NAVIGATION BAR
          ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-2.5 shadow-md">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToLobby}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Lobby</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-950/60 border border-emerald-400/50">
              <span className="text-base">💎</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-white text-sm sm:text-base tracking-wide uppercase">
                  Lanka Mines
                </h1>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[9px] uppercase">
                  LKR
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Min Bet Rs. {minesConfig.minBet.toLocaleString()} LKR • 5x5 Diamond &amp; Bomb Grid
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 text-[11px] font-black flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Users className="w-3.5 h-3.5" />
            <span>{onlinePlayersCount} Online</span>
          </div>

          <div className="px-3 py-1 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-mono font-black text-white">
              Rs. {currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleSound}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* =====================================================================
          MULTIPLIER LADDER STRIP (LIVE LKR PAYOUTS FOR EACH REVEALED GEM)
          ===================================================================== */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 mb-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          <div className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5 shrink-0">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Payout Ladder ({activeMinesCount} Mines)</span>
          </div>
          {multiplierLadder.slice(0, 14).map((step) => {
            const isCurrent = roundActive && gemsRevealed === step.gems;
            const isNext = roundActive && gemsRevealed + 1 === step.gems;
            const isPassed = roundActive && gemsRevealed > step.gems;
            return (
              <div
                key={step.gems}
                className={`px-2.5 py-1 rounded-xl border text-center transition shrink-0 ${
                  isCurrent
                    ? 'bg-emerald-500/25 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)] scale-105'
                    : isNext
                    ? 'bg-amber-500/15 border-amber-400/60 text-amber-200'
                    : isPassed
                    ? 'bg-slate-950/60 border-emerald-500/30 text-emerald-400/70'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="text-[9px] font-bold uppercase text-slate-400">
                  {step.gems} {step.gems === 1 ? 'Gem' : 'Gems'}
                </div>
                <div className="text-xs font-mono font-black text-emerald-400">
                  {step.multiplier.toFixed(2)}x
                </div>
                <div className="text-[9px] font-mono text-amber-300">
                  Rs. {step.payout.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          MAIN ARENA: LEFT CONTROLS PANEL + RIGHT 5x5 VAULT GRID
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: BETTING & MINES CONTROLS (LKR) */}
        <div className="lg:col-span-5 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl order-2 lg:order-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              {errorMsg.toLowerCase().includes('balance') && (
                <button
                  type="button"
                  onClick={() => onOpenCashier('deposit')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px] uppercase shrink-0 cursor-pointer"
                >
                  Deposit LKR
                </button>
              )}
            </div>
          )}

          {/* Bet Amount Input in LKR (Min Bet Rs. 10) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-200 uppercase tracking-wider">
                Bet Amount (LKR)
              </label>
              <span className="text-[11px] font-mono font-bold text-emerald-400">
                Min: Rs. {minesConfig.minBet.toLocaleString()} LKR
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl p-1.5 focus-within:border-emerald-500 transition">
              <span className="pl-2.5 pr-1 font-mono font-black text-amber-400 text-sm">
                Rs.
              </span>
              <input
                type="number"
                min={minesConfig.minBet || 10}
                max={minesConfig.maxBet || 50000}
                step="10"
                disabled={roundActive}
                value={betInputText}
                onChange={(e) => handleBetInputChange(e.target.value)}
                onBlur={() => clampBetAmount(betAmount)}
                className="flex-1 bg-transparent text-white font-mono font-black text-base focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                disabled={roundActive}
                onClick={() => clampBetAmount(Math.max(10, Math.floor(betAmount / 2)))}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-mono font-black text-xs cursor-pointer"
              >
                1/2
              </button>
              <button
                type="button"
                disabled={roundActive}
                onClick={() => clampBetAmount(betAmount * 2)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-mono font-black text-xs cursor-pointer"
              >
                2x
              </button>
              <button
                type="button"
                disabled={roundActive}
                onClick={() => clampBetAmount(Math.max(10, Math.floor(currentUser.balance)))}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 disabled:opacity-40 text-amber-300 font-mono font-black text-xs cursor-pointer"
              >
                MAX
              </button>
            </div>

            {/* Quick LKR Bet Chips starting from Rs. 10 */}
            <div className="grid grid-cols-6 gap-1.5">
              {[10, 20, 50, 100, 500, 1000].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={roundActive}
                  onClick={() => clampBetAmount(chip)}
                  className={`py-1.5 rounded-lg font-mono font-black text-[11px] border transition cursor-pointer disabled:opacity-40 ${
                    betAmount === chip
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  Rs.{chip}
                </button>
              ))}
            </div>
          </div>

          {/* Number of Mines Selector (1 to 24 Bombs) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>💣 Mines Count</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-rose-400">
                {minesCount} {minesCount === 1 ? 'Mine' : 'Mines'} • {TOTAL_TILES - minesCount} Gems
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 5, 7, 10, 15, 20, 24].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  disabled={roundActive}
                  onClick={() => setMinesCount(cnt)}
                  className={`py-1.5 rounded-lg font-mono font-black text-xs border transition cursor-pointer disabled:opacity-40 ${
                    minesCount === cnt
                      ? 'bg-rose-600/30 border-rose-400 text-rose-200 shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {cnt} 💣
                </button>
              ))}
              <select
                disabled={roundActive}
                value={minesCount}
                onChange={(e) => setMinesCount(parseInt(e.target.value, 10))}
                className="bg-slate-950 border border-slate-700 rounded-lg px-1.5 py-1.5 text-xs font-mono font-black text-amber-300 focus:outline-none disabled:opacity-40 cursor-pointer"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Round Status Metrics */}
          <div className="grid grid-cols-2 gap-2.5 bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Current Multiplier
              </span>
              <span className="text-lg font-mono font-black text-emerald-400">
                {currentMultiplier.toFixed(2)}x
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">
                Next Tile: <strong className="text-amber-300">{nextStepMultiplier.toFixed(2)}x</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Current Cashout (LKR)
              </span>
              <span className="text-lg font-mono font-black text-amber-400">
                Rs. {currentCashoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">
                Gems Found: <strong className="text-emerald-300">{gemsRevealed}/{TOTAL_TILES - activeMinesCount}</strong>
              </span>
            </div>
          </div>

          {/* Primary Action Buttons: BET vs CASHOUT + PICK RANDOM TILE */}
          {!roundActive ? (
            <button
              type="button"
              onClick={handleStartGame}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-sm sm:text-base tracking-wide uppercase shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
            >
              <Zap className="w-5 h-5 fill-slate-950" />
              <span>START GAME • Rs. {betAmount.toLocaleString()} LKR</span>
            </button>
          ) : (
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={gemsRevealed === 0}
                onClick={() => executeCashout(gemsRevealed, tiles)}
                className={`w-full py-3.5 rounded-2xl font-black text-sm sm:text-base tracking-wide uppercase flex items-center justify-center gap-2 transition cursor-pointer ${
                  gemsRevealed > 0
                    ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-pulse'
                    : 'bg-slate-800 border border-slate-700 text-slate-400 opacity-60 cursor-not-allowed'
                }`}
              >
                <Wallet className="w-5 h-5" />
                <span>
                  {gemsRevealed > 0
                    ? `CASHOUT Rs. ${currentCashoutAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} LKR (${currentMultiplier.toFixed(2)}x)`
                    : 'CLICK A TILE TO REVEAL GEM 💎'}
                </span>
              </button>

              <button
                type="button"
                onClick={handlePickRandomTile}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Shuffle className="w-4 h-4" />
                <span>Pick Random Safe Tile</span>
              </button>
            </div>
          )}

          {/* Provably Fair Verification Footer inside Controls */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              SHA-256 Provably Fair
            </span>
            <span className="font-mono">
              Round #{roundNonce} • {serverSeedHash ? `${serverSeedHash.slice(0, 10)}...` : 'Ready'}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: 5x5 INTERACTIVE DIAMOND & MINE VAULT GRID */}
        <div className="lg:col-span-7 bg-slate-900/95 border border-slate-800 rounded-3xl p-3.5 sm:p-6 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden order-1 lg:order-2 canvas-arena-dark">
          {/* Ambient Vault Glow */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage:
                roundResult === 'lost'
                  ? 'radial-gradient(circle at 50% 50%, rgba(244, 63, 94, 0.35), transparent 65%)'
                  : roundResult === 'won'
                  ? 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.35), transparent 65%)'
                  : 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.25), transparent 65%)',
            }}
          />

          {/* Top Arena Status Banner */}
          <div className="w-full max-w-[440px] flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-emerald-500/40 text-emerald-300 font-black text-xs flex items-center gap-1">
                💎 {TOTAL_TILES - activeMinesCount} Gems
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-rose-500/40 text-rose-300 font-black text-xs flex items-center gap-1">
                💣 {activeMinesCount} Mines
              </span>
            </div>

            <div className="text-right">
              {roundActive ? (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-xs uppercase animate-pulse">
                  Pick a Vault Tile
                </span>
              ) : roundResult === 'won' ? (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/25 border border-amber-400 text-amber-300 font-black text-xs uppercase">
                  Won Rs. {winPayout.toLocaleString()} LKR ({cashoutMultiplier.toFixed(2)}x)
                </span>
              ) : roundResult === 'lost' ? (
                <span className="px-2.5 py-1 rounded-lg bg-rose-600/30 border border-rose-500 text-rose-300 font-black text-xs uppercase">
                  💥 Mine Detonated!
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 font-bold text-xs">
                  Ready to Bet (Min Rs. 10)
                </span>
              )}
            </div>
          </div>

          {/* 5x5 Vault Grid */}
          <div className="w-full max-w-[440px] aspect-square grid grid-cols-5 gap-2 sm:gap-3 relative z-10">
            {tiles.map((tile) => {
              const isHidden = tile.state === 'hidden';
              const isGem = tile.state === 'gem';
              const isMine = tile.state === 'mine';
              const isExploded = tile.state === 'exploded';
              const isPostRoundUnclicked =
                !roundActive && roundResult !== 'none' && tile.state !== 'exploded';

              return (
                <button
                  key={tile.index}
                  type="button"
                  disabled={!roundActive || !isHidden}
                  onClick={() => handleTileClick(tile.index)}
                  className={`group relative rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-200 select-none overflow-hidden ${
                    isHidden
                      ? roundActive
                        ? 'bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-slate-700 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 cursor-pointer active:scale-95'
                        : 'bg-gradient-to-b from-slate-800/90 to-slate-950 border-slate-800/90 cursor-default'
                      : isExploded
                      ? 'bg-gradient-to-b from-rose-600 via-rose-800 to-rose-950 border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.8)] scale-105'
                      : isMine
                      ? 'bg-gradient-to-b from-rose-950/90 to-slate-950 border-rose-500/50 opacity-75'
                      : isGem
                      ? isPostRoundUnclicked && !roundActive && gemsRevealed === 0
                        ? 'bg-gradient-to-b from-emerald-950/60 to-slate-950 border-emerald-500/30 opacity-55'
                        : 'bg-gradient-to-b from-emerald-900/90 via-emerald-950 to-slate-950 border-emerald-400 shadow-[0_0_22px_rgba(16,185,129,0.45)]'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  {isHidden ? (
                    <>
                      {/* Sleek 3D Vault Lock Emblem on Hidden Tile */}
                      <div
                        className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-all ${
                          roundActive
                            ? 'bg-slate-950/80 border-slate-700 group-hover:border-emerald-400/70 group-hover:bg-emerald-950/40'
                            : 'bg-slate-950/50 border-slate-800/80'
                        }`}
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full transition-all ${
                            roundActive
                              ? 'bg-emerald-400/60 group-hover:bg-emerald-400 group-hover:scale-125 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                              : 'bg-slate-700'
                          }`}
                        />
                      </div>
                    </>
                  ) : isGem ? (
                    <div className="flex flex-col items-center justify-center animate-fade-in">
                      {/* Bespoke Faceted Emerald Gem SVG */}
                      <svg
                        viewBox="0 0 64 64"
                        className="w-8 h-8 sm:w-11 sm:h-11 drop-shadow-[0_0_10px_rgba(52,211,153,0.85)]"
                      >
                        <polygon
                          points="18,10 46,10 58,24 32,56 6,24"
                          fill="url(#emeraldGrad)"
                          stroke="#6ee7b7"
                          strokeWidth="2.5"
                        />
                        <polygon
                          points="18,10 46,10 40,24 24,24"
                          fill="#a7f3d0"
                          fillOpacity="0.65"
                        />
                        <polygon
                          points="24,24 40,24 32,56"
                          fill="#10b981"
                          fillOpacity="0.85"
                        />
                        <defs>
                          <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6ee7b7" />
                            <stop offset="50%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#047857" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center animate-fade-in">
                      {/* Spiked Naval Mine SVG */}
                      <svg
                        viewBox="0 0 64 64"
                        className={`w-8 h-8 sm:w-11 sm:h-11 ${
                          isExploded
                            ? 'drop-shadow-[0_0_14px_rgba(251,113,133,1)] animate-bounce'
                            : 'drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                        }`}
                      >
                        {/* Mine Spikes */}
                        <line x1="32" y1="4" x2="32" y2="60" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" />
                        <line x1="4" y1="32" x2="60" y2="32" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" />
                        <line x1="12" y1="12" x2="52" y2="52" stroke="#fb7185" strokeWidth="4" strokeLinecap="round" />
                        <line x1="52" y1="12" x2="12" y2="52" stroke="#fb7185" strokeWidth="4" strokeLinecap="round" />
                        {/* Mine Core Sphere */}
                        <circle
                          cx="32"
                          cy="32"
                          r="17"
                          fill="#1e293b"
                          stroke={isExploded ? '#fda4af' : '#f43f5e'}
                          strokeWidth="3"
                        />
                        {/* Glowing Red Detonator Core */}
                        <circle
                          cx="32"
                          cy="32"
                          r="6.5"
                          fill={isExploded ? '#fef08a' : '#ef4444'}
                        />
                      </svg>
                      {isExploded && (
                        <span className="text-[9px] font-black text-amber-200 uppercase tracking-tighter -mt-1">
                          BOOM!
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Win Celebration Overlay Banner */}
          {!roundActive && roundResult === 'won' && winPayout > 0 && (
            <div className="mt-4 w-full max-w-[440px] rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-950 to-amber-950 border-2 border-amber-400/80 p-3.5 flex items-center justify-between shadow-[0_0_30px_rgba(245,158,11,0.3)] animate-fade-in">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                  🎉 Vault Cashout Successful!
                </span>
                <span className="text-lg font-mono font-black text-white">
                  +Rs. {winPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} LKR
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-mono font-black text-sm">
                {cashoutMultiplier.toFixed(2)}x WIN
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          RECENT LANKA MINES BET HISTORY TABLE (LKR)
          ===================================================================== */}
      {recentMinesBets.length > 0 && (
        <div className="mt-5 bg-slate-900/95 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-emerald-400" />
            Your Recent Lanka Mines Rounds (LKR)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400 font-black">
                  <th className="py-2 px-2.5">Config</th>
                  <th className="py-2 px-2.5">Gems Found</th>
                  <th className="py-2 px-2.5">Bet (LKR)</th>
                  <th className="py-2 px-2.5">Multiplier</th>
                  <th className="py-2 px-2.5 text-right">Payout (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {recentMinesBets.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-2.5 font-bold text-rose-300">{b.mines} 💣 Mines</td>
                    <td className="py-2 px-2.5 font-bold text-emerald-300">{b.gems} 💎 Gems</td>
                    <td className="py-2 px-2.5 font-mono text-slate-200">
                      Rs. {b.bet.toLocaleString()}
                    </td>
                    <td className="py-2 px-2.5 font-mono font-black">
                      {b.status === 'won' ? (
                        <span className="text-emerald-400">{b.multiplier.toFixed(2)}x</span>
                      ) : (
                        <span className="text-rose-400">BOOM 💥</span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 font-mono font-black text-right">
                      {b.status === 'won' ? (
                        <span className="text-amber-400">+Rs. {b.win.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-500">-Rs. {b.bet.toLocaleString()}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
