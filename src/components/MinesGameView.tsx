import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  User,
  BetRecord,
  AdminSettings,
  MinesGameEngineConfig,
} from '../types/game';
import {
  getAdminSettings,
  saveAdminSettings,
  syncAdminSettingsWithServer,
  DEFAULT_MINES_CONFIG,
  getTimeBasedCrashCrowd,
} from '../services/storage';
import { soundService } from '../services/sound';
import { generateRandomHex } from '../services/provablyFair';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  ShieldCheck,
  Zap,
  Wallet,
  Shuffle,
  Trophy,
  History,
  Users,
  AlertTriangle,
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
const MINES_WAVE_STORAGE_KEY = 'lionbet_mines_wave_cycle_v2';

/**
 * Mines Wave Cycle Pattern:
 * 1) 'win_up_1'      -> 4 consecutive WIN rounds (lets player's balance go up first!)
 * 2) 'random_loss'   -> 3 rounds of mixed random loss ([LOSS, WIN, LOSS])
 * 3) 'loss_streak_1' -> 4 consecutive LOSS rounds
 * 4) 'win_streak_2'  -> 3 consecutive WIN rounds
 * 5) 'loss_streak_2' -> 4 consecutive LOSS rounds
 * Then repeats: win_streak_2 -> random_loss -> loss_streak_1 -> win_streak_2 -> loss_streak_2
 */
type MinesWavePhase =
  | 'win_up_1'
  | 'random_loss'
  | 'loss_streak_1'
  | 'win_streak_2'
  | 'loss_streak_2';

interface MinesWaveState {
  phase: MinesWavePhase;
  stepInPhase: number;
  totalRoundsPlayed: number;
}

function loadMinesWaveState(): MinesWaveState {
  try {
    const raw = localStorage.getItem(MINES_WAVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.phase === 'string' && typeof parsed.stepInPhase === 'number') {
        return {
          phase: parsed.phase as MinesWavePhase,
          stepInPhase: parsed.stepInPhase,
          totalRoundsPlayed: Number(parsed.totalRoundsPlayed || 0),
        };
      }
    }
  } catch {}
  return {
    phase: 'win_up_1',
    stepInPhase: 0,
    totalRoundsPlayed: 0,
  };
}

function saveMinesWaveState(state: MinesWaveState): void {
  try {
    localStorage.setItem(MINES_WAVE_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Determines whether the current round in the Wave Cycle is a 'WIN' round (safe diamonds)
 * or a 'LOSS' round (mine trap on click 1 or 2).
 */
function getWaveRoundMode(wave: MinesWaveState): {
  roundOutcomeMode: 'win_round' | 'loss_round';
  safeClicksGuaranteed: number;
  lossBombClickIndex: number; // 0 = first click bomb, 1 = second click bomb
} {
  switch (wave.phase) {
    case 'win_up_1':
      // First 4 rounds: consecutive wins so player's balance goes up!
      return {
        roundOutcomeMode: 'win_round',
        safeClicksGuaranteed: 4,
        lossBombClickIndex: 5,
      };
    case 'random_loss': {
      // 3-step random loss transition: step 0 = LOSS, step 1 = WIN, step 2 = LOSS
      if (wave.stepInPhase === 1) {
        return {
          roundOutcomeMode: 'win_round',
          safeClicksGuaranteed: 3,
          lossBombClickIndex: 4,
        };
      }
      return {
        roundOutcomeMode: 'loss_round',
        safeClicksGuaranteed: wave.stepInPhase === 0 ? 1 : 0, // 1 gem then bomb, or instant bomb
        lossBombClickIndex: wave.stepInPhase === 0 ? 1 : 0,
      };
    }
    case 'loss_streak_1':
      // 4 consecutive losses in a row
      return {
        roundOutcomeMode: 'loss_round',
        safeClicksGuaranteed: 0,
        lossBombClickIndex: 0,
      };
    case 'win_streak_2':
      // Consecutive wins again (3 rounds)
      return {
        roundOutcomeMode: 'win_round',
        safeClicksGuaranteed: 4,
        lossBombClickIndex: 5,
      };
    case 'loss_streak_2':
    default:
      // Consecutive losses again (4 rounds)
      return {
        roundOutcomeMode: 'loss_round',
        safeClicksGuaranteed: 0,
        lossBombClickIndex: 0,
      };
  }
}

function advanceMinesWaveState(current: MinesWaveState): MinesWaveState {
  const nextStep = current.stepInPhase + 1;
  const nextTotal = current.totalRoundsPlayed + 1;

  if (current.phase === 'win_up_1' && nextStep >= 4) {
    return { phase: 'random_loss', stepInPhase: 0, totalRoundsPlayed: nextTotal };
  }
  if (current.phase === 'random_loss' && nextStep >= 3) {
    return { phase: 'loss_streak_1', stepInPhase: 0, totalRoundsPlayed: nextTotal };
  }
  if (current.phase === 'loss_streak_1' && nextStep >= 4) {
    return { phase: 'win_streak_2', stepInPhase: 0, totalRoundsPlayed: nextTotal };
  }
  if (current.phase === 'win_streak_2' && nextStep >= 3) {
    return { phase: 'loss_streak_2', stepInPhase: 0, totalRoundsPlayed: nextTotal };
  }
  if (current.phase === 'loss_streak_2' && nextStep >= 4) {
    // Cycle back to consecutive win -> random loss -> consecutive loss -> consecutive win -> consecutive loss
    return { phase: 'win_streak_2', stepInPhase: 0, totalRoundsPlayed: nextTotal };
  }

  return {
    phase: current.phase,
    stepInPhase: nextStep,
    totalRoundsPlayed: nextTotal,
  };
}

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

// Pre-memoized lightweight SVG icons for zero-lag rendering across 25 tiles
const GoldenDiamondSvg = React.memo(() => (
  <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 pointer-events-none">
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
));

const SkullBombSvg = React.memo(({ isExploded }: { isExploded: boolean }) => (
  <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 pointer-events-none">
    <path
      d="M 32 12 Q 44 4 50 12"
      fill="none"
      stroke="#f59e0b"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <circle cx="51" cy="12" r="5" fill="#f97316" />
    <circle cx="51" cy="12" r="2.5" fill="#fef08a" />
    <circle
      cx="32"
      cy="35"
      r="20"
      fill="#090d16"
      stroke={isExploded ? '#fde047' : '#475569'}
      strokeWidth="2.5"
    />
    <circle cx="32" cy="33" r="8.5" fill="#f8fafc" />
    <rect x="28" y="38" width="8" height="5" rx="1" fill="#f8fafc" />
    <circle cx="29" cy="32" r="2.2" fill="#090d16" />
    <circle cx="35" cy="32" r="2.2" fill="#090d16" />
  </svg>
));

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

  // Synchronous Refs so rapid tile clicks NEVER read stale state or drop clicks
  const roundActiveRef = useRef<boolean>(false);
  const tilesRef = useRef<MinesTile[]>(tiles);
  const gemsRevealedRef = useRef<number>(0);
  const lockedBetAmountRef = useRef<number>(10);
  const lockedMinesCountRef = useRef<number>(3);
  const betAmountRef = useRef<number>(10);
  const betInputTextRef = useRef<string>('10');
  const minesCountRef = useRef<number>(minesConfig.defaultMinesCount || 3);
  const waveStateRef = useRef<MinesWaveState>(loadMinesWaveState());
  const isProcessingClickRef = useRef<boolean>(false);

  useEffect(() => {
    betAmountRef.current = betAmount;
  }, [betAmount]);

  useEffect(() => {
    betInputTextRef.current = betInputText;
  }, [betInputText]);

  useEffect(() => {
    minesCountRef.current = minesCount;
  }, [minesCount]);

  const onlinePlayersCount = useMemo(
    () => Math.max(24, getTimeBasedCrashCrowd().onlineInGame - 9),
    []
  );

  // Sync AdminSettings once on mount (no 3s polling loop that causes lag during gameplay)
  useEffect(() => {
    let active = true;
    syncAdminSettingsWithServer()
      .then((latest) => {
        if (active && latest) {
          setLiveSettings(latest);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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
    betInputTextRef.current = valStr;
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      setBetAmount(parsed);
      betAmountRef.current = parsed;
    }
  };

  const clampBetAmount = (val: number) => {
    const min = Math.max(10, minesConfig.minBet || 10);
    const max = Math.max(min, minesConfig.maxBet || 50000);
    const clamped = Math.min(max, Math.max(min, Math.round(val)));
    setBetAmount(clamped);
    setBetInputText(String(clamped));
    betAmountRef.current = clamped;
    betInputTextRef.current = String(clamped);
  };

  // Finish round on Cashout
  const executeCashout = useCallback(
    (
      finalGemsCount?: number,
      boardSnapshot?: MinesTile[],
      stakeOverride?: number,
      minesOverride?: number
    ) => {
      if (!roundActiveRef.current) return;
      const effGems = finalGemsCount ?? gemsRevealedRef.current;
      if (effGems <= 0) return;

      const effBoard = boardSnapshot ?? tilesRef.current;
      const effMines = minesOverride ?? lockedMinesCountRef.current;
      const effStake = stakeOverride ?? lockedBetAmountRef.current;
      const mult = calculateMinesMultiplier(effMines, effGems, minesConfig);
      const payout = Number((effStake * mult).toFixed(2));
      const profit = Number((payout - effStake).toFixed(2));

      // Lock round immediately via ref so duplicate taps cannot double-cashout
      roundActiveRef.current = false;
      setRoundActive(false);

      // Advance Wave Cycle on round completion
      const nextWave = advanceMinesWaveState(waveStateRef.current);
      waveStateRef.current = nextWave;
      saveMinesWaveState(nextWave);

      soundService.playCashout(true);
      if (mult >= 2.0) {
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.65 },
          });
        } catch {}
      }

      const revealedBoard = effBoard.map((t) => {
        if (t.state !== 'hidden') return t;
        return {
          ...t,
          state: (t.hasMine ? 'mine' : 'gem') as TileState,
        };
      });

      tilesRef.current = revealedBoard;
      setTiles(revealedBoard);
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
          gems: effGems,
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
      minesConfig,
      onCreditWin,
      currentUser.id,
      currentUser.username,
      currentUser.avatar,
      roundNonce,
      onRecordBetHistory,
    ]
  );

  // Core tile reveal engine using synchronous Refs + Adaptive Wave Cycle
  const revealTileOnBoard = (
    index: number,
    currentBoard: MinesTile[],
    currentGemsCount: number,
    stakeAmount: number,
    roundMinesCount: number
  ) => {
    if (index < 0 || index >= TOTAL_TILES) return;
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

    // 1. Check Admin Force Next Click Mine Override first
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
    } else {
      // 2. Apply Mines Wave Cycle:
      //    Initial Win Streak (balance up) -> Random Loss -> Consecutive Loss Streak -> Consecutive Win Streak -> Consecutive Loss Streak
      const wavePlan = getWaveRoundMode(waveStateRef.current);

      if (wavePlan.roundOutcomeMode === 'win_round') {
        // In a WIN streak round: guarantee safe diamonds for the first `safeClicksGuaranteed` clicks
        if (currentGemsCount < wavePlan.safeClicksGuaranteed && hiddenSafeIndices.length > 0) {
          isHitMine = false;
        } else if (currentGemsCount >= 5 && hiddenMineIndices.length > 0 && Math.random() < 0.65) {
          // Prevent infinite clicking in a single round if player gets too greedy (>5 gems)
          isHitMine = true;
        }
      } else {
        // In a LOSS round (Random Loss or Consecutive Loss Streak):
        if (currentGemsCount < wavePlan.safeClicksGuaranteed && hiddenSafeIndices.length > 0) {
          isHitMine = false;
        } else if (currentGemsCount >= wavePlan.lossBombClickIndex && hiddenMineIndices.length > 0) {
          // Force Skull Bomb hit on the target click!
          isHitMine = true;
        }
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
      roundActiveRef.current = false;
      setRoundActive(false);

      // Advance Wave Cycle on round completion
      const nextWave = advanceMinesWaveState(waveStateRef.current);
      waveStateRef.current = nextWave;
      saveMinesWaveState(nextWave);

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

      tilesRef.current = explodedBoard;
      setTiles(explodedBoard);
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

    tilesRef.current = nextTiles;
    gemsRevealedRef.current = nextGemsCount;
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
    const parsedInput = parseFloat(betInputTextRef.current);
    const rawBet = !isNaN(parsedInput) && parsedInput > 0 ? parsedInput : betAmountRef.current;
    const cleanBet = Number(rawBet.toFixed(2));
    const currentMines = minesCountRef.current;

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

    // Generate initial random mine positions (25 tiles, currentMines mines)
    const mineIndices = new Set<number>();
    while (mineIndices.size < currentMines) {
      mineIndices.add(Math.floor(Math.random() * TOTAL_TILES));
    }

    const freshTiles: MinesTile[] = Array.from({ length: TOTAL_TILES }, (_, idx) => ({
      index: idx,
      hasMine: mineIndices.has(idx),
      state: 'hidden',
    }));

    // Update synchronous Refs FIRST so immediate tile reveal works in 0ms
    roundActiveRef.current = true;
    tilesRef.current = freshTiles;
    gemsRevealedRef.current = 0;
    lockedBetAmountRef.current = cleanBet;
    lockedMinesCountRef.current = currentMines;

    soundService.playBeep(false);
    setBetAmount(cleanBet);
    setBetInputText(String(cleanBet));
    setLockedBetAmount(cleanBet);
    setLockedMinesCount(currentMines);
    setTiles(freshTiles);
    setGemsRevealed(0);
    setLastRevealedIndex(null);
    setWinPayout(0);
    setCashoutMultiplier(1.0);
    setRoundResult('none');
    setRoundActive(true);

    // If the user clicked directly on a tile to start the game, immediately reveal that tile!
    if (
      typeof autoRevealTileIndex === 'number' &&
      autoRevealTileIndex >= 0 &&
      autoRevealTileIndex < TOTAL_TILES
    ) {
      revealTileOnBoard(autoRevealTileIndex, freshTiles, 0, cleanBet, currentMines);
    }

    return true;
  };

  const handleStartGame = () => {
    startNewRoundSync();
  };

  // Handle clicking any tile on the 5x5 grid (zero-lag synchronous ref lookup)
  const handleTileClick = (index: number) => {
    if (isProcessingClickRef.current) return;
    isProcessingClickRef.current = true;
    try {
      if (!roundActiveRef.current) {
        startNewRoundSync(index);
        return;
      }
      revealTileOnBoard(
        index,
        tilesRef.current,
        gemsRevealedRef.current,
        lockedBetAmountRef.current,
        lockedMinesCountRef.current
      );
    } finally {
      isProcessingClickRef.current = false;
    }
  };

  // Pick a random unrevealed tile (auto-starts round if not active!)
  const handlePickRandomTile = () => {
    if (!roundActiveRef.current) {
      const randIdx = Math.floor(Math.random() * TOTAL_TILES);
      startNewRoundSync(randIdx);
      return;
    }
    const available = tilesRef.current.filter((t) => t.state === 'hidden');
    if (available.length === 0) return;
    const randomTile = available[Math.floor(Math.random() * available.length)];
    revealTileOnBoard(
      randomTile.index,
      tilesRef.current,
      gemsRevealedRef.current,
      lockedBetAmountRef.current,
      lockedMinesCountRef.current
    );
  };

  // Creative Pattern Helper: Pick from a specific pattern of tiles (e.g., Corners, Center Cross)
  const handlePickPatternTile = (patternIndices: number[]) => {
    if (!roundActiveRef.current) {
      const pick = patternIndices[Math.floor(Math.random() * patternIndices.length)];
      startNewRoundSync(pick);
      return;
    }
    const currentTiles = tilesRef.current;
    const availableInPattern = currentTiles.filter(
      (t) => t.state === 'hidden' && patternIndices.includes(t.index)
    );
    const pool =
      availableInPattern.length > 0
        ? availableInPattern
        : currentTiles.filter((t) => t.state === 'hidden');
    if (pool.length === 0) return;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    revealTileOnBoard(
      chosen.index,
      currentTiles,
      gemsRevealedRef.current,
      lockedBetAmountRef.current,
      lockedMinesCountRef.current
    );
  };

  const handleToggleSound = () => {
    const nextMute = soundService.toggleMute();
    setIsMuted(nextMute);
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-2.5 sm:px-6 py-3 sm:py-5 pb-24 relative select-none">
      {/* =====================================================================
          TOP NAVIGATION BAR (MINES • SMALL BETS BIG WINS)
          ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-gradient-to-r from-slate-900 via-[#0a1931] to-slate-900 border border-amber-500/40 rounded-2xl px-3.5 py-2.5 shadow-lg">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToLobby}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer touch-manipulation"
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
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
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
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer touch-manipulation"
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
                className={`px-2.5 py-1 rounded-xl border text-center shrink-0 ${
                  isCurrent
                    ? 'bg-amber-500/30 border-amber-300 text-white'
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
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[10px] uppercase shrink-0 cursor-pointer touch-manipulation"
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

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl p-1.5 focus-within:border-amber-400">
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
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-mono font-black text-xs cursor-pointer touch-manipulation"
              >
                1/2
              </button>
              <button
                type="button"
                disabled={roundActive}
                onClick={() => clampBetAmount(betAmount * 2)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-mono font-black text-xs cursor-pointer touch-manipulation"
              >
                2x
              </button>
              <button
                type="button"
                disabled={roundActive}
                onClick={() => clampBetAmount(Math.max(10, Math.floor(currentUser.balance)))}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 disabled:opacity-40 text-amber-300 font-mono font-black text-xs cursor-pointer touch-manipulation"
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
                  className={`py-1.5 rounded-lg font-mono font-black text-[11px] border cursor-pointer disabled:opacity-40 touch-manipulation ${
                    betAmount === chip
                      ? 'bg-amber-500/25 border-amber-400 text-amber-300'
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
                  onClick={() => {
                    setMinesCount(cnt);
                    minesCountRef.current = cnt;
                  }}
                  className={`py-1.5 rounded-lg font-mono font-black text-xs border cursor-pointer disabled:opacity-40 touch-manipulation ${
                    minesCount === cnt
                      ? 'bg-rose-600/30 border-rose-400 text-rose-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {cnt} 💀
                </button>
              ))}
              <select
                disabled={roundActive}
                value={minesCount}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setMinesCount(v);
                  minesCountRef.current = v;
                }}
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
                ⚡ Quick-Pick Patterns
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                {nextClickSafeChance}% Safe Odds
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={handlePickRandomTile}
                className="py-2 px-2 rounded-xl bg-blue-950/80 hover:bg-blue-900/80 border border-blue-500/40 text-blue-200 font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer touch-manipulation"
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                <span>Random</span>
              </button>
              <button
                type="button"
                onClick={() => handlePickPatternTile([0, 4, 20, 24])}
                className="py-2 px-2 rounded-xl bg-blue-950/80 hover:bg-blue-900/80 border border-blue-500/40 text-blue-200 font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer touch-manipulation"
              >
                <span>📐 Corners</span>
              </button>
              <button
                type="button"
                onClick={() => handlePickPatternTile([2, 7, 10, 11, 12, 13, 14, 17, 22])}
                className="py-2 px-2 rounded-xl bg-blue-950/80 hover:bg-blue-900/80 border border-blue-500/40 text-blue-200 font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer touch-manipulation"
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
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm sm:text-base tracking-wide uppercase shadow-lg flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <Zap className="w-5 h-5 fill-slate-950" />
              <span>START GAME • Rs. {betAmount.toLocaleString()} LKR</span>
            </button>
          ) : (
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={gemsRevealed === 0}
                onClick={() => executeCashout()}
                className={`w-full py-3.5 rounded-2xl font-black text-sm sm:text-base tracking-wide uppercase flex items-center justify-center gap-2 cursor-pointer touch-manipulation ${
                  gemsRevealed > 0
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 text-slate-950 shadow-lg'
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
              Round #{roundNonce} • {serverSeed.slice(0, 10)}...
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: 5x5 ROYAL-BLUE STAR & GOLDEN DIAMOND / SKULL BOMB GRID */}
        <div className="lg:col-span-7 bg-gradient-to-b from-[#0b1933] via-[#071124] to-[#040814] border-2 border-amber-500/50 rounded-3xl p-3.5 sm:p-6 shadow-xl flex flex-col items-center justify-center relative overflow-hidden order-1 lg:order-2">
          {/* Top Arena Status & Treasure Chest Streak Banner */}
          <div className="w-full max-w-[440px] flex flex-wrap items-center justify-between gap-2 mb-3 relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-amber-400/50 text-amber-300 font-black text-xs flex items-center gap-1">
                💎 {TOTAL_TILES - activeMinesCount} Diamonds
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-rose-500/50 text-rose-300 font-black text-xs flex items-center gap-1">
                💀 {activeMinesCount} Bombs
              </span>
            </div>

            <div className={`px-2.5 py-1 rounded-lg border text-xs font-black flex items-center gap-1.5 ${streakChestInfo.color}`}>
              <span>{streakChestInfo.label}</span>
            </div>
          </div>

          {/* 5x5 ROYAL-BLUE STAR & GOLDEN DIAMOND BOARD (ZERO-LAG, INSTANT CLICK) */}
          <div className="w-full max-w-[440px] aspect-square grid grid-cols-5 gap-2 sm:gap-3 relative z-10 p-2.5 sm:p-3 rounded-2xl bg-[#050c1a] border-2 border-blue-500/40">
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
                  style={{ touchAction: 'manipulation' }}
                  className={`group relative rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer touch-manipulation ${
                    isHidden
                      ? 'bg-gradient-to-b from-blue-500 via-blue-700 to-blue-950 border-blue-400/80 hover:border-amber-300 active:scale-95'
                      : isExploded
                      ? 'bg-gradient-to-b from-red-500 via-rose-700 to-red-950 border-yellow-300'
                      : isMine
                      ? 'bg-gradient-to-b from-rose-900/85 via-slate-900 to-slate-950 border-rose-500/60 opacity-85'
                      : isGem
                      ? isPostRoundReveal && !isLastClicked && gemsRevealed === 0
                        ? 'bg-gradient-to-b from-amber-700/40 to-slate-950 border-amber-500/40 opacity-65'
                        : 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-800 border-yellow-200'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  {isHidden ? (
                    <>
                      <div className="absolute inset-x-1.5 top-1 h-1.5 rounded-full bg-white/20 pointer-events-none" />
                      <span className="text-xl sm:text-2xl text-blue-200 group-hover:text-yellow-300 pointer-events-none">
                        ★
                      </span>
                    </>
                  ) : isGem ? (
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                      <GoldenDiamondSvg />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                      <SkullBombSvg isExploded={isExploded} />
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

          {/* INSTANT ACTION BAR RIGHT BELOW THE 5x5 GRID */}
          <div className="w-full max-w-[440px] mt-3 relative z-10">
            {!roundActive ? (
              <div className="grid grid-cols-12 gap-2">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="col-span-8 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>START GAME (Rs. {betAmount.toLocaleString()})</span>
                </button>
                <button
                  type="button"
                  onClick={handlePickRandomTile}
                  className="col-span-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1 cursor-pointer touch-manipulation"
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
                  onClick={() => executeCashout()}
                  className={`col-span-8 py-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation ${
                    gemsRevealed > 0
                      ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 shadow-lg'
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
                  className="col-span-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer touch-manipulation"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Pick ★</span>
                </button>
              </div>
            )}
          </div>

          {/* Win Celebration Overlay Banner */}
          {!roundActive && roundResult === 'won' && winPayout > 0 && (
            <div className="mt-3 w-full max-w-[440px] rounded-2xl bg-gradient-to-r from-amber-950 via-yellow-900/80 to-emerald-950 border-2 border-amber-400 p-3.5 flex items-center justify-between shadow-lg">
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
