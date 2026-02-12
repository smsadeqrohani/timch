import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByCustomer = query({
  args: { customerId: v.id("customers") },
  returns: v.array(
    v.object({
      _id: v.id("customerAddresses"),
      _creationTime: v.number(),
      customerId: v.id("customers"),
      label: v.optional(v.string()),
      address: v.string(),
      isDefault: v.optional(v.boolean()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customerAddresses")
      .withIndex("byCustomerId", (q) => q.eq("customerId", args.customerId))
      .collect();
  },
});

export const add = mutation({
  args: {
    customerId: v.id("customers"),
    address: v.string(),
    label: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  returns: v.id("customerAddresses"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const addressTrimmed = args.address.trim();
    if (!addressTrimmed) throw new Error("آدرس نمی‌تواند خالی باشد");

    if (args.isDefault) {
      const existing = await ctx.db
        .query("customerAddresses")
        .withIndex("byCustomerId", (q) => q.eq("customerId", args.customerId))
        .collect();
      for (const a of existing) {
        if (a.isDefault) await ctx.db.patch(a._id, { isDefault: false, updatedAt: now });
      }
    }

    return await ctx.db.insert("customerAddresses", {
      customerId: args.customerId,
      address: addressTrimmed,
      label: args.label?.trim(),
      isDefault: args.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("customerAddresses"),
    address: v.optional(v.string()),
    label: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("آدرس یافت نشد");

    const updates: Record<string, unknown> = { updatedAt: now };
    if (args.address !== undefined) {
      const t = args.address.trim();
      if (!t) throw new Error("آدرس نمی‌تواند خالی باشد");
      updates.address = t;
    }
    if (args.label !== undefined) updates.label = args.label.trim();
    if (args.isDefault === true) {
      const existing = await ctx.db
        .query("customerAddresses")
        .withIndex("byCustomerId", (q) => q.eq("customerId", doc.customerId))
        .collect();
      for (const a of existing) {
        if (a._id !== args.id && a.isDefault) await ctx.db.patch(a._id, { isDefault: false, updatedAt: now });
      }
      updates.isDefault = true;
    } else if (args.isDefault === false) updates.isDefault = false;

    await ctx.db.patch(args.id, updates);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("customerAddresses") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});
