import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import OrderList from './OrderList';
import OrderForm from './OrderForm';
import { usePermissions } from '../hooks/usePermissions';

export default function OrdersPage() {
  const { hasPermission } = usePermissions();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Get order statistics
  const orderStats = useQuery(api.orders.getStats);

  // Check permissions
  const canViewOrders = hasPermission('orders:view');
  const canCreateOrders = hasPermission('orders:create');

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-200">مدیریت سفارشات</h1>
          <p className="text-gray-400 mt-2">مشاهده و مدیریت سفارشات</p>
        </div>
        
        {canCreateOrders && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="auth-button flex items-center gap-2"
          >
            + سفارش جدید
          </button>
        )}
        
        {showCreateForm && (
          <button
            onClick={() => setShowCreateForm(false)}
            className="btn-secondary flex items-center gap-2"
          >
            ← بازگشت به لیست
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      {orderStats && !showCreateForm && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">کل سفارشات</p>
                <p className="text-2xl font-bold text-gray-200">{orderStats.total}</p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">در انتظار صندوق</p>
                <p className="text-2xl font-bold text-orange-400">{orderStats.pending}</p>
              </div>
              <div className="text-3xl">💳</div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">تایید شده</p>
                <p className="text-2xl font-bold text-green-400">{orderStats.approved}</p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">مبلغ کل</p>
                <p className="text-2xl font-bold text-blue-400">{orderStats.totalAmount}</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {showCreateForm && canCreateOrders ? (
        <OrderForm onSuccess={() => setShowCreateForm(false)} />
      ) : (
        canViewOrders && <OrderList />
      )}

      {/* Access denied message */}
      {!hasPermission('orders:view') && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-2">دسترسی محدود</h2>
            <p className="text-gray-400">شما دسترسی لازم برای مشاهده بخش سفارشات را ندارید</p>
          </div>
        </div>
      )}
    </div>
  );
}