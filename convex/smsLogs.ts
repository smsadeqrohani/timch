import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("smsLogs"),
    event: v.string(),
    message: v.string(),
    receptor: v.string(),
    sender: v.string(),
    status: v.string(),
    providerStatus: v.optional(v.number()),
    providerStatusText: v.optional(v.string()),
    providerMessageId: v.optional(v.string()),
    cost: v.optional(v.number()),
    orderId: v.optional(v.id("orders")),
    orderCode: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    customerName: v.optional(v.string()),
    errorCode: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const logs = await ctx.db.query("smsLogs").collect();
    return logs
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200)
      .map(({ _creationTime, ...rest }) => rest);
  },
});

export const recordLog = internalMutation({
  args: {
    event: v.string(),
    message: v.string(),
    receptor: v.string(),
    sender: v.string(),
    status: v.string(),
    providerStatus: v.optional(v.number()),
    providerStatusText: v.optional(v.string()),
    providerMessageId: v.optional(v.string()),
    cost: v.optional(v.number()),
    orderId: v.optional(v.id("orders")),
    orderCode: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    customerName: v.optional(v.string()),
    errorCode: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("smsLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

