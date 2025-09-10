import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
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
      name: user.name || user.email || 'نام نامشخص',
      email: user.email,
      createdAt: user._creationTime ? new Date(user._creationTime).toLocaleDateString('fa-IR') : 'نامشخص'
    }));
  },
});
