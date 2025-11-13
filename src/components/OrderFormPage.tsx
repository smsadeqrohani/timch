import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useNavigate } from 'react-router-dom';
import ImageHoverPreview from './ImageHoverPreview';

interface OrderItem {
  productId: Id<"products">;
  color: string;
  sizeX: number;
  sizeY: number;
  quantity: number;
}

type RawSizeType = 'mostatil' | 'morabba' | 'dayere' | 'gerd' | 'beyzi';
type SizeType = 'mostatil' | 'morabba' | 'gerd' | 'beyzi';

interface SizeDoc {
  _id: Id<'sizes'>;
  _creationTime: number;
  x: number;
  y: number;
  type: RawSizeType;
}

const typeLabels: Record<SizeType, string> = {
  mostatil: 'مستطیل',
  morabba: 'مربع',
  gerd: 'گرد',
  beyzi: 'بیضی',
};

const toPersianDigits = (value: string): string =>
  value.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]).replace(/\./g, '٫');

const formatDimension = (value: number) => {
  const raw = value.toString().replace(/\.?0+$/, '');
  return toPersianDigits(raw);
};

const normalizeSizeType = (type: RawSizeType): SizeType =>
  type === 'dayere' ? 'gerd' : type;

const getTypeLabel = (type: RawSizeType) => typeLabels[normalizeSizeType(type)];

const formatSizeLabel = (size: SizeDoc) =>
  `${getTypeLabel(size.type)} ${formatDimension(size.x)}*${formatDimension(size.y)}`;

const findSizeByDimensions = (
  sizes: SizeDoc[] | undefined,
  x: number,
  y: number,
) =>
  sizes?.find(
    (size) => Math.abs(size.x - x) < 1e-6 && Math.abs(size.y - y) < 1e-6,
  );

const formatQuantity = (value: number) => toPersianDigits(value.toString());

const formatColorLabel = (color: string) => toPersianDigits(color);
interface ProductWithDetails {
  _id: Id<"products">;
  code: string;
  color: string;
  collectionId: Id<"collections">;
  imageUrls?: string[];
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
  const [selectedSizeId, setSelectedSizeId] = useState<Id<'sizes'> | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
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
  const sizes = useQuery(api.sizes.list);
  const currentUser = useQuery(api.auth.loggedInUser);

  // Mutations
  const createCustomer = useMutation(api.customers.create);
  const createOrder = useMutation(api.orders.create);

  useEffect(() => {
    setSelectedSizeId(null);
    setItemQuantity(1);
  }, [selectedProduct, selectedColor]);

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
    if (!sizes || sizes.length === 0) {
      setErrors({ general: 'لطفاً ابتدا سایز تعریف کنید' });
      return;
    }
    if (!selectedSizeId) {
      setErrors({ general: 'لطفاً سایز را انتخاب کنید' });
      return;
    }
    if (itemQuantity <= 0) {
      setErrors({ general: 'تعداد باید بزرگتر از صفر باشد' });
      return;
    }

    const selectedSize = sizes.find((size) => size._id === selectedSizeId);
    if (!selectedSize) {
      setErrors({ general: 'سایز انتخاب شده یافت نشد' });
      return;
    }

    const existingItemIndex = orderItems.findIndex(item => 
      item.productId === selectedProduct && 
      item.color === selectedColor &&
      item.sizeX === selectedSize.x && 
      item.sizeY === selectedSize.y
    );
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const newItems = [...orderItems];
      newItems[existingItemIndex] = {
        ...newItems[existingItemIndex],
        quantity: newItems[existingItemIndex].quantity + itemQuantity
      };
      setOrderItems(newItems);
    } else {
      // Add new item
      setOrderItems([...orderItems, {
        productId: selectedProduct,
        color: selectedColor,
        sizeX: selectedSize.x,
        sizeY: selectedSize.y,
        quantity: itemQuantity
      }]);
    }

    setItemQuantity(1);
    setErrors({});
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

  const handleOrderItemSizeChange = (index: number, sizeId: string) => {
    if (!sizes) return;
    const size = sizes.find((s) => s._id === (sizeId as Id<'sizes'>));
    if (!size) return;
    const newItems = [...orderItems];
    newItems[index] = {
      ...newItems[index],
      sizeX: size.x,
      sizeY: size.y,
    };
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
                      {toPersianDigits(product.code)}
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
                        {formatColorLabel(product.color)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedProduct && selectedColor && (
              <div className="border border-gray-600 rounded-lg p-4 bg-gray-800/30">
                <h4 className="text-md font-semibold text-gray-200 mb-3">افزودن به سفارش</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">سایز</label>
                  <select
                    value={selectedSizeId || ''}
                    onChange={(event) =>
                      setSelectedSizeId(
                        event.target.value ? (event.target.value as Id<'sizes'>) : null,
                      )
                    }
                    className="auth-input-field"
                    disabled={!sizes || sizes.length === 0}
                  >
                    <option value="">
                      {sizes && sizes.length > 0
                        ? 'انتخاب سایز'
                        : 'ابتدا سایز تعریف کنید'}
                    </option>
                    {sizes?.map((size) => (
                      <option key={size._id} value={size._id}>
                        {formatSizeLabel(size)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">تعداد</label>
                  <input
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={(event) =>
                      setItemQuantity(Math.max(1, parseInt(event.target.value) || 1))
                    }
                    className="auth-input-field"
                    dir="ltr"
                  />
                </div>
              </div>
              <button
                onClick={addOrderItem}
                disabled={
                  !selectedProduct ||
                  !selectedColor ||
                  !selectedSizeId ||
                  itemQuantity <= 0
                }
                className="auth-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
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
                  const previewImage = product?.imageUrls?.[0];
                  const matchedSize = findSizeByDimensions(sizes, item.sizeX, item.sizeY);
                  return (
                    <div key={index} className="p-4 border border-gray-600 rounded-lg bg-gray-800/30">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-gray-400 space-y-1">
                            <div>شرکت: {product?.collection?.company?.name || 'نامشخص'}</div>
                            <div>مجموعه: {product?.collection?.name || 'نامشخص'}</div>
                            <div>
                              محصول:{' '}
                              {product?.code ? toPersianDigits(product.code) : 'نامشخص'}
                            </div>
                            <div className="flex items-center gap-2">
                              <span>رنگ: {item.color ? formatColorLabel(item.color) : 'نامشخص'}</span>
                              {previewImage && (
                                <ImageHoverPreview
                                  imageUrl={previewImage}
                                  alt={`پیش‌نمایش ${product?.code || ''} - ${item.color}`}
                                >
                                  <span className="inline-flex items-center gap-1 rounded-md border border-blue-400/40 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
                                    مشاهده تصویر
                                    {product?.imageUrls && product.imageUrls.length > 1 && (
                                      <span className="text-[10px] text-blue-200/70">
                                        {product.imageUrls.length}
                                      </span>
                                    )}
                                  </span>
                                </ImageHoverPreview>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1">
                            <label className="text-sm text-gray-300">سایز:</label>
                            <select
                              value={
                                matchedSize?._id ?? ''
                              }
                              onChange={(event) =>
                                handleOrderItemSizeChange(index, event.target.value)
                              }
                              className="h-8 w-40 px-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                            >
                              <option value="">انتخاب سایز</option>
                              {sizes?.map((size) => (
                                <option key={size._id} value={size._id}>
                                  {formatSizeLabel(size)}
                                </option>
                              ))}
                            </select>
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
                          <span className="text-sm text-gray-400">
                            {matchedSize
                              ? formatSizeLabel(matchedSize)
                              : `${formatDimension(item.sizeX)}*${formatDimension(item.sizeY)}`}
                          </span>
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
                  {formatQuantity(orderItems.length)} آیتم
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
