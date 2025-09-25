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
  
  settings: defineTable({
    key: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
    updatedAt: v.number(),
    updatedBy: v.string(), // userId who updated this setting
  })
    .index("byKey", ["key"]),

  companies: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
  })
    .index("byName", ["name"]),

  collections: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    companyId: v.id("companies"),
  })
    .index("byName", ["name"])
    .index("byCompanyId", ["companyId"])
    .index("byCompanyIdAndName", ["companyId", "name"]),

  products: defineTable({
    collectionId: v.id("collections"),
    code: v.string(),
    color: v.string(),
  })
    .index("byCollectionId", ["collectionId"])
    .index("byCode", ["code"])
    .index("byCollectionIdAndCode", ["collectionId", "code"]),

  roles: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    permissions: v.array(v.string()), // Array of permission strings
    isSystemRole: v.optional(v.boolean()), // For system roles like super admin
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("byName", ["name"])
    .index("byIsSystemRole", ["isSystemRole"]),

  userRoles: defineTable({
    userId: v.id("users"),
    roleId: v.id("roles"),
    assignedAt: v.number(),
    assignedBy: v.id("users"),
  })
    .index("byUserId", ["userId"])
    .index("byRoleId", ["roleId"])
    .index("byUserIdAndRoleId", ["userId", "roleId"]),

  orders: defineTable({
    customerId: v.id("customers"),
    createdBy: v.id("users"),
    status: v.string(), // "در انتظار صندوق", "تایید شده", "لغو شده"
    paymentType: v.optional(v.string()), // "نقدی", "اقساط"
    totalAmount: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    cashierId: v.optional(v.id("users")), // Who processed the payment
    processedAt: v.optional(v.number()),
  })
    .index("byCustomerId", ["customerId"])
    .index("byCreatedBy", ["createdBy"])
    .index("byStatus", ["status"])
    .index("byCashierId", ["cashierId"])
    .index("byCreatedAt", ["createdAt"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    color: v.string(), // Selected color for this item
    sizeX: v.number(), // X dimension
    sizeY: v.number(), // Y dimension
    quantity: v.number(),
  })
    .index("byOrderId", ["orderId"])
    .index("byProductId", ["productId"]),
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
