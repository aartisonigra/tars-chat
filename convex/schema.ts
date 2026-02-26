import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
    name: v.optional(v.string()),
    isGroup: v.optional(v.boolean()),
    groupAdmin: v.optional(v.id("users")),
    groupImage: v.optional(v.string()),
    participants: v.optional(v.array(v.id("users"))), 
    participantOne: v.optional(v.id("users")),
    participantTwo: v.optional(v.id("users")),
    lastMessage: v.optional(v.string()),
    lastMessageTime: v.optional(v.number()),
  }).index("by_participants", ["participants" as any]), 

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(), 
    imageId: v.optional(v.id("_storage")), 
    audioId: v.optional(v.id("_storage")), 
    fileId: v.optional(v.id("_storage")), 
    
    // ✅ format ને optional કર્યું જેથી જૂના મેસેજમાં એરર ન આવે
    format: v.optional(v.union(
      v.literal("text"), 
      v.literal("image"), 
      v.literal("audio"), 
      v.literal("file") 
    )), 
    
    fileUrl: v.optional(v.string()), 
    isRead: v.optional(v.boolean()),     
    replyToId: v.optional(v.id("messages")), 
    
    // ✅ Reactions: આ ફોર્મેટ હવે સુરક્ષિત છે
    reactions: v.optional(v.array(v.object({
      userId: v.id("users"),
      emoji: v.string()
    }))), 
    
    isDeleted: v.optional(v.boolean()), 
  })
  .index("by_conversation", ["conversationId"])
  .index("by_sender", ["senderId"]),
});