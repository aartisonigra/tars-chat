"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { useUser, UserButton, SignIn, SignUp } from "@clerk/nextjs"; 
import EmojiPicker from "emoji-picker-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie } from "recharts";
import QRCode from "qrcode";

export default function Dashboard() {
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();

  // --- Clerk View State ---
  const [clerkView, setClerkView] = useState<"sign-in" | "sign-up">("sign-in");

  // --- Mutations ---
  const storeUser = useMutation(api.users.storeUser);
  const sendMessage = useMutation(api.messages.send);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const createGroup = useMutation(api.conversations.createGroup);
  const addCustomer = useMutation(api.crm.addCustomer);
  const deleteCustomer = useMutation(api.crm.deleteCustomer);
  const addOrder = useMutation(api.crm.addOrder);
  const updateOrderStatus = useMutation(api.crm.updateOrderStatus);
  const deleteOrder = useMutation(api.crm.deleteOrder);
  const addQuickReply = useMutation(api.crm.addQuickReply);
  const deleteQuickReply = useMutation(api.crm.deleteQuickReply);
  const logSession = useMutation(api.productivity.logSession);
  const startFocus = useMutation(api.productivity.startFocus);
  const endFocus = useMutation(api.productivity.endFocus);

  // --- States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [convId, setConvId] = useState<any>(null);
  const [mobileChatActive, setMobileChatActive] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isZegoCalling, setIsZegoCalling] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  // --- ⚙️ Dropdown Trigger Engine State ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // --- 🔗 WhatsApp Link & QR Generator States ---
  const [isLinkGenOpen, setIsLinkGenOpen] = useState(false);
  const [linkCountryCode, setLinkCountryCode] = useState("+91");
  const [linkPhoneNumber, setLinkPhoneNumber] = useState("");
  const [linkPrewrittenMsg, setLinkPrewrittenMsg] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatedQrCodeUrl, setGeneratedQrCodeUrl] = useState("");

  // --- 🔥 WhatsApp Reminder States ---
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderType, setReminderType] = useState("Study");
  const [reminderTarget, setReminderTarget] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminders, setReminders] = useState<any[]>([
    { id: 1, title: "Compiler Design Assignment Submission", type: "Study", target: "Vidhi Mam Group", time: "2026-05-18T10:00", triggered: false },
    { id: 2, title: "Mama's Birthday Celebration!", type: "Birthday", target: "Mama", time: "2026-06-01T00:00", triggered: false }
  ]);

  // --- Study Group Hub States ---
  const [isStudyHubOpen, setIsStudyHubOpen] = useState(false);
  const [studyTab, setStudyTab] = useState<"notes" | "timetable" | "quiz">("notes");
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<string | null>(null);

  // --- WhatsApp Sticker Maker States ---
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [stickerImage, setStickerImage] = useState<string | null>(null);
  const [stickerText, setStickerText] = useState("");
  const [isProcessingBg] = useState(false);

  // --- 📊 WhatsApp Chat Analyzer States ---
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState(false);
  const [analyzerData, setAnalyzerData] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- 💼 Mini CRM States ---
  const [isCrmOpen, setIsCrmOpen] = useState(false);
  const [crmTab, setCrmTab] = useState<"customers" | "orders" | "replies">("customers");
  const [crmCustomerName, setCrmCustomerName] = useState("");
  const [crmCustomerPhone, setCrmCustomerPhone] = useState("");
  const [crmCustomerTag, setCrmCustomerTag] = useState("lead");
  const [crmCustomerNotes, setCrmCustomerNotes] = useState("");
  const [crmOrderTitle, setCrmOrderTitle] = useState("");
  const [crmOrderAmount, setCrmOrderAmount] = useState("");
  const [crmOrderCustomerId, setCrmOrderCustomerId] = useState("");
  const [crmOrderDueDate, setCrmOrderDueDate] = useState("");
  const [crmReplyShortcut, setCrmReplyShortcut] = useState("");
  const [crmReplyMessage, setCrmReplyMessage] = useState("");

  // --- 📈 Productivity Tracker States ---
  const [isProdOpen, setIsProdOpen] = useState(false);
  const [focusElapsed, setFocusElapsed] = useState(0); // seconds
  const focusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- 👤 Profile Panel States ---
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<"overview" | "edit" | "status">("overview");
  const [editName, setEditName] = useState("");
  const [editAbout, setEditAbout] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrlProfile = useMutation(api.users.generateUploadUrl);
  const updateAbout = useMutation(api.users.updateAbout);

  // Modals
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const zpRef = useRef<any>(null);
  const isStoredRef = useRef(false);

  // Queries
  const allUsers = useQuery(api.users.listAllUsers, { search: searchTerm });
  const conversations = useQuery(api.conversations.list);
  const currentUser = useQuery(api.users.getCurrentUser);
  const messages = useQuery(api.messages.list, convId ? { conversationId: convId } : "skip");
  const crmCustomers = useQuery(api.crm.getCustomers);
  const crmOrders = useQuery(api.crm.getOrders);
  const crmQuickReplies = useQuery(api.crm.getQuickReplies);
  const weeklyUsage = useQuery(api.productivity.getWeeklyUsage);
  const activeFocus = useQuery(api.productivity.getActiveFocus);
  const focusHistory = useQuery(api.productivity.getFocusHistory);
  const profileStats = useQuery(api.users.getProfileStats);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Store User Logic
  useEffect(() => {
    if (isAuthenticated && user?.id && !isStoredRef.current) {
      storeUser();
      isStoredRef.current = true;
    }
  }, [isAuthenticated, user?.id, storeUser]);

  // Sync profile fields when currentUser loads
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name || "");
      setEditAbout(currentUser.about || "");
      setEditPhone(currentUser.phone || "");
    }
  }, [currentUser]);

  // AI Reply Generator Logic
  useEffect(() => {
    if (!messages || messages.length === 0) {
      setAiSuggestions([]);
      return;
    }
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.senderId !== currentUser?._id && lastMsg.format === "text") {
      const text = lastMsg.body.toLowerCase();
      if (text.includes("hello") || text.includes("hi") || text.includes("hey")) {
        setAiSuggestions(["Hey there! 👋", "Hello! How are you?", "Hi! What's up? 🔥"]);
      } else if (text.includes("free") || text.includes("today") || text.includes("tomorrow")) {
        setAiSuggestions(["Yes, tell me!", "A bit busy right now. 💻", "Can we talk later?"]);
      } else if (text.includes("project") || text.includes("code") || text.includes("tars")) {
        setAiSuggestions(["It's working perfectly!", "Let me check the logs.", "Awesome update! 🚀"]);
      } else {
        setAiSuggestions(["Okay 👍", "Sounds good!", "Sure, no problem!"]);
      }
    } else {
      setAiSuggestions([]);
    }
  }, [messages, currentUser]);

  // --- 🔗 WHATSAPP LINK & QR GENERATION LOGIC ---
  // --- 📈 PRODUCTIVITY: Focus timer tick ---
  useEffect(() => {
    if (activeFocus) {
      setFocusElapsed(Math.floor((Date.now() - activeFocus.startTime) / 1000));
      focusIntervalRef.current = setInterval(() => {
        setFocusElapsed(Math.floor((Date.now() - activeFocus.startTime) / 1000));
      }, 1000);
    } else {
      if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
      setFocusElapsed(0);
    }
    return () => { if (focusIntervalRef.current) clearInterval(focusIntervalRef.current); };
  }, [activeFocus]);

  // --- 📈 PRODUCTIVITY: Auto-log session when messages change ---
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const today = new Date().toISOString().split("T")[0];
    const myMessages = messages.filter(m => m.senderId === currentUser?._id);
    if (myMessages.length > 0) {
      logSession({
        date: today,
        sessionStart: Date.now() - 60000,
        sessionEnd: Date.now(),
        durationMinutes: 1,
        messagesSent: myMessages.length,
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId]);

  const handleGenerateLinkAndQr = async () => {
    if (!linkPhoneNumber) return alert("Please enter a valid phone number!");
    const cleanCode = linkCountryCode.replace("+", "");
    const cleanNumber = linkPhoneNumber.replace(/[^0-9]/g, "");
    const fullUrl = `https://wa.me/${cleanCode}${cleanNumber}?text=${encodeURIComponent(linkPrewrittenMsg)}`;
    setGeneratedLink(fullUrl);

    try {
      const qrDataUrl = await QRCode.toDataURL(fullUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#2563eb", light: "#ffffff" }
      });
      setGeneratedQrCodeUrl(qrDataUrl);
    } catch (err) {
      console.error("QR Matrix encoding failure", err);
    }
  };

  // --- 🔥 AUTO REMINDER BACKGROUND WATCHER ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setReminders(prev => prev.map(rem => {
        if (!rem.triggered && rem.time) {
          const remDate = new Date(rem.time);
          if (now >= remDate) {
            const encodedText = encodeURIComponent(`🚨 *TARS PROTOCOL REMINDER* 🚨\n\n🎯 *Task:* ${rem.title}\n📂 *Category:* ${rem.type}\n⏰ *Time Stream:* ${new Date(rem.time).toLocaleString()}\n\n_Generated automatically via TARS Systems_`);
            const whatsappUrl = `https://web.whatsapp.com/send?text=${encodedText}`;
            window.open(whatsappUrl, "_blank");
            alert(`⏰ REMINDER TRIGGERED: ${rem.title}. Launching WhatsApp Router...`);
            return { ...rem, triggered: true };
          }
        }
        return rem;
      }));
    }, 10000);
    return () => clearInterval(interval);
  }, [reminders]);

  // --- 📈 WHATSAPP CHAT ANALYZER PARSER ENGINE ---
  const handleChatFileFormat = (text: string) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const lines = text.split("\n");
      const userCountMap: { [key: string]: number } = {};
      const wordCountMap: { [key: string]: number } = {};
      const emojiCountMap: { [key: string]: number } = {};
      
      const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu;
      const stopWords = ["media", "omitted", "this", "message", "was", "deleted", "the", "to", "and", "a", "in", "i", "you", "of", "is", "for", "it", "on", "that", "my", "me", "na", "ne", "pan", "chhe", "aa", "kai", "hu", "te"];

      lines.forEach(line => {
        const match = line.match(/(?:\]\s|.-\s)([A-Za-z0-9#@🎨\s\u0900-\u097F]+):(.*)/);
        if (match) {
          const sender = match[1].trim();
          const messageBody = match[2].trim().toLowerCase();

          if (sender.length < 30) {
            userCountMap[sender] = (userCountMap[sender] || 0) + 1;
          }

          const emojis = messageBody.match(emojiRegex);
          if (emojis) {
            emojis.forEach(emo => {
              emojiCountMap[emo] = (emojiCountMap[emo] || 0) + 1;
            });
          }

          const words = messageBody.replace(/[^\w\s]/g, "").split(/\s+/);
          words.forEach(word => {
            if (word.length > 2 && !stopWords.includes(word)) {
              wordCountMap[word] = (wordCountMap[word] || 0) + 1;
            }
          });
        }
      });

      const whoTextsMore = Object.entries(userCountMap).map(([name, count]) => ({ name, value: count })).sort((a,b) => b.value - a.value);
      const mostUsedWords = Object.entries(wordCountMap).map(([text, value]) => ({ text, value })).sort((a,b) => b.value - a.value).slice(0, 5);
      const emojiStats = Object.entries(emojiCountMap).map(([emoji, count]) => ({ emoji, count })).sort((a,b) => b.count - a.count).slice(0, 5);

      setAnalyzerData({ whoTextsMore, mostUsedWords, emojiStats, totalMessages: lines.length });
      setIsAnalyzing(false);
    }, 1200);
  };

  const formatWhatsAppText = (rawText: string) => {
    if (!rawText) return "";
    return rawText
      .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
      .replace(/_(.*?)_/g, "<em>$1</em>")
      .replace(/~(.*?)~/g, "<del>$1</del>");
  };

  const formatSmartTime = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleScroll = () => {};

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>, textOverride?: string) => {
    if (e) e.preventDefault();
    const finalTxt = textOverride || messageText;
    if (!finalTxt.trim() || !convId) return;
    await sendMessage({ conversationId: convId, body: finalTxt, format: "text", replyToId: replyingTo?._id });
    if (!textOverride) setMessageText("");
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
    } catch (error) {}
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
        recorder.start(); 
        setIsRecording(true);
      } catch (err) { alert("Mic Access Denied!"); }
    } else {
      mediaRecorderRef.current?.stop(); 
      setIsRecording(false);
    }
  };

  const startZegoCall = async (isVideo: boolean) => {
    if (!currentUser || !convId) return;
    const parsedAppID = 698432055;
    const serverSecret = "7409a4e3c42602f02d80c1353d958400";
    setIsZegoCalling(true);
    setTimeout(async () => {
      if (!videoContainerRef.current) { setIsZegoCalling(false); return; }
      try {
        const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt');
        const safeRoomId = convId.toString().replace(/[^a-zA-Z0-9]/g, "");
        const safeUserId = String(currentUser._id).replace(/[^a-zA-Z0-9]/g, "");
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(parsedAppID, serverSecret, safeRoomId, safeUserId, currentUser.name || "User");
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;
        zp.joinRoom({
          container: videoContainerRef.current,
          scenario: { mode: selectedChat.isGroup ? ZegoUIKitPrebuilt.GroupCall : ZegoUIKitPrebuilt.OneONoneCall },
          showPreJoinView: false,
          turnOnCameraWhenJoining: isVideo,
          turnOnMicrophoneWhenJoining: true,
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true,
          showTextChat: false, showUserList: false,
          onLeaveRoom: () => {
            setIsZegoCalling(false);
            if (zpRef.current) { try { zpRef.current.destroy(); } catch(e) {} zpRef.current = null; }
          },
        });
      } catch (err) { setIsZegoCalling(false); }
    }, 800); 
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#050505] text-blue-500 italic animate-pulse font-black text-2xl uppercase tracking-widest">
        TARS Initializing...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#050505] gap-8 p-4">
        <div className="text-center">
          <h1 className="text-8xl font-black text-blue-600 italic tracking-tighter mb-2">TARS</h1>
          <p className="text-blue-500/50 uppercase tracking-[10px] text-[10px] font-bold">Secure Protocol Required</p>
        </div>
        <div className="clerk-clean-mode flex flex-col items-center">
          <div className="bg-[#111] p-2 rounded-[35px] border border-white/5 shadow-2xl transition-all mb-4">
            {clerkView === "sign-in" ? <SignIn routing="hash" /> : <SignUp routing="hash" />}
          </div>
          <button onClick={() => setClerkView(clerkView === "sign-in" ? "sign-up" : "sign-in")} className="text-blue-600 font-black uppercase text-[12px] tracking-widest hover:text-blue-400 transition-all">
            {clerkView === "sign-in" ? "DON'T HAVE AN ACCOUNT? SIGN UP" : "ALREADY HAVE AN ACCOUNT? SIGN IN"}
          </button>
        </div>
      </div>
    );
  }

  const COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];

  return (
    <div className="flex h-screen bg-[#050505] text-gray-200 md:p-4 gap-4 overflow-hidden font-sans">
      
      {/* 👤 MODAL: PROFILE PANEL */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-[970] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111] w-full max-w-lg rounded-[40px] border border-white/5 shadow-2xl overflow-hidden">

            {/* COVER + AVATAR */}
            <div className="relative h-32 bg-gradient-to-br from-blue-600/30 via-blue-900/20 to-black">
              <div className="absolute -bottom-10 left-8">
                <div className="relative">
                  <img
                    src={currentUser?.image || user?.imageUrl}
                    className="w-20 h-20 rounded-2xl object-cover border-4 border-[#111] shadow-2xl"
                    alt=""
                  />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#111] rounded-full" />
                </div>
              </div>
              <button onClick={() => setIsProfileOpen(false)} className="absolute top-4 right-4 bg-black/40 hover:bg-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors">✕</button>
            </div>

            <div className="pt-14 px-8 pb-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">{currentUser?.name || user?.firstName}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{currentUser?.email}</p>
                  <p className="text-xs text-blue-400 mt-1 italic">{currentUser?.about || "No status set"}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-green-400 uppercase tracking-wider">Online</span>
                </div>
              </div>

              {/* TABS */}
              <div className="flex gap-2 mb-6">
                {(["overview", "edit", "status"] as const).map(t => (
                  <button key={t} onClick={() => setProfileTab(t)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    profileTab === t ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}>
                    {t === "overview" ? "👤 Overview" : t === "edit" ? "✏️ Edit" : "🟢 Status"}
                  </button>
                ))}
              </div>

              {/* OVERVIEW TAB */}
              {profileTab === "overview" && (
                <div className="space-y-3">
                  {[
                    { icon: "📞", label: "Phone", value: currentUser?.phone || "Not set" },
                    { icon: "📧", label: "Email", value: currentUser?.email || "Not set" },
                    { icon: "ℹ️", label: "About", value: currentUser?.about || "Not set" },
                    { icon: "💬", label: "Messages Sent", value: `${profileStats?.totalMessagesSent ?? 0} total` },
                    { icon: "🗨️", label: "Conversations", value: `${profileStats?.totalConversations ?? 0} active` },
                    { icon: "⏱️", label: "Focus Time", value: `${profileStats?.totalFocusMinutes ?? 0} mins total` },
                    { icon: "🎯", label: "Focus Sessions", value: `${profileStats?.focusSessionsCompleted ?? 0} completed` },
                    { icon: "📅", label: "Member Since", value: profileStats ? new Date(profileStats.memberSince).toLocaleDateString("en", { month: "long", year: "numeric" }) : "" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 bg-black/30 rounded-xl px-4 py-3">
                      <span className="text-lg">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] uppercase font-black tracking-widest opacity-40">{item.label}</p>
                        <p className="text-sm font-bold text-white truncate">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* EDIT TAB */}
              {profileTab === "edit" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] uppercase font-black tracking-widest opacity-40 block mb-1.5">Display Name</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name..." className="w-full bg-black p-3 rounded-xl border border-white/5 text-sm text-white outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-black tracking-widest opacity-40 block mb-1.5">About / Bio</label>
                    <input value={editAbout} onChange={e => setEditAbout(e.target.value)} placeholder="Something about you..." className="w-full bg-black p-3 rounded-xl border border-white/5 text-sm text-white outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-black tracking-widest opacity-40 block mb-1.5">Phone</label>
                    <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="w-full bg-black p-3 rounded-xl border border-white/5 text-sm text-white outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-black tracking-widest opacity-40 block mb-1.5">Profile Photo</label>
                    <label className="flex items-center gap-3 bg-black p-3 rounded-xl border border-white/5 cursor-pointer hover:border-blue-500/30 transition-all">
                      <span className="text-xl">📸</span>
                      <span className="text-xs text-gray-400">Upload new photo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const postUrl = await generateUploadUrlProfile();
                          const res = await fetch(postUrl, { method: "POST", body: file });
                          const { storageId } = await res.json();
                          await updateProfile({ name: editName || currentUser?.name || "", phone: editPhone, storageId });
                          alert("✅ Photo updated!");
                        } catch { alert("Upload failed"); }
                      }} />
                    </label>
                  </div>
                  <button onClick={async () => {
                    await updateProfile({ name: editName || currentUser?.name || "", phone: editPhone });
                    alert("✅ Profile updated!");
                    setProfileTab("overview");
                  }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                    Save Changes
                  </button>
                </div>
              )}

              {/* STATUS TAB */}
              {profileTab === "status" && (
                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Quick Status Presets</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { emoji: "🟢", label: "Available", about: "Available to chat!" },
                      { emoji: "🔴", label: "Busy", about: "Busy, will reply later." },
                      { emoji: "💻", label: "In a meeting", about: "In a meeting, BRB." },
                      { emoji: "😴", label: "Away", about: "Away for a while." },
                      { emoji: "🎓", label: "Studying", about: "Studying, DND please!" },
                      { emoji: "💪", label: "Focus Mode", about: "In deep focus mode." },
                    ].map(s => (
                      <button key={s.label} onClick={async () => {
                        await updateAbout({ about: s.about });
                        alert(`Status set to: ${s.emoji} ${s.label}`);
                      }} className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all hover:border-blue-500/40 ${
                        currentUser?.about === s.about ? "bg-blue-600/10 border-blue-500/40 text-white" : "bg-black/30 border-white/5 text-gray-300"
                      }`}>
                        <span className="text-lg">{s.emoji}</span> {s.label}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-black tracking-widest opacity-40 block mb-1.5">Custom Status</label>
                    <div className="flex gap-2">
                      <input
                        value={editAbout}
                        onChange={e => setEditAbout(e.target.value)}
                        placeholder="Write custom status..."
                        className="flex-1 bg-black p-3 rounded-xl border border-white/5 text-sm text-white outline-none focus:border-blue-500/50"
                      />
                      <button onClick={async () => {
                        await updateAbout({ about: editAbout });
                        alert("✅ Status updated!");
                      }} className="bg-blue-600 hover:bg-blue-700 px-4 rounded-xl text-xs font-black text-white transition-all">Set</button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 🔗 MODAL: WHATSAPP LINK & QR GENERATOR */}
      {isLinkGenOpen && (
        <div className="fixed inset-0 z-[980] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111] w-full max-w-4xl h-[85vh] rounded-[40px] border border-white/5 p-8 shadow-2xl flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-black italic text-blue-500 uppercase tracking-tighter">🔗 Link Router & QR Matrix</h2>
                <p className="text-[10px] uppercase tracking-[3px] opacity-40">Transmit secure chat beams without contact persistence</p>
              </div>
              <button onClick={() => { setIsLinkGenOpen(false); setGeneratedLink(""); setGeneratedQrCodeUrl(""); }} className="bg-white/5 px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-red-500/20 transition-colors">✕ Clear Router</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-2">Select Target Vector Country Code</label>
                  <select 
                    value={linkCountryCode} 
                    onChange={(e) => setLinkCountryCode(e.target.value)}
                    className="w-full bg-black p-4 rounded-xl border border-white/5 text-xs font-bold text-white outline-none focus:border-blue-500/50"
                  >
                    <option value="+91">🇮🇳 India (+91)</option>
                    <option value="+1">🇺🇸 USA (+1)</option>
                    <option value="+44">🇬🇧 UK (+44)</option>
                    <option value="+971">🇦🇪 UAE (+971)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-2">Target Stream Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="Enter digits without code..." 
                    value={linkPhoneNumber}
                    onChange={(e) => setLinkPhoneNumber(e.target.value)}
                    className="w-full bg-black p-4 rounded-xl border border-white/5 text-xs font-bold outline-none text-white focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-2">Pre-Written Signal Content (Payload)</label>
                  <textarea 
                    rows={4}
                    placeholder="Type pre-composed message..." 
                    value={linkPrewrittenMsg}
                    onChange={(e) => setLinkPrewrittenMsg(e.target.value)}
                    className="w-full bg-black p-4 rounded-xl border border-white/5 text-xs font-bold outline-none text-white focus:border-blue-500/50 resize-none"
                  />
                </div>

                <button 
                  type="button" 
                  onClick={handleGenerateLinkAndQr}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase text-white transition-colors"
                >
                  📡 Compel Transmission Matrices
                </button>
              </div>

              <div className="flex flex-col items-center justify-center bg-black/40 border border-white/5 rounded-3xl p-6 text-center space-y-6">
                {generatedLink ? (
                  <>
                    <div className="w-full space-y-2">
                      <p className="text-[10px] uppercase font-black text-blue-500 tracking-wider">Generated Hot-Link Protocol</p>
                      <div className="bg-black p-4 rounded-xl border border-white/5 text-[11px] text-gray-300 break-all select-all font-mono">
                        {generatedLink}
                      </div>
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={() => { navigator.clipboard.writeText(generatedLink); alert("Link copied to clipboard storage!"); }}
                          className="bg-white/5 hover:bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-colors"
                        >
                          📋 Copy Link
                        </button>
                        <button 
                          onClick={() => window.open(generatedLink, "_blank")}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-colors"
                        >
                          🚀 Launch Chat
                        </button>
                      </div>
                    </div>

                    {generatedQrCodeUrl && (
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase font-black text-blue-500 tracking-wider">Dynamic QR Node</p>
                        <div className="bg-white p-3 rounded-2xl inline-block shadow-2xl">
                          <img src={generatedQrCodeUrl} className="w-44 h-44 object-contain" alt="WhatsApp Routing QR Code" />
                        </div>
                        <a 
                          href={generatedQrCodeUrl} 
                          download={`TARS-QR-${linkPhoneNumber}.png`}
                          className="block text-[9px] font-black uppercase text-gray-500 hover:text-white transition-colors"
                        >
                          ⬇️ Download QR Image Layer
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-600 text-center space-y-2">
                    <span className="text-5xl block opacity-30">🔗</span>
                    <p className="text-xs uppercase font-black tracking-widest">Awaiting Parameters</p>
                    <p className="text-[9px] max-w-xs mx-auto opacity-40">Fill the vector parameters to map instant link routes and download localized QR images.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GROUP CREATION */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111] w-full max-w-md rounded-[40px] border border-white/5 p-10 shadow-2xl flex flex-col max-h-[85vh]">
            <h2 className="text-3xl font-black italic text-blue-500 mb-6 uppercase tracking-tighter">New Fleet</h2>
            <input type="text" placeholder="Squad Name" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full bg-black p-5 rounded-2xl border border-white/5 mb-6 outline-none focus:border-blue-500/50" />
            <div className="flex-1 overflow-y-auto space-y-3 mb-8 custom-scrollbar">
              {allUsers?.map(u => (
                <div key={u._id} onClick={() => setSelectedMembers(prev => prev.includes(u._id) ? prev.filter(m => m !== u._id) : [...prev, u._id])} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer border ${selectedMembers.includes(u._id) ? "bg-blue-600/10 border-blue-500" : "bg-white/[0.02] border-transparent"}`}>
                  <img src={u.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                  <span className="flex-1 font-bold text-sm">{u.name}</span>
                </div>
              ))}
            </div>
            <button onClick={async () => { 
              if(!currentUser) return;
              try { await createGroup({ name: groupName, memberIds: selectedMembers as any }); setIsGroupModalOpen(false); setGroupName(""); setSelectedMembers([]); } catch(e) {}
            }} className="bg-blue-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white hover:bg-blue-700 transition-colors">Initialize</button>
            <button onClick={() => setIsGroupModalOpen(false)} className="mt-4 text-[10px] font-bold opacity-30 uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      )}

      {/* MODAL: ZEGO CALL */}
      {isZegoCalling && (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col items-center justify-center">
          <div ref={videoContainerRef} className="w-full h-full" style={{ minHeight: '100vh', height: '100%' }} />
          <button onClick={() => { if (zpRef.current) { try { zpRef.current.destroy(); } catch(e) {} zpRef.current = null; } setIsZegoCalling(false); }} className="absolute top-6 right-6 z-[650] bg-red-600 text-white font-black tracking-widest text-[10px] px-8 py-3 rounded-full hover:bg-red-700 shadow-2xl transition-all">DISCONNECT</button>
        </div>
      )}

      {/* 🔥 MODAL: WHATSAPP REMINDER MATRIX SCHEDULER */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 z-[900] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111] w-full max-w-2xl rounded-[40px] border border-white/5 p-8 shadow-2xl flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-3xl font-black italic text-blue-500 uppercase tracking-tighter">⏰ Chrono Router</h2>
                <p className="text-[10px] uppercase tracking-[3px] opacity-40">Automated WhatsApp Reminder Stream</p>
              </div>

              <input 
                type="text" 
                placeholder="Reminder Objective Name" 
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                className="w-full bg-black p-4 rounded-xl border border-white/5 text-xs font-bold uppercase tracking-wider outline-none text-white focus:border-blue-500/50"
              />

              <div className="flex gap-2">
                {["Study", "Birthday", "Task"].map(t => (
                  <button 
                    key={t}
                    type="button"
                    onClick={() => setReminderType(t)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${reminderType === t ? "bg-blue-600 text-white border-blue-500" : "bg-black text-gray-400 border-white/5"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <input 
                type="text" 
                placeholder="Target / Contact Profile Name" 
                value={reminderTarget}
                onChange={(e) => setReminderTarget(e.target.value)}
                className="w-full bg-black p-4 rounded-xl border border-white/5 text-xs font-bold outline-none text-white focus:border-blue-500/50"
              />

              <input 
                type="datetime-local" 
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full bg-black p-4 rounded-xl border border-white/5 text-xs font-bold outline-none text-white focus:border-blue-500/50"
              />

              <button 
                type="button"
                onClick={() => {
                  if (!reminderTitle || !reminderTime) return alert("Fill all transmission variables!");
                  const newRem = {
                    id: Date.now(),
                    title: reminderTitle,
                    type: reminderType,
                    target: reminderTarget || "Self Matrix",
                    time: reminderTime,
                    triggered: false
                  };
                  setReminders([newRem, ...reminders]);
                  setReminderTitle("");
                  setReminderTarget("");
                  setReminderTime("");
                  alert("Signal Scheduled Successfully!");
                }}
                className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white hover:bg-blue-700 transition-colors"
              >
                🔒 Deploy Chrono Anchor
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-between max-h-[400px]">
              <div className="overflow-y-auto space-y-3 custom-scrollbar flex-1 pr-1">
                <p className="text-[10px] uppercase font-black tracking-wider opacity-40 mb-2">Live Timeline Streams</p>
                {reminders.map(r => (
                  <div key={r.id} className={`p-4 rounded-2xl border ${r.triggered ? "bg-white/[0.01] border-white/5 opacity-40" : "bg-black border-blue-600/20 shadow-lg"}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] bg-blue-600/10 text-blue-400 px-2 py-0.5 rounded-md font-black uppercase tracking-wider">{r.type}</span>
                      <span className="text-[8px] opacity-30 font-bold">{new Date(r.time).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-xs text-white line-clamp-1">{r.title}</h4>
                    <p className="text-[9px] opacity-40 truncate">To: {r.target}</p>
                    {r.triggered && <p className="text-[8px] text-green-500 font-bold tracking-widest uppercase mt-1">✓ Routed Open</p>}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setIsReminderModalOpen(false)} className="w-full text-center text-[10px] font-bold opacity-30 uppercase tracking-widest hover:opacity-100 transition-opacity mt-4">Exit Console</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WHATSAPP STUDY GROUP HUB */}
      {isStudyHubOpen && (
        <div className="fixed inset-0 z-[850] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111] w-full max-w-4xl h-[80vh] rounded-[40px] border border-white/5 p-8 shadow-2xl flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-black italic text-blue-500 uppercase tracking-tighter">📚 Academy HQ Hub</h2>
                <p className="text-[10px] uppercase tracking-[3px] opacity-40">Unified student resource grid</p>
              </div>
              <button onClick={() => setIsStudyHubOpen(false)} className="bg-white/5 p-3 rounded-full hover:bg-red-500/20 text-xs">✕ Close</button>
            </div>
            <div className="flex gap-2 border-b border-white/5 pb-4 mb-6 overflow-x-auto custom-scrollbar">
              {[
                { id: "notes", label: "📁 Shared Notes", icon: "📄" },
                { id: "timetable", label: "📅 Exam Timetable", icon: "⏳" },
                { id: "quiz", label: "⚡ Daily Warp Quiz", icon: "🧠" }
              ].map(tab => (
                <button key={tab.id} onClick={() => setStudyTab(tab.id as any)} className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${studyTab === tab.id ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}><span>{tab.icon}</span>{tab.label}</button>
              ))}
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {studyTab === "notes" && (
                <div className="space-y-4">
                  <div className="p-6 bg-black rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="font-black uppercase text-sm text-white tracking-widest">Upload Reference Matrix</h3>
                      <p className="text-[10px] opacity-40">Accepts PDFs, Docs, and Images</p>
                    </div>
                    <label className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest px-6 py-3 rounded-xl cursor-pointer transition-all">
                      ⚡ Upload Material
                      <input type="file" className="hidden" />
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: "Compiler Design Unit-3 (Opcodes).pdf", size: "4.2 MB", owner: "Aarti Sonigra" },
                      { title: "PostgreSQL Advanced Indexing Logic.pdf", size: "1.8 MB", owner: "Aarti Sonigra" }
                    ].map((item, index) => (
                      <div key={index} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between hover:border-blue-500/30 transition-all">
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="text-3xl">📄</span>
                          <div className="min-w-0">
                            <h5 className="font-bold text-sm text-white truncate">{item.title}</h5>
                            <p className="text-[10px] opacity-40 uppercase tracking-wider">{item.size} • By {item.owner}</p>
                          </div>
                        </div>
                        <button onClick={() => alert("Downloading secure file layer...")} className="bg-white/5 hover:bg-blue-600 p-2 rounded-xl text-xs transition-colors">📥</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {studyTab === "timetable" && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-2xl text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    ⚠️ System Notice: Verification schedule updated by Vidhi Mam.
                  </div>
                  <div className="border border-white/5 rounded-2xl overflow-hidden bg-black">
                    <table className="w-full text-left text-xs uppercase tracking-wider">
                      <thead className="bg-white/5 font-black text-blue-500 border-b border-white/5">
                        <tr>
                          <th className="p-4">Subject Core</th>
                          <th className="p-4">Time Segment</th>
                          <th className="p-4">Location Stream</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 medium font-medium opacity-80">
                        <tr>
                          <td className="p-4 text-white font-bold">Compiler Design Lab</td>
                          <td className="p-4">10:30 AM - 12:30 PM</td>
                          <td className="p-4">Lab 4 (EVM-Forge Project Sync)</td>
                        </tr>
                        <tr>
                          <td className="p-4 text-white font-bold">Full Stack Architecture</td>
                          <td className="p-4">01:30 PM - 03:00 PM</td>
                          <td className="p-4">Seminar Hall B (MERN & Rust Testing)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {studyTab === "quiz" && (
                <div className="p-6 bg-black border border-white/5 rounded-3xl max-w-xl mx-auto space-y-6">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest opacity-40 font-black">
                    <span>Topic: Database Architecture</span>
                    <span>Points: 120 XP</span>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-relaxed">Which PostgreSQL feature allows you to execute a query concurrently without blocking writes on the index infrastructure?</h3>
                  <div className="space-y-3">
                    {[
                      { id: "A", text: "CONCURRENTLY Index Creation Build" },
                      { id: "B", text: "Asynchronous MVCC Stream Isolation" }
                    ].map(option => (
                      <button key={option.id} onClick={() => setSelectedQuizAnswer(option.id)} className={`w-full text-left p-4 rounded-xl text-xs font-bold border transition-all ${selectedQuizAnswer === option.id ? "bg-blue-600 text-white border-blue-500" : "bg-white/[0.02] border-white/5 hover:border-blue-500/30"}`}>
                        {option.id}. {option.text}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { if(selectedQuizAnswer === "A") { alert("🌟 Brilliant! Answer Matrix Verified."); } else { alert("✕ Negative Matrix."); } }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors">Submit Vector</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WHATSAPP STICKER MAKER */}
      {isStickerModalOpen && (
        <div className="fixed inset-0 z-[800] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111] w-full max-w-2xl rounded-[40px] border border-white/5 p-8 shadow-2xl flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex-1 flex flex-col items-center justify-center bg-black rounded-3xl p-4 border border-white/5 relative min-h-[300px]">
              {stickerImage ? (
                <div className="relative w-full aspect-square max-w-[250px] flex items-center justify-center overflow-hidden rounded-xl bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:16px_16px]">
                  <img src={stickerImage} id="sticker-preview-img" className="max-w-full max-h-full object-contain" alt="" />
                  {stickerText && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 uppercase text-white font-black text-center text-2xl tracking-tight drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] select-none pointer-events-none">{stickerText}</div>}
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-3 text-gray-500 hover:text-blue-500 transition-colors">
                  <span className="text-5xl">🎨</span>
                  <span className="text-xs uppercase font-black tracking-widest">Load Media Core</span>
                  <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if(file) { const reader = new FileReader(); reader.onload = (ev) => setStickerImage(ev.target?.result as string); reader.readAsDataURL(file); } }} className="hidden" />
                </label>
              )}
              {isProcessingBg && <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-3xl flex items-center justify-center text-blue-500 font-bold italic animate-pulse">AI Removing Background...</div>}
            </div>
            
            <div className="flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-3xl font-black italic text-blue-500 uppercase tracking-tighter">Sticker Forge</h2>
                  <p className="text-[10px] uppercase tracking-[3px] opacity-40">Meme Rendering Core</p>
                </div>
                <input type="text" placeholder="Punchline caption..." value={stickerText} onChange={(e) => setStickerText(e.target.value)} className="w-full bg-black p-4 rounded-xl border border-white/5 outline-none font-bold text-xs text-white" />
              </div>

              <div className="space-y-2">
                <button type="button" onClick={() => {
                  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512;
                  const ctx = canvas.getContext("2d"); const img = document.getElementById("sticker-preview-img") as HTMLImageElement;
                  if (ctx && img) {
                    ctx.drawImage(img, 56, 56, 400, 400); ctx.font = "900 42px sans-serif"; ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.strokeStyle = "black"; ctx.lineWidth = 6;
                    if(stickerText) { ctx.strokeText(stickerText.toUpperCase(), 256, 470); ctx.fillText(stickerText.toUpperCase(), 256, 470); }
                    const link = document.createElement("a"); link.download = "TARS-Sticker.png"; link.href = canvas.toDataURL("image/png"); link.click();
                  }
                }} className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase text-white transition-all">📦 Export Sticker Package</button>
                <button onClick={() => { setIsStickerModalOpen(false); setStickerImage(null); setStickerText(""); }} className="w-full text-center text-[10px] font-bold opacity-30 uppercase tracking-widest">Cancel Canvas</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📊 MODAL: WHATSAPP CHAT ANALYZER */}
      {isAnalyzerOpen && (
        <div className="fixed inset-0 z-[950] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111] w-full max-w-4xl h-[85vh] rounded-[40px] border border-white/5 p-8 shadow-2xl flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-black italic text-blue-500 uppercase tracking-tighter">📊 Chat Analyzer Console</h2>
                <p className="text-[10px] uppercase tracking-[3px] opacity-40">Deconstruct structural communication data vectors</p>
              </div>
              <button onClick={() => { setIsAnalyzerOpen(false); setAnalyzerData(null); }} className="bg-white/5 p-3 rounded-full hover:bg-red-500/20 text-xs">✕ Close</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {!analyzerData ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  {isAnalyzing ? (
                    <div className="space-y-4">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-black text-blue-500 uppercase tracking-widest animate-pulse">Analyzing Vectors...</p>
                    </div>
                  ) : (
                    <label className="cursor-pointer group hover:scale-105 transition-transform">
                      <div className="bg-white/5 p-8 rounded-full border border-white/5 mb-4 text-4xl group-hover:border-blue-500/30">📊</div>
                      <span className="text-xs uppercase font-black tracking-widest text-white">Upload WhatsApp Chat (`.txt`)</span>
                      <input type="file" accept=".txt" onChange={(e) => { const file = e.target.files?.[0]; if(file) { const reader = new FileReader(); reader.onload = (ev) => handleChatFileFormat(ev.target?.result as string); reader.readAsText(file); } }} className="hidden" />
                    </label>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-black rounded-2xl border border-white/5 flex flex-col justify-between items-center">
                    <p className="text-[10px] uppercase font-black text-blue-500">Total Matrix Footprint</p>
                    <h3 className="text-5xl font-black text-white mt-1">{analyzerData.totalMessages} <span className="text-xs opacity-40 block">Signals Identified</span></h3>
                  </div>

                  <div className="p-6 bg-black rounded-2xl border border-white/5 h-[300px] flex flex-col">
                    <p className="text-[10px] uppercase font-black text-gray-400 mb-4">Transmission Dominance Grid</p>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={analyzerData.whoTextsMore} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {analyzerData.whoTextsMore.map((_entry: any, idx: number) => (
                              <rect key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#111", border: "none", color: "#fff" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="p-6 bg-black rounded-2xl border border-white/5 h-[300px] flex flex-col md:col-span-2">
                    <p className="text-[10px] uppercase font-black text-gray-400 mb-4">Highest Density Word Vectors</p>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyzerData.mostUsedWords} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="text" type="category" stroke="#666" fontSize={10} width={70} />
                          <Tooltip contentStyle={{ backgroundColor: "#111", border: "none", color: "#fff" }} />
                          <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="p-6 bg-black rounded-2xl border border-white/5 md:col-span-2">
                    <p className="text-[10px] uppercase font-black text-gray-400 mb-4">Emotional Frequency Matrix</p>
                    <div className="grid grid-cols-5 gap-4">
                      {analyzerData.emojiStats.map((item: any, idx: number) => (
                        <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center">
                          <span className="text-3xl block mb-1">{item.emoji}</span>
                          <span className="text-[11px] font-black text-blue-500">{item.count}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 💼 MODAL: MINI CRM */}
      {isCrmOpen && (
        <div className="fixed inset-0 z-[960] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111] w-full max-w-5xl h-[90vh] rounded-[40px] border border-white/5 p-8 shadow-2xl flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-black italic text-blue-500 uppercase tracking-tighter">💼 Mini CRM Console</h2>
                <p className="text-[10px] uppercase tracking-[3px] opacity-40">Customer • Orders • Quick Replies</p>
              </div>
              <button onClick={() => setIsCrmOpen(false)} className="bg-white/5 px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-red-500/20">✕ Close</button>
            </div>

            {/* TABS */}
            <div className="flex gap-2 mb-6">
              {(["customers", "orders", "replies"] as const).map(tab => (
                <button key={tab} onClick={() => setCrmTab(tab)} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  crmTab === tab ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}>
                  {tab === "customers" ? "👤 Customers" : tab === "orders" ? "📦 Orders" : "⚡ Quick Replies"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-6">

              {/* CUSTOMERS TAB */}
              {crmTab === "customers" && (
                <>
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row gap-3">
                    <input placeholder="Name" value={crmCustomerName} onChange={e => setCrmCustomerName(e.target.value)} className="flex-1 bg-black p-3 rounded-xl border border-white/5 text-xs text-white outline-none focus:border-blue-500/50" />
                    <input placeholder="Phone" value={crmCustomerPhone} onChange={e => setCrmCustomerPhone(e.target.value)} className="flex-1 bg-black p-3 rounded-xl border border-white/5 text-xs text-white outline-none focus:border-blue-500/50" />
                    <select value={crmCustomerTag} onChange={e => setCrmCustomerTag(e.target.value)} className="bg-black p-3 rounded-xl border border-white/5 text-xs text-white outline-none">
                      <option value="lead">Lead</option>
                      <option value="active">Active</option>
                      <option value="vip">VIP</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <input placeholder="Notes" value={crmCustomerNotes} onChange={e => setCrmCustomerNotes(e.target.value)} className="flex-1 bg-black p-3 rounded-xl border border-white/5 text-xs text-white outline-none focus:border-blue-500/50" />
                    <button onClick={async () => {
                      if (!crmCustomerName || !crmCustomerPhone) return alert("Name and phone required!");
                      await addCustomer({ name: crmCustomerName, phone: crmCustomerPhone, tag: crmCustomerTag, notes: crmCustomerNotes });
                      setCrmCustomerName(""); setCrmCustomerPhone(""); setCrmCustomerNotes("");
                    }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                      + Add
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {crmCustomers?.map(c => (
                      <div key={c._id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-start justify-between gap-3 hover:border-blue-500/20 transition-all">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-black text-white text-sm truncate">{c.name}</p>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              c.tag === "vip" ? "bg-yellow-500/20 text-yellow-400" :
                              c.tag === "active" ? "bg-green-500/20 text-green-400" :
                              c.tag === "inactive" ? "bg-red-500/20 text-red-400" :
                              "bg-blue-500/20 text-blue-400"
                            }`}>{c.tag}</span>
                          </div>
                          <p className="text-xs text-gray-400">{c.phone}</p>
                          {c.notes && <p className="text-[10px] text-gray-600 mt-1 truncate">{c.notes}</p>}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`} target="_blank" className="p-2 bg-green-500/10 hover:bg-green-500/20 rounded-lg text-sm transition-colors">💬</a>
                          <button onClick={() => deleteCustomer({ customerId: c._id })} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-sm transition-colors">🗑️</button>
                        </div>
                      </div>
                    ))}
                    {crmCustomers?.length === 0 && <p className="text-xs text-gray-600 col-span-2 text-center py-8">No customers yet. Add your first one above.</p>}
                  </div>
                </>
              )}

              {/* ORDERS TAB */}
              {crmTab === "orders" && (
                <>
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row gap-3">
                    <select value={crmOrderCustomerId} onChange={e => setCrmOrderCustomerId(e.target.value)} className="flex-1 bg-black p-3 rounded-xl border border-white/5 text-xs text-white outline-none">
                      <option value="">Select Customer</option>
                      {crmCustomers?.map(c => <option key={c._id} value={c._id}>{c.name} ({c.phone})</option>)}
                    </select>
                    <input placeholder="Order Title" value={crmOrderTitle} onChange={e => setCrmOrderTitle(e.target.value)} className="flex-1 bg-black p-3 rounded-xl border border-white/5 text-xs text-white outline-none focus:border-blue-500/50" />
                    <input placeholder="Amount (₹)" type="number" value={crmOrderAmount} onChange={e => setCrmOrderAmount(e.target.value)} className="w-32 bg-black p-3 rounded-xl border border-white/5 text-xs text-white outline-none focus:border-blue-500/50" />
                    <input type="date" value={crmOrderDueDate} onChange={e => setCrmOrderDueDate(e.target.value)} className="bg-black p-3 rounded-xl border border-white/5 text-xs text-white outline-none" />
                    <button onClick={async () => {
                      if (!crmOrderCustomerId || !crmOrderTitle || !crmOrderAmount) return alert("Fill all fields!");
                      await addOrder({ customerId: crmOrderCustomerId as any, title: crmOrderTitle, amount: Number(crmOrderAmount), status: "pending", dueDate: crmOrderDueDate ? new Date(crmOrderDueDate).getTime() : undefined });
                      setCrmOrderTitle(""); setCrmOrderAmount(""); setCrmOrderCustomerId(""); setCrmOrderDueDate("");
                    }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                      + Add
                    </button>
                  </div>

                  <div className="space-y-3">
                    {crmOrders?.map(o => {
                      const customer = crmCustomers?.find(c => c._id === o.customerId);
                      return (
                        <div key={o._id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-blue-500/20 transition-all">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-black text-white text-sm truncate">{o.title}</p>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                o.status === "paid" ? "bg-green-500/20 text-green-400" :
                                o.status === "cancelled" ? "bg-red-500/20 text-red-400" :
                                "bg-yellow-500/20 text-yellow-400"
                              }`}>{o.status}</span>
                            </div>
                            <p className="text-xs text-gray-400">{customer?.name} • ₹{o.amount.toLocaleString()}{o.dueDate ? ` • Due: ${new Date(o.dueDate).toLocaleDateString()}` : ""}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {o.status === "pending" && (
                              <>
                                <button onClick={() => updateOrderStatus({ orderId: o._id, status: "paid" })} className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-[10px] font-black uppercase transition-colors">Paid</button>
                                <button onClick={() => {
                                  if (!customer) return;
                                  const msg = encodeURIComponent(`Hi ${customer.name}, your order "${o.title}" of ₹${o.amount} is pending payment.${o.dueDate ? ` Due: ${new Date(o.dueDate).toLocaleDateString()}` : ""} Please complete it. - TARS`);
                                  window.open(`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
                                }} className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-[10px] font-black uppercase transition-colors">🔔 Remind</button>
                              </>
                            )}
                            <button onClick={() => deleteOrder({ orderId: o._id })} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-sm transition-colors">🗑️</button>
                          </div>
                        </div>
                      );
                    })}
                    {crmOrders?.length === 0 && <p className="text-xs text-gray-600 text-center py-8">No orders yet.</p>}
                  </div>
                </>
              )}

              {/* QUICK REPLIES TAB */}
              {crmTab === "replies" && (
                <>
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row gap-3">
                    <input placeholder="Shortcut (e.g. /ty)" value={crmReplyShortcut} onChange={e => setCrmReplyShortcut(e.target.value)} className="w-40 bg-black p-3 rounded-xl border border-white/5 text-xs text-white outline-none focus:border-blue-500/50 font-mono" />
                    <input placeholder="Message text" value={crmReplyMessage} onChange={e => setCrmReplyMessage(e.target.value)} className="flex-1 bg-black p-3 rounded-xl border border-white/5 text-xs text-white outline-none focus:border-blue-500/50" />
                    <button onClick={async () => {
                      if (!crmReplyShortcut || !crmReplyMessage) return alert("Fill both fields!");
                      await addQuickReply({ shortcut: crmReplyShortcut, message: crmReplyMessage });
                      setCrmReplyShortcut(""); setCrmReplyMessage("");
                    }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                      + Add
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {crmQuickReplies?.map(r => (
                      <div key={r._id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:border-blue-500/20 transition-all">
                        <span className="font-mono text-blue-400 font-black text-xs bg-blue-500/10 px-2 py-1 rounded-lg shrink-0">{r.shortcut}</span>
                        <p className="flex-1 text-xs text-gray-300 truncate">{r.message}</p>
                        <button onClick={() => {
                          setMessageText(r.message);
                          setIsCrmOpen(false);
                        }} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-sm transition-colors" title="Use in chat">💬</button>
                        <button onClick={() => deleteQuickReply({ replyId: r._id })} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-sm transition-colors">🗑️</button>
                      </div>
                    ))}
                    {crmQuickReplies?.length === 0 && <p className="text-xs text-gray-600 col-span-2 text-center py-8">No quick replies yet.</p>}
                  </div>

                  <div className="bg-blue-600/5 border border-blue-500/20 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">⚡ How to use</p>
                    <p className="text-xs text-gray-400">Type your shortcut (e.g. <span className="font-mono text-blue-400">/ty</span>) in the chat input, then click the matching quick reply to paste the full message instantly.</p>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 📈 MODAL: PRODUCTIVITY TRACKER */}
      {isProdOpen && (() => {
        const totalMinutes = weeklyUsage?.reduce((s, d) => s + d.minutes, 0) ?? 0;
        const totalMessages = weeklyUsage?.reduce((s, d) => s + d.messages, 0) ?? 0;
        const avgDaily = weeklyUsage?.length ? Math.round(totalMinutes / 7) : 0;
        const maxMinutes = Math.max(...(weeklyUsage?.map(d => d.minutes) ?? [1]), 1);
        const distractionScore = Math.min(100, Math.round((totalMinutes / 7) * 1.5));
        const focusFormatted = `${String(Math.floor(focusElapsed / 3600)).padStart(2,"0")}:${String(Math.floor((focusElapsed % 3600) / 60)).padStart(2,"0")}:${String(focusElapsed % 60).padStart(2,"0")}`;

        return (
          <div className="fixed inset-0 z-[960] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#111] w-full max-w-4xl max-h-[90vh] rounded-[40px] border border-white/5 p-8 shadow-2xl flex flex-col gap-6 overflow-y-auto custom-scrollbar">
              
              {/* HEADER */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-black italic text-blue-500 uppercase tracking-tighter">📈 Productivity Tracker</h2>
                  <p className="text-[10px] uppercase tracking-[3px] opacity-40">Usage Analysis • Distraction Score • Focus Mode</p>
                </div>
                <button onClick={() => setIsProdOpen(false)} className="bg-white/5 px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-red-500/20">✕ Close</button>
              </div>

              {/* STATS ROW */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "This Week", value: `${totalMinutes}m`, sub: "total usage", color: "text-blue-400" },
                  { label: "Daily Avg", value: `${avgDaily}m`, sub: "per day", color: "text-purple-400" },
                  { label: "Messages", value: totalMessages, sub: "sent this week", color: "text-green-400" },
                  { label: "Distraction", value: `${distractionScore}%`, sub: "score", color: distractionScore > 60 ? "text-red-400" : distractionScore > 30 ? "text-yellow-400" : "text-green-400" },
                ].map(stat => (
                  <div key={stat.label} className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-1">{stat.label}</p>
                    <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                    <p className="text-[9px] opacity-30 uppercase tracking-wider mt-1">{stat.sub}</p>
                  </div>
                ))}
              </div>

              {/* DAILY USAGE BAR CHART */}
              <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-5">Daily Usage Graph (Last 7 Days)</p>
                <div className="flex items-end gap-3 h-32">
                  {weeklyUsage?.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-[9px] font-black text-blue-400">{d.minutes > 0 ? `${d.minutes}m` : ""}</span>
                      <div className="w-full rounded-t-lg transition-all duration-500" style={{
                        height: `${Math.max(4, (d.minutes / maxMinutes) * 100)}px`,
                        background: d.minutes > 60 ? "#ef4444" : d.minutes > 30 ? "#f59e0b" : "#2563eb",
                        opacity: d.minutes === 0 ? 0.2 : 1,
                      }} />
                      <span className="text-[9px] font-black opacity-40 uppercase">{d.day}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-4 justify-center">
                  {[["#2563eb", "< 30m (Good)"], ["#f59e0b", "30-60m (Moderate)"], ["#ef4444", "> 60m (High"]].map(([color, label]) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-[9px] font-bold opacity-50 uppercase tracking-wider">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* DISTRACTION SCORE */}
              <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-4">Distraction Score Analysis</p>
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ffffff10" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none"
                        stroke={distractionScore > 60 ? "#ef4444" : distractionScore > 30 ? "#f59e0b" : "#22c55e"}
                        strokeWidth="3"
                        strokeDasharray={`${distractionScore} ${100 - distractionScore}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xl font-black ${distractionScore > 60 ? "text-red-400" : distractionScore > 30 ? "text-yellow-400" : "text-green-400"}`}>{distractionScore}%</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className={`font-black text-lg ${ distractionScore > 60 ? "text-red-400" : distractionScore > 30 ? "text-yellow-400" : "text-green-400"}`}>
                      {distractionScore > 60 ? "🔴 High Distraction" : distractionScore > 30 ? "🟡 Moderate Usage" : "🟢 Focused & Productive"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {distractionScore > 60
                        ? "You're spending too much time on chat. Enable Focus Mode to block distractions."
                        : distractionScore > 30
                        ? "Usage is moderate. Try to batch your messages instead of checking constantly."
                        : "Great job! You're using chat efficiently. Keep it up!"}
                    </p>
                    <div className="flex gap-2 flex-wrap mt-2">
                      {["Check messages 3x/day", "Batch replies", "Mute non-urgent groups"].map(tip => (
                        <span key={tip} className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg font-bold">⚡ {tip}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* FOCUS MODE */}
              <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-4">Focus Mode</p>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all ${
                      activeFocus ? "border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] animate-pulse" : "border-white/10"
                    }`}>
                      <div className="text-center">
                        <p className={`text-2xl font-black font-mono ${ activeFocus ? "text-green-400" : "text-gray-600"}`}>{focusFormatted}</p>
                        <p className="text-[9px] uppercase font-black opacity-40 tracking-widest">{activeFocus ? "ACTIVE" : "IDLE"}</p>
                      </div>
                    </div>
                    {!activeFocus ? (
                      <button onClick={() => startFocus()} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20">
                        ▶ Start Focus
                      </button>
                    ) : (
                      <button onClick={async () => { const mins = await endFocus(); if (mins) alert(`🎉 Focus session complete! You stayed focused for ${mins} minutes.`); }} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                        ■ End Focus
                      </button>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-xs text-gray-400">{activeFocus ? "🔒 Focus mode is ON. Stay off distractions and complete your work!" : "Start a focus session to track your deep work time and build better habits."}</p>
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Recent Sessions</p>
                      {focusHistory?.filter(f => !f.isActive).slice(0, 4).map((f, i) => (
                        <div key={i} className="flex items-center justify-between bg-black/40 rounded-xl px-4 py-2">
                          <span className="text-xs text-gray-400">{new Date(f.startTime).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</span>
                          <span className="text-xs font-black text-green-400">{f.durationMinutes ?? 0}m focused</span>
                        </div>
                      ))}
                      {(!focusHistory || focusHistory.filter(f => !f.isActive).length === 0) && (
                        <p className="text-[10px] text-gray-600 text-center py-2">No sessions yet. Start your first focus session!</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* --- SIDEBAR CONSOLE GRID --- */}
      <div className="w-full md:max-w-[420px] flex flex-col bg-[#0f0f0f] md:rounded-[40px] border border-white/5 md:flex md:shadow-2xl">
        <div className="p-6 pb-4">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-5xl font-black italic text-blue-600 tracking-tighter">TARS</h1>
            <div className="flex items-center gap-3 relative" ref={settingsRef}>
              <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-2 bg-white/5 rounded-xl text-lg">⚙️</button>
              
              {/* ⚙️ DYNAMIC SYSTEM HUB DROP-CONSOLES */}
              {isSettingsOpen && (
                <div className="absolute top-14 right-0 w-60 bg-[#141414] border border-white/10 rounded-2xl p-2.5 shadow-2xl z-[999] flex flex-col gap-1">
                  <button onClick={() => { setIsLinkGenOpen(true); setIsSettingsOpen(false); }} className="w-full px-3 py-2.5 text-left bg-blue-600/10 border border-blue-500/30 rounded-xl text-xs font-bold text-blue-400 flex items-center gap-2 hover:bg-blue-600/20 transition-all">🔗 Link Router & QR Matrix</button>
                  <button onClick={() => { setIsReminderModalOpen(true); setIsSettingsOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-white/5 rounded-xl text-xs font-bold text-gray-200 flex items-center gap-2">⏰ Chrono Router</button>
                  <button onClick={() => { setIsStudyHubOpen(true); setIsSettingsOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-white/5 rounded-xl text-xs font-bold text-gray-200 flex items-center gap-2">📚 Academy Study Hub</button>
                  <button onClick={() => { setIsStickerModalOpen(true); setIsSettingsOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-white/5 rounded-xl text-xs font-bold text-gray-200 flex items-center gap-2">✨ Sticker Forge</button>
                  <button onClick={() => { setIsAnalyzerOpen(true); setIsSettingsOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-white/5 rounded-xl text-xs font-bold text-gray-200 flex items-center gap-2">📊 Chat Analyzer Console</button>
                  <button onClick={() => { setIsCrmOpen(true); setIsSettingsOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-white/5 rounded-xl text-xs font-bold text-gray-200 flex items-center gap-2">💼 Mini CRM</button>
                  <button onClick={() => { setIsProdOpen(true); setIsSettingsOpen(false); }} className={`w-full px-3 py-2 text-left hover:bg-white/5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeFocus ? "text-green-400 animate-pulse" : "text-gray-200"}`}>📈 Productivity Tracker {activeFocus && <span className="ml-auto text-[9px] bg-green-500/20 px-2 py-0.5 rounded-full">FOCUS ON</span>}</button>
                </div>
              )}
              <UserButton />
            </div>
          </div>

          {/* 👤 PROFILE AVATAR BUTTON */}
          <button
            onClick={() => { setIsProfileOpen(true); setProfileTab("overview"); }}
            className="flex items-center gap-3 w-full bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-2xl p-3 transition-all mb-4 group"
          >
            <div className="relative shrink-0">
              <img src={currentUser?.image || user?.imageUrl} className="w-10 h-10 rounded-xl object-cover border border-white/10" alt="" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0f0f0f] rounded-full" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-black text-white text-sm truncate">{currentUser?.name || user?.firstName}</p>
              <p className="text-[10px] text-gray-500 truncate">{currentUser?.about || "Tap to view profile"}</p>
            </div>
            <span className="text-gray-600 group-hover:text-blue-500 transition-colors text-xs">›</span>
          </button>
            <input type="text" placeholder="Scan signals..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black p-4 rounded-[20px] border border-white/5 text-white outline-none focus:border-blue-500/40 text-sm font-semibold shadow-inner" />
            <button onClick={() => setIsGroupModalOpen(true)} className="bg-blue-600 p-4 rounded-[20px] font-black text-sm text-white hover:bg-blue-700 transition-colors">＋</button>
          </div>
        </div>

        {/* --- CONVERSATIONS VECTOR MATRIX LIST --- */}
        <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-3 custom-scrollbar">
          {conversations?.map((conv: any) => (
            <div key={conv._id} onClick={() => { setConvId(conv._id); setSelectedChat(conv); setMobileChatActive(true); }} className={`flex items-center gap-5 p-5 rounded-[32px] cursor-pointer transition-all ${convId === conv._id ? "bg-blue-600/10 border border-blue-500/40 shadow-lg" : "bg-white/[0.02] border border-transparent hover:bg-white/[0.04]"}`}>
              <div className="w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center overflow-hidden border border-white/5 shrink-0">
                <img src={conv.isGroup ? conv.groupImage || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150" : conv.otherUser?.image} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-black text-white text-base truncate">{conv.isGroup ? conv.name : conv.otherUser?.name}</h3>
                  <span className="text-[10px] font-bold opacity-30 tracking-wider shrink-0">{formatSmartTime(conv.lastMessageTime)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-400 truncate max-w-[85%]">{conv.lastMessage || "Secure Vector"}</p>
                  <p className="text-[10px] uppercase font-bold opacity-40 font-mono tracking-wider">{conv.isGroup ? "Fleet Grid" : "Secure Line"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- CORE INTERACTIVE CHAT HUB CORES --- */}
      <div className={`flex-1 flex-col bg-[#0f0f0f] md:rounded-[40px] border border-white/5 md:flex relative overflow-hidden shadow-2xl ${mobileChatActive ? "flex fixed inset-0 z-[100] md:relative" : "hidden md:flex"}`}>
        {selectedChat ? (
          <div className="flex flex-col h-full">
            {/* HUB HEADER */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-6">
                <button onClick={() => setMobileChatActive(false)} className="md:hidden text-blue-500 text-xl font-bold pr-2">←</button>
                <div className="w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center overflow-hidden border border-white/5">
                  <img src={selectedChat.isGroup ? selectedChat.groupImage || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150" : selectedChat.otherUser?.image} className="w-full h-full object-cover" alt="" />
                </div>
                <div>
                  <h3 className="font-black text-white text-xl tracking-tight">{selectedChat.isGroup ? selectedChat.name : selectedChat.otherUser?.name}</h3>
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">Secure Handshake Complete</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => startZegoCall(false)} className="p-3 bg-white/5 rounded-xl hover:bg-blue-600/10 transition-colors">📞</button>
                <button onClick={() => startZegoCall(true)} className="p-3 bg-white/5 rounded-xl hover:bg-blue-600/10 transition-colors">📹</button>
              </div>
            </div>

            {/* MESSAGE STREAM AREA */}
            <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 p-8 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
              {messages?.map((msg: any) => {
                const isMe = msg.senderId === currentUser?._id;
                return (
                  <div key={msg._id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`p-5 rounded-[26px] max-w-xl md:max-w-2xl border ${isMe ? "bg-blue-600 text-white border-blue-500/30 shadow-xl" : "bg-[#161616] border-white/5 text-gray-200"}`}>
                      {msg.format === "image" && <img src={msg.fileUrl} className="max-w-xs md:max-w-md mb-2 object-cover rounded-xl" alt="" />}
                      {msg.format === "audio" && <audio src={msg.fileUrl} controls className="max-w-xs mb-2 invert opacity-80" />}
                      {msg.format === "text" && <p className="text-sm leading-relaxed break-words text-left" dangerouslySetInnerHTML={{ __html: formatWhatsAppText(msg.body) }} />}
                      <span className="block text-[8px] opacity-30 text-right mt-1.5 font-bold tracking-wider">{formatSmartTime(msg._creationTime)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            {/* AI SUGGESTION OVERLAY ROW CONTAINER */}
            {aiSuggestions.length > 0 && (
              <div className="px-10 pb-3 flex gap-2 overflow-x-auto custom-scrollbar">
                {aiSuggestions.map((sug, idx) => (
                  <button key={idx} onClick={() => handleSendMessage(undefined, sug)} className="bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 text-blue-400 hover:text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md whitespace-nowrap">{sug}</button>
                ))}
              </div>
            )}

            {/* INPUT FORM PROTOCOL */}
            <div className="p-10 pt-0">
              {/* Quick Reply Suggestions */}
              {messageText.startsWith("/") && crmQuickReplies && crmQuickReplies.filter(r => r.shortcut.startsWith(messageText)).length > 0 && (
                <div className="mb-3 flex gap-2 flex-wrap">
                  {crmQuickReplies.filter(r => r.shortcut.startsWith(messageText)).map(r => (
                    <button key={r._id} onClick={() => setMessageText(r.message)} className="bg-blue-600/10 border border-blue-500/30 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-blue-600/20 transition-all">
                      <span className="font-mono">{r.shortcut}</span> — {r.message.slice(0, 30)}{r.message.length > 30 ? "..." : ""}
                    </button>
                  ))}
                </div>
              )}
              <div className="bg-[#111] p-4 rounded-[35px] border border-white/5 shadow-2xl flex items-center gap-5 shadow-2xl relative">
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-2xl hover:scale-105 transition-transform">😊</button>
                {showEmojiPicker && (
                  <div className="absolute bottom-24 left-4 z-[99] shadow-2xl rounded-2xl overflow-hidden border border-white/5">
                    <EmojiPicker theme={"dark" as any} onEmojiClick={(emo) => setMessageText(prev => prev + emo.emoji)} />
                  </div>
                )}
                
                <label className="text-2xl cursor-pointer hover:scale-105 transition-transform">
                  📎
                  <input type="file" onChange={(e) => { const file = e.target.files?.[0]; if(file) handleUploadFile(file, file.type.startsWith("image/") ? "image" : "file"); }} className="hidden" />
                </label>
                
                <button type="button" onClick={toggleRecording} className={`text-2xl hover:scale-105 transition-transform ${isRecording ? "text-red-500 animate-pulse" : ""}`}>🎙️</button>

                <form onSubmit={handleSendMessage} className="flex-1 flex gap-4">
                  <input type="text" value={messageText} onChange={(e) => {
                    setMessageText(e.target.value);
                    }} placeholder="Transmit vector signal..." className="flex-1 bg-transparent outline-none text-white text-sm font-semibold" />
                  <button type="submit" className="bg-blue-600 text-white px-10 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-md">Send</button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#111_0%,_#050505_100%)]">
            <h2 className="text-8xl font-black italic tracking-[-.08em] text-white/5 select-none uppercase pl-[30px]">TARS</h2>
            <p className="text-[11px] tracking-[8px] uppercase font-black text-blue-600/40 mt-[-40px]">Ecosystem Monitoring Matrix Online</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(37, 99, 235, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(37, 99, 235, 0.5); }
      `}</style>
    </div>
  );
}