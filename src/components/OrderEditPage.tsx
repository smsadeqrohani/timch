import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useNavigate } from 'react-router-dom';

interface OrderEditPageProps {
  orderId: Id<"orders">;
}

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
  const [newItemSizeX, setNewItemSizeX] = useState(1);
  const [newItemSizeY, setNewItemSizeY] = useState(1);
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

  useEffect(() => {
    if (orderDetails) {
      setEditedItems(orderDetails.items);
      setEditedNotes(orderDetails.order.notes || '');
      setErrors({});
    }
  }, [orderDetails]);

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

  const handleAddNewItem = () => {
    if (!selectedProduct) {
      setErrors({ general: 'لطفاً محصول را انتخاب کنید' });
      return;
    }

    if (newItemSizeX <= 0 || newItemSizeY <= 0 || newItemQuantity <= 0) {
      setErrors({ general: 'ابعاد و تعداد باید بزرگتر از صفر باشد' });
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
      sizeX: newItemSizeX,
      sizeY: newItemSizeY,
      quantity: newItemQuantity,
    };

    setEditedItems([...editedItems, newItem]);
    
    // Reset form
    setSelectedCompany(null);
    setSelectedCollection(null);
    setSelectedProduct(null);
    setNewItemSizeX(1);
    setNewItemSizeY(1);
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
                        {product.code}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">رنگ</label>
                  <div className="auth-input-field bg-gray-700 text-gray-400 cursor-not-allowed">
                    {selectedProduct ? 
                      products?.find(p => p._id === selectedProduct)?.color || 'نامشخص' : 
                      'ابتدا محصول را انتخاب کنید'
                    }
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">طول (X)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={newItemSizeX}
                    onChange={(e) => setNewItemSizeX(parseFloat(e.target.value) || 1)}
                    className="auth-input-field"
                    dir="ltr"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">عرض (Y)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={newItemSizeY}
                    onChange={(e) => setNewItemSizeY(parseFloat(e.target.value) || 1)}
                    className="auth-input-field"
                    dir="ltr"
                  />
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
                disabled={!selectedProduct}
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
                return (
                  <div key={item._id} className="p-4 border border-gray-600 rounded-lg bg-gray-800/30">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-medium text-gray-200">آیتم {index + 1}</h5>
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
                      <div className="text-sm text-gray-400">
                        شرکت: {productDetails?.company.name || 'نامشخص'} | 
                        مجموعه: {productDetails?.collection.name || 'نامشخص'} | 
                        محصول: {productDetails?.product.code || 'نامشخص'} | 
                        رنگ: {item.color || 'نامشخص'}
                      </div>
                    </div>
                    
                    {/* Editable Fields */}
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
                );
              })}
            </div>
            
            {/* Items Summary */}
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-blue-400 font-medium">تعداد کل آیتم‌ها:</span>
                <span className="text-blue-400 font-bold text-lg">
                  {editedItems.length} آیتم
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
