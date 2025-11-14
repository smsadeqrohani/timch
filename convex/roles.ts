import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Available permissions in the system
export const AVAILABLE_PERMISSIONS = [
  "installment-calculator:view",
  "installment-calculator:edit",
  "installments:view",
  "installments:create",
  "installments:edit",
  "installments:delete",
  "installments:approve",
  "installments:payment",
  "installments:manage",
  "orders:view",
  "orders:create",
  "orders:edit",
  "orders:delete",
  "orders:process",
  "catalog:view",
  "catalog:edit",
  "catalog:delete",
  "sizes:view",
  "sizes:create",
  "sizes:edit",
  "sizes:delete",
  "customers:view",
  "customers:edit",
  "customers:delete",
  "users:view",
  "users:edit",
  "users:delete",
  "roles:view",
  "roles:edit",
  "roles:delete",
  "settings:view",
  "settings:edit",
  "companies:view",
  "companies:edit",
  "companies:delete",
  "collections:view",
  "collections:edit",
  "collections:delete",
  "products:view",
  "products:edit",
  "products:delete",
  "sms:view",
  "sms:send",
] as const;

export type Permission = typeof AVAILABLE_PERMISSIONS[number];

// Get all roles
export const getAllRoles = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const roles = await ctx.db.query("roles").collect();
    return roles.map(role => ({
      id: role._id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystemRole: role.isSystemRole,
      createdAt: role.createdAt,
      createdBy: role.createdBy,
    }));
  },
});

// Get role by ID
export const getRoleById = query({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const role = await ctx.db.get(args.roleId);
    if (!role) {
      return null;
    }

    return {
      id: role._id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystemRole: role.isSystemRole,
      createdAt: role.createdAt,
      createdBy: role.createdBy,
    };
  },
});

// Create a new role
export const createRole = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if role name already exists
    const existingRole = await ctx.db
      .query("roles")
      .withIndex("byName", (q) => q.eq("name", args.name))
      .first();

    if (existingRole) {
      throw new Error("Role with this name already exists");
    }

    // Validate permissions
    const invalidPermissions = args.permissions.filter(
      (permission) => !AVAILABLE_PERMISSIONS.includes(permission as Permission)
    );
    if (invalidPermissions.length > 0) {
      throw new Error(`Invalid permissions: ${invalidPermissions.join(", ")}`);
    }

    const roleId = await ctx.db.insert("roles", {
      name: args.name,
      description: args.description,
      permissions: args.permissions,
      isSystemRole: false,
      createdAt: Date.now(),
      createdBy: userId,
    });

    return roleId;
  },
});

// Update a role
export const updateRole = mutation({
  args: {
    roleId: v.id("roles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Prevent editing system roles
    if (role.isSystemRole) {
      throw new Error("Cannot edit system roles");
    }

    // Check if new name conflicts with existing roles
    if (args.name && args.name !== role.name) {
      const existingRole = await ctx.db
        .query("roles")
        .withIndex("byName", (q) => q.eq("name", args.name!))
        .first();

      if (existingRole) {
        throw new Error("Role with this name already exists");
      }
    }

    // Validate permissions if provided
    if (args.permissions) {
      const invalidPermissions = args.permissions.filter(
        (permission) => !AVAILABLE_PERMISSIONS.includes(permission as Permission)
      );
      if (invalidPermissions.length > 0) {
        throw new Error(`Invalid permissions: ${invalidPermissions.join(", ")}`);
      }
    }

    await ctx.db.patch(args.roleId, {
      ...(args.name && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.permissions && { permissions: args.permissions }),
    });

    return null;
  },
});

// Delete a role
export const deleteRole = mutation({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Prevent deleting system roles
    if (role.isSystemRole) {
      throw new Error("Cannot delete system roles");
    }

    // Check if role is assigned to any users
    const userRoles = await ctx.db
      .query("userRoles")
      .withIndex("byRoleId", (q) => q.eq("roleId", args.roleId))
      .collect();

    if (userRoles.length > 0) {
      throw new Error("Cannot delete role that is assigned to users");
    }

    await ctx.db.delete(args.roleId);
    return null;
  },
});

// Get user roles
export const getUserRoles = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    const userRoles = await ctx.db
      .query("userRoles")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .collect();

    const roles = await Promise.all(
      userRoles.map(async (userRole) => {
        const role = await ctx.db.get(userRole.roleId);
        return role ? {
          id: role._id,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isSystemRole: role.isSystemRole,
          assignedAt: userRole.assignedAt,
          assignedBy: userRole.assignedBy,
        } : null;
      })
    );

    return roles.filter(Boolean);
  },
});

// Assign role to user
export const assignRoleToUser = mutation({
  args: {
    userId: v.id("users"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    // Check if role is already assigned
    const existingUserRole = await ctx.db
      .query("userRoles")
      .withIndex("byUserIdAndRoleId", (q) => 
        q.eq("userId", args.userId).eq("roleId", args.roleId)
      )
      .first();

    if (existingUserRole) {
      throw new Error("Role is already assigned to this user");
    }

    await ctx.db.insert("userRoles", {
      userId: args.userId,
      roleId: args.roleId,
      assignedAt: Date.now(),
      assignedBy: currentUserId,
    });

    return null;
  },
});

// Remove role from user
export const removeRoleFromUser = mutation({
  args: {
    userId: v.id("users"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("byUserIdAndRoleId", (q) => 
        q.eq("userId", args.userId).eq("roleId", args.roleId)
      )
      .first();

    if (!userRole) {
      throw new Error("Role is not assigned to this user");
    }

    await ctx.db.delete(userRole._id);
    return null;
  },
});

// Get current user's permissions
export const getCurrentUserPermissions = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const userRoles = await ctx.db
      .query("userRoles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    const permissions = new Set<string>();
    
    for (const userRole of userRoles) {
      const role = await ctx.db.get(userRole.roleId);
      if (role) {
        role.permissions.forEach(permission => permissions.add(permission));
      }
    }

    return Array.from(permissions);
  },
});

// Check if user has specific permission
export const hasPermission = query({
  args: { permission: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const userRoles = await ctx.db
      .query("userRoles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    for (const userRole of userRoles) {
      const role = await ctx.db.get(userRole.roleId);
      if (role && role.permissions.includes(args.permission)) {
        return true;
      }
    }

    return false;
  },
});

// Initialize super admin role (run once)
export const initializeSuperAdminRole = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if super admin role already exists
    const existingRole = await ctx.db
      .query("roles")
      .withIndex("byName", (q) => q.eq("name", "Super Admin"))
      .first();

    if (existingRole) {
      return existingRole._id;
    }

    // Create super admin role with all permissions
    const superAdminRoleId = await ctx.db.insert("roles", {
      name: "Super Admin",
      description: "دسترسی کامل به تمام بخش‌های سیستم",
      permissions: [...AVAILABLE_PERMISSIONS],
      isSystemRole: true,
      createdAt: Date.now(),
      createdBy: userId,
    });

    return superAdminRoleId;
  },
});

// Assign super admin role to all users
export const assignSuperAdminToAllUsers = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get super admin role
    const superAdminRole = await ctx.db
      .query("roles")
      .withIndex("byName", (q) => q.eq("name", "Super Admin"))
      .first();

    if (!superAdminRole) {
      throw new Error("Super Admin role not found");
    }

    // Get all users
    const users = await ctx.db.query("users").collect();

    // Assign super admin role to all users
    for (const user of users) {
      // Check if role is already assigned
      const existingUserRole = await ctx.db
        .query("userRoles")
        .withIndex("byUserIdAndRoleId", (q) => 
          q.eq("userId", user._id).eq("roleId", superAdminRole._id)
        )
        .first();

      if (!existingUserRole) {
        await ctx.db.insert("userRoles", {
          userId: user._id,
          roleId: superAdminRole._id,
          assignedAt: Date.now(),
          assignedBy: userId,
        });
      }
    }

    return null;
  },
});

// Complete setup: create super admin role and assign to all users
export const setupSuperAdminSystem = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if super admin role already exists
    let superAdminRole = await ctx.db
      .query("roles")
      .withIndex("byName", (q) => q.eq("name", "Super Admin"))
      .first();

    // Create super admin role if it doesn't exist
    if (!superAdminRole) {
      const superAdminRoleId = await ctx.db.insert("roles", {
        name: "Super Admin",
        description: "دسترسی کامل به تمام بخش‌های سیستم",
        permissions: [...AVAILABLE_PERMISSIONS],
        isSystemRole: true,
        createdAt: Date.now(),
        createdBy: userId,
      });
      superAdminRole = await ctx.db.get(superAdminRoleId);
    }

    if (!superAdminRole) {
      throw new Error("Failed to create Super Admin role");
    }

    // Get all users
    const users = await ctx.db.query("users").collect();

    // Assign super admin role to all users
    let assignedCount = 0;
    for (const user of users) {
      // Check if role is already assigned
      const existingUserRole = await ctx.db
        .query("userRoles")
        .withIndex("byUserIdAndRoleId", (q) => 
          q.eq("userId", user._id).eq("roleId", superAdminRole._id)
        )
        .first();

      if (!existingUserRole) {
        await ctx.db.insert("userRoles", {
          userId: user._id,
          roleId: superAdminRole._id,
          assignedAt: Date.now(),
          assignedBy: userId,
        });
        assignedCount++;
      }
    }

    return {
      roleId: superAdminRole._id,
      totalUsers: users.length,
      newlyAssigned: assignedCount,
      alreadyAssigned: users.length - assignedCount,
    };
  },
});

// Update Super Admin role with new permissions
export const updateSuperAdminPermissions = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get super admin role
    const superAdminRole = await ctx.db
      .query("roles")
      .withIndex("byName", (q) => q.eq("name", "Super Admin"))
      .first();

    if (!superAdminRole) {
      throw new Error("Super Admin role not found");
    }

    // Update with all available permissions
    await ctx.db.patch(superAdminRole._id, {
      permissions: [...AVAILABLE_PERMISSIONS],
    });

    return {
      roleId: superAdminRole._id,
      updatedPermissions: AVAILABLE_PERMISSIONS,
      totalPermissions: AVAILABLE_PERMISSIONS.length,
    };
  },
});

// Add new permissions to Super Admin role
export const addNewPermissionsToSuperAdmin = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get super admin role
    const superAdminRole = await ctx.db
      .query("roles")
      .withIndex("byName", (q) => q.eq("name", "Super Admin"))
      .first();

    if (!superAdminRole) {
      throw new Error("Super Admin role not found");
    }

    // Get current permissions and add new ones
    const currentPermissions = new Set(superAdminRole.permissions);
    const allPermissions = new Set([...AVAILABLE_PERMISSIONS]);
    
    // Find new permissions that aren't already in the role
    const newPermissions = [...allPermissions].filter(permission => !currentPermissions.has(permission));

    if (newPermissions.length === 0) {
      return {
        roleId: superAdminRole._id,
        message: "No new permissions to add",
        currentPermissions: superAdminRole.permissions,
        newPermissions: [],
      };
    }

    // Update with all permissions
    const updatedPermissions = [...AVAILABLE_PERMISSIONS];
    await ctx.db.patch(superAdminRole._id, {
      permissions: updatedPermissions,
    });

    return {
      roleId: superAdminRole._id,
      currentPermissions: superAdminRole.permissions,
      newPermissions: newPermissions,
      totalPermissions: updatedPermissions.length,
    };
  },
});

// Create default roles for the system
export const createDefaultRoles = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const createdRoles = [];

    // 1. Super Admin Role (already exists, but ensure it has all permissions)
    const superAdminRole = await ctx.db
      .query("roles")
      .withIndex("byName", (q) => q.eq("name", "Super Admin"))
      .first();

    if (superAdminRole) {
      await ctx.db.patch(superAdminRole._id, {
        permissions: [...AVAILABLE_PERMISSIONS],
      });
      createdRoles.push("Super Admin (updated)");
    } else {
      await ctx.db.insert("roles", {
        name: "Super Admin",
        description: "دسترسی کامل به تمام بخش‌های سیستم",
        permissions: [...AVAILABLE_PERMISSIONS],
        isSystemRole: true,
        createdAt: now,
        createdBy: userId,
      });
      createdRoles.push("Super Admin (created)");
    }

    // 2. Cashier Role
    const cashierRole = await ctx.db
      .query("roles")
      .withIndex("byName", (q) => q.eq("name", "صندوق‌دار"))
      .first();

    if (!cashierRole) {
      await ctx.db.insert("roles", {
        name: "صندوق‌دار",
        description: "مدیریت سفارشات و پرداخت‌ها",
        permissions: [
          "orders:view",
          "orders:process",
          "installments:view",
          "installments:create",
          "installments:approve",
          "installments:payment",
          "customers:view",
          "customers:edit",
        ],
        isSystemRole: true,
        createdAt: now,
        createdBy: userId,
      });
      createdRoles.push("صندوق‌دار (created)");
    }

    // 3. Installment Manager Role
    const installmentManagerRole = await ctx.db
      .query("roles")
      .withIndex("byName", (q) => q.eq("name", "مدیر اقساط"))
      .first();

    if (!installmentManagerRole) {
      await ctx.db.insert("roles", {
        name: "مدیر اقساط",
        description: "مدیریت کامل قراردادهای اقساط",
        permissions: [
          "installments:view",
          "installments:create",
          "installments:edit",
          "installments:delete",
          "installments:approve",
          "installments:payment",
          "installments:manage",
          "orders:view",
          "customers:view",
        ],
        isSystemRole: true,
        createdAt: now,
        createdBy: userId,
      });
      createdRoles.push("مدیر اقساط (created)");
    }

    // 4. Sales Role
    const salesRole = await ctx.db
      .query("roles")
      .withIndex("byName", (q) => q.eq("name", "فروشنده"))
      .first();

    if (!salesRole) {
      await ctx.db.insert("roles", {
        name: "فروشنده",
        description: "ایجاد سفارشات و مدیریت مشتریان",
        permissions: [
          "orders:view",
          "orders:create",
          "orders:edit",
          "customers:view",
          "customers:edit",
          "catalog:view",
          "products:view",
        ],
        isSystemRole: true,
        createdAt: now,
        createdBy: userId,
      });
      createdRoles.push("فروشنده (created)");
    }

    return {
      message: "Default roles created/updated successfully",
      createdRoles,
      totalRoles: createdRoles.length,
    };
  },
});
