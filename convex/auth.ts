import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
  callbacks: {
    createOrUpdateUser: async (ctx, args) => {
      // Extract data from the profile
      const email = args.profile.email || "";
      const name = args.profile.name || email.split('@')[0]; // Use email prefix as default name
      const image = args.profile.image;
      const tokenIdentifier = args.profile.tokenIdentifier;
      const emailVerificationTime = args.profile.emailVerificationTime;
      const phone = args.profile.phone;
      const phoneVerificationTime = args.profile.phoneVerificationTime;
      const isAnonymous = args.profile.isAnonymous;

      // If user already exists, update it
      if (args.existingUserId) {
        await ctx.db.patch(args.existingUserId, {
          email,
          name,
          image,
          tokenIdentifier,
          emailVerificationTime,
          phone,
          phoneVerificationTime,
          isAnonymous,
        });
        return args.existingUserId;
      }
      
      // Create new user
      return await ctx.db.insert("users", {
        email,
        name,
        image,
        tokenIdentifier,
        emailVerificationTime,
        phone,
        phoneVerificationTime,
        isAnonymous,
      });
    },
  },
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});

export const getAllUsers = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    
    // Get all users from the users table
    const users = await ctx.db.query("users").collect();
    
    // Return only the necessary fields for the admin panel
    return users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user._creationTime ? new Date(user._creationTime).toLocaleDateString('fa-IR') : 'نامشخص'
    }));
  },
});

export const updateUserName = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { name: args.name });
    return null;
  },
});
