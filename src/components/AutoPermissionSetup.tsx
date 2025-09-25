import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function AutoPermissionSetup() {
  const [hasSetup, setHasSetup] = useState(false);
  const setupSuperAdminSystem = useMutation(api.roles.setupSuperAdminSystem);
  const currentUser = useQuery(api.auth.loggedInUser);
  const userPermissions = useQuery(api.roles.getCurrentUserPermissions);

  useEffect(() => {
    const runSetup = async () => {
      // Only run setup if user is logged in and we haven't set up yet
      if (currentUser && !hasSetup && userPermissions !== undefined) {
        // Check if user has any permissions
        if (!userPermissions || userPermissions.length === 0) {
          try {
            console.log('🔧 Setting up permissions system...');
            await setupSuperAdminSystem();
            setHasSetup(true);
            console.log('✅ Permission system setup completed!');
          } catch (error) {
            console.error('❌ Failed to setup permission system:', error);
          }
        } else {
          setHasSetup(true);
        }
      }
    };

    runSetup();
  }, [currentUser, hasSetup, userPermissions, setupSuperAdminSystem]);

  // This component doesn't render anything, it just runs the setup
  return null;
}
