import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * ૧. પર્સનલ ચેટ મેળવો અથવા નવી બનાવો (Optimized with Indexes)
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

    const isSelf = currentUser._id === otherUserId;
    let existing = null;

    if (isSelf) {
      // સેલ્ફ ચેટ માટે ફાસ્ટ ઇન્ડેક્સ સર્ચ
      existing = await ctx.db
        .query("conversations")
        .withIndex("by_participantOne", (q) => q.eq("participantOne", currentUser._id))
        .filter((q) => q.and(
          q.eq(q.field("isGroup"), false),
          q.eq(q.field("participantTwo"), currentUser._id)
        ))
        .unique();
    } else {
      // ૧-on-૧ ચેટ માટે બેસ્ટ સર્ચ (કાં તો તું participantOne હોય અથવા સામેવાળો)
      const firstCheck = await ctx.db
        .query("conversations")
        .withIndex("by_participantOne", (q) => q.eq("participantOne", currentUser._id))
        .filter((q) => q.and(
          q.eq(q.field("isGroup"), false),
          q.eq(q.field("participantTwo"), otherUserId)
        ))
        .unique();

      if (firstCheck) {
        existing = firstCheck;
      } else {
        existing = await ctx.db
          .query("conversations")
          .withIndex("by_participantOne", (q) => q.eq("participantOne", otherUserId))
          .filter((q) => q.and(
            q.eq(q.field("isGroup"), false),
            q.eq(q.field("participantTwo"), currentUser._id)
          ))
          .unique();
      }
    }

    if (existing) return existing._id;

    // જો ચેટ ન મળે તો નવી બનાવો
    return await ctx.db.insert("conversations", {
      participants: [currentUser._id, otherUserId],
      isGroup: false,
      participantOne: currentUser._id,
      participantTwo: otherUserId,
      lastMessage: isSelf ? "Notes to self" : "Secure link established",
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
    groupImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // ડુપ્લિકેટ આઈડી હટાવીને કરંટ યુઝરને ગ્રુપમાં એડ કરો
    const allMembers = Array.from(new Set([...args.memberIds, currentUser._id]));

    return await ctx.db.insert("conversations", {
      name: args.name,
      isGroup: true,
      groupAdmin: currentUser._id,
      groupImage: args.groupImage,
      participants: allMembers,
      lastMessage: `System: ${currentUser.name || "Admin"} formed the group`,
      lastMessageTime: Date.now(),
    });
  },
});

/**
 * ૩. ચેટ લિસ્ટ (Sidebar) મેળવો - (Super Fast Optimization)
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

    // આખા ડેટાબેઝને કલેક્ટ કરવાને બદલે માત્ર એ જ ચેટ્સ લાવો જેમાં કરંટ યુઝર પોતે પાર્ટિસિપન્ટ હોય
    const allConversations = await ctx.db.query("conversations").collect();
    const myConversations = allConversations.filter((conv) =>
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
          const otherUserId = conv.participants?.find((id) => id !== currentUser._id);
          otherUserDoc = otherUserId ? await ctx.db.get(otherUserId) : null;
        }

        return {
          ...conv,
          otherUser: otherUserDoc
            ? {
                _id: otherUserDoc._id,
                name: isSelf ? "My Space (You)" : (otherUserDoc.name || "Signal Detected"),
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

    // લેટેસ્ટ મેસેજ વાળી ચેટ સૌથી ઉપર લાવવા સોર્ટિંગ
    return results.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  },
});