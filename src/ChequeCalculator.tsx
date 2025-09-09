import React, { useState, useEffect } from 'react';
import { PersianDatePicker } from './components/PersianDatePicker';
import { calculateInstallments, formatCurrency, CalculationResult } from './utils/calculationUtils';
import { getCurrentJalaliDate, formatJalaliDate, getInstallmentDate, parseJalaliDate, isValidJalaliDate, formatJalaliDateWithPersianNumbers } from './utils/dateUtils';
import { useDarkMode } from './hooks/useDarkMode';

interface FormData {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  guaranteeType: 'cheque' | 'gold' | '';
  totalAmount: number;
  downPayment: number;
  numberOfInstallments: number;
  annualRate: number;
}

// Helper function to convert English numbers to Persian
const toPersianNumbers = (value: string): string => {
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return value.replace(/[0-9]/g, (match) => persianNumbers[parseInt(match)]);
};

// Helper function to format numbers with Persian numerals and commas
const formatPersianNumber = (value: number): string => {
  if (value === 0) return '';
  return toPersianNumbers(value.toLocaleString('en-US'));
};

// Helper function to convert Persian numbers to English
const toEnglishNumbers = (value: string): string => {
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return value.replace(/[۰-۹]/g, (match) => persianNumbers.indexOf(match).toString());
};

// Helper function to remove all non-digit characters except commas
const cleanNumberInput = (value: string): string => {
  // First convert Persian numbers to English
  const englishValue = toEnglishNumbers(value);
  // Then remove everything except digits and commas
  return englishValue.replace(/[^0-9,]/g, '');
};

export const ChequeCalculator: React.FC = () => {
  const { isDark } = useDarkMode();
  const [formData, setFormData] = useState<FormData>({
    invoiceNumber: '',
    invoiceDate: '',
    customerName: '',
    guaranteeType: '' as 'cheque' | 'gold',
    totalAmount: 0,
    downPayment: 0,
    numberOfInstallments: 12,
    annualRate: 36
  });

  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Set current date on mount
  useEffect(() => {
    if (!formData.invoiceDate) {
      setFormData(prev => ({
        ...prev,
        invoiceDate: formatJalaliDate(getCurrentJalaliDate())
      }));
    }
  }, [formData.invoiceDate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'شماره فاکتور الزامی است';
    }

    if (!formData.invoiceDate.trim()) {
      newErrors.invoiceDate = 'تاریخ فاکتور الزامی است';
    } else if (!isValidJalaliDate(formData.invoiceDate)) {
      newErrors.invoiceDate = 'تاریخ فاکتور نامعتبر است';
    }

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'نام خریدار الزامی است';
    }

    if (formData.totalAmount <= 0) {
      newErrors.totalAmount = 'مبلغ کل باید بزرگتر از صفر باشد';
    }

    if (formData.downPayment < 0) {
      newErrors.downPayment = 'پیش‌پرداخت نمی‌تواند منفی باشد';
    }

    if (formData.downPayment > formData.totalAmount) {
      newErrors.downPayment = 'پیش‌پرداخت نمی‌تواند بیشتر از مبلغ کل باشد';
    }

    if (formData.numberOfInstallments < 1) {
      newErrors.numberOfInstallments = 'تعداد اقساط باید حداقل ۱ باشد';
    }

    if (formData.numberOfInstallments > 60) {
      newErrors.numberOfInstallments = 'تعداد اقساط نمی‌تواند بیشتر از ۶۰ باشد';
    }

    if (formData.annualRate < 0) {
      newErrors.annualRate = 'نرخ سود نمی‌تواند منفی باشد';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCalculate = () => {
    if (!validateForm()) {
      return;
    }

    const principalAmount = formData.totalAmount - formData.downPayment;
    if (principalAmount <= 0) {
      setErrors({ downPayment: 'پیش‌پرداخت برابر یا بیشتر از مبلغ کل است. اقساطی وجود نخواهد داشت.' });
      return;
    }

    const result = calculateInstallments(
      formData.invoiceNumber,
      formData.customerName,
      formData.invoiceDate,
      formData.totalAmount,
      formData.downPayment,
      formData.numberOfInstallments,
      formData.annualRate
    );

    if (result) {
      // Add due dates to installments
      const invoiceDate = parseJalaliDate(formData.invoiceDate);
      if (invoiceDate) {
        result.installments = result.installments.map((installment, index) => ({
          ...installment,
          dueDate: formatJalaliDate(getInstallmentDate(invoiceDate, index + 1))
        }));
      }
      
      setCalculationResult(result);
    }
  };

  const handleReset = () => {
    setFormData({
      invoiceNumber: '',
      invoiceDate: formatJalaliDate(getCurrentJalaliDate()),
      customerName: '',
      guaranteeType: '' as 'cheque' | 'gold',
      totalAmount: 0,
      downPayment: 0,
      numberOfInstallments: 12,
      annualRate: 36
    });
    setCalculationResult(null);
    setErrors({});
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyToClipboard = () => {
    if (!calculationResult) return;

    const csvContent = [
      ['شماره قسط', 'تاریخ سررسید', 'مبلغ قسط', 'سود', 'اصل', 'مانده'],
      ...calculationResult.installments.map(installment => [
        installment.installmentNumber,
        installment.dueDate,
        installment.installmentAmount,
        installment.interestAmount,
        installment.principalAmount,
        installment.remainingBalance
      ])
    ].map(row => row.join(',')).join('\n');

    navigator.clipboard.writeText(csvContent).then(() => {
      alert('اطلاعات در کلیپ‌بورد کپی شد');
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Form Section - Full Width */}
      <div className={`glass-card p-8 rounded-2xl shadow-xl mb-8 no-print ${
        isDark ? 'shadow-gray-900/50' : 'shadow-gray-200/50'
      }`}>
        <h2 className={`text-lg font-semibold mb-6 ${
          isDark ? 'text-gray-200' : 'text-gray-800'
        }`}>
          اطلاعات فاکتور
        </h2>
        
        <form className="space-y-6">
          {/* First Row: Date, Invoice Number, Customer Name, Guarantee Type */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <PersianDatePicker
              value={formData.invoiceDate}
              onChange={(date) => {
                console.log('App received date:', date);
                setFormData({ ...formData, invoiceDate: date });
              }}
              label="تاریخ فاکتور"
            />
            {errors.invoiceDate && (
              <p className="text-red-500 text-sm mt-1">{errors.invoiceDate}</p>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                شماره فاکتور
              </label>
              <input
                type="text"
                value={toPersianNumbers(formData.invoiceNumber)}
                onChange={(e) => {
                  const englishValue = toEnglishNumbers(e.target.value);
                  setFormData({ ...formData, invoiceNumber: englishValue });
                }}
                className="auth-input-field"
                placeholder="مثال: ۱۲۳۴"
                maxLength={4}
              />
              {errors.invoiceNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.invoiceNumber}</p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                نام خریدار
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="auth-input-field"
                placeholder="نام کامل خریدار"
              />
              {errors.customerName && (
                <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                نوع ضمانت
              </label>
              <select
                value={formData.guaranteeType}
                onChange={(e) => setFormData({ ...formData, guaranteeType: e.target.value as 'cheque' | 'gold' })}
                className="auth-input-field appearance-none bg-no-repeat bg-right pr-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundSize: '1.5em 1.5em',
                  backgroundPosition: 'right 0.5rem center'
                }}
              >
                <option value="" disabled>انتخاب کنید</option>
                <option value="cheque">چک</option>
                <option value="gold">طلا</option>
              </select>
            </div>
          </div>

          {/* Second Row: Total Amount, Down Payment, Number of Installments, Annual Rate */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                مبلغ کل فاکتور (ریال)
              </label>
              <input
                type="text"
                value={formatPersianNumber(formData.totalAmount)}
                onChange={(e) => {
                  // Clean the input and convert to number
                  const cleanValue = cleanNumberInput(e.target.value);
                  const numValue = cleanValue ? Number(cleanValue.replace(/,/g, '')) : 0;
                  setFormData({ ...formData, totalAmount: numValue });
                }}
                className="auth-input-field"
                placeholder="۰"
              />
              {errors.totalAmount && (
                <p className="text-red-500 text-sm mt-1">{errors.totalAmount}</p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                پیش‌پرداخت (ریال)
              </label>
              <input
                type="text"
                value={formatPersianNumber(formData.downPayment)}
                onChange={(e) => {
                  // Clean the input and convert to number
                  const cleanValue = cleanNumberInput(e.target.value);
                  const numValue = cleanValue ? Number(cleanValue.replace(/,/g, '')) : 0;
                  setFormData({ ...formData, downPayment: numValue });
                }}
                className="auth-input-field"
                placeholder="۰"
              />
              {errors.downPayment && (
                <p className="text-red-500 text-sm mt-1">{errors.downPayment}</p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                تعداد اقساط
              </label>
              <input
                type="text"
                value={toPersianNumbers(formData.numberOfInstallments.toString())}
                onChange={(e) => {
                  const englishValue = toEnglishNumbers(e.target.value);
                  const numValue = englishValue ? Number(englishValue) : 0;
                  setFormData({ ...formData, numberOfInstallments: numValue });
                }}
                className="auth-input-field"
              />
              {errors.numberOfInstallments && (
                <p className="text-red-500 text-sm mt-1">{errors.numberOfInstallments}</p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                نرخ سود سالانه (%)
              </label>
              <input
                type="text"
                value={toPersianNumbers(formData.annualRate.toString())}
                onChange={(e) => {
                  const englishValue = toEnglishNumbers(e.target.value);
                  const numValue = englishValue ? Number(englishValue) : 0;
                  setFormData({ ...formData, annualRate: numValue });
                }}
                className="auth-input-field"
                placeholder="۳۶"
              />
              {errors.annualRate && (
                <p className="text-red-500 text-sm mt-1">{errors.annualRate}</p>
              )}
            </div>
          </div>

          <div className="flex space-x-3 space-x-reverse pt-4">
            <button
              type="button"
              onClick={handleCalculate}
              className="flex-1 auth-button"
            >
              محاسبه
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 btn-secondary"
            >
              ریست
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {calculationResult && (
        <>
          {/* Summary Card */}
          <div className={`glass-card p-8 rounded-2xl shadow-xl mb-6 ${
            isDark ? 'shadow-gray-900/50' : 'shadow-gray-200/50'
          }`}>
            <h2 className={`text-lg font-semibold mb-4 ${
              isDark ? 'text-gray-200' : 'text-gray-800'
            }`}>
              خلاصه قرارداد
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>شماره فاکتور:</span>
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{toPersianNumbers(calculationResult.summary.invoiceNumber)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>نام خریدار:</span>
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{calculationResult.summary.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>تاریخ فاکتور:</span>
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{formatJalaliDateWithPersianNumbers(calculationResult.summary.invoiceDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>مبلغ کل:</span>
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{formatCurrency(calculationResult.summary.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>پیش‌پرداخت:</span>
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{formatCurrency(calculationResult.summary.downPayment)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>مانده برای اقساط:</span>
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{formatCurrency(calculationResult.summary.principalAmount)}</span>
                </div>

                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>تعداد اقساط:</span>
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{toPersianNumbers(calculationResult.summary.numberOfInstallments.toString())}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>جمع سود:</span>
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{formatCurrency(calculationResult.summary.totalInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>جمع کل پرداختی:</span>
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{formatCurrency(calculationResult.summary.totalPayment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>نوع ضمانت:</span>
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{formData.guaranteeType === 'cheque' ? 'چک' : formData.guaranteeType === 'gold' ? 'طلا' : '-'}</span>
                </div>

              </div>
            </div>
          </div>

          {/* Installments Table */}
          <div className={`glass-card p-8 rounded-2xl shadow-xl ${
            isDark ? 'shadow-gray-900/50' : 'shadow-gray-200/50'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-semibold ${
                isDark ? 'text-gray-200' : 'text-gray-800'
              }`}>
                جدول اقساط
              </h2>
              <div className="flex space-x-2 space-x-reverse no-print">
                <button
                  onClick={handleCopyToClipboard}
                  className="btn-secondary text-sm"
                >
                  کپی CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="auth-button text-sm"
                >
                  چاپ
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                    <th className={`border px-4 py-2 text-right ${
                      isDark ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-900'
                    }`}>شماره قسط</th>
                    <th className={`border px-4 py-2 text-right ${
                      isDark ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-900'
                    }`}>تاریخ سررسید</th>
                    <th className={`border px-4 py-2 text-right ${
                      isDark ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-900'
                    }`}>مبلغ قسط</th>
                  </tr>
                </thead>
                <tbody>
                  {calculationResult.installments.map((installment, index) => (
                    <tr key={installment.installmentNumber} className={index % 2 === 0 ? (isDark ? 'bg-gray-800' : 'bg-white') : (isDark ? 'bg-gray-700' : 'bg-gray-50')}>
                      <td className={`border px-4 py-2 text-center ${
                        isDark ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-900'
                      }`}>{toPersianNumbers(installment.installmentNumber.toString())}</td>
                      <td className={`border px-4 py-2 text-center ${
                        isDark ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-900'
                      }`}>{formatJalaliDateWithPersianNumbers(installment.dueDate)}</td>
                      <td className={`border px-4 py-2 text-left ${
                        isDark ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-900'
                      }`}>{formatCurrency(installment.installmentAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
