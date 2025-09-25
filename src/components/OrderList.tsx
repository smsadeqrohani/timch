import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { ORDER_STATUS } from '../../convex/orders';
import { useNavigate } from 'react-router-dom';
import { formatPrice, formatPersianNumber } from '../lib/utils';

interface OrderWithDetails {
  _id: Id<"orders">;
  _creationTime: number;
  customerId: Id<"customers">;
  createdBy: Id<"users">;
  status: string;
  paymentType?: string;
  totalAmount: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  cashierId?: Id<"users">;
  processedAt?: number;
  customer?: {
    _id: Id<"customers">;
    name: string;
    mobile: string;
    nationalCode?: string;
  };
  createdByUser?: {
    id: Id<"users">;
    name: string;
    email: string;
    createdAt: string;
  };
  processedByUser?: {
    id: Id<"users">;
    name: string;
    email: string;
    createdAt: string;
  };
}

export default function OrderList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('همه');

  // Queries
  const orders = useQuery(api.orders.list);
  const customers = useQuery(api.customers.list);
  const users = useQuery(api.auth.getAllUsers);

  // Get customer details for orders
  const ordersWithDetails: OrderWithDetails[] = (orders || []).map(order => {
    const customer = customers?.find(c => c._id === order.customerId);
    const createdByUser = users?.find((u: any) => u.id === order.createdBy);
    const processedByUser = order.cashierId ? users?.find((u: any) => u.id === order.cashierId) : null;
    
    return {
      ...order,
      customer,
      createdByUser,
      processedByUser,
    };
  });

  // Filter orders based on search and status
  const filteredOrders = ordersWithDetails.filter(order => {
    const matchesSearch = !searchTerm || 
      order.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.mobile.includes(searchTerm) ||
      order.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'همه' || order.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case ORDER_STATUS.PENDING_CASHIER:
        return 'bg-orange-600 text-white';
      case ORDER_STATUS.APPROVED:
        return 'bg-green-600 text-white';
      case ORDER_STATUS.CANCELLED:
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  // Get payment type badge class
  const getPaymentBadgeClass = (paymentType?: string) => {
    switch (paymentType) {
      case 'نقدی':
        return 'bg-green-600 text-white';
      case 'اقساط':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewOrder = (orderId: Id<"orders">) => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="glass-card p-6 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-200">لیست سفارشات</h2>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="جستجو در سفارشات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="auth-input-field"
              dir="rtl"
            />
          </div>
          <div className="w-full md:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="auth-input-field"
            >
              <option value="همه">همه سفارشات</option>
              <option value={ORDER_STATUS.PENDING_CASHIER}>در انتظار صندوق</option>
              <option value={ORDER_STATUS.APPROVED}>تایید شده</option>
              <option value={ORDER_STATUS.CANCELLED}>لغو شده</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              هیچ سفارشی یافت نشد
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order._id} className="border border-gray-600 rounded-lg p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                      {order.paymentType && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentBadgeClass(order.paymentType)}`}>
                          {order.paymentType}
                        </span>
                      )}
                      {!(order.status === ORDER_STATUS.PENDING_CASHIER && !order.cashierId) && 
                       order.status !== ORDER_STATUS.CANCELLED && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white">
                          {formatPrice(order.totalAmount)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-400">
                      <div>👤 {order.customer?.name || 'نامشخص'}</div>
                      <div>📞 {order.customer?.mobile || 'نامشخص'}</div>
                      <div>📅 {formatDate(order.createdAt)}</div>
                    </div>

                    {order.notes && (
                      <div className="text-sm text-gray-500">
                        یادداشت: {order.notes}
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      ثبت شده توسط: {order.createdByUser?.name || 'نامشخص'}
                      {order.processedByUser && (
                        <>
                          {' | '}
                          {order.status === ORDER_STATUS.APPROVED ? 'تایید شده توسط' : 'لغو شده توسط'}: {order.processedByUser.name}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewOrder(order._id)}
                      className="btn-secondary"
                    >
                      مشاهده
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}