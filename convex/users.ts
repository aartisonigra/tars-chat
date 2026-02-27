import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * ૧. ફાઈલ અપલોડ URL જનરેટ કરવા
 */
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

/**
 * ૨. યુઝરને સ્ટોર કરવા (Login વખતે)
 */
export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    const userName = identity.givenName 
      ? `${identity.givenName} ${identity.familyName ?? ""}`.trim() 
      : (identity.name || "Anonymous User");

    if (user !== null) {
      await ctx.db.patch(user._id, {
        isOnline: true,
        lastSeen: Date.now(),
      });
      return user._id;
    }

    return await ctx.db.insert("users", {
      name: userName,
      email: identity.email ?? "Unknown",
      phone: identity.phoneNumber ?? "",
      image: identity.pictureUrl ?? "",
      tokenIdentifier: identity.tokenIdentifier,
      isOnline: true,
      lastSeen: Date.now(),
      about: "Operational",
    });
  },
});

/**
 * ૩. પ્રોફાઈલ એડિટ કરવા
 */
export const updateProfile = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")), 
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) throw new Error("User not found");

    let imageUrl = user.image;
    if (args.storageId) {
      const url = await ctx.storage.getUrl(args.storageId);
      if (url) imageUrl = url;
    }

    await ctx.db.patch(user._id, {
      name: args.name,
      phone: args.phone ?? user.phone,
      image: imageUrl,
    });
  },
});

/**
 * ૪. યુઝરને Offline માર્ક કરવા
 */
export const setOffline = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, { 
        isOnline: false, 
        lastSeen: Date.now(),
        typingTo: undefined 
      });
    }
  },
});

/**
 * ૫. ટાઈપિંગ સ્ટેટસ સેટ કરવા
 */
export const setTypingStatus = mutation({
  args: { typingTo: v.optional(v.union(v.id("users"), v.null())) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, { 
        typingTo: args.typingTo ?? undefined 
      });
    }
  },
});

/**
 * ૬. બધા યુઝર્સનું લિસ્ટ
 */
export const listAllUsers = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    const users = await ctx.db.query("users").collect();
    
    const filteredUsers = users.filter((u) => 
      u._id !== currentUser?._id && 
      (u.name ?? "").toLowerCase().includes(args.search.toLowerCase())
    );

    return filteredUsers.map((u) => ({
      ...u,
      isTypingMe: u.typingTo === currentUser?._id,
    }));
  },
});

/**
 * ૭. હાલના લોગ-ઈન યુઝરનો ડેટા મેળવવા
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