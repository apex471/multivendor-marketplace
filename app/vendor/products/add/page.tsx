'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../../components/common/Header';
import Footer from '../../../../components/common/Footer';
import { getAuthToken } from '@/lib/api/auth';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-msvideo', 'video/mpeg'];
const MAX_IMAGE_SIZE = 5   * 1024 * 1024;  //   5 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;  // 100 MB
const MAX_IMAGES = 10;
const MAX_VIDEOS = 3;

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
type MediaKind    = 'image' | 'video';

interface UploadSlot {
  previewUrl: string;       // blob URL for immediate preview
  remoteUrl:  string | null; // Cloudinary URL on success
  status:     UploadStatus;
  error:      string | null;
  abortKey:   string;
  kind:       MediaKind;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AddProductPage() {
  const router          = useRouter();
  const imageInputRef   = useRef<HTMLInputElement>(null);
  const videoInputRef   = useRef<HTMLInputElement>(null);
  const abortMap        = useRef<Map<string, AbortController>>(new Map());

  const [activeTab,   setActiveTab]   = useState<'basic' | 'media' | 'variants' | 'pricing' | 'inventory'>('basic');
  const [isSaving,    setIsSaving]    = useState(false);
  const [formError,   setFormError]   = useState('');
  const [imageDragOver, setImageDragOver] = useState(false);
  const [videoDragOver, setVideoDragOver] = useState(false);
  const [mediaError,  setMediaError]  = useState<string | null>(null);

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

  // Derived slices
  const imageSlots   = slots.filter(s => s.kind === 'image');
  const videoSlots   = slots.filter(s => s.kind === 'video');
  const uploadedImgs = imageSlots.filter(s => s.status === 'done' && s.remoteUrl).map(s => s.remoteUrl as string);
  const uploadedVids = videoSlots.filter(s => s.status === 'done' && s.remoteUrl).map(s => s.remoteUrl as string);
  const isUploading  = slots.some(s => s.status === 'uploading');
  const mediaBadge   = slots.length || undefined;

  // ── Upload a single file ──────────────────────────────────────────────────
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
        setSlots(prev => prev.map(s =>
          s.abortKey === abortKey ? { ...s, status: 'error', error: json.error ?? `Server error ${res.status}` } : s
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
      setSlots(prev => prev.map(s =>
        s.abortKey === abortKey ? { ...s, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' } : s
      ));
    } finally {
      abortMap.current.delete(abortKey);
    }
  }, [router]);

  // ── Validate and enqueue files of a given kind ────────────────────────────
  const processFiles = useCallback((fileList: FileList | File[], kind: MediaKind) => {
    setMediaError(null);

    const acceptedTypes = kind === 'image' ? ACCEPTED_IMAGE_TYPES : ACCEPTED_VIDEO_TYPES;
    const maxSize       = kind === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    const maxCount      = kind === 'image' ? MAX_IMAGES : MAX_VIDEOS;
    const currentCount  = kind === 'image' ? slots.filter(s => s.kind === 'image').length : slots.filter(s => s.kind === 'video').length;

    if (currentCount >= maxCount) {
      setMediaError(`Maximum of ${maxCount} ${kind}s allowed.`);
      return;
    }

    const remaining = maxCount - currentCount;
    const files     = Array.from(fileList);
    const accepted: File[]   = [];
    const rejected: string[] = [];

    for (const file of files.slice(0, remaining)) {
      if (!acceptedTypes.includes(file.type)) {
        rejected.push(`"${file.name}" — unsupported format`);
        continue;
      }
      if (file.size > maxSize) {
        rejected.push(`"${file.name}" — exceeds ${kind === 'video' ? '100 MB' : '5 MB'} limit`);
        continue;
      }
      accepted.push(file);
    }

    if (rejected.length) setMediaError(rejected.join('\n'));
    if (!accepted.length) return;

    const newSlots: UploadSlot[] = accepted.map(file => ({
      previewUrl: URL.createObjectURL(file),
      remoteUrl:  null,
      status:     'uploading',
      error:      null,
      kind,
      abortKey:   `${kind}-${file.name}-${Date.now()}-${Math.random()}`,
    }));

    setSlots(prev => [...prev, ...newSlots]);
    newSlots.forEach((slot, i) => uploadFile(accepted[i], slot.abortKey));

    if (kind === 'image' && imageInputRef.current) imageInputRef.current.value = '';
    if (kind === 'video' && videoInputRef.current) videoInputRef.current.value = '';
  }, [slots, uploadFile]);

  // ── Remove a slot ─────────────────────────────────────────────────────────
  const removeSlot = useCallback((abortKey: string) => {
    setSlots(prev => {
      const slot = prev.find(s => s.abortKey === abortKey);
      if (!slot) return prev;
      abortMap.current.get(slot.abortKey)?.abort();
      if (slot.previewUrl.startsWith('blob:')) URL.revokeObjectURL(slot.previewUrl);
      return prev.filter(s => s.abortKey !== abortKey);
    });
    setPrimaryIndex(prev => Math.max(0, prev - 1 < 0 ? 0 : prev));
  }, []);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const imageDragHandlers = {
    onDragOver:  (e: React.DragEvent) => { e.preventDefault(); setImageDragOver(true);  },
    onDragLeave: (e: React.DragEvent) => { e.preventDefault(); setImageDragOver(false); },
    onDrop:      (e: React.DragEvent) => { e.preventDefault(); setImageDragOver(false); if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files, 'image'); },
  };
  const videoDragHandlers = {
    onDragOver:  (e: React.DragEvent) => { e.preventDefault(); setVideoDragOver(true);  },
    onDragLeave: (e: React.DragEvent) => { e.preventDefault(); setVideoDragOver(false); },
    onDrop:      (e: React.DragEvent) => { e.preventDefault(); setVideoDragOver(false); if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files, 'video'); },
  };

  // ── Variants ──────────────────────────────────────────────────────────────
  const addVariant = () =>
    setVariants(prev => [...prev, { id: Date.now().toString(), size: '', color: '', stock: 0, sku: '' }]);

  const removeVariant = (id: string) => {
    if (variants.length > 1) setVariants(prev => prev.filter(v => v.id !== id));
  };

  const updateVariant = (id: string, field: keyof ProductVariant, value: string | number) =>
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (isDraft: boolean) => {
    setFormError('');
    if (!formData.name.trim())    { setFormError('Product name is required.');  return; }
    if (!formData.category)        { setFormError('Please select a category.');  return; }
    if (!formData.regularPrice || parseFloat(formData.regularPrice) <= 0) {
      setFormError('Please enter a valid price.');
      return;
    }
    if (isUploading) { setFormError('Please wait for all uploads to finish.'); return; }

    const token = getAuthToken();
    if (!token) { router.push('/auth/vendor/login'); return; }

    const safeIdx       = primaryIndex < uploadedImgs.length ? primaryIndex : 0;
    const orderedImages = uploadedImgs.length > 0
      ? [uploadedImgs[safeIdx], ...uploadedImgs.filter((_, i) => i !== safeIdx)]
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
          videos:        uploadedVids,
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

  const inputCls = 'w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-600 transition';
  const labelCls = 'block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2';

  // ── Reusable slot grid ────────────────────────────────────────────────────
  const SlotGrid = ({ kind }: { kind: MediaKind }) => {
    const kindSlots = slots.filter(s => s.kind === kind);
    if (kindSlots.length === 0) return null;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {kindSlots.map((slot, idx) => (
          <div key={slot.abortKey} className="relative group">
            <div className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
              slot.status === 'error' ? 'border-red-500'
              : kind === 'image' && idx === primaryIndex && slot.status === 'done' ? 'border-gold-500'
              : 'border-cool-gray-300 dark:border-charcoal-700'
            }`}>
              {kind === 'image' ? (
                <Image src={slot.remoteUrl ?? slot.previewUrl} alt={`Image ${idx + 1}`} fill unoptimized={slot.status !== 'done'}
                  className={`object-cover transition-opacity duration-200 ${slot.status === 'uploading' ? 'opacity-40' : ''}`} />
              ) : (
                <video src={slot.remoteUrl ?? slot.previewUrl} muted playsInline
                  className={`w-full h-full object-cover transition-opacity ${slot.status === 'uploading' ? 'opacity-40' : ''}`}
                  onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
                  onMouseLeave={e => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
              )}
              {slot.status === 'uploading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25">
                  <svg className="animate-spin h-8 w-8 text-white drop-shadow" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span className="text-white text-xs mt-1.5 font-semibold drop-shadow">Uploading…</span>
                </div>
              )}
              {slot.status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/70 p-2 text-center">
                  <span className="text-2xl">❌</span>
                  <span className="text-white text-xs mt-1 leading-snug">{slot.error}</span>
                </div>
              )}
              {kind === 'image' && idx === primaryIndex && slot.status === 'done' && (
                <div className="absolute top-2 left-2 bg-gold-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow-md">Primary</div>
              )}
              {kind === 'video' && slot.status === 'done' && (
                <div className="absolute top-2 left-2 bg-charcoal-900/70 text-white text-xs px-2 py-0.5 rounded-full font-semibold">🎬 Video</div>
              )}
              {slot.status === 'uploading' && (
                <button onClick={() => removeSlot(slot.abortKey)} title="Cancel"
                  className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black">✕</button>
              )}
            </div>
            {slot.status !== 'uploading' && (
              <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-2 p-2">
                {kind === 'image' && slot.status === 'done' && idx !== primaryIndex && (
                  <button onClick={() => setPrimaryIndex(slots.filter(s => s.kind === 'image').indexOf(slot))}
                    className="w-full px-2 py-1.5 bg-gold-500 hover:bg-gold-400 text-charcoal-950 rounded-lg text-xs font-bold transition-colors">★ Set Primary</button>
                )}
                <button onClick={() => removeSlot(slot.abortKey)}
                  className="w-full px-2 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors">🗑 Remove</button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

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
                  { id: 'basic',     label: 'Basic Info',      icon: '📝' },
                  { id: 'media',     label: 'Photos & Videos', icon: '🎬', badge: mediaBadge },
                  { id: 'variants',  label: 'Variants',        icon: '🎨' },
                  { id: 'pricing',   label: 'Pricing',         icon: '💰' },
                  { id: 'inventory', label: 'Inventory',       icon: '📦' },
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
                      <span className="ml-auto text-xs bg-gold-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">{tab.badge}</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* ── Main Form ── */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">

              {/* ── Basic Info ── */}
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

              {/* ── Photos & Videos ── */}
              {activeTab === 'media' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">Photos &amp; Videos</h2>

                  {mediaError && (
                    <div className="flex items-start gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm whitespace-pre-line">
                      <span className="mt-0.5">⚠️</span>
                      <span className="flex-1">{mediaError}</span>
                      <button onClick={() => setMediaError(null)} className="font-bold hover:opacity-70">✕</button>
                    </div>
                  )}

                  {/* Images section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-charcoal-900 dark:text-white">Product Images</h3>
                        <p className="text-xs text-cool-gray-500 mt-0.5">JPEG, PNG, WebP, GIF · max 5 MB · up to {MAX_IMAGES}</p>
                      </div>
                      <span className="text-sm text-cool-gray-500">{imageSlots.length}/{MAX_IMAGES}</span>
                    </div>
                    {imageSlots.length < MAX_IMAGES && (
                      <div {...imageDragHandlers} onClick={() => imageInputRef.current?.click()} role="button" tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && imageInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors select-none outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${
                          imageDragOver ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/10'
                            : 'border-cool-gray-300 dark:border-charcoal-700 hover:border-gold-400 dark:hover:border-gold-600 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700/40'
                        }`}>
                        <input ref={imageInputRef} type="file" multiple accept={ACCEPTED_IMAGE_TYPES.join(',')}
                          onChange={e => { if (e.target.files?.length) processFiles(e.target.files, 'image'); }} className="hidden" />
                        <div className="text-4xl mb-2">{imageDragOver ? '📂' : '📸'}</div>
                        <p className="font-semibold text-charcoal-900 dark:text-white text-sm">
                          {imageDragOver ? 'Drop images here' : 'Click or drag & drop images'}
                        </p>
                      </div>
                    )}
                    <SlotGrid kind="image" />
                    {imageSlots.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {uploadedImgs.length > 0 && <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">✓ {uploadedImgs.length} ready</span>}
                        {imageSlots.filter(s => s.status === 'uploading').length > 0 && <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full animate-pulse">↑ {imageSlots.filter(s => s.status === 'uploading').length} uploading</span>}
                        {imageSlots.filter(s => s.status === 'error').length > 0 && <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">✗ {imageSlots.filter(s => s.status === 'error').length} failed</span>}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-cool-gray-200 dark:border-charcoal-700" />

                  {/* Videos section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-charcoal-900 dark:text-white">Product Videos</h3>
                        <p className="text-xs text-cool-gray-500 mt-0.5">MP4, WebM, MOV, OGG · max 100 MB · up to {MAX_VIDEOS}</p>
                      </div>
                      <span className="text-sm text-cool-gray-500">{videoSlots.length}/{MAX_VIDEOS}</span>
                    </div>
                    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg text-blue-700 dark:text-blue-300 text-xs">
                      💡 Short product demo videos (15–60 s) significantly boost conversion. Videos are processed by Cloudinary after upload.
                    </div>
                    {videoSlots.length < MAX_VIDEOS && (
                      <div {...videoDragHandlers} onClick={() => videoInputRef.current?.click()} role="button" tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && videoInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors select-none outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${
                          videoDragOver ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/10'
                            : 'border-cool-gray-300 dark:border-charcoal-700 hover:border-gold-400 dark:hover:border-gold-600 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700/40'
                        }`}>
                        <input ref={videoInputRef} type="file" multiple accept={ACCEPTED_VIDEO_TYPES.join(',')}
                          onChange={e => { if (e.target.files?.length) processFiles(e.target.files, 'video'); }} className="hidden" />
                        <div className="text-4xl mb-2">{videoDragOver ? '📂' : '🎬'}</div>
                        <p className="font-semibold text-charcoal-900 dark:text-white text-sm">
                          {videoDragOver ? 'Drop videos here' : 'Click or drag & drop videos'}
                        </p>
                      </div>
                    )}
                    <SlotGrid kind="video" />
                    {videoSlots.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {uploadedVids.length > 0 && <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">✓ {uploadedVids.length} ready</span>}
                        {videoSlots.filter(s => s.status === 'uploading').length > 0 && <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full animate-pulse">↑ {videoSlots.filter(s => s.status === 'uploading').length} uploading — large files may take a moment</span>}
                        {videoSlots.filter(s => s.status === 'error').length > 0 && <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">✗ {videoSlots.filter(s => s.status === 'error').length} failed</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Variants ── */}
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

              {/* ── Pricing ── */}
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

              {/* ── Inventory ── */}
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

            {/* ── Action Buttons ── */}
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
                  <span className="text-sm text-blue-600 dark:text-blue-400 animate-pulse">↑ Uploading media…</span>
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
