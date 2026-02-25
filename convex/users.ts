import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * ૧. યુઝરને ડેટાબેઝમાં સ્ટોર કરવા માટે (Sync with Clerk)
 */
export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication identity");
    }

    // ચેક કરો કે યુઝર પહેલાથી છે કે નહીં
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    // નામ માટે સુરક્ષિત વેલ્યુ સેટ કરો
    const userName = identity.name || identity.nickname || "Anonymous";

    if (user !== null) {
      // જો યુઝર હોય, તો વિગતો અપડેટ કરો
      await ctx.db.patch(user._id, {
        name: userName, // નામ અહી અપડેટ થશે
        image: identity.pictureUrl,
      });
      return user._id;
    }

    // નવો યુઝર હોય તો ઇન્સર્ટ કરો
    return await ctx.db.insert("users", {
      name: userName, // જો ક્લાર્કમાં નામ ના હોય તો 'Anonymous' જશે
      email: identity.email ?? "Unknown",
      image: identity.pictureUrl,
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});

/**
 * ૨. બધા યુઝર્સનું લિસ્ટ જોવા અને સર્ચ કરવા માટે
 */
export const listAllUsers = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    
    if (args.search === "") {
      return users;
    }
    
    return users.filter((u) => 
      // નામ ઓપ્શનલ હોવાથી '?? ""' વાપરવું જરૂરી છે જેથી એરર ના આવે
      (u.name ?? "").toLowerCase().includes(args.search.toLowerCase())
    );
  },
});

/**
 * ૩. કોઈ ચોક્કસ યુઝરની વિગત મેળવવા માટે (પ્રોફાઇલ જોવા માટે)
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * ૪. વર્તમાન લોગિન થયેલ યુઝર મેળવવા માટે
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});