import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * નવું સ્ટડી મટીરીયલ કે નોટ્સ અપલોડ કરવા
 */
export const uploadDocument = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    subject: v.string(),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) throw new Error("User not found");

    const fileUrl = await ctx.storage.getUrl(args.fileId);

    return await ctx.db.insert("studyDocs", {
      userId: user._id,
      title: args.title,
      description: args.description,
      subject: args.subject,
      fileId: args.fileId,
      fileUrl: fileUrl ?? undefined,
      createdAt: Date.now(),
    });
  },
});

/**
 * ચોક્કસ સબ્જેક્ટના ડોક્યુમેન્ટ્સ ફિલ્ટર કરીને મેળવવા
 */
export const getDocsBySubject = query({
  args: { subject: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("studyDocs")
      .withIndex("by_subject", (q) => q.eq("subject", args.subject))
      .order("desc")
      .collect();
  },
});