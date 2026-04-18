'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { getAuthToken } from '../../../lib/api/auth';

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
}

export default function CreateStoryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mediaFile, setMediaFile] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [filter, setFilter] = useState<string>('none');
  const [duration, setDuration] = useState<number>(5);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [currentColor, setCurrentColor] = useState('#FFFFFF');
  const [currentFontSize, setCurrentFontSize] = useState(24);
  const [currentFontFamily, setCurrentFontFamily] = useState('Arial');
  const [isPublishing, setIsPublishing] = useState(false);

  const filters = [
    { id: 'none', name: 'Original', filter: 'none' },
    { id: 'grayscale', name: 'B&W', filter: 'grayscale(100%)' },
    { id: 'sepia', name: 'Sepia', filter: 'sepia(100%)' },
    { id: 'saturate', name: 'Vivid', filter: 'saturate(200%)' },
    { id: 'contrast', name: 'Contrast', filter: 'contrast(150%)' },
    { id: 'brightness', name: 'Bright', filter: 'brightness(120%)' },
    { id: 'warm', name: 'Warm', filter: 'sepia(50%) saturate(150%)' },
    { id: 'cool', name: 'Cool', filter: 'hue-rotate(180deg) saturate(120%)' },
  ];

  const fontFamilies = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Courier New',
    'Verdana',
    'Impact',
    'Comic Sans MS',
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('video/') ? 'video' : null;
    
    if (!fileType) {
      alert('Please select an image or video file');
      return;
    }

    const url = URL.createObjectURL(file);
    setMediaFile(url);
    setMediaType(fileType);
  };

  const handleAddText = () => {
    if (!currentText.trim()) return;

    const newOverlay: TextOverlay = {
      id: Date.now().toString(),
      text: currentText,
      x: 50,
      y: 50,
      fontSize: currentFontSize,
      color: currentColor,
      fontFamily: currentFontFamily,
    };

    setTextOverlays([...textOverlays, newOverlay]);
    setCurrentText('');
    setShowTextEditor(false);
  };

  const handleRemoveText = (id: string) => {
    setTextOverlays(textOverlays.filter(overlay => overlay.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const handlePublish = async () => {
    if (!mediaFile) {
      alert('Please select a media file');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      alert('Please log in to publish a story');
      return;
    }

    setIsPublishing(true);
    try {
      // Upload the media file
      const uploadFormData = new FormData();
      // mediaFile is an object URL — fetch it back as a blob to upload
      const blob = await fetch(mediaFile).then(r => r.blob());
      uploadFormData.append('file', blob, `story.${mediaType === 'video' ? 'mp4' : 'jpg'}`);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadFormData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadJson.success) throw new Error(uploadJson.error ?? 'Upload failed');

      const mediaUrl: string = uploadJson.data.url;

      // Create the story
      const storyRes = await fetch('/api/stories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrls: [mediaUrl],
          mediaTypes: [mediaType ?? 'image'],
          filter,
          duration,
          textOverlays,
        }),
      });
      const storyJson = await storyRes.json();
      if (!storyJson.success) throw new Error(storyJson.error ?? 'Story creation failed');

      router.push('/feed');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish story');
    } finally {
      setIsPublishing(false);
    }
  };

  const getFilterStyle = (filterId: string) => {
    const filterObj = filters.find(f => f.id === filterId);
    return filterObj ? filterObj.filter : 'none';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">
              Create Story
            </h1>
            <p className="text-charcoal-600 dark:text-cool-gray-400">
              Share your fashion moment with your followers
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Preview Section */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">
                Preview
              </h2>

              {/* Story Preview */}
              <div className="relative aspect-[9/16] max-h-[600px] bg-charcoal-900 rounded-lg overflow-hidden mx-auto max-w-[340px]">
                {mediaFile ? (
                  <>
                    {mediaType === 'image' ? (
                      <Image
                        src={mediaFile}
                        alt="Story preview"
                        fill
                        className="object-cover"
                        style={{ filter: getFilterStyle(filter) }}
                      />
                    ) : (
                      <video
                        src={mediaFile}
                        className="w-full h-full object-cover"
                        style={{ filter: getFilterStyle(filter) }}
                        controls
                      />
                    )}

                    {/* Text Overlays */}
                    {textOverlays.map((overlay) => (
                      <div
                        key={overlay.id}
                        onClick={() => setSelectedTextId(overlay.id)}
                        className={`absolute cursor-move select-none ${
                          selectedTextId === overlay.id ? 'ring-2 ring-gold-500' : ''
                        }`}
                        style={{
                          left: `${overlay.x}%`,
                          top: `${overlay.y}%`,
                          fontSize: `${overlay.fontSize}px`,
                          color: overlay.color,
                          fontFamily: overlay.fontFamily,
                          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        {overlay.text}
                        {selectedTextId === overlay.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveText(overlay.id);
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full text-xs flex items-center justify-center"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="w-20 h-20 bg-gold-600 rounded-full flex items-center justify-center text-4xl">
                        📸
                      </div>
                      <p className="text-white font-semibold text-lg">Upload Photo or Video</p>
                      <p className="text-cool-gray-400 text-sm">JPG, PNG, MP4, MOV (max 50MB)</p>
                    </button>
                  </div>
                )}
              </div>

              {/* Duration Bar (for images) */}
              {mediaFile && mediaType === 'image' && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-2">
                    Story will be visible for {duration} seconds
                  </p>
                  <div className="w-full h-1 bg-cool-gray-300 dark:bg-charcoal-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gold-600 transition-all duration-300"
                      style={{ width: `${(duration / 15) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Editor Sidebar */}
          <div className="space-y-6">
            {/* Upload New */}
            {mediaFile && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 bg-cool-gray-100 dark:bg-charcoal-700 rounded-lg hover:bg-cool-gray-200 dark:hover:bg-charcoal-600 transition-colors font-semibold text-charcoal-900 dark:text-white"
                >
                  📁 Change Media
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* Filters */}
            {mediaFile && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
                <h3 className="font-bold text-charcoal-900 dark:text-white mb-3">Filters</h3>
                <div className="grid grid-cols-4 gap-2">
                  {filters.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`p-2 rounded-lg border-2 transition-colors text-xs font-semibold ${
                        filter === f.id
                          ? 'border-gold-600 bg-gold-50 dark:bg-gold-900/20'
                          : 'border-cool-gray-300 dark:border-charcoal-700 hover:border-gold-400'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Duration (for images) */}
            {mediaFile && mediaType === 'image' && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
                <h3 className="font-bold text-charcoal-900 dark:text-white mb-3">Duration</h3>
                <input
                  type="range"
                  min="3"
                  max="15"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 text-center mt-2">
                  {duration} seconds
                </p>
              </div>
            )}

            {/* Text Overlay */}
            {mediaFile && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
                <h3 className="font-bold text-charcoal-900 dark:text-white mb-3">Add Text</h3>
                
                {!showTextEditor ? (
                  <button
                    onClick={() => setShowTextEditor(true)}
                    className="w-full px-4 py-3 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold"
                  >
                    ✏️ Add Text
                  </button>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={currentText}
                      onChange={(e) => setCurrentText(e.target.value)}
                      placeholder="Enter your text..."
                      className="w-full px-3 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                      autoFocus
                    />
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-charcoal-600 dark:text-cool-gray-400 mb-1 block">
                          Font Size
                        </label>
                        <input
                          type="number"
                          value={currentFontSize}
                          onChange={(e) => setCurrentFontSize(parseInt(e.target.value))}
                          min="12"
                          max="72"
                          className="w-full px-2 py-1 border border-cool-gray-300 dark:border-charcoal-700 rounded bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-charcoal-600 dark:text-cool-gray-400 mb-1 block">
                          Color
                        </label>
                        <input
                          type="color"
                          value={currentColor}
                          onChange={(e) => setCurrentColor(e.target.value)}
                          className="w-full h-8 border border-cool-gray-300 dark:border-charcoal-700 rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    <select
                      value={currentFontFamily}
                      onChange={(e) => setCurrentFontFamily(e.target.value)}
                      className="w-full px-3 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white text-sm"
                    >
                      {fontFamilies.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <button
                        onClick={handleAddText}
                        className="flex-1 px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold text-sm"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowTextEditor(false);
                          setCurrentText('');
                        }}
                        className="flex-1 px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Text Overlays List */}
                {textOverlays.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-charcoal-600 dark:text-cool-gray-400">
                      Added Text ({textOverlays.length})
                    </p>
                    {textOverlays.map(overlay => (
                      <div
                        key={overlay.id}
                        className="flex items-center justify-between p-2 bg-cool-gray-50 dark:bg-charcoal-900 rounded"
                      >
                        <span className="text-sm text-charcoal-900 dark:text-white truncate flex-1">
                          {overlay.text}
                        </span>
                        <button
                          onClick={() => handleRemoveText(overlay.id)}
                          className="ml-2 text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Publish Button */}
            {mediaFile && (
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="w-full px-6 py-4 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPublishing ? 'Publishing...' : '🚀 Publish Story'}
              </button>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
