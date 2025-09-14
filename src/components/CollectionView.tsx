import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface Product {
  _id: Id<"products">;
  _creationTime: number;
  collectionId: Id<"collections">;
  code: string;
  color: string;
}

interface CollectionViewProps {
  collectionId: Id<"collections">;
  collectionName: string;
}

export default function CollectionView({ collectionId, collectionName }: CollectionViewProps) {
  // Queries
  const codes = useQuery(api.products.getCodesByCollectionId, { collectionId });
  const products = useQuery(api.products.getByCollectionId, { collectionId });
  
  // Mutations
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const removeProduct = useMutation(api.products.remove);
  
  // State for create product form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    colors: [''] // Start with at least one color field
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for editing product code
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editingProducts, setEditingProducts] = useState<Product[]>([]);
  const [editFormData, setEditFormData] = useState({
    code: '',
    colors: [''] // Start with at least one color field
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const hasMultipleColors = useQuery(
    api.products.hasMultipleColors,
    editingCode ? { collectionId, code: editingCode } : "skip"
  );

  // Form handlers
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || formData.colors.some(c => !c.trim())) return;
    
    setIsSubmitting(true);
    try {
      // Create products for each color
      for (const color of formData.colors) {
        if (color.trim()) {
          await createProduct({
            collectionId,
            code: formData.code.trim(),
            color: color.trim()
          });
        }
      }
      setFormData({ code: '', colors: [''] });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating products:', error);
      alert('خطا در ایجاد محصولات: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleColorChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.map((color, i) => i === index ? value : color)
    }));
  };

  const addColorField = () => {
    setFormData(prev => ({
      ...prev,
      colors: [...prev.colors, '']
    }));
  };

  const removeColorField = (index: number) => {
    if (formData.colors.length > 1) {
      setFormData(prev => ({
        ...prev,
        colors: prev.colors.filter((_, i) => i !== index)
      }));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.code.trim() || editFormData.colors.some(c => !c.trim())) return;
    
    setIsEditSubmitting(true);
    try {
      // First, delete all existing products for this code
      for (const product of editingProducts) {
        await removeProduct({ id: product._id });
      }
      
      // Then create new products with updated code and colors
      for (const color of editFormData.colors) {
        if (color.trim()) {
          await createProduct({
            collectionId,
            code: editFormData.code.trim(),
            color: color.trim()
          });
        }
      }
      
      setShowEditForm(false);
      setEditingCode(null);
      setEditingProducts([]);
      setEditFormData({ code: '', colors: [''] });
    } catch (error) {
      console.error('Error updating products:', error);
      alert('خطا در ویرایش محصولات: ' + (error as Error).message);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleEditColorChange = (index: number, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      colors: prev.colors.map((color, i) => i === index ? value : color)
    }));
  };

  const addEditColorField = () => {
    setEditFormData(prev => ({
      ...prev,
      colors: [...prev.colors, '']
    }));
  };

  const removeEditColorField = (index: number) => {
    if (editFormData.colors.length > 1) {
      setEditFormData(prev => ({
        ...prev,
        colors: prev.colors.filter((_, i) => i !== index)
      }));
    }
  };

  const openEditModal = (code: string, codeProducts: Product[]) => {
    setEditingCode(code);
    setEditingProducts(codeProducts);
    setEditFormData({
      code: code,
      colors: codeProducts.map(p => p.color)
    });
    setShowEditForm(true);
  };

  const handleDeleteProduct = async (productId: Id<"products">) => {
    if (confirm('آیا مطمئن هستید که می‌خواهید این محصول را حذف کنید؟')) {
      try {
        await removeProduct({ id: productId });
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('خطا در حذف محصول: ' + (error as Error).message);
      }
    }
  };

  const handleDeleteFromModal = async () => {
    if (!editingCode || !editingProducts.length) return;
    
    if (editingProducts.length === 1) {
      // If only one color, we can delete the entire code
      if (confirm(`آیا مطمئن هستید که می‌خواهید کد "${editingCode}" را حذف کنید؟`)) {
        try {
          for (const product of editingProducts) {
            await removeProduct({ id: product._id });
          }
          setShowEditForm(false);
          setEditingCode(null);
          setEditingProducts([]);
          setEditFormData({ code: '', colors: [''] });
        } catch (error) {
          console.error('Error deleting products:', error);
          alert('خطا در حذف محصولات: ' + (error as Error).message);
        }
      }
    } else {
      alert('نمی‌توانید کدی را که دارای چندین رنگ است حذف کنید. ابتدا تمام رنگ‌ها را حذف کنید.');
    }
  };

  // Group products by code for better display
  const productsByCode = products?.reduce((acc, product) => {
    if (!acc[product.code]) {
      acc[product.code] = [];
    }
    acc[product.code].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Sort the codes to ensure consistent display order
  const sortedCodes = productsByCode ? Object.keys(productsByCode).sort((a, b) => a.localeCompare(b)) : [];

  return (
    <div className="space-y-6">
      {/* Collection Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">{collectionName}</h2>
            <p className="text-blue-100">
              {products?.length || 0} محصول • {codes?.length || 0} کد مختلف
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showCreateForm ? 'انصراف' : 'محصول جدید'}
          </button>
        </div>
        
        {showCreateForm && (
          <div className="mt-4 p-4 bg-white/10 rounded-lg border border-white/20">
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-white mb-2">
                  کد محصول *
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="کد محصول را وارد کنید"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  رنگ‌ها *
                </label>
                <div className="space-y-2">
                  {formData.colors.map((color, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => handleColorChange(index, e.target.value)}
                        required
                        className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                        placeholder={`رنگ ${index + 1}`}
                      />
                      {formData.colors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColorField(index)}
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-200 p-2 rounded-lg transition-colors duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addColorField}
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-200 px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    افزودن رنگ
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.code.trim() || formData.colors.some(c => !c.trim())}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  {isSubmitting ? 'در حال ایجاد...' : 'ایجاد محصولات'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {showEditForm && editingCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700/50 w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <h3 className="text-xl font-semibold text-white">ویرایش محصول</h3>
              <p className="text-gray-300 text-sm mt-1">
                کد: {editingCode} • {editingProducts.length} رنگ موجود
              </p>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label htmlFor="editCode" className="block text-sm font-medium text-white mb-2">
                    کد محصول *
                  </label>
                  <input
                    type="text"
                    id="editCode"
                    name="code"
                    value={editFormData.code}
                    onChange={handleEditInputChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="کد محصول را وارد کنید"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    رنگ‌ها *
                  </label>
                  <div className="space-y-2">
                    {editFormData.colors.map((color, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={color}
                          onChange={(e) => handleEditColorChange(index, e.target.value)}
                          required
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`رنگ ${index + 1}`}
                        />
                        {editFormData.colors.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEditColorField(index)}
                            className="bg-red-600/20 hover:bg-red-600/30 text-red-300 p-2 rounded-lg transition-colors duration-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addEditColorField}
                      className="bg-green-600/20 hover:bg-green-600/30 text-green-300 px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      افزودن رنگ
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isEditSubmitting || !editFormData.code.trim() || editFormData.colors.some(c => !c.trim())}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors duration-200"
                  >
                    {isEditSubmitting ? 'در حال ویرایش...' : 'ویرایش محصولات'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteFromModal}
                    disabled={editingProducts.length > 1}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors duration-200"
                  >
                    حذف کد
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingCode(null);
                      setEditingProducts([]);
                      setEditFormData({ code: '', colors: [''] });
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="space-y-6">
        {sortedCodes.map((code) => {
          const codeProducts = productsByCode![code];
          return (
          <div key={code} className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-700/50 bg-gray-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">کد: {code}</h3>
                  <p className="text-gray-300">{codeProducts.length} رنگ مختلف</p>
                </div>
                <button
                  onClick={() => openEditModal(code, codeProducts)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  ویرایش
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {codeProducts.map((product) => (
                  <span
                    key={product._id}
                    className="bg-gray-700/50 text-white px-3 py-1 rounded-lg text-sm border border-gray-600/50"
                  >
                    {product.color}
                  </span>
                ))}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {(!products || products.length === 0) && (
        <div className="text-center py-12 bg-gray-800/50 rounded-lg shadow-lg border border-gray-700/50">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">محصولی یافت نشد</h3>
          <p className="text-gray-400">
            با فیلترهای انتخاب شده محصولی وجود ندارد
          </p>
        </div>
      )}
    </div>
  );
}
