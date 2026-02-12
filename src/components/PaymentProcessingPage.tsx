import React, { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { ORDER_STATUS, PAYMENT_TYPE } from '../../convex/orders';
import { useNavigate } from 'react-router-dom';
import { formatPrice, formatPersianNumber } from '../lib/utils';
import { formatSizeFromValues } from '../utils/sizeUtils';
import InstallmentAgreementForm from './InstallmentAgreementForm';
import ImageHoverPreview from './ImageHoverPreview';

interface PaymentProcessingPageProps {
  orderId: Id<"orders">;
}

export default function PaymentProcessingPage({ orderId }: PaymentProcessingPageProps) {
  const navigate = useNavigate();
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showNationalCodeDialog, setShowNationalCodeDialog] = useState(false);
  const [newNationalCode, setNewNationalCode] = useState('');
  const [pendingPaymentType, setPendingPaymentType] = useState<string>('');
  const [nationalCodeOverride, setNationalCodeOverride] = useState<string | null>(null);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>('');
  const [showInstallmentForm, setShowInstallmentForm] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'حضوری' | 'ارسال'>('حضوری');
  const [selectedAddressId, setSelectedAddressId] = useState<Id<'customerAddresses'> | 'new' | null>(null);
  const [newAddressText, setNewAddressText] = useState('');

  // Queries
  const currentUser = useQuery(api.auth.loggedInUser);
  const products = useQuery(api.products.list);
  const collections = useQuery(api.collections.list);
  const companies = useQuery(api.companies.list);
  const orderDetails = useQuery(api.orders.getWithItems, { id: orderId });
  const customers = useQuery(api.customers.list);
  const customerAddresses = useQuery(
    api.customerAddresses.listByCustomer,
    orderDetails?.order?.customerId ? { customerId: orderDetails.order.customerId } : 'skip'
  );

  const customer = React.useMemo(() => {
    if (!orderDetails) return null;
    return customers?.find((c) => c._id === orderDetails.order.customerId) || null;
  }, [customers, orderDetails]);

  const customerNationalCode = nationalCodeOverride ?? customer?.nationalCode ?? null;

  // Mutations
  const updateOrderStatus = useMutation(api.orders.updateStatus);
  const updateCustomer = useMutation(api.customers.update);
  const addCustomerAddress = useMutation(api.customerAddresses.add);
  const sendOrderSms = useAction(api.sms.sendEvent);
  const [savingAddress, setSavingAddress] = useState(false);

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
  const calculateTotalAmount = React.useMemo(() => {
    if (!orderDetails) return 0;
    
    return orderDetails.items.reduce((total, item) => {
      const price = itemPrices[item._id] || 0;
      return total + (price * item.quantity);
    }, 0);
  }, [orderDetails, itemPrices]);

  // Check if customer needs national code
  const needsNationalCode = React.useMemo(() => {
    if (!orderDetails) return false;
    return !customerNationalCode;
  }, [orderDetails, customerNationalCode]);

  React.useEffect(() => {
    if (nationalCodeOverride !== null && customer?.nationalCode) {
      setNationalCodeOverride(null);
    }
  }, [customer, nationalCodeOverride]);

  const resolvedDeliveryAddress = (): string => {
    if (selectedAddressId === 'new') return newAddressText.trim();
    if (selectedAddressId && customerAddresses?.length) {
      const a = customerAddresses.find((x) => x._id === selectedAddressId);
      return a?.address ?? '';
    }
    if (customerAddresses?.length) return ''; // انتخاب نشده
    return newAddressText.trim(); // بدون لیست آدرس، فقط متن
  };

  const continuePaymentFlow = (paymentType: string) => {
    if (!resolvedDeliveryAddress()) {
      setErrors({ general: 'آدرس تحویل/تماس الزامی است. لطفاً آدرس را انتخاب یا وارد کنید.' });
      return;
    }
    setErrors({});
    if (paymentType === PAYMENT_TYPE.INSTALLMENT) {
      setShowInstallmentForm(true);
      return;
    }
    setSelectedPaymentType(paymentType);
    setShowPaymentConfirmation(true);
  };

  // Handle national code update
  const handleUpdateNationalCode = async () => {
    if (!orderDetails || !newNationalCode.trim()) {
      setErrors({ general: 'کد ملی الزامی است' });
      return;
    }

    if (!newNationalCode.match(/^\d{10}$/)) {
      setErrors({ general: 'کد ملی باید 10 رقم باشد' });
      return;
    }

    if (!customer) {
      setErrors({ general: 'اطلاعات مشتری یافت نشد' });
      return;
    }

    try {
      await updateCustomer({
        id: orderDetails.order.customerId,
        name: customer.name,
        mobile: customer.mobile,
        nationalCode: newNationalCode,
      });

      const paymentTypeToResume = pendingPaymentType;

      setNationalCodeOverride(newNationalCode);
      setNewNationalCode('');
      setShowNationalCodeDialog(false);
      setPendingPaymentType('');
      setErrors({});

      if (paymentTypeToResume) {
        continuePaymentFlow(paymentTypeToResume);
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'خطا در به‌روزرسانی کد ملی' });
    }
  };

  // Handle payment processing — کد ملی در همهٔ حالات (نقد و اقساط) الزامی است
  const handleProcessPayment = async (paymentType: string) => {
    if (!orderId || !currentUser) {
      setErrors({ general: 'اطلاعات ناقص است' });
      return;
    }

    if (calculateTotalAmount === 0) {
      setErrors({ general: 'لطفاً قیمت آیتم‌ها را تعیین کنید' });
      return;
    }

    if (needsNationalCode) {
      setPendingPaymentType(paymentType);
      setShowNationalCodeDialog(true);
      setErrors({});
      return;
    }

    setErrors({});
    continuePaymentFlow(paymentType);
  };

  // Handle payment confirmation
  const handleConfirmPayment = async () => {
    if (!selectedPaymentType) return;

    // Check if customer needs national code
    if (needsNationalCode) {
      setPendingPaymentType(selectedPaymentType);
      setShowPaymentConfirmation(false);
      setShowNationalCodeDialog(true);
      return;
    }

    // Proceed with payment if national code exists
    await processPayment(selectedPaymentType);
    setShowPaymentConfirmation(false);
  };

  // Process payment (separate function for reuse)
  const processPayment = async (paymentType: string) => {
    try {
      const itemPricesArray = orderDetails!.items
        .filter(item => (itemPrices[item._id] || 0) > 0)
        .map(item => ({ itemId: item._id, price: itemPrices[item._id]! }));

      await updateOrderStatus({
        id: orderId,
        status: ORDER_STATUS.APPROVED,
        paymentType,
        cashierId: currentUser._id,
        totalAmount: calculateTotalAmount,
        itemPrices: itemPricesArray,
        deliveryType: deliveryType || undefined,
        deliveryAddress: resolvedDeliveryAddress() || undefined,
      });

      if (paymentType === PAYMENT_TYPE.CASH) {
        try {
          await sendOrderSms({
            event: "payment_cash",
            orderId,
          });
        } catch (smsError) {
          console.error("Cash payment SMS failed", smsError);
        }
      }

      // Navigate back to orders list
      navigate('/orders');
    } catch (error: any) {
      setErrors({ general: error.message || 'خطا در پردازش سفارش' });
    }
  };

  const handleCancel = () => {
    navigate(`/orders/${orderId}`);
  };

  // Handle installment agreement success
  const handleInstallmentSuccess = () => {
    setShowInstallmentForm(false);
    navigate('/orders');
  };

  // Handle installment agreement cancel
  const handleInstallmentCancel = () => {
    setShowInstallmentForm(false);
  };

  if (!orderDetails) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent border-blue-400"></div>
      </div>
    );
  }

  // Show installment form if needed
  if (showInstallmentForm) {
    const itemPricesArray = orderDetails.items
      .filter(item => (itemPrices[item._id] || 0) > 0)
      .map(item => ({ itemId: item._id, price: itemPrices[item._id]! }));

    return (
      <InstallmentAgreementForm
        orderId={orderId}
        totalAmount={calculateTotalAmount}
        itemPrices={itemPricesArray}
        deliveryType={deliveryType}
        deliveryAddress={resolvedDeliveryAddress() || undefined}
        onSuccess={handleInstallmentSuccess}
        onCancel={handleInstallmentCancel}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="glass-card p-6 rounded-2xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-200">انتخاب نوع پرداخت و تعیین قیمت</h3>
          <button
            onClick={handleCancel}
            className="btn-secondary"
          >
            ← بازگشت به جزئیات سفارش
          </button>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 text-red-400 rounded">
            {errors.general}
          </div>
        )}

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="border border-gray-600 rounded-lg p-4 bg-gray-800/30">
            <h4 className="text-lg font-semibold mb-3 text-gray-200">خلاصه سفارش</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
                <div className="text-xl font-bold text-blue-400">
                  {formatPersianNumber(orderDetails.items.length)}
                </div>
                <div className="text-sm text-blue-300">تعداد آیتم</div>
              </div>
              <div className="text-center p-3 bg-green-900/30 rounded-lg border border-green-500/30">
                <div className={`text-xl font-bold ${calculateTotalAmount === 0 ? 'text-gray-500 line-through' : 'text-green-400'}`}>
                  {formatPrice(calculateTotalAmount)}
                </div>
                <div className={`text-sm ${calculateTotalAmount === 0 ? 'text-gray-400' : 'text-green-300'}`}>
                  مجموع کل
                </div>
              </div>
              <div className="text-center p-3 bg-orange-900/30 rounded-lg border border-orange-500/30">
                <div className="text-sm font-bold text-orange-400">
                  {new Date(orderDetails.order.createdAt).toLocaleDateString('fa-IR')}
                </div>
                <div className="text-sm text-orange-300">تاریخ ثبت</div>
              </div>
            </div>
          </div>

          {/* Price Input for Items */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-200">تعیین قیمت آیتم‌ها</h4>
            <div className="space-y-4">
              {orderDetails.items.map((item, index) => {
                const productDetails = getProductDetails(item.productId);
                const previewImage = productDetails?.product.imageUrls?.[0];
                return (
                  <div key={item._id} className="p-4 border border-gray-600 rounded-lg bg-gray-800/30">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-medium text-gray-200">آیتم {formatPersianNumber(index + 1)}</h5>
                    </div>
                    
                    {/* Product Info Display */}
                    <div className="mb-3 p-3 bg-gray-700/50 rounded-lg">
                      <div className="text-sm text-gray-400 space-y-2">
                        <div>
                          شرکت: {productDetails?.company.name || 'نامشخص'} | 
                          مجموعه: {productDetails?.collection.name || 'نامشخص'} | 
                          محصول: {productDetails?.product.code || 'نامشخص'} | 
                          رنگ: {item.color || 'نامشخص'}
                        </div>
                        {previewImage && (
                          <ImageHoverPreview
                            imageUrl={previewImage}
                            alt={`پیش‌نمایش ${productDetails?.product.code || ''} - ${item.color}`}
                          >
                            <span className="inline-flex items-center gap-1 rounded-md border border-blue-400/40 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
                              مشاهده تصویر
                              {productDetails?.product.imageUrls && productDetails.product.imageUrls.length > 1 && (
                                <span className="text-[10px] text-blue-200/70">
                                  {productDetails.product.imageUrls.length}
                                </span>
                              )}
                            </span>
                          </ImageHoverPreview>
                        )}
                      </div>
                    </div>
                    
                    {/* Price Input and Item Details */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          ابعاد
                        </label>
                        <div className="auth-input-field bg-gray-700 text-gray-400 cursor-not-allowed">
                          {formatSizeFromValues(item.sizeX, item.sizeY)}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          تعداد
                        </label>
                        <div className="auth-input-field bg-gray-700 text-gray-400 cursor-not-allowed">
                          {formatPersianNumber(item.quantity)}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          قیمت پایه (ریال)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          placeholder="قیمت پایه"
                          value={itemPrices[item._id] || ''}
                          onChange={(e) => {
                            const price = parseFloat(e.target.value) || 0;
                            setItemPrices(prev => ({
                              ...prev,
                              [item._id]: price
                            }));
                          }}
                          className="auth-input-field"
                          dir="ltr"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          مجموع
                        </label>
                        <div className="auth-input-field bg-green-900/30 text-green-400 font-bold">
                          {formatPrice((itemPrices[item._id] || 0) * item.quantity)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Total Amount Display */}
            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-blue-400 font-medium text-lg">مجموع کل:</span>
                <span className={`font-bold text-2xl ${calculateTotalAmount === 0 ? 'text-gray-500 line-through' : 'text-blue-400'}`}>
                  {formatPrice(calculateTotalAmount)}
                </span>
              </div>
              {calculateTotalAmount === 0 && (
                <div className="text-center mt-2">
                  <span className="text-yellow-400 text-sm">⚠️ لطفاً قیمت آیتم‌ها را تعیین کنید</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Type & Address — نوع تحویل مشخص؛ آدرس در همهٔ حالات الزامی است */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-200">نوع تحویل</h4>
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => { setDeliveryType('حضوری'); setErrors((e) => ({ ...e, general: '' })); }}
                className={`px-4 py-2 rounded-lg font-medium ${
                  deliveryType === 'حضوری' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                تحویل حضوری
              </button>
              <button
                type="button"
                onClick={() => { setDeliveryType('ارسال'); setErrors((e) => ({ ...e, general: '' })); }}
                className={`px-4 py-2 rounded-lg font-medium ${
                  deliveryType === 'ارسال' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                ارسال
              </button>
            </div>
            <div className="border border-gray-600 rounded-lg p-4 bg-gray-800/30 space-y-3">
              <label className="block text-sm font-medium text-gray-300">آدرس تحویل/تماس <span className="text-amber-400">(الزامی در همهٔ حالات)</span></label>
                {customerAddresses && customerAddresses.length > 0 && (
                  <select
                    value={selectedAddressId === 'new' ? 'new' : selectedAddressId ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === 'new') setSelectedAddressId('new');
                      else if (v) setSelectedAddressId(v as Id<'customerAddresses'>);
                      else setSelectedAddressId(null);
                    }}
                    className="auth-input-field w-full max-w-md"
                  >
                    <option value="">انتخاب آدرس از لیست مشتری</option>
                    {customerAddresses.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.label ? `${a.label}: ` : ''}{a.address.slice(0, 50)}{a.address.length > 50 ? '…' : ''}
                      </option>
                    ))}
                    <option value="new">آدرس جدید (فقط این سفارش)</option>
                  </select>
                )}
                {(selectedAddressId === 'new' || !customerAddresses?.length) && (
                  <>
                    <textarea
                      placeholder="آدرس تحویل را وارد کنید"
                      value={newAddressText}
                      onChange={(e) => setNewAddressText(e.target.value)}
                      rows={3}
                      className="auth-input-field w-full"
                      dir="rtl"
                    />
                    {orderDetails?.order.customerId && newAddressText.trim() && (
                      <button
                        type="button"
                        disabled={savingAddress}
                        onClick={async () => {
                          setSavingAddress(true);
                          try {
                            const id = await addCustomerAddress({
                              customerId: orderDetails.order.customerId,
                              address: newAddressText.trim(),
                              isDefault: !customerAddresses?.length,
                            });
                            setSelectedAddressId(id);
                            setNewAddressText('');
                          } catch (e: unknown) {
                            setErrors({ general: e instanceof Error ? e.message : 'خطا در ذخیره آدرس' });
                          } finally {
                            setSavingAddress(false);
                          }
                        }}
                        className="text-sm px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-gray-200"
                      >
                        {savingAddress ? 'در حال ذخیره…' : 'ذخیره در لیست آدرس‌های مشتری'}
                      </button>
                    )}
                  </>
                )}
            </div>
          </div>

          {/* Payment Options */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-200">انتخاب نوع پرداخت</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleProcessPayment(PAYMENT_TYPE.CASH)}
                disabled={calculateTotalAmount === 0}
                className={`p-6 rounded-lg font-medium text-lg transition-colors ${
                  calculateTotalAmount === 0 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">💵</span>
                  <div className="text-center">
                    <div>پرداخت نقدی</div>
                    <div className={`text-sm ${calculateTotalAmount === 0 ? 'line-through opacity-60' : 'opacity-90'}`}>
                      {formatPrice(calculateTotalAmount)}
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleProcessPayment(PAYMENT_TYPE.INSTALLMENT)}
                disabled={calculateTotalAmount === 0}
                className={`p-6 rounded-lg font-medium text-lg transition-colors ${
                  calculateTotalAmount === 0 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">💳</span>
                  <div className="text-center">
                    <div>پرداخت اقساطی</div>
                    <div className={`text-sm ${calculateTotalAmount === 0 ? 'line-through opacity-60' : 'opacity-90'}`}>
                      {formatPrice(calculateTotalAmount)}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t border-gray-600">
            <button
              onClick={handleCancel}
              className="btn-secondary"
            >
              انصراف
            </button>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Dialog */}
      {showPaymentConfirmation && orderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[80] p-4">
          <div className="w-full max-w-2xl">
            <div className="glass-card p-6 rounded-2xl shadow-xl">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">تایید پرداخت</h3>
              
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="border border-gray-600 rounded-lg p-4 bg-gray-800/30">
                  <h4 className="text-lg font-semibold mb-3 text-gray-200">اطلاعات مشتری</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-400">نام:</span>
                      <span className="text-gray-200 mr-2">{customer?.name || 'نامشخص'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">موبایل:</span>
                      <span className="text-gray-200 mr-2">{customer?.mobile || 'نامشخص'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">کد ملی:</span>
                      <span className="text-gray-200 mr-2">{customerNationalCode || 'ثبت نشده'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">تاریخ سفارش:</span>
                      <span className="text-gray-200 mr-2">
                        {new Date(orderDetails.order.createdAt).toLocaleDateString('fa-IR')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Items Summary */}
                <div className="border border-gray-600 rounded-lg p-4 bg-gray-800/30">
                  <h4 className="text-lg font-semibold mb-3 text-gray-200">خلاصه سفارش</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {orderDetails.items.map((item, index) => {
                      const productDetails = getProductDetails(item.productId);
                      const itemTotal = (itemPrices[item._id] || 0) * item.quantity;
                      const previewImage = productDetails?.product.imageUrls?.[0];
                      return (
                        <div key={item._id} className="flex justify-between items-center gap-3 p-2 bg-gray-700/30 rounded">
                          <div className="flex-1 text-sm text-gray-300 space-y-1">
                            <div>
                              {productDetails?.company.name} - {productDetails?.collection.name} - {productDetails?.product.code}
                            </div>
                            <div className="text-xs text-gray-400">رنگ: {item.color}</div>
                            {previewImage && (
                              <ImageHoverPreview
                                imageUrl={previewImage}
                                alt={`پیش‌نمایش ${productDetails?.product.code || ''} - ${item.color}`}
                                containerClassName="mt-1"
                              >
                                <span className="inline-flex items-center gap-1 rounded-md border border-blue-400/40 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
                                  مشاهده تصویر
                                  {productDetails?.product.imageUrls && productDetails.product.imageUrls.length > 1 && (
                                    <span className="text-[10px] text-blue-200/70">
                                      {productDetails.product.imageUrls.length}
                                    </span>
                                  )}
                                </span>
                              </ImageHoverPreview>
                            )}
                          </div>
                          <div className="text-sm text-gray-200 whitespace-nowrap">
                            {formatPersianNumber(item.quantity)} × {formatPrice(itemPrices[item._id] || 0)} = {formatPrice(itemTotal)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery */}
                <div className="border border-gray-600 rounded-lg p-4 bg-gray-800/30">
                  <h4 className="text-lg font-semibold mb-3 text-gray-200">تحویل</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">نوع تحویل:</span>
                      <span className="text-gray-200 font-medium">{deliveryType}</span>
                    </div>
                    {resolvedDeliveryAddress() && (
                      <div>
                        <span className="text-gray-400">آدرس تحویل/تماس:</span>
                        <p className="text-gray-200 mt-1">{resolvedDeliveryAddress()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="border border-gray-600 rounded-lg p-4 bg-gray-800/30">
                  <h4 className="text-lg font-semibold mb-3 text-gray-200">خلاصه پرداخت</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">نوع پرداخت:</span>
                      <span className="text-gray-200 font-medium">
                        {selectedPaymentType === PAYMENT_TYPE.CASH ? '💵 پرداخت نقدی' : '💳 پرداخت اقساطی'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">مبلغ کل:</span>
                      <span className="text-green-400 font-bold text-xl">
                        {formatPrice(calculateTotalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">تعداد آیتم‌ها:</span>
                      <span className="text-gray-200">{formatPersianNumber(orderDetails.items.length)} آیتم</span>
                    </div>
                  </div>
                </div>

                {/* Confirmation Message */}
                <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-yellow-400 font-medium">آیا از پردازش این سفارش اطمینان دارید؟</p>
                      <p className="text-yellow-300 text-sm mt-1">
                        پس از تایید، سفارش به وضعیت "تایید شده" تغییر خواهد کرد و قابل ویرایش نخواهد بود.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowPaymentConfirmation(false);
                      setSelectedPaymentType('');
                    }}
                    className="btn-secondary"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    className="auth-button"
                  >
                    بله، پردازش سفارش
                  </button>
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
                      setPendingPaymentType('');
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
                    افزودن کد ملی و ادامه
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
