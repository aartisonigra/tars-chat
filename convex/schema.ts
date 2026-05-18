import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ==========================================
  // ૧. CORE CHAT SYSTEM (મુખ્ય ચેટ સિસ્ટમ)
  // ==========================================
  users: defineTable({
    name: v.optional(v.string()),
    email: v.string(),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(),
    phone: v.optional(v.string()),
    about: v.optional(v.string()),      
    isOnline: v.optional(v.boolean()),
    lastSeen: v.optional(v.number()),
    typingTo: v.optional(v.id("users")), 
  }).index("by_token", ["tokenIdentifier"]),

  conversations: defineTable({
    name: v.optional(v.string()), // ગ્રુપનું નામ (જો ગ્રુપ ચેટ હોય તો)
    isGroup: v.optional(v.boolean()),
    groupAdmin: v.optional(v.id("users")),
    groupImage: v.optional(v.string()),
    participants: v.optional(v.array(v.id("users"))), 
    participantOne: v.optional(v.id("users")), // 1-on-1 ચેટના ફાસ્ટ સર્ચ માટે
    participantTwo: v.optional(v.id("users")), // 1-on-1 ચેટના ફાસ્ટ સર્ચ માટે
    lastMessage: v.optional(v.string()),
    lastMessageTime: v.optional(v.number()),
  })
  .index("by_participantOne", ["participantOne"])
  .index("by_participantTwo", ["participantTwo"]), 

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(), 
    imageId: v.optional(v.id("_storage")), 
    audioId: v.optional(v.id("_storage")), 
    fileId: v.optional(v.id("_storage")), 
    format: v.optional(
      v.union(
        v.literal("text"), 
        v.literal("image"), 
        v.literal("audio"), 
        v.literal("file") 
      )
    ), 
    fileUrl: v.optional(v.string()), 
    isRead: v.optional(v.boolean()),     
    replyToId: v.optional(v.id("messages")), // Thread કે Reply મેસેજ માટે
    reactions: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          emoji: v.string()
        })
      )
    ), 
    isDeleted: v.optional(v.boolean()), // Delete for Everyone ફીચર માટે
  })
  .index("by_conversation", ["conversationId"])
  .index("by_sender", ["senderId"]),

  // ==========================================
  // ૨. LINK ROUTER & QR MATRIX (અપડેટેડ)
  // ==========================================
  links: defineTable({
    userId: v.optional(v.id("users")), // ઓપ્શનલ રાખ્યું છે જો યુઝર વગર પણ લિંક જનરેટ કરવી હોય તો
    countryCode: v.string(),            // દા.ત. "IN India (+91)"
    phoneNumber: v.string(),            // યુઝરનો ફોન નંબર
    message: v.string(),                // ટ્રાન્સમિશન પેલોડ (WhatsApp મેસેજ)
    generatedLink: v.string(),          // ફાઇનલ wa.me લિંક
    shortCode: v.optional(v.string()),   // શોર્ટ કોડ
    clicks: v.optional(v.number()),      // એનાલિટિક્સ માટે ક્લિક કાઉન્ટ
    qrCodeUrl: v.optional(v.string()),  // જનરેટ થયેલો QR કોડ URL
    createdAt: v.number(),
  })
  .index("by_phone", ["phoneNumber"])
  .index("by_user", ["userId"]),

  // ==========================================
  // ૩. CHRONO ROUTER (ટાસ્ક / મેસેજ શેડ્યૂલર)
  // ==========================================
  chronoTasks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    scheduledTime: v.number(), // ક્યારે ટાસ્ક કે રિમાઇન્ડર ટ્રિગર કરવું છે (Timestamp)
    status: v.string(),        // "pending" | "completed" | "failed"
    conversationId: v.optional(v.id("conversations")), // જો ચેટમાં ઓટોમેટિક મેસેજ મોકલવો હોય તો
    createdAt: v.number(),
  })
  .index("by_time", ["scheduledTime"])
  .index("by_user_status", ["userId", "status"]),

  // ==========================================
  // ૪. ACADEMY STUDY HUB (નોટ્સ અને અસાઇનમેન્ટ્સ)
  // ==========================================
  studyDocs: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")), // Convex બિલ્ટ-ઇન ફાઇલ સ્ટોરેજ આઈડી
    fileUrl: v.optional(v.string()),       // ફાઇલ ડાઉનલોડ કરવા માટેની લિંક
    subject: v.optional(v.string()),       // કયા સબ્જેક્ટનું મટીરીયલ છે તે ફિલ્ટર કરવા માટે
    conversationId: v.optional(v.id("conversations")), // જો કોઈ ચોક્કસ સ્ટડી ગ્રુપમાં શેર કરવું હોય
    createdAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_subject", ["subject"]),

  // ==========================================
  // ૫. STICKER FORGE (કસ્ટમ ચેટ સ્ટીકર્સ)
  // ==========================================
  stickers: defineTable({
    userId: v.id("users"),
    name: v.string(),
    stickerImageId: v.id("_storage"), // સ્ટીકર ઈમેજનું આઈડી
    stickerUrl: v.string(),
    packName: v.optional(v.string()), // કયા સ્ટીકર પેકનો ભાગ છે
  })
  .index("by_user", ["userId"])
  .index("by_pack", ["packName"]),

  // ==========================================
  // 6. WHATSAPP MINI CRM
  // ==========================================
  crmCustomers: defineTable({
    userId: v.id("users"),
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    tag: v.optional(v.string()),     // "lead" | "active" | "vip" | "inactive"
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_phone", ["phone"]),

  crmOrders: defineTable({
    userId: v.id("users"),
    customerId: v.id("crmCustomers"),
    title: v.string(),
    amount: v.number(),
    status: v.string(),              // "pending" | "paid" | "cancelled"
    dueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_customer", ["customerId"])
  .index("by_status", ["status"]),

  crmQuickReplies: defineTable({
    userId: v.id("users"),
    shortcut: v.string(),
    message: v.string(),
    createdAt: v.number(),
  })
  .index("by_user", ["userId"]),

  // ==========================================
  // 7. PRODUCTIVITY TRACKER
  // ==========================================
  usageSessions: defineTable({
    userId: v.id("users"),
    date: v.string(),           // "YYYY-MM-DD"
    sessionStart: v.number(),   // timestamp
    sessionEnd: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    messagesSent: v.optional(v.number()),
  })
  .index("by_user", ["userId"])
  .index("by_user_date", ["userId", "date"]),

  focusSessions: defineTable({
    userId: v.id("users"),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    isActive: v.boolean(),
  })
  .index("by_user", ["userId"]),
});