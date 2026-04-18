'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { getAuthToken, getStoredUser, storeUser } from '@/lib/api/auth';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, _setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const setSaveMessage = _setSaveMessage;

  // Profile Settings — seeded from stored auth user
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    bio: '',
  });

  useEffect(() => {
    const u = getStoredUser();
    if (u) {
      setProfileData({
        fullName: u.fullName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
        email: u.email || '',
        phone: u.phoneNumber || '',
        bio: u.bio || '',
      });
    }
  }, []);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 3500);
  };

  // Notification Settings
  const [notifications, setNotifications] = useState({
    emailOrders: true,
    emailPromotions: false,
    emailNewProducts: true,
    pushOrders: true,
    pushMessages: true,
    pushPosts: false,
  });

  // Privacy Settings
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    allowMessages: true,
  });

  // Password Change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const token = getAuthToken();
      if (!token) { showMsg('error', 'You must be logged in to save profile.'); setIsSaving(false); return; }
      const nameParts = profileData.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName, lastName, phoneNumber: profileData.phone || undefined, bio: profileData.bio || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update profile');
      // Update cached user
      const existing = getStoredUser();
      if (existing) storeUser({ ...existing, firstName, lastName, fullName: profileData.fullName, phoneNumber: profileData.phone, bio: profileData.bio });
      showMsg('success', 'Profile updated successfully!');
    } catch (err: unknown) {
      showMsg('error', (err as Error).message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 400));
    showMsg('success', 'Notification preferences saved!');
    setIsSaving(false);
  };

  const handleSavePrivacy = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 400));
    showMsg('success', 'Privacy settings saved!');
    setIsSaving(false);
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMsg('error', 'Passwords do not match!');
      return;
    }
    setIsSaving(true);
    try {
      const token = getAuthToken();
      if (!token) { showMsg('error', 'You must be logged in.'); setIsSaving(false); return; }
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(passwordData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to change password');
      showMsg('success', 'Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      showMsg('error', (err as Error).message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'password', label: 'Password', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'privacy', label: 'Privacy', icon: '🛡️' },
    { id: 'account', label: 'Account', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">Settings</h1>
          <p className="text-charcoal-600 dark:text-cool-gray-400">Manage your account preferences and settings</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-4 sticky top-4">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-gold-600 text-white'
                        : 'text-charcoal-700 dark:text-cool-gray-300 hover:bg-gray-100 dark:hover:bg-charcoal-700'
                    }`}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Profile Information</h2>
                {saveMessage && (
                  <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    saveMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>{saveMessage.text}</div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-charcoal-700 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={profileData.email}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-charcoal-700 rounded-lg bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-500 dark:text-cool-gray-500 cursor-not-allowed"
                      />
                      <p className="text-xs text-charcoal-400 mt-1">Email cannot be changed here.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-charcoal-700 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-charcoal-700 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-none bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors disabled:bg-gray-400"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Change Password</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-charcoal-700 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-charcoal-700 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-charcoal-700 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleChangePassword}
                      disabled={isSaving}
                      className="px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors disabled:bg-gray-400"
                    >
                      {isSaving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Notification Preferences</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-charcoal-900 dark:text-white mb-4">Email Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'emailOrders', label: 'Order updates and shipping notifications' },
                        { key: 'emailPromotions', label: 'Promotions and special offers' },
                        { key: 'emailNewProducts', label: 'New products from followed vendors' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications[item.key as keyof typeof notifications]}
                            onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                            className="w-5 h-5 text-gold-600 rounded focus:ring-gold-500"
                          />
                          <span className="text-charcoal-700 dark:text-cool-gray-300">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t dark:border-charcoal-700 pt-6">
                    <h3 className="font-semibold text-charcoal-900 dark:text-white mb-4">Push Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'pushOrders', label: 'Order status updates' },
                        { key: 'pushMessages', label: 'New messages' },
                        { key: 'pushPosts', label: 'Posts from people you follow' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications[item.key as keyof typeof notifications]}
                            onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                            className="w-5 h-5 text-gold-600 rounded focus:ring-gold-500"
                          />
                          <span className="text-charcoal-700 dark:text-cool-gray-300">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleSaveNotifications}
                      disabled={isSaving}
                      className="px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors disabled:bg-gray-400"
                    >
                      {isSaving ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Privacy Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">
                      Profile Visibility
                    </label>
                    <select
                      value={privacy.profileVisibility}
                      onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-charcoal-700 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
                    >
                      <option value="public">Public - Anyone can view</option>
                      <option value="followers">Followers Only</option>
                      <option value="private">Private - Only you</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacy.showEmail}
                        onChange={(e) => setPrivacy({ ...privacy, showEmail: e.target.checked })}
                        className="w-5 h-5 text-gold-600 rounded focus:ring-gold-500"
                      />
                      <span className="text-charcoal-700 dark:text-cool-gray-300">Show email on profile</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacy.showPhone}
                        onChange={(e) => setPrivacy({ ...privacy, showPhone: e.target.checked })}
                        className="w-5 h-5 text-gold-600 rounded focus:ring-gold-500"
                      />
                      <span className="text-charcoal-700 dark:text-cool-gray-300">Show phone on profile</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacy.allowMessages}
                        onChange={(e) => setPrivacy({ ...privacy, allowMessages: e.target.checked })}
                        className="w-5 h-5 text-gold-600 rounded focus:ring-gold-500"
                      />
                      <span className="text-charcoal-700 dark:text-cool-gray-300">Allow direct messages</span>
                    </label>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleSavePrivacy}
                      disabled={isSaving}
                      className="px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors disabled:bg-gray-400"
                    >
                      {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Account Management</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-4 border-b dark:border-charcoal-700">
                      <div>
                        <p className="font-semibold text-charcoal-900 dark:text-white">Export Your Data</p>
                        <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Download a copy of your data</p>
                      </div>
                      <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                        Export
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-4 border-b dark:border-charcoal-700">
                      <div>
                        <p className="font-semibold text-charcoal-900 dark:text-white">Deactivate Account</p>
                        <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Temporarily disable your account</p>
                      </div>
                      <button className="px-6 py-2 border-2 border-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-charcoal-700 transition-colors">
                        Deactivate
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-semibold text-red-600">Delete Account</p>
                        <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Permanently delete your account and data</p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure? This action cannot be undone.')) {
                            console.log('Delete account');
                          }
                        }}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
