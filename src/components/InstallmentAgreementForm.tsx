import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { formatJalaliDate, getCurrentJalaliDate } from '../utils/dateUtils';

interface InstallmentAgreementFormProps {
  orderId: Id<"orders">;
  totalAmount: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function InstallmentAgreementForm({ 
  orderId, 
  totalAmount, 
  onSuccess, 
  onCancel 
}: InstallmentAgreementFormProps) {
  const [formData, setFormData] = useState({
    downPayment: 0,
    numberOfInstallments: 12,
    guaranteeType: 'cheque' as 'cheque' | 'gold',
    agreementDate: formatJalaliDate(getCurrentJalaliDate()),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Get default annual rate from settings
  const defaultAnnualRate = useQuery(api.settings.getDefaultAnnualRate);
  const currentUser = useQuery(api.auth.loggedInUser);

  // Mutations
  const createInstallmentAgreement = useMutation(api.orders.createInstallmentAgreement);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.downPayment <= 0) {
      newErrors.downPayment = 'پیش‌پرداخت باید بیشتر از صفر باشد';
    }

    if (formData.downPayment >= totalAmount) {
      newErrors.downPayment = 'پیش‌پرداخت نمی‌تواند بیشتر یا مساوی مبلغ کل باشد';
    }

    if (formData.numberOfInstallments < 1) {
      newErrors.numberOfInstallments = 'تعداد اقساط باید حداقل 1 باشد';
    }

    if (formData.numberOfInstallments > 60) {
      newErrors.numberOfInstallments = 'تعداد اقساط نمی‌تواند بیشتر از 60 باشد';
    }

    if (!formData.guaranteeType) {
      newErrors.guaranteeType = 'نوع ضمانت را انتخاب کنید';
    }

    if (!formData.agreementDate) {
      newErrors.agreementDate = 'تاریخ قرارداد را وارد کنید';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateInstallments = () => {
    // Basic validation without setting errors (to avoid re-renders)
    if (formData.downPayment <= 0 || formData.numberOfInstallments < 1 || !defaultAnnualRate) {
      return null;
    }

    const principalAmount = totalAmount - formData.downPayment;
    if (principalAmount <= 0) {
      return null;
    }

    const monthlyRate = defaultAnnualRate / 12 / 100;
    let installmentAmount: number;
    
    if (monthlyRate === 0) {
      installmentAmount = principalAmount / formData.numberOfInstallments;
    } else {
      const numerator = principalAmount * monthlyRate * Math.pow(1 + monthlyRate, formData.numberOfInstallments);
      const denominator = Math.pow(1 + monthlyRate, formData.numberOfInstallments) - 1;
      installmentAmount = numerator / denominator;
    }
    
    // Round to nearest 100,000 Rials
    installmentAmount = Math.round(installmentAmount / 100000) * 100000;
    
    const totalPayment = installmentAmount * formData.numberOfInstallments;
    const totalInterest = totalPayment - principalAmount;

    return {
      principalAmount,
      installmentAmount,
      totalPayment,
      totalInterest,
      monthlyRate: monthlyRate * 100,
    };
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    if (!currentUser) {
      setErrors({ general: 'کاربر وارد نشده است' });
      return;
    }

    if (defaultAnnualRate === undefined) {
      setErrors({ general: 'در حال بارگذاری تنظیمات...' });
      return;
    }

    if (!calculation) {
      setErrors({ general: 'محاسبه اقساط امکان‌پذیر نیست' });
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    if (!currentUser || !defaultAnnualRate || !calculation) {
      return;
    }

    setIsCalculating(true);
    setErrors({});

    try {
      await createInstallmentAgreement({
        orderId,
        totalAmount: totalAmount,
        downPayment: formData.downPayment,
        numberOfInstallments: formData.numberOfInstallments,
        annualRate: defaultAnnualRate,
        guaranteeType: formData.guaranteeType,
        agreementDate: formData.agreementDate,
        createdBy: currentUser._id,
      });

      setShowConfirmation(false);
      onSuccess?.();
    } catch (error: any) {
      setErrors({ general: error.message || 'خطا در ایجاد قرارداد اقساط' });
    } finally {
      setIsCalculating(false);
    }
  };

  const calculation = React.useMemo(() => calculateInstallments(), [
    formData.downPayment,
    formData.numberOfInstallments,
    defaultAnnualRate,
    totalAmount
  ]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="glass-card p-6 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-200">ایجاد قرارداد اقساط</h2>
        
        {errors.general && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.general}
          </div>
        )}

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">خلاصه سفارش</h3>
            <div className="text-2xl font-bold text-gray-200">
              مبلغ کل: {totalAmount.toLocaleString('fa-IR')} ریال
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                پیش‌پرداخت (ریال) *
              </label>
              <input
                type="number"
                value={formData.downPayment}
                onChange={(e) => setFormData({ ...formData, downPayment: parseInt(e.target.value) || 0 })}
                className="auth-input-field"
                placeholder="مبلغ پیش‌پرداخت"
                dir="ltr"
              />
              {errors.downPayment && (
                <p className="mt-1 text-sm text-red-400">{errors.downPayment}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                تعداد اقساط *
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={formData.numberOfInstallments}
                onChange={(e) => setFormData({ ...formData, numberOfInstallments: parseInt(e.target.value) || 1 })}
                className="auth-input-field"
                placeholder="تعداد اقساط"
                dir="ltr"
              />
              {errors.numberOfInstallments && (
                <p className="mt-1 text-sm text-red-400">{errors.numberOfInstallments}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                نوع ضمانت *
              </label>
              <select
                value={formData.guaranteeType}
                onChange={(e) => setFormData({ ...formData, guaranteeType: e.target.value as 'cheque' | 'gold' })}
                className="auth-input-field"
              >
                <option value="cheque">چک</option>
                <option value="gold">طلا</option>
              </select>
              {errors.guaranteeType && (
                <p className="mt-1 text-sm text-red-400">{errors.guaranteeType}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                تاریخ قرارداد *
              </label>
              <input
                type="text"
                value={formData.agreementDate}
                onChange={(e) => setFormData({ ...formData, agreementDate: e.target.value })}
                className="auth-input-field"
                placeholder="1403/01/01"
                dir="ltr"
              />
              {errors.agreementDate && (
                <p className="mt-1 text-sm text-red-400">{errors.agreementDate}</p>
              )}
            </div>
          </div>

          {/* Calculation Preview */}
          {calculation && (
            <div className="p-6 bg-green-900/20 border border-green-500/30 rounded-lg">
              <h3 className="text-lg font-semibold text-green-400 mb-4">پیش‌نمایش محاسبه اقساط</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">مبلغ کل:</span>
                    <span className="text-gray-200 font-medium">{totalAmount.toLocaleString('fa-IR')} ریال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">پیش‌پرداخت:</span>
                    <span className="text-gray-200 font-medium">{formData.downPayment.toLocaleString('fa-IR')} ریال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">مبلغ اقساطی:</span>
                    <span className="text-gray-200 font-medium">{calculation.principalAmount.toLocaleString('fa-IR')} ریال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">تعداد اقساط:</span>
                    <span className="text-gray-200 font-medium">{formData.numberOfInstallments} قسط</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">مبلغ هر قسط:</span>
                    <span className="text-green-400 font-bold">{calculation.installmentAmount.toLocaleString('fa-IR')} ریال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">کل سود:</span>
                    <span className="text-gray-200 font-medium">{calculation.totalInterest.toLocaleString('fa-IR')} ریال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">کل پرداختی:</span>
                    <span className="text-gray-200 font-medium">{calculation.totalPayment.toLocaleString('fa-IR')} ریال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">نرخ سود سالانه:</span>
                    <span className="text-gray-200 font-medium">{defaultAnnualRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary px-6 py-2"
            >
              لغو
            </button>
            <button
              onClick={handleSubmit}
              disabled={isCalculating || !calculation}
              className="auth-button px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCalculating ? 'در حال ایجاد...' : 'ایجاد قرارداد اقساط'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && calculation && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[80] p-4">
          <div className="w-full max-w-2xl">
            <div className="glass-card p-6 rounded-2xl shadow-xl">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">تایید قرارداد اقساط</h3>
              
              <div className="space-y-6">
                {/* Agreement Summary */}
                <div className="border border-gray-600 rounded-lg p-4 bg-gray-800/30">
                  <h4 className="text-lg font-semibold mb-3 text-gray-200">خلاصه قرارداد</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">مبلغ کل:</span>
                        <span className="text-gray-200 font-medium">{totalAmount.toLocaleString('fa-IR')} ریال</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">پیش‌پرداخت:</span>
                        <span className="text-gray-200 font-medium">{formData.downPayment.toLocaleString('fa-IR')} ریال</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">مبلغ اقساطی:</span>
                        <span className="text-gray-200 font-medium">{calculation.principalAmount.toLocaleString('fa-IR')} ریال</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">تعداد اقساط:</span>
                        <span className="text-gray-200 font-medium">{formData.numberOfInstallments} قسط</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">مبلغ هر قسط:</span>
                        <span className="text-green-400 font-bold">{calculation.installmentAmount.toLocaleString('fa-IR')} ریال</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">کل سود:</span>
                        <span className="text-gray-200 font-medium">{calculation.totalInterest.toLocaleString('fa-IR')} ریال</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">کل پرداختی:</span>
                        <span className="text-gray-200 font-medium">{calculation.totalPayment.toLocaleString('fa-IR')} ریال</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">نوع ضمانت:</span>
                        <span className="text-gray-200 font-medium">{formData.guaranteeType === 'cheque' ? 'چک' : 'طلا'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-yellow-400 font-medium">آیا از ایجاد این قرارداد اقساط اطمینان دارید؟</p>
                      <p className="text-yellow-300 text-sm mt-1">
                        پس از تایید، قرارداد اقساط ایجاد شده و سفارش به وضعیت "تایید شده" تغییر خواهد کرد.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="btn-secondary px-6 py-2"
                    disabled={isCalculating}
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleConfirmSubmit}
                    disabled={isCalculating}
                    className="auth-button px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCalculating ? 'در حال ایجاد...' : 'بله، ایجاد قرارداد اقساط'}
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
