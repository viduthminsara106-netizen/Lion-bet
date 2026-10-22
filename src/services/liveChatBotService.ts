import { ChatMessage, ChatReplyTarget, GameStatus, RoundBonusWinner, User } from '../types/game';
import { BOT_NAMES } from './storage';

export interface BotProfile {
  id: string;
  name: string;
  avatar: string;
  color: string;
  statusText?: string;
  isRealUser?: boolean;
}

const CITIES = [
  'Colombo', 'Kandy', 'Galle', 'Negombo', 'Kurunegala', 'Matara', 'Gampaha',
  'Kalutara', 'Ratnapura', 'Anuradhapura', 'Panadura', 'Dehiwala', 'Kegalle',
  'Badulla', 'Maharagama', 'Nugegoda', 'Moratuwa', 'Batticaloa', 'Jaffna', 'Trincomalee',
];

const STYLES = [
  'High Multiplier Hunter', '2x Auto Cashout Pro', 'Space Zone Pilot', 'Dual Deck Strategist',
  'Longest Flight Chaser', 'VIP Rider', 'Smart Bankroll', 'Parachute Master',
  'Lucky Jumper', 'Steady Profit', 'Sky Captain', 'Bonus Winner',
];

export const BOT_COMMUNITY: BotProfile[] = BOT_NAMES.map((b, idx) => ({
  id: `bot_${String(idx + 1).padStart(2, '0')}`,
  name: b.name,
  avatar: b.avatar,
  color: b.color,
  statusText: `${CITIES[idx % CITIES.length]} • ${STYLES[idx % STYLES.length]}`,
}));

const USED_MESSAGES_STORAGE_KEY = 'winxcash_used_chat_msgs_v3';

// Large, diverse pool of completely distinct messages so no message ever repeats
const UNIQUE_WAITING_POOL: string[] = [
  'මම මේ round එකට පොඩි ගානකින් පටන් ගන්නවා, බලමු කොහොම වෙයිද කියලා.',
  'Ada nam shape eke 2x withara target karala play karanne machan.',
  'කවුද මේ පාර ලොකු multiplier එකකට try කරන්නේ?',
  'Deck දෙකම දාන එක වාසියි, එකක් කලින් cashout කරලා අනික දුර යවන්න පුළුවන්.',
  'Cash agent හරහා දාපු deposit එක තත්පර ගානෙන් ආවා, දැන් සෙල්ලම් කරන්න තියෙන්නේ.',
  'Giya para poddak parakku una jump karanna, me para kalinma paninawa.',
  'අද රෑට හොඳ high flight එකක් එයි වගේ මට හිතෙනවා.',
  'Man nam Rs. 300 gaane dala steady profit ekak ganna balanne.',
  'පළවෙනි deposit එකට හම්බවුන 100% bonus එකෙන් තමයි මම දැන් play කරන්නේ.',
  'Hama welema loku multiplier passe yanna epa, 1.8x - 2.2x hodatama athi.',
  'කට්ටියම ලෑස්තිද ඊළඟ බැලූනයට නගින්න? 🎈',
  'Meke parachute animation eka maru, jump karaddi lassanata penawa.',
  'මම අද දවසට Rs. 4,500 ක් විතර profit කළා, දැන් පරිස්සමෙන් ගහන්නේ.',
  'Auto cashout 1.75x දාලා තියෙන්නේ, එතකොට බය වෙන්න දෙයක් නෑ.',
  'Kandy පැත්තට අද හොඳටම වහිනවා, ගෙදරට වෙලා WinxCash ගහනවා ඉතින් ☕',
  'වැඩිම දුර යන කෙනාට දිනන ගානෙන් 100%ක්ම ආයේ ලැබෙන නිසා Deck 2 එක දුර යවන්න වටිනවා.',
  'Setting my first deck at 1.90x and letting the second deck ride high!',
  'Bank transfer වලට වඩා Cash Agent හරහා withdraw ගන්න එක ලේසියි වගේ.',
  'බලමු මේ වටයේ කවුරු අන්තිම වෙනකම් බැලූනයේ ඉඳියිද කියලා.',
  'Patience is key guys, wait for a good streak and keep stakes balanced.',
];

const UNIQUE_FLYING_POOL: string[] = [
  'ඔන්න ලස්සනට උඩට යනවා, කලබල නොවී වෙලාවට පනින්න!',
  'Mama nam mage safe target eke panagaththa, anith ayata good luck!',
  'තව ටිකක් උඩට ගියොත් අද දවසේ හොඳම රවුන්ඩ් එක වෙයි වගේ.',
  'Parachute ටික එක පෙළට පනිනවා දැක්කම ආසයි 🪂',
  'Hold කරන අය පරිස්සමෙන්, දැන් හොඳ ගානකට ඇවිත් තියෙන්නේ!',
  'Ado meka nam supiri flight ekak, space zone ekata yanakam yai wage.',
  'මම Deck 1 cashout කළා, දැන් Deck 2 එක විතරයි තියෙන්නේ.',
  'වලාකුළු පහු කරගෙන යද්දී පපුවත් ගැහෙනවා මචං 😅',
  'Smooth climb right now, hope everyone locked in some green!',
  'කවුරුහරි තාම බැලූනය ඇතුලේ ඉන්නවද? ලොකු ගානක් ගන්න පුළුවන් වෙයි.',
  'Man nam podi profit ekakin satisfy una, लोभ නැතුව පැන්නා.',
  'අහස කළු වෙලා තරු පේන ගානටම උඩට ගියා නේද!',
];

const UNIQUE_BURST_POOL: string[] = [
  'අම්මෝ ඒක නම් නූලෙන් බේරුණේ, තව පොඩ්ඩෙන් මාත් ඉවරයි!',
  'Aparade thawa thapparayak hitiya nam loku ganak, kamak na ilaga eke gamu.',
  'වෙලාවට කලින් පැන්න අයට සුබ පැතුම්! ඊළඟ එකට ලෑස්ති වෙමු.',
  'හැම වටේම එක වගේ යන්නේ නෑනේ, මොළේ පාවිච්චි කරලා ගහමු.',
  'ගිය වටයේ වැඩිම දුර ගිය කෙනාට ලස්සන 100% bonus එකක් සෙට් වුණා.',
  'Salli tika welawata cashout karaganna eka thamai lokuma දක්ෂතාවය.',
  'එක රවුන්ඩ් එකක් මිස් වුණාට සැලෙන්න එපා, පොඩි ගානකින් ආයේ අල්ලමු.',
  'That burst caught me off guard, good thing Deck 1 auto-cashed out.',
  'බැලූනය පිපිරෙන්න කලින් පැන්න අයගේ නම් ටික දැක්කද? සුපිරි!',
  'Ilaga round eke nam man 1.60x waladima paninawa sure ekatama.',
  'දිනුමයි පැරදුමයි දෙකම තියෙනවා, ලිමිට් එකක් තියාගෙන සෙල්ලම් කරමු මචංලා.',
  'Nice round everyone, let us see what the next flight brings!',
];

export class LiveChatBotService {
  // Start with a calm 20s-32s delay before any ambient message
  private lastPeriodicChatTime = Date.now();
  private nextDelayMs = 22000 + Math.random() * 14000;
  private recentBotIds: string[] = [];
  private usedMessagesSet: Set<string> = new Set();
  private lastBotReplyTimestamp = 0;
  private isReplyPending = false;

  constructor() {
    try {
      const saved = localStorage.getItem(USED_MESSAGES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            if (typeof item === 'string') {
              this.usedMessagesSet.add(item);
            }
          });
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/@\S+/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }

  private isMessageUsed(text: string, recentMessages: ChatMessage[] = []): boolean {
    const norm = this.normalizeText(text);
    if (!norm) return true;
    if (this.usedMessagesSet.has(norm)) return true;

    for (const m of recentMessages) {
      const existingNorm = this.normalizeText(m.text);
      if (existingNorm === norm) return true;
      // Also prevent near-duplicate substrings (first 28 chars matching)
      if (norm.length > 26 && existingNorm.length > 26 && norm.slice(0, 26) === existingNorm.slice(0, 26)) {
        return true;
      }
    }
    return false;
  }

  private markMessageUsed(text: string): void {
    const norm = this.normalizeText(text);
    if (!norm) return;
    this.usedMessagesSet.add(norm);
    try {
      const arr = Array.from(this.usedMessagesSet).slice(-350);
      localStorage.setItem(USED_MESSAGES_STORAGE_KEY, JSON.stringify(arr));
    } catch {
      // ignore
    }
  }

  public getBotByNameOrId(identifier?: string): BotProfile | undefined {
    if (!identifier) return undefined;
    const clean = identifier.replace(/^@/, '').toLowerCase();
    return BOT_COMMUNITY.find(
      (b) => b.id.toLowerCase() === clean || b.name.toLowerCase() === clean
    );
  }

  public getUniqueBot(excludeId?: string): BotProfile {
    const available = BOT_COMMUNITY.filter(
      (b) => b.id !== excludeId && !this.recentBotIds.includes(b.id)
    );
    const pool = available.length > 0 ? available : BOT_COMMUNITY;
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    this.recentBotIds.push(chosen.id);
    if (this.recentBotIds.length > 14) {
      this.recentBotIds.shift();
    }
    return chosen;
  }

  private pickUnusedFromPool(pool: string[], recentMessages: ChatMessage[]): string | null {
    const unused = pool.filter((candidate) => !this.isMessageUsed(candidate, recentMessages));
    if (unused.length === 0) return null;
    const picked = unused[Math.floor(Math.random() * unused.length)];
    this.markMessageUsed(picked);
    return picked;
  }

  /**
   * Call backend Gemini LLM (/api/chat/llm) with strict non-repetition check
   */
  private async requestLLMText(params: {
    mode: 'public_reply' | 'private_dm' | 'ambient_chat';
    userMessage?: string;
    senderName?: string;
    bot: BotProfile;
    replyToText?: string;
    gameStatus: GameStatus;
    multiplier: number;
    lastRoundWinner?: RoundBonusWinner | null;
    recentMessages: ChatMessage[];
  }): Promise<string | null> {
    try {
      const res = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: params.mode,
          userMessage: params.userMessage || '',
          senderName: params.senderName || 'Pilot',
          botName: params.bot.name,
          botAvatar: params.bot.avatar,
          replyToText: params.replyToText || '',
          gameStatus: params.gameStatus,
          multiplier: params.multiplier,
          lastRoundWinner: params.lastRoundWinner || null,
          recentMessages: params.recentMessages.slice(-16).map((m) => ({
            username: m.username,
            text: m.text,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.text && typeof data.text === 'string') {
          const clean = data.text.trim();
          if (clean && !this.isMessageUsed(clean, params.recentMessages)) {
            this.markMessageUsed(clean);
            return clean;
          }
        }
      }
    } catch {
      // Fallback below
    }

    return this.synthesizeSmartFallback(params);
  }

  /**
   * Non-repeating fallback synthesizer: never reuses a sentence that was already sent
   */
  private synthesizeSmartFallback(params: {
    mode: 'public_reply' | 'private_dm' | 'ambient_chat';
    userMessage?: string;
    senderName?: string;
    bot: BotProfile;
    replyToText?: string;
    gameStatus: GameStatus;
    multiplier: number;
    lastRoundWinner?: RoundBonusWinner | null;
    recentMessages: ChatMessage[];
  }): string | null {
    const q = (params.userMessage || '').trim();
    const lower = q.toLowerCase();
    const sender = params.senderName || 'මචං';
    const isDM = params.mode === 'private_dm';
    const prefix = isDM ? '' : `@${sender} `;
    const winner = params.lastRoundWinner;

    if (params.mode === 'ambient_chat') {
      const pool =
        params.gameStatus === 'WAITING'
          ? UNIQUE_WAITING_POOL
          : params.gameStatus === 'FLYING'
          ? UNIQUE_FLYING_POOL
          : UNIQUE_BURST_POOL;
      return this.pickUnusedFromPool(pool, params.recentMessages);
    }

    // Check if the user asked a math / arithmetic question
    const mathMatch = q.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/xX])\s*(\d+(?:\.\d+)?)/);
    if (mathMatch) {
      const a = parseFloat(mathMatch[1]);
      const op = mathMatch[2].toLowerCase();
      const b = parseFloat(mathMatch[3]);
      let ans = 0;
      if (op === '+') ans = a + b;
      else if (op === '-') ans = a - b;
      else if (op === '*' || op === 'x') ans = a * b;
      else if (op === '/' && b !== 0) ans = Number((a / b).toFixed(2));
      const candidate = `${prefix}${a} ${op} ${b} = ${ans.toLocaleString()} මචං!`;
      if (!this.isMessageUsed(candidate, params.recentMessages)) {
        this.markMessageUsed(candidate);
        return candidate;
      }
    }

    // Candidate responses based on topic, each distinct so none ever repeats
    const candidates: string[] = [];

    if (
      lower.includes('deposit') ||
      lower.includes('withdraw') ||
      lower.includes('bonus') ||
      lower.includes('බෝනස්') ||
      lower.includes('ඩිපොසිට්') ||
      lower.includes('විත්ඩ්‍රෝ') ||
      lower.includes('සල්ලි') ||
      lower.includes('agent')
    ) {
      candidates.push(
        `${prefix}පළවෙනි Deposit එකට විතරක් 100% Bonus එකක් ලැබෙනවා මචං, ඒකෙන් bet කරලා දිනන profit එක කෙලින්ම withdraw කරන්න පුළුවන්.`,
        `${prefix}Cash Agent හරහා විනාඩි දෙකෙන් deposit සහ withdraw ගන්න පුළුවන්, Cashier එකෙන් Cash Agent තෝරන්න.`,
        `${prefix}1st deposit bonus මුදල කෙලින්ම ගන්න බැරි වුණාට ඒකෙන් play කරලා එන ලාභය ඕනෑම වෙලාවක withdraw කරන්න පුළුවන්.`,
        `${prefix}Bank Transfer හෝ නිල Cash Agent හරහා ඉක්මනින්ම මුදල් තැන්පත් කරන්නත් ආපසු ගන්නත් පුළුවන්.`
      );
    } else if (
      lower.includes('kawuda') ||
      lower.includes('කවුද') ||
      lower.includes('who') ||
      lower.includes('last round') ||
      lower.includes('දුර') ||
      lower.includes('dura')
    ) {
      if (winner) {
        candidates.push(
          `${prefix}ගිය වටයේ (#${winner.roundNumber}) වැඩිම දුර ගියේ ${winner.username} (${winner.multiplier.toFixed(2)}x), එයාට +Rs. ${winner.bonusAmount.toLocaleString()} ක 100% බෝනස් එකක් ලැබුණා!`,
          `${prefix}${winner.username} තමයි ගිය පාර ${winner.multiplier.toFixed(2)}x වෙනකම් ගිහින් 100% Longest Flight බෝනස් එක දිනාගත්තේ.`
        );
      }
      candidates.push(
        `${prefix}හැම වටයකම වැඩිම multiplier එකකදී cashout කරන කෙනාට දිනන මුදලින් 100%ක්ම අමතරව balance එකට ලැබෙනවා.`
      );
    } else if (
      lower.includes('kohomada') ||
      lower.includes('කොහොමද') ||
      lower.includes('how') ||
      lower.includes('tip') ||
      lower.includes('win') ||
      lower.includes('දිනන්න') ||
      lower.includes('strategy') ||
      lower.includes('mokakda') ||
      lower.includes('මොකක්ද') ||
      lower.includes('?')
    ) {
      candidates.push(
        `${prefix}හොඳම දේ තමයි Deck 1 එක 1.80x වගේ safe auto-cashout දාලා, Deck 2 එකෙන් වැඩි දුරක් යන්න try කරන එක.`,
        `${prefix}එකපාර ලොකු ගණන් දාන්නේ නැතුව බැලන්ස් එකෙන් පොඩි ප්‍රතිශතයක් දාලා steady profit එකක් ගන්න බලන්න.`,
        `${prefix}මම නම් කරන්නේ මුල් ඔට්ටුවෙන් දාපු ගාන ආවරණය කරගෙන දෙවැනි ඔට්ටුව ලොකු multiplier එකකට තියාගන්න එකයි.`,
        `${prefix}Auto cashout පාවිච්චි කරනකොට internet slow වුණත් හරියටම ගානට පැරෂුට් එකෙන් පනිනවා මචං.`
      );
    } else if (
      lower.includes('hi') ||
      lower.includes('hello') ||
      lower.includes('hey') ||
      lower.includes('හායි') ||
      lower.includes('හලෝ') ||
      lower.includes('machan') ||
      lower.includes('මචං') ||
      lower.includes('gm') ||
      lower.includes('ගුඩ්')
    ) {
      candidates.push(
        `${prefix}හලෝ මචං! සාදරයෙන් පිළිගන්නවා, අද හොඳ profit එකක් ගමු 🚀`,
        `${prefix}හායි! කොහොමද අද සෙල්ලම, හොඳ multipliers ටිකක් අල්ලගත්තද?`,
        `${prefix}එල මචං! අපිත් මේ ඊළඟ flight එක දිහා බලාගෙන ඉන්නේ.`,
        `${prefix}Hello bro! Good luck on the next flight, jump safe 🪂`
      );
    } else {
      candidates.push(
        `${prefix}අනිවාර්යයෙන්ම මචං, කලබල නැතුව වෙලාවට cashout කරගත්තොත් හොඳ ගානක් හොයාගන්න පුළුවන්.`,
        `${prefix}එල කතාව! බලමු මේ වටයේ කොච්චර උඩට බැලූනය යයිද කියලා.`,
        `${prefix}හරියටම හරි, ඉවසීමෙන් play කරන අයට තමයි දිගටම දිනන්න පුළුවන්.`,
        `${prefix}ඔව් මචං, මමත් මේ round එකේ පොඩි වෙනසක් කරලා බලන්න හිතන් ඉන්නේ.`,
        `${prefix}සිරාවටම! වෙලාවට පැරෂුට් එකෙන් පනින එක තමයි වැදගත්ම දේ.`
      );
    }

    return this.pickUnusedFromPool(candidates, params.recentMessages);
  }

  /**
   * Periodic ambient chat (slow, natural, never repeats)
   */
  public async checkPeriodicChat(
    status: GameStatus,
    multiplier: number,
    recentMessages: ChatMessage[],
    lastRoundWinner: RoundBonusWinner | null,
    onNewMessage: (msg: ChatMessage) => void
  ) {
    const now = Date.now();
    if (now - this.lastPeriodicChatTime < this.nextDelayMs) return;

    this.lastPeriodicChatTime = now;
    // Calm, realistic cadence: 22s to 38s so chat never floods or repeats
    this.nextDelayMs = 22000 + Math.random() * 16000;

    const bot = this.getUniqueBot();
    const text = await this.requestLLMText({
      mode: 'ambient_chat',
      bot,
      gameStatus: status,
      multiplier,
      lastRoundWinner,
      recentMessages,
    });

    if (text) {
      const msg: ChatMessage = {
        id: `bot_chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: bot.id,
        username: bot.name,
        avatar: bot.avatar,
        role: 'player',
        text,
        timestamp: Date.now(),
      };
      onNewMessage(msg);
    }
  }

  /**
   * Delayed (10s+) & Selective LLM-powered reply when a user sends a message in Public Live Chat
   * - Does NOT reply to every message ("අපි දාන හැම massage එකටම reply ඕන නැහැ")
   * - Waits 10 seconds or more before replying ("තත්පර 10ක හෝ ඊට වැඩි delay එකක් දාන්න")
   */
  public handleUserMessageReply(
    userText: string,
    currentUser: User,
    replyTo: ChatReplyTarget | undefined,
    gameStatus: GameStatus,
    multiplier: number,
    recentMessages: ChatMessage[],
    lastRoundWinner: RoundBonusWinner | null,
    onNewMessage: (msg: ChatMessage) => void,
    onTypingChange?: (typingBot: { username: string; avatar: string } | null) => void
  ) {
    // 1. If the user explicitly replied to another REAL user (not in BOT_COMMUNITY), let the real user reply—do not trigger a bot!
    if (replyTo && !this.getBotByNameOrId(replyTo.username)) {
      return;
    }

    // 2. Do NOT reply to every message!
    // Skip if a reply is already pending or if a bot replied within the last 22 seconds
    const now = Date.now();
    if (this.isReplyPending || now - this.lastBotReplyTimestamp < 22000) {
      return;
    }

    const isDirectQuestionOrMention =
      userText.includes('?') ||
      userText.includes('@') ||
      Boolean(replyTo) ||
      /kohomada|කොහොමද|kawuda|කවුද|mokakda|මොකක්ද|bonus|බෝනස්|deposit|withdraw/i.test(userText);

    // Even when not on cooldown: reply to ~55% of direct questions/mentions, and only ~25% of general comments
    const replyProbability = isDirectQuestionOrMention ? 0.55 : 0.25;
    if (Math.random() > replyProbability) {
      return;
    }

    this.isReplyPending = true;

    const matchedBot =
      (replyTo && this.getBotByNameOrId(replyTo.username)) ||
      this.getUniqueBot();

    const startTime = Date.now();

    // Wait 7.5s to 10.0s before showing typing indicator
    const readingDelay = 7500 + Math.random() * 2500;
    // Deliver actual reply after 10.5s to 15.5s (strictly >= 10 seconds!)
    const minTotalDelay = 10500 + Math.random() * 5000;

    const typingTimer = setTimeout(() => {
      onTypingChange?.({ username: matchedBot.name, avatar: matchedBot.avatar });
    }, readingDelay);

    this.requestLLMText({
      mode: 'public_reply',
      userMessage: userText,
      senderName: currentUser.username,
      bot: matchedBot,
      replyToText: replyTo?.text,
      gameStatus,
      multiplier,
      lastRoundWinner,
      recentMessages,
    }).then((replyText) => {
      if (!replyText) {
        clearTimeout(typingTimer);
        onTypingChange?.(null);
        this.isReplyPending = false;
        return;
      }

      const elapsed = Date.now() - startTime;
      const remainingWait = Math.max(1000, minTotalDelay - elapsed);

      setTimeout(() => {
        onTypingChange?.(null);
        this.isReplyPending = false;
        this.lastBotReplyTimestamp = Date.now();

        const replyMsg: ChatMessage = {
          id: `bot_reply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: matchedBot.id,
          username: matchedBot.name,
          avatar: matchedBot.avatar,
          role: 'player',
          text: replyText,
          timestamp: Date.now(),
          replyTo: {
            id: `usr_${startTime}`,
            username: currentUser.username,
            text: userText,
          },
        };
        onNewMessage(replyMsg);
      }, remainingWait);
    });
  }

  /**
   * Dedicated 1-on-1 Private Chat response with 10s+ natural delay
   */
  public handlePrivateChatMessage(
    targetBot: BotProfile,
    userText: string,
    currentUser: User,
    replyTo: ChatReplyTarget | undefined,
    gameStatus: GameStatus,
    multiplier: number,
    privateHistory: ChatMessage[],
    lastRoundWinner: RoundBonusWinner | null,
    onNewPrivateMessage: (msg: ChatMessage) => void,
    onTypingChange?: (typingBot: { username: string; avatar: string } | null) => void
  ) {
    // If target is a real registered user (not a bot), do not generate a bot reply!
    if (targetBot.isRealUser || !this.getBotByNameOrId(targetBot.id)) {
      return;
    }

    const startTime = Date.now();
    // 7.0s to 9.5s before typing indicator, 10.5s to 14.5s total reply delay
    const readingDelay = 7000 + Math.random() * 2500;
    const minTotalDelay = 10500 + Math.random() * 4000;

    const typingTimer = setTimeout(() => {
      onTypingChange?.({ username: targetBot.name, avatar: targetBot.avatar });
    }, readingDelay);

    this.requestLLMText({
      mode: 'private_dm',
      userMessage: userText,
      senderName: currentUser.username,
      bot: targetBot,
      replyToText: replyTo?.text,
      gameStatus,
      multiplier,
      lastRoundWinner,
      recentMessages: privateHistory,
    }).then((replyText) => {
      if (!replyText) {
        clearTimeout(typingTimer);
        onTypingChange?.(null);
        return;
      }

      const elapsed = Date.now() - startTime;
      const remainingWait = Math.max(1000, minTotalDelay - elapsed);

      setTimeout(() => {
        onTypingChange?.(null);
        const dmReply: ChatMessage = {
          id: `dm_reply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: targetBot.id,
          username: targetBot.name,
          avatar: targetBot.avatar,
          role: 'player',
          text: replyText,
          timestamp: Date.now(),
          recipientId: currentUser.id,
          replyTo: replyTo
            ? { id: replyTo.id, username: replyTo.username, text: replyTo.text }
            : undefined,
        };
        onNewPrivateMessage(dmReply);
      }, remainingWait);
    });
  }
}

export const liveChatBotService = new LiveChatBotService();
