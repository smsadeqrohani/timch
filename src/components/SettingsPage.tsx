import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toPersianNumbers } from '../lib/utils';

// Helper function to convert Persian numbers to English
const toEnglishNumbers = (value: string): string => {
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return value.replace(/[۰-۹]/g, (match) => persianNumbers.indexOf(match).toString());
};

export const SettingsPage: React.FC = () => {
  const [annualRate, setAnnualRate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get current default annual rate
  const currentRate = useQuery(api.settings.getDefaultAnnualRate);
  
  // Mutations
  const updateAnnualRate = useMutation(api.settings.updateDefaultAnnualRate);
  const initializeSettings = useMutation(api.settings.initializeDefaultSettings);

  // Initialize settings and set current rate when component mounts
  useEffect(() => {
    const initializeAndSetRate = async () => {
      try {
        await initializeSettings();
        if (currentRate !== undefined) {
          setAnnualRate(currentRate.toString());
        }
      } catch (error) {
        console.error('Error initializing settings:', error);
      }
    };

    initializeAndSetRate();
  }, [currentRate, initializeSettings]);

  // Update local state when current rate changes
  useEffect(() => {
    if (currentRate !== undefined) {
      setAnnualRate(currentRate.toString());
    }
  }, [currentRate]);

  const handleSave = async () => {
    if (!annualRate.trim()) {
      setMessage({ type: 'error', text: 'لطفاً نرخ سود را وارد کنید' });
      return;
    }

    const englishValue = toEnglishNumbers(annualRate);
    const rateValue = parseFloat(englishValue);

    if (isNaN(rateValue) || rateValue < 0) {
      setMessage({ type: 'error', text: 'نرخ سود باید عددی مثبت باشد' });
      return;
    }

    if (rateValue > 1000) {
      setMessage({ type: 'error', text: 'نرخ سود نمی‌تواند بیشتر از ۱۰۰۰ درصد باشد' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await updateAnnualRate({ rate: rateValue });
      setMessage({ type: 'success', text: 'تنظیمات با موفقیت ذخیره شد' });
    } catch (error) {
      console.error('Error updating annual rate:', error);
      setMessage({ type: 'error', text: 'خطا در ذخیره تنظیمات' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (currentRate !== undefined) {
      setAnnualRate(currentRate.toString());
      setMessage(null);
    }
  };

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6 no-print page-header">
        <h1 className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent from-blue-400 to-purple-400 mb-2">
          تنظیمات سیستم
        </h1>
        <p className="text-gray-400">مدیریت تنظیمات عمومی سیستم</p>
      </div>

      {/* Settings Form */}
      <div className="glass-card p-8 rounded-2xl shadow-xl mb-8 no-print shadow-gray-900/50">
        <h2 className="text-lg font-semibold mb-6 text-gray-200">
          تنظیمات محاسبه اقساط
        </h2>
        
        <div className="space-y-6">
          {/* Annual Rate Setting */}
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
            <div className="flex items-center mb-4">
              <span className="text-2xl ml-3">📊</span>
              <div>
                <h3 className="text-lg font-medium text-gray-200">نرخ سود سالانه پیش‌فرض</h3>
                <p className="text-sm text-gray-400">این نرخ به عنوان پیش‌فرض در محاسبه گر اقساط استفاده می‌شود</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  نرخ سود سالانه (%)
                </label>
                <input
                  type="text"
                  value={toPersianNumbers(annualRate)}
                  onChange={(e) => {
                    const englishValue = toEnglishNumbers(e.target.value);
                    // Only allow numbers and decimal point
                    const cleanValue = englishValue.replace(/[^0-9.]/g, '');
                    setAnnualRate(cleanValue);
                  }}
                  className="auth-input-field"
                  placeholder="۳۶"
                />
              </div>
              
              <div className="flex items-end">
                <div className="flex space-x-2 space-x-reverse w-full">
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex-1 auth-button disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'در حال ذخیره...' : 'ذخیره'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 btn-secondary"
                  >
                    بازگردانی
                  </button>
                </div>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`mt-4 p-3 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-900/30 border border-green-700/50 text-green-200' 
                  : 'bg-red-900/30 border border-red-700/50 text-red-200'
              }`}>
                {message.text}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
