import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * ૧. બે યુઝર વચ્ચે પર્સનલ ચેટ મેળવો અથવા નવી બનાવો
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

    // જો ભૂલથી પોતાની સાથે જ ચેટ કરવાની ટ્રાય કરે તો અટકાવો
    if (currentUser._id === otherUserId) throw new Error("Cannot chat with yourself");

    const allConversations = await ctx.db.query("conversations").collect();
    
    // પર્સનલ ચેટ શોધો
    const existing = allConversations.find(conv => {
      if (conv.isGroup) return false;
      
      const participants = conv.participants || [];
      const p1 = (conv as any).participantOne;
      const p2 = (conv as any).participantTwo;

      // નવા array લોજિક અથવા જૂના field લોજિક બંનેથી ચેક કરો
      const matchInArray = participants.includes(currentUser._id) && participants.includes(otherUserId);
      const matchInFields = (p1 === currentUser._id && p2 === otherUserId) || (p1 === otherUserId && p2 === currentUser._id);
      
      return matchInArray || matchInFields;
    });

    if (existing) return existing._id;

    // નવી પર્સનલ ચેટ બનાવો
    return await ctx.db.insert("conversations", {
      participants: [currentUser._id, otherUserId],
      isGroup: false,
      participantOne: currentUser._id, 
      participantTwo: otherUserId,
      lastMessage: "Secure link established",
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

    const allMembers = [...new Set([...args.memberIds, currentUser._id])];

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
 * ૩. ચેટ લિસ્ટ (Sidebar) મેળવો
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

    // ફિલ્ટર: યુઝર જે ચેટનો ભાગ હોય તે જ બતાવો
    const myConversations = conversations.filter(conv => {
      const participants = conv.participants || [];
      return participants.includes(currentUser._id) || 
             (conv as any).participantOne === currentUser._id || 
             (conv as any).participantTwo === currentUser._id;
    });

    const results = await Promise.all(
      myConversations.map(async (conv) => {
        // --- જો ગ્રુપ ચેટ હોય તો ---
        if (conv.isGroup) {
          return {
            ...conv,
            otherUser: {
              name: conv.name || "Unnamed Fleet",
              image: conv.groupImage || "https://cdn-icons-png.flaticon.com/512/6387/6387947.png",
              isGroup: true,
              memberCount: conv.participants?.length || 0
            }
          };
        }

        // --- જો પર્સનલ ચેટ હોય તો ---
        let otherUserId;
        if (conv.participants) {
          otherUserId = conv.participants.find(id => id !== currentUser._id);
        } else {
          otherUserId = (conv as any).participantOne === currentUser._id 
            ? (conv as any).participantTwo 
            : (conv as any).participantOne;
        }

        const otherUserDoc = otherUserId ? await ctx.db.get(otherUserId) : null;

        if (otherUserDoc) {
          // TypeScript ની એરર રોકવા માટે અહીં 'user' ને any તરીકે લીધો છે
          const user = otherUserDoc as any;
          return {
            ...conv,
            otherUser: {
              _id: user._id,
              name: user.name || "Signal Detected",
              image: user.image,
              isOnline: user.isOnline ?? false,
              lastSeen: user.lastSeen,
              isGroup: false
            },
          };
        }

        // જો સામેવાળો યુઝર ન મળે (Deleted User case)
        return {
          ...conv,
          otherUser: {
            _id: otherUserId,
            name: "Deleted Entity",
            image: undefined,
            isOnline: false,
            isGroup: false
          },
        };
      })
    );

    // લેટેસ્ટ મેસેજ પ્રમાણે સોર્ટિંગ કરો (નવો મેસેજ ઉપર આવે)
    return results.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  },
});