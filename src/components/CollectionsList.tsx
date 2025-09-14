import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface CollectionsListProps {
  onSelectCollection: (collectionId: Id<"collections">, collectionName: string) => void;
  selectedCollection?: string;
  companyId: Id<"companies">;
}

export default function CollectionsList({ onSelectCollection, selectedCollection, companyId }: CollectionsListProps) {
  const collections = useQuery(api.collections.getByCompanyId, { companyId });
  const createCollection = useMutation(api.collections.create);
  const updateCollection = useMutation(api.collections.update);
  const removeCollection = useMutation(api.collections.remove);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for editing collection
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState<{id: Id<"collections">, name: string, description?: string} | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: ''
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const hasProducts = useQuery(
    api.collections.hasProducts, 
    editingCollection ? { id: editingCollection.id } : "skip"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await createCollection({
        name: formData.name,
        description: formData.description || undefined,
        companyId: companyId
      });
      setFormData({ name: '', description: '' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating collection:', error);
      alert('خطا در ایجاد مجموعه: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name.trim() || !editingCollection) return;
    
    setIsEditSubmitting(true);
    try {
      await updateCollection({
        id: editingCollection.id,
        name: editFormData.name,
        description: editFormData.description || undefined,
        companyId: companyId
      });
      setShowEditForm(false);
      setEditingCollection(null);
      setEditFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error updating collection:', error);
      alert('خطا در ویرایش مجموعه: ' + (error as Error).message);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const openEditModal = (collection: {id: Id<"collections">, name: string, description?: string}) => {
    setEditingCollection(collection);
    setEditFormData({
      name: collection.name,
      description: collection.description || ''
    });
    setShowEditForm(true);
  };

  const handleDeleteCollection = async (collectionId: Id<"collections">, collectionName: string) => {
    if (confirm(`آیا مطمئن هستید که می‌خواهید مجموعه "${collectionName}" را حذف کنید؟ تمام محصولات این مجموعه نیز حذف خواهند شد.`)) {
      try {
        await removeCollection({ id: collectionId });
      } catch (error) {
        console.error('Error deleting collection:', error);
        alert('خطا در حذف مجموعه: ' + (error as Error).message);
      }
    }
  };

  const handleDeleteFromModal = async () => {
    if (!editingCollection) return;
    
    if (hasProducts) {
      alert('نمی‌توانید این مجموعه را حذف کنید زیرا دارای محصولاتی است. ابتدا تمام محصولات این مجموعه را حذف کنید.');
      return;
    }
    
    if (confirm(`آیا مطمئن هستید که می‌خواهید مجموعه "${editingCollection.name}" را حذف کنید؟`)) {
      try {
        await removeCollection({ id: editingCollection.id });
        setShowEditForm(false);
        setEditingCollection(null);
        setEditFormData({ name: '', description: '' });
      } catch (error) {
        console.error('Error deleting collection:', error);
        alert('خطا در حذف مجموعه: ' + (error as Error).message);
      }
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700/50">
      <div className="px-6 py-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">مجموعه‌های فرش</h2>
            <p className="text-gray-300 mt-1">
              {collections?.length || 0} مجموعه موجود
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showCreateForm ? 'انصراف' : 'مجموعه جدید'}
          </button>
        </div>
        
        {showCreateForm && (
          <div className="mt-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                  نام مجموعه *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="نام مجموعه را وارد کنید"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
                  توضیحات
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="توضیحات اختیاری مجموعه"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  {isSubmitting ? 'در حال ایجاد...' : 'ایجاد مجموعه'}
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

      {/* Edit Collection Modal */}
      {showEditForm && editingCollection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700/50 w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <h3 className="text-xl font-semibold text-white">ویرایش مجموعه</h3>
              <p className="text-gray-300 text-sm mt-1">
                نام فعلی: {editingCollection.name}
              </p>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label htmlFor="editName" className="block text-sm font-medium text-white mb-2">
                    نام مجموعه *
                  </label>
                  <input
                    type="text"
                    id="editName"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditInputChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="نام مجموعه را وارد کنید"
                  />
                </div>
                
                <div>
                  <label htmlFor="editDescription" className="block text-sm font-medium text-white mb-2">
                    توضیحات
                  </label>
                  <textarea
                    id="editDescription"
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditInputChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="توضیحات اختیاری مجموعه"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isEditSubmitting || !editFormData.name.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors duration-200"
                  >
                    {isEditSubmitting ? 'در حال ویرایش...' : 'ویرایش مجموعه'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteFromModal}
                    disabled={hasProducts}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors duration-200"
                  >
                    حذف مجموعه
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingCollection(null);
                      setEditFormData({ name: '', description: '' });
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

      <div className="p-6">
        {collections && collections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((collection) => (
              <div
                key={collection._id}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedCollection === collection.name
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/50 bg-gray-800/30'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(collection)}
                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 p-2 rounded-lg transition-colors duration-200"
                      title="ویرایش مجموعه"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteCollection(collection._id, collection.name)}
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-300 p-2 rounded-lg transition-colors duration-200"
                      title="حذف مجموعه"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={() => onSelectCollection(collection._id, collection.name)}
                    className={`p-1 rounded transition-colors duration-200 ${
                      selectedCollection === collection.name ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
                    }`}
                    title="انتخاب مجموعه"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                <button
                  onClick={() => onSelectCollection(collection._id, collection.name)}
                  className="w-full text-right"
                >
                  <h3 className="font-medium text-white mb-1">
                    {collection.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {collection.description || 'مجموعه فرش'}
                  </p>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">مجموعه‌ای یافت نشد</h3>
            <p className="text-gray-400">
              هنوز مجموعه‌ای در سیستم ثبت نشده است
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
