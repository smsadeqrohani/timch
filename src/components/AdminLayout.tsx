import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SignOutButton } from '../SignOutButton';
import { ChequeCalculator } from '../ChequeCalculator';
import { UsersPage } from './UsersPage';
import { CustomersPage } from './CustomersPage';
import { SettingsPage } from './SettingsPage';
import { RolesPage } from './RolesPage';
import OrdersPage from './OrdersPage';
import { usePermissions } from '../hooks/usePermissions';
import { useUserRoles } from '../hooks/useUserRoles';
import CatalogMain from './CatalogMain';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import OrderFormPage from './OrderFormPage';
import OrderEditPage from './OrderEditPage';
import OrderDetailsPage from './OrderDetailsPage';
import PaymentProcessingPage from './PaymentProcessingPage';
import PermissionSetup from './PermissionSetup';
import AutoPermissionSetup from './AutoPermissionSetup';
import { Id } from '../../convex/_generated/dataModel';

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
    id: 'orders',
    title: 'سفارشات',
    icon: '📦',
    permission: 'orders:view'
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
  },
  {
    id: 'permission-setup',
    title: 'راه‌اندازی مجوزها',
    icon: '🔧',
    permission: undefined // No permission check for setup
  }
];

export const AdminLayout: React.FC<AdminLayoutProps> = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const { hasPermission } = usePermissions();
  const { displayRole, userRoles, isLoading: rolesLoading } = useUserRoles();

  // Get current active page from location
  const getActivePage = () => {
    const path = location.pathname;
    if (path.startsWith('/orders/')) return 'orders';
    if (path === '/orders') return 'orders';
    if (path === '/catalog') return 'catalog';
    if (path === '/customers') return 'customers';
    if (path === '/users') return 'users';
    if (path === '/roles') return 'roles';
    if (path === '/settings') return 'settings';
    if (path === '/permission-setup') return 'permission-setup';
    return 'installment-calculator';
  };

  const activePage = getActivePage();

  const getRequiredPermission = (pageId: string): string => {
    const item = menuItems.find(item => item.id === pageId);
    return item?.permission || '';
  };

  // Wrapper components for order pages that need orderId from URL
  const OrderDetailsPageWrapper = () => {
    const { orderId } = useParams<{ orderId: string }>();
    return <OrderDetailsPage orderId={orderId as Id<"orders">} />;
  };

  const OrderEditPageWrapper = () => {
    const { orderId } = useParams<{ orderId: string }>();
    return <OrderEditPage orderId={orderId as Id<"orders">} />;
  };

  const PaymentProcessingPageWrapper = () => {
    const { orderId } = useParams<{ orderId: string }>();
    return <PaymentProcessingPage orderId={orderId as Id<"orders">} />;
  };


  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white admin-layout" dir="rtl">
      <AutoPermissionSetup />
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
                    onClick={() => {
                      if (item.id === 'installment-calculator') {
                        navigate('/');
                      } else {
                        navigate(`/${item.id}`);
                      }
                    }}
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
                <p 
                  className="text-xs text-gray-400"
                  title={userRoles.length > 1 ? `نقش‌ها: ${userRoles.map(r => r.name).join('، ')}` : undefined}
                >
                  {rolesLoading ? 'در حال بارگذاری...' : displayRole}
                  {userRoles.length > 1 && ' +'}
                </p>
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
          <Routes>
            <Route path="/" element={
              hasPermission('installment-calculator:view') ? <ChequeCalculator /> : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-2">دسترسی محدود</h2>
                    <p className="text-gray-400">شما دسترسی لازم برای مشاهده این بخش را ندارید</p>
                  </div>
                </div>
              )
            } />
            <Route path="/orders" element={
              hasPermission('orders:view') ? <OrdersPage /> : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-2">دسترسی محدود</h2>
                    <p className="text-gray-400">شما دسترسی لازم برای مشاهده این بخش را ندارید</p>
                  </div>
                </div>
              )
            } />
            <Route path="/orders/new" element={
              hasPermission('orders:create') ? <OrderFormPage /> : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-2">دسترسی محدود</h2>
                    <p className="text-gray-400">شما دسترسی لازم برای ایجاد سفارش را ندارید</p>
                  </div>
                </div>
              )
            } />
            <Route path="/orders/:orderId" element={
              hasPermission('orders:view') ? <OrderDetailsPageWrapper /> : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-2">دسترسی محدود</h2>
                    <p className="text-gray-400">شما دسترسی لازم برای مشاهده این بخش را ندارید</p>
                  </div>
                </div>
              )
            } />
            <Route path="/orders/:orderId/edit" element={
              hasPermission('orders:edit') ? <OrderEditPageWrapper /> : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-2">دسترسی محدود</h2>
                    <p className="text-gray-400">شما دسترسی لازم برای ویرایش سفارش را ندارید</p>
                  </div>
                </div>
              )
            } />
            <Route path="/orders/:orderId/payment" element={
              hasPermission('orders:process') ? <PaymentProcessingPageWrapper /> : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-2">دسترسی محدود</h2>
                    <p className="text-gray-400">شما دسترسی لازم برای پردازش سفارش را ندارید</p>
                  </div>
                </div>
              )
            } />
            <Route path="/catalog" element={
              hasPermission('catalog:view') ? <CatalogMain /> : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-2">دسترسی محدود</h2>
                    <p className="text-gray-400">شما دسترسی لازم برای مشاهده این بخش را ندارید</p>
                  </div>
                </div>
              )
            } />
            <Route path="/customers" element={
              hasPermission('customers:view') ? <CustomersPage /> : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-2">دسترسی محدود</h2>
                    <p className="text-gray-400">شما دسترسی لازم برای مشاهده این بخش را ندارید</p>
                  </div>
                </div>
              )
            } />
            <Route path="/users" element={
              hasPermission('users:view') ? <UsersPage /> : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-2">دسترسی محدود</h2>
                    <p className="text-gray-400">شما دسترسی لازم برای مشاهده این بخش را ندارید</p>
                  </div>
                </div>
              )
            } />
            <Route path="/roles" element={
              hasPermission('roles:view') ? <RolesPage /> : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-2">دسترسی محدود</h2>
                    <p className="text-gray-400">شما دسترسی لازم برای مشاهده این بخش را ندارید</p>
                  </div>
                </div>
              )
            } />
            <Route path="/settings" element={
              hasPermission('settings:view') ? <SettingsPage /> : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-2">دسترسی محدود</h2>
                    <p className="text-gray-400">شما دسترسی لازم برای مشاهده این بخش را ندارید</p>
                  </div>
                </div>
              )
            } />
            <Route path="/permission-setup" element={<PermissionSetup />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};
