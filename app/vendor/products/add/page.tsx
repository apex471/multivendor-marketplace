'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../../components/common/Header';
import Footer from '../../../../components/common/Footer';

interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock: number;
  sku: string;
}

export default function AddProductPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'basic' | 'images' | 'variants' | 'pricing' | 'inventory'>('basic');
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    tags: '',
    regularPrice: '',
    salePrice: '',
    costPrice: '',
    sku: '',
    stock: '',
    lowStockAlert: '5',
  });

  const [images, setImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [variants, setVariants] = useState<ProductVariant[]>([
    { id: '1', size: '', color: '', stock: 0, sku: '' }
  ]);

  const categories = [
    'Dresses',
    'Tops',
    'Bottoms',
    'Outerwear',
    'Shoes',
    'Bags',
    'Accessories',
    'Jewelry'
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Mock image upload - in production, upload to cloud storage
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (primaryImageIndex >= index && primaryImageIndex > 0) {
      setPrimaryImageIndex(prev => prev - 1);
    }
  };

  const addVariant = () => {
    setVariants(prev => [...prev, { id: Date.now().toString(), size: '', color: '', stock: 0, sku: '' }]);
  };

  const removeVariant = (id: string) => {
    if (variants.length > 1) {
      setVariants(prev => prev.filter(v => v.id !== id));
    }
  };

  const updateVariant = (id: string, field: keyof ProductVariant, value: string | number) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleSubmit = async (isDraft: boolean) => {
    // Validation
    if (!formData.name || !formData.category || !formData.regularPrice) {
      alert('Please fill in required fields: Name, Category, and Price');
      return;
    }

    setIsSaving(true);
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    const productData = {
      ...formData,
      images,
      primaryImageIndex,
      variants,
      status: isDraft ? 'draft' : 'active',
      createdAt: new Date().toISOString(),
    };

    console.log('Saving product:', productData);
    
    setIsSaving(false);
    router.push('/vendor/products');
  };

  const profitMargin = formData.regularPrice && formData.costPrice
    ? ((parseFloat(formData.regularPrice) - parseFloat(formData.costPrice)) / parseFloat(formData.regularPrice) * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">
            Add New Product
          </h1>
          <p className="text-charcoal-600 dark:text-cool-gray-400">
            Fill in the details to add a product to your store
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4 sticky top-4">
              <nav className="space-y-2">
                {[
                  { id: 'basic', label: 'Basic Info', icon: '📝' },
                  { id: 'images', label: 'Images', icon: '🖼️' },
                  { id: 'variants', label: 'Variants', icon: '🎨' },
                  { id: 'pricing', label: 'Pricing', icon: '💰' },
                  { id: 'inventory', label: 'Inventory', icon: '📦' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                      activeTab === tab.id
                        ? 'bg-gold-100 dark:bg-gold-900/30 text-gold-800 dark:text-gold-400'
                        : 'hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 text-charcoal-700 dark:text-cool-gray-400'
                    }`}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span className="font-semibold">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Form Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">
                    Basic Information
                  </h2>
                  
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Designer Silk Dress"
                      className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your product..."
                      rows={6}
                      className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                    >
                      <option value="">Select a category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="summer, casual, trending (comma-separated)"
                      className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                    />
                    <p className="text-xs text-charcoal-600 dark:text-cool-gray-500 mt-1">
                      Separate tags with commas
                    </p>
                  </div>
                </div>
              )}

              {/* Images Tab */}
              {activeTab === 'images' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">
                    Product Images
                  </h2>

                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      id="image-upload"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="text-6xl mb-4">📸</div>
                      <p className="text-charcoal-900 dark:text-white font-semibold mb-2">
                        Click to upload images
                      </p>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                        or drag and drop (PNG, JPG, GIF up to 10MB)
                      </p>
                    </label>
                  </div>

                  {/* Image Preview Grid */}
                  {images.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-charcoal-900 dark:text-white mb-3">
                        Uploaded Images ({images.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {images.map((img, index) => (
                          <div key={index} className="relative group">
                            <div className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-cool-gray-300 dark:border-charcoal-700">
                              <Image src={img} alt={`Product ${index + 1}`} fill className="object-cover" />
                              {index === primaryImageIndex && (
                                <div className="absolute top-2 left-2 bg-gold-600 text-white text-xs px-2 py-1 rounded">
                                  Primary
                                </div>
                              )}
                            </div>
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                              <button
                                onClick={() => setPrimaryImageIndex(index)}
                                className="px-3 py-1 bg-white text-charcoal-900 rounded text-sm font-semibold"
                              >
                                Set Primary
                              </button>
                              <button
                                onClick={() => removeImage(index)}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Variants Tab */}
              {activeTab === 'variants' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">
                      Product Variants
                    </h2>
                    <button
                      onClick={addVariant}
                      className="px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors text-sm font-semibold"
                    >
                      + Add Variant
                    </button>
                  </div>

                  <div className="space-y-4">
                    {variants.map((variant, index) => (
                      <div key={variant.id} className="border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-charcoal-900 dark:text-white">
                            Variant {index + 1}
                          </h3>
                          {variants.length > 1 && (
                            <button
                              onClick={() => removeVariant(variant.id)}
                              className="text-red-600 dark:text-red-400 hover:underline text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                              Size
                            </label>
                            <input
                              type="text"
                              value={variant.size}
                              onChange={(e) => updateVariant(variant.id, 'size', e.target.value)}
                              placeholder="S, M, L, XL"
                              className="w-full px-3 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                              Color
                            </label>
                            <input
                              type="text"
                              value={variant.color}
                              onChange={(e) => updateVariant(variant.id, 'color', e.target.value)}
                              placeholder="Red, Blue, etc."
                              className="w-full px-3 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                              Stock
                            </label>
                            <input
                              type="number"
                              value={variant.stock}
                              onChange={(e) => updateVariant(variant.id, 'stock', parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full px-3 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                              SKU
                            </label>
                            <input
                              type="text"
                              value={variant.sku}
                              onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                              placeholder="SKU-001"
                              className="w-full px-3 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Tab */}
              {activeTab === 'pricing' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">
                    Pricing
                  </h2>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                        Regular Price <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-600 dark:text-cool-gray-400">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.regularPrice}
                          onChange={(e) => setFormData({ ...formData, regularPrice: e.target.value })}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                        Sale Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-600 dark:text-cool-gray-400">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.salePrice}
                          onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                        />
                      </div>
                      <p className="text-xs text-charcoal-600 dark:text-cool-gray-500 mt-1">
                        Leave empty if not on sale
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                        Cost Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-600 dark:text-cool-gray-400">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.costPrice}
                          onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                        />
                      </div>
                      <p className="text-xs text-charcoal-600 dark:text-cool-gray-500 mt-1">
                        Your cost to acquire/produce
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                        Profit Margin
                      </label>
                      <div className="px-4 py-3 bg-cool-gray-50 dark:bg-charcoal-900 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg">
                        <span className="text-2xl font-bold text-gold-600">{profitMargin}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Inventory Tab */}
              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">
                    Inventory
                  </h2>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                        SKU (Stock Keeping Unit)
                      </label>
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="e.g., DRS-001"
                        className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                        Total Stock Quantity
                      </label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        placeholder="0"
                        className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                        Low Stock Alert Threshold
                      </label>
                      <input
                        type="number"
                        value={formData.lowStockAlert}
                        onChange={(e) => setFormData({ ...formData, lowStockAlert: e.target.value })}
                        placeholder="5"
                        className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                      />
                      <p className="text-xs text-charcoal-600 dark:text-cool-gray-500 mt-1">
                        Get notified when stock drops below this number
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => router.push('/vendor/products')}
                className="px-6 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={isSaving}
                  className="px-6 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={isSaving}
                  className="px-6 py-3 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors disabled:opacity-50 font-semibold"
                >
                  {isSaving ? 'Publishing...' : 'Publish Product'}
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
