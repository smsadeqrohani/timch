import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const useUserRoles = () => {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  
  const userRoles = useQuery(
    api.roles.getUserRoles,
    loggedInUser?._id ? { userId: loggedInUser._id } : "skip"
  );

  const getDisplayRole = (): string => {
    if (!loggedInUser) {
      return 'کاربر';
    }

    if (!userRoles || userRoles.length === 0) {
      return 'کاربر';
    }

    // If user has multiple roles, show the first one or a combined name
    if (userRoles.length === 1) {
      return userRoles[0].name;
    }

    // If user has multiple roles, show a combined name
    const roleNames = userRoles.map(role => role.name).join('، ');
    return roleNames;
  };

  const getPrimaryRole = (): string => {
    if (!loggedInUser) {
      return 'کاربر';
    }

    if (!userRoles || userRoles.length === 0) {
      return 'کاربر';
    }

    // Return the first role (primary role)
    return userRoles[0].name;
  };

  return {
    userRoles: userRoles || [],
    displayRole: getDisplayRole(),
    primaryRole: getPrimaryRole(),
    isLoading: userRoles === undefined,
    isAuthenticated: !!loggedInUser,
  };
};
