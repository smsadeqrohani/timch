import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { ORDER_STATUS, PAYMENT_TYPE } from '../../convex/orders';
import { useNavigate } from 'react-router-dom';
import { ensureJalaliDisplay, getDisplayDueDateForInstallment } from '../utils/dateUtils';
import ImageHoverPreview from './ImageHoverPreview';
import { findSizeByDimensions, formatSizeFromValues } from '../utils/sizeUtils';
import logoImage from '../LOGO.png';

interface OrderDetailsPageProps {
  orderId: Id<"orders">;
}

export default function OrderDetailsPage({ orderId }: OrderDetailsPageProps) {
  const navigate = useNavigate();
  const [showNationalCodeDialog, setShowNationalCodeDialog] = useState(false);
  const [newNationalCode, setNewNationalCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Queries
  const customers = useQuery(api.customers.list);
  const users = useQuery(api.auth.getAllUsers);
  const currentUser = useQuery(api.auth.loggedInUser);
  const products = useQuery(api.products.list);
  const collections = useQuery(api.collections.list);
  const companies = useQuery(api.companies.list);
  const sizes = useQuery(api.sizes.list);
  const orderDetails = useQuery(api.orders.getWithItems, { id: orderId });
  const installmentAgreement = useQuery(api.installmentAgreements.getByOrderId, { orderId });

  // Mutations
  const updateOrderStatus = useMutation(api.orders.updateStatus);
  const updateCustomer = useMutation(api.customers.update);

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

  // Convert numbers to Persian digits
  const toPersianNumbers = (num: number | string): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
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

    try {
      await updateCustomer({
        id: orderDetails.order.customerId,
        name: customers?.find(c => c._id === orderDetails.order.customerId)?.name || '',
        mobile: customers?.find(c => c._id === orderDetails.order.customerId)?.mobile || '',
        nationalCode: newNationalCode,
      });

      setNewNationalCode('');
      setShowNationalCodeDialog(false);
      setErrors({});
    } catch (error: any) {
      setErrors({ general: error.message || 'خطا در به‌روزرسانی کد ملی' });
    }
  };

  // Handle payment processing
  const handleProcessPayment = async (action: 'approve' | 'cancel') => {
    if (action === 'approve') {
      // Navigate to payment processing page
      navigate(`/orders/${orderId}/payment`);
      return;
    }

    if (!orderId || !currentUser) {
      setErrors({ general: 'اطلاعات ناقص است' });
      return;
    }

    try {
      await updateOrderStatus({
        id: orderId,
        status: ORDER_STATUS.CANCELLED,
        cashierId: currentUser._id,
      });

      // Navigate back to orders list
      navigate('/orders');
    } catch (error: any) {
      setErrors({ general: error.message || 'خطا در لغو سفارش' });
    }
  };

  // Check if customer needs national code
  const needsNationalCode = () => {
    if (!orderDetails) return false;
    const customer = customers?.find(c => c._id === orderDetails.order.customerId);
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

  const handleEditOrder = () => {
    navigate(`/orders/${orderId}/edit`);
  };

  const handleBackToList = () => {
    navigate('/orders');
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to get item unit price for display
  const getItemUnitPrice = (item: typeof orderDetails.items[0]) => {
    if (item.price != null) return item.price;
    if (orderDetails && orderDetails.items.length === 1) return orderDetails.order.totalAmount / item.quantity;
    return null;
  };

  // Helper to get item total for display
  const getItemTotal = (item: typeof orderDetails.items[0]) => {
    const unitPrice = getItemUnitPrice(item);
    return unitPrice != null ? unitPrice * item.quantity : null;
  };

  if (!orderDetails) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent border-blue-400"></div>
      </div>
    );
  }

  const customer = customers?.find(c => c._id === orderDetails.order.customerId);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Printable Order Receipt - shown only when printing. جدول اقساط هیچوقت در چاپ فاکتور نیست. */}
      <div className="print-only invoice-print">
        <div className="invoice-print-inner">
          <header className="invoice-print-header">
            <div className="invoice-print-logo">
              <img src={logoImage} alt="تیمچه فرش" className="h-16 w-auto" />
            </div>
            <div className="invoice-print-meta">
              <div className="invoice-print-meta-row">
                <span className="invoice-print-label">شماره سفارش:</span>
                <span className="invoice-print-value">{toPersianNumbers(orderDetails.order._id.slice(-8))}</span>
              </div>
              <div className="invoice-print-meta-row">
                <span className="invoice-print-label">تاریخ:</span>
                <span className="invoice-print-value">{formatDate(orderDetails.order.createdAt)}</span>
              </div>
              <div className="invoice-print-meta-row">
                <span className="invoice-print-label">نوع پرداخت:</span>
                <span className="invoice-print-value">{orderDetails.order.paymentType || '—'}</span>
              </div>
            </div>
          </header>

          <section className="invoice-print-section invoice-print-seller">
            <h3 className="invoice-print-section-title">اطلاعات فروشنده</h3>
            <div className="invoice-print-grid">
              <div className="invoice-print-field">
                <span className="invoice-print-label">نام:</span>
                <span className="invoice-print-value">سید محمود برقعی</span>
              </div>
              <div className="invoice-print-field">
                <span className="invoice-print-label">تلفن:</span>
                <span className="invoice-print-value">{toPersianNumbers('02537740440-2')}</span>
              </div>
              <div className="invoice-print-field">
                <span className="invoice-print-label">کدملی:</span>
                <span className="invoice-print-value"></span>
              </div>
              <div className="invoice-print-field">
                <span className="invoice-print-label">شماره پروانه:</span>
                <span className="invoice-print-value">{toPersianNumbers('0144917463')}</span>
              </div>
              <div className="invoice-print-field invoice-print-field-full">
                <span className="invoice-print-label">آدرس:</span>
                <span className="invoice-print-value">قم، خیابان صفائیه، نبش کوچه ۳۴، شماره ۸۸۸</span>
              </div>
            </div>
          </section>

          <section className="invoice-print-section">
            <h3 className="invoice-print-section-title">اطلاعات مشتری</h3>
            <div className="invoice-print-grid">
              <div className="invoice-print-field">
                <span className="invoice-print-label">نام:</span>
                <span className="invoice-print-value">{customer?.name || '—'}</span>
              </div>
              <div className="invoice-print-field">
                <span className="invoice-print-label">موبایل:</span>
                <span className="invoice-print-value">{customer?.mobile ? toPersianNumbers(customer.mobile) : '—'}</span>
              </div>
              <div className="invoice-print-field">
                <span className="invoice-print-label">کد ملی:</span>
                <span className="invoice-print-value">{customer?.nationalCode ? toPersianNumbers(customer.nationalCode) : '—'}</span>
              </div>
            </div>
          </section>

          <section className="invoice-print-section">
            <h3 className="invoice-print-section-title">آیتم‌های سفارش</h3>
            <table className="invoice-print-table">
              <thead>
                <tr>
                  <th>ردیف</th>
                  <th>محصول</th>
                  <th>ابعاد</th>
                  <th>تعداد</th>
                  <th>قیمت پایه (ریال)</th>
                  <th>مبلغ (ریال)</th>
                </tr>
              </thead>
              <tbody>
                {orderDetails.items.map((item, index) => {
                  const productDetails = getProductDetails(item.productId);
                  const unitPrice = getItemUnitPrice(item);
                  const itemTotal = getItemTotal(item);
                  return (
                    <tr key={item._id}>
                      <td className="invoice-print-td-num">{toPersianNumbers(index + 1)}</td>
                      <td className="invoice-print-td-product">
                        {productDetails ? `${productDetails.company.name} - ${productDetails.collection.name} - ${productDetails.product.code} (${item.color})` : '—'}
                      </td>
                      <td className="invoice-print-td-num">
                        {formatSizeFromValues(item.sizeX, item.sizeY, findSizeByDimensions(sizes, item.sizeX, item.sizeY)?.type ?? null)}
                      </td>
                      <td className="invoice-print-td-num">{toPersianNumbers(item.quantity)}</td>
                      <td className="invoice-print-td-amount" dir="ltr">
                        {unitPrice != null ? toPersianNumbers(unitPrice.toLocaleString()) : '—'}
                      </td>
                      <td className="invoice-print-td-amount" dir="ltr">
                        {itemTotal != null ? toPersianNumbers(itemTotal.toLocaleString()) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <footer className="invoice-print-footer">
            <span className="invoice-print-total-label">مبلغ کل:</span>
            <span className="invoice-print-total-value">{toPersianNumbers(orderDetails.order.totalAmount.toLocaleString())} ریال</span>
          </footer>
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl shadow-xl no-print">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-200">جزئیات سفارش</h3>
          <div className="flex gap-2">
            {orderDetails.order.status === ORDER_STATUS.PENDING_CASHIER && (
              <>
                <button
                  onClick={handleEditOrder}
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
                  onClick={() => handleProcessPayment('approve')}
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
            <div className="flex gap-2 items-center">
              {orderDetails.order.status === ORDER_STATUS.APPROVED && (
                <button
                  onClick={handlePrint}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm no-print"
                >
                  چاپ سفارش
                </button>
              )}
              <button
                onClick={handleBackToList}
                className="btn-secondary"
              >
                ← بازگشت به لیست
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="border border-gray-600 rounded-lg p-4">
            <h4 className="text-lg font-semibold mb-3 text-gray-200">خلاصه سفارش</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
                <div className="text-xl font-bold text-blue-400">
                  {orderDetails.order.status === ORDER_STATUS.PENDING_CASHIER || orderDetails.order.status === ORDER_STATUS.CANCELLED
                    ? '---' 
                    : toPersianNumbers(orderDetails.order.totalAmount.toLocaleString())}
                </div>
                <div className="text-sm text-blue-300">مبلغ کل</div>
              </div>
              <div className="text-center p-3 bg-green-900/30 rounded-lg border border-green-500/30">
                <div className="text-xl font-bold text-green-400">
                  {toPersianNumbers(orderDetails.items.length)}
                </div>
                <div className="text-sm text-green-300">تعداد آیتم</div>
              </div>
              <div className="text-center p-3 bg-orange-900/30 rounded-lg border border-orange-500/30">
                <div className="text-sm font-bold text-orange-400">
                  {formatDate(orderDetails.order.createdAt)}
                </div>
                <div className="text-sm text-orange-300">تاریخ ثبت</div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadgeClass(orderDetails.order.status)}`}>
                {orderDetails.order.status}
              </span>
              {orderDetails.order.paymentType && (
                <span className={`px-3 py-1 rounded text-sm font-medium ${getPaymentBadgeClass(orderDetails.order.paymentType)}`}>
                  {orderDetails.order.paymentType}
                </span>
              )}
            </div>

            {orderDetails.order.notes && (
              <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                <div className="font-medium text-gray-300 mb-1">یادداشت:</div>
                <div className="text-gray-400 text-sm">{orderDetails.order.notes}</div>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="border border-gray-600 rounded-lg p-4">
            <h4 className="text-lg font-semibold mb-3 text-gray-200">اطلاعات مشتری</h4>
            {customers?.find(c => c._id === orderDetails.order.customerId) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">نام</div>
                  <div className="font-medium text-gray-200">
                    {customers.find(c => c._id === orderDetails.order.customerId)?.name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">شماره موبایل</div>
                  <div className="font-medium text-gray-200">
                    {customers.find(c => c._id === orderDetails.order.customerId)?.mobile ? 
                      toPersianNumbers(customers.find(c => c._id === orderDetails.order.customerId)?.mobile || '') : 
                      'نامشخص'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">کد ملی</div>
                  <div className="font-medium text-gray-200">
                    {customers.find(c => c._id === orderDetails.order.customerId)?.nationalCode ? 
                      toPersianNumbers(customers.find(c => c._id === orderDetails.order.customerId)?.nationalCode || '') : 
                      'ثبت نشده'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Installment Agreement Info */}
          {installmentAgreement && orderDetails.order.paymentType === PAYMENT_TYPE.INSTALLMENT && (
            <div className="border border-gray-600 rounded-lg p-4 do-not-print-installment">
              <h4 className="text-lg font-semibold mb-3 text-gray-200">اطلاعات قرارداد اقساط</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">مبلغ کل:</span>
                    <span className="text-gray-200 font-medium">{toPersianNumbers(installmentAgreement.agreement.totalAmount.toLocaleString())} ریال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">پیش‌پرداخت:</span>
                    <span className="text-gray-200 font-medium">{toPersianNumbers(installmentAgreement.agreement.downPayment.toLocaleString())} ریال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">مبلغ اقساطی:</span>
                    <span className="text-gray-200 font-medium">{toPersianNumbers(installmentAgreement.agreement.principalAmount.toLocaleString())} ریال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">تعداد اقساط:</span>
                    <span className="text-gray-200 font-medium">{toPersianNumbers(installmentAgreement.agreement.numberOfInstallments)} قسط</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">مبلغ هر قسط:</span>
                    <span className="text-green-400 font-bold">{toPersianNumbers(installmentAgreement.agreement.installmentAmount.toLocaleString())} ریال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">کل سود:</span>
                    <span className="text-gray-200 font-medium">{toPersianNumbers(installmentAgreement.agreement.totalInterest.toLocaleString())} ریال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">کل پرداختی:</span>
                    <span className="text-gray-200 font-medium">{toPersianNumbers(installmentAgreement.agreement.totalPayment.toLocaleString())} ریال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">نوع ضمانت:</span>
                    <span className="text-gray-200 font-medium">{installmentAgreement.agreement.guaranteeType === 'cheque' ? 'چک' : 'طلا'}</span>
                  </div>
                </div>
              </div>
              
              {/* Installment Schedule */}
              <div className="mt-4">
                <h5 className="text-md font-semibold mb-3 text-gray-200">جدول اقساط</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-right py-2 text-gray-300">شماره قسط</th>
                        <th className="text-right py-2 text-gray-300">تاریخ سررسید</th>
                        <th className="text-right py-2 text-gray-300">مبلغ قسط</th>
                        <th className="text-right py-2 text-gray-300">سود</th>
                        <th className="text-right py-2 text-gray-300">اصل</th>
                        <th className="text-right py-2 text-gray-300">باقی‌مانده</th>
                        <th className="text-right py-2 text-gray-300">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installmentAgreement.installments.map((installment) => (
                        <tr key={installment._id} className="border-b border-gray-700">
                          <td className="py-2 text-gray-200">{toPersianNumbers(installment.installmentNumber)}</td>
                          <td className="py-2 text-gray-200">{ensureJalaliDisplay(getDisplayDueDateForInstallment(installmentAgreement.agreement.agreementDate, installment))}</td>
                          <td className="py-2 text-gray-200">{toPersianNumbers(installment.installmentAmount.toLocaleString())}</td>
                          <td className="py-2 text-gray-200">{toPersianNumbers(installment.interestAmount.toLocaleString())}</td>
                          <td className="py-2 text-gray-200">{toPersianNumbers(installment.principalAmount.toLocaleString())}</td>
                          <td className="py-2 text-gray-200">{toPersianNumbers(installment.remainingBalance.toLocaleString())}</td>
                          <td className="py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              installment.status === 'پرداخت شده' 
                                ? 'bg-green-600 text-white' 
                                : installment.status === 'سررسید گذشته'
                                ? 'bg-red-600 text-white'
                                : 'bg-orange-600 text-white'
                            }`}>
                              {installment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="border border-gray-600 rounded-lg p-4">
            <h4 className="text-lg font-semibold mb-3 text-gray-200">آیتم‌های سفارش</h4>
            <div className="space-y-3">
              {orderDetails.items.map((item, index) => {
                const productDetails = getProductDetails(item.productId);
                const previewImage = productDetails?.product.imageUrls?.[0];
                return (
                  <div key={item._id} className="flex items-center justify-between p-3 border border-gray-600 rounded-lg bg-gray-800/30">
                    <div className="flex-1">
                      <div className="font-medium text-gray-200">آیتم {toPersianNumbers(index + 1)}</div>
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
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-gray-500">ابعاد</div>
                        <div className="font-medium text-gray-200">
                          {(() => {
                            const matchedSize = findSizeByDimensions(sizes, item.sizeX, item.sizeY);
                            return formatSizeFromValues(
                              item.sizeX,
                              item.sizeY,
                              matchedSize?.type ?? null,
                            );
                          })()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">تعداد</div>
                        <div className="font-medium text-gray-200">{toPersianNumbers(item.quantity)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">قیمت پایه</div>
                        <div className="font-medium text-gray-400">
                          {orderDetails.order.status === ORDER_STATUS.PENDING_CASHIER || orderDetails.order.status === ORDER_STATUS.CANCELLED
                            ? '---'
                            : (() => {
                                const unitPrice = getItemUnitPrice(item);
                                return unitPrice != null
                                  ? `${toPersianNumbers(unitPrice.toLocaleString())} ریال`
                                  : '---';
                              })()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">مبلغ</div>
                        <div className="font-bold text-lg text-gray-400">
                          {orderDetails.order.status === ORDER_STATUS.PENDING_CASHIER || orderDetails.order.status === ORDER_STATUS.CANCELLED
                            ? '---' 
                            : (() => {
                                const itemTotal = getItemTotal(item);
                                return itemTotal != null 
                                  ? `${toPersianNumbers(itemTotal.toLocaleString())} ریال`
                                  : '---';
                              })()}
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

    </div>
  );
}
