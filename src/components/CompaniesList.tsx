import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface CompaniesListProps {
  onSelectCompany: (companyId: Id<"companies">, companyName: string) => void;
  selectedCompany?: string;
}

export default function CompaniesList({ onSelectCompany, selectedCompany }: CompaniesListProps) {
  const companies = useQuery(api.companies.list);
  const createCompany = useMutation(api.companies.create);
  const updateCompany = useMutation(api.companies.update);
  const removeCompany = useMutation(api.companies.remove);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for editing company
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<{id: Id<"companies">, name: string, description?: string} | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: ''
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const hasCollections = useQuery(
    api.companies.hasCollections, 
    editingCompany?.id ? { id: editingCompany.id } : "skip"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await createCompany({
        name: formData.name,
        description: formData.description || undefined
      });
      setFormData({ name: '', description: '' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating company:', error);
      alert('خطا در ایجاد شرکت: ' + (error as Error).message);
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
    if (!editFormData.name.trim() || !editingCompany?.id) return;
    
    setIsEditSubmitting(true);
    try {
      await updateCompany({
        id: editingCompany.id,
        name: editFormData.name,
        description: editFormData.description || undefined
      });
      setShowEditForm(false);
      setEditingCompany(null);
      setEditFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error updating company:', error);
      alert('خطا در ویرایش شرکت: ' + (error as Error).message);
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

  const openEditModal = (company: {id: Id<"companies">, name: string, description?: string}) => {
    setEditingCompany(company);
    setEditFormData({
      name: company.name,
      description: company.description || ''
    });
    setShowEditForm(true);
  };

  const handleDeleteCompany = async (companyId: Id<"companies">, companyName: string) => {
    if (confirm(`آیا مطمئن هستید که می‌خواهید شرکت "${companyName}" را حذف کنید؟ تمام مجموعه‌ها و محصولات این شرکت نیز حذف خواهند شد.`)) {
      try {
        await removeCompany({ id: companyId });
      } catch (error) {
        console.error('Error deleting company:', error);
        alert('خطا در حذف شرکت: ' + (error as Error).message);
      }
    }
  };

  const handleDeleteFromModal = async () => {
    if (!editingCompany) return;
    
    if (hasCollections) {
      alert('نمی‌توانید این شرکت را حذف کنید زیرا دارای مجموعه‌هایی است. ابتدا تمام مجموعه‌های این شرکت را حذف کنید.');
      return;
    }
    
    if (confirm(`آیا مطمئن هستید که می‌خواهید شرکت "${editingCompany.name}" را حذف کنید؟`)) {
      try {
        await removeCompany({ id: editingCompany.id });
        setShowEditForm(false);
        setEditingCompany(null);
        setEditFormData({ name: '', description: '' });
      } catch (error) {
        console.error('Error deleting company:', error);
        alert('خطا در حذف شرکت: ' + (error as Error).message);
      }
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700/50">
      <div className="px-6 py-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">شرکت‌ها</h2>
            <p className="text-gray-300 mt-1">
              {companies?.length || 0} شرکت موجود
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showCreateForm ? 'انصراف' : 'شرکت جدید'}
          </button>
        </div>
        
        {showCreateForm && (
          <div className="mt-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                  نام شرکت *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="نام شرکت را وارد کنید"
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
                  placeholder="توضیحات اختیاری شرکت"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  {isSubmitting ? 'در حال ایجاد...' : 'ایجاد شرکت'}
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

      {/* Edit Company Modal */}
      {showEditForm && editingCompany && (
        <div className="modal-backdrop p-4">
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700/50 w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <h3 className="text-xl font-semibold text-white">ویرایش شرکت</h3>
              <p className="text-gray-300 text-sm mt-1">
                نام فعلی: {editingCompany.name}
              </p>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label htmlFor="editName" className="block text-sm font-medium text-white mb-2">
                    نام شرکت *
                  </label>
                  <input
                    type="text"
                    id="editName"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditInputChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="نام شرکت را وارد کنید"
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
                    placeholder="توضیحات اختیاری شرکت"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isEditSubmitting || !editFormData.name.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors duration-200"
                  >
                    {isEditSubmitting ? 'در حال ویرایش...' : 'ویرایش شرکت'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteFromModal}
                    disabled={hasCollections}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors duration-200"
                  >
                    حذف شرکت
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingCompany(null);
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
        {companies && companies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => (
              <div
                key={company._id}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedCompany === company.name
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/50 bg-gray-800/30'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal({
                        id: company._id,
                        name: company.name,
                        description: company.description
                      })}
                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 p-2 rounded-lg transition-colors duration-200"
                      title="ویرایش شرکت"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteCompany(company._id, company.name)}
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-300 p-2 rounded-lg transition-colors duration-200"
                      title="حذف شرکت"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={() => onSelectCompany(company._id, company.name)}
                    className={`p-1 rounded transition-colors duration-200 ${
                      selectedCompany === company.name ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
                    }`}
                    title="انتخاب شرکت"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                <button
                  onClick={() => onSelectCompany(company._id, company.name)}
                  className="w-full text-right"
                >
                  <h3 className="font-medium text-white mb-1">
                    {company.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {company.description || 'شرکت فرش'}
                  </p>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">شرکتی یافت نشد</h3>
            <p className="text-gray-400">
              هنوز شرکتی در سیستم ثبت نشده است
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
