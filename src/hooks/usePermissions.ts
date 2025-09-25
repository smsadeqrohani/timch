import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const usePermissions = () => {
  const permissions = useQuery(api.roles.getCurrentUserPermissions);
  
  const hasPermission = (permission: string): boolean => {
    // If permissions are still loading or not available, return true temporarily
    // This prevents the UI from breaking while the system initializes
    if (permissions === undefined) {
      return true;
    }
    return permissions?.includes(permission) ?? false;
  };

  const hasAnyPermission = (permissionsList: string[]): boolean => {
    if (permissions === undefined) {
      return true;
    }
    return permissionsList.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissionsList: string[]): boolean => {
    if (permissions === undefined) {
      return true;
    }
    return permissionsList.every(permission => hasPermission(permission));
  };

  return {
    permissions: permissions ?? [],
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading: permissions === undefined,
  };
};
