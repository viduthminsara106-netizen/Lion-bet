import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHAT_HISTORY_FILE = path.join(__dirname, '.chat_history.json');
const CASH_AGENTS_FILE = path.join(__dirname, '.cash_agents.json');
const USERS_DB_FILE = path.join(__dirname, '.users_db.json');
const ADMIN_SETTINGS_FILE = path.join(__dirname, '.admin_settings.json');
const TRANSACTIONS_FILE = path.join(__dirname, '.transactions_db.json');
const DELETED_USERS_FILE = path.join(__dirname, '.deleted_users.json');
const FIREBASE_CONFIG_FILE = path.join(__dirname, 'firebase-applet-config.json');

const FAKE_AGENT_IDS = new Set(['user_dep_agent_1', 'user_wd_agent_1']);
const FAKE_AGENT_NAMES = new Set(['depositagent_01', 'withdrawagent_01']);

function loadFirebaseRestConfig(): { projectId: string; apiKey: string; baseUrl: string } | null {
  try {
    if (fs.existsSync(FIREBASE_CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_FILE, 'utf-8'));
      if (cfg?.projectId && cfg?.apiKey) {
        return {
          projectId: cfg.projectId,
          apiKey: cfg.apiKey,
          baseUrl: `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents`,
        };
      }
    }
  } catch {}
  return null;
}

const fbConfig = loadFirebaseRestConfig();

function isFakeAgent(agent: any): boolean {
  if (!agent) return true;
  if (agent.id && (FAKE_AGENT_IDS.has(agent.id) || String(agent.id).startsWith('guest_'))) {
    return true;
  }
  if (agent.username && FAKE_AGENT_NAMES.has(String(agent.username).toLowerCase())) return true;
  return false;
}

function isAgentRole(role?: string): boolean {
  return role === 'deposit_agent' || role === 'withdraw_agent' || role === 'cash_agent';
}

function normalizeSriLankaPhone(raw?: string): string {
  if (!raw) return '';
  const digits = String(raw).replace(/[\s\-()]/g, '');
  if (digits.startsWith('+940') && digits.length >= 12) {
    return '0' + digits.slice(4);
  }
  if (digits.startsWith('+94') && digits.length >= 11) {
    return '0' + digits.slice(3);
  }
  if (digits.startsWith('00940') && digits.length >= 13) {
    return '0' + digits.slice(5);
  }
  if (digits.startsWith('0094') && digits.length >= 12) {
    return '0' + digits.slice(4);
  }
  if (digits.startsWith('940') && digits.length === 12) {
    return '0' + digits.slice(3);
  }
  if (digits.startsWith('94') && digits.length === 11) {
    return '0' + digits.slice(2);
  }
  if (/^7\d{8}$/.test(digits)) {
    return '0' + digits;
  }
  return digits;
}

function loadDeletedUserIds(): Set<string> {
  try {
    if (fs.existsSync(DELETED_USERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DELETED_USERS_FILE, 'utf-8'));
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
}

function saveDeletedUserIds(ids: Set<string>) {
  try {
    fs.writeFileSync(DELETED_USERS_FILE, JSON.stringify(Array.from(ids), null, 2), 'utf-8');
  } catch {}
}

function loadCashAgents(): any[] {
  try {
    if (fs.existsSync(CASH_AGENTS_FILE)) {
      const raw = fs.readFileSync(CASH_AGENTS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((a) => !isFakeAgent(a));
      }
    }
  } catch {}
  return [];
}

function saveCashAgents(agents: any[]) {
  try {
    const clean = agents.filter((a) => !isFakeAgent(a));
    fs.writeFileSync(CASH_AGENTS_FILE, JSON.stringify(clean, null, 2), 'utf-8');
  } catch {}
}

function loadServerUsers(): any[] {
  try {
    if (fs.existsSync(USERS_DB_FILE)) {
      const raw = fs.readFileSync(USERS_DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((u) => !isFakeAgent(u));
      }
    }
  } catch {}
  return [];
}

function saveServerUsers(users: any[]) {
  try {
    const clean = users.filter((u) => u && u.id && !isFakeAgent(u));
    fs.writeFileSync(USERS_DB_FILE, JSON.stringify(clean, null, 2), 'utf-8');
  } catch {}
}

function loadServerTransactions(): any[] {
  try {
    if (fs.existsSync(TRANSACTIONS_FILE)) {
      const raw = fs.readFileSync(TRANSACTIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveServerTransactions(txList: any[]) {
  try {
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(txList.slice(0, 250), null, 2), 'utf-8');
  } catch {}
}

function loadServerAdminSettings(): any | null {
  try {
    if (fs.existsSync(ADMIN_SETTINGS_FILE)) {
      const raw = fs.readFileSync(ADMIN_SETTINGS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

function saveServerAdminSettings(settings: any) {
  try {
    fs.writeFileSync(ADMIN_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch {}
}

// Cloud Firestore Helpers (Shared across dev & preview containers and all devices)
async function pushUserToFirestore(user: any): Promise<void> {
  if (!fbConfig || !user || !user.id || isFakeAgent(user)) return;
  try {
    const docId = encodeURIComponent(String(user.id));
    await fetch(`${fbConfig.baseUrl}/lionbet_users/${docId}?key=${fbConfig.apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          id: { stringValue: String(user.id) },
          json: { stringValue: JSON.stringify(user) },
          updatedAt: { integerValue: String(user.updatedAt || 0) },
        },
      }),
    });
  } catch {}
}

async function deleteUserFromFirestore(userId: string, deletedSet: Set<string>): Promise<void> {
  if (!fbConfig || !userId) return;
  try {
    const docId = encodeURIComponent(String(userId));
    await fetch(`${fbConfig.baseUrl}/lionbet_users/${docId}?key=${fbConfig.apiKey}`, {
      method: 'DELETE',
    });
    await fetch(`${fbConfig.baseUrl}/lionbet_cloud/deleted_users?key=${fbConfig.apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          ids: { stringValue: JSON.stringify(Array.from(deletedSet)) },
          updatedAt: { integerValue: String(Date.now()) },
        },
      }),
    });
  } catch {}
}

async function fetchCloudUsersAndDeleted(): Promise<{ users: any[]; deletedIds: string[] }> {
  if (!fbConfig) return { users: [], deletedIds: [] };
  const users: any[] = [];
  let deletedIds: string[] = [];
  try {
    const [usersRes, delRes] = await Promise.all([
      fetch(`${fbConfig.baseUrl}/lionbet_users?pageSize=300&key=${fbConfig.apiKey}`),
      fetch(`${fbConfig.baseUrl}/lionbet_cloud/deleted_users?key=${fbConfig.apiKey}`),
    ]);
    if (delRes.ok) {
      const delData = await delRes.json();
      const rawIds = delData?.fields?.ids?.stringValue;
      if (rawIds) {
        const parsed = JSON.parse(rawIds);
        if (Array.isArray(parsed)) deletedIds = parsed;
      }
    }
    if (usersRes.ok) {
      const data = await usersRes.json();
      const docs = Array.isArray(data?.documents) ? data.documents : [];
      for (const d of docs) {
        const rawJson = d?.fields?.json?.stringValue;
        if (rawJson) {
          try {
            const u = JSON.parse(rawJson);
            if (u && u.id && !isFakeAgent(u)) {
              users.push(u);
            }
          } catch {}
        }
      }
    }
  } catch {}
  return { users, deletedIds };
}

const DEFAULT_INITIAL_MESSAGES = [
  {
    id: 'c1',
    userId: 'bot_01',
    username: 'Nisal_SL',
    avatar: '🦁',
    text: 'Targeting 10x multiplier on WinxCash today guys! 🚀',
    timestamp: Date.now() - 180000,
  },
  {
    id: 'c2',
    userId: 'bot_05',
    username: 'SkyHigh_Dan',
    avatar: '🪂',
    text: 'Jumped out at 3.45x just in time! Parachute saved me 💸',
    timestamp: Date.now() - 120000,
  },
  {
    id: 'c3',
    userId: 'bot_02',
    username: 'Thilini_99',
    avatar: '💎',
    text: 'Cash Agent withdrawal received in 2 mins, super smooth.',
    timestamp: Date.now() - 60000,
  },
];

function loadChatHistory(): any[] {
  try {
    if (fs.existsSync(CHAT_HISTORY_FILE)) {
      const raw = fs.readFileSync(CHAT_HISTORY_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(-120);
      }
    }
  } catch {}
  return [...DEFAULT_INITIAL_MESSAGES];
}

function saveChatHistory(messages: any[]) {
  try {
    fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(messages.slice(-120), null, 2), 'utf-8');
  } catch {}
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '5mb' }));

  let sharedChatMessages = loadChatHistory();
  let deletedUserIds = loadDeletedUserIds();
  let cashAgents = loadCashAgents().filter((a) => !deletedUserIds.has(a.id));
  let serverUsers = loadServerUsers().filter((u) => !deletedUserIds.has(u.id));
  let serverTransactions = loadServerTransactions();
  let serverAdminSettings = loadServerAdminSettings();

  const activePresence = new Map<string, { lastSeen: number; manualOffline?: boolean }>();
  const PRESENCE_TIMEOUT_MS = 45000;
  const sseClients = new Set<any>();

  const mergeTwoUserRecords = (prev: any, u: any, isExplicitSingleSave: boolean) => {
    const prevUpdatedAt = Number(prev.updatedAt || 0);
    const incUpdatedAt = Number(u.updatedAt || 0);
    const incomingWins = isExplicitSingleSave || incUpdatedAt >= prevUpdatedAt;

    const resolvedRole = isExplicitSingleSave
      ? u.role || prev.role
      : isAgentRole(prev.role) && !isAgentRole(u.role) && incUpdatedAt <= prevUpdatedAt
      ? prev.role
      : isAgentRole(u.role) && !isAgentRole(prev.role) && incUpdatedAt >= prevUpdatedAt
      ? u.role
      : incomingWins
      ? u.role || prev.role
      : prev.role || u.role;

    const resolvedPassword = incomingWins
      ? u.password || prev.password || '12345678'
      : prev.password || u.password || '12345678';

    const resolvedMobile = incomingWins
      ? u.mobile || prev.mobile || u.agentContact || prev.agentContact
      : prev.mobile || u.mobile || prev.agentContact || u.agentContact;

    const resolvedBalance = incomingWins
      ? typeof u.balance === 'number'
        ? u.balance
        : prev.balance
      : typeof prev.balance === 'number'
      ? prev.balance
      : u.balance;

    const resolvedBonusBalance = incomingWins
      ? typeof u.bonusBalance === 'number'
        ? u.bonusBalance
        : prev.bonusBalance || 0
      : typeof prev.bonusBalance === 'number'
      ? prev.bonusBalance
      : u.bonusBalance || 0;

    return {
      ...prev,
      ...(incomingWins ? u : {}),
      username: incomingWins ? u.username || prev.username : prev.username || u.username,
      email: incomingWins ? u.email || prev.email : prev.email || u.email,
      role: resolvedRole,
      password: resolvedPassword,
      mobile: resolvedMobile,
      agentContact: incomingWins
        ? u.agentContact || prev.agentContact || resolvedMobile
        : prev.agentContact || u.agentContact || resolvedMobile,
      balance: Number((resolvedBalance ?? 0).toFixed(2)),
      bonusBalance: Number((resolvedBonusBalance ?? 0).toFixed(2)),
      hasReceivedFirstDepositBonus: Boolean(
        prev.hasReceivedFirstDepositBonus || u.hasReceivedFirstDepositBonus
      ),
      referredBy: prev.referredBy || u.referredBy,
      referralCode: prev.referralCode || u.referralCode,
      referralCount: Math.max(prev.referralCount || 0, u.referralCount || 0),
      referralEarnings: Math.max(prev.referralEarnings || 0, u.referralEarnings || 0),
      unclaimedReferralRewards: incomingWins
        ? u.unclaimedReferralRewards ?? prev.unclaimedReferralRewards ?? 0
        : prev.unclaimedReferralRewards ?? u.unclaimedReferralRewards ?? 0,
      totalWagered: Math.max(prev.totalWagered || 0, u.totalWagered || 0),
      totalWon: Math.max(prev.totalWon || 0, u.totalWon || 0),
      totalDeposited: Math.max(prev.totalDeposited || 0, u.totalDeposited || 0),
      commissionGeneratedForReferrer: Math.max(
        prev.commissionGeneratedForReferrer || 0,
        u.commissionGeneratedForReferrer || 0
      ),
      isBanned: incomingWins ? Boolean(u.isBanned) : Boolean(prev.isBanned),
      updatedAt: isExplicitSingleSave ? Date.now() : Math.max(prevUpdatedAt, incUpdatedAt),
    };
  };

  // Cross-sync cashAgents and serverUsers so every Agent is always in serverUsers and vice versa
  const syncAgentsAndUsersLists = () => {
    let usersModified = false;
    let agentsModified = false;

    serverUsers = serverUsers.filter((u) => u && u.id && !isFakeAgent(u) && !deletedUserIds.has(u.id));
    cashAgents = cashAgents.filter((a) => a && a.id && !isFakeAgent(a) && !deletedUserIds.has(a.id));

    for (const ag of cashAgents) {
      const uIdx = serverUsers.findIndex((u) => u.id === ag.id);
      const { isOnline, lastSeen, ...cleanAg } = ag;
      if (uIdx === -1) {
        serverUsers.push(cleanAg);
        usersModified = true;
      } else {
        const merged = mergeTwoUserRecords(serverUsers[uIdx], cleanAg, false);
        if (JSON.stringify(merged) !== JSON.stringify(serverUsers[uIdx])) {
          serverUsers[uIdx] = merged;
          usersModified = true;
        }
      }
    }

    for (const u of serverUsers) {
      if (isAgentRole(u.role)) {
        const aIdx = cashAgents.findIndex((a) => a.id === u.id);
        if (aIdx === -1) {
          cashAgents.push({ adminOnlineStatus: true, ...u });
          agentsModified = true;
        } else {
          cashAgents[aIdx] = {
            ...cashAgents[aIdx],
            ...u,
            password: u.password || cashAgents[aIdx].password || '12345678',
            mobile: u.mobile || cashAgents[aIdx].mobile || u.agentContact,
          };
          agentsModified = true;
        }
      } else {
        const aIdx = cashAgents.findIndex((a) => a.id === u.id);
        if (aIdx !== -1 && (u.updatedAt || 0) > (cashAgents[aIdx].updatedAt || 0)) {
          cashAgents.splice(aIdx, 1);
          agentsModified = true;
        }
      }
    }

    if (usersModified) saveServerUsers(serverUsers);
    if (agentsModified) saveCashAgents(cashAgents);
  };

  let lastFirestoreSyncMs = 0;
  const syncWithCloudFirestore = async (force = false) => {
    if (!fbConfig) return;
    if (!force && Date.now() - lastFirestoreSyncMs < 2500) return;
    lastFirestoreSyncMs = Date.now();
    try {
      const { users: cloudUsers, deletedIds: cloudDeleted } = await fetchCloudUsersAndDeleted();
      let delChanged = false;
      for (const did of cloudDeleted) {
        if (!deletedUserIds.has(did)) {
          deletedUserIds.add(did);
          delChanged = true;
        }
      }
      if (delChanged) saveDeletedUserIds(deletedUserIds);

      let localChanged = false;
      const cloudMap = new Map<string, any>();
      for (const cu of cloudUsers) {
        if (deletedUserIds.has(cu.id)) continue;
        cloudMap.set(cu.id, cu);
        const idx = serverUsers.findIndex((u) => u.id === cu.id);
        if (idx === -1) {
          serverUsers.push(cu);
          localChanged = true;
        } else {
          const merged = mergeTwoUserRecords(serverUsers[idx], cu, false);
          if (JSON.stringify(merged) !== JSON.stringify(serverUsers[idx])) {
            serverUsers[idx] = merged;
            localChanged = true;
          }
        }
      }

      if (localChanged || delChanged) {
        syncAgentsAndUsersLists();
        saveServerUsers(serverUsers);
      }

      // Push any serverUsers that are missing or newer than Cloud Firestore
      for (const su of serverUsers) {
        if (deletedUserIds.has(su.id)) continue;
        const cu = cloudMap.get(su.id);
        if (!cu || (su.updatedAt || 0) > (cu.updatedAt || 0)) {
          pushUserToFirestore(su).catch(() => {});
        }
      }
    } catch {}
  };

  syncAgentsAndUsersLists();
  syncWithCloudFirestore(true).catch(() => {});

  const recomputeServerReferralCounts = () => {
    let changed = false;
    for (const u of serverUsers) {
      if (!u.referralCode) continue;
      const codeUpper = String(u.referralCode).trim().toUpperCase();
      const referredMembers = serverUsers.filter(
        (m) => m.id !== u.id && String(m.referredBy || '').trim().toUpperCase() === codeUpper
      );
      if (referredMembers.length > (u.referralCount || 0)) {
        u.referralCount = referredMembers.length;
        changed = true;
      }
    }
    if (changed) {
      saveServerUsers(serverUsers);
    }
  };

  app.get('/api/users', async (_req, res) => {
    await syncWithCloudFirestore();
    syncAgentsAndUsersLists();
    recomputeServerReferralCounts();
    res.json({
      ok: true,
      users: serverUsers,
      deletedUserIds: Array.from(deletedUserIds),
    });
  });

  app.post('/api/users', async (req, res) => {
    await syncWithCloudFirestore();
    const incomingUser = req.body?.user;
    const incomingUsers = req.body?.users;

    const upsertOne = async (u: any, isExplicitSingleSave: boolean) => {
      if (!u || !u.id || isFakeAgent(u) || deletedUserIds.has(u.id)) return;
      if (u.mobile) {
        u.mobile = normalizeSriLankaPhone(u.mobile) || u.mobile;
      }
      const idx = serverUsers.findIndex((existing) => existing.id === u.id);
      if (idx >= 0) {
        const merged = mergeTwoUserRecords(serverUsers[idx], u, isExplicitSingleSave);
        const changed = JSON.stringify(merged) !== JSON.stringify(serverUsers[idx]);
        serverUsers[idx] = merged;
        if (isExplicitSingleSave) {
          await pushUserToFirestore(merged).catch(() => {});
        } else if (changed) {
          pushUserToFirestore(merged).catch(() => {});
        }
      } else {
        const created = {
          ...u,
          updatedAt: isExplicitSingleSave ? Date.now() : u.updatedAt ?? 0,
        };
        serverUsers.push(created);
        if (isExplicitSingleSave) {
          await pushUserToFirestore(created).catch(() => {});
        } else {
          pushUserToFirestore(created).catch(() => {});
        }
      }
    };

    if (incomingUser) {
      deletedUserIds.delete(incomingUser.id);
      await upsertOne(incomingUser, true);
    }
    if (Array.isArray(incomingUsers)) {
      for (const u of incomingUsers) {
        await upsertOne(u, false);
      }
    }

    syncAgentsAndUsersLists();
    recomputeServerReferralCounts();
    saveServerUsers(serverUsers);
    res.json({
      ok: true,
      users: serverUsers,
      deletedUserIds: Array.from(deletedUserIds),
    });
  });

  // Dedicated Cross-Device Registration Endpoint (saves immediately to Server DB & Cloud Firestore)
  app.post('/api/auth/register', async (req, res) => {
    await syncWithCloudFirestore(true);
    syncAgentsAndUsersLists();
    const incoming = req.body?.user;
    if (!incoming || !incoming.id || !incoming.username) {
      return res.status(400).json({ ok: false, error: 'Invalid user registration payload.' });
    }

    const normPhone = normalizeSriLankaPhone(incoming.mobile);
    const userRecord = {
      ...incoming,
      mobile: normPhone || incoming.mobile,
      updatedAt: Date.now(),
      createdAt: incoming.createdAt || Date.now(),
    };

    deletedUserIds.delete(userRecord.id);
    const existingIdx = serverUsers.findIndex(
      (u) =>
        u.id === userRecord.id ||
        (normPhone && normalizeSriLankaPhone(u.mobile) === normPhone) ||
        String(u.username || '').trim().toLowerCase() === String(userRecord.username || '').trim().toLowerCase()
    );

    if (existingIdx >= 0) {
      serverUsers[existingIdx] = mergeTwoUserRecords(serverUsers[existingIdx], userRecord, true);
      await pushUserToFirestore(serverUsers[existingIdx]).catch(() => {});
    } else {
      serverUsers.push(userRecord);
      await pushUserToFirestore(userRecord).catch(() => {});
    }

    syncAgentsAndUsersLists();
    recomputeServerReferralCounts();
    saveServerUsers(serverUsers);

    return res.json({
      ok: true,
      user: existingIdx >= 0 ? serverUsers[existingIdx] : userRecord,
      users: serverUsers,
    });
  });

  // Dedicated Cross-Device Login Endpoint (searches Cloud Firestore, serverUsers, and cashAgents)
  app.post('/api/auth/login', async (req, res) => {
    await syncWithCloudFirestore(true);
    syncAgentsAndUsersLists();
    const rawIdentifier = String(req.body?.identifier || '').trim();
    const rawPassword = String(req.body?.password || '');

    if (!rawIdentifier) {
      return res.status(400).json({ ok: false, error: 'Missing login identifier' });
    }

    const normPhone = normalizeSriLankaPhone(rawIdentifier);
    const idLower = rawIdentifier.toLowerCase();
    const idCompact = idLower.replace(/[\s_]+/g, '');

    // Direct Admin Credentials Check
    if (normPhone === '0711452778' || idLower === 'admin@balloon.lk' || idLower === 'admin@lionbet.lk') {
      if (rawPassword !== '12345678') {
        return res.status(401).json({ ok: false, error: 'Invalid admin password.' });
      }
      let adminUser = serverUsers.find((u) => u.role === 'admin' || u.id === 'user_admin_1');
      if (!adminUser) {
        adminUser = {
          id: 'user_admin_1',
          username: 'BalloonAdminLK',
          mobile: '0711452778',
          email: 'admin@balloon.lk',
          password: '12345678',
          role: 'admin',
          balance: 150000,
          referralCode: 'ADMINLK',
          referralCount: 15,
          referralEarnings: 32000,
          unclaimedReferralRewards: 8500,
          totalWagered: 120000,
          totalWon: 135000,
          isBanned: false,
          avatar: '👑',
          createdAt: Date.now(),
        };
        serverUsers.push(adminUser);
        saveServerUsers(serverUsers);
        pushUserToFirestore(adminUser).catch(() => {});
      }
      return res.json({ ok: true, user: adminUser });
    }

    // Combined pool prioritizing agents & registered accounts
    const allCandidates = [...cashAgents, ...serverUsers];
    const matchUser = (u: any): boolean => {
      if (!u || !u.id || isFakeAgent(u) || deletedUserIds.has(u.id)) return false;
      const uPhone = normalizeSriLankaPhone(u.mobile);
      const uContact = normalizeSriLankaPhone(u.agentContact);
      const uNamePhone = normalizeSriLankaPhone(u.username);
      const uNameLower = String(u.username || '').trim().toLowerCase();
      const uNameCompact = uNameLower.replace(/[\s_]+/g, '');
      const uEmailLower = String(u.email || '').trim().toLowerCase();
      const uIdLower = String(u.id || '').trim().toLowerCase();

      if (normPhone && (uPhone === normPhone || uContact === normPhone || uNamePhone === normPhone)) {
        return true;
      }
      if (u.mobile && String(u.mobile).trim().toLowerCase() === idLower) return true;
      if (u.agentContact && String(u.agentContact).trim().toLowerCase() === idLower) return true;
      if (uNameLower && (uNameLower === idLower || uNameCompact === idCompact)) return true;
      if (uEmailLower && uEmailLower === idLower) return true;
      if (uIdLower && uIdLower === idLower) return true;
      return false;
    };

    const found = allCandidates.find(matchUser);
    if (!found) {
      return res.status(404).json({
        ok: false,
        error: 'Account not found. Please check your Mobile Number, Username, Email, or Agent ID.',
      });
    }

    const expectedPass = found.password ? String(found.password).trim() : '';
    if (expectedPass && expectedPass !== rawPassword.trim() && expectedPass !== rawPassword) {
      return res.status(401).json({
        ok: false,
        error: 'Incorrect password. Please try again.',
      });
    }

    if (found.isBanned) {
      return res.status(403).json({
        ok: false,
        error: 'This account has been suspended by the administrator.',
      });
    }

    const { isOnline, lastSeen, ...cleanUser } = found;
    return res.json({ ok: true, user: cleanUser });
  });

  // Cross-Device Transactions Sync
  app.get('/api/transactions', (_req, res) => {
    res.json({ ok: true, transactions: serverTransactions });
  });

  app.post('/api/transactions', (req, res) => {
    const incomingTx = req.body?.transaction;
    const incomingList = req.body?.transactions;

    const map = new Map<string, any>();
    for (const tx of serverTransactions) {
      if (tx && tx.id) map.set(tx.id, tx);
    }

    if (incomingTx && incomingTx.id) {
      map.set(incomingTx.id, incomingTx);
    }
    if (Array.isArray(incomingList)) {
      for (const tx of incomingList) {
        if (!tx || !tx.id) continue;
        const existing = map.get(tx.id);
        if (!existing || existing.status === 'pending') {
          map.set(tx.id, tx);
        }
      }
    }

    serverTransactions = Array.from(map.values())
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 250);
    saveServerTransactions(serverTransactions);
    res.json({ ok: true, transactions: serverTransactions });
  });

  // Global Admin Settings Sync (Mines Risk Level, Lose Rate, Crash Config)
  app.get('/api/settings', (_req, res) => {
    res.json({ ok: true, settings: serverAdminSettings });
  });

  app.post('/api/settings', (req, res) => {
    const incoming = req.body?.settings;
    if (incoming && typeof incoming === 'object') {
      serverAdminSettings = {
        ...(serverAdminSettings || {}),
        ...incoming,
      };
      saveServerAdminSettings(serverAdminSettings);
    }
    res.json({ ok: true, settings: serverAdminSettings });
  });

  // Persistent Balloon Crash Lobby Image Upload & Retrieval (syncs across all devices)
  app.get('/api/lobby-image/balloon-crash', (_req, res) => {
    const customImage = serverAdminSettings?.balloonCrashLobbyImage || null;
    res.json({ ok: true, imageUrl: customImage });
  });

  app.post('/api/lobby-image/balloon-crash', (req, res) => {
    try {
      const dataUrl = String(req.body?.imageDataUrl || '').trim();
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        return res.status(400).json({ ok: false, error: 'Invalid image data' });
      }
      const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      let savedUrl = dataUrl;
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1] === 'svg+xml' ? 'svg' : match[1];
        const base64Data = match[2];
        const fileName = `balloon_crash_custom.${ext}`;
        const publicDir = path.join(__dirname, 'public', 'assets', 'aistudio');
        fs.mkdirSync(publicDir, { recursive: true });
        fs.writeFileSync(path.join(publicDir, fileName), Buffer.from(base64Data, 'base64'));
        savedUrl = `/assets/aistudio/${fileName}?v=${Date.now()}`;
      }
      serverAdminSettings = {
        ...(serverAdminSettings || {}),
        balloonCrashLobbyImage: dataUrl,
        balloonCrashLobbyImageFileUrl: savedUrl,
      };
      saveServerAdminSettings(serverAdminSettings);
      return res.json({ ok: true, imageUrl: dataUrl, fileUrl: savedUrl });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Failed to save image' });
    }
  });

  const isUserOnlineNow = (agent: any) => {
    const entry = activePresence.get(agent.id);
    if (typeof agent.adminOnlineStatus === 'boolean') {
      return {
        isOnline: agent.adminOnlineStatus,
        lastSeen: entry?.lastSeen || agent.createdAt,
      };
    }
    if (entry) {
      if (entry.manualOffline) return { isOnline: false, lastSeen: entry.lastSeen };
      if (Date.now() - entry.lastSeen <= PRESENCE_TIMEOUT_MS) {
        return { isOnline: true, lastSeen: entry.lastSeen };
      }
    }
    return { isOnline: true, lastSeen: agent.createdAt };
  };

  app.get('/api/agents', async (_req, res) => {
    await syncWithCloudFirestore();
    syncAgentsAndUsersLists();
    cashAgents = cashAgents.filter((a) => !isFakeAgent(a) && !deletedUserIds.has(a.id));
    const agentsWithPresence = cashAgents.map((agent) => {
      const { isOnline, lastSeen } = isUserOnlineNow(agent);
      return { ...agent, isOnline, lastSeen };
    });
    res.json({ ok: true, agents: agentsWithPresence });
  });

  app.post('/api/agents', async (req, res) => {
    const agent = req.body?.agent;
    if (!agent || !agent.id || !agent.username) {
      return res.status(400).json({ error: 'Invalid agent payload' });
    }
    if (isFakeAgent(agent)) {
      return res.json({ ok: true, ignored: true });
    }

    deletedUserIds.delete(agent.id);
    saveDeletedUserIds(deletedUserIds);

    const agentWithTimestamp = {
      ...agent,
      mobile: agent.mobile || agent.agentContact || '',
      password: agent.password || '12345678',
      updatedAt: Date.now(),
    };

    // Always upsert into serverUsers & Cloud Firestore too so cross-device login always has the agent
    const uIdx = serverUsers.findIndex((u) => u.id === agentWithTimestamp.id);
    if (uIdx >= 0) {
      serverUsers[uIdx] = { ...serverUsers[uIdx], ...agentWithTimestamp };
    } else {
      serverUsers.push(agentWithTimestamp);
    }
    saveServerUsers(serverUsers);
    await pushUserToFirestore(agentWithTimestamp);

    if (!isAgentRole(agentWithTimestamp.role)) {
      cashAgents = cashAgents.filter((a) => a.id !== agentWithTimestamp.id);
      saveCashAgents(cashAgents);
      return res.json({ ok: true, agents: cashAgents });
    }

    const idx = cashAgents.findIndex((a) => a.id === agentWithTimestamp.id);
    if (idx >= 0) {
      cashAgents[idx] = { ...cashAgents[idx], ...agentWithTimestamp };
    } else {
      cashAgents.push({ adminOnlineStatus: true, ...agentWithTimestamp });
    }
    saveCashAgents(cashAgents);
    return res.json({ ok: true, agent: agentWithTimestamp });
  });

  app.post('/api/agents/status', (req, res) => {
    const { agentId, isOnline } = req.body || {};
    if (!agentId) {
      return res.status(400).json({ error: 'Missing agentId' });
    }
    const idx = cashAgents.findIndex((a) => a.id === agentId);
    if (idx >= 0) {
      cashAgents[idx].adminOnlineStatus = Boolean(isOnline);
      saveCashAgents(cashAgents);
      pushUserToFirestore(cashAgents[idx]).catch(() => {});
    }
    if (isOnline) {
      activePresence.set(agentId, { lastSeen: Date.now(), manualOffline: false });
    } else {
      activePresence.set(agentId, { lastSeen: Date.now(), manualOffline: true });
    }
    return res.json({ ok: true });
  });

  app.delete('/api/agents/:id', async (req, res) => {
    const targetId = req.params.id;
    deletedUserIds.add(targetId);
    saveDeletedUserIds(deletedUserIds);
    cashAgents = cashAgents.filter((a) => a.id !== targetId);
    serverUsers = serverUsers.filter((u) => u.id !== targetId);
    activePresence.delete(targetId);
    saveCashAgents(cashAgents);
    saveServerUsers(serverUsers);
    await deleteUserFromFirestore(targetId, deletedUserIds);
    return res.json({ ok: true });
  });

  app.post('/api/presence/heartbeat', (req, res) => {
    const { user, manualOffline } = req.body || {};
    if (!user || !user.id || isFakeAgent(user) || deletedUserIds.has(user.id)) {
      return res.status(400).json({ error: 'Missing or invalid user id' });
    }
    const existingPresence = activePresence.get(user.id);
    const effectiveManualOffline =
      typeof manualOffline === 'boolean' ? manualOffline : Boolean(existingPresence?.manualOffline);
    activePresence.set(user.id, {
      lastSeen: Date.now(),
      manualOffline: effectiveManualOffline,
    });

    const uIdx = serverUsers.findIndex((u) => u.id === user.id);
    if (uIdx === -1) {
      const created = { ...user, updatedAt: user.updatedAt || Date.now() };
      serverUsers.push(created);
      saveServerUsers(serverUsers);
      pushUserToFirestore(created).catch(() => {});
    } else if (isAgentRole(user.role)) {
      serverUsers[uIdx] = {
        ...serverUsers[uIdx],
        ...user,
        password: user.password || serverUsers[uIdx].password || '12345678',
        mobile: user.mobile || serverUsers[uIdx].mobile || user.agentContact,
      };
      saveServerUsers(serverUsers);
    }

    if (isAgentRole(user.role)) {
      const idx = cashAgents.findIndex((a) => a.id === user.id);
      if (idx >= 0) {
        const currentAdminStatus = cashAgents[idx].adminOnlineStatus;
        const nextStatus =
          typeof manualOffline === 'boolean'
            ? !manualOffline
            : typeof currentAdminStatus === 'boolean'
            ? currentAdminStatus
            : true;
        cashAgents[idx] = {
          ...cashAgents[idx],
          ...user,
          password: user.password || cashAgents[idx].password || '12345678',
          adminOnlineStatus: nextStatus,
        };
      } else {
        cashAgents.push({
          ...user,
          password: user.password || '12345678',
          adminOnlineStatus: typeof manualOffline === 'boolean' ? !manualOffline : true,
        });
      }
      saveCashAgents(cashAgents);
    }

    return res.json({ ok: true, timestamp: Date.now() });
  });

  app.post('/api/presence/logout', (req, res) => {
    const { userId } = req.body || {};
    if (userId) {
      const idx = cashAgents.findIndex((a) => a.id === userId);
      if (idx === -1) {
        activePresence.set(userId, { lastSeen: Date.now(), manualOffline: true });
      }
    }
    return res.json({ ok: true });
  });

  const broadcastChatMessage = (message: any) => {
    const payload = `data: ${JSON.stringify({ type: 'chat:message', message })}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  };

  app.get('/api/chat/messages', (_req, res) => {
    res.json({ messages: sharedChatMessages.slice(-100) });
  });

  app.get('/api/chat/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    (res as any).flushHeaders?.();
    res.write(
      `data: ${JSON.stringify({ type: 'chat:init', messages: sharedChatMessages.slice(-100) })}\n\n`
    );
    sseClients.add(res);
    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 20000);
    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  app.post('/api/chat/messages', (req, res) => {
    const msg = req.body?.message;
    if (!msg || !msg.id || !msg.text || !msg.username) {
      return res.status(400).json({ error: 'Invalid chat message payload' });
    }
    const alreadyExists = sharedChatMessages.some((m) => m.id === msg.id);
    if (!alreadyExists) {
      sharedChatMessages.push(msg);
      if (sharedChatMessages.length > 120) {
        sharedChatMessages = sharedChatMessages.slice(-120);
      }
      saveChatHistory(sharedChatMessages);
      broadcastChatMessage(msg);
    }
    return res.json({ ok: true, message: msg });
  });

  app.post('/api/chat/llm', async (req, res) => {
    try {
      const {
        mode = 'public_reply',
        userMessage = '',
        senderName = 'Pilot',
        botName = 'Nisal_SL',
        botAvatar = '🦁',
        replyToText = '',
        gameStatus = 'WAITING',
        multiplier = 1,
        lastRoundWinner = null,
        recentMessages = [],
      } = req.body || {};

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'GEMINI_API_KEY not configured on server', fallback: true });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const recentLines = Array.isArray(recentMessages)
        ? recentMessages
            .slice(-18)
            .map((m: any) => `${m.username || 'User'}: ${m.text || ''}`)
            .join('\n')
        : '';

      const winnerInfo = lastRoundWinner
        ? `Last round's Longest-Distance 100% Win Bonus winner was ${lastRoundWinner.username} who jumped at ${Number(lastRoundWinner.multiplier).toFixed(2)}x and got +Rs. ${Number(lastRoundWinner.bonusAmount).toLocaleString()} LKR bonus.`
        : 'No longest-distance bonus winner recorded in the previous round.';

      let systemPrompt = '';
      if (mode === 'private_dm') {
        systemPrompt = `You are ${botName} (${botAvatar}), an experienced, friendly Sri Lankan player on "WinxCash" chatting in a 1-on-1 Private Chat with ${senderName}.
Rules:
1. Answer whatever question or topic ${senderName} asks directly, accurately, and thoughtfully—just like an intelligent LLM (ChatGPT/Gemini), while keeping a natural, warm Sri Lankan friend/player persona.
2. Match the language style ${senderName} uses (Sinhala script, Singlish like "machan / kohomada / ela", or English).
3. CRITICAL: NEVER repeat or closely paraphrase any previous message from the conversation history below.
4. Keep your response concise (1 to 2 sentences) and natural for a chat window.
Game facts if asked:
- Platform: WinxCash (Balloon Crash LKR & Lanka Mines LKR).
- Longest Distance Bonus: The player who jumps at the highest multiplier in a round gets an extra 100% bonus on their win credited to their balance! (${winnerInfo})
- 1st Deposit Bonus: First deposit gets a 100% bonus for promocode registrations!
- Current Flight State: ${gameStatus} @ ${Number(multiplier).toFixed(2)}x.
Recent 1-on-1 conversation history:
${recentLines || '(Start of private conversation)'}
${replyToText ? `(${senderName} is specifically replying to: "${replyToText}")` : ''}
${senderName}'s new message: "${userMessage}"
Write ONLY ${botName}'s fresh, non-repeating reply text (no quotes or prefix):`;
      } else if (mode === 'ambient_chat') {
        systemPrompt = `You are ${botName} (${botAvatar}), a real-sounding Sri Lankan player in the live multiplayer chat of "WinxCash".
Current game state: ${gameStatus} at ${Number(multiplier).toFixed(2)}x.
${winnerInfo}
Recent chat messages (CRITICAL: DO NOT repeat, copy, or reuse any phrase from these):
${recentLines}
Write ONE fresh, completely original, natural 1-sentence chat comment in Singlish, Sinhala, or English about your own bet, cashout timing, bankroll, or the current round. Never repeat anything in the recent chat messages. Output ONLY the message text:`;
      } else {
        systemPrompt = `You are ${botName} (${botAvatar}), a friendly, knowledgeable Sri Lankan player in the "WinxCash" live chat responding to ${senderName}.
Rules:
1. Directly answer what ${senderName} asked or said!
2. Match ${senderName}'s language (Sinhala script, Singlish, or English).
3. CRITICAL: NEVER repeat any message or template from the recent chat history below.
4. Keep it natural and concise (1 to 2 sentences).
Recent chat history:
${recentLines}
${replyToText ? `(${senderName} replied to the message: "${replyToText}")` : ''}
${senderName} said: "${userMessage}"
Write ONLY ${botName}'s fresh, non-repeating reply text (no quotes or name prefix):`;
      }

      let generatedText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: systemPrompt,
        });
        generatedText = (response.text || '').trim().replace(/^["']|["']$/g, '');
      } catch {
        const fallbackResp = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: systemPrompt,
        });
        generatedText = (fallbackResp.text || '').trim().replace(/^["']|["']$/g, '');
      }

      if (!generatedText) {
        return res.status(500).json({ error: 'Empty model response', fallback: true });
      }
      return res.json({ text: generatedText });
    } catch (error: any) {
      console.error('LLM Chat Error:', error?.message || error);
      return res.status(500).json({ error: 'LLM request failed', fallback: true });
    }
  });

  let cachedLiveMatches: any[] = [];
  let lastMatchesFetchTime = 0;

  function americanToDecimalOdds(ml: any, fallback: number): number {
    if (typeof ml !== 'number' || isNaN(ml) || ml === 0) return fallback;
    if (ml > 0) {
      return Number(Math.max(1.12, 1 + ml / 100).toFixed(2));
    }
    return Number(Math.max(1.12, 1 + 100 / Math.abs(ml)).toFixed(2));
  }

  function deterministicHashOdds(seedStr: string): [number, number, number] {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const norm = Math.abs(h % 1000) / 1000;
    const oddA = Number((1.48 + norm * 1.35).toFixed(2));
    const oddB = Number((3.15 - norm * 1.25).toFixed(2));
    const oddDraw = Number((3.1 + norm * 0.65).toFixed(2));
    return [Math.max(1.35, oddA), oddDraw, Math.max(1.4, oddB)];
  }

  async function fetchRealGlobalMatches() {
    const now = Date.now();
    if (cachedLiveMatches.length > 0 && now - lastMatchesFetchTime < 35000) {
      return cachedLiveMatches;
    }
    const sources = [
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard',
        sport: 'football',
        defaultLeague: 'Global Football',
        flag: '⚽',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard',
        sport: 'football',
        defaultLeague: 'UEFA Champions League',
        flag: '🇪🇺',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
        sport: 'football',
        defaultLeague: 'English Premier League',
        flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard',
        sport: 'football',
        defaultLeague: 'Spain LaLiga',
        flag: '🇪🇸',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/cricket/scoreboard',
        sport: 'cricket',
        defaultLeague: 'International Cricket',
        flag: '🏏',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
        sport: 'basketball',
        defaultLeague: 'NBA',
        flag: '🏀',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard',
        sport: 'tennis',
        defaultLeague: 'ATP Tour',
        flag: '🎾',
      },
    ];

    const matchMap = new Map<string, any>();

    const parseCompetition = (comp: any, ev: any, sport: string, leagueName: string, flag: string) => {
      const competitors = comp?.competitors;
      if (!Array.isArray(competitors) || competitors.length < 2) return;
      const home = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
      const away = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];
      const teamA =
        home?.team?.shortDisplayName ||
        home?.team?.displayName ||
        home?.athlete?.displayName ||
        'Team A';
      const teamB =
        away?.team?.shortDisplayName ||
        away?.team?.displayName ||
        away?.athlete?.displayName ||
        'Team B';
      if (teamA === 'TBD' || teamB === 'TBD') return;
      const teamACode =
        home?.team?.abbreviation ||
        teamA.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() ||
        'TMA';
      const teamBCode =
        away?.team?.abbreviation ||
        teamB.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() ||
        'TMB';
      const teamALogoUrl = home?.team?.logo || home?.athlete?.flag?.href || undefined;
      const teamBLogoUrl = away?.team?.logo || away?.athlete?.flag?.href || undefined;
      const statusObj = comp?.status || ev?.status;
      const state = statusObj?.type?.state;
      if (state === 'post') return;
      const dateStr = comp?.date || ev?.date;
      const parsedTime = dateStr ? new Date(dateStr).getTime() : now + 3600000;
      const isLive = state === 'in';
      const matchId = `real_${sport}_${comp?.id || ev?.id}`;
      if (matchMap.has(matchId)) return;
      const [defOddA, defOddDraw, defOddB] = deterministicHashOdds(`${teamA}_${teamB}_${matchId}`);
      const espnOdds = comp?.odds?.[0];
      const oddA = americanToDecimalOdds(espnOdds?.homeTeamOdds?.moneyLine, defOddA);
      const oddB = americanToDecimalOdds(espnOdds?.awayTeamOdds?.moneyLine, defOddB);
      const oddDraw = americanToDecimalOdds(espnOdds?.drawOdds?.moneyLine, defOddDraw);
      const overUnderLine =
        espnOdds?.overUnder ||
        (sport === 'football' ? 2.5 : sport === 'basketball' ? 224.5 : sport === 'tennis' ? 21.5 : 168.5);
      const markets: any[] = [];
      if (sport === 'football') {
        markets.push({
          id: 'm_1x2',
          name: isLive ? 'Live Match Result (1X2)' : 'Full Time Result (1X2)',
          options: [
            { id: 'home_1', label: teamA, shortLabel: `1 (${teamACode})`, odds: oddA },
            { id: 'draw_x', label: 'Draw', shortLabel: 'X (Draw)', odds: oddDraw },
            { id: 'away_2', label: teamB, shortLabel: `2 (${teamBCode})`, odds: oddB },
          ],
        });
      } else {
        markets.push({
          id: 'm_winner',
          name: isLive ? 'Live Match Winner' : 'Match Winner',
          options: [
            { id: 'home_win', label: teamA, shortLabel: teamACode, odds: oddA },
            { id: 'away_win', label: teamB, shortLabel: teamBCode, odds: oddB },
          ],
        });
      }
      markets.push({
        id: 'm_total',
        name: `Total (${overUnderLine})`,
        options: [
          { id: 'over', label: `Over ${overUnderLine}`, shortLabel: `O ${overUnderLine}`, odds: 1.88 },
          { id: 'under', label: `Under ${overUnderLine}`, shortLabel: `U ${overUnderLine}`, odds: 1.92 },
        ],
      });
      const sportIcon =
        sport === 'cricket' ? '🏏' : sport === 'football' ? '⚽' : sport === 'tennis' ? '🎾' : '🏀';
      matchMap.set(matchId, {
        id: matchId,
        sport,
        tournament: leagueName,
        countryFlag: flag,
        teamA,
        teamACode,
        teamALogo: sportIcon,
        teamALogoUrl,
        teamB,
        teamBCode,
        teamBLogo: sportIcon,
        teamBLogoUrl,
        startsAt: parsedTime,
        status: isLive ? 'LIVE' : 'UPCOMING',
        liveScoreA: isLive ? String(home?.score ?? '0') : undefined,
        liveScoreB: isLive ? String(away?.score ?? '0') : undefined,
        livePeriod: isLive ? statusObj?.type?.shortDetail || 'LIVE' : undefined,
        markets,
      });
    };

    await Promise.allSettled(
      sources.map(async (src) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        try {
          const resp = await fetch(src.url, { signal: controller.signal });
          if (!resp.ok) return;
          const data: any = await resp.json();
          const leagueTitle = data?.leagues?.[0]?.name || src.defaultLeague;
          const events = Array.isArray(data?.events) ? data.events : [];
          for (const ev of events) {
            if (Array.isArray(ev?.competitions)) {
              for (const comp of ev.competitions) {
                parseCompetition(comp, ev, src.sport, leagueTitle, src.flag);
              }
            }
          }
        } catch {} finally {
          clearTimeout(timer);
        }
      })
    );

    const results = Array.from(matchMap.values()).sort((a, b) => {
      if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
      if (a.status !== 'LIVE' && b.status === 'LIVE') return 1;
      return a.startsAt - b.startsAt;
    });
    cachedLiveMatches = results;
    lastMatchesFetchTime = now;
    return results;
  }

  app.get('/api/sports/live-matches', async (_req, res) => {
    try {
      const matches = await fetchRealGlobalMatches();
      return res.json({ ok: true, fetchedAt: Date.now(), count: matches.length, matches });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Failed to fetch live matches', matches: [] });
    }
  });

  // Serve real uploaded files from public/assets/aistudio first, fallback to SVG only if missing
  app.get('/assets/aistudio/:filename', async (req, res) => {
    try {
      const name = path.basename(String(req.params.filename || ''));
      const publicFilePath = path.join(__dirname, 'public', 'assets', 'aistudio', name);
      const distFilePath = path.join(__dirname, 'dist', 'assets', 'aistudio', name);

      if (fs.existsSync(publicFilePath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.sendFile(publicFilePath);
      }
      if (fs.existsSync(distFilePath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.sendFile(distFilePath);
      }

      const { LION_BET_LOGO_SVG, BALLOON_CRASH_COVER_SVG, BALLOON_CRASH_BG_SVG } = await import(
        './src/services/brandAssets'
      );
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'no-cache');
      if (name.includes('d88c81fa')) {
        return res.send(BALLOON_CRASH_COVER_SVG.trim());
      }
      if (name.includes('fe148211')) {
        return res.send(BALLOON_CRASH_BG_SVG.trim());
      }
      return res.send(LION_BET_LOGO_SVG.trim());
    } catch {
      return res.status(404).end();
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
