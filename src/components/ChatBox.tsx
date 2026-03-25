"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { useWallet } from "./WalletContext";

interface Message {
  id: string;
  chain_job_id: string;
  sender_address: string;
  content: string;
  created_at: string;
}

interface ChatBoxProps {
  jobId: number;
  clientAddress: string;
  freelancerAddress: string;
}

export default function ChatBox({ jobId, clientAddress, freelancerAddress }: ChatBoxProps) {
  const { account } = useWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isClient = account?.toLowerCase() === clientAddress.toLowerCase();
  const isFreelancer = account?.toLowerCase() === freelancerAddress.toLowerCase();
  const canChat = isClient || isFreelancer;

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages?jobId=${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!canChat) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [jobId, canChat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !account) return;

    const tempMsg = input.trim();
    setInput("");
    setSending(true);

    // Optimistic UI update
    const optimisticMsg: Message = {
      id: Math.random().toString(),
      chain_job_id: String(jobId),
      sender_address: account,
      content: tempMsg,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainJobId: jobId,
          senderAddress: account,
          content: tempMsg,
        }),
      });
      // Re-fetch to get actual DB generated ID and timestamp
      await fetchMessages();
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  }

  if (!canChat) {
    return null; // Only client and freelancer can view chat
  }

  return (
    <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="bg-white/5 px-6 py-4 border-b border-white/10 shrink-0">
        <h3 className="text-white font-semibold">Job Workspace Chat</h3>
        <p className="text-xs text-zinc-400 mt-0.5">End-to-end communication with your counterpart.</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sm font-medium text-white mb-1">No messages yet</p>
            <p className="text-xs text-zinc-500 max-w-[250px]">
              Say hello and discuss the project details, requirements, or timeline here.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = account.toLowerCase() === msg.sender_address.toLowerCase();
            const senderRole = msg.sender_address.toLowerCase() === clientAddress.toLowerCase() ? "Client" : "Freelancer";

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    {isMe ? "You" : senderRole}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm ${
                    isMe
                      ? "bg-violet-600 text-white rounded-br-sm"
                      : "bg-white/10 text-zinc-200 border border-white/5 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/20 shrink-0 border-t border-white/5">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-4 pr-12 py-3 text-sm text-white placeholder-zinc-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="absolute right-2 p-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 text-white transition-all flex items-center justify-center group"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
