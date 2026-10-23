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
    gradient: 'from-indigo-950 via-slate-900 to-purple-950',
    accentText: 'text-indigo-400',
  },
  {
    id: 'aviator_jet',
    title: 'Lion Jet X',
    subtitle: 'Crash • Multiplayer',
    category: 'crash',
    categoryLabel: 'Crash Games',
    icon: '✈️',
    gradient: 'from-rose-950 via-slate-900 to-orange-950',
    accentText: 'text-rose-400',
  },
  {
    id: 'plinko_gold',
    title: 'Lion Plinko',
    subtitle: 'Instant • Drop',
    category: 'instant',
    categoryLabel: 'Instant & Mines',
    icon: '🔮',
    gradient: 'from-amber-950 via-slate-900 to-yellow-950',
    accentText: 'text-amber-400',
  },
  {
    id: 'lion_bonanza',
    title: 'Lion Gold Megaways',
    subtitle: 'Slots • 6 Reels',
    category: 'slots',
    categoryLabel: 'Slots',
    icon: '🎰',
    gradient: 'from-purple-950 via-slate-900 to-fuchsia-950',
    accentText: 'text-purple-400',
  },
  {
    id: 'royal_roulette',
    title: 'Colombo VIP Roulette',
    subtitle: 'Table & Live',
    category: 'table',
    categoryLabel: 'Table & Live',
    icon: '🎡',
    gradient: 'from-cyan-950 via-slate-900 to-blue-950',
    accentText: 'text-cyan-400',
  },
];

const CATEGORIES: { id: GameCategory; label: string; badge: string }[] = [
  { id: 'all', label: 'All Casino Games', badge: '7' },
  { id: 'crash', label: '🔥 Crash Games', badge: '3' },
  { id: 'instant', label: '💎 Mines & Instant', badge: 'LIVE' },
  { id: 'slots', label: '🎰 Slots', badge: '1' },
  { id: 'table', label: '🃏 Table & Live', badge: '1' },
  { id: 'sports', label: '🏏⚽ Match Bet Slip (Separate Tab)', badge: 'LIVE' },
];

export const GamesLobby: React.FC<GamesLobbyProps> = ({
  currentUser,
  activePlayersCount = 0,
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

  // Keep online count steady within each time-of-day period (Morning vs Afternoon vs Evening vs Night) without jumping every few seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRoomOnlineBase(getTimeBasedCrashCrowd().onlineInGame);
    }, 300000); // Only re-evaluate every 5 minutes as time of day progresses
    return () => clearInterval(interval);
  }, []);

  const totalOnlineInGame = roomOnlineBase;

  useEffect(() => {
    if (!isLoadingGame) return;

    setLoadingProgress(0);
    setAwaitingSoundChoice(false);
    const startTime = performance.now();
    const duration = 2200; // Smooth 2.2s 60fps loading bar
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
  const showSportsBetting = selectedCategory === 'all' || selectedCategory === 'sports';
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
      className="group relative rounded-2xl overflow-hidden border-2 border-emerald-500/70 hover:border-emerald-400 bg-slate-900 shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div className="relative w-full aspect-[3/4] overflow-hidden select-none bg-[#020617] flex flex-col items-center justify-center text-center">
        <img
          src={WORLD_SPORTS_COVER_URL}
          alt="World Sports Betting"
          className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/35 pointer-events-none" />

        {/* Top Live Badge + Green Online Count Below It */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1 z-10">
          <div className="flex flex-col items-start gap-1">
            <span className="px-2 py-0.5 rounded-md bg-red-600/95 text-white text-[9px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-950/95 border border-emerald-500/80 text-emerald-400 text-[9px] font-black tracking-wide shadow-[0_0_10px_rgba(16,185,129,0.35)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Users className="w-2.5 h-2.5 text-emerald-400" />
              <span>{sportsOnlineCount} Online</span>
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-emerald-400/60 text-emerald-300 text-[8px] font-black uppercase shadow">
            BET SLIP
          </span>
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/50 text-emerald-200 text-[9px] font-extrabold tracking-wide">
            ⏱️ Bet Until Match Starts
          </span>
        </div>
      </div>

      <div className="p-2.5 bg-slate-950 flex flex-col gap-2">
        <div>
          <h3 className="text-xs sm:text-sm font-black text-white truncate">
            Live &amp; Pre-Match Slip
          </h3>
          <span className="text-[10px] text-emerald-400 font-bold block">
            World Sportsbook • LKR
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectSportsBetting?.();
          }}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-xs tracking-wide shadow flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>BET SLIP</span>
        </button>
      </div>
    </div>
  );

  const renderBalloonCrashCard = () => (
    <div
      onClick={handleLaunchBalloonCrash}
      className="group relative rounded-2xl overflow-hidden border-2 border-amber-500/70 hover:border-amber-400 bg-slate-900 shadow-lg hover:shadow-amber-500/30 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      {/* Creative Balloon Crash Logo Cover */}
      <div className="relative w-full aspect-[3/4] overflow-hidden select-none bg-[#030612] flex items-center justify-center">
        <img
          src={BALLOON_CRASH_LOGO}
          alt="Balloon Crash"
          className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500"
        />

        {/* Subtle bottom vignette for crisp badge contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/35 pointer-events-none" />

        {/* Top Live Dot + Green Online Players Count Below It & Category Tag */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1 z-10">
          <div className="flex flex-col items-start gap-1">
            <span className="px-2 py-0.5 rounded-md bg-red-600/95 text-white text-[9px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE
            </span>
            {/* Green Online Players Badge directly underneath LIVE */}
            <span className="px-2 py-0.5 rounded-md bg-emerald-950/95 border border-emerald-500/80 text-emerald-400 text-[9px] font-black tracking-wide shadow-[0_0_10px_rgba(16,185,129,0.35)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Users className="w-2.5 h-2.5 text-emerald-400" />
              <span>{totalOnlineInGame} Online</span>
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-amber-400/60 text-amber-300 text-[8px] font-black uppercase shadow">
            100x+ CRASH
          </span>
        </div>

        {/* Bottom Creative Floating Emblem Tag */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 backdrop-blur-sm border border-amber-400/50 text-amber-200 text-[9px] font-extrabold tracking-wide">
            🔥 Ride High or Crash!
          </span>
        </div>
      </div>

      {/* Compact Card Footer */}
      <div className="p-2.5 bg-slate-950 flex flex-col gap-2">
        <div>
          <h3 className="text-xs sm:text-sm font-black text-white truncate">
            Balloon Crash
          </h3>
          <span className="text-[10px] text-amber-400 font-bold block">
            Multiplayer • LKR
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleLaunchBalloonCrash();
          }}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 font-black text-xs tracking-wide shadow flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-slate-950" />
          <span>PLAY</span>
        </button>
      </div>
    </div>
  );

  const renderLankaMinesCard = () => (
    <div
      onClick={() => onSelectMines?.()}
      className="group relative rounded-2xl overflow-hidden border-2 border-emerald-500/80 hover:border-emerald-400 bg-slate-900 shadow-lg hover:shadow-emerald-500/35 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      {/* Creative 3D-Styled Lanka Mines Lobby Cover Artwork */}
      <div className="relative w-full aspect-[3/4] overflow-hidden select-none bg-[#040b16] flex flex-col items-center justify-center">
        {/* Radial Emerald & Gold Vault Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 42%, rgba(16, 185, 129, 0.45), rgba(6, 78, 59, 0.2) 48%, transparent 72%), radial-gradient(circle at 78% 72%, rgba(244, 63, 94, 0.35), transparent 52%), radial-gradient(circle at 22% 28%, rgba(245, 158, 11, 0.25), transparent 45%)',
          }}
        />

        {/* Custom Illustrated 5x5 Vault Grid + 3D Emerald & Naval Mine SVG Cover */}
        <svg
          viewBox="0 0 240 300"
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
        >
          <defs>
            <linearGradient id="minesBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#022c22" stopOpacity="0.65" />
              <stop offset="55%" stopColor="#0f172a" stopOpacity="0.85" />
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
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>

          <rect width="240" height="300" fill="url(#minesBgGrad)" />

          {/* Perspective 5x5 Vault Grid Background */}
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
                  rx="6"
                  fill={
                    isHighlightGem
                      ? 'rgba(16, 185, 129, 0.28)'
                      : isHighlightBomb
                      ? 'rgba(244, 63, 94, 0.28)'
                      : 'rgba(15, 23, 42, 0.85)'
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

          {/* Giant Hero 3D Faceted Emerald Diamond (Left-Center) */}
          <g transform="translate(34, 88)">
            <circle cx="52" cy="54" r="46" fill="#10b981" fillOpacity="0.22" />
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
            {/* Diamond Sparkles */}
            <circle cx="22" cy="18" r="3" fill="#ffffff" />
            <circle cx="88" cy="24" r="2.5" fill="#fef08a" />
          </g>

          {/* Spiked Naval Mine with Burning Fuse (Right-Bottom) */}
          <g transform="translate(122, 118)">
            <circle cx="46" cy="48" r="38" fill="#f43f5e" fillOpacity="0.24" />
            {/* Spikes */}
            <line x1="46" y1="8" x2="46" y2="88" stroke="#f43f5e" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="6" y1="48" x2="86" y2="48" stroke="#f43f5e" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="17" y1="19" x2="75" y2="77" stroke="#fb7185" strokeWidth="5" strokeLinecap="round" />
            <line x1="75" y1="19" x2="17" y2="77" stroke="#fb7185" strokeWidth="5" strokeLinecap="round" />
            {/* Bomb Sphere */}
            <circle
              cx="46"
              cy="48"
              r="27"
              fill="url(#bombBodyGrad)"
              stroke="#fb7185"
              strokeWidth="2.5"
            />
            {/* Specular Highlight */}
            <ellipse cx="36" cy="37" rx="8" ry="5" fill="#94a3b8" fillOpacity="0.45" transform="rotate(-25 36 37)" />
            {/* Glowing Red Core */}
            <circle cx="46" cy="48" r="9" fill="#ef4444" />
            <circle cx="46" cy="48" r="4" fill="#fef08a" />
          </g>

          {/* Bold Arcade Title Emblem inside Cover */}
          <text
            x="120"
            y="244"
            textAnchor="middle"
            fill="url(#goldTextGrad)"
            fontSize="24"
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
            5x5 EMERALD VAULT • LKR
          </text>
        </svg>

        {/* Subtle bottom vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/35 pointer-events-none" />

        {/* Top Live Badge + Online Count & Min Bet Rs. 10 Tag */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1 z-10">
          <div className="flex flex-col items-start gap-1">
            <span className="px-2 py-0.5 rounded-md bg-red-600/95 text-white text-[9px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-950/95 border border-emerald-500/80 text-emerald-400 text-[9px] font-black tracking-wide shadow-[0_0_10px_rgba(16,185,129,0.35)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Users className="w-2.5 h-2.5 text-emerald-400" />
              <span>{minesOnlineCount} Online</span>
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-emerald-400/60 text-emerald-300 text-[8px] font-black uppercase shadow">
            MIN Rs. 10
          </span>
        </div>

        {/* Bottom Floating Emblem Tag */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/50 text-emerald-200 text-[9px] font-extrabold tracking-wide">
            💎 Reveal Gems • Avoid Mines!
          </span>
        </div>
      </div>

      {/* Compact Card Footer */}
      <div className="p-2.5 bg-slate-950 flex flex-col gap-2">
        <div>
          <h3 className="text-xs sm:text-sm font-black text-white truncate">
            Lanka Mines
          </h3>
          <span className="text-[10px] text-emerald-400 font-bold block">
            Min Bet Rs. 10 • LKR
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectMines?.();
          }}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-500 to-amber-400 hover:from-emerald-300 hover:to-amber-300 text-slate-950 font-black text-xs tracking-wide shadow flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-slate-950" />
          <span>PLAY</span>
        </button>
      </div>
    </div>
  );

  const renderComingSoonCard = (game: ComingSoonGame) => {
    const coverImg = COMING_SOON_GAME_COVERS[game.id];
    return (
      <div
        key={game.id}
        className="group rounded-2xl overflow-hidden border border-slate-800/80 hover:border-amber-500/50 bg-slate-900/80 flex flex-col justify-between transition shadow-md"
      >
        <div
          className={`relative w-full aspect-[3/4] bg-gradient-to-b ${game.gradient} flex flex-col items-center justify-center overflow-hidden select-none`}
        >
          {coverImg && (
            <img
              src={coverImg}
              alt={game.title}
              className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/35 pointer-events-none" />
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-950/85 border border-slate-700/80 text-[8px] font-bold text-slate-200 uppercase z-10">
            {game.categoryLabel}
          </span>
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[8px] font-black text-amber-300 uppercase flex items-center gap-1 z-10">
            <Lock className="w-2.5 h-2.5 text-amber-400" />
            SOON
          </span>
        </div>
        <div className="p-2.5 bg-slate-950 flex flex-col gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-200 truncate">
              {game.title}
            </h3>
            <span className="text-[10px] text-slate-400 font-bold block">
              {game.subtitle}
            </span>
          </div>
          <div className="w-full py-2 rounded-xl bg-slate-900 border border-slate-800 text-center text-[10px] font-bold text-amber-400/80">
            Coming Soon
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-7 pb-24 space-y-6 relative">
      {/* =====================================================================
          BALLOON CRASH LOADING SCREEN WITH BACKGROUND IMAGE + SOUND PROMPT
          ===================================================================== */}
      {isLoadingGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-fade-in overflow-hidden">
          {/* Full-Screen Balloon Crash Background Image */}
          <img
            src={BALLOON_CRASH_BG_IMAGE}
            alt="Balloon Crash Loading Background"
            className="absolute inset-0 w-full h-full object-cover object-center scale-105 blur-[3px] brightness-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/65 to-slate-950/90 backdrop-blur-[2px]" />

          {/* Center Loading Card with New Balloon Crash Logo */}
          <div className="relative z-10 bg-slate-900/95 border-2 border-amber-500/60 rounded-3xl p-4 sm:p-5 w-full max-w-[330px] shadow-[0_0_50px_rgba(245,158,11,0.35)] flex flex-col items-center text-center overflow-hidden">
            {/* Ambient Top Glow */}
            <div className="absolute -top-12 w-44 h-44 rounded-full bg-amber-500/25 blur-2xl pointer-events-none" />

            {/* Balloon Crash Loading Logo */}
            <div className="relative w-full aspect-square max-w-[205px] rounded-2xl overflow-hidden border-2 border-amber-400/70 shadow-xl shadow-orange-500/20 mb-3 bg-[#030612] flex items-center justify-center">
              <img
                src={BALLOON_CRASH_LOGO}
                alt="Balloon Crash Logo"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/15 rounded-2xl pointer-events-none" />
              <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                <span className="px-2 py-0.5 rounded-full bg-red-600/95 text-white text-[9px] font-black uppercase tracking-wider shadow flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  LIVE
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/95 border border-emerald-500/80 text-emerald-400 text-[9px] font-black tracking-wide shadow flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <Users className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{totalOnlineInGame} Online</span>
                </span>
              </div>
            </div>

            <h3 className="text-base font-black text-white tracking-wider uppercase drop-shadow">
              BALLOON <span className="text-amber-400">CRASH</span>
            </h3>

            {!awaitingSoundChoice ? (
              <div className="w-full mt-1">
                <div className="flex items-center justify-center gap-2 my-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce"
                    style={{ animationDelay: '0ms', animationDuration: '0.7s' }}
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce"
                    style={{ animationDelay: '150ms', animationDuration: '0.7s' }}
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce"
                    style={{ animationDelay: '300ms', animationDuration: '0.7s' }}
                  />
                </div>
                <p className="text-xs font-bold text-amber-200/90 mb-3 h-4">
                  {loadingStageText}
                </p>

                {/* Glowing Progress Bar */}
                <div className="w-full bg-slate-950 border border-amber-500/40 h-3 rounded-full overflow-hidden p-0.5 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-100 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>

                <div className="w-full flex items-center justify-between text-[11px] font-black font-mono text-slate-300 mt-1.5">
                  <span>LOADING GAME...</span>
                  <span className="text-amber-400">{loadingProgress}%</span>
                </div>
              </div>
            ) : (
              <div className="w-full mt-2 pt-2.5 border-t border-slate-800 space-y-3">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-1">
                    100% Loaded
                  </span>
                  <p className="text-xs sm:text-sm font-extrabold text-white">
                    Enable Game Sound Effects?
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Choose your audio preference to enter the arena
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => handleConfirmSoundChoice(true)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition active:scale-95 cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5" />
                    <span>Sound ON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmSoundChoice(false)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black text-xs transition active:scale-95 cursor-pointer"
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

      {/* Compact Welcome & Wallet Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-950 border border-amber-500/60 shadow-lg shadow-amber-500/20 overflow-hidden shrink-0">
            <img
              src={LION_BET_LOGO_URL}
              alt="Lion Bet Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LION BET GAMES LOBBY</span>
            </div>
            <h1 className="text-base sm:text-xl font-black text-white truncate">
              Hello, <span className="text-amber-400">{currentUser.username}</span> {currentUser.avatar}
            </h1>
            <span className="text-[10px] font-mono text-slate-400">
              User ID: {currentUser.id}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center gap-2 flex-1 sm:flex-initial">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 block leading-none">
                Balance
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-400">
                Rs. {currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenCashier('deposit')}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition cursor-pointer active:scale-95"
          >
            + Deposit
          </button>

          <button
            type="button"
            onClick={() => onOpenCashier('withdraw')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/35 font-black text-xs sm:text-sm transition cursor-pointer active:scale-95"
          >
            Withdraw
          </button>

          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs sm:text-sm transition border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer"
              title="Open Profile (View User ID & Edit Details)"
            >
              <UserCircle className="w-4 h-4" />
              <span>Profile</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenReferral}
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs sm:text-sm transition border border-amber-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Gift className="w-4 h-4" />
            <span>Refer</span>
          </button>

          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Leaders</span>
          </button>

          <a
            href="https://whatsapp.com/channel/0029Vb8vhzCHFxOtG2NiJK2w"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-slate-950 font-black text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md"
            title="Join Lion Bet Official WhatsApp Channel"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Official WhatsApp Channel</span>
          </a>
        </div>
      </div>

      {/* =====================================================================
          TOP-LEVEL SEPARATE TABS: CASINO GAMES vs LIVE MATCH BET SLIP
          ("bet slip option එක crash game ලගින් දානා එපා, ඒක වෙනම tab එකක දාන්න")
          ===================================================================== */}
      <div className="grid grid-cols-2 gap-3 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
            selectedCategory !== 'sports'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
              : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <Gamepad2 className="w-4 h-4 shrink-0" />
          <span>Casino &amp; Crash Games</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSportsBetting?.()}
          className="py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer bg-slate-950 hover:bg-emerald-950/60 text-emerald-400 border border-emerald-500/50 hover:border-emerald-400"
        >
          <Ticket className="w-4 h-4 shrink-0" />
          <span>Live Match Bet Slip (World Sports)</span>
        </button>
      </div>

      {/* =====================================================================
          GAME CATEGORIES FILTER BAR
          ("games lobby එකේ catogory කරල තමයි තියෙන්න ඕන")
          ===================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Game Categories</span>
          </h2>
          <div className="text-[11px] font-bold text-slate-400 hidden sm:flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Provably Fair Verified</span>
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
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition shrink-0 cursor-pointer border ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : cat.id === 'sports'
                    ? 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                    isActive
                      ? 'bg-slate-950/25 text-slate-950'
                      : cat.id === 'sports'
                      ? 'bg-emerald-500 text-slate-950'
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
          CATEGORIZED GAME SECTIONS (CRASH GAMES ONLY - NO BET SLIP NEXT TO IT)
          ===================================================================== */}
      {selectedCategory === 'all' ? (
        <div className="space-y-6">
          {/* Category 1: Crash & Featured Live Games */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400">
                  Featured Live &amp; Crash Games
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                  2 Live • 2 Soon
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
              {renderBalloonCrashCard()}
              {renderLankaMinesCard()}
              {COMING_SOON_GAMES.filter((g) => g.category === 'crash').map(renderComingSoonCard)}
            </div>
          </div>

          {/* Category 2: Instant & Mines Games */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400">
                  Instant &amp; Mines Games
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                  1 Live • Min Bet Rs. 10 LKR
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
              {renderLankaMinesCard()}
              {COMING_SOON_GAMES.filter((g) => g.category === 'instant').map(renderComingSoonCard)}
            </div>
          </div>

          {/* Category 3: Slots & Table Games */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-purple-400">
                  Slots &amp; Live Table Games
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
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
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
            <Gamepad2 className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
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
