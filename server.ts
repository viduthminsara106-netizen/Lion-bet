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

interface ServerCashAgent {
  id: string;
  username: string;
  mobile?: string;
  email: string;
  password?: string;
  role: 'deposit_agent' | 'withdraw_agent' | 'cash_agent';
  balance: number;
  avatar: string;
  agentContact?: string;
  createdByAdmin?: boolean;
  createdAt: number;
  isBanned?: boolean;
  referralCode?: string;
}

const FAKE_AGENT_IDS = new Set(['user_dep_agent_1', 'user_wd_agent_1']);
const FAKE_AGENT_NAMES = new Set(['depositagent_01', 'withdrawagent_01']);

function isFakeAgent(agent: { id?: string; username?: string }): boolean {
  if (!agent) return true;
  if (agent.id && FAKE_AGENT_IDS.has(agent.id)) return true;
  if (agent.username && FAKE_AGENT_NAMES.has(agent.username.toLowerCase())) return true;
  return false;
}

function loadCashAgents(): ServerCashAgent[] {
  try {
    if (fs.existsSync(CASH_AGENTS_FILE)) {
      const raw = fs.readFileSync(CASH_AGENTS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((a) => !isFakeAgent(a));
      }
    }
  } catch {
    // ignore read error
  }
  return [];
}

function saveCashAgents(agents: ServerCashAgent[]) {
  try {
    const clean = agents.filter((a) => !isFakeAgent(a));
    fs.writeFileSync(CASH_AGENTS_FILE, JSON.stringify(clean, null, 2), 'utf-8');
  } catch {
    // ignore write error
  }
}

interface ServerChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  role?: string;
  text: string;
  timestamp: number;
  isSystemWin?: boolean;
  highlightMultiplier?: number;
  replyTo?: {
    id: string;
    username: string;
    text: string;
  };
  recipientId?: string;
}

const DEFAULT_INITIAL_MESSAGES: ServerChatMessage[] = [
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

function loadChatHistory(): ServerChatMessage[] {
  try {
    if (fs.existsSync(CHAT_HISTORY_FILE)) {
      const raw = fs.readFileSync(CHAT_HISTORY_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(-120);
      }
    }
  } catch {
    // ignore read error
  }
  return [...DEFAULT_INITIAL_MESSAGES];
}

function saveChatHistory(messages: ServerChatMessage[]) {
  try {
    fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(messages.slice(-120), null, 2), 'utf-8');
  } catch {
    // ignore write error
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Shared Server-Authoritative Multi-User Chat State
  let sharedChatMessages: ServerChatMessage[] = loadChatHistory();
  let cashAgents: ServerCashAgent[] = loadCashAgents();
  const activePresence = new Map<string, { lastSeen: number; manualOffline?: boolean }>();
  const PRESENCE_TIMEOUT_MS = 45000;
  const sseClients = new Set<express.Response>();

  const isUserOnlineNow = (
    agent: ServerCashAgent & { adminOnlineStatus?: boolean }
  ): { isOnline: boolean; lastSeen: number | null } => {
    const entry = activePresence.get(agent.id);
    if (entry) {
      if (entry.manualOffline) return { isOnline: false, lastSeen: entry.lastSeen };
      if (Date.now() - entry.lastSeen <= PRESENCE_TIMEOUT_MS) {
        return { isOnline: true, lastSeen: entry.lastSeen };
      }
    }
    if (typeof agent.adminOnlineStatus === 'boolean') {
      return { isOnline: agent.adminOnlineStatus, lastSeen: entry?.lastSeen || agent.createdAt };
    }
    return { isOnline: true, lastSeen: agent.createdAt };
  };

  // GET /api/agents - List all Admin-created Cash Agents and their real-time online/offline status on the site
  app.get('/api/agents', (_req, res) => {
    cashAgents = cashAgents.filter((a) => !isFakeAgent(a));
    const agentsWithPresence = cashAgents.map((agent) => {
      const { isOnline, lastSeen } = isUserOnlineNow(agent);
      return {
        ...agent,
        isOnline,
        lastSeen,
      };
    });
    res.json({ ok: true, agents: agentsWithPresence });
  });

  // POST /api/agents - Create or update an Admin-created Cash Agent
  app.post('/api/agents', (req, res) => {
    const agent = req.body?.agent as (ServerCashAgent & { adminOnlineStatus?: boolean }) | undefined;
    if (!agent || !agent.id || !agent.username) {
      return res.status(400).json({ error: 'Invalid agent payload' });
    }
    if (isFakeAgent(agent)) {
      return res.json({ ok: true, ignored: true });
    }
    const isAgentRole =
      agent.role === 'deposit_agent' ||
      agent.role === 'withdraw_agent' ||
      agent.role === 'cash_agent';

    if (!isAgentRole) {
      // If role was changed away from agent, remove from cashAgents list
      cashAgents = cashAgents.filter((a) => a.id !== agent.id);
      saveCashAgents(cashAgents);
      return res.json({ ok: true, agents: cashAgents });
    }

    const idx = cashAgents.findIndex((a) => a.id === agent.id);
    if (idx >= 0) {
      cashAgents[idx] = { ...cashAgents[idx], ...agent };
    } else {
      cashAgents.push({ adminOnlineStatus: true, ...agent } as any);
    }
    saveCashAgents(cashAgents);
    return res.json({ ok: true, agent });
  });

  // POST /api/agents/status - Toggle or set an agent's Online/Offline status
  app.post('/api/agents/status', (req, res) => {
    const { agentId, isOnline } = req.body || {};
    if (!agentId) {
      return res.status(400).json({ error: 'Missing agentId' });
    }
    const idx = cashAgents.findIndex((a) => a.id === agentId);
    if (idx >= 0) {
      (cashAgents[idx] as any).adminOnlineStatus = Boolean(isOnline);
      saveCashAgents(cashAgents);
    }
    if (isOnline) {
      activePresence.set(agentId, { lastSeen: Date.now(), manualOffline: false });
    } else {
      activePresence.set(agentId, { lastSeen: Date.now(), manualOffline: true });
    }
    return res.json({ ok: true });
  });

  // DELETE /api/agents/:id - Delete a Cash Agent
  app.delete('/api/agents/:id', (req, res) => {
    const targetId = req.params.id;
    cashAgents = cashAgents.filter((a) => a.id !== targetId);
    activePresence.delete(targetId);
    saveCashAgents(cashAgents);
    return res.json({ ok: true });
  });

  // POST /api/presence/heartbeat - Record real-time online status on the site for logged-in user/agent
  app.post('/api/presence/heartbeat', (req, res) => {
    const { user, manualOffline } = req.body || {};
    if (!user || !user.id) {
      return res.status(400).json({ error: 'Missing user id' });
    }

    activePresence.set(user.id, {
      lastSeen: Date.now(),
      manualOffline: Boolean(manualOffline),
    });

    // If this logged-in user is a valid Admin-created Cash Agent, ensure they exist in cashAgents list
    if (
      !isFakeAgent(user) &&
      (user.role === 'deposit_agent' ||
        user.role === 'withdraw_agent' ||
        user.role === 'cash_agent')
    ) {
      const idx = cashAgents.findIndex((a) => a.id === user.id);
      if (idx >= 0) {
        cashAgents[idx] = { ...cashAgents[idx], ...user, adminOnlineStatus: !manualOffline } as any;
      } else {
        cashAgents.push({ ...user, adminOnlineStatus: !manualOffline } as any);
      }
      saveCashAgents(cashAgents);
    }

    return res.json({ ok: true, timestamp: Date.now() });
  });

  // POST /api/presence/logout - Immediately mark user/agent as offline when they log out
  app.post('/api/presence/logout', (req, res) => {
    const { userId } = req.body || {};
    if (userId) {
      activePresence.set(userId, { lastSeen: Date.now(), manualOffline: true });
      const idx = cashAgents.findIndex((a) => a.id === userId);
      if (idx >= 0) {
        (cashAgents[idx] as any).adminOnlineStatus = false;
        saveCashAgents(cashAgents);
      }
    }
    return res.json({ ok: true });
  });

  const broadcastChatMessage = (message: ServerChatMessage) => {
    const payload = `data: ${JSON.stringify({ type: 'chat:message', message })}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  };

  // GET /api/chat/messages - Fetch shared chat history across all real users
  app.get('/api/chat/messages', (_req, res) => {
    res.json({ messages: sharedChatMessages.slice(-100) });
  });

  // GET /api/chat/stream - Real-Time SSE stream for multi-user chat messages
  app.get('/api/chat/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial sync event
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

  // POST /api/chat/messages - Broadcast a new message from a real user (or system/bot) to all connected users
  app.post('/api/chat/messages', (req, res) => {
    const msg = req.body?.message as ServerChatMessage | undefined;
    if (!msg || !msg.id || !msg.text || !msg.username) {
      return res.status(400).json({ error: 'Invalid chat message payload' });
    }

    // Idempotency check: prevent duplicate message IDs
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

  // POST /api/chat/llm - LLM-powered chat for public replies, private DMs, and non-repeating community messages
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
        multiplier = 1.0,
        lastRoundWinner = null,
        recentMessages = [],
      } = req.body || {};

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY not configured on server',
          fallback: true,
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const recentLines = Array.isArray(recentMessages)
        ? recentMessages
            .slice(-18)
            .map((m: { username?: string; text?: string }) => `${m.username || 'User'}: ${m.text || ''}`)
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
- Platform: WinxCash (Balloon Crash LKR).
- Longest Distance Bonus: The player who jumps at the highest multiplier in a round gets an extra 100% bonus on their win credited to their balance! (${winnerInfo})
- 1st Deposit Bonus: First deposit gets a 100% bonus! Bonus money itself cannot be withdrawn directly; you bet with it and only the profit won from betting can be withdrawn.
- Current Flight State: ${gameStatus} @ ${Number(multiplier).toFixed(2)}x.

Recent 1-on-1 conversation history:
${recentLines || '(Start of private conversation)'}
${replyToText ? `\n(${senderName} is specifically replying to: "${replyToText}")` : ''}
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
1. Directly answer what ${senderName} asked or said! Whether ${senderName} asks a game question, math/general question, strategy advice, or casual greeting, give a smart, accurate, helpful answer like ChatGPT/Gemini while sounding like a friendly fellow Sri Lankan player.
2. Match ${senderName}'s language (Sinhala script, Singlish, or English).
3. CRITICAL: NEVER repeat any message or template from the recent chat history below.
4. Keep it natural and concise (1 to 2 sentences). Mention @${senderName} only if natural in public chat.
Game facts if relevant:
- Longest Distance Bonus: Whoever goes the furthest (highest cashout multiplier) in a round gets +100% of their win amount added to their balance! (${winnerInfo})
- 1st Deposit Bonus: 100% bonus on the 1st deposit only. Bonus funds cannot be withdrawn directly—only the profit made by betting can be withdrawn.
- Current Flight State: ${gameStatus} @ ${Number(multiplier).toFixed(2)}x.

Recent chat history:
${recentLines}
${replyToText ? `\n(${senderName} replied to the message: "${replyToText}")` : ''}
${senderName} said: "${userMessage}"

Write ONLY ${botName}'s fresh, non-repeating reply text (no quotes or name prefix):`;
      }

      let generatedText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: systemPrompt,
        });
        generatedText = (response.text || '').trim().replace(/^["']|["']$/g, '');
      } catch {
        const fallbackResp = await ai.models.generateContent({
          model: 'gemini-flash-latest',
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
      return res.status(500).json({
        error: 'LLM request failed',
        fallback: true,
      });
    }
  });

  // ============================================================================
  // GET /api/sports/live-matches - Real-Time Global Live & Upcoming Matches Feed
  // Fetches actual current matches from ESPN & TheSportsDB public scoreboards
  // ============================================================================
  let cachedLiveMatches: any[] = [];
  let lastMatchesFetchTime = 0;

  function americanToDecimalOdds(ml: number | undefined, fallback: number): number {
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
    const norm = Math.abs(h % 1000) / 1000; // 0..1
    const oddA = Number((1.48 + norm * 1.35).toFixed(2));
    const oddB = Number((3.15 - norm * 1.25).toFixed(2));
    const oddDraw = Number((3.10 + (norm * 0.65)).toFixed(2));
    return [Math.max(1.35, oddA), oddDraw, Math.max(1.40, oddB)];
  }

  async function fetchRealGlobalMatches(): Promise<any[]> {
    const now = Date.now();
    if (cachedLiveMatches.length > 0 && now - lastMatchesFetchTime < 35000) {
      return cachedLiveMatches;
    }

    const sources: {
      url: string;
      sport: 'cricket' | 'football' | 'tennis' | 'basketball';
      defaultLeague: string;
      flag: string;
    }[] = [
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
        url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard',
        sport: 'football',
        defaultLeague: 'UEFA Europa League',
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
        url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard',
        sport: 'football',
        defaultLeague: 'Italy Serie A',
        flag: '🇮🇹',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard',
        sport: 'football',
        defaultLeague: 'Germany Bundesliga',
        flag: '🇩🇪',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard',
        sport: 'football',
        defaultLeague: 'France Ligue 1',
        flag: '🇫🇷',
      },
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',
        sport: 'football',
        defaultLeague: 'MLS',
        flag: '🇺🇸',
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
      {
        url: 'https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard',
        sport: 'tennis',
        defaultLeague: 'WTA Tour',
        flag: '🎾',
      },
    ];

    const matchMap = new Map<string, any>();

    const parseCompetition = (
      comp: any,
      ev: any,
      sport: 'cricket' | 'football' | 'tennis' | 'basketball',
      leagueName: string,
      flag: string
    ) => {
      const competitors = comp?.competitors;
      if (!Array.isArray(competitors) || competitors.length < 2) return;

      const home = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
      const away = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

      const teamA =
        home?.team?.shortDisplayName ||
        home?.team?.displayName ||
        home?.athlete?.displayName ||
        home?.athlete?.shortName ||
        'Team A';
      const teamB =
        away?.team?.shortDisplayName ||
        away?.team?.displayName ||
        away?.athlete?.displayName ||
        away?.athlete?.shortName ||
        'Team B';

      if (teamA === 'TBD' || teamB === 'TBD') return;

      const teamACode =
        home?.team?.abbreviation ||
        teamA
          .replace(/[^A-Za-z]/g, '')
          .slice(0, 3)
          .toUpperCase() ||
        'TMA';
      const teamBCode =
        away?.team?.abbreviation ||
        teamB
          .replace(/[^A-Za-z]/g, '')
          .slice(0, 3)
          .toUpperCase() ||
        'TMB';

      const teamALogoUrl = home?.team?.logo || home?.athlete?.flag?.href || undefined;
      const teamBLogoUrl = away?.team?.logo || away?.athlete?.flag?.href || undefined;

      const statusObj = comp?.status || ev?.status;
      const state = statusObj?.type?.state; // 'pre' | 'in' | 'post'
      if (state === 'post') return; // Skip already finished matches; only show LIVE ('in') & UPCOMING ('pre')

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
      const overUnderLine = espnOdds?.overUnder || (sport === 'football' ? 2.5 : sport === 'basketball' ? 224.5 : sport === 'tennis' ? 21.5 : 168.5);

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
        markets.push({
          id: 'm_goals',
          name: `Total Goals (${overUnderLine})`,
          options: [
            { id: 'over', label: `Over ${overUnderLine}`, shortLabel: `Over ${overUnderLine}`, odds: 1.85 },
            { id: 'under', label: `Under ${overUnderLine}`, shortLabel: `Under ${overUnderLine}`, odds: 1.95 },
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
        markets.push({
          id: 'm_total',
          name:
            sport === 'cricket'
              ? `1st Innings Runs (${overUnderLine})`
              : sport === 'basketball'
              ? `Total Points (${overUnderLine})`
              : `Total Games (${overUnderLine})`,
          options: [
            { id: 'over', label: `Over ${overUnderLine}`, shortLabel: `O ${overUnderLine}`, odds: 1.88 },
            { id: 'under', label: `Under ${overUnderLine}`, shortLabel: `U ${overUnderLine}`, odds: 1.92 },
          ],
        });
      }

      const sportIcon =
        sport === 'cricket'
          ? '🏏'
          : sport === 'football'
          ? '⚽'
          : sport === 'tennis'
          ? '🎾'
          : '🏀';

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
        livePeriod: isLive
          ? statusObj?.type?.shortDetail || statusObj?.type?.detail || 'LIVE'
          : undefined,
        markets,
      });
    };

    // Fetch all ESPN endpoints in parallel with timeout
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
            if (Array.isArray(ev?.groupings)) {
              for (const grp of ev.groupings) {
                const grpComps = Array.isArray(grp?.competitions) ? grp.competitions : [];
                for (const comp of grpComps) {
                  parseCompetition(
                    comp,
                    ev,
                    src.sport,
                    `${ev?.name || leagueTitle}`,
                    src.flag
                  );
                }
              }
            }
          }
        } catch {
          // ignore single league failure
        } finally {
          clearTimeout(timer);
        }
      })
    );

    // Also fetch Today & Tomorrow Cricket Matches from TheSportsDB public API
    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await Promise.allSettled(
      [todayStr, tomorrowStr].map(async (dayStr) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        try {
          const resp = await fetch(
            `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${dayStr}&s=Cricket`,
            { signal: controller.signal }
          );
          if (!resp.ok) return;
          const data: any = await resp.json();
          const events = Array.isArray(data?.events) ? data.events : [];
          for (const ev of events) {
            if (!ev?.strHomeTeam || !ev?.strAwayTeam) continue;
            if (ev?.strStatus === 'Match Finished' || ev?.strStatus === 'FT') continue;
            const matchId = `tsdb_cricket_${ev.idEvent}`;
            if (matchMap.has(matchId)) continue;

            const timeStr = ev.strTimestamp || `${ev.dateEvent}T${ev.strTime || '14:00:00'}Z`;
            const parsedTime = new Date(timeStr).getTime() || Date.now() + 7200000;
            const isLive =
              parsedTime <= Date.now() &&
              ev.strStatus !== 'Not Started' &&
              ev.strStatus !== 'NS';

            const [oddA, , oddB] = deterministicHashOdds(`${ev.strHomeTeam}_${ev.strAwayTeam}`);
            const codeA = ev.strHomeTeam.slice(0, 3).toUpperCase();
            const codeB = ev.strAwayTeam.slice(0, 3).toUpperCase();

            matchMap.set(matchId, {
              id: matchId,
              sport: 'cricket',
              tournament: ev.strLeague || 'International Cricket',
              countryFlag: '🏏',
              teamA: ev.strHomeTeam,
              teamACode: codeA,
              teamALogo: '🏏',
              teamALogoUrl: ev.strHomeTeamBadge || undefined,
              teamB: ev.strAwayTeam,
              teamBCode: codeB,
              teamBLogo: '🏏',
              teamBLogoUrl: ev.strAwayTeamBadge || undefined,
              startsAt: parsedTime,
              status: isLive ? 'LIVE' : 'UPCOMING',
              liveScoreA: isLive && ev.intHomeScore != null ? String(ev.intHomeScore) : undefined,
              liveScoreB: isLive && ev.intAwayScore != null ? String(ev.intAwayScore) : undefined,
              livePeriod: isLive ? ev.strProgress || 'Live In Play' : undefined,
              markets: [
                {
                  id: 'm_winner',
                  name: isLive ? 'Live Match Winner' : 'Match Winner',
                  options: [
                    { id: 'home_win', label: ev.strHomeTeam, shortLabel: codeA, odds: oddA },
                    { id: 'away_win', label: ev.strAwayTeam, shortLabel: codeB, odds: oddB },
                  ],
                },
              ],
            });
          }
        } catch {
          // ignore
        } finally {
          clearTimeout(timer);
        }
      })
    );

    const results = Array.from(matchMap.values()).sort((a, b) => {
      // Sort LIVE matches first, then UPCOMING by soonest start time
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
      return res.json({
        ok: true,
        fetchedAt: Date.now(),
        count: matches.length,
        matches,
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: err?.message || 'Failed to fetch live matches',
        matches: [],
      });
    }
  });

  // Vite middleware in development
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
