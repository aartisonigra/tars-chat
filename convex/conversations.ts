import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * ૧. પર્સનલ ચેટ મેળવો અથવા નવી બનાવો (Self Message સપોર્ટ સાથે)
 */
export const getOrCreate = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, { otherUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!currentUser) throw new Error("Current user not found");

    const allConversations = await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("isGroup"), false))
      .collect();

    const existing = allConversations.find((conv) => {
      const p = conv.participants || [];
      if (currentUser._id === otherUserId) {
        return p.length === 2 && p[0] === currentUser._id && p[1] === currentUser._id;
      }
      return p.includes(currentUser._id) && p.includes(otherUserId);
    });

    if (existing) return existing._id;

    return await ctx.db.insert("conversations", {
      participants: [currentUser._id, otherUserId],
      isGroup: false,
      participantOne: currentUser._id,
      participantTwo: otherUserId,
      lastMessage: currentUser._id === otherUserId ? "Notes to self" : "Secure link established",
      lastMessageTime: Date.now(),
    });
  },
});

/**
 * ૨. નવું ગ્રુપ બનાવો
 */
export const createGroup = mutation({
  args: {
    name: v.string(),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const allMembers = Array.from(new Set([...args.memberIds, currentUser._id]));

    return await ctx.db.insert("conversations", {
      name: args.name,
      isGroup: true,
      groupAdmin: currentUser._id,
      participants: allMembers,
      lastMessage: "System: Secure Group Formed",
      lastMessageTime: Date.now(),
    });
  },
});

/**
 * ૩. ચેટ લિસ્ટ (Sidebar) મેળવો - Image Fix સાથે
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!currentUser) return [];

    const conversations = await ctx.db.query("conversations").collect();

    const myConversations = conversations.filter((conv) =>
      conv.participants?.includes(currentUser._id)
    );

    const results = await Promise.all(
      myConversations.map(async (conv) => {
        // --- ગ્રુપ ચેટ માટે ---
        if (conv.isGroup) {
          return {
            ...conv,
            otherUser: {
              _id: conv._id,
              name: conv.name || "Unnamed Fleet",
              // ગ્રુપ માટે અલગ ડિફોલ્ટ આઇકોન
              image: conv.groupImage || "https://cdn-icons-png.flaticon.com/512/6387/6387947.png",
              isGroup: true,
              memberCount: conv.participants?.length || 0,
            },
          };
        }

        // --- પર્સનલ ચેટ માટે ---
        const isSelf = conv.participantOne === conv.participantTwo;
        let otherUserDoc = null;

        if (isSelf) {
          otherUserDoc = currentUser; 
        } else {
          // સામેવાળા યુઝરને શોધો
          const otherUserId = conv.participants?.find((id) => id !== currentUser._id);
          otherUserDoc = otherUserId ? await ctx.db.get(otherUserId) : null;
        }

        return {
          ...conv,
          otherUser: otherUserDoc
            ? {
                _id: otherUserDoc._id,
                name: isSelf ? "My Space (You)" : (otherUserDoc.name || "Signal Detected"),
                // અહીં જાદુ છે: જો યુઝર પાસે ઈમેજ હોય તો એ જ બતાવો, નહીંતર ડિફોલ્ટ અવતાર
                image: otherUserDoc.image || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                isOnline: otherUserDoc.isOnline ?? false,
                isGroup: false,
              }
            : {
                _id: isSelf ? currentUser._id : (conv.participantTwo || conv._id),
                name: "Unknown Entity",
                image: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                isOnline: false,
                isGroup: false,
              },
        };
      })
    );

    return results.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  },
});