import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper function to convert Persian numbers to English
function convertPersianToEnglish(str: string): string {
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = str;
  for (let i = 0; i < persianNumbers.length; i++) {
    result = result.replace(new RegExp(persianNumbers[i], 'g'), englishNumbers[i]);
  }
  return result;
}

// Get all customers
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("customers").collect();
  },
});

// Get customer by ID
export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get customer by mobile number
export const getByMobile = query({
  args: { mobile: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .withIndex("byMobile", (q) => q.eq("mobile", args.mobile))
      .first();
  },
});

// Get customer by national code
export const getByNationalCode = query({
  args: { nationalCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .withIndex("byNationalCode", (q) => q.eq("nationalCode", args.nationalCode))
      .first();
  },
});

// Create new customer
export const create = mutation({
  args: {
    name: v.string(),
    mobile: v.string(),
    nationalCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Convert Persian numbers to English
    const mobile = convertPersianToEnglish(args.mobile);
    const nationalCode = args.nationalCode ? convertPersianToEnglish(args.nationalCode) : undefined;

    // Validate mobile number (11 digits starting with 09)
    if (!mobile.match(/^09\d{9}$/)) {
      throw new Error("شماره موبایل باید 11 رقم باشد و با 09 شروع شود");
    }

    // Validate national code if provided (10 digits)
    if (nationalCode && !nationalCode.match(/^\d{10}$/)) {
      throw new Error("کد ملی باید 10 رقم باشد");
    }

    // Check if mobile already exists
    const existingByMobile = await ctx.db
      .query("customers")
      .withIndex("byMobile", (q) => q.eq("mobile", mobile))
      .first();

    if (existingByMobile) {
      throw new Error("شماره موبایل قبلاً ثبت شده است");
    }

    // Check if national code already exists (only if provided)
    if (nationalCode) {
      const existingByNationalCode = await ctx.db
        .query("customers")
        .withIndex("byNationalCode", (q) => q.eq("nationalCode", nationalCode))
        .first();

      if (existingByNationalCode) {
        throw new Error("کد ملی قبلاً ثبت شده است");
      }
    }

    // Create new customer
    return await ctx.db.insert("customers", {
      name: args.name.trim(),
      mobile: mobile,
      nationalCode: nationalCode,
    });
  },
});

// Update customer
export const update = mutation({
  args: {
    id: v.id("customers"),
    name: v.string(),
    mobile: v.string(),
    nationalCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Convert Persian numbers to English
    const mobile = convertPersianToEnglish(args.mobile);
    const nationalCode = args.nationalCode ? convertPersianToEnglish(args.nationalCode) : undefined;

    // Validate mobile number (11 digits starting with 09)
    if (!mobile.match(/^09\d{9}$/)) {
      throw new Error("شماره موبایل باید 11 رقم باشد و با 09 شروع شود");
    }

    // Validate national code if provided (10 digits)
    if (nationalCode && !nationalCode.match(/^\d{10}$/)) {
      throw new Error("کد ملی باید 10 رقم باشد");
    }

    // Check if mobile already exists (excluding current customer)
    const existingByMobile = await ctx.db
      .query("customers")
      .withIndex("byMobile", (q) => q.eq("mobile", mobile))
      .first();

    if (existingByMobile && existingByMobile._id !== args.id) {
      throw new Error("شماره موبایل قبلاً ثبت شده است");
    }

    // Check if national code already exists (excluding current customer, only if provided)
    if (nationalCode) {
      const existingByNationalCode = await ctx.db
        .query("customers")
        .withIndex("byNationalCode", (q) => q.eq("nationalCode", nationalCode))
        .first();

      if (existingByNationalCode && existingByNationalCode._id !== args.id) {
        throw new Error("کد ملی قبلاً ثبت شده است");
      }
    }

    // Update customer
    return await ctx.db.patch(args.id, {
      name: args.name.trim(),
      mobile: mobile,
      nationalCode: nationalCode,
    });
  },
});

// Delete customer
export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// Search customers by name
export const searchByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .filter((q) => q.eq(q.field("name"), args.name))
      .collect();
  },
});
