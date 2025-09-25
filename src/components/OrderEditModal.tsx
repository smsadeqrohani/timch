import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface OrderEditModalProps {
  orderId: Id<"orders">;
  orderItems: Array<{
    _id: Id<"orderItems">;
    productId: Id<"products">;
    sizeX: number;
    sizeY: number;
    quantity: number;
  }>;
  notes?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OrderEditModal({
  orderId,
  orderItems,
  notes,
  isOpen,
  onClose,
  onSuccess,
}: OrderEditModalProps) {
  const [editedItems, setEditedItems] = useState(orderItems);
  const [editedNotes, setEditedNotes] = useState(notes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateOrder = useMutation(api.orders.update);

  useEffect(() => {
    if (isOpen) {
      setEditedItems(orderItems);
      setEditedNotes(notes || '');
      setErrors({});
    }
  }, [isOpen, orderItems, notes]);

  const handleUpdateItem = (index: number, field: 'sizeX' | 'sizeY' | 'quantity', value: number) => {
    const newItems = [...editedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditedItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    if (editedItems.length <= 1) {
      setErrors({ general: 'حداقل یک آیتم باید وجود داشته باشد' });
      return;
    }
    const newItems = editedItems.filter((_, i) => i !== index);
    setEditedItems(newItems);
  };

  const handleSubmit = async () => {
    try {
      setErrors({});

      // Validate items
      for (let i = 0; i < editedItems.length; i++) {
        const item = editedItems[i];
        if (item.sizeX <= 0 || item.sizeY <= 0 || item.quantity <= 0) {
          setErrors({ general: `آیتم ${i + 1}: ابعاد و تعداد باید بزرگتر از صفر باشد` });
          return;
        }
      }

      await updateOrder({
        id: orderId,
        notes: editedNotes.trim() || undefined,
        items: editedItems.map(item => ({
          productId: item.productId,
          sizeX: item.sizeX,
          sizeY: item.sizeY,
          quantity: item.quantity,
        })),
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      setErrors({ general: error.message || 'خطا در به‌روزرسانی سفارش' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[70] p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="glass-card p-6 rounded-2xl shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-200">ویرایش سفارش</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {errors.general && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 text-red-400 rounded">
              {errors.general}
            </div>
          )}

          <div className="space-y-6">
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                یادداشت
              </label>
              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="یادداشت سفارش..."
                className="auth-input-field min-h-[100px]"
                dir="rtl"
              />
            </div>

            {/* Order Items */}
            <div>
              <h4 className="text-lg font-semibold mb-3 text-gray-200">آیتم‌های سفارش</h4>
              <div className="space-y-4">
                {editedItems.map((item, index) => (
                  <div key={item._id} className="p-4 border border-gray-600 rounded-lg bg-gray-800/30">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-medium text-gray-200">آیتم {index + 1}</h5>
                      {editedItems.length > 1 && (
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          طول (X)
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.sizeX}
                          onChange={(e) => handleUpdateItem(index, 'sizeX', parseFloat(e.target.value) || 0)}
                          className="auth-input-field"
                          dir="ltr"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          عرض (Y)
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.sizeY}
                          onChange={(e) => handleUpdateItem(index, 'sizeY', parseFloat(e.target.value) || 0)}
                          className="auth-input-field"
                          dir="ltr"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          تعداد
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="auth-input-field"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                انصراف
              </button>
              <button
                onClick={handleSubmit}
                className="auth-button"
              >
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
