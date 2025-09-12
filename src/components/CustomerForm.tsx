import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toPersianNumbers, toEnglishNumbers } from '../lib/utils';

interface CustomerFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: {
    id: string;
    name: string;
    mobile: string;
    nationalCode?: string;
  };
  isEdit?: boolean;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  onSuccess,
  onCancel,
  initialData,
  isEdit = false
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    mobile: initialData?.mobile ? toPersianNumbers(initialData.mobile) : '',
    nationalCode: initialData?.nationalCode ? toPersianNumbers(initialData.nationalCode) : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createCustomer = useMutation(api.customers.create);
  const updateCustomer = useMutation(api.customers.update);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'نام الزامی است';
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = 'شماره موبایل الزامی است';
    } else {
      const englishMobile = toEnglishNumbers(formData.mobile);
      if (!englishMobile.match(/^09\d{9}$/)) {
        newErrors.mobile = 'شماره موبایل باید 11 رقم باشد و با 09 شروع شود';
      }
    }

    // National code is optional, but if provided, must be 10 digits
    if (formData.nationalCode.trim()) {
      const englishNationalCode = toEnglishNumbers(formData.nationalCode);
      if (!englishNationalCode.match(/^\d{10}$/)) {
        newErrors.nationalCode = 'کد ملی باید 10 رقم باشد';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (isEdit && initialData) {
        await updateCustomer({
          id: initialData.id as any,
          name: formData.name,
          mobile: toEnglishNumbers(formData.mobile),
          nationalCode: formData.nationalCode.trim() ? toEnglishNumbers(formData.nationalCode) : undefined,
        });
      } else {
        await createCustomer({
          name: formData.name,
          mobile: toEnglishNumbers(formData.mobile),
          nationalCode: formData.nationalCode.trim() ? toEnglishNumbers(formData.nationalCode) : undefined,
        });
      }
      
      setFormData({ name: '', mobile: '', nationalCode: '' });
      setErrors({});
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      // Handle specific error messages from Convex
      if (error.message) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'خطا در ذخیره اطلاعات' });
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6 text-gray-200">
        {isEdit ? 'ویرایش مشتری' : 'افزودن مشتری جدید'}
      </h3>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            نام مشتری *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`auth-input-field ${errors.name ? 'border-red-500' : ''}`}
            placeholder="نام و نام خانوادگی"
            dir="rtl"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            شماره موبایل *
          </label>
          <input
            type="tel"
            value={formData.mobile}
            onChange={(e) => handleInputChange('mobile', e.target.value)}
            className={`auth-input-field ${errors.mobile ? 'border-red-500' : ''}`}
            placeholder="09123456789"
            maxLength={11}
            dir="ltr"
          />
          {errors.mobile && (
            <p className="mt-1 text-sm text-red-500">{errors.mobile}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            کد ملی (اختیاری)
          </label>
          <input
            type="text"
            value={formData.nationalCode}
            onChange={(e) => handleInputChange('nationalCode', e.target.value)}
            className={`auth-input-field ${errors.nationalCode ? 'border-red-500' : ''}`}
            placeholder="1234567890"
            maxLength={10}
            dir="ltr"
          />
          {errors.nationalCode && (
            <p className="mt-1 text-sm text-red-500">{errors.nationalCode}</p>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="auth-button flex-1"
          >
            {isEdit ? 'ویرایش' : 'ذخیره'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary flex-1"
            >
              انصراف
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
