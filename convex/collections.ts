import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all collections
export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("collections"),
    _creationTime: v.number(),
    name: v.string(),
    description: v.optional(v.string()),
    companyId: v.id("companies"),
  })),
  handler: async (ctx) => {
    const collections = await ctx.db.query("collections").collect();
    
    // Sort collections by name
    return collections.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Get collections by company ID
export const getByCompanyId = query({
  args: { companyId: v.id("companies") },
  returns: v.array(v.object({
    _id: v.id("collections"),
    _creationTime: v.number(),
    name: v.string(),
    description: v.optional(v.string()),
    companyId: v.id("companies"),
  })),
  handler: async (ctx, args) => {
    const collections = await ctx.db
      .query("collections")
      .withIndex("byCompanyId", (q) => q.eq("companyId", args.companyId))
      .collect();
    
    // Sort collections by name
    return collections.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Get collection by ID
export const get = query({
  args: { id: v.id("collections") },
  returns: v.union(
    v.object({
      _id: v.id("collections"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      companyId: v.id("companies"),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get collection by name
export const getByName = query({
  args: { name: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("collections"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      companyId: v.id("companies"),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("collections")
      .withIndex("byName", (q) => q.eq("name", args.name))
      .first();
  },
});

// Create new collection
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    companyId: v.id("companies"),
  },
  returns: v.id("collections"),
  handler: async (ctx, args) => {
    // Check if collection already exists in this company
    const existing = await ctx.db
      .query("collections")
      .withIndex("byCompanyIdAndName", (q) => q.eq("companyId", args.companyId).eq("name", args.name))
      .first();

    if (existing) {
      throw new Error("مجموعه با این نام قبلاً در این شرکت ثبت شده است");
    }

    return await ctx.db.insert("collections", {
      name: args.name.trim(),
      description: args.description?.trim(),
      companyId: args.companyId,
    });
  },
});

// Update collection
export const update = mutation({
  args: {
    id: v.id("collections"),
    name: v.string(),
    description: v.optional(v.string()),
    companyId: v.id("companies"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if another collection exists with same name in this company
    const existing = await ctx.db
      .query("collections")
      .withIndex("byCompanyIdAndName", (q) => q.eq("companyId", args.companyId).eq("name", args.name))
      .first();

    if (existing && existing._id !== args.id) {
      throw new Error("مجموعه دیگری با این نام در این شرکت وجود دارد");
    }

    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      description: args.description?.trim(),
      companyId: args.companyId,
    });
    return null;
  },
});

// Check if collection has products
export const hasProducts = query({
  args: { id: v.id("collections") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("byCollectionId", (q) => q.eq("collectionId", args.id))
      .first();
    
    return products !== null;
  },
});

// Delete collection
export const remove = mutation({
  args: { id: v.id("collections") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // First delete all products in this collection
    const products = await ctx.db
      .query("products")
      .withIndex("byCollectionId", (q) => q.eq("collectionId", args.id))
      .collect();
    
    for (const product of products) {
      await ctx.db.delete(product._id);
    }
    
    // Then delete the collection
    await ctx.db.delete(args.id);
    return null;
  },
});
