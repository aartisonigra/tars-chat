import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    return await ctx.db.query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
  },
});

export const send = mutation({
  args: { body: v.string(), conversationId: v.id("conversations"), senderId: v.id("users") },
  handler: async (ctx, { body, conversationId, senderId }) => {
    await ctx.db.insert("messages", { body, conversationId, senderId });
  },
});