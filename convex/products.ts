import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all products
export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("products"),
    _creationTime: v.number(),
    collectionId: v.id("collections"),
    code: v.string(),
    color: v.string(),
  })),
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

// Get product by ID
export const get = query({
  args: { id: v.id("products") },
  returns: v.union(
    v.object({
      _id: v.id("products"),
      _creationTime: v.number(),
      collectionId: v.id("collections"),
      code: v.string(),
      color: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get products by collection ID
export const getByCollectionId = query({
  args: { collectionId: v.id("collections") },
  returns: v.array(v.object({
    _id: v.id("products"),
    _creationTime: v.number(),
    collectionId: v.id("collections"),
    code: v.string(),
    color: v.string(),
  })),
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("byCollectionId", (q) => q.eq("collectionId", args.collectionId))
      .collect();
    
    // Sort products by code name
    return products.sort((a, b) => a.code.localeCompare(b.code));
  },
});

// Get products by code
export const getByCode = query({
  args: { code: v.string() },
  returns: v.array(v.object({
    _id: v.id("products"),
    _creationTime: v.number(),
    collectionId: v.id("collections"),
    code: v.string(),
    color: v.string(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("byCode", (q) => q.eq("code", args.code))
      .collect();
  },
});

// Get products by collection ID and code
export const getByCollectionIdAndCode = query({
  args: { 
    collectionId: v.id("collections"),
    code: v.string()
  },
  returns: v.array(v.object({
    _id: v.id("products"),
    _creationTime: v.number(),
    collectionId: v.id("collections"),
    code: v.string(),
    color: v.string(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("byCollectionIdAndCode", (q) => 
        q.eq("collectionId", args.collectionId).eq("code", args.code)
      )
      .collect();
  },
});

// Get all unique codes for a collection
export const getCodesByCollectionId = query({
  args: { collectionId: v.id("collections") },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("byCollectionId", (q) => q.eq("collectionId", args.collectionId))
      .collect();
    const codes = new Set(products.map(p => p.code));
    return Array.from(codes).sort();
  },
});

// Get all unique colors for a collection and code
export const getColorsByCollectionIdAndCode = query({
  args: { 
    collectionId: v.id("collections"),
    code: v.string()
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("byCollectionIdAndCode", (q) => 
        q.eq("collectionId", args.collectionId).eq("code", args.code)
      )
      .collect();
    const colors = new Set(products.map(p => p.color));
    return Array.from(colors).sort();
  },
});

// Create new product
export const create = mutation({
  args: {
    collectionId: v.id("collections"),
    code: v.string(),
    color: v.string(),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    // Check if product already exists with same collection, code, and color
    const existing = await ctx.db
      .query("products")
      .withIndex("byCollectionIdAndCode", (q) => 
        q.eq("collectionId", args.collectionId).eq("code", args.code)
      )
      .filter((q) => q.eq(q.field("color"), args.color))
      .first();

    if (existing) {
      throw new Error("محصول با این مجموعه، کد و رنگ قبلاً ثبت شده است");
    }

    return await ctx.db.insert("products", {
      collectionId: args.collectionId,
      code: args.code.trim(),
      color: args.color.trim(),
    });
  },
});

// Update product
export const update = mutation({
  args: {
    id: v.id("products"),
    collectionId: v.id("collections"),
    code: v.string(),
    color: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if another product exists with same collection, code, and color
    const existing = await ctx.db
      .query("products")
      .withIndex("byCollectionIdAndCode", (q) => 
        q.eq("collectionId", args.collectionId).eq("code", args.code)
      )
      .filter((q) => q.eq(q.field("color"), args.color))
      .first();

    if (existing && existing._id !== args.id) {
      throw new Error("محصول دیگری با این مجموعه، کد و رنگ وجود دارد");
    }

    await ctx.db.patch(args.id, {
      collectionId: args.collectionId,
      code: args.code.trim(),
      color: args.color.trim(),
    });
    return null;
  },
});

// Check if product code has multiple colors (more than one product with same code)
export const hasMultipleColors = query({
  args: { 
    collectionId: v.id("collections"),
    code: v.string()
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("byCollectionIdAndCode", (q) => 
        q.eq("collectionId", args.collectionId).eq("code", args.code)
      )
      .collect();
    
    return products.length > 1;
  },
});

// Delete product
export const remove = mutation({
  args: { id: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

// Bulk create products from collection data
export const bulkCreateFromCollection = mutation({
  args: {
    collectionId: v.id("collections"),
    products: v.array(v.string()),
    colors: v.array(v.string()),
  },
  returns: v.array(v.id("products")),
  handler: async (ctx, args) => {
    const createdIds: any[] = [];
    
    for (const productCode of args.products) {
      for (const colorCode of args.colors) {
        // Check if product already exists
        const existing = await ctx.db
          .query("products")
          .withIndex("byCollectionIdAndCode", (q) => 
            q.eq("collectionId", args.collectionId).eq("code", productCode)
          )
          .filter((q) => q.eq(q.field("color"), colorCode))
          .first();

        if (!existing) {
          const id = await ctx.db.insert("products", {
            collectionId: args.collectionId,
            code: productCode.trim(),
            color: colorCode.trim(),
          });
          createdIds.push(id);
        }
      }
    }
    
    return createdIds;
  },
});

// Search products
export const search = query({
  args: { 
    query: v.string(),
  },
  returns: v.array(v.object({
    _id: v.id("products"),
    _creationTime: v.number(),
    collectionId: v.id("collections"),
    code: v.string(),
    color: v.string(),
  })),
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase().trim();
    
    return await ctx.db
      .query("products")
      .filter((q) => 
        q.or(
          q.eq(q.field("code"), searchTerm),
          q.eq(q.field("color"), searchTerm)
        )
      )
      .collect();
  },
});
