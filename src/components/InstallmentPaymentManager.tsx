import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { ensureJalaliDisplay, getDisplayDueDateForInstallment } from '../utils/dateUtils';

interface InstallmentPaymentManagerProps {
  agreementId: Id<"installmentAgreements">;
  onPaymentSuccess?: () => void;
}

export default function InstallmentPaymentManager({ 
  agreementId, 
  onPaymentSuccess 
}: InstallmentPaymentManagerProps) {
  const [selectedInstallments, setSelectedInstallments] = useState<Id<"installments">[]>([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleMarkAsPaid = async () => {
    if (selectedInstallments.length === 0) {
      setErrors({ general: 'لطفاً حداقل یک قسط را انتخاب کنید' });
      return;
    }

    if (!currentUser) {
      setErrors({ general: 'کاربر وارد نشده است' });
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
      onPaymentSuccess?.();
    } catch (error: any) {
      setErrors({ general: error.message || 'خطا در ثبت پرداخت' });
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="glass-card p-6 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-200">مدیریت پرداخت اقساط</h2>
        
        {errors.general && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.general}
          </div>
        )}

        <div className="space-y-6">
          {/* Agreement Summary */}
          <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">خلاصه قرارداد</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
            </div>
          </div>

          {/* Installments List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">لیست اقساط</h3>
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment Notes */}
          {selectedInstallments.length > 0 && (
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
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => {
                setSelectedInstallments([]);
                setNotes('');
                setErrors({});
              }}
              className="btn-secondary px-6 py-2"
            >
              پاک کردن انتخاب
            </button>
            <button
              onClick={handleMarkAsPaid}
              disabled={selectedInstallments.length === 0}
              className="auth-button px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ثبت پرداخت ({selectedInstallments.length} قسط)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
