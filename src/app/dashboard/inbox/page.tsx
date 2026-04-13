"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, Search, Globe, Camera, MessageCircle, MoreHorizontal, CheckCheck, Clock } from "lucide-react";

type Platform = "All" | "Facebook" | "Instagram" | "WhatsApp";
type MsgStatus = "unread" | "read" | "replied";

interface Message {
  id: number;
  platform: "Facebook" | "Instagram" | "WhatsApp";
  sender: string;
  avatar: string;
  adName?: string;
  preview: string;
  time: string;
  status: MsgStatus;
  unreadCount?: number;
  thread: { from: "them" | "you"; text: string; time: string }[];
}

const messages: Message[] = [
  {
    id: 1,
    platform: "WhatsApp",
    sender: "Ahmed Raza",
    avatar: "AR",
    preview: "Bhai price kya hai neck massager ka? COD milega?",
    time: "2 min ago",
    status: "unread",
    unreadCount: 2,
    thread: [
      { from: "them", text: "Assalam o Alaikum, neck massager available hai?", time: "10:42 AM" },
      { from: "them", text: "Bhai price kya hai? COD milega?", time: "10:44 AM" },
    ],
  },
  {
    id: 2,
    platform: "Facebook",
    sender: "Sara Khan",
    avatar: "SK",
    adName: "Neck Massager – Pain Relief Ad",
    preview: "Does this work for lower back pain too?",
    time: "8 min ago",
    status: "unread",
    unreadCount: 1,
    thread: [
      { from: "them", text: "Does this work for lower back pain too? I have chronic back pain.", time: "10:38 AM" },
    ],
  },
  {
    id: 3,
    platform: "Instagram",
    sender: "Fatima M.",
    avatar: "FM",
    adName: "LED Desk Lamp – Home Office",
    preview: "Can I get it in black? Your ad only shows white.",
    time: "15 min ago",
    status: "read",
    thread: [
      { from: "them", text: "Can I get it in black? Your ad only shows white.", time: "10:31 AM" },
      { from: "you",  text: "Yes! We have it in black and white both. DM us your address for the order 😊", time: "10:33 AM" },
      { from: "them", text: "Perfect, sending DM now!", time: "10:34 AM" },
    ],
  },
  {
    id: 4,
    platform: "WhatsApp",
    sender: "Usman Ali",
    avatar: "UA",
    preview: "Order ID #2341 ka tracking number chahiye",
    time: "22 min ago",
    status: "replied",
    thread: [
      { from: "them", text: "Order ID #2341 ka tracking number chahiye please", time: "10:24 AM" },
      { from: "you",  text: "Aapka order dispatch ho gaya hai. Tracking: TCS-PK-8834721. 2-3 din mein deliver hoga inshallah!", time: "10:26 AM" },
    ],
  },
  {
    id: 5,
    platform: "Facebook",
    sender: "Hamid Tariq",
    avatar: "HT",
    adName: "Posture Corrector – Back Pain",
    preview: "How long does delivery take to Lahore?",
    time: "1 hr ago",
    status: "read",
    thread: [
      { from: "them", text: "How long does delivery take to Lahore?", time: "9:46 AM" },
      { from: "you",  text: "Lahore mein 1-2 business days mein deliver ho jata hai!", time: "9:50 AM" },
    ],
  },
  {
    id: 6,
    platform: "Instagram",
    sender: "Zainab S.",
    avatar: "ZS",
    adName: "Wireless Charger – TikTok Trend",
    preview: "Is it compatible with Samsung S24?",
    time: "2 hr ago",
    status: "replied",
    thread: [
      { from: "them", text: "Is it compatible with Samsung S24?", time: "8:55 AM" },
      { from: "you",  text: "Yes, fully compatible with Samsung S24 and all Qi-enabled phones!", time: "9:02 AM" },
      { from: "them", text: "Great, ordered!", time: "9:05 AM" },
    ],
  },
];

const platformIcon: Record<string, React.ElementType> = {
  Facebook: Globe,
  Instagram: Camera,
  WhatsApp: MessageCircle,
};

const platformColor: Record<string, string> = {
  Facebook: "text-blue-600",
  Instagram: "text-pink-600",
  WhatsApp: "text-emerald-600",
};

const platformBg: Record<string, string> = {
  Facebook: "bg-blue-50",
  Instagram: "bg-pink-50",
  WhatsApp: "bg-emerald-50",
};

const quickReplies = [
  "COD available hai, address bhejein!",
  "Delivery 2-3 din mein ho jati hai.",
  "Price DM mein bhej deta hoon.",
  "Stock available hai, order place karein.",
  "Tracking number bhej deta hoon abhi.",
  "Yes, compatible hai aapke phone se!",
];

export default function InboxPage() {
  const [platform, setPlatform] = useState<Platform>("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number>(messages[0].id);
  const [reply, setReply] = useState("");
  const [threadMessages, setThreadMessages] = useState<Record<number, Message["thread"]>>(
    Object.fromEntries(messages.map(m => [m.id, m.thread]))
  );

  const platforms: Platform[] = ["All", "Facebook", "Instagram", "WhatsApp"];

  const filtered = messages.filter(m =>
    (platform === "All" || m.platform === platform) &&
    (search === "" || m.sender.toLowerCase().includes(search.toLowerCase()) || m.preview.toLowerCase().includes(search.toLowerCase()))
  );

  const selected = messages.find(m => m.id === selectedId)!;
  const currentThread = threadMessages[selectedId] || [];

  function sendReply() {
    if (!reply.trim()) return;
    setThreadMessages(prev => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), { from: "you", text: reply.trim(), time: "Now" }],
    }));
    setReply("");
  }

  const unreadTotal = messages.filter(m => m.status === "unread").length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Social Inbox" />
      <main className="flex-1 overflow-hidden flex">

        {/* Left: Message List */}
        <div className="w-72 shrink-0 border-r border-gray-200 flex flex-col bg-white">
          {/* Search + filters */}
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {platforms.map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    platform === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>{p}</button>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-xs text-gray-500">{filtered.length} conversations</span>
            {unreadTotal > 0 && (
              <span className="text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5 font-medium">{unreadTotal} new</span>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filtered.map(m => {
              const Icon = platformIcon[m.platform];
              const isSelected = m.id === selectedId;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full text-left px-3 py-3 hover:bg-gray-50 transition-colors ${isSelected ? "bg-blue-50 border-r-2 border-blue-600" : ""}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                        {m.avatar}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${platformBg[m.platform]} flex items-center justify-center`}>
                        <Icon className={`w-2 h-2 ${platformColor[m.platform]}`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-medium truncate ${m.status === "unread" ? "text-gray-900" : "text-gray-600"}`}>
                          {m.sender}
                        </p>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-1">{m.time}</span>
                      </div>
                      {m.adName && <p className="text-[10px] text-blue-600 truncate">{m.adName}</p>}
                      <p className="text-[11px] text-gray-400 truncate">{m.preview}</p>
                    </div>
                    {m.unreadCount && (
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center shrink-0">
                        {m.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Thread */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selected ? (
            <>
              {/* Thread header */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                    {selected.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{selected.sender}</p>
                      <Badge variant={
                        selected.platform === "Facebook" ? "blue" :
                        selected.platform === "Instagram" ? "purple" : "success"
                      }>
                        {selected.platform}
                      </Badge>
                    </div>
                    {selected.adName && (
                      <p className="text-xs text-gray-400">Via ad: {selected.adName}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={
                    selected.status === "replied" ? "success" :
                    selected.status === "unread" ? "blue" : "default"
                  }>
                    {selected.status === "replied" ? "Replied" : selected.status === "unread" ? "New" : "Read"}
                  </Badge>
                  <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 cursor-pointer">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {currentThread.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === "you" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm ${
                      msg.from === "you"
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}>
                      <p className="leading-relaxed">{msg.text}</p>
                      <div className={`flex items-center gap-1 mt-1 ${msg.from === "you" ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[10px] ${msg.from === "you" ? "text-blue-200" : "text-gray-400"}`}>{msg.time}</span>
                        {msg.from === "you" && <CheckCheck className="w-3 h-3 text-blue-200" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick replies */}
              <div className="px-4 py-2 border-t border-gray-100 bg-white">
                <p className="text-xs text-gray-400 mb-1.5">Quick replies</p>
                <div className="flex gap-1.5 flex-wrap">
                  {quickReplies.map(qr => (
                    <button key={qr} onClick={() => setReply(qr)}
                      className="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full px-2.5 py-1 cursor-pointer transition-colors truncate max-w-[160px]">
                      {qr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply box */}
              <div className="px-4 py-3 bg-white border-t border-gray-200">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }}}
                      placeholder={`Reply to ${selected.sender} via ${selected.platform}...`}
                      rows={2}
                      className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                  <Button onClick={sendReply} disabled={!reply.trim()} size="md">
                    <Send className="w-4 h-4" />
                    Send
                  </Button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Avg. response time: 4 min · Enter to send, Shift+Enter for new line
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Select a conversation
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
