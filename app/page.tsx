"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { useUser, UserButton } from "@clerk/nextjs";
import EmojiPicker from "emoji-picker-react";

export default function Dashboard() {
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  
  const storeUser = useMutation(api.users.storeUser);
  const sendMessage = useMutation(api.messages.send);
  const addReaction = useMutation(api.messages.addReaction);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const createGroup = useMutation(api.conversations.createGroup);
  const updateProfile = useMutation(api.users.updateProfile);
  const setTypingStatus = useMutation(api.users.setTypingStatus);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [convId, setConvId] = useState<any>(null);
  const [mobileChatActive, setMobileChatActive] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isZegoCalling, setIsZegoCalling] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const zpRef = useRef<any>(null); 
  const isStoredRef = useRef(false);

  const allUsers = useQuery(api.users.listAllUsers, { search: searchTerm });
  const conversations = useQuery(api.conversations.list);
  const currentUser = useQuery(api.users.getCurrentUser);
  const messages = useQuery(api.messages.list, convId ? { conversationId: convId } : "skip");

  // ✅ FIXED: storeUser removed from dependency array to prevent React Hook error
  useEffect(() => {
    if (isAuthenticated && user?.id && !isStoredRef.current) {
      storeUser();
      isStoredRef.current = true;
    }
  }, [isAuthenticated, user?.id]); 

  useEffect(() => {
    if (currentUser) {
      setNewName(currentUser.name || "");
      setNewPhone(currentUser.phone || "");
    }
  }, [currentUser]);

  const formatSmartTime = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
    if (isNearBottom) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowScrollButton(false);
    } else if (messages && messages.length > 0) {
      setShowScrollButton(true);
    }
  }, [messages]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
  };

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
    if (isAtBottom) setShowScrollButton(false);
  };

  const handleReaction = async (messageId: any, emoji: string) => {
    try {
      await addReaction({ messageId, emoji });
    } catch (err) { console.error("Reaction Error:", err); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !convId) return;
    await sendMessage({ conversationId: convId, body: messageText, format: "text", replyToId: replyingTo?._id });
    setMessageText("");
    setReplyingTo(null);
  };

  const handleUploadFile = async (file: File | Blob, type: "image" | "audio" | "file") => {
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, { method: "POST", body: file });
      const { storageId } = await result.json();
      const displayBody = type === "audio" ? "🎙️ Voice Note" : (file as File).name || "Attachment";
      await sendMessage({
        conversationId: convId, body: displayBody, format: type,
        imageId: type === "image" ? storageId : undefined,
        audioId: type === "audio" ? storageId : undefined,
        fileId: type === "file" ? storageId : undefined,
        replyToId: replyingTo?._id,
      });
      setReplyingTo(null);
    } catch (error) { console.error(error); }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await handleUploadFile(audioBlob, "audio");
        };
        recorder.start(); setIsRecording(true);
      } catch (err) { alert("Mic Access Denied!"); }
    } else {
      mediaRecorderRef.current?.stop(); setIsRecording(false);
    }
  };

  const startZegoCall = async (isVideo: boolean) => {
    if (!currentUser || !convId) return;
    const rawAppID = process.env.NEXT_PUBLIC_ZEGO_APP_ID;
    const serverSecret = process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET;
    setIsZegoCalling(true);
    setTimeout(async () => {
      const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt');
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(Number(rawAppID), serverSecret!, convId.toString(), String(currentUser._id), currentUser.name || "User");
      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zpRef.current = zp;
      zp.joinRoom({
        container: videoContainerRef.current,
        scenario: { mode: selectedChat.isGroup ? ZegoUIKitPrebuilt.GroupCall : ZegoUIKitPrebuilt.OneONoneCall },
        showPreJoinView: false,
        turnOnCameraWhenJoining: isVideo,
        onLeaveRoom: () => setIsZegoCalling(false),
      });
    }, 500);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#050505] text-blue-500 italic animate-pulse font-black text-2xl uppercase tracking-widest">TARS Initializing...</div>;

  return (
    <div className="flex h-screen bg-[#050505] text-gray-200 md:p-4 gap-4 overflow-hidden font-sans">
      
      {/* --- OVERLAYS --- */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111] w-full max-w-md rounded-[40px] border border-white/5 p-10 shadow-2xl flex flex-col max-h-[85vh]">
            <h2 className="text-3xl font-black italic text-blue-500 mb-6 uppercase tracking-tighter">New Fleet</h2>
            <input type="text" placeholder="Squad Name" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full bg-black p-5 rounded-2xl border border-white/5 mb-6 outline-none focus:border-blue-500/50" />
            <div className="flex-1 overflow-y-auto space-y-3 mb-8 custom-scrollbar">
              {allUsers?.map(u => (
                <div key={u._id} onClick={() => setSelectedMembers(prev => prev.includes(u._id) ? prev.filter(m => m !== u._id) : [...prev, u._id])} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer border ${selectedMembers.includes(u._id) ? "bg-blue-600/10 border-blue-500" : "bg-white/[0.02] border-transparent"}`}>
                  <img src={u.image} className="w-12 h-12 rounded-xl object-cover" alt={u.name} />
                  <span className="flex-1 font-bold text-sm">{u.name}</span>
                </div>
              ))}
            </div>
            <button onClick={async () => { await createGroup({ name: groupName, memberIds: selectedMembers as any }); setIsGroupModalOpen(false); }} className="bg-blue-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white">Initialize</button>
          </div>
        </div>
      )}

      {isZegoCalling && (
        <div className="fixed inset-0 z-[600] bg-black flex items-center justify-center">
          <div ref={videoContainerRef} className="w-full h-full" />
          <button onClick={() => { zpRef.current?.destroy(); setIsZegoCalling(false); }} className="absolute top-10 right-10 z-[650] bg-red-600 px-8 py-3 rounded-full text-[10px] font-black">DISCONNECT</button>
        </div>
      )}

      {/* --- SIDEBAR --- */}
      <div className={`${mobileChatActive ? "hidden" : "flex"} w-full md:w-[420px] flex-col bg-[#0f0f0f] md:rounded-[40px] border border-white/5 md:flex shadow-2xl`}>
        <div className="p-10 pb-6">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-5xl font-black text-blue-600 italic tracking-tighter">TARS</h1>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsEditModalOpen(true)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10">⚙️</button>
              <button onClick={() => setIsGroupModalOpen(true)} className="bg-blue-600/10 text-blue-500 w-12 h-12 rounded-2xl text-xl flex items-center justify-center">＋</button>
              <div className="scale-125"><UserButton /></div>
            </div>
          </div>
          <input type="text" placeholder="Scan signals..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black p-6 rounded-[28px] outline-none border border-white/5 focus:border-blue-600/30" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-3 custom-scrollbar">
          {conversations?.map((conv: any) => (
            <div key={conv._id} onClick={() => { setConvId(conv._id); setSelectedChat(conv); setMobileChatActive(true); }} className={`flex items-center gap-5 p-5 rounded-[32px] cursor-pointer transition-all ${convId === conv._id ? "bg-blue-600 text-white" : "hover:bg-white/[0.03]"}`}>
              <div className="relative w-16 h-16 rounded-[22px] bg-white/5 overflow-hidden border border-white/5">
                {conv.otherUser?.image ? <img src={conv.otherUser.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-2xl">{conv.isGroup ? "👥" : "👤"}</div>}
                {!conv.isGroup && <div className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-[#0f0f0f] ${conv.otherUser?.isOnline ? "bg-green-500" : "bg-gray-600"}`} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-[16px] truncate">{conv.otherUser?.name}</p>
                <p className="text-[10px] uppercase tracking-[2px] font-bold opacity-50 truncate">{conv.isGroup ? `${conv.otherUser?.memberCount} Units` : (conv.otherUser?.isOnline ? "Live Signal" : "Shadow Mode")}</p>
              </div>
              {conv.lastMessageTime && <span className="text-[9px] opacity-30 font-black">{formatSmartTime(conv.lastMessageTime)}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* --- MAIN CHAT AREA --- */}
      <div className={`${!mobileChatActive ? "hidden" : "flex"} flex-1 flex-col bg-[#0f0f0f] md:rounded-[40px] border border-white/5 md:flex relative shadow-2xl overflow-hidden`}>
        {selectedChat ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-8 md:p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-6">
                <button onClick={() => setMobileChatActive(false)} className="md:hidden text-blue-500 text-4xl">‹</button>
                <div className="w-16 h-16 rounded-3xl overflow-hidden bg-white/5 flex items-center justify-center text-3xl">
                   {selectedChat.otherUser?.image ? <img src={selectedChat.otherUser.image} className="w-full h-full object-cover" alt="" /> : "👤"}
                </div>
                <div>
                  <h3 className="font-black text-white text-2xl tracking-tighter">{selectedChat.otherUser?.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${selectedChat.otherUser?.isOnline ? "bg-green-500 animate-pulse" : "bg-white/20"}`} />
                    <span className="text-[10px] text-blue-500 font-black uppercase tracking-[3px]">{selectedChat.otherUser?.isOnline ? "ACTIVE" : "OFFLINE"}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => startZegoCall(false)} className="w-14 h-14 bg-white/[0.03] hover:bg-blue-600 rounded-2xl flex items-center justify-center text-xl">📞</button>
                <button onClick={() => startZegoCall(true)} className="w-14 h-14 bg-white/[0.03] hover:bg-blue-600 rounded-2xl flex items-center justify-center text-xl">📹</button>
              </div>
            </div>

            {/* Messages Container */}
            <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 p-8 md:p-12 overflow-y-auto flex flex-col gap-10 custom-scrollbar relative">
              {messages?.map((msg) => {
                const isMe = msg.senderId === currentUser?._id;
                const reactions = msg.reactions || [];
                const uniqueEmojis = Array.from(new Set(reactions.map((r: any) => r.emoji)));

                return (
                  <div key={msg._id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`group relative flex flex-col max-w-[85%] ${isMe ? "items-end" : "items-start"}`}>
                      
                      {/* Emoji Actions */}
                      <div className={`absolute -top-10 opacity-0 group-hover:opacity-100 transition-all flex bg-[#1a1a1a] border border-white/10 rounded-full px-2 py-1 gap-2 z-50 shadow-xl ${isMe ? "right-0" : "left-0"}`}>
                        {["❤️", "😂", "🔥", "👍", "😮"].map(emoji => (
                          <button key={emoji} onClick={() => handleReaction(msg._id, emoji)} className="hover:scale-150 transition-transform duration-200 text-lg">{emoji}</button>
                        ))}
                        <button onClick={() => setReplyingTo(msg)} className="text-gray-500 hover:text-white px-2 border-l border-white/10 text-sm">↩️</button>
                      </div>

                      {/* Message Bubble */}
                      <div className={`relative px-6 py-4 rounded-[26px] shadow-2xl mb-1 ${
                        isMe 
                        ? "bg-[#1a1a1a] text-white rounded-tr-none border border-blue-600/30" 
                        : "bg-[#222] text-gray-100 rounded-tl-none border border-white/5"
                      }`}>
                        {msg.replyTo && <div className="mb-3 p-3 bg-black/40 rounded-xl border-l-2 border-blue-500 text-xs opacity-60 italic">{msg.replyTo.body}</div>}
                        
                        {msg.format === "text" && <p className="text-[16px] leading-relaxed break-words font-medium">{msg.body}</p>}
                        
                        {msg.format === "image" && (
                          <div className="mt-1 overflow-hidden rounded-xl bg-black border border-white/5">
                            <img src={msg.fileUrl} className="max-h-[400px] w-full object-contain cursor-pointer" onClick={() => window.open(msg.fileUrl, '_blank')} alt="sent" />
                          </div>
                        )}
                        
                        {msg.format === "audio" && <audio controls src={msg.fileUrl} className="w-64 h-10 custom-audio-player mt-2" />}
                        
                        <div className={`mt-2 text-[9px] font-black opacity-30 ${isMe ? "text-right" : "text-left"}`}>{formatSmartTime(msg._creationTime)}</div>

                        {/* Reactions Display */}
                        {uniqueEmojis.length > 0 && (
                          <div className={`absolute -bottom-3 flex gap-1 z-10 ${isMe ? "right-2" : "left-2"}`}>
                             {uniqueEmojis.map((emoji: any, idx: number) => (
                               <div key={`${msg._id}-${emoji}-${idx}`} className="bg-[#000] border border-white/20 rounded-full px-2 py-0.5 text-[12px] shadow-lg animate-in zoom-in">
                                 {emoji}
                               </div>
                             ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
              {showScrollButton && (
                <button onClick={scrollToBottom} className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest animate-bounce shadow-2xl">↓ New Messages</button>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-10 pt-0">
              {replyingTo && (
                <div className="mx-10 mb-2 p-4 bg-blue-600/10 border-l-4 border-blue-600 rounded-xl flex justify-between animate-in slide-in-from-bottom-2">
                  <span className="text-[10px] font-black text-blue-500 uppercase">Replying: {replyingTo.body}</span>
                  <button onClick={() => setReplyingTo(null)} className="text-blue-500">✕</button>
                </div>
              )}
              <div className="bg-[#111] p-4 rounded-[35px] border border-white/5 flex items-center gap-5 shadow-inner">
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-2xl hover:scale-110 transition-transform">😊</button>
                <label className="cursor-pointer text-2xl hover:scale-110 transition-transform">📎 <input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadFile(file, file.type.startsWith("image/") ? "image" : "file"); }} /></label>
                <button onClick={toggleRecording} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isRecording ? "bg-red-500 animate-pulse" : "bg-blue-600/10 hover:bg-blue-600/20"}`}>{isRecording ? "🛑" : "🎙️"}</button>
                <form onSubmit={handleSendMessage} className="flex-1 flex gap-4">
                  <input type="text" value={messageText} onChange={(e) => { setMessageText(e.target.value); if(selectedChat.otherUser?._id) setTypingStatus({ typingTo: selectedChat.otherUser._id }); }} placeholder="Type a message..." className="flex-1 bg-transparent outline-none placeholder:text-white/10" />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-widest transition-all">Send</button>
                </form>
              </div>
              {showEmojiPicker && <div className="absolute bottom-36 left-10 z-50 shadow-2xl border border-white/10 rounded-3xl overflow-hidden"><EmojiPicker theme={"dark" as any} onEmojiClick={(e) => { setMessageText(messageText + e.emoji); setShowEmojiPicker(false); }} /></div>}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#111_0%,_#050505_100%)]">
            <h2 className="text-8xl font-black italic tracking-[30px] text-white/5 select-none uppercase">TARS</h2>
            <p className="text-[11px] tracking-[8px] uppercase font-black text-blue-600/40 mt-[-40px]">Secure Protocol Active</p>
          </div>
        )}
      </div>

      {/* --- EDIT PROFILE MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[700] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#111] w-full max-w-md rounded-[40px] border border-white/5 p-10">
            <h2 className="text-3xl font-black italic text-blue-500 mb-8 uppercase text-center">Update Identity</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              let storageId = undefined;
              if (selectedImage) {
                const postUrl = await generateUploadUrl();
                const result = await fetch(postUrl, { method: "POST", body: selectedImage });
                const { storageId: sid } = await result.json();
                storageId = sid;
              }
              await updateProfile({ name: newName, phone: newPhone, storageId: storageId as any });
              setIsEditModalOpen(false);
            }} className="space-y-6">
              <input type="text" placeholder="Identity Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-black p-5 rounded-2xl border border-white/5 outline-none" />
              <input type="text" placeholder="Contact Stream" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full bg-black p-5 rounded-2xl border border-white/5 outline-none" />
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 opacity-50 uppercase text-[10px] font-black">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 py-5 rounded-2xl font-black uppercase text-[10px] text-white">Sync Data</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(37, 99, 235, 0.2); border-radius: 10px; }
        .custom-audio-player { filter: invert(1) hue-rotate(180deg) brightness(1.5); }
      `}</style>
    </div>
  );
}