import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Helper ───────────────────────────────────────────────
async function getMe(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new Error("User not found");
  return user;
}

// ─── 1. Storage Upload URL ────────────────────────────────
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// ─── 2. Store / Sync User on Login ───────────────────────
export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    const userName = identity.givenName
      ? `${identity.givenName} ${identity.familyName ?? ""}`.trim()
      : identity.name || "Anonymous User";

    if (existing) {
      await ctx.db.patch(existing._id, { isOnline: true, lastSeen: Date.now() });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      name: userName,
      email: identity.email ?? "Unknown",
      phone: identity.phoneNumber ?? "",
      image: identity.pictureUrl ?? "",
      tokenIdentifier: identity.tokenIdentifier,
      isOnline: true,
      lastSeen: Date.now(),
      about: "Hey there! I'm using TARS Chat.",
    });
  },
});

// ─── 3. Update Full Profile (name, phone, about, photo) ──
export const updateProfile = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    about: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await getMe(ctx);

    let imageUrl = user.image;
    if (args.storageId) {
      const url = await ctx.storage.getUrl(args.storageId);
      if (url) imageUrl = url;
    }

    await ctx.db.patch(user._id, {
      name: args.name,
      phone: args.phone ?? user.phone,
      about: args.about ?? user.about,
      image: imageUrl,
    });
  },
});

// ─── 4. Update Just the About / Status Text ──────────────
export const updateAbout = mutation({
  args: { about: v.string() },
  handler: async (ctx, args) => {
    const user = await getMe(ctx);
    await ctx.db.patch(user._id, { about: args.about });
  },
});

// ─── 5. Set Online / Offline ─────────────────────────────
export const setOnline = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getMe(ctx);
    await ctx.db.patch(user._id, { isOnline: true, lastSeen: Date.now() });
  },
});

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
        typingTo: undefined,
      });
    }
  },
});

// ─── 6. Typing Status ────────────────────────────────────
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
      await ctx.db.patch(user._id, { typingTo: args.typingTo ?? undefined });
    }
  },
});

// ─── 7. Get Current User ─────────────────────────────────
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

// ─── 8. Get User By ID ───────────────────────────────────
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// ─── 9. List All Users (with search + typing indicator) ──
export const listAllUsers = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    const all = await ctx.db.query("users").collect();

    return all
      .filter(u => u._id !== me?._id && (u.name ?? "").toLowerCase().includes(args.search.toLowerCase()))
      .map(u => ({ ...u, isTypingMe: u.typingTo === me?._id }));
  },
});

// ─── 10. Profile Stats (for profile panel overview) ──────
export const getProfileStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me) return null;

    // Count total messages sent
    const myMessages = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("senderId", me._id))
      .collect();

    // Count conversations
    const allConvs = await ctx.db.query("conversations").collect();
    const myConvs = allConvs.filter(c =>
      c.participants?.includes(me._id) ||
      c.participantOne === me._id ||
      c.participantTwo === me._id
    );

    // Count focus sessions
    const focusSessions = await ctx.db
      .query("focusSessions")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .filter((q) => q.eq(q.field("isActive"), false))
      .collect();

    const totalFocusMinutes = focusSessions.reduce((s, f) => s + (f.durationMinutes ?? 0), 0);

    return {
      totalMessagesSent: myMessages.length,
      totalConversations: myConvs.length,
      focusSessionsCompleted: focusSessions.length,
      totalFocusMinutes,
      memberSince: me._creationTime,
    };
  },
});

// ─── 11. Search Users by Name or Phone ───────────────────
export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    const all = await ctx.db.query("users").collect();
    const q = args.query.toLowerCase();

    return all
      .filter(u =>
        u._id !== me?._id &&
        (
          (u.name ?? "").toLowerCase().includes(q) ||
          (u.phone ?? "").includes(q) ||
          (u.email ?? "").toLowerCase().includes(q)
        )
      )
      .slice(0, 10);
  },
});

// ─── 12. Get Online Users ────────────────────────────────
export const getOnlineUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    const all = await ctx.db.query("users").collect();
    return all.filter(u => u._id !== me?._id && u.isOnline === true);
  },
});
