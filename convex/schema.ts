import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const applicationTables = {
  customers: defineTable({
    name: v.string(),
    mobile: v.string(),
    nationalCode: v.optional(v.string()),
  })
    .index("byMobile", ["mobile"])
    .index("byNationalCode", ["nationalCode"]),
};

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.string(),
    email: v.string(),
    tokenIdentifier: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  }).index("byTokenIdentifier", ["tokenIdentifier"]),
  ...applicationTables,
});
