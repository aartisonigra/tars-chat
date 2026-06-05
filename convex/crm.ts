import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to get current user
async function getCurrentUser(ctx: any) {
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
// CUSTOMERS
// ==========================================

export const addCustomer = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    tag: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db.insert("crmCustomers", {
      userId: user._id,
      name: args.name,
      phone: args.phone,
      email: args.email,
      tag: args.tag ?? "lead",
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

export const updateCustomer = mutation({
  args: {
    customerId: v.id("crmCustomers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    tag: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { customerId, ...fields }) => {
    await getCurrentUser(ctx);
    await ctx.db.patch(customerId, fields);
  },
});

export const deleteCustomer = mutation({
  args: { customerId: v.id("crmCustomers") },
  handler: async (ctx, { customerId }) => {
    await getCurrentUser(ctx);
    await ctx.db.delete(customerId);
  },
});

export const getCustomers = query({
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
      .query("crmCustomers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// ==========================================
// ORDERS
// ==========================================

export const addOrder = mutation({
  args: {
    customerId: v.id("crmCustomers"),
    title: v.string(),
    amount: v.number(),
    status: v.string(),
    dueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db.insert("crmOrders", {
      userId: user._id,
      customerId: args.customerId,
      title: args.title,
      amount: args.amount,
      status: args.status ?? "pending",
      dueDate: args.dueDate,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("crmOrders"),
    status: v.string(),
  },
  handler: async (ctx, { orderId, status }) => {
    await getCurrentUser(ctx);
    await ctx.db.patch(orderId, { status });
  },
});

export const deleteOrder = mutation({
  args: { orderId: v.id("crmOrders") },
  handler: async (ctx, { orderId }) => {
    await getCurrentUser(ctx);
    await ctx.db.delete(orderId);
  },
});

export const getOrders = query({
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
      .query("crmOrders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// ==========================================
// QUICK REPLIES
// ==========================================

export const addQuickReply = mutation({
  args: {
    shortcut: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db.insert("crmQuickReplies", {
      userId: user._id,
      shortcut: args.shortcut,
      message: args.message,
      createdAt: Date.now(),
    });
  },
});

export const deleteQuickReply = mutation({
  args: { replyId: v.id("crmQuickReplies") },
  handler: async (ctx, { replyId }) => {
    await getCurrentUser(ctx);
    await ctx.db.delete(replyId);
  },
});

export const getQuickReplies = query({
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
      .query("crmQuickReplies")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});
