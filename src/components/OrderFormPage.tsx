import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useNavigate } from 'react-router-dom';

interface OrderItem {
  productId: Id<"products">;
  color: string;
  sizeX: number;
  sizeY: number;
  quantity: number;
}

interface ProductWithDetails {
  _id: Id<"products">;
  code: string;
  color: string;
  collectionId: Id<"collections">;
  collection?: {
    _id: Id<"collections">;
    name: string;
    companyId: Id<"companies">;
    company?: {
      _id: Id<"companies">;
      name: string;
    };
  };
}

interface Customer {
  _id: Id<"customers">;
  name: string;
  mobile: string;
  nationalCode?: string;
}

export default function OrderFormPage() {
  const navigate = useNavigate();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    mobile: '',
    nationalCode: ''
  });
  const [selectedCompany, setSelectedCompany] = useState<Id<"companies"> | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Id<"collections"> | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Id<"products"> | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Queries
  const customers = useQuery(api.customers.list);
  const companies = useQuery(api.companies.list);
  const collections = useQuery(api.collections.getByCompanyId, 
    selectedCompany ? { companyId: selectedCompany } : "skip"
  );
  const products = useQuery(api.products.getByCollectionId, 
    selectedCollection ? { collectionId: selectedCollection } : "skip"
  );
  const currentUser = useQuery(api.auth.loggedInUser);

  // Mutations
  const createCustomer = useMutation(api.customers.create);
  const createOrder = useMutation(api.orders.create);

  // Filter customers based on search
  const filteredCustomers = customers?.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.mobile.includes(customerSearch)
  ) || [];

  // Get product details for display
  const getProductDetails = (productId: Id<"products">): ProductWithDetails | null => {
    if (!products) return null;
    return products.find(p => p._id === productId) as ProductWithDetails || null;
  };

  // Add new item to order
  const addOrderItem = () => {
    if (!selectedProduct || !selectedColor) {
      setErrors({ general: 'لطفاً محصول و رنگ را انتخاب کنید' });
      return;
    }

    // Get values from the form inputs
    const sizeXInput = document.querySelector('input[placeholder="طول"]') as HTMLInputElement;
    const sizeYInput = document.querySelector('input[placeholder="عرض"]') as HTMLInputElement;
    const quantityInput = document.querySelector('input[placeholder="تعداد"]') as HTMLInputElement;

    const sizeX = parseInt(sizeXInput?.value) || 1;
    const sizeY = parseInt(sizeYInput?.value) || 1;
    const quantity = parseInt(quantityInput?.value) || 1;

    const existingItemIndex = orderItems.findIndex(item => 
      item.productId === selectedProduct && 
      item.color === selectedColor &&
      item.sizeX === sizeX && 
      item.sizeY === sizeY
    );
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const newItems = [...orderItems];
      newItems[existingItemIndex] = {
        ...newItems[existingItemIndex],
        quantity: newItems[existingItemIndex].quantity + quantity
      };
      setOrderItems(newItems);
    } else {
      // Add new item
      setOrderItems([...orderItems, {
        productId: selectedProduct,
        color: selectedColor,
        sizeX,
        sizeY,
        quantity
      }]);
    }

    // Reset form inputs
    if (sizeXInput) sizeXInput.value = "1";
    if (sizeYInput) sizeYInput.value = "1";
    if (quantityInput) quantityInput.value = "1";
  };

  // Remove item from order
  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Update item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    const newItems = [...orderItems];
    newItems[index].quantity = quantity;
    setOrderItems(newItems);
  };

  // Update item size
  const updateItemSize = (index: number, field: 'sizeX' | 'sizeY', value: number) => {
    if (value <= 0) return;
    const newItems = [...orderItems];
    newItems[index][field] = value;
    setOrderItems(newItems);
  };

  // Create new customer
  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.mobile) {
      setErrors({ general: 'نام و شماره موبایل الزامی است' });
      return;
    }

    try {
      const customerId = await createCustomer({
        name: newCustomer.name,
        mobile: newCustomer.mobile,
        nationalCode: newCustomer.nationalCode || undefined,
      });

      // Find the created customer and select it (fallback to local data if query isn't updated yet)
      const createdCustomer =
        customers?.find((c) => c._id === customerId) ||
        ({
          _id: customerId,
          name: newCustomer.name,
          mobile: newCustomer.mobile,
          nationalCode: newCustomer.nationalCode || undefined,
        } as Customer);

      setSelectedCustomer(createdCustomer);
      setShowNewCustomerForm(false);
      setNewCustomer({ name: '', mobile: '', nationalCode: '' });
      setCustomerSearch('');

      setErrors({});
    } catch (error: any) {
      setErrors({ general: error.message || 'خطا در ایجاد مشتری' });
    }
  };

  // Submit order
  const handleSubmitOrder = async () => {
    if (!selectedCustomer) {
      setErrors({ general: 'لطفاً مشتری را انتخاب کنید' });
      return;
    }

    if (orderItems.length === 0) {
      setErrors({ general: 'لطفاً حداقل یک آیتم به سفارش اضافه کنید' });
      return;
    }

    if (!currentUser) {
      setErrors({ general: 'کاربر وارد نشده است' });
      return;
    }

    try {
      await createOrder({
        customerId: selectedCustomer._id,
        createdBy: currentUser._id,
        items: orderItems,
        notes: notes.trim() || undefined,
      });

      // Navigate back to orders list
      navigate('/orders');
    } catch (error: any) {
      setErrors({ general: error.message || 'خطا در ثبت سفارش' });
    }
  };

  const handleCancel = () => {
    navigate('/orders');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="glass-card p-6 rounded-2xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-200">ایجاد سفارش جدید</h2>
          <button
            onClick={handleCancel}
            className="btn-secondary"
          >
            ← بازگشت به لیست
          </button>
        </div>
        
        {errors.general && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.general}
          </div>
        )}

        <div className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">انتخاب مشتری</h3>
            
            {!selectedCustomer ? (
              <div className="space-y-4">
                {/* Customer Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    جستجوی مشتری
                  </label>
                  <input
                    type="text"
                    placeholder="جستجو بر اساس نام یا شماره موبایل"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="auth-input-field"
                    dir="rtl"
                  />
                </div>

                {/* Customer List */}
                {customerSearch && filteredCustomers.length > 0 && (
                  <div className="border border-gray-600 rounded-md max-h-40 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer._id}
                        className="p-3 hover:bg-gray-700/50 cursor-pointer border-b border-gray-600 last:border-b-0"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <div className="font-medium text-gray-200">{customer.name}</div>
                        <div className="text-sm text-gray-400">{customer.mobile}</div>
                        {customer.nationalCode && (
                          <div className="text-sm text-gray-500">{customer.nationalCode}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* New Customer Button */}
                <button
                  type="button"
                  onClick={() => setShowNewCustomerForm(true)}
                  className="btn-secondary w-full"
                >
                  + مشتری جدید
                </button>
              </div>
            ) : (
              /* Selected Customer */
              <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-500/30 rounded-md">
                <div>
                  <div className="font-medium text-green-400">{selectedCustomer.name}</div>
                  <div className="text-sm text-gray-300">{selectedCustomer.mobile}</div>
                  {selectedCustomer.nationalCode && (
                    <div className="text-sm text-gray-400">{selectedCustomer.nationalCode}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="btn-secondary"
                >
                  تغییر
                </button>
              </div>
            )}

            {/* New Customer Form */}
            {showNewCustomerForm && (
              <div className="border border-blue-500/30 bg-blue-900/20 p-6 rounded-lg">
                <h4 className="text-lg font-semibold text-blue-400 mb-4">اطلاعات مشتری جدید</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">نام *</label>
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      placeholder="نام مشتری"
                      className="auth-input-field"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">شماره موبایل *</label>
                    <input
                      type="tel"
                      value={newCustomer.mobile}
                      onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                      placeholder="09123456789"
                      className="auth-input-field"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">کد ملی</label>
                    <input
                      type="text"
                      value={newCustomer.nationalCode}
                      onChange={(e) => setNewCustomer({ ...newCustomer, nationalCode: e.target.value })}
                      placeholder="1234567890"
                      className="auth-input-field"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreateCustomer} className="auth-button">
                      ثبت مشتری
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCustomerForm(false);
                        setNewCustomer({ name: '', mobile: '', nationalCode: '' });
                      }}
                      className="btn-secondary"
                    >
                      لغو
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Product Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">انتخاب محصول</h3>
            {/* Row 1: Company + Collection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">شرکت</label>
                <select
                  value={selectedCompany || ""}
                  onChange={(e) => {
                    setSelectedCompany(e.target.value as Id<"companies">);
                    setSelectedCollection(null);
                    setSelectedProduct(null);
                    setSelectedColor('');
                  }}
                  className="auth-input-field"
                >
                  <option value="">انتخاب شرکت</option>
                  {companies?.map((company) => (
                    <option key={company._id} value={company._id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">مجموعه</label>
                <select
                  value={selectedCollection || ""}
                  onChange={(e) => {
                    setSelectedCollection(e.target.value as Id<"collections">);
                    setSelectedProduct(null);
                    setSelectedColor('');
                  }}
                  disabled={!selectedCompany}
                  className="auth-input-field"
                >
                  <option value="">انتخاب مجموعه</option>
                  {collections?.map((collection) => (
                    <option key={collection._id} value={collection._id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Product + Color */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">محصول</label>
                <select
                  value={selectedProduct || ""}
                  onChange={(e) => setSelectedProduct(e.target.value as Id<"products">)}
                  disabled={!selectedCollection}
                  className="auth-input-field"
                >
                  <option value="">انتخاب محصول</option>
                  {products?.filter(product => product.collectionId === selectedCollection).map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.code}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">رنگ</label>
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  disabled={!selectedProduct}
                  className="auth-input-field"
                >
                  <option value="">انتخاب رنگ</option>
                  {selectedProduct && products?.filter(p => 
                    p.collectionId === selectedCollection && 
                    p.code === products.find(prod => prod._id === selectedProduct)?.code
                  ).map((product) => (
                    <option key={product._id} value={product.color}>
                      {product.color}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedProduct && selectedColor && (
              <div className="border border-gray-600 rounded-lg p-4 bg-gray-800/30">
                <h4 className="text-md font-semibold text-gray-200 mb-3">افزودن به سفارش</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">ابعاد X</label>
                    <input
                      type="number"
                      min="1"
                      defaultValue="1"
                      className="auth-input-field"
                      placeholder="طول"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">ابعاد Y</label>
                    <input
                      type="number"
                      min="1"
                      defaultValue="1"
                      className="auth-input-field"
                      placeholder="عرض"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">تعداد</label>
                    <input
                      type="number"
                      min="1"
                      defaultValue="1"
                      className="auth-input-field"
                      placeholder="تعداد"
                    />
                  </div>
                </div>
                <button onClick={addOrderItem} className="auth-button w-full">
                  + افزودن به سفارش
                </button>
              </div>
            )}
          </div>

          {/* Order Items */}
          {orderItems.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-200">آیتم‌های سفارش</h3>
              <div className="space-y-2">
                {orderItems.map((item, index) => {
                  const product = getProductDetails(item.productId);
                  return (
                    <div key={index} className="p-4 border border-gray-600 rounded-lg bg-gray-800/30">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-gray-400 space-y-1">
                            <div>شرکت: {product?.collection?.company?.name || 'نامشخص'}</div>
                            <div>مجموعه: {product?.collection?.name || 'نامشخص'}</div>
                            <div>محصول: {product?.code || 'نامشخص'}</div>
                            <div>رنگ: {item.color || 'نامشخص'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <label className="text-sm text-gray-300">X:</label>
                            <input
                              type="number"
                              value={item.sizeX}
                              onChange={(e) => updateItemSize(index, 'sizeX', parseInt(e.target.value) || 1)}
                              className="w-16 h-8 px-2 text-center bg-gray-700 border border-gray-600 rounded text-gray-200"
                              min="1"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="text-sm text-gray-300">Y:</label>
                            <input
                              type="number"
                              value={item.sizeY}
                              onChange={(e) => updateItemSize(index, 'sizeY', parseInt(e.target.value) || 1)}
                              className="w-16 h-8 px-2 text-center bg-gray-700 border border-gray-600 rounded text-gray-200"
                              min="1"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="text-sm text-gray-300">تعداد:</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-16 h-8 px-2 text-center bg-gray-700 border border-gray-600 rounded text-gray-200"
                              min="1"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeOrderItem(index)}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-md">
                <span className="font-medium text-gray-200">تعداد آیتم‌ها:</span>
                <span className="text-lg font-bold text-gray-400">
                  {orderItems.length} آیتم
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">یادداشت</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="یادداشت‌های اضافی..."
              rows={3}
              className="auth-input-field"
              dir="rtl"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 justify-end">
            <button 
              onClick={handleCancel}
              className="btn-secondary"
            >
              انصراف
            </button>
            <button 
              onClick={handleSubmitOrder}
              disabled={!selectedCustomer || orderItems.length === 0}
              className="auth-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ثبت سفارش
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
