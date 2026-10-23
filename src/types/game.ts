export type GameStatus = 'WAITING' | 'FLYING' | 'CRASHED';

export type UserRole =
  | 'player'
  | 'vip'
  | 'admin'
  | 'deposit_agent'
  | 'withdraw_agent'
  | 'cash_agent';

export interface User {
  id: string;
  username: string;
  mobile?: string;
  email: string;
  password?: string;
  role: UserRole;
  balance: number;
  bonusBalance?: number;
  hasReceivedFirstDepositBonus?: boolean;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  referralEarnings: number;
  unclaimedReferralRewards: number;
  totalWagered: number;
  totalWon: number;
  totalDeposited?: number;
  commissionGeneratedForReferrer?: number;
  isBanned: boolean;
  avatar: string;
  agentContact?: string;
  createdByAdmin?: boolean;
  adminOnlineStatus?: boolean;
  updatedAt?: number;
  createdAt: number;
}

export interface Bet {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  amount: number;
  autoCashout: number | null;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
  winAmount: number | null;
  deckIndex?: 1 | 2;
  isBot?: boolean;
  passengerColor?: string;
}

export interface BetRecord {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  roundNumber: number;
  amount: number;
  cashoutMultiplier: number | null;
  crashPoint: number;
  winAmount: number;
  profit: number;
  status: 'won' | 'lost';
  gameName?: string;
  timestamp: number;
}

export interface Passenger {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  color: string;
  betAmount: number;
  hasJumped: boolean;
  jumpMultiplier: number | null;
  jumpTime: number | null;
  winAmount: number | null;
  seatIndex: number;
}

export interface RoundBonusWinner {
  userId: string;
  username: string;
  avatar: string;
  multiplier: number;
  winAmount: number;
  bonusAmount: number;
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
  totalPayout: number;
  topBonusWinner?: RoundBonusWinner;
}

export interface ChatReplyTarget {
  messageId: string;
  username: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  isWinShare?: boolean;
  winMultiplier?: number;
  winAmount?: number;
  replyTo?: ChatReplyTarget;
}

export type CrashGameId = 'balloon_crash' | 'space_rocket' | 'aviator_jet';

export interface CrashGameEngineConfig {
  gameId: CrashGameId;
  gameName: string;
  houseEdge: number;
  earlyCrashProbability: number;
  instant100Probability: number;
  minBet: number;
  maxBet: number;
  nextCrashOverride: number | null;
  queuedMultipliers: number[];
  isGamePaused: boolean;
}

export type MinesRiskLevel = 'low' | 'medium' | 'high' | 'extreme';

export interface MinesGameEngineConfig {
  riskLevel: MinesRiskLevel;
  loseRatePercent: number; // 0 - 100% extra bomb trap probability on tile reveal
  houseEdgePercent: number; // 1 - 35% house edge multiplier reduction
  minBet: number; // Default 10 LKR
  maxBet: number; // Default 50000 LKR
  defaultMinesCount: number; // 1 - 24
  maxMultiplierCap: number; // Max payout multiplier cap
  firstClickSafe: boolean; // Whether 1st tile click is protected unless forced
  forceNextClickMine: boolean; // Admin instant trap: next clicked tile is guaranteed bomb
  isGamePaused: boolean;
}

export interface AdminSettings {
  selectedCrashGameId?: CrashGameId;
  houseEdge: number;
  earlyCrashProbability?: number;
  instant100Probability?: number;
  minBet: number;
  maxBet: number;
  nextCrashOverride: number | null;
  queuedMultipliers?: number[];
  isGamePaused: boolean;
  crashGamesConfig?: Record<CrashGameId, CrashGameEngineConfig>;
  minesConfig?: MinesGameEngineConfig;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar: string;
  metric: string;
  value: number;
  multiplier: number;
  badge?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  username?: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  bonusAdded?: number;
  method: 'bank' | 'crypto' | 'ewallet' | 'cash_agent';
  accountDetails: string;
  agentId?: string;
  agentName?: string;
  processedBy?: string;
  receiptImage?: string;
  receiptFileName?: string;
  status: 'completed' | 'pending' | 'rejected';
  timestamp: number;
}

export type SportType = 'cricket' | 'football' | 'tennis' | 'basketball';

export interface SportsMarketOption {
  id: string;
  label: string;
  shortLabel: string;
  odds: number;
}

export interface SportsMarket {
  id: string;
  name: string;
  options: SportsMarketOption[];
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
  startsAt: number;
  status: 'UPCOMING' | 'LIVE' | 'LOCKED';
  liveScoreA?: string;
  liveScoreB?: string;
  livePeriod?: string;
  markets: SportsMarket[];
}

export interface BetSlipSelection {
  matchId: string;
  sport: SportType;
  tournament: string;
  matchTitle: string;
  startsAt: number;
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
  selections: BetSlipSelection[];
  totalOdds: number;
  stake: number;
  potentialPayout: number;
  status: 'ACTIVE' | 'WON' | 'LOST';
  placedAt: number;
}
