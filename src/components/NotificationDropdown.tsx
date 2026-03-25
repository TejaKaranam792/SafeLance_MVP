"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, MessageSquare, DollarSign, Briefcase, CheckCircle2, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { useWallet } from "./WalletContext";

type NotificationType = 'message' | 'payment' | 'job' | 'system';

interface AppNotification {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  read: boolean;
  time: string;
  link?: string;
}

function formatTimeDiff(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationDropdown() {
  const { account } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!account) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?address=${account}`);
      if (res.ok) {
        let data: AppNotification[] = await res.json();
        const dismissedStr = localStorage.getItem(`notifications_read_${account}`);
        const dismissedIds: string[] = dismissedStr ? JSON.parse(dismissedStr) : [];
        
        data = data.map((n) => ({
          ...n,
          read: dismissedIds.includes(n.id)
        }));
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [account]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    if (!account) return;
    const allIds = notifications.map(n => n.id);
    localStorage.setItem(`notifications_read_${account}`, JSON.stringify(allIds));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    if (!account) return;
    const dismissedStr = localStorage.getItem(`notifications_read_${account}`);
    const dismissedIds: string[] = dismissedStr ? JSON.parse(dismissedStr) : [];
    if (!dismissedIds.includes(id)) {
      dismissedIds.push(id);
      localStorage.setItem(`notifications_read_${account}`, JSON.stringify(dismissedIds));
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'message': return <MessageSquare className="h-4 w-4 text-blue-400" />;
      case 'payment': return <DollarSign className="h-4 w-4 text-green-400" />;
      case 'job': return <Briefcase className="h-4 w-4 text-purple-400" />;
      case 'system': return <Info className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-[#0a0a0c]"></span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-white/10 bg-[#0a0a0c]/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50 transform origin-top-right transition-all">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
              >
                <CheckCircle2 className="h-3 w-3" />
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-8 flex justify-center items-center text-zinc-500 text-sm">
                <Loader2 className="animate-spin h-4 w-4 mr-2" /> Fetching updates...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                No notifications yet.
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`flex items-start gap-3 p-4 transition-colors hover:bg-white/5 border-b border-white/5 last:border-0 cursor-pointer ${notification.read ? 'opacity-70' : 'bg-white/[0.02]'}`}
                  >
                    <div className={`mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border ${notification.read ? 'border-white/10 bg-white/5' : 'border-purple-500/20 bg-purple-500/10'}`}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${notification.read ? 'text-zinc-300' : 'text-white'}`}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-zinc-500 whitespace-nowrap">
                          {formatTimeDiff(notification.time)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                        {notification.description}
                      </p>
                      {notification.link && (
                        <Link 
                          href={notification.link}
                          className="mt-2 inline-block text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
                          onClick={() => setIsOpen(false)}
                        >
                          View details &rarr;
                        </Link>
                      )}
                    </div>
                    {!notification.read && (
                      <div className="mt-2 flex-shrink-0">
                        <span className="block h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-white/10 bg-white/5 text-center">
            <button className="text-xs font-medium text-zinc-400 hover:text-white transition-colors w-full p-2">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
