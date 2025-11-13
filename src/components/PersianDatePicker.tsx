import React from 'react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

interface PersianDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
}

export const PersianDatePicker: React.FC<PersianDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'انتخاب تاریخ',
}) => {
  const handleDateChange = (dateObject: DateObject | null) => {
    if (!dateObject) {
      return;
    }

    const year = dateObject.year;
    const month = String(dateObject.month.number).padStart(2, '0');
    const day = String(dateObject.day).padStart(2, '0');
    const formattedDate = `${year}/${month}/${day}`;
    onChange(formattedDate);
  };

  const parsedValue = React.useMemo(() => {
    if (!value) return null;
    const parts = value.replace(/-/g, '/').split('/');
    if (parts.length !== 3) return null;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    return new DateObject({
      calendar: persian,
      locale: persian_fa,
      year,
      month,
      day,
    });
  }, [value]);

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <DatePicker
        value={parsedValue}
        onChange={handleDateChange}
        calendar={persian}
        locale={persian_fa}
        calendarPosition="bottom-right"
        format="YYYY/MM/DD"
        digits={["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]}
        placeholder={placeholder}
        inputClass="auth-input-field cursor-pointer text-right"
        containerClassName="w-full"
        className="auth-input-field cursor-pointer text-right"
        editable={false}
      />
    </div>
  );
};
