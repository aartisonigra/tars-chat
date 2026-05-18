import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * આખી ચેટ સિસ્ટમના એનાલિટિક્સના આંકડા કાઢવા
 */
export const getChatStats = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const totalMessages = messages.length;
    
    // કોણે કેટલા મેસેજ કર્યા તેનું કાઉન્ટર લોજિક
    const senderCounts: Record<string, number> = {};
    let mediaCount = 0;

    messages.forEach((msg) => {
      senderCounts[msg.senderId] = (senderCounts[msg.senderId] || 0) + 1;
      if (msg.format && msg.format !== "text") {
        mediaCount++;
      }
    });

    return {
      totalMessages,
      mediaCount,
      textCount: totalMessages - mediaCount,
      senderBreakdown: senderCounts, // ફ્રન્ટએન્ડમાં આનાથી પાય-ચાર્ટ કે બાર-ચાર્ટ મસ્ત બનશે
    };
  },
});