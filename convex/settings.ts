import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all settings
export const getAllSettings = query({
  handler: async (ctx) => {
    return await ctx.db.query("settings").collect();
  },
});

// Get a specific setting by key
export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("byKey", (q) => q.eq("key", args.key))
      .first();
    
    return setting;
  },
});

// Get the default annual interest rate
export const getDefaultAnnualRate = query({
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("byKey", (q) => q.eq("key", "default_annual_rate"))
      .first();
    
    // Return default value if setting doesn't exist
    return setting ? parseFloat(setting.value) : 36;
  },
});

// Update or create a setting
export const updateSetting = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existingSetting = await ctx.db
      .query("settings")
      .withIndex("byKey", (q) => q.eq("key", args.key))
      .first();

    if (existingSetting) {
      // Update existing setting
      await ctx.db.patch(existingSetting._id, {
        value: args.value,
        description: args.description,
        updatedAt: Date.now(),
        updatedBy: identity.subject,
      });
      return existingSetting._id;
    } else {
      // Create new setting
      return await ctx.db.insert("settings", {
        key: args.key,
        value: args.value,
        description: args.description,
        updatedAt: Date.now(),
        updatedBy: identity.subject,
      });
    }
  },
});

// Update the default annual interest rate
export const updateDefaultAnnualRate = mutation({
  args: { rate: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Validate rate
    if (args.rate < 0 || args.rate > 1000) {
      throw new Error("نرخ سود باید بین ۰ تا ۱۰۰۰ درصد باشد");
    }

    const existingSetting = await ctx.db
      .query("settings")
      .withIndex("byKey", (q) => q.eq("key", "default_annual_rate"))
      .first();

    if (existingSetting) {
      // Update existing setting
      await ctx.db.patch(existingSetting._id, {
        value: args.rate.toString(),
        description: "نرخ سود سالانه پیش‌فرض برای محاسبه اقساط",
        updatedAt: Date.now(),
        updatedBy: identity.subject,
      });
      return existingSetting._id;
    } else {
      // Create new setting
      return await ctx.db.insert("settings", {
        key: "default_annual_rate",
        value: args.rate.toString(),
        description: "نرخ سود سالانه پیش‌فرض برای محاسبه اقساط",
        updatedAt: Date.now(),
        updatedBy: identity.subject,
      });
    }
  },
});

// Initialize default settings
export const initializeDefaultSettings = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const defaultSettings = [
      {
        key: "default_annual_rate",
        value: "36",
        description: "نرخ سود سالانه پیش‌فرض برای محاسبه اقساط",
      },
    ];

    const results = [];
    for (const setting of defaultSettings) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("byKey", (q) => q.eq("key", setting.key))
        .first();

      if (!existing) {
        const id = await ctx.db.insert("settings", {
          ...setting,
          updatedAt: Date.now(),
          updatedBy: identity.subject,
        });
        results.push(id);
      }
    }

    return results;
  },
});
