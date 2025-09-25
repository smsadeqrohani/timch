import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface Role {
  id: Id<"roles">;
  name: string;
  description?: string;
  permissions: string[];
  isSystemRole?: boolean;
  createdAt: number;
  createdBy: Id<"users">;
}

interface User {
  id: Id<"users">;
  name: string;
  email: string;
  createdAt: string;
}

const AVAILABLE_PERMISSIONS = [
  "installment-calculator:view",
  "installment-calculator:edit",
  "catalog:view",
  "catalog:edit",
  "catalog:delete",
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
];

const PERMISSION_LABELS: Record<string, string> = {
  "installment-calculator:view": "مشاهده محاسبه گر اقساط",
  "installment-calculator:edit": "ویرایش محاسبه گر اقساط",
  "catalog:view": "مشاهده کاتالوگ",
  "catalog:edit": "ویرایش کاتالوگ",
  "catalog:delete": "حذف کاتالوگ",
  "customers:view": "مشاهده مشتریان",
  "customers:edit": "ویرایش مشتریان",
  "customers:delete": "حذف مشتریان",
  "users:view": "مشاهده کاربران",
  "users:edit": "ویرایش کاربران",
  "users:delete": "حذف کاربران",
  "roles:view": "مشاهده نقش‌ها",
  "roles:edit": "ویرایش نقش‌ها",
  "roles:delete": "حذف نقش‌ها",
  "settings:view": "مشاهده تنظیمات",
  "settings:edit": "ویرایش تنظیمات",
  "companies:view": "مشاهده شرکت‌ها",
  "companies:edit": "ویرایش شرکت‌ها",
  "companies:delete": "حذف شرکت‌ها",
  "collections:view": "مشاهده مجموعه‌ها",
  "collections:edit": "ویرایش مجموعه‌ها",
  "collections:delete": "حذف مجموعه‌ها",
  "products:view": "مشاهده محصولات",
  "products:edit": "ویرایش محصولات",
  "products:delete": "حذف محصولات",
};

export const RolesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'roles' | 'assignments'>('roles');
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedUser, setSelectedUser] = useState<Id<"users"> | null>(null);

  // Form states
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Queries
  const roles = useQuery(api.roles.getAllRoles);
  const users = useQuery(api.auth.getAllUsers);
  const userRoles = useQuery(
    api.roles.getUserRoles,
    selectedUser ? { userId: selectedUser } : "skip"
  );

  // Mutations
  const createRole = useMutation(api.roles.createRole);
  const updateRole = useMutation(api.roles.updateRole);
  const deleteRole = useMutation(api.roles.deleteRole);
  const assignRole = useMutation(api.roles.assignRoleToUser);
  const removeRole = useMutation(api.roles.removeRoleFromUser);

  const handleCreateRole = async () => {
    try {
      await createRole({
        name: roleName,
        description: roleDescription,
        permissions: selectedPermissions,
      });
      setShowCreateRole(false);
      resetForm();
    } catch (error) {
      console.error('Error creating role:', error);
      alert('خطا در ایجاد نقش');
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    
    try {
      await updateRole({
        roleId: editingRole.id,
        name: roleName,
        description: roleDescription,
        permissions: selectedPermissions,
      });
      setEditingRole(null);
      resetForm();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('خطا در ویرایش نقش');
    }
  };

  const handleDeleteRole = async (roleId: Id<"roles">) => {
    if (confirm('آیا از حذف این نقش اطمینان دارید؟')) {
      try {
        await deleteRole({ roleId });
      } catch (error) {
        console.error('Error deleting role:', error);
        alert('خطا در حذف نقش');
      }
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setSelectedPermissions(role.permissions);
    setShowCreateRole(true);
  };

  const resetForm = () => {
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
    setEditingRole(null);
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleAssignRole = async (userId: Id<"users">, roleId: Id<"roles">) => {
    try {
      await assignRole({ userId, roleId });
    } catch (error) {
      console.error('Error assigning role:', error);
      alert('خطا در تخصیص نقش');
    }
  };

  const handleRemoveRole = async (userId: Id<"users">, roleId: Id<"roles">) => {
    try {
      await removeRole({ userId, roleId });
    } catch (error) {
      console.error('Error removing role:', error);
      alert('خطا در حذف نقش');
    }
  };


  if (roles === undefined || users === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent from-blue-400 to-purple-400">
          مدیریت نقش‌ها
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowCreateRole(true);
              resetForm();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            ایجاد نقش جدید
          </button>
        </div>
      </div>


      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'roles'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          مدیریت نقش‌ها
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'assignments'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          تخصیص نقش‌ها
        </button>
      </div>

      {/* Create/Edit Role Modal */}
      {showCreateRole && (
        <div className="modal-backdrop">
          <div className="modal-container modal-container-md modal-scrollable">
            <h2 className="text-xl font-bold mb-4">
              {editingRole ? 'ویرایش نقش' : 'ایجاد نقش جدید'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">نام نقش</label>
                <input
                  type="text"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="نام نقش را وارد کنید"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">توضیحات</label>
                <textarea
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="توضیحات نقش را وارد کنید"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">دسترسی‌ها</label>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {AVAILABLE_PERMISSIONS.map((permission) => (
                    <label key={permission} className="flex items-center space-x-2 space-x-reverse">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{PERMISSION_LABELS[permission]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse mt-6">
              <button
                onClick={() => {
                  setShowCreateRole(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={editingRole ? handleUpdateRole : handleCreateRole}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {editingRole ? 'ویرایش' : 'ایجاد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="grid gap-4">
            {roles.map((role) => (
              <div key={role.id} className="bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{role.name}</h3>
                      {role.isSystemRole && (
                        <span className="px-2 py-1 bg-red-600 text-xs rounded-full">
                          سیستم
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-gray-300 mt-1">{role.description}</p>
                    )}
                    <div className="mt-2">
                      <p className="text-sm text-gray-400">
                        تعداد دسترسی‌ها: {role.permissions.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditRole(role)}
                      disabled={role.isSystemRole}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
                    >
                      ویرایش
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      disabled={role.isSystemRole}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          {/* User Selection */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">انتخاب کاربر</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user.id)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedUser === user.id
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="text-left">
                    <h4 className="font-medium">{user.name}</h4>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Role Assignment */}
          {selectedUser && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                تخصیص نقش به {users.find(u => u.id === selectedUser)?.name}
              </h3>
              
              <div className="grid gap-4">
                {roles.map((role) => {
                  const isAssigned = userRoles?.some(ur => ur.id === role.id);
                  return (
                    <div key={role.id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                      <div>
                        <h4 className="font-medium">{role.name}</h4>
                        {role.description && (
                          <p className="text-sm text-gray-400">{role.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => 
                          isAssigned 
                            ? handleRemoveRole(selectedUser, role.id)
                            : handleAssignRole(selectedUser, role.id)
                        }
                        className={`px-4 py-2 rounded transition-colors ${
                          isAssigned
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {isAssigned ? 'حذف نقش' : 'تخصیص نقش'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
