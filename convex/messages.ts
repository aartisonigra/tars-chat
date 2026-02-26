import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * ૧. ફાઈલ અપલોડ URL જનરેટ કરવા
 */
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

/**
 * ૨. મેસેજ મોકલવા માટે
 */
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
    format: v.optional(v.union(
      v.literal("text"), 
      v.literal("image"), 
      v.literal("audio"),
      v.literal("file")
    )),
    imageId: v.optional(v.id("_storage")),
    audioId: v.optional(v.id("_storage")),
    fileId: v.optional(v.id("_storage")),
    replyToId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) throw new Error("User not found");

    let fileUrl = undefined;
    const storageId = args.imageId || args.audioId || args.fileId;
    if (storageId) {
      const url = await ctx.storage.getUrl(storageId);
      if (url) fileUrl = url;
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: user._id,
      body: args.body,
      format: args.format ?? "text",
      imageId: args.imageId,
      audioId: args.audioId,
      fileId: args.fileId,
      fileUrl: fileUrl,
      replyToId: args.replyToId,
      isRead: false,
      reactions: [], 
    });

    let lastMsgText = args.body;
    if (args.format === "image") lastMsgText = "📷 Photo";
    else if (args.format === "audio") lastMsgText = "🎤 Voice Message";
    else if (args.format === "file") lastMsgText = "📄 Document";

    await ctx.db.patch(args.conversationId, {
      lastMessage: lastMsgText,
      lastMessageTime: Date.now(),
    });

    return messageId;
  },
});

/**
 * ૩. MESSAGE REACTIONS (Cleaned & Improved) 🚀
 * આ ફંક્શન ખાતરી કરે છે કે ડેટાબેઝમાં સ્કીમા મુજબ જ ડેટા સેવ થાય.
 */
export const addReaction = mutation({
  args: { messageId: v.id("messages"), emoji: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) throw new Error("User not found");

    const message = await ctx.db.get(args.messageId);
    if (!message) return;

    // ૧. જૂના ડેટાને ફિલ્ટર કરો જેથી એરર ન આવે
    let rawReactions = Array.isArray(message.reactions) ? message.reactions : [];
    
    // માત્ર સાચા Object ફોર્મેટ {userId, emoji} જ રાખો
    let reactions = rawReactions.filter(
      (r: any) => typeof r === "object" && r !== null && r.userId && r.emoji
    );

    // ૨. Toggle Logic
    const existingIndex = reactions.findIndex(
      (r) => r.userId === user._id && r.emoji === args.emoji
    );

    if (existingIndex > -1) {
      reactions.splice(existingIndex, 1); // કાઢી નાખો
    } else {
      reactions.push({ userId: user._id, emoji: args.emoji }); // ઉમેરો
    }

    // ૩. અપડેટ
    await ctx.db.patch(args.messageId, { reactions });
  },
});

/**
 * ૪. મેસેજ લિસ્ટ મેળવવા (With Cleanup)
 */
export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    return await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        
        let replyToData = null;
        if (msg.replyToId) {
          const originalMsg = await ctx.db.get(msg.replyToId);
          if (originalMsg) {
            replyToData = {
              body: originalMsg.body,
              senderId: originalMsg.senderId,
            };
          }
        }
        
        // ફ્રન્ટએન્ડ માટે ક્લીન રિએક્શન લિસ્ટ
        const cleanReactions = Array.isArray(msg.reactions) 
          ? msg.reactions.filter((r: any) => typeof r === "object" && r !== null) 
          : [];
        
        return {
          ...msg,
          isRead: msg.isRead ?? false,
          senderName: sender?.name || "User",
          senderImage: sender?.image,
          reactions: cleanReactions, 
          replyTo: replyToData,
        };
      })
    );
  },
});

/**
 * ૫. મેસેજ Read માર્ક કરવા
 */
export const markAsRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) return;

    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.and(
        q.eq(q.field("isRead"), false),
        q.neq(q.field("senderId"), user._id)
      ))
      .collect();

    for (const msg of unreadMessages) {
      await ctx.db.patch(msg._id, { isRead: true });
    }
  },
});

/**
 * ૬. મેસેજ ડીલીટ કરવા
 */
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const message = await ctx.db.get(args.messageId);
    if (!message) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (user && message.senderId === user._id) {
      if (message.imageId) await ctx.storage.delete(message.imageId);
      if (message.audioId) await ctx.storage.delete(message.audioId);
      if (message.fileId) await ctx.storage.delete(message.fileId); 
      
      await ctx.db.delete(args.messageId);
    }
  },
});