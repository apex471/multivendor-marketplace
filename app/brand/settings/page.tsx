'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getAuthToken, getStoredUser, storeUser } from '@/lib/api/auth';

function UploadZone({
  label,
  hint,
  current,
  accept,
  onUploaded,
  shape,
}: {
  label: string;
  hint: string;
  current: string | null;
  accept: string;
  onUploaded: (url: string) => void;
  shape: 'circle' | 'banner';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(current);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { setPreview(current); }, [current]);

  const doUpload = async (file: File) => {
    setError('');
    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Not authenticated');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'profiles');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Upload failed');
      onUploaded(json.data.url);
    } catch (err: unknown) {
      setError((err as Error).message || 'Upload failed');
      setPreview(current);
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 15 * 1024 * 1024) { setError('Image must be under 15 MB.'); return; }
    doUpload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0] || null);
  };

  if (shape === 'banner') {
    return (
      <div>
        <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">{label}</label>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative h-40 rounded-2xl overflow-hidden cursor-pointer border-2 transition-all group
            ${dragOver ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20' : 'border-dashed border-cool-gray-300 dark:border-charcoal-600 hover:border-gold-400'}
          `}
        >
          {preview ? (
            <>
              <Image src={preview} alt={label} fill className="object-cover" unoptimized />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-semibold bg-black/50 px-4 py-2 rounded-full">
                  {uploading ? 'Uploading…' : 'Change Cover Photo'}
                </span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-charcoal-400 dark:text-cool-gray-500">
              {uploading ? (
                <svg className="w-8 h-8 animate-spin text-gold-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <span className="text-sm">Click or drag &amp; drop cover photo</span>
                  <span className="text-xs">{hint}</span>
                </>
              )}
            </div>
          )}
          {uploading && preview && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <svg className="w-8 h-8 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => handleFile(e.target.files?.[0] || null)} />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">{label}</label>
      <div className="flex items-start gap-5">
        <div
          onClick={() => inputRef.current?.click()}
          className="relative w-28 h-28 rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed border-cool-gray-300 dark:border-charcoal-600 hover:border-gold-400 transition-all group flex-shrink-0 bg-cool-gray-50 dark:bg-charcoal-700"
        >
          {preview ? (
            <>
              <Image src={preview} alt={label} fill className="object-cover" unoptimized />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-charcoal-400 dark:text-cool-gray-500">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/>
              </svg>
              <span className="text-[10px] font-medium">Upload</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
              <svg className="w-6 h-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          )}
        </div>
        <div className="text-sm text-charcoal-500 dark:text-cool-gray-400 pt-1">
          <p className="font-medium text-charcoal-700 dark:text-cool-gray-300 mb-1">Click the box to upload</p>
          <p>{hint}</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-2 px-3 py-1.5 text-xs font-semibold bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition-colors"
          >
            {uploading ? 'Uploading…' : 'Choose Photo'}
          </button>
          {error && <p className="mt-1.5 text-red-500 text-xs">{error}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => handleFile(e.target.files?.[0] || null)} />
    </div>
  );
}

export default function BrandSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'store' | 'profile' | 'password'>('store');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [storeData, setStoreData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    avatar: null as string | null,
    banner: null as string | null,
  });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    const token = getAuthToken();
    if (!token) { router.replace('/auth/brand/login'); return; }
    const u = getStoredUser();
    if (u) {
      setStoreData({
        firstName: u.firstName || '',
        lastName:  u.lastName  || '',
        bio:       u.bio       || '',
        avatar:    u.avatar    || null,
        banner:    u.banner    || null,
      });
    }
    // Also fetch fresh profile data
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.user) {
          const u2 = d.data.user;
          setStoreData(prev => ({
            ...prev,
            firstName: u2.firstName || prev.firstName,
            lastName:  u2.lastName  || prev.lastName,
            bio:       u2.bio       || prev.bio,
            avatar:    u2.avatar    || prev.avatar,
            banner:    u2.banner    || prev.banner,
          }));
        }
      })
      .catch(() => {});
  }, [router]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSaveStore = async () => {
    const token = getAuthToken();
    if (!token) { showMsg('error', 'Not authenticated'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName: storeData.firstName,
          lastName:  storeData.lastName,
          bio:       storeData.bio,
          avatar:    storeData.avatar,
          banner:    storeData.banner,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Save failed');
      const existing = getStoredUser();
      if (existing) storeUser({ ...existing, ...storeData });
      showMsg('success', '✅ Store profile saved — changes will appear live on your brand page!');
    } catch (err: unknown) {
      showMsg('error', (err as Error).message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMsg('error', 'Passwords do not match'); return;
    }
    const token = getAuthToken();
    if (!token) { showMsg('error', 'Not authenticated'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(passwordData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to change password');
      showMsg('success', 'Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      showMsg('error', (err as Error).message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'store' as const,    label: 'Store Appearance', icon: '🏪' },
    { id: 'profile' as const,  label: 'Business Info',    icon: '👤' },
    { id: 'password' as const, label: 'Password',          icon: '🔒' },
  ];

  return (
    <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-950">
      {/* Header */}
      <header className="bg-charcoal-900 dark:bg-charcoal-950 text-white border-b border-charcoal-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/brand/dashboard" className="text-charcoal-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold">Brand Settings</h1>
                <p className="text-xs text-charcoal-400">Manage your brand store profile</p>
              </div>
            </div>
            <Link href="/brand/dashboard" className="text-sm text-gold-400 hover:text-gold-300 transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white">Brand Settings</h2>
          <p className="text-charcoal-500 dark:text-cool-gray-400 mt-1">
            Customize how your brand appears to shoppers — upload your logo and cover photo to make a great first impression.
          </p>
        </div>

        {/* Alert Banner */}
        {!storeData.avatar && !storeData.banner && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl flex items-start gap-3">
            <span className="text-amber-500 text-xl flex-shrink-0">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Your store looks incomplete</p>
              <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">Upload your brand logo and cover photo to attract more customers and build trust.</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-sm border border-cool-gray-100 dark:border-charcoal-700 p-4 sticky top-24">
              <nav className="space-y-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all text-sm font-medium ${
                      activeTab === tab.id
                        ? 'bg-gold-600 text-white shadow-sm'
                        : 'text-charcoal-600 dark:text-cool-gray-400 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main */}
          <div className="lg:col-span-3 space-y-5">

            {/* Toast */}
            {msg && (
              <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
                msg.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700'
              }`}>
                {msg.type === 'success' ? '✅' : '❌'} {msg.text}
              </div>
            )}

            {/* Store Appearance Tab */}
            {activeTab === 'store' && (
              <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-sm border border-cool-gray-100 dark:border-charcoal-700 p-6 space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-1">Store Appearance</h3>
                  <p className="text-sm text-charcoal-500 dark:text-cool-gray-400">
                    These photos are displayed publicly on your brand page and in the brands directory.
                  </p>
                </div>

                {/* Brand Logo */}
                <UploadZone
                  label="Brand Logo"
                  hint="Recommended: 400×400px square, PNG or WebP with transparent background"
                  current={storeData.avatar}
                  accept="image/*"
                  shape="circle"
                  onUploaded={url => setStoreData(prev => ({ ...prev, avatar: url }))}
                />

                {/* Cover Photo */}
                <UploadZone
                  label="Cover / Banner Photo"
                  hint="Recommended: 1500×500px, JPEG or PNG — shown at the top of your brand page"
                  current={storeData.banner}
                  accept="image/*"
                  shape="banner"
                  onUploaded={url => setStoreData(prev => ({ ...prev, banner: url }))}
                />

                {/* Store Bio */}
                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                    Brand Description
                  </label>
                  <textarea
                    value={storeData.bio}
                    onChange={e => setStoreData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    placeholder="Tell shoppers about your brand, values, and what makes your products special…"
                    className="w-full px-4 py-3 border border-cool-gray-200 dark:border-charcoal-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white placeholder-charcoal-400 dark:placeholder-cool-gray-500 text-sm"
                  />
                  <p className="mt-1 text-xs text-charcoal-400 dark:text-cool-gray-500">{storeData.bio.length}/500 characters</p>
                </div>

                {/* Live Preview */}
                <div>
                  <p className="text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-3">Live Preview</p>
                  <div className="rounded-2xl overflow-hidden border border-cool-gray-200 dark:border-charcoal-700 shadow-md max-w-xs">
                    <div className="relative h-20 bg-gradient-to-br from-charcoal-800 to-charcoal-900">
                      {storeData.banner && (
                        <Image src={storeData.banner} alt="Banner" fill className="object-cover opacity-70" unoptimized />
                      )}
                      <div className="absolute top-3 right-3 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-semibold rounded-full">✓ Official</div>
                    </div>
                    <div className="p-4 bg-white dark:bg-charcoal-800">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl border-2 border-white shadow-md overflow-hidden bg-cool-gray-100 dark:bg-charcoal-700 flex items-center justify-center flex-shrink-0">
                          {storeData.avatar ? (
                            <Image src={storeData.avatar} alt="Logo" width={48} height={48} className="object-cover w-full h-full" unoptimized />
                          ) : (
                            <span className="text-lg font-bold text-gold-600">{storeData.firstName.charAt(0) || 'B'}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-charcoal-900 dark:text-white">{storeData.firstName || 'Your Brand'}</p>
                          <p className="text-xs text-charcoal-500 dark:text-cool-gray-400 line-clamp-1">{storeData.bio || 'Brand description…'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveStore}
                  disabled={saving}
                  className="w-full py-3 bg-gold-600 hover:bg-gold-700 active:scale-[0.99] text-white rounded-xl font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Saving…
                    </>
                  ) : (
                    'Save Store Profile'
                  )}
                </button>
              </div>
            )}

            {/* Business Info Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-sm border border-cool-gray-100 dark:border-charcoal-700 p-6 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-1">Business Information</h3>
                  <p className="text-sm text-charcoal-500 dark:text-cool-gray-400">Update your brand display name shown on the storefront.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">Brand Name (First)</label>
                    <input
                      type="text"
                      value={storeData.firstName}
                      onChange={e => setStoreData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-4 py-3 border border-cool-gray-200 dark:border-charcoal-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">Brand Name (Last / Suffix)</label>
                    <input
                      type="text"
                      value={storeData.lastName}
                      onChange={e => setStoreData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-4 py-3 border border-cool-gray-200 dark:border-charcoal-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">Brand Bio</label>
                  <textarea
                    value={storeData.bio}
                    onChange={e => setStoreData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    placeholder="Describe your brand…"
                    className="w-full px-4 py-3 border border-cool-gray-200 dark:border-charcoal-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white text-sm"
                  />
                </div>
                <button
                  onClick={handleSaveStore}
                  disabled={saving}
                  className="px-8 py-3 bg-gold-600 hover:bg-gold-700 text-white rounded-xl font-semibold transition-all disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-sm border border-cool-gray-100 dark:border-charcoal-700 p-6 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-1">Change Password</h3>
                  <p className="text-sm text-charcoal-500 dark:text-cool-gray-400">Keep your brand account secure.</p>
                </div>
                {['currentPassword', 'newPassword', 'confirmPassword'].map(field => (
                  <div key={field}>
                    <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                      {field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
                    </label>
                    <input
                      type="password"
                      value={passwordData[field as keyof typeof passwordData]}
                      onChange={e => setPasswordData(prev => ({ ...prev, [field]: e.target.value }))}
                      className="w-full px-4 py-3 border border-cool-gray-200 dark:border-charcoal-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white text-sm"
                    />
                  </div>
                ))}
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="px-8 py-3 bg-gold-600 hover:bg-gold-700 text-white rounded-xl font-semibold transition-all disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Update Password'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
