import React, { useRef, useEffect, useState } from 'react';
import { GameStatus, Passenger } from '../types/game';
import { Maximize, Minimize, ArrowLeft, Wallet } from 'lucide-react';

interface BalloonCanvasProps {
  status: GameStatus;
  currentMultiplier: number;
  crashPoint: number;
  passengers: Passenger[];
  waitingProgress: number; // 0 to 1
  waitingSecondsLeft: number;
  activeBetsCount: number;
  userBalance?: number;
  onOpenCashier?: () => void;
  onShowMultiplayer?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onExitFullscreen?: () => void;
  backPressHint?: string | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  shape?: 'square' | 'circle' | 'spark' | 'ribbon';
}

interface SkyObject {
  id: number;
  x: number;
  y: number; // screen-relative vertical position that scrolls downward as balloon climbs
  scale: number;
  speedX: number;
  speedY: number;
  opacity: number;
  type: 'cloud' | 'bird' | 'island' | 'distant_balloon' | 'satellite' | 'planet' | 'meteor';
  color: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  blinkOffset: number;
  speedY: number;
}

interface FallingBasket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  passengersLeft: { color: string; isPlayer: boolean }[];
}

function safeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function lerpColor(hex1: string, hex2: string, t: number): string {
  const c1 = parseInt(hex1.slice(1), 16);
  const c2 = parseInt(hex2.slice(1), 16);
  const r1 = (c1 >> 16) & 255;
  const g1 = (c1 >> 8) & 255;
  const b1 = c1 & 255;
  const r2 = (c2 >> 16) & 255;
  const g2 = (c2 >> 8) & 255;
  const b2 = c2 & 255;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export const BalloonCanvas: React.FC<BalloonCanvasProps> = ({
  status,
  currentMultiplier,
  crashPoint,
  passengers,
  waitingProgress,
  waitingSecondsLeft,
  activeBetsCount,
  userBalance = 0,
  onOpenCashier,
  onShowMultiplayer,
  isFullscreen = false,
  onToggleFullscreen,
  onExitFullscreen,
  backPressHint,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleFullscreenButtonClick = () => {
    if (isFullscreen) {
      onExitFullscreen?.();
    } else {
      onToggleFullscreen?.();
    }
  };

  const [showParachutes, setShowParachutes] = useState<boolean>(true);
  const [latestCashoutToast, setLatestCashoutToast] = useState<{
    name: string;
    mult: number;
    profit: number;
    isPlayer: boolean;
  } | null>(null);

  // Continuous upward flight altitude & environment refs
  const cameraScrollYRef = useRef<number>(0);
  const skyObjectsRef = useRef<SkyObject[]>([]);
  const starsRef = useRef<Star[]>([]);
  const windStreaksRef = useRef<{ x: number; y: number; length: number; speed: number; alpha: number }[]>([]);
  const burnerParticlesRef = useRef<Particle[]>([]);
  const explosionParticlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<{ radius: number; maxRadius: number; alpha: number }[]>([]);
  const fallingBasketRef = useRef<FallingBasket | null>(null);
  const screenShakeRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // Latest props in refs so animation loop is ultra-responsive without resetting
  const statusRef = useRef<GameStatus>(status);
  statusRef.current = status;
  const multiplierRef = useRef<number>(currentMultiplier);
  multiplierRef.current = currentMultiplier;
  const passengersRef = useRef<Passenger[]>(passengers);
  passengersRef.current = passengers;
  const showParachutesRef = useRef<boolean>(showParachutes);
  showParachutesRef.current = showParachutes;

  const handledCashoutIdsRef = useRef<Set<string>>(new Set());
  const jumpersMapRef = useRef<
    Map<
      string,
      {
        id: string;
        name: string;
        color: string;
        isPlayer: boolean;
        jumpMultiplier: number;
        x: number;
        y: number;
        vx: number;
        vy: number;
        arcTime: number;
        parachuteOpenProgress: number;
        swayOffset: number;
        rotation: number;
        sideDir: number;
        trail: { x: number; y: number }[];
      }
    >
  >(new Map());

  // Initialize rich creative sky objects
  useEffect(() => {
    const objects: SkyObject[] = [];
    const palette = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

    // Clouds
    for (let i = 0; i < 16; i++) {
      objects.push({
        id: i,
        x: Math.random() * 1200,
        y: Math.random() * 700,
        scale: 0.65 + Math.random() * 1.15,
        speedX: -0.25 - Math.random() * 0.4,
        speedY: 1.0 + Math.random() * 1.2,
        opacity: 0.35 + Math.random() * 0.4,
        type: 'cloud',
        color: '#FFFFFF',
      });
    }

    // Floating creative sky islands
    for (let i = 0; i < 3; i++) {
      objects.push({
        id: 100 + i,
        x: 100 + i * 360 + Math.random() * 120,
        y: 80 + i * 210,
        scale: 0.7 + Math.random() * 0.4,
        speedX: -0.08,
        speedY: 0.65 + Math.random() * 0.3,
        opacity: 0.85,
        type: 'island',
        color: '#10B981',
      });
    }

    // Distant festival balloons
    for (let i = 0; i < 4; i++) {
      objects.push({
        id: 200 + i,
        x: 80 + Math.random() * 900,
        y: 60 + Math.random() * 500,
        scale: 0.22 + Math.random() * 0.18,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: 0.45 + Math.random() * 0.4,
        opacity: 0.7,
        type: 'distant_balloon',
        color: palette[i % palette.length],
      });
    }

    // Birds
    for (let i = 0; i < 5; i++) {
      objects.push({
        id: 300 + i,
        x: Math.random() * 1000,
        y: 100 + Math.random() * 400,
        scale: 0.6 + Math.random() * 0.4,
        speedX: 0.9 + Math.random() * 0.8,
        speedY: 0.8 + Math.random() * 0.5,
        opacity: 0.75,
        type: 'bird',
        color: '#1E293B',
      });
    }

    // Satellites & Planets for High Altitude / Space
    for (let i = 0; i < 3; i++) {
      objects.push({
        id: 400 + i,
        x: 120 + i * 320,
        y: 90 + i * 180,
        scale: 0.7 + Math.random() * 0.4,
        speedX: 0.25 * (i % 2 === 0 ? 1 : -1),
        speedY: 0.7 + Math.random() * 0.4,
        opacity: 0.9,
        type: i === 1 ? 'planet' : 'satellite',
        color: i === 1 ? '#F59E0B' : '#38BDF8',
      });
    }

    skyObjectsRef.current = objects;

    const stars: Star[] = [];
    for (let i = 0; i < 110; i++) {
      stars.push({
        x: Math.random() * 1200,
        y: Math.random() * 700,
        size: 0.8 + Math.random() * 2.2,
        blinkOffset: Math.random() * 10,
        speedY: 0.3 + Math.random() * 0.9,
      });
    }
    starsRef.current = stars;

    const streaks = [];
    for (let i = 0; i < 28; i++) {
      streaks.push({
        x: Math.random() * 1200,
        y: Math.random() * 800,
        length: 25 + Math.random() * 65,
        speed: 5 + Math.random() * 7,
        alpha: 0.15 + Math.random() * 0.3,
      });
    }
    windStreaksRef.current = streaks;
  }, []);

  // Reset on WAITING
  useEffect(() => {
    if (status === 'WAITING') {
      handledCashoutIdsRef.current.clear();
      jumpersMapRef.current.clear();
      setLatestCashoutToast(null);
      cameraScrollYRef.current = 0;
      fallingBasketRef.current = null;
    }
  }, [status]);

  // Monitor cashout events for top-right mini ticker (only when passengers array updates)
  useEffect(() => {
    passengers.forEach((p) => {
      if (p.hasJumped && !handledCashoutIdsRef.current.has(p.id)) {
        handledCashoutIdsRef.current.add(p.id);
        const mult = p.jumpMultiplier || multiplierRef.current;
        const profit = Math.round(mult * 1000);
        setLatestCashoutToast({
          name: p.name,
          mult,
          profit,
          isPlayer: p.isPlayer,
        });
      }
    });
  }, [passengers]);

  // Cache canvas dimensions via ResizeObserver to avoid forced layout reflows (getBoundingClientRect) every frame
  const canvasSizeRef = useRef<{ w: number; h: number; dpr: number }>({
    w: 800,
    h: 500,
    dpr: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || canvas.clientWidth || 800;
      const h = rect.height || canvas.clientHeight || 500;
      if (w <= 0 || h <= 0) return;
      // Cap DPR at 2 for silky-smooth mobile GPU fill-rate performance
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasSizeRef.current = { w, h, dpr };
      const targetW = Math.floor(w * dpr);
      const targetH = Math.floor(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    updateSize();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateSize);
      ro.observe(canvas);
    }
    window.addEventListener('resize', updateSize);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [isFullscreen]);

  // Trigger burst explosion & falling basket with remaining passengers
  useEffect(() => {
    if (status === 'BURST') {
      screenShakeRef.current = 30;

      const { w: cw, h: ch } = canvasSizeRef.current;
      const originX = cw / 2;
      const originY = ch * 0.48;

      shockwavesRef.current = [
        { radius: 10, maxRadius: 270, alpha: 1.0 },
        { radius: 5, maxRadius: 190, alpha: 0.85 },
      ];

      // Detach falling basket with any passengers who did NOT jump in time!
      const unjumped = passengersRef.current
        .filter((p) => !p.hasJumped)
        .slice(0, 6)
        .map((p) => ({ color: p.color || '#EF4444', isPlayer: p.isPlayer }));

      fallingBasketRef.current = {
        x: originX,
        y: originY + 75,
        vx: (Math.random() - 0.5) * 3,
        vy: -2.5,
        rotation: 0,
        vRot: (Math.random() - 0.5) * 0.12,
        passengersLeft: unjumped,
      };

      const particles: Particle[] = [];
      const burstColors = ['#FF1E27', '#FFB703', '#0284C7', '#10B981', '#8B5CF6', '#F59E0B', '#FFFFFF'];

      for (let i = 0; i < 65; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 11;
        particles.push({
          x: originX,
          y: originY - 15,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size: 4 + Math.random() * 8,
          color: burstColors[Math.floor(Math.random() * burstColors.length)],
          alpha: 1.0,
          rotation: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 0.3,
          life: 0,
          maxLife: 45 + Math.random() * 35,
          shape: Math.random() > 0.4 ? 'square' : 'ribbon',
        });
      }

      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 13;
        particles.push({
          x: originX,
          y: originY - 15,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2.5 + Math.random() * 4,
          color: Math.random() > 0.5 ? '#FEF08A' : '#FF4D4D',
          alpha: 1.0,
          rotation: 0,
          vRot: 0,
          life: 0,
          maxLife: 22 + Math.random() * 20,
          shape: 'spark',
        });
      }

      explosionParticlesRef.current = particles;
    }
  }, [status]);

  // Smooth interpolated multiplier ref so sky gradients & speed transitions never step
  const smoothMultRef = useRef<number>(1.0);

  // Main Continuous Animation Loop (Delta-Time Normalized & Zero-Reflow)
  useEffect(() => {
    let animId: number;
    let lastFrameTime = performance.now();

    const render = (now: number) => {
      animId = requestAnimationFrame(render);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const { w, h, dpr } = canvasSizeRef.current;
      if (w <= 0 || h <= 0) return;

      // Normalized frame delta (1.0 at 60fps, 0.5 at 120fps) clamped to avoid huge jumps on tab switch
      const rawDt = (now - lastFrameTime) / 16.6667;
      lastFrameTime = now;
      const dt = Math.min(2.2, Math.max(0.25, rawDt));

      timeRef.current += 0.025 * dt;
      const time = timeRef.current;
      const curStatus = statusRef.current;
      const targetMult = multiplierRef.current;
      if (curStatus === 'WAITING') {
        smoothMultRef.current = 1.0;
      } else {
        smoothMultRef.current += (targetMult - smoothMultRef.current) * Math.min(1, 0.28 * dt);
      }
      const curMult = smoothMultRef.current;
      const curPassengers = passengersRef.current;

      // Advance vertical ascent scroll continuously while FLYING
      const climbSpeed =
        curStatus === 'FLYING'
          ? (2.2 + Math.min(14, (curMult - 1.0) * 1.8)) * dt
          : 0;
      if (curStatus === 'FLYING') {
        cameraScrollYRef.current += climbSpeed;
      }
      const scrollY = cameraScrollYRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Screen Shake
      if (screenShakeRef.current > 0) {
        const sx = (Math.random() - 0.5) * screenShakeRef.current;
        const sy = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(sx, sy);
        screenShakeRef.current *= Math.pow(0.88, dt);
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      }

      // =========================================================
      // 1. MULTI-STAGE SKY & SPACE ATMOSPHERE GRADIENT
      // Transitions smoothly from Sunrise Valley -> Cloud Kingdom -> Stratosphere -> Orbit -> Deep Space Galaxy
      // =========================================================
      // Stage progress based on multiplier:
      // 1.0 -> 2.2 (Valley to Sky)
      // 2.2 -> 5.0 (Sky to Stratosphere)
      // 5.0 -> 12.0 (Stratosphere to Outer Space)
      // 12.0 -> 30.0+ (Outer Space to Deep Nebula Galaxy)
      let topColor = '#0284C7';
      let midColor = '#38BDF8';
      let botColor = '#FDE68A';

      if (curMult < 2.2) {
        const t = Math.min(1, Math.max(0, (curMult - 1.0) / 1.2));
        topColor = lerpColor('#0284C7', '#0369A1', t);
        midColor = lerpColor('#38BDF8', '#0284C7', t);
        botColor = lerpColor('#FDE68A', '#7DD3FC', t);
      } else if (curMult < 5.5) {
        const t = Math.min(1, (curMult - 2.2) / 3.3);
        topColor = lerpColor('#0369A1', '#0F172A', t);
        midColor = lerpColor('#0284C7', '#1E3A8A', t);
        botColor = lerpColor('#7DD3FC', '#0284C7', t);
      } else if (curMult < 14.0) {
        const t = Math.min(1, (curMult - 5.5) / 8.5);
        topColor = lerpColor('#0F172A', '#030712', t);
        midColor = lerpColor('#1E3A8A', '#1E1B4B', t);
        botColor = lerpColor('#0284C7', '#312E81', t);
      } else {
        const t = Math.min(1, (curMult - 14.0) / 16.0);
        topColor = '#020617';
        midColor = lerpColor('#1E1B4B', '#2E1065', t);
        botColor = lerpColor('#312E81', '#4C1D95', t);
      }

      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, topColor);
      skyGrad.addColorStop(0.55, midColor);
      skyGrad.addColorStop(1, botColor);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // =========================================================
      // 2. DEEP SPACE NEBULA, STARS, AURORA & EARTH HORIZON
      // =========================================================
      // Stars appear above 3.0x and scroll downward as balloon climbs into space
      if (curMult > 2.8) {
        const starVis = Math.min(1, (curMult - 2.8) / 4.0);
        ctx.save();
        for (const star of starsRef.current) {
          if (curStatus === 'FLYING') {
            star.y += star.speedY * (1 + (curMult - 1) * 0.25) * dt;
            if (star.y > h) {
              star.y = 0;
              star.x = Math.random() * w;
            }
          }
          const blink = (Math.sin(time * 3.5 + star.blinkOffset) + 1) * 0.5;
          ctx.fillStyle = '#FFFFFF';
          ctx.globalAlpha = starVis * (0.25 + blink * 0.75);
          ctx.beginPath();
          ctx.arc(star.x % w, star.y % h, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Cosmic Galaxy Nebula Glow in Deep Space (10x+)
      if (curMult > 9.0) {
        const nebAlpha = Math.min(0.45, (curMult - 9.0) / 15.0);
        ctx.save();
        const nebGrad1 = ctx.createRadialGradient(w * 0.25, h * 0.3, 10, w * 0.25, h * 0.3, 220);
        nebGrad1.addColorStop(0, `rgba(217, 70, 239, ${nebAlpha})`);
        nebGrad1.addColorStop(0.5, `rgba(139, 92, 246, ${nebAlpha * 0.5})`);
        nebGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebGrad1;
        ctx.fillRect(0, 0, w, h);

        const nebGrad2 = ctx.createRadialGradient(w * 0.75, h * 0.65, 10, w * 0.75, h * 0.65, 200);
        nebGrad2.addColorStop(0, `rgba(6, 182, 212, ${nebAlpha})`);
        nebGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebGrad2;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      // Waving Aurora Borealis Ribbons in Stratosphere/Mesosphere (4.0x to 14.0x)
      if (curMult > 3.8 && curMult < 16.0) {
        const auroraAlpha =
          curMult < 8.0
            ? Math.min(0.35, (curMult - 3.8) / 4.0)
            : Math.max(0, 0.35 * (1 - (curMult - 8.0) / 8.0));
        ctx.save();
        const aurGrad = ctx.createLinearGradient(0, h * 0.15, w, h * 0.45);
        aurGrad.addColorStop(0, `rgba(16, 185, 129, 0)`);
        aurGrad.addColorStop(0.3, `rgba(52, 211, 153, ${auroraAlpha})`);
        aurGrad.addColorStop(0.7, `rgba(168, 85, 247, ${auroraAlpha})`);
        aurGrad.addColorStop(1, `rgba(56, 189, 248, 0)`);
        ctx.strokeStyle = aurGrad;
        ctx.lineWidth = 28;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let ax = 0; ax <= w; ax += 30) {
          const ay = h * 0.28 + Math.sin(ax * 0.012 + time * 1.8) * 26;
          if (ax === 0) ctx.moveTo(ax, ay);
          else ctx.lineTo(ax, ay);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Golden Sun in Low Altitude (scrolls down as balloon ascends)
      const sunY = h * 0.22 + scrollY * 0.25;
      if (sunY < h + 120) {
        ctx.save();
        const sunGlow = ctx.createRadialGradient(w * 0.82, sunY, 8, w * 0.82, sunY, 85);
        sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
        sunGlow.addColorStop(0.35, 'rgba(251, 191, 36, 0.45)');
        sunGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(w * 0.82, sunY, 85, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(w * 0.82, sunY, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // =========================================================
      // 3. CREATIVE SKY OBJECTS (Clouds, Floating Islands, Birds, Satellites, Planets)
      // All scroll downward continuously while FLYING!
      // =========================================================
      for (const obj of skyObjectsRef.current) {
        if (curStatus === 'FLYING') {
          obj.x += obj.speedX * dt;
          obj.y += obj.speedY * (1.2 + Math.min(6, (curMult - 1) * 0.6)) * dt;

          if (obj.y > h + 140) {
            obj.y = -120;
            obj.x = Math.random() * w;
          }
          if (obj.x < -160) obj.x = w + 120;
          if (obj.x > w + 160) obj.x = -120;
        } else {
          // Gentle horizontal drift during WAITING
          obj.x += obj.speedX * 0.5 * dt;
          if (obj.x < -160) obj.x = w + 120;
          if (obj.x > w + 160) obj.x = -120;
        }

        // Draw Cloud (visible below 8.0x)
        if (obj.type === 'cloud' && curMult < 8.5) {
          const fade = curMult > 5.0 ? Math.max(0, 1 - (curMult - 5.0) / 3.5) : 1;
          ctx.save();
          ctx.fillStyle = `rgba(255, 255, 255, ${obj.opacity * fade})`;
          ctx.beginPath();
          const s = obj.scale;
          ctx.arc(obj.x, obj.y, 18 * s, 0, Math.PI * 2);
          ctx.arc(obj.x + 16 * s, obj.y - 8 * s, 22 * s, 0, Math.PI * 2);
          ctx.arc(obj.x + 38 * s, obj.y - 4 * s, 18 * s, 0, Math.PI * 2);
          ctx.arc(obj.x + 52 * s, obj.y + 3 * s, 14 * s, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Draw Floating Sky Island (visible between 1.4x and 6.0x)
        if (obj.type === 'island' && curMult >= 1.3 && curMult < 6.5) {
          const fade =
            curMult < 2.0
              ? (curMult - 1.3) / 0.7
              : curMult > 5.0
              ? 1 - (curMult - 5.0) / 1.5
              : 1;
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, fade)) * 0.85;
          ctx.translate(obj.x, obj.y);
          ctx.scale(obj.scale, obj.scale);

          // Rock base spire
          ctx.fillStyle = '#64748B';
          ctx.beginPath();
          ctx.moveTo(-45, 0);
          ctx.lineTo(45, 0);
          ctx.lineTo(22, 34);
          ctx.lineTo(0, 52);
          ctx.lineTo(-24, 30);
          ctx.closePath();
          ctx.fill();

          // Lush Emerald Grass Top
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.ellipse(0, 0, 48, 10, 0, 0, Math.PI * 2);
          ctx.fill();

          // Tiny Pine Tree on Island
          ctx.fillStyle = '#047857';
          ctx.beginPath();
          ctx.moveTo(-12, -2);
          ctx.lineTo(-4, -22);
          ctx.lineTo(4, -2);
          ctx.closePath();
          ctx.fill();

          // Mini Waterfall
          ctx.fillStyle = '#38BDF8';
          ctx.fillRect(10, 2, 6, 35);

          ctx.restore();
        }

        // Draw Distant Festival Balloons (visible below 4.5x)
        if (obj.type === 'distant_balloon' && curMult < 4.5) {
          const fade = curMult > 3.0 ? 1 - (curMult - 3.0) / 1.5 : 1;
          ctx.save();
          ctx.globalAlpha = Math.max(0, fade * obj.opacity);
          ctx.translate(obj.x, obj.y + Math.sin(time * 2 + obj.id) * 4);
          ctx.scale(obj.scale, obj.scale);

          ctx.fillStyle = obj.color;
          ctx.beginPath();
          ctx.arc(0, -15, 36, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#78350F';
          ctx.fillRect(-10, 28, 20, 14);
          ctx.restore();
        }

        // Draw Flapping Birds (visible below 3.0x)
        if (obj.type === 'bird' && curMult < 3.0) {
          ctx.save();
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 1.8;
          const wingY = Math.sin(time * 9 + obj.id) * 5;
          ctx.beginPath();
          ctx.moveTo(obj.x - 8, obj.y + wingY);
          ctx.quadraticCurveTo(obj.x - 4, obj.y - 4, obj.x, obj.y);
          ctx.quadraticCurveTo(obj.x + 4, obj.y - 4, obj.x + 8, obj.y + wingY);
          ctx.stroke();
          ctx.restore();
        }

        // Draw Space Satellites & Ringed Planets (visible above 6.5x in Space!)
        if ((obj.type === 'satellite' || obj.type === 'planet') && curMult >= 6.0) {
          const spaceAlpha = Math.min(1, (curMult - 6.0) / 2.5);
          ctx.save();
          ctx.globalAlpha = spaceAlpha;
          ctx.translate(obj.x, obj.y);
          ctx.scale(obj.scale, obj.scale);

          if (obj.type === 'planet') {
            // Creative Ringed Planet (Saturn style)
            ctx.fillStyle = '#F59E0B';
            ctx.beginPath();
            ctx.arc(0, 0, 28, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.ellipse(0, 0, 52, 12, -0.25, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            // Orbiting Space Satellite
            ctx.rotate(Math.sin(time + obj.id) * 0.2);
            // Solar wings
            ctx.fillStyle = '#0284C7';
            ctx.strokeStyle = '#E2E8F0';
            ctx.lineWidth = 1;
            ctx.fillRect(-34, -7, 22, 14);
            ctx.strokeRect(-34, -7, 22, 14);
            ctx.fillRect(12, -7, 22, 14);
            ctx.strokeRect(12, -7, 22, 14);
            // Core body
            ctx.fillStyle = '#CBD5E1';
            ctx.fillRect(-10, -10, 20, 20);
            // Dish antenna
            ctx.strokeStyle = '#38BDF8';
            ctx.beginPath();
            ctx.arc(0, 14, 6, Math.PI, 0, false);
            ctx.stroke();
          }

          ctx.restore();
        }
      }

      // =========================================================
      // 4. CREATIVE LAUNCHPAD VALLEY & MOUNTAINS (Recedes downward on takeoff!)
      // =========================================================
      const sceneScale = Math.min(1, Math.max(0.54, Math.min(w / 460, h / 410)));
      const groundOffset = scrollY * 0.85;
      if (groundOffset < h + 220) {
        ctx.save();
        ctx.translate(0, groundOffset);

        // Distant Snow-Capped Mountains
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, h - 115 * sceneScale);
        ctx.lineTo(w * 0.18, h - 195 * sceneScale);
        ctx.lineTo(w * 0.35, h - 110 * sceneScale);
        ctx.lineTo(w * 0.55, h - 175 * sceneScale);
        ctx.lineTo(w * 0.78, h - 210 * sceneScale);
        ctx.lineTo(w * 0.92, h - 130 * sceneScale);
        ctx.lineTo(w, h - 165 * sceneScale);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

        // Lush Rolling Green Hills
        const hillGrad = ctx.createLinearGradient(0, h - 95 * sceneScale, 0, h);
        hillGrad.addColorStop(0, '#10B981');
        hillGrad.addColorStop(1, '#047857');
        ctx.fillStyle = hillGrad;
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, h - 65 * sceneScale);
        ctx.quadraticCurveTo(w * 0.25, h - 105 * sceneScale, w * 0.5, h - 58 * sceneScale);
        ctx.quadraticCurveTo(w * 0.75, h - 25 * sceneScale, w, h - 75 * sceneScale);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

        // Pine Trees along the valley
        const treePositions = [w * 0.12, w * 0.22, w * 0.76, w * 0.86];
        for (const tx of treePositions) {
          ctx.fillStyle = '#064E3B';
          ctx.beginPath();
          ctx.moveTo(tx - 12 * sceneScale, h - 42 * sceneScale);
          ctx.lineTo(tx, h - 78 * sceneScale);
          ctx.lineTo(tx + 12 * sceneScale, h - 42 * sceneScale);
          ctx.closePath();
          ctx.fill();
        }

        // Center Launchpad Platform under the Balloon
        const padX = w / 2;
        const padY = h - 42 * sceneScale;
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        safeRoundRect(ctx, padX - 85 * sceneScale, padY, 170 * sceneScale, 16 * sceneScale, 5 * sceneScale);
        ctx.fill();
        ctx.stroke();

        // Animated Windsock Pole next to Launchpad
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 2.5 * sceneScale;
        ctx.beginPath();
        ctx.moveTo(padX + 72 * sceneScale, padY);
        ctx.lineTo(padX + 72 * sceneScale, padY - 38 * sceneScale);
        ctx.stroke();

        const sockWave = Math.sin(time * 6) * 4 * sceneScale;
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.moveTo(padX + 72 * sceneScale, padY - 38 * sceneScale);
        ctx.lineTo(padX + 94 * sceneScale, padY - 34 * sceneScale + sockWave);
        ctx.lineTo(padX + 72 * sceneScale, padY - 28 * sceneScale);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      // =========================================================
      // 5. ASCENDING WIND SPEED STREAKS
      // =========================================================
      if (curStatus === 'FLYING') {
        ctx.save();
        for (const streak of windStreaksRef.current) {
          streak.y += streak.speed * (1 + curMult * 0.25) * dt;
          if (streak.y > h + 50) {
            streak.y = -50;
            streak.x = Math.random() * w;
          }
          ctx.strokeStyle = `rgba(255, 255, 255, ${streak.alpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(streak.x, streak.y);
          ctx.lineTo(streak.x, streak.y + streak.length);
          ctx.stroke();
        }
        ctx.restore();
      }

      // =========================================================
      // 6. BALLOON POSITIONING
      // On Launchpad during WAITING -> Rises smoothly to Center Sky during FLYING!
      // =========================================================
      const balloonX = w / 2;
      const liftProgress = Math.min(1, scrollY / 140);
      const launchY = h - 140 * sceneScale; // Sitting right on the launchpad!
      const flightCenterY = h * (h < 320 ? 0.56 : 0.49); // Centered in flight with room for top multiplier!
      const floatSway = Math.sin(time * 2.8) * 5 * sceneScale;
      const balloonY =
        curStatus === 'WAITING'
          ? launchY + floatSway * 0.4
          : launchY + (flightCenterY - launchY) * liftProgress + floatSway;

      const basketYOffset = 78;
      const basketW = 68;
      const basketH = 34;

      // =========================================================
      // 7. THE CREATIVE BALLOON & ON-BOARD PARACHUTERS IN THE BASKET
      // =========================================================
      if (curStatus !== 'BURST') {
        ctx.save();
        ctx.translate(balloonX, balloonY);
        ctx.scale(sceneScale, sceneScale);

        const speedTilt = Math.min(0.08, (curMult - 1.0) * 0.01);
        const naturalSway = Math.sin(time * 2.2) * 0.03;
        ctx.rotate(speedTilt + naturalSway);

        // A. ROARING HOT AIR BURNER FLAME
        if (curStatus === 'FLYING') {
          const flamePulse = 0.85 + Math.sin(time * 18) * 0.15;
          const flameH = (44 + Math.random() * 16) * flamePulse;

          const auraGrad = ctx.createRadialGradient(0, 32, 4, 0, 32, 52);
          auraGrad.addColorStop(0, 'rgba(255, 107, 0, 0.4)');
          auraGrad.addColorStop(1, 'rgba(255, 107, 0, 0)');
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(0, 32, 52, 0, Math.PI * 2);
          ctx.fill();

          // Outer Crimson Flame
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.moveTo(-15, 35);
          ctx.quadraticCurveTo(-20, 35 - flameH * 0.6, 0, 35 - flameH);
          ctx.quadraticCurveTo(20, 35 - flameH * 0.6, 15, 35);
          ctx.closePath();
          ctx.fill();

          // Mid Amber Flame
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.moveTo(-9, 35);
          ctx.quadraticCurveTo(-13, 35 - flameH * 0.45, 0, 35 - flameH * 0.78);
          ctx.quadraticCurveTo(13, 35 - flameH * 0.45, 9, 35);
          ctx.closePath();
          ctx.fill();

          // Inner Lemon Core
          ctx.fillStyle = '#FEF08A';
          ctx.beginPath();
          ctx.moveTo(-5, 35);
          ctx.quadraticCurveTo(-6, 35 - flameH * 0.3, 0, 35 - flameH * 0.5);
          ctx.quadraticCurveTo(6, 35 - flameH * 0.3, 5, 35);
          ctx.closePath();
          ctx.fill();

          // Upward Heat Sparks
          if (Math.random() > 0.35) {
            burnerParticlesRef.current.push({
              x: balloonX + (Math.random() - 0.5) * 14,
              y: balloonY + 26,
              vx: (Math.random() - 0.5) * 1.8,
              vy: 2 + Math.random() * 2.5,
              size: 2.2 + Math.random() * 2.2,
              color: Math.random() > 0.5 ? '#FBBF24' : '#FF4D4D',
              alpha: 1.0,
              rotation: 0,
              vRot: 0,
              life: 0,
              maxLife: 18,
              shape: 'spark',
            });
          }
        }

        // B. BALLOON ENVELOPE
        const bRadius = 82;
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, -24, bRadius, Math.PI * 0.82, Math.PI * 0.18, false);
        ctx.quadraticCurveTo(bRadius * 0.68, 34, 25, 42);
        ctx.lineTo(-25, 42);
        ctx.quadraticCurveTo(-bRadius * 0.68, 34, -Math.cos(Math.PI * 0.18) * bRadius, -24 + Math.sin(Math.PI * 0.18) * bRadius);
        ctx.closePath();
        ctx.clip();

        ctx.fillStyle = '#FF5722';
        ctx.fillRect(-bRadius - 20, -24 - bRadius - 20, (bRadius + 20) * 2, (bRadius + 50) * 2);

        const goreColors = [
          '#FF1E27',
          '#FFB703',
          '#0284C7',
          '#10B981',
          '#F43F5E',
          '#8B5CF6',
          '#FF8A00',
        ];

        for (let i = -3; i <= 3; i++) {
          ctx.fillStyle = goreColors[(i + 3) % goreColors.length];
          ctx.beginPath();
          ctx.moveTo(i * 13, 42);
          ctx.bezierCurveTo(i * 40, 15, i * 54, -64, 0, -24 - bRadius);
          ctx.bezierCurveTo((i + 1) * 54, -64, (i + 1) * 40, 15, (i + 1) * 13, 42);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(i * 13, 42);
          ctx.bezierCurveTo(i * 40, 15, i * 54, -64, 0, -24 - bRadius);
          ctx.stroke();
        }

        // Equator Belt
        const beltY = -20;
        ctx.fillStyle = '#FFF8E7';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.rect(-bRadius, beltY - 9, bRadius * 2, 18);
        ctx.fill();
        ctx.stroke();

        for (let bx = -bRadius + 14; bx < bRadius - 10; bx += 20) {
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(bx, beltY, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Specular Shine
        const shineGrad = ctx.createRadialGradient(-42, -36, 2, -42, -36, 26);
        shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shineGrad;
        ctx.beginPath();
        ctx.arc(-42, -36, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // end envelope clip

        // Crown Cap & Fluttering Pennant Flag
        ctx.fillStyle = '#D97706';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.ellipse(0, -24 - bRadius, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const flagWave = Math.sin(time * 8) * 3.5;
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.moveTo(0, -24 - bRadius);
        ctx.lineTo(-22, -24 - bRadius - 7 + flagWave);
        ctx.lineTo(0, -24 - bRadius - 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Envelope Collar Ring
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        safeRoundRect(ctx, -25, 40, 50, 6, 3);
        ctx.fill();
        ctx.stroke();

        // Suspension Ropes to Basket
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-22, 46);
        ctx.lineTo(-basketW / 2 + 5, basketYOffset);
        ctx.moveTo(-10, 46);
        ctx.lineTo(-basketW / 2 + 16, basketYOffset);
        ctx.moveTo(22, 46);
        ctx.lineTo(basketW / 2 - 5, basketYOffset);
        ctx.moveTo(10, 46);
        ctx.lineTo(basketW / 2 - 16, basketYOffset);
        ctx.stroke();

        // =========================================================
        // C. PARACHUTERS / PEOPLE STANDING INSIDE THE BASKET!
        // "Ballon eken ඉන්නෙ පැරශිට් කරුවන්/මිනිසුන් / බිමට පනින්නෙත් ඔවුන්මයි"
        // Drawn right at the top rim of the basket before the front basket weave is drawn over their waists!
        // =========================================================
        const onBoardPassengers = curPassengers.filter((p) => !p.hasJumped);
        // Sort so actual player is always visible in the center
        const sortedOnBoard = [...onBoardPassengers].sort((a, b) =>
          a.isPlayer === b.isPlayer ? 0 : a.isPlayer ? -1 : 1
        );
        const visibleCrew = sortedOnBoard.slice(0, 6);
        const crewCount = visibleCrew.length;

        for (let i = 0; i < crewCount; i++) {
          const rider = visibleCrew[i];
          const spacing = (basketW - 18) / Math.max(1, crewCount - 1);
          const rx =
            crewCount === 1
              ? 0
              : -basketW / 2 + 9 + i * spacing;
          const bobOffset = Math.sin(time * 4.5 + i * 1.1) * 1.3;
          const ry = basketYOffset - 4 + bobOffset;

          // Parachute Rig / Backpack on shoulders
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(rx - 5, ry - 3, 10, 11);

          // Jumpsuit Torso
          ctx.fillStyle = rider.isPlayer ? '#2563EB' : rider.color || '#EF4444';
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          safeRoundRect(ctx, rx - 5.5, ry + 2, 11, 11, 2.5);
          ctx.fill();
          ctx.stroke();

          // Yellow Parachute Harness Straps
          ctx.fillStyle = '#FACC15';
          ctx.fillRect(rx - 3.5, ry + 2.5, 1.8, 9);
          ctx.fillRect(rx + 1.7, ry + 2.5, 1.8, 9);

          // Head
          ctx.fillStyle = '#FED7AA';
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(rx, ry - 2, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Skydiving Helmet
          ctx.fillStyle = rider.isPlayer ? '#FACC15' : rider.color || '#DC2626';
          ctx.beginPath();
          ctx.arc(rx, ry - 2.8, 5.4, Math.PI * 0.95, Math.PI * 0.05, false);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Aviator Goggles
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(rx - 4, ry - 4, 8, 2.5);
          ctx.fillStyle = '#38BDF8';
          ctx.fillRect(rx - 3.2, ry - 3.6, 2.8, 1.8);
          ctx.fillRect(rx + 0.4, ry - 3.6, 2.8, 1.8);

          // Highlight "YOU" arrow above real player in basket
          if (rider.isPlayer) {
            ctx.fillStyle = '#FACC15';
            ctx.font = '900 7px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('YOU', rx, ry - 10);
          }
        }

        // D. WOVEN WICKER BASKET (Drawn over lower bodies so passengers stand inside it!)
        ctx.fillStyle = '#78350F';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        safeRoundRect(ctx, -basketW / 2, basketYOffset, basketW, basketH, 6);
        ctx.fill();
        ctx.stroke();

        // Padded Leather Basket Rim
        ctx.fillStyle = '#451A03';
        ctx.beginPath();
        safeRoundRect(ctx, -basketW / 2 - 2, basketYOffset - 2, basketW + 4, 5, 2.5);
        ctx.fill();
        ctx.stroke();

        // Wicker horizontal weave lines
        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 1.4;
        for (let wy = basketYOffset + 7; wy < basketYOffset + basketH; wy += 6.5) {
          ctx.beginPath();
          ctx.moveTo(-basketW / 2 + 3, wy);
          ctx.lineTo(basketW / 2 - 3, wy);
          ctx.stroke();
        }

        // On-board Parachuters Counter Badge on front of Basket
        const onBoardText = `🪂 ${onBoardPassengers.length}`;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        safeRoundRect(ctx, -18, basketYOffset + 9, 36, 15, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FEF08A';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(onBoardText, 0, basketYOffset + 19.5);

        // Hanging Sandbags
        ctx.fillStyle = '#D97706';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        safeRoundRect(ctx, -basketW / 2 - 4, basketYOffset + 8, 6, 11, 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        safeRoundRect(ctx, basketW / 2 - 2, basketYOffset + 8, 6, 11, 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore(); // end balloon transform
      }

      // =========================================================
      // 8. PARACHUTERS JUMPING DIRECTLY FROM THE BALLOON BASKET TO THE GROUND!
      // Drawn IN FRONT of the balloon & basket so every jump and parachute deployment is 100% visible!
      // =========================================================
      curPassengers.forEach((p, idx) => {
        if (p.hasJumped && !jumpersMapRef.current.has(p.id)) {
          const jumpIndex = jumpersMapRef.current.size;
          const sideDir = jumpIndex % 2 === 0 ? -1 : 1;
          const startX = balloonX + sideDir * (20 + (jumpIndex % 3) * 6) * sceneScale;
          const startY = balloonY + (basketYOffset - 2) * sceneScale;
          jumpersMapRef.current.set(p.id, {
            id: p.id,
            name: p.name,
            color: p.color || '#EF4444',
            isPlayer: p.isPlayer,
            jumpMultiplier: p.jumpMultiplier || curMult,
            x: startX,
            y: startY,
            // Strong outward leap clear of the basket rim, then smooth parachute descent
            vx: sideDir * (3.6 + (jumpIndex % 4) * 0.75) * sceneScale,
            vy: -2.4 * sceneScale,
            arcTime: 0,
            parachuteOpenProgress: 0.05,
            swayOffset: idx * 1.3,
            rotation: sideDir * 0.25,
            sideDir,
            trail: [{ x: startX, y: startY }],
          });
        }
      });

      if (showParachutesRef.current) {
        let jumperIdx = 0;
        const edgePad = Math.max(28, 55 * sceneScale);
        jumpersMapRef.current.forEach((j) => {
          jumperIdx++;
          j.arcTime += 0.035 * dt;
          j.x += j.vx * dt;
          j.y += j.vy * dt;

          if (j.trail.length < 18 && j.arcTime < 0.7) {
            j.trail.push({ x: j.x, y: j.y });
          }

          // Keep inside horizontal viewport bounds
          if (j.x < edgePad) {
            j.x = edgePad;
            j.vx = Math.abs(j.vx) * 0.4;
          }
          if (j.x > w - edgePad) {
            j.x = w - edgePad;
            j.vx = -Math.abs(j.vx) * 0.4;
          }

          // Deploy parachute quickly after leaping out of basket (arcTime > 0.16)
          if (j.arcTime > 0.16) {
            j.parachuteOpenProgress = Math.min(1, j.parachuteOpenProgress + 0.09 * dt);
            // Smooth downward glide toward the ground!
            const targetDescentSpeed = (1.85 + Math.min(2.0, (curMult - 1.0) * 0.25)) * sceneScale;
            j.vy = j.vy + (targetDescentSpeed - j.vy) * Math.min(1, 0.14 * dt);
            j.vx *= Math.pow(0.955, dt);
          } else {
            // Initial leap arc gravity
            j.vy += 0.32 * sceneScale * dt;
          }

          j.swayOffset += 0.065 * dt;
          const horizontalSway = Math.sin(j.swayOffset) * 0.65 * sceneScale * dt;
          j.x += horizontalSway;
          j.rotation = Math.sin(j.swayOffset) * 0.16;

          if (j.y < h + 90) {
            // Draw jump leap arc trail during initial jump out of basket
            if (j.arcTime < 1.1 && j.trail.length > 2) {
              ctx.save();
              ctx.strokeStyle = j.isPlayer
                ? 'rgba(250, 204, 21, 0.55)'
                : 'rgba(255, 255, 255, 0.35)';
              ctx.lineWidth = 2 * sceneScale;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              j.trail.forEach((pt, tIdx) => {
                if (tIdx === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
              });
              ctx.stroke();
              ctx.restore();
            }

            ctx.save();
            ctx.translate(j.x, j.y);
            ctx.scale(sceneScale, sceneScale);
            ctx.rotate(j.rotation);

            const openP = j.parachuteOpenProgress;
            const canopyW = 34 * openP;
            const canopyH = 20 * openP;

            // 1. LARGE VIBRANT PARACHUTE CANOPY DOME
            if (openP > 0.08) {
              // Suspension Cords (Risers) from Canopy to Skydiver's Hands/Shoulders
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
              ctx.lineWidth = 1.3;
              ctx.beginPath();
              ctx.moveTo(-canopyW * 0.88, -28);
              ctx.lineTo(-5, -5);
              ctx.moveTo(-canopyW * 0.42, -28);
              ctx.lineTo(-2, -5);
              ctx.moveTo(canopyW * 0.42, -28);
              ctx.lineTo(2, -5);
              ctx.moveTo(canopyW * 0.88, -28);
              ctx.lineTo(5, -5);
              ctx.stroke();

              // Main Parachute Dome
              const canopyGrad = ctx.createLinearGradient(-canopyW, -32, canopyW, -32);
              if (j.isPlayer) {
                canopyGrad.addColorStop(0, '#F59E0B');
                canopyGrad.addColorStop(0.25, '#FEF08A');
                canopyGrad.addColorStop(0.5, '#EF4444');
                canopyGrad.addColorStop(0.75, '#FEF08A');
                canopyGrad.addColorStop(1, '#F59E0B');
              } else {
                canopyGrad.addColorStop(0, j.color);
                canopyGrad.addColorStop(0.3, '#FFFFFF');
                canopyGrad.addColorStop(0.5, '#FACC15');
                canopyGrad.addColorStop(0.7, '#FFFFFF');
                canopyGrad.addColorStop(1, j.color);
              }

              ctx.fillStyle = canopyGrad;
              ctx.strokeStyle = '#0F172A';
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.arc(0, -28, canopyW, Math.PI, 0, false);
              // Scalloped bottom edge of parachute dome
              ctx.quadraticCurveTo(canopyW * 0.5, -28 - canopyH * 0.2, 0, -28);
              ctx.quadraticCurveTo(-canopyW * 0.5, -28 - canopyH * 0.2, -canopyW, -28);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();

              // Parachute Gore Ribs
              ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
              ctx.lineWidth = 1.2;
              for (const ribFactor of [-0.45, 0, 0.45]) {
                ctx.beginPath();
                ctx.moveTo(0, -28 - canopyW);
                ctx.quadraticCurveTo(canopyW * ribFactor * 1.3, -28 - canopyW * 0.5, canopyW * ribFactor, -28);
                ctx.stroke();
              }
            }

            // 2. SKYDIVER / PARACHUTER HUMAN FIGURE
            // Backpack Rig
            ctx.fillStyle = '#0F172A';
            ctx.fillRect(-6, -8, 12, 11);

            // Jumpsuit Torso
            ctx.fillStyle = j.isPlayer ? '#2563EB' : j.color;
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            safeRoundRect(ctx, -5.5, -3, 11, 11, 3);
            ctx.fill();
            ctx.stroke();

            // Yellow Parachute Harness Straps
            ctx.fillStyle = '#FACC15';
            ctx.fillRect(-4, -2.5, 2, 9.5);
            ctx.fillRect(2, -2.5, 2, 9.5);

            // Animated Waving Arms & Kicking Legs
            const limbWave = Math.sin(time * 9 + jumperIdx) * 3.5;
            ctx.strokeStyle = j.isPlayer ? '#1D4ED8' : j.color;
            ctx.lineWidth = 2.8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            // Arms raised holding parachute cords
            ctx.moveTo(-5, -1);
            ctx.lineTo(-10, -8 + limbWave * 0.4);
            ctx.moveTo(5, -1);
            ctx.lineTo(10, -8 - limbWave * 0.4);
            // Legs kicking below torso
            ctx.moveTo(-3, 8);
            ctx.lineTo(-5 + limbWave * 0.6, 17);
            ctx.moveTo(3, 8);
            ctx.lineTo(5 - limbWave * 0.6, 17);
            ctx.stroke();

            // Boots
            ctx.fillStyle = '#0F172A';
            ctx.beginPath();
            ctx.arc(-5 + limbWave * 0.6, 17.5, 2.2, 0, Math.PI * 2);
            ctx.arc(5 - limbWave * 0.6, 17.5, 2.2, 0, Math.PI * 2);
            ctx.fill();

            // Head & Skydiving Helmet
            ctx.fillStyle = '#FED7AA';
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(0, -8.5, 5.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = j.isPlayer ? '#FACC15' : j.color;
            ctx.beginPath();
            ctx.arc(0, -9.2, 5.6, Math.PI, 0, false);
            ctx.fill();
            ctx.stroke();

            // Skydiving Goggles
            ctx.fillStyle = '#38BDF8';
            ctx.fillRect(-4, -9.5, 8, 2.5);

            // 3. NAME & CASHOUT MULTIPLIER BADGE UNDER SKYDIVER
            const label = `🪂 ${j.name} ${j.jumpMultiplier.toFixed(2)}x`;
            ctx.font = 'bold 9.5px system-ui, sans-serif';
            const tw = ctx.measureText(label).width;
            ctx.fillStyle = j.isPlayer ? 'rgba(245, 158, 11, 0.95)' : 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = j.isPlayer ? '#FEF08A' : '#10B981';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            safeRoundRect(ctx, -tw / 2 - 5, 21, tw + 10, 14, 5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = j.isPlayer ? '#0F172A' : '#4ADE80';
            ctx.textAlign = 'center';
            ctx.fillText(label, 0, 30.5);

            ctx.restore();
          }
        });
      }

      // =========================================================
      // 9. BURST STATE: EXPLOSION & FALLING BASKET WITH REMAINING PASSENGERS
      // =========================================================
      if (curStatus === 'BURST') {
        const originX = balloonX;
        const originY = balloonY;

        for (const sw of shockwavesRef.current) {
          sw.radius += 6.5 * dt;
          sw.alpha *= Math.pow(0.93, dt);
          ctx.save();
          ctx.strokeStyle = `rgba(255, 42, 58, ${Math.max(0, sw.alpha)})`;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(originX, originY, sw.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Tumbling Basket with Passengers who didn't jump in time
        if (fallingBasketRef.current) {
          const fb = fallingBasketRef.current;
          fb.x += fb.vx * dt;
          fb.y += fb.vy * dt;
          fb.vy += 0.28 * dt; // gravity
          fb.rotation += fb.vRot * dt;

          ctx.save();
          ctx.translate(fb.x, fb.y);
          ctx.rotate(fb.rotation);

          // Remaining passengers in falling basket
          fb.passengersLeft.forEach((pl, idx) => {
            const rx = -20 + idx * 8;
            ctx.fillStyle = pl.isPlayer ? '#FACC15' : pl.color;
            ctx.beginPath();
            ctx.arc(rx, -4, 4.5, 0, Math.PI * 2);
            ctx.fill();
          });

          ctx.fillStyle = '#78350F';
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2;
          ctx.beginPath();
          safeRoundRect(ctx, -basketW / 2, 0, basketW, basketH, 5);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        for (let i = explosionParticlesRef.current.length - 1; i >= 0; i--) {
          const p = explosionParticlesRef.current[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 0.14 * dt;
          p.rotation += p.vRot * dt;
          p.life += dt;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;

          if (p.shape === 'square') {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          } else if (p.shape === 'ribbon') {
            ctx.fillRect(-p.size, -1.8, p.size * 2, 3.6);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          if (p.life >= p.maxLife) {
            explosionParticlesRef.current.splice(i, 1);
          }
        }
      }

      // Burner sparks
      for (let i = burnerParticlesRef.current.length - 1; i >= 0; i--) {
        const p = burnerParticlesRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.life >= p.maxLife) {
          burnerParticlesRef.current.splice(i, 1);
        }
      }

      ctx.restore(); // end dpr scale
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Determine current altitude zone label
  const altitudeMeters = status === 'WAITING' ? 0 : Math.round((currentMultiplier - 1.0) * 650 + 45);
  const zoneLabel =
    currentMultiplier >= 22.0
      ? '🌌 Deep Space Galaxy'
      : currentMultiplier >= 10.0
      ? '🪐 Earth Orbit (Space)'
      : currentMultiplier >= 4.5
      ? '✨ Stratosphere & Aurora'
      : currentMultiplier >= 2.0
      ? '☁️ Cloud Kingdom'
      : '🏔️ Emerald Valley';

  const onBoardCount = passengers.filter((p) => !p.hasJumped).length;
  const jumpedCount = passengers.filter((p) => p.hasJumped).length;

  return (
    <div
      onDoubleClick={() => {
        if (isFullscreen && onExitFullscreen) {
          onExitFullscreen();
        }
      }}
      className={`canvas-arena-dark relative w-full ${
        isFullscreen
          ? 'h-[36dvh] sm:h-[50vh] md:h-[54vh]'
          : 'h-[240px] sm:h-[430px] md:h-[500px]'
      } rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-950 select-none`}
    >
      {/* 2D Creative Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

      {/* =========================================================================
          ULTRA-COMPACT SINGLE-ROW TOP HUD BAR (Never wraps over Multiplier!)
          ========================================================================= */}
      <div className="absolute top-1.5 sm:top-2.5 left-1.5 sm:left-2.5 right-1.5 sm:right-2.5 flex flex-nowrap items-center justify-between gap-1 pointer-events-auto z-30">
        {/* Left: Top-Side Game Balance Badge + Live Zone & Altitude */}
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-nowrap overflow-hidden">
          {/* Prominent In-Game Top Balance Badge */}
          <div className="flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-emerald-500/60 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl shadow-lg shadow-emerald-950/50 shrink-0">
            <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 hidden sm:inline">
              Bal:
            </span>
            <span className="text-[9.5px] sm:text-xs font-black font-mono text-emerald-400 whitespace-nowrap">
              Rs. {userBalance.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {onOpenCashier && (
              <button
                type="button"
                onClick={onOpenCashier}
                className="ml-0.5 px-1.5 py-0.2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9px] sm:text-[10px] rounded-md transition cursor-pointer leading-tight"
                title="Deposit / Withdraw LKR"
              >
                +
              </button>
            )}
          </div>

          <div className="hidden xs:flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl shadow min-w-0">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-black tracking-wide text-white truncate max-w-[80px] sm:max-w-none">
              {zoneLabel}
            </span>
          </div>

          {status === 'FLYING' && (
            <div className="bg-slate-900/90 backdrop-blur-md border border-sky-500/40 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl shadow flex items-center shrink-0">
              <span className="text-[9px] sm:text-[10px] font-black font-mono text-sky-300 whitespace-nowrap">
                ↑ {altitudeMeters.toLocaleString()}m
              </span>
            </div>
          )}
        </div>

        {/* Right: Compact Multiplayer Parachuters Status & Toggle */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onShowMultiplayer}
            className="bg-slate-900/90 hover:bg-slate-800/95 backdrop-blur-md border border-slate-700/80 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl shadow flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-bold transition cursor-pointer"
            title="Live Multiplayer Players On Board & Jumped (Click to view Multiplayer list)"
          >
            <span className="text-amber-300">
              🧺 {onBoardCount}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-emerald-400">
              🪂 {jumpedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowParachutes((prev) => !prev)}
            className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border transition shadow cursor-pointer flex items-center gap-1 ${
              showParachutes
                ? 'bg-blue-600/30 border-blue-500/60 text-blue-200'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title="Show or hide jumping parachuters"
          >
            <span>🪂</span>
            <span className="hidden sm:inline">{showParachutes ? 'Jumpers ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          DEDICATED BOTTOM-RIGHT FULL SCREEN / EXIT FULL SCREEN BUTTON
          Positioned at bottom-right so it NEVER covers the Multiplier or Multiplayer HUD!
          ========================================================================= */}
      {(onToggleFullscreen || onExitFullscreen) && (
        <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={handleFullscreenButtonClick}
            className={`text-[9.5px] sm:text-[11px] font-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border transition shadow-lg backdrop-blur-md cursor-pointer flex items-center gap-1.5 ${
              isFullscreen
                ? 'bg-rose-600/95 hover:bg-rose-500 border-rose-400 text-white shadow-rose-950/50'
                : 'bg-slate-900/90 hover:bg-slate-800 border-emerald-500/50 text-emerald-300 shadow-slate-950/60'
            }`}
            title={
              isFullscreen
                ? 'Exit Full Screen (or Double-Back)'
                : 'Play Game in Full Screen Mode'
            }
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white shrink-0" />
                <span>Exit Full Screen</span>
              </>
            ) : (
              <>
                <Maximize className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                <span>Full Screen</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Double-Back Full Screen Hint Banner */}
      {backPressHint && (
        <div className="absolute bottom-2.5 left-2 sm:left-3 z-40 pointer-events-none animate-fade-in max-w-[62%] sm:max-w-[70%]">
          <div className="px-2.5 py-1 rounded-full bg-slate-950/90 border border-amber-500/60 text-amber-300 text-[9.5px] sm:text-[11px] font-black shadow-xl backdrop-blur-md truncate">
            {backPressHint}
          </div>
        </div>
      )}

      {/* Top-Right Mini Cashout Toast (Positioned cleanly below single-row top bar) */}
      {latestCashoutToast && status === 'FLYING' && (
        <div className="absolute top-9 sm:top-11 right-1.5 sm:right-2.5 pointer-events-none z-20 animate-fade-in">
          <div
            className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[8.5px] sm:text-[9.5px] font-bold shadow border backdrop-blur-sm flex items-center gap-1 ${
              latestCashoutToast.isPlayer
                ? 'bg-amber-950/85 border-amber-500 text-amber-200'
                : 'bg-slate-900/80 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <span>🪂</span>
            <span className="truncate max-w-[55px] sm:max-w-[68px]">{latestCashoutToast.name}</span>
            <span className="font-mono text-white">{latestCashoutToast.mult.toFixed(2)}x</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          PROMINENT TOP-CENTER MULTIPLIER DISPLAY
          Elevated cleanly with z-30 and clear vertical separation so nothing ever overlaps it!
          ========================================================================= */}
      <div className="absolute top-9 sm:top-12 left-0 right-0 flex flex-col items-center pointer-events-none z-30 px-3">
        {status === 'FLYING' && (
          <div className="flex flex-col items-center">
            <div className="bg-slate-950/85 backdrop-blur-md border border-red-500/60 rounded-xl sm:rounded-2xl px-4 sm:px-8 py-0.5 sm:py-1.5 shadow-[0_0_30px_rgba(255,30,39,0.35)] flex flex-col items-center">
              <span className="text-2xl sm:text-5xl md:text-6xl font-black font-mono tracking-tight text-[#FF1E27] drop-shadow-[0_2px_10px_rgba(255,30,39,0.95)]">
                {currentMultiplier.toFixed(2)}x
              </span>
            </div>
          </div>
        )}

        {status === 'BURST' && (
          <div className="flex flex-col items-center animate-bounce-once">
            <div className="bg-red-950/90 backdrop-blur-md border-2 border-red-500 rounded-xl sm:rounded-2xl px-4 sm:px-9 py-1 sm:py-2.5 shadow-[0_0_50px_rgba(239,68,68,0.7)] flex flex-col items-center">
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider mb-0.5">
                CRASHED
              </span>
              <span className="text-2xl sm:text-5xl font-black font-mono text-red-400 drop-shadow-[0_4px_16px_rgba(239,68,68,0.9)]">
                @ {crashPoint.toFixed(2)}x
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-200 mt-0.5">
                {crashPoint <= 1.0 ? '💥 1.00x Instant Burst!' : 'Balloon burst in sky!'}
              </span>
            </div>
          </div>
        )}

        {status === 'WAITING' && (
          <div className="flex flex-col items-center">
            <div className="bg-slate-950/85 backdrop-blur-md border border-blue-500/50 rounded-xl sm:rounded-2xl px-3.5 sm:px-7 py-1 sm:py-2 shadow-xl flex flex-col items-center max-w-[190px] sm:max-w-[240px] w-full">
              <span className="text-[8.5px] sm:text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                BOARDING ({activeBetsCount} 🪂)
              </span>
              <span className="text-lg sm:text-3xl font-black font-mono text-white my-0.5 leading-tight">
                {waitingSecondsLeft.toFixed(1)}s
              </span>
              <div className="w-full bg-slate-800 h-1 sm:h-1.5 rounded-full overflow-hidden border border-slate-700/80">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-100 rounded-full"
                  style={{ width: `${Math.min(100, waitingProgress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
