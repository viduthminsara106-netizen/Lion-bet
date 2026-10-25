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
  // Fast & Skippable Creative Intro Screen (~1.3 seconds or instant click-to-skip)
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
  const [lastRevealedIndex, setLastRevealedIndex] = useState<number | null>(null);
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

  // Periodically sync AdminSettings from server in background (non-blocking)
  useEffect(() => {
    let active = true;
    const syncSettings = async () => {
      try {
        const latest = await syncAdminSettingsWithServer();
        if (active && latest) {
          setLiveSettings(latest);
        }
      } catch {}
    };
    syncSettings();
    const interval = setInterval(syncSettings, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Fast Creative Loading Screen Animation (~1.3s or instant skip)
  useEffect(() => {
    if (!isSlowLoading) return;
    setLoadingProgress(0);
    const durationMs = 1350;
    const startTime = performance.now();
    let rafId: number;

    const scanTimer = setInterval(() => {
      setScannerRow((prev) => (prev + 1) % 5);
    }, 180);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const rawRatio = Math.min(1, elapsed / durationMs);
      const pct = Math.min(100, Math.floor(rawRatio * 100));
      setLoadingProgress(pct);

      if (rawRatio < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setIsSlowLoading(false);
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

  // Safe tile probability % for next click
  const nextClickSafeChance = useMemo(() => {
    const remainingTiles = Math.max(1, TOTAL_TILES - (roundActive ? gemsRevealed : 0));
    const remainingSafe = Math.max(0, maxSafeGems - (roundActive ? gemsRevealed : 0));
    return Math.min(99, Math.max(4, Math.round((remainingSafe / remainingTiles) * 100)));
  }, [roundActive, gemsRevealed, maxSafeGems]);

  // Treasure Chest Streak Tier
  const streakChestInfo = useMemo(() => {
    if (gemsRevealed >= 8) {
      return {
        label: '👑 Royal Diamond Vault',
        badge: 'MEGA STREAK',
        color: 'text-amber-300 border-amber-400 bg-amber-500/20',
      };
    }
    if (gemsRevealed >= 5) {
      return {
        label: '🥇 Gold Treasure Chest',
        badge: 'HOT STREAK',
        color: 'text-yellow-300 border-yellow-400/70 bg-yellow-500/15',
      };
    }
    if (gemsRevealed >= 2) {
      return {
        label: '🥈 Silver Gem Chest',
        badge: 'STREAK ACTIVE',
        color: 'text-sky-300 border-sky-400/60 bg-sky-500/15',
      };
    }
    return {
      label: '🥉 Find Safe Tiles',
      badge: 'SMALL BETS • BIG WINS',
      color: 'text-blue-300 border-blue-500/40 bg-blue-950/60',
    };
  }, [gemsRevealed]);

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

  // Finish round on Cashout
  const executeCashout = useCallback(
    (finalGemsCount: number, boardSnapshot: MinesTile[], stakeOverride?: number, minesOverride?: number) => {
      const effMines = minesOverride ?? lockedMinesCount;
      const effStake = stakeOverride ?? lockedBetAmount;
      const mult = calculateMinesMultiplier(effMines, finalGemsCount, minesConfig);
      const payout = Number((effStake * mult).toFixed(2));
      const profit = Number((payout - effStake).toFixed(2));

      soundService.playCashout(true);
      if (mult >= 1.5) {
        try {
          confetti({
            particleCount: 60,
            spread: 70,
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

      onCreditWin(payout, effStake, mult);

      const rec: BetRecord = {
        id: 'mines_bet_' + Date.now(),
        userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar || '💎',
        roundNumber: roundNonce,
        amount: effStake,
        cashoutMultiplier: mult,
        crashPoint: mult,
        winAmount: payout,
        profit,
        status: 'won',
        gameName: `Mines (${effMines} 💣)`,
        timestamp: Date.now(),
      };
      onRecordBetHistory(rec);

      setRecentMinesBets((prev) => [
        {
          id: rec.id,
          mines: effMines,
          gems: finalGemsCount,
          bet: effStake,
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

  // Core tile reveal engine that works on both an active board and a freshly auto-started board
  const revealTileOnBoard = (
    index: number,
    currentBoard: MinesTile[],
    currentGemsCount: number,
    stakeAmount: number,
    roundMinesCount: number
  ) => {
    const clickedTile = currentBoard[index];
    if (!clickedTile || clickedTile.state !== 'hidden') return;

    const latestLocalSettings = getAdminSettings();
    const activeCfg: MinesGameEngineConfig = {
      ...DEFAULT_MINES_CONFIG,
      ...(minesConfig || {}),
      ...(latestLocalSettings.minesConfig || {}),
    };

    const nextTiles = currentBoard.map((t) => ({ ...t }));
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
    } else if (activeCfg.firstClickSafe && currentGemsCount === 0 && hiddenSafeIndices.length > 0) {
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
          : 0.42;

      const loseRateRatio = Math.min(1, Math.max(0, (activeCfg.loseRatePercent ?? 25) / 100));
      const streakPressure =
        currentGemsCount >= 3 ? Math.min(0.35, (currentGemsCount - 2) * 0.08) : 0;
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

    // Reconcile board mine placement so total mines on board always equals roundMinesCount
    if (isHitMine && !nextTiles[index].hasMine) {
      const donorMineIdx = hiddenMineIndices.find((i) => i !== index);
      if (donorMineIdx !== undefined) {
        nextTiles[donorMineIdx].hasMine = false;
      }
      nextTiles[index].hasMine = true;
    } else if (!isHitMine && nextTiles[index].hasMine && hiddenSafeIndices.length > 0) {
      const recipientSafeIdx = hiddenSafeIndices.find((i) => i !== index);
      if (recipientSafeIdx !== undefined) {
        nextTiles[recipientSafeIdx].hasMine = true;
        nextTiles[index].hasMine = false;
      } else {
        isHitMine = true;
      }
    }

    setLastRevealedIndex(index);

    if (isHitMine) {
      // Player hit a SKULL MINE -> Round Lost
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
        amount: stakeAmount,
        cashoutMultiplier: null,
        crashPoint: calculateMinesMultiplier(roundMinesCount, currentGemsCount, activeCfg),
        winAmount: 0,
        profit: -stakeAmount,
        status: 'lost',
        gameName: `Mines (${roundMinesCount} 💣)`,
        timestamp: Date.now(),
      };
      onRecordBetHistory(rec);

      setRecentMinesBets((prev) => [
        {
          id: rec.id,
          mines: roundMinesCount,
          gems: currentGemsCount,
          bet: stakeAmount,
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

    // Player revealed a GOLDEN DIAMOND!
    soundService.playBeep(true);
    nextTiles[index].state = 'gem';
    const nextGemsCount = currentGemsCount + 1;
    setTiles(nextTiles);
    setGemsRevealed(nextGemsCount);

    // If all safe gems have been revealed, auto-cashout maximum win!
    if (nextGemsCount >= TOTAL_TILES - roundMinesCount) {
      executeCashout(nextGemsCount, nextTiles, stakeAmount, roundMinesCount);
    }
  };

  // Synchronous, zero-lag round starter (optionally reveals an initial clicked tile immediately!)
  const startNewRoundSync = (autoRevealTileIndex?: number): boolean => {
    setErrorMsg(null);

    // Trigger non-blocking server sync in background
    syncAdminSettingsWithServer()
      .then((latest) => {
        if (latest) setLiveSettings(latest);
      })
      .catch(() => {});

    const latestLocal = getAdminSettings();
    const activeCfg = {
      ...DEFAULT_MINES_CONFIG,
      ...(minesConfig || {}),
      ...(latestLocal.minesConfig || {}),
      minBet: Math.max(10, latestLocal.minesConfig?.minBet ?? minesConfig.minBet ?? 10),
    };

    if (activeCfg.isGamePaused) {
      setErrorMsg('Mines game is temporarily paused by Administrator.');
      return false;
    }

    const minAllowed = Math.max(10, activeCfg.minBet || 10);
    const maxAllowed = Math.max(minAllowed, activeCfg.maxBet || 50000);
    const parsedInput = parseFloat(betInputText);
    const rawBet = !isNaN(parsedInput) && parsedInput > 0 ? parsedInput : betAmount;
    const cleanBet = Number(rawBet.toFixed(2));

    if (isNaN(cleanBet) || cleanBet < minAllowed) {
      setErrorMsg(`Minimum bet is Rs. ${minAllowed.toLocaleString()} LKR.`);
      clampBetAmount(minAllowed);
      return false;
    }
    if (cleanBet > maxAllowed) {
      setErrorMsg(`Maximum bet is Rs. ${maxAllowed.toLocaleString()} LKR.`);
      clampBetAmount(maxAllowed);
      return false;
    }
    if (cleanBet > currentUser.balance) {
      setErrorMsg('Insufficient LKR balance. Please deposit to play.');
      return false;
    }

    const deducted = onPlaceBetDeduction(cleanBet);
    if (!deducted) {
      setErrorMsg('Unable to place bet. Check your LKR wallet balance.');
      return false;
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
    setBetAmount(cleanBet);
    setBetInputText(String(cleanBet));
    setLockedBetAmount(cleanBet);
    setLockedMinesCount(minesCount);
    setTiles(freshTiles);
    setGemsRevealed(0);
    setLastRevealedIndex(null);
    setWinPayout(0);
    setCashoutMultiplier(1.0);
    setRoundResult('none');
    setRoundActive(true);

    // If the user clicked directly on a tile to start the game, immediately reveal that tile!
    if (typeof autoRevealTileIndex === 'number' && autoRevealTileIndex >= 0 && autoRevealTileIndex < TOTAL_TILES) {
      revealTileOnBoard(autoRevealTileIndex, freshTiles, 0, cleanBet, minesCount);
    }

    return true;
  };

  const handleStartGame = () => {
    startNewRoundSync();
  };

  // Handle clicking any tile on the 5x5 grid (works even when !roundActive by auto-starting!)
  const handleTileClick = (index: number) => {
    if (!roundActive) {
      startNewRoundSync(index);
      return;
    }
    revealTileOnBoard(index, tiles, gemsRevealed, lockedBetAmount, lockedMinesCount);
  };

  // Pick a random unrevealed tile (auto-starts round if not active!)
  const handlePickRandomTile = () => {
    if (!roundActive) {
      const randIdx = Math.floor(Math.random() * TOTAL_TILES);
      startNewRoundSync(randIdx);
      return;
    }
    const available = tiles.filter((t) => t.state === 'hidden');
    if (available.length === 0) return;
    const randomTile = available[Math.floor(Math.random() * available.length)];
    revealTileOnBoard(randomTile.index, tiles, gemsRevealed, lockedBetAmount, lockedMinesCount);
  };

  // Creative Pattern Helper: Pick from a specific pattern of tiles (e.g., Corners, Center Cross, Diamond Ring)
  const handlePickPatternTile = (patternIndices: number[]) => {
    if (!roundActive) {
      const pick = patternIndices[Math.floor(Math.random() * patternIndices.length)];
      startNewRoundSync(pick);
      return;
    }
    const availableInPattern = tiles.filter(
      (t) => t.state === 'hidden' && patternIndices.includes(t.index)
    );
    const pool =
      availableInPattern.length > 0
        ? availableInPattern
        : tiles.filter((t) => t.state === 'hidden');
    if (pool.length === 0) return;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    revealTileOnBoard(chosen.index, tiles, gemsRevealed, lockedBetAmount, lockedMinesCount);
  };

  const handleToggleSound = () => {
    const nextMute = soundService.toggleMute();
    setIsMuted(nextMute);
  };

  const loadingStageInfo =
    loadingProgress < 35
      ? {
          stage: 'STAGE 01 / 03',
          title: 'Unlocking 5x5 Diamond & Skull Bomb Cavern...',
          detail: 'Small Bets • Big Wins • Find The Safe Tiles',
        }
      : loadingProgress < 75
      ? {
          stage: 'STAGE 02 / 03',
          title: 'Polishing Golden Diamonds & Arming Skull Bombs...',
          detail: 'Min Bet Rs. 10 LKR • Instant Cashout Ready',
        }
      : {
          stage: 'ARENA READY',
          title: 'Mines Arena Unlocked!',
          detail: 'Tap any Star Tile to reveal Golden Diamonds...',
        };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-2.5 sm:px-6 py-3 sm:py-5 pb-24 relative select-none">
      {/* =====================================================================
          FAST & SKIPPABLE MINES INTRO SCREEN
          ===================================================================== */}
      {isSlowLoading && (
        <div
          onClick={() => setIsSlowLoading(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030714]/95 backdrop-blur-md overflow-hidden animate-fade-in cursor-pointer"
        >
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 25%, rgba(245, 158, 11, 0.35), transparent 55%), radial-gradient(circle at 50% 75%, rgba(37, 99, 235, 0.35), transparent 55%)',
            }}
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-[370px] rounded-3xl bg-slate-900/95 border-2 border-amber-500/70 shadow-[0_0_70px_rgba(245,158,11,0.35)] p-5 sm:p-6 flex flex-col items-center text-center overflow-hidden"
          >
            <div className="w-full flex items-center justify-between gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-full bg-blue-950 border border-blue-400/60 text-blue-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {onlinePlayersCount} Playing
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                Small Bets • Big Wins
              </span>
            </div>

            {/* 5x5 Preview Grid with Blue Stars, Golden Diamonds & Skull Bombs */}
            <div className="relative w-48 h-48 rounded-2xl bg-[#061024] border-2 border-amber-500/60 p-2.5 shadow-inner mb-4 overflow-hidden">
              <div
                className="absolute left-0 right-0 h-6 bg-gradient-to-b from-transparent via-amber-400/35 to-transparent pointer-events-none transition-all duration-200 z-20"
                style={{ top: `${scannerRow * 20}%` }}
              />
              <div className="grid grid-cols-5 gap-1.5 w-full h-full relative z-10">
                {Array.from({ length: 25 }).map((_, idx) => {
                  const row = Math.floor(idx / 5);
                  const isScanned = row === scannerRow;
                  const isBombPreview = idx === 3 || idx === 11 || idx === 18;
                  const isGemPreview =
                    idx === 1 || idx === 5 || idx === 7 || idx === 12 || idx === 16 || idx === 22;
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border flex items-center justify-center transition-all duration-200 ${
                        isScanned && isBombPreview
                          ? 'bg-rose-950/90 border-rose-400 scale-105'
                          : isScanned || isGemPreview
                          ? 'bg-amber-500/30 border-amber-400 scale-105'
                          : 'bg-blue-900/70 border-blue-500/50'
                      }`}
                    >
                      {isScanned && isBombPreview ? (
                        <span className="text-xs">💀</span>
                      ) : isScanned || isGemPreview ? (
                        <span className="text-xs">💎</span>
                      ) : (
                        <span className="text-[10px] text-blue-300">★</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-widest mb-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {loadingStageInfo.stage}
            </div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 tracking-wider uppercase">
              MINES
            </h2>
            <p className="text-xs font-bold text-amber-200 mt-1">{loadingStageInfo.title}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-3">{loadingStageInfo.detail}</p>

            <div className="w-full bg-slate-950 border border-amber-500/40 h-3 rounded-full overflow-hidden p-0.5 shadow-inner mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-amber-400 to-yellow-300 transition-all duration-100"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsSlowLoading(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
            >
              ⚡ PLAY MINES NOW
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          TOP NAVIGATION BAR (MINES • SMALL BETS BIG WINS)
          ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-gradient-to-r from-slate-900 via-[#0a1931] to-slate-900 border border-amber-500/40 rounded-2xl px-3.5 py-2.5 shadow-lg">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToLobby}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Lobby</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-700 flex items-center justify-center shadow-md border border-yellow-200/60">
              <span className="text-lg">💣</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 text-base sm:text-lg tracking-wider uppercase">
                  MINES
                </h1>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-[9px] uppercase">
                  FIND THE SAFE TILES
                </span>
              </div>
              <p className="text-[10px] text-blue-200/80 font-medium">
                Small Bets • Big Wins • Tap Any Star Tile to Play Instantly (Min Rs. {minesConfig.minBet.toLocaleString()})
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-blue-950/90 border border-blue-400/40 text-emerald-400 text-[11px] font-black flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Users className="w-3.5 h-3.5" />
            <span>{onlinePlayersCount} Online</span>
          </div>

          <div className="px-3 py-1 rounded-xl bg-slate-950 border border-amber-500/50 flex items-center gap-1.5">
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
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* =====================================================================
          MULTIPLIER LADDER STRIP (LIVE LKR PAYOUTS FOR EACH REVEALED DIAMOND)
          ===================================================================== */}
      <div className="bg-slate-900/95 border border-blue-500/30 rounded-2xl p-2.5 mb-3 overflow-x-auto no-scrollbar shadow-md">
        <div className="flex items-center gap-2 min-w-max">
          <div className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-amber-500/40 text-[10px] font-black uppercase text-amber-300 flex items-center gap-1.5 shrink-0">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Diamond Payouts ({activeMinesCount} 💀)</span>
          </div>
          {multiplierLadder.slice(0, 14).map((step) => {
            const isCurrent = roundActive && gemsRevealed === step.gems;
            const isNext = (roundActive ? gemsRevealed + 1 : 1) === step.gems;
            const isPassed = roundActive && gemsRevealed > step.gems;
            return (
              <div
                key={step.gems}
                className={`px-2.5 py-1 rounded-xl border text-center transition shrink-0 ${
                  isCurrent
                    ? 'bg-amber-500/30 border-amber-300 text-white shadow-[0_0_14px_rgba(245,158,11,0.5)] scale-105'
                    : isNext
                    ? 'bg-blue-600/25 border-blue-400 text-amber-200'
                    : isPassed
                    ? 'bg-slate-950/60 border-amber-500/30 text-amber-400/70'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="text-[9px] font-bold uppercase text-slate-400">
                  {step.gems} 💎
                </div>
                <div className="text-xs font-mono font-black text-amber-400">
                  {step.multiplier.toFixed(2)}x
                </div>
                <div className="text-[9px] font-mono text-emerald-300">
                  Rs. {step.payout.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          MAIN ARENA: LEFT CONTROLS PANEL + RIGHT 5x5 ROYAL-BLUE & GOLD BOARD
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: BETTING, MINES COUNT & CREATIVE PATTERN HELPERS */}
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
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[10px] uppercase shrink-0 cursor-pointer"
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
              <span className="text-[11px] font-mono font-bold text-amber-400">
                Min: Rs. {minesConfig.minBet.toLocaleString()} LKR
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl p-1.5 focus-within:border-amber-400 transition">
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
                      ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  Rs.{chip}
                </button>
              ))}
            </div>
          </div>

          {/* Number of Skull Mines Selector (1 to 24 Bombs) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>💀 Skull Mines Count</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-rose-400">
                {minesCount} {minesCount === 1 ? 'Mine' : 'Mines'} • {TOTAL_TILES - minesCount} Diamonds
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
                  {cnt} 💀
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

          {/* Creative Quick-Pick Tile Pattern Helpers */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">
                ⚡ Creative Quick-Pick Patterns
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                {nextClickSafeChance}% Safe Odds
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={handlePickRandomTile}
                className="py-2 px-2 rounded-xl bg-blue-950/80 hover:bg-blue-900/80 border border-blue-500/40 text-blue-200 font-black text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                <span>Random</span>
              </button>
              <button
                type="button"
                onClick={() => handlePickPatternTile([0, 4, 20, 24])}
                className="py-2 px-2 rounded-xl bg-blue-950/80 hover:bg-blue-900/80 border border-blue-500/40 text-blue-200 font-black text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <span>📐 Corners</span>
              </button>
              <button
                type="button"
                onClick={() => handlePickPatternTile([2, 7, 10, 11, 12, 13, 14, 17, 22])}
                className="py-2 px-2 rounded-xl bg-blue-950/80 hover:bg-blue-900/80 border border-blue-500/40 text-blue-200 font-black text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <span>🎯 Cross</span>
              </button>
            </div>
          </div>

          {/* Live Round Status Metrics */}
          <div className="grid grid-cols-2 gap-2.5 bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Current Multiplier
              </span>
              <span className="text-lg font-mono font-black text-amber-400">
                {currentMultiplier.toFixed(2)}x
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">
                Next Tile: <strong className="text-emerald-300">{nextStepMultiplier.toFixed(2)}x</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Current Cashout (LKR)
              </span>
              <span className="text-lg font-mono font-black text-emerald-400">
                Rs. {currentCashoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">
                Diamonds: <strong className="text-amber-300">{gemsRevealed}/{TOTAL_TILES - activeMinesCount}</strong>
              </span>
            </div>
          </div>

          {/* Primary Action Buttons: START GAME vs CASHOUT */}
          {!roundActive ? (
            <button
              type="button"
              onClick={handleStartGame}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm sm:text-base tracking-wide uppercase shadow-[0_0_25px_rgba(245,158,11,0.45)] flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
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
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.55)] animate-pulse'
                    : 'bg-slate-800 border border-slate-700 text-slate-300 cursor-not-allowed'
                }`}
              >
                <Wallet className="w-5 h-5" />
                <span>
                  {gemsRevealed > 0
                    ? `CASHOUT Rs. ${currentCashoutAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} LKR (${currentMultiplier.toFixed(2)}x)`
                    : 'TAP ANY BLUE STAR TILE ★'}
                </span>
              </button>
            </div>
          )}

          {/* Provably Fair Verification Footer inside Controls */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              SHA-256 Provably Fair
            </span>
            <span className="font-mono">
              Round #{roundNonce} • {serverSeedHash ? `${serverSeedHash.slice(0, 10)}...` : 'Ready'}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: 5x5 ROYAL-BLUE STAR & GOLDEN DIAMOND / SKULL BOMB GRID */}
        <div className="lg:col-span-7 bg-gradient-to-b from-[#0b1933] via-[#071124] to-[#040814] border-2 border-amber-500/50 rounded-3xl p-3.5 sm:p-6 shadow-[0_0_50px_rgba(30,58,138,0.5)] flex flex-col items-center justify-center relative overflow-hidden order-1 lg:order-2">
          {/* Ambient Cavern & Gold Glow */}
          <div
            className="absolute inset-0 pointer-events-none opacity-35"
            style={{
              backgroundImage:
                roundResult === 'lost'
                  ? 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.45), transparent 65%)'
                  : roundResult === 'won'
                  ? 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.45), transparent 65%)'
                  : 'radial-gradient(circle at 50% 35%, rgba(59, 130, 246, 0.35), transparent 65%)',
            }}
          />

          {/* Top Arena Status & Treasure Chest Streak Banner */}
          <div className="w-full max-w-[440px] flex flex-wrap items-center justify-between gap-2 mb-3 relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-amber-400/50 text-amber-300 font-black text-xs flex items-center gap-1 shadow">
                💎 {TOTAL_TILES - activeMinesCount} Diamonds
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-rose-500/50 text-rose-300 font-black text-xs flex items-center gap-1 shadow">
                💀 {activeMinesCount} Bombs
              </span>
            </div>

            <div className={`px-2.5 py-1 rounded-lg border text-xs font-black flex items-center gap-1.5 ${streakChestInfo.color}`}>
              <span>{streakChestInfo.label}</span>
            </div>
          </div>

          {/* 5x5 ROYAL-BLUE STAR & GOLDEN DIAMOND BOARD */}
          <div className="w-full max-w-[440px] aspect-square grid grid-cols-5 gap-2 sm:gap-3 relative z-10 p-2.5 sm:p-3 rounded-2xl bg-[#050c1a] border-2 border-blue-500/40 shadow-inner">
            {tiles.map((tile) => {
              const isHidden = tile.state === 'hidden';
              const isGem = tile.state === 'gem';
              const isMine = tile.state === 'mine';
              const isExploded = tile.state === 'exploded';
              const isPostRoundReveal = !roundActive && roundResult !== 'none' && !isExploded;
              const isLastClicked = lastRevealedIndex === tile.index;

              return (
                <button
                  key={tile.index}
                  type="button"
                  onClick={() => handleTileClick(tile.index)}
                  className={`group relative rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-150 select-none overflow-hidden cursor-pointer active:scale-95 ${
                    isHidden
                      ? 'bg-gradient-to-b from-blue-500 via-blue-700 to-blue-950 border-blue-400/80 hover:border-amber-300 hover:from-blue-500 hover:to-blue-800 shadow-[0_4px_0_#1e3a8a,0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_4px_0_#b45309,0_0_22px_rgba(250,204,21,0.55)] hover:-translate-y-0.5'
                      : isExploded
                      ? 'bg-gradient-to-b from-red-500 via-rose-700 to-red-950 border-yellow-300 shadow-[0_0_30px_rgba(239,68,68,0.9)] scale-105'
                      : isMine
                      ? 'bg-gradient-to-b from-rose-900/85 via-slate-900 to-slate-950 border-rose-500/60 opacity-85 hover:border-amber-400'
                      : isGem
                      ? isPostRoundReveal && !isLastClicked && gemsRevealed === 0
                        ? 'bg-gradient-to-b from-amber-700/40 to-slate-950 border-amber-500/40 opacity-65 hover:opacity-100'
                        : 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-800 border-yellow-200 shadow-[0_4px_0_#78350f,0_0_25px_rgba(245,158,11,0.65)]'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  {isHidden ? (
                    <>
                      {/* Top Bevel Highlight */}
                      <div className="absolute inset-x-1.5 top-1 h-1.5 rounded-full bg-white/25 pointer-events-none" />
                      {/* Embossed 3D Star matching the uploaded MINES cover art */}
                      <span className="text-xl sm:text-2xl text-blue-200 group-hover:text-yellow-300 group-hover:scale-125 transition-transform duration-150 drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]">
                        ★
                      </span>
                    </>
                  ) : isGem ? (
                    <div className="flex flex-col items-center justify-center animate-fade-in">
                      {/* 3D Golden-Yellow Faceted Diamond SVG */}
                      <svg
                        viewBox="0 0 64 64"
                        className="w-8 h-8 sm:w-11 sm:h-11 drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]"
                      >
                        <polygon
                          points="16,12 48,12 58,26 32,56 6,26"
                          fill="#fef08a"
                          stroke="#78350f"
                          strokeWidth="2.5"
                        />
                        <polygon points="16,12 48,12 40,26 24,26" fill="#ffffff" />
                        <polygon points="6,26 16,12 24,26" fill="#fde047" />
                        <polygon points="58,26 48,12 40,26" fill="#f59e0b" />
                        <polygon points="24,26 40,26 32,56" fill="#facc15" />
                        <polygon points="6,26 24,26 32,56" fill="#eab308" fillOpacity="0.85" />
                        <polygon points="58,26 40,26 32,56" fill="#d97706" fillOpacity="0.9" />
                      </svg>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center animate-fade-in">
                      {/* Black Spherical Bomb with White Skull & Burning Fuse SVG */}
                      <svg
                        viewBox="0 0 64 64"
                        className={`w-8 h-8 sm:w-11 sm:h-11 ${
                          isExploded
                            ? 'drop-shadow-[0_0_12px_rgba(254,240,138,1)] animate-bounce'
                            : 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]'
                        }`}
                      >
                        {/* Burning Fuse & Spark */}
                        <path
                          d="M 32 12 Q 44 4 50 12"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <circle cx="51" cy="12" r="5" fill="#f97316" />
                        <circle cx="51" cy="12" r="2.5" fill="#fef08a" />
                        {/* Black Bomb Sphere */}
                        <circle
                          cx="32"
                          cy="35"
                          r="20"
                          fill="#090d16"
                          stroke={isExploded ? '#fde047' : '#475569'}
                          strokeWidth="2.5"
                        />
                        {/* White Skull Emblem on Bomb */}
                        <circle cx="32" cy="33" r="8.5" fill="#f8fafc" />
                        <rect x="28" y="38" width="8" height="5" rx="1" fill="#f8fafc" />
                        <circle cx="29" cy="32" r="2.2" fill="#090d16" />
                        <circle cx="35" cy="32" r="2.2" fill="#090d16" />
                      </svg>
                      {isExploded && (
                        <span className="text-[9px] font-black text-yellow-200 uppercase tracking-tighter -mt-1">
                          BOOM!
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* INSTANT ACTION BAR RIGHT BELOW THE 5x5 GRID (Fixes mobile/desktop click workflow) */}
          <div className="w-full max-w-[440px] mt-3 relative z-10">
            {!roundActive ? (
              <div className="grid grid-cols-12 gap-2">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="col-span-8 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>START GAME (Rs. {betAmount.toLocaleString()})</span>
                </button>
                <button
                  type="button"
                  onClick={handlePickRandomTile}
                  className="col-span-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>1-Tap Play</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-2">
                <button
                  type="button"
                  disabled={gemsRevealed === 0}
                  onClick={() => executeCashout(gemsRevealed, tiles)}
                  className={`col-span-8 py-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    gemsRevealed > 0
                      ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                      : 'bg-slate-800 border border-slate-700 text-slate-300'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span>
                    {gemsRevealed > 0
                      ? `CASHOUT Rs. ${currentCashoutAmount.toLocaleString()} (${currentMultiplier.toFixed(2)}x)`
                      : 'TAP ANY ★ TILE ABOVE'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handlePickRandomTile}
                  className="col-span-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Pick ★</span>
                </button>
              </div>
            )}
          </div>

          {/* Win Celebration Overlay Banner */}
          {!roundActive && roundResult === 'won' && winPayout > 0 && (
            <div className="mt-3 w-full max-w-[440px] rounded-2xl bg-gradient-to-r from-amber-950 via-yellow-900/80 to-emerald-950 border-2 border-amber-400 p-3.5 flex items-center justify-between shadow-[0_0_30px_rgba(245,158,11,0.35)] animate-fade-in">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                  🎉 Diamond Cashout Successful! (Tap any tile to play again)
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
          RECENT MINES BET HISTORY TABLE (LKR)
          ===================================================================== */}
      {recentMinesBets.length > 0 && (
        <div className="mt-5 bg-slate-900/95 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-amber-400" />
            Your Recent Mines Rounds (LKR)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400 font-black">
                  <th className="py-2 px-2.5">Config</th>
                  <th className="py-2 px-2.5">Diamonds Found</th>
                  <th className="py-2 px-2.5">Bet (LKR)</th>
                  <th className="py-2 px-2.5">Multiplier</th>
                  <th className="py-2 px-2.5 text-right">Payout (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {recentMinesBets.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-2.5 font-bold text-rose-300">{b.mines} 💀 Mines</td>
                    <td className="py-2 px-2.5 font-bold text-amber-300">{b.gems} 💎 Diamonds</td>
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

