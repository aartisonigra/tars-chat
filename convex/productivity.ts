import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new Error("User not found");
  return user;
}

// ==========================================
// USAGE SESSION TRACKING
// ==========================================

export const logSession = mutation({
  args: {
    date: v.string(),
    sessionStart: v.number(),
    sessionEnd: v.number(),
    durationMinutes: v.number(),
    messagesSent: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    return await ctx.db.insert("usageSessions", {
      userId: user._id,
      date: args.date,
      sessionStart: args.sessionStart,
      sessionEnd: args.sessionEnd,
      durationMinutes: args.durationMinutes,
      messagesSent: args.messagesSent,
    });
  },
});

export const getWeeklyUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const sessions = await ctx.db
      .query("usageSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);

    // Group by date and sum durations
    const byDate: Record<string, { minutes: number; messages: number }> = {};
    for (const s of sessions) {
      if (!byDate[s.date]) byDate[s.date] = { minutes: 0, messages: 0 };
      byDate[s.date].minutes += s.durationMinutes ?? 0;
      byDate[s.date].messages += s.messagesSent ?? 0;
    }

    // Return last 7 days
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en", { weekday: "short" });
      result.push({
        date: key,
        day: dayName,
        minutes: byDate[key]?.minutes ?? 0,
        messages: byDate[key]?.messages ?? 0,
      });
    }
    return result;
  },
});

// ==========================================
// FOCUS MODE
// ==========================================

export const startFocus = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    // End any active session first
    const active = await ctx.db
      .query("focusSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (active) {
      const dur = Math.round((Date.now() - active.startTime) / 60000);
      await ctx.db.patch(active._id, { isActive: false, endTime: Date.now(), durationMinutes: dur });
    }
    return await ctx.db.insert("focusSessions", {
      userId: user._id,
      startTime: Date.now(),
      isActive: true,
    });
  },
});

export const endFocus = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    const active = await ctx.db
      .query("focusSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (!active) return null;
    const dur = Math.round((Date.now() - active.startTime) / 60000);
    await ctx.db.patch(active._id, { isActive: false, endTime: Date.now(), durationMinutes: dur });
    return dur;
  },
});

export const getActiveFocus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;
    return await ctx.db
      .query("focusSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

export const getFocusHistory = query({
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
      .query("focusSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(10);
  },
});
