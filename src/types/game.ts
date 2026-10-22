export type GameStatus = 'WAITING' | 'FLYING' | 'BURST' | 'ENDED';

export type UserRole =
  | 'player'
  | 'vip'
  | 'admin'
  | 'deposit_agent'
  | 'withdraw_agent'
  | 'cash_agent';

export type PaymentMethod = 'bank_transfer' | 'cash_agent' | 'card' | 'crypto';

export interface Transaction {
  id: string;
  userId: string;
  username?: string;
  type: 'deposit' | 'withdrawal';
  amount: number; // In LKR
  bonusAdded?: number; // 100% 1st deposit bonus in LKR
  method: PaymentMethod;
  accountDetails: string;
  processedBy?: string; // Admin or Cash Agent username
  status: 'completed' | 'pending' | 'rejected';
  timestamp: number;
}

export interface BetRecord {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  roundNumber: number;
  amount: number; // In LKR
  cashoutMultiplier: number | null; // null if lost/crashed
  crashPoint: number;
  winAmount: number; // In LKR (0 if lost)
  profit: number; // Net profit (+win - amount) or -amount if lost
  status: 'won' | 'lost';
  timestamp: number;
}

export interface User {
  id: string;
  username: string;
  mobile?: string;
  email: string;
  password?: string;
  role: UserRole;
  balance: number; // Total Playable Balance in LKR (includes withdrawable + bonusBalance)
  bonusBalance?: number; // Non-withdrawable bonus balance in LKR (can bet; only profit is withdrawable)
  hasReceivedFirstDepositBonus?: boolean; // True after 1st deposit 100% bonus is credited
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  referralEarnings: number; // In LKR
  unclaimedReferralRewards: number; // In LKR
  totalWagered: number; // In LKR
  totalWon: number; // In LKR
  isBanned: boolean;
  avatar: string;
  agentContact?: string;
  createdByAdmin?: boolean;
  createdAt: number;
}

export interface Bet {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  amount: number; // In LKR
  autoCashoutAt?: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  profit?: number; // In LKR
  isBot?: boolean;
  passengerId: string;
  passengerColor: string;
}

export interface Passenger {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isPlayer: boolean;
  hasJumped: boolean;
  hasCrashed: boolean;
  jumpMultiplier?: number;
  // Parachute animation physics
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  swayOffset: number;
  parachuteOpenProgress: number; // 0 to 1
  arcTime: number; // for initial leap arc
  trail: { x: number; y: number; alpha: number }[];
  opacity: number;
}

export interface RoundBonusWinner {
  userId: string;
  username: string;
  avatar: string;
  multiplier: number;
  winAmount: number; // Original payout in LKR
  bonusAmount: number; // 100% extra win bonus in LKR
  roundNumber: number;
}

export interface RoundInfo {
  id: string;
  roundNumber: number;
  crashPoint: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  timestamp: number;
  totalBets: number;
  totalPayout: number; // In LKR
  topBonusWinner?: RoundBonusWinner;
}

export interface ChatReplyTarget {
  id: string;
  username: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  role?: UserRole;
  text: string;
  timestamp: number;
  isSystemWin?: boolean;
  highlightMultiplier?: number;
  replyTo?: ChatReplyTarget;
  recipientId?: string;
}

export type CrashGameId = 'balloon_crash' | 'space_rocket' | 'aviator_jet';

export interface CrashGameEngineConfig {
  gameId: CrashGameId;
  gameName: string;
  houseEdge: number; // e.g. 0.22 (22% default for higher loss volatility)
  earlyCrashProbability: number; // e.g. 0.45 (45% chance of early burst)
  instant100Probability: number; // e.g. 0.15 (15% chance of direct 1.00x instant burst)
  minBet: number; // In LKR
  maxBet: number; // In LKR
  nextCrashOverride: number | null; // null for fair, or number to force next round crash
  queuedMultipliers: number[]; // Up to 30 pre-set multipliers queued by Admin for this crash game
  isGamePaused: boolean;
}

export interface AdminSettings {
  selectedCrashGameId?: CrashGameId;
  houseEdge: number; // e.g. 0.22 (22% default for higher loss volatility)
  earlyCrashProbability: number; // e.g. 0.45 (45% chance of early burst)
  instant100Probability?: number; // e.g. 0.15 (15% chance of direct 1.00x instant burst)
  minBet: number; // In LKR
  maxBet: number; // In LKR
  nextCrashOverride: number | null; // null for fair, or number to force next round crash
  queuedMultipliers?: number[]; // Next up to 30 multipliers queued for Balloon Crash
  isGamePaused: boolean;
  crashGamesConfig?: Record<CrashGameId, CrashGameEngineConfig>;
}

export interface BetDeckState {
  amount: number;
  autoCashoutEnabled: boolean;
  autoMultiplier: number;
  autoBetEnabled: boolean; // Enables real auto-bet with balance deduction each round
  hasPlacedBet: boolean;
  isQueuedForNext: boolean;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
  winAmount: number | null;
  bonusPortionUsed?: number; // How much of the active wager came from non-withdrawable bonusBalance
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar: string;
  metric: string;
  value: number; // In LKR
  multiplier?: number;
  badge?: string;
}

export type SportType = 'cricket' | 'football' | 'tennis' | 'basketball';

export interface MatchMarketOption {
  id: string;
  label: string;
  shortLabel: string;
  odds: number;
}

export interface MatchMarket {
  id: string;
  name: string;
  options: MatchMarketOption[];
}

export interface SportsMatch {
  id: string;
  sport: SportType;
  tournament: string;
  countryFlag: string;
  teamA: string;
  teamACode: string;
  teamALogo: string;
  teamALogoUrl?: string;
  teamB: string;
  teamBCode: string;
  teamBLogo: string;
  teamBLogoUrl?: string;
  startsAt: number; // Timestamp (ms) when match starts; Bet Slip open until startsAt
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
  liveScoreA?: string;
  liveScoreB?: string;
  livePeriod?: string; // e.g. "14.2 Overs", "64'", "Set 2"
  markets: MatchMarket[];
}

export interface BetSlipSelection {
  matchId: string;
  sport: SportType;
  tournament: string;
  matchTitle: string;
  startsAt: number;
  matchStatusAtBet: 'UPCOMING' | 'LIVE';
  marketId: string;
  marketName: string;
  optionId: string;
  selectionLabel: string;
  odds: number;
}

export interface SportsBetSlip {
  id: string;
  userId: string;
  username: string;
  type: 'single' | 'multi';
  selections: BetSlipSelection[];
  totalOdds: number;
  stake: number; // In LKR
  potentialWin: number; // In LKR
  status: 'pending' | 'won' | 'lost' | 'cashed_out';
  payout: number; // In LKR
  createdAt: number;
  settledAt?: number;
}

