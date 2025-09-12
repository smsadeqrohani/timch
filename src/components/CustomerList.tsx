import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { CustomerForm } from './CustomerForm';
import { toPersianNumbers } from '../lib/utils';

export const CustomerList: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  const customers = useQuery(api.customers.list);
  const deleteCustomer = useMutation(api.customers.remove);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`آیا از حذف مشتری "${name}" اطمینان دارید؟`)) {
      try {
        await deleteCustomer({ id: id as any });
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('خطا در حذف مشتری');
      }
    }
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

  // Show loading state while data is being fetched
  if (customers === undefined) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent from-blue-400 to-purple-400 mb-2">
            مدیریت مشتریان
          </h1>
          <p className="text-gray-400">مدیریت و کنترل اطلاعات مشتریان سیستم</p>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent border-blue-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent from-blue-400 to-purple-400 mb-2">
          مدیریت مشتریان
        </h1>
        <p className="text-gray-400">مدیریت و کنترل اطلاعات مشتریان سیستم</p>
      </div>

      {/* Add Customer Section */}
      <div className="glass-card p-6 rounded-2xl shadow-xl mb-6 shadow-gray-900/50">
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="auth-button px-6 py-3"
          >
            افزودن مشتری جدید
          </button>
        </div>
      </div>

      {/* Add/Edit Customer Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass-card p-8 rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CustomerForm
              initialData={editingCustomer}
              isEdit={!!editingCustomer}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="glass-card p-6 rounded-2xl shadow-xl shadow-gray-900/50">
        <h2 className="text-lg font-semibold mb-4 text-gray-200">
          لیست مشتریان ({customers.length})
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-700">
                <th className="border px-4 py-3 text-right border-gray-600 text-gray-200">نام مشتری</th>
                <th className="border px-4 py-3 text-right border-gray-600 text-gray-200">شماره موبایل</th>
                <th className="border px-4 py-3 text-right border-gray-600 text-gray-200">کد ملی</th>
                <th className="border px-4 py-3 text-right border-gray-600 text-gray-200">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, index) => (
                <tr key={customer._id} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}>
                  <td className="border px-4 py-3 text-right border-gray-600 text-gray-200">
                    {customer.name}
                  </td>
                  <td className="border px-4 py-3 text-center border-gray-600 text-gray-200">
                    {toPersianNumbers(customer.mobile)}
                  </td>
                  <td className="border px-4 py-3 text-center border-gray-600 text-gray-200">
                    {customer.nationalCode ? toPersianNumbers(customer.nationalCode) : '-'}
                  </td>
                  <td className="border px-4 py-3 text-center border-gray-600 text-gray-200">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        ویرایش
                      </button>
                      <button
                        onClick={() => handleDelete(customer._id, customer.name)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {customers.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            هیچ مشتری ثبت نشده است
          </div>
        )}
      </div>
    </div>
  );
};
