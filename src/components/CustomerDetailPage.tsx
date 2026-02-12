import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { CustomerForm } from './CustomerForm';
import { toPersianNumbers, formatPrice } from '../lib/utils';

export const CustomerDetailPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const [showEditForm, setShowEditForm] = useState(false);

  const customer = useQuery(
    api.customers.get,
    customerId ? { id: customerId as Id<'customers'> } : 'skip'
  );
  const orders = useQuery(
    api.orders.getByCustomer,
    customerId ? { customerId: customerId as Id<'customers'> } : 'skip'
  );
  const agreements = useQuery(
    api.installmentAgreements.getByCustomerId,
    customerId ? { customerId: customerId as Id<'customers'> } : 'skip'
  );
  const unpaidInstallments = useQuery(
    api.installmentAgreements.getUnpaidInstallmentsByCustomer,
    customerId ? { customerId: customerId as Id<'customers'> } : 'skip'
  );
  const addresses = useQuery(
    api.customerAddresses.listByCustomer,
    customerId ? { customerId: customerId as Id<'customers'> } : 'skip'
  );

  if (customerId == null) {
    return (
      <div className="p-6">
        <p className="text-gray-400">شناسه مشتری نامعتبر است.</p>
        <Link to="/customers" className="text-blue-400 hover:underline mt-2 inline-block">بازگشت به لیست مشتریان</Link>
      </div>
    );
  }

  if (customer === undefined) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <span className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent border-blue-400" />
      </div>
    );
  }

  if (customer === null) {
    return (
      <div className="p-6">
        <p className="text-gray-400">مشتری یافت نشد.</p>
        <Link to="/customers" className="text-blue-400 hover:underline mt-2 inline-block">بازگشت به لیست مشتریان</Link>
      </div>
    );
  }

  const handleEditSuccess = () => setShowEditForm(false);

  // Summary from orders & agreements
  const orderCount = orders?.length ?? 0;
  const totalInvoicesAmount = orders?.reduce((sum, o) => sum + o.totalAmount, 0) ?? 0;
  const totalDownPayments = agreements?.reduce((sum, a) => sum + a.downPayment, 0) ?? 0;
  const unpaidCount = unpaidInstallments?.length ?? 0;
  const unpaidAmount = unpaidInstallments?.reduce((sum, i) => sum + i.installmentAmount, 0) ?? 0;

  const summaryCards = [
    { label: 'تعداد خرید', value: toPersianNumbers(String(orderCount)), sub: 'سفارش', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/40' },
    { label: 'مبلغ کل فاکتورها', value: formatPrice(totalInvoicesAmount), sub: '', color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/40' },
    { label: 'پیش‌پرداخت‌ها', value: formatPrice(totalDownPayments), sub: 'جمع پیش‌پرداخت اقساط', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/40' },
    { label: 'اقساط پرداخت‌نشده', value: formatPrice(unpaidAmount), sub: unpaidCount > 0 ? `${toPersianNumbers(String(unpaidCount))} قسط` : '—', color: unpaidCount > 0 ? 'from-rose-500/20 to-rose-600/10 border-rose-500/40' : 'from-gray-500/20 to-gray-600/10 border-gray-500/40' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back + Title */}
        <div className="mb-6">
          <Link
            to="/customers"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-4"
          >
            <span>←</span>
            <span>لیست مشتریان</span>
          </Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent from-blue-400 to-purple-400">
            جزئیات مشتری
          </h1>
        </div>

        {/* Customer card */}
        <div className="glass-card p-6 rounded-2xl shadow-xl shadow-gray-900/50 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-200 mb-2">{customer.name}</h2>
              <div className="space-y-1 text-gray-300">
                <p>
                  <span className="text-gray-400 ml-2">موبایل:</span>
                  {toPersianNumbers(customer.mobile)}
                </p>
                <p>
                  <span className="text-gray-400 ml-2">کد ملی:</span>
                  {customer.nationalCode ? toPersianNumbers(customer.nationalCode) : '—'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowEditForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              ویرایش مشتری
            </button>
          </div>
        </div>

        {/* Summary boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border bg-gradient-to-br ${card.color} p-4`}
            >
              <p className="text-gray-400 text-sm mb-1">{card.label}</p>
              <p className="text-xl font-bold text-gray-100">{card.value}</p>
              {card.sub ? <p className="text-gray-500 text-xs mt-1">{card.sub}</p> : null}
            </div>
          ))}
        </div>

        {/* Unpaid installments */}
        {unpaidInstallments && unpaidInstallments.length > 0 && (
          <div className="glass-card p-6 rounded-2xl shadow-xl shadow-gray-900/50 mb-6">
            <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <span className="w-2 h-5 rounded bg-rose-500" />
              اقساط پرداخت‌نشده
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-600">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-700/80">
                    <th className="px-3 py-2 text-right border-b border-gray-600 text-gray-300"># قسط</th>
                    <th className="px-3 py-2 text-right border-b border-gray-600 text-gray-300">سررسید</th>
                    <th className="px-3 py-2 text-right border-b border-gray-600 text-gray-300">مبلغ</th>
                    <th className="px-3 py-2 text-right border-b border-gray-600 text-gray-300">وضعیت</th>
                    <th className="px-3 py-2 text-center border-b border-gray-600 text-gray-300">سفارش</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidInstallments.map((inst) => (
                    <tr key={inst._id} className="bg-gray-800/50 border-b border-gray-600 last:border-0">
                      <td className="px-3 py-2 text-right text-gray-200">{toPersianNumbers(String(inst.installmentNumber))}</td>
                      <td className="px-3 py-2 text-right text-gray-200">{toPersianNumbers(inst.dueDate)}</td>
                      <td className="px-3 py-2 text-right text-gray-200">{formatPrice(inst.installmentAmount)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={inst.status === 'سررسید گذشته' ? 'text-rose-400' : 'text-amber-400'}>{inst.status}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Link to={`/orders/${inst.orderId}`} className="text-blue-400 hover:underline">جزئیات</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Addresses */}
        <div className="glass-card p-6 rounded-2xl shadow-xl shadow-gray-900/50 mb-6">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">آدرس‌ها</h2>
          {addresses === undefined ? (
            <div className="flex items-center gap-2 text-gray-400 py-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-blue-400" />
              <span>در حال بارگذاری…</span>
            </div>
          ) : addresses.length === 0 ? (
            <p className="text-gray-400 py-2">آدرسی ثبت نشده است.</p>
          ) : (
            <ul className="space-y-3">
              {addresses.map((addr) => (
                <li
                  key={addr._id}
                  className="flex flex-wrap items-start justify-between gap-2 p-3 rounded-lg bg-gray-800/50 border border-gray-600"
                >
                  <div className="flex-1 min-w-0">
                    {addr.label ? <span className="text-gray-400 text-sm ml-2">{addr.label}</span> : null}
                    {addr.isDefault && (
                      <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded ml-2">پیش‌فرض</span>
                    )}
                    <p className="text-gray-200 mt-1">{addr.address}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Orders & installments */}
        <div className="glass-card p-6 rounded-2xl shadow-xl shadow-gray-900/50">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">سفارش‌ها و اقساط</h2>
          {orders === undefined ? (
            <div className="flex items-center gap-2 text-gray-400 py-4">
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent border-blue-400" />
              <span>در حال بارگذاری سفارش‌ها…</span>
            </div>
          ) : orders.length === 0 ? (
            <p className="text-gray-400 py-4">این مشتری هنوز سفارشی ندارد.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-600">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-700/80">
                    <th className="px-3 py-2 text-right border-b border-gray-600 text-gray-300">شماره فاکتور</th>
                    <th className="px-3 py-2 text-right border-b border-gray-600 text-gray-300">وضعیت</th>
                    <th className="px-3 py-2 text-right border-b border-gray-600 text-gray-300">نوع پرداخت</th>
                    <th className="px-3 py-2 text-right border-b border-gray-600 text-gray-300">مبلغ کل</th>
                    <th className="px-3 py-2 text-right border-b border-gray-600 text-gray-300">اقساط</th>
                    <th className="px-3 py-2 text-center border-b border-gray-600 text-gray-300">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const agreement = agreements?.find((a) => a.orderId === order._id);
                    return (
                      <tr key={order._id} className="bg-gray-800/50 border-b border-gray-600 last:border-0">
                        <td className="px-3 py-2 text-right text-gray-200">
                          {order.invoiceNumber != null ? toPersianNumbers(String(order.invoiceNumber)) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-200">{order.status}</td>
                        <td className="px-3 py-2 text-right text-gray-200">{order.paymentType ?? '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-200">{formatPrice(order.totalAmount)}</td>
                        <td className="px-3 py-2 text-right text-gray-200">
                          {agreement ? (
                            <span className="text-amber-200">
                              {toPersianNumbers(String(agreement.numberOfInstallments))} قسط × {formatPrice(agreement.installmentAmount)} — {agreement.status}
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Link
                            to={`/orders/${order._id}`}
                            className="text-blue-400 hover:underline"
                          >
                            جزئیات سفارش
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {showEditForm && (
        <div className="modal-backdrop">
          <div className="modal-container modal-container-md modal-scrollable p-8">
            <CustomerForm
              initialData={customer}
              isEdit
              onSuccess={handleEditSuccess}
              onCancel={() => setShowEditForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
