import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createLink = mutation({
  args: {
    countryCode: v.string(),
    phoneNumber: v.string(),
    message: v.string(),
    generatedLink: v.string(),
    shortCode: v.optional(v.string()),
    qrCodeUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    let userId = undefined;
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
      if (user) userId = user._id;
    }

    return await ctx.db.insert("links", {
      userId,
      countryCode: args.countryCode,
      phoneNumber: args.phoneNumber,
      message: args.message,
      generatedLink: args.generatedLink,
      shortCode: args.shortCode,
      clicks: 0,
      qrCodeUrl: args.qrCodeUrl,
      createdAt: Date.now(),
    });
  },
});

export const trackClick = mutation({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) throw new Error("Link not found");

    await ctx.db.patch(link._id, {
      clicks: (link.clicks ?? 0) + 1,
    });

    return link.generatedLink;
  },
});

export const getUserLinks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) return [];

    return await ctx.db
      .query("links")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});
