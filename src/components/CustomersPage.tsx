import React from 'react';
import { CustomerList } from './CustomerList';

export const CustomersPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <CustomerList />
      </div>
    </div>
  );
};
