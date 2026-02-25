import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * ૧. બે યુઝર વચ્ચે કન્વર્સેશન મેળવો અથવા નવું બનાવો
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

    // ૧. પહેલી શરત: હું Participant 1 હોઉં અને બીજો યુઝર Participant 2 હોય
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) => 
        q.eq("participantOne", currentUser._id).eq("participantTwo", otherUserId)
      )
      .first();

    if (existing) return existing._id;

    // ૨. બીજી શરત: બીજો યુઝર Participant 1 હોય અને હું Participant 2 હોઉં
    const reverse = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) => 
        q.eq("participantOne", otherUserId).eq("participantTwo", currentUser._id)
      )
      .first();

    if (reverse) return reverse._id;

    // ૩. જો કોઈ કન્વર્સેશન ના મળે તો નવું બનાવો (હવે આ mutation છે એટલે insert કામ કરશે)
    return await ctx.db.insert("conversations", {
      participantOne: currentUser._id,
      participantTwo: otherUserId,
    });
  },
});

/**
 * ૨. હાલના લોગીન યુઝરના બધા કન્વર્સેશન લિસ્ટ કરવા માટે
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

    // બધા કન્વર્સેશન લો જ્યાં યુઝર પક્ષકાર હોય
    const conversations = await ctx.db
      .query("conversations")
      .filter((q) => 
        q.or(
          q.eq(q.field("participantOne"), currentUser._id),
          q.eq(q.field("participantTwo"), currentUser._id)
        )
      )
      .collect();

    return conversations;
  },
});