import React, { useState } from 'react';
import CompaniesList from './CompaniesList';
import CollectionsList from './CollectionsList';
import CollectionView from './CollectionView';
import { Id } from '../../convex/_generated/dataModel';

type ViewMode = 'companies' | 'collections' | 'collection';

export default function CatalogMain() {
  const [viewMode, setViewMode] = useState<ViewMode>('companies');
  const [selectedCompanyId, setSelectedCompanyId] = useState<Id<"companies"> | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<Id<"collections"> | null>(null);
  const [selectedCollectionName, setSelectedCollectionName] = useState<string>('');

  const handleSelectCompany = (companyId: Id<"companies">, companyName: string) => {
    setSelectedCompanyId(companyId);
    setSelectedCompanyName(companyName);
    setViewMode('collections');
    // Reset collection selection when changing company
    setSelectedCollectionId(null);
    setSelectedCollectionName('');
  };

  const handleSelectCollection = (collectionId: Id<"collections">, collectionName: string) => {
    setSelectedCollectionId(collectionId);
    setSelectedCollectionName(collectionName);
    setViewMode('collection');
  };

  const handleBackToCompanies = () => {
    setViewMode('companies');
    setSelectedCompanyId(null);
    setSelectedCompanyName('');
    setSelectedCollectionId(null);
    setSelectedCollectionName('');
  };

  const handleBackToCollections = () => {
    setViewMode('collections');
    setSelectedCollectionId(null);
    setSelectedCollectionName('');
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800/50 shadow-sm border-b border-gray-700/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent from-blue-400 to-purple-400">کاتالوگ محصولات فرش</h1>
              <p className="text-gray-300 mt-1">مدیریت و مشاهده محصولات</p>
            </div>
            
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-gray-800/30 border-b border-gray-700/50">
        <div className="container mx-auto px-6 py-3">
          <nav className="flex items-center space-x-2 space-x-reverse text-sm">
            <button
              onClick={handleBackToCompanies}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'companies'
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-400 hover:text-blue-300 hover:bg-blue-600/20'
              }`}
            >
              شرکت‌ها
            </button>
            
            {/* Show company name when viewing collections or collection detail */}
            {(viewMode === 'collections' || viewMode === 'collection') && selectedCompanyName && (
              <>
                <span className="text-gray-500">&gt;</span>
                <button
                  onClick={handleBackToCollections}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    viewMode === 'collections'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-400 hover:text-blue-300 hover:bg-blue-600/20'
                  }`}
                >
                  {selectedCompanyName}
                </button>
              </>
            )}
            
            {/* Show collection name when viewing collection detail */}
            {viewMode === 'collection' && selectedCollectionName && (
              <>
                <span className="text-gray-500">&gt;</span>
                <span className="px-3 py-1 rounded-lg bg-gray-600 text-white">
                  {selectedCollectionName}
                </span>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {viewMode === 'companies' && (
          <CompaniesList
            onSelectCompany={handleSelectCompany}
            selectedCompany={selectedCompanyName}
          />
        )}

        {viewMode === 'collections' && selectedCompanyId && (
          <CollectionsList
            onSelectCollection={handleSelectCollection}
            selectedCollection={selectedCollectionName}
            companyId={selectedCompanyId}
          />
        )}

        {viewMode === 'collection' && selectedCollectionId && selectedCollectionName && (
          <CollectionView 
            collectionId={selectedCollectionId} 
            collectionName={selectedCollectionName} 
          />
        )}
      </div>
    </div>
  );
}
