import React, { useState, useMemo } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  Trophy,
  Wallet,
  Gift,
  Zap,
  Ticket,
  Megaphone,
  Send,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { User } from '../types/game';

export type NotificationCategory = 'win' | 'wallet' | 'bonus' | 'system';

export interface AppNotification {
  id: string;
  userId?: string; // undefined or 'ALL' means visible to all users
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  highlightText?: string; // e.g. "+Rs. 2,500 LKR" or "2.00x WIN"
  actionLabel?: string;
  actionTarget?: 'deposit' | 'withdraw' | 'sports' | 'game' | 'bonuses';
}

const NOTIFICATIONS_STORAGE_KEY = 'lionbet_notifications_v1';

export function getInitialNotifications(userId: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  const now = Date.now();
  const seed: AppNotification[] = [
    {
      id: 'notif_welcome_bonus',
      userId,
      category: 'bonus',
      title: '🎁 100% First Deposit Welcome Bonus',
      message:
        'Deposit LKR via any Online Cash Agent or Bank Transfer and receive a 100% matched bonus on your first deposit!',
      timestamp: now - 120000,
      read: false,
      highlightText: '+100% BONUS',
      actionLabel: 'Deposit Now',
      actionTarget: 'deposit',
    },
    {
      id: 'notif_sports_2x',
      userId,
      category: 'system',
      title: '🏏⚽ Live World Match 2x Bet Slips',
      message:
        'Every match now has its own instant Bet Slip right beside it. Win any Match Bet Slip to double your bet (2.00x Payout)!',
      timestamp: now - 300000,
      read: false,
      highlightText: '2.00x WIN',
      actionLabel: 'Open Bet Slip',
      actionTarget: 'sports',
    },
    {
      id: 'notif_longest_flight',
      userId,
      category: 'win',
      title: '🏆 100% Longest Flight Round Bonus',
      message:
        'Cash out at the highest multiplier in any Balloon Crash round to automatically receive an extra 100% win bonus!',
      timestamp: now - 600000,
      read: true,
      highlightText: '2X FLIGHT BONUS',
      actionLabel: 'Play Crash',
      actionTarget: 'game',
    },
  ];

  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(seed));
  } catch {
    // ignore
  }
  return seed;
}

export function saveNotificationsToStorage(list: AppNotification[]) {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list.slice(0, 80)));
  } catch {
    // ignore
  }
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function renderCategoryIcon(category: NotificationCategory) {
  switch (category) {
    case 'win':
      return <Trophy className="w-4 h-4 text-amber-400" />;
    case 'wallet':
      return <Wallet className="w-4 h-4 text-emerald-400" />;
    case 'bonus':
      return <Gift className="w-4 h-4 text-purple-400" />;
    default:
      return <Zap className="w-4 h-4 text-sky-400" />;
  }
}

interface ToastNotificationStackProps {
  toasts: AppNotification[];
  onDismissToast: (id: string) => void;
  onOpenCenter: () => void;
}

export const ToastNotificationStack: React.FC<ToastNotificationStackProps> = ({
  toasts,
  onDismissToast,
  onOpenCenter,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-16 right-3 sm:right-5 z-[60] flex flex-col gap-2 w-[calc(100vw-24px)] max-w-sm pointer-events-none"
    >
      {toasts.slice(0, 3).map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-3.5 shadow-2xl flex items-start gap-3 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
            {renderCategoryIcon(toast.category)}
          </div>

          <div
            onClick={() => {
              onDismissToast(toast.id);
              onOpenCenter();
            }}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-white truncate">{toast.title}</span>
              {toast.highlightText && (
                <span className="font-mono text-[10px] font-black text-emerald-400 shrink-0">
                  {toast.highlightText}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2 leading-snug">
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onDismissToast(toast.id)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onMarkOneRead: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  onClearAll: () => void;
  onSendBroadcast?: (title: string, message: string, category: NotificationCategory) => void;
  onNavigateTarget: (target: 'deposit' | 'withdraw' | 'sports' | 'game' | 'bonuses') => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  notifications,
  onMarkAllRead,
  onMarkOneRead,
  onDeleteNotification,
  onClearAll,
  onSendBroadcast,
  onNavigateTarget,
}) => {
  const [filter, setFilter] = useState<'all' | NotificationCategory>('all');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastCategory, setBroadcastCategory] = useState<NotificationCategory>('bonus');
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  const visibleNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (n.userId && n.userId !== 'ALL' && n.userId !== currentUser.id) return false;
      if (filter !== 'all' && n.category !== filter) return false;
      return true;
    });
  }, [notifications, currentUser.id, filter]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (n) => (!n.userId || n.userId === 'ALL' || n.userId === currentUser.id) && !n.read
      ).length,
    [notifications, currentUser.id]
  );

  if (!isOpen) return null;

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim() || !onSendBroadcast) return;
    onSendBroadcast(broadcastTitle.trim(), broadcastMessage.trim(), broadcastCategory);
    setBroadcastTitle('');
    setBroadcastMessage('');
    setBroadcastSuccess(true);
    setTimeout(() => setBroadcastSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-slate-900 border-t sm:border border-slate-800 w-full max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88dvh] mb-14 sm:mb-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white truncate">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="font-mono text-xs font-black text-amber-400">
                    ({unreadCount} New)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                Live alerts for Wins, 2x Bet Slips, Lucky Hour &amp; Wallet updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-emerald-400 flex items-center gap-1 cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark Read</span>
              </button>
            )}
            {visibleNotifications.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Alerts' },
            { id: 'win', label: '🏆 Wins & Slips' },
            { id: 'wallet', label: '💳 Wallet' },
            { id: 'bonus', label: '🎁 Bonuses' },
            { id: 'system', label: '🍀 Lucky Hour & System' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as 'all' | NotificationCategory)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {/* Admin Site-Wide Notification Broadcast Box */}
          {currentUser.role === 'admin' && onSendBroadcast && (
            <form
              onSubmit={handleBroadcastSubmit}
              className="bg-slate-950 border border-purple-500/40 rounded-2xl p-3.5 space-y-2.5 mb-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-purple-300 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-purple-400" />
                  <span>Admin Broadcast Notification (Send to All Players)</span>
                </span>
                {broadcastSuccess && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sent!
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Notification Title"
                  className="sm:col-span-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
                />
                <select
                  value={broadcastCategory}
                  onChange={(e) => setBroadcastCategory(e.target.value as NotificationCategory)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold"
                >
                  <option value="bonus">Bonus Alert</option>
                  <option value="system">System / Announcement</option>
                  <option value="win">Jackpot / Win Alert</option>
                  <option value="wallet">Cashier / Agent Update</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Enter announcement message for players..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          )}

          {visibleNotifications.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <Bell className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-black text-white">No Notifications</div>
              <p className="text-xs text-slate-400">
                Real-time alerts for your bets, 2x Bet Slips, Lucky Hour, and deposits will appear
                here.
              </p>
            </div>
          ) : (
            visibleNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (!item.read) onMarkOneRead(item.id);
                }}
                className={`rounded-2xl p-3.5 sm:p-4 border transition flex items-start justify-between gap-3 ${
                  item.read
                    ? 'bg-slate-950/70 border-slate-800/80 text-slate-300'
                    : 'bg-slate-950 border-amber-500/40 text-white shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {renderCategoryIcon(item.category)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        )}
                        <span className="text-xs sm:text-sm font-black text-white truncate">
                          {item.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{item.message}</p>

                    {(item.highlightText || item.actionTarget) && (
                      <div className="flex items-center justify-between gap-2 pt-1.5">
                        {item.highlightText ? (
                          <span className="text-xs font-mono font-black text-emerald-400">
                            {item.highlightText}
                          </span>
                        ) : (
                          <span />
                        )}

                        {item.actionTarget && item.actionLabel && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkOneRead(item.id);
                              onClose();
                              onNavigateTarget(item.actionTarget!);
                            }}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition cursor-pointer"
                          >
                            {item.actionLabel}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNotification(item.id);
                  }}
                  className="p-1 text-slate-500 hover:text-rose-400 rounded-lg transition cursor-pointer shrink-0"
                  title="Delete notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
