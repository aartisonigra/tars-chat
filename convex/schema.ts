import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ૧. યુઝર્સ ટેબલ (નામ હવે ઓપ્શનલ છે જેથી એરર ના આવે)
  users: defineTable({
    name: v.optional(v.string()), // ફેરફાર અહીં કર્યો છે
    email: v.string(),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  // ૨. બે યુઝર વચ્ચેની વાતચીત (Conversations)
  conversations: defineTable({
    participantOne: v.id("users"),
    participantTwo: v.id("users"),
    lastMessage: v.optional(v.string()), // છેલ્લો મેસેજ સ્ટોર કરવા માટે
  }).index("by_participants", ["participantOne", "participantTwo"]),

  // ૩. મેસેજીસ ટેબલ (ખરેખર ચેટ સ્ટોર કરવા માટે)
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(),
    author: v.optional(v.string()), // મેસેજ મોકલનારનું નામ બતાવવા માટે
  }).index("by_conversation", ["conversationId"]),
});