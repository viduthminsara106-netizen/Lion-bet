import React, { useState, useEffect } from 'react';
import { User } from '../types/game';
import { getTimeBasedCrashCrowd } from '../services/storage';
import {
  LION_BET_LOGO_URL,
  BALLOON_CRASH_LOGO_URL,
  BALLOON_CRASH_BG_URL,
  WORLD_SPORTS_COVER_URL,
  COMING_SOON_GAME_COVERS,
} from '../services/brandAssets';
import {
  Play,
  Flame,
  ShieldCheck,
  Wallet,
  Trophy,
  Gift,
  Lock,
  UserCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Gamepad2,
  Layers,
  Users,
  Ticket,
  MessageCircle,
} from 'lucide-react';

interface GamesLobbyProps {
  currentUser: User;
  activePlayersCount?: number;
  onSelectBalloonCrash: (soundEnabled?: boolean) => void;
  onSelectMines?: () => void;
  onSelectSportsBetting?: () => void;
  onOpenCashier: (tab?: 'deposit' | 'withdraw') => void;
  onOpenLeaderboard: () => void;
  onOpenReferral: () => void;
  onOpenProfile?: () => void;
}

type GameCategory = 'all' | 'crash' | 'sports' | 'instant' | 'slots' | 'table';

interface ComingSoonGame {
  id: string;
  title: string;
  subtitle: string;
  category: Exclude<GameCategory, 'all'>;
  categoryLabel: string;
  icon: string;
  gradient: string;
  accentText: string;
}

const COMING_SOON_GAMES: ComingSoonGame[] = [
  {
    id: 'space_rocket',
    title: 'Space Rocket',
    subtitle: 'Crash • Multiplier',
    category: 'crash',
    categoryLabel: 'Crash Games',
    icon: '🚀',
    gradient: 'from-slate-900 via-slate-900 to-slate-950',
    accentText: 'text-amber-400',
  },
  {
    id: 'aviator_jet',
    title: 'Lion Jet X',
    subtitle: 'Crash • Multiplayer',
    category: 'crash',
    categoryLabel: 'Crash Games',
    icon: '✈️',
    gradient: 'from-slate-900 via-slate-900 to-slate-950',
    accentText: 'text-amber-400',
  },
  {
    id: 'plinko_gold',
    title: 'Lion Plinko',
    subtitle: 'Instant • Drop',
    category: 'instant',
    categoryLabel: 'Mines & Instant',
    icon: '🔮',
    gradient: 'from-slate-900 via-slate-900 to-slate-950',
    accentText: 'text-emerald-400',
  },
  {
    id: 'lion_bonanza',
    title: 'Lion Gold Megaways',
    subtitle: 'Slots • 6 Reels',
    category: 'slots',
    categoryLabel: 'Slots',
    icon: '🎰',
    gradient: 'from-slate-900 via-slate-900 to-slate-950',
    accentText: 'text-amber-400',
  },
  {
    id: 'royal_roulette',
    title: 'Colombo VIP Roulette',
    subtitle: 'Table & Live',
    category: 'table',
    categoryLabel: 'Table & Live',
    icon: '🎡',
    gradient: 'from-slate-900 via-slate-900 to-slate-950',
    accentText: 'text-amber-400',
  },
];

const CATEGORIES: { id: GameCategory; label: string; badge: string }[] = [
  { id: 'all', label: 'All Casino Games', badge: '7' },
  { id: 'crash', label: 'Crash Games', badge: '3' },
  { id: 'instant', label: 'Mines & Instant', badge: '2' },
  { id: 'slots', label: 'Classic Slots', badge: '1' },
  { id: 'table', label: 'Table & Live', badge: '1' },
  { id: 'sports', label: 'Sportsbook Bet Slip', badge: 'LIVE' },
];

export const GamesLobby: React.FC<GamesLobbyProps> = ({
  currentUser,
  onSelectBalloonCrash,
  onSelectMines,
  onSelectSportsBetting,
  onOpenCashier,
  onOpenLeaderboard,
  onOpenReferral,
  onOpenProfile,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('all');
  const [isLoadingGame, setIsLoadingGame] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [awaitingSoundChoice, setAwaitingSoundChoice] = useState(false);
  const [roomOnlineBase, setRoomOnlineBase] = useState<number>(
    () => getTimeBasedCrashCrowd().onlineInGame
  );

  // Keep online count steady within each time-of-day period
  useEffect(() => {
    const interval = setInterval(() => {
      setRoomOnlineBase(getTimeBasedCrashCrowd().onlineInGame);
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const totalOnlineInGame = roomOnlineBase;

  useEffect(() => {
    if (!isLoadingGame) return;

    setLoadingProgress(0);
    setAwaitingSoundChoice(false);
    const startTime = performance.now();
    const duration = 2200;
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setLoadingProgress(pct);
      if (pct >= 100) {
        setAwaitingSoundChoice(true);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isLoadingGame]);

  const handleLaunchBalloonCrash = () => {
    if (isLoadingGame) return;
    setLoadingProgress(0);
    setAwaitingSoundChoice(false);
    setIsLoadingGame(true);
  };

  const handleConfirmSoundChoice = (enableSound: boolean) => {
    setIsLoadingGame(false);
    setAwaitingSoundChoice(false);
    onSelectBalloonCrash(enableSound);
  };

  const loadingStageText =
    loadingProgress < 25
      ? 'Connecting to Server...'
      : loadingProgress < 55
      ? 'Inflating Balloon...'
      : loadingProgress < 85
      ? 'Boarding Parachuters...'
      : loadingProgress < 100
      ? 'Preparing Arena...'
      : 'Ready to Fly!';

  const showBalloonCrash = selectedCategory === 'all' || selectedCategory === 'crash';
  const showMinesGame = selectedCategory === 'all' || selectedCategory === 'instant';
  const showSportsBetting = selectedCategory === 'sports';
  const sportsOnlineCount = Math.max(31, totalOnlineInGame + 14);
  const minesOnlineCount = Math.max(24, totalOnlineInGame - 9);
  const filteredComingSoon =
    selectedCategory === 'all'
      ? COMING_SOON_GAMES
      : COMING_SOON_GAMES.filter((g) => g.category === selectedCategory);

  const BALLOON_CRASH_BG_IMAGE = BALLOON_CRASH_BG_URL;
  const BALLOON_CRASH_LOGO = BALLOON_CRASH_LOGO_URL;

  const renderSportsBettingCard = () => (
    <div
      onClick={() => onSelectSportsBetting?.()}
      className="group relative rounded-xl overflow-hidden border border-slate-700 hover:border-emerald-500 bg-slate-900 shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div className="relative w-full aspect-[3/4] overflow-hidden select-none bg-slate-950 flex flex-col items-center justify-center text-center">
        <img
          src={WORLD_SPORTS_COVER_URL}
          alt="World Sports Betting"
          className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40 pointer-events-none" />

        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1 z-10">
          <div className="flex flex-col items-start gap-1">
            <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              LIVE
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-950/95 border border-emerald-500/60 text-emerald-400 text-[9px] font-bold font-mono tabular-nums flex items-center gap-1">
              <Users className="w-2.5 h-2.5 text-emerald-400" />
              <span>{sportsOnlineCount}</span>
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-emerald-400 text-[8px] font-bold uppercase">
            BET SLIP
          </span>
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
          <span className="px-2 py-0.5 rounded bg-slate-950/85 border border-slate-700 text-slate-200 text-[9px] font-semibold">
            Pre-Match &amp; Live Odds
          </span>
        </div>
      </div>

      <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-white truncate">
            Live &amp; Pre-Match Slip
          </h3>
          <span className="text-[10px] text-slate-400 font-medium block">
            World Sportsbook • LKR
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectSportsBetting?.();
          }}
          className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>OPEN BET SLIP</span>
        </button>
      </div>
    </div>
  );

  const renderBalloonCrashCard = () => (
    <div
      onClick={handleLaunchBalloonCrash}
      className="group relative rounded-xl overflow-hidden border border-amber-500/60 hover:border-amber-400 bg-slate-900 shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      {/* Classic Balloon Crash Cover */}
      <div className="relative w-full aspect-[3/4] overflow-hidden select-none bg-slate-950 flex items-center justify-center">
        <img
          src={BALLOON_CRASH_LOGO}
          alt="Balloon Crash"
          className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/35 pointer-events-none" />

        {/* Classic Top Status Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1 z-10">
          <div className="flex flex-col items-start gap-1">
            <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              LIVE
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-950/95 border border-emerald-500/60 text-emerald-400 text-[9px] font-bold font-mono tabular-nums flex items-center gap-1">
              <Users className="w-2.5 h-2.5 text-emerald-400" />
              <span>{totalOnlineInGame} Online</span>
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-amber-500/50 text-amber-400 text-[8px] font-bold uppercase">
            CRASH
          </span>
        </div>

        {/* Classic Bottom Tag */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
          <span className="px-2 py-0.5 rounded bg-slate-950/85 border border-slate-700 text-amber-300 text-[9px] font-semibold">
            100x+ Multiplier Arena
          </span>
        </div>
      </div>

      {/* Classic Card Footer */}
      <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-white truncate">
            Balloon Crash
          </h3>
          <span className="text-[10px] text-amber-400 font-medium block">
            Crash Game • LKR
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleLaunchBalloonCrash();
          }}
          className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-slate-950" />
          <span>PLAY NOW</span>
        </button>
      </div>
    </div>
  );

  const renderLankaMinesCard = () => (
    <div
      onClick={() => onSelectMines?.()}
      className="group relative rounded-xl overflow-hidden border border-emerald-500/60 hover:border-emerald-400 bg-slate-900 shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      {/* Classic Lanka Mines Cover */}
      <div className="relative w-full aspect-[3/4] overflow-hidden select-none bg-[#06101e] flex flex-col items-center justify-center">
        <svg
          viewBox="0 0 240 300"
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
        >
          <defs>
            <linearGradient id="minesBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#064e3b" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#0f172a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.98" />
            </linearGradient>
            <linearGradient id="gemFacetTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="gemFacetBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>
            <radialGradient id="bombBodyGrad" cx="38%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="55%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
            <linearGradient id="goldTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>

          <rect width="240" height="300" fill="url(#minesBgGrad)" />

          {/* Classic 5x5 Vault Grid Background */}
          <g transform="translate(22, 62)" opacity="0.85">
            {Array.from({ length: 25 }).map((_, i) => {
              const r = Math.floor(i / 5);
              const c = i % 5;
              const x = c * 40;
              const y = r * 34;
              const isHighlightGem = i === 6 || i === 8 || i === 12 || i === 16;
              const isHighlightBomb = i === 13 || i === 18;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width="35"
                  height="29"
                  rx="5"
                  fill={
                    isHighlightGem
                      ? 'rgba(16, 185, 129, 0.25)'
                      : isHighlightBomb
                      ? 'rgba(244, 63, 94, 0.25)'
                      : 'rgba(15, 23, 42, 0.9)'
                  }
                  stroke={
                    isHighlightGem
                      ? '#34d399'
                      : isHighlightBomb
                      ? '#fb7185'
                      : 'rgba(51, 65, 85, 0.7)'
                  }
                  strokeWidth="1.5"
                />
              );
            })}
          </g>

          {/* Faceted Emerald Diamond */}
          <g transform="translate(34, 88)">
            <circle cx="52" cy="54" r="44" fill="#10b981" fillOpacity="0.18" />
            <polygon
              points="28,12 76,12 98,38 52,98 6,38"
              fill="url(#gemFacetBody)"
              stroke="#a7f3d0"
              strokeWidth="2.5"
            />
            <polygon points="28,12 76,12 66,38 38,38" fill="url(#gemFacetTop)" />
            <polygon points="6,38 28,12 38,38" fill="#6ee7b7" fillOpacity="0.8" />
            <polygon points="98,38 76,12 66,38" fill="#059669" fillOpacity="0.9" />
            <polygon points="38,38 66,38 52,98" fill="#34d399" fillOpacity="0.65" />
          </g>

          {/* Classic Naval Mine */}
          <g transform="translate(122, 118)">
            <circle cx="46" cy="48" r="36" fill="#f43f5e" fillOpacity="0.2" />
            <line x1="46" y1="8" x2="46" y2="88" stroke="#f43f5e" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="6" y1="48" x2="86" y2="48" stroke="#f43f5e" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="17" y1="19" x2="75" y2="77" stroke="#fb7185" strokeWidth="5" strokeLinecap="round" />
            <line x1="75" y1="19" x2="17" y2="77" stroke="#fb7185" strokeWidth="5" strokeLinecap="round" />
            <circle
              cx="46"
              cy="48"
              r="27"
              fill="url(#bombBodyGrad)"
              stroke="#fb7185"
              strokeWidth="2.5"
            />
            <ellipse cx="36" cy="37" rx="8" ry="5" fill="#94a3b8" fillOpacity="0.45" transform="rotate(-25 36 37)" />
            <circle cx="46" cy="48" r="9" fill="#ef4444" />
            <circle cx="46" cy="48" r="4" fill="#fef08a" />
          </g>

          <text
            x="120"
            y="244"
            textAnchor="middle"
            fill="url(#goldTextGrad)"
            fontSize="22"
            fontWeight="900"
            letterSpacing="2"
          >
            LANKA MINES
          </text>
          <text
            x="120"
            y="262"
            textAnchor="middle"
            fill="#6ee7b7"
            fontSize="10"
            fontWeight="800"
            letterSpacing="1.5"
          >
            5x5 CLASSIC VAULT • LKR
          </text>
        </svg>

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/35 pointer-events-none" />

        {/* Top Live Badge + Online Count */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1 z-10">
          <div className="flex flex-col items-start gap-1">
            <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              LIVE
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-950/95 border border-emerald-500/60 text-emerald-400 text-[9px] font-bold font-mono tabular-nums flex items-center gap-1">
              <Users className="w-2.5 h-2.5 text-emerald-400" />
              <span>{minesOnlineCount} Online</span>
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-emerald-500/50 text-emerald-400 text-[8px] font-bold uppercase">
            MINES
          </span>
        </div>

        {/* Bottom Tag */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
          <span className="px-2 py-0.5 rounded bg-slate-950/85 border border-slate-700 text-emerald-300 text-[9px] font-semibold">
            Min Bet Rs. 10 LKR
          </span>
        </div>
      </div>

      {/* Classic Card Footer */}
      <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-white truncate">
            Lanka Mines
          </h3>
          <span className="text-[10px] text-emerald-400 font-medium block">
            Mines &amp; Instant • LKR
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectMines?.();
          }}
          className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>PLAY NOW</span>
        </button>
      </div>
    </div>
  );

  const renderComingSoonCard = (game: ComingSoonGame) => {
    const coverImg = COMING_SOON_GAME_COVERS[game.id];
    return (
      <div
        key={game.id}
        className="group rounded-xl overflow-hidden border border-slate-800 hover:border-slate-700 bg-slate-900 flex flex-col justify-between transition shadow-sm"
      >
        <div
          className={`relative w-full aspect-[3/4] bg-gradient-to-b ${game.gradient} flex flex-col items-center justify-center overflow-hidden select-none`}
        >
          {coverImg && (
            <img
              src={coverImg}
              alt={game.title}
              className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40 pointer-events-none" />
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[8px] font-bold text-slate-300 uppercase z-10">
            {game.categoryLabel}
          </span>
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-950/90 border border-amber-500/40 text-[8px] font-bold text-amber-400 uppercase flex items-center gap-1 z-10">
            <Lock className="w-2.5 h-2.5 text-amber-400" />
            SOON
          </span>
        </div>
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-200 truncate">
              {game.title}
            </h3>
            <span className="text-[10px] text-slate-400 font-medium block">
              {game.subtitle}
            </span>
          </div>
          <div className="w-full py-2 rounded-lg bg-slate-900 border border-slate-800 text-center text-[10px] font-bold text-slate-400">
            Coming Soon
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 space-y-5 relative">
      {/* =====================================================================
          BALLOON CRASH LOADING SCREEN WITH BACKGROUND IMAGE + SOUND PROMPT
          ===================================================================== */}
      {isLoadingGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-fade-in overflow-hidden">
          <img
            src={BALLOON_CRASH_BG_IMAGE}
            alt="Balloon Crash Loading Background"
            className="absolute inset-0 w-full h-full object-cover object-center scale-105 blur-[3px] brightness-50"
          />
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]" />

          <div className="relative z-10 bg-slate-900 border border-amber-500/60 rounded-2xl p-4 sm:p-5 w-full max-w-[330px] shadow-2xl flex flex-col items-center text-center overflow-hidden">
            <div className="relative w-full aspect-square max-w-[200px] rounded-xl overflow-hidden border border-amber-500/60 shadow-lg mb-3 bg-slate-950 flex items-center justify-center">
              <img
                src={BALLOON_CRASH_LOGO}
                alt="Balloon Crash Logo"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider shadow">
                  LIVE
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950/95 border border-emerald-500/70 text-emerald-400 text-[9px] font-bold font-mono tabular-nums flex items-center gap-1">
                  <Users className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{totalOnlineInGame} Online</span>
                </span>
              </div>
            </div>

            <h3 className="text-base font-bold text-white tracking-wider uppercase">
              BALLOON <span className="text-amber-400">CRASH</span>
            </h3>

            {!awaitingSoundChoice ? (
              <div className="w-full mt-2">
                <p className="text-xs font-semibold text-amber-200/90 mb-2.5 h-4">
                  {loadingStageText}
                </p>

                <div className="w-full bg-slate-950 border border-slate-700 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-100"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>

                <div className="w-full flex items-center justify-between text-[11px] font-bold font-mono tabular-nums text-slate-300 mt-1.5">
                  <span>LOADING...</span>
                  <span className="text-amber-400">{loadingProgress}%</span>
                </div>
              </div>
            ) : (
              <div className="w-full mt-2 pt-2.5 border-t border-slate-800 space-y-3">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Ready
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-white">
                    Enable Game Sound Effects?
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Select your audio preference to enter the arena
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => handleConfirmSoundChoice(true)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5" />
                    <span>Sound ON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmSoundChoice(false)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    <VolumeX className="w-5 h-5 text-rose-400" />
                    <span>Sound OFF</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Classic Welcome & Wallet Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-[#050505] border border-amber-500/70 shadow-md overflow-hidden shrink-0 flex items-center justify-center">
            <img
              src={LION_BET_LOGO_URL}
              alt="Lion Bet Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>OFFICIAL LION BET CASINO LOBBY</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white truncate">
              Welcome, <span className="text-amber-400">{currentUser.username}</span> {currentUser.avatar}
            </h1>
            <span className="text-[10px] font-mono tabular-nums text-slate-400">
              Account ID: {currentUser.id}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 flex items-center gap-2 flex-1 sm:flex-initial">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">
                Main Balance
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-emerald-400">
                Rs. {currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenCashier('deposit')}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            + Deposit
          </button>

          <button
            type="button"
            onClick={() => onOpenCashier('withdraw')}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            Withdraw
          </button>

          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm transition border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              title="Open Profile"
            >
              <UserCircle className="w-4 h-4 text-amber-400" />
              <span>Profile</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenReferral}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs sm:text-sm transition border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Gift className="w-4 h-4" />
            <span>Refer</span>
          </button>

          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm transition border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Leaders</span>
          </button>

          <a
            href="https://whatsapp.com/channel/0029Vb8vhzCHFxOtG2NiJK2w"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-xs sm:text-sm transition flex items-center gap-1.5"
            title="Join Lion Bet Official WhatsApp Channel"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp Channel</span>
          </a>
        </div>
      </div>

      {/* =====================================================================
          CLASSIC TOP-LEVEL NAVIGATION SWITCHER: CASINO LOBBY vs SPORTSBOOK
          ===================================================================== */}
      <div className="grid grid-cols-2 gap-2.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
            selectedCategory !== 'sports'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <Gamepad2 className="w-4 h-4 shrink-0" />
          <span>Casino Games Lobby</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSportsBetting?.()}
          className="py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 hover:border-emerald-500/50"
        >
          <Ticket className="w-4 h-4 shrink-0" />
          <span>World Sports Bet Slip</span>
        </button>
      </div>

      {/* =====================================================================
          CLASSIC GAME CATEGORIES FILTER BAR
          ===================================================================== */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Select Game Category</span>
          </h2>
          <div className="text-[11px] font-semibold text-slate-400 hidden sm:flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Provably Fair RNG</span>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (cat.id === 'sports') {
                    onSelectSportsBetting?.();
                  } else {
                    setSelectedCategory(cat.id);
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer border ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : cat.id === 'sports'
                    ? 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isActive
                      ? 'bg-slate-950/20 text-slate-950'
                      : cat.id === 'sports'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {cat.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          CATEGORIZED GAME SECTIONS
          NOTE: Mines is strictly in "Mines & Instant Games" and removed from "Crash Games"
          ===================================================================== */}
      {selectedCategory === 'all' ? (
        <div className="space-y-6">
          {/* Category 1: Crash Games ONLY (Balloon Crash, Space Rocket, Lion Jet X) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  Crash Games
                </h3>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-400 text-[10px] font-bold">
                  1 Live • 2 Coming Soon
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
              {renderBalloonCrashCard()}
              {COMING_SOON_GAMES.filter((g) => g.category === 'crash').map(renderComingSoonCard)}
            </div>
          </div>

          {/* Category 2: Mines & Instant Games (Lanka Mines, Lion Plinko) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  Mines &amp; Instant Games
                </h3>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] font-bold">
                  1 Live • Min Bet Rs. 10 LKR
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
              {renderLankaMinesCard()}
              {COMING_SOON_GAMES.filter((g) => g.category === 'instant').map(renderComingSoonCard)}
            </div>
          </div>

          {/* Category 3: Classic Slots & Live Table Games */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  Classic Slots &amp; Table Games
                </h3>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-bold">
                  Coming Soon
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
              {COMING_SOON_GAMES.filter(
                (g) => g.category === 'slots' || g.category === 'table'
              ).map(renderComingSoonCard)}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Gamepad2 className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
              {CATEGORIES.find((c) => c.id === selectedCategory)?.label}
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
            {showBalloonCrash && renderBalloonCrashCard()}
            {showMinesGame && renderLankaMinesCard()}
            {showSportsBetting && renderSportsBettingCard()}
            {filteredComingSoon.map(renderComingSoonCard)}
          </div>
        </div>
      )}
    </div>
  );
};
