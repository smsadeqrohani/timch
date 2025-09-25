import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SignOutButton } from '../SignOutButton';
import { ChequeCalculator } from '../ChequeCalculator';
import { UsersPage } from './UsersPage';
import { CustomersPage } from './CustomersPage';
import { SettingsPage } from './SettingsPage';
import { RolesPage } from './RolesPage';
import { usePermissions } from '../hooks/usePermissions';
import CatalogMain from './CatalogMain';

interface AdminLayoutProps {}

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  isActive?: boolean;
  permission?: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'installment-calculator',
    title: 'محاسبه گر اقساط',
    icon: '🧮',
    isActive: true,
    permission: 'installment-calculator:view'
  },
  {
    id: 'catalog',
    title: 'کاتالوگ محصولات',
    icon: '🏺',
    permission: 'catalog:view'
  },
  {
    id: 'customers',
    title: 'مشتریان',
    icon: '👤',
    permission: 'customers:view'
  },
  {
    id: 'users',
    title: 'کاربران',
    icon: '👥',
    permission: 'users:view'
  },
  {
    id: 'roles',
    title: 'نقش‌ها',
    icon: '🔐',
    permission: 'roles:view'
  },
  {
    id: 'settings',
    title: 'تنظیمات',
    icon: '⚙️',
    permission: 'settings:view'
  }
];

export const AdminLayout: React.FC<AdminLayoutProps> = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('installment-calculator');
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const { hasPermission } = usePermissions();

  const getRequiredPermission = (pageId: string): string => {
    const item = menuItems.find(item => item.id === pageId);
    return item?.permission || '';
  };


  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white admin-layout" dir="rtl">
      {/* Right Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 admin-sidebar flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            {isSidebarOpen && (
              <h1 className="text-lg font-bold bg-gradient-to-r bg-clip-text text-transparent from-blue-400 to-purple-400">
                پنل مدیریت
              </h1>
            )}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors sidebar-toggle"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              // Check if user has permission to see this menu item
              if (item.permission && !hasPermission(item.permission)) {
                return null;
              }
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActivePage(item.id)}
                    className={`flex items-center p-3 rounded-lg admin-sidebar-item w-full text-right ${
                      activePage === item.id ? 'active' : 'text-gray-300'
                    }`}
                  >
                    <span className="text-xl ml-3">{item.icon}</span>
                    {isSidebarOpen && (
                      <span className="font-medium">{item.title}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-700/50">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {loggedInUser?.name ? loggedInUser.name.charAt(0).toUpperCase() : 'ا'}
            </div>
            {isSidebarOpen && (
              <div className="mr-3 flex-1">
                <p className="text-sm font-medium text-gray-200">{loggedInUser?.name || 'کاربر'}</p>
                <p className="text-xs text-gray-400">مدیر سیستم</p>
              </div>
            )}
          </div>
          {isSidebarOpen && (
            <div className="mt-3">
              <SignOutButton />
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="admin-header px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent from-blue-400 to-purple-400">
                سامانه تیمچه فرش
              </h2>
              <p className="text-sm text-gray-400 mt-1">سیستم مدیریت فروش و اقساط</p>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="text-sm text-gray-300">
                {new Date().toLocaleDateString('fa-IR')}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {activePage === 'installment-calculator' && hasPermission('installment-calculator:view') && <ChequeCalculator />}
          {activePage === 'catalog' && hasPermission('catalog:view') && <CatalogMain />}
          {activePage === 'customers' && hasPermission('customers:view') && <CustomersPage />}
          {activePage === 'users' && hasPermission('users:view') && <UsersPage />}
          {activePage === 'roles' && hasPermission('roles:view') && <RolesPage />}
          {activePage === 'settings' && hasPermission('settings:view') && <SettingsPage />}
          
          {/* Access denied message */}
          {!hasPermission(getRequiredPermission(activePage)) && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-red-400 mb-2">دسترسی محدود</h2>
                <p className="text-gray-400">شما دسترسی لازم برای مشاهده این بخش را ندارید</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
