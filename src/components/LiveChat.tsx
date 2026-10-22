import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatReplyTarget, GameStatus, RoundBonusWinner, User } from '../types/game';
import { BOT_COMMUNITY, BotProfile, liveChatBotService } from '../services/liveChatBotService';
import { getUsers } from '../services/storage';
import {
  MessageSquare,
  Send,
  Sparkles,
  Reply,
  X,
  Users,
  ArrowLeft,
  Lock,
  UserCheck,
} from 'lucide-react';

interface LiveChatProps {
  messages: ChatMessage[];
  currentUser: User;
  gameStatus?: GameStatus;
  currentMultiplier?: number;
  lastRoundWinner?: RoundBonusWinner | null;
  selectedPrivateBot?: BotProfile | null;
  onSelectPrivateBot?: (bot: BotProfile | null) => void;
  typingUser?: { username: string; avatar: string } | null;
  onSendMessage: (text: string, replyTo?: ChatReplyTarget, recipientId?: string) => void;
}

export const LiveChat: React.FC<LiveChatProps> = ({
  messages,
  currentUser,
  gameStatus = 'WAITING',
  currentMultiplier = 1.0,
  lastRoundWinner = null,
  selectedPrivateBot: externalPrivateBot,
  onSelectPrivateBot,
  typingUser,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatReplyTarget | null>(null);

  // Mode: 'public' (Live Chat) | 'directory' (Pick a player) | 'private' (1-on-1 Private Chat away from Live Chat)
  const [viewMode, setViewMode] = useState<'public' | 'directory' | 'private'>('public');
  const [activePrivateBot, setActivePrivateBot] = useState<BotProfile | null>(null);
  const [privateThreads, setPrivateThreads] = useState<Record<string, ChatMessage[]>>({});
  const [privateTypingBot, setPrivateTypingBot] = useState<{ username: string; avatar: string } | null>(null);

  const feedContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync external selection (e.g. if user clicked a player in LiveBetsList)
  useEffect(() => {
    if (externalPrivateBot) {
      openPrivateChatWith(externalPrivateBot);
    }
  }, [externalPrivateBot]);

  const publicMessages = messages.filter((m) => !m.recipientId);

  const getPrivateMessagesForTarget = (target: BotProfile): ChatMessage[] => {
    const localThread = privateThreads[target.id] || [];
    const syncedDms = messages.filter(
      (m) =>
        (m.userId === currentUser.id && m.recipientId === target.id) ||
        (m.userId === target.id && m.recipientId === currentUser.id)
    );
    const mergedMap = new Map<string, ChatMessage>();
    [...localThread, ...syncedDms].forEach((m) => mergedMap.set(m.id, m));
    return Array.from(mergedMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  };

  const currentFeedMessages =
    viewMode === 'private' && activePrivateBot
      ? getPrivateMessagesForTarget(activePrivateBot)
      : publicMessages;

  useEffect(() => {
    const el = feedContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [currentFeedMessages.length, viewMode, typingUser, privateTypingBot]);

  const openPrivateChatWith = (bot: BotProfile) => {
    setActivePrivateBot(bot);
    setViewMode('private');
    setReplyingTo(null);
    onSelectPrivateBot?.(bot);

    // If chatting with a community bot, seed a friendly welcome if empty
    if (!bot.isRealUser && liveChatBotService.getBotByNameOrId(bot.id)) {
      setPrivateThreads((prev) => {
        if (prev[bot.id] && prev[bot.id].length > 0) return prev;
        const welcomeMsg: ChatMessage = {
          id: `dm_init_${bot.id}`,
          userId: bot.id,
          username: bot.name,
          avatar: bot.avatar,
          role: 'player',
          text: `හලෝ ${currentUser.username}! මම ${bot.name} ${bot.avatar}. අපි දැන් Live Chat එකෙන් අයින් වෙලා පෞද්ගලිකව (1-on-1) කතා කරන්නේ. ඔයාට අහන්න තියෙන ඕනෑම දෙයක් අහන්න!`,
          timestamp: Date.now(),
          recipientId: currentUser.id,
        };
        return {
          ...prev,
          [bot.id]: [welcomeMsg],
        };
      });
    }
  };

  const handleLeavePrivateChat = () => {
    setViewMode('public');
    setActivePrivateBot(null);
    setReplyingTo(null);
    onSelectPrivateBot?.(null);
  };

  const handleClickPlayerInChat = (msg: ChatMessage) => {
    if (msg.userId === currentUser.id || msg.userId === 'sys') return;
    const communityBot =
      liveChatBotService.getBotByNameOrId(msg.userId) ||
      liveChatBotService.getBotByNameOrId(msg.username);
    const found: BotProfile = communityBot || {
      id: msg.userId,
      name: msg.username,
      avatar: msg.avatar || '🪂',
      color: '#10B981',
      statusText: 'Real Player • 1-on-1 Private Chat',
      isRealUser: true,
    };
    openPrivateChatWith(found);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const currentReply = replyingTo || undefined;
    setInputText('');
    setReplyingTo(null);

    if (viewMode === 'private' && activePrivateBot) {
      // Broadcast private DM via onSendMessage so real users receive it across tabs/devices
      onSendMessage(trimmed, currentReply, activePrivateBot.id);

      const myDm: ChatMessage = {
        id: `dm_usr_${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
        role: currentUser.role,
        text: trimmed,
        timestamp: Date.now(),
        recipientId: activePrivateBot.id,
        replyTo: currentReply,
      };

      const updatedThread = [...getPrivateMessagesForTarget(activePrivateBot), myDm];
      setPrivateThreads((prev) => ({
        ...prev,
        [activePrivateBot.id]: updatedThread,
      }));

      liveChatBotService.handlePrivateChatMessage(
        activePrivateBot,
        trimmed,
        currentUser,
        currentReply,
        gameStatus,
        currentMultiplier,
        updatedThread,
        lastRoundWinner,
        (botReply) => {
          setPrivateThreads((prev) => ({
            ...prev,
            [activePrivateBot.id]: [...(prev[activePrivateBot.id] || []), botReply],
          }));
        },
        (typingState) => {
          setPrivateTypingBot(typingState);
        }
      );
    } else {
      onSendMessage(trimmed, currentReply);
    }
  };

  const handleQuickEmoji = (emoji: string) => {
    if (viewMode === 'private' && activePrivateBot) {
      setInputText((prev) => `${prev}${emoji}`);
    } else {
      onSendMessage(emoji, replyingTo || undefined);
      setReplyingTo(null);
    }
  };

  // ============================================================================
  // 1. PLAYER DIRECTORY VIEW (Choose someone to Private Chat)
  // ============================================================================
  if (viewMode === 'directory') {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-2.5 flex flex-col h-full min-h-[280px] shadow-lg text-[11px]">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('public')}
            className="flex items-center gap-1 text-slate-300 hover:text-white font-bold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
            <span>Back to Live Chat</span>
          </button>
          <span className="text-[10px] font-bold text-purple-400">Select Player (1-on-1)</span>
        </div>

        <p className="text-[10px] text-slate-400 py-1.5">
          Select a player below to leave Public Live Chat and start a 1-on-1 Private Chat:
        </p>

        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
          {/* Real Registered Users */}
          {getUsers()
            .filter((u) => u.id !== currentUser.id)
            .map((realU) => {
              const profile: BotProfile = {
                id: realU.id,
                name: realU.username,
                avatar: realU.avatar || '👤',
                color: '#10B981',
                statusText: 'Verified WinxCash Player',
                isRealUser: true,
              };
              const unreadCount = getPrivateMessagesForTarget(profile).length;
              return (
                <button
                  key={realU.id}
                  type="button"
                  onClick={() => openPrivateChatWith(profile)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-emerald-950/30 hover:bg-slate-800 border border-emerald-500/30 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">{profile.avatar}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-emerald-300 block truncate">
                          {profile.name}
                        </span>
                        <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[8px] font-black uppercase">
                          User
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 block truncate">
                        {profile.statusText}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                        {unreadCount} msgs
                      </span>
                    )}
                    <span className="px-2 py-1 rounded-lg bg-emerald-600 text-slate-950 text-[10px] font-black">
                      Chat →
                    </span>
                  </div>
                </button>
              );
            })}

          {/* Community Players */}
          {BOT_COMMUNITY.map((bot) => {
            const unreadCount = getPrivateMessagesForTarget(bot).length;
            return (
              <button
                key={bot.id}
                type="button"
                onClick={() => openPrivateChatWith(bot)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800/80 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{bot.avatar}</span>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-200 block truncate">{bot.name}</span>
                    <span className="text-[9px] text-slate-400 block truncate">
                      {bot.statusText || 'Online Pilot'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[9px] font-bold">
                      {unreadCount} msgs
                    </span>
                  )}
                  <span className="px-2 py-1 rounded-lg bg-purple-600 text-white text-[10px] font-bold">
                    Chat →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. PRIVATE 1-ON-1 CHAT OR PUBLIC LIVE CHAT VIEW
  // ============================================================================
  const isPrivateMode = viewMode === 'private' && activePrivateBot !== null;
  const activeTyping = isPrivateMode ? privateTypingBot : typingUser;

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-2.5 flex flex-col h-full min-h-[280px] shadow-lg text-[11px]">
      {/* Compact Header */}
      {isPrivateMode && activePrivateBot ? (
        <div className="flex items-center justify-between pb-2 border-b border-purple-500/30 bg-purple-950/20 -mx-2.5 -mt-2.5 px-2.5 pt-2.5 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={handleLeavePrivateChat}
              title="Leave Private Chat and return to Public Live Chat"
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm shrink-0">{activePrivateBot.avatar}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h3 className="font-extrabold text-slate-100 truncate">
                  {activePrivateBot.name}
                </h3>
                <Lock className="w-2.5 h-2.5 text-purple-400 shrink-0" />
              </div>
              <span className="text-[9px] text-emerald-400 font-semibold block leading-none">
                Private 1-on-1 Chat (Left Live Chat)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setViewMode('directory')}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-[10px] font-bold transition cursor-pointer shrink-0"
            title="Switch to another player"
          >
            Switch
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0 gap-1">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
            <h3 className="font-extrabold text-slate-200">Live Chat</h3>
            <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              AI/Live
            </span>
          </div>

          <button
            type="button"
            onClick={() => setViewMode('directory')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-[10px] font-bold transition cursor-pointer"
            title="Select a person to chat privately outside Live Chat"
          >
            <Users className="w-3 h-3" />
            <span>Private Chat</span>
          </button>
        </div>
      )}

      {/* Messages Feed */}
      <div ref={feedContainerRef} className="flex-1 overflow-y-auto space-y-2 py-2 pr-0.5">
        {currentFeedMessages.map((msg, index) => {
          if (msg.isSystemWin) {
            return (
              <div
                key={`${msg.id}-${index}`}
                className="py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-500/15 to-emerald-500/15 border border-amber-500/30 text-amber-300 text-[10px] flex items-center gap-1.5 animate-fade-in"
              >
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="font-semibold">{msg.text}</span>
              </div>
            );
          }

          const isMe = msg.userId === currentUser.id;

          return (
            <div
              key={`${msg.id}-${index}`}
              className={`group flex items-start gap-1.5 text-[11px] ${
                isMe ? 'flex-row-reverse' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => handleClickPlayerInChat(msg)}
                disabled={isMe}
                title={isMe ? 'You' : `Click to Private Chat with ${msg.username}`}
                className={`text-xs shrink-0 select-none mt-0.5 ${
                  !isMe ? 'cursor-pointer hover:scale-110 transition' : ''
                }`}
              >
                {msg.avatar}
              </button>

              <div
                className={`max-w-[85%] px-2.5 py-1.5 rounded-xl relative ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : msg.role === 'admin'
                    ? 'bg-purple-950/80 border border-purple-500/40 text-purple-200 rounded-tl-none'
                    : 'bg-slate-950 border border-slate-800/80 text-slate-200 rounded-tl-none'
                }`}
              >
                {/* Header row: Username + Reply & Private DM actions */}
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <button
                    type="button"
                    onClick={() => handleClickPlayerInChat(msg)}
                    disabled={isMe}
                    className={`font-bold text-[10px] text-left truncate ${
                      isMe
                        ? 'text-blue-100'
                        : 'text-slate-400 hover:text-purple-400 cursor-pointer'
                    }`}
                    title={!isMe ? `Start 1-on-1 Private Chat with ${msg.username}` : undefined}
                  >
                    {msg.username}
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setReplyingTo({
                          id: msg.id,
                          username: msg.username,
                          text: msg.text,
                        })
                      }
                      className={`flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.2 rounded transition cursor-pointer ${
                        isMe
                          ? 'text-blue-200 hover:text-white hover:bg-blue-700'
                          : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                      }`}
                      title={`Reply to ${msg.username}`}
                    >
                      <Reply className="w-2.5 h-2.5" />
                      <span>Reply</span>
                    </button>

                    {!isMe && !isPrivateMode && msg.userId !== 'sys' && (
                      <button
                        type="button"
                        onClick={() => handleClickPlayerInChat(msg)}
                        className="text-[9px] font-bold px-1 py-0.2 rounded text-purple-400 hover:bg-purple-500/20 transition cursor-pointer"
                        title={`Private chat with ${msg.username}`}
                      >
                        DM
                      </button>
                    )}
                  </div>
                </div>

                {/* Quoted Reply Block if this message is a reply */}
                {msg.replyTo && (
                  <div
                    className={`mb-1 px-2 py-1 rounded-lg text-[9.5px] border-l-2 ${
                      isMe
                        ? 'bg-blue-700/70 border-amber-300 text-blue-100'
                        : 'bg-slate-900/90 border-purple-400 text-slate-400'
                    }`}
                  >
                    <span className="font-bold block text-[9px]">
                      ↩ @{msg.replyTo.username}
                    </span>
                    <span className="line-clamp-1 opacity-90">{msg.replyTo.text}</span>
                  </div>
                )}

                <p className="break-words leading-snug text-[11px]">{msg.text}</p>
              </div>
            </div>
          );
        })}

        {/* Natural LLM Typing Indicator (No instant replies!) */}
        {activeTyping && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-2 py-1 animate-pulse">
            <span>{activeTyping.avatar}</span>
            <span className="font-bold text-purple-400">{activeTyping.username}</span>
            <span>is typing a reply...</span>
          </div>
        )}
      </div>

      {/* Active Reply Target Preview Bar */}
      {replyingTo && (
        <div className="mb-1 px-2 py-1 rounded-lg bg-slate-950 border border-purple-500/40 flex items-center justify-between gap-2 text-[10px] animate-fade-in">
          <div className="min-w-0 flex-1">
            <span className="font-bold text-purple-400 block">
              ↩ Replying to @{replyingTo.username}
            </span>
            <span className="text-slate-400 truncate block">{replyingTo.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-0.5 text-slate-400 hover:text-rose-400 cursor-pointer"
            title="Cancel Reply"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick emoji reactions */}
      <div className="flex items-center gap-1 py-1 border-t border-slate-800/60 overflow-x-auto no-scrollbar shrink-0">
        {['🔥', '🪂', '🎈', '🚀', '💸', '🍀', '🪐', '👑'].map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleQuickEmoji(emoji)}
            className="w-6 h-6 rounded-md bg-slate-950 hover:bg-slate-800 flex items-center justify-center text-xs transition active:scale-90 shrink-0 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="pt-1.5 flex items-center gap-1.5 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isPrivateMode && activePrivateBot
              ? `Message ${activePrivateBot.name} privately...`
              : replyingTo
              ? `Reply to @${replyingTo.username}...`
              : 'Ask anything or chat with pilots...'
          }
          maxLength={220}
          className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 transition active:scale-95 cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
