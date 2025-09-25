import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function PermissionSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const setupSuperAdminSystem = useMutation(api.roles.setupSuperAdminSystem);

  const handleSetup = async () => {
    setIsLoading(true);
    setError('');
    setResult('');

    try {
      const setupResult = await setupSuperAdminSystem();
      setResult(`✅ سیستم مجوزها راه‌اندازی شد!
      
📊 نتایج:
- شناسه نقش: ${setupResult.roleId}
- تعداد کل کاربران: ${setupResult.totalUsers}
- کاربران جدید: ${setupResult.newlyAssigned}
- کاربران قبلی: ${setupResult.alreadyAssigned}

حالا می‌توانید از تمام بخش‌های سیستم استفاده کنید.`);
    } catch (err: any) {
      setError(`❌ خطا در راه‌اندازی: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="glass-card p-6 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-200">راه‌اندازی سیستم مجوزها</h2>
        
        <div className="space-y-4">
          <p className="text-gray-300">
            اگر پیام "دسترسی محدود" می‌بینید، این دکمه را فشار دهید تا سیستم مجوزها راه‌اندازی شود.
          </p>
          
          <button
            onClick={handleSetup}
            disabled={isLoading}
            className="auth-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'در حال راه‌اندازی...' : 'راه‌اندازی سیستم مجوزها'}
          </button>

          {result && (
            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
              <pre className="text-green-400 whitespace-pre-wrap text-sm">{result}</pre>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
