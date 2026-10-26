import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  User,
  BetRecord,
  AdminSettings,
  GameStatus,
} from '../types/game';
import {
  getAdminSettings,
  saveAdminSettings,
  getTimeBasedCrashCrowd,
  BOT_NAMES,
} from '../services/storage';
import { soundService } from '../services/sound';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  ShieldCheck,
  Zap,
  Wallet,
  Users,
  Plane,
  Flame,
  Trophy,
  History,
} from 'lucide-react';

interface JetXGameViewProps {
  currentUser: User;
  adminSettings: AdminSettings;
  onUpdateAdminSettings?: (next: AdminSettings) => void;
  onPlaceBetDeduction: (betAmount: number) => boolean;
  onCreditWin: (winAmount: number, betAmount: number, multiplier: number) => void;
  onRecordBetHistory: (record: BetRecord) => void;
  onOpenCashier: (tab?: 'deposit' | 'withdraw') => void;
  onBackToLobby: () => void;
}

interface JetXDeckState {
  amount: number;
  inputText: string;
  autoBet: boolean;
  autoCashout: boolean;
  autoCashoutMult: number;
  hasPlacedBet: boolean;
  isQueuedForNext: boolean;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
  winAmount: number | null;
}

interface JetXEjectedPilot {
  id: string;
  username: string;
  multiplier: number;
  x: number;
  y: number;
  vy: number;
  vx: number;
}

interface JetXLiveBotBet {
  id: string;
  username: string;
  avatar: string;
  amount: number;
  targetMult: number;
  cashedOut: boolean;
  cashoutMult: number | null;
  winAmount: number | null;
}

export const JetXGameView: React.FC<JetXGameViewProps> = ({
  currentUser,
  adminSettings,
  onUpdateAdminSettings,
  onPlaceBetDeduction,
  onCreditWin,
  onRecordBetHistory,
  onOpenCashier,
  onBackToLobby,
}) => {
  const [status, setStatus] = useState<GameStatus>('WAITING');
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [crashPoint, setCrashPoint] = useState<number>(2.15);
  const [waitingSecondsLeft, setWaitingSecondsLeft] = useState<number>(4.5);
  const [waitingProgress, setWaitingProgress] = useState<number>(0);
  const [roundNonce, setRoundNonce] = useState<number>(() => Math.floor(7100 + Math.random() * 500));
  const [isMuted, setIsMuted] = useState<boolean>(() => soundService.isMuted());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [recentMultipliers, setRecentMultipliers] = useState<number[]>([
    2.42, 1.35, 6.84, 1.18, 3.75, 14.6, 1.92, 1.48, 4.15, 2.08, 1.24, 9.5,
  ]);

  const [deck1, setDeck1] = useState<JetXDeckState>({
    amount: 100,
    inputText: '100',
    autoBet: false,
    autoCashout: false,
    autoCashoutMult: 2.0,
    hasPlacedBet: false,
    isQueuedForNext: false,
    cashedOut: false,
    cashoutMultiplier: null,
    winAmount: null,
  });

  const [deck2, setDeck2] = useState<JetXDeckState>({
    amount: 200,
    inputText: '200',
    autoBet: false,
    autoCashout: false,
    autoCashoutMult: 1.5,
    hasPlacedBet: false,
    isQueuedForNext: false,
    cashedOut: false,
    cashoutMultiplier: null,
    winAmount: null,
  });

  const [liveBotBets, setLiveBotBets] = useState<JetXLiveBotBet[]>([]);

  // Refs for synchronous game loop access
  const statusRef = useRef<GameStatus>('WAITING');
  const currentMultRef = useRef<number>(1.0);
  const crashPointRef = useRef<number>(2.15);
  const deck1Ref = useRef<JetXDeckState>(deck1);
  const deck2Ref = useRef<JetXDeckState>(deck2);
  const adminSettingsRef = useRef<AdminSettings>(adminSettings);
  const ejectedPilotsRef = useRef<JetXEjectedPilot[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    deck1Ref.current = deck1;
  }, [deck1]);

  useEffect(() => {
    deck2Ref.current = deck2;
  }, [deck2]);

  useEffect(() => {
    adminSettingsRef.current = adminSettings;
  }, [adminSettings]);

  const onlinePlayersCount = useMemo(
    () => Math.max(32, getTimeBasedCrashCrowd().onlineInGame + 6),
    []
  );

  // Generate simulated multiplayer JetX bets for each round
  const generateBotBetsForRound = useCallback(() => {
    const count = 12;
    const shuffled = [...BOT_NAMES].sort(() => Math.random() - 0.5).slice(0, count);
    const bets: JetXLiveBotBet[] = shuffled.map((b, idx) => {
      const chipPool = [50, 100, 200, 500, 1000, 2500, 5000];
      const amount = chipPool[Math.floor(Math.random() * chipPool.length)];
      const targetMult = Number((1.15 + Math.random() * 4.5).toFixed(2));
      return {
        id: `jetx_bot_${Date.now()}_${idx}`,
        username: b.name,
        avatar: b.avatar,
        amount,
        targetMult,
        cashedOut: false,
        cashoutMult: null,
        winAmount: null,
      };
    });
    setLiveBotBets(bets);
  }, []);

  // Compute next JetX crash point respecting Admin Panel `aviator_jet` and global Next Signals
  const computeNextJetXCrashPoint = useCallback((nonceVal: number): number => {
    const latest = getAdminSettings();
    const jetCfg = latest.crashGamesConfig?.aviator_jet;

    // 1. Check JetX-specific queued multipliers first
    if (jetCfg) {
      if (jetCfg.nextCrashOverride !== null && jetCfg.nextCrashOverride >= 1.0) {
        const forced = Number(jetCfg.nextCrashOverride.toFixed(2));
        const updated: AdminSettings = {
          ...latest,
          crashGamesConfig: {
            ...latest.crashGamesConfig,
            aviator_jet: {
              ...jetCfg,
              nextCrashOverride: null,
            },
          },
        };
        saveAdminSettings(updated);
        onUpdateAdminSettings?.(updated);
        return forced;
      }

      if (Array.isArray(jetCfg.queuedMultipliers) && jetCfg.queuedMultipliers.length > 0) {
        const [first, ...rest] = jetCfg.queuedMultipliers;
        const forced = Number(Math.max(1.0, Number(first)).toFixed(2));
        const updated: AdminSettings = {
          ...latest,
          crashGamesConfig: {
            ...latest.crashGamesConfig,
            aviator_jet: {
              ...jetCfg,
              queuedMultipliers: rest,
            },
          },
        };
        saveAdminSettings(updated);
        onUpdateAdminSettings?.(updated);
        return forced;
      }
    }

    // 2. Check global Admin Next Signals if any are queued
    if (latest.nextCrashOverride !== null && latest.nextCrashOverride >= 1.0) {
      const forced = Number(latest.nextCrashOverride.toFixed(2));
      const updated: AdminSettings = {
        ...latest,
        nextCrashOverride: null,
      };
      saveAdminSettings(updated);
      onUpdateAdminSettings?.(updated);
      return forced;
    }

    if (Array.isArray(latest.queuedMultipliers) && latest.queuedMultipliers.length > 0) {
      const [first, ...rest] = latest.queuedMultipliers;
      const forced = Number(Math.max(1.0, Number(first)).toFixed(2));
      const updated: AdminSettings = {
        ...latest,
        queuedMultipliers: rest,
      };
      saveAdminSettings(updated);
      onUpdateAdminSettings?.(updated);
      return forced;
    }

    // 3. Otherwise use synchronous cryptographic RNG with JetX config
    const edgePercent = jetCfg?.houseEdgePercent ?? latest.houseEdgePercent ?? 4;
    const houseEdge = Math.min(0.45, Math.max(0.01, edgePercent / 100));
    const cap = jetCfg?.maxMultiplierCap ?? latest.maxMultiplierCap ?? 200;
    const instantProb = Math.min(
      0.5,
      Math.max(0, (jetCfg?.instantBurstProb ?? latest.instantBurstProb ?? 4) / 100)
    );

    const randBuf = new Uint32Array(1);
    crypto.getRandomValues(randBuf);
    const u = randBuf[0] / (0xffffffff + 1);

    if (u < instantProb) {
      return 1.0;
    }

    const raw = Math.min(cap, Math.max(1.02, (1 - houseEdge) / Math.max(0.005, 1 - u)));
    return Number(raw.toFixed(2));
  }, [onUpdateAdminSettings]);

  // Execute Cashout for Deck 1 or Deck 2
  const handleCashoutDeck = useCallback(
    (deckIdx: 1 | 2, customMult?: number) => {
      if (statusRef.current !== 'FLYING') return;
      const targetDeck = deckIdx === 1 ? deck1Ref.current : deck2Ref.current;
      if (!targetDeck.hasPlacedBet || targetDeck.cashedOut) return;

      const mult = Number((customMult ?? currentMultRef.current).toFixed(2));
      const winAmt = Number((targetDeck.amount * mult).toFixed(2));
      const profit = Number((winAmt - targetDeck.amount).toFixed(2));

      const updatedDeck: JetXDeckState = {
        ...targetDeck,
        cashedOut: true,
        cashoutMultiplier: mult,
        winAmount: winAmt,
      };

      if (deckIdx === 1) {
        deck1Ref.current = updatedDeck;
        setDeck1(updatedDeck);
      } else {
        deck2Ref.current = updatedDeck;
        setDeck2(updatedDeck);
      }

      // Spawn parachute pilot ejection on canvas
      ejectedPilotsRef.current.push({
        id: `pilot_${Date.now()}_${deckIdx}`,
        username: currentUser.username,
        multiplier: mult,
        x: 0.65,
        y: 0.35,
        vx: -0.08 - Math.random() * 0.04,
        vy: 0.07 + Math.random() * 0.03,
      });

      soundService.playCashout(true);
      if (mult >= 2.0) {
        try {
          confetti({
            particleCount: 45,
            spread: 65,
            origin: { y: 0.6 },
          });
        } catch {}
      }

      onCreditWin(winAmt, targetDeck.amount, mult);

      const rec: BetRecord = {
        id: `jetx_bet_${Date.now()}_${deckIdx}`,
        userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar || '✈️',
        roundNumber: roundNonce,
        amount: targetDeck.amount,
        cashoutMultiplier: mult,
        crashPoint: crashPointRef.current,
        winAmount: winAmt,
        profit,
        status: 'won',
        gameName: 'JetX',
        timestamp: Date.now(),
      };
      onRecordBetHistory(rec);
    },
    [currentUser.id, currentUser.username, currentUser.avatar, onCreditWin, onRecordBetHistory, roundNonce]
  );

  // Place or Queue Bet on Deck 1 or Deck 2
  const handlePlaceOrQueueBet = useCallback(
    (deckIdx: 1 | 2) => {
      setErrorMsg(null);
      const targetDeck = deckIdx === 1 ? deck1Ref.current : deck2Ref.current;
      const setTargetDeck = deckIdx === 1 ? setDeck1 : setDeck2;
      const targetRef = deckIdx === 1 ? deck1Ref : deck2Ref;

      // If already queued, cancel queue
      if (targetDeck.isQueuedForNext) {
        const nextState = { ...targetDeck, isQueuedForNext: false };
        targetRef.current = nextState;
        setTargetDeck(nextState);
        return;
      }

      const parsed = parseFloat(targetDeck.inputText);
      const betVal = Number((!isNaN(parsed) && parsed > 0 ? parsed : targetDeck.amount).toFixed(2));

      if (betVal < 20) {
        setErrorMsg('Minimum JetX bet is Rs. 20 LKR.');
        return;
      }
      if (betVal > 100000) {
        setErrorMsg('Maximum JetX bet is Rs. 100,000 LKR.');
        return;
      }

      if (statusRef.current === 'WAITING') {
        if (targetDeck.hasPlacedBet) return;
        if (betVal > currentUser.balance) {
          setErrorMsg('Insufficient LKR balance. Please deposit to play JetX.');
          return;
        }
        const ok = onPlaceBetDeduction(betVal);
        if (!ok) {
          setErrorMsg('Unable to place bet. Check your LKR wallet balance.');
          return;
        }
        soundService.playBeep(false);
        const nextState: JetXDeckState = {
          ...targetDeck,
          amount: betVal,
          inputText: String(betVal),
          hasPlacedBet: true,
          isQueuedForNext: false,
          cashedOut: false,
          cashoutMultiplier: null,
          winAmount: null,
        };
        targetRef.current = nextState;
        setTargetDeck(nextState);
      } else {
        // Queue for next round while FLYING or CRASHED
        soundService.playBeep(false);
        const nextState: JetXDeckState = {
          ...targetDeck,
          amount: betVal,
          inputText: String(betVal),
          isQueuedForNext: true,
        };
        targetRef.current = nextState;
        setTargetDeck(nextState);
      }
    },
    [currentUser.balance, onPlaceBetDeduction]
  );

  // Main JetX Round State Machine (WAITING -> FLYING -> CRASHED)
  useEffect(() => {
    let rafId: number;
    let isMounted = true;

    const startWaitingPhase = (nextNonce: number) => {
      if (!isMounted) return;
      statusRef.current = 'WAITING';
      currentMultRef.current = 1.0;
      ejectedPilotsRef.current = [];
      setStatus('WAITING');
      setCurrentMultiplier(1.0);

      const nextTarget = computeNextJetXCrashPoint(nextNonce);
      crashPointRef.current = nextTarget;
      setCrashPoint(nextTarget);
      generateBotBetsForRound();

      // Activate queued or auto bets for Deck 1 & Deck 2
      ([1, 2] as const).forEach((idx) => {
        const d = idx === 1 ? deck1Ref.current : deck2Ref.current;
        const setD = idx === 1 ? setDeck1 : setDeck2;
        const dRef = idx === 1 ? deck1Ref : deck2Ref;

        if (d.isQueuedForNext || d.autoBet) {
          const deducted = onPlaceBetDeduction(d.amount);
          if (deducted) {
            const updated: JetXDeckState = {
              ...d,
              hasPlacedBet: true,
              isQueuedForNext: false,
              cashedOut: false,
              cashoutMultiplier: null,
              winAmount: null,
            };
            dRef.current = updated;
            setD(updated);
          } else {
            const reset: JetXDeckState = {
              ...d,
              hasPlacedBet: false,
              isQueuedForNext: false,
              autoBet: false,
              cashedOut: false,
              cashoutMultiplier: null,
              winAmount: null,
            };
            dRef.current = reset;
            setD(reset);
          }
        } else {
          const reset: JetXDeckState = {
            ...d,
            hasPlacedBet: false,
            cashedOut: false,
            cashoutMultiplier: null,
            winAmount: null,
          };
          dRef.current = reset;
          setD(reset);
        }
      });

      const waitDurationMs = 4500;
      const waitStart = performance.now();

      const waitTick = (now: number) => {
        if (!isMounted) return;
        const elapsed = now - waitStart;
        const remaining = Math.max(0, (waitDurationMs - elapsed) / 1000);
        const pct = Math.min(100, (elapsed / waitDurationMs) * 100);
        setWaitingSecondsLeft(remaining);
        setWaitingProgress(pct);

        if (elapsed < waitDurationMs) {
          rafId = requestAnimationFrame(waitTick);
        } else {
          startFlyingPhase(nextNonce);
        }
      };

      rafId = requestAnimationFrame(waitTick);
    };

    const startFlyingPhase = (activeNonce: number) => {
      if (!isMounted) return;
      statusRef.current = 'FLYING';
      currentMultRef.current = 1.0;
      setStatus('FLYING');
      setCurrentMultiplier(1.0);
      soundService.playBeep(true);

      const flyStart = performance.now();
      const targetCrash = crashPointRef.current;

      const flyTick = (now: number) => {
        if (!isMounted) return;
        const elapsedSec = (now - flyStart) / 1000;
        // Exponential supersonic JetX climb curve
        const rawMult = 1.0 + Math.pow(elapsedSec, 1.58) * 0.19 + elapsedSec * 0.11;

        if (rawMult >= targetCrash) {
          // CRASHED!
          currentMultRef.current = targetCrash;
          statusRef.current = 'CRASHED';
          setCurrentMultiplier(targetCrash);
          setStatus('CRASHED');
          soundService.playCrash();

          setRecentMultipliers((prev) => [targetCrash, ...prev.slice(0, 15)]);

          // Record losses for uncashed user bets
          ([1, 2] as const).forEach((idx) => {
            const d = idx === 1 ? deck1Ref.current : deck2Ref.current;
            if (d.hasPlacedBet && !d.cashedOut) {
              const rec: BetRecord = {
                id: `jetx_loss_${Date.now()}_${idx}`,
                userId: currentUser.id,
                username: currentUser.username,
                avatar: currentUser.avatar || '✈️',
                roundNumber: activeNonce,
                amount: d.amount,
                cashoutMultiplier: null,
                crashPoint: targetCrash,
                winAmount: 0,
                profit: -d.amount,
                status: 'lost',
                gameName: 'JetX',
                timestamp: Date.now(),
              };
              onRecordBetHistory(rec);
            }
          });

          const crashWaitStart = performance.now();
          const crashWaitTick = (tNow: number) => {
            if (!isMounted) return;
            if (tNow - crashWaitStart < 2800) {
              rafId = requestAnimationFrame(crashWaitTick);
            } else {
              const nextN = activeNonce + 1;
              setRoundNonce(nextN);
              startWaitingPhase(nextN);
            }
          };
          rafId = requestAnimationFrame(crashWaitTick);
          return;
        }

        const displayMult = Number(rawMult.toFixed(2));
        currentMultRef.current = displayMult;
        setCurrentMultiplier(displayMult);

        // Check Auto Cashout for Deck 1 & Deck 2
        ([1, 2] as const).forEach((idx) => {
          const d = idx === 1 ? deck1Ref.current : deck2Ref.current;
          if (
            d.hasPlacedBet &&
            !d.cashedOut &&
            d.autoCashout &&
            d.autoCashoutMult >= 1.05 &&
            displayMult >= d.autoCashoutMult
          ) {
            handleCashoutDeck(idx, d.autoCashoutMult);
          }
        });

        // Update bot cashouts
        setLiveBotBets((prev) =>
          prev.map((b) => {
            if (!b.cashedOut && displayMult >= b.targetMult) {
              return {
                ...b,
                cashedOut: true,
                cashoutMult: b.targetMult,
                winAmount: Number((b.amount * b.targetMult).toFixed(2)),
              };
            }
            return b;
          })
        );

        rafId = requestAnimationFrame(flyTick);
      };

      rafId = requestAnimationFrame(flyTick);
    };

    startWaitingPhase(roundNonce);

    return () => {
      isMounted = false;
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Supersonic JetX HTML5 Canvas Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frameCount = 0;

    const renderFrame = () => {
      frameCount++;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Deep Stratosphere Gradient Background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      if (statusRef.current === 'CRASHED') {
        skyGrad.addColorStop(0, '#1f0610');
        skyGrad.addColorStop(0.6, '#14081c');
        skyGrad.addColorStop(1, '#09040e');
      } else {
        skyGrad.addColorStop(0, '#020617');
        skyGrad.addColorStop(0.55, '#0b1736');
        skyGrad.addColorStop(1, '#111c3d');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle Altitude Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 70) {
        const offset = statusRef.current === 'FLYING' ? (frameCount * 2.5) % 70 : 0;
        ctx.beginPath();
        ctx.moveTo(gx - offset, 0);
        ctx.lineTo(gx - offset, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += 55) {
        const offset = statusRef.current === 'FLYING' ? (frameCount * 1.2) % 55 : 0;
        ctx.beginPath();
        ctx.moveTo(0, gy + offset);
        ctx.lineTo(w, gy + offset);
        ctx.stroke();
      }

      // Runway strip at bottom
      ctx.fillStyle = '#090f20';
      ctx.fillRect(0, h - 28, w, 28);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h - 28);
      ctx.lineTo(w, h - 28);
      ctx.stroke();

      // Calculate Jet position
      const mult = currentMultRef.current;
      const progress = Math.min(1, Math.log10(Math.max(1, mult)) / 1.35);
      const startX = 65;
      const startY = h - 42;
      const jetX =
        statusRef.current === 'WAITING'
          ? startX
          : startX + (w * 0.72 - startX) * Math.min(1, progress * 1.2 + 0.18);
      const jetY =
        statusRef.current === 'WAITING'
          ? startY
          : startY - (h * 0.66) * Math.min(1, progress * 1.15 + 0.14) + Math.sin(frameCount * 0.08) * 4;

      if (statusRef.current === 'FLYING' || statusRef.current === 'CRASHED') {
        // Glowing Supersonic Trajectory Curve
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (jetX - startX) * 0.55, startY, jetX, jetY);
        ctx.strokeStyle = statusRef.current === 'CRASHED' ? '#f43f5e' : '#38bdf8';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Area fill under curve
        ctx.lineTo(jetX, startY);
        ctx.lineTo(startX, startY);
        ctx.closePath();
        const areaGrad = ctx.createLinearGradient(0, jetY, 0, startY);
        if (statusRef.current === 'CRASHED') {
          areaGrad.addColorStop(0, 'rgba(244, 63, 94, 0.28)');
          areaGrad.addColorStop(1, 'rgba(244, 63, 94, 0.0)');
        } else {
          areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.30)');
          areaGrad.addColorStop(1, 'rgba(245, 158, 11, 0.02)');
        }
        ctx.fillStyle = areaGrad;
        ctx.fill();
        ctx.restore();
      }

      // Draw Ejected Pilots with Parachutes
      ejectedPilotsRef.current.forEach((p) => {
        p.x += p.vx * 0.01;
        p.y += p.vy * 0.01;
        const px = p.x * w;
        const py = p.y * h;
        ctx.save();
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(px, py - 10, 10, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`🪂 ${p.multiplier.toFixed(2)}x`, px - 18, py + 12);
        ctx.restore();
      });

      // Draw Supersonic Fighter Jet or Explosion
      ctx.save();
      ctx.translate(jetX, jetY);
      if (statusRef.current === 'CRASHED') {
        // Supersonic Explosion Rings
        const rad = 28 + (frameCount % 25);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const angle = statusRef.current === 'FLYING' ? -0.32 : -0.05;
        ctx.rotate(angle);

        // Afterburner Flame
        const flameLen = statusRef.current === 'FLYING' ? 28 + (frameCount % 12) : 12;
        const flameGrad = ctx.createLinearGradient(-flameLen - 18, 0, -18, 0);
        flameGrad.addColorStop(0, 'rgba(249, 115, 22, 0)');
        flameGrad.addColorStop(0.5, '#f59e0b');
        flameGrad.addColorStop(1, '#38bdf8');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-18, -5);
        ctx.lineTo(-18 - flameLen, 0);
        ctx.lineTo(-18, 5);
        ctx.closePath();
        ctx.fill();

        // Sleek Fighter Jet Body
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(28, 0);
        ctx.lineTo(-14, -9);
        ctx.lineTo(-22, -4);
        ctx.lineTo(-22, 4);
        ctx.lineTo(-14, 9);
        ctx.closePath();
        ctx.fill();

        // Swept Gold/Cyan Wings
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(2, -4);
        ctx.lineTo(-12, -22);
        ctx.lineTo(-18, -20);
        ctx.lineTo(-10, -4);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(2, 4);
        ctx.lineTo(-12, 22);
        ctx.lineTo(-18, 20);
        ctx.lineTo(-10, 4);
        ctx.closePath();
        ctx.fill();

        // Cockpit Canopy
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(6, -2, 8, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, []);

  const renderDeckControl = (deckIdx: 1 | 2) => {
    const deck = deckIdx === 1 ? deck1 : deck2;
    const setDeck = deckIdx === 1 ? setDeck1 : setDeck2;
    const deckRef = deckIdx === 1 ? deck1Ref : deck2Ref;

    const updateDeckField = (updates: Partial<JetXDeckState>) => {
      const next = { ...deckRef.current, ...updates };
      deckRef.current = next;
      setDeck(next);
    };

    const isFlying = status === 'FLYING';
    const canCashout = isFlying && deck.hasPlacedBet && !deck.cashedOut;
    const liveCashoutValue = Number((deck.amount * currentMultiplier).toFixed(2));

    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <Plane className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              JetX Deck #{deckIdx}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-bold">
              <input
                type="checkbox"
                checked={deck.autoBet}
                onChange={(e) => updateDeckField({ autoBet: e.target.checked })}
                className="rounded accent-amber-500 cursor-pointer"
              />
              <span>Auto Bet</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-bold">
              <input
                type="checkbox"
                checked={deck.autoCashout}
                onChange={(e) => updateDeckField({ autoCashout: e.target.checked })}
                className="rounded accent-emerald-500 cursor-pointer"
              />
              <span>Auto Cashout</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2.5 items-center">
          <div className="col-span-7 space-y-1.5">
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl p-1 focus-within:border-sky-400">
              <span className="px-2 font-mono font-black text-amber-400 text-xs">Rs.</span>
              <input
                type="number"
                min={20}
                max={100000}
                disabled={deck.hasPlacedBet && !deck.cashedOut}
                value={deck.inputText}
                onChange={(e) => {
                  const val = e.target.value;
                  const num = parseFloat(val);
                  updateDeckField({
                    inputText: val,
                    amount: !isNaN(num) && num > 0 ? num : deck.amount,
                  });
                }}
                className="w-full bg-transparent text-white font-mono font-black text-sm focus:outline-none"
              />
              <button
                type="button"
                disabled={deck.hasPlacedBet && !deck.cashedOut}
                onClick={() => {
                  const nextAmt = Math.max(20, Math.floor(deck.amount / 2));
                  updateDeckField({ amount: nextAmt, inputText: String(nextAmt) });
                }}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-black text-slate-200 cursor-pointer touch-manipulation"
              >
                1/2
              </button>
              <button
                type="button"
                disabled={deck.hasPlacedBet && !deck.cashedOut}
                onClick={() => {
                  const nextAmt = Math.min(100000, deck.amount * 2);
                  updateDeckField({ amount: nextAmt, inputText: String(nextAmt) });
                }}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-black text-slate-200 ml-1 cursor-pointer touch-manipulation"
              >
                2x
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {[50, 100, 500, 1000].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={deck.hasPlacedBet && !deck.cashedOut}
                  onClick={() => updateDeckField({ amount: chip, inputText: String(chip) })}
                  className="py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono font-bold text-slate-300 cursor-pointer touch-manipulation"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-5">
            {canCashout ? (
              <button
                type="button"
                onClick={() => handleCashoutDeck(deckIdx)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wide shadow-lg flex flex-col items-center justify-center cursor-pointer touch-manipulation"
              >
                <span>EJECT / CASHOUT</span>
                <span className="font-mono text-sm sm:text-base">
                  Rs. {liveCashoutValue.toLocaleString()}
                </span>
              </button>
            ) : deck.hasPlacedBet && deck.cashedOut ? (
              <div className="w-full py-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-black text-xs text-center">
                <div>CASHED OUT @ {deck.cashoutMultiplier?.toFixed(2)}x</div>
                <div className="font-mono text-sm text-white">
                  +Rs. {deck.winAmount?.toLocaleString()}
                </div>
              </div>
            ) : deck.hasPlacedBet ? (
              <div className="w-full py-4 rounded-xl bg-sky-950/90 border border-sky-400/60 text-sky-200 font-black text-xs text-center">
                <div>BET LOCKED</div>
                <div className="font-mono text-amber-300">Rs. {deck.amount.toLocaleString()}</div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handlePlaceOrQueueBet(deckIdx)}
                className={`w-full py-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex flex-col items-center justify-center cursor-pointer touch-manipulation ${
                  deck.isQueuedForNext
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950'
                }`}
              >
                <span>
                  {deck.isQueuedForNext
                    ? 'CANCEL QUEUED BET'
                    : status === 'WAITING'
                    ? 'PLACE JETX BET'
                    : 'BET NEXT FLIGHT'}
                </span>
                <span className="font-mono text-xs">
                  Rs. {deck.amount.toLocaleString()} LKR
                </span>
              </button>
            )}
          </div>
        </div>

        {deck.autoCashout && (
          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-400 font-bold">Auto Eject Multiplier:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                min="1.1"
                max="500"
                value={deck.autoCashoutMult}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) updateDeckField({ autoCashoutMult: v });
                }}
                className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono font-black text-emerald-400 focus:outline-none"
              />
              <span className="font-mono font-bold text-slate-400">x</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-2.5 sm:px-6 py-3 sm:py-5 pb-24 space-y-3 select-none">
      {/* TOP BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-sky-500/40 rounded-2xl px-3.5 py-2.5 shadow-lg">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToLobby}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer touch-manipulation"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Lobby</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-900 flex items-center justify-center border border-sky-300/60 shadow">
              <span className="text-lg">✈️</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-white text-base sm:text-lg tracking-wider uppercase">
                  LION <span className="text-sky-400">JET X</span>
                </h1>
                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-[9px] uppercase">
                  SUPERSONIC CRASH
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Eject Before Supersonic Burst • Instant LKR Payouts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-emerald-500/40 text-emerald-400 text-[11px] font-black flex items-center gap-1.5">
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
            onClick={() => setIsMuted(soundService.toggleMute())}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer touch-manipulation"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* RECENT MULTIPLIERS STRIP */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="px-2 py-1 rounded bg-slate-950 text-[10px] font-black uppercase text-sky-400 shrink-0 flex items-center gap-1">
          <History className="w-3 h-3" />
          History
        </span>
        {recentMultipliers.map((m, i) => (
          <span
            key={i}
            className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs shrink-0 border ${
              m >= 10
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : m >= 2
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-sky-300'
            }`}
          >
            {m.toFixed(2)}x
          </span>
        ))}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => onOpenCashier('deposit')}
            className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[10px] uppercase cursor-pointer"
          >
            + Deposit LKR
          </button>
        </div>
      )}

      {/* MAIN GRID: JETX ARENA + LIVE BETS SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 space-y-3">
          {/* SUPERSONIC JETX CANVAS ARENA */}
          <div className="relative rounded-3xl overflow-hidden border-2 border-sky-500/50 bg-[#020617] shadow-2xl aspect-[16/9] max-h-[380px] w-full">
            <canvas
              ref={canvasRef}
              width={720}
              height={400}
              className="w-full h-full object-cover"
            />

            {/* Center HUD Multiplier / Countdown Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {status === 'WAITING' ? (
                <div className="bg-slate-950/85 border border-sky-500/50 rounded-2xl px-6 py-4 text-center shadow-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 block mb-1">
                    NEXT SUPERSONIC TAKEOFF IN
                  </span>
                  <div className="text-3xl sm:text-4xl font-mono font-black text-white">
                    {waitingSecondsLeft.toFixed(1)}s
                  </div>
                  <div className="w-44 h-2 bg-slate-900 rounded-full overflow-hidden mt-2 border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-amber-400"
                      style={{ width: `${waitingProgress}%` }}
                    />
                  </div>
                </div>
              ) : status === 'CRASHED' ? (
                <div className="text-center">
                  <span className="px-3 py-1 rounded-full bg-rose-600/30 border border-rose-500 text-rose-300 font-black text-xs uppercase tracking-widest">
                    💥 FLEW AWAY / EXPLODED
                  </span>
                  <div className="text-4xl sm:text-6xl font-mono font-black text-rose-500 mt-1 drop-shadow-[0_2px_12px_rgba(244,63,94,0.6)]">
                    {currentMultiplier.toFixed(2)}x
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-300 block">
                    ALTITUDE MULTIPLIER
                  </span>
                  <div className="text-5xl sm:text-7xl font-mono font-black text-white drop-shadow-[0_4px_20px_rgba(56,189,248,0.55)]">
                    {currentMultiplier.toFixed(2)}x
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Corner Flight Telemetry */}
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-slate-400 pointer-events-none">
              <span>ROUND #{roundNonce}</span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Provably Fair JetX Engine
              </span>
            </div>
          </div>

          {/* DUAL JETX BETTING DECKS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {renderDeckControl(1)}
            {renderDeckControl(2)}
          </div>
        </div>

        {/* RIGHT SIDEBAR: LIVE MULTIPLAYER JETX BETS */}
        <div className="lg:col-span-4 bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Live JetX Squadron Bets
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-400">
              {liveBotBets.length + (deck1.hasPlacedBet ? 1 : 0) + (deck2.hasPlacedBet ? 1 : 0)} Active
            </span>
          </div>

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {[deck1, deck2].map((d, idx) =>
              d.hasPlacedBet ? (
                <div
                  key={`my_jetx_${idx}`}
                  className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-sky-950/60 border border-sky-500/40 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span>{currentUser.avatar || '🦁'}</span>
                    <span className="font-black text-amber-300">{currentUser.username} (You)</span>
                  </div>
                  <div className="text-right font-mono">
                    {d.cashedOut ? (
                      <span className="text-emerald-400 font-black">
                        {d.cashoutMultiplier?.toFixed(2)}x (+Rs.{d.winAmount?.toLocaleString()})
                      </span>
                    ) : (
                      <span className="text-white font-bold">Rs. {d.amount.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ) : null
            )}

            {liveBotBets.map((b) => (
              <div
                key={b.id}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs ${
                  b.cashedOut
                    ? 'bg-emerald-950/30 border-emerald-500/30'
                    : 'bg-slate-950/80 border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span>{b.avatar}</span>
                  <span className="font-semibold text-slate-200 truncate">{b.username}</span>
                </div>
                <div className="text-right font-mono shrink-0">
                  {b.cashedOut ? (
                    <span className="text-emerald-400 font-black">
                      {b.cashoutMult?.toFixed(2)}x • Rs. {b.winAmount?.toLocaleString()}
                    </span>
                  ) : status === 'CRASHED' ? (
                    <span className="text-rose-400 font-bold">Burst</span>
                  ) : (
                    <span className="text-slate-300">Rs. {b.amount.toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
