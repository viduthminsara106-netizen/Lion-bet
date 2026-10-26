import {
  User,
  RoundInfo,
  ChatMessage,
  AdminSettings,
  CrashGameId,
  CrashGameEngineConfig,
  MinesGameEngineConfig,
  LeaderboardEntry,
  Transaction,
  BetRecord,
} from '../types/game';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from '../firebase';

const USERS_STORAGE_KEY = 'balloon_users_lkr_db';
const DELETED_USERS_STORAGE_KEY = 'balloon_deleted_users_lkr_v1';
const CURRENT_USER_KEY = 'balloon_active_lkr_user';
const ROUNDS_STORAGE_KEY = 'balloon_rounds_lkr_history';
const ADMIN_SETTINGS_KEY = 'balloon_admin_lkr_settings';
const TRANSACTIONS_KEY = 'balloon_lkr_transactions';
const BET_HISTORY_KEY = 'balloon_lkr_bet_history';

const FIRESTORE_BASE_URL = firebaseConfig?.projectId
  ? `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`
  : '';
const FIRESTORE_API_KEY = firebaseConfig?.apiKey || '';

export function normalizeSriLankaPhone(raw?: string): string {
  if (!raw) return '';
  const d = String(raw).replace(/[\s\-().]/g, '');
  if (d.startsWith('+940') && d.length >= 12) return '0' + d.slice(4);
  if (d.startsWith('00940') && d.length >= 13) return '0' + d.slice(5);
  if (d.startsWith('0094') && d.length >= 12) return '0' + d.slice(4);
  if (d.startsWith('+94') && d.length >= 11) return '0' + d.slice(3);
  if (d.startsWith('940') && d.length === 12) return '0' + d.slice(3);
  if (d.startsWith('94') && d.length === 11) return '0' + d.slice(2);
  if (/^007\d{8}$/.test(d)) return d.slice(1);
  if (/^7\d{8}$/.test(d)) return '0' + d;
  return d;
}

export function clearReferralQueryFromUrl() {
  try {
    localStorage.removeItem('lionbet_pending_ref_code');
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (
        params.has('ref') ||
        params.has('promo') ||
        params.has('referral') ||
        params.has('code') ||
        params.has('r')
      ) {
        params.delete('ref');
        params.delete('promo');
        params.delete('referral');
        params.delete('code');
        params.delete('r');
        const nextSearch = params.toString();
        const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
        window.history.replaceState({}, '', nextUrl);
      }
    }
  } catch {}
}

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

export interface CashAgentWithPresence extends User {
  isOnline: boolean;
  lastSeen?: number | null;
  adminOnlineStatus?: boolean;
}

function isRemovedFakeAgent(u: { id?: string; username?: string }): boolean {
  if (!u) return false;
  if (u.id && (REMOVED_FAKE_AGENT_IDS.has(u.id) || u.id.startsWith('guest_'))) return true;
  if (u.username && REMOVED_FAKE_AGENT_NAMES.has(u.username.toLowerCase())) return true;
  return false;
}

function isAgentUserRole(role?: string): boolean {
  return role === 'deposit_agent' || role === 'withdraw_agent' || role === 'cash_agent';
}

function getDeletedUserIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
}

function saveDeletedUserIdsLocal(ids: Set<string>) {
  try {
    localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export async function pushUserToCloudFirestore(user: User): Promise<void> {
  if (!user || !user.id || isRemovedFakeAgent(user)) {
    return;
  }
  const normalizedUser: User = {
    ...user,
    mobile: user.mobile ? normalizeSriLankaPhone(user.mobile) : user.mobile,
    password: user.password || '12345678',
    updatedAt: user.updatedAt || Date.now(),
  };
  const payload = {
    id: String(normalizedUser.id),
    json: JSON.stringify(normalizedUser),
    mobile: String(normalizedUser.mobile || ''),
    email: String(normalizedUser.email || '').toLowerCase(),
    username: String(normalizedUser.username || ''),
    role: String(normalizedUser.role || 'player'),
    updatedAt: Number(normalizedUser.updatedAt || Date.now()),
  };

  await Promise.allSettled([
    // 1. Official Firebase Firestore SDK write
    setDoc(doc(db, 'lionbet_users', String(normalizedUser.id)), payload).catch(() => {}),
    // 2. Direct Firestore REST API write fallback
    FIRESTORE_BASE_URL && FIRESTORE_API_KEY
      ? fetch(
          `${FIRESTORE_BASE_URL}/lionbet_users/${encodeURIComponent(
            normalizedUser.id
          )}?key=${FIRESTORE_API_KEY}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                id: { stringValue: payload.id },
                json: { stringValue: payload.json },
                mobile: { stringValue: payload.mobile },
                email: { stringValue: payload.email },
                username: { stringValue: payload.username },
                role: { stringValue: payload.role },
                updatedAt: { integerValue: String(payload.updatedAt) },
              },
            }),
          }
        ).catch(() => {})
      : Promise.resolve(),
  ]);
}

async function deleteUserFromCloudFirestore(userId: string, deletedSet: Set<string>): Promise<void> {
  if (!userId) return;
  const idsJson = JSON.stringify(Array.from(deletedSet));
  const now = Date.now();
  await Promise.allSettled([
    deleteDoc(doc(db, 'lionbet_users', String(userId))).catch(() => {}),
    setDoc(doc(db, 'lionbet_cloud', 'deleted_users'), {
      ids: idsJson,
      updatedAt: now,
    }).catch(() => {}),
    FIRESTORE_BASE_URL && FIRESTORE_API_KEY
      ? fetch(
          `${FIRESTORE_BASE_URL}/lionbet_users/${encodeURIComponent(userId)}?key=${FIRESTORE_API_KEY}`,
          { method: 'DELETE' }
        ).catch(() => {})
      : Promise.resolve(),
    FIRESTORE_BASE_URL && FIRESTORE_API_KEY
      ? fetch(`${FIRESTORE_BASE_URL}/lionbet_cloud/deleted_users?key=${FIRESTORE_API_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              ids: { stringValue: idsJson },
              updatedAt: { integerValue: String(now) },
            },
          }),
        }).catch(() => {})
      : Promise.resolve(),
  ]);
}

export async function fetchUsersFromCloudFirestore(): Promise<{
  users: User[];
  deletedIds: string[];
}> {
  const userMap = new Map<string, User>();
  const deletedSet = new Set<string>();

  // 1. Try Official Firebase Firestore SDK first
  try {
    const [snap, delSnap] = await Promise.all([
      getDocs(collection(db, 'lionbet_users')).catch(() => null),
      getDoc(doc(db, 'lionbet_cloud', 'deleted_users')).catch(() => null),
    ]);
    if (delSnap && delSnap.exists()) {
      const data = delSnap.data();
      if (data?.ids) {
        try {
          const parsed = JSON.parse(String(data.ids));
          if (Array.isArray(parsed)) parsed.forEach((id) => deletedSet.add(String(id)));
        } catch {}
      }
    }
    if (snap) {
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data?.json) {
          try {
            const u = JSON.parse(String(data.json)) as User;
            if (u && u.id && !isRemovedFakeAgent(u)) {
              userMap.set(u.id, u);
            }
          } catch {}
        }
      });
    }
  } catch {}

  // 2. Also query Firestore REST API as fallback or supplement
  if (FIRESTORE_BASE_URL && FIRESTORE_API_KEY && userMap.size === 0) {
    try {
      const [usersRes, delRes] = await Promise.all([
        fetch(`${FIRESTORE_BASE_URL}/lionbet_users?pageSize=300&key=${FIRESTORE_API_KEY}`),
        fetch(`${FIRESTORE_BASE_URL}/lionbet_cloud/deleted_users?key=${FIRESTORE_API_KEY}`),
      ]);
      if (delRes.ok) {
        const delData = await delRes.json();
        const rawIds = delData?.fields?.ids?.stringValue;
        if (rawIds) {
          const parsed = JSON.parse(rawIds);
          if (Array.isArray(parsed)) parsed.forEach((id: string) => deletedSet.add(String(id)));
        }
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        const docs = Array.isArray(data?.documents) ? data.documents : [];
        for (const d of docs) {
          const rawJson = d?.fields?.json?.stringValue;
          if (rawJson) {
            try {
              const u = JSON.parse(rawJson) as User;
              if (u && u.id && !isRemovedFakeAgent(u)) {
                userMap.set(u.id, u);
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  return {
    users: Array.from(userMap.values()),
    deletedIds: Array.from(deletedSet),
  };
}

export function getUsers(): User[] {
  try {
    const deletedIds = getDeletedUserIds();
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      const seeded = INITIAL_USERS.map((u) => ({ ...u, updatedAt: 0 }));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed: User[] = JSON.parse(raw);
    let updated = false;

    // Purge any legacy pre-seeded fake agents or guest accounts or deleted accounts
    const withoutFakeAgents = parsed.filter((u) => {
      if (!u || !u.id || isRemovedFakeAgent(u) || deletedIds.has(u.id)) {
        updated = true;
        return false;
      }
      return true;
    });

    // Ensure currently active user in CURRENT_USER_KEY is never missing from USERS_STORAGE_KEY
    try {
      const rawCur = localStorage.getItem(CURRENT_USER_KEY);
      if (rawCur) {
        const curUser: User = JSON.parse(rawCur);
        if (
          curUser &&
          curUser.id &&
          !curUser.id.startsWith('guest_') &&
          !isRemovedFakeAgent(curUser) &&
          !deletedIds.has(curUser.id) &&
          !withoutFakeAgents.some((u) => u.id === curUser.id)
        ) {
          withoutFakeAgents.push({
            ...curUser,
            password: curUser.password || '12345678',
            mobile: normalizeSriLankaPhone(curUser.mobile || curUser.agentContact || ''),
            updatedAt: curUser.updatedAt || Date.now(),
          });
          updated = true;
        }
      }
    } catch {}

    const zeroBalMigrationDone = localStorage.getItem('lionbet_zero_initial_bal_v2') === '1';
    const customAccountsStampDone = localStorage.getItem('lionbet_custom_accounts_stamp_v6') === '1';

    const migrated = withoutFakeAgents.map((u) => {
      let nextUser = { ...u };
      if (nextUser.mobile) {
        const normMob = normalizeSriLankaPhone(nextUser.mobile);
        if (normMob !== nextUser.mobile) {
          nextUser.mobile = normMob;
          updated = true;
        }
      }
      if (nextUser.role === 'admin' || nextUser.id === 'user_admin_1') {
        if (nextUser.mobile !== '0711452778' || nextUser.password !== '12345678') {
          updated = true;
          nextUser = { ...nextUser, mobile: '0711452778', password: '12345678' };
        }
      }
      if (
        !zeroBalMigrationDone &&
        nextUser.role === 'player' &&
        !nextUser.hasReceivedFirstDepositBonus &&
        nextUser.id === 'user_player_1'
      ) {
        updated = true;
        nextUser = { ...nextUser, balance: 0, bonusBalance: 0 };
      }

      // Stamp custom accounts / agents created on this device so they always upload to Cloud Firestore & Server
      if (!customAccountsStampDone) {
        const seedMatch = INITIAL_USERS.find((s) => s.id === nextUser.id);
        const isCustomOrModified =
          !seedMatch ||
          isAgentUserRole(nextUser.role) ||
          nextUser.role !== seedMatch.role ||
          nextUser.password !== seedMatch.password ||
          nextUser.mobile !== seedMatch.mobile ||
          nextUser.username !== seedMatch.username;

        if (isCustomOrModified) {
          nextUser = {
            ...nextUser,
            password: nextUser.password || '12345678',
            mobile: normalizeSriLankaPhone(nextUser.mobile || nextUser.agentContact || ''),
            updatedAt: Math.max(nextUser.updatedAt || 0, nextUser.createdAt || 0, Date.now()),
          };
          updated = true;
          pushUserToCloudFirestore(nextUser).catch(() => {});
        } else if (seedMatch && nextUser.updatedAt === undefined) {
          nextUser = { ...nextUser, updatedAt: 0 };
          updated = true;
        }
      }

      return nextUser;
    });

    for (const seedUser of INITIAL_USERS) {
      if (!deletedIds.has(seedUser.id) && !migrated.some((u) => u.id === seedUser.id)) {
        migrated.push({ ...seedUser, updatedAt: 0 });
        updated = true;
      }
    }

    if (!zeroBalMigrationDone) {
      localStorage.setItem('lionbet_zero_initial_bal_v2', '1');
    }
    if (!customAccountsStampDone) {
      localStorage.setItem('lionbet_custom_accounts_stamp_v6', '1');
    }

    // Dynamically sync referralCount with actual referred accounts
    for (const u of migrated) {
      if (!u.referralCode) continue;
      const codeUpper = u.referralCode.trim().toUpperCase();
      const referredMembers = migrated.filter(
        (m) => m.id !== u.id && m.referredBy && m.referredBy.trim().toUpperCase() === codeUpper
      );
      if (referredMembers.length > (u.referralCount || 0)) {
        u.referralCount = referredMembers.length;
        updated = true;
      }
    }

    if (updated) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return INITIAL_USERS;
  }
}

function saveUserLocalOnly(updatedUser: User): User {
  const deletedIds = getDeletedUserIds();
  if (deletedIds.has(updatedUser.id)) {
    deletedIds.delete(updatedUser.id);
    saveDeletedUserIdsLocal(deletedIds);
  }

  const stampedUser: User = {
    ...updatedUser,
    password: updatedUser.password || '12345678',
    mobile: updatedUser.mobile || updatedUser.agentContact || '',
    updatedAt: Date.now(),
  };
  const users = getUsers();
  const index = users.findIndex((u) => u.id === stampedUser.id);
  if (index >= 0) {
    users[index] = stampedUser;
  } else {
    users.push(stampedUser);
  }

  // Recompute referralCount for all referrers whenever a user is saved
  for (const u of users) {
    if (!u.referralCode) continue;
    const codeUpper = u.referralCode.trim().toUpperCase();
    const referredMembers = users.filter(
      (m) => m.id !== u.id && m.referredBy && m.referredBy.trim().toUpperCase() === codeUpper
    );
    if (referredMembers.length > (u.referralCount || 0)) {
      u.referralCount = referredMembers.length;
    }
  }

  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  try {
    const rawCur = localStorage.getItem(CURRENT_USER_KEY);
    if (rawCur) {
      const parsedCur: User = JSON.parse(rawCur);
      const latestCur = users.find((u) => u.id === parsedCur.id);
      if (latestCur) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(latestCur));
      }
    }
    window.dispatchEvent(new Event('storage'));
  } catch {}

  return stampedUser;
}

export function saveUser(updatedUser: User) {
  if (!updatedUser || !updatedUser.id || isRemovedFakeAgent(updatedUser)) return;
  const stampedUser = saveUserLocalOnly(updatedUser);

  // Sync directly to Cloud Firestore (shared across all devices & containers)
  pushUserToCloudFirestore(stampedUser).catch(() => {});

  // Sync user & referral data with backend server across tabs/browsers/devices
  fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: stampedUser }),
  }).catch(() => {});

  // Sync Cash Agent additions or role updates with server
  fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent: stampedUser }),
  }).catch(() => {});
}

export async function saveUserAndSync(updatedUser: User): Promise<User> {
  if (!updatedUser || !updatedUser.id || isRemovedFakeAgent(updatedUser)) return updatedUser;
  const stampedUser = saveUserLocalOnly(updatedUser);

  await Promise.all([
    pushUserToCloudFirestore(stampedUser).catch(() => {}),
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: stampedUser }),
    }).catch(() => {}),
    fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: stampedUser }),
    }).catch(() => {}),
  ]);

  return stampedUser;
}

function mergeTwoUsersClient(existing: User, incoming: User): { merged: User; didChange: boolean } {
  const locUpdated = Number(existing.updatedAt || 0);
  const srvUpdated = Number(incoming.updatedAt || 0);
  const incomingIsNewer = srvUpdated >= locUpdated;

  const nextRole =
    isAgentUserRole(incoming.role) && !isAgentUserRole(existing.role) && srvUpdated >= locUpdated
      ? incoming.role
      : isAgentUserRole(existing.role) && !isAgentUserRole(incoming.role) && locUpdated > srvUpdated
      ? existing.role
      : incomingIsNewer
      ? incoming.role || existing.role
      : existing.role || incoming.role;

  const nextPassword = incomingIsNewer
    ? incoming.password || existing.password || '12345678'
    : existing.password || incoming.password || '12345678';
  const nextMobile = incomingIsNewer
    ? incoming.mobile || existing.mobile || incoming.agentContact || existing.agentContact
    : existing.mobile || incoming.mobile || existing.agentContact || incoming.agentContact;
  const nextEmail = incomingIsNewer
    ? incoming.email || existing.email
    : existing.email || incoming.email;
  const nextUsername = incomingIsNewer
    ? incoming.username || existing.username
    : existing.username || incoming.username;
  const nextAgentContact = incomingIsNewer
    ? incoming.agentContact || existing.agentContact || nextMobile
    : existing.agentContact || incoming.agentContact || nextMobile;
  const nextIsBanned = incomingIsNewer ? Boolean(incoming.isBanned) : Boolean(existing.isBanned);

  const nextBalance = incomingIsNewer
    ? typeof incoming.balance === 'number'
      ? incoming.balance
      : existing.balance
    : typeof existing.balance === 'number'
    ? existing.balance
    : incoming.balance;

  const nextBonusBalance = incomingIsNewer
    ? typeof incoming.bonusBalance === 'number'
      ? incoming.bonusBalance
      : existing.bonusBalance || 0
    : typeof existing.bonusBalance === 'number'
    ? existing.bonusBalance
    : incoming.bonusBalance || 0;

  const nextHasFirstBonus = Boolean(
    existing.hasReceivedFirstDepositBonus || incoming.hasReceivedFirstDepositBonus
  );

  const nextReferralCount = Math.max(existing.referralCount || 0, incoming.referralCount || 0);
  const nextReferralEarnings = Math.max(
    existing.referralEarnings || 0,
    incoming.referralEarnings || 0
  );
  const nextUnclaimed = incomingIsNewer
    ? incoming.unclaimedReferralRewards ?? existing.unclaimedReferralRewards ?? 0
    : existing.unclaimedReferralRewards ?? incoming.unclaimedReferralRewards ?? 0;
  const nextReferredBy = existing.referredBy || incoming.referredBy;
  const nextReferralCode = existing.referralCode || incoming.referralCode;
  const nextTotalWagered = Math.max(existing.totalWagered || 0, incoming.totalWagered || 0);
  const nextTotalWon = Math.max(existing.totalWon || 0, incoming.totalWon || 0);
  const nextTotalDeposited = Math.max(existing.totalDeposited || 0, incoming.totalDeposited || 0);
  const nextCommGen = Math.max(
    existing.commissionGeneratedForReferrer || 0,
    incoming.commissionGeneratedForReferrer || 0
  );

  const merged: User = {
    ...existing,
    ...(incomingIsNewer ? incoming : {}),
    role: nextRole,
    password: nextPassword,
    mobile: nextMobile,
    email: nextEmail,
    username: nextUsername,
    agentContact: nextAgentContact,
    isBanned: nextIsBanned,
    balance: Number((nextBalance ?? 0).toFixed(2)),
    bonusBalance: Number((nextBonusBalance ?? 0).toFixed(2)),
    hasReceivedFirstDepositBonus: nextHasFirstBonus,
    referralCode: nextReferralCode,
    referredBy: nextReferredBy,
    referralCount: nextReferralCount,
    referralEarnings: nextReferralEarnings,
    unclaimedReferralRewards: nextUnclaimed,
    totalWagered: nextTotalWagered,
    totalWon: nextTotalWon,
    totalDeposited: nextTotalDeposited,
    commissionGeneratedForReferrer: nextCommGen,
    updatedAt: Math.max(locUpdated, srvUpdated),
  };

  const didChange =
    merged.role !== existing.role ||
    merged.password !== existing.password ||
    merged.mobile !== existing.mobile ||
    merged.email !== existing.email ||
    merged.username !== existing.username ||
    merged.agentContact !== existing.agentContact ||
    merged.isBanned !== existing.isBanned ||
    merged.balance !== existing.balance ||
    (merged.bonusBalance || 0) !== (existing.bonusBalance || 0) ||
    Boolean(merged.hasReceivedFirstDepositBonus) !==
      Boolean(existing.hasReceivedFirstDepositBonus) ||
    merged.referralCount !== existing.referralCount ||
    merged.referralEarnings !== existing.referralEarnings ||
    merged.unclaimedReferralRewards !== existing.unclaimedReferralRewards ||
    merged.referredBy !== existing.referredBy ||
    merged.totalWagered !== existing.totalWagered ||
    (merged.totalDeposited || 0) !== (existing.totalDeposited || 0) ||
    (merged.commissionGeneratedForReferrer || 0) !==
      (existing.commissionGeneratedForReferrer || 0);

  return { merged, didChange };
}

let inFlightUsersSync: Promise<User[]> | null = null;
let realtimeListenersStarted = false;

export function startCloudDatabaseRealtimeSync() {
  if (realtimeListenersStarted || typeof window === 'undefined') return;
  realtimeListenersStarted = true;

  try {
    // 1. Live real-time listener on lionbet_users collection in Cloud Firestore
    onSnapshot(
      collection(db, 'lionbet_users'),
      (snapshot) => {
        const deletedIds = getDeletedUserIds();
        const remoteUsers: User[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data?.json) {
            try {
              const u = JSON.parse(String(data.json)) as User;
              if (u && u.id && !isRemovedFakeAgent(u) && !deletedIds.has(u.id)) {
                remoteUsers.push(u);
              }
            } catch {}
          }
        });

        if (remoteUsers.length === 0) return;

        const localUsers = getUsers().filter((u) => !deletedIds.has(u.id));
        const mergedMap = new Map<string, User>();
        for (const lu of localUsers) mergedMap.set(lu.id, lu);

        let changed = false;
        for (const ru of remoteUsers) {
          const existing = mergedMap.get(ru.id);
          if (!existing) {
            mergedMap.set(ru.id, ru);
            changed = true;
          } else {
            const { merged, didChange } = mergeTwoUsersClient(existing, ru);
            if (didChange) {
              mergedMap.set(ru.id, merged);
              changed = true;
            }
          }
        }

        if (changed) {
          const allUsers = Array.from(mergedMap.values()).filter((u) => !deletedIds.has(u.id));
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(allUsers));
          try {
            const rawCur = localStorage.getItem(CURRENT_USER_KEY);
            if (rawCur) {
              const parsedCur: User = JSON.parse(rawCur);
              const latestCur = allUsers.find((u) => u.id === parsedCur.id);
              if (latestCur) {
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(latestCur));
              }
            }
            window.dispatchEvent(new Event('storage'));
          } catch {}
        }
      },
      () => {}
    );

    // 2. Live real-time listener on deleted_users in Cloud Firestore
    onSnapshot(
      doc(db, 'lionbet_cloud', 'deleted_users'),
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        if (!data?.ids) return;
        try {
          const parsed = JSON.parse(String(data.ids));
          if (!Array.isArray(parsed)) return;
          const deletedIds = getDeletedUserIds();
          let changed = false;
          for (const id of parsed) {
            if (id && !deletedIds.has(String(id))) {
              deletedIds.add(String(id));
              changed = true;
            }
          }
          if (changed) {
            saveDeletedUserIdsLocal(deletedIds);
            const filtered = getUsers().filter((u) => !deletedIds.has(u.id));
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filtered));
            window.dispatchEvent(new Event('storage'));
          }
        } catch {}
      },
      () => {}
    );
  } catch {}
}

export async function syncUsersWithServer(forceFresh = false): Promise<User[]> {
  startCloudDatabaseRealtimeSync();

  if (inFlightUsersSync && !forceFresh) {
    return inFlightUsersSync;
  }

  const runPromise = (async () => {
    try {
      const [apiResult, cloudResult] = await Promise.all([
        fetch('/api/users')
          .then(async (res) => (res.ok ? res.json() : null))
          .catch(() => null),
        fetchUsersFromCloudFirestore().catch(() => ({
          users: [] as User[],
          deletedIds: [] as string[],
        })),
      ]);

      const deletedIds = getDeletedUserIds();
      let deletedChanged = false;
      const incomingDeleted = [
        ...(Array.isArray(apiResult?.deletedUserIds) ? apiResult.deletedUserIds : []),
        ...(Array.isArray(cloudResult?.deletedIds) ? cloudResult.deletedIds : []),
      ];
      for (const did of incomingDeleted) {
        if (did && !deletedIds.has(did)) {
          deletedIds.add(did);
          deletedChanged = true;
        }
      }
      if (deletedChanged) {
        saveDeletedUserIdsLocal(deletedIds);
      }

      const serverUsers: User[] = Array.isArray(apiResult?.users)
        ? apiResult.users.filter(
            (u: any) => u && u.id && !isRemovedFakeAgent(u) && !deletedIds.has(u.id)
          )
        : [];
      const cloudUsers: User[] = Array.isArray(cloudResult?.users)
        ? cloudResult.users.filter(
            (u: any) => u && u.id && !isRemovedFakeAgent(u) && !deletedIds.has(u.id)
          )
        : [];

      // Re-read latest localUsers AFTER network calls so any saveUser() during fetch is never clobbered
      const localUsers = getUsers().filter((u) => !deletedIds.has(u.id));
      const mergedMap = new Map<string, User>();

      for (const lu of localUsers) {
        mergedMap.set(lu.id, lu);
      }

      let changed = deletedChanged;

      // Merge both serverUsers and cloudUsers into mergedMap
      for (const remoteUser of [...serverUsers, ...cloudUsers]) {
        if (!remoteUser || !remoteUser.id || deletedIds.has(remoteUser.id)) continue;
        const existing = mergedMap.get(remoteUser.id);
        if (!existing) {
          mergedMap.set(remoteUser.id, remoteUser);
          changed = true;
        } else {
          const { merged, didChange } = mergeTwoUsersClient(existing, remoteUser);
          if (didChange) {
            mergedMap.set(remoteUser.id, merged);
            changed = true;
          }
        }
      }

      const allUsers = Array.from(mergedMap.values()).filter((u) => !deletedIds.has(u.id));

      // Recompute referralCount for every user based on actual referred team members
      for (const u of allUsers) {
        if (!u.referralCode) continue;
        const codeUpper = u.referralCode.trim().toUpperCase();
        const referredMembers = allUsers.filter(
          (m) => m.id !== u.id && m.referredBy && m.referredBy.trim().toUpperCase() === codeUpper
        );
        if (referredMembers.length > (u.referralCount || 0)) {
          u.referralCount = referredMembers.length;
          changed = true;
        }
      }

      if (changed) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(allUsers));
        try {
          const rawCur = localStorage.getItem(CURRENT_USER_KEY);
          if (rawCur) {
            const parsedCur: User = JSON.parse(rawCur);
            const latestCur = allUsers.find((u) => u.id === parsedCur.id);
            if (latestCur) {
              localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(latestCur));
            }
          }
          window.dispatchEvent(new Event('storage'));
        } catch {}
      }

      // Push any local users or agents that are missing or modified in Cloud Firestore / Server
      const cloudMap = new Map<string, User>();
      for (const cu of cloudUsers) cloudMap.set(cu.id, cu);

      for (const u of allUsers) {
        const cu = cloudMap.get(u.id);
        const isMissingInCloud = !cu;
        const isNewerLocally = (u.updatedAt || 0) > (cu?.updatedAt || 0);
        const isAgentRoleMismatch = isAgentUserRole(u.role) && cu?.role !== u.role;
        const isCredentialMismatch =
          cu &&
          ((u.password && u.password !== cu.password) ||
            (u.mobile && normalizeSriLankaPhone(u.mobile) !== normalizeSriLankaPhone(cu.mobile)));
        if (
          isMissingInCloud ||
          isNewerLocally ||
          isAgentRoleMismatch ||
          isCredentialMismatch
        ) {
          pushUserToCloudFirestore(u).catch(() => {});
        }
      }

      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: allUsers }),
      }).catch(() => {});

      for (const u of allUsers) {
        if (
          isAgentUserRole(u.role) &&
          !serverUsers.some((su) => su.id === u.id && isAgentUserRole(su.role))
        ) {
          fetch('/api/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent: u }),
          }).catch(() => {});
        }
      }

      return allUsers;
    } finally {
      if (inFlightUsersSync === runPromise) {
        inFlightUsersSync = null;
      }
    }
  })();

  inFlightUsersSync = runPromise;
  return runPromise;
}

export function doesUserMatchIdentifier(u: User, rawIdentifier: string): boolean {
  if (!u || !u.id || isRemovedFakeAgent(u)) return false;
  const cleanId = rawIdentifier.trim();
  if (!cleanId) return false;

  const cleanPhone = normalizeSriLankaPhone(cleanId);
  const cleanIdLower = cleanId.toLowerCase();
  const cleanIdCompact = cleanIdLower.replace(/[\s_]+/g, '');

  const uPhone = u.mobile ? normalizeSriLankaPhone(u.mobile) : '';
  const uContact = u.agentContact ? normalizeSriLankaPhone(u.agentContact) : '';
  const uNamePhone = u.username ? normalizeSriLankaPhone(u.username) : '';
  const uNameLower = (u.username || '').trim().toLowerCase();
  const uNameCompact = uNameLower.replace(/[\s_]+/g, '');
  const uEmailLower = (u.email || '').trim().toLowerCase();
  const uIdLower = (u.id || '').trim().toLowerCase();
  const uRefLower = (u.referralCode || '').trim().toLowerCase();

  if (
    cleanPhone &&
    cleanPhone.length >= 9 &&
    (uPhone === cleanPhone || uContact === cleanPhone || uNamePhone === cleanPhone)
  ) {
    return true;
  }
  if (u.mobile && u.mobile.trim().toLowerCase() === cleanIdLower) return true;
  if (u.agentContact && u.agentContact.trim().toLowerCase() === cleanIdLower) return true;
  if (uEmailLower && uEmailLower === cleanIdLower) return true;
  if (uNameLower && (uNameLower === cleanIdLower || uNameCompact === cleanIdCompact)) return true;
  if (uIdLower === cleanIdLower) return true;
  if (uRefLower && uRefLower === cleanIdLower) return true;
  return false;
}

export async function authenticateUserAcrossAllSources(
  rawIdentifier: string,
  rawPassword: string
): Promise<{ user: User | null; error: string | null }> {
  const cleanId = rawIdentifier.trim();
  const cleanPhone = normalizeSriLankaPhone(cleanId);
  const cleanIdLower = cleanId.toLowerCase();

  if (!cleanId) {
    return { user: null, error: 'Please enter your Mobile Number, Email, or Login ID.' };
  }

  // 1. Force a fresh pull from Cloud Firestore, /api/users, /api/agents, and /api/auth/login in parallel
  const [, , serverLoginRes, cloudDirect] = await Promise.all([
    syncUsersWithServer(true).catch(() => getUsers()),
    fetchCashAgentsWithPresence().catch(() => []),
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanId, password: rawPassword }),
    })
      .then(async (r) => ({ status: r.status, ok: r.ok, data: await r.json().catch(() => null) }))
      .catch(() => null),
    fetchUsersFromCloudFirestore().catch(() => ({ users: [] as User[], deletedIds: [] as string[] })),
  ]);

  // Direct Admin Credentials Check: 0711452778 / 12345678
  if (
    cleanPhone === '0711452778' ||
    cleanIdLower === 'admin@balloon.lk' ||
    cleanIdLower === 'admin@lionbet.lk'
  ) {
    if (rawPassword !== '12345678' && rawPassword.trim() !== '12345678') {
      return { user: null, error: 'Invalid admin password.' };
    }
    const users = getUsers();
    let adminUser = users.find((u) => u.role === 'admin' || u.id === 'user_admin_1');
    if (!adminUser) {
      adminUser = {
        id: 'user_admin_1',
        username: 'BalloonAdminLK',
        mobile: '0711452778',
        email: 'admin@balloon.lk',
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
        createdAt: Date.now(),
      };
    }
    const savedAdmin = await saveUserAndSync(adminUser);
    clearReferralQueryFromUrl();
    return { user: savedAdmin, error: null };
  }

  // If server /api/auth/login succeeded directly, save & return
  if (serverLoginRes?.ok && serverLoginRes.data?.ok && serverLoginRes.data?.user) {
    const srvUser = serverLoginRes.data.user as User;
    const synced = await saveUserAndSync(srvUser);
    clearReferralQueryFromUrl();
    return { user: synced, error: null };
  }

  // Combine candidates from Cloud Firestore direct read + merged local storage
  const deletedIds = getDeletedUserIds();
  const candidateMap = new Map<string, User>();
  for (const u of getUsers()) {
    if (u && u.id && !deletedIds.has(u.id)) candidateMap.set(u.id, u);
  }
  for (const cu of cloudDirect.users) {
    if (cu && cu.id && !deletedIds.has(cu.id)) {
      const existing = candidateMap.get(cu.id);
      if (!existing) {
        candidateMap.set(cu.id, cu);
      } else {
        candidateMap.set(cu.id, mergeTwoUsersClient(existing, cu).merged);
      }
    }
  }

  const allCandidates = Array.from(candidateMap.values());
  const matchingAccounts = allCandidates.filter((u) => doesUserMatchIdentifier(u, cleanId));

  if (matchingAccounts.length === 0) {
    return {
      user: null,
      error:
        serverLoginRes?.data?.error ||
        'Account not found. Please check your Mobile Number, Username, Email, or Agent Login ID.',
    };
  }

  // Sort matching accounts so agents and most recently updated records are checked first
  matchingAccounts.sort((a, b) => {
    const aAgent = isAgentUserRole(a.role) ? 1 : 0;
    const bAgent = isAgentUserRole(b.role) ? 1 : 0;
    if (aAgent !== bAgent) return bAgent - aAgent;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  const passwordMatched = matchingAccounts.find((u) => {
    if (!u.password) return true;
    return (
      u.password === rawPassword ||
      u.password.trim() === rawPassword.trim()
    );
  });

  if (!passwordMatched) {
    return {
      user: null,
      error: 'Incorrect password. Please try again.',
    };
  }

  if (passwordMatched.isBanned) {
    return {
      user: null,
      error: 'This account has been suspended by the administrator.',
    };
  }

  const syncedUser = await saveUserAndSync(passwordMatched);
  clearReferralQueryFromUrl();
  return { user: syncedUser, error: null };
}

export function getReferredUsersList(referralCode: string): User[] {
  const clean = (referralCode || '').trim().toUpperCase();
  if (!clean) return [];
  const users = getUsers();
  return users
    .filter((u) => u.referredBy && u.referredBy.trim().toUpperCase() === clean)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function getUrlReferralCode(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery =
      params.get('ref') ||
      params.get('promo') ||
      params.get('referral') ||
      params.get('code') ||
      params.get('r') ||
      '';
    if (fromQuery.trim()) {
      return fromQuery.trim().toUpperCase();
    }
    if (window.location.hash) {
      const hashClean = window.location.hash.replace(/^#\/?/, '');
      const hashParams = new URLSearchParams(
        hashClean.includes('?') ? hashClean.split('?')[1] : hashClean
      );
      const fromHash =
        hashParams.get('ref') || hashParams.get('promo') || hashParams.get('referral') || '';
      if (fromHash.trim()) {
        return fromHash.trim().toUpperCase();
      }
    }
  } catch {}
  return '';
}

export function creditReferrerCommission(
  referredUser: User,
  amount: number,
  sourceType: 'deposit' | 'bet'
): { referrerUpdated: User | null; referredUpdated: User; commissionAmount: number } {
  if (!referredUser || amount <= 0) {
    return { referrerUpdated: null, referredUpdated: referredUser, commissionAmount: 0 };
  }

  const refCode = (referredUser.referredBy || '').trim().toUpperCase();
  // 10% commission on referred friend's deposits, 2% turnover commission on referred friend's bets
  const rate = sourceType === 'deposit' ? 0.1 : 0.02;
  const commissionAmount = refCode ? Number((amount * rate).toFixed(2)) : 0;

  const updatedReferred: User = {
    ...referredUser,
    totalDeposited:
      sourceType === 'deposit'
        ? Number(((referredUser.totalDeposited || 0) + amount).toFixed(2))
        : referredUser.totalDeposited || 0,
    commissionGeneratedForReferrer:
      commissionAmount > 0
        ? Number(((referredUser.commissionGeneratedForReferrer || 0) + commissionAmount).toFixed(2))
        : referredUser.commissionGeneratedForReferrer || 0,
  };
  saveUser(updatedReferred);

  if (!refCode || commissionAmount <= 0) {
    return { referrerUpdated: null, referredUpdated: updatedReferred, commissionAmount: 0 };
  }

  const users = getUsers();
  const referrer = users.find(
    (u) =>
      u.id !== referredUser.id &&
      (u.referralCode.trim().toUpperCase() === refCode ||
        u.username.trim().toUpperCase() === refCode)
  );

  if (!referrer) {
    return { referrerUpdated: null, referredUpdated: updatedReferred, commissionAmount: 0 };
  }

  const referredTeamCount = users.filter(
    (m) =>
      m.id !== referrer.id &&
      m.referredBy &&
      m.referredBy.trim().toUpperCase() === referrer.referralCode.trim().toUpperCase()
  ).length;

  const updatedReferrer: User = {
    ...referrer,
    referralCount: Math.max(referrer.referralCount || 0, referredTeamCount, 1),
    referralEarnings: Number(((referrer.referralEarnings || 0) + commissionAmount).toFixed(2)),
    unclaimedReferralRewards: Number(
      ((referrer.unclaimedReferralRewards || 0) + commissionAmount).toFixed(2)
    ),
  };

  saveUser(updatedReferrer);
  return { referrerUpdated: updatedReferrer, referredUpdated: updatedReferred, commissionAmount };
}

export function deleteUser(userId: string) {
  if (!userId) return;
  const deletedIds = getDeletedUserIds();
  deletedIds.add(userId);
  saveDeletedUserIdsLocal(deletedIds);

  const users = getUsers().filter((u) => u.id !== userId);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  try {
    window.dispatchEvent(new Event('storage'));
  } catch {}

  deleteUserFromCloudFirestore(userId, deletedIds).catch(() => {});

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

export function recordUserPresenceHeartbeat(user: User, manualOffline?: boolean) {
  if (!user || !user.id || isRemovedFakeAgent(user)) return;
  const map = getLocalPresenceMap();
  const effectiveManualOffline =
    typeof manualOffline === 'boolean'
      ? manualOffline
      : Boolean(map[user.id]?.manualOffline);
  try {
    map[user.id] = {
      lastSeen: Date.now(),
      manualOffline: effectiveManualOffline,
    };
    localStorage.setItem(LOCAL_PRESENCE_KEY, JSON.stringify(map));
  } catch {}

  fetch('/api/presence/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, manualOffline: effectiveManualOffline }),
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

    // Also persist adminOnlineStatus on the user record so Cloud Firestore & other devices see it immediately
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === agentId);
    if (idx >= 0) {
      const updatedAgent = {
        ...users[idx],
        adminOnlineStatus: isOnline,
        updatedAt: Date.now(),
      } as User;
      users[idx] = updatedAgent;
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      pushUserToCloudFirestore(updatedAgent).catch(() => {});
    }
    window.dispatchEvent(new Event('storage'));
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
    const users = getUsers();
    const target = users.find((u) => u.id === userId);
    const isAgent = target && isAgentUserRole(target.role);
    if (!isAgent) {
      const map = getLocalPresenceMap();
      map[userId] = {
        lastSeen: Date.now(),
        manualOffline: true,
      };
      localStorage.setItem(LOCAL_PRESENCE_KEY, JSON.stringify(map));
    }
  } catch {}

  fetch('/api/presence/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  }).catch(() => {});
}

export function isAgentOnlineLocally(agentId: string): boolean {
  const users = getUsers();
  const agentUser = users.find((u) => u.id === agentId) as CashAgentWithPresence | undefined;
  if (agentUser && typeof agentUser.adminOnlineStatus === 'boolean') {
    return agentUser.adminOnlineStatus;
  }
  const map = getLocalPresenceMap();
  const entry = map[agentId];
  if (entry && typeof entry.manualOffline === 'boolean') {
    return !entry.manualOffline;
  }
  const current = getCurrentUser();
  if (current && current.id === agentId) return true;
  // Admin-created agents default to online unless marked offline
  return true;
}

export function getCashAgentsSync(): CashAgentWithPresence[] {
  const users = getUsers();
  const agents = users.filter(
    (u) => !isRemovedFakeAgent(u) && !u.isBanned && isAgentUserRole(u.role)
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
  const [, serverAgents] = await Promise.all([
    syncUsersWithServer().catch(() => getUsers()),
    fetch('/api/agents')
      .then(async (res) => {
        if (!res.ok) return [] as CashAgentWithPresence[];
        const data = await res.json();
        return Array.isArray(data.agents)
          ? (data.agents.filter((a: any) => !isRemovedFakeAgent(a)) as CashAgentWithPresence[])
          : [];
      })
      .catch(() => [] as CashAgentWithPresence[]),
  ]);

  const deletedIds = getDeletedUserIds();
  const localUsers = getUsers().filter((u) => !deletedIds.has(u.id));
  let localChanged = false;

  for (const sa of serverAgents) {
    if (deletedIds.has(sa.id)) continue;
    const idx = localUsers.findIndex((u) => u.id === sa.id);
    const { isOnline, lastSeen, ...cleanUser } = sa;
    if (idx === -1) {
      localUsers.push(cleanUser as User);
      localChanged = true;
    } else {
      const { merged, didChange } = mergeTwoUsersClient(localUsers[idx], cleanUser as User);
      if (didChange) {
        localUsers[idx] = merged;
        localChanged = true;
      }
    }
  }
  if (localChanged) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(localUsers));
  }

  const localAgents = localUsers.filter(
    (u) => !isRemovedFakeAgent(u) && !deletedIds.has(u.id) && isAgentUserRole(u.role)
  );

  for (const la of localAgents) {
    const srvMatch = serverAgents.find((sa) => sa.id === la.id);
    if (!srvMatch || srvMatch.password !== la.password || srvMatch.mobile !== la.mobile) {
      pushUserToCloudFirestore(la).catch(() => {});
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
      const agWithStatus = ag as CashAgentWithPresence;
      const entry = localPresence[ag.id];
      const srv = serverOnlineMap.get(ag.id);
      let isOnline = true;
      if (typeof agWithStatus.adminOnlineStatus === 'boolean') {
        isOnline = agWithStatus.adminOnlineStatus;
      } else if (entry?.manualOffline === true) {
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

export const DEFAULT_MINES_CONFIG: MinesGameEngineConfig = {
  riskLevel: 'medium',
  loseRatePercent: 25,
  houseEdgePercent: 4,
  minBet: 10, // Min bet 10 LKR
  maxBet: 50000,
  defaultMinesCount: 3,
  maxMultiplierCap: 500,
  firstClickSafe: false,
  forceNextClickMine: false,
  isGamePaused: false,
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
      if (!parsed.minesConfig) {
        parsed.minesConfig = { ...DEFAULT_MINES_CONFIG };
        updated = true;
      } else {
        parsed.minesConfig = {
          ...DEFAULT_MINES_CONFIG,
          ...parsed.minesConfig,
          minBet: parsed.minesConfig.minBet ?? 10,
        };
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
    minesConfig: { ...DEFAULT_MINES_CONFIG },
  };
  localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(defaults));
  return defaults;
}

export function saveAdminSettings(settings: AdminSettings) {
  const now = Date.now();
  const stamped: AdminSettings = {
    ...settings,
    updatedAt: now,
  };
  localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(stamped));
  setDoc(doc(db, 'lionbet_cloud', 'settings_v1'), {
    json: JSON.stringify(stamped),
    updatedAt: now,
  }).catch(() => {});
  fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: stamped }),
  }).catch(() => {});
  if (FIRESTORE_BASE_URL && FIRESTORE_API_KEY) {
    fetch(`${FIRESTORE_BASE_URL}/lionbet_cloud/settings_v1?key=${FIRESTORE_API_KEY}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          json: { stringValue: JSON.stringify(stamped) },
          updatedAt: { integerValue: String(now) },
        },
      }),
    }).catch(() => {});
  }
}

export async function syncAdminSettingsWithServer(): Promise<AdminSettings> {
  try {
    const [apiRes, sdkSnap, cloudRes] = await Promise.all([
      fetch('/api/settings')
        .then(async (r) => (r.ok ? r.json() : null))
        .catch(() => null),
      getDoc(doc(db, 'lionbet_cloud', 'settings_v1')).catch(() => null),
      FIRESTORE_BASE_URL && FIRESTORE_API_KEY
        ? fetch(`${FIRESTORE_BASE_URL}/lionbet_cloud/settings_v1?key=${FIRESTORE_API_KEY}`)
            .then(async (r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    let cloudSettings: any = null;
    const rawSdkJson = sdkSnap && sdkSnap.exists() ? sdkSnap.data()?.json : null;
    const rawCloudJson = rawSdkJson || cloudRes?.fields?.json?.stringValue;
    if (rawCloudJson) {
      try {
        cloudSettings = JSON.parse(String(rawCloudJson));
      } catch {}
    }

    const srvSettings = apiRes?.settings;
    let remoteSettings: any = null;
    if (cloudSettings && srvSettings) {
      remoteSettings =
        (cloudSettings.updatedAt || 0) >= (srvSettings.updatedAt || 0)
          ? cloudSettings
          : srvSettings;
    } else {
      remoteSettings = cloudSettings || srvSettings;
    }

    if (remoteSettings && typeof remoteSettings === 'object') {
      const current = getAdminSettings();
      const localTs = current.updatedAt || 0;
      const remoteTs = remoteSettings.updatedAt || 0;
      // Never overwrite newer local Admin signal changes with an older remote snapshot!
      if (localTs > remoteTs) {
        return current;
      }
      const merged: AdminSettings = {
        ...current,
        ...remoteSettings,
        minesConfig: {
          ...DEFAULT_MINES_CONFIG,
          ...(current.minesConfig || {}),
          ...(remoteSettings.minesConfig || {}),
        },
      };
      localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch {}
  return getAdminSettings();
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

function pushTransactionsToCloud(list: Transaction[]) {
  try {
    const compact = list.slice(0, 80).map((t) => ({
      ...t,
      receiptImage:
        t.receiptImage && t.receiptImage.length > 60000 ? undefined : t.receiptImage,
    }));
    const now = Date.now();
    setDoc(doc(db, 'lionbet_cloud', 'transactions_v1'), {
      json: JSON.stringify(compact),
      updatedAt: now,
    }).catch(() => {});
    if (FIRESTORE_BASE_URL && FIRESTORE_API_KEY) {
      fetch(`${FIRESTORE_BASE_URL}/lionbet_cloud/transactions_v1?key=${FIRESTORE_API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            json: { stringValue: JSON.stringify(compact) },
            updatedAt: { integerValue: String(now) },
          },
        }),
      }).catch(() => {});
    }
  } catch {}
}

export function addTransaction(tx: Transaction) {
  const list = getTransactions().filter((t) => t.id !== tx.id);
  list.unshift(tx);
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(list));
  fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: tx }),
  }).catch(() => {});
  pushTransactionsToCloud(list);
}

export function saveTransactions(list: Transaction[]) {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(list));
  fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions: list }),
  }).catch(() => {});
  pushTransactionsToCloud(list);
}

export async function syncTransactionsWithServer(): Promise<Transaction[]> {
  try {
    const [apiRes, sdkSnap, cloudRes] = await Promise.all([
      fetch('/api/transactions')
        .then(async (r) => (r.ok ? r.json() : null))
        .catch(() => null),
      getDoc(doc(db, 'lionbet_cloud', 'transactions_v1')).catch(() => null),
      FIRESTORE_BASE_URL && FIRESTORE_API_KEY
        ? fetch(`${FIRESTORE_BASE_URL}/lionbet_cloud/transactions_v1?key=${FIRESTORE_API_KEY}`)
            .then(async (r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    let cloudTx: Transaction[] = [];
    const rawSdkJson = sdkSnap && sdkSnap.exists() ? sdkSnap.data()?.json : null;
    const rawCloudJson = rawSdkJson || cloudRes?.fields?.json?.stringValue;
    if (rawCloudJson) {
      try {
        const parsed = JSON.parse(String(rawCloudJson));
        if (Array.isArray(parsed)) cloudTx = parsed;
      } catch {}
    }

    const serverTx: Transaction[] = Array.isArray(apiRes?.transactions) ? apiRes.transactions : [];
    const localTx = getTransactions();
    const map = new Map<string, Transaction>();

    for (const t of localTx) {
      if (t && t.id) map.set(t.id, t);
    }
    for (const t of [...serverTx, ...cloudTx]) {
      if (!t || !t.id) continue;
      const existing = map.get(t.id);
      if (!existing) {
        map.set(t.id, t);
      } else if (existing.status === 'pending' && t.status !== 'pending') {
        map.set(t.id, { ...existing, ...t, receiptImage: existing.receiptImage || t.receiptImage });
      }
    }

    const merged = Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(merged));
    return merged;
  } catch {}
  return getTransactions();
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

function isCustomUploadedImage(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  // Built-in default covers use `data:image/svg+xml;utf8,` — ignore those so they never overwrite user-uploaded photos
  if (trimmed.startsWith('data:image/svg+xml;utf8,')) return false;
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/assets/')
  );
}

/**
 * Compresses & resizes ANY uploaded image file (JPG, PNG, WEBP, GIF, or mobile gallery file)
 * to a crisp JPEG Data URL (< 140KB) so it saves reliably in localStorage, Server, and Firebase Cloud Firestore.
 */
export function compressImageFileToDataUrl(
  file: File,
  maxWidth = 600,
  maxHeight = 800,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const drawToCanvas = (img: HTMLImageElement, fallbackUrl?: string) => {
      try {
        let w = img.naturalWidth || img.width || maxWidth;
        let h = img.naturalHeight || img.height || maxHeight;
        const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
        w = Math.max(1, Math.round(w * ratio));
        h = Math.max(1, Math.round(h * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (fallbackUrl) resolve(fallbackUrl);
          else reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.fillStyle = '#040814';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        let compressed = canvas.toDataURL('image/jpeg', quality);
        // Ensure it stays well below Firestore's 1MB limit
        if (compressed.length > 750000) {
          compressed = canvas.toDataURL('image/jpeg', 0.65);
        }
        resolve(compressed);
      } catch (err) {
        if (fallbackUrl) resolve(fallbackUrl);
        else reject(err);
      }
    };

    // Primary path: load via Object URL (works even if mobile browser omits MIME type)
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {}

    if (objectUrl) {
      const img = new Image();
      img.onload = () => {
        drawToCanvas(img);
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      };
      img.onerror = () => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
        // Fallback to FileReader
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.onload = () => {
          const raw = String(reader.result || '');
          if (raw) resolve(raw);
          else reject(new Error('Empty image file'));
        };
        reader.readAsDataURL(file);
      };
      img.src = objectUrl;
      return;
    }

    // Fallback path: FileReader
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const rawDataUrl = String(reader.result || '');
      if (!rawDataUrl) {
        reject(new Error('Empty file'));
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(rawDataUrl);
      img.onload = () => drawToCanvas(img, rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Saves a custom lobby image ('balloon_crash' or 'mines') to localStorage, Express API,
 * AND Firebase Cloud Firestore (`lionbet_cloud/lobby_image_balloon_crash` or `lobby_image_mines`)
 * so that Vercel deployments and all mobile/desktop devices receive it immediately.
 */
export async function saveLobbyImageToCloud(
  gameKey: 'balloon_crash' | 'mines',
  dataUrl: string
): Promise<void> {
  const cleanUrl = String(dataUrl || '').trim();
  if (!isCustomUploadedImage(cleanUrl)) return;
  const localKey =
    gameKey === 'balloon_crash'
      ? 'balloon_crash_custom_lobby_image'
      : 'mines_custom_lobby_image';
  const docId =
    gameKey === 'balloon_crash'
      ? 'lobby_image_balloon_crash'
      : 'lobby_image_mines';
  const apiPath =
    gameKey === 'balloon_crash'
      ? '/api/lobby-image/balloon-crash'
      : '/api/lobby-image/mines';
  const now = Date.now();

  try {
    localStorage.setItem(localKey, cleanUrl);
  } catch {}

  try {
    window.dispatchEvent(
      new CustomEvent('lionbet-lobby-image-updated', {
        detail: { gameKey, imageUrl: cleanUrl },
      })
    );
  } catch {}

  await Promise.all([
    setDoc(doc(db, 'lionbet_cloud', docId), {
      imageUrl: cleanUrl,
      updatedAt: now,
    }).catch(() => {}),
    FIRESTORE_BASE_URL && FIRESTORE_API_KEY
      ? fetch(`${FIRESTORE_BASE_URL}/lionbet_cloud/${docId}?key=${FIRESTORE_API_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              imageUrl: { stringValue: cleanUrl },
              updatedAt: { integerValue: String(now) },
            },
          }),
        }).catch(() => {})
      : Promise.resolve(),
    fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl: cleanUrl }),
    }).catch(() => {}),
  ]);
}

/**
 * Fetches custom lobby images from Firebase Cloud Firestore (works on Vercel static sites!)
 * as well as local API fallback.
 */
export async function fetchLobbyImagesFromCloud(): Promise<{
  balloonCrashImage: string | null;
  minesImage: string | null;
}> {
  let balloonCrashImage: string | null = null;
  let minesImage: string | null = null;

  try {
    const [bcSdk, mSdk, bcRest, mRest, bcApi, mApi] = await Promise.all([
      getDoc(doc(db, 'lionbet_cloud', 'lobby_image_balloon_crash')).catch(() => null),
      getDoc(doc(db, 'lionbet_cloud', 'lobby_image_mines')).catch(() => null),
      FIRESTORE_BASE_URL && FIRESTORE_API_KEY
        ? fetch(
            `${FIRESTORE_BASE_URL}/lionbet_cloud/lobby_image_balloon_crash?key=${FIRESTORE_API_KEY}`
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : Promise.resolve(null),
      FIRESTORE_BASE_URL && FIRESTORE_API_KEY
        ? fetch(
            `${FIRESTORE_BASE_URL}/lionbet_cloud/lobby_image_mines?key=${FIRESTORE_API_KEY}`
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : Promise.resolve(null),
      fetch('/api/lobby-image/balloon-crash')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/lobby-image/mines')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    const bcCandidates = [
      bcSdk && bcSdk.exists() ? bcSdk.data()?.imageUrl : null,
      bcRest?.fields?.imageUrl?.stringValue,
      bcApi?.imageUrl,
    ];
    const validBc = bcCandidates.find((c) => isCustomUploadedImage(c));
    if (validBc) {
      balloonCrashImage = validBc;
      try {
        localStorage.setItem('balloon_crash_custom_lobby_image', balloonCrashImage);
      } catch {}
    }

    const mCandidates = [
      mSdk && mSdk.exists() ? mSdk.data()?.imageUrl : null,
      mRest?.fields?.imageUrl?.stringValue,
      mApi?.imageUrl,
    ];
    const validMines = mCandidates.find((c) => isCustomUploadedImage(c));
    if (validMines) {
      minesImage = validMines;
      try {
        localStorage.setItem('mines_custom_lobby_image', minesImage);
      } catch {}
    }
  } catch {}

  return { balloonCrashImage, minesImage };
}

/**
 * Real-time Cloud Firestore listener for custom lobby images across Vercel and AI Studio.
 */
export function subscribeLobbyImagesFromCloud(
  onUpdate: (data: { balloonCrashImage?: string | null; minesImage?: string | null }) => void
): () => void {
  let unsubBalloon: (() => void) | null = null;
  let unsubMines: (() => void) | null = null;

  const handleLocalEvent = (e: Event) => {
    const customEvent = e as CustomEvent<{ gameKey: 'balloon_crash' | 'mines'; imageUrl: string }>;
    const detail = customEvent?.detail;
    if (!detail || !isCustomUploadedImage(detail.imageUrl)) return;
    if (detail.gameKey === 'balloon_crash') {
      onUpdate({ balloonCrashImage: detail.imageUrl });
    } else if (detail.gameKey === 'mines') {
      onUpdate({ minesImage: detail.imageUrl });
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('lionbet-lobby-image-updated', handleLocalEvent);
  }

  try {
    unsubBalloon = onSnapshot(
      doc(db, 'lionbet_cloud', 'lobby_image_balloon_crash'),
      (snap) => {
        if (snap.exists()) {
          const url = snap.data()?.imageUrl;
          if (isCustomUploadedImage(url)) {
            try {
              localStorage.setItem('balloon_crash_custom_lobby_image', url);
            } catch {}
            onUpdate({ balloonCrashImage: url });
          }
        }
      },
      () => {}
    );
  } catch {}

  try {
    unsubMines = onSnapshot(
      doc(db, 'lionbet_cloud', 'lobby_image_mines'),
      (snap) => {
        if (snap.exists()) {
          const url = snap.data()?.imageUrl;
          if (isCustomUploadedImage(url)) {
            try {
              localStorage.setItem('mines_custom_lobby_image', url);
            } catch {}
            onUpdate({ minesImage: url });
          }
        }
      },
      () => {}
    );
  } catch {}

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('lionbet-lobby-image-updated', handleLocalEvent);
    }
    try {
      unsubBalloon?.();
      unsubMines?.();
    } catch {}
  };
}


