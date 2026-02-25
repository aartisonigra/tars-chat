"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";

export default function Dashboard() {
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const storeUser = useMutation(api.users.storeUser);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [convId, setConvId] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allUsers = useQuery(api.users.listAllUsers, { search: searchTerm });
  const currentUser = useQuery(api.users.getCurrentUser);
  const startConversation = useMutation(api.conversations.getOrCreate);
  const messages = useQuery(api.messages.list, convId ? { conversationId: convId } : "skip");
  const sendMessage = useMutation(api.messages.send);

  // --- 1. Smart Timestamp Helper Function ---
  const formatSmartTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    const isToday = date.toDateString() === now.toDateString();
    const isSameYear = date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return timeStr; // આજે: 2:34 PM
    } else if (isSameYear) {
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`; // આ વર્ષે: Feb 15, 2:34 PM
    } else {
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}, ${timeStr}`; // જૂનું વર્ષ: Feb 15, 2024, 2:34 PM
    }
  };

  useEffect(() => {
    if (selectedUser) {
      startConversation({ otherUserId: selectedUser._id }).then(setConvId);
    }
  }, [selectedUser, startConversation]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isAuthenticated && user) storeUser().catch(console.error);
  }, [isAuthenticated, user, storeUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !convId || !currentUser) return;
    await sendMessage({ conversationId: convId, body: messageText, senderId: currentUser._id });
    setMessageText("");
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#1a1d21] text-blue-400 font-bold">TARS CHAT...</div>;

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 bg-[#0f1113]">
        <h1 className="text-7xl font-black text-blue-500 italic tracking-tighter shadow-blue-500/10 drop-shadow-2xl">TARS CHAT</h1>
        <SignInButton mode="modal">
          <button className="bg-blue-600 text-white px-14 py-4 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20">Get Started</button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f1113] text-gray-300 p-4 gap-4 overflow-hidden font-sans">
      
      {/* --- SIDEBAR --- */}
      <div className="w-[380px] flex flex-col bg-[#1a1d21] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-6 pb-2">
          <h1 className="text-2xl font-black text-blue-500 italic mb-6 tracking-wider">TARS CHAT</h1>
          <div className="relative mb-6">
            <span className="absolute left-4 top-3.5 text-gray-500">🔍</span>
            <input
              type="text"
              placeholder="Search interns..."
              className="w-full bg-[#26292e] p-3.5 pl-11 rounded-2xl outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm border border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Contacts</h3>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1 custom-scrollbar">
          {/* --- SIDEBAR EMPTY STATES --- */}
          {allUsers === undefined ? (
             <div className="p-10 text-center opacity-20 animate-pulse">Loading users...</div>
          ) : allUsers.length <= 1 ? (
            <div className="p-10 text-center flex flex-col items-center">
               <div className="text-4xl mb-4 opacity-20">👤</div>
               <p className="text-sm italic text-gray-500">No other users found.<br/>Try login from another account!</p>
            </div>
          ) : allUsers.filter(u => u.tokenIdentifier !== user?.externalId).length === 0 && searchTerm ? (
            <div className="p-10 text-center">
               <p className="text-sm text-gray-500 italic">No interns found matching "{searchTerm}"</p>
            </div>
          ) : (
            allUsers.map((u) => (
              u.tokenIdentifier !== user?.externalId && (
                <div
                  key={u._id}
                  onClick={() => setSelectedUser(u)}
                  className={`flex items-center gap-4 p-4 rounded-[28px] cursor-pointer transition-all duration-300 relative group ${
                    selectedUser?._id === u._id 
                    ? "bg-[#2d3239] shadow-lg border border-white/5" 
                    : "hover:bg-white/5"
                  }`}
                >
                  <div className="relative shrink-0">
                    <img src={u.image || "https://via.placeholder.com/50"} className="w-14 h-14 rounded-full border-2 border-white/5 object-cover" />
                    <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-[3px] border-[#1a1d21] rounded-full shadow-lg"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className={`font-bold truncate text-[15px] ${selectedUser?._id === u._id ? "text-white" : "text-gray-200"}`}>{u.name || "Alex Thompson"}</p>
                    </div>
                    <p className="text-[12px] text-gray-500 truncate font-medium">Click to start conversation</p>
                  </div>
                </div>
              )
            ))
          )}
        </div>
      </div>

      {/* --- CHAT AREA --- */}
      <div className="flex-1 flex flex-col bg-[#1a1d21] rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative">
        {selectedUser ? (
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a1d21]/50 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={selectedUser.image || "https://via.placeholder.com/50"} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1a1d21] rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg tracking-tight leading-none mb-1">{selectedUser.name || "Alex Thompson"}</h3>
                  <p className="text-[10px] text-green-500 font-bold tracking-widest uppercase">Online</p>
                </div>
              </div>
            </div>

            {/* Message List */}
            <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-6 custom-scrollbar bg-[#1a1d21]">
              {/* --- MESSAGES EMPTY STATE --- */}
              {messages === undefined ? (
                 <div className="flex-1 flex items-center justify-center opacity-20">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                   <div className="text-5xl mb-4">👋</div>
                   <p className="text-sm font-medium">No messages yet. Say hi to {selectedUser.name}!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser?._id;
                  return (
                    <div key={msg._id} className={`flex flex-col ${isMe ? "items-end" : "items-start animate-in fade-in slide-in-from-bottom-2 duration-300"}`}>
                      <div className={`max-w-[65%] px-5 py-3 rounded-[24px] shadow-xl relative group ${
                        isMe 
                        ? "bg-blue-600 text-white rounded-tr-none shadow-blue-900/10" 
                        : "bg-[#2d3239] text-gray-100 rounded-tl-none border border-white/5"
                      }`}>
                        <p className="text-[14px] leading-relaxed break-words font-medium">{msg.body}</p>
                      </div>
                      {/* --- SMART TIMESTAMP IN MESSAGES --- */}
                      <span className="text-[10px] text-gray-600 mt-2 px-2 font-bold tracking-tight">
                         {formatSmartTime(msg._creationTime)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 pt-0 bg-gradient-to-t from-[#1a1d21] via-[#1a1d21] to-transparent">
              <form onSubmit={handleSendMessage} className="flex gap-4 bg-[#26292e] p-2 rounded-[24px] border border-white/5 focus-within:border-blue-500/40 transition-all shadow-inner">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-3 px-5 bg-transparent outline-none text-[15px] placeholder-gray-600"
                />
                <button 
                  type="submit"
                  disabled={!messageText.trim()}
                  className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-500 disabled:opacity-20 transition-all shadow-lg shadow-blue-600/30 text-sm active:scale-95"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* --- GLOBAL EMPTY STATE --- */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-[#1a1d21]">
            <div className="w-28 h-28 bg-blue-500/5 rounded-full flex items-center justify-center mb-8 border border-blue-500/10 animate-pulse">
               <span className="text-6xl grayscale opacity-20">💬</span>
            </div>
            <h2 className="text-4xl font-black text-white italic tracking-tighter mb-3 opacity-80">TARS CHAT</h2>
            <p className="text-gray-500 max-w-sm text-sm leading-relaxed font-medium">Select a conversation from the sidebar to start messaging interns.</p>
          </div>
        )}
      </div>
    </div>
  );
}