import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { ORDER_STATUS, PAYMENT_TYPE } from '../../convex/orders';
import OrderEditModal from './OrderEditModal';

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

export default function OrderList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('همه');
  const [selectedOrder, setSelectedOrder] = useState<Id<"orders"> | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showNationalCodeDialog, setShowNationalCodeDialog] = useState(false);
  const [newNationalCode, setNewNationalCode] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Queries
  const orders = useQuery(api.orders.list);
  const customers = useQuery(api.customers.list);
  const users = useQuery(api.auth.getAllUsers);
  const currentUser = useQuery(api.auth.loggedInUser);
  const products = useQuery(api.products.list);
  const collections = useQuery(api.collections.list);
  const companies = useQuery(api.companies.list);
  const selectedOrderDetails = useQuery(
    api.orders.getWithItems, 
    selectedOrder ? { id: selectedOrder } : "skip"
  );

  // Mutations
  const updateOrderStatus = useMutation(api.orders.updateStatus);
  const updateCustomer = useMutation(api.customers.update);

  // Get customer details for orders
  const ordersWithDetails: OrderWithDetails[] = (orders || []).map(order => {
    const customer = customers?.find(c => c._id === order.customerId);
    const createdByUser = users?.find((u: any) => u.id === order.createdBy);
    
    return {
      ...order,
      customer,
      createdByUser,
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

  // Handle national code update
  const handleUpdateNationalCode = async () => {
    if (!selectedOrderDetails || !newNationalCode.trim()) {
      setErrors({ general: 'کد ملی الزامی است' });
      return;
    }

    if (!newNationalCode.match(/^\d{10}$/)) {
      setErrors({ general: 'کد ملی باید 10 رقم باشد' });
      return;
    }

    try {
      await updateCustomer({
        id: selectedOrderDetails.order.customerId,
        name: customers?.find(c => c._id === selectedOrderDetails.order.customerId)?.name || '',
        mobile: customers?.find(c => c._id === selectedOrderDetails.order.customerId)?.mobile || '',
        nationalCode: newNationalCode,
      });

      setNewNationalCode('');
      setShowNationalCodeDialog(false);
      setErrors({});
      // Keep order details modal open
    } catch (error: any) {
      setErrors({ general: error.message || 'خطا در به‌روزرسانی کد ملی' });
    }
  };

  // Handle payment processing
  const handleProcessPayment = async (action: 'approve' | 'cancel') => {
    if (!selectedOrder || !currentUser) {
      setErrors({ general: 'اطلاعات ناقص است' });
      return;
    }

    try {
      const status = action === 'approve' ? ORDER_STATUS.APPROVED : ORDER_STATUS.CANCELLED;
      const paymentType = action === 'approve' ? selectedPaymentType : undefined;

      // Calculate total amount if approving
      const finalTotalAmount = action === 'approve' ? calculateTotalAmount() : undefined;

      await updateOrderStatus({
        id: selectedOrder,
        status,
        paymentType,
        cashierId: currentUser._id,
        totalAmount: finalTotalAmount,
      });

      // Don't close the order details modal, just close payment dialog
      setShowPaymentDialog(false);
      setSelectedPaymentType('');
      setItemPrices({});
      setErrors({});
    } catch (error: any) {
      setErrors({ general: error.message || 'خطا در پردازش سفارش' });
    }
  };

  // Check if customer needs national code
  const needsNationalCode = () => {
    if (!selectedOrderDetails) return false;
    const customer = customers?.find(c => c._id === selectedOrderDetails.order.customerId);
    return !customer?.nationalCode;
  };

  // Get product details with company and collection info
  const getProductDetails = (productId: Id<"products">) => {
    const product = products?.find(p => p._id === productId);
    if (!product) return null;

    const collection = collections?.find(c => c._id === product.collectionId);
    if (!collection) return null;

    const company = companies?.find(comp => comp._id === collection.companyId);
    if (!company) return null;

    return {
      product,
      collection,
      company,
    };
  };

  // Calculate total amount from item prices
  const calculateTotalAmount = () => {
    if (!selectedOrderDetails) return 0;
    
    return selectedOrderDetails.items.reduce((total, item) => {
      const price = itemPrices[item._id] || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="glass-card p-6 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-200">لیست سفارشات</h2>
        
        {/* Simple header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-200">لیست سفارشات</h2>
        </div>

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
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white">
                        {order.totalAmount}
                      </span>
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
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedOrder(order._id)}
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

        {/* Order Details Modal */}
        {selectedOrder && selectedOrderDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="glass-card p-6 rounded-2xl shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-200">جزئیات سفارش</h3>
                  <div className="flex gap-2">
                    {selectedOrderDetails.order.status === ORDER_STATUS.PENDING_CASHIER && (
                      <>
                        <button
                          onClick={() => setShowEditModal(true)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        >
                          ویرایش سفارش
                        </button>
                        {needsNationalCode() && (
                          <button
                            onClick={() => setShowNationalCodeDialog(true)}
                            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
                          >
                            افزودن کد ملی
                          </button>
                        )}
                        <button
                          onClick={() => setShowPaymentDialog(true)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                        >
                          تایید سفارش
                        </button>
                        <button
                          onClick={() => handleProcessPayment('cancel')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        >
                          لغو سفارش
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="text-gray-400 hover:text-white text-2xl"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Order Summary */}
                  <div className="border border-gray-600 rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-3 text-gray-200">خلاصه سفارش</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
                        <div className="text-xl font-bold text-blue-400">
                          {selectedOrderDetails.order.totalAmount}
                        </div>
                        <div className="text-sm text-blue-300">مبلغ کل</div>
                      </div>
                      <div className="text-center p-3 bg-green-900/30 rounded-lg border border-green-500/30">
                        <div className="text-xl font-bold text-green-400">
                          {selectedOrderDetails.items.length}
                        </div>
                        <div className="text-sm text-green-300">تعداد آیتم</div>
                      </div>
                      <div className="text-center p-3 bg-orange-900/30 rounded-lg border border-orange-500/30">
                        <div className="text-sm font-bold text-orange-400">
                          {formatDate(selectedOrderDetails.order.createdAt)}
                        </div>
                        <div className="text-sm text-orange-300">تاریخ ثبت</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4">
                      <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadgeClass(selectedOrderDetails.order.status)}`}>
                        {selectedOrderDetails.order.status}
                      </span>
                      {selectedOrderDetails.order.paymentType && (
                        <span className={`px-3 py-1 rounded text-sm font-medium ${getPaymentBadgeClass(selectedOrderDetails.order.paymentType)}`}>
                          {selectedOrderDetails.order.paymentType}
                        </span>
                      )}
                    </div>

                    {selectedOrderDetails.order.notes && (
                      <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                        <div className="font-medium text-gray-300 mb-1">یادداشت:</div>
                        <div className="text-gray-400 text-sm">{selectedOrderDetails.order.notes}</div>
                      </div>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div className="border border-gray-600 rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-3 text-gray-200">اطلاعات مشتری</h4>
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
                  <div className="border border-gray-600 rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-3 text-gray-200">آیتم‌های سفارش</h4>
                    <div className="space-y-3">
                      {selectedOrderDetails.items.map((item, index) => {
                        const productDetails = getProductDetails(item.productId);
                        return (
                          <div key={item._id} className="flex items-center justify-between p-3 border border-gray-600 rounded-lg bg-gray-800/30">
                            <div className="flex-1">
                              <div className="font-medium text-gray-200">آیتم {index + 1}</div>
                              <div className="text-sm text-gray-400 space-y-1">
                                <div>شرکت: {productDetails?.company.name || 'نامشخص'}</div>
                                <div>مجموعه: {productDetails?.collection.name || 'نامشخص'}</div>
                                <div>محصول: {productDetails?.product.code || 'نامشخص'}</div>
                                <div>رنگ: {item.color || 'نامشخص'}</div>
                              </div>
                            </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <div className="text-gray-500">ابعاد</div>
                              <div className="font-medium text-gray-200">{item.sizeX} × {item.sizeY}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-500">تعداد</div>
                              <div className="font-medium text-gray-200">{item.quantity}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-500">مبلغ</div>
                              <div className="font-bold text-lg text-gray-400">
                                {selectedOrderDetails.order.status === ORDER_STATUS.PENDING_CASHIER 
                                  ? '---' 
                                  : `${selectedOrderDetails.order.totalAmount.toLocaleString()} تومان`}
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* National Code Dialog */}
        {showNationalCodeDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[80] p-4">
            <div className="w-full max-w-md">
              <div className="glass-card p-6 rounded-2xl shadow-xl">
                <h3 className="text-xl font-semibold mb-4 text-gray-200">افزودن کد ملی</h3>
                
                {errors.general && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 text-red-400 rounded">
                    {errors.general}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      کد ملی مشتری
                    </label>
                    <input
                      type="text"
                      value={newNationalCode}
                      onChange={(e) => setNewNationalCode(e.target.value)}
                      placeholder="1234567890"
                      className="auth-input-field"
                      dir="ltr"
                      maxLength={10}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setShowNationalCodeDialog(false);
                        setNewNationalCode('');
                        setErrors({});
                      }}
                      className="btn-secondary"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={handleUpdateNationalCode}
                      className="auth-button"
                    >
                      افزودن کد ملی
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Type Dialog */}
        {showPaymentDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[80] p-4">
            <div className="w-full max-w-md">
              <div className="glass-card p-6 rounded-2xl shadow-xl">
                <h3 className="text-xl font-semibold mb-4 text-gray-200">انتخاب نوع پرداخت</h3>
                
                {errors.general && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 text-red-400 rounded">
                    {errors.general}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Price Input for Items */}
                  {selectedOrderDetails && (
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-gray-200">تعیین قیمت آیتم‌ها</h4>
                      {selectedOrderDetails.items.map((item, index) => {
                        const productDetails = getProductDetails(item.productId);
                        return (
                          <div key={item._id} className="p-3 bg-gray-800 rounded-lg">
                            <div className="mb-2">
                              <div className="text-sm text-gray-400 space-y-1">
                                <div>شرکت: {productDetails?.company.name || 'نامشخص'}</div>
                                <div>مجموعه: {productDetails?.collection.name || 'نامشخص'}</div>
                                <div>محصول: {productDetails?.product.code || 'نامشخص'}</div>
                                <div>رنگ: {item.color || 'نامشخص'}</div>
                                <div className="text-gray-300">
                                  ابعاد: {item.sizeX}×{item.sizeY} | تعداد: {item.quantity}
                                </div>
                              </div>
                              <div className="text-green-400 font-medium">
                                {((itemPrices[item._id] || 0) * item.quantity).toLocaleString()} تومان
                              </div>
                            </div>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              placeholder="قیمت واحد (تومان)"
                              value={itemPrices[item._id] || ''}
                              onChange={(e) => {
                                const price = parseFloat(e.target.value) || 0;
                                setItemPrices(prev => ({
                                  ...prev,
                                  [item._id]: price
                                }));
                              }}
                              className="auth-input-field text-sm"
                              dir="ltr"
                            />
                          </div>
                        );
                      })}
                      
                      <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-400 font-medium">مجموع کل:</span>
                          <span className="text-blue-400 font-bold text-lg">
                            {calculateTotalAmount().toLocaleString()} تومان
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        if (calculateTotalAmount() === 0) {
                          setErrors({ general: 'لطفاً قیمت آیتم‌ها را تعیین کنید' });
                          return;
                        }
                        setSelectedPaymentType(PAYMENT_TYPE.CASH);
                        handleProcessPayment('approve');
                      }}
                      className="w-full p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                    >
                      💵 پرداخت نقدی ({calculateTotalAmount().toLocaleString()} تومان)
                    </button>
                    <button
                      onClick={() => {
                        if (calculateTotalAmount() === 0) {
                          setErrors({ general: 'لطفاً قیمت آیتم‌ها را تعیین کنید' });
                          return;
                        }
                        setSelectedPaymentType(PAYMENT_TYPE.INSTALLMENT);
                        handleProcessPayment('approve');
                      }}
                      className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                    >
                      💳 پرداخت اقساطی ({calculateTotalAmount().toLocaleString()} تومان)
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowPaymentDialog(false);
                        setSelectedPaymentType('');
                        setErrors({});
                      }}
                      className="btn-secondary"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Order Modal */}
        {selectedOrder && selectedOrderDetails && (
          <OrderEditModal
            orderId={selectedOrder}
            orderItems={selectedOrderDetails.items}
            notes={selectedOrderDetails.order.notes}
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setErrors({});
            }}
            onSuccess={() => {
              setShowEditModal(false);
              // Keep order details modal open, just close edit modal
            }}
          />
        )}
      </div>
    </div>
  );
}