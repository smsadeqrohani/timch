import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useNavigate } from 'react-router-dom';
import ImageHoverPreview from './ImageHoverPreview';

interface OrderEditPageProps {
  orderId: Id<"orders">;
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

export default function OrderEditPage({ orderId }: OrderEditPageProps) {
  const navigate = useNavigate();
  const [editedItems, setEditedItems] = useState<Array<{
    _id: Id<"orderItems">;
    productId: Id<"products">;
    color: string;
    sizeX: number;
    sizeY: number;
    quantity: number;
  }>>([]);
  const [editedNotes, setEditedNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // New item selection state
  const [selectedCompany, setSelectedCompany] = useState<Id<"companies"> | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Id<"collections"> | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Id<"products"> | null>(null);
  const [newItemSizeId, setNewItemSizeId] = useState<Id<'sizes'> | null>(null);
  const [newItemQuantity, setNewItemQuantity] = useState(1);

  const updateOrder = useMutation(api.orders.update);
  const orderDetails = useQuery(api.orders.getWithItems, { id: orderId });
  
  // Queries for product selection
  const companies = useQuery(api.companies.list);
  const allCollections = useQuery(api.collections.list);
  const allProducts = useQuery(api.products.list);
  const collections = useQuery(api.collections.getByCompanyId, 
    selectedCompany ? { companyId: selectedCompany } : "skip"
  );
  const products = useQuery(api.products.getByCollectionId, 
    selectedCollection ? { collectionId: selectedCollection } : "skip"
  );
  const sizes = useQuery(api.sizes.list);

  useEffect(() => {
    if (orderDetails) {
      setEditedItems(orderDetails.items);
      setEditedNotes(orderDetails.order.notes || '');
      setErrors({});
    }
  }, [orderDetails]);

  const handleUpdateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...editedItems];
    newItems[index] = { ...newItems[index], quantity };
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

  const handleUpdateItemSize = (index: number, sizeId: string) => {
    if (!sizes) return;
    const size = sizes.find((s) => s._id === (sizeId as Id<'sizes'>));
    if (!size) return;
    const newItems = [...editedItems];
    newItems[index] = {
      ...newItems[index],
      sizeX: size.x,
      sizeY: size.y,
    };
    setEditedItems(newItems);
  };

  const handleAddNewItem = () => {
    if (!selectedProduct) {
      setErrors({ general: 'لطفاً محصول را انتخاب کنید' });
      return;
    }

    if (!sizes || sizes.length === 0) {
      setErrors({ general: 'لطفاً ابتدا سایز تعریف کنید' });
      return;
    }

    if (!newItemSizeId) {
      setErrors({ general: 'لطفاً سایز را انتخاب کنید' });
      return;
    }

    if (newItemQuantity <= 0) {
      setErrors({ general: 'تعداد باید بزرگتر از صفر باشد' });
      return;
    }

    const selectedSize = sizes.find((size) => size._id === newItemSizeId);
    if (!selectedSize) {
      setErrors({ general: 'سایز انتخاب شده یافت نشد' });
      return;
    }

    // Get the selected product to get its color
    const selectedProductData = products?.find(p => p._id === selectedProduct);
    if (!selectedProductData) {
      setErrors({ general: 'محصول انتخاب شده یافت نشد' });
      return;
    }

    // Create a new item with a temporary ID
    const newItem = {
      _id: `temp_${Date.now()}` as Id<"orderItems">,
      productId: selectedProduct,
      color: selectedProductData.color, // Use product's color
      sizeX: selectedSize.x,
      sizeY: selectedSize.y,
      quantity: newItemQuantity,
    };

    setEditedItems([...editedItems, newItem]);
    
    // Reset form
    setSelectedCompany(null);
    setSelectedCollection(null);
    setSelectedProduct(null);
    setNewItemSizeId(null);
    setNewItemQuantity(1);
    setErrors({});
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
          color: item.color,
          sizeX: item.sizeX,
          sizeY: item.sizeY,
          quantity: item.quantity,
        })),
      });

      // Navigate back to orders list
      navigate('/orders');
    } catch (error: any) {
      setErrors({ general: error.message || 'خطا در به‌روزرسانی سفارش' });
    }
  };

  const handleCancel = () => {
    navigate('/orders');
  };

  // Get product details with company and collection info
  const getProductDetails = (productId: Id<"products">) => {
    // First try to find in the filtered products (for new items)
    let product = products?.find(p => p._id === productId);
    
    // If not found, get from all products (for existing items)
    if (!product) {
      product = allProducts?.find(p => p._id === productId);
    }
    
    if (!product) return null;

    const collection = allCollections?.find(c => c._id === product.collectionId);
    if (!collection) return null;

    const company = companies?.find(comp => comp._id === collection.companyId);
    if (!company) return null;

    return {
      product,
      collection,
      company,
    };
  };

  if (!orderDetails) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="glass-card p-6 rounded-2xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-200">ویرایش سفارش</h3>
          <button
            onClick={handleCancel}
            className="btn-secondary"
          >
            ← بازگشت به لیست
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

          {/* Add New Item */}
          <div>
            <h4 className="text-lg font-semibold mb-3 text-gray-200">افزودن آیتم جدید</h4>
            <div className="border border-gray-600 rounded-lg p-4 bg-gray-800/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">شرکت</label>
                  <select
                    value={selectedCompany || ""}
                    onChange={(e) => {
                      setSelectedCompany(e.target.value as Id<"companies">);
                      setSelectedCollection(null);
                      setSelectedProduct(null);
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                  <div className="auth-input-field bg-gray-700 text-gray-400 cursor-not-allowed">
                    {selectedProduct ? 
                      products?.find(p => p._id === selectedProduct)?.color
                        ? formatColorLabel(products.find(p => p._id === selectedProduct)!.color)
                        : 'نامشخص' : 
                      'ابتدا محصول را انتخاب کنید'
                    }
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">سایز</label>
                  <select
                    value={newItemSizeId || ''}
                    onChange={(event) =>
                      setNewItemSizeId(
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
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                    className="auth-input-field"
                    dir="ltr"
                  />
                </div>
              </div>

              <button
                onClick={handleAddNewItem}
                disabled={!selectedProduct || !newItemSizeId || newItemQuantity <= 0}
                className="auth-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + افزودن آیتم جدید
              </button>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h4 className="text-lg font-semibold mb-3 text-gray-200">آیتم‌های سفارش</h4>
            <div className="space-y-4">
              {editedItems.map((item, index) => {
                const productDetails = getProductDetails(item.productId);
                const previewImage = productDetails?.product.imageUrls?.[0];
                const matchedSize = findSizeByDimensions(sizes, item.sizeX, item.sizeY);
                return (
                  <div key={item._id} className="p-4 border border-gray-600 rounded-lg bg-gray-800/30">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-medium text-gray-200">
                        آیتم {formatQuantity(index + 1)}
                      </h5>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        disabled={editedItems.length <= 1}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm flex items-center gap-1"
                      >
                        🗑️ حذف
                      </button>
                    </div>
                    
                    {/* Product Info Display */}
                    <div className="mb-3 p-3 bg-gray-700/50 rounded-lg">
                      <div className="text-sm text-gray-400 space-y-2">
                        <div>
                          شرکت: {productDetails?.company.name || 'نامشخص'} |{' '}
                          مجموعه: {productDetails?.collection.name || 'نامشخص'} |{' '}
                          محصول:{' '}
                          {productDetails?.product.code
                            ? toPersianDigits(productDetails.product.code)
                            : 'نامشخص'} |{' '}
                          رنگ: {item.color ? formatColorLabel(item.color) : 'نامشخص'}
                        </div>
                        {previewImage && (
                          <ImageHoverPreview
                            imageUrl={previewImage}
                            alt={`پیش‌نمایش ${productDetails?.product.code || ''} - ${item.color}`}
                          >
                            <span className="inline-flex items-center gap-1 rounded-md border border-blue-400/40 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
                              مشاهده تصویر
                              {productDetails?.product.imageUrls && productDetails.product.imageUrls.length > 1 && (
                                <span className="text-[10px] text-blue-200/70">
                                  {productDetails.product.imageUrls.length}
                                </span>
                              )}
                            </span>
                          </ImageHoverPreview>
                        )}
                      </div>
                    </div>
                    
                    {/* Editable Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          سایز
                        </label>
                        <select
                          value={matchedSize?._id ?? ''}
                          onChange={(event) => handleUpdateItemSize(index, event.target.value)}
                          className="auth-input-field"
                        >
                          <option value="">انتخاب سایز</option>
                          {sizes?.map((size) => (
                            <option key={size._id} value={size._id}>
                              {formatSizeLabel(size)}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-400">
                          فعلی:{' '}
                          {matchedSize
                            ? formatSizeLabel(matchedSize)
                            : `${formatDimension(item.sizeX)}*${formatDimension(item.sizeY)}`}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          تعداد
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItemQuantity(index, parseInt(e.target.value) || 1)}
                          className="auth-input-field"
                          dir="ltr"
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <span className="text-sm text-gray-400">
                          {(() => {
                            const match = findSizeByDimensions(sizes, item.sizeX, item.sizeY);
                            return match
                              ? formatSizeLabel(match)
                              : `${formatDimension(item.sizeX)}*${formatDimension(item.sizeY)}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Items Summary */}
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-blue-400 font-medium">تعداد کل آیتم‌ها:</span>
                <span className="text-blue-400 font-bold text-lg">
                  {formatQuantity(editedItems.length)} آیتم
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
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
  );
}
