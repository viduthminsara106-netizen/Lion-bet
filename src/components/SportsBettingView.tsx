import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SportsMatch,
  SportType,
  BetSlipSelection,
  SportsBetSlip,
  User,
} from '../types/game';
import { ThreeDotsLoader } from './BottomNavAndMenu';
import {
  Trophy,
  Clock,
  Ticket,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Wallet,
  Plus,
  Minus,
  Zap,
  Lock,
  RefreshCw,
  History,
  Flame,
  MessageCircle,
  Radio,
} from 'lucide-react';

interface SportsBettingViewProps {
  currentUser: User;
  onUpdateUserBalance: (newBalance: number, wagerDelta?: number, wonDelta?: number) => void;
  onOpenCashier: (tab?: 'deposit' | 'withdraw') => void;
  onBackToLobby: () => void;
}

const SLIPS_STORAGE_KEY = 'lionbet_sports_bet_slips_v1';
const OFFICIAL_WHATSAPP_CHANNEL = 'https://whatsapp.com/channel/0029Vb8vhzCHFxOtG2NiJK2w';
const WIN_MULTIPLIER_2X = 2.0;

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'Live Now';
  const totalSec = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSec / 86400);
  const hrs = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) {
    return `${days}d ${hrs}h ${String(mins).padStart(2, '0')}m`;
  }
  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

export const SportsBettingView: React.FC<SportsBettingViewProps> = ({
  currentUser,
  onUpdateUserBalance,
  onOpenCashier,
  onBackToLobby,
}) => {
  const [matches, setMatches] = useState<SportsMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [now, setNow] = useState<number>(() => Date.now());
  const [sportFilter, setSportFilter] = useState<'all' | SportType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'LIVE' | 'UPCOMING'>('all');
  const [activeTab, setActiveTab] = useState<'matches' | 'my_slips'>('matches');
  const [allowLiveInSlip, setAllowLiveInSlip] = useState<boolean>(true);

  // Per-Match Bet Slip state (Each match has its own Bet Slip right beside it!)
  const [matchSelections, setMatchSelections] = useState<Record<string, BetSlipSelection>>({});
  const [matchStakes, setMatchStakes] = useState<Record<string, number>>({});
  const [matchFeedback, setMatchFeedback] = useState<
    Record<string, { type: 'success' | 'error'; message: string }>
  >({});

  // User's Placed Bet Slips History
  const [placedSlips, setPlacedSlips] = useState<SportsBetSlip[]>(() => {
    try {
      localStorage.removeItem('lionbet_world_matches_v1');
      const saved = localStorage.getItem(SLIPS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(SLIPS_STORAGE_KEY, JSON.stringify(placedSlips));
    } catch {
      // ignore
    }
  }, [placedSlips]);

  // Direct client-side ESPN fallback if server route is unreachable
  const fetchDirectClientESPN = async (): Promise<SportsMatch[]> => {
    const endpoints: { url: string; sport: SportType; league: string; flag: string }[] = [
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard',
        sport: 'football',
        league: 'Global Football',
        flag: '⚽',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
        sport: 'football',
        league: 'Premier League',
        flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard',
        sport: 'football',
        league: 'Spain LaLiga',
        flag: '🇪🇸',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/cricket/scoreboard',
        sport: 'cricket',
        league: 'International Cricket',
        flag: '🏏',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
        sport: 'basketball',
        league: 'NBA',
        flag: '🏀',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard',
        sport: 'tennis',
        league: 'ATP Tour',
        flag: '🎾',
      },
    ];

    const map = new Map<string, SportsMatch>();
    await Promise.allSettled(
      endpoints.map(async (ep) => {
        const r = await fetch(ep.url);
        if (!r.ok) return;
        const data = await r.json();
        const leagueTitle = data?.leagues?.[0]?.name || ep.league;
        const events = Array.isArray(data?.events) ? data.events : [];
        for (const ev of events) {
          const comps = Array.isArray(ev?.competitions) ? ev.competitions : [];
          for (const comp of comps) {
            const competitors = comp?.competitors;
            if (!Array.isArray(competitors) || competitors.length < 2) continue;
            const home = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
            const away = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];
            const teamA =
              home?.team?.shortDisplayName || home?.team?.displayName || 'Home';
            const teamB =
              away?.team?.shortDisplayName || away?.team?.displayName || 'Away';
            if (teamA === 'TBD' || teamB === 'TBD') continue;

            const statusObj = comp?.status || ev?.status;
            const state = statusObj?.type?.state;
            if (state === 'post') continue;

            const isLive = state === 'in';
            const startsAt = comp?.date
              ? new Date(comp.date).getTime()
              : Date.now() + 3600000;
            const id = `real_${ep.sport}_${comp?.id || ev?.id}`;
            if (map.has(id)) continue;

            const codeA = home?.team?.abbreviation || teamA.slice(0, 3).toUpperCase();
            const codeB = away?.team?.abbreviation || teamB.slice(0, 3).toUpperCase();

            map.set(id, {
              id,
              sport: ep.sport,
              tournament: leagueTitle,
              countryFlag: ep.flag,
              teamA,
              teamACode: codeA,
              teamALogo: ep.flag,
              teamALogoUrl: home?.team?.logo || undefined,
              teamB,
              teamBCode: codeB,
              teamBLogo: ep.flag,
              teamBLogoUrl: away?.team?.logo || undefined,
              startsAt,
              status: isLive ? 'LIVE' : 'UPCOMING',
              liveScoreA: isLive ? String(home?.score ?? '0') : undefined,
              liveScoreB: isLive ? String(away?.score ?? '0') : undefined,
              livePeriod: isLive ? statusObj?.type?.shortDetail || 'LIVE' : undefined,
              markets:
                ep.sport === 'football'
                  ? [
                      {
                        id: 'm_1x2',
                        name: isLive ? 'Live Match Result (2x Win)' : 'Match Result (2x Win)',
                        options: [
                          { id: 'home_1', label: teamA, shortLabel: `1 (${codeA})`, odds: WIN_MULTIPLIER_2X },
                          { id: 'draw_x', label: 'Draw', shortLabel: 'X (Draw)', odds: WIN_MULTIPLIER_2X },
                          { id: 'away_2', label: teamB, shortLabel: `2 (${codeB})`, odds: WIN_MULTIPLIER_2X },
                        ],
                      },
                      {
                        id: 'm_goals',
                        name: 'Total Goals 2.5 (2x Win)',
                        options: [
                          { id: 'over', label: 'Over 2.5', shortLabel: 'Over 2.5', odds: WIN_MULTIPLIER_2X },
                          { id: 'under', label: 'Under 2.5', shortLabel: 'Under 2.5', odds: WIN_MULTIPLIER_2X },
                        ],
                      },
                    ]
                  : [
                      {
                        id: 'm_winner',
                        name: isLive ? 'Live Match Winner (2x Win)' : 'Match Winner (2x Win)',
                        options: [
                          { id: 'home_win', label: teamA, shortLabel: codeA, odds: WIN_MULTIPLIER_2X },
                          { id: 'away_win', label: teamB, shortLabel: codeB, odds: WIN_MULTIPLIER_2X },
                        ],
                      },
                    ],
            });
          }
        }
      })
    );

    return Array.from(map.values()).sort((a, b) => {
      if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
      if (a.status !== 'LIVE' && b.status === 'LIVE') return 1;
      return a.startsAt - b.startsAt;
    });
  };

  const loadRealWorldMatches = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsLoadingMatches(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/sports/live-matches');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.matches) && data.matches.length > 0) {
          // Ensure all options reflect the 2x Win multiplier rule
          const normalized: SportsMatch[] = data.matches.map((m: SportsMatch) => ({
            ...m,
            markets: m.markets.map((mkt) => ({
              ...mkt,
              options: mkt.options.map((opt) => ({
                ...opt,
                odds: WIN_MULTIPLIER_2X,
              })),
            })),
          }));
          setMatches(normalized);
          setLastSyncedAt(Date.now());
          setIsLoadingMatches(false);
          return;
        }
      }
      const directMatches = await fetchDirectClientESPN();
      setMatches(directMatches);
      setLastSyncedAt(Date.now());
      if (directMatches.length === 0) {
        setFetchError('No live or upcoming global matches returned at this moment.');
      }
    } catch {
      const directMatches = await fetchDirectClientESPN();
      setMatches(directMatches);
      setLastSyncedAt(Date.now());
    } finally {
      setIsLoadingMatches(false);
    }
  }, []);

  // Initial load + 35s auto-sync of real live matches
  useEffect(() => {
    loadRealWorldMatches(true);
    const syncTimer = setInterval(() => {
      loadRealWorldMatches(false);
    }, 35000);
    return () => clearInterval(syncTimer);
  }, [loadRealWorldMatches]);

  // 1-second ticker for real-time countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getMatchStake = (matchId: string): number => {
    return matchStakes[matchId] ?? 500;
  };

  const setMatchStakeValue = (matchId: string, val: number) => {
    setMatchStakes((prev) => ({
      ...prev,
      [matchId]: Math.max(0, val),
    }));
  };

  // Select a team / option on a specific match's Bet Slip
  const handleSelectForMatch = (
    match: SportsMatch,
    marketId: string,
    marketName: string,
    optionId: string,
    selectionLabel: string
  ) => {
    setMatchFeedback((prev) => {
      const next = { ...prev };
      delete next[match.id];
      return next;
    });

    const isMatchStarted = match.status === 'LIVE' || now >= match.startsAt;
    if (isMatchStarted && !allowLiveInSlip) {
      setMatchFeedback((prev) => ({
        ...prev,
        [match.id]: {
          type: 'error',
          message: `"${match.teamA} vs ${match.teamB}" has already started! Enable "Include Live Matches" to bet in-play.`,
        },
      }));
      return;
    }

    setMatchSelections((prev) => {
      const existing = prev[match.id];
      if (existing && existing.marketId === marketId && existing.optionId === optionId) {
        const copy = { ...prev };
        delete copy[match.id];
        return copy;
      }
      return {
        ...prev,
        [match.id]: {
          matchId: match.id,
          sport: match.sport,
          tournament: match.tournament,
          matchTitle: `${match.teamA} vs ${match.teamB}`,
          startsAt: match.startsAt,
          matchStatusAtBet: isMatchStarted ? 'LIVE' : 'UPCOMING',
          marketId,
          marketName,
          optionId,
          selectionLabel,
          odds: WIN_MULTIPLIER_2X,
        },
      };
    });
  };

  // Place Bet Slip directly for a specific match (Win = 2x Stake!)
  const handlePlaceMatchBetSlip = (match: SportsMatch) => {
    const sel = matchSelections[match.id];
    const stake = getMatchStake(match.id);

    if (!sel) {
      setMatchFeedback((prev) => ({
        ...prev,
        [match.id]: {
          type: 'error',
          message: 'Please select a team or outcome on this match first.',
        },
      }));
      return;
    }

    const isMatchStarted = match.status === 'LIVE' || now >= match.startsAt;
    if (isMatchStarted && !allowLiveInSlip) {
      setMatchFeedback((prev) => ({
        ...prev,
        [match.id]: {
          type: 'error',
          message: 'Match has already started! Pre-match Bet Slip is closed.',
        },
      }));
      return;
    }

    if (stake < 50) {
      setMatchFeedback((prev) => ({
        ...prev,
        [match.id]: {
          type: 'error',
          message: 'Minimum Bet Slip amount is Rs. 50 LKR.',
        },
      }));
      return;
    }

    if (stake > currentUser.balance) {
      setMatchFeedback((prev) => ({
        ...prev,
        [match.id]: {
          type: 'error',
          message: 'Insufficient LKR balance! Please deposit to place this Bet Slip.',
        },
      }));
      return;
    }

    const winPayout2x = Math.round(stake * WIN_MULTIPLIER_2X);
    const newBalance = Number((currentUser.balance - stake).toFixed(2));
    onUpdateUserBalance(newBalance, stake, 0);

    const newSlip: SportsBetSlip = {
      id: `SLIP-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: currentUser.id,
      username: currentUser.username,
      type: 'single',
      selections: [{ ...sel, odds: WIN_MULTIPLIER_2X }],
      totalOdds: WIN_MULTIPLIER_2X,
      stake,
      potentialWin: winPayout2x,
      status: 'pending',
      payout: 0,
      createdAt: Date.now(),
    };

    setPlacedSlips((prev) => [newSlip, ...prev]);
    setMatchFeedback((prev) => ({
      ...prev,
      [match.id]: {
        type: 'success',
        message: `Bet Slip ${newSlip.id} Placed on ${sel.selectionLabel}! Win Payout (2x): Rs. ${winPayout2x.toLocaleString()} LKR`,
      },
    }));
  };

  const handleCashoutSlip = (slip: SportsBetSlip) => {
    if (slip.status !== 'pending') return;
    const cashoutAmount = Math.round(slip.stake * 0.95);
    const newBalance = Number((currentUser.balance + cashoutAmount).toFixed(2));
    onUpdateUserBalance(newBalance, 0, cashoutAmount);

    setPlacedSlips((prev) =>
      prev.map((item) =>
        item.id === slip.id
          ? {
              ...item,
              status: 'cashed_out',
              payout: cashoutAmount,
              settledAt: Date.now(),
            }
          : item
      )
    );
  };

  // If a Bet Slip wins, payout is strictly 2x the bet amount (slip.stake * 2)
  const handleSimulateSlipOutcome = (slip: SportsBetSlip) => {
    if (slip.status !== 'pending') return;
    const isWin = Math.random() < 0.6;
    const winPayout2x = Math.round(slip.stake * WIN_MULTIPLIER_2X);

    if (isWin) {
      const newBalance = Number((currentUser.balance + winPayout2x).toFixed(2));
      onUpdateUserBalance(newBalance, 0, winPayout2x);
    }

    setPlacedSlips((prev) =>
      prev.map((item) =>
        item.id === slip.id
          ? {
              ...item,
              status: isWin ? 'won' : 'lost',
              potentialWin: winPayout2x,
              payout: isWin ? winPayout2x : 0,
              settledAt: Date.now(),
            }
          : item
      )
    );
  };

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (sportFilter !== 'all' && m.sport !== sportFilter) return false;
      const isCurrentlyLive = m.status === 'LIVE' || now >= m.startsAt;
      if (statusFilter === 'LIVE' && !isCurrentlyLive) return false;
      if (statusFilter === 'UPCOMING' && isCurrentlyLive) return false;
      return true;
    });
  }, [matches, sportFilter, statusFilter, now]);

  const liveMatchesCount = useMemo(
    () => matches.filter((m) => m.status === 'LIVE' || now >= m.startsAt).length,
    [matches, now]
  );

  const upcomingMatchesCount = useMemo(
    () => matches.filter((m) => m.status === 'UPCOMING' && now < m.startsAt).length,
    [matches, now]
  );

  const userSlips = useMemo(
    () => placedSlips.filter((s) => s.userId === currentUser.id),
    [placedSlips, currentUser.id]
  );

  const pendingSlipsCount = useMemo(
    () => userSlips.filter((s) => s.status === 'pending').length,
    [userSlips]
  );

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 flex flex-col gap-5">
      {/* Top Bar: Navigation, Live Feed Status & Official WhatsApp Channel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToLobby}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Back to Home</span>
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              <Radio className="w-3.5 h-3.5" />
              <span>REAL-TIME GLOBAL SPORTS · 2X WIN PAYOUT</span>
              {lastSyncedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-400 font-mono tabular-nums">
                    Synced{' '}
                    {new Date(lastSyncedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              Live World Matches &amp; Per-Match 2x Bet Slips
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Each match has its own instant Bet Slip right beside it. Every winning Bet Slip pays{' '}
              <strong className="text-emerald-400">2x your bet amount</strong>!
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-none">Balance</span>
              <span className="text-sm font-black font-mono tabular-nums text-emerald-400">
                Rs. {currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenCashier('deposit')}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer whitespace-nowrap shrink-0"
          >
            + Deposit LKR
          </button>

          <a
            href={OFFICIAL_WHATSAPP_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-slate-950 font-black text-xs flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp Channel</span>
          </a>

          <button
            type="button"
            onClick={() => loadRealWorldMatches(true)}
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
            title="Sync latest live scores and matches"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-amber-400 ${isLoadingMatches ? 'animate-spin' : ''}`}
            />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* Main Mode Tabs & Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'matches'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Live &amp; Upcoming Matches ({matches.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_slips')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'my_slips'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>My Placed Bet Slips ({userSlips.length})</span>
            {pendingSlipsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono tabular-nums text-[10px] font-black">
                {pendingSlipsCount} Active
              </span>
            )}
          </button>
        </div>

        {activeTab === 'matches' && (
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({matches.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('LIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                statusFilter === 'LIVE'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Now ({liveMatchesCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('UPCOMING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                statusFilter === 'UPCOMING'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Upcoming Pre-Match ({upcomingMatchesCount})
            </button>
          </div>
        )}
      </div>

      {/* Sport Category Filter Bar */}
      {activeTab === 'matches' && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Sports', icon: '🌍' },
              { id: 'cricket', label: 'Cricket', icon: '🏏' },
              { id: 'football', label: 'Football', icon: '⚽' },
              { id: 'tennis', label: 'Tennis', icon: '🎾' },
              { id: 'basketball', label: 'Basketball', icon: '🏀' },
            ].map((sp) => {
              const active = sportFilter === sp.id;
              const count =
                sp.id === 'all'
                  ? matches.length
                  : matches.filter((m) => m.sport === sp.id).length;
              return (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => setSportFilter(sp.id as 'all' | SportType)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 border ${
                    active
                      ? 'bg-slate-800 text-amber-400 border-amber-500/60'
                      : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span>{sp.icon}</span>
                  <span>{sp.label}</span>
                  <span className="font-mono tabular-nums text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowLiveInSlip}
              onChange={(e) => setAllowLiveInSlip(e.target.checked)}
              className="rounded border-slate-700 accent-emerald-500"
            />
            <span>Allow Live In-Play Match Bet Slips</span>
          </label>
        </div>
      )}

      {/* Matches List — Each Match Has Its Own Dedicated Bet Slip Right Next To It */}
      {activeTab === 'matches' ? (
        isLoadingMatches && matches.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
            <ThreeDotsLoader label="Loading Live World Matches" size="lg" />
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <p className="text-sm font-bold text-slate-300">
              {fetchError || 'No matches found for this filter right now.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSportFilter('all');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs cursor-pointer"
              >
                Show All Sports
              </button>
              <button
                type="button"
                onClick={() => loadRealWorldMatches(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Retry Live Sync
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMatches.map((match) => {
              const msLeft = match.startsAt - now;
              const isStarted = match.status === 'LIVE' || msLeft <= 0;
              const isLockedForPreMatch = isStarted && !allowLiveInSlip;

              // Default selection to first option if user hasn't clicked yet so Bet Slip is ready immediately
              const defaultOpt = match.markets[0]?.options[0];
              const currentSelection: BetSlipSelection | undefined =
                matchSelections[match.id] ||
                (defaultOpt
                  ? {
                      matchId: match.id,
                      sport: match.sport,
                      tournament: match.tournament,
                      matchTitle: `${match.teamA} vs ${match.teamB}`,
                      startsAt: match.startsAt,
                      matchStatusAtBet: isStarted ? 'LIVE' : 'UPCOMING',
                      marketId: match.markets[0].id,
                      marketName: match.markets[0].name,
                      optionId: defaultOpt.id,
                      selectionLabel: defaultOpt.label,
                      odds: WIN_MULTIPLIER_2X,
                    }
                  : undefined);

              const stakeVal = getMatchStake(match.id);
              const winAmount2x = Math.round(stakeVal * WIN_MULTIPLIER_2X);
              const feedback = matchFeedback[match.id];

              return (
                <div
                  key={match.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
                >
                  {/* LEFT 7 COLUMNS: Match Info, Live Score & Team Picker */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-3.5">
                    {/* Match Header: Tournament & Countdown / Live Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{match.countryFlag}</span>
                        <span className="font-bold text-slate-200">{match.tournament}</span>
                        <span aria-hidden="true">·</span>
                        <span className="uppercase text-[11px] text-slate-400">{match.sport}</span>
                      </div>

                      {!isStarted ? (
                        <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-emerald-400 font-bold">
                          <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>
                            Starts in {formatCountdown(msLeft)} (
                            {new Date(match.startsAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            )
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                          <span className="text-rose-400 font-black">
                            LIVE · {match.livePeriod || 'In Play'}
                          </span>
                          {!allowLiveInSlip && (
                            <span className="text-slate-400 text-[11px] flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-400" />
                              <span>Closed</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Teams & Live Score Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {match.teamALogoUrl ? (
                            <img
                              src={match.teamALogoUrl}
                              alt={match.teamA}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                              className="w-7 h-7 object-contain shrink-0"
                            />
                          ) : (
                            <span className="text-xl shrink-0">{match.teamALogo}</span>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm sm:text-base font-black text-white truncate">
                              {match.teamA}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              {match.teamACode}
                            </div>
                          </div>
                        </div>
                        {isStarted && match.liveScoreA !== undefined && (
                          <span className="text-base sm:text-lg font-black font-mono tabular-nums text-amber-400 pl-2">
                            {match.liveScoreA}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:border-l sm:border-slate-800 sm:pl-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {match.teamBLogoUrl ? (
                            <img
                              src={match.teamBLogoUrl}
                              alt={match.teamB}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                              className="w-7 h-7 object-contain shrink-0"
                            />
                          ) : (
                            <span className="text-xl shrink-0">{match.teamBLogo}</span>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm sm:text-base font-black text-white truncate">
                              {match.teamB}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              {match.teamBCode}
                            </div>
                          </div>
                        </div>
                        {isStarted && match.liveScoreB !== undefined && (
                          <span className="text-base sm:text-lg font-mono tabular-nums font-black text-amber-400 pl-2">
                            {match.liveScoreB}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Team / Outcome Selection Buttons */}
                    <div className="space-y-2.5">
                      {match.markets.map((market) => (
                        <div key={market.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-semibold">
                              Select Team / Outcome ({market.name})
                            </span>
                            <span className="font-mono text-emerald-400 font-bold">
                              Win = 2.00x
                            </span>
                          </div>

                          <div
                            className={`grid gap-2 ${
                              market.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
                            }`}
                          >
                            {market.options.map((opt) => {
                              const isSelected =
                                currentSelection?.marketId === market.id &&
                                currentSelection?.optionId === opt.id;

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={isLockedForPreMatch}
                                  onClick={() =>
                                    handleSelectForMatch(
                                      match,
                                      market.id,
                                      market.name,
                                      opt.id,
                                      opt.label
                                    )
                                  }
                                  className={`px-3 py-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                                    isLockedForPreMatch
                                      ? 'bg-slate-950/50 border-slate-800/60 text-slate-600 cursor-not-allowed'
                                      : isSelected
                                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm'
                                      : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 text-slate-200'
                                  }`}
                                >
                                  <span className="text-xs font-bold truncate pr-2">
                                    {opt.shortLabel}
                                  </span>
                                  <span
                                    className={`text-xs font-black font-mono tabular-nums shrink-0 ${
                                      isLockedForPreMatch
                                        ? 'text-slate-600'
                                        : isSelected
                                        ? 'text-emerald-300'
                                        : 'text-amber-400'
                                    }`}
                                  >
                                    2.00x
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT 5 COLUMNS: Dedicated Bet Slip Right Next To This Match */}
                  <div className="lg:col-span-5 bg-slate-950 border border-amber-500/35 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Ticket className="w-4 h-4 text-amber-400" />
                        <span className="text-xs sm:text-sm font-black text-white">
                          Match Bet Slip
                        </span>
                      </div>
                      <span className="text-xs font-mono font-black text-emerald-400">
                        2x Win Payout
                      </span>
                    </div>

                    {/* Selected Pick Summary */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 block">Selected Pick</span>
                        <span className="font-black text-emerald-400 truncate block">
                          {currentSelection ? currentSelection.selectionLabel : 'Choose Team'}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block">Win Multiplier</span>
                        <span className="font-mono font-black text-amber-400">2.00x</span>
                      </div>
                    </div>

                    {/* Stake Input + Quick Presets */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-400 font-bold">Bet Amount (LKR)</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          Win 2x: Rs. {winAmount2x.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setMatchStakeValue(match.id, Math.max(50, stakeVal - 100))}
                          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={50}
                          step={50}
                          value={stakeVal}
                          onChange={(e) =>
                            setMatchStakeValue(match.id, Math.max(0, Number(e.target.value)))
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-center font-mono tabular-nums font-black text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setMatchStakeValue(match.id, stakeVal + 100)}
                          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-5 gap-1 mt-1.5">
                        {[100, 500, 1000, 2500, 5000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setMatchStakeValue(match.id, preset)}
                            className={`py-1 rounded font-mono tabular-nums text-[10px] font-bold border transition cursor-pointer ${
                              stakeVal === preset
                                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {feedback && (
                      <div
                        className={`p-2.5 rounded-lg border text-[11px] flex items-start gap-1.5 ${
                          feedback.type === 'success'
                            ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                            : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
                        }`}
                      >
                        {feedback.type === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <span>{feedback.message}</span>
                      </div>
                    )}

                    {/* Place Bet Slip Button right inside this match card */}
                    <button
                      type="button"
                      disabled={isLockedForPreMatch}
                      onClick={() => {
                        if (!matchSelections[match.id] && currentSelection) {
                          setMatchSelections((prev) => ({
                            ...prev,
                            [match.id]: currentSelection,
                          }));
                        }
                        const effectiveSel = matchSelections[match.id] || currentSelection;
                        if (!effectiveSel) return;
                        // Ensure selection is stored then place slip
                        matchSelections[match.id] = effectiveSel;
                        handlePlaceMatchBetSlip(match);
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl font-black text-xs tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        isLockedForPreMatch
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/15 active:scale-98'
                      }`}
                    >
                      <Flame className="w-4 h-4 shrink-0" />
                      <span>
                        PLACE BET SLIP · WIN 2X (Rs. {winAmount2x.toLocaleString()})
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* MY BET SLIPS TAB */
        <div className="space-y-3.5">
          {userSlips.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <Ticket className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-base font-black text-white">No Bet Slips Placed Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Use the Bet Slip box right next to any live or upcoming match to place a 2x Win Bet
                Slip.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('matches')}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs cursor-pointer"
              >
                Browse Live World Matches
              </button>
            </div>
          ) : (
            userSlips.map((slip) => {
              const win2xAmount = Math.round(slip.stake * WIN_MULTIPLIER_2X);
              return (
                <div
                  key={slip.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-black text-white">{slip.id}</span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="text-xs font-bold uppercase text-amber-400">
                        2x Match Bet Slip
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                      <span className="text-slate-400">
                        {new Date(slip.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span
                        className={`font-black uppercase ${
                          slip.status === 'won'
                            ? 'text-emerald-400'
                            : slip.status === 'lost'
                            ? 'text-rose-400'
                            : slip.status === 'cashed_out'
                            ? 'text-amber-300'
                            : 'text-sky-400'
                        }`}
                      >
                        {slip.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {slip.selections.map((sel, idx) => (
                      <div
                        key={`${sel.matchId}_${idx}`}
                        className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-black text-white">{sel.matchTitle}</div>
                          <div className="text-[11px] text-slate-400">
                            {sel.marketName}:{' '}
                            <strong className="text-emerald-400">{sel.selectionLabel}</strong>
                          </div>
                        </div>
                        <span className="text-xs sm:text-sm font-black font-mono tabular-nums text-amber-400">
                          2.00x Win
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Win Multiplier</span>
                        <span className="font-black text-amber-400">2.00x</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Bet Stake</span>
                        <span className="font-black text-white">
                          Rs. {slip.stake.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          {slip.status === 'pending' ? '2x Win Payout' : 'Final Payout'}
                        </span>
                        <span className="font-black text-emerald-400">
                          Rs.{' '}
                          {(slip.status === 'pending' ? win2xAmount : slip.payout).toLocaleString()}{' '}
                          LKR
                        </span>
                      </div>
                    </div>

                    {slip.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCashoutSlip(slip)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                        >
                          Cashout Rs. {Math.round(slip.stake * 0.95).toLocaleString()}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSimulateSlipOutcome(slip)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Settle 2x Result</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
