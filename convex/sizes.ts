import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const sizeTypeValidator = v.union(
  v.literal("mostatil"),
  v.literal("morabba"),
  v.literal("dayere"),
  v.literal("gerd"),
  v.literal("beyzi"),
);

const sizeDocument = {
  _id: v.id("sizes"),
  _creationTime: v.number(),
  x: v.number(),
  y: v.number(),
  type: sizeTypeValidator,
};

export const list = query({
  args: {},
  returns: v.array(v.object(sizeDocument)),
  handler: async (ctx) => {
    const sizes = await ctx.db.query("sizes").collect();
    const normalized = [];
    for (const size of sizes) {
      if (size.type === "dayere") {
        await ctx.db.patch(size._id, { type: "gerd" });
        size.type = "gerd";
      }
      normalized.push(size);
    }
    return normalized.sort((a, b) => {
      if (a.type === b.type) {
        if (a.x === b.x) return a.y - b.y;
        return a.x - b.x;
      }
      return a.type.localeCompare(b.type);
    });
  },
});

export const get = query({
  args: { id: v.id("sizes") },
  returns: v.union(v.object(sizeDocument), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

const createArgs = {
  x: v.number(),
  y: v.number(),
  type: sizeTypeValidator,
};

export const create = mutation({
  args: createArgs,
  returns: v.id("sizes"),
  handler: async (ctx, args) => {
    if (args.x <= 0 || args.y <= 0) {
      throw new Error("ابعاد باید بزرگتر از صفر باشند");
    }

    const normalizedType = args.type === "dayere" ? "gerd" : args.type;

    const existing = await ctx.db
      .query("sizes")
      .withIndex("byTypeAndDimensions", (q) =>
        q.eq("type", normalizedType).eq("x", args.x).eq("y", args.y),
      )
      .first();

    if (existing) {
      throw new Error("این سایز قبلاً ثبت شده است");
    }

    return await ctx.db.insert("sizes", {
      x: args.x,
      y: args.y,
      type: normalizedType,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("sizes"),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    type: v.optional(sizeTypeValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const size = await ctx.db.get(args.id);
    if (!size) {
      throw new Error("سایز مورد نظر یافت نشد");
    }

    const nextX = args.x ?? size.x;
    const nextY = args.y ?? size.y;
    const nextTypeRaw = args.type ?? size.type;
    const nextType = nextTypeRaw === "dayere" ? "gerd" : nextTypeRaw;

    if (nextX <= 0 || nextY <= 0) {
      throw new Error("ابعاد باید بزرگتر از صفر باشند");
    }

    const existing = await ctx.db
      .query("sizes")
      .withIndex("byTypeAndDimensions", (q) =>
        q.eq("type", nextType).eq("x", nextX).eq("y", nextY),
      )
      .first();

    if (existing && existing._id !== size._id) {
      throw new Error("سایز دیگری با این مشخصات وجود دارد");
    }

    await ctx.db.patch(args.id, {
      x: nextX,
      y: nextY,
      type: nextType,
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("sizes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const size = await ctx.db.get(args.id);
    if (!size) {
      throw new Error("سایز مورد نظر یافت نشد");
    }
    await ctx.db.delete(args.id);
    return null;
  },
});

