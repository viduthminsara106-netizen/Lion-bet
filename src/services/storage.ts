import {
  User,
  RoundInfo,
  ChatMessage,
  AdminSettings,
  CrashGameId,
  CrashGameEngineConfig,
  LeaderboardEntry,
  Transaction,
  BetRecord,
} from '../types/game';

const USERS_STORAGE_KEY = 'balloon_users_lkr_db';
const CURRENT_USER_KEY = 'balloon_active_lkr_user';
const ROUNDS_STORAGE_KEY = 'balloon_rounds_lkr_history';
const ADMIN_SETTINGS_KEY = 'balloon_admin_lkr_settings';
const TRANSACTIONS_KEY = 'balloon_lkr_transactions';
const BET_HISTORY_KEY = 'balloon_lkr_bet_history';

// Initial users with LKR balances (Players start at Rs. 0 until deposit or Admin/Agent update)
const INITIAL_USERS: User[] = [
  {
    id: 'user_player_1',
    username: 'Kasun_Pilot',
    mobile: '0771234567',
    email: 'kasun@winxcash.lk',
    password: '12345678',
    role: 'player',
    balance: 0.0, // Rs. 0.00 LKR until deposit or Admin/Agent balance update
    bonusBalance: 0,
    hasReceivedFirstDepositBonus: false,
    referralCode: 'WINX777',
    referralCount: 4,
    referralEarnings: 4500.0,
    unclaimedReferralRewards: 0.0,
    totalWagered: 0.0,
    totalWon: 0.0,
    isBanned: false,
    avatar: '🦁',
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'user_player_2',
    username: 'Nisal_SL',
    mobile: '0712345678',
    email: 'nisal@winxcash.lk',
    password: '12345678',
    role: 'vip',
    balance: 64500.0,
    bonusBalance: 5000.0,
    hasReceivedFirstDepositBonus: true,
    referralCode: 'NISAL99',
    referralCount: 8,
    referralEarnings: 9200.0,
    unclaimedReferralRewards: 1200.0,
    totalWagered: 95000.0,
    totalWon: 128000.0,
    isBanned: false,
    avatar: '🚀',
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'user_player_3',
    username: 'Thilini_99',
    mobile: '0769876543',
    email: 'thilini@winxcash.lk',
    password: '12345678',
    role: 'player',
    balance: 18200.0,
    bonusBalance: 2500.0,
    hasReceivedFirstDepositBonus: true,
    referralCode: 'THILI88',
    referralCount: 2,
    referralEarnings: 1500.0,
    unclaimedReferralRewards: 500.0,
    totalWagered: 31000.0,
    totalWon: 39400.0,
    isBanned: false,
    avatar: '💎',
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'user_admin_1',
    username: 'LionBetAdmin',
    mobile: '0711452778',
    email: 'admin@lionbet.lk',
    password: '12345678',
    role: 'admin',
    balance: 150000.0,
    referralCode: 'ADMINLK',
    referralCount: 15,
    referralEarnings: 32000.0,
    unclaimedReferralRewards: 8500.0,
    totalWagered: 120000.0,
    totalWon: 135000.0,
    isBanned: false,
    avatar: '👑',
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'user_player_4',
    username: 'Kavindu_LK',
    mobile: '0704455667',
    email: 'kavindu@winxcash.lk',
    password: '12345678',
    role: 'player',
    balance: 14800.0,
    bonusBalance: 0,
    hasReceivedFirstDepositBonus: true,
    referralCode: 'KAVI24',
    referralCount: 1,
    referralEarnings: 750.0,
    unclaimedReferralRewards: 0,
    totalWagered: 27500.0,
    totalWon: 31200.0,
    isBanned: false,
    avatar: '🌺',
    createdAt: Date.now() - 86400000 * 6,
  },
  {
    id: 'user_player_5',
    username: 'Dilshan_Kandy',
    mobile: '0758899001',
    email: 'dilshan@winxcash.lk',
    password: '12345678',
    role: 'vip',
    balance: 92400.0,
    bonusBalance: 10000.0,
    hasReceivedFirstDepositBonus: true,
    referralCode: 'DILVIP',
    referralCount: 6,
    referralEarnings: 6800.0,
    unclaimedReferralRewards: 1500.0,
    totalWagered: 145000.0,
    totalWon: 182000.0,
    isBanned: false,
    avatar: '🔥',
    createdAt: Date.now() - 86400000 * 12,
  },
  {
    id: 'user_player_6',
    username: 'Malsha_Galle',
    mobile: '0782233445',
    email: 'malsha@winxcash.lk',
    password: '12345678',
    role: 'player',
    balance: 8650.0,
    bonusBalance: 1500.0,
    hasReceivedFirstDepositBonus: true,
    referralCode: 'MAL99',
    referralCount: 0,
    referralEarnings: 0,
    unclaimedReferralRewards: 0,
    totalWagered: 12400.0,
    totalWon: 15900.0,
    isBanned: false,
    avatar: '🦋',
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'user_player_7',
    username: 'Chamara_Negombo',
    mobile: '0726677889',
    email: 'chamara@winxcash.lk',
    password: '12345678',
    role: 'player',
    balance: 34100.0,
    bonusBalance: 0,
    hasReceivedFirstDepositBonus: false,
    referralCode: 'CHAM77',
    referralCount: 3,
    referralEarnings: 2900.0,
    unclaimedReferralRewards: 400.0,
    totalWagered: 54000.0,
    totalWon: 61500.0,
    isBanned: false,
    avatar: '⚡',
    createdAt: Date.now() - 86400000 * 8,
  },
];

export const BOT_NAMES = [
  { name: 'Nisal_SL', avatar: '🦁', color: '#10B981' },
  { name: 'SkyHigh_Dan', avatar: '🪂', color: '#3B82F6' },
  { name: 'Thilini_99', avatar: '💎', color: '#EC4899' },
  { name: 'LuckyStriker', avatar: '⚡️', color: '#F59E0B' },
  { name: 'ParachuteQueen', avatar: '👑', color: '#8B5CF6' },
  { name: 'Kavindu_LK', avatar: '🌺', color: '#06B6D4' },
  { name: 'ColomboRider', avatar: '🚀', color: '#EF4444' },
  { name: 'CryptoWhale', avatar: '🐋', color: '#14B8A6' },
  { name: 'Dilan_Bets', avatar: '🎖', color: '#F97316' },
  { name: 'Chathura_G', avatar: '🎯', color: '#84CC16' },
  { name: 'Sahan_98', avatar: '🔥', color: '#F43F5E' },
  { name: 'Dilshan_Kandy', avatar: '🐯', color: '#FB923C' },
  { name: 'Malsha_Galle', avatar: '🦋', color: '#A855F7' },
  { name: 'Roshan_VIP', avatar: '🎩', color: '#EAB308' },
  { name: 'Supun_777', avatar: '🎰', color: '#22C55E' },
  { name: 'Kavindi_SL', avatar: '🌸', color: '#EC4899' },
  { name: 'Chamara_Negombo', avatar: '⚓', color: '#38BDF8' },
  { name: 'Pavan_Bets', avatar: '🎲', color: '#6366F1' },
  { name: 'Nethmi_LK', avatar: '✨', color: '#F472B6' },
  { name: 'Isuru_Pro', avatar: '🦅', color: '#10B981' },
  { name: 'Janith_X', avatar: '🚀', color: '#EF4444' },
  { name: 'Gihan_88', avatar: '🏆', color: '#F59E0B' },
  { name: 'Hasitha_CMB', avatar: '⚡', color: '#06B6D4' },
  { name: 'Sanduni_Queen', avatar: '👸', color: '#D946EF' },
  { name: 'Nuwan_Max', avatar: '💥', color: '#F97316' },
  { name: 'Tharindu_24', avatar: '🛡️', color: '#3B82F6' },
  { name: 'Lakmal_Sky', avatar: '🎈', color: '#E11D48' },
  { name: 'Pradeep_Win', avatar: '💰', color: '#16A34A' },
  { name: 'Ravindu_99', avatar: '🦊', color: '#EA580C' },
  { name: 'Oshada_LK', avatar: '🌟', color: '#FACC15' },
  { name: 'Dinithi_Star', avatar: '💫', color: '#C084FC' },
  { name: 'Shehan_Jet', avatar: '✈️', color: '#0284C7' },
  { name: 'Kusal_Fly', avatar: '🏏', color: '#2563EB' },
  { name: 'Bhanuka_77', avatar: '🦁', color: '#D97706' },
  { name: 'Avishka_SL', avatar: '⚡', color: '#059669' },
  { name: 'Vimukthi_Bet', avatar: '🎯', color: '#7C3AED' },
  { name: 'Yashodha_VIP', avatar: '💎', color: '#DB2777' },
  { name: 'Madhushan_K', avatar: '🔥', color: '#DC2626' },
  { name: 'Danushka_01', avatar: '🚀', color: '#0D9488' },
  { name: 'Sachini_G', avatar: '🌺', color: '#E879F9' },
  { name: 'Ashen_Kurunegala', avatar: '👑', color: '#FBBF24' },
  { name: 'Buddhika_Matara', avatar: '🌊', color: '#38BDF8' },
  { name: 'Charith_365', avatar: '⚡', color: '#4ADE80' },
  { name: 'Dasun_Captain', avatar: '🦁', color: '#F59E0B' },
  { name: 'Eshan_Vibes', avatar: '🎧', color: '#818CF8' },
  { name: 'Farhan_CMB', avatar: '🌙', color: '#34D399' },
  { name: 'Gayan_Kalutara', avatar: '🌴', color: '#10B981' },
  { name: 'Heshan_95', avatar: '🔥', color: '#FB7185' },
  { name: 'Imalka_SL', avatar: '🌸', color: '#F472B6' },
  { name: 'Jude_Jaffna', avatar: '⚡', color: '#60A5FA' },
  { name: 'Kasuni_Perera', avatar: '💎', color: '#A78BFA' },
  { name: 'Lahiru_Silva', avatar: '🚀', color: '#F87171' },
  { name: 'Mahela_King', avatar: '👑', color: '#FBBF24' },
  { name: 'Nadeesha_LK', avatar: '🦋', color: '#F43F5E' },
  { name: 'Pasindu_Gold', avatar: '🪙', color: '#EAB308' },
  { name: 'Rukshan_Bets', avatar: '🎰', color: '#2DD4BF' },
  { name: 'Sajith_888', avatar: '🍀', color: '#22C55E' },
  { name: 'Thisara_Power', avatar: '💥', color: '#F97316' },
  { name: 'Udara_Ratnapura', avatar: '💍', color: '#38BDF8' },
  { name: 'Viraj_Gampaha', avatar: '🦅', color: '#A855F7' },
  { name: 'Wanindu_Spin', avatar: '🪄', color: '#10B981' },
  { name: 'Zaid_Colombo', avatar: '⚡', color: '#F59E0B' },
  { name: 'Amila_Badulla', avatar: '🏔️', color: '#06B6D4' },
  { name: 'Chamikara_SL', avatar: '🎈', color: '#EC4899' },
  { name: 'Dulanjali_97', avatar: '🌷', color: '#F472B6' },
  { name: 'Harsha_Boss', avatar: '🕶️', color: '#3B82F6' },
  { name: 'Indika_Cash', avatar: '💵', color: '#22C55E' },
  { name: 'Janaka_77', avatar: '🔥', color: '#EF4444' },
  { name: 'Kalpana_LK', avatar: '✨', color: '#8B5CF6' },
  { name: 'Lasith_Yorker', avatar: '🎯', color: '#F59E0B' },
  { name: 'Minoli_VIP', avatar: '👑', color: '#EC4899' },
  { name: 'Nipun_Anuradhapura', avatar: '🦁', color: '#14B8A6' },
  { name: 'Prabath_SL', avatar: '🪂', color: '#6366F1' },
  { name: 'Rajitha_Pro', avatar: '🚀', color: '#F97316' },
  { name: 'Sanjeewa_Max', avatar: '💎', color: '#0EA5E9' },
  { name: 'Taniya_Colombo', avatar: '🌺', color: '#D946EF' },
  { name: 'Ushan_Flyer', avatar: '🦅', color: '#84CC16' },
  { name: 'Vishwa_K', avatar: '⚡', color: '#F43F5E' },
  { name: 'Hashan_Trinco', avatar: '⚓', color: '#06B6D4' },
  { name: 'Hiruni_99', avatar: '🦋', color: '#EC4899' },
];

const PROCEDURAL_FIRST_NAMES = [
  'Akila', 'Amaya', 'Anushka', 'Aravinda', 'Ashan', 'Avishka', 'Bimsara', 'Binura',
  'Chamal', 'Chamika', 'Chanaka', 'Chathuranga', 'Damith', 'Dananjaya', 'Dhanushka',
  'Dilanka', 'Dimuth', 'Dinesh', 'Dulaj', 'Dushmantha', 'Eranga', 'Gayashan',
  'Geeth', 'Hasini', 'Hashini', 'Hiran', 'Ishan', 'Isuri', 'Janith', 'Jayanga',
  'Kalana', 'Kamindu', 'Kanishka', 'Kasun', 'Kavin', 'Kavisha', 'Kusal', 'Lakshitha',
  'Madhawa', 'Madushka', 'Malith', 'Manoj', 'Matheesha', 'Milinda', 'Minod', 'Mithun',
  'Nadeera', 'Nalin', 'Navod', 'Nimesh', 'Nipuna', 'Niroshan', 'Nisal', 'Nuwanidu',
  'Oshada', 'Pabasara', 'Pathum', 'Pavan', 'Pramod', 'Prasanna', 'Pubudu', 'Pulina',
  'Ramesh', 'Randika', 'Rasika', 'Ravindu', 'Raveen', 'Roshen', 'Ruwan', 'Sachith',
  'Sadeera', 'Sahan', 'Sameera', 'Sandakan', 'Sangeeth', 'Santhush', 'Saranga',
  'Sashika', 'Seekkuge', 'Shashrika', 'Shehan', 'Suranga', 'Tharaka', 'Thilina',
  'Thimira', 'Upul', 'Vikum', 'Yohan',
];

const PROCEDURAL_SUFFIXES = [
  '_SL', '_LK', '_99', '_77', '_88', '_VIP', '_Bets', '_Pro', '_CMB', '_Kandy',
  '_Galle', '_Fly', '_777', '_Max', '_Win', '_24', '_X', '_01', '_95', '_98',
  '_Sky', '_Jet', '_King', '_Boss', '_365',
];

const PROCEDURAL_AVATARS = [
  '🦁', '🪂', '💎', '⚡️', '👑', '🌺', '🚀', '🐋', '🎖', '🎯', '🔥', '🐯',
  '🦋', '🎰', '🌸', '⚓', '🎲', '✨', '🦅', '🏆', '💥', '🛡️', '🎈', '💰',
  '🦊', '🌟', '💫', '✈️', '🍀', '🪙',
];

const PROCEDURAL_COLORS = [
  '#10B981', '#3B82F6', '#EC4899', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444',
  '#14B8A6', '#F97316', '#84CC16', '#F43F5E', '#A855F7', '#22C55E', '#38BDF8',
];

let lastRoundBotNames: Set<string> = new Set();

/**
 * Generates a fresh, varied list of multiplayer participants for each round
 * so the same small group of users never repeats consecutively.
 */
export function generateRoundBots(count: number): { name: string; avatar: string; color: string }[] {
  const chosen: { name: string; avatar: string; color: string }[] = [];
  const usedThisRound = new Set<string>();

  // Filter out bots that appeared in the immediately preceding round first
  const availableFromPool = BOT_NAMES.filter((b) => !lastRoundBotNames.has(b.name));
  const shuffledPool = [...availableFromPool].sort(() => Math.random() - 0.5);

  // Take ~60% from the curated 80-bot pool and ~40% dynamically generated Sri Lankan handles
  const poolTarget = Math.min(shuffledPool.length, Math.ceil(count * 0.65));

  for (let i = 0; i < poolTarget; i++) {
    const bot = shuffledPool[i];
    if (bot && !usedThisRound.has(bot.name)) {
      chosen.push(bot);
      usedThisRound.add(bot.name);
    }
  }

  let attempts = 0;
  while (chosen.length < count && attempts < 200) {
    attempts++;
    const first = PROCEDURAL_FIRST_NAMES[Math.floor(Math.random() * PROCEDURAL_FIRST_NAMES.length)];
    const suffix = PROCEDURAL_SUFFIXES[Math.floor(Math.random() * PROCEDURAL_SUFFIXES.length)];
    const candidateName = `${first}${suffix}`;
    if (!usedThisRound.has(candidateName) && !lastRoundBotNames.has(candidateName)) {
      const avatar = PROCEDURAL_AVATARS[Math.floor(Math.random() * PROCEDURAL_AVATARS.length)];
      const color = PROCEDURAL_COLORS[Math.floor(Math.random() * PROCEDURAL_COLORS.length)];
      chosen.push({ name: candidateName, avatar, color });
      usedThisRound.add(candidateName);
    }
  }

  // Final shuffle so pool and procedural bots are interleaved naturally
  const finalSelection = chosen.sort(() => Math.random() - 0.5);
  lastRoundBotNames = new Set(finalSelection.map((b) => b.name));
  return finalSelection;
}

export const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'c1',
    userId: 'bot1',
    username: 'Nisal_SL',
    avatar: '🦁',
    text: 'Targeting 10x multiplier on WinxCash today guys! 🚀',
    timestamp: Date.now() - 120000,
  },
  {
    id: 'c2',
    userId: 'bot2',
    username: 'Dilshan_Kandy',
    avatar: '🐯',
    text: 'The parachute jump animation is so smooth!',
    timestamp: Date.now() - 90000,
  },
  {
    id: 'c3',
    userId: 'bot3',
    username: 'Thilini_99',
    avatar: '💎',
    text: 'Cash Agent deposit arrived instantly with 100% 1st bonus ❤️',
    timestamp: Date.now() - 45000,
  },
  {
    id: 'c4',
    userId: 'bot4',
    username: 'Chamara_Negombo',
    avatar: '⚓',
    text: 'Whoa it burst at 1.12x! Good thing I cashed early 😂',
    timestamp: Date.now() - 10000,
  },
];

const REMOVED_FAKE_AGENT_IDS = new Set(['user_dep_agent_1', 'user_wd_agent_1']);
const REMOVED_FAKE_AGENT_NAMES = new Set(['depositagent_01', 'withdrawagent_01']);
const LOCAL_PRESENCE_KEY = 'winxcash_agent_presence_v1';
const LOCAL_PRESENCE_TIMEOUT_MS = 45000;

export interface CashAgentWithPresence extends User {
  isOnline: boolean;
  lastSeen?: number | null;
}

function isRemovedFakeAgent(u: { id?: string; username?: string }): boolean {
  if (!u) return false;
  if (u.id && REMOVED_FAKE_AGENT_IDS.has(u.id)) return true;
  if (u.username && REMOVED_FAKE_AGENT_NAMES.has(u.username.toLowerCase())) return true;
  return false;
}

export function getUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed: User[] = JSON.parse(raw);
    let updated = false;

    // Purge any legacy pre-seeded fake agents
    const withoutFakeAgents = parsed.filter((u) => {
      if (isRemovedFakeAgent(u)) {
        updated = true;
        return false;
      }
      return true;
    });

    const zeroBalMigrationDone = localStorage.getItem('lionbet_zero_initial_bal_v2') === '1';

    const migrated = withoutFakeAgents.map((u) => {
      if (u.role === 'admin' || u.id === 'user_admin_1') {
        if (u.mobile !== '0711452778' || u.password !== '12345678') {
          updated = true;
          return { ...u, mobile: '0711452778', password: '12345678' };
        }
      }
      if (
        !zeroBalMigrationDone &&
        u.role === 'player' &&
        !u.hasReceivedFirstDepositBonus &&
        (u.id === 'user_player_1' || u.id.startsWith('user_1') || u.id.startsWith('guest_'))
      ) {
        updated = true;
        return { ...u, balance: 0, bonusBalance: 0 };
      }
      return u;
    });

    for (const seedUser of INITIAL_USERS) {
      if (!migrated.some((u) => u.id === seedUser.id)) {
        migrated.push(seedUser);
        updated = true;
      }
    }

    if (!zeroBalMigrationDone) {
      localStorage.setItem('lionbet_zero_initial_bal_v2', '1');
      try {
        const curRaw = localStorage.getItem(CURRENT_USER_KEY);
        if (curRaw) {
          const curParsed: User = JSON.parse(curRaw);
          if (
            curParsed.role === 'player' &&
            !curParsed.hasReceivedFirstDepositBonus &&
            (curParsed.id === 'user_player_1' ||
              curParsed.id.startsWith('user_1') ||
              curParsed.id.startsWith('guest_'))
          ) {
            curParsed.balance = 0;
            curParsed.bonusBalance = 0;
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(curParsed));
          }
        }
      } catch {}
    }

    if (updated) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return INITIAL_USERS;
  }
}

export function saveUser(updatedUser: User) {
  if (isRemovedFakeAgent(updatedUser)) return;
  const users = getUsers();
  const index = users.findIndex((u) => u.id === updatedUser.id);
  if (index >= 0) {
    users[index] = updatedUser;
  } else {
    users.push(updatedUser);
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === updatedUser.id) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
  }

  // Sync Cash Agent additions or role updates with server
  fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent: updatedUser }),
  }).catch(() => {});
}

export function deleteUser(userId: string) {
  const users = getUsers().filter((u) => u.id !== userId);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  fetch(`/api/agents/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  }).catch(() => {});
}

const AUTH_SESSION_KEY = 'lionbet_explicit_auth_session_v1';

const UNAUTHENTICATED_USER_PLACEHOLDER: User = {
  id: '',
  username: 'Guest',
  email: '',
  role: 'player',
  balance: 0.0,
  bonusBalance: 0.0,
  hasReceivedFirstDepositBonus: false,
  referralCode: '',
  referralCount: 0,
  referralEarnings: 0,
  unclaimedReferralRewards: 0,
  totalWagered: 0,
  totalWon: 0,
  isBanned: false,
  avatar: '🦁',
  createdAt: 0,
};

export function hasActiveAuthSession(): boolean {
  try {
    if (localStorage.getItem(AUTH_SESSION_KEY) !== '1') return false;
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return false;
    const parsed: User = JSON.parse(raw);
    if (!parsed || !parsed.id || parsed.id.startsWith('guest_') || isRemovedFakeAgent(parsed)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearCurrentUserSession() {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch {}
}

export function getCurrentUser(): User {
  try {
    if (!hasActiveAuthSession()) {
      return UNAUTHENTICATED_USER_PLACEHOLDER;
    }
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      const parsed: User = JSON.parse(raw);
      if (parsed && parsed.id && !parsed.id.startsWith('guest_') && !isRemovedFakeAgent(parsed)) {
        const latestFromDb = getUsers().find((u) => u.id === parsed.id);
        if (latestFromDb) {
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(latestFromDb));
          return latestFromDb;
        }
        return parsed;
      }
    }
  } catch {}
  return UNAUTHENTICATED_USER_PLACEHOLDER;
}

export function setCurrentUser(user: User) {
  if (!user || !user.id || user.id.startsWith('guest_')) {
    clearCurrentUserSession();
    return;
  }
  localStorage.setItem(AUTH_SESSION_KEY, '1');
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  saveUser(user);
}

function getLocalPresenceMap(): Record<string, { lastSeen: number; manualOffline?: boolean }> {
  try {
    const raw = localStorage.getItem(LOCAL_PRESENCE_KEY);
    if (raw) return JSON.parse(raw) || {};
  } catch {}
  return {};
}

export function recordUserPresenceHeartbeat(user: User, manualOffline = false) {
  if (!user || !user.id || isRemovedFakeAgent(user)) return;
  try {
    const map = getLocalPresenceMap();
    map[user.id] = {
      lastSeen: Date.now(),
      manualOffline,
    };
    localStorage.setItem(LOCAL_PRESENCE_KEY, JSON.stringify(map));
  } catch {}

  fetch('/api/presence/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, manualOffline }),
  }).catch(() => {});
}

export function setAgentOnlineStatus(agentId: string, isOnline: boolean) {
  if (!agentId) return;
  try {
    const map = getLocalPresenceMap();
    map[agentId] = {
      lastSeen: Date.now(),
      manualOffline: !isOnline,
    };
    localStorage.setItem(LOCAL_PRESENCE_KEY, JSON.stringify(map));
  } catch {}

  fetch('/api/agents/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, isOnline }),
  }).catch(() => {});
}

export function clearUserPresenceOnLogout(userId: string) {
  if (!userId) return;
  try {
    const map = getLocalPresenceMap();
    map[userId] = {
      lastSeen: Date.now(),
      manualOffline: true,
    };
    localStorage.setItem(LOCAL_PRESENCE_KEY, JSON.stringify(map));
  } catch {}

  fetch('/api/presence/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  }).catch(() => {});
}

export function isAgentOnlineLocally(agentId: string): boolean {
  const current = getCurrentUser();
  const map = getLocalPresenceMap();
  const entry = map[agentId];
  if (entry?.manualOffline === true) return false;
  if (current && current.id === agentId) return true;
  if (entry && entry.manualOffline === false) return true;
  // Admin-created agents default to online unless marked offline
  return true;
}

export function getCashAgentsSync(): CashAgentWithPresence[] {
  const users = getUsers();
  const agents = users.filter(
    (u) =>
      !isRemovedFakeAgent(u) &&
      !u.isBanned &&
      (u.role === 'deposit_agent' || u.role === 'withdraw_agent' || u.role === 'cash_agent')
  );
  const map = getLocalPresenceMap();
  return agents
    .map((ag) => ({
      ...ag,
      isOnline: isAgentOnlineLocally(ag.id),
      lastSeen: map[ag.id]?.lastSeen || null,
    }))
    .sort((a, b) => Number(b.isOnline) - Number(a.isOnline));
}

export async function fetchCashAgentsWithPresence(): Promise<CashAgentWithPresence[]> {
  let serverAgents: CashAgentWithPresence[] = [];
  try {
    const res = await fetch('/api/agents');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.agents)) {
        serverAgents = data.agents.filter((a: any) => !isRemovedFakeAgent(a));
      }
    }
  } catch {}

  // Merge server agents into local users so Login / Admin Panel / Cashier stay in sync across tabs & browsers
  const localUsers = getUsers();
  let localChanged = false;
  for (const sa of serverAgents) {
    const idx = localUsers.findIndex((u) => u.id === sa.id);
    if (idx === -1) {
      const { isOnline, lastSeen, ...cleanUser } = sa;
      localUsers.push(cleanUser as User);
      localChanged = true;
    }
  }
  if (localChanged) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(localUsers));
  }

  // Also push any local Admin-created agents that the server might not have yet
  const localAgents = localUsers.filter(
    (u) =>
      !isRemovedFakeAgent(u) &&
      (u.role === 'deposit_agent' || u.role === 'withdraw_agent' || u.role === 'cash_agent')
  );

  for (const la of localAgents) {
    if (!serverAgents.some((sa) => sa.id === la.id)) {
      fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: la }),
      }).catch(() => {});
    }
  }

  const serverOnlineMap = new Map<string, { isOnline: boolean; lastSeen?: number | null }>();
  for (const sa of serverAgents) {
    serverOnlineMap.set(sa.id, { isOnline: Boolean(sa.isOnline), lastSeen: sa.lastSeen });
  }

  const localPresence = getLocalPresenceMap();
  const merged = localAgents
    .filter((u) => !u.isBanned)
    .map((ag) => {
      const entry = localPresence[ag.id];
      const srv = serverOnlineMap.get(ag.id);
      let isOnline = true;
      if (entry?.manualOffline === true) {
        isOnline = false;
      } else if (srv !== undefined) {
        isOnline = Boolean(srv.isOnline);
      } else {
        isOnline = isAgentOnlineLocally(ag.id);
      }
      const lastSeen = srv?.lastSeen || entry?.lastSeen || null;
      return {
        ...ag,
        isOnline,
        lastSeen,
      };
    })
    .sort((a, b) => Number(b.isOnline) - Number(a.isOnline));

  return merged;
}

const DEFAULT_CRASH_GAMES_CONFIG: Record<CrashGameId, CrashGameEngineConfig> = {
  balloon_crash: {
    gameId: 'balloon_crash',
    gameName: 'Balloon Crash LKR',
    houseEdge: 0.22,
    earlyCrashProbability: 0.45,
    instant100Probability: 0.15,
    minBet: 50.0,
    maxBet: 50000.0,
    nextCrashOverride: null,
    queuedMultipliers: [],
    isGamePaused: false,
  },
  space_rocket: {
    gameId: 'space_rocket',
    gameName: 'Space Rocket Crash',
    houseEdge: 0.22,
    earlyCrashProbability: 0.45,
    instant100Probability: 0.15,
    minBet: 50.0,
    maxBet: 50000.0,
    nextCrashOverride: null,
    queuedMultipliers: [],
    isGamePaused: false,
  },
  aviator_jet: {
    gameId: 'aviator_jet',
    gameName: 'Lion Jet X Crash',
    houseEdge: 0.22,
    earlyCrashProbability: 0.45,
    instant100Probability: 0.15,
    minBet: 50.0,
    maxBet: 50000.0,
    nextCrashOverride: null,
    queuedMultipliers: [],
    isGamePaused: false,
  },
};

export function getAdminSettings(): AdminSettings {
  try {
    const raw = localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      let updated = false;
      if (
        (parsed.houseEdge || 0) < 0.05 ||
        parsed.earlyCrashProbability === undefined ||
        parsed.instant100Probability === undefined
      ) {
        parsed.houseEdge = parsed.houseEdge || 0.22;
        parsed.earlyCrashProbability = parsed.earlyCrashProbability ?? 0.45;
        parsed.instant100Probability = parsed.instant100Probability ?? 0.15;
        updated = true;
      }
      if (!Array.isArray(parsed.queuedMultipliers)) {
        parsed.queuedMultipliers = [];
        updated = true;
      }
      if (!parsed.selectedCrashGameId) {
        parsed.selectedCrashGameId = 'balloon_crash';
        updated = true;
      }
      if (!parsed.crashGamesConfig) {
        parsed.crashGamesConfig = {
          ...DEFAULT_CRASH_GAMES_CONFIG,
          balloon_crash: {
            ...DEFAULT_CRASH_GAMES_CONFIG.balloon_crash,
            houseEdge: parsed.houseEdge,
            earlyCrashProbability: parsed.earlyCrashProbability,
            instant100Probability: parsed.instant100Probability,
            minBet: parsed.minBet ?? 50,
            maxBet: parsed.maxBet ?? 50000,
            nextCrashOverride: parsed.nextCrashOverride ?? null,
            queuedMultipliers: parsed.queuedMultipliers || [],
            isGamePaused: Boolean(parsed.isGamePaused),
          },
        };
        updated = true;
      }
      if (updated) {
        localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch {}
  const defaults: AdminSettings = {
    selectedCrashGameId: 'balloon_crash',
    houseEdge: 0.22,
    earlyCrashProbability: 0.45,
    instant100Probability: 0.15,
    minBet: 50.0,
    maxBet: 50000.0,
    nextCrashOverride: null,
    queuedMultipliers: [],
    isGamePaused: false,
    crashGamesConfig: DEFAULT_CRASH_GAMES_CONFIG,
  };
  localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(defaults));
  return defaults;
}

export function saveAdminSettings(settings: AdminSettings) {
  localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Time-of-Day Crash Game Crowd Calculator
 * Varies online count between Morning, Midday/Afternoon, Evening Peak, and Late Night,
 * while remaining steady within each time block so it does NOT jump every few seconds.
 */
export function getTimeBasedCrashCrowd(): {
  onlineInGame: number;
  roundBotCount: number;
  periodLabel: string;
} {
  // Get Sri Lanka Standard Time (UTC+5:30) hour & 30-minute slot
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const slDate = new Date(utcMs + 5.5 * 3600000);
  const hour = slDate.getHours();
  const halfHourSlot = slDate.getMinutes() >= 30 ? 0.5 : 0;
  const slotHour = hour + halfHourSlot;

  // Deterministic slot offset (-3 to +4) so each 30-min block has a natural, steady count
  const slotSeed = Math.floor(slDate.getDate() * 48 + slotHour * 2);
  const slotOffset = (slotSeed * 7) % 8 - 3;

  let baseOnline = 68;
  let baseRoundBots = 18;
  let periodLabel = 'Daytime';

  if (slotHour >= 0 && slotHour < 6) {
    // Late Night / Early Dawn (12 AM - 6 AM)
    baseOnline = 28 + Math.round(Math.sin((slotHour / 6) * Math.PI) * 12);
    baseRoundBots = 10 + ((slotSeed * 3) % 4);
    periodLabel = 'Late Night';
  } else if (slotHour >= 6 && slotHour < 11.5) {
    // Morning (6 AM - 11:30 AM)
    const progress = (slotHour - 6) / 5.5;
    baseOnline = Math.round(52 + progress * 42);
    baseRoundBots = Math.round(13 + progress * 8);
    periodLabel = 'Morning';
  } else if (slotHour >= 11.5 && slotHour < 17) {
    // Midday / Afternoon (11:30 AM - 5 PM)
    const wave = Math.sin(((slotHour - 11.5) / 5.5) * Math.PI);
    baseOnline = Math.round(112 + wave * 38);
    baseRoundBots = Math.round(20 + wave * 7);
    periodLabel = 'Afternoon';
  } else {
    // Evening / Night Prime Time (5 PM - 12 AM)
    const wave = Math.sin(((slotHour - 17) / 7) * Math.PI);
    baseOnline = Math.round(156 + wave * 54);
    baseRoundBots = Math.round(25 + wave * 9);
    periodLabel = 'Evening Peak';
  }

  const onlineInGame = Math.max(20, baseOnline + slotOffset);
  const roundBotCount = Math.max(8, Math.min(38, baseRoundBots));

  return {
    onlineInGame,
    roundBotCount,
    periodLabel,
  };
}

export function getRoundHistory(): RoundInfo[] {
  try {
    const raw = localStorage.getItem(ROUNDS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  const seedRounds: RoundInfo[] = [
    {
      id: 'r1',
      roundNumber: 2101,
      crashPoint: 1.15,
      serverSeed: 'a1b2c3d4e5f6',
      serverSeedHash: '7a9f8b...',
      clientSeed: 'balloon_seed',
      nonce: 2101,
      timestamp: Date.now() - 180000,
      totalBets: 18,
      totalPayout: 14250.0,
    },
    {
      id: 'r2',
      roundNumber: 2102,
      crashPoint: 3.42,
      serverSeed: 'c4d5e6f7a8b9',
      serverSeedHash: '5c2e1a...',
      clientSeed: 'balloon_seed',
      nonce: 2102,
      timestamp: Date.now() - 150000,
      totalBets: 24,
      totalPayout: 48200.0,
    },
    {
      id: 'r3',
      roundNumber: 2103,
      crashPoint: 1.05,
      serverSeed: 'f8e7d6c5b4a3',
      serverSeedHash: '9b4d3f...',
      clientSeed: 'balloon_seed',
      nonce: 2103,
      timestamp: Date.now() - 120000,
      totalBets: 22,
      totalPayout: 0,
    },
    {
      id: 'r4',
      roundNumber: 2104,
      crashPoint: 2.18,
      serverSeed: '3a4b5c6d7e8f',
      serverSeedHash: '1a2b3c...',
      clientSeed: 'balloon_seed',
      nonce: 2104,
      timestamp: Date.now() - 90000,
      totalBets: 19,
      totalPayout: 21000.0,
    },
    {
      id: 'r5',
      roundNumber: 2105,
      crashPoint: 1.12,
      serverSeed: '9e8d7c6b5a4f',
      serverSeedHash: '8e7f6a...',
      clientSeed: 'balloon_seed',
      nonce: 2105,
      timestamp: Date.now() - 60000,
      totalBets: 28,
      totalPayout: 4500.0,
    },
    {
      id: 'r6',
      roundNumber: 2106,
      crashPoint: 8.75,
      serverSeed: '2b3c4d5e6f7a',
      serverSeedHash: '3d4e5f...',
      clientSeed: 'balloon_seed',
      nonce: 2106,
      timestamp: Date.now() - 30000,
      totalBets: 32,
      totalPayout: 89000.0,
      topBonusWinner: {
        userId: 'user_player_2',
        username: 'Nisal_SL',
        avatar: '🚀',
        multiplier: 6.45,
        winAmount: 6450,
        bonusAmount: 6450,
        roundNumber: 2106,
      },
    },
  ];
  localStorage.setItem(ROUNDS_STORAGE_KEY, JSON.stringify(seedRounds));
  return seedRounds;
}

export function addRoundToHistory(round: RoundInfo) {
  const history = getRoundHistory();
  const filtered = history.filter((r) => r.id !== round.id && r.nonce !== round.nonce);
  filtered.unshift(round);
  if (filtered.length > 50) filtered.pop();
  localStorage.setItem(ROUNDS_STORAGE_KEY, JSON.stringify(filtered));
}

export function getTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (raw) {
      const parsed: Transaction[] = JSON.parse(raw);
      if (parsed.length > 0) return parsed;
    }
  } catch {}
  const initialTx: Transaction[] = [
    {
      id: 'tx_seed_1',
      userId: 'user_player_2',
      username: 'Nisal_SL',
      type: 'deposit',
      amount: 5000,
      bonusAdded: 5000,
      method: 'cash_agent',
      accountDetails: 'Lion Bet Agent (DepositAgent_01) [+100% 1st Deposit Bonus: Rs.5000]',
      processedBy: 'DepositAgent_01',
      status: 'completed',
      timestamp: Date.now() - 86400000 * 2,
    },
    {
      id: 'tx_seed_2',
      userId: 'user_player_3',
      username: 'Thilini_99',
      type: 'deposit',
      amount: 2500,
      bonusAdded: 2500,
      method: 'cash_agent',
      accountDetails: 'Lion Bet Agent (DepositAgent_01) [+100% 1st Deposit Bonus: Rs.2500]',
      processedBy: 'DepositAgent_01',
      status: 'completed',
      timestamp: Date.now() - 86400000 * 1,
    },
    {
      id: 'tx_seed_3',
      userId: 'user_player_1',
      username: 'Kasun_Pilot',
      type: 'withdrawal',
      amount: 3500,
      method: 'cash_agent',
      accountDetails: 'Cash Agent Payout - 0771234567 (Kasun_Pilot)',
      status: 'pending',
      timestamp: Date.now() - 3600000 * 2,
    },
    {
      id: 'tx_seed_4',
      userId: 'user_player_3',
      username: 'Thilini_99',
      type: 'deposit',
      amount: 4000,
      bonusAdded: 0,
      method: 'cash_agent',
      accountDetails: 'Lion Bet Agent (WhatsApp Verified - 0769876543)',
      status: 'pending',
      timestamp: Date.now() - 1800000,
    },
  ];
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(initialTx));
  return initialTx;
}

export function addTransaction(tx: Transaction) {
  const list = getTransactions();
  list.unshift(tx);
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(list));
}

export function saveTransactions(list: Transaction[]) {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(list));
}

export function getBetHistory(): BetRecord[] {
  try {
    const raw = localStorage.getItem(BET_HISTORY_KEY);
    if (raw) {
      const parsed: BetRecord[] = JSON.parse(raw);
      if (parsed.length > 0) return parsed;
    }
  } catch {}
  const initialBets: BetRecord[] = [
    {
      id: 'bet_hist_1',
      userId: 'user_player_1',
      username: 'Kasun_Pilot',
      avatar: '🦁',
      roundNumber: 2106,
      amount: 1000,
      cashoutMultiplier: 2.45,
      crashPoint: 8.75,
      winAmount: 2450,
      profit: 1450,
      status: 'won',
      timestamp: Date.now() - 30000,
    },
    {
      id: 'bet_hist_2',
      userId: 'user_player_2',
      username: 'Nisal_SL',
      avatar: '🚀',
      roundNumber: 2106,
      amount: 1000,
      cashoutMultiplier: 6.45,
      crashPoint: 8.75,
      winAmount: 6450,
      profit: 5450,
      status: 'won',
      timestamp: Date.now() - 30000,
    },
    {
      id: 'bet_hist_3',
      userId: 'user_player_1',
      username: 'Kasun_Pilot',
      avatar: '🦁',
      roundNumber: 2105,
      amount: 500,
      cashoutMultiplier: null,
      crashPoint: 1.12,
      winAmount: 0,
      profit: -500,
      status: 'lost',
      timestamp: Date.now() - 60000,
    },
    {
      id: 'bet_hist_4',
      userId: 'user_player_3',
      username: 'Thilini_99',
      avatar: '💎',
      roundNumber: 2104,
      amount: 1500,
      cashoutMultiplier: 1.85,
      crashPoint: 2.18,
      winAmount: 2775,
      profit: 1275,
      status: 'won',
      timestamp: Date.now() - 90000,
    },
    {
      id: 'bet_hist_5',
      userId: 'user_player_2',
      username: 'Nisal_SL',
      avatar: '🚀',
      roundNumber: 2103,
      amount: 2000,
      cashoutMultiplier: null,
      crashPoint: 1.05,
      winAmount: 0,
      profit: -2000,
      status: 'lost',
      timestamp: Date.now() - 120000,
    },
    {
      id: 'bet_hist_6',
      userId: 'user_player_1',
      username: 'Kasun_Pilot',
      avatar: '🦁',
      roundNumber: 2102,
      amount: 800,
      cashoutMultiplier: 3.1,
      crashPoint: 3.42,
      winAmount: 2480,
      profit: 1680,
      status: 'won',
      timestamp: Date.now() - 150000,
    },
  ];
  localStorage.setItem(BET_HISTORY_KEY, JSON.stringify(initialBets));
  return initialBets;
}

export function addBetRecord(record: BetRecord) {
  const list = getBetHistory();
  list.unshift(record);
  if (list.length > 250) list.pop();
  localStorage.setItem(BET_HISTORY_KEY, JSON.stringify(list));
}

export function getLeaderboard(): LeaderboardEntry[] {
  return [
    {
      rank: 1,
      username: 'Thilini_99',
      avatar: '💎',
      metric: 'Highest Win',
      value: 425000.0,
      multiplier: 84.5,
      badge: '👑 Legend',
    },
    {
      rank: 2,
      username: 'Nisal_SL',
      avatar: '🦁',
      metric: 'Highest Win',
      value: 210000.0,
      multiplier: 42.1,
      badge: '🥈 Master',
    },
    {
      rank: 3,
      username: 'CryptoWhale',
      avatar: '🐋',
      metric: 'Highest Win',
      value: 189000.0,
      multiplier: 28.3,
      badge: '🥉 Pro',
    },
    {
      rank: 4,
      username: 'LuckyStriker',
      avatar: '⚡️',
      metric: 'Highest Win',
      value: 142000.0,
      multiplier: 22.0,
    },
    {
      rank: 5,
      username: 'Kasun_Pilot',
      avatar: '🦁',
      metric: 'Highest Win',
      value: 52400.0,
      multiplier: 12.45,
    },
  ];
}
