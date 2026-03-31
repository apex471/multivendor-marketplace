'use client';

import { useState, useEffect } from 'react';

interface Settings {
  _id?: string;
  platformName: string;
  platformEmail: string;
  supportEmail: string;
  maintenanceMode: boolean;
  allowNewVendors: boolean;
  allowNewBrands: boolean;
  requireEmailVerification: boolean;
  commissionRate: number;
  escrowDuration: number;
  minWithdrawal: number;
  freeShippingThreshold: number;
  defaultShippingCost: number;
  internationalShipping: boolean;
}

const DEFAULT: Settings = {
  platformName: 'CLW Marketplace', platformEmail: 'admin@clw.com', supportEmail: 'support@clw.com',
  maintenanceMode: false, allowNewVendors: true, allowNewBrands: true, requireEmailVerification: false,
  commissionRate: 10, escrowDuration: 7, minWithdrawal: 50,
  freeShippingThreshold: 100, defaultShippingCost: 9.99, internationalShipping: true,
};

type Tab = 'general' | 'payments' | 'shipping';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState<Tab>('general');

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setSettings(d.data); else setError(d.message || 'Failed to load'); })
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      showToast(data.message || 'Settings saved');
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : 'Failed to save'); }
    finally { setSaving(false); }
  };

  const Toggle = ({ field }: { field: keyof Settings }) => (
    <button onClick={() => setSettings(s => ({ ...s, [field]: !s[field] }))}
      className={`relative w-10 h-5 rounded-full transition-colors ${settings[field] ? 'bg-gold-500' : 'bg-charcoal-500'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${settings[field] ? 'left-5' : 'left-0.5'}`} />
    </button>
  );

  const Field = ({ label, field, type = 'text', placeholder = '' }: { label: string; field: keyof Settings; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-cool-gray-400 mb-1.5">{label}</label>
      <input type={type} value={String(settings[field])} placeholder={placeholder}
        onChange={e => setSettings(s => ({ ...s, [field]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
        className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500"
      />
    </div>
  );

  const ToggleRow = ({ label, desc, field }: { label: string; desc: string; field: keyof Settings }) => (
    <div className="flex items-center justify-between p-4 bg-charcoal-700 rounded-xl">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-cool-gray-500 mt-0.5">{desc}</div>
      </div>
      <Toggle field={field} />
    </div>
  );

  if (loading) return <div className="p-6 text-center py-20 text-cool-gray-500">Loading settings...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-charcoal-800 border border-gold-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        <p className="text-cool-gray-400 text-sm mt-1">Configure global marketplace settings</p>
      </div>

      {error && <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-xl text-red-300 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-charcoal-800 border border-charcoal-700 rounded-xl p-1 mb-6">
        {(['general', 'payments', 'shipping'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${tab === t ? 'bg-gold-600 text-white' : 'text-cool-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {tab === 'general' && (
          <>
            <Field label="Platform Name" field="platformName" placeholder="CLW Marketplace" />
            <Field label="Admin Email" field="platformEmail" type="email" placeholder="admin@clw.com" />
            <Field label="Support Email" field="supportEmail" type="email" placeholder="support@clw.com" />
            <ToggleRow label="Maintenance Mode" desc="Temporarily disable access for non-admin users" field="maintenanceMode" />
            <ToggleRow label="Allow New Vendors" desc="Allow vendor registrations" field="allowNewVendors" />
            <ToggleRow label="Allow New Brands" desc="Allow brand registrations" field="allowNewBrands" />
            <ToggleRow label="Require Email Verification" desc="Users must verify email before accessing the platform" field="requireEmailVerification" />
          </>
        )}
        {tab === 'payments' && (
          <>
            <Field label="Commission Rate (%)" field="commissionRate" type="number" placeholder="10" />
            <Field label="Escrow Duration (days)" field="escrowDuration" type="number" placeholder="7" />
            <Field label="Minimum Withdrawal ($)" field="minWithdrawal" type="number" placeholder="50" />
          </>
        )}
        {tab === 'shipping' && (
          <>
            <Field label="Free Shipping Threshold ($)" field="freeShippingThreshold" type="number" placeholder="100" />
            <Field label="Default Shipping Cost ($)" field="defaultShippingCost" type="number" placeholder="9.99" />
            <ToggleRow label="International Shipping" desc="Enable shipping to international addresses" field="internationalShipping" />
          </>
        )}
      </div>

      <div className="mt-8">
        <button onClick={save} disabled={saving}
          className="w-full py-3 bg-gold-600 hover:bg-gold-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
