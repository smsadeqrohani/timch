import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export const UsersPage: React.FC = () => {
  const users = useQuery(api.auth.getAllUsers);
  const { signIn } = useAuthActions();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Show loading state while data is being fetched
  if (users === undefined) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent from-blue-400 to-purple-400 mb-2">
            مدیریت کاربران
          </h1>
          <p className="text-gray-400">مدیریت و کنترل دسترسی کاربران سیستم</p>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent border-blue-400"></div>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user =>
    user.name.includes(searchTerm) || user.email.includes(searchTerm)
  );

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password confirmation
    if (newUser.password !== newUser.confirmPassword) {
      toast.error("رمز عبور و تکرار آن یکسان نیستند.");
      return;
    }

    if (newUser.password.length < 8) {
      toast.error("رمز عبور باید حداقل 8 کاراکتر باشد.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("email", newUser.email);
      formData.set("password", newUser.password);
      formData.set("name", newUser.name);
      formData.set("flow", "signUp");

      await signIn("password", formData);
      
      toast.success("کاربر با موفقیت ایجاد شد.");
      setNewUser({ name: '', email: '', password: '', confirmPassword: '' });
      setShowAddUser(false);
    } catch (error: any) {
      let toastTitle = "";
      if (error.message.includes("User already exists")) {
        toastTitle = "کاربری با این ایمیل قبلاً ثبت نام کرده است.";
      } else if (error.message.includes("Invalid email")) {
        toastTitle = "ایمیل وارد شده معتبر نیست.";
      } else if (error.message.includes("Password too short")) {
        toastTitle = "رمز عبور باید حداقل 8 کاراکتر باشد.";
      } else {
        toastTitle = "ایجاد کاربر ناموفق. لطفاً اطلاعات خود را بررسی کنید.";
      }
      toast.error(toastTitle);
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent from-blue-400 to-purple-400 mb-2">
          مدیریت کاربران
        </h1>
        <p className="text-gray-400">مدیریت و کنترل دسترسی کاربران سیستم</p>
      </div>

      {/* Add User Section */}
      <div className="glass-card p-6 rounded-2xl shadow-xl mb-6 shadow-gray-900/50">
        <div className="flex justify-end">
          <button
            onClick={() => setShowAddUser(true)}
            className="auth-button px-6 py-3"
          >
            افزودن کاربر جدید
          </button>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass-card p-8 rounded-2xl shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-6 text-gray-200">افزودن کاربر جدید</h3>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  نام کاربر
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="auth-input-field"
                  placeholder="نام کامل کاربر"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  ایمیل
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="auth-input-field"
                  placeholder="example@domain.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  رمز عبور
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="auth-input-field"
                  placeholder="حداقل 8 کاراکتر"
                  minLength={8}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  تکرار رمز عبور
                </label>
                <input
                  type="password"
                  value={newUser.confirmPassword}
                  onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                  className="auth-input-field"
                  placeholder="تکرار رمز عبور"
                  required
                />
              </div>
              
              <div className="flex space-x-3 space-x-reverse mt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 auth-button"
                >
                  {submitting ? 'در حال ایجاد...' : 'افزودن'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 btn-secondary"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-card p-6 rounded-2xl shadow-xl shadow-gray-900/50">
        <h2 className="text-lg font-semibold mb-4 text-gray-200">
          لیست کاربران ({filteredUsers.length})
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-700">
                <th className="border px-4 py-3 text-right border-gray-600 text-gray-200">نام کاربر</th>
                <th className="border px-4 py-3 text-right border-gray-600 text-gray-200">ایمیل</th>
                <th className="border px-4 py-3 text-right border-gray-600 text-gray-200">تاریخ عضویت</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr key={user.id} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}>
                  <td className="border px-4 py-3 text-right border-gray-600 text-gray-200">
                    {user.name}
                  </td>
                  <td className="border px-4 py-3 text-right border-gray-600 text-gray-200">
                    {user.email}
                  </td>
                  <td className="border px-4 py-3 text-center border-gray-600 text-gray-200">
                    {user.createdAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            هیچ کاربری یافت نشد
          </div>
        )}
      </div>
    </div>
  );
};
