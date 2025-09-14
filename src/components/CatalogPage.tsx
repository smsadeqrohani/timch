import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface Product {
  _id: Id<"products">;
  _creationTime: number;
  collection: string;
  code: string;
  color: string;
  size?: string;
}

export default function CatalogPage() {
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Queries
  const collections = useQuery(api.products.getCollections);
  const codes = useQuery(api.products.getCodesByCollection, 
    selectedCollection ? { collection: selectedCollection } : "skip"
  );
  const colors = useQuery(api.products.getColorsByCollectionAndCode,
    selectedCollection && selectedCode ? { 
      collection: selectedCollection, 
      code: selectedCode 
    } : "skip"
  );
  const products = useQuery(api.products.getByCollection,
    selectedCollection ? { collection: selectedCollection } : "skip"
  );
  const searchResults = useQuery(api.products.search,
    searchQuery ? { query: searchQuery } : "skip"
  );

  // Mutations
  const createProduct = useMutation(api.products.create);

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await createProduct({
        collection: formData.get('collection') as string,
        code: formData.get('code') as string,
        color: formData.get('color') as string,
        size: formData.get('size') as string || undefined,
      });
      setShowAddForm(false);
      // Reset form
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error creating product:', error);
      alert('خطا در ایجاد محصول');
    }
  };

  const displayProducts = searchQuery ? searchResults : products;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent from-blue-400 to-purple-400 mb-2">کاتالوگ محصولات فرش</h1>
        <p className="text-gray-300">مدیریت و مشاهده محصولات فرش</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="جستجو در محصولات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-white placeholder-gray-400"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Collection Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">مجموعه</label>
          <select
            value={selectedCollection}
            onChange={(e) => {
              setSelectedCollection(e.target.value);
              setSelectedCode('');
            }}
            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-white"
          >
            <option value="">همه مجموعه‌ها</option>
            {collections?.map((collection) => (
              <option key={collection} value={collection}>
                {collection}
              </option>
            ))}
          </select>
        </div>

        {/* Code Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">کد محصول</label>
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            disabled={!selectedCollection}
            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-white disabled:bg-gray-700 disabled:text-gray-400"
          >
            <option value="">همه کدها</option>
            {codes?.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        {/* Add Product Button */}
        <div className="flex items-end">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showAddForm ? 'انصراف' : 'افزودن محصول'}
          </button>
        </div>
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <div className="bg-gray-800/50 p-6 rounded-lg mb-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold mb-4 text-white">افزودن محصول جدید</h3>
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">مجموعه</label>
              <input
                type="text"
                name="collection"
                required
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-white placeholder-gray-400"
                placeholder="نام مجموعه"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">کد محصول</label>
              <input
                type="text"
                name="code"
                required
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-white placeholder-gray-400"
                placeholder="کد محصول"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">کد رنگ</label>
              <input
                type="text"
                name="color"
                required
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-white placeholder-gray-400"
                placeholder="کد رنگ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">سایز (اختیاری)</label>
              <input
                type="text"
                name="size"
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-white placeholder-gray-400"
                placeholder="سایز"
              />
            </div>
            <div className="md:col-span-4">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                افزودن محصول
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Display */}
      <div className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700/50">
        <div className="px-6 py-4 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold text-white">
            {searchQuery ? `نتایج جستجو برای "${searchQuery}"` : 
             selectedCollection ? `محصولات مجموعه "${selectedCollection}"` : 
             'همه محصولات'}
          </h2>
          <p className="text-gray-300 mt-1">
            {displayProducts?.length || 0} محصول یافت شد
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700/30">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  مجموعه
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  کد محصول
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  کد رنگ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  سایز
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  تاریخ ایجاد
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800/30 divide-y divide-gray-700">
              {displayProducts?.map((product: Product) => (
                <tr key={product._id} className="hover:bg-gray-700/30">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {product.collection}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {product.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {product.color}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {product.size || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(product._creationTime).toLocaleDateString('fa-IR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!displayProducts || displayProducts.length === 0) && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">محصولی یافت نشد</h3>
            <p className="text-gray-400">
              {searchQuery ? 'لطفاً عبارت جستجوی دیگری امتحان کنید' : 
               'برای شروع، یک مجموعه انتخاب کنید یا محصول جدیدی اضافه کنید'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
