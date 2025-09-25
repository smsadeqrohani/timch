import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useNavigate } from 'react-router-dom';
import { PersianDatePicker } from './PersianDatePicker';

export default function InstallmentsPage() {
  const navigate = useNavigate();
  const [selectedAgreement, setSelectedAgreement] = useState<Id<"installmentAgreements"> | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Queries
  const agreements = useQuery(api.installmentAgreements.list);
  const customers = useQuery(api.customers.list);
  const users = useQuery(api.auth.getAllUsers);
  const currentUser = useQuery(api.auth.loggedInUser);

  // Mutations
  const markInstallmentAsPaid = useMutation(api.installmentAgreements.markInstallmentAsPaid);

  // Get filtered agreements
  const filteredAgreements = React.useMemo(() => {
    if (!agreements) return [];
    
    if (filterStatus === 'all') return agreements;
    
    return agreements.filter(agreement => agreement.status === filterStatus);
  }, [agreements, filterStatus]);

  // Get customer name
  const getCustomerName = (customerId: Id<"customers">) => {
    const customer = customers?.find(c => c._id === customerId);
    return customer?.name || 'نامشخص';
  };

  // Get user name
  const getUserName = (userId: Id<"users">) => {
    const user = users?.find(u => u._id === userId);
    return user?.name || 'نامشخص';
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fa-IR') + ' ریال';
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fa-IR');
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'در انتظار تایید':
        return 'bg-orange-600 text-white';
      case 'تایید شده':
        return 'bg-green-600 text-white';
      case 'لغو شده':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const handleViewAgreement = (agreementId: Id<"installmentAgreements">) => {
    setSelectedAgreement(agreementId);
  };

  const handleBackToOrders = () => {
    navigate('/orders');
  };

  if (agreements === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="glass-card p-6 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent from-blue-400 to-purple-400">
            مدیریت اقساط
          </h1>
          <button
            onClick={handleBackToOrders}
            className="btn-secondary"
          >
            ← بازگشت به سفارشات
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400">{agreements.length}</div>
            <div className="text-sm text-blue-300">کل قراردادها</div>
          </div>
          <div className="text-center p-4 bg-orange-900/30 rounded-lg border border-orange-500/30">
            <div className="text-2xl font-bold text-orange-400">
              {agreements.filter(a => a.status === 'در انتظار پرداخت').length}
            </div>
            <div className="text-sm text-orange-300">در انتظار پرداخت</div>
          </div>
          <div className="text-center p-4 bg-green-900/30 rounded-lg border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">
              {agreements.filter(a => a.status === 'تکمیل شده').length}
            </div>
            <div className="text-sm text-green-300">تکمیل شده</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="auth-input-field"
          >
            <option value="all">همه قراردادها</option>
            <option value="در انتظار پرداخت">در انتظار پرداخت</option>
            <option value="تکمیل شده">تکمیل شده</option>
            <option value="لغو شده">لغو شده</option>
          </select>
        </div>

        {/* Agreements List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-200">لیست قراردادهای اقساط</h2>
          
          {filteredAgreements.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              هیچ قرارداد اقساطی یافت نشد
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAgreements.map((agreement) => (
                <div key={agreement._id} className="p-4 border border-gray-600 rounded-lg bg-gray-800/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-medium text-gray-200">
                          قرارداد اقساط #{agreement._id.slice(-8)}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(agreement.status)}`}>
                          {agreement.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">مشتری:</span>
                          <span className="text-gray-200 mr-2">{getCustomerName(agreement.customerId)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">مبلغ کل:</span>
                          <span className="text-gray-200 mr-2">{formatCurrency(agreement.totalAmount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">تعداد اقساط:</span>
                          <span className="text-gray-200 mr-2">{agreement.numberOfInstallments} قسط</span>
                        </div>
                        <div>
                          <span className="text-gray-400">مبلغ هر قسط:</span>
                          <span className="text-green-400 font-bold mr-2">{formatCurrency(agreement.installmentAmount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">پیش‌پرداخت:</span>
                          <span className="text-blue-400 font-bold mr-2">{formatCurrency(agreement.downPayment)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">تاریخ ایجاد:</span>
                          <span className="text-gray-200 mr-2">{formatDate(agreement.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewAgreement(agreement._id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                      >
                        مشاهده جزئیات
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Agreement Details Modal */}
      {selectedAgreement && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[80] p-4">
          <div className="w-full max-w-4xl">
            <div className="glass-card p-6 rounded-2xl shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-200">جزئیات قرارداد اقساط</h3>
                <button
                  onClick={() => setSelectedAgreement(null)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <InstallmentAgreementDetails 
                agreementId={selectedAgreement} 
                onPaymentSuccess={() => {
                  setSelectedAgreement(null);
                  // Refresh the page or update data
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Component for showing agreement details
function InstallmentAgreementDetails({ 
  agreementId, 
  onPaymentSuccess 
}: { 
  agreementId: Id<"installmentAgreements">;
  onPaymentSuccess: () => void;
}) {
  const [selectedInstallment, setSelectedInstallment] = useState<Id<"installments"> | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const agreementData = useQuery(api.installmentAgreements.getWithInstallments, { id: agreementId });
  const customers = useQuery(api.customers.list);
  const users = useQuery(api.auth.getAllUsers);
  const currentUser = useQuery(api.auth.loggedInUser);

  const markInstallmentAsPaid = useMutation(api.installmentAgreements.markInstallmentAsPaid);

  const handlePaymentClick = (installment: any) => {
    if (installment.status === 'پرداخت شده') {
      alert('این قسط قبلاً پرداخت شده است');
      return;
    }
    
    setSelectedInstallment(installment._id);
    setPaymentAmount(installment.installmentAmount);
    setPaymentDate('');
    setPaymentNotes('');
    setShowPaymentForm(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedInstallment || !currentUser) {
      alert('خطا در اطلاعات پرداخت');
      return;
    }

    if (!paymentDate) {
      alert('لطفاً تاریخ پرداخت را وارد کنید');
      return;
    }

    if (paymentAmount <= 0) {
      alert('مبلغ پرداخت باید بیشتر از صفر باشد');
      return;
    }

    try {
      await markInstallmentAsPaid({
        installmentId: selectedInstallment,
        paidBy: currentUser._id,
        paidAmount: paymentAmount,
        paymentDate: paymentDate,
        notes: paymentNotes || undefined,
      });

      alert('پرداخت با موفقیت ثبت شد');
      setShowPaymentForm(false);
      setSelectedInstallment(null);
      onPaymentSuccess();
    } catch (error: any) {
      alert('خطا در ثبت پرداخت: ' + error.message);
    }
  };

  if (!agreementData) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-transparent border-blue-400"></div>
      </div>
    );
  }

  const { agreement, installments } = agreementData;

  // Get customer name
  const getCustomerName = (customerId: Id<"customers">) => {
    const customer = customers?.find(c => c._id === customerId);
    return customer?.name || 'نامشخص';
  };

  // Get user name
  const getUserName = (userId: Id<"users">) => {
    const user = users?.find(u => u._id === userId);
    return user?.name || 'نامشخص';
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fa-IR') + ' ریال';
  };

  // Calculate statistics
  const paidInstallments = installments.filter(i => i.status === 'پرداخت شده').length;
  const pendingInstallments = installments.filter(i => i.status === 'در انتظار پرداخت').length;
  const overdueInstallments = installments.filter(i => i.status === 'سررسید گذشته').length;
  const totalPaid = installments
    .filter(i => i.status === 'پرداخت شده')
    .reduce((sum, i) => sum + i.installmentAmount, 0) + agreement.downPayment;

  return (
    <div className="space-y-6">
      {/* Agreement Summary */}
      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h4 className="text-lg font-semibold text-blue-400 mb-3">خلاصه قرارداد</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">مشتری:</span>
              <span className="text-gray-200 font-medium">{getCustomerName(agreement.customerId)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">مبلغ کل:</span>
              <span className="text-gray-200 font-medium">{formatCurrency(agreement.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">پیش‌پرداخت:</span>
              <span className="text-gray-200 font-medium">{formatCurrency(agreement.downPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">مبلغ اقساطی:</span>
              <span className="text-gray-200 font-medium">{formatCurrency(agreement.principalAmount)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">تعداد اقساط:</span>
              <span className="text-gray-200 font-medium">{agreement.numberOfInstallments} قسط</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">مبلغ هر قسط:</span>
              <span className="text-green-400 font-bold">{formatCurrency(agreement.installmentAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">کل سود:</span>
              <span className="text-gray-200 font-medium">{formatCurrency(agreement.totalInterest)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">نوع ضمانت:</span>
              <span className="text-gray-200 font-medium">{agreement.guaranteeType === 'cheque' ? 'چک' : 'طلا'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-green-900/30 rounded-lg border border-green-500/30">
          <div className="text-2xl font-bold text-green-400">{paidInstallments}</div>
          <div className="text-sm text-green-300">پرداخت شده</div>
        </div>
        <div className="text-center p-4 bg-orange-900/30 rounded-lg border border-orange-500/30">
          <div className="text-2xl font-bold text-orange-400">{pendingInstallments}</div>
          <div className="text-sm text-orange-300">در انتظار</div>
        </div>
        <div className="text-center p-4 bg-red-900/30 rounded-lg border border-red-500/30">
          <div className="text-2xl font-bold text-red-400">{overdueInstallments}</div>
          <div className="text-sm text-red-300">سررسید گذشته</div>
        </div>
        <div className="text-center p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
          <div className="text-2xl font-bold text-blue-400">{formatCurrency(totalPaid)}</div>
          <div className="text-sm text-blue-300">کل پرداخت شده</div>
        </div>
      </div>

      {/* Installments Table */}
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
              <th className="text-right py-2 text-gray-300">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {/* Down Payment Row */}
            <tr className="border-b border-gray-700 bg-blue-900/20">
              <td className="py-2 text-gray-200 font-medium">پیش‌پرداخت</td>
              <td className="py-2 text-gray-200">{agreement.agreementDate}</td>
              <td className="py-2 text-gray-200 font-bold text-blue-400">{formatCurrency(agreement.downPayment)}</td>
              <td className="py-2 text-gray-200">-</td>
              <td className="py-2 text-gray-200">-</td>
              <td className="py-2 text-gray-200">-</td>
              <td className="py-2">
                <span className="px-2 py-1 rounded text-xs bg-blue-600 text-white">
                  پرداخت شده
                </span>
              </td>
              <td className="py-2">
                <span className="text-blue-400 text-xs">پیش‌پرداخت</span>
              </td>
            </tr>
            
            {/* Regular Installments */}
            {installments.map((installment) => (
              <tr key={installment._id} className="border-b border-gray-700">
                <td className="py-2 text-gray-200">{installment.installmentNumber}</td>
                <td className="py-2 text-gray-200">{installment.dueDate}</td>
                <td className="py-2 text-gray-200">{formatCurrency(installment.installmentAmount)}</td>
                <td className="py-2 text-gray-200">{formatCurrency(installment.interestAmount)}</td>
                <td className="py-2 text-gray-200">{formatCurrency(installment.principalAmount)}</td>
                <td className="py-2 text-gray-200">{formatCurrency(installment.remainingBalance)}</td>
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
                <td className="py-2">
                  {installment.status === 'پرداخت شده' ? (
                    <span className="text-green-400 text-xs">پرداخت شده</span>
                  ) : (
                    <button
                      onClick={() => handlePaymentClick(installment)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                    >
                      ثبت پرداخت
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[90] p-4">
          <div className="w-full max-w-md">
            <div className="glass-card p-6 rounded-2xl shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-200">ثبت پرداخت قسط</h3>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">مبلغ پرداخت (ریال)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="auth-input-field"
                    placeholder="مبلغ پرداخت"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-2">تاریخ پرداخت</label>
                  <PersianDatePicker
                    value={paymentDate}
                    onChange={setPaymentDate}
                    placeholder="تاریخ پرداخت را انتخاب کنید"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-2">یادداشت (اختیاری)</label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="auth-input-field"
                    rows={3}
                    placeholder="یادداشت در مورد پرداخت"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handlePaymentSubmit}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    ثبت پرداخت
                  </button>
                  <button
                    onClick={() => setShowPaymentForm(false)}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    انصراف
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
