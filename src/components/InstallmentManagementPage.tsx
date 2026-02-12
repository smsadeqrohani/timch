import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useNavigate } from 'react-router-dom';
import { ensureJalaliDisplay, getDisplayDueDateForInstallment } from '../utils/dateUtils';

interface InstallmentManagementPageProps {
  agreementId: Id<"installmentAgreements">;
}

export default function InstallmentManagementPage({ agreementId }: InstallmentManagementPageProps) {
  const navigate = useNavigate();
  const [selectedInstallments, setSelectedInstallments] = useState<Id<"installments">[]>([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Queries
  const agreementData = useQuery(api.installmentAgreements.getWithInstallments, { id: agreementId });
  const currentUser = useQuery(api.auth.loggedInUser);

  // Mutations
  const markInstallmentPaid = useMutation(api.installmentAgreements.markInstallmentPaid);

  const handleInstallmentSelect = (installmentId: Id<"installments">) => {
    setSelectedInstallments(prev => 
      prev.includes(installmentId) 
        ? prev.filter(id => id !== installmentId)
        : [...prev, installmentId]
    );
  };

  const handleMarkAsPaid = () => {
    if (selectedInstallments.length === 0) {
      setErrors({ general: 'لطفاً حداقل یک قسط را انتخاب کنید' });
      return;
    }
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (selectedInstallments.length === 0 || !currentUser) {
      return;
    }

    try {
      for (const installmentId of selectedInstallments) {
        await markInstallmentPaid({
          installmentId,
          paidBy: currentUser._id,
          notes: notes.trim() || undefined,
        });
      }

      setSelectedInstallments([]);
      setNotes('');
      setErrors({});
      setShowPaymentModal(false);
    } catch (error: any) {
      setErrors({ general: error.message || 'خطا در ثبت پرداخت' });
    }
  };

  const handleBackToOrders = () => {
    navigate('/orders');
  };

  if (!agreementData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent border-blue-400"></div>
      </div>
    );
  }

  const { agreement, installments } = agreementData;

  // Calculate statistics
  const paidInstallments = installments.filter(i => i.status === 'پرداخت شده').length;
  const pendingInstallments = installments.filter(i => i.status === 'در انتظار پرداخت').length;
  const overdueInstallments = installments.filter(i => i.status === 'سررسید گذشته').length;
  const totalPaid = installments
    .filter(i => i.status === 'پرداخت شده')
    .reduce((sum, i) => sum + i.installmentAmount, 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="glass-card p-6 rounded-2xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-200">مدیریت اقساط</h2>
          <button
            onClick={handleBackToOrders}
            className="btn-secondary"
          >
            ← بازگشت به سفارشات
          </button>
        </div>
        
        {errors.general && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.general}
          </div>
        )}

        <div className="space-y-6">
          {/* Agreement Summary */}
          <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">خلاصه قرارداد اقساط</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-300">مبلغ کل:</span>
                <span className="text-gray-200 mr-2">{agreement.totalAmount.toLocaleString('fa-IR')} ریال</span>
              </div>
              <div>
                <span className="text-gray-300">تعداد اقساط:</span>
                <span className="text-gray-200 mr-2">{agreement.numberOfInstallments} قسط</span>
              </div>
              <div>
                <span className="text-gray-300">مبلغ هر قسط:</span>
                <span className="text-green-400 font-bold mr-2">{agreement.installmentAmount.toLocaleString('fa-IR')} ریال</span>
              </div>
              <div>
                <span className="text-gray-300">نوع ضمانت:</span>
                <span className="text-gray-200 mr-2">{agreement.guaranteeType === 'cheque' ? 'چک' : 'طلا'}</span>
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
              <div className="text-2xl font-bold text-blue-400">{totalPaid.toLocaleString('fa-IR')}</div>
              <div className="text-sm text-blue-300">کل پرداخت شده</div>
            </div>
          </div>

          {/* Installments List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-200">لیست اقساط</h3>
              {selectedInstallments.length > 0 && (
                <button
                  onClick={handleMarkAsPaid}
                  className="auth-button px-4 py-2"
                >
                  ثبت پرداخت ({selectedInstallments.length} قسط)
                </button>
              )}
            </div>
            
            <div className="space-y-2">
              {installments.map((installment) => (
                <div 
                  key={installment._id} 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    installment.status === 'پرداخت شده'
                      ? 'border-green-500/30 bg-green-900/20'
                      : selectedInstallments.includes(installment._id)
                      ? 'border-blue-500/50 bg-blue-900/30'
                      : 'border-gray-600 bg-gray-800/30 hover:bg-gray-700/30'
                  }`}
                  onClick={() => {
                    if (installment.status !== 'پرداخت شده') {
                      handleInstallmentSelect(installment._id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedInstallments.includes(installment._id)}
                        onChange={() => {
                          if (installment.status !== 'پرداخت شده') {
                            handleInstallmentSelect(installment._id);
                          }
                        }}
                        disabled={installment.status === 'پرداخت شده'}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-200">
                          قسط {installment.installmentNumber}
                        </div>
                        <div className="text-sm text-gray-400">
                          سررسید: {ensureJalaliDisplay(getDisplayDueDateForInstallment(agreement.agreementDate, installment))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm text-gray-500">مبلغ</div>
                        <div className="font-bold text-gray-200">
                          {installment.installmentAmount.toLocaleString('fa-IR')} ریال
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-500">وضعیت</div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          installment.status === 'پرداخت شده' 
                            ? 'bg-green-600 text-white' 
                            : installment.status === 'سررسید گذشته'
                            ? 'bg-red-600 text-white'
                            : 'bg-orange-600 text-white'
                        }`}>
                          {installment.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  {installment.status === 'پرداخت شده' && installment.paidAt && (
                    <div className="mt-2 text-xs text-green-400">
                      پرداخت شده در: {new Date(installment.paidAt).toLocaleDateString('fa-IR')}
                      {installment.notes && (
                        <span className="mr-2"> | یادداشت: {installment.notes}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[80] p-4">
          <div className="w-full max-w-md">
            <div className="glass-card p-6 rounded-2xl shadow-xl">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">تایید پرداخت اقساط</h3>
              
              <div className="space-y-4">
                <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-400 text-sm">
                    {selectedInstallments.length} قسط برای پرداخت انتخاب شده است.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    یادداشت پرداخت (اختیاری)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="یادداشت‌های مربوط به پرداخت..."
                    rows={3}
                    className="auth-input-field"
                    dir="rtl"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setNotes('');
                    }}
                    className="btn-secondary"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    className="auth-button"
                  >
                    تایید پرداخت
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
