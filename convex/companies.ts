import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all companies
export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("companies"),
    _creationTime: v.number(),
    name: v.string(),
    description: v.optional(v.string()),
  })),
  handler: async (ctx) => {
    return await ctx.db.query("companies").collect();
  },
});

// Get company by ID
export const get = query({
  args: { id: v.id("companies") },
  returns: v.union(
    v.object({
      _id: v.id("companies"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get company by name
export const getByName = query({
  args: { name: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("companies"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("companies")
      .withIndex("byName", (q) => q.eq("name", args.name))
      .first();
  },
});

// Create new company
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("companies"),
  handler: async (ctx, args) => {
    // Check if company already exists
    const existing = await ctx.db
      .query("companies")
      .withIndex("byName", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error("شرکت با این نام قبلاً ثبت شده است");
    }

    return await ctx.db.insert("companies", {
      name: args.name.trim(),
      description: args.description?.trim(),
    });
  },
});

// Update company
export const update = mutation({
  args: {
    id: v.id("companies"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if another company exists with same name
    const existing = await ctx.db
      .query("companies")
      .withIndex("byName", (q) => q.eq("name", args.name))
      .first();

    if (existing && existing._id !== args.id) {
      throw new Error("شرکت دیگری با این نام وجود دارد");
    }

    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      description: args.description?.trim(),
    });
    return null;
  },
});

// Check if company has collections
export const hasCollections = query({
  args: { id: v.id("companies") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const collections = await ctx.db
      .query("collections")
      .withIndex("byCompanyId", (q) => q.eq("companyId", args.id))
      .first();
    
    return collections !== null;
  },
});

// Delete company
export const remove = mutation({
  args: { id: v.id("companies") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // First delete all collections in this company
    const collections = await ctx.db
      .query("collections")
      .withIndex("byCompanyId", (q) => q.eq("companyId", args.id))
      .collect();
    
    for (const collection of collections) {
      // Delete all products in each collection
      const products = await ctx.db
        .query("products")
        .withIndex("byCollectionId", (q) => q.eq("collectionId", collection._id))
        .collect();
      
      for (const product of products) {
        await ctx.db.delete(product._id);
      }
      
      // Delete the collection
      await ctx.db.delete(collection._id);
    }
    
    // Then delete the company
    await ctx.db.delete(args.id);
    return null;
  },
});
