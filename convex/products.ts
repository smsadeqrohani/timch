import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const productFields = {
  _id: v.id("products"),
  _creationTime: v.number(),
  collectionId: v.id("collections"),
  code: v.string(),
  color: v.string(),
  imageUrls: v.optional(v.array(v.string())),
};

// Get all products
export const list = query({
  args: {},
  returns: v.array(v.object(productFields)),
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

// Get product by ID
export const get = query({
  args: { id: v.id("products") },
  returns: v.union(
    v.object(productFields),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get products by collection ID
export const getByCollectionId = query({
  args: { collectionId: v.id("collections") },
  returns: v.array(v.object(productFields)),
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
  returns: v.array(v.object(productFields)),
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
  returns: v.array(v.object(productFields)),
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
    imageUrls: v.optional(v.array(v.string())),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    const trimmedCode = args.code.trim();
    const trimmedColor = args.color.trim();
    // Check if product already exists with same collection, code, and color
    const existing = await ctx.db
      .query("products")
      .withIndex("byCollectionIdCodeAndColor", (q) =>
        q.eq("collectionId", args.collectionId).eq("code", trimmedCode).eq("color", trimmedColor)
      )
      .first();

    if (existing) {
      throw new Error("محصول با این مجموعه، کد و رنگ قبلاً ثبت شده است");
    }

    const normalizedImageUrls = args.imageUrls
      ?.map((url) => url.trim())
      .filter((url) => url.length > 0);

    return await ctx.db.insert("products", {
      collectionId: args.collectionId,
      code: trimmedCode,
      color: trimmedColor,
      ...(normalizedImageUrls && normalizedImageUrls.length > 0
        ? { imageUrls: normalizedImageUrls }
        : {}),
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
    imageUrls: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trimmedCode = args.code.trim();
    const trimmedColor = args.color.trim();
    // Check if another product exists with same collection, code, and color
    const existing = await ctx.db
      .query("products")
      .withIndex("byCollectionIdCodeAndColor", (q) =>
        q.eq("collectionId", args.collectionId).eq("code", trimmedCode).eq("color", trimmedColor)
      )
      .first();

    if (existing && existing._id !== args.id) {
      throw new Error("محصول دیگری با این مجموعه، کد و رنگ وجود دارد");
    }

    const normalizedImageUrls = args.imageUrls
      ?.map((url) => url.trim())
      .filter((url) => url.length > 0);

    await ctx.db.patch(args.id, {
      collectionId: args.collectionId,
      code: trimmedCode,
      color: trimmedColor,
      ...(args.imageUrls !== undefined
        ? { imageUrls: normalizedImageUrls ?? [] }
        : {}),
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
        const trimmedCode = productCode.trim();
        const trimmedColor = colorCode.trim();
        // Check if product already exists
        const existing = await ctx.db
          .query("products")
          .withIndex("byCollectionIdCodeAndColor", (q) =>
            q
              .eq("collectionId", args.collectionId)
              .eq("code", trimmedCode)
              .eq("color", trimmedColor)
          )
          .first();

        if (!existing) {
          const id = await ctx.db.insert("products", {
            collectionId: args.collectionId,
            code: trimmedCode,
            color: trimmedColor,
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
  returns: v.array(v.object(productFields)),
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
