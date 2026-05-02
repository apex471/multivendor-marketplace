'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../../components/common/Header';
import Footer from '../../../../components/common/Footer';
import { getAuthToken } from '@/lib/api/auth';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE  = 5 * 1024 * 1024;  // 5 MB — matches server limit
const MAX_IMAGES     = 10;

const CATEGORIES = [
  'Dresses', 'Tops', 'Bottoms', 'Outerwear',
  'Shoes', 'Bags', 'Accessories', 'Jewelry',
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock: number;
  sku: string;
}

type UploadStatus = 'uploading' | 'done' | 'error';

interface UploadSlot {
  /** Local object-URL used only for preview while uploading */
  previewUrl: string;
  /** Cloudinary URL populated on success */
  remoteUrl:  string | null;
  status:     UploadStatus;
  error:      string | null;
  abortKey:   string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AddProductPage() {
  const router       = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortMap     = useRef<Map<string, AbortController>>(new Map());

  const [activeTab,   setActiveTab]   = useState<'basic' | 'images' | 'variants' | 'pricing' | 'inventory'>('basic');
  const [isSaving,    setIsSaving]    = useState(false);
  const [formError,   setFormError]   = useState('');
  const [isDragOver,  setIsDragOver]  = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', description: '', category: '', tags: '',
    regularPrice: '', salePrice: '', costPrice: '',
    sku: '', stock: '', lowStockAlert: '5',
  });

  const [slots,        setSlots]        = useState<UploadSlot[]>([]);
  const [primaryIndex, setPrimaryIndex] = useState(0);

  const [variants, setVariants] = useState<ProductVariant[]>([
    { id: '1', size: '', color: '', stock: 0, sku: '' },
  ]);

  // Abort all in-flight uploads on unmount to prevent state updates on dead components
  useEffect(() => {
    const map = abortMap.current;
    return () => { map.forEach(ctrl => ctrl.abort()); };
  }, []);

  // Derived: only successfully uploaded remote URLs
  const uploadedImages: string[] = slots
    .filter(s => s.status === 'done' && s.remoteUrl)
    .map(s => s.remoteUrl as string);

  const isUploading = slots.some(s => s.status === 'uploading');

  // ── Upload a single File ───────────────────────────────────────────────────
  const uploadFile = useCallback(async (file: File, abortKey: string) => {
    const token = getAuthToken();
    if (!token) { router.push('/auth/vendor/login'); return; }

    const ctrl = new AbortController();
    abortMap.current.set(abortKey, ctrl);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res  = await fetch('/api/upload', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
        signal:  ctrl.signal,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        const msg = json.error ?? `Server error ${res.status}`;
        setSlots(prev => prev.map(s =>
          s.abortKey === abortKey ? { ...s, status: 'error', error: msg } : s
        ));
        return;
      }

      setSlots(prev => prev.map(s =>
        s.abortKey === abortKey
          ? { ...s, status: 'done', remoteUrl: json.data.url as string, error: null }
          : s
      ));
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setSlots(prev => prev.map(s =>
        s.abortKey === abortKey ? { ...s, status: 'error', error: msg } : s
      ));
    } finally {
      abortMap.current.delete(abortKey);
    }
  }, [router]);

  // ── Validate and enqueue files ────────────────────────────────────────────
  const processFiles = useCallback((fileList: FileList | File[]) => {
    setUploadError(null);
    const files = Array.from(fileList);

    if (slots.length >= MAX_IMAGES) {
      setUploadError(`Maximum of ${MAX_IMAGES} images allowed.`);
      return;
    }

    const remaining = MAX_IMAGES - slots.length;
    const accepted: File[]   = [];
    const rejected: string[] = [];

    for (const file of files.slice(0, remaining)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        rejected.push(`"${file.name}" — unsupported type (use JPEG, PNG, WebP, or GIF)`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`"${file.name}" — exceeds 5 MB`);
        continue;
      }
      accepted.push(file);
    }

    if (rejected.length) setUploadError(rejected.join('\n'));
    if (!accepted.length) return;

    // Create optimistic preview slots before upload starts
    const newSlots: UploadSlot[] = accepted.map(file => ({
      previewUrl: URL.createObjectURL(file),
      remoteUrl:  null,
      status:     'uploading',
      error:      null,
      abortKey:   `${file.name}-${Date.now()}-${Math.random()}`,
    }));

    setSlots(prev => [...prev, ...newSlots]);
    newSlots.forEach((slot, i) => uploadFile(accepted[i], slot.abortKey));

    // Reset input so the same file can be re-selected after removal
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [slots.length, uploadFile]);

  // ── Input & drag handlers ─────────────────────────────────────────────────
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files);
  };

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true);  };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  };

  // ── Remove a slot — cancels if still in-flight, revokes blob URL ──────────
  const removeSlot = (index: number) => {
    setSlots(prev => {
      const slot = prev[index];
      abortMap.current.get(slot.abortKey)?.abort();
      if (slot.previewUrl.startsWith('blob:')) URL.revokeObjectURL(slot.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    setPrimaryIndex(prev => Math.max(0, prev > index ? prev - 1 : prev === index ? 0 : prev));
  };

  // ── Variants ──────────────────────────────────────────────────────────────
  const addVariant = () =>
    setVariants(prev => [...prev, { id: Date.now().toString(), size: '', color: '', stock: 0, sku: '' }]);

  const removeVariant = (id: string) => {
    if (variants.length > 1) setVariants(prev => prev.filter(v => v.id !== id));
  };

  const updateVariant = (id: string, field: keyof ProductVariant, value: string | number) =>
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (isDraft: boolean) => {
    setFormError('');
    if (!formData.name.trim())    { setFormError('Product name is required.');   return; }
    if (!formData.category)        { setFormError('Please select a category.');   return; }
    if (!formData.regularPrice || parseFloat(formData.regularPrice) <= 0) {
      setFormError('Please enter a valid price.');
      return;
    }
    if (isUploading) {
      setFormError('Please wait for all images to finish uploading.');
      return;
    }
    if (slots.filter(s => s.status === 'error').length > 0 && uploadedImages.length === 0 && !isDraft) {
      setFormError('All image uploads failed. Remove failed images or add new ones before publishing.');
      return;
    }

    const token = getAuthToken();
    if (!token) { router.push('/auth/vendor/login'); return; }

    // Ensure primary image is first in the array
    const safeIdx    = primaryIndex < uploadedImages.length ? primaryIndex : 0;
    const orderedImages = uploadedImages.length > 0
      ? [uploadedImages[safeIdx], ...uploadedImages.filter((_, i) => i !== safeIdx)]
      : [];

    setIsSaving(true);
    try {
      const res = await fetch('/api/vendor/products', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          formData.name.trim(),
          description:   formData.description.trim(),
          category:      formData.category,
          tags:          formData.tags,
          price:         parseFloat(formData.regularPrice),
          salePrice:     formData.salePrice  ? parseFloat(formData.salePrice)  : undefined,
          costPrice:     formData.costPrice  ? parseFloat(formData.costPrice)  : undefined,
          sku:           formData.sku.trim() || undefined,
          stock:         parseInt(formData.stock         || '0', 10),
          lowStockAlert: parseInt(formData.lowStockAlert || '5',  10),
          images:        orderedImages,
          variants,
          status:        isDraft ? 'draft' : 'pending',
        }),
      });

      const json = await res.json();
      if (!json.success) { setFormError(json.error ?? 'Failed to save product.'); return; }
      router.push('/vendor/products');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unexpected error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const profitMargin =
    formData.regularPrice && formData.costPrice && parseFloat(formData.regularPrice) > 0
      ? ((parseFloat(formData.regularPrice) - parseFloat(formData.costPrice))
          / parseFloat(formData.regularPrice) * 100).toFixed(1)
      : null;

  // ── Shared CSS helpers ────────────────────────────────────────────────────
  const inputCls = 'w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-600 transition';
  const labelCls = 'block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2';

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">Add New Product</h1>
          <p className="text-charcoal-600 dark:text-cool-gray-400">Fill in the details to add a product to your store</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* ── Sidebar ── */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4 sticky top-4">
              <nav className="space-y-2">
                {([
                  { id: 'basic',     label: 'Basic Info', icon: '📝' },
                  { id: 'images',    label: 'Images',     icon: '🖼️', badge: slots.length || undefined },
                  { id: 'variants',  label: 'Variants',   icon: '🎨' },
                  { id: 'pricing',   label: 'Pricing',    icon: '💰' },
                  { id: 'inventory', label: 'Inventory',  icon: '📦' },
                ] as { id: string; label: string; icon: string; badge?: number }[]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                      activeTab === tab.id
                        ? 'bg-gold-100 dark:bg-gold-900/30 text-gold-800 dark:text-gold-400'
                        : 'hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 text-charcoal-700 dark:text-cool-gray-400'
                    }`}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span className="font-semibold flex-1">{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span className="ml-auto text-xs bg-gold-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* ── Main Form ── */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">

              {/* Basic Info */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">Basic Information</h2>
                  <div>
                    <label className={labelCls}>Product Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Designer Silk Dress" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    <textarea value={formData.description}
                      onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                      placeholder="Describe your product…" rows={6} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Category <span className="text-red-500">*</span></label>
                    <select value={formData.category}
                      onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                      className={inputCls}>
                      <option value="">Select a category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Tags</label>
                    <input type="text" value={formData.tags}
                      onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))}
                      placeholder="summer, casual, trending (comma-separated)" className={inputCls} />
                    <p className="text-xs text-charcoal-500 dark:text-cool-gray-500 mt-1">Separate tags with commas</p>
                  </div>
                </div>
              )}

              {/* Images */}
              {activeTab === 'images' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">Product Images</h2>
                    <span className="text-sm text-cool-gray-500 dark:text-cool-gray-400">
                      {slots.length}/{MAX_IMAGES}
                    </span>
                  </div>

                  {/* Drop zone */}
                  {slots.length < MAX_IMAGES && (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                      aria-label="Upload product images"
                      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors select-none outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${
                        isDragOver
                          ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/10'
                          : 'border-cool-gray-300 dark:border-charcoal-700 hover:border-gold-400 dark:hover:border-gold-600 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700/40'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={ACCEPTED_TYPES.join(',')}
                        onChange={handleFileInputChange}
                        className="hidden"
                        aria-hidden="true"
                      />
                      <div className="text-5xl mb-3">{isDragOver ? '📂' : '📸'}</div>
                      <p className="font-semibold text-charcoal-900 dark:text-white mb-1">
                        {isDragOver ? 'Drop images here' : 'Click or drag & drop images'}
                      </p>
                      <p className="text-sm text-charcoal-500 dark:text-cool-gray-500">
                        JPEG, PNG, WebP, GIF · max 5 MB each · up to {MAX_IMAGES} images
                      </p>
                    </div>
                  )}

                  {/* Validation error banner */}
                  {uploadError && (
                    <div className="flex items-start gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm whitespace-pre-line">
                      <span className="mt-0.5">⚠️</span>
                      <span className="flex-1">{uploadError}</span>
                      <button onClick={() => setUploadError(null)} aria-label="Dismiss" className="font-bold hover:opacity-70">✕</button>
                    </div>
                  )}

                  {/* Image grid */}
                  {slots.length > 0 && (
                    <>
                      <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400">
                        Hover an image to set it as <span className="text-gold-500 font-semibold">Primary</span> or remove it. Primary image appears first in listings.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {slots.map((slot, index) => (
                          <div key={slot.abortKey} className="relative group">
                            {/* Thumbnail frame */}
                            <div className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
                              slot.status === 'error'
                                ? 'border-red-500'
                                : index === primaryIndex && slot.status === 'done'
                                ? 'border-gold-500'
                                : 'border-cool-gray-300 dark:border-charcoal-700'
                            }`}>
                              <Image
                                src={slot.remoteUrl ?? slot.previewUrl}
                                alt={`Product image ${index + 1}`}
                                fill
                                unoptimized={slot.status !== 'done'}
                                className={`object-cover transition-opacity duration-200 ${slot.status === 'uploading' ? 'opacity-40' : 'opacity-100'}`}
                              />

                              {/* Uploading spinner */}
                              {slot.status === 'uploading' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
                                  <svg className="animate-spin h-8 w-8 text-white drop-shadow" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                  </svg>
                                  <span className="text-white text-xs mt-1.5 font-semibold drop-shadow">Uploading…</span>
                                </div>
                              )}

                              {/* Error overlay */}
                              {slot.status === 'error' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/70 p-2 text-center">
                                  <span className="text-2xl">❌</span>
                                  <span className="text-white text-xs mt-1 leading-snug line-clamp-3">{slot.error}</span>
                                </div>
                              )}

                              {/* Primary badge */}
                              {index === primaryIndex && slot.status === 'done' && (
                                <div className="absolute top-2 left-2 bg-gold-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow-md">
                                  Primary
                                </div>
                              )}

                              {/* Cancel button visible during upload */}
                              {slot.status === 'uploading' && (
                                <button
                                  onClick={() => removeSlot(index)}
                                  title="Cancel upload"
                                  className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black transition-colors"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {/* Hover actions (done or error) */}
                            {slot.status !== 'uploading' && (
                              <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-2 p-2">
                                {slot.status === 'done' && index !== primaryIndex && (
                                  <button
                                    onClick={() => setPrimaryIndex(index)}
                                    className="w-full px-2 py-1.5 bg-gold-500 hover:bg-gold-400 text-charcoal-950 rounded-lg text-xs font-bold transition-colors"
                                  >
                                    ★ Set Primary
                                  </button>
                                )}
                                <button
                                  onClick={() => removeSlot(index)}
                                  className="w-full px-2 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors"
                                >
                                  🗑 Remove
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Status summary pills */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {uploadedImages.length > 0 && (
                          <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                            ✓ {uploadedImages.length} ready
                          </span>
                        )}
                        {slots.filter(s => s.status === 'uploading').length > 0 && (
                          <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full animate-pulse">
                            ↑ {slots.filter(s => s.status === 'uploading').length} uploading
                          </span>
                        )}
                        {slots.filter(s => s.status === 'error').length > 0 && (
                          <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                            ✗ {slots.filter(s => s.status === 'error').length} failed — remove and retry
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Variants */}
              {activeTab === 'variants' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">Product Variants</h2>
                    <button onClick={addVariant}
                      className="px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors text-sm font-semibold">
                      + Add Variant
                    </button>
                  </div>
                  <div className="space-y-4">
                    {variants.map((variant, index) => (
                      <div key={variant.id} className="border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-charcoal-900 dark:text-white">Variant {index + 1}</h3>
                          {variants.length > 1 && (
                            <button onClick={() => removeVariant(variant.id)}
                              className="text-red-600 dark:text-red-400 hover:underline text-sm">Remove</button>
                          )}
                        </div>
                        <div className="grid md:grid-cols-4 gap-4">
                          {(['size', 'color', 'sku'] as const).map(field => (
                            <div key={field}>
                              <label className={labelCls}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                              <input type="text" value={variant[field] as string}
                                onChange={e => updateVariant(variant.id, field, e.target.value)}
                                placeholder={field === 'size' ? 'S, M, L, XL' : field === 'color' ? 'Red, Blue…' : 'SKU-001'}
                                className={inputCls.replace('px-4 py-3', 'px-3 py-2')} />
                            </div>
                          ))}
                          <div>
                            <label className={labelCls}>Stock</label>
                            <input type="number" min={0} value={variant.stock}
                              onChange={e => updateVariant(variant.id, 'stock', parseInt(e.target.value) || 0)}
                              placeholder="0" className={inputCls.replace('px-4 py-3', 'px-3 py-2')} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing */}
              {activeTab === 'pricing' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">Pricing</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {([
                      { key: 'regularPrice', label: 'Regular Price', required: true,  hint: '' },
                      { key: 'salePrice',    label: 'Sale Price',    required: false, hint: 'Leave empty if not on sale' },
                      { key: 'costPrice',    label: 'Cost Price',    required: false, hint: 'Your cost to acquire/produce' },
                    ] as { key: string; label: string; required: boolean; hint: string }[]).map(({ key, label, required, hint }) => (
                      <div key={key}>
                        <label className={labelCls}>{label} {required && <span className="text-red-500">*</span>}</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-500 dark:text-cool-gray-400">$</span>
                          <input type="number" step="0.01" min="0"
                            value={formData[key as keyof typeof formData]}
                            onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
                            placeholder="0.00" className={`${inputCls} pl-8`} />
                        </div>
                        {hint && <p className="text-xs text-charcoal-500 dark:text-cool-gray-500 mt-1">{hint}</p>}
                      </div>
                    ))}
                    <div>
                      <label className={labelCls}>Profit Margin</label>
                      <div className="px-4 py-3 bg-cool-gray-50 dark:bg-charcoal-900 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg">
                        {profitMargin !== null ? (
                          <span className={`text-2xl font-bold ${parseFloat(profitMargin) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {profitMargin}%
                          </span>
                        ) : (
                          <span className="text-2xl font-bold text-cool-gray-400">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Inventory */}
              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">Inventory</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelCls}>SKU (Stock Keeping Unit)</label>
                      <input type="text" value={formData.sku}
                        onChange={e => setFormData(p => ({ ...p, sku: e.target.value }))}
                        placeholder="e.g., DRS-001" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Total Stock Quantity</label>
                      <input type="number" min={0} value={formData.stock}
                        onChange={e => setFormData(p => ({ ...p, stock: e.target.value }))}
                        placeholder="0" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Low Stock Alert Threshold</label>
                      <input type="number" min={1} value={formData.lowStockAlert}
                        onChange={e => setFormData(p => ({ ...p, lowStockAlert: e.target.value }))}
                        placeholder="5" className={inputCls} />
                      <p className="text-xs text-charcoal-500 dark:text-cool-gray-500 mt-1">
                        Get notified when stock drops below this number
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => router.push('/vendor/products')}
                className="px-6 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors text-charcoal-700 dark:text-cool-gray-300"
              >
                Cancel
              </button>

              <div className="flex flex-wrap items-center gap-3">
                {formError && (
                  <div className="flex items-start gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm max-w-xs">
                    <span>⚠️</span><span>{formError}</span>
                  </div>
                )}
                {isUploading && (
                  <span className="text-sm text-blue-600 dark:text-blue-400 animate-pulse">↑ Uploading images…</span>
                )}
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={isSaving || isUploading}
                  className="px-6 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-charcoal-700 dark:text-cool-gray-300"
                >
                  {isSaving ? 'Saving…' : 'Save as Draft'}
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={isSaving || isUploading}
                  className="px-6 py-3 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {isSaving ? 'Publishing…' : 'Publish Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
