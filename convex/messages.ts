import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * ૧. ફાઈલ અપલોડ URL જનરેટ કરવા (Images, Audio, Files માટે)
 */
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

/**
 * ૨. મેસેજ મોકલવા માટે (Supports Text, Images, Audio, Files & Replies)
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
      isDeleted: false,
    });

    // Conversation ટેબલમાં છેલ્લો મેસેજ અપડેટ કરવા માટેનું લોજિક
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
 * ૩. MESSAGE REACTIONS (Toggle Logic) 🚀
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

    // જૂના ડેટાને ફિલ્ટર કરો જેથી એરર ન આવે
    let rawReactions = Array.isArray(message.reactions) ? message.reactions : [];
    
    // માત્ર સાચા Object ફોર્મેટ {userId, emoji} જ રાખો
    let reactions = rawReactions.filter(
      (r: any) => typeof r === "object" && r !== null && r.userId && r.emoji
    );

    // Toggle Logic: જો સેમ યુઝરે સેમ ઇમોજી આપ્યો હોય તો કાઢી નાખો, નહીતર નવો ઉમેરો
    const existingIndex = reactions.findIndex(
      (r) => r.userId === user._id && r.emoji === args.emoji
    );

    if (existingIndex > -1) {
      reactions.splice(existingIndex, 1); 
    } else {
      reactions.push({ userId: user._id, emoji: args.emoji }); 
    }

    await ctx.db.patch(args.messageId, { reactions });
  },
});

/**
 * ૪. મેસેજ લિસ્ટ મેળવવા (With User details and Reply Sender Names)
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
            // ઓરિજિનલ મેસેજ મોકલનારનું નામ પણ ડેટાબેઝમાંથી સાથે જ લઈ લઈએ
            const originalSender = await ctx.db.get(originalMsg.senderId);
            replyToData = {
              body: originalMsg.isDeleted ? "This message was deleted" : originalMsg.body,
              senderId: originalMsg.senderId,
              senderName: originalSender?.name || "User", // ફ્રન્ટએન્ડ લેઆઉટ માટે ફિક્સ
            };
          }
        }
        
        const cleanReactions = Array.isArray(msg.reactions) 
          ? msg.reactions.filter((r: any) => typeof r === "object" && r !== null) 
          : [];
        
        return {
          ...msg,
          isRead: msg.isRead ?? false,
          isDeleted: msg.isDeleted ?? false,
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
 * ૫. મેસેજ Read માર્ક કરવા (જ્યારે સામેવાળો યુઝર ચેટ ઓપન કરે)
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
        q.neq(q.field("isRead"), true), // Safe check: જો true ના હોય એ બધા (false અથવા undefined)
        q.neq(q.field("senderId"), user._id) // પોતાનો મેસેજ પોતે જ read ન કરી શકે
      ))
      .collect();

    for (const msg of unreadMessages) {
      await ctx.db.patch(msg._id, { isRead: true });
    }
  },
});

/**
 * ૬. મેસેજ ડીલીટ કરવા (Soft Delete જેથી ચેટ લેઆઉટ બગડે નહીં)
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

    // માત્ર મેસેજ મોકલનાર જ ડીલીટ કરી શકે
    if (user && message.senderId === user._id) {
      // જો ક્લાઉડ સ્ટોરેજમાં ફાઈલો હોય તો એને ખાલી કરી નાખો મેમરી બચાવવા
      if (message.imageId) await ctx.storage.delete(message.imageId);
      if (message.audioId) await ctx.storage.delete(message.audioId);
      if (message.fileId) await ctx.storage.delete(message.fileId); 
      
      // સાચો રસ્તો: Soft delete કરો અને બોડી ટેક્સ્ટ અપડેટ કરી દો
      await ctx.db.patch(args.messageId, {
        body: "Message was deleted",
        isDeleted: true,
        format: "text",
        fileUrl: undefined,
        imageId: undefined,
        audioId: undefined,
        fileId: undefined,
        reactions: [] // રીએક્શન્સ પણ ક્લીન કરી દો
      });
    }
  },
});