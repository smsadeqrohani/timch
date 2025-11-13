import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { usePermissions } from '../hooks/usePermissions';

type RawSizeType = 'mostatil' | 'morabba' | 'dayere' | 'gerd' | 'beyzi';
type SizeType = 'mostatil' | 'morabba' | 'gerd' | 'beyzi';

interface SizeDoc {
  _id: Id<'sizes'>;
  _creationTime: number;
  x: number;
  y: number;
  type: RawSizeType;
}

const typeOrder: Record<SizeType, number> = {
  mostatil: 0,
  morabba: 1,
  gerd: 2,
  beyzi: 3,
};

const typeLabels: Record<SizeType, string> = {
  mostatil: 'مستطیل',
  morabba: 'مربع',
  gerd: 'گرد',
  beyzi: 'بیضی',
};

const sizeTypeOptions: Array<{ value: SizeType; label: string }> = [
  { value: 'mostatil', label: typeLabels.mostatil },
  { value: 'morabba', label: typeLabels.morabba },
  { value: 'gerd', label: typeLabels.gerd },
  { value: 'beyzi', label: typeLabels.beyzi },
];

const toPersianDigits = (value: string): string =>
  value.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]).replace(/\./g, '٫');

const formatNumber = (value: number) => {
  const raw = value.toString().replace(/\.?0+$/, '');
  return toPersianDigits(raw);
};

const normalizeType = (type: RawSizeType): SizeType =>
  type === 'dayere' ? 'gerd' : type;

const getTypeLabel = (type: RawSizeType) => typeLabels[normalizeType(type)];

const formatSizeLabel = (size: SizeDoc) =>
  `${getTypeLabel(size.type)} ${formatNumber(size.x)}*${formatNumber(size.y)}`;

const numericInputProps = {
  inputMode: 'decimal' as const,
  pattern: '[0-9.]*',
};

const emptyFormState = { x: '', y: '', type: 'mostatil' as SizeType };

export default function SizesPage() {
  const sizes = useQuery(api.sizes.list);
  const createSize = useMutation(api.sizes.create);
  const updateSize = useMutation(api.sizes.update);
  const removeSize = useMutation(api.sizes.remove);
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission('sizes:create');
  const canEdit = hasPermission('sizes:edit');
  const canDelete = hasPermission('sizes:delete');

  const [formState, setFormState] = useState(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<Id<'sizes'> | null>(null);
  const [editFormState, setEditFormState] = useState(emptyFormState);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const sortedSizes = useMemo(() => {
    if (!sizes) return [];
    return sizes
      .map((size) => ({
        ...size,
        type: normalizeType(size.type),
      }))
      .sort((a, b) => {
        if (a.type === b.type) {
          if (a.x === b.x) return a.y - b.y;
          return a.x - b.x;
        }
        return typeOrder[a.type] - typeOrder[b.type];
      });
  }, [sizes]);

  const resetForm = () => {
    setFormState(emptyFormState);
    setError(null);
  };

  const resetEditState = () => {
    setEditingId(null);
    setEditFormState(emptyFormState);
    setEditError(null);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreate || isSubmitting) return;
    const x = Number(formState.x);
    const y = Number(formState.y);
    if (!Number.isFinite(x) || x <= 0 || !Number.isFinite(y) || y <= 0) {
      setError('لطفاً مقادیر معتبر برای طول و عرض وارد کنید');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createSize({
        x,
        y,
        type: formState.type,
      });
      resetForm();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (size: SizeDoc) => {
    setEditingId(size._id);
    setEditFormState({
      x: size.x.toString(),
      y: size.y.toString(),
      type: normalizeType(size.type),
    });
    setEditError(null);
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId || !canEdit || isEditSubmitting) return;
    const x = Number(editFormState.x);
    const y = Number(editFormState.y);
    if (!Number.isFinite(x) || x <= 0 || !Number.isFinite(y) || y <= 0) {
      setEditError('لطفاً مقادیر معتبر برای طول و عرض وارد کنید');
      return;
    }
    setIsEditSubmitting(true);
    setEditError(null);
    try {
      await updateSize({
        id: editingId,
        x,
        y,
        type: editFormState.type,
      });
      resetEditState();
    } catch (err) {
      setEditError((err as Error).message);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDelete = async (id: Id<'sizes'>) => {
    if (!canDelete) return;
    const confirmDelete = window.confirm('آیا از حذف این سایز مطمئن هستید؟');
    if (!confirmDelete) return;
    try {
      await removeSize({ id });
      if (editingId === id) {
        resetEditState();
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100">مدیریت اندازه‌ها</h2>
      </div>

      <div className="glass-card p-6 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-100">افزودن سایز جدید</h3>
        </div>

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">طول (X)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formState.x}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, x: event.target.value }))
              }
              className="auth-input-field"
              placeholder="مثلاً 200"
              {...numericInputProps}
              disabled={!canCreate}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">عرض (Y)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formState.y}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, y: event.target.value }))
              }
              className="auth-input-field"
              placeholder="مثلاً 300"
              {...numericInputProps}
              disabled={!canCreate}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">نوع شکل</label>
            <select
              value={formState.type}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  type: event.target.value as SizeType,
                }))
              }
              className="auth-input-field"
              disabled={!canCreate}
            >
              {sizeTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!canCreate || isSubmitting}
              className="auth-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'در حال ثبت...' : 'ثبت سایز'}
            </button>
          </div>
        </form>
        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-900/30 border border-red-500/30 text-red-200 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="glass-card p-6 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-100">لیست اندازه‌ها</h3>
        </div>

        {sizes === undefined ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-transparent border-blue-400"></div>
          </div>
        ) : sortedSizes.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            هنوز هیچ سایزی ثبت نشده است.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-300">
                  <th className="py-2 text-right">نوع</th>
                  <th className="py-2 text-right">طول (X)</th>
                  <th className="py-2 text-right">عرض (Y)</th>
                  <th className="py-2 text-right">تاریخ ثبت</th>
                  {(canEdit || canDelete) && <th className="py-2 text-right">عملیات</th>}
                </tr>
              </thead>
              <tbody>
                {sortedSizes.map((size) => {
                  const isEditing = editingId === size._id;
                  return (
                    <tr
                      key={size._id}
                      className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="py-2 text-gray-100">
                        {isEditing ? (
                          <select
                            value={editFormState.type}
                            onChange={(event) =>
                              setEditFormState((prev) => ({
                                ...prev,
                                type: event.target.value as SizeType,
                              }))
                            }
                            className="auth-input-field bg-gray-800 border-gray-700"
                            disabled={!canEdit}
                          >
                            {sizeTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="space-y-1">
                            <span>{getTypeLabel(size.type)}</span>
                            <span className="block text-xs text-gray-400">
                              {formatSizeLabel(size)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-gray-100">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editFormState.x}
                            onChange={(event) =>
                              setEditFormState((prev) => ({
                                ...prev,
                                x: event.target.value,
                              }))
                            }
                            className="auth-input-field bg-gray-800 border-gray-700"
                            {...numericInputProps}
                            disabled={!canEdit}
                          />
                        ) : (
                          formatNumber(size.x)
                        )}
                      </td>
                      <td className="py-2 text-gray-100">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editFormState.y}
                            onChange={(event) =>
                              setEditFormState((prev) => ({
                                ...prev,
                                y: event.target.value,
                              }))
                            }
                            className="auth-input-field bg-gray-800 border-gray-700"
                            {...numericInputProps}
                            disabled={!canEdit}
                          />
                        ) : (
                          formatNumber(size.y)
                        )}
                      </td>
                      <td className="py-2 text-gray-400">
                        {new Date(size._creationTime).toLocaleDateString('fa-IR')}
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="py-2 text-gray-200">
                          {isEditing ? (
                            <form
                              onSubmit={handleEditSubmit}
                              className="flex items-center gap-2"
                            >
                              <button
                                type="submit"
                                disabled={!canEdit || isEditSubmitting}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                              >
                                {isEditSubmitting ? 'در حال ذخیره...' : 'ذخیره'}
                              </button>
                              <button
                                type="button"
                                onClick={resetEditState}
                                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs"
                              >
                                انصراف
                              </button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-2">
                              {canEdit && (
                                <button
                                  onClick={() => startEditing(size)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                                >
                                  ویرایش
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(size._id)}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                                >
                                  حذف
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {editError && (
          <div className="mt-3 p-3 rounded-lg bg-red-900/30 border border-red-500/30 text-red-200 text-sm">
            {editError}
          </div>
        )}
      </div>
    </div>
  );
}

