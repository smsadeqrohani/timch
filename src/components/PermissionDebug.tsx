import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

export const PermissionDebug: React.FC = () => {
  const { permissions, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">در حال بارگذاری دسترسی‌ها...</h3>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-2">دسترسی‌های شما</h3>
      <div className="text-sm text-gray-300">
        <p className="mb-2">تعداد دسترسی‌ها: {permissions.length}</p>
        <div className="max-h-40 overflow-y-auto">
          {permissions.length > 0 ? (
            <ul className="space-y-1">
              {permissions.map((permission, index) => (
                <li key={index} className="text-xs bg-gray-700 px-2 py-1 rounded">
                  {permission}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">هیچ دسترسی‌ای تخصیص داده نشده است</p>
          )}
        </div>
      </div>
    </div>
  );
};
