import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { ORDER_STATUS, PAYMENT_TYPE } from '../../convex/orders';
import ImageHoverPreview from './ImageHoverPreview';
import { formatSizeFromValues } from '../utils/sizeUtils';

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
}

export default function CashierInterface() {
  const [selectedOrder, setSelectedOrder] = useState<Id<"orders"> | null>(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [accessCode, setAccessCode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Queries
  const pendingOrders = useQuery(api.orders.getPendingForCashier);
  const customers = useQuery(api.customers.list);
  const users = useQuery(api.auth.getAllUsers);
  const products = useQuery(api.products.list);
  const currentUser = useQuery(api.auth.loggedInUser);
  const selectedOrderDetails = useQuery(
    api.orders.getWithItems, 
    selectedOrder ? { id: selectedOrder } : "skip"
  );

  // Mutations
  const updateOrderStatus = useMutation(api.orders.updateStatus);

  // Get customer details for orders
  const ordersWithDetails: OrderWithDetails[] = (pendingOrders || []).map(order => {
    const customer = customers?.find(c => c._id === order.customerId);
    const createdByUser = users?.find((u: any) => u.id === order.createdBy);
    
    return {
      ...order,
      customer,
      createdByUser,
    };
  });

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

  // Simple authorization check (in real app, this would be more secure)
  const handleAuthorization = () => {
    // Simple access code check - in production, use proper authentication
    if (accessCode === 'cashier2024') {
      setIsAuthorized(true);
      setErrors({});
    } else {
      setErrors({ general: 'کد دسترسی نادرست است' });
    }
  };

  // Handle payment type selection
  const handlePaymentTypeSelect = (orderId: Id<"orders">, paymentType: string) => {
    setSelectedOrder(orderId);
    setSelectedPaymentType(paymentType);
    setShowConfirmDialog(true);
  };

  // Process order (approve or cancel)
  const processOrder = async (action: 'approve' | 'cancel') => {
    if (!selectedOrder || !currentUser) {
      setErrors({ general: 'اطلاعات ناقص است' });
      return;
    }

    try {
      const status = action === 'approve' ? ORDER_STATUS.APPROVED : ORDER_STATUS.CANCELLED;
      const paymentType = action === 'approve' ? selectedPaymentType : undefined;

      await updateOrderStatus({
        id: selectedOrder,
        status,
        paymentType,
        cashierId: currentUser._id,
      });

      // Reset state
      setSelectedOrder(null);
      setSelectedPaymentType('');
      setShowConfirmDialog(false);
      setErrors({});
    } catch (error: any) {
      setErrors({ general: error.message || 'خطا در پردازش سفارش' });
    }
  };

  // Show authorization screen if not authorized
  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="glass-card p-8 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-gray-200 text-center">
            🔐 دسترسی به صندوق
          </h2>
          <p className="text-gray-400 text-center mb-6">
            برای دسترسی به بخش صندوق، کد دسترسی را وارد کنید
          </p>
          
          {errors.general && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 text-red-400 rounded">
              {errors.general}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                کد دسترسی
              </label>
              <input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="کد دسترسی صندوق"
                className="auth-input-field"
                onKeyPress={(e) => e.key === 'Enter' && handleAuthorization()}
              />
            </div>
            
            <button
              onClick={handleAuthorization}
              className="auth-button w-full"
            >
              ورود به صندوق
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="glass-card p-6 rounded-2xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-200 flex items-center gap-2">
            💳 صندوق - پردازش سفارشات
          </h2>
          <button
            onClick={() => setIsAuthorized(false)}
            className="text-gray-400 hover:text-red-400 text-sm"
          >
            خروج از صندوق
          </button>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 text-red-400 rounded">
            {errors.general}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex border-b border-gray-600">
            <button
              className={`px-4 py-2 font-medium ${
                !selectedOrder
                  ? 'border-b-2 border-blue-500 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              سفارشات در انتظار ({ordersWithDetails.length})
            </button>
            <button
              disabled={!selectedOrder}
              className={`px-4 py-2 font-medium ${
                selectedOrder
                  ? 'border-b-2 border-blue-500 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              جزئیات سفارش
            </button>
          </div>
        </div>

        {!selectedOrder ? (
          <div className="space-y-4">
            {ordersWithDetails.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">💳</div>
                <p>هیچ سفارشی در انتظار پردازش نیست</p>
              </div>
            ) : (
              ordersWithDetails.map((order) => (
                <div key={order._id} className="border-l-4 border-l-blue-500 border border-gray-600 rounded-lg p-6 bg-gray-800/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Order Header */}
                      <div className="flex items-center gap-4">
                        <span className="px-3 py-1 rounded text-sm font-medium bg-blue-600 text-white">
                          {order.totalAmount}
                        </span>
                        <span className="px-3 py-1 rounded text-sm font-medium bg-gray-600 text-white">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>

                      {/* Customer Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-gray-300">
                            👤 <span className="font-medium">{order.customer?.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-300">
                            📞 <span>{order.customer?.mobile}</span>
                          </div>
                          {order.customer?.nationalCode && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-600 text-white">
                              کد ملی: {order.customer.nationalCode}
                            </span>
                          )}
                        </div>
                        
                        {!order.customer?.nationalCode && (
                          <div className="text-sm text-orange-400 bg-orange-900/20 p-2 rounded border border-orange-500/30">
                            ⚠️ کد ملی مشتری ثبت نشده است
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div className="text-sm text-gray-300 bg-gray-800/50 p-3 rounded">
                          <strong>یادداشت:</strong> {order.notes}
                        </div>
                      )}

                      {/* Created by */}
                      <div className="text-xs text-gray-500">
                        ثبت شده توسط: {order.createdByUser?.name || 'نامشخص'}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 ml-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePaymentTypeSelect(order._id, PAYMENT_TYPE.CASH)}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium"
                        >
                          💵 نقدی
                        </button>
                        <button
                          onClick={() => handlePaymentTypeSelect(order._id, PAYMENT_TYPE.INSTALLMENT)}
                          className="px-3 py-2 border border-blue-500 text-blue-400 hover:bg-blue-900/20 rounded text-sm font-medium"
                        >
                          💳 اقساط
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedOrder(order._id);
                          setSelectedPaymentType('');
                          setShowConfirmDialog(true);
                        }}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
                      >
                        ❌ لغو سفارش
                      </button>
                      <button
                        onClick={() => setSelectedOrder(order._id)}
                        className="px-3 py-2 border border-gray-500 text-gray-300 hover:bg-gray-700/50 rounded text-sm font-medium"
                      >
                        👁️ مشاهده جزئیات
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : selectedOrderDetails ? (
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="border border-gray-600 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">خلاصه سفارش</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
                  <div className="text-2xl font-bold text-blue-400">
                    {selectedOrderDetails.order.totalAmount}
                  </div>
                  <div className="text-sm text-blue-300">مبلغ کل</div>
                </div>
                <div className="text-center p-4 bg-green-900/30 rounded-lg border border-green-500/30">
                  <div className="text-2xl font-bold text-green-400">
                    {selectedOrderDetails.items.length}
                  </div>
                  <div className="text-sm text-green-300">تعداد آیتم</div>
                </div>
                <div className="text-center p-4 bg-orange-900/30 rounded-lg border border-orange-500/30">
                  <div className="text-sm font-bold text-orange-400">
                    {formatDate(selectedOrderDetails.order.createdAt)}
                  </div>
                  <div className="text-sm text-orange-300">تاریخ ثبت</div>
                </div>
              </div>

              {selectedOrderDetails.order.notes && (
                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                  <div className="font-medium text-gray-300 mb-2">یادداشت:</div>
                  <div className="text-gray-400">{selectedOrderDetails.order.notes}</div>
                </div>
              )}
            </div>

            {/* Customer Info */}
            <div className="border border-gray-600 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">اطلاعات مشتری</h3>
              {customers?.find(c => c._id === selectedOrderDetails.order.customerId) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">نام</div>
                    <div className="font-medium text-gray-200">
                      {customers.find(c => c._id === selectedOrderDetails.order.customerId)?.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">شماره موبایل</div>
                    <div className="font-medium text-gray-200">
                      {customers.find(c => c._id === selectedOrderDetails.order.customerId)?.mobile}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">کد ملی</div>
                    <div className="font-medium text-gray-200">
                      {customers.find(c => c._id === selectedOrderDetails.order.customerId)?.nationalCode || 'ثبت نشده'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="border border-gray-600 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">آیتم‌های سفارش</h3>
              <div className="space-y-3">
                {selectedOrderDetails.items.map((item, index) => {
                  const product = products?.find((p) => p._id === item.productId);
                  const previewImage = product?.imageUrls?.[0];
                  return (
                    <div key={item._id} className="flex items-center justify-between p-4 border border-gray-600 rounded-lg bg-gray-800/30">
                      <div className="flex-1 space-y-2">
                        <div className="font-medium text-gray-200">آیتم {index + 1}</div>
                        <div className="text-sm text-gray-400">
                          محصول: {product?.code || 'نامشخص'} • رنگ: {item.color}
                        </div>
                        {previewImage && (
                          <ImageHoverPreview
                            imageUrl={previewImage}
                            alt={`پیش‌نمایش ${product?.code || ''} - ${item.color}`}
                          >
                            <span className="inline-flex items-center gap-2 rounded-md border border-blue-400/40 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
                              مشاهده تصویر
                              {product?.imageUrls && product.imageUrls.length > 1 && (
                                <span className="text-[10px] text-blue-200/70">
                                  {product.imageUrls.length}
                                </span>
                              )}
                            </span>
                          </ImageHoverPreview>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="text-gray-500">ابعاد</div>
                          <div className="font-medium text-gray-200">
                            {formatSizeFromValues(item.sizeX, item.sizeY)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500">تعداد</div>
                          <div className="font-medium text-gray-200">{item.quantity}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500">مجموع</div>
                          <div className="font-bold text-lg text-blue-400">
                            {item.sizeX * item.sizeY * item.quantity}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="btn-secondary"
              >
                بستن جزئیات
              </button>
            </div>
          </div>
        ) : null}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="w-full max-w-md mx-4">
              <div className="glass-card p-6 rounded-2xl shadow-xl">
                <h3 className="text-xl font-semibold mb-4 text-gray-200">
                  {selectedPaymentType ? 'تایید پرداخت' : 'لغو سفارش'}
                </h3>
                
                {selectedPaymentType && (
                  <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg mb-4">
                    <div className="text-center">
                      <div className="font-medium text-blue-300">نوع پرداخت انتخاب شده:</div>
                      <span className="px-3 py-1 rounded text-sm font-medium bg-blue-600 text-white mt-2 inline-block">
                        {selectedPaymentType}
                      </span>
                    </div>
                  </div>
                )}

                <div className="text-gray-300 mb-6">
                  {selectedPaymentType 
                    ? 'آیا مطمئن هستید که می‌خواهید این سفارش را تایید کنید؟'
                    : 'آیا مطمئن هستید که می‌خواهید این سفارش را لغو کنید؟'
                  }
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowConfirmDialog(false);
                      setSelectedOrder(null);
                      setSelectedPaymentType('');
                    }}
                    className="btn-secondary"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={() => processOrder(selectedPaymentType ? 'approve' : 'cancel')}
                    className={selectedPaymentType ? 'auth-button' : 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium'}
                  >
                    {selectedPaymentType ? 'تایید' : 'لغو'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}